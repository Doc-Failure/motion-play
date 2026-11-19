import { GameSession, type GameSessionSnapshot, type GameSessionOptions } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerId } from '../../input/PlayerZoneMapper'

export const towerBlockWidth = .36
export const towerHoldMs = 800
export const towerSampleGapMs = 250
export interface TowerBlock { x: number; y: number }
interface Hold extends TowerBlock { startedAt: number; timestamp: number }
interface TowerLane {
  playerId: PlayerId
  blocks: TowerBlock[]
  target: TowerBlock
  hand: TowerBlock | null
  progress: number
  placed: number
  completed: number
  topples: number
  feedback: string
}
export interface TowerBuilderSnapshot extends GameSessionSnapshot { lanes: TowerLane[]; teamScore: number }

/** Only fresh generic positions advance a hold. Rendering and missing input never place blocks. */
export class TowerBuilderModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private lanes: TowerLane[] = []
  private holds = new Map<PlayerId, Hold>()
  private lastInput = new Map<PlayerId, number>()
  private now = 0
  private inputNotBefore = 0

  private readonly steadyRadius:number
  private readonly positionTolerance:number
  private readonly offset:number

  constructor(private readonly options: Partial<GameSessionOptions> & { pressure?:number } = {}) {
    const pressure = Math.max(-.15,Math.min(1,options.pressure ?? 0))
    this.steadyRadius = .047 - .010 * pressure
    this.positionTolerance = .12 - .025 * pressure
    this.offset = .068 * Math.max(0,pressure)
    this.session = new GameSession({ ...options, playerCount: options.playerCount ?? 1 })
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp)
    this.now = timestamp
    this.inputNotBefore = timestamp + state.countdownRemainingMs
    this.holds.clear(); this.lastInput.clear()
    this.lanes = state.scores.map(({ playerId }) => ({ playerId, blocks: [], target: { x: .5, y: .82 }, hand: null,
      progress: 0, placed: 0, completed: 0, topples: 0, feedback: 'Guide a block to the dashed outline. Hold steady!' }))
    return this.update(timestamp)
  }

  update(timestamp: number) {
    const time = Math.max(this.now, this.clock.time(timestamp))
    const state = this.session.update(time)
    this.now = time
    for (const lane of this.lanes) {
      const hold = this.holds.get(lane.playerId)
      if (state.phase !== 'playing' || (hold && time - hold.timestamp > towerSampleGapMs)
        || time - this.clock.time(this.lastInput.get(lane.playerId) ?? -Infinity) > towerSampleGapMs) this.clearHold(lane)
    }
    return this.snapshot()
  }

  moveHand(event: MotionInputEvent) {
    const lane = this.lanes.find(({ playerId }) => playerId === event.playerId)
    if (!lane || event.kind !== 'HAND_POSITION' || !Number.isFinite(event.timestamp)
      || !this.clock.accepts(event.timestamp) || this.clock.time(event.timestamp) < this.inputNotBefore
      || this.clock.time(event.timestamp) < this.now - towerSampleGapMs
      || event.timestamp <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    // Remember rejected samples too: older packets cannot restore lost tracking.
    // A low-confidence or malformed sample breaks continuity; it cannot bridge a stable hold.
    if (![event.x, event.y, event.confidence].every(Number.isFinite) || event.x < 0 || event.x > 1
      || event.y < 0 || event.y > 1 || event.confidence < .6 || event.confidence > 1) {
      this.lastInput.set(event.playerId, event.timestamp)
      this.clearHold(lane)
      return this.snapshot()
    }
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    this.lastInput.set(event.playerId, event.timestamp)
    const time = this.clock.time(event.timestamp)
    lane.hand = { x: event.x, y: event.y }
    if (Math.abs(event.y - lane.target.y) > .07) {
      this.holds.delete(event.playerId); lane.progress = 0
      return this.snapshot()
    }
    let hold = this.holds.get(event.playerId)
    if (!hold || time - hold.timestamp > towerSampleGapMs || Math.hypot(event.x - hold.x, event.y - hold.y) > this.steadyRadius) {
      hold = { x: event.x, y: event.y, startedAt: time, timestamp: time }
      this.holds.set(event.playerId, hold)
    }
    hold.timestamp = time
    lane.progress = Math.min(1, (time - hold.startedAt) / towerHoldMs)
    if (lane.progress === 1) {
      const halfWidth = towerBlockWidth / 2
      if (Math.abs(event.x - lane.target.x) <= this.positionTolerance && event.x >= halfWidth && event.x <= 1 - halfWidth) {
        lane.blocks.push({ x: event.x, y: lane.target.y })
        lane.placed++
        const complete = lane.blocks.length === 6
        this.session.awardScore(event.playerId, complete ? 40 : 10)
        lane.feedback = complete ? '★ Six blocks! +30 team bonus. Build another!' : '✓ Steady stacking! +10 for the team.'
        if (complete) { lane.completed++; lane.blocks = [] }
        lane.target = { x: complete ? .5 : Math.max(towerBlockWidth/2,Math.min(1-towerBlockWidth/2,event.x + this.offset * (lane.blocks.length%2 ? 1 : -1))), y: .82 - lane.blocks.length * .09 }
      } else {
        lane.topples++; lane.blocks = []; lane.target = { x: .5, y: .82 }
        lane.feedback = 'Oops, off balance! Try the outline. Your points are safe.'
      }
      this.clearHold(lane)
    }
    return this.snapshot()
  }

  releaseHand(playerId: PlayerId) {
    const lane = this.lanes.find(lane => lane.playerId === playerId)
    if (lane) this.clearHold(lane)
    return this.snapshot()
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase === 'playing' || state.phase === 'countdown') {
      this.session.pause(this.now); this.clock.pause(timestamp)
      this.lanes.forEach(lane => this.clearHold(lane))
    }
    return this.snapshot()
  }

  resume(timestamp: number) {
    if (this.clock.paused) { this.clock.resume(timestamp); this.session.resume(this.clock.time(timestamp)) }
    return this.update(timestamp)
  }

  private clearHold(lane: TowerLane) { this.holds.delete(lane.playerId); lane.progress = 0; lane.hand = null }
  private snapshot(): TowerBuilderSnapshot {
    const state = this.session.getSnapshot()
    return { ...state, teamScore: state.scores.reduce((sum, { score }) => sum + score, 0),
      lanes: this.lanes.map(lane => ({ ...lane, blocks: lane.blocks.map(block => ({ ...block })),
        target: { ...lane.target }, hand: lane.hand && { ...lane.hand } })) }
  }
}
