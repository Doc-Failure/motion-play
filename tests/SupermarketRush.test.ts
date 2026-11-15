import { describe, expect, it } from 'vitest'
import { SupermarketRushModel } from '../src/minigames/supermarket-rush/SupermarketRushModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'

const event = (timestamp = 0, overrides: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'MOTION_HIT', x: .88, y: .5, confidence: 1, timestamp, ...overrides })

describe('Supermarket Rush', () => {
  it.each([1, 2, 3, 4] as const)('maps mirrored synthetic motion to isolated shopping for %i players', (playerCount) => {
    const model = new SupermarketRushModel({ playerCount })
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const zones = defaultCameraZones(playerCount)
    const zone = zones[playerCount - 1]
    const width = 160, height = 90
    const data = new Uint8ClampedArray(width * height * 4)
    model.start(0)
    processor.process({ width, height, data }, zones, 2990)
    const centerX = Math.floor((1 - (zone.x + zone.width * .88)) * width)
    for (let y = 42; y < 48; y += 1) {
      for (let x = centerX - 2; x < centerX + 2; x += 1) data.fill(255, (y * width + x) * 4, (y * width + x + 1) * 4)
    }
    const result = processor.process({ width, height, data }, zones, 3000)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ kind: 'MOTION_HIT', playerId: playerCount })
    const hit = model.hit(result.events[0])
    expect(hit.scores.map(({ score }) => score)).toEqual([...Array(playerCount - 1).fill(0), 10])
    expect(hit.orders[playerCount]).toBe('bread')
    expect(hit.items).toHaveLength(playerCount - 1)
    expect(processor.process({ width, height, data }, zones, 3300).events).toEqual([])
  })

  it('cycles the order only for correct picks and removes wrong selections once', () => {
    const model = new SupermarketRushModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    expect(model.hit(event()).orders).toMatchObject({ 1: 'bread', 2: 'apple' })
    expect(model.hit(event()).scores[0].score).toBe(10)
    expect(model.hit(event(1800)).orders[1]).toBe('milk')
    const wrong = model.hit(event(1800, { playerId: 2 }))
    expect(wrong.scores[1].score).toBe(-5)
    expect(wrong.orders[2]).toBe('apple')
    expect(model.hit(event(1801, { playerId: 2 })).scores[1].score).toBe(-5)
    const third = model.hit(event(3600))
    expect(third.orders[1]).toBe('apple')
    expect(third.collected[1]).toBe(3)
    expect(third.scores[0].score).toBe(30)
  })

  it('debounces picks per player even when different groceries overlap', () => {
    const model = new SupermarketRushModel({ playerCount: 2, countdownMs: 0, spawnIntervalMs: 100 })
    model.start(0)
    model.hit(event())
    expect(model.hit(event(100)).scores[0].score).toBe(10)
    expect(model.hit(event(100, { playerId: 2 })).scores[1].score).toBe(10)
    const state = model.update(300)
    const bread = state.items.find((item) => item.playerId === 1 && item.kind === 'bread')!
    expect(model.hit(event(300, { x: bread.x })).scores[0].score).toBe(20)
  })

  it('moves and expires groceries without penalties and is independent of update cadence', () => {
    const slow = new SupermarketRushModel({ countdownMs: 0 })
    const fast = new SupermarketRushModel({ countdownMs: 0 })
    slow.start(0); fast.start(0)
    expect(slow.update(2700).items[0].x).toBeCloseTo(.5)
    expect(slow.update(5400).items.some((item) => item.id === 1)).toBe(false)
    for (let time = 100; time <= 10000; time += 100) fast.update(time)
    expect(slow.update(10000)).toEqual(fast.update(10000))
    expect(slow.update(60000).scores[0].score).toBe(0)
  })

  it('uses capture-time positions for delayed hits without rewinding the clock', () => {
    const model = new SupermarketRushModel({ countdownMs: 0 })
    model.start(0)
    const currentX = model.update(1100).items[0].x
    expect(model.hit(event(1000, { x: currentX - .095 })).scores[0].score).toBe(0)
    const hit = model.hit(event(1000, { x: .88 - 1000 / 5400 * .76 + .095 }))
    expect(hit.scores[0].score).toBe(10)
    expect(hit.roundRemainingMs).toBe(58900)
  })

  it('rejects malformed input before advancing the simulation', () => {
    const model = new SupermarketRushModel({ countdownMs: 0 })
    const initial = model.start(0)
    const invalid: Partial<MotionInputEvent>[] = [{ kind: 'MOTION_BRUSH' }, { confidence: .1 }, { confidence: NaN }, { confidence: 2 }, { x: NaN }, { x: -1 }, { y: Infinity }, { y: 1.1 }, { playerId: 4 }, { playerId: 1.5 as 1 }, { timestamp: NaN }, { timestamp: -1 }]
    for (const overrides of invalid) expect(model.hit(event(60000, overrides))).toEqual(initial)
    expect(model.hit(event()).scores[0].score).toBe(10)
  })

  it('freezes the clock, belt, order and pick cooldown during pauses', () => {
    const model = new SupermarketRushModel({ countdownMs: 0, spawnIntervalMs: 100 })
    model.start(0)
    model.hit(event())
    const paused = model.pause(100)
    expect(model.update(10000)).toEqual(paused)
    expect(model.hit(event(10000))).toEqual(paused)
    const resumed = model.resume(11000)
    expect(resumed.items).toEqual(paused.items.map((item) => ({ ...item, spawnedAt: item.spawnedAt + 10900 })))
    expect(resumed.roundRemainingMs).toBe(paused.roundRemainingMs)
    expect(model.hit(event(11000)).scores[0].score).toBe(10)
    expect(model.hit(event(11200)).scores[0].score).toBe(20)
  })

  it('rejects pre-countdown and pre-resume events, finishes, and resets on replay', () => {
    const model = new SupermarketRushModel({ roundDurationMs: 1000 })
    expect(model.start(0).items).toEqual([])
    model.pause(1000)
    expect(model.resume(6000).countdownRemainingMs).toBe(2000)
    model.update(8000)
    expect(model.hit(event(7999)).scores[0].score).toBe(0)
    expect(model.hit(event(8000)).scores[0].score).toBe(10)
    model.pause(8000)
    model.resume(10000)
    expect(model.hit(event(9999)).scores[0].score).toBe(10)
    expect(model.update(11000).phase).toBe('results')
    expect(model.update(12000).items).toEqual([])
    expect(model.hit(event(12000)).scores[0].score).toBe(10)
    expect(model.start(13000)).toMatchObject({ collected: { 1: 0 }, orders: { 1: 'apple' }, scores: [{ playerId: 1, score: 0 }] })
  })

  it('bounds items and returns detached snapshots', () => {
    const model = new SupermarketRushModel({ countdownMs: 0, spawnIntervalMs: 100, travelMs: 10000 })
    const initial = model.start(0)
    initial.items[0].kind = 'milk'; initial.collected[1] = 99; initial.orders[1] = 'milk'
    expect(model.update(0)).toMatchObject({ items: [{ kind: 'apple' }], collected: { 1: 0 }, orders: { 1: 'apple' } })
    expect(model.update(30000).items.length).toBeLessThanOrEqual(4)
  })

  it('rejects invalid conveyor timings', () => {
    expect(() => new SupermarketRushModel({ spawnIntervalMs: 0 })).toThrow()
    expect(() => new SupermarketRushModel({ travelMs: Infinity })).toThrow()
  })

  it('keeps detached per-player pick feedback through pauses, without changing it on ignored input', () => {
    const model = new SupermarketRushModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    const picked = model.hit(event())
    expect(picked.lastPicks).toEqual({ 1: { kind: 'apple', requested: 'apple', correct: true }, 2: null, 3: null, 4: null })
    picked.lastPicks[1]!.correct = false
    expect(model.hit(event(100)).lastPicks[1]?.correct).toBe(true)
    const wrong = model.hit(event(1800, { playerId: 2 }))
    expect(wrong.lastPicks[2]).toEqual({ kind: 'bread', requested: 'apple', correct: false })
    expect(model.pause(2000).lastPicks).toEqual(wrong.lastPicks)
    expect(model.hit(event(3000)).lastPicks).toEqual(wrong.lastPicks)
    expect(model.resume(4000).lastPicks).toEqual(wrong.lastPicks)
    model.update(62000)
    expect(model.start(63000).lastPicks).toEqual({ 1: null, 2: null, 3: null, 4: null })
  })
})
