import { PauseClock } from '../../game/PauseClock'
import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const simonPads = ['sun', 'leaf', 'wave', 'berry'] as const
export type SimonPad = typeof simonPads[number]
export type SimonTurn = 'showing' | 'input'

export interface SimonSaysSnapshot extends GameSessionSnapshot {
  sequence: SimonPad[]
  turn: SimonTurn
  shownCount: number
  activeCue: SimonPad | null
  inputRemainingMs: number
  progress: Array<{ playerId: PlayerId; entered: number; mistakes: number; completed: boolean }>
}

export const PAD_CENTERS: Record<SimonPad, { x: number; y: number }> = {
  sun: { x: .25, y: .28 }, leaf: { x: .75, y: .28 }, wave: { x: .25, y: .72 }, berry: { x: .75, y: .72 },
}

export class SimonSaysModel {
  private readonly clock = new PauseClock()
  private readonly session: GameSession
  private readonly players: PlayerId[]
  private readonly random: () => number
  private readonly cueMs: number
  private readonly gapMs: number
  private sequence: SimonPad[] = []
  private turn: SimonTurn = 'showing'
  private showStartedAt = 0
  private readonly pressure: number
  private inputStart = 0
  private inputEnd = 0
  private lastPad = new Map<PlayerId, {pad: SimonPad; time:number}>()
  private presentationStarted = false
  private progress = new Map<PlayerId, { entered: number; mistakes: number; completed: boolean }>()
  private lastTimestamp: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; cueMs?: number; gapMs?: number; random?: () => number; pressure?:number } = {}) {
    const count = options.playerCount ?? 1
    this.session = new GameSession({ playerCount: count, countdownMs: options.countdownMs, roundDurationMs: options.roundDurationMs })
    this.players = Array.from({ length: count }, (_, index) => (index + 1) as PlayerId)
    this.random = options.random ?? Math.random
    this.pressure = Math.max(0, Math.min(1, options.pressure ?? 0))
    this.cueMs = options.cueMs ?? 550 - 125 * this.pressure
    this.gapMs = options.gapMs ?? 180
  }

  start(timestamp: number) {
    this.clock.reset(timestamp)

    this.sequence = Array.from({length: 1 + Math.floor(this.pressure * 2)}, () => this.pickPad())
    this.lastPad.clear()
    this.turn = 'showing'
    this.showStartedAt = timestamp
    this.presentationStarted = false
    this.progress = new Map(this.players.map((playerId) => [playerId, { entered: 0, mistakes: 0, completed: false }]))
    this.lastTimestamp = timestamp
    this.session.start(timestamp)
    return this.update(timestamp)
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
    if (state.phase === 'playing' && !this.presentationStarted) { this.showStartedAt = now; this.presentationStarted = true }
    if (state.phase === 'playing' && this.turn === 'showing' && now - this.showStartedAt >= this.sequence.length * (this.cueMs + this.gapMs)) {
      this.turn = 'input'
      this.inputStart = now
      this.inputEnd = now + 3800 + this.sequence.length * (1250 - 200 * this.pressure)
    } else if (state.phase === 'playing' && this.turn === 'input' && now >= this.inputEnd) {
      this.nextRound(now, [...this.progress.values()].some(entry => entry.completed))
    }
    this.lastTimestamp = now
    return this.snapshot(now)
  }

  hit(event: MotionInputEvent) {
    if (!Number.isFinite(event.timestamp) || !Number.isFinite(event.confidence) || !this.clock.accepts(event.timestamp)) return this.snapshot(this.lastTimestamp ?? 0)
    this.update(event.timestamp)
    const now = this.lastTimestamp!
    if (event.kind !== 'MOTION_HIT' || event.confidence < .2 || this.turn !== 'input' || this.session.getSnapshot().phase !== 'playing') return this.snapshot(now)
    const player = this.progress.get(event.playerId)
    const pad = this.padAt(event.x, event.y)
    if (!player || !pad || player.completed) return this.snapshot(now)
    const time = this.clock.time(event.timestamp)
    const prior = this.lastPad.get(event.playerId)
    if (time < this.inputStart || time < now - 180 || (prior && (time <= prior.time || (prior.pad === pad && time - prior.time < 180)))) return this.snapshot(now)
    this.lastPad.set(event.playerId, {pad,time})
    const expected = this.sequence[player.entered]
    if (pad !== expected) {
      player.entered = 0
      player.mistakes += 1
      this.session.awardScore(event.playerId, -5)
      return this.snapshot(now)
    }
    player.entered += 1
    if (player.entered === this.sequence.length) {
      player.completed = true
      this.session.awardScore(event.playerId, 10 * this.sequence.length)
      if ([...this.progress.values()].every((entry) => entry.completed)) this.nextRound(now)
    }
    return this.snapshot(now)
  }

  private nextRound(now: number, advance = true) {
    if (advance) this.sequence = [...this.sequence.slice(-4 - Math.floor(this.pressure * 2)), this.pickPad()]
    this.lastPad.clear()
    this.turn = 'showing'
    this.showStartedAt = now
    this.presentationStarted = true
    for (const player of this.progress.values()) { player.entered = 0; player.completed = false }
  }

  private pickPad() { return simonPads[Math.min(simonPads.length - 1, Math.floor(this.random() * simonPads.length))] }
  private padAt(x: number, y: number) { return simonPads.find((pad) => Math.hypot(PAD_CENTERS[pad].x - x, PAD_CENTERS[pad].y - y) <= .22) ?? null }
  private snapshot(timestamp: number): SimonSaysSnapshot {
    const elapsed = Math.max(0, timestamp - this.showStartedAt)
    const cueIndex = Math.floor(elapsed / (this.cueMs + this.gapMs))
    const cueElapsed = elapsed % (this.cueMs + this.gapMs)
    const activeCue = this.turn === 'showing' && cueIndex < this.sequence.length && cueElapsed < this.cueMs ? this.sequence[cueIndex] : null
    return { ...this.session.getSnapshot(timestamp), sequence: [...this.sequence], turn: this.turn, inputRemainingMs: this.turn === 'input' ? Math.max(0,this.inputEnd-timestamp) : 0, shownCount: Math.min(this.sequence.length, cueIndex + 1), activeCue, progress: this.players.map((playerId) => ({ playerId, ...this.progress.get(playerId)! })) }
  }
}
