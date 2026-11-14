import { useEffect, useRef } from 'react'
import type { MotionResult } from './MotionProcessor'
import type { PlayerCameraZone } from './PlayerZoneMapper'

export function MotionDebugOverlay({ result, zones }: { result: MotionResult | null; zones: PlayerCameraZone[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !result) return
    canvas.width = result.width; canvas.height = result.height
    const context = canvas.getContext('2d')
    if (!context) return
    const image = context.createImageData(result.width, result.height)
    for (let pixel = 0; pixel < result.mask.length; pixel += 1) {
      const offset = pixel * 4; const active = result.mask[pixel] > 0
      image.data[offset] = active ? 255 : 15; image.data[offset + 1] = active ? 88 : 30; image.data[offset + 2] = active ? 62 : 45; image.data[offset + 3] = active ? 220 : 120
    }
    context.putImageData(image, 0, 0)
    context.lineWidth = 1; context.strokeStyle = '#fff'
    for (const zone of zones) context.strokeRect(zone.x * canvas.width, zone.y * canvas.height, zone.width * canvas.width, zone.height * canvas.height)
  }, [result, zones])
  return <canvas ref={canvasRef} className="motion-mask" aria-label="Motion mask debug overlay" />
}
