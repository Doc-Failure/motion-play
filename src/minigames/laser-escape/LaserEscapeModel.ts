import { GameSession, type GameSessionOptions, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerId } from '../../input/PlayerZoneMapper'

export const laserWarningMs = 1000
export const laserSweepMs = 1200
export const laserCycleMs = 3000
export const laserFreshMs = 350
export const laserReach = .12
interface LaserLane {
  playerId: PlayerId
  bodyX: number | null
  escapes: number
  hits: number
  feedback: string
}
export interface LaserEscapeSnapshot extends GameSessionSnapshot {
  lanes: LaserLane[]
  beamX: number
  active: boolean
  direction: 'right' | 'left'
}

/** Continuous swept-line collision against a fresh motion-center marker, not a body outline. */
export class LaserEscapeModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private lanes: LaserLane[] = []
  private samples = new Map<PlayerId, { x: number; time: number }>()
  private lastInput = new Map<PlayerId, number>()
  private exposure = new Map<PlayerId, { coveredMs: number; hit: boolean }>()
  private now = 0
  private begins = 0
  private ends = 0
  private wave = 0

  private readonly warningMs:number
  private readonly sweepMs:number
  private readonly cycleMs:number
  private readonly nearEdge:number

  constructor(options: Partial<GameSessionOptions> & { pressure?:number } = {}) {
    const pressure = Math.max(-.15,Math.min(1,options.pressure ?? 0))
    this.warningMs = laserWarningMs - 220 * pressure
    this.sweepMs = laserSweepMs - 260 * pressure
    this.cycleMs = laserCycleMs - 640 * pressure
    this.nearEdge = .28 - .035 * pressure
    this.session = new GameSession({ ...options, playerCount: options.playerCount ?? 1 })
  }
  private get sweepStart() { return this.begins + this.wave * this.cycleMs + this.warningMs }
  private beamAt(time: number) {
    const progress = Math.max(0, Math.min(1, (time - this.sweepStart) / this.sweepMs))
    const forward = this.nearEdge + (.96 - this.nearEdge) * progress
    return this.wave % 2 ? 1-forward : forward
  }
  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp
    this.begins = timestamp + state.countdownRemainingMs
    this.ends = this.begins + state.roundRemainingMs; this.wave = 0
    this.samples.clear(); this.lastInput.clear(); this.exposure.clear()
    this.lanes = state.scores.map(({ playerId }) => ({ playerId, bodyX: null, escapes: 0, hits: 0,
      feedback: 'Follow the arrow. Keep your marker clear of the sweeping line!' }))
    return this.snapshot()
  }
  private sweep(from: number, to: number) {
    const start = Math.max(from, this.sweepStart), end = Math.min(to, this.sweepStart + this.sweepMs)
    if (end <= start) return
    for (const lane of this.lanes) {
      const sample = this.samples.get(lane.playerId)
      const exposure = this.exposure.get(lane.playerId) ?? { coveredMs: 0, hit: false }
      if (sample) {
        const until = Math.min(end, sample.time + laserFreshMs)
        if (until > start) {
          exposure.coveredMs += until - start
          const a = this.beamAt(start), b = this.beamAt(until)
          // Intersect the whole traveled segment, even across a slow render frame.
          if (sample.x >= Math.min(a, b) - laserReach && sample.x <= Math.max(a, b) + laserReach) exposure.hit = true
        }
      }
      this.exposure.set(lane.playerId, exposure)
    }
  }
  update(timestamp: number) {
    if (!Number.isFinite(timestamp)) return this.snapshot()
    const time = Math.max(this.now, this.clock.time(timestamp))
    const phase = this.session.getSnapshot().phase
    if (phase === 'countdown' || phase === 'playing') {
      let cursor = this.now
      while (this.sweepStart + this.sweepMs <= time && this.sweepStart + this.sweepMs < this.ends) {
        const end = this.sweepStart + this.sweepMs
        this.sweep(cursor, end); this.session.update(end)
        for (const lane of this.lanes) {
          const exposure = this.exposure.get(lane.playerId)
          if (exposure?.hit) {
            this.session.awardScore(lane.playerId, -5); lane.hits++
            lane.feedback = '✕ Laser touch! −5. Try the clear edge next time!'
          } else if (exposure && exposure.coveredMs >= this.sweepMs - .000001) {
            this.session.awardScore(lane.playerId, 10); lane.escapes++
            lane.feedback = '✓ Clear all the way! +10 points.'
          } else lane.feedback = 'Position lost during sweep. No escape points this time.'
        }
        cursor = end; this.wave++; this.exposure.clear()
      }
      this.sweep(cursor, Math.min(time, this.ends))
    }
    this.session.update(time); this.now = time
    for (const lane of this.lanes) {
      const sample = this.samples.get(lane.playerId)
      lane.bodyX = sample && time - sample.time <= laserFreshMs ? sample.x : null
    }
    return this.snapshot()
  }
  moveBody(event: MotionInputEvent) {
    const lane = this.lanes.find(lane => lane.playerId === event.playerId)
    if (!lane || event.kind !== 'BODY_MOVE' || !Number.isFinite(event.timestamp)
      || !this.clock.accepts(event.timestamp) || this.clock.time(event.timestamp) < Math.max(this.begins, this.now - 32)
      || event.timestamp <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    this.update(event.timestamp)
    if (this.session.getSnapshot().phase !== 'playing') return this.snapshot()
    this.lastInput.set(event.playerId, event.timestamp)
    if (![event.x, event.y, event.confidence].every(Number.isFinite) || event.x < 0 || event.x > 1
      || event.y < 0 || event.y > 1 || event.confidence < .6 || event.confidence > 1) {
      this.samples.delete(event.playerId); lane.bodyX = null
    } else {
      this.samples.set(event.playerId, { x: event.x, time: this.clock.time(event.timestamp) }); lane.bodyX = event.x
    }
    return this.snapshot()
  }
  releaseBody(playerId: PlayerId) {
    this.samples.delete(playerId)
    const lane = this.lanes.find(lane => lane.playerId === playerId)
    if (lane) lane.bodyX = null
    return this.snapshot()
  }
  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase === 'playing' || state.phase === 'countdown') {
      this.session.pause(this.now); this.clock.pause(timestamp)
      for (const lane of this.lanes) this.releaseBody(lane.playerId)
    }
    return this.snapshot()
  }
  resume(timestamp: number) {
    if (this.clock.paused) { this.clock.resume(timestamp); this.session.resume(this.clock.time(timestamp)) }
    return this.update(timestamp)
  }
  private snapshot(): LaserEscapeSnapshot {
    return { ...this.session.getSnapshot(), lanes: this.lanes.map(lane => ({ ...lane })),
      beamX: this.beamAt(this.now), active: this.session.getSnapshot().phase === 'playing' && this.now >= this.sweepStart && this.now < this.sweepStart + this.sweepMs,
      direction: this.wave % 2 ? 'left' : 'right' }
  }
}
