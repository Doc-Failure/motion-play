import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const ingredients = ['tomato', 'mushroom', 'basil'] as const
export type Ingredient = (typeof ingredients)[number]
export const ingredientTargets = ingredients.map((kind, index) => ({ kind, x: .2 + index * .3, y: .78 }))
const recipes: readonly (readonly Ingredient[])[] = [['tomato', 'basil'], ['mushroom', 'tomato'], ['basil', 'mushroom']]
export interface PizzaOrder {
  playerId: PlayerId
  requested: Ingredient[]
  added: Ingredient[]
  completed: number
  readyAt: number
  lastHitAt: number
  feedback: string
}
export interface PizzaMakerSnapshot extends GameSessionSnapshot {
  orders: PizzaOrder[]
  teamPizzas: number
  teamGoal: number
}

/** Receives only normalized events; no camera or tracking dependencies. */
export class PizzaMakerModel {
  private readonly session: GameSession
  private readonly playerCount: PlayerCount
  private orders: PizzaOrder[] = []
  private lastTimestamp = 0
  private inputNotBefore = 0
  private pausedAt: number | null = null

  constructor(options: { playerCount?: PlayerCount; countdownMs?: number; roundDurationMs?: number } = {}) {
    this.playerCount = options.playerCount ?? 1
    this.session = new GameSession({ ...options, playerCount: this.playerCount })
  }

  start(timestamp: number) {
    const state = this.session.start(timestamp)
    this.lastTimestamp = timestamp
    this.inputNotBefore = timestamp + state.countdownRemainingMs
    this.pausedAt = null
    this.orders = Array.from({ length: this.playerCount }, (_, index) => ({ playerId: (index + 1) as PlayerId,
      requested: [...recipes[0]], added: [], completed: 0, readyAt: this.inputNotBefore, lastHitAt: -Infinity,
      feedback: 'Ready? Match both toppings in any order.' }))
    return this.snapshot()
  }

  update(timestamp: number) {
    const now = Math.max(timestamp, this.lastTimestamp)
    const state = this.session.update(now)
    if (state.phase === 'playing') {
      for (const order of this.orders) {
        if (order.added.length === order.requested.length && now >= order.readyAt) {
          order.requested = [...recipes[order.completed % recipes.length]]
          order.added = []
          order.feedback = 'New order! Match both toppings in any order.'
          // A delayed capture from the previous pizza must not select a new topping.
        }
      }
    }
    this.lastTimestamp = now
    return this.snapshot()
  }

  hit(event: MotionInputEvent) {
    if (event.kind !== 'MOTION_HIT' || !Number.isInteger(event.playerId) || event.playerId < 1 || event.playerId > this.playerCount
      || !Number.isFinite(event.timestamp) || event.timestamp < this.inputNotBefore
      || !Number.isFinite(event.confidence) || event.confidence < .2 || event.confidence > 1
      || !Number.isFinite(event.x) || !Number.isFinite(event.y) || event.x < 0 || event.x > 1 || event.y < 0 || event.y > 1) return this.snapshot()
    const state = this.update(event.timestamp)
    const order = this.orders[event.playerId - 1]
    if (state.phase !== 'playing' || event.timestamp < order.readyAt || event.timestamp - order.lastHitAt < 350
      || order.added.length === order.requested.length) return state
    const target = ingredientTargets.find((item) => ((event.x - item.x) / .12) ** 2 + ((event.y - item.y) / .16) ** 2 <= 1)
    if (!target) return state
    order.lastHitAt = event.timestamp
    if (!order.requested.includes(target.kind) || order.added.includes(target.kind)) {
      this.session.awardScore(event.playerId, -5)
      order.feedback = `Oops! ${target.kind} ${order.added.includes(target.kind) ? 'is already added' : 'is not on this order'}. −5 points.`
    } else {
      order.added.push(target.kind)
      this.session.awardScore(event.playerId, 10)
      order.feedback = `✓ ${target.kind} added! +10 points.`
      if (order.added.length === order.requested.length) {
        order.completed += 1
        order.readyAt = event.timestamp + 900
        this.session.awardScore(event.playerId, 20)
        order.feedback = '✓ Pizza served! +20 bonus points. A new order is coming.'
        if (this.orders.reduce((sum, entry) => sum + entry.completed, 0) >= this.playerCount * 3) this.session.finish(this.lastTimestamp)
      }
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
      for (const order of this.orders) { order.readyAt += elapsed; order.lastHitAt += elapsed }
      this.inputNotBefore = now + this.session.resume(now).countdownRemainingMs
      this.pausedAt = null
    }
    return this.update(now)
  }

  private snapshot(): PizzaMakerSnapshot {
    return { ...this.session.getSnapshot(), orders: this.orders.map((order) => ({ ...order, requested: [...order.requested], added: [...order.added] })),
      teamPizzas: this.orders.reduce((sum, order) => sum + order.completed, 0), teamGoal: this.playerCount * 3 }
  }
}
