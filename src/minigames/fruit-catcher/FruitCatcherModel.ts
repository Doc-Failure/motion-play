import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export type FruitKind = 'apple' | 'orange' | 'rotten'
export interface FallingFruit { id: number; playerId: PlayerId; kind: FruitKind; x: number; y: number; spawnedAt: number; fallsForMs: number }
export interface HandPosition { playerId: PlayerId; x: number; y: number; confidence: number }
export interface FruitCatcherSnapshot extends GameSessionSnapshot { fruit: FallingFruit[]; hands: HandPosition[] }
interface StoredFruit extends Omit<FallingFruit, 'y'> { startY: number }

export class FruitCatcherModel {
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private readonly random: () => number
  private readonly spawnIntervalMs: number
  private readonly fallsForMs: number
  private fruit: StoredFruit[] = []
  private hands = new Map<PlayerId, HandPosition>()
  private nextSpawnAt: number | null = null
  private nextId = 1
  private lastTimestamp: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; fallsForMs?: number; random?: () => number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
    this.random = options.random ?? Math.random
    this.spawnIntervalMs = options.spawnIntervalMs ?? 900
    this.fallsForMs = options.fallsForMs ?? 3_400
  }

  start(timestamp: number) {
    this.fruit = []; this.hands.clear(); this.nextSpawnAt = null; this.nextId = 1; this.lastTimestamp = timestamp
    this.session.start(timestamp)
    return this.update(timestamp)
  }

  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp ?? timestamp)
    const state = this.session.update(now)
    this.fruit = this.fruit.filter((item) => now - item.spawnedAt < item.fallsForMs)
    if (state.phase === 'playing') {
      if (this.nextSpawnAt === null) this.nextSpawnAt = now
      const steps = Math.max(0, Math.floor((now - this.nextSpawnAt) / this.spawnIntervalMs) + 1)
      for (let step = 0; step < Math.min(steps, 2); step += 1) for (const playerId of this.players) {
        if (this.fruit.filter((item) => item.playerId === playerId).length < 5) this.fruit.push(this.createFruit(playerId, now + step * this.spawnIntervalMs))
      }
      this.nextSpawnAt += steps * this.spawnIntervalMs
      this.catchFruit(now)
    } else if (state.phase === 'results') this.fruit = []
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  moveHand(event: MotionInputEvent) {
    const now = Math.max(event.timestamp, this.lastTimestamp ?? event.timestamp)
    this.update(now)
    if (event.kind !== 'HAND_POSITION' || event.confidence < .45 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    this.hands.set(event.playerId, { playerId: event.playerId, x: clamp(event.x), y: clamp(event.y), confidence: event.confidence })
    this.catchFruit(now)
    return this.snapshot(now)
  }

  setState(fruit: FallingFruit[]) { this.fruit = fruit.map(({ y, ...item }) => ({ ...item, startY: y })) }

  private catchFruit(now: number) {
    for (const hand of this.hands.values()) {
      const caught = this.visibleFruit(now).find((item) => item.playerId === hand.playerId && Math.abs(item.x - hand.x) <= .13 && Math.abs(item.y - hand.y) <= .13)
      if (!caught) continue
      this.fruit = this.fruit.filter((item) => item.id !== caught.id)
      this.session.awardScore(hand.playerId, caught.kind === 'rotten' ? -10 : 10)
    }
  }

  private createFruit(playerId: PlayerId, spawnedAt: number): StoredFruit {
    const roll = this.random()
    return { id: this.nextId++, playerId, kind: roll < .18 ? 'rotten' : roll < .58 ? 'apple' : 'orange', x: .12 + this.random() * .76, startY: -.08, spawnedAt, fallsForMs: this.fallsForMs }
  }
  private visibleFruit(now: number): FallingFruit[] { return this.fruit.map(({ startY, ...item }) => ({ ...item, y: startY + (now - item.spawnedAt) / item.fallsForMs * 1.16 })) }
  private snapshot(timestamp: number): FruitCatcherSnapshot { return { ...this.session.getSnapshot(timestamp), fruit: this.visibleFruit(timestamp).map((item) => ({ ...item })), hands: [...this.hands.values()].map((hand) => ({ ...hand })) } }
}

const clamp = (value: number) => Math.max(0, Math.min(1, value))
