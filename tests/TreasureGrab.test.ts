import { describe, expect, it } from 'vitest'
import { TreasureGrabModel } from '../src/minigames/treasure-grab/TreasureGrabModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'

const event = (timestamp = 0, overrides: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'MOTION_HIT', x: .25, y: .5, confidence: 1, timestamp, ...overrides })

describe('Treasure Grab', () => {
  it('keeps rewards and curses apart for the complete default round, including sequence wraps', () => {
    const model = new TreasureGrabModel({ countdownMs: 0 })
    model.start(0)
    for (let time = 0; time < 60000; time += 100) {
      const { items } = model.update(time)
      for (const [index, item] of items.entries()) {
        for (const other of items.slice(index + 1)) {
          // Button bounds and elliptical motion-hit regions must stay separate.
          expect(Math.abs(item.x - other.x) >= .2 || Math.abs(item.y - other.y) >= .26).toBe(true)
        }
      }
    }
  })

  it.each([1, 2, 3, 4] as const)('maps mirrored synthetic motion to isolated catches for %i players', (playerCount) => {
    const model = new TreasureGrabModel({ playerCount })
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const zones = defaultCameraZones(playerCount)
    const zone = zones[playerCount - 1]
    const width = 160, height = 90
    const data = new Uint8ClampedArray(width * height * 4)
    model.start(0)
    processor.process({ width, height, data }, zones, 2990)
    const centerX = Math.floor((1 - (zone.x + zone.width * .25)) * width)
    for (let y = 42; y < 48; y += 1) {
      for (let x = centerX - 2; x < centerX + 2; x += 1) data.fill(255, (y * width + x) * 4, (y * width + x + 1) * 4)
    }
    const result = processor.process({ width, height, data }, zones, 3000)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ kind: 'MOTION_HIT', playerId: playerCount })
    const hit = model.hit(result.events[0])
    expect(hit.scores.map(({ score }) => score)).toEqual([...Array(playerCount - 1).fill(0), 10])
    expect(hit.collected[playerCount]).toBe(1)
    expect(hit.items).toHaveLength(playerCount * 2 - 1)
    expect(processor.process({ width, height, data }, zones, 3300).events).toEqual([])
  })

  it('awards each treasure once, isolates players, and ignores misses', () => {
    const model = new TreasureGrabModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    expect(model.hit(event(0, { x: .9 })).collected[1]).toBe(0)
    expect(model.hit(event()).scores.map(({ score }) => score)).toEqual([10, 0])
    expect(model.hit(event()).scores[0].score).toBe(10)
    expect(model.hit(event(0, { playerId: 2 })).scores.map(({ score }) => score)).toEqual([10, 10])
    expect(model.hit(event(1800, { x: .72, y: .3 })).collected[1]).toBe(2)
  })

  it('penalizes curses once, keeps penalties local and allows negative scores', () => {
    const model = new TreasureGrabModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    const curse = event(0, { x: .75, y: .75 })
    expect(model.hit(curse)).toMatchObject({ scores: [{ score: -10 }, { score: 0 }], collected: { 1: 0 }, feedback: { 1: 'Cursed object! −10 points. Look for the gold chest.', 2: '' } })
    expect(model.hit(curse).scores[0].score).toBe(-10)
    expect(model.hit(event(299)).scores[0].score).toBe(-10)
    const recovered = model.hit(event(300))
    expect(recovered.scores[0].score).toBe(0)
    expect(recovered.collected[1]).toBe(1)
    expect(recovered.feedback[1]).toBe('Treasure found! +10 points.')
    expect(model.hit(event(300, { playerId: 2 })).scores[1].score).toBe(10)
  })

  it('debounces successful hits separately for each player', () => {
    const model = new TreasureGrabModel({ playerCount: 2, countdownMs: 0, spawnIntervalMs: 100 })
    model.start(0)
    model.hit(event())
    expect(model.hit(event(100, { x: .72, y: .3 })).scores[0].score).toBe(10)
    expect(model.hit(event(100, { playerId: 2 })).scores[1].score).toBe(10)
    expect(model.hit(event(300, { x: .72, y: .3 })).scores[0].score).toBe(20)
  })

  it('shows lifetime, expires at the exact deadline, and never resurrects expired objects', () => {
    const model = new TreasureGrabModel({ countdownMs: 0 })
    model.start(0)
    expect(model.update(1800).items[0].remaining).toBe(.4)
    expect(model.hit(event(2999)).scores[0].score).toBe(10)
    const missed = new TreasureGrabModel({ countdownMs: 0 })
    missed.start(0)
    expect(missed.hit(event(3000)).scores[0].score).toBe(0)
    expect(missed.update(3000).items.some(({ id }) => id === 1)).toBe(false)
    expect(missed.hit(event(2900)).scores[0].score).toBe(0)
  })

  it('accepts delayed captures only after birth without rewinding time', () => {
    const model = new TreasureGrabModel({ countdownMs: 0 })
    model.start(0)
    model.update(1900)
    expect(model.hit(event(1799, { x: .72, y: .3 })).collected[1]).toBe(0)
    const hit = model.hit(event(1800, { x: .72, y: .3 }))
    expect(hit.scores[0].score).toBe(10)
    expect(hit.roundRemainingMs).toBe(58100)
  })

  it('is deterministic regardless of rendering cadence and keeps targets bounded', () => {
    const slow = new TreasureGrabModel({ countdownMs: 0 })
    const fast = new TreasureGrabModel({ countdownMs: 0 })
    slow.start(0); fast.start(0)
    for (let time = 100; time <= 10000; time += 100) fast.update(time)
    expect(slow.update(10000)).toEqual(fast.update(10000))
    const crowded = new TreasureGrabModel({ playerCount: 4, countdownMs: 0, spawnIntervalMs: 100, lifetimeMs: 10000 })
    crowded.start(0)
    expect(crowded.update(30000).items.length).toBeLessThanOrEqual(32)
    expect(slow.update(60000).scores[0].score).toBe(0)
  })

  it('caps crowded boards after a single object is removed and expires curses without penalty', () => {
    const model = new TreasureGrabModel({ countdownMs: 0, spawnIntervalMs: 100, lifetimeMs: 10000 })
    model.start(0)
    model.update(300)
    expect(model.hit(event(300)).items).toHaveLength(7)
    expect(model.update(400).items).toHaveLength(7)
    const untouched = new TreasureGrabModel({ countdownMs: 0 })
    untouched.start(0)
    expect(untouched.hit(event(3000, { x: .75, y: .75 })).scores[0].score).toBe(0)
    expect(untouched.update(3000).items.some(({ id }) => id === 2)).toBe(false)
  })

  it('rejects malformed input before advancing the simulation', () => {
    const model = new TreasureGrabModel({ countdownMs: 0 })
    const initial = model.start(0)
    const invalid: Partial<MotionInputEvent>[] = [{ kind: 'MOTION_BRUSH' }, { confidence: .1 }, { confidence: NaN }, { confidence: 2 }, { x: NaN }, { x: -1 }, { y: Infinity }, { y: 1.1 }, { playerId: 4 }, { playerId: 1.5 as 1 }, { timestamp: NaN }, { timestamp: -1 }]
    for (const overrides of invalid) expect(model.hit(event(60000, overrides))).toEqual(initial)
    expect(model.hit(event()).scores[0].score).toBe(10)
  })

  it('freezes lifetimes, spawns, clock and cooldown while paused', () => {
    const model = new TreasureGrabModel({ countdownMs: 0, spawnIntervalMs: 100 })
    model.start(0)
    model.hit(event())
    const paused = model.pause(100)
    expect(model.update(10000)).toEqual(paused)
    expect(model.hit(event(10000))).toEqual(paused)
    const resumed = model.resume(11000)
    expect(resumed.items).toEqual(paused.items.map((item) => ({ ...item, spawnedAt: item.spawnedAt + 10900 })))
    expect(resumed.roundRemainingMs).toBe(paused.roundRemainingMs)
    expect(model.hit(event(11000, { x: .72, y: .3 })).scores[0].score).toBe(10)
    expect(model.hit(event(11200, { x: .72, y: .3 })).scores[0].score).toBe(20)
  })

  it('rejects pre-countdown and pre-resume input, finishes and resets on replay', () => {
    const model = new TreasureGrabModel({ roundDurationMs: 1000 })
    expect(model.start(0).items).toEqual([])
    model.pause(1000)
    expect(model.resume(6000).countdownRemainingMs).toBe(2000)
    model.update(8000)
    expect(model.hit(event(7999)).scores[0].score).toBe(0)
    model.pause(8000)
    model.resume(10000)
    expect(model.hit(event(9999)).scores[0].score).toBe(0)
    expect(model.hit(event(10000)).scores[0].score).toBe(10)
    expect(model.update(11000)).toMatchObject({ phase: 'results', items: [] })
    expect(model.hit(event(18000)).scores[0].score).toBe(10)
    expect(model.start(19000)).toMatchObject({ collected: { 1: 0 }, scores: [{ playerId: 1, score: 0 }] })
  })

  it('returns detached snapshots and rejects invalid timings', () => {
    const model = new TreasureGrabModel({ countdownMs: 0 })
    const initial = model.start(0)
    initial.items[0].x = 99; initial.collected[1] = 99; initial.scores[0].score = 99; initial.feedback[1] = 'changed'
    expect(model.update(0)).toMatchObject({ items: [expect.objectContaining({ x: .25 }), expect.objectContaining({ kind: 'curse' })], collected: { 1: 0 }, feedback: { 1: '' }, scores: [{ score: 0 }] })
    expect(() => new TreasureGrabModel({ spawnIntervalMs: 0 })).toThrow()
    expect(() => new TreasureGrabModel({ lifetimeMs: Infinity })).toThrow()
  })
})
