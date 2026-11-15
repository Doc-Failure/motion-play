import { GameSession, type GameSessionOptions, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerId } from '../../input/PlayerZoneMapper'

export const dodgeFlightMs = 1800
export const dodgeCycleMs = 2400
export const dodgeFreshMs = 350
export const dodgeReach = .2
interface DodgeLane {
  playerId: PlayerId
  bodyX: number | null
  ballX: number
  progress: number
  dodges: number
  hits: number
  feedback: string
}
export interface DodgeballSnapshot extends GameSessionSnapshot { lanes: DodgeLane[] }

/** A horizontal marker-dodge alternative, driven solely by normalized BODY_MOVE. */
export class DodgeballModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private lanes: DodgeLane[] = []
  private samples = new Map<PlayerId, { x: number; time: number }>()
  private lastInput = new Map<PlayerId, number>()
  private now = 0
  private begins = 0
  private ends = 0
  private nextImpact = 0
  private wave = 0

  constructor(options: Partial<GameSessionOptions> = {}) {
    this.session = new GameSession({ ...options, playerCount: options.playerCount ?? 1 })
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp
    this.begins = timestamp + state.countdownRemainingMs
    this.ends = this.begins + state.roundRemainingMs
    this.nextImpact = this.begins + dodgeFlightMs; this.wave = 0
    this.samples.clear(); this.lastInput.clear()
    this.lanes = state.scores.map(({ playerId }) => ({ playerId, bodyX: null, ballX: .5, progress: 0,
      dodges: 0, hits: 0, feedback: 'Move your marker away from the dashed ball path!' }))
    return this.snapshot()
  }

  update(timestamp: number) {
    if (!Number.isFinite(timestamp)) return this.snapshot()
    const time = Math.max(this.now, this.clock.time(timestamp))
    const phase = this.session.getSnapshot().phase
    if (phase === 'countdown' || phase === 'playing') {
      while (this.nextImpact <= time && this.nextImpact < this.ends) {
        this.session.update(this.nextImpact)
        for (const lane of this.lanes) {
          const sample = this.samples.get(lane.playerId)
          if (sample && this.nextImpact - sample.time <= dodgeFreshMs) {
            const hit = Math.abs(sample.x - lane.ballX) <= dodgeReach
            this.session.awardScore(lane.playerId, hit ? -5 : 10)
            if (hit) lane.hits++; else lane.dodges++
            lane.feedback = hit ? '● Bonk! −5. Try the clear side next time!' : '✓ Nice dodge! +10 points.'
          } else lane.feedback = 'No fresh position. Keep moving your marker; no points changed.'
        }
        this.wave++
        for (const lane of this.lanes) lane.ballX = [.5, .22, .78, .38, .62][this.wave % 5]
        this.nextImpact += dodgeCycleMs
      }
    }
    this.session.update(time); this.now = time
    for (const lane of this.lanes) {
      const sample = this.samples.get(lane.playerId)
      lane.bodyX = sample && time - sample.time <= dodgeFreshMs ? sample.x : null
      lane.progress = Math.max(0, Math.min(1, (time - (this.nextImpact - dodgeFlightMs)) / dodgeFlightMs))
    }
    return this.snapshot()
  }

  moveBody(event: MotionInputEvent) {
    const lane = this.lanes.find(lane => lane.playerId === event.playerId)
    if (!lane || event.kind !== 'BODY_MOVE' || !Number.isFinite(event.timestamp)
      || !this.clock.accepts(event.timestamp) || this.clock.time(event.timestamp) < Math.max(this.begins, this.now)
      || event.timestamp <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    // Resolve elapsed impacts with the previously known position, never a future sample.
    this.update(event.timestamp)
    if (this.session.getSnapshot().phase !== 'playing') return this.snapshot()
    this.lastInput.set(event.playerId, event.timestamp)
    if (![event.x, event.y, event.confidence].every(Number.isFinite) || event.x < 0 || event.x > 1
      || event.y < 0 || event.y > 1 || event.confidence < .6 || event.confidence > 1) {
      this.samples.delete(event.playerId); lane.bodyX = null
    } else {
      this.samples.set(event.playerId, { x: event.x, time: this.now }); lane.bodyX = event.x
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

  private snapshot(): DodgeballSnapshot {
    return { ...this.session.getSnapshot(), lanes: this.lanes.map(lane => ({ ...lane })) }
  }
}
