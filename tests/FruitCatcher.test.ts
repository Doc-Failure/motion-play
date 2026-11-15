import { describe, expect, it } from 'vitest'
import { FruitCatcherModel } from '../src/minigames/fruit-catcher/FruitCatcherModel'

const hand = (playerId: 1 | 2, x: number, y: number, timestamp: number, kind: 'HAND_POSITION' | 'MOTION_HIT' = 'HAND_POSITION', confidence = 1) => ({ playerId, kind, x, y, timestamp, confidence } as const)

describe('Fruit Catcher model', () => {
  it('catches fresh fruit with hand position and penalizes rotten fruit', () => {
    const model = new FruitCatcherModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    model.setState([{ id: 1, playerId: 1, kind: 'apple', x: .4, y: .6, spawnedAt: 1, fallsForMs: 10_000 }])
    expect(model.moveHand(hand(1, .4, .6, 1)).scores[0].score).toBe(10)
    model.setState([{ id: 2, playerId: 1, kind: 'rotten', x: .6, y: .6, spawnedAt: 2, fallsForMs: 10_000 }])
    expect(model.moveHand(hand(1, .6, .6, 2)).scores[0].score).toBe(0)
  })

  it('requires confident hand input and preserves player isolation', () => {
    const model = new FruitCatcherModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    model.setState([{ id: 1, playerId: 2, kind: 'orange', x: .5, y: .5, spawnedAt: 1, fallsForMs: 10_000 }])
    expect(model.moveHand(hand(1, .5, .5, 1)).scores.map((score) => score.score)).toEqual([0, 0])
    expect(model.moveHand(hand(2, .5, .5, 2, 'MOTION_HIT')).scores[1].score).toBe(0)
    expect(model.moveHand(hand(2, .5, .5, 3, 'HAND_POSITION', .2)).scores[1].score).toBe(0)
    expect(model.moveHand(hand(2, .5, .5, 4)).scores[1].score).toBe(10)
  })

  it('spawns deterministically and clears fruit at results', () => {
    const model = new FruitCatcherModel({ countdownMs: 0, roundDurationMs: 100, random: () => .5 })
    expect(model.start(0).fruit).toHaveLength(1)
    expect(model.update(100).phase).toBe('results')
    expect(model.update(100).fruit).toHaveLength(0)
  })
})
