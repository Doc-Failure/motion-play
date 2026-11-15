import { mapCameraPoint, type PlayerCameraZone, type PlayerId } from './PlayerZoneMapper'

export interface MotionFrame { width: number; height: number; data: Uint8ClampedArray }
export interface MotionInputEvent { playerId: PlayerId; kind: 'MOTION_HIT' | 'MOTION_BRUSH' | 'HAND_POSITION' | 'BODY_MOVE'; x: number; y: number; confidence: number; timestamp: number }
export interface ZoneMotion { playerId: PlayerId; activePixels: number; activity: number; centroid: { x: number; y: number } | null }
export interface MotionResult { mask: Uint8ClampedArray; width: number; height: number; threshold: number; zones: ZoneMotion[]; events: MotionInputEvent[]; positions?: MotionInputEvent[] }
export interface MotionOptions { spatialSampling?: boolean; sensitivity?: number; smoothing?: number; minimumNeighbors?: number; minimumZoneActivity?: number; debounceMs?: number }

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value))

export class MotionProcessor {
  private previous: Uint8ClampedArray | null = null
  private smoothed: Float32Array | null = null
  private noiseFloor = 0
  private readonly lastHit = new Map<PlayerId, number>()
  private readonly spatialSampling: boolean
  private sensitivity: number
  private readonly smoothing: number
  private readonly minimumNeighbors: number
  private readonly minimumZoneActivity: number
  private readonly debounceMs: number

  constructor(options: MotionOptions = {}) {
    this.spatialSampling = options.spatialSampling ?? false
    this.sensitivity = clamp(options.sensitivity ?? 0.55)
    this.smoothing = clamp(options.smoothing ?? 0.45)
    this.minimumNeighbors = options.minimumNeighbors ?? 2
    this.minimumZoneActivity = options.minimumZoneActivity ?? 0.005
    this.debounceMs = options.debounceMs ?? 280
  }

  setSensitivity(value: number) { this.sensitivity = clamp(value) }
  reset() { this.previous = null; this.smoothed = null; this.lastHit.clear() }
  calibrate(frames: MotionFrame[]) {
    const differences: number[] = []
    for (let index = 1; index < frames.length; index += 1) {
      this.assertCompatible(frames[index - 1], frames[index])
      const before = grayscale(frames[index - 1])
      const after = grayscale(frames[index])
      for (let pixel = 0; pixel < before.length; pixel += 1) differences.push(Math.abs(after[pixel] - before[pixel]))
    }
    differences.sort((a, b) => a - b)
    this.noiseFloor = differences.length ? differences[Math.floor(differences.length * 0.9)] : 0
    this.reset()
    return this.noiseFloor
  }

  process(frame: MotionFrame, zones: PlayerCameraZone[], timestamp: number): MotionResult {
    const gray = grayscale(frame)
    const baseThreshold = 52 - this.sensitivity * 36
    const threshold = Math.max(baseThreshold, this.noiseFloor * 1.8 + 4)
    const mask = new Uint8ClampedArray(gray.length)
    if (!this.previous || this.previous.length !== gray.length) {
      this.previous = gray
      this.smoothed = new Float32Array(gray.length)
      return { mask, width: frame.width, height: frame.height, threshold, zones: emptyZones(zones), events: [] }
    }
    const smoothed = this.smoothed ?? new Float32Array(gray.length)
    const candidate = new Uint8ClampedArray(gray.length)
    // Cancel uniform exposure changes rather than interpreting room flicker as a hit.
    const differences = new Uint32Array(511)
    for (let pixel = 0; pixel < gray.length; pixel += 1) differences[gray[pixel] - this.previous[pixel] + 255]++
    let cumulative = 0, exposureChange = 0
    for (let index = 0; index < differences.length; index++) {
      cumulative += differences[index]
      if (cumulative >= gray.length / 2) { exposureChange = index - 255; break }
    }
    for (let pixel = 0; pixel < gray.length; pixel += 1) {
      const difference = Math.abs(gray[pixel] - this.previous[pixel] - exposureChange)
      smoothed[pixel] = smoothed[pixel] * this.smoothing + difference * (1 - this.smoothing)
      candidate[pixel] = smoothed[pixel] >= threshold ? 1 : 0
    }
    for (let y = 0; y < frame.height; y += 1) for (let x = 0; x < frame.width; x += 1) {
      const pixel = y * frame.width + x
      if (!candidate[pixel]) continue
      let neighbors = 0
      for (let ny = Math.max(0, y - 1); ny <= Math.min(frame.height - 1, y + 1); ny += 1) {
        for (let nx = Math.max(0, x - 1); nx <= Math.min(frame.width - 1, x + 1); nx += 1) neighbors += candidate[ny * frame.width + nx]
      }
      if (neighbors - 1 >= this.minimumNeighbors) mask[pixel] = 255
    }
    this.previous = gray
    this.smoothed = smoothed
    const zoneMotion = zones.map((zone) => summarizeZone(mask, frame.width, frame.height, zone))
    const positions = zoneMotion.flatMap(motion => {
      if (!motion.centroid || motion.activity < this.minimumZoneActivity || motion.activity > .65) return []
      const zone = zones.find(item => item.playerId === motion.playerId)!
      return motionComponents(mask, frame.width, frame.height, zone, this.spatialSampling).map(point => ({
        playerId: motion.playerId, kind: 'MOTION_HIT' as const, ...point,
        confidence: clamp(.5 + motion.activity * 2), timestamp,
      }))
    })
    const eligible = new Set(positions.filter(event => timestamp - (this.lastHit.get(event.playerId) ?? -Infinity) >= this.debounceMs).map(event => event.playerId))
    const events = positions.filter(event => eligible.has(event.playerId))
    eligible.forEach(playerId => this.lastHit.set(playerId, timestamp))
    return { mask, width: frame.width, height: frame.height, threshold, zones: zoneMotion, events, positions }
  }

