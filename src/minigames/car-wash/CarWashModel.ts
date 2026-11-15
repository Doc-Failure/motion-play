import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

// Mud follows the vehicle silhouette, rather than covering the entire board.
export const CAR_MUD = Array.from({ length: 60 }, (_, id) => ({ id, column: id % 10, row: Math.floor(id / 10) }))
  .filter(({ column, row }) => row === 1 ? column >= 3 && column <= 6 : row === 2 ? column >= 2 && column <= 7 : (row === 3 || row === 4) && column >= 1 && column <= 8)
  .map(({ id, column, row }) => ({ id, x: (column + .5) / 10, y: (row + .5) / 6 }))
export const CAR_BRUSH_RADIUS = .12

export interface CarWashSnapshot extends GameSessionSnapshot {
  brushes: Record<PlayerId, { x: number; y: number } | null>
  cleaned: Record<PlayerId, number[]>
  progress: Record<PlayerId, number>
  teamProgress: number
}

/** Consumes player-local events only. No camera or media dependencies. */
export class CarWashModel {
  private readonly session: GameSession
  private readonly playerIds: PlayerId[]
  private cleaned: Record<PlayerId, Set<number>> = emptyCleaned()
  private lastTimestamp = 0
  private inputNotBefore = 0
  private brushes: Partial<Record<PlayerId, { x: number; y: number; timestamp: number }>> = {}

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    const playerCount = options.playerCount ?? 1
    this.playerIds = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
    this.session = new GameSession({ ...options, playerCount })
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.cleaned = emptyCleaned()
    this.brushes = {}
    this.lastTimestamp = timestamp
    this.inputNotBefore = timestamp + state.countdownRemainingMs
    return this.snapshot()
  }

  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp)
    this.session.update(now)
    this.lastTimestamp = now
    return this.snapshot()
  }

  brush(event: MotionInputEvent) {
    // Reject malformed captures before they can advance the round clock.
    if (event.kind !== 'MOTION_BRUSH' || !this.playerIds.includes(event.playerId)
      || !Number.isFinite(event.timestamp) || event.timestamp < this.inputNotBefore
      || !Number.isFinite(event.confidence) || event.confidence < .15 || event.confidence > 1
      || !Number.isFinite(event.x) || !Number.isFinite(event.y) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    this.brushes[event.playerId] = { x: event.x, y: event.y, timestamp: event.timestamp }
    const cells = this.cleaned[event.playerId]
    const before = cells.size
    for (const cell of CAR_MUD) {
      if (Math.hypot(event.x - cell.x, event.y - cell.y) <= CAR_BRUSH_RADIUS) cells.add(cell.id)
    }
    this.session.awardScore(event.playerId, cells.size - before)
    if (this.playerIds.every((id) => this.cleaned[id].size === CAR_MUD.length)) this.session.finish(this.lastTimestamp)
    return this.snapshot()
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase === 'playing' || state.phase === 'countdown') {
      this.session.pause(this.lastTimestamp)
      this.brushes = {}
    }
    return this.snapshot()
  }

  resume(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp)
    if (this.session.getSnapshot().phase === 'paused') this.inputNotBefore = now + this.session.resume(now).countdownRemainingMs
    return this.update(now)
  }

  private snapshot(): CarWashSnapshot {
    const cleaned: Record<PlayerId, number[]> = { 1: [], 2: [], 3: [], 4: [] }
    const progress: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    const brushes: CarWashSnapshot['brushes'] = { 1: null, 2: null, 3: null, 4: null }
    const session = this.session.getSnapshot()
    let total = 0
    for (const id of this.playerIds) {
      cleaned[id] = [...this.cleaned[id]].sort((a, b) => a - b)
      progress[id] = Math.round(cleaned[id].length / CAR_MUD.length * 100)
      total += cleaned[id].length
      const brush = this.brushes[id]
      // A stale trace must not look like a hand that is still being tracked.
      if (session.phase === 'playing' && brush && this.lastTimestamp - brush.timestamp < 350) {
        brushes[id] = { x: brush.x, y: brush.y }
      }
    }
    return { ...session, brushes, cleaned, progress, teamProgress: Math.round(total / (CAR_MUD.length * this.playerIds.length) * 100) }
  }
}

function emptyCleaned(): Record<PlayerId, Set<number>> { return { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() } }
