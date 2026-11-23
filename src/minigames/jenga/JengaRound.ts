import { GameSession } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { blockAt, towerBlocks, type Slot } from './TowerGeometry'

type Layer = boolean[]
const full = (row: Layer) => row.every(Boolean)
export const topRow = (tower: Layer[]) => tower.length - (full(tower[tower.length - 1]) ? 0 : 1)
export const canPull = (tower: Layer[], { row, column }: Slot) =>
  Number.isInteger(row) && row >= 0 && row < topRow(tower) - 1 && tower[row][column] === true

// Each layer crosses the one below. In units of one block width, a slot's
// centre is -1, 0 or 1 and its support extends half a block on either side.
export function balanced(tower: Layer[]) {
  let weight = 0
  const moment = [0, 0]
  for (let row = tower.length - 1; row >= 0; row--) {
    const columns = [0, 1, 2].filter(column => tower[row][column])
    if (!columns.length) return false
    const axis = row % 2
    const centre = weight ? moment[axis] / weight : 0
    if (weight && (centre <= columns[0] - 1.5 || centre >= columns[columns.length - 1] - .5)) return false
    for (const column of columns) moment[axis] += column - 1
    weight += columns.length
  }
  return true
}

export class JengaRound {
  private readonly clock: GameSession
  private tower: Layer[] = []
  private player: PlayerId = 1
  private holding = false
  private fallen = false
  private restoredAt = 0
  private lastSample = -Infinity
  private grip?: { slot: Slot; hand: string; start: number; x: number; y: number; locked: boolean }
  private hand?: { x: number; y: number }
  private progress = 0

  constructor(private players: PlayerCount, pressure = 0) {
    this.clock = new GameSession({ playerCount: players, roundDurationMs: 60000 - Math.round(12000 * pressure) })
  }
  start(now: number) {
    const start = this.clock.start(now)
    this.tower = Array.from({ length: 6 }, () => [true, true, true])
    this.player = 1
    this.holding = this.fallen = false
    this.resetInput(now + start.countdownRemainingMs)
    return this.update(now)
  }
  private resetInput(since: number) {
    this.restoredAt = since
    this.clearGrip()
  }
  private clearGrip() {
    this.hand = this.grip = undefined
    this.progress = 0
  }
  update(now: number) {
    if (now - this.lastSample > 350) this.clearGrip()
    return { ...this.clock.update(now), tower: this.tower, player: this.player, holding: this.holding, fallen: this.fallen,
      hand: this.hand, target: this.grip?.slot, locked: this.grip?.locked, progress: this.progress }
  }
  pause(now: number) {
    const state = this.update(now)
    if (state.phase === 'countdown' || state.phase === 'playing') this.clock.pause(now)
    this.clearGrip()
    return this.update(now)
  }
  resume(now: number) {
    const state = this.clock.resume(now)
    this.resetInput(now + state.countdownRemainingMs)
    return this.update(now)
  }
  available(slot: Slot) {
    if (!this.holding) return canPull(this.tower, slot)
    return slot.row === topRow(this.tower) && Number.isInteger(slot.column) && slot.column >= 0 && slot.column < 3 && !this.tower[slot.row]?.[slot.column]
  }
  move(slot: Slot, player: PlayerId, now: number) {
    if (this.clock.update(now).phase !== 'playing' || player !== this.player || !this.available(slot)) return
    const placing = this.holding
    const next = this.tower.map(row => [...row])
    if (!next[slot.row]) next.push([false, false, false])
    next[slot.row][slot.column] = placing
    this.tower = next
    this.holding = !placing
    this.resetInput(now)
    if (!balanced(next)) {
      this.fallen = true
      this.clock.finish(now)
    } else if (placing) {
      this.clock.awardScore(player, 1)
      this.player = (player % this.players + 1) as PlayerId
    }
  }
  input(events: MotionInputEvent[], aspect: number, now: number) {
    if (this.clock.update(now).phase !== 'playing') return
    const points = events.filter(e => e.kind === 'HAND_POSITION' && e.playerId === this.player && e.pointerId &&
      e.confidence >= .6 && e.confidence <= 1 && e.timestamp >= this.restoredAt && e.timestamp <= now && now - e.timestamp <= 350 &&
      [e.x, e.y].every(n => Number.isFinite(n) && n >= 0 && n <= 1))
    if (!points.length) { this.clearGrip(); return }
    const blocks = towerBlocks(this.tower, this.holding, aspect)
    const point = points.find(p => p.pointerId === this.grip?.hand) ??
      points.find(p => { const hit = blockAt(p.x, p.y, blocks); return hit && this.available(hit) }) ?? points[0]
    if (point.timestamp <= this.lastSample) return
    if (point.timestamp - this.lastSample > 350 || point.pointerId !== this.grip?.hand) this.clearGrip()
    this.lastSample = point.timestamp
    this.hand = { x: point.x, y: point.y }
    if (this.grip?.locked) {
      if (Math.abs(point.y - this.grip.y) > .10) this.clearGrip()
      else if (Math.abs(point.x - this.grip.x) >= Math.min(.14, .07 / aspect)) this.move(this.grip.slot, this.player, now)
      return
    }
    const slot = blockAt(point.x, point.y, blocks)
    if (!slot || !this.available(slot)) { this.grip = undefined; this.progress = 0; return }
    if (this.grip?.slot.row !== slot.row || this.grip.slot.column !== slot.column) {
      this.grip = { slot, hand: point.pointerId!, start: point.timestamp, x: point.x, y: point.y, locked: false }
    }
    this.progress = Math.min(1, (point.timestamp - this.grip.start) / 400)
    if (this.progress < 1) return
    if (this.holding) this.move(slot, this.player, now)
    else Object.assign(this.grip, { locked: true, x: point.x, y: point.y })
  }
}
