import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'

export type BubbleTargetKind = 'bubble' | 'bomb'

export interface BubbleTarget {
  id: number
  kind: BubbleTargetKind
  x: number
  y: number
  radius: number
}

export interface BubbleBattleSnapshot extends GameSessionSnapshot {
  targets: BubbleTarget[]
  lastResult: 'bubble' | 'bomb' | null
}

export interface BubbleBattleOptions {
  countdownMs?: number
  roundDurationMs?: number
  spawnIntervalMs?: number
  random?: () => number
}

const BUBBLE_POINTS = 10
const BOMB_PENALTY = -15

/** Game-only logic. It knows normalized input events, never cameras or pixels. */
export class BubbleBattleModel {
  private readonly session: GameSession
  private readonly spawnIntervalMs: number
  private readonly random: () => number
  private targets: BubbleTarget[] = []
  private nextTargetId = 1
  private nextSpawnAt: number | null = null
  private lastUpdateAt: number | null = null
  private lastResult: BubbleBattleSnapshot['lastResult'] = null

  constructor(options: BubbleBattleOptions = {}) {
    this.session = new GameSession({
      playerCount: 1,
      countdownMs: options.countdownMs,
      roundDurationMs: options.roundDurationMs,
    })
    this.spawnIntervalMs = options.spawnIntervalMs ?? 850
    this.random = options.random ?? Math.random
  }

  start(timestamp: number): BubbleBattleSnapshot {
    this.targets = []
    this.nextTargetId = 1
    this.nextSpawnAt = null
    this.lastUpdateAt = timestamp
    this.lastResult = null
    this.session.start(timestamp)
    return this.update(timestamp)
  }

  update(timestamp: number): BubbleBattleSnapshot {
    const before = this.session.getSnapshot(timestamp)
    const snapshot = this.session.update(timestamp)
    if (snapshot.phase === 'playing') {
      if (this.nextSpawnAt === null) this.nextSpawnAt = timestamp
      const elapsed = before.phase === 'playing' && this.lastUpdateAt !== null ? timestamp - this.lastUpdateAt : 0
      this.targets = this.targets
        .map((target) => ({ ...target, y: target.y - elapsed * (target.kind === 'bomb' ? 0.000045 : 0.000065) }))
        .filter((target) => target.y + target.radius >= 0)
      while (this.nextSpawnAt <= timestamp && this.targets.length < 7) {
        this.targets.push(this.createTarget())
        this.nextSpawnAt += this.spawnIntervalMs
      }
    } else if (snapshot.phase === 'results') {
      this.targets = []
    }
    this.lastUpdateAt = timestamp
    return this.snapshot(timestamp)
  }

  handleInput(event: MotionInputEvent): BubbleBattleSnapshot {
    const timestamp = Math.max(event.timestamp, this.lastUpdateAt ?? event.timestamp)
    this.update(timestamp)
    if (event.playerId !== 1 || event.kind !== 'MOTION_HIT' || event.confidence < 0.2 || this.session.getSnapshot().phase !== 'playing') {
      return this.snapshot(timestamp)
    }
    const target = [...this.targets].reverse().find((candidate) => Math.hypot(event.x - candidate.x, event.y - candidate.y) <= candidate.radius)
    if (!target) return this.snapshot(timestamp)
    this.targets = this.targets.filter((candidate) => candidate.id !== target.id)
    this.lastResult = target.kind
    this.session.awardScore(1, target.kind === 'bubble' ? BUBBLE_POINTS : BOMB_PENALTY)
    return this.snapshot(timestamp)
  }

  /** Test/support hook for deterministic synthetic fixtures. */
  setTargets(targets: BubbleTarget[]) {
    this.targets = targets.map((target) => ({ ...target }))
  }

  private createTarget(): BubbleTarget {
    const kind: BubbleTargetKind = this.random() < 0.2 ? 'bomb' : 'bubble'
    const radius = kind === 'bomb' ? 0.065 : 0.075 + this.random() * 0.035
    return {
      id: this.nextTargetId++,
      kind,
      x: radius + this.random() * (1 - radius * 2),
      y: 1 + radius,
      radius,
    }
  }

  private snapshot(timestamp: number): BubbleBattleSnapshot {
    return { ...this.session.getSnapshot(timestamp), targets: this.targets.map((target) => ({ ...target })), lastResult: this.lastResult }
  }
}
