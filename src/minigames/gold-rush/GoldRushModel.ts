import { PauseClock } from '../../game/PauseClock'
import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export type GoldRushItemKind = 'coin' | 'hazard'

export interface GoldRushItem {
  id: number
  playerId: PlayerId
  kind: GoldRushItemKind
  x: number
  y: number
  spawnedAt: number
  fallsForMs: number
}

export interface GoldRushSnapshot extends GameSessionSnapshot { items: GoldRushItem[] }

interface StoredItem extends Omit<GoldRushItem, 'y'> { startY: number }

export class GoldRushModel {
  private readonly clock = new PauseClock()
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private readonly random: () => number
  private readonly spawnIntervalMs: number
  private readonly fallsForMs: number
  private items: StoredItem[] = []
  private nextSpawnAt: number | null = null
  private nextId = 1
  private lastTimestamp: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; fallsForMs?: number; random?: () => number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
    this.random = options.random ?? Math.random
    this.spawnIntervalMs = options.spawnIntervalMs ?? 850
    this.fallsForMs = options.fallsForMs ?? 3_200
  }

  start(timestamp: number) {
    this.clock.reset(timestamp)

    this.items = []
    this.nextSpawnAt = null
    this.nextId = 1
    this.lastTimestamp = timestamp
    this.session.start(timestamp)
    return this.update(timestamp)
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
    const state = this.session.update(now)
    this.items = this.items.filter((item) => now - item.spawnedAt < item.fallsForMs)
    if (state.phase === 'playing') {
      if (this.nextSpawnAt === null) this.nextSpawnAt = now
      const steps = Math.max(0, Math.floor((now - this.nextSpawnAt) / this.spawnIntervalMs) + 1)
      for (let step = 0; step < Math.min(steps, 2); step += 1) {
        for (const playerId of this.players) {
          if (this.items.filter((item) => item.playerId === playerId).length < 5) this.items.push(this.createItem(playerId, now + step * this.spawnIntervalMs))
        }
      }
      this.nextSpawnAt += steps * this.spawnIntervalMs
    } else if (state.phase === 'results') this.items = []
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  hit(event: MotionInputEvent) {
    if (!this.clock.accepts(event.timestamp)) return this.snapshot(this.lastTimestamp ?? 0)
    this.update(event.timestamp)
    const now = this.lastTimestamp!
    if (event.kind !== 'MOTION_HIT' || event.confidence < .2 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    const item = this.visibleItems(now).find((candidate) => candidate.playerId === event.playerId && Math.hypot(candidate.x - event.x, candidate.y - event.y) <= .14)
    if (!item) return this.snapshot(now)
    this.items = this.items.filter((candidate) => candidate.id !== item.id)
    this.session.awardScore(event.playerId, item.kind === 'coin' ? 10 : -10)
    return this.snapshot(now)
  }

  setState(items: GoldRushItem[]) {
    this.items = items.map(({ y, ...item }) => ({ ...item, startY: y }))
  }

  private createItem(playerId: PlayerId, spawnedAt: number): StoredItem {
    const kind: GoldRushItemKind = this.random() < .78 ? 'coin' : 'hazard'
    return { id: this.nextId++, playerId, kind, x: .12 + this.random() * .76, startY: -.08, spawnedAt, fallsForMs: this.fallsForMs }
  }

  private visibleItems(now: number): GoldRushItem[] {
    return this.items.map(({ startY, ...item }) => ({ ...item, y: startY + (now - item.spawnedAt) / item.fallsForMs * 1.16 }))
  }

  private snapshot(timestamp: number): GoldRushSnapshot {
    return { ...this.session.getSnapshot(timestamp), items: this.visibleItems(timestamp).map((item) => ({ ...item })) }
  }
}
