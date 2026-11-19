import { PauseClock } from '../../game/PauseClock'
import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export type BubbleTargetKind = 'bubble' | 'bomb'

export interface BubbleTarget {
  id: number
  playerId: PlayerId
  kind: BubbleTargetKind
  x: number
  y: number
  radius: number
}

export interface BubbleBattleSnapshot extends GameSessionSnapshot {
  targets: BubbleTarget[]
  lastResults: Record<PlayerId, 'bubble' | 'bomb' | null>
}

export interface BubbleBattleOptions {
  aspectRatio?: number
  pressure?: number
  playerCount?: PlayerCount
  countdownMs?: number
  roundDurationMs?: number
  spawnIntervalMs?: number
  random?: () => number
}

const BUBBLE_POINTS = 10
const BOMB_PENALTY = -15

/** Game-only logic. It knows normalized input events, never cameras or pixels. */
export class BubbleBattleModel {
  private readonly clock = new PauseClock()
  private readonly aspectRatio: number
  private readonly session: GameSession
  private readonly spawnIntervalMs: number
  private readonly random: () => number
  private readonly playerIds: PlayerId[]
  private targets: BubbleTarget[] = []
  private lastHazard = false
  private nextTargetId = 1
  private nextSpawnAt: number | null = null
  private lastUpdateAt: number | null = null
  private lastResults = emptyResults()

  private readonly pressure: number

  constructor(options: BubbleBattleOptions = {}) {
    this.pressure = Math.max(-.15, Math.min(1, options.pressure ?? 0))
    this.aspectRatio = options.aspectRatio && options.aspectRatio > 0 ? options.aspectRatio : 1
    this.session = new GameSession({
      playerCount: options.playerCount ?? 1,
      countdownMs: options.countdownMs,
      roundDurationMs: options.roundDurationMs,
    })
    this.spawnIntervalMs = options.spawnIntervalMs ?? (850 - 250 * this.pressure)
    this.random = options.random ?? Math.random
    this.playerIds = Array.from({ length: options.playerCount ?? 1 }, (_, index) => (index + 1) as PlayerId)
  }

  start(timestamp: number): BubbleBattleSnapshot {
    this.clock.reset(timestamp)
    this.targets = []
    this.lastHazard = false
    this.nextTargetId = 1
    this.nextSpawnAt = null
    this.lastUpdateAt = timestamp
    this.lastResults = emptyResults()
    this.session.start(timestamp)
    return this.update(timestamp)
  }

  update(timestamp: number): BubbleBattleSnapshot {
    const now = Math.max(this.clock.time(timestamp), this.lastUpdateAt ?? this.clock.time(timestamp))
    if (this.clock.paused) return this.snapshot(now)
    const before = this.session.getSnapshot(now)
    const snapshot = this.session.update(now)
    if (snapshot.phase === 'playing') {
      if (this.nextSpawnAt === null) this.nextSpawnAt = now
      const elapsed = before.phase === 'playing' && this.lastUpdateAt !== null ? now - this.lastUpdateAt : 0
      this.targets = this.targets
        .map((target) => ({ ...target, y: target.y - elapsed * (target.kind === 'bomb' ? 0.00009 : 0.00014) * (1 + .4 * this.pressure) }))
        .filter((target) => target.y + target.radius >= 0)
      const spawnSteps = Math.floor((now - this.nextSpawnAt) / this.spawnIntervalMs) + 1
      const usefulSteps = Math.min(spawnSteps, 1)
      for (let step = 0; step < usefulSteps; step += 1) {
        // Give all lanes the same wave value and always open with a chance to score.
        const hazard = this.nextTargetId > 1 && !this.lastHazard && this.random() < .14 + .12 * this.pressure
        this.lastHazard = hazard
        for (const playerId of this.playerIds) {
          if (this.targets.filter((target) => target.playerId === playerId).length < 7) this.targets.push(this.createTarget(playerId, hazard ? 'bomb' : 'bubble'))
        }
      }
      this.nextSpawnAt += spawnSteps * this.spawnIntervalMs
    } else if (snapshot.phase === 'results') {
      this.targets = []
    }
    this.lastUpdateAt = now
    return this.snapshot(now)
  }

  handleInput(event: MotionInputEvent): BubbleBattleSnapshot {
    if (!this.clock.accepts(event.timestamp)) return this.snapshot(this.lastUpdateAt ?? 0)
    this.update(event.timestamp)
    const timestamp = this.lastUpdateAt!
    if (!this.playerIds.includes(event.playerId) || event.kind !== 'MOTION_HIT' || event.confidence < 0.2 || this.session.getSnapshot().phase !== 'playing') {
      return this.snapshot(timestamp)
    }
    const target = [...this.targets].reverse().find((candidate) => candidate.playerId === event.playerId && Math.hypot((event.x - candidate.x) / Math.min(1, 1 / this.aspectRatio), (event.y - candidate.y) / Math.min(1, this.aspectRatio)) <= candidate.radius)
    if (!target) return this.snapshot(timestamp)
    this.targets = this.targets.filter((candidate) => candidate.id !== target.id)
    this.lastResults[event.playerId] = target.kind
    this.session.awardScore(event.playerId, target.kind === 'bubble' ? BUBBLE_POINTS : BOMB_PENALTY)
    return this.snapshot(timestamp)
  }

  pause(timestamp: number): BubbleBattleSnapshot {
    const state = this.update(timestamp)
    if (state.phase !== 'playing' && state.phase !== 'countdown') return state
    this.session.pause(this.lastUpdateAt!)
    this.clock.pause(timestamp)
    return this.snapshot(this.lastUpdateAt!)
  }

  resume(timestamp: number): BubbleBattleSnapshot {
    if (!this.clock.paused) return this.update(timestamp)
    this.clock.resume(timestamp)
    this.lastUpdateAt = Math.max(this.clock.time(timestamp), this.lastUpdateAt ?? 0)
    this.session.resume(this.lastUpdateAt)
    return this.snapshot(this.lastUpdateAt)
  }

  /** Test/support hook for deterministic synthetic fixtures. */
  setTargets(targets: BubbleTarget[]) {
    this.targets = targets.map((target) => ({ ...target }))
  }

  private createTarget(playerId: PlayerId, kind: BubbleTargetKind): BubbleTarget {
    const radius = kind === 'bomb' ? .065 : (.087 + this.random() * .025) * (1 - .15 * this.pressure)
    // Choose the farthest of three entrance columns when a recent target is still there.
    const preferred = radius + this.random() * (1 - radius * 2)
    const near = this.targets.filter(t => t.playerId === playerId && t.y > .62)
    const clearance = (x:number) => Math.min(...near.map(t=>Math.abs(t.x-x)))
    const x = clearance(preferred) >= .23 ? preferred : [.18,.5,.82].reduce((best,col)=>clearance(col)>clearance(best)?col:best)
    return {
      id: this.nextTargetId++,
      playerId,
      kind,
      x,
      y: .91 - radius,
      radius,
    }
  }

  private snapshot(timestamp: number): BubbleBattleSnapshot {
    return { ...this.session.getSnapshot(timestamp), targets: this.targets.map((target) => ({ ...target })), lastResults: { ...this.lastResults } }
  }
}

function emptyResults(): Record<PlayerId, 'bubble' | 'bomb' | null> {
  return { 1: null, 2: null, 3: null, 4: null }
}
