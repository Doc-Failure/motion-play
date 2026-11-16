import type { MotionInputEvent } from './MotionProcessor'
import type { PlayerId } from './PlayerZoneMapper'

export const swipeMaxDurationMs = 250
export const swipeMinDistance = .08
export const swipeMinSpeed = .8 // player-local units per second
const unit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1

export function isValidSwipe(event: MotionInputEvent) {
  const s = event.swipe
  if (event.kind !== 'HAND_SWIPE' || !s || !unit(event.x) || !unit(event.y) || !unit(s.fromX) || !unit(s.fromY) || !unit(event.confidence) || event.confidence < .6 || !Number.isFinite(event.timestamp) || !Number.isFinite(s.durationMs) || s.durationMs <= 0 || s.durationMs > swipeMaxDurationMs) return false
  const distance = Math.hypot(event.x - s.fromX, event.y - s.fromY)
  return distance >= swipeMinDistance && distance * 1000 / s.durationMs >= swipeMinSpeed
}

/** Accepts identified hand positions only. Pointer simulation uses the same
 * normalized contract. Missing/uncertain samples break continuity; motion-mask
 * centroids must never be passed off as hand landmarks. */
export class HandSwipeTracker {
  private previous = new Map<PlayerId, MotionInputEvent>()
  private latest = new Map<PlayerId, number>()
  reset(playerId?: PlayerId) {
    if (playerId) { this.previous.delete(playerId); this.latest.delete(playerId) }
    else { this.previous.clear(); this.latest.clear() }
  }
  sample(event: MotionInputEvent): MotionInputEvent | null {
    if (event.kind !== 'HAND_POSITION' || !Number.isFinite(event.timestamp)) return null
    const previous = this.previous.get(event.playerId)
    if (event.timestamp <= (this.latest.get(event.playerId) ?? -Infinity)) return null
    if (!unit(event.x) || !unit(event.y) || !unit(event.confidence) || event.confidence < .6) { this.reset(event.playerId); return null }
    this.latest.set(event.playerId, event.timestamp)
    if (!previous || event.timestamp - previous.timestamp > swipeMaxDurationMs) {
      this.previous.set(event.playerId, { ...event }); return null
    }
    const swipe: MotionInputEvent = { ...event, kind: 'HAND_SWIPE', confidence: Math.min(event.confidence, previous.confidence), swipe: { fromX: previous.x, fromY: previous.y, durationMs: event.timestamp - previous.timestamp } }
    if (!isValidSwipe(swipe)) return null
    this.previous.set(event.playerId, { ...event })
    return swipe
  }
}
