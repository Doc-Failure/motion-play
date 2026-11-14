export type PlayerCount = 1 | 2 | 3 | 4
export type PlayerId = 1 | 2 | 3 | 4

export interface NormalizedPoint { x: number; y: number }
export interface NormalizedRect extends NormalizedPoint { width: number; height: number }
export interface PlayerCameraZone extends NormalizedRect { playerId: PlayerId }
export interface PlayerViewport extends NormalizedRect { playerId: PlayerId }

const clamp = (value: number, minimum = 0, maximum = 1) => Math.min(maximum, Math.max(minimum, value))
const clampCoordinate = (value: number) => {
  const clamped = clamp(value)
  if (clamped < 1e-9) return 0
  if (clamped > 1 - 1e-9) return 1
  return clamped
}

/** Camera zones are expressed in the mirrored preview's normalized coordinates. */
export function defaultCameraZones(playerCount: PlayerCount): PlayerCameraZone[] {
  const width = 1 / playerCount
  return Array.from({ length: playerCount }, (_, index) => ({
    playerId: (index + 1) as PlayerId,
    x: index * width,
    y: 0,
    width,
    height: 1,
  }))
}

/** Viewports are a separate game-space layout and never derive from camera zones. */
export function playerViewports(playerCount: PlayerCount): PlayerViewport[] {
  if (playerCount === 1) return [{ playerId: 1, x: 0, y: 0, width: 1, height: 1 }]
  if (playerCount === 2) return [
    { playerId: 1, x: 0, y: 0, width: 0.5, height: 1 },
    { playerId: 2, x: 0.5, y: 0, width: 0.5, height: 1 },
  ]
  return Array.from({ length: playerCount }, (_, index) => ({
    playerId: (index + 1) as PlayerId,
    x: (index % 2) * 0.5,
    y: Math.floor(index / 2) * 0.5,
    width: 0.5,
    height: 0.5,
  }))
}

export function constrainCameraZone(zone: PlayerCameraZone): PlayerCameraZone {
  const x = clamp(zone.x, 0, 0.9)
  const y = clamp(zone.y, 0, 0.9)
  return {
    ...zone,
    x,
    y,
    width: clamp(zone.width, 0.1, 1 - x),
    height: clamp(zone.height, 0.1, 1 - y),
  }
}

/**
 * Maps a raw normalized camera coordinate into player-local [0,1] space.
 * Raw camera frames are unmirrored, while zones match the mirrored preview.
 * Points outside the selected player's zone deliberately produce null.
 */
export function mapCameraPoint(
  point: NormalizedPoint,
  zone: PlayerCameraZone,
  mirrored = true,
): NormalizedPoint | null {
  const edgeTolerance = 1e-9
  const previewX = mirrored ? 1 - point.x : point.x
  const localX = (previewX - zone.x) / zone.width
  const localY = (point.y - zone.y) / zone.height
  if (localX < -edgeTolerance || localX > 1 + edgeTolerance || localY < -edgeTolerance || localY > 1 + edgeTolerance) return null
  return { x: clampCoordinate(localX), y: clampCoordinate(localY) }
}
