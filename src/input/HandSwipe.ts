import type { MotionInputEvent } from './MotionProcessor'
import type { PlayerId } from './PlayerZoneMapper'

export const swipeMaxDurationMs = 250
export const swipeMinDistance = .08
export const swipeMinSpeed = .8 // player-local units per second
export interface SwipeLimits {durationMs:number;distance:number;speed:number}
const defaultSwipe:SwipeLimits = {durationMs:swipeMaxDurationMs,distance:swipeMinDistance,speed:swipeMinSpeed}
export const bowlingSweep = {durationMs:440,distance:.09,speed:.32}
const unit = (n: number) => Number.isFinite(n) && n >= 0 && n <= 1

function coversSwipeDistance(distance: number, durationMs: number, limits:SwipeLimits) {
  return distance >= limits.distance && distance * 1000 / durationMs >= limits.speed
}

export function isValidSwipe(event: MotionInputEvent, limits=defaultSwipe) {
  const s = event.swipe
  if (event.kind !== 'HAND_SWIPE' || !s || !unit(event.x) || !unit(event.y) || !unit(s.fromX) || !unit(s.fromY) || !unit(event.confidence) || event.confidence < .6 || !Number.isFinite(event.timestamp) || !Number.isFinite(s.durationMs) || s.durationMs <= 0 || s.durationMs > limits.durationMs) return false
  const distance = Math.hypot(event.x - s.fromX, event.y - s.fromY)
  return coversSwipeDistance(distance, s.durationMs, limits)
}

/** Accepts identified hand positions only. Pointer simulation uses the same
 * normalized contract. Missing/uncertain samples break continuity; motion-mask
 * centroids must never be passed off as hand landmarks. */
export class HandSwipeTracker {
  constructor(private limits=defaultSwipe) {}
  private samples = new Map<PlayerId, MotionInputEvent[]>()
  reset(playerId?: PlayerId) {
    if (playerId) this.samples.delete(playerId)
    else this.samples.clear()
  }
  sample(event: MotionInputEvent): MotionInputEvent | null {
    if (event.kind !== 'HAND_POSITION' || !Number.isFinite(event.timestamp)) return null
    const history = this.samples.get(event.playerId) ?? []
    const last = history.at(-1)
    if (last && event.timestamp <= last.timestamp) return null
    if (!unit(event.x) || !unit(event.y) || !unit(event.confidence) || event.confidence < .6) {
      this.reset(event.playerId)
      return null
    }
    const cutoff = event.timestamp - this.limits.durationMs
    while (history.length && history[0].timestamp < cutoff) history.shift()
    // Refresh a still hand immediately; preserve intermediate moving samples so
    // small steps at pointer/frame rate can accumulate into a deliberate stroke.
    if (history.length && last && event.x === last.x && event.y === last.y) {
      history[history.length - 1] = {...event}
      return null
    }
    for (const start of history) {
      const durationMs = event.timestamp - start.timestamp
      const distance = Math.hypot(event.x - start.x, event.y - start.y)
      if (!coversSwipeDistance(distance, durationMs, this.limits)) continue
      this.samples.set(event.playerId,[{...event}])
      return {...event, kind:'HAND_SWIPE', confidence:Math.min(event.confidence,start.confidence),
        swipe:{fromX:start.x, fromY:start.y, durationMs}}
    }
    history.push({...event})
    this.samples.set(event.playerId,history)
    return null
  }
}
