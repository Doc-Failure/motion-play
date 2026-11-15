import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const balloonColors = ['red', 'blue', 'yellow'] as const
export type BalloonColor = typeof balloonColors[number]
export interface Balloon { id: number; playerId: PlayerId; x: number; y: number; color: BalloonColor; appearedAt: number; expiresAt: number }
export interface BalloonPanicSnapshot extends GameSessionSnapshot { balloons: Balloon[]; targetColor: BalloonColor }

export class BalloonPanicModel {
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private readonly random: () => number
  private readonly spawnIntervalMs: number
  private readonly visibleMs: number
  private balloons: Balloon[] = []
  private targetColor: BalloonColor = 'red'
  private nextSpawnAt: number | null = null
  private nextId = 1
  private lastTimestamp: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; visibleMs?: number; random?: () => number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
    this.random = options.random ?? Math.random
    this.spawnIntervalMs = options.spawnIntervalMs ?? 900
    this.visibleMs = options.visibleMs ?? 1_800
  }

  start(timestamp: number) { this.balloons = []; this.nextSpawnAt = null; this.nextId = 1; this.targetColor = this.pickColor(); this.lastTimestamp = timestamp; this.session.start(timestamp); return this.update(timestamp) }
  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp ?? timestamp)
    const state = this.session.update(now)
    this.balloons = this.balloons.filter((balloon) => balloon.expiresAt > now)
    if (state.phase === 'playing') {
      if (this.nextSpawnAt === null) this.nextSpawnAt = now
      const steps = Math.max(0, Math.floor((now - this.nextSpawnAt) / this.spawnIntervalMs) + 1)
      for (let step = 0; step < Math.min(steps, 2); step += 1) for (const playerId of this.players) {
        if (this.balloons.filter((balloon) => balloon.playerId === playerId).length < 3) this.balloons.push(this.createBalloon(playerId, now, step === 0 ? this.targetColor : this.pickColor()))
      }
      this.nextSpawnAt += steps * this.spawnIntervalMs
    } else if (state.phase === 'results') this.balloons = []
    this.lastTimestamp = now
    return this.snapshot(now)
  }
  hit(event: MotionInputEvent) {
    const now = Math.max(event.timestamp, this.lastTimestamp ?? event.timestamp)
    this.update(now)
    if (event.kind !== 'MOTION_HIT' || event.confidence < .2 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    const balloon = this.balloons.find((item) => item.playerId === event.playerId && Math.hypot(item.x - event.x, item.y - event.y) <= .14)
    if (!balloon) return this.snapshot(now)
    this.balloons = this.balloons.filter((item) => item.id !== balloon.id)
    this.session.awardScore(event.playerId, balloon.color === this.targetColor ? 10 : -5)
    if (balloon.color === this.targetColor) this.targetColor = this.pickDifferentColor(this.targetColor)
    return this.snapshot(now)
  }
  setState(balloons: Balloon[], targetColor: BalloonColor) { this.balloons = balloons.map((balloon) => ({ ...balloon })); this.targetColor = targetColor }
  private createBalloon(playerId: PlayerId, now: number, color: BalloonColor): Balloon { return { id: this.nextId++, playerId, x: .14 + this.random() * .72, y: .18 + this.random() * .64, color, appearedAt: now, expiresAt: now + this.visibleMs } }
  private pickColor() { return balloonColors[Math.min(balloonColors.length - 1, Math.floor(this.random() * balloonColors.length))] }
  private pickDifferentColor(color: BalloonColor) { const index = balloonColors.indexOf(color); return balloonColors[(index + 1 + Math.floor(this.random() * (balloonColors.length - 1))) % balloonColors.length] }
  private snapshot(timestamp: number): BalloonPanicSnapshot { return { ...this.session.getSnapshot(timestamp), balloons: this.balloons.map((balloon) => ({ ...balloon })), targetColor: this.targetColor } }
}
