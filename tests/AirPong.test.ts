import { describe, expect, it } from 'vitest'
import { AirPongModel } from '../src/minigames/air-pong/AirPongModel'

const hand = (playerId: 1 | 2, y: number, timestamp: number, kind: 'HAND_POSITION' | 'MOTION_HIT' = 'HAND_POSITION', confidence = 1) => ({ playerId, kind, x: .1, y, timestamp, confidence } as const)

describe('Air Pong model', () => {
  it('moves a paddle with confident hand input and scores a return', () => {
    const model = new AirPongModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    expect(model.moveHand(hand(1, .72, 1)).paddles[0].y).toBe(.72)
    model.setBall({ playerId: 1, x: .11, y: .72, velocityX: -.00024, velocityY: 0 })
    const result = model.update(101)
    expect(result.scores[0].score).toBe(10)
    expect(result.rallies[0].returns).toBe(1)
    expect(result.balls[0].velocityX).toBeGreaterThan(0)
  })

  it('penalizes a miss and rejects wrong-kind or low-confidence input', () => {
    const model = new AirPongModel({ countdownMs: 0 })
    model.start(0)
    expect(model.moveHand(hand(1, .8, 1, 'MOTION_HIT')).paddles[0].y).toBe(.5)
    expect(model.moveHand(hand(1, .8, 2, 'HAND_POSITION', .2)).paddles[0].y).toBe(.5)
    model.setBall({ playerId: 1, x: .11, y: .05, velocityX: -.00024, velocityY: 0 })
    expect(model.update(102).scores[0].score).toBe(-5)
  })

  it('keeps paddles, balls, and scores isolated for each player', () => {
    const model = new AirPongModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    model.moveHand(hand(2, .75, 1))
    model.setBall({ playerId: 2, x: .11, y: .75, velocityX: -.00024, velocityY: 0 })
    const result = model.update(101)
    expect(result.scores.map(({ score }) => score)).toEqual([0, 10])
    expect(result.paddles.map(({ y }) => y)).toEqual([.5, .75])
  })
})
