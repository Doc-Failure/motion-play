import { describe, expect, it } from 'vitest'
import { WindowWipeModel } from '../src/minigames/window-wipe/WindowWipeModel'

const brush = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1) => ({ playerId, kind: 'MOTION_BRUSH' as const, x, y, confidence: 1, timestamp })

describe('WindowWipeModel', () => {
  it('handles repeated pauses and a pause arriving at round end', () => {
    const model = new WindowWipeModel({ countdownMs: 0, roundDurationMs: 1000 })
    model.start(0)
    const paused = model.pause(100)
    expect(model.pause(200)).toEqual(paused)
    model.resume(300)
    expect(model.pause(1200).phase).toBe('results')
  })

  it('accumulates a brush trace and awards only newly cleaned cells', () => {
    const model = new WindowWipeModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    const first = model.brush(brush(.05, .08, 10))
    expect(first.progress[1]).toBeGreaterThan(0)
    const score = first.scores[0].score
    expect(model.brush(brush(.05, .08, 20)).scores[0].score).toBe(score)
    expect(model.brush({ ...brush(.5, .5, 30), kind: 'MOTION_HIT' }).scores[0].score).toBe(score)
  })

  it('keeps two-player cleaning and scores isolated', () => {
    const model = new WindowWipeModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    const playerTwo = model.brush(brush(.5, .5, 10, 2))
    expect(playerTwo.progress[1]).toBe(0)
    expect(playerTwo.progress[2]).toBeGreaterThan(0)
    expect(playerTwo.scores[0].score).toBe(0)
    expect(playerTwo.scores[1].score).toBeGreaterThan(0)
  })

  it('rejects low-confidence and out-of-round brush input', () => {
    const model = new WindowWipeModel({ countdownMs: 100 })
    model.start(0)
    expect(model.brush(brush(.5, .5, 50)).progress[1]).toBe(0)
    model.update(100)
    expect(model.brush({ ...brush(.5, .5, 110), confidence: .1 }).progress[1]).toBe(0)
  })

  it('preserves progress while paused', () => {
    const model = new WindowWipeModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    const cleaned = model.brush(brush(.5, .5, 100)).progress[1]
    expect(model.pause(1_000).phase).toBe('paused')
    expect(model.update(5_000).progress[1]).toBe(cleaned)
    expect(model.resume(6_000)).toMatchObject({ phase: 'playing', roundRemainingMs: 9_000 })
  })
})
