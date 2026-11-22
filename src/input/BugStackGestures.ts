import type { DetectedHand } from './HandGestureProcessor'

export type HandControl = { column: number; rotate: boolean; drop: boolean }

/** A single mirrored palm steers. Pinch and downstroke fire on edges. */
export class BugStackGestures {
  private open = false
  private lastTime = -Infinity
  private column = -1
  private path: { y: number; time: number }[] = []
  private droppedAt: number | null = null

  read(hand: DetectedHand | undefined, aspect: number, now: number): HandControl | null {
    if (!hand || !(hand.confidence >= .6) || hand.points.length !== 21 ||
        hand.points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
      this.lastTime = -Infinity
      return null
    }
    const p = hand.points
    const dist = (a: number, b: number) => Math.hypot((p[a].x - p[b].x) * aspect, p[a].y - p[b].y)
    const span = dist(5, 17)
    if (span < .018) { this.lastTime = -Infinity; return null }
    const y = (p[0].y + p[9].y) / 2
    const x = Math.max(0, Math.min(9.99, (1 - (p[0].x + p[9].x) / 2 - .12) / .76 * 10))
    if (now - this.lastTime > 450) {
      this.open = false
      this.path = []
      this.droppedAt = null
      this.column = Math.floor(x)
    }
    this.lastTime = now
    if (x < this.column - .14 || x >= this.column + 1.14) this.column = Math.floor(x)
    const pinch = dist(4, 8) / span
    const rotate = this.open && pinch < .30
    if (pinch > .60) this.open = true
    if (rotate) this.open = false
    if (this.droppedAt !== null && y < this.droppedAt - .10) this.droppedAt = null
    this.path = this.path.filter(sample => now - sample.time <= 420)
    this.path.push({ y, time: now })
    const drop = !rotate && this.droppedAt === null && this.path.some(sample => y - sample.y > .18)
    if (drop) {
      this.droppedAt = y
      this.path = []
    }
    return { column: this.column, rotate, drop }
  }
}
