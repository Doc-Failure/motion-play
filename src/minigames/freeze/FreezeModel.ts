import { GameSession, type GameSessionOptions, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerId } from '../../input/PlayerZoneMapper'

export const freezeMoveMs = 2400
export const freezeWarningMs = 600
export const freezeHoldMs = 2000
export const freezeCycleMs = freezeMoveMs + freezeWarningMs + freezeHoldMs
export const freezeFreshMs = 250
export const freezeTargetMs = 1200
export const freezeActivityThreshold = .015
interface FreezeLane {
  playerId: PlayerId; armed: boolean; failed: boolean; awarded: boolean
  heldMs: number; freezes: number; feedback: string
}
export interface FreezeSnapshot extends GameSessionSnapshot {
  lanes: FreezeLane[]; cue: 'Move!' | 'Ready…' | 'Freeze!'; cueIndex: number; cueRemainingMs: number
}

/** Generic activity samples only. Silence is never evidence of stillness. */
export class FreezeModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private lanes: FreezeLane[] = []
  private samples = new Map<PlayerId, number>()
  private lastInput = new Map<PlayerId, number>()
  private now = 0
  private begins = 0
  private ends = 0
  private cueIndex = 0
  constructor(options: Partial<GameSessionOptions> = {}) {
    this.session = new GameSession({ ...options, playerCount: options.playerCount ?? 1 })
  }
  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp; this.begins = timestamp + state.countdownRemainingMs
    this.ends = this.begins + state.roundRemainingMs
    this.cueIndex = 0; this.samples.clear(); this.lastInput.clear()
    this.lanes = state.scores.map(({ playerId }) => ({ playerId, armed: false, failed: false, awarded: false, heldMs: 0, freezes: 0, feedback: 'Move to join this cue!' }))
    return this.snapshot()
  }
  update(timestamp: number) {
    if (!Number.isFinite(timestamp) || this.session.getSnapshot().phase === 'results') return this.snapshot()
    this.now = Math.min(this.ends, Math.max(this.now, this.clock.time(timestamp)))
    this.session.update(this.now)
    const index = Math.max(0, Math.floor((this.now - this.begins) / freezeCycleMs))
    if (index !== this.cueIndex) {
      this.cueIndex = index; this.samples.clear()
      for (const lane of this.lanes) Object.assign(lane, { armed: false, failed: false, awarded: false, heldMs: 0, feedback: 'Move to join this cue!' })
    }
    for (const lane of this.lanes) {
      const sample = this.samples.get(lane.playerId)
      if (sample !== undefined && this.now - sample > freezeFreshMs) this.release(lane.playerId)
    }
    return this.snapshot()
  }
  input(event: MotionInputEvent) {
    const lane = this.lanes.find(lane => lane.playerId === event.playerId)
    if (!lane || event.kind !== 'FREEZE' || !Number.isFinite(event.timestamp) || !this.clock.accepts(event.timestamp)
      || this.clock.time(event.timestamp) < Math.max(this.now, this.begins)
      || event.timestamp <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    this.lastInput.set(event.playerId, event.timestamp)
    if (![event.x, event.y, event.confidence, event.activity].every(value => typeof value === 'number' && Number.isFinite(value))
      || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1 || event.confidence < .6 || event.confidence > 1
      || event.activity! < 0 || event.activity! > 1) return this.release(event.playerId)
    const moving = event.activity! >= freezeActivityThreshold
    if (state.cue === 'Move!') {
      if (moving) { lane.armed = true; lane.feedback = 'Nice wiggle! Watch for Freeze!' }
      return this.snapshot()
    }
    if (state.cue !== 'Freeze!' || !lane.armed || lane.failed) return this.snapshot()
    if (moving) {
      lane.failed = true; lane.heldMs = 0; lane.feedback = 'A wiggle! −5. Try the next cue!'
      this.samples.delete(event.playerId); this.session.awardScore(event.playerId, -5)
    } else {
      const previous = this.samples.get(event.playerId)
      if (previous !== undefined) lane.heldMs += this.now - previous
      this.samples.set(event.playerId, this.now)
      if (!lane.awarded && lane.heldMs >= freezeTargetMs) {
        lane.awarded = true; lane.freezes++; lane.feedback = '✓ Super statue! +10. Keep still!'
        this.session.awardScore(event.playerId, 10)
      } else if (!lane.awarded) lane.feedback = 'Hold that statue…'
    }
    return this.snapshot()
  }
  release(playerId: PlayerId) {
    if (this.session.getSnapshot().phase === 'results') return this.snapshot()
    this.samples.delete(playerId)
    const lane = this.lanes.find(lane => lane.playerId === playerId)
    if (lane) lane.heldMs = 0
    return this.snapshot()
  }
  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase === 'playing' || state.phase === 'countdown') {
      this.session.pause(this.now); this.clock.pause(timestamp)
      for (const lane of this.lanes) this.release(lane.playerId)
    }
    return this.snapshot()
  }
  resume(timestamp: number) {
    if (this.clock.paused) { this.clock.resume(timestamp); this.session.resume(this.clock.time(timestamp)) }
    return this.update(timestamp)
  }
  private snapshot(): FreezeSnapshot {
    const state = this.session.getSnapshot()
    const elapsed = Math.max(0, this.now - this.begins - this.cueIndex * freezeCycleMs)
    const boundary = elapsed < freezeMoveMs ? freezeMoveMs : elapsed < freezeMoveMs + freezeWarningMs ? freezeMoveMs + freezeWarningMs : freezeCycleMs
    return { ...state, lanes: this.lanes.map(lane => ({ ...lane })), cueIndex: this.cueIndex,
      cue: elapsed < freezeMoveMs ? 'Move!' : elapsed < freezeMoveMs + freezeWarningMs ? 'Ready…' : 'Freeze!',
      cueRemainingMs: Math.max(0, boundary - elapsed) }
  }
}
