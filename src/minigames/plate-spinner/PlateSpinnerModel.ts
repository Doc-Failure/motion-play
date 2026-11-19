import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const plateTargets = [0, 1, 2].map((id) => ({ id, x: .2 + id * .3, y: .4 }))
export const wobbleThreshold = .70
export const plateLifetime = (id: number, pressure=0) => 6000 + id * 1000 - pressure * (1400 + id * 300)
export interface Plate {
  id: number
  playerId: PlayerId
  expiresAt: number
  readyAt: number
  lastHitAt: number
  spin: number
  dropped: boolean
}
export interface PlateSpinnerSnapshot extends GameSessionSnapshot {
  plates: Plate[]
  drops: number[]
  feedback: string[]
}

/** All timing uses the shared event clock; camera data never enters this model. */
export class PlateSpinnerModel {
  private readonly session: GameSession
  private readonly playerCount: PlayerCount
  private readonly pressure: number
  private plates: Plate[] = []
  private drops: number[] = []
  private feedback: string[] = []
  private lastTimestamp = 0
  private inputNotBefore = 0
  private roundEnd = 0
  private pausedAt: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; pressure?: number } = {}) {
    this.pressure = Math.max(0, Math.min(1,options.pressure ?? 0))
    this.playerCount = options.playerCount ?? 1
    this.session = new GameSession({ ...options, playerCount: this.playerCount })
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.lastTimestamp = timestamp
    this.inputNotBefore = timestamp + state.countdownRemainingMs
    this.roundEnd = this.inputNotBefore + state.roundRemainingMs
    this.pausedAt = null
    this.drops = Array(this.playerCount).fill(0)
    this.feedback = Array(this.playerCount).fill('Watch the spin bars. Rescue a wobbling plate!')
    this.plates = Array.from({ length: this.playerCount }, (_, index) => plateTargets.map(({ id }) => ({
      id, playerId: (index + 1) as PlayerId, readyAt: this.inputNotBefore,
      expiresAt: this.inputNotBefore + plateLifetime(id,this.pressure), lastHitAt: -Infinity, spin: 1, dropped: false,
    }))).flat()
    return this.snapshot()
  }

  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp)
    const phase = this.session.getSnapshot().phase
    if (phase === 'playing' || phase === 'countdown') {
      // Process all elapsed drop/replacement boundaries, even with a slow render cadence.
      const through = Math.min(now, this.roundEnd)
      if (through >= this.inputNotBefore && this.roundEnd > this.inputNotBefore) {
        this.session.update(Math.max(this.lastTimestamp, this.inputNotBefore))
        while (true) {
          const plate = this.plates.filter((entry) => entry.expiresAt <= through && entry.expiresAt < this.roundEnd)
            .sort((a, b) => a.expiresAt - b.expiresAt || a.playerId - b.playerId || a.id - b.id)[0]
          if (!plate) break
          this.session.awardScore(plate.playerId, -5)
          this.drops[plate.playerId - 1] += 1
          this.feedback[plate.playerId - 1] = `Plate ${plate.id + 1} dropped. −5 points. A new one is coming!`
          plate.readyAt = plate.expiresAt + 1500
          plate.expiresAt = plate.readyAt + plateLifetime(plate.id,this.pressure)
        }
      }
      this.session.update(now)
    } else this.session.update(now)
    this.lastTimestamp = now
    return this.snapshot()
  }

  hit(event: MotionInputEvent) {
    if (event.kind !== 'MOTION_HIT' || !Number.isInteger(event.playerId) || event.playerId < 1 || event.playerId > this.playerCount
      || !Number.isFinite(event.timestamp) || event.timestamp < this.inputNotBefore || event.timestamp < this.lastTimestamp - 180
      || !Number.isFinite(event.confidence) || event.confidence < .2 || event.confidence > 1
      || !Number.isFinite(event.x) || !Number.isFinite(event.y) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    const target = plateTargets.find((target) => ((event.x - target.x) / .12) ** 2 + ((event.y - target.y) / .16) ** 2 <= 1)
    const plate = this.plates.find((plate) => plate.playerId === event.playerId && plate.id === target?.id)
    if (!plate || event.timestamp < plate.readyAt || event.timestamp < plate.expiresAt - plateLifetime(plate.id,this.pressure) || event.timestamp - plate.lastHitAt < 500) return state
    const spin = (plate.expiresAt - event.timestamp) / plateLifetime(plate.id,this.pressure)
    if (spin > wobbleThreshold) return state
    plate.lastHitAt = event.timestamp
    plate.expiresAt = this.lastTimestamp + plateLifetime(plate.id,this.pressure)
    const nearDrop = spin <= .2
    const points = nearDrop ? 15 : 10
    this.session.awardScore(event.playerId, points)
    this.feedback[event.playerId - 1] = `✓ Plate ${plate.id + 1} rescued! ${nearDrop ? 'Last-second save! ' : ''}+${points} points.`
    return this.snapshot()
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase === 'playing' || state.phase === 'countdown') {
      this.session.pause(this.lastTimestamp)
      this.pausedAt = this.lastTimestamp
    }
    return this.snapshot()
  }

  resume(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp)
    if (this.pausedAt !== null) {
      const elapsed = now - this.pausedAt
      for (const plate of this.plates) { plate.readyAt += elapsed; plate.expiresAt += elapsed; plate.lastHitAt += elapsed }
      this.roundEnd += elapsed
      this.inputNotBefore = now + this.session.resume(now).countdownRemainingMs
      this.pausedAt = null
    }
    return this.update(now)
  }

  private snapshot(): PlateSpinnerSnapshot {
    const time = this.pausedAt ?? Math.min(this.lastTimestamp, this.roundEnd)
    return { ...this.session.getSnapshot(), drops: [...this.drops], feedback: [...this.feedback], plates: this.plates.map((plate) => ({
      ...plate, dropped: this.session.getSnapshot().phase !== 'countdown' && time < plate.readyAt, spin: Math.max(0, Math.min(1, (plate.expiresAt - time) / plateLifetime(plate.id,this.pressure))),
    })) }
  }
}
