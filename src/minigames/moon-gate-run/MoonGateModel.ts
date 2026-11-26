import { scoreGoal } from '../../game/arcade'
import { GameSession } from '../../game/GameSession'
import { PauseClock } from '../../game/PauseClock'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { foeAt, GATE_DISTANCE, platforms, type Foe } from './course'

const ROUND_MS = 60000
export const FINALE_MS = 1300
export interface Runner {
  id: PlayerId
  life: number
  height: number
  speedY: number
  grounded: boolean
  obstacle: number
  landedOn: number
  cleared: number
  enemy: number
  hp: number
  contact: number
  hitAt: number
  hurtAt: number
  jumpAt: number
  landAt: number
  rewardAt: number
  bumpAt: number
  swingAt: number
  airSwing: boolean
  fallen: { foe: Foe; at: number } | null
  won: boolean
}
interface Torso { y: number; armed: boolean; time: number }

export class MoonGateModel {
  private session: GameSession
  private clock = new PauseClock()
  private now = 0
  private begins = 0
  private elapsed = 0
  private runners: Runner[] = []
  private torso = new Map<PlayerId, Torso>()
  private lastEvent = new Map<string, number>()
  private pace: number
  private gateTime: number

  constructor(players: PlayerCount, private aspect: number, private level = 1) {
    this.session = new GameSession({ playerCount: players, roundDurationMs: ROUND_MS + FINALE_MS + 16 })
    this.pace = .00021 * (1 + Math.min(4, level - 1) * .065)
    this.gateTime = GATE_DISTANCE / this.pace
  }
  setAspect(aspect: number) { if (aspect > 0) this.aspect = aspect }
  get distance() { return Math.min(GATE_DISTANCE, this.elapsed * this.pace) }
  private foe(elapsed = this.elapsed) {
    return foeAt(Math.min(GATE_DISTANCE, elapsed * this.pace), elapsed, this.gateTime, this.aspect, this.level)
  }
  start(time: number) {
    const s = this.session.start(time)
    this.clock.reset(time)
    this.now = time
    this.begins = time + 3000
    this.elapsed = 0
    this.torso.clear()
    this.lastEvent.clear()
    this.runners = s.scores.map(p => ({ id: p.playerId, life: 6, height: 0, speedY: 0, grounded: true,
      obstacle: -1, landedOn: -1, cleared: 0, enemy: -1, hp: 0, contact: -1, hitAt: -1000, hurtAt: -2000, jumpAt: -2000, landAt: -2000, rewardAt: -2000, bumpAt: -2000,
      swingAt: -2000, airSwing: false, fallen: null, won: false }))
    return this.snapshot()
  }
  update(time: number) {
    if (this.clock.paused || !Number.isFinite(time) || this.session.getSnapshot().phase === 'results') return this.snapshot()
    this.now = Math.max(this.now, this.clock.time(time))
    const target = Math.min(ROUND_MS + FINALE_MS, this.now - this.begins)
    while (this.elapsed + 16 <= target) {
      this.elapsed += 16
      this.session.update(this.begins + this.elapsed)
      const foe = this.foe()
      for (const r of this.runners) {
        if (!r.life || r.won || this.elapsed >= ROUND_MS) continue
        this.stepRunner(r)
        if (!foe || !r.life) continue
        if (r.enemy !== foe.index) {
          r.enemy = foe.index
          r.hp = foe.maxHp
          r.contact = -1
        }
        if (r.hp && foe.threatens && r.contact !== foe.charge && r.height < .13) {
          this.damage(r)
          r.contact = foe.charge
        }
      }
      const finished = this.runners.every(r => r.won || !r.life)
      if (finished || this.elapsed >= ROUND_MS) {
        const lastFinish = Math.max(...this.runners.map(r => r.won ? r.fallen!.at : !r.life ? r.hurtAt : -FINALE_MS))
        if (this.elapsed >= lastFinish + FINALE_MS) {
          this.session.finish(this.begins + this.elapsed)
          break
        }
      }
    }
    this.session.update(this.now)
    return this.snapshot()
  }
  private stepRunner(r: Runner) {
    const index = platforms.findIndex(p => this.distance >= p.start && this.distance <= p.start + p.width)
    const platform = platforms[index]
    let floor = 0
    if (platform && r.height >= platform.height - .001) floor = platform.height
    if (platform && r.obstacle !== index) {
      r.obstacle = index
      if (!floor) {
        this.damage(r)
        r.bumpAt = this.elapsed
        // Scramble onto the deck after a bump, without earning a clean landing.
        r.landedOn = index
        floor = platform.height
        r.height = floor
        r.speedY = .18
      }
    }
    r.speedY -= .016 * 2.5
    const next = r.height + r.speedY * .016
    if (!r.grounded && next <= floor) r.landAt = this.elapsed
    r.grounded = next <= floor
    if (r.grounded && floor > 0 && r.landedOn !== index) {
      r.landedOn = index
      r.rewardAt = this.elapsed
      r.cleared++
      this.session.awardScore(r.id, 5)
    }
    r.height = Math.max(next, floor)
    if (r.grounded) r.speedY = 0
  }
  private damage(r: Runner) { r.life--; r.hurtAt = this.elapsed }
  private leap(r: Runner) {
    if (r.grounded) { r.speedY = 1.14; r.grounded = false; r.jumpAt = this.elapsed }
  }
  input(event: MotionInputEvent) {
    const { timestamp, playerId, kind, x, y, confidence } = event
    const key = playerId + kind
    if (!this.clock.accepts(timestamp) || ![timestamp,x,y,confidence].every(Number.isFinite) ||
      this.clock.time(timestamp) < this.now - 160 || timestamp < (this.lastEvent.get(key) ?? -Infinity) ||
      (kind === 'BODY_MOVE' && timestamp === this.lastEvent.get(key)) ||
      x < 0 || x > 1 || y < 0 || y > 1) return this.snapshot()
    this.update(timestamp)
    const r = this.runners.find(p => p.id === playerId)
    if (!r || !r.life || r.won || this.elapsed >= ROUND_MS || this.session.getSnapshot().phase !== 'playing') return this.snapshot()
    this.lastEvent.set(key, timestamp)
    if (confidence < (kind === 'MOTION_HIT' ? .5 : .6) || confidence > 1) {
      if (kind === 'BODY_MOVE') this.torso.delete(playerId)
      return this.snapshot()
    }
    if (kind === 'BODY_MOVE') {
      const old = this.torso.get(playerId)
      const threshold = Math.min(.07, Math.max(.025, event.activity ?? .05))
      if (!old || timestamp-old.time > 350) this.torso.set(playerId, { y, armed: true, time: timestamp })
      else {
        old.time = timestamp
        if (old.armed && old.y - y >= threshold) { this.leap(r); old.armed = false; old.y = y }
        else if (!old.armed && y - old.y >= threshold) { old.armed = true; old.y = y }
        else old.y = old.armed ? Math.max(old.y, y) : Math.min(old.y, y)
      }
    } else if (kind === 'MOTION_HIT') {
      const captured = Math.min(this.elapsed, this.clock.time(timestamp) - this.begins)
      if (captured - r.swingAt >= 230) { r.swingAt = captured; r.airSwing = !r.grounded }
      const foe = this.foe(captured)
      if (foe && foe.index === r.enemy && r.hp && captured-r.hitAt >= 230 &&
        ((x-foe.x)/foe.rx)**2 + ((y-foe.y)/foe.ry)**2 <= 1) {
        r.hitAt = captured
        r.hp--
        if (!r.hp) {
          this.session.awardScore(r.id, foe.boss ? scoreGoal('moon-gate-run', this.level) : 10)
          r.fallen = { foe, at: this.elapsed }
          r.won = foe.boss
        }
      }
    }
    return this.snapshot()
  }
  jump(id: PlayerId, time: number) {
    this.update(time)
    const r = this.runners.find(p => p.id === id)
    if (r && r.life && !r.won && this.elapsed < ROUND_MS && this.session.getSnapshot().phase === 'playing') this.leap(r)
    return this.snapshot()
  }
  pause(time: number) {
    const s = this.update(time)
    if (s.phase === 'playing' || s.phase === 'countdown') {
      this.session.pause(this.now); this.clock.pause(time); this.torso.clear()
    }
    return this.snapshot()
  }
  resume(time: number) {
    if (this.clock.paused) { this.clock.resume(time); this.session.resume(this.now) }
    return this.snapshot()
  }
  private snapshot() {
    const state = this.session.getSnapshot(this.now)
    return { ...state, roundRemainingMs: Math.max(0, state.roundRemainingMs-FINALE_MS-16),
      gateAge: this.elapsed-this.gateTime, elapsed: this.elapsed, distance: this.distance,
      foe: this.foe(), runners: this.runners.map(r => ({ ...r })) }
  }
}
