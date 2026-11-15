import { describe, expect, it } from 'vitest'
import { WhackAMoleModel } from '../src/minigames/whack-a-mole/WhackAMoleModel'

const hit = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1) => ({ playerId, kind: 'MOTION_HIT' as const, x, y, confidence: 1, timestamp })

describe('WhackAMoleModel', () => {
  it('freezes targets, spawn timing, scores and round time throughout a long pause', () => {
    const model = new WhackAMoleModel({ countdownMs: 0, visibleMs: 500, random: () => .5 })
    model.start(0)
    const paused = model.pause(100)
    expect(model.hit(hit(.5, .5, 5_000)).scores[0].score).toBe(0)
    expect(model.update(10_000).moles).toEqual(paused.moles)
    expect(model.update(10_000).roundRemainingMs).toBe(paused.roundRemainingMs)
    const resumed = model.resume(10_100)
    expect(resumed.moles[0]).toMatchObject({ appearedAt: 10_000, expiresAt: 10_500 })
    expect(model.update(10_499).moles).toHaveLength(1)
    expect(model.update(10_500).moles).toHaveLength(0)
    expect(model.update(10_850).moles).toHaveLength(1)
  })

  it('spawns deterministic timed moles and expires them', () => {
    const model = new WhackAMoleModel({ countdownMs: 0, visibleMs: 500, random: () => .5 })
    expect(model.start(0).moles[0]).toMatchObject({ playerId: 1, hole: 4 })
    expect(model.update(499).moles).toHaveLength(1)
    expect(model.update(500).moles).toHaveLength(0)
  })

  it('scores a matching hole once and ignores misses', () => {
    const model = new WhackAMoleModel({ countdownMs: 0, spawnIntervalMs: 10_000 })
    model.start(0)
    model.setMoles([{ id: 1, playerId: 1, hole: 0, appearedAt: 0, expiresAt: 2_000 }])
    expect(model.hit(hit(.1, .1, 10)).scores[0].score).toBe(10)
    expect(model.hit(hit(.1, .1, 20)).scores[0].score).toBe(10)
    expect(model.hit(hit(.9, .9, 30)).scores[0].score).toBe(10)
  })

  it('keeps two-player moles and scores isolated', () => {
    const model = new WhackAMoleModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    model.setMoles([{ id: 1, playerId: 2, hole: 4, appearedAt: 0, expiresAt: 2_000 }])
    expect(model.hit(hit(.5, .5, 10)).scores.map(({ score }) => score)).toEqual([0, 0])
    expect(model.hit(hit(.5, .5, 20, 2)).scores.map(({ score }) => score)).toEqual([0, 10])
  })

  it('rejects low-confidence, wrong-kind, and countdown input', () => {
    const model = new WhackAMoleModel({ countdownMs: 100 })
    model.start(0)
    model.setMoles([{ id: 1, playerId: 1, hole: 4, appearedAt: 0, expiresAt: 2_000 }])
    expect(model.hit(hit(.5, .5, 50)).scores[0].score).toBe(0)
    model.update(100)
    expect(model.hit({ ...hit(.5, .5, 110), confidence: .1 }).scores[0].score).toBe(0)
    expect(model.hit({ ...hit(.5, .5, 120), kind: 'MOTION_BRUSH' }).scores[0].score).toBe(0)
  })
})
