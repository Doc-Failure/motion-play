import {brushStroke} from '../paint-splash/brushStroke'
import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

// Equal-sized patches make coverage and race scores directly comparable.
export const MURAL_COLUMNS = 12
export const MURAL_ROWS = 8
export const MURAL_PATCHES = Array.from({ length: MURAL_COLUMNS * MURAL_ROWS }, (_, id) => ({
  id, x: (id % MURAL_COLUMNS + .5) / MURAL_COLUMNS, y: (Math.floor(id / MURAL_COLUMNS) + .5) / MURAL_ROWS,
}))
export const GRAFFITI_BRUSH_RADIUS = .12

export interface GraffitiRaceSnapshot extends GameSessionSnapshot {
  brushes: Record<PlayerId, { x: number; y: number } | null>
  revealed: Record<PlayerId, number[]>
  progress: Record<PlayerId, number>
}

/** Consumes player-local events only. No camera or media dependencies. */
export class GraffitiRaceModel {
  private readonly session: GameSession
  private readonly playerIds: PlayerId[]
  private revealed: Record<PlayerId, Set<number>> = emptyRevealed()
  private lastTimestamp = 0
  private inputNotBefore = 0
  private brushes: Partial<Record<PlayerId, { x: number; y: number; timestamp: number; pointerId?:string }>> = {}

  readonly radius:number

  constructor(options: { pressure?:number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    const pressure = Math.max(-.15,Math.min(1,options.pressure ?? 0))
    this.radius = GRAFFITI_BRUSH_RADIUS - .025 * pressure
    const playerCount = options.playerCount ?? 1
    this.playerIds = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
    this.session = new GameSession({ ...options, playerCount })
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.revealed = emptyRevealed()
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
      || !Number.isFinite(event.timestamp) || event.timestamp < Math.max(this.inputNotBefore,this.lastTimestamp-160,this.brushes[event.playerId]?.timestamp ?? -Infinity)
      || !Number.isFinite(event.confidence) || event.confidence < .15 || event.confidence > 1
      || !Number.isFinite(event.x) || !Number.isFinite(event.y) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    const touches = brushStroke(this.brushes[event.playerId],event,this.radius)
    this.brushes[event.playerId] = { x:event.x, y:event.y, timestamp:event.timestamp, pointerId:event.pointerId }
    const cells = this.revealed[event.playerId]
    const before = cells.size
    for (const cell of MURAL_PATCHES) {
      if (touches(cell.x,cell.y)) cells.add(cell.id)
    }
    this.session.awardScore(event.playerId, cells.size - before)
    if (cells.size === MURAL_PATCHES.length) this.session.finish(this.lastTimestamp)
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

  private snapshot(): GraffitiRaceSnapshot {
    const revealed: Record<PlayerId, number[]> = { 1: [], 2: [], 3: [], 4: [] }
    const progress: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
    const brushes: GraffitiRaceSnapshot['brushes'] = { 1: null, 2: null, 3: null, 4: null }
    const session = this.session.getSnapshot()
    for (const id of this.playerIds) {
      revealed[id] = [...this.revealed[id]].sort((a, b) => a - b)
      progress[id] = Math.floor(revealed[id].length / MURAL_PATCHES.length * 100)
      const brush = this.brushes[id]
      // A stale trace must not look like a hand that is still being tracked.
      if (session.phase === 'playing' && brush && this.lastTimestamp - brush.timestamp < 350) {
        brushes[id] = { x: brush.x, y: brush.y }
      }
    }
    return { ...session, brushes, revealed, progress }
  }
}

function emptyRevealed(): Record<PlayerId, Set<number>> { return { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() } }
