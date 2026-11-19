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
  private readonly pressure: number
  private readonly lastHand = new Map<PlayerId, number>()
  private readonly serves = new Map<PlayerId, number>()
  private lastTimestamp: number | null = null

  constructor(options: { pressure?: number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    this.pressure = Math.max(-.15,Math.min(1,options.pressure ?? 0))
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
  }

  start(timestamp: number) {
    this.clock.reset(timestamp)

    this.paddles.clear(); this.balls.clear(); this.returns.clear(); this.lastHand.clear(); this.serves.clear(); this.lastTimestamp = timestamp
    for (const playerId of this.players) {
      this.paddles.set(playerId, { playerId, y: .5, confidence: 0 })
      this.balls.set(playerId, this.newBall(playerId))
      this.returns.set(playerId, 0)
    }
    this.session.start(timestamp)
    return this.snapshot(timestamp)
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase !== 'playing' && state.phase !== 'countdown') return state
    this.lastHand.clear()
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
    const from = previous + before.countdownRemainingMs
    const playingElapsed = Math.min(before.roundRemainingMs, Math.max(0, now - from))
    if (playingElapsed > 0 && (before.phase === 'countdown' || before.phase === 'playing')) {
      this.session.update(from)
      this.moveBalls(from, playingElapsed)
    }
    this.session.update(now)
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  moveHand(event: MotionInputEvent) {
    const time = this.clock.time(event.timestamp)
    if (event.kind !== 'HAND_POSITION' || !this.players.includes(event.playerId) || !this.clock.accepts(event.timestamp)
      || ![time,event.x,event.y,event.confidence].every(Number.isFinite) || event.confidence < .45 || event.confidence > 1
      || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1
      || time < (this.lastTimestamp ?? time) - 150 || time <= (this.lastHand.get(event.playerId) ?? -Infinity)) return this.snapshot(this.lastTimestamp ?? 0)
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    this.lastHand.set(event.playerId,time)
    const now = this.lastTimestamp!
    this.paddles.set(event.playerId, { playerId:event.playerId, y:event.y, confidence:event.confidence })
    return this.snapshot(now)
  }

  setBall(ball: PongBall) {
    if (this.players.includes(ball.playerId)) this.balls.set(ball.playerId, { ...ball })
  }

  private moveBalls(from: number, elapsedMs: number) {
    for (const playerId of this.players) {
      let ball = this.balls.get(playerId)!
      let elapsed = 0
      while (elapsed < elapsedMs) {
        const towardPlayer = ball.velocityX < 0
        const wall = towardPlayer ? PADDLE_X : .94
        const crossing = ball.velocityX === 0 ? Infinity : Math.max(0,(wall - ball.x) / ball.velocityX)
        const dt = Math.min(elapsedMs - elapsed, crossing)
        const height = .88
        const phase = ((ball.y - .06 + ball.velocityY * dt) % (2 * height) + 2 * height) % (2 * height)
        ball.y = .06 + (phase <= height ? phase : 2 * height - phase)
        if (phase > height) ball.velocityY *= -1
        ball.x += ball.velocityX * dt
        elapsed += dt
        if (dt < crossing) break
        ball.x = wall
        if (!towardPlayer) { ball.velocityX *= -1; continue }
        const paddle = this.paddles.get(playerId)!
        const tracked = from + elapsed - (this.lastHand.get(playerId) ?? -Infinity) <= 350
        const offset = ball.y - paddle.y
        if (tracked && Math.abs(offset) <= PADDLE_REACH - .025 * this.pressure) {
          ball.velocityX = Math.min(.00060, Math.abs(ball.velocityX) * 1.055)
          // The point of contact chooses the rebound angle. Even a dead-centre hit moves.
          ball.velocityY = Math.abs(offset) < .025 ? (.000065 * ((this.returns.get(playerId) ?? 0) % 2 ? -1 : 1)) : offset * .0015
          this.returns.set(playerId, (this.returns.get(playerId) ?? 0) + 1)
          this.session.awardScore(playerId,10)
        } else {
          if (tracked) this.session.awardScore(playerId,-5)
          this.returns.set(playerId,0)
          ball = this.newBall(playerId)
          this.balls.set(playerId,ball)
        }
      }
    }
  }

  private newBall(playerId: PlayerId): PongBall {
    const serve = this.serves.get(playerId) ?? 0
    this.serves.set(playerId,serve + 1)
    const speed = BALL_SPEED * (1 + .42 * this.pressure)
    return { playerId, x:.52, y:[.5,.63,.38,.54][serve % 4], velocityX:-speed, velocityY:speed * [.14,-.29,.26,-.16][serve % 4] }
  }

  private snapshot(timestamp: number): AirPongSnapshot {
    return {
      ...this.session.getSnapshot(timestamp),
      paddles: this.players.map(playerId => {
        const paddle = this.paddles.get(playerId)!
        return { ...paddle, confidence:timestamp-(this.lastHand.get(playerId) ?? -Infinity)<=350 ? paddle.confidence : 0 }
      }),
      balls: this.players.map((playerId) => ({ ...(this.balls.get(playerId) as PongBall) })),
      rallies: this.players.map((playerId) => ({ playerId, returns: this.returns.get(playerId) ?? 0 })),
    }
  }
}
