import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const groceries = ['apple', 'bread', 'milk'] as const
export type GroceryKind = (typeof groceries)[number]
export interface Grocery { kind: GroceryKind; id: number; playerId: PlayerId; x: number; y: number; spawnedAt: number }
export interface GroceryPick { kind: GroceryKind; requested: GroceryKind; correct: boolean }
export interface SupermarketRushSnapshot extends GameSessionSnapshot {
  items: Grocery[]
  collected: Record<PlayerId, number>
  orders: Record<PlayerId, GroceryKind>
  lastPicks: Record<PlayerId, GroceryPick | null>
}

/** Only normalized input enters this model; camera capture belongs to the input layer. */
export class SupermarketRushModel {
  private readonly session: GameSession
  private readonly playerCount: PlayerCount
  private readonly spawnIntervalMs: number
  private readonly travelMs: number
  private items: Grocery[] = []
  private collected: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  private lastPicks: Record<PlayerId, GroceryPick | null> = { 1: null, 2: null, 3: null, 4: null }
  private lastPick: Record<PlayerId, number> = { 1: -Infinity, 2: -Infinity, 3: -Infinity, 4: -Infinity }
  private nextSpawnAt = 0
  private nextId = 1
  private wave = 0
  private lastTimestamp = 0
  private inputNotBefore = 0
  private pausedAt: number | null = null

  private readonly pressure: number

  constructor(options: { pressure?: number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; travelMs?: number } = {}) {
    this.pressure = Math.max(-.15, Math.min(1, options.pressure ?? 0))
    this.playerCount = options.playerCount ?? 1
    this.session = new GameSession({ ...options, playerCount: this.playerCount })
    this.spawnIntervalMs = options.spawnIntervalMs ?? (1800 - 570 * this.pressure)
    this.travelMs = options.travelMs ?? (5400 - 1140 * this.pressure)
    if (!Number.isFinite(this.spawnIntervalMs) || this.spawnIntervalMs < 100 || !Number.isFinite(this.travelMs) || this.travelMs < 100) throw new Error('Grocery timing must be finite and at least 100ms.')
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.items = []
    this.collected = { 1: 0, 2: 0, 3: 0, 4: 0 }
    this.lastPicks = { 1: null, 2: null, 3: null, 4: null }
    this.lastPick = { 1: -Infinity, 2: -Infinity, 3: -Infinity, 4: -Infinity }
    this.nextId = 1
    this.wave = 0
    this.pausedAt = null
    this.lastTimestamp = timestamp
    this.inputNotBefore = this.nextSpawnAt = timestamp + state.countdownRemainingMs
    return this.update(timestamp)
  }

  update(timestamp: number): SupermarketRushSnapshot {
    const now = Math.max(timestamp, this.lastTimestamp)
    const state = this.session.update(now)
    if (state.phase === 'playing') {
      // Spawn the same sequence on every player’s conveyor.
      while (this.nextSpawnAt <= now) {
        this.expire(this.nextSpawnAt)
        for (let index = 0; index < this.playerCount; index += 1) {
          const playerId = (index + 1) as PlayerId
          if (this.items.filter((item) => item.playerId === playerId).length < 4) {
            this.items.push({ id: this.nextId++, playerId, kind: groceries[this.wave % groceries.length], x: .88, y: .5 + [0, -.18, .18][this.wave % 3] * this.pressure, spawnedAt: this.nextSpawnAt })
          }
        }
        this.wave += 1
        this.nextSpawnAt += this.spawnIntervalMs
      }
      this.expire(now)
    }
    if (state.phase === 'results') this.items = []
    this.lastTimestamp = now
    return this.snapshot()
  }

  hit(event: MotionInputEvent) {
    if (event.kind !== 'MOTION_HIT' || !Number.isInteger(event.playerId) || event.playerId < 1 || event.playerId > this.playerCount
      || !Number.isFinite(event.timestamp) || event.timestamp < this.inputNotBefore
      || !Number.isFinite(event.confidence) || event.confidence < .2 || event.confidence > 1
      || !Number.isFinite(event.x) || !Number.isFinite(event.y) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing' || event.timestamp - this.lastPick[event.playerId] < 300) return state
    // Input can arrive after a render tick. Use the capture-time position of
    // surviving items without rewinding time or resurrecting expired ones.
    const target = this.items.find((item) => item.playerId === event.playerId && event.timestamp >= item.spawnedAt
      && ((event.x - this.itemX(item, event.timestamp)) / .1) ** 2 + ((event.y - item.y) / .13) ** 2 <= 1)
    if (target) {
      this.items = this.items.filter((item) => item.id !== target.id)
      const requested = groceries[this.collected[event.playerId] % groceries.length]
      const correct = target.kind === requested
      this.lastPicks[event.playerId] = { kind: target.kind, requested, correct }
      this.session.awardScore(event.playerId, correct ? 10 : -5)
      if (correct) this.collected[event.playerId] += 1
      this.lastPick[event.playerId] = event.timestamp
    }
    return this.snapshot()
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase === 'playing' || state.phase === 'countdown') {
      this.session.pause(this.lastTimestamp)
      this.pausedAt = this.lastTimestamp
    }
    return this.snapshot()
  }

  resume(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp)
    if (this.pausedAt !== null) {
      const elapsed = now - this.pausedAt
      this.nextSpawnAt += elapsed
      for (const item of this.items) item.spawnedAt += elapsed
      for (const id of [1, 2, 3, 4] as const) this.lastPick[id] += elapsed
      this.inputNotBefore = now + this.session.resume(now).countdownRemainingMs
      this.pausedAt = null
    }
    return this.update(now)
  }

  private expire(timestamp: number) {
    this.items = this.items.filter((item) => timestamp - item.spawnedAt < this.travelMs)
  }

  private snapshot(): SupermarketRushSnapshot {
    const state = this.session.getSnapshot()
    const now = this.pausedAt ?? this.lastTimestamp
    return { ...state, items: this.items.map((item) => ({ ...item, x: this.itemX(item, now) })),
      lastPicks: { 1: this.copyPick(1), 2: this.copyPick(2), 3: this.copyPick(3), 4: this.copyPick(4) },
      collected: { ...this.collected }, orders: { 1: groceries[this.collected[1] % 3], 2: groceries[this.collected[2] % 3], 3: groceries[this.collected[3] % 3], 4: groceries[this.collected[4] % 3] } }
  }

  private copyPick(playerId: PlayerId) {
    const pick = this.lastPicks[playerId]
    return pick ? { ...pick } : null
  }

  private itemX(item: Grocery, timestamp: number) {
    return .88 - Math.max(0, timestamp - item.spawnedAt) / this.travelMs * .76
  }
}
