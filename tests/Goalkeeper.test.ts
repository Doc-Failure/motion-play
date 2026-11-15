import { describe, expect, it } from 'vitest'
import { GoalkeeperModel } from '../src/minigames/goalkeeper/GoalkeeperModel'

const body = (playerId: 1 | 2, x: number, y: number, timestamp: number, kind: 'BODY_MOVE' | 'MOTION_HIT' = 'BODY_MOVE', confidence = 1) => ({ playerId, kind, x, y, timestamp, confidence } as const)

describe('Goalkeeper model', () => {
  it('moves the keeper with confident pose input and scores a save', () => {
    const model = new GoalkeeperModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    expect(model.moveBody(body(1, .7, .78, 1)).keepers[0]).toMatchObject({ x: .7, y: .78 })
    model.setShot({ playerId: 1, x: .7, y: .76, velocityY: .00022 })
    const result = model.update(101)
    expect(result.scores[0].score).toBe(10)
    expect(result.saves[0].count).toBe(1)
  })

  it('penalizes a goal and rejects wrong-kind or low-confidence input', () => {
    const model = new GoalkeeperModel({ countdownMs: 0 })
    model.start(0)
    expect(model.moveBody(body(1, .8, .7, 1, 'MOTION_HIT')).keepers[0].x).toBe(.5)
    expect(model.moveBody(body(1, .8, .7, 2, 'BODY_MOVE', .2)).keepers[0].x).toBe(.5)
    model.setShot({ playerId: 1, x: .1, y: .76, velocityY: .00022 })
    expect(model.update(102).scores[0].score).toBe(-5)
  })

  it('keeps poses, shots, saves, and scores isolated per player', () => {
    const model = new GoalkeeperModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    model.moveBody(body(2, .75, .78, 1))
    model.setShot({ playerId: 2, x: .75, y: .76, velocityY: .00022 })
    const result = model.update(101)
    expect(result.scores.map(({ score }) => score)).toEqual([0, 10])
    expect(result.keepers.map(({ x }) => x)).toEqual([.5, .75])
    expect(result.saves.map(({ count }) => count)).toEqual([0, 1])
  })
})
