import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export interface Meteor {
  id: number
  playerId: PlayerId
  x: number
  y: number
  spawnedAt: number
  fallsForMs: number
}

export interface MeteorSmashSnapshot extends GameSessionSnapshot {
  meteors: Meteor[]
  impacts: Record<PlayerId, number>
}

interface StoredMeteor extends Omit<Meteor, 'y'> { startY: number }

export class MeteorSmashModel {
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private readonly random: () => number
  private readonly spawnIntervalMs: number
  private readonly fallsForMs: number
  private meteors: StoredMeteor[] = []
  private impacts = emptyImpacts()
  private nextSpawnAt: number | null = null
  private nextId = 1
  private lastTimestamp: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; fallsForMs?: number; random?: () => number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
    this.random = options.random ?? Math.random
    this.spawnIntervalMs = options.spawnIntervalMs ?? 1_000
    this.fallsForMs = options.fallsForMs ?? 4_000
  }

  start(timestamp: number) {
    this.meteors = []
    this.impacts = emptyImpacts()
    this.nextSpawnAt = null
    this.nextId = 1
    this.lastTimestamp = timestamp
    this.session.start(timestamp)
    return this.update(timestamp)
  }

  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp ?? timestamp)
    const state = this.session.update(now)
    const impacted = this.meteors.filter((meteor) => now - meteor.spawnedAt >= meteor.fallsForMs)
    this.meteors = this.meteors.filter((meteor) => now - meteor.spawnedAt < meteor.fallsForMs)
    if (state.phase === 'playing') {
      for (const meteor of impacted) {
        this.impacts[meteor.playerId] += 1
        this.session.awardScore(meteor.playerId, -5)
      }
      if (this.nextSpawnAt === null) this.nextSpawnAt = now
      const steps = Math.max(0, Math.floor((now - this.nextSpawnAt) / this.spawnIntervalMs) + 1)
      for (let step = 0; step < Math.min(steps, 2); step += 1) {
        for (const playerId of this.players) {
          if (this.meteors.filter((meteor) => meteor.playerId === playerId).length < 4) this.meteors.push(this.createMeteor(playerId, now + step * this.spawnIntervalMs))
        }
      }
      this.nextSpawnAt += steps * this.spawnIntervalMs
    } else if (state.phase === 'results') this.meteors = []
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  hit(event: MotionInputEvent) {
    const now = Math.max(event.timestamp, this.lastTimestamp ?? event.timestamp)
    this.update(now)
    if (event.kind !== 'MOTION_HIT' || event.confidence < .2 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    const meteor = this.visibleMeteors(now).find((candidate) => candidate.playerId === event.playerId && Math.hypot(candidate.x - event.x, candidate.y - event.y) <= .14)
    if (!meteor) return this.snapshot(now)
    this.meteors = this.meteors.filter((candidate) => candidate.id !== meteor.id)
    this.session.awardScore(event.playerId, 10)
    return this.snapshot(now)
  }

  setMeteors(meteors: Meteor[]) { this.meteors = meteors.map(({ y, ...meteor }) => ({ ...meteor, startY: y })) }

  private createMeteor(playerId: PlayerId, spawnedAt: number): StoredMeteor {
    return { id: this.nextId++, playerId, x: .12 + this.random() * .76, startY: -.08, spawnedAt, fallsForMs: this.fallsForMs }
  }

  private visibleMeteors(now: number): Meteor[] {
    return this.meteors.map(({ startY, ...meteor }) => ({ ...meteor, y: startY + (now - meteor.spawnedAt) / meteor.fallsForMs * 1.08 }))
  }

  private snapshot(timestamp: number): MeteorSmashSnapshot {
    return { ...this.session.getSnapshot(timestamp), meteors: this.visibleMeteors(timestamp).map((meteor) => ({ ...meteor })), impacts: { ...this.impacts } }
  }
}

function emptyImpacts(): Record<PlayerId, number> { return { 1: 0, 2: 0, 3: 0, 4: 0 } }
