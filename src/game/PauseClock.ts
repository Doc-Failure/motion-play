/** Maps browser timestamps to gameplay time, excluding interrupted intervals. */
export class PauseClock {
  private offset = 0
  private pausedAt: number | null = null
  private acceptAfter = -Infinity

  get paused() { return this.pausedAt !== null }
  time(timestamp: number) { return (this.pausedAt ?? timestamp) - this.offset }
  accepts(timestamp: number) { return !this.paused && timestamp >= this.acceptAfter }
  reset(timestamp: number) { this.offset = 0; this.pausedAt = null; this.acceptAfter = timestamp }
  pause(timestamp: number) { if (!this.paused) this.pausedAt = timestamp }
  resume(timestamp: number) {
    if (this.pausedAt === null) return
    this.offset += timestamp - this.pausedAt
    this.pausedAt = null
    this.acceptAfter = timestamp
  }
}
