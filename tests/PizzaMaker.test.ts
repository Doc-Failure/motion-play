import { describe, expect, it } from 'vitest'
import { ingredientTargets, PizzaMakerModel, type Ingredient } from '../src/minigames/pizza-maker/PizzaMakerModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'

const event = (timestamp = 0, overrides: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'MOTION_HIT', x: .2, y: .78, confidence: 1, timestamp, ...overrides })
const pick = (model: PizzaMakerModel, kind: Ingredient, timestamp: number, playerId: 1 | 2 | 3 | 4 = 1) => model.hit(event(timestamp, { ...ingredientTargets.find((target) => target.kind === kind)!, playerId, kind: 'MOTION_HIT' }))

describe('Pizza Maker normalized motion model', () => {
  it.each([1, 2, 3, 4] as const)('maps mirrored synthetic camera movement into isolated toppings for %i players', (playerCount) => {
    const model = new PizzaMakerModel({ playerCount })
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const zones = defaultCameraZones(playerCount), zone = zones[playerCount - 1]
    const width = 320, height = 180, data = new Uint8ClampedArray(width * height * 4)
    model.start(0)
    processor.process({ width, height, data }, zones, 2990)
    const centerX = Math.floor((1 - (zone.x + zone.width * .2)) * width)
    const centerY = Math.floor((zone.y + zone.height * .78) * height)
    for (let y = centerY - 5; y < centerY + 5; y++) for (let x = centerX - 5; x < centerX + 5; x++) data.fill(255, (y * width + x) * 4, (y * width + x + 1) * 4)
    const result = processor.process({ width, height, data }, zones, 3000)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].playerId).toBe(playerCount)
    const state = model.hit(result.events[0])
    expect(state.scores.map(({ score }) => score)).toEqual([...Array(playerCount - 1).fill(0), 10])
    expect(state.orders[playerCount - 1].added).toEqual(['tomato'])
    expect(processor.process({ width, height, data }, zones, 3400).events).toEqual([])
  })

  it('accepts unordered toppings, penalizes wrong/duplicate picks and serves each pizza once', () => {
    const model = new PizzaMakerModel({ countdownMs: 0, playerCount: 2 })
    model.start(0)
    expect(pick(model, 'basil', 0).orders[0].added).toEqual(['basil'])
    expect(pick(model, 'basil', 350).scores[0].score).toBe(5)
    const wrong = pick(model, 'mushroom', 700)
    expect(wrong.orders[0].added).toEqual(['basil'])
    expect(wrong.scores[0].score).toBe(0)
    const served = pick(model, 'tomato', 1050)
    expect(served).toMatchObject({ teamPizzas: 1, teamGoal: 6, phase: 'playing' })
    expect(served.scores.map(({ score }) => score)).toEqual([30, 0])
    expect(served.orders[1].added).toEqual([])
    expect(pick(model, 'tomato', 1949).teamPizzas).toBe(1)
    expect(model.update(1950).orders[0]).toMatchObject({ requested: ['mushroom', 'tomato'], added: [], feedback: 'New order! Match both toppings in any order.' })
    // A render tick starting the next order cannot make old input valid.
    expect(pick(model, 'tomato', 1900).scores[0].score).toBe(30)
    expect(pick(model, 'mushroom', 1950).scores[0].score).toBe(40)
  })

  it('debounces per player, ignores misses and rejects malformed input before advancing time', () => {
    const model = new PizzaMakerModel({ countdownMs: 0, playerCount: 2 })
    const initial = model.start(0)
    for (const override of [{kind: 'HAND_POSITION' as const}, {confidence: NaN}, {confidence: .1}, {confidence: 2}, {x: -1}, {x: NaN}, {y: 1.1}, {y: Infinity}, {playerId: 4 as const}, {playerId: 1.5 as 1}, {timestamp: NaN}, {timestamp: -1}]) expect(model.hit(event(60000, override))).toEqual(initial)
    expect(model.hit(event(0, { x: .5, y: .1 }))).toEqual(initial)
    expect(pick(model, 'tomato', 0).scores[0].score).toBe(10)
    expect(pick(model, 'basil', 349).scores[0].score).toBe(10)
    expect(pick(model, 'tomato', 349, 2).scores[1].score).toBe(10)
    expect(pick(model, 'basil', 350).scores[0].score).toBe(40)
    expect(pick(model, 'basil', 350).teamPizzas).toBe(1)
  })

  it('preserves countdown, serving delay and cooldown through pause and rejects stale resume input', () => {
    const model = new PizzaMakerModel()
    model.start(0); model.pause(1000)
    expect(model.resume(6000).countdownRemainingMs).toBe(2000)
    model.update(8000)
    expect(pick(model, 'tomato', 7999).scores[0].score).toBe(0)
    pick(model, 'tomato', 8000)
    const paused = model.pause(8100)
    expect(model.update(10000)).toEqual(paused)
    expect(pick(model, 'basil', 10000)).toEqual(paused)
    model.resume(11000)
    expect(pick(model, 'basil', 10999).scores[0].score).toBe(10)
    expect(pick(model, 'basil', 11000).scores[0].score).toBe(10)
    expect(pick(model, 'basil', 11250).teamPizzas).toBe(1)
    model.pause(11300); model.resume(21300)
    expect(model.update(22149).orders[0].added).toHaveLength(2)
    expect(model.update(22150).orders[0].added).toEqual([])
  })

  it.each([1, 2, 3, 4] as const)('finishes %i-player cooperation at the shared goal and fully resets on replay', (playerCount) => {
    const model = new PizzaMakerModel({ playerCount, countdownMs: 0 })
    model.start(0)
    let timestamp = 0
    for (let index = 0; index < playerCount * 3; index++) {
      const state = model.update(timestamp)
      expect(state.phase).toBe('playing')
      for (const kind of state.orders[0].requested) { pick(model, kind, timestamp); timestamp += 350 }
      timestamp += 900
    }
    const result = model.update(timestamp)
    expect(result.phase).toBe('results')
    expect(result.teamPizzas).toBe(playerCount * 3)
    expect(result.scores[0].score).toBe(playerCount * 120)
    expect(pick(model, 'tomato', timestamp + 1)).toEqual(result)
    const replay = model.start(timestamp + 2)
    expect(replay.teamPizzas).toBe(0)
    expect(replay.orders.every((order) => order.added.length === 0 && order.completed === 0)).toBe(true)
    expect(replay.scores.every(({ score }) => score === 0)).toBe(true)
  })

  it('is independent of render cadence and accepts delayed captures without rewinding time', () => {
    const slow = new PizzaMakerModel({ countdownMs: 0 })
    const fast = new PizzaMakerModel({ countdownMs: 0 })
    for (const model of [slow, fast]) {
      model.start(0); pick(model, 'tomato', 0); pick(model, 'basil', 350)
    }
    for (let time = 400; time <= 2000; time += 100) fast.update(time)
    expect(slow.update(2000)).toEqual(fast.update(2000))
    const delayed = pick(slow, 'mushroom', 1900)
    expect(delayed.scores[0].score).toBe(50)
    expect(delayed.roundRemainingMs).toBe(58000)
    expect(pick(slow, 'tomato', 1800).scores[0].score).toBe(50)
  })

  it('ends at the round boundary without extra awards and owns all snapshot arrays', () => {
    const model = new PizzaMakerModel({ countdownMs: 0, roundDurationMs: 1000 })
    const state = model.start(0)
    state.orders[0].added.push('basil'); state.orders[0].requested[0] = 'mushroom'; state.scores[0].score = 90
    expect(pick(model, 'tomato', 0).scores[0].score).toBe(10)
    const result = pick(model, 'basil', 1000)
    expect(result.phase).toBe('results')
    expect(result.scores[0].score).toBe(10)
    expect(result.teamPizzas).toBe(0)
    expect(model.pause(2000).phase).toBe('results')
  })
})
