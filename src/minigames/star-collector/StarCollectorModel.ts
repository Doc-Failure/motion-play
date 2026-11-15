import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

const positions = [[.25, .5], [.72, .3], [.5, .73], [.25, .25], [.76, .7], [.5, .45]] as const

export interface Star { id: number; playerId: PlayerId; x: number; y: number; spawnedAt: number; remaining: number }
export interface StarCollectorSnapshot extends GameSessionSnapshot {
  items: Star[]
  collected: Record<PlayerId, number>
}

/** Only normalized input enters this model; camera capture belongs to the input layer. */
export class StarCollectorModel {
  private readonly session: GameSession
  private readonly playerCount: PlayerCount
  private readonly spawnIntervalMs: number
  private readonly lifetimeMs: number
  private items: Star[] = []
  private collected: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  private lastPick: Record<PlayerId, number> = { 1: -Infinity, 2: -Infinity, 3: -Infinity, 4: -Infinity }
  private nextSpawnAt = 0
  private nextId = 1
  private wave = 0
  private lastTimestamp = 0
  private inputNotBefore = 0
  private pausedAt: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; lifetimeMs?: number } = {}) {
    this.playerCount = options.playerCount ?? 1
    this.session = new GameSession({ ...options, playerCount: this.playerCount })
    this.spawnIntervalMs = options.spawnIntervalMs ?? 1_200
    this.lifetimeMs = options.lifetimeMs ?? 2_400
    if (!Number.isFinite(this.spawnIntervalMs) || this.spawnIntervalMs < 100 || !Number.isFinite(this.lifetimeMs) || this.lifetimeMs < 100) throw new Error('Star timing must be finite and at least 100ms.')
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.items = []
    this.collected = { 1: 0, 2: 0, 3: 0, 4: 0 }
    this.lastPick = { 1: -Infinity, 2: -Infinity, 3: -Infinity, 4: -Infinity }
    this.nextId = 1
    this.wave = 0
    this.pausedAt = null
    this.lastTimestamp = timestamp
    this.inputNotBefore = this.nextSpawnAt = timestamp + state.countdownRemainingMs
    return this.update(timestamp)
  }

  update(timestamp: number): StarCollectorSnapshot {
    const now = Math.max(timestamp, this.lastTimestamp)
    const state = this.session.update(now)
    if (state.phase === 'playing') {
      // Every player receives the same deterministic constellation sequence.
      while (this.nextSpawnAt <= now) {
        this.expire(this.nextSpawnAt)
        for (let index = 0; index < this.playerCount; index += 1) {
          const playerId = (index + 1) as PlayerId
          if (this.items.filter((item) => item.playerId === playerId).length < 4) {
            const [x, y] = positions[this.wave % positions.length]
            this.items.push({ id: this.nextId++, playerId, x, y, spawnedAt: this.nextSpawnAt, remaining: 1 })
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
    // Accept delayed events only for stars that are still alive. Never rewind
    // the clock or let a capture from before a star's birth collect it.
    const target = this.items.find((item) => item.playerId === event.playerId && event.timestamp >= item.spawnedAt
      && ((event.x - item.x) / .1) ** 2 + ((event.y - item.y) / .13) ** 2 <= 1)
    if (target) {
      this.items = this.items.filter((item) => item.id !== target.id)
      this.session.awardScore(event.playerId, 10)
      this.collected[event.playerId] += 1
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
    this.items = this.items.filter((item) => timestamp - item.spawnedAt < this.lifetimeMs)
  }

  private snapshot(): StarCollectorSnapshot {
    const state = this.session.getSnapshot()
    const now = this.pausedAt ?? this.lastTimestamp
    return { ...state, items: this.items.map((item) => ({ ...item, remaining: Math.max(0, 1 - (now - item.spawnedAt) / this.lifetimeMs) })), collected: { ...this.collected } }
  }
}
