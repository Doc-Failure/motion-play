import { describe, expect, it } from 'vitest'
import { GoldRushModel } from '../src/minigames/gold-rush/GoldRushModel'

const event = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1) => ({ playerId, kind: 'MOTION_HIT' as const, x, y, confidence: 1, timestamp })

describe('GoldRushModel', () => {
  it('spawns deterministic falling coins and removes them after the fall', () => {
    const model = new GoldRushModel({ countdownMs: 0, fallsForMs: 1_000, spawnIntervalMs: 10_000, random: () => 0 })
    expect(model.start(0).items[0]).toMatchObject({ kind: 'coin', x: .12, y: -.08 })
    expect(model.update(500).items[0].y).toBeCloseTo(.5)
    expect(model.update(1_000).items).toHaveLength(0)
  })

  it('rewards coins and penalizes hazards only once', () => {
    const model = new GoldRushModel({ countdownMs: 0, spawnIntervalMs: 10_000 })
    model.start(0)
    model.setState([{ id: 1, playerId: 1, kind: 'coin', x: .2, y: .2, spawnedAt: 0, fallsForMs: 10_000 }])
    expect(model.hit(event(.2, .201, 10)).scores[0].score).toBe(10)
    model.setState([{ id: 2, playerId: 1, kind: 'hazard', x: .8, y: .8, spawnedAt: 20, fallsForMs: 10_000 }])
    expect(model.hit(event(.8, .8, 20)).scores[0].score).toBe(0)
    expect(model.hit(event(.8, .8, 30)).scores[0].score).toBe(0)
  })

  it('isolates players and rejects low-confidence or wrong-kind input', () => {
    const model = new GoldRushModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    model.setState([{ id: 1, playerId: 2, kind: 'coin', x: .5, y: .5, spawnedAt: 0, fallsForMs: 10_000 }])
    expect(model.hit(event(.5, .5, 10)).scores.map(({ score }) => score)).toEqual([0, 0])
    expect(model.hit({ ...event(.5, .501, 10, 2), confidence: .1 }).scores.map(({ score }) => score)).toEqual([0, 0])
    expect(model.hit({ ...event(.5, .502, 20, 2), kind: 'MOTION_BRUSH' }).scores.map(({ score }) => score)).toEqual([0, 0])
    expect(model.hit(event(.5, .503, 30, 2)).scores.map(({ score }) => score)).toEqual([0, 10])
  })
})
