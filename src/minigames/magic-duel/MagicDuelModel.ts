import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import { isValidSwipe } from '../../input/HandSwipe'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

type Point = { x: number; y: number }
export const magicPatterns = [
  { name: 'Valley', points: [{ x: .25, y: .3 }, { x: .5, y: .7 }, { x: .75, y: .3 }] },
  { name: 'Corner', points: [{ x: .3, y: .25 }, { x: .3, y: .7 }, { x: .75, y: .7 }] },
  { name: 'Triangle', points: [{ x: .5, y: .25 }, { x: .75, y: .7 }, { x: .25, y: .7 }, { x: .5, y: .25 }] },
  { name: 'Lightning', points: [{ x: .67, y: .19 }, { x: .33, y: .49 }, { x: .64, y: .49 }, { x: .38, y: .81 }] },
  { name: 'Crown', points: [{ x: .18, y: .28 }, { x: .32, y: .69 }, { x: .50, y: .41 }, { x: .68, y: .69 }, { x: .82, y: .28 }] },
] as const
export const magicSpellMs = 5000
export const magicTraceMs = 3000
export interface MagicProgress { playerId: PlayerId; step: number; cursor: Point; startedAt: number | null; cast: boolean; hint:string; pointerId?:string }
export interface MagicDuelSnapshot extends GameSessionSnapshot { pattern: number; spellRemainingMs: number; progress: MagicProgress[] }
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Recognizes ordered spatial strokes, including smaller swipe segments along an
 * edge. Camera internals and simulation adapters stay outside this model. */
export class MagicDuelModel {
  private readonly session: GameSession
  private readonly clock = new PauseClock()
  private readonly players: PlayerId[]
  private progress: MagicProgress[] = []
  private lastInput = new Map<string, number>()
  private now = 0
  private playingAt = 0
  private spell = -1
  private spellStarted = 0
  private nextSpell = 0
  private readonly windowMs:number
  private readonly traceMs:number
  private readonly tolerance:number
  private readonly patterns:number
  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; pressure?:number } = {}) {
    const count = options.playerCount ?? 1
    const pressure=Math.min(1, Math.max(0,options.pressure ?? 0))
    this.windowMs=magicSpellMs-700*pressure
    this.traceMs=magicTraceMs-400*pressure
    this.tolerance=.106-.026*pressure
    this.patterns=3+Number(pressure>=.4)+Number(pressure>=.75)
    this.session = new GameSession({ ...options, playerCount: count })
    this.players = Array.from({ length: count }, (_, i) => (i + 1) as PlayerId)
  }
  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.clock.reset(timestamp); this.now = timestamp
    this.playingAt = timestamp + state.countdownRemainingMs
    this.spell = -1; this.nextSpell=this.playingAt; this.spellStarted=this.playingAt; this.lastInput.clear(); this.progress = this.players.map(id => this.fresh(id))
    return this.update(timestamp)
  }
  private fresh(playerId: PlayerId): MagicProgress {
    return { playerId, step: 0, cursor: { ...magicPatterns[Math.max(0, this.spell) % this.patterns].points[0] }, startedAt: null, cast: false, hint:'' }
  }
  update(timestamp: number): MagicDuelSnapshot {
    if (!Number.isFinite(timestamp) || this.clock.paused || this.session.getSnapshot().phase === 'results') return this.snapshot()
    this.now = Math.max(this.now, this.clock.time(timestamp))
    const state = this.session.update(this.now)
    if (state.phase === 'playing') {
      if (this.now >= this.nextSpell) {
        const skipped=Math.floor((this.now-this.nextSpell)/this.windowMs)
        this.spell+=skipped+1
        this.spellStarted=this.nextSpell+skipped*this.windowMs
        this.nextSpell=this.spellStarted+this.windowMs
        this.progress=this.players.map(id=>this.fresh(id))
      }
      this.progress = this.progress.map(p => !p.cast && p.startedAt !== null && this.now - p.startedAt >= this.traceMs ? this.fresh(p.playerId) : p)
    }
    return this.snapshot()
  }
  trace(event: MotionInputEvent) {
    if (!Number.isFinite(event.timestamp) || !this.clock.accepts(event.timestamp) || !this.players.includes(event.playerId) || event.kind !== 'HAND_SWIPE') return this.snapshot()
    const time = this.clock.time(event.timestamp)
    const source = `${event.playerId}/${event.pointerId ?? 'cursor'}`
    if (time < this.now - 150 || time <= (this.lastInput.get(source) ?? -Infinity)) return this.snapshot()
    this.update(event.timestamp)
    if (this.session.getSnapshot().phase !== 'playing') return this.snapshot()
    this.lastInput.set(source, time)
    if (!isValidSwipe(event) || !this.clock.accepts(event.timestamp - event.swipe!.durationMs)) return this.snapshot()
    const beganAt = time - event.swipe!.durationMs
    if (beganAt < this.spellStarted) return this.snapshot()
    const p = this.progress[event.playerId - 1]
    if (p.cast || (p.startedAt !== null && (beganAt < p.startedAt || p.pointerId !== event.pointerId))) return this.snapshot()
    const points = magicPatterns[this.spell % this.patterns].points
    const from = { x: event.swipe!.fromX, y: event.swipe!.fromY }
    const end = { x: event.x, y: event.y }
    const target = points[p.step + 1]
    const start = points[p.step]
    const dx = target.x - start.x, dy = target.y - start.y
    const length = Math.hypot(dx, dy)
    const cross = Math.abs((end.x - start.x) * dy - (end.y - start.y) * dx) / length
    // Stay close to the drawn edge, move forward, and maintain continuity.
    if (distance(from, p.cursor) > this.tolerance+.025 || cross > this.tolerance || distance(end, target) >= distance(from, target) || distance(end, start) > length + this.tolerance) {
      this.progress[event.playerId - 1] = {...this.fresh(event.playerId),hint:'Start again at dot 1'}
      return this.snapshot()
    }
    p.hint=''
    p.pointerId = event.pointerId
    p.startedAt ??= beganAt
    p.cursor = end
    if (distance(end, target) <= this.tolerance) { p.step++; p.cursor = { ...target } }
    if (p.step === points.length - 1) { p.cast = true; this.session.awardScore(event.playerId, 20) }
    if (this.progress.every(player=>player.cast)) this.nextSpell=Math.min(this.nextSpell,this.now+700)
    return this.snapshot()
  }
  pause(timestamp: number) {
    this.update(timestamp)
    const phase = this.session.getSnapshot().phase
    if (phase === 'countdown' || phase === 'playing') {
      this.session.pause(this.now); this.clock.pause(timestamp)
      this.progress = this.progress.map(p => p.cast ? p : this.fresh(p.playerId))
    }
    return this.snapshot()
  }
  resume(timestamp: number) {
    if (!this.clock.paused) return this.update(timestamp)
    this.clock.resume(timestamp); this.session.resume(this.now)
    return this.snapshot()
  }
  private snapshot(): MagicDuelSnapshot {
    return { ...this.session.getSnapshot(this.now), pattern: Math.max(0, this.spell) % this.patterns,
      spellRemainingMs: Math.max(0, this.nextSpell - Math.max(this.now,this.playingAt)),
      progress: this.progress.map(p => ({ ...p, cursor: { ...p.cursor } })) }
  }
}
