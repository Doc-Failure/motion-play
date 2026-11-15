import { describe, expect, it } from 'vitest'
import { MonsterDefenseModel } from '../src/minigames/monster-defense/MonsterDefenseModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
import { MotionProcessor } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'

const event = (timestamp = 0, overrides: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'MOTION_HIT', x: .12, y: .25, confidence: 1, timestamp, ...overrides })

describe('Monster Defense model', () => {
  it.each([1, 2, 3, 4] as const)('scores mirrored synthetic motion only for its owner with %i players', (playerCount) => {
    const model = new MonsterDefenseModel({ playerCount })
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const zones = defaultCameraZones(playerCount)
    const zone = zones[playerCount - 1]
    const width = 160, height = 90
    const data = new Uint8ClampedArray(width * height * 4)
    model.start(0)
    processor.process({ width, height, data }, zones, 2990)
    const centerX = Math.floor((1 - (zone.x + zone.width * .12)) * width)
    const centerY = Math.floor(.25 * height)
    for (let y = centerY - 3; y < centerY + 3; y += 1) {
      for (let x = centerX - 2; x < centerX + 2; x += 1) data.fill(255, (y * width + x) * 4, (y * width + x + 1) * 4)
    }
    const result = processor.process({ width, height, data }, zones, 3000)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ kind: 'MOTION_HIT', playerId: playerCount })
    const hit = model.hit(result.events[0])
    expect(hit.scores.map(({ score }) => score)).toEqual([...Array(playerCount - 1).fill(0), 10])
    expect(hit.monsters).toHaveLength(playerCount - 1)
    expect(processor.process({ width, height, data }, zones, 3300).events).toEqual([])
  })

  it('judges delayed input at capture time without rewinding the round', () => {
    const model = new MonsterDefenseModel({ countdownMs: 0 })
    model.start(0)
    model.update(1100)
    const captureX = .12 + 1000 / 5400 * .76
    const hit = model.hit(event(1000, { x: captureX - .095 }))
    expect(hit.teamScore).toBe(10)
    expect(hit.roundRemainingMs).toBe(58900)
  })

  it('does not turn a delayed miss into a hit as monsters approach', () => {
    const model = new MonsterDefenseModel({ countdownMs: 0 })
    model.start(0)
    const currentX = model.update(1100).monsters[0].x
    expect(model.hit(event(1000, { x: currentX + .095 })).teamScore).toBe(0)
  })

  it('ignores unknown players without advancing or ending the round', () => {
    const model = new MonsterDefenseModel({ countdownMs: 0 })
    const initial = model.start(0)
    expect(model.hit(event(60000, { playerId: 4 }))).toEqual(initial)
    expect(model.hit(event()).teamScore).toBe(10)
  })

  it.each([1, 2, 3, 4] as const)('provides deterministic, isolated targets for %i players', (playerCount) => {
    const model = new MonsterDefenseModel({ playerCount, countdownMs: 0 })
    expect(model.start(0).monsters).toHaveLength(playerCount)
    const hit = model.hit(event())
    expect(hit.scores.map(({ score }) => score)).toEqual([10, ...Array(playerCount - 1).fill(0)])
    expect(hit.teamScore).toBe(10)
    expect(hit.teamGoal).toBe(playerCount * 100)
    expect(model.hit(event()).teamScore).toBe(10)
  })

  it('moves toward the gate, charges each breach once, and agrees across update cadences', () => {
    const model = new MonsterDefenseModel({ countdownMs: 0 })
    model.start(0)
    expect(model.update(2700).monsters[0].x).toBeCloseTo(.5)
    expect(model.update(5400).breaches[1]).toBe(1)
    expect(model.update(5401).teamScore).toBe(-5)
    const other = new MonsterDefenseModel({ countdownMs: 0 })
    other.start(0)
    expect(other.update(5401)).toEqual(model.update(5401))
  })

  it('rejects invalid, wrong-kind, low-confidence, out-of-bounds and unknown-player input', () => {
    const model = new MonsterDefenseModel({ countdownMs: 0 })
    model.start(0)
    const invalid: Partial<MotionInputEvent>[] = [{ kind: 'MOTION_BRUSH' }, { confidence: .1 }, { confidence: NaN }, { confidence: 2 }, { x: NaN }, { x: -1 }, { y: Infinity }, { y: 1.1 }, { playerId: 4 }, { timestamp: NaN }, { timestamp: -1 }]
    for (const overrides of invalid) expect(model.hit(event(0, overrides)).teamScore).toBe(0)
    expect(model.hit(event()).teamScore).toBe(10)
  })

  it('rejects pre-countdown and pre-resume batches even after render ticks advance', () => {
    const model = new MonsterDefenseModel()
    expect(model.start(0).monsters).toHaveLength(0)
    model.update(3000)
    expect(model.hit(event(2999)).teamScore).toBe(0)
    model.pause(3000)
    model.update(9000)
    expect(model.hit(event(9000)).teamScore).toBe(0)
    model.resume(10000)
    model.update(10010)
    expect(model.hit(event(9999)).teamScore).toBe(0)
    expect(model.hit(event(10010)).teamScore).toBe(10)
  })

  it('freezes movement, waves, breaches and clock while paused', () => {
    const model = new MonsterDefenseModel({ countdownMs: 0 })
    model.start(0)
    const paused = model.pause(1000)
    expect(model.update(20000)).toEqual(paused)
    const resumed = model.resume(21000)
    expect(resumed.monsters[0].x).toBe(paused.monsters[0].x)
    expect(resumed.roundRemainingMs).toBe(paused.roundRemainingMs)
    expect(model.update(25400).breaches[1]).toBe(1)
  })

  it('pauses countdown, finishes without further awards and resets on replay', () => {
    const model = new MonsterDefenseModel({ countdownMs: 3000, roundDurationMs: 1000 })
    model.start(0)
    model.pause(1000)
    model.update(5000)
    expect(model.resume(6000).countdownRemainingMs).toBe(2000)
    expect(model.update(8000).monsters).toHaveLength(1)
    expect(model.hit(event(8000)).teamScore).toBe(10)
    const finished = model.update(9000)
    expect(finished.phase).toBe('results')
    expect(finished.monsters).toEqual([])
    expect(model.hit(event(9001)).teamScore).toBe(10)
    const replay = model.start(10000)
    expect(replay.teamScore).toBe(0)
    expect(replay.breaches[1]).toBe(0)
  })

  it('settles breaches consistently when a delayed tick crosses the round end', () => {
    const slow = new MonsterDefenseModel({ countdownMs: 0, roundDurationMs: 10000 })
    const fast = new MonsterDefenseModel({ countdownMs: 0, roundDurationMs: 10000 })
    slow.start(0)
    fast.start(0)
    for (let time = 100; time <= 10000; time += 100) fast.update(time)
    expect(slow.update(10000)).toEqual(fast.update(10000))
    expect(slow.update(11000).teamScore).toBe(-15)
  })

  it('returns detached snapshots and bounds on-screen targets after long gaps', () => {
    const model = new MonsterDefenseModel({ countdownMs: 0, spawnIntervalMs: 100, approachMs: 10000 })
    const snapshot = model.start(0)
    snapshot.monsters[0].x = 1
    snapshot.breaches[1] = 99
    expect(model.update(0).monsters[0].x).toBe(.12)
    expect(model.update(30000).monsters.length).toBeLessThanOrEqual(4)
    expect(model.update(30000).breaches[1]).not.toBe(99)
  })
})
