import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export interface Monster { id: number; playerId: PlayerId; x: number; y: number; spawnedAt: number }
export interface MonsterDefenseSnapshot extends GameSessionSnapshot {
  monsters: Monster[]
  breaches: Record<PlayerId, number>
  teamScore: number
  teamGoal: number
}

/** Only normalized input enters this model; camera capture belongs to the input layer. */
export class MonsterDefenseModel {
  private readonly session: GameSession
  private readonly playerCount: PlayerCount
  private readonly spawnIntervalMs: number
  private readonly approachMs: number
  private monsters: Monster[] = []
  private breaches: Record<PlayerId, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  private nextSpawnAt = 0
  private nextId = 1
  private wave = 0
  private lastTimestamp = 0
  private inputNotBefore = 0
  private pausedAt: number | null = null

  private readonly teamGoal: number
  private readonly pressure: number

  constructor(options: { pressure?: number; teamGoal?: number; playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number; spawnIntervalMs?: number; approachMs?: number } = {}) {
    this.pressure = Math.max(-.15, Math.min(1, options.pressure ?? 0))
    this.playerCount = options.playerCount ?? 1
    this.teamGoal = options.teamGoal ?? this.playerCount * 100
    this.session = new GameSession({ ...options, playerCount: this.playerCount })
    this.spawnIntervalMs = options.spawnIntervalMs ?? (1800 - 480 * this.pressure)
    this.approachMs = options.approachMs ?? (5400 - 1500 * this.pressure)
    if (!Number.isFinite(this.spawnIntervalMs) || this.spawnIntervalMs < 100 || !Number.isFinite(this.approachMs) || this.approachMs < 100) throw new Error('Monster timing must be finite and at least 100ms.')
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.monsters = []
    this.breaches = { 1: 0, 2: 0, 3: 0, 4: 0 }
    this.nextId = 1
    this.wave = 0
    this.pausedAt = null
    this.lastTimestamp = timestamp
    this.inputNotBefore = this.nextSpawnAt = timestamp + state.countdownRemainingMs
    return this.update(timestamp)
  }

  update(timestamp: number): MonsterDefenseSnapshot {
    const now = Math.max(timestamp, this.lastTimestamp)
    const previous = this.session.getSnapshot()
    const roundEnd = this.lastTimestamp + previous.countdownRemainingMs + previous.roundRemainingMs
    // Resolve scheduled breaches before the round closes, even after a delayed tick.
    const simulationTime = previous.phase === 'playing' || previous.phase === 'countdown'
      ? Math.max(this.lastTimestamp, Math.min(now, roundEnd - .001)) : now
    const state = this.session.update(simulationTime)
    if (state.phase === 'playing') {
      // Scheduled waves make movement and breaches independent of render cadence.
      while (this.nextSpawnAt <= simulationTime) {
        this.expire(this.nextSpawnAt)
        for (let index = 0; index < this.playerCount; index += 1) {
          const playerId = (index + 1) as PlayerId
          if (this.monsters.filter((monster) => monster.playerId === playerId).length < 4) {
            this.monsters.push({ id: this.nextId++, playerId, x: .12, y: [.25, .5, .75][this.wave % 3], spawnedAt: this.nextSpawnAt })
          }
        }
        this.wave += 1
        this.nextSpawnAt += this.spawnIntervalMs
      }
      this.expire(simulationTime)
    }
    if (this.session.update(now).phase === 'results') this.monsters = []
    this.lastTimestamp = now
    return this.snapshot()
  }

  hit(event: MotionInputEvent) {
    if (event.kind !== 'MOTION_HIT' || !Number.isInteger(event.playerId) || event.playerId < 1 || event.playerId > this.playerCount
      || !Number.isFinite(event.timestamp) || event.timestamp < this.inputNotBefore
      || !Number.isFinite(event.confidence) || event.confidence < .2 || event.confidence > 1
      || !Number.isFinite(event.x) || !Number.isFinite(event.y) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) return this.snapshot()
    const state = this.update(event.timestamp)
    if (state.phase !== 'playing') return state
    // Input can arrive after a render tick. Use the capture-time position of
    // surviving targets without rewinding time or resurrecting breached ones.
    const target = this.monsters.find((monster) => monster.playerId === event.playerId && event.timestamp >= monster.spawnedAt
      && ((event.x - this.monsterX(monster, event.timestamp)) / .1) ** 2 + ((event.y - this.monsterY(monster, event.timestamp)) / .13) ** 2 <= 1)
    if (target) {
      this.monsters = this.monsters.filter((monster) => monster.id !== target.id)
      this.session.awardScore(event.playerId, 10)
    }
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
      this.nextSpawnAt += elapsed
      for (const monster of this.monsters) monster.spawnedAt += elapsed
      this.inputNotBefore = now + this.session.resume(now).countdownRemainingMs
      this.pausedAt = null
    }
    return this.update(now)
  }

  private expire(timestamp: number) {
    for (const monster of this.monsters) {
      if (timestamp - monster.spawnedAt >= this.approachMs) {
        this.breaches[monster.playerId] += 1
        this.session.awardScore(monster.playerId, -5)
      }
    }
    this.monsters = this.monsters.filter((monster) => timestamp - monster.spawnedAt < this.approachMs)
  }

  private snapshot(): MonsterDefenseSnapshot {
    const state = this.session.getSnapshot()
    const now = this.pausedAt ?? this.lastTimestamp
    return { ...state, monsters: this.monsters.map((monster) => ({ ...monster, x: this.monsterX(monster, now), y: this.monsterY(monster, now) })),
      breaches: { ...this.breaches }, teamScore: state.scores.reduce((total, entry) => total + entry.score, 0), teamGoal: this.teamGoal }
  }

  private monsterY(monster: Monster, timestamp: number) {
    const progress = Math.max(0, Math.min(1,(timestamp - monster.spawnedAt) / this.approachMs))
    return monster.y + .09 * Math.max(0,this.pressure) * Math.sin(progress * 2 * Math.PI)
  }

  private monsterX(monster: Monster, timestamp: number) {
    return .12 + Math.max(0, timestamp - monster.spawnedAt) / this.approachMs * .76
  }
}
