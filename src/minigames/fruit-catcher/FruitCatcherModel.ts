import { PauseClock } from '../../game/PauseClock'
import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export type FruitKind = 'apple' | 'orange' | 'rotten'
export interface FallingFruit { id: number; playerId: PlayerId; kind: FruitKind; x: number; y: number; spawnedAt: number; fallsForMs: number }
export interface HandPosition { playerId: PlayerId; x: number; y: number; confidence: number }
export interface FruitCatcherSnapshot extends GameSessionSnapshot { fruit: FallingFruit[]; hands: HandPosition[] }
interface StoredFruit extends Omit<FallingFruit, 'y'> { startY: number }

export class FruitCatcherModel {
  private readonly clock = new PauseClock()
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private readonly random: () => number
  private readonly spawnIntervalMs: number
  private readonly fallsForMs: number
  private fruit: StoredFruit[] = []
  private hands = new Map<PlayerId, HandPosition & { timestamp: number }>()
  private nextSpawnAt: number | null = null
  private nextId = 1
  private lastTimestamp: number | null = null

  private readonly pressure: number

  constructor(options: { pressure?: number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; fallsForMs?: number; random?: () => number } = {}) {
    this.pressure = Math.max(-.15, Math.min(1, options.pressure ?? 0))
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
    this.random = options.random ?? Math.random
    this.spawnIntervalMs = options.spawnIntervalMs ?? (900 - 240 * this.pressure)
    this.fallsForMs = options.fallsForMs ?? (3400 - 900 * this.pressure)
  }

  start(timestamp: number) {
    this.clock.reset(timestamp)

    this.fruit = []; this.hands.clear(); this.nextSpawnAt = null; this.nextId = 1; this.lastTimestamp = timestamp
    this.session.start(timestamp)
    return this.update(timestamp)
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase !== 'playing' && state.phase !== 'countdown') return state
    this.hands.clear()
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
    this.fruit = this.fruit.filter((item) => now - item.spawnedAt < item.fallsForMs)
    if (state.phase === 'playing') {
      if (this.nextSpawnAt === null) this.nextSpawnAt = now
      const steps = Math.max(0, Math.floor((now - this.nextSpawnAt) / this.spawnIntervalMs) + 1)
      for (let step = 0; step < Math.min(steps, 2); step += 1) for (const playerId of this.players) {
        if (this.fruit.filter((item) => item.playerId === playerId).length < 5) this.fruit.push(this.createFruit(playerId, this.nextSpawnAt + (steps - Math.min(steps, 2) + step) * this.spawnIntervalMs))
      }
      this.nextSpawnAt += steps * this.spawnIntervalMs
      for (const [id, hand] of this.hands) if (now - hand.timestamp > 300) this.hands.delete(id)
    } else if (state.phase === 'results') this.fruit = []
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  moveHand(event: MotionInputEvent) {
    if (!this.clock.accepts(event.timestamp)) return this.snapshot(this.lastTimestamp ?? 0)
    this.update(event.timestamp)
    const now = this.lastTimestamp!
    if (event.kind !== 'HAND_POSITION' || event.confidence < .45 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    const observedAt = this.clock.time(event.timestamp)
    if (now - observedAt > 300 || observedAt <= (this.hands.get(event.playerId)?.timestamp ?? -Infinity)) return this.snapshot(now)
    const hand = { playerId: event.playerId, x: clamp(event.x), y: clamp(event.y), confidence: event.confidence, timestamp: observedAt }
    this.hands.set(event.playerId, hand)
    this.catchFruit(hand, observedAt)
    return this.snapshot(now)
  }

  setState(fruit: FallingFruit[]) { this.fruit = fruit.map(({ y, ...item }) => ({ ...item, startY: y })) }

  private catchFruit(hand: HandPosition, observedAt: number) {
    const caught = this.visibleFruit(observedAt).find(item => item.playerId === hand.playerId && item.spawnedAt <= observedAt
      && Math.abs(item.x - hand.x) <= .13 && Math.abs(item.y - hand.y) <= .13)
    if (!caught) return
    this.fruit = this.fruit.filter(item => item.id !== caught.id)
    this.session.awardScore(hand.playerId, caught.kind === 'rotten' ? -10 : 10)
  }

  private createFruit(playerId: PlayerId, spawnedAt: number): StoredFruit {
    const roll = this.random()
    return { id: this.nextId++, playerId, kind: roll < .18 ? 'rotten' : roll < .58 ? 'apple' : 'orange', x: .12 + this.random() * .76, startY: -.08, spawnedAt, fallsForMs: this.fallsForMs }
  }
  private visibleFruit(now: number): FallingFruit[] { return this.fruit.map(({ startY, ...item }) => ({ ...item, y: startY + (now - item.spawnedAt) / item.fallsForMs * 1.16 })) }
  private snapshot(timestamp: number): FruitCatcherSnapshot { return { ...this.session.getSnapshot(timestamp), fruit: this.visibleFruit(timestamp).map((item) => ({ ...item })), hands: [...this.hands.values()].map((hand) => ({ ...hand })) } }
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
