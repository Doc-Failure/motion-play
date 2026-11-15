import { describe, expect, it } from 'vitest'
import { BalloonPanicModel } from '../src/minigames/balloon-panic/BalloonPanicModel'

const event = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1) => ({ playerId, kind: 'MOTION_HIT' as const, x, y, confidence: 1, timestamp })

describe('BalloonPanicModel', () => {
  it('spawns a deterministic target-color balloon and expires it', () => {
    const model = new BalloonPanicModel({ countdownMs: 0, visibleMs: 500, random: () => 0 })
    expect(model.start(0).balloons[0]).toMatchObject({ color: 'red', x: .14, y: .18 })
    expect(model.update(500).balloons).toHaveLength(0)
  })
  it('rewards the called color and penalizes a wrong color once', () => {
    const model = new BalloonPanicModel({ countdownMs: 0, spawnIntervalMs: 10_000, random: () => 0 })
    model.start(0)
    model.setState([{ id: 1, playerId: 1, x: .2, y: .2, color: 'red', appearedAt: 0, expiresAt: 2_000 }], 'red')
    expect(model.hit(event(.2, .2, 10)).scores[0].score).toBe(10)
    model.setState([{ id: 2, playerId: 1, x: .8, y: .8, color: 'blue', appearedAt: 0, expiresAt: 2_000 }], 'yellow')
    expect(model.hit(event(.8, .8, 20)).scores[0].score).toBe(5)
    expect(model.hit(event(.8, .8, 30)).scores[0].score).toBe(5)
  })
  it('isolates players and rejects low-confidence or wrong-kind input', () => {
    const model = new BalloonPanicModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    model.setState([{ id: 1, playerId: 2, x: .5, y: .5, color: 'red', appearedAt: 0, expiresAt: 2_000 }], 'red')
    expect(model.hit(event(.5, .5, 10)).scores.map(({ score }) => score)).toEqual([0, 0])
    expect(model.hit({ ...event(.5, .5, 20, 2), confidence: .1 }).scores.map(({ score }) => score)).toEqual([0, 0])
    expect(model.hit({ ...event(.5, .5, 30, 2), kind: 'MOTION_BRUSH' }).scores.map(({ score }) => score)).toEqual([0, 0])
    expect(model.hit(event(.5, .5, 40, 2)).scores.map(({ score }) => score)).toEqual([0, 10])
  })
})
