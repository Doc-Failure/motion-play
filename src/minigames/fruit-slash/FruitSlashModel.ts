import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import { isValidSwipe } from '../../input/HandSwipe'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export interface SlashFruit { id: number; playerId: PlayerId; kind: 'apple' | 'orange' | 'bomb'; x: number; y: number; spawnedAt: number }
export interface SlashTrail { playerId: PlayerId; x: number; y: number; fromX: number; fromY: number; timestamp: number }
export interface FruitSlashSnapshot extends GameSessionSnapshot { fruit: SlashFruit[]; trails: SlashTrail[] }
const flightMs = 2400
const spawnMs = 900
export const slashRadius = .09

export class FruitSlashModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private readonly players: PlayerId[]
  private readonly random: () => number
  private fruit: SlashFruit[] = []
  private trails: SlashTrail[] = []
  private lastInput = new Map<PlayerId, number>()
  private now = 0
  private playingAt = 0
  private nextSpawnAt = 0
  private nextId = 1

  private readonly pressure: number

  constructor(options: { pressure?: number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; random?: () => number } = {}) {
    this.pressure = Math.max(-.15, Math.min(1, options.pressure ?? 0))
    const count = options.playerCount ?? 1
    this.session = new GameSession({ ...options, playerCount: count })
    this.players = Array.from({ length: count }, (_, i) => (i + 1) as PlayerId)
    this.random = options.random ?? Math.random
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp
    this.playingAt = timestamp + state.countdownRemainingMs
    this.nextSpawnAt = this.playingAt; this.nextId = 1
    this.fruit = []; this.trails = []; this.lastInput.clear()
    return this.update(timestamp)
  }

  update(timestamp: number): FruitSlashSnapshot {
    if (!Number.isFinite(timestamp) || this.clock.paused || this.session.getSnapshot().phase === 'results') return this.snapshot()
    this.now = Math.max(this.now, this.clock.time(timestamp))
    const state = this.session.update(this.now)
    if (state.phase === 'playing') {
      // Spawn on the round timeline, so sparse and frequent rendering agree.
      while (this.nextSpawnAt <= this.now) {
        for (const playerId of this.players) {
          const roll = this.random()
          this.fruit.push({ id: this.nextId++, playerId, kind: roll < .2 ? 'bomb' : roll < .6 ? 'apple' : 'orange', x: .25 + this.random() * .5, y: 0, spawnedAt: this.nextSpawnAt })
        }
        this.nextSpawnAt += spawnMs - 240 * this.pressure
      }
      this.fruit = this.fruit.filter(item => this.now - item.spawnedAt < this.flightTime)
      this.trails = this.trails.filter(trail => this.now - trail.timestamp <= 180)
    } else if (state.phase === 'results') { this.fruit = []; this.trails = [] }
    return this.snapshot()
  }

  slash(event: MotionInputEvent) {
    if (!Number.isFinite(event.timestamp) || !this.clock.accepts(event.timestamp) || !this.players.includes(event.playerId) || event.kind !== 'HAND_SWIPE') return this.snapshot()
    const time = this.clock.time(event.timestamp)
    if (time < this.now - 200 || time <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    this.update(event.timestamp)
    if (this.session.getSnapshot().phase !== 'playing') return this.snapshot()
    this.lastInput.set(event.playerId, time)
    // Do not allow segments to reach across countdown, pause or replay.
    if (!isValidSwipe(event) || time - event.swipe!.durationMs < this.playingAt || !this.clock.accepts(event.timestamp - event.swipe!.durationMs)) return this.snapshot()
    const { fromX, fromY } = event.swipe!
    this.trails = this.trails.filter(trail => trail.playerId !== event.playerId)
    this.trails.push({ playerId: event.playerId, x: event.x, y: event.y, fromX, fromY, timestamp: time })
    this.fruit = this.fruit.filter(item => {
      if (item.playerId !== event.playerId || time - event.swipe!.durationMs < item.spawnedAt) return true
      const point = this.position(item, time)
      if (point.y < 0 || point.y > 1 || segmentDistance(point, { x: fromX, y: fromY }, event) > slashRadius) return true
      this.session.awardScore(event.playerId, item.kind === 'bomb' ? -15 : 10)
      return false
    })
    return this.snapshot()
  }

  pause(timestamp: number) {
    this.update(timestamp)
    const phase = this.session.getSnapshot().phase
    if (phase === 'countdown' || phase === 'playing') { this.session.pause(this.now); this.clock.pause(timestamp); this.trails = [] }
    return this.snapshot()
  }
  resume(timestamp: number) {
    if (!this.clock.paused) return this.update(timestamp)
    this.clock.resume(timestamp); this.session.resume(this.now)
    return this.snapshot()
  }
  private get flightTime() { return flightMs - 580 * this.pressure }

  private position(item: SlashFruit, time = this.now) {
    const t = (time - item.spawnedAt) / this.flightTime
    return { ...item, y: 1.1 - 3.2 * t * (1 - t) }
  }
  private snapshot(): FruitSlashSnapshot {
    return { ...this.session.getSnapshot(this.now), fruit: this.fruit.map(item => this.position(item)), trails: this.trails.map(trail => ({ ...trail })) }
  }
}

function segmentDistance(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x, dy = b.y - a.y
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy)
}
