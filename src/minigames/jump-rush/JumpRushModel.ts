import { GameSession, type GameSessionOptions, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerId } from '../../input/PlayerZoneMapper'

export const jumpCycleMs = 2400
export const jumpImpactMs = 1800
export const jumpDurationMs = 650
export const jumpFreshMs = 350
export const jumpDistance = .18
interface Sample { y: number; anchor: number; time: number; armed: boolean }
interface JumpLane {
  playerId: PlayerId; cleared: number; hits: number; feedback: string
  position: { x: number; y: number } | null; airborne: boolean; hopHeight: number
}
export interface JumpRushSnapshot extends GameSessionSnapshot {
  lanes: JumpLane[]; obstacleX: number; wave: number; impactRemainingMs: number
}

/** Fresh normalized torso rise triggers a hop; hands never enter this model. */
export class JumpRushModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private lanes: JumpLane[] = []
  private samples = new Map<PlayerId, Sample>()
  private visualJumps = new Map<PlayerId, number>()
  private jumps = new Map<PlayerId, number>()
  private lastInput = new Map<PlayerId, number>()
  private now = 0
  private begins = 0
  private ends = 0
  private nextImpact = 0
  private readonly impactMs:number
  private readonly cycleMs:number
  private readonly hopMs:number

  constructor(options: Partial<GameSessionOptions> & { pressure?:number } = {}) {
    const pressure = Math.max(-.15,Math.min(1,options.pressure ?? 0))
    this.impactMs = jumpImpactMs - 350 * pressure
    this.cycleMs = jumpCycleMs - 470 * pressure
    this.hopMs = jumpDurationMs - 75 * pressure
    this.session = new GameSession({ roundDurationMs: 40000, ...options, playerCount: options.playerCount ?? 1 })
  }
  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp
    this.begins = timestamp + state.countdownRemainingMs; this.ends = this.begins + state.roundRemainingMs
    this.nextImpact = this.begins + this.impactMs
    this.samples.clear(); this.jumps.clear(); this.visualJumps.clear(); this.lastInput.clear()
    this.lanes = state.scores.map(({ playerId }) => ({ playerId, cleared: 0, hits: 0, feedback: 'You control the kangaroo. Jump over each hurdle!', position: null, airborne: false, hopHeight: 0 }))
    return this.snapshot()
  }
  update(timestamp: number) {
    if (!Number.isFinite(timestamp) || this.session.getSnapshot().phase === 'results') return this.snapshot()
    const time = Math.min(this.ends, Math.max(this.now, this.clock.time(timestamp)))
    if (!this.clock.paused) while (this.nextImpact <= time && this.nextImpact < this.ends) {
      this.session.update(this.nextImpact)
      for (const lane of this.lanes) {
        const sample = this.samples.get(lane.playerId), jump = this.jumps.get(lane.playerId)
        if (!sample || this.nextImpact - sample.time > jumpFreshMs) {
          lane.feedback = 'Step back: keep shoulders and hips visible.'
        } else if (jump !== undefined && jump <= this.nextImpact && this.nextImpact < jump + this.hopMs) {
          lane.cleared++; this.session.awardScore(lane.playerId, 10); lane.feedback = '✓ Over the hurdle! +10 points.'
        } else {
          lane.hits++; this.session.awardScore(lane.playerId, -5); lane.feedback = '✕ Hurdle bump! −5. Time your next jump!'
        }
      }
      this.nextImpact += this.cycleMs
    }
    this.now = time; this.session.update(time)
    for (const lane of this.lanes) {
      const sample = this.samples.get(lane.playerId), jump = this.jumps.get(lane.playerId)
      if (sample && time - sample.time > jumpFreshMs) this.releaseBody(lane.playerId)
      lane.airborne = this.samples.has(lane.playerId) && jump !== undefined && time < jump + this.hopMs
    }
    return this.snapshot()
  }
  moveBody(event: MotionInputEvent) {
    const lane = this.lanes.find(lane => lane.playerId === event.playerId)
    if (!lane || event.kind !== 'BODY_MOVE' || !Number.isFinite(event.timestamp) || !this.clock.accepts(event.timestamp)
      || this.clock.time(event.timestamp) < Math.max(this.begins, this.now - 150)
      || event.timestamp <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    this.lastInput.set(event.playerId, event.timestamp)
    if (![event.x, event.y, event.confidence].every(Number.isFinite) || event.x < 0 || event.x > 1
      || event.y < 0 || event.y > 1 || event.confidence < .6 || event.confidence > 1) return this.releaseBody(event.playerId)
    const distance = event.pointerId === 'torso' && Number.isFinite(event.activity) ? Math.max(.025, Math.min(.07, event.activity!)) : jumpDistance
    const previous = this.samples.get(event.playerId)
    let anchor = previous?.anchor ?? event.y, armed = previous?.armed ?? true
    // A deliberate downward return rearms the next rise. Holding high never hops again.
    if (previous && !armed && event.y - previous.anchor >= distance - 1e-9) { armed = true; anchor = event.y }
    if (previous && armed && anchor - event.y >= distance - 1e-9) {
      this.jumps.set(event.playerId, this.now); this.visualJumps.set(event.playerId, this.now); armed = false; anchor = event.y
    } else if (armed) anchor = Math.max(anchor, event.y)
    this.samples.set(event.playerId, { y: event.y, anchor, time: this.now, armed })
    lane.position = { x: event.x, y: event.y }
    const jump = this.jumps.get(event.playerId)
    lane.airborne = jump !== undefined && this.now < jump + this.hopMs
    return this.snapshot()
  }
  releaseBody(playerId: PlayerId) {
    if (this.session.getSnapshot().phase === 'results') return this.snapshot()
    this.samples.delete(playerId); this.jumps.delete(playerId)
    const lane = this.lanes.find(lane => lane.playerId === playerId)
    if (lane) { lane.position = null; lane.airborne = false }
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
  private hopHeight(id:PlayerId) {
    const start=this.visualJumps.get(id)
    if(start===undefined)return 0
    const t=Math.max(0,Math.min(1,(this.now-start)/this.hopMs))
    return 4*t*(1-t)
  }
  private snapshot(): JumpRushSnapshot {
    const elapsed = Math.max(0, this.now - this.begins)
    return { ...this.session.getSnapshot(), lanes: this.lanes.map(lane => ({ ...lane, hopHeight: this.hopHeight(lane.playerId), position: lane.position && { ...lane.position } })),
      wave: Math.floor(elapsed / this.cycleMs), obstacleX: 1 - (elapsed % this.cycleMs) / this.cycleMs,
      impactRemainingMs: Math.max(0, this.nextImpact - this.now) }
  }
}
