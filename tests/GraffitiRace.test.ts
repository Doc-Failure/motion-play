import { describe, expect, it } from 'vitest'
import { MURAL_PATCHES, GraffitiRaceModel } from '../src/minigames/graffiti-race/GraffitiRaceModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'

const event = (timestamp = 0, overrides: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'MOTION_BRUSH', x: .5, y: .5, confidence: 1, timestamp, ...overrides })

describe('Graffiti Race model', () => {
  it('shows only recent accepted brush positions, isolated by player and detached from snapshots', () => {
    const model = new GraffitiRaceModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    const state = model.brush(event(100, { x: .25, y: .4, playerId: 2 }))
    expect(state.brushes).toEqual({ 1: null, 2: { x: .25, y: .4 }, 3: null, 4: null })
    state.brushes[2]!.x = 1
    expect(model.brush(event(110, { confidence: 0, playerId: 2 })).brushes[2]).toEqual({ x: .25, y: .4 })
    expect(model.update(449).brushes[2]).not.toBeNull()
    expect(model.update(450).brushes[2]).toBeNull()
    model.brush(event(500))
    expect(model.pause(501).brushes[1]).toBeNull()
    expect(model.resume(502).brushes[1]).toBeNull()
    model.update(61000)
    expect(model.start(62000).brushes[1]).toBeNull()
  })

  it('accumulates only fresh mural patches and ignores repeat traces', () => {
    const model = new GraffitiRaceModel({ countdownMs: 0 })
    model.start(0)
    const first = model.brush(event())
    expect(first.scores[0].score).toBeGreaterThan(0)
    expect(model.brush(event()).scores).toEqual(first.scores)
    const next = model.brush(event(1, MURAL_PATCHES[0]))
    expect(next.scores[0].score).toBeGreaterThan(first.scores[0].score)
    expect(next.scores[0].score).toBe(next.revealed[1].length)
  })

  it.each([1, 2, 3, 4] as const)('ends the race when one of %i players reveals all patches, then resets', (playerCount) => {
    const model = new GraffitiRaceModel({ playerCount, countdownMs: 0 })
    model.start(0)
    for (const patch of MURAL_PATCHES) model.brush(event(10, { ...patch, playerId: playerCount }))
    const state = model.update(10)
    expect(state.phase).toBe('results')
    expect(state.progress[playerCount]).toBe(100)
    expect(state.scores.map(({ score }) => score)).toEqual(Array.from({ length: playerCount }, (_, index) => index === playerCount - 1 ? MURAL_PATCHES.length : 0))
    expect(model.brush(event(11)).scores).toEqual(state.scores)
    expect(model.start(100)).toMatchObject({ revealed: { 1: [], 2: [], 3: [], 4: [] }, progress: { 1: 0, 2: 0, 3: 0, 4: 0 } })
  })

  it.each([1, 2, 3, 4] as const)('maps mirrored synthetic motion to isolated brush contributions for %i players', (playerCount) => {
    const model = new GraffitiRaceModel({ playerCount, countdownMs: 0 })
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const zones = defaultCameraZones(playerCount), zone = zones[playerCount - 1]
    const width = 160, height = 90, data = new Uint8ClampedArray(width * height * 4)
    model.start(0)
    processor.process({ width, height, data }, zones, 0)
    const centerX = Math.floor((1 - (zone.x + zone.width * .5)) * width)
    const centerY = Math.floor((zone.y + zone.height * .5) * height)
    for (let y = centerY - 2; y < centerY + 2; y++) for (let x = centerX - 2; x < centerX + 2; x++) data.fill(255, (y * width + x) * 4, (y * width + x + 1) * 4)
    const positions = processor.process({ width, height, data }, zones, 10).positions!
    expect(positions).toHaveLength(1)
    const state = model.brush({ ...positions[0], kind: 'MOTION_BRUSH' })
    expect(state.scores[playerCount - 1].score).toBeGreaterThan(0)
    expect(state.scores.slice(0, -1).every(({ score }) => score === 0)).toBe(true)
    expect(processor.process({ width, height, data }, zones, 20).positions).toEqual([])
  })

  it('rejects malformed events before advancing time', () => {
    const model = new GraffitiRaceModel({ countdownMs: 0 })
    const initial = model.start(0)
    const invalid: Partial<MotionInputEvent>[] = [{ kind: 'MOTION_HIT' }, { confidence: .1 }, { confidence: NaN }, { confidence: 2 }, { x: NaN }, { x: -1 }, { y: Infinity }, { y: 1.1 }, { playerId: 4 }, { playerId: 1.5 as 1 }, { timestamp: NaN }, { timestamp: -1 }]
    for (const overrides of invalid) expect(model.brush(event(60000, overrides))).toEqual(initial)
  })

  it('freezes progress and clock during pause and rejects old captures after resume', () => {
    const model = new GraffitiRaceModel()
    model.start(0)
    model.pause(1000)
    expect(model.resume(5000).countdownRemainingMs).toBe(2000)
    expect(model.brush(event(6999)).progress[1]).toBe(0)
    const revealed = model.brush(event(7000))
    expect(revealed.progress[1]).toBeGreaterThan(0)
    const paused = model.pause(8000)
    expect(model.brush(event(20000, MURAL_PATCHES[0]))).toEqual(paused)
    expect(model.update(21000)).toEqual(paused)
    expect(model.resume(22000).roundRemainingMs).toBe(59000)
    expect(model.brush(event(21999, MURAL_PATCHES[0])).scores).toEqual(revealed.scores)
    expect(model.brush(event(22000, MURAL_PATCHES[0])).scores[0].score).toBeGreaterThan(revealed.scores[0].score)
  })

  it('never rewinds the clock and rejects input at and after round expiry', () => {
    const model = new GraffitiRaceModel({ countdownMs: 0, roundDurationMs: 1000 })
    model.start(0)
    model.update(500)
    expect(model.brush(event(100)).progress[1]).toBe(0)
    const delayed = model.brush(event(475))
    expect(delayed.roundRemainingMs).toBe(500)
    expect(delayed.progress[1]).toBeGreaterThan(0)
    const expired = model.brush(event(1000, MURAL_PATCHES[0]))
    expect(expired.phase).toBe('results')
    expect(expired.scores).toEqual(delayed.scores)
    expect(model.brush(event(900, MURAL_PATCHES[0])).scores).toEqual(delayed.scores)
  })

  it('returns detached snapshots and is independent of update cadence', () => {
    const slow = new GraffitiRaceModel({ countdownMs: 0 }), fast = new GraffitiRaceModel({ countdownMs: 0 })
    slow.start(0); fast.start(0)
    for (let time = 10; time < 100; time += 10) fast.update(time)
    expect(slow.brush(event(100))).toEqual(fast.brush(event(100)))
    const state = slow.update(100)
    state.revealed[1].push(999); state.progress[1] = 999; state.scores[0].score = 999
    expect(slow.update(100)).toEqual(fast.update(100))
  })
})
