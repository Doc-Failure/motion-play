import { describe, expect, it } from 'vitest'
import { PaintSplashModel } from '../src/minigames/paint-splash/PaintSplashModel'

const brush = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1) => ({ playerId, kind: 'MOTION_BRUSH' as const, x, y, confidence: 1, timestamp })

describe('PaintSplashModel', () => {
  it('accumulates coverage and scores only newly painted canvas patches', () => {
    const model = new PaintSplashModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    const first = model.brush(brush(.5, .5, 1))
    expect(first.coverage[1]).toBeGreaterThan(0)
    expect(first.scores[0].score).toBeGreaterThan(0)
    expect(model.brush(brush(.5, .5, 2)).scores[0].score).toBe(first.scores[0].score)
  })

  it('keeps player canvases and scores isolated', () => {
    const model = new PaintSplashModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    const snapshot = model.brush(brush(.25, .25, 1, 2))
    expect(snapshot.coverage[1]).toBe(0)
    expect(snapshot.coverage[2]).toBeGreaterThan(0)
    expect(snapshot.scores.map(({ score }) => score)).toEqual([0, snapshot.painted[2].length])
  })

  it('rejects wrong input kinds, low confidence, and painting outside active play', () => {
    const model = new PaintSplashModel({ countdownMs: 100 })
    model.start(0)
    expect(model.brush(brush(.5, .5, 20)).coverage[1]).toBe(0)
    model.update(100)
    expect(model.brush({ ...brush(.5, .5, 101), kind: 'MOTION_HIT' }).coverage[1]).toBe(0)
    expect(model.brush({ ...brush(.5, .5, 102), confidence: .1 }).coverage[1]).toBe(0)
  })

  it('resets painted canvas and scores for replay', () => {
    const model = new PaintSplashModel({ countdownMs: 0, roundDurationMs: 5 })
    model.start(0)
    model.brush(brush(.5, .5, 1))
    model.update(5)
    const replay = model.start(10)
    expect(replay.coverage[1]).toBe(0)
    expect(replay.painted[1]).toEqual([])
    expect(replay.scores[0].score).toBe(0)
  })
})
