import { describe, expect, it } from 'vitest'
import { BubbleBattleModel } from '../src/minigames/bubble-battle/BubbleBattleModel'

const hit = (x: number, y: number, timestamp: number, confidence = 1) => ({
  playerId: 1 as const,
  kind: 'MOTION_HIT' as const,
  x,
  y,
  confidence,
  timestamp,
})

describe('BubbleBattleModel', () => {
  it('runs countdown, spawns targets, and ends on the shared session clock', () => {
    const model = new BubbleBattleModel({ countdownMs: 3_000, roundDurationMs: 10_000, random: () => 0.5 })
    expect(model.start(0).phase).toBe('countdown')
    expect(model.update(2_999).targets).toHaveLength(0)
    const playing = model.update(3_000)
    expect(playing.phase).toBe('playing')
    expect(playing.targets).toHaveLength(1)
    expect(model.update(13_000)).toMatchObject({ phase: 'results', roundRemainingMs: 0, targets: [] })
  })

  it('awards bubbles, penalizes bombs, and consumes each target only once', () => {
    const model = new BubbleBattleModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    model.setTargets([
      { id: 1, kind: 'bubble', x: 0.25, y: 0.3, radius: 0.1 },
      { id: 2, kind: 'bomb', x: 0.75, y: 0.7, radius: 0.1 },
    ])
    expect(model.handleInput(hit(0.25, 0.3, 10)).scores[0].score).toBe(10)
    expect(model.handleInput(hit(0.25, 0.3, 20)).scores[0].score).toBe(10)
    const bomb = model.handleInput(hit(0.75, 0.7, 30))
    expect(bomb.scores[0].score).toBe(-5)
    expect(bomb.targets).toHaveLength(0)
    expect(bomb.lastResult).toBe('bomb')
  })

  it('ignores misses, low-confidence events, other players, and hits outside play', () => {
    const model = new BubbleBattleModel({ countdownMs: 100, roundDurationMs: 100 })
    model.start(0)
    model.setTargets([{ id: 1, kind: 'bubble', x: 0.5, y: 0.5, radius: 0.1 }])
    expect(model.handleInput(hit(0.5, 0.5, 50)).scores[0].score).toBe(0)
    model.update(100)
    expect(model.handleInput(hit(0.5, 0.5, 110, 0.1)).scores[0].score).toBe(0)
    expect(model.handleInput({ ...hit(0.5, 0.5, 120), playerId: 2 }).scores[0].score).toBe(0)
    expect(model.handleInput(hit(0.1, 0.1, 130)).scores[0].score).toBe(0)
  })

  it('uses deterministic synthetic randomness for bubble and bomb creation', () => {
    const values = [0.1, 0.5, 0.5, 0.8, 0.5, 0.5]
    const model = new BubbleBattleModel({ countdownMs: 0, spawnIntervalMs: 100, random: () => values.shift() ?? 0.5 })
    model.start(0)
    const targets = model.update(100).targets
    expect(targets.map((target) => target.kind)).toEqual(['bomb', 'bubble'])
    expect(targets.every((target) => target.x >= target.radius && target.x <= 1 - target.radius)).toBe(true)
  })

  it('accepts an asynchronously delivered hit after the render clock advances', () => {
    const model = new BubbleBattleModel({ countdownMs: 0 })
    model.start(100)
    model.setTargets([{ id: 1, kind: 'bubble', x: 0.5, y: 0.5, radius: 0.1 }])
    model.update(200)
    expect(model.handleInput(hit(0.5, 0.5, 190)).scores[0].score).toBe(10)
  })
})
