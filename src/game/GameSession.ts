import type { PlayerCount, PlayerId } from '../input/PlayerZoneMapper'

export type GameSessionPhase = 'idle' | 'countdown' | 'playing' | 'paused' | 'results'
type TimedPhase = 'countdown' | 'playing'

export interface GameSessionOptions {
  playerCount: PlayerCount
  countdownMs?: number
  roundDurationMs?: number
}

export interface PlayerScore {
  playerId: PlayerId
  score: number
}

export interface GameSessionSnapshot {
  phase: GameSessionPhase
  countdownRemainingMs: number
  roundRemainingMs: number
  scores: PlayerScore[]
}

/**
 * Deterministic round clock and score store. Call update with the same monotonic
 * time source used by input events (for example performance.now()).
 */
export class GameSession {
  private readonly playerIds: PlayerId[]
  private readonly countdownMs: number
  private readonly roundDurationMs: number
  private scores = new Map<PlayerId, number>()
  private phase: GameSessionPhase = 'idle'
  private activePhase: TimedPhase = 'countdown'
  private phaseStartedAt = 0
  private pausedRemainingMs = 0
  private lastTimestamp: number | null = null

  constructor(options: GameSessionOptions) {
    this.countdownMs = validDuration(options.countdownMs ?? 3_000, 'Countdown')
    this.roundDurationMs = validDuration(options.roundDurationMs ?? 60_000, 'Round duration')
    this.playerIds = Array.from({ length: options.playerCount }, (_, index) => (index + 1) as PlayerId)
    this.resetScores()
  }

  start(timestamp: number): GameSessionSnapshot {
    this.assertTimestamp(timestamp)
    if (this.phase !== 'idle' && this.phase !== 'results') throw new Error(`Cannot start a session while ${this.phase}.`)
    this.resetScores()
    this.phase = this.countdownMs === 0 ? 'playing' : 'countdown'
    this.activePhase = this.phase
    this.phaseStartedAt = timestamp
    this.lastTimestamp = timestamp
    return this.snapshot(timestamp)
  }

  update(timestamp: number): GameSessionSnapshot {
    this.assertTimestamp(timestamp)
    if (this.phase === 'countdown') {
      const countdownEnd = this.phaseStartedAt + this.countdownMs
      if (timestamp >= countdownEnd) {
        this.phase = 'playing'
        this.activePhase = 'playing'
        this.phaseStartedAt = countdownEnd
      }
    }
    if (this.phase === 'playing' && timestamp >= this.phaseStartedAt + this.roundDurationMs) {
      this.phase = 'results'
    }
    this.lastTimestamp = timestamp
    return this.snapshot(timestamp)
  }

  pause(timestamp: number): GameSessionSnapshot {
    this.update(timestamp)
    if (this.phase !== 'countdown' && this.phase !== 'playing') throw new Error(`Cannot pause a session while ${this.phase}.`)
    this.activePhase = this.phase
    this.pausedRemainingMs = this.remainingFor(this.phase, timestamp)
    this.phase = 'paused'
    return this.snapshot(timestamp)
  }

  resume(timestamp: number): GameSessionSnapshot {
    this.assertTimestamp(timestamp)
    if (this.phase !== 'paused') throw new Error(`Cannot resume a session while ${this.phase}.`)
    this.phase = this.activePhase
    const duration = this.activePhase === 'countdown' ? this.countdownMs : this.roundDurationMs
    this.phaseStartedAt = timestamp - (duration - this.pausedRemainingMs)
    this.lastTimestamp = timestamp
    return this.snapshot(timestamp)
  }

  awardScore(playerId: PlayerId, points: number): number {
    if (!this.scores.has(playerId)) throw new Error(`Player ${playerId} is not in this session.`)
    if (this.phase !== 'playing') return this.scores.get(playerId) ?? 0
    if (!Number.isFinite(points)) throw new Error('Score change must be finite.')
    const next = (this.scores.get(playerId) ?? 0) + points
    this.scores.set(playerId, next)
    return next
  }

  getSnapshot(timestamp = this.lastTimestamp ?? 0): GameSessionSnapshot {
    return this.snapshot(timestamp)
  }

  private snapshot(timestamp: number): GameSessionSnapshot {
    const countdownRemainingMs = this.phase === 'countdown'
      ? this.remainingFor('countdown', timestamp)
      : this.phase === 'paused' && this.activePhase === 'countdown' ? this.pausedRemainingMs : 0
    const roundRemainingMs = this.phase === 'playing'
      ? this.remainingFor('playing', timestamp)
      : this.phase === 'paused' && this.activePhase === 'playing' ? this.pausedRemainingMs
        : this.phase === 'idle' || this.phase === 'countdown' ? this.roundDurationMs : 0
    return {
      phase: this.phase,
      countdownRemainingMs,
      roundRemainingMs,
      scores: this.playerIds.map((playerId) => ({ playerId, score: this.scores.get(playerId) ?? 0 })),
    }
  }

  private remainingFor(phase: TimedPhase, timestamp: number): number {
    const duration = phase === 'countdown' ? this.countdownMs : this.roundDurationMs
    return Math.max(0, duration - (timestamp - this.phaseStartedAt))
  }

  private assertTimestamp(timestamp: number) {
    if (!Number.isFinite(timestamp)) throw new Error('Session timestamp must be finite.')
    if (this.lastTimestamp !== null && timestamp < this.lastTimestamp) throw new Error('Session timestamps must be monotonic.')
  }

  private resetScores() {
    this.scores = new Map(this.playerIds.map((playerId) => [playerId, 0]))
  }
}

function validDuration(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a non-negative finite duration.`)
  return value
}
