import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { containCameraFrame } from '../../game/cameraGeometry'
import type { HomeZone } from './LavaRound'

type CameraFrame = ReturnType<typeof containCameraFrame>
const art = '/assets/minigames/floor-is-lava/lava.webp'

// Overlap the edges of the crayon drawing so its streaks flow through each repeat.
function lavaPattern(image: HTMLImageElement) {
  const tile = document.createElement('canvas')
  const size = image.naturalWidth
  const overlap = Math.round(size * .12)
  const repeat = size - overlap
  tile.width = tile.height = size
  const ctx = tile.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(image, 0, 0)
  const source = ctx.getImageData(0, 0, size, size).data
  const result = ctx.createImageData(repeat, repeat)
  for (let y = 0; y < repeat; y++) {
    const wy = Math.min(1, y / overlap)
    const otherY = y < overlap ? y + repeat : y
    for (let x = 0; x < repeat; x++) {
      const wx = Math.min(1, x / overlap)
      const otherX = x < overlap ? x + repeat : x
      const index = (y * repeat + x) * 4
      for (let c = 0; c < 3; c++) {
        const row = (iy: number) => wx * source[(iy * size + x) * 4 + c] + (1 - wx) * source[(iy * size + otherX) * 4 + c]
        result.data[index + c] = wy * row(y) + (1 - wy) * row(otherY)
      }
      result.data[index + 3] = 255
    }
  }
  tile.width = tile.height = repeat
  ctx.putImageData(result, 0, 0)
  return ctx.createPattern(tile, 'repeat')
}

// Each vent swells, breaks into a ring, then disappears beneath the surface.
const vents = [
  [.09,.16,15,.27], [.37,.08,9,.58], [.69,.21,19,.80], [.92,.12,10,.46],
  [.23,.42,13,.66], [.55,.37,16,.05], [.83,.56,12,.31], [.04,.72,11,.91],
  [.39,.81,20,.18], [.66,.73,10,.72], [.96,.91,17,.54], [.52,.97,12,.38],
]
function drawBubbles(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const scale = Math.min(width, height) / 620
  for (const [u,v,size,offset] of vents) {
    const phase = (time / (1.25 + offset) + offset) % 1
    if (phase > .88) continue
    const x = u * width + Math.sin(time + offset * 9) * 3 * scale
    const y = v * height - 7 * phase * scale
    const radius = size * scale * (.32 + phase)
    ctx.lineWidth = Math.max(1, scale * 2)
    ctx.beginPath()
    ctx.ellipse(x, y, radius, radius * .69, -.14, 0, 2 * Math.PI)
    if (phase < .62) {
      ctx.fillStyle = '#ff921e'
      ctx.fill()
      ctx.strokeStyle = '#a83715'
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(x, y, radius * .67, radius * .48, -.14, 3.55, 5.1)
      ctx.strokeStyle = '#fff29a'
    } else {
      ctx.strokeStyle = `rgba(255,224,107,${(.88 - phase) / .26})`
    }
    ctx.stroke()
  }
}

export function LavaFlood({ frame, zone, flooded, elapsedMs }: {
  frame: CameraFrame; zone: HomeZone; flooded: boolean; elapsedMs: number
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [pattern, setPattern] = useState<CanvasPattern | null>(null)
  useEffect(() => {
    const image = new Image()
    image.onload = () => setPattern(lavaPattern(image))
    image.src = art
    return () => { image.onload = null }
  }, [])

  const screenWidth = frame.width + 2 * frame.left
  const screenHeight = frame.height + 2 * frame.top
  const resolution = Math.min(1, 1440 / Math.max(screenWidth, screenHeight))
  const width = Math.max(1, Math.round(screenWidth * resolution))
  const height = Math.max(1, Math.round(screenHeight * resolution))
  useLayoutEffect(() => {
    const ctx = canvas.current?.getContext('2d')
    if (!ctx || !flooded || !screenWidth || !screenHeight) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion')
    const time = reduced ? 0 : elapsedMs / 1000
    const scale = Math.min(width, height) / 620
    ctx.fillStyle = pattern ?? '#e65219'
    // Progressively displace bands of the same illustration to bend the molten streaks.
    const band = Math.max(2, Math.round(3 * scale))
    const matrix = new DOMMatrix()
    matrix.a = matrix.d = scale * 1.85
    for (let y = 0; y < height; y += band) {
      matrix.e = scale * (time * 27 + 10 * Math.sin(y / (58 * scale) + time * 2) + 4 * Math.sin(y / (26 * scale) - time))
      matrix.f = scale * time * 8
      pattern?.setTransform(matrix)
      ctx.fillRect(0, y, width, band)
    }
    drawBubbles(ctx, width, height, time)
    const sx = width / screenWidth, sy = height / screenHeight
    ctx.clearRect((frame.left + zone.left * frame.width) * sx, (frame.top + zone.top * frame.height) * sy,
      (zone.right - zone.left) * frame.width * sx, (zone.bottom - zone.top) * frame.height * sy)
  }, [elapsedMs, flooded, frame, height, pattern, screenHeight, screenWidth, width, zone])

  return flooded ? <canvas ref={canvas} width={width} height={height} aria-hidden="true" className="lava-flood"
    style={{ position:'fixed', inset:0, width:'100vw', height:'100vh', pointerEvents:'none' }}/> : null
}
