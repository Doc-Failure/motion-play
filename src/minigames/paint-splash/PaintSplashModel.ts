import {brushStroke} from './brushStroke'
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
  private begins = 0
  private strokes = new Map<PlayerId,MotionInputEvent>()
  private painted = emptyPaint()
  private lastTimestamp: number | null = null

  private readonly radius:number

  constructor(options: { pressure?:number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    const pressure = Math.max(-.15,Math.min(1,options.pressure ?? 0))
    this.radius = .145 - .037 * pressure
    const playerCount = options.playerCount ?? 1
    this.session = new GameSession({ playerCount, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.playerIds = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
  }

  start(timestamp: number) {
    this.clock.reset(timestamp)

    this.strokes.clear()
    this.painted = emptyPaint()
    this.lastTimestamp = timestamp
    this.begins = timestamp + this.session.start(timestamp).countdownRemainingMs
    return this.snapshot(timestamp)
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase !== 'playing' && state.phase !== 'countdown') return state
    this.session.pause(this.lastTimestamp!)
    this.strokes.clear()
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
    const previous = this.strokes.get(event.playerId)
    if (event.kind!=='MOTION_BRUSH' || !this.playerIds.includes(event.playerId)
      || ![event.timestamp,event.x,event.y,event.confidence].every(Number.isFinite)
      || event.x<0 || event.x>1 || event.y<0 || event.y>1 || event.confidence<.15 || event.confidence>1
      || !this.clock.accepts(event.timestamp) || this.clock.time(event.timestamp)<(this.lastTimestamp ?? 0)-150
      || (previous && event.timestamp<previous.timestamp)) return this.snapshot(this.lastTimestamp ?? 0)
    const state = this.update(event.timestamp)
    if (state.phase!=='playing' || this.clock.time(event.timestamp) < this.begins) return state
    const now = this.lastTimestamp!
    const touches = brushStroke(previous,event,this.radius)
    this.strokes.set(event.playerId,event)
    const cells = this.painted[event.playerId]
    const before = cells.size
    for (let row = 0; row < PAINT_ROWS; row += 1) for (let column = 0; column < PAINT_COLUMNS; column += 1) {
      const x = (column + .5) / PAINT_COLUMNS
      const y = (row + .5) / PAINT_ROWS
      if (touches(x,y)) cells.add(row * PAINT_COLUMNS + column)
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
