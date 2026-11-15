import { describe, expect, it } from 'vitest'
import { TowerBuilderModel } from '../src/minigames/tower-builder/TowerBuilderModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
import { MotionProcessor } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'
import { isGameVisible, getGameBySlug } from '../src/app/catalog'

const event = (timestamp: number, overrides: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'HAND_POSITION', x: .5, y: .82, confidence: 1, timestamp, ...overrides })
function hold(model: TowerBuilderModel, start: number, overrides: Partial<MotionInputEvent> = {}) {
  let state = model.moveHand(event(start, overrides))
  for (let time = start + 100; time <= start + 800; time += 100) state = model.moveHand(event(time, overrides))
  return state
}

describe('Tower Builder generic stable positions', () => {
  it.each([1, 2, 3, 4] as const)('isolates %i lanes and sums cooperative contributions', playerCount => {
    const model = new TowerBuilderModel({ playerCount, countdownMs: 0 })
    model.start(0)
    const state = hold(model, 0, { playerId: playerCount })
    expect(state.scores.map(s => s.score)).toEqual([...Array(playerCount - 1).fill(0), 10])
    expect(state.teamScore).toBe(10)
    expect(state.lanes.map(lane => lane.blocks.length)).toEqual([...Array(playerCount - 1).fill(0), 1])
    if (playerCount > 1) expect(hold(model, 900).teamScore).toBe(20)
  })

  it('requires continuous stable fresh samples; rendering and jitter never score', () => {
    const model = new TowerBuilderModel({ countdownMs: 0 }); model.start(0)
    model.moveHand(event(0)); expect(model.update(800).teamScore).toBe(0)
    expect(model.moveHand(event(800)).lanes[0].progress).toBe(0)
    for (let time = 900; time <= 2500; time += 100) model.moveHand(event(time, { x: time % 200 ? .45 : .55 }))
    expect(model.update(2500).teamScore).toBe(0)
    expect(hold(model, 2600).teamScore).toBe(10)
    expect(model.update(10000).teamScore).toBe(10)
    expect(model.update(10000).lanes[0].hand).toBeNull()
  })

  it.each([1, 2, 3, 4] as const)('accepts mirrored synthetic camera positions only for player %i', playerCount => {
    const model = new TowerBuilderModel({ playerCount, countdownMs: 0 }); model.start(0)
    const zones = defaultCameraZones(playerCount), zone = zones[playerCount - 1]
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const width = 320, height = 180, data = new Uint8ClampedArray(width * height * 4)
    processor.process({ width, height, data }, zones, 0)
    const cx = Math.floor((1 - zone.x - zone.width * .5) * width), cy = Math.floor(.82 * height)
    // Alternating a patch produces fresh synthetic motion, never real hand tracking.
    for (let timestamp = 100; timestamp <= 900; timestamp += 100) {
      const radiusX = Math.floor(zone.width * width * .14)
      for (let y = cy - 20; y < cy + 20; y++) for (let x = cx - radiusX; x < cx + radiusX; x++) {
        data.fill(timestamp % 200 ? 255 : 0, (y * width + x) * 4, (y * width + x + 1) * 4)
      }
      const positions = processor.process({ width, height, data }, zones, timestamp).positions!
      expect(positions).toHaveLength(1)
      model.moveHand({ ...positions[0], kind: 'HAND_POSITION' })
    }
    expect(model.update(900).scores.map(score => score.score)).toEqual([...Array(playerCount - 1).fill(0), 10])
  })

  it('does not bridge an explicit simulation release or depend on render cadence', () => {
    const slow = new TowerBuilderModel({ countdownMs: 0 }), fast = new TowerBuilderModel({ countdownMs: 0 })
    slow.start(0); fast.start(0)
    for (let time = 0; time <= 800; time += 100) {
      for (let frame = Math.max(0, time - 90); frame < time; frame += 10) fast.update(frame)
      slow.moveHand(event(time)); fast.moveHand(event(time))
    }
    expect(slow.update(800)).toEqual(fast.update(800))
    const model = new TowerBuilderModel({ countdownMs: 0 }); model.start(0)
    model.moveHand(event(0)); model.moveHand(event(200)); model.releaseHand(1)
    expect(model.moveHand(event(210)).lanes[0].progress).toBe(0)
  })

  it('completes six-block towers with a bonus and resets the target', () => {
    const model = new TowerBuilderModel({ countdownMs: 0 }); model.start(0)
    for (let index = 0; index < 6; index++) hold(model, index * 900, { y: .82 - index * .09 })
    expect(model.update(5400)).toMatchObject({ teamScore: 90, lanes: [{ placed: 6, completed: 1, blocks: [], target: { x: .5, y: .82 } }] })
  })

  it('topples only the off-balance lane without erasing earned team points', () => {
    const model = new TowerBuilderModel({ playerCount: 2, countdownMs: 0 }); model.start(0)
    hold(model, 0); hold(model, 900, { playerId: 2 })
    const state = hold(model, 1800, { x: .9, y: .73 })
    expect(state.teamScore).toBe(20)
    expect(state.lanes[0]).toMatchObject({ blocks: [], topples: 1, placed: 1 })
    expect(state.lanes[1].blocks).toHaveLength(1)
  })

  it('rejects wrong types, invalid owners, stale and duplicate samples without awarding or advancing', () => {
    const model = new TowerBuilderModel({ countdownMs: 0 }); const initial = model.start(0)
    for (const override of [{ kind: 'MOTION_HIT' as const }, { playerId: 4 as const }, { playerId: 1.5 as 1 }, { x: NaN }, { y: Infinity }, { x: -1 }, { y: 2 }, { confidence: .3 }, { confidence: 2 }, { timestamp: NaN }, { timestamp: -1 }]) {
      const invalid = new TowerBuilderModel({ countdownMs: 0 }); invalid.start(0)
      expect(invalid.moveHand(event(60000, override))).toEqual(initial)
    }
    model.moveHand(event(0)); model.moveHand(event(200));
    expect(model.moveHand(event(200, { x: .9 })).lanes[0].progress).toBe(.25)
    model.update(1000)
    expect(model.moveHand(event(300)).teamScore).toBe(0)
    expect(model.moveHand(event(1000)).lanes[0].progress).toBe(0)
  })

  it('breaks a hold on low confidence and on leaving the landing height', () => {
    const model = new TowerBuilderModel({ countdownMs: 0 }); model.start(0)
    model.moveHand(event(0)); model.moveHand(event(200)); model.moveHand(event(300, { confidence: 0 }))
    expect(model.moveHand(event(400)).lanes[0].progress).toBe(0)
    model.moveHand(event(500, { y: .1 }))
    expect(model.moveHand(event(600)).lanes[0].progress).toBe(0)
  })

  it('rejects reordered valid samples after newer tracking loss', () => {
    const model = new TowerBuilderModel({ countdownMs: 0 }); model.start(0)
    model.moveHand(event(0)); model.moveHand(event(200))
    model.moveHand(event(400, { confidence: 0 }))
    expect(model.moveHand(event(300)).lanes[0].hand).toBeNull()
    expect(model.moveHand(event(400)).lanes[0].hand).toBeNull()
    expect(model.moveHand(event(500)).lanes[0].progress).toBe(0)
    expect(model.moveHand(event(700)).lanes[0].progress).toBe(.25)
  })

  it.each([-.1, .1])('keeps blocks fully inside their lane when stacking toward an edge (%s)', step => {
    const model = new TowerBuilderModel({ countdownMs: 0 }); model.start(0)
    for (let index = 0; index < 3; index++) hold(model, index * 900, { x: .5 + step * (index + 1), y: .82 - index * .09 })
    const state = hold(model, 2700, { x: .5 + step * 4, y: .55 })
    expect(state.teamScore).toBe(30)
    expect(state.lanes[0]).toMatchObject({ blocks: [], topples: 1, target: { x: .5, y: .82 } })
  })

  it('freezes countdown and game clocks across pauses and discards interrupted holds', () => {
    const model = new TowerBuilderModel(); model.start(0); model.pause(1000)
    expect(model.resume(11000).countdownRemainingMs).toBe(2000)
    expect(model.moveHand(event(12999)).teamScore).toBe(0)
    model.moveHand(event(13000)); model.moveHand(event(13200))
    const paused = model.pause(13300)
    expect(model.update(23000)).toEqual(paused)
    expect(model.moveHand(event(23000))).toEqual(paused)
    expect(model.resume(23000).roundRemainingMs).toBe(paused.roundRemainingMs)
    expect(model.moveHand(event(22999)).lanes[0].progress).toBe(0)
    expect(model.moveHand(event(23001)).lanes[0].progress).toBe(0)
    expect(hold(model, 23100).teamScore).toBe(10)
  })

  it('ends at the round boundary, returns detached snapshots, and resets on replay', () => {
    const model = new TowerBuilderModel({ countdownMs: 0, roundDurationMs: 800 }); const initial = model.start(0)
    initial.lanes[0].target.x = 0; initial.lanes[0].blocks.push({ x: 0, y: 0 })
    expect(hold(model, 0)).toMatchObject({ phase: 'results', teamScore: 0, lanes: [{ blocks: [], target: { x: .5 } }] })
    expect(model.pause(900).phase).toBe('results')
    expect(model.start(1000)).toMatchObject({ phase: 'playing', teamScore: 0, lanes: [{ placed: 0, topples: 0 }] })
  })

  it('keeps Tower Builder outside the five-game public refinement set', () => {
    expect(getGameBySlug('tower-builder')?.input).toBe('HAND_POSITION')
    expect(isGameVisible('tower-builder')).toBe(false)
  })
})
