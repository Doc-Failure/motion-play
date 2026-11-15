import { PauseClock } from '../../game/PauseClock'
import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export interface PongPaddle { playerId: PlayerId; y: number; confidence: number }
export interface PongBall { playerId: PlayerId; x: number; y: number; velocityX: number; velocityY: number }
export interface AirPongSnapshot extends GameSessionSnapshot { paddles: PongPaddle[]; balls: PongBall[]; rallies: Array<{ playerId: PlayerId; returns: number }> }

const PADDLE_X = .1
const PADDLE_REACH = .16
const BALL_SPEED = .00024

export class AirPongModel {
  private readonly clock = new PauseClock()
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private paddles = new Map<PlayerId, PongPaddle>()
  private balls = new Map<PlayerId, PongBall>()
  private returns = new Map<PlayerId, number>()
  private lastTimestamp: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
  }

  start(timestamp: number) {
    this.clock.reset(timestamp)

    this.paddles.clear(); this.balls.clear(); this.returns.clear(); this.lastTimestamp = timestamp
    for (const playerId of this.players) {
      this.paddles.set(playerId, { playerId, y: .5, confidence: 1 })
      this.balls.set(playerId, this.newBall(playerId))
      this.returns.set(playerId, 0)
    }
    this.session.start(timestamp)
    return this.snapshot(timestamp)
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase !== 'playing' && state.phase !== 'countdown') return state
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
    const previous = this.lastTimestamp ?? now
    const before = this.session.getSnapshot(previous)
    const state = this.session.update(now)
    const playingElapsed = before.phase === 'playing'
      ? now - previous
      : before.phase === 'countdown' && state.phase === 'playing' ? Math.max(0, now - previous - before.countdownRemainingMs) : 0
    if (playingElapsed > 0) this.moveBalls(playingElapsed)
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  moveHand(event: MotionInputEvent) {
    if (!this.clock.accepts(event.timestamp)) return this.snapshot(this.lastTimestamp ?? 0)
    this.update(event.timestamp)
    const now = this.lastTimestamp!
    if (event.kind !== 'HAND_POSITION' || event.confidence < .45 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    this.paddles.set(event.playerId, { playerId: event.playerId, y: clamp(event.y), confidence: event.confidence })
    return this.snapshot(now)
  }

  setBall(ball: PongBall) {
    if (this.players.includes(ball.playerId)) this.balls.set(ball.playerId, { ...ball })
  }

  private moveBalls(elapsedMs: number) {
    for (const playerId of this.players) {
      const ball = this.balls.get(playerId)
      if (!ball) continue
      ball.x += ball.velocityX * elapsedMs
      ball.y += ball.velocityY * elapsedMs
      if (ball.y <= .06 || ball.y >= .94) {
        ball.y = clampRange(ball.y, .06, .94)
        ball.velocityY *= -1
      }
      if (ball.x >= .94) {
        ball.x = .94
        ball.velocityX = -Math.abs(ball.velocityX)
      }
      if (ball.x <= PADDLE_X) {
        const paddle = this.paddles.get(playerId)
        if (paddle && Math.abs(ball.y - paddle.y) <= PADDLE_REACH) {
          ball.x = PADDLE_X
          ball.velocityX = Math.abs(ball.velocityX) * 1.04
          ball.velocityY += (ball.y - paddle.y) * .00018
          this.returns.set(playerId, (this.returns.get(playerId) ?? 0) + 1)
          this.session.awardScore(playerId, 10)
        } else {
          this.session.awardScore(playerId, -5)
          this.returns.set(playerId, 0)
          this.balls.set(playerId, this.newBall(playerId))
        }
      }
    }
  }

  private newBall(playerId: PlayerId): PongBall {
    return { playerId, x: .52, y: .5, velocityX: BALL_SPEED, velocityY: 0 }
  }

  private snapshot(timestamp: number): AirPongSnapshot {
    return {
      ...this.session.getSnapshot(timestamp),
      paddles: this.players.map((playerId) => ({ ...(this.paddles.get(playerId) as PongPaddle) })),
      balls: this.players.map((playerId) => ({ ...(this.balls.get(playerId) as PongBall) })),
      rallies: this.players.map((playerId) => ({ playerId, returns: this.returns.get(playerId) ?? 0 })),
    }
  }
}

const clamp = (value: number) => clampRange(value, 0, 1)
const clampRange = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value))
