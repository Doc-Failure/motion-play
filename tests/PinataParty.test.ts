import { describe, expect, it } from 'vitest'
import { PinataPartyModel } from '../src/minigames/pinata-party/PinataPartyModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

const hit = (timestamp: number, playerId: 1 | 2 | 3 | 4 = 1): MotionInputEvent => ({ playerId, kind: 'MOTION_HIT', x: .5, y: .45, confidence: 1, timestamp })

describe('Piñata Party model', () => {
  it('needs three separated hits, awards candy once, then respawns', () => {
    const model = new PinataPartyModel({ countdownMs: 0 })
    model.start(0)
    expect(model.hit(hit(0)).pinatas[0].hits).toBe(1)
    expect(model.hit(hit(349)).pinatas[0].hits).toBe(1)
    expect(model.hit(hit(350)).pinatas[0].hits).toBe(2)
    const broken = model.hit(hit(700))
    expect(broken.teamCandy).toBe(10)
    expect(broken.pinatas[0]).toMatchObject({ hits: 3, readyAt: 1600 })
    expect(model.hit(hit(1050)).teamCandy).toBe(10)
    expect(model.update(1599).pinatas[0].hits).toBe(3)
    expect(model.update(1600).pinatas[0]).toMatchObject({ hits: 0, readyAt: null })
    expect(model.hit(hit(1600)).pinatas[0].hits).toBe(1)
    // Snapshots cannot mutate live state.
    broken.pinatas[0].hits = 99
    expect(model.update(1601).pinatas[0].hits).toBe(1)
  })

  it('isolates all four targets and cooldowns while combining contributions', () => {
    const model = new PinataPartyModel({ playerCount: 4, countdownMs: 0 })
    expect(model.start(0).teamGoal).toBe(200)
    for (const time of [0, 350, 700]) for (const playerId of [1, 2, 3, 4] as const) model.hit(hit(time, playerId))
    const state = model.update(701)
    expect(state.scores.map((entry) => entry.score)).toEqual([10, 10, 10, 10])
    expect(state.teamCandy).toBe(40)
  })

  it.each([1, 2, 3, 4] as const)('builds %i independent player targets and a scaled shared goal', (playerCount) => {
    const model = new PinataPartyModel({ playerCount, countdownMs: 0 })
    const state = model.start(0)
    expect(state.pinatas).toHaveLength(playerCount)
    expect(state.teamGoal).toBe(playerCount * 50)
    expect(model.hit(hit(0, 1)).pinatas.map((target) => target.hits)).toEqual([1, ...Array(playerCount - 1).fill(0)])
  })

  it('rejects wrong kinds, misses, unknown players and malformed normalized input', () => {
    const model = new PinataPartyModel({ countdownMs: 0 })
    model.start(0)
    const invalid: Partial<MotionInputEvent>[] = [{ kind: 'MOTION_BRUSH' }, { playerId: 4 }, { x: .1 }, { y: .9 }, { confidence: .19 }, { confidence: NaN }, { confidence: Infinity }, { confidence: 2 }, { x: NaN }, { y: Infinity }, { x: -.1 }, { y: 1.1 }, { timestamp: NaN }, { timestamp: Infinity }, { timestamp: -1 }]
    for (const patch of invalid) expect(model.hit({ ...hit(0), ...patch }).pinatas[0].hits).toBe(0)
  })

  it('gates countdown and results and resets candy and targets for replay', () => {
    const model = new PinataPartyModel({ countdownMs: 100, roundDurationMs: 1000 })
    model.start(0)
    expect(model.hit(hit(99)).pinatas[0].hits).toBe(0)
    for (const time of [100, 450, 800]) model.hit(hit(time))
    expect(model.update(1100)).toMatchObject({ phase: 'results', teamCandy: 10 })
    expect(model.hit(hit(1200)).teamCandy).toBe(10)
    expect(model.start(1300)).toMatchObject({ phase: 'countdown', teamCandy: 0 })
    expect(model.hit(hit(800)).pinatas[0].hits).toBe(0)
  })

  it('freezes countdown, round clock, cooldown and respawn through a pause', () => {
    const model = new PinataPartyModel({ countdownMs: 100, roundDurationMs: 5000 })
    model.start(0)
    expect(model.pause(50).countdownRemainingMs).toBe(50)
    expect(model.update(1000).phase).toBe('paused')
    expect(model.resume(1050).countdownRemainingMs).toBe(50)
    model.update(1100)
    expect(model.hit(hit(1070)).pinatas[0].hits).toBe(0)
    for (const time of [1100, 1450, 1800]) model.hit(hit(time))
    expect(model.pause(1900).roundRemainingMs).toBe(4200)
    expect(model.hit(hit(4000)).teamCandy).toBe(10)
    expect(model.resume(4900)).toMatchObject({ phase: 'playing', roundRemainingMs: 4200 })
    expect(model.update(5699).pinatas[0].hits).toBe(3)
    expect(model.update(5700).pinatas[0].hits).toBe(0)
    expect(model.hit(hit(2000)).pinatas[0].hits).toBe(0)
    expect(model.hit(hit(5700)).pinatas[0].hits).toBe(1)
  })

  it('accepts input delivered after a render tick without counting duplicate batches', () => {
    const model = new PinataPartyModel({ countdownMs: 0 })
    model.start(0)
    model.update(16)
    expect(model.hit(hit(10)).pinatas[0].hits).toBe(1)
    model.update(400)
    expect(model.hit(hit(10)).pinatas[0].hits).toBe(1)
    expect(model.hit(hit(360)).pinatas[0].hits).toBe(2)
  })

  it('reaches a cooperative goal without cutting the shared round short', () => {
    const model = new PinataPartyModel({ countdownMs: 0 })
    model.start(0)
    for (let pinata = 0; pinata < 5; pinata += 1) for (const offset of [0, 350, 700]) model.hit(hit(pinata * 1600 + offset))
    expect(model.update(7100)).toMatchObject({ phase: 'playing', teamCandy: 50, teamGoal: 50 })
  })
})
