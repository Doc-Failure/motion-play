import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export interface Keeper { playerId: PlayerId; x: number; y: number; confidence: number }
export interface GoalShot { playerId: PlayerId; x: number; y: number; velocityY: number }
export interface GoalkeeperSnapshot extends GameSessionSnapshot { keepers: Keeper[]; shots: GoalShot[]; saves: Array<{ playerId: PlayerId; count: number }> }

const GOAL_LINE = .78
const KEEPER_REACH_X = .2
const KEEPER_REACH_Y = .2
const SHOT_SPEED = .00022

export class GoalkeeperModel {
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private keepers = new Map<PlayerId, Keeper>()
  private shots = new Map<PlayerId, GoalShot>()
  private saveCounts = new Map<PlayerId, number>()
  private shotNumbers = new Map<PlayerId, number>()
  private lastTimestamp: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
  }

  start(timestamp: number) {
    this.keepers.clear(); this.shots.clear(); this.saveCounts.clear(); this.shotNumbers.clear(); this.lastTimestamp = timestamp
    for (const playerId of this.players) {
      this.keepers.set(playerId, { playerId, x: .5, y: GOAL_LINE, confidence: 1 })
      this.saveCounts.set(playerId, 0); this.shotNumbers.set(playerId, 0); this.shots.set(playerId, this.newShot(playerId))
    }
    this.session.start(timestamp)
    return this.snapshot(timestamp)
  }

  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp ?? timestamp)
    const previous = this.lastTimestamp ?? now
    const before = this.session.getSnapshot(previous)
    const state = this.session.update(now)
    const playingElapsed = before.phase === 'playing' ? now - previous : before.phase === 'countdown' && state.phase === 'playing' ? Math.max(0, now - previous - before.countdownRemainingMs) : 0
    if (playingElapsed > 0) this.moveShots(playingElapsed)
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  moveBody(event: MotionInputEvent) {
    const now = Math.max(event.timestamp, this.lastTimestamp ?? event.timestamp)
    this.update(now)
    if (event.kind !== 'BODY_MOVE' || event.confidence < .45 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    this.keepers.set(event.playerId, { playerId: event.playerId, x: clamp(event.x), y: clampRange(event.y, .58, .88), confidence: event.confidence })
    return this.snapshot(now)
  }

  setShot(shot: GoalShot) { if (this.players.includes(shot.playerId)) this.shots.set(shot.playerId, { ...shot }) }

  private moveShots(elapsedMs: number) {
    for (const playerId of this.players) {
      const shot = this.shots.get(playerId)
      if (!shot) continue
      const oldY = shot.y
      shot.y += shot.velocityY * elapsedMs
      if (oldY < GOAL_LINE && shot.y >= GOAL_LINE) {
        const keeper = this.keepers.get(playerId)
        const blocked = keeper && Math.abs(shot.x - keeper.x) <= KEEPER_REACH_X && Math.abs(GOAL_LINE - keeper.y) <= KEEPER_REACH_Y
        if (blocked) { this.session.awardScore(playerId, 10); this.saveCounts.set(playerId, (this.saveCounts.get(playerId) ?? 0) + 1) }
        else this.session.awardScore(playerId, -5)
        this.shotNumbers.set(playerId, (this.shotNumbers.get(playerId) ?? 0) + 1)
        this.shots.set(playerId, this.newShot(playerId))
      }
    }
  }

  private newShot(playerId: PlayerId): GoalShot {
    const number = this.shotNumbers.get(playerId) ?? 0
    const positions = [.22, .78, .48, .65, .34]
    return { playerId, x: positions[(number + playerId - 1) % positions.length], y: .1, velocityY: SHOT_SPEED }
  }

  private snapshot(timestamp: number): GoalkeeperSnapshot {
    return { ...this.session.getSnapshot(timestamp), keepers: this.players.map((id) => ({ ...(this.keepers.get(id) as Keeper) })), shots: this.players.map((id) => ({ ...(this.shots.get(id) as GoalShot) })), saves: this.players.map((playerId) => ({ playerId, count: this.saveCounts.get(playerId) ?? 0 })) }
  }
}

const clamp = (value: number) => clampRange(value, 0, 1)
const clampRange = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))
