import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

const HITS_TO_BREAK = 3
const HIT_COOLDOWN_MS = 350
const RESPAWN_MS = 900
const CANDY_PER_BREAK = 10

export interface Pinata {
  playerId: PlayerId
  x: number
  y: number
  hits: number
  readyAt: number | null
  lastHitAt: number | null
}

export interface PinataPartySnapshot extends GameSessionSnapshot {
  pinatas: Pinata[]
  hitsToBreak: number
  teamCandy: number
  teamGoal: number
}

/** Camera-independent, player-local targets with a shared candy goal. */
export class PinataPartyModel {
  private readonly session: GameSession
  private pinatas: Pinata[] = []
  private lastTimestamp: number | null = null
  private inputNotBefore = 0
  private pausedAt: number | null = null
  private readonly playerCount: PlayerCount

  private readonly teamGoal: number
  private readonly pressure: number

  constructor(options: { pressure?: number; teamGoal?: number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    this.pressure = Math.max(-.15, Math.min(1, options.pressure ?? 0))
    this.playerCount = options.playerCount ?? 1
    this.teamGoal = options.teamGoal ?? this.playerCount * 50
    this.session = new GameSession({ ...options, playerCount: this.playerCount })
  }

  start(timestamp: number): PinataPartySnapshot {
    this.session.start(timestamp)
    this.inputNotBefore = timestamp + this.session.getSnapshot().countdownRemainingMs
    this.lastTimestamp = timestamp
    this.pausedAt = null
    this.pinatas = Array.from({ length: this.playerCount }, (_, index) => ({ playerId: (index + 1) as PlayerId, x: .5, y: .45, hits: 0, readyAt: null, lastHitAt: null }))
    return this.snapshot()
  }

  update(timestamp: number): PinataPartySnapshot {
    const now = Math.max(timestamp, this.lastTimestamp ?? timestamp)
    const state = this.session.update(now)
    if (state.phase === 'playing') {
      for (const pinata of this.pinatas) {
        if (pinata.readyAt !== null && now >= pinata.readyAt) {
          const breaks = this.session.getSnapshot().scores[pinata.playerId - 1].score / CANDY_PER_BREAK
          pinata.x = .5 + Math.sin(breaks * 2.2) * (.09 + .16 * this.pressure)
          pinata.y = .45 + Math.sin(breaks * 1.6) * (.04 + .10 * this.pressure)
          pinata.hits = 0
          pinata.lastHitAt = pinata.readyAt - HIT_COOLDOWN_MS
          pinata.readyAt = null
        }
      }
    }
    this.lastTimestamp = now
    return this.snapshot()
  }

  hit(event: MotionInputEvent): PinataPartySnapshot {
    // Keep input event time for debounce; render ticks may run before delivery.
    // Batches from before this round or its latest resume cannot award hits.
    if (event.kind !== 'MOTION_HIT' || !Number.isFinite(event.timestamp) || event.timestamp < this.inputNotBefore
      || !Number.isFinite(event.confidence) || event.confidence < .2 || event.confidence > 1
      || !Number.isFinite(event.x) || !Number.isFinite(event.y) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) return this.snapshot()
    const state = this.update(event.timestamp)
    const pinata = this.pinatas.find((target) => target.playerId === event.playerId)
    if (state.phase !== 'playing' || !pinata || pinata.readyAt !== null
      || (pinata.lastHitAt !== null && event.timestamp - pinata.lastHitAt < HIT_COOLDOWN_MS)
      || ((event.x - pinata.x) / .16) ** 2 + ((event.y - pinata.y) / .20) ** 2 > 1) return state
    pinata.hits += 1
    pinata.lastHitAt = event.timestamp
    if (pinata.hits === HITS_TO_BREAK) {
      pinata.readyAt = event.timestamp + RESPAWN_MS - 240 * this.pressure
      this.session.awardScore(event.playerId, CANDY_PER_BREAK)
    }
    return this.snapshot()
  }

  pause(timestamp: number) {
    const state = this.update(timestamp)
    if (state.phase === 'playing' || state.phase === 'countdown') {
      this.session.pause(this.lastTimestamp!)
      this.pausedAt = this.lastTimestamp
    }
    return this.snapshot()
  }

  resume(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp ?? timestamp)
    if (this.pausedAt !== null) {
      const elapsed = now - this.pausedAt
      for (const pinata of this.pinatas) {
        if (pinata.readyAt !== null) pinata.readyAt += elapsed
        if (pinata.lastHitAt !== null) pinata.lastHitAt += elapsed
      }
      this.inputNotBefore = now + this.session.resume(now).countdownRemainingMs
      this.pausedAt = null
    }
    return this.update(now)
  }

  private snapshot(): PinataPartySnapshot {
    const state = this.session.getSnapshot()
    return { ...state, pinatas: this.pinatas.map((pinata) => ({ ...pinata })), hitsToBreak: HITS_TO_BREAK,
      teamCandy: state.scores.reduce((total, entry) => total + entry.score, 0), teamGoal: this.teamGoal }
  }
}