  private assertCompatible(a: MotionFrame, b: MotionFrame) {
    if (a.width !== b.width || a.height !== b.height) throw new Error('Calibration frames must use one size.')
  }
}

function grayscale(frame: MotionFrame) {
  if (frame.data.length !== frame.width * frame.height * 4) throw new Error('Motion frames must contain RGBA pixels.')
  const output = new Uint8ClampedArray(frame.width * frame.height)
  for (let pixel = 0; pixel < output.length; pixel += 1) {
    const offset = pixel * 4
    output[pixel] = Math.round(frame.data[offset] * 0.299 + frame.data[offset + 1] * 0.587 + frame.data[offset + 2] * 0.114)
  }
  return output
}

function emptyZones(zones: PlayerCameraZone[]): ZoneMotion[] { return zones.map(({ playerId }) => ({ playerId, activePixels: 0, activity: 0, centroid: null })) }

function summarizeZone(mask: Uint8ClampedArray, width: number, height: number, zone: PlayerCameraZone): ZoneMotion {
  let activePixels = 0, sumX = 0, sumY = 0, totalPixels = 0
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const previewX = 1 - (x + 0.5) / width
    const rawY = (y + 0.5) / height
    if (previewX < zone.x || previewX > zone.x + zone.width || rawY < zone.y || rawY > zone.y + zone.height) continue
    totalPixels += 1
    if (mask[y * width + x]) { activePixels += 1; sumX += (x + 0.5) / width; sumY += rawY }
  }
  const centroid = activePixels ? mapCameraPoint({ x: sumX / activePixels, y: sumY / activePixels }, zone) : null
  return { playerId: zone.playerId, activePixels, activity: totalPixels ? activePixels / totalPixels : 0, centroid }
}

// Keep separated moving hands separate: their average may be empty background.
function motionComponents(mask: Uint8ClampedArray, width: number, height: number, zone: PlayerCameraZone, spatialSampling = false) {
  const seen = new Uint8Array(mask.length)
  const points: { x: number; y: number }[] = []
  const inside = (index: number) => {
    const x = 1 - (index % width + .5) / width, y = (Math.floor(index / width) + .5) / height
    return x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height
  }
  for (let index = 0; index < mask.length; index++) {
    if (!mask[index] || seen[index] || !inside(index)) continue
    const queue = [index]; seen[index] = 1
    let sumX = 0, sumY = 0
    const cells = new Map<number, {x: number; y: number; count: number}>()
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const pixel = queue[cursor], x = pixel % width, y = Math.floor(pixel / width)
      sumX += (x + .5) / width; sumY += (y + .5) / height
      if (spatialSampling) {
        const local = mapCameraPoint({x:(x+.5)/width,y:(y+.5)/height},zone)!
        const key = Math.min(9,Math.floor(local.y*10))*10 + Math.min(9,Math.floor(local.x*10))
        const cell = cells.get(key) ?? {x:0,y:0,count:0}
        cell.x += local.x; cell.y += local.y; cell.count++
        cells.set(key,cell)
      }
      for (const [nx, ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]) {
        const next = ny * width + nx
        if (nx < 0 || nx >= width || ny < 0 || ny >= height || seen[next] || !mask[next] || !inside(next)) continue
        seen[next] = 1; queue.push(next)
      }
    }
    if (queue.length >= 3 && spatialSampling) {
      // Sample occupied mask cells, never empty space between moving body parts.
      for (const cell of cells.values()) points.push({x:cell.x/cell.count,y:cell.y/cell.count})
    } else if (queue.length >= 3) {
      const point = mapCameraPoint({ x: sumX / queue.length, y: sumY / queue.length }, zone)
      if (point) points.push(point)
    }
  }
  return points
}
