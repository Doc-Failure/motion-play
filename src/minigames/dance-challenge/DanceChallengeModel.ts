import { GameSession, type GameSessionOptions, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerId } from '../../input/PlayerZoneMapper'

export const danceCycleMs = 2400
export const danceWarningMs = 800
export const danceWindowMs = 1200
export const danceFreshMs = 350
export const danceDistance = .18
export const danceCues = ['left', 'right', 'up', 'down'] as const
export type DanceCue = typeof danceCues[number]
interface DanceLane { playerId: PlayerId; matched: boolean; matches: number; feedback: string; position: { x: number; y: number } | null }
export interface DanceChallengeSnapshot extends GameSessionSnapshot {
  lanes: DanceLane[]; cue: DanceCue; cueIndex: number; active: boolean; cueRemainingMs: number
}

/** Directional motion-center travel, never pose recognition or raw camera data. */
export class DanceChallengeModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private lanes: DanceLane[] = []
  private samples = new Map<PlayerId, { x: number; y: number; anchorX: number; anchorY: number; time: number }>()
  private lastInput = new Map<PlayerId, number>()
  private now = 0
  private begins = 0
  private cueIndex = 0
  constructor(options: Partial<GameSessionOptions> = {}) {
    this.session = new GameSession({ ...options, playerCount: options.playerCount ?? 1 })
  }
  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp; this.begins = timestamp + state.countdownRemainingMs
    this.cueIndex = 0; this.samples.clear(); this.lastInput.clear()
    this.lanes = state.scores.map(({ playerId }) => ({ playerId, matched: false, matches: 0, feedback: 'Watch the arrow, then move on Go!', position: null }))
    return this.snapshot()
  }
  update(timestamp: number) {
    if (!Number.isFinite(timestamp)) return this.snapshot()
    this.now = Math.max(this.now, this.clock.time(timestamp))
    this.session.update(this.now)
    const index = Math.max(0, Math.floor((this.now - this.begins) / danceCycleMs))
    if (index !== this.cueIndex) {
      this.cueIndex = index; this.samples.clear()
      for (const lane of this.lanes) { lane.matched = false; lane.feedback = 'Watch the arrow, then move on Go!' }
    }
    for (const lane of this.lanes) {
      const sample = this.samples.get(lane.playerId)
      lane.position = sample && this.now - sample.time <= danceFreshMs ? { x: sample.x, y: sample.y } : null
    }
    return this.snapshot()
  }
  moveBody(event: MotionInputEvent) {
    const lane = this.lanes.find(lane => lane.playerId === event.playerId)
    if (!lane || event.kind !== 'BODY_MOVE' || !Number.isFinite(event.timestamp) || !this.clock.accepts(event.timestamp)
      || this.clock.time(event.timestamp) < Math.max(this.begins, this.now)
      || event.timestamp <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    this.lastInput.set(event.playerId, event.timestamp)
    if (![event.x, event.y, event.confidence].every(Number.isFinite) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1 || event.confidence < .6 || event.confidence > 1 || !state.active) {
      this.releaseBody(event.playerId); return this.snapshot()
    }
    const previous = this.samples.get(event.playerId)
    const fresh = previous && this.now - previous.time <= danceFreshMs
    const dx = fresh ? event.x - previous.anchorX : 0, dy = fresh ? event.y - previous.anchorY : 0
    const travel = state.cue === 'left' ? -dx : state.cue === 'right' ? dx : state.cue === 'up' ? -dy : dy
    const cross = state.cue === 'left' || state.cue === 'right' ? Math.abs(dy) : Math.abs(dx)
    if (!lane.matched && travel >= danceDistance - 1e-9 && travel > cross) {
      lane.matched = true; lane.matches++; lane.feedback = '✓ Nice move! +10 points.'
      this.session.awardScore(event.playerId, 10)
    }
    // Keep an anchor for gradual movement, but require consecutive fresh samples.
    this.samples.set(event.playerId, { x: event.x, y: event.y, anchorX: fresh ? previous.anchorX : event.x, anchorY: fresh ? previous.anchorY : event.y, time: this.now })
    lane.position = { x: event.x, y: event.y }
    return this.snapshot()
  }
  releaseBody(playerId: PlayerId) {
    this.samples.delete(playerId)
    const lane = this.lanes.find(lane => lane.playerId === playerId)
    if (lane) lane.position = null
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
  private snapshot(): DanceChallengeSnapshot {
    const state = this.session.getSnapshot()
    const elapsed = this.now - this.begins - this.cueIndex * danceCycleMs
    return { ...state, lanes: this.lanes.map(lane => ({ ...lane, position: lane.position && { ...lane.position } })),
      cue: danceCues[this.cueIndex % danceCues.length], cueIndex: this.cueIndex,
      active: state.phase === 'playing' && elapsed >= danceWarningMs && elapsed < danceWarningMs + danceWindowMs,
      cueRemainingMs: Math.max(0, danceWarningMs + danceWindowMs - elapsed) }
  }
}
