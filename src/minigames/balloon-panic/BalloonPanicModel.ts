import { PauseClock } from '../../game/PauseClock'
import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const balloonColors = ['red', 'blue', 'yellow'] as const
export type BalloonColor = typeof balloonColors[number]
export interface Balloon { id: number; playerId: PlayerId; x: number; y: number; color: BalloonColor; appearedAt: number; expiresAt: number }
export interface BalloonPanicSnapshot extends GameSessionSnapshot { balloons: Balloon[]; targetColor: BalloonColor; calls: Record<PlayerId, BalloonColor> }

export class BalloonPanicModel {
  private readonly clock = new PauseClock()
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private readonly random: () => number
  private readonly spawnIntervalMs: number
  private readonly visibleMs: number
  private balloons: Balloon[] = []
  private calls: Record<PlayerId, BalloonColor> = {1:'red',2:'red',3:'red',4:'red'}
  private nextSpawnAt: number | null = null
  private nextId = 1
  private lastTimestamp: number | null = null

  private readonly pressure: number

  constructor(options: { pressure?: number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; visibleMs?: number; random?: () => number } = {}) {
    this.pressure = Math.max(-.15, Math.min(1, options.pressure ?? 0))
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
    this.random = options.random ?? Math.random
    this.spawnIntervalMs = options.spawnIntervalMs ?? (900 - 230 * this.pressure)
    this.visibleMs = options.visibleMs ?? (1800 - 500 * this.pressure)
  }

  start(timestamp: number) {
    this.clock.reset(timestamp)
    this.balloons = []; this.nextSpawnAt = null; this.nextId = 1; const call = this.pickColor(); this.calls = {1:call,2:call,3:call,4:call}; this.lastTimestamp = timestamp; this.session.start(timestamp); return this.update(timestamp)
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
    const state = this.session.update(now)
    this.balloons = this.balloons.filter((balloon) => balloon.expiresAt > now)
    if (state.phase === 'playing') {
      if (this.nextSpawnAt === null) this.nextSpawnAt = now
      const steps = Math.max(0, Math.floor((now - this.nextSpawnAt) / this.spawnIntervalMs) + 1)
      for (let step = 0; step < Math.min(steps, 2); step += 1) for (const playerId of this.players) {
        if (this.balloons.filter((balloon) => balloon.playerId === playerId).length < 3) this.balloons.push(this.createBalloon(playerId, now, this.balloons.some(item => item.playerId === playerId && item.color === this.calls[playerId]) ? this.pickDifferentColor(this.calls[playerId]) : this.calls[playerId]))
      }
      this.nextSpawnAt += steps * this.spawnIntervalMs
    } else if (state.phase === 'results') this.balloons = []
    this.lastTimestamp = now
    return this.snapshot(now)
  }
  hit(event: MotionInputEvent) {
    if (!this.clock.accepts(event.timestamp)) return this.snapshot(this.lastTimestamp ?? 0)
    this.update(event.timestamp)
    const now = this.lastTimestamp!
    if (event.kind !== 'MOTION_HIT' || event.confidence < .2 || !this.players.includes(event.playerId) || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    const balloon = this.balloons.find((item) => item.playerId === event.playerId && Math.hypot(item.x - event.x, item.y - event.y) <= .14)
    if (!balloon) return this.snapshot(now)
    this.balloons = this.balloons.filter((item) => item.id !== balloon.id)
    this.session.awardScore(event.playerId, balloon.color === this.calls[event.playerId] ? 10 : -5)
    if (balloon.color === this.calls[event.playerId]) this.calls[event.playerId] = this.pickDifferentColor(balloon.color)
    return this.snapshot(now)
  }
  setState(balloons: Balloon[], targetColor: BalloonColor) { this.balloons = balloons.map((balloon) => ({ ...balloon })); this.calls = {1:targetColor,2:targetColor,3:targetColor,4:targetColor} }
  private createBalloon(playerId: PlayerId, now: number, color: BalloonColor): Balloon {
    const preferred = {x:.14 + this.random() * .72, y:.18 + this.random() * .64}
    const occupied = this.balloons.filter(item => item.playerId === playerId)
    const slots = [preferred, {x:.22,y:.26}, {x:.78,y:.26}, {x:.22,y:.74}, {x:.78,y:.74}]
    const clear = slots.find(p => occupied.every(item => Math.hypot(item.x - p.x, item.y - p.y) >= .29))!
    return { id:this.nextId++, playerId, ...clear, color, appearedAt:now, expiresAt:now + this.visibleMs }
  }
  private pickColor() { return balloonColors[Math.min(balloonColors.length - 1, Math.floor(this.random() * balloonColors.length))] }
  private pickDifferentColor(color: BalloonColor) { const index = balloonColors.indexOf(color); return balloonColors[(index + 1 + Math.floor(this.random() * (balloonColors.length - 1))) % balloonColors.length] }
  private snapshot(timestamp: number): BalloonPanicSnapshot { return { ...this.session.getSnapshot(timestamp), balloons: this.balloons.map((balloon) => ({ ...balloon })), targetColor: this.calls[1], calls: {...this.calls} } }
}
