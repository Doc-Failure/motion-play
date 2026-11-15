import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const fishKinds = {
  minnow: { value: 5, swimsForMs: 5000 },
  silver: { value: 10, swimsForMs: 4000 },
  golden: { value: 20, swimsForMs: 3000 },
} as const
export interface SwimmingFish { id: number; playerId: PlayerId; kind: keyof typeof fishKinds; x: number; y: number; spawnedAt: number; swimsForMs: number; direction: 1 | -1 }
type StoredFish = Omit<SwimmingFish, 'x'>
interface Net { playerId: PlayerId; x: number; y: number; timestamp: number }
export interface FishFrenzySnapshot extends GameSessionSnapshot { fish: SwimmingFish[]; nets: Net[]; caught: number[]; missed: number[]; feedback: string[] }

/** A fresh normalized position catches at most one fish. No cached position can score. */
export class FishFrenzyModel {
  private readonly session: GameSession
  private readonly playerCount: PlayerCount
  private readonly random: () => number
  private fish: StoredFish[] = []
  private nets = new Map<PlayerId, Net>()
  private lastInput = new Map<PlayerId, number>()
  private caught: number[] = []
  private missed: number[] = []
  private feedback: string[] = []
  private lastTimestamp = 0
  private nextSpawnAt = 0
  private inputNotBefore = 0
  private roundEnd = 0
  private pausedAt: number | null = null
  private nextId = 1

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; random?: () => number } = {}) {
    this.playerCount = options.playerCount ?? 1
    this.random = options.random ?? Math.random
    this.session = new GameSession({ ...options, playerCount: this.playerCount })
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.lastTimestamp = timestamp
    this.inputNotBefore = timestamp + state.countdownRemainingMs
    this.nextSpawnAt = this.inputNotBefore
    this.roundEnd = this.inputNotBefore + state.roundRemainingMs
    this.pausedAt = null
    this.nextId = 1
    this.fish = []; this.nets.clear(); this.lastInput.clear()
    this.caught = Array(this.playerCount).fill(0)
    this.missed = Array(this.playerCount).fill(0)
    this.feedback = Array(this.playerCount).fill('Guide your net over a fish!')
    return this.update(timestamp)
  }

  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp)
    const phase = this.session.getSnapshot().phase
    if (phase === 'playing' || phase === 'countdown') {
      // Spawn by the round clock, so random draws and paths do not depend on render cadence.
      while (this.nextSpawnAt <= now && this.nextSpawnAt < this.roundEnd) {
        for (let index = 0; index < this.playerCount; index++) {
          const roll = this.random()
          const kind = roll < .6 ? 'minnow' : roll < .9 ? 'silver' : 'golden'
          this.fish.push({ id: this.nextId++, playerId: (index + 1) as PlayerId, kind,
            y: .2 + this.random() * .6, direction: this.random() < .5 ? 1 : -1,
            spawnedAt: this.nextSpawnAt, swimsForMs: fishKinds[kind].swimsForMs })
        }
        this.nextSpawnAt += 1100
      }
      this.fish = this.fish.filter((fish) => {
        if (fish.spawnedAt + fish.swimsForMs <= Math.min(now, this.roundEnd)) {
          this.missed[fish.playerId - 1]++
          return false
        }
        return true
      })
    }
    const state = this.session.update(now)
    if (state.phase === 'results') { this.fish = []; this.nets.clear() }
    this.lastTimestamp = now
    return this.snapshot()
  }

  moveHand(event: MotionInputEvent) {
    if (event.kind !== 'HAND_POSITION' || !Number.isInteger(event.playerId) || event.playerId < 1 || event.playerId > this.playerCount
      || !Number.isFinite(event.timestamp) || event.timestamp < this.inputNotBefore || event.timestamp < this.lastTimestamp - 250
      || event.timestamp <= (this.lastInput.get(event.playerId) ?? -Infinity)
      || !Number.isFinite(event.confidence) || event.confidence < .45 || event.confidence > 1
      || !Number.isFinite(event.x) || !Number.isFinite(event.y) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    this.lastInput.set(event.playerId, event.timestamp)
    this.nets.set(event.playerId, { playerId: event.playerId, x: event.x, y: event.y, timestamp: event.timestamp })
    const fish = this.fish.find((fish) => fish.playerId === event.playerId && fish.spawnedAt <= event.timestamp
      && ((this.position(fish, event.timestamp).x - event.x) / .12) ** 2 + ((fish.y - event.y) / .15) ** 2 <= 1)
    if (fish) {
      this.fish = this.fish.filter((item) => item.id !== fish.id)
      this.caught[event.playerId - 1]++
      const points = fishKinds[fish.kind].value
      this.session.awardScore(event.playerId, points)
      this.feedback[event.playerId - 1] = `✓ ${fish.kind} caught! +${points} points.`
    }
    return this.snapshot()
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase === 'playing' || state.phase === 'countdown') { this.session.pause(this.lastTimestamp); this.pausedAt = this.lastTimestamp; this.nets.clear() }
    return this.snapshot()
  }

  resume(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp)
    if (this.pausedAt !== null) {
      const elapsed = now - this.pausedAt
      this.fish.forEach((fish) => { fish.spawnedAt += elapsed })
      this.nextSpawnAt += elapsed; this.roundEnd += elapsed
      this.inputNotBefore = now + this.session.resume(now).countdownRemainingMs
      this.pausedAt = null
    }
    return this.update(now)
  }

  private position(fish: StoredFish, time: number): SwimmingFish {
    const progress = Math.max(0, Math.min(1, (time - fish.spawnedAt) / fish.swimsForMs))
    return { ...fish, x: fish.direction === 1 ? .12 + progress * .76 : .88 - progress * .76 }
  }

  private snapshot(): FishFrenzySnapshot {
    const time = this.pausedAt ?? this.lastTimestamp
    return { ...this.session.getSnapshot(), fish: this.fish.map((fish) => this.position(fish, time)),
      nets: [...this.nets.values()].filter((net) => time - net.timestamp <= 350).map((net) => ({ ...net })),
      caught: [...this.caught], missed: [...this.missed], feedback: [...this.feedback] }
  }
}
