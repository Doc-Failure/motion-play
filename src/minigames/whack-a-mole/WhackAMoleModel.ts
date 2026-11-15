import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export interface Mole { id: number; playerId: PlayerId; hole: number; appearedAt: number; expiresAt: number }
export interface WhackAMoleSnapshot extends GameSessionSnapshot { moles: Mole[]; lastHit: Record<PlayerId, number | null> }

export class WhackAMoleModel {
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private readonly random: () => number
  private readonly spawnIntervalMs: number
  private readonly visibleMs: number
  private moles: Mole[] = []
  private nextSpawnAt: number | null = null
  private nextId = 1
  private lastTimestamp: number | null = null
  private pausedAt: number | null = null
  private lastHit = emptyHits()

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; visibleMs?: number; random?: () => number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
    this.random = options.random ?? Math.random
    this.spawnIntervalMs = options.spawnIntervalMs ?? 850
    this.visibleMs = options.visibleMs ?? 1_250
  }

  start(timestamp: number) { this.pausedAt = null; this.moles = []; this.nextSpawnAt = null; this.nextId = 1; this.lastHit = emptyHits(); this.lastTimestamp = timestamp; this.session.start(timestamp); return this.update(timestamp) }

  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp ?? timestamp)
    const state = this.session.update(now)
    if (state.phase !== 'paused') this.moles = this.moles.filter((mole) => mole.expiresAt > now)
    if (state.phase === 'playing') {
      if (this.nextSpawnAt === null) this.nextSpawnAt = now
      const steps = Math.max(0, Math.floor((now - this.nextSpawnAt) / this.spawnIntervalMs) + 1)
      for (let step = 0; step < Math.min(steps, 2); step += 1) for (const playerId of this.players) {
        if (!this.moles.some((mole) => mole.playerId === playerId)) this.moles.push(this.createMole(playerId, now))
      }
      this.nextSpawnAt += steps * this.spawnIntervalMs
    } else if (state.phase === 'results') this.moles = []
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  hit(event: MotionInputEvent) {
    const now = Math.max(event.timestamp, this.lastTimestamp ?? event.timestamp)
    this.update(now)
    if (event.kind !== 'MOTION_HIT' || event.confidence < .2 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    const column = Math.min(2, Math.floor(event.x * 3)), row = Math.min(2, Math.floor(event.y * 3)), hole = row * 3 + column
    const mole = this.moles.find((candidate) => candidate.playerId === event.playerId && candidate.hole === hole)
    if (!mole) return this.snapshot(now)
    this.moles = this.moles.filter((candidate) => candidate.id !== mole.id)
    this.lastHit[event.playerId] = hole
    this.session.awardScore(event.playerId, 10)
    return this.snapshot(now)
  }

  setMoles(moles: Mole[]) { this.moles = moles.map((mole) => ({ ...mole })) }
  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase !== 'playing' && state.phase !== 'countdown') return state
    const now = this.lastTimestamp!
    this.session.pause(now)
    this.pausedAt = now
    return this.snapshot(now)
  }

  resume(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp ?? timestamp)
    this.lastTimestamp = now
    this.session.resume(now)
    const delay = now - (this.pausedAt ?? now)
    this.moles = this.moles.map(mole => ({...mole, appearedAt: mole.appearedAt + delay, expiresAt: mole.expiresAt + delay}))
    if (this.nextSpawnAt !== null) this.nextSpawnAt += delay
    this.pausedAt = null
    return this.snapshot(now)
  }

  private createMole(playerId: PlayerId, now: number): Mole { return { id: this.nextId++, playerId, hole: Math.min(8, Math.floor(this.random() * 9)), appearedAt: now, expiresAt: now + this.visibleMs } }
  private snapshot(timestamp: number): WhackAMoleSnapshot { return { ...this.session.getSnapshot(timestamp), moles: this.moles.map((mole) => ({ ...mole })), lastHit: { ...this.lastHit } } }
}

function emptyHits(): Record<PlayerId, number | null> { return { 1: null, 2: null, 3: null, 4: null } }
