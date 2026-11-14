import type { MotionFrame } from './MotionProcessor'

export class SyntheticMotionSimulator {
  private tick = 0
  constructor(readonly width = 64, readonly height = 36) {}
  next(): MotionFrame {
    const data = new Uint8ClampedArray(this.width * this.height * 4)
    const centerX = 8 + (this.tick * 5) % Math.max(1, this.width - 16)
    const centerY = Math.round(this.height * (0.35 + (this.tick % 3) * 0.15))
    for (let y = 0; y < this.height; y += 1) for (let x = 0; x < this.width; x += 1) {
      const offset = (y * this.width + x) * 4
      const moving = Math.abs(x - centerX) <= 5 && Math.abs(y - centerY) <= 5
      const value = moving ? 235 : 28
      data[offset] = value; data[offset + 1] = moving ? 92 : value; data[offset + 2] = moving ? 70 : value; data[offset + 3] = 255
    }
    this.tick += 1
    return { width: this.width, height: this.height, data }
  }
  reset() { this.tick = 0 }
}
