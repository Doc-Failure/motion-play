import { describe, expect, it } from 'vitest'
import { MeteorSmashModel } from '../src/minigames/meteor-smash/MeteorSmashModel'

const event = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1) => ({ playerId, kind: 'MOTION_HIT' as const, x, y, confidence: 1, timestamp })

describe('MeteorSmashModel', () => {
  it('spawns deterministic falling meteors and penalizes base impacts', () => {
    const model = new MeteorSmashModel({ countdownMs: 0, fallsForMs: 1_000, spawnIntervalMs: 10_000, random: () => 0 })
    expect(model.start(0).meteors[0]).toMatchObject({ x: .12, y: -.08 })
    expect(model.update(500).meteors[0].y).toBeCloseTo(.46)
    const impacted = model.update(1_000)
    expect(impacted.impacts[1]).toBe(1)
    expect(impacted.scores[0].score).toBe(-5)
  })

  it('scores a meteor once and rejects invalid input', () => {
    const model = new MeteorSmashModel({ countdownMs: 0, spawnIntervalMs: 10_000 })
    model.start(0)
    model.setMeteors([{ id: 7, playerId: 1, x: .4, y: .4, spawnedAt: 0, fallsForMs: 10_000 }])
    expect(model.hit({ ...event(.4, .4, 10), confidence: .1 }).scores[0].score).toBe(0)
    expect(model.hit({ ...event(.4, .4, 20), kind: 'MOTION_BRUSH' }).scores[0].score).toBe(0)
    expect(model.hit(event(.4, .402, 30)).scores[0].score).toBe(10)
    expect(model.hit(event(.4, .402, 40)).scores[0].score).toBe(10)
  })

  it('isolates every player board and score', () => {
    const model = new MeteorSmashModel({ playerCount: 4, countdownMs: 0, spawnIntervalMs: 10_000 })
    model.start(0)
    model.setMeteors([{ id: 1, playerId: 2, x: .5, y: .5, spawnedAt: 0, fallsForMs: 10_000 }])
    expect(model.hit(event(.5, .5, 10)).scores.map(({ score }) => score)).toEqual([0, 0, 0, 0])
    expect(model.hit(event(.5, .501, 20, 2)).scores.map(({ score }) => score)).toEqual([0, 10, 0, 0])
  })
})
