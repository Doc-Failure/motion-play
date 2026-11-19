import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import { isValidSwipe } from '../../input/HandSwipe'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export interface PunchTarget { id: number; playerId: PlayerId; direction: 'left' | 'right' | 'up' | 'down'; x: number; y: number; spawnedAt: number }
export interface PunchTrail { playerId: PlayerId; x: number; y: number; fromX: number; fromY: number; timestamp: number }
export interface PunchArenaSnapshot extends GameSessionSnapshot { targets: PunchTarget[]; trails: PunchTrail[] }
const lifetimeMs = 1000
const spawnMs = 1200
export const punchRadius = .12

export class PunchArenaModel {
  private readonly pressure:number
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private readonly players: PlayerId[]
  private readonly random: () => number
  private targets: PunchTarget[] = []
  private trails: PunchTrail[] = []
  private lastInput = new Map<PlayerId, number>()
  private now = 0
  private playingAt = 0
  private nextSpawnAt = 0
  private nextId = 1

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; pressure?:number; roundDurationMs?: number; random?: () => number } = {}) {
    this.pressure=Math.max(0,Math.min(1,options.pressure??0))
    const count = options.playerCount ?? 1
    this.session = new GameSession({ ...options, playerCount: count })
    this.players = Array.from({ length: count }, (_, i) => (i + 1) as PlayerId)
    this.random = options.random ?? Math.random
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp
    this.playingAt = timestamp + state.countdownRemainingMs
    this.nextSpawnAt = this.playingAt; this.nextId = 1
    this.targets = []; this.trails = []; this.lastInput.clear()
    return this.update(timestamp)
  }

  update(timestamp: number): PunchArenaSnapshot {
    if (!Number.isFinite(timestamp) || this.clock.paused || this.session.getSnapshot().phase === 'results') return this.snapshot()
    this.now = Math.max(this.now, this.clock.time(timestamp))
    const state = this.session.update(this.now)
    if (state.phase === 'playing') {
      // Spawn on the round timeline, so sparse and frequent rendering agree.
      while (this.nextSpawnAt <= this.now) {
        for (const playerId of this.players) {
          const roll = this.random()
          this.targets.push({ id: this.nextId++, playerId, direction: roll < .25 ? 'left' : roll < .5 ? 'right' : roll < .75 ? 'up' : 'down', x: .3 + this.random() * .4, y: .3 + this.random() * .4, spawnedAt: this.nextSpawnAt })
        }
        this.nextSpawnAt += spawnMs-200*this.pressure
      }
      this.targets = this.targets.filter(item => this.now - item.spawnedAt < lifetimeMs-110*this.pressure)
      this.trails = this.trails.filter(trail => this.now - trail.timestamp <= 180)
    } else if (state.phase === 'results') { this.targets = []; this.trails = [] }
    return this.snapshot()
  }

  punch(event: MotionInputEvent) {
    if (!Number.isFinite(event.timestamp) || !this.clock.accepts(event.timestamp) || !this.players.includes(event.playerId) || event.kind !== 'HAND_SWIPE') return this.snapshot()
    const time = this.clock.time(event.timestamp)
    if (time < this.now-180 || time < this.playingAt || time <= (this.lastInput.get(event.playerId) ?? -Infinity)) return this.snapshot()
    this.update(event.timestamp)
    if (this.session.getSnapshot().phase !== 'playing') return this.snapshot()
    this.lastInput.set(event.playerId, time)
    // Do not allow segments to reach across countdown, pause or replay.
    if (!isValidSwipe(event) || time - event.swipe!.durationMs < this.playingAt || !this.clock.accepts(event.timestamp - event.swipe!.durationMs)) return this.snapshot()
    const { fromX, fromY } = event.swipe!
    this.trails = this.trails.filter(trail => trail.playerId !== event.playerId)
    this.trails.push({ playerId: event.playerId, x: event.x, y: event.y, fromX, fromY, timestamp: time })
    // A punch must finish on a pad, rather than merely pass through it.
    // One pad per player per beat also prevents repeated scoring from one stroke.
    this.targets = this.targets.filter(item => {
      if (item.playerId !== event.playerId || time - event.swipe!.durationMs < item.spawnedAt) return true
      if (Math.hypot(item.x - event.x, item.y - event.y) > punchRadius-.02*this.pressure) return true
      const dx = event.x - fromX, dy = event.y - fromY
      const direction = Math.abs(dx) >= Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up'
      this.session.awardScore(event.playerId, item.direction === direction ? 10 : -5)
      return false
    })
    return this.snapshot()
  }

  pause(timestamp: number) {
    this.update(timestamp)
    const phase = this.session.getSnapshot().phase
    if (phase === 'countdown' || phase === 'playing') { this.session.pause(this.now); this.clock.pause(timestamp); this.trails = [] }
    return this.snapshot()
  }
  resume(timestamp: number) {
    if (!this.clock.paused) return this.update(timestamp)
    this.clock.resume(timestamp); this.session.resume(this.now)
    return this.snapshot()
  }
  private snapshot(): PunchArenaSnapshot {
    return { ...this.session.getSnapshot(this.now), targets: this.targets.map(item => ({ ...item })), trails: this.trails.map(trail => ({ ...trail })) }
  }
}
