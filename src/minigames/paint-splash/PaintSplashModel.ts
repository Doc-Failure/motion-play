import { PauseClock } from '../../game/PauseClock'
import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const PAINT_COLUMNS = 12
export const PAINT_ROWS = 8
const TOTAL_CELLS = PAINT_COLUMNS * PAINT_ROWS

export interface PaintSplashSnapshot extends GameSessionSnapshot {
  painted: Record<PlayerId, number[]>
  coverage: Record<PlayerId, number>
}

export class PaintSplashModel {
  private readonly clock = new PauseClock()
  private readonly session: GameSession
  private readonly playerIds: PlayerId[]
  private painted = emptyPaint()
  private lastTimestamp: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    const playerCount = options.playerCount ?? 1
    this.session = new GameSession({ playerCount, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.playerIds = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
  }

  start(timestamp: number) {
    this.clock.reset(timestamp)

    this.painted = emptyPaint()
    this.lastTimestamp = timestamp
    this.session.start(timestamp)
    return this.snapshot(timestamp)
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase !== 'playing' && state.phase !== 'countdown') return state
    this.session.pause(this.lastTimestamp!)
    this.clock.pause(timestamp)
    return this.snapshot(this.lastTimestamp!)
  }

  resume(timestamp: number) {
    if (!this.clock.paused) return this.update(timestamp)
    this.clock.resume(timestamp)
    this.lastTimestamp = Math.max(this.clock.time(timestamp), this.lastTimestamp ?? 0)
    this.session.resume(this.lastTimestamp)
    return this.snapshot(this.lastTimestamp)
  }

  update(timestamp: number) {
    const now = Math.max(this.clock.time(timestamp), this.lastTimestamp ?? this.clock.time(timestamp))
    if (this.clock.paused) return this.snapshot(now)
    this.lastTimestamp = now
    this.session.update(now)
    return this.snapshot(now)
  }

  brush(event: MotionInputEvent) {
    if (!this.clock.accepts(event.timestamp)) return this.snapshot(this.lastTimestamp ?? 0)
    this.update(event.timestamp)
    const now = this.lastTimestamp!
    if (event.kind !== 'MOTION_BRUSH' || event.confidence < .15 || !this.playerIds.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    const cells = this.painted[event.playerId]
    const before = cells.size
    for (let row = 0; row < PAINT_ROWS; row += 1) for (let column = 0; column < PAINT_COLUMNS; column += 1) {
      const x = (column + .5) / PAINT_COLUMNS
      const y = (row + .5) / PAINT_ROWS
      if (Math.hypot(event.x - x, event.y - y) <= .13) cells.add(row * PAINT_COLUMNS + column)
    }
    this.session.awardScore(event.playerId, cells.size - before)
    if (this.playerIds.every((playerId) => this.painted[playerId].size === TOTAL_CELLS)) this.session.finish(now)
    return this.snapshot(now)
  }

  private snapshot(timestamp: number): PaintSplashSnapshot {
    const painted = emptyArrays()
    const coverage = emptyCoverage()
    for (const playerId of this.playerIds) {
      painted[playerId] = [...this.painted[playerId]].sort((a, b) => a - b)
      coverage[playerId] = Math.round(this.painted[playerId].size / TOTAL_CELLS * 100)
    }
    return { ...this.session.getSnapshot(timestamp), painted, coverage }
  }
}

function emptyPaint(): Record<PlayerId, Set<number>> { return { 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set() } }
function emptyArrays(): Record<PlayerId, number[]> { return { 1: [], 2: [], 3: [], 4: [] } }
function emptyCoverage(): Record<PlayerId, number> { return { 1: 0, 2: 0, 3: 0, 4: 0 } }
