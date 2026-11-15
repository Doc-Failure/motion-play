import { describe, expect, it } from 'vitest'
import { FishFrenzyModel, fishKinds } from '../src/minigames/fish-frenzy/FishFrenzyModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'

const event = (timestamp: number, overrides: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'HAND_POSITION', x: .12, y: .5, confidence: 1, timestamp, ...overrides })

describe('Fish Frenzy normalized position model', () => {
  it.each([1, 2, 3, 4] as const)('catches only the owning fish from mirrored synthetic motion for %i players', (playerCount) => {
    const model = new FishFrenzyModel({ playerCount, countdownMs: 0, random: () => .4 })
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const zones = defaultCameraZones(playerCount), zone = zones[playerCount - 1]
    const width = 320, height = 180, data = new Uint8ClampedArray(width * height * 4)
    const fish = model.start(0).fish[playerCount - 1]
    processor.process({ width, height, data }, zones, 0)
    const cx = Math.floor((1 - zone.x - zone.width * fish.x) * width), cy = Math.floor((zone.y + zone.height * fish.y) * height)
    for (let y = cy - 4; y < cy + 4; y++) for (let x = cx - 4; x < cx + 4; x++) data.fill(255, (y * width + x) * 4, (y * width + x + 1) * 4)
    const positions = processor.process({ width, height, data }, zones, 10).positions!
    expect(positions).toHaveLength(1)
    const state = model.moveHand({ ...positions[0], kind: 'HAND_POSITION' })
    expect(state.scores.map(({ score }) => score)).toEqual([...Array(playerCount - 1).fill(0), 5])
    expect(state.caught[playerCount - 1]).toBe(1)
    expect(processor.process({ width, height, data }, zones, 400).positions).toEqual([])
    expect(model.update(400).nets).toEqual([])
  })

  it.each([['minnow', .2], ['silver', .7], ['golden', .95]] as const)('awards the labelled %s value once', (kind, roll) => {
    let draw = 0
    const model = new FishFrenzyModel({ countdownMs: 0, random: () => draw++ % 3 === 0 ? roll : .5 })
    const fish = model.start(0).fish[0]
    expect(fish.kind).toBe(kind)
    const caught = model.moveHand(event(0, { x: fish.x, y: fish.y }))
    expect(caught.scores[0].score).toBe(fishKinds[kind].value)
    expect(caught.caught).toEqual([1])
    expect(model.moveHand(event(0))).toEqual(caught)
    expect(model.update(100).scores).toEqual(caught.scores)
  })

  it('counts exact expiry once, costs no points, and never catches using a cached net', () => {
    const model = new FishFrenzyModel({ countdownMs: 0, random: () => .4 })
    model.start(0)
    model.moveHand(event(0, { x: .5 }))
    expect(model.update(2500).caught).toEqual([0])
    expect(model.update(4999).missed).toEqual([0])
    expect(model.moveHand(event(5000, { x: .88 })).missed).toEqual([1])
    expect(model.update(5001).missed).toEqual([1])
    expect(model.update(5001).scores[0].score).toBe(0)
  })

  it('has deterministic fish paths and missed counts regardless of render cadence', () => {
    const slow = new FishFrenzyModel({ random: () => .4 }), fast = new FishFrenzyModel({ random: () => .4 })
    slow.start(0); fast.start(0)
    for (let time = 100; time <= 15000; time += 100) fast.update(time)
    expect(slow.update(15000)).toEqual(fast.update(15000))
    for (let time = 15100; time <= 63000; time += 100) fast.update(time)
    expect(slow.update(63000)).toEqual(fast.update(63000))
    expect(slow.update(90000).fish).toEqual([])
  })

  it('rejects malformed events without advancing the clock, and rejects stale, duplicate and pre-spawn captures', () => {
    const model = new FishFrenzyModel({ countdownMs: 0, random: () => .4 })
    const initial = model.start(0)
    for (const override of [{kind: 'MOTION_HIT' as const}, {confidence: NaN}, {confidence: .1}, {confidence: 2}, {x: -1}, {x: NaN}, {y: Infinity}, {y: 1.1}, {playerId: 4 as const}, {playerId: 1.5 as 1}, {timestamp: NaN}, {timestamp: -1}]) expect(model.moveHand(event(60000, override))).toEqual(initial)
    model.update(1100)
    expect(model.moveHand(event(0)).caught).toEqual([0])
    // A capture just before the new fish spawned cannot catch that fish.
    expect(model.moveHand(event(1099)).caught).toEqual([0])
    expect(model.moveHand(event(1100)).caught).toEqual([1])
    expect(model.moveHand(event(1100)).caught).toEqual([1])
    model.update(2250)
    expect(model.moveHand(event(2200)).caught).toEqual([2]) // tolerates camera-to-render delay
    expect(model.moveHand(event(2199)).caught).toEqual([2])
  })

  it('freezes swimming and countdown across pause and requires fresh input after resume', () => {
    const model = new FishFrenzyModel({ random: () => .4 })
    model.start(0); model.pause(1000)
    expect(model.resume(6000).countdownRemainingMs).toBe(2000)
    expect(model.moveHand(event(7999)).caught).toEqual([0])
    const paused = model.pause(9000)
    expect(model.update(19000)).toEqual(paused)
    expect(model.moveHand(event(19000))).toEqual(paused)
    const resumed = model.resume(19000)
    expect(resumed.fish[0].x).toBe(paused.fish[0].x)
    expect(model.moveHand(event(18999)).caught).toEqual([0])
    expect(model.moveHand(event(19001, { x: resumed.fish[0].x })).caught).toEqual([1])
  })

  it.each([0, .001, 5000])('handles a %s ms round, detached snapshots, results and replay', (roundDurationMs) => {
    const model = new FishFrenzyModel({ countdownMs: 0, roundDurationMs, random: () => .4 })
    const state = model.start(0)
    if (state.fish[0]) state.fish[0].y = 0
    state.caught[0] = 99; state.missed[0] = 99; state.scores[0].score = 99
    const result = model.moveHand(event(roundDurationMs))
    expect(result).toMatchObject({ phase: 'results', caught: [0], fish: [], scores: [{playerId: 1, score: 0}] })
    expect(model.pause(6000).phase).toBe('results')
    expect(model.start(7000)).toMatchObject({ caught: [0], missed: [0], scores: [{playerId: 1, score: 0}] })
  })
})
