import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import { isValidSwipe } from '../../input/HandSwipe'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const basketFlightMs = 650
export const basketLaunch = { x: .5, y: .8, radius: .16 }
export const basketRim = { x: .5, y: .25, radius: .12 }
export interface BasketShot { playerId: PlayerId; fromX: number; fromY: number; aimX: number; launchedAt: number; made: boolean }
export interface BasketStats { playerId: PlayerId; attempts: number; baskets: number }
export interface BasketballBlitzSnapshot extends GameSessionSnapshot { shots: BasketShot[]; stats: BasketStats[]; time: number }

/** A shot projects the upward swipe direction onto the rim; no camera knowledge. */
export class BasketballBlitzModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private stats: BasketStats[]
  private shots: BasketShot[] = []
  private lastInput = new Map<PlayerId, number>()
  private nextShot = new Map<PlayerId, number>()
  private now = 0
  private playingAt = 0
  private endsAt = 0
  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ ...options, playerCount: count })
    this.stats = Array.from({ length: count }, (_, i) => ({ playerId: (i + 1) as PlayerId, attempts: 0, baskets: 0 }))
  }
  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp; this.playingAt = timestamp + state.countdownRemainingMs
    this.endsAt = this.playingAt + state.roundRemainingMs
    this.shots = []; this.lastInput.clear(); this.nextShot.clear()
    this.stats = this.stats.map(stat => ({ ...stat, attempts: 0, baskets: 0 }))
    return this.update(timestamp)
  }
  update(timestamp: number): BasketballBlitzSnapshot {
    if (!Number.isFinite(timestamp) || this.clock.paused || this.session.getSnapshot().phase === 'results') return this.snapshot()
    this.now = Math.min(this.endsAt, Math.max(this.now, this.clock.time(timestamp)))
    // Resolve on the round timeline, even when rendering jumps past the round end.
    for (const shot of [...this.shots].sort((a, b) => a.launchedAt - b.launchedAt)) {
      const landing = shot.launchedAt + basketFlightMs
      if (landing > this.now) continue
      if (this.session.update(landing).phase === 'playing' && shot.made) {
        this.session.awardScore(shot.playerId, 2)
        this.stats.find(stat => stat.playerId === shot.playerId)!.baskets++
      }
    }
    this.shots = this.shots.filter(shot => shot.launchedAt + basketFlightMs > this.now)
    if (this.session.update(this.now).phase === 'results') this.shots = []
    return this.snapshot()
  }
  shoot(event: MotionInputEvent) {
    if (!isValidSwipe(event) || !this.stats.some(stat => stat.playerId === event.playerId) || !this.clock.accepts(event.timestamp)) return this.snapshot()
    const time = this.clock.time(event.timestamp)
    if (time < this.now || time <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    this.update(event.timestamp)
    if (this.session.getSnapshot().phase !== 'playing') return this.snapshot()
    this.lastInput.set(event.playerId, time)
    const { fromX, fromY, durationMs } = event.swipe!
    if (time - durationMs < this.playingAt || !this.clock.accepts(event.timestamp - durationMs) || time < (this.nextShot.get(event.playerId) ?? 0)) return this.snapshot()
    const dx = event.x - fromX, rise = fromY - event.y
    if (rise < .08 || rise < Math.abs(dx) || Math.hypot(fromX - basketLaunch.x, fromY - basketLaunch.y) > basketLaunch.radius) return this.snapshot()
    const aimX = fromX + dx * (fromY - basketRim.y) / rise
    this.shots.push({ playerId: event.playerId, fromX, fromY, aimX, launchedAt: time, made: Math.abs(aimX - basketRim.x) <= basketRim.radius })
    this.stats.find(stat => stat.playerId === event.playerId)!.attempts++
    this.nextShot.set(event.playerId, time + basketFlightMs + 150)
    return this.snapshot()
  }
  pause(timestamp: number) {
    this.update(timestamp)
    if (['countdown', 'playing'].includes(this.session.getSnapshot().phase)) { this.session.pause(this.now); this.clock.pause(timestamp) }
    return this.snapshot()
  }
  resume(timestamp: number) {
    if (!this.clock.paused) return this.update(timestamp)
    this.clock.resume(timestamp); this.session.resume(this.now)
    return this.snapshot()
  }
  private snapshot(): BasketballBlitzSnapshot {
    return { ...this.session.getSnapshot(this.now), time: this.now, shots: this.shots.map(shot => ({ ...shot })), stats: this.stats.map(stat => ({ ...stat })) }
  }
}
