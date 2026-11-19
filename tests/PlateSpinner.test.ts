import { describe, expect, it } from 'vitest'
import { PlateSpinnerModel, plateTargets } from '../src/minigames/plate-spinner/PlateSpinnerModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'

const event = (timestamp: number, overrides: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'MOTION_HIT', x: .2, y: .4, confidence: 1, timestamp, ...overrides })

describe('Plate Spinner normalized input model', () => {
  it.each([1, 2, 3, 4] as const)('maps mirrored synthetic motion to an isolated rescue for %i players', (playerCount) => {
    const model = new PlateSpinnerModel({ playerCount })
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const zones = defaultCameraZones(playerCount), zone = zones[playerCount - 1]
    const width = 320, height = 180, data = new Uint8ClampedArray(width * height * 4)
    model.start(0)
    processor.process({ width, height, data }, zones, 5190)
    const cx = Math.floor((1 - zone.x - zone.width * .2) * width), cy = Math.floor((zone.y + zone.height * .4) * height)
    for (let y = cy - 5; y < cy + 5; y++) for (let x = cx - 5; x < cx + 5; x++) data.fill(255, (y * width + x) * 4, (y * width + x + 1) * 4)
    const result = processor.process({ width, height, data }, zones, 5200)
    expect(result.events).toHaveLength(1)
    const state = model.hit(result.events[0])
    expect(state.scores.map(({ score }) => score)).toEqual([...Array(playerCount - 1).fill(0), 10])
    expect(state.plates.filter((plate) => plate.playerId === playerCount)[0].spin).toBe(1)
    expect(processor.process({ width, height, data }, zones, 5600).events).toEqual([])
  })

  it('requires wobble, rescues once, isolates plates and permits delayed captures after a render', () => {
    const model = new PlateSpinnerModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    expect(model.hit(event(1799)).scores[0].score).toBe(0)
    expect(model.hit(event(1800)).scores[0].score).toBe(10)
    expect(model.hit(event(1800)).scores[0].score).toBe(10)
    expect(model.hit(event(4200)).scores[0].score).toBe(20)
    const state = model.update(4300)
    expect(state.plates[1].expiresAt).toBe(7000)
    expect(state.scores[1].score).toBe(0)
    expect(model.hit(event(4250, { playerId: 2 })).scores[1].score).toBe(10)
    expect(model.hit(event(4200, { playerId: 2 })).scores[1].score).toBe(10)
  })

  it('drops at exact boundaries, rejects late rescues and replaces plates after 1500ms', () => {
    const model = new PlateSpinnerModel({ countdownMs: 0 })
    model.start(0)
    const dropped = model.hit(event(6000))
    expect(dropped.scores[0].score).toBe(-5)
    expect(dropped.drops).toEqual([1])
    expect(dropped.plates[0].dropped).toBe(true)
    expect(model.hit(event(7499)).plates[0].dropped).toBe(true)
    expect(model.update(7500).plates[0]).toMatchObject({ dropped: false, spin: 1 })
    expect(model.hit(event(5999)).scores[0].score).toBe(-10) // second plate has also dropped by now
    expect(model.hit(event(9600)).feedback[0]).toContain('rescued')
  })

  it('is independent of render cadence, including skipped replacements and round end', () => {
    const slow = new PlateSpinnerModel({ countdownMs: 0 }), fast = new PlateSpinnerModel({ countdownMs: 0 })
    slow.start(0); fast.start(0)
    for (let time = 100; time <= 60000; time += 100) fast.update(time)
    expect(slow.update(60000)).toEqual(fast.update(60000))
    expect(slow.update(90000)).toEqual(fast.update(90000))
  })

  it('freezes decay, replacement and countdown across pause, and rejects captures before resume', () => {
    const model = new PlateSpinnerModel()
    model.start(0); model.pause(1000)
    expect(model.resume(6000).countdownRemainingMs).toBe(2000)
    expect(model.hit(event(7999)).scores[0].score).toBe(0)
    model.update(10000)
    const paused = model.pause(10000)
    expect(model.update(20000)).toEqual(paused)
    expect(model.hit(event(20000))).toEqual(paused)
    model.resume(20000)
    expect(model.hit(event(19999)).scores[0].score).toBe(0)
    expect(model.hit(event(20100)).scores[0].score).toBe(10)
    model.update(26000); model.pause(26100)
    const replacedAt = model.update(26100).plates[0].readyAt
    model.resume(36100)
    expect(model.update(36100).plates[0].readyAt).toBe(replacedAt + 10000)
  })

  it('rejects invalid input without advancing time and ignores misses', () => {
    const model = new PlateSpinnerModel({ countdownMs: 0 })
    const state = model.start(0)
    for (const overrides of [{kind: 'HAND_POSITION' as const}, {confidence: NaN}, {confidence: .1}, {confidence: 2}, {x: -1}, {x: NaN}, {y: Infinity}, {y: 1.1}, {playerId: 4 as const}, {playerId: 1.5 as 1}, {timestamp: NaN}, {timestamp: -1}]) expect(model.hit(event(60000, overrides))).toEqual(state)
    expect(model.hit(event(0, { x: .5, y: .9 }))).toEqual(state)
  })

  it.each([0, .0001])('supports a %s ms round without extra decay', (roundDurationMs) => {
    const model = new PlateSpinnerModel({ countdownMs: 0, roundDurationMs })
    model.start(0)
    expect(model.update(10)).toMatchObject({ phase: 'results', drops: [0], scores: [{ playerId: 1, score: 0 }] })
  })

  it('does not score boundary drops or input at round end and resets detached snapshots on replay', () => {
    const model = new PlateSpinnerModel({ countdownMs: 0, roundDurationMs: 6000 })
    const initial = model.start(0)
    initial.plates[0].expiresAt = 0; initial.drops[0] = 99; initial.feedback[0] = 'changed'; initial.scores[0].score = 99
    const result = model.hit(event(6000))
    expect(result.phase).toBe('results')
    expect(result.scores[0].score).toBe(0)
    expect(result.drops).toEqual([0])
    expect(model.pause(7000).phase).toBe('results')
    expect(model.start(8000)).toMatchObject({ phase: 'playing', drops: [0], scores: [{ playerId: 1, score: 0 }] })
    expect(plateTargets).toHaveLength(3)
  })
})
