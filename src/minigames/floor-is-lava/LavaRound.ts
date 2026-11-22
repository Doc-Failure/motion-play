import { GameSession } from '../../game/GameSession'
import type { Feet, FloorSample } from '../../input/LavaFeet'
import type { PlayerCount } from '../../input/PlayerZoneMapper'

export const WAVES = 5
const FLOOD_MS = 2000
const FRESH_MS = 500

export function homeZone(players: PlayerCount, side: number) {
  const width = .29 + players * .096
  const left = .025 + side / 2 * (.95 - width)
  return { left, right: left + width, top: .52, bottom: 1 }
}
export type HomeZone = ReturnType<typeof homeZone>
export function inside(feet: Feet, zone: HomeZone) {
  return feet.every(({ x, y }) => x >= zone.left && x <= zone.right && y >= zone.top && y <= zone.bottom)
}

export class LavaRound {
  private readonly clock: GameSession
  private readonly warning: number
  private readonly cycle: number
  private homes: HomeZone[] = []
  private settled = -1
  private outcome = 0
  private rescued = 0
  private latest?: FloorSample
  private since = 0
  private playStartedAt = 0
  private pausedAt = 0

  constructor(private readonly players: PlayerCount, pressure = 0, private readonly random = Math.random) {
    this.warning = Math.round(5000 - 1500 * pressure)
    this.cycle = this.warning + FLOOD_MS
    this.clock = new GameSession({ playerCount: players, roundDurationMs: WAVES * this.cycle })
  }

  start(now: number) {
    const initial = this.clock.start(now)
    this.playStartedAt = now + initial.countdownRemainingMs
    this.settled = -1
    this.outcome = this.rescued = 0
    this.latest = undefined
    this.since = now
    let side = Math.floor(this.random() * 3)
    this.homes = Array.from({ length: WAVES }, () => {
      const zone = homeZone(this.players, side)
      side = (side + 1 + Math.floor(this.random() * 2)) % 3
      return zone
    })
    return this.update(now)
  }

  update(now: number, sample?: FloorSample) {
    const clock = this.clock.update(now)
    const elapsed = WAVES * this.cycle - clock.roundRemainingMs
    const wave = Math.min(WAVES - 1, Math.floor(elapsed / this.cycle))
    const offset = elapsed - wave * this.cycle
    const flooded = offset >= this.warning
    const zone = this.homes[wave]
    const valid = sample && sample.time >= this.since && sample.time <= now && sample.time >= (this.latest?.time ?? 0)
    if (clock.phase === 'playing' || clock.phase === 'results') {
      const lastDue = Math.min(WAVES - 1, Math.floor((elapsed - this.warning) / this.cycle))
      for (let due = this.settled + 1; due <= lastDue; due++) {
        const deadline = this.playStartedAt + due * this.cycle + this.warning
        // Compare both sides of the render tick. Arriving after zero cannot change that wave.
        const observation = valid && sample.time <= deadline ? sample : this.latest
        this.outcome = observation && observation.time <= deadline && deadline - observation.time <= FRESH_MS
          ? observation.feet.filter(pair => inside(pair, this.homes[due])).length : 0
        if (this.outcome === this.players) this.rescued++
        this.settled = due
      }
      if (valid) this.latest = sample
    }
    const feet = this.latest && now - this.latest.time <= FRESH_MS ? this.latest.feet : []
    return { ...clock, scores:clock.scores.map(score => ({ ...score, score:this.rescued })), wave, zone, flooded, feet, rescued: this.rescued,
      home: flooded ? this.outcome : feet.filter(pair => inside(pair, zone)).length,
      floodElapsedMs: Math.max(0, offset - this.warning),
      seconds: Math.ceil(Math.max(0, this.warning - offset) / 1000) }
  }
  pause(now: number) {
    this.pausedAt = now
    const snap = this.update(now)
    if (snap.phase === 'playing' || snap.phase === 'countdown') this.clock.pause(now)
    return this.update(now)
  }
  resume(now: number) {
    this.clock.resume(now)
    this.playStartedAt += now - this.pausedAt
    this.since = now
    this.latest = undefined
    return this.update(now)
  }
}
