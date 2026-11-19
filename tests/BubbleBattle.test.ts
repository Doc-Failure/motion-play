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
      { id: 1, playerId: 1, kind: 'bubble', x: 0.25, y: 0.3, radius: 0.1 },
      { id: 2, playerId: 1, kind: 'bomb', x: 0.75, y: 0.7, radius: 0.1 },
    ])
    expect(model.handleInput(hit(0.25, 0.3, 10)).scores[0].score).toBe(10)
    expect(model.handleInput(hit(0.25, 0.3, 20)).scores[0].score).toBe(10)
    const bomb = model.handleInput(hit(0.75, 0.7, 30))
    expect(bomb.scores[0].score).toBe(-5)
    expect(bomb.targets).toHaveLength(0)
    expect(bomb.lastResults[1]).toBe('bomb')
  })

  it('ignores misses, low-confidence events, other players, and hits outside play', () => {
    const model = new BubbleBattleModel({ countdownMs: 100, roundDurationMs: 100 })
    model.start(0)
    model.setTargets([{ id: 1, playerId: 1, kind: 'bubble', x: 0.5, y: 0.5, radius: 0.1 }])
    expect(model.handleInput(hit(0.5, 0.5, 50)).scores[0].score).toBe(0)
    model.update(100)
    expect(model.handleInput(hit(0.5, 0.5, 110, 0.1)).scores[0].score).toBe(0)
    expect(model.handleInput({ ...hit(0.5, 0.5, 120), playerId: 2 }).scores[0].score).toBe(0)
    expect(model.handleInput(hit(0.1, 0.1, 130)).scores[0].score).toBe(0)
  })

  it('uses deterministic synthetic randomness for bubble and bomb creation', () => {
    const values = [0.5, 0.5, 0.01, 0.8]
    const model = new BubbleBattleModel({ countdownMs: 0, spawnIntervalMs: 100, random: () => values.shift() ?? 0.5 })
    model.start(0)
    const targets = model.update(100).targets
    expect(targets.map((target) => target.kind)).toEqual(['bubble', 'bomb'])
    expect(targets.every((target) => target.x >= target.radius && target.x <= 1 - target.radius)).toBe(true)
  })

  it('accepts an asynchronously delivered hit after the render clock advances', () => {
    const model = new BubbleBattleModel({ countdownMs: 0 })
    model.start(100)
    model.setTargets([{ id: 1, playerId: 1, kind: 'bubble', x: 0.5, y: 0.5, radius: 0.1 }])
    model.update(200)
    expect(model.handleInput(hit(0.5, 0.5, 190)).scores[0].score).toBe(10)
  })

  it('keeps two-player targets, scores, penalties, and feedback isolated', () => {
    const model = new BubbleBattleModel({ playerCount: 2, countdownMs: 0, roundDurationMs: 100 })
    model.start(0)
    model.setTargets([
      { id: 1, playerId: 1, kind: 'bubble', x: 0.5, y: 0.5, radius: 0.1 },
      { id: 2, playerId: 2, kind: 'bomb', x: 0.5, y: 0.5, radius: 0.1 },
    ])
    expect(model.handleInput(hit(0.5, 0.5, 10)).scores.map(({ score }) => score)).toEqual([10, 0])
    const playerTwo = model.handleInput({ ...hit(0.5, 0.5, 20), playerId: 2 as const })
    expect(playerTwo.scores.map(({ score }) => score)).toEqual([10, -15])
    expect(playerTwo.lastResults).toMatchObject({ 1: 'bubble', 2: 'bomb' })
    expect(playerTwo.targets).toHaveLength(0)
  })

  it('spawns an independent target in each viewport and resets both scores for replay', () => {
    const model = new BubbleBattleModel({ playerCount: 2, countdownMs: 0, roundDurationMs: 50, random: () => 0.5 })
    const start = model.start(0)
    expect(start.targets.map(({ playerId }) => playerId)).toEqual([1, 2])
    model.setTargets([{ id: 3, playerId: 2, kind: 'bubble', x: 0.5, y: 0.5, radius: 0.1 }])
    expect(model.handleInput({ ...hit(0.5, 0.5, 10), playerId: 2 as const }).scores.map(({ score }) => score)).toEqual([0, 10])
    expect(model.update(50).phase).toBe('results')
    expect(model.start(100).scores.map(({ score }) => score)).toEqual([0, 0])
  })

  it('keeps all four player targets and scores independent', () => {
    const model = new BubbleBattleModel({ playerCount: 4, countdownMs: 0, roundDurationMs: 100, random: () => 0.5 })
    expect(model.start(0).targets.map(({ playerId }) => playerId)).toEqual([1, 2, 3, 4])
    model.setTargets([1, 2, 3, 4].map((playerId) => ({ id: playerId, playerId: playerId as 1 | 2 | 3 | 4, kind: 'bubble' as const, x: 0.5, y: 0.5, radius: 0.1 })))
    const playerFour = model.handleInput({ ...hit(0.5, 0.5, 10), playerId: 4 as const })
    expect(playerFour.scores.map(({ score }) => score)).toEqual([0, 0, 0, 10])
    expect(playerFour.targets.map(({ playerId }) => playerId)).toEqual([1, 2, 3])
  })

  it('gives each lane one fresh wave after a long render gap', () => {
    const model = new BubbleBattleModel({ playerCount: 4, countdownMs: 0, roundDurationMs: 60_000, spawnIntervalMs: 100, random: () => 0.5 })
    model.start(0)
    const resumed = model.update(30_000)
    expect(resumed.targets).toHaveLength(4)
    expect(new Set(resumed.targets.map(t => t.playerId)).size).toBe(4)
  })

  it('preserves round time, scores, and targets across pause and resume', () => {
    const model = new BubbleBattleModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    model.setTargets([{ id: 1, playerId: 1, kind: 'bubble', x: 0.5, y: 0.5, radius: 0.1 }])
    const bubble = model.update(1_000).targets[0]
    expect(model.handleInput(hit(bubble.x, bubble.y, 1_000)).scores[0].score).toBe(10)
    const paused = model.pause(2_000)
    expect(paused).toMatchObject({ phase: 'paused', roundRemainingMs: 8_000 })
    expect(model.update(7_000).roundRemainingMs).toBe(8_000)
    const resumed = model.resume(8_000)
    expect(resumed).toMatchObject({ phase: 'playing', roundRemainingMs: 8_000 })
    expect(resumed.scores[0].score).toBe(10)
  })
})

it('matches circular target hit bounds in a tall camera lane', () => {
  const model = new BubbleBattleModel({countdownMs:0,aspectRatio:1/3})
  model.start(0)
  model.setTargets([{id:1,playerId:1,kind:'bubble',x:.5,y:.5,radius:.1}])
  const outside = model.handleInput({playerId:1,kind:'MOTION_HIT',x:.5,y:.56,confidence:1,timestamp:1})
  expect(outside.scores[0].score).toBe(0)
  const inside = model.handleInput({playerId:1,kind:'MOTION_HIT',x:.5,y:.52,confidence:1,timestamp:2})
  expect(inside.scores[0].score).toBe(10)
})

it('rejects hits captured before resume and resets that boundary for replay', () => {
  const model = new BubbleBattleModel({ countdownMs: 0, roundDurationMs: 10_000 })
  model.start(0)
  model.update(1000)
  model.setTargets([{ id: 99, playerId: 1, kind: 'bubble', x: .5, y: .5, radius: .1 }])
  const paused = model.pause(1000)
  expect(model.handleInput(hit(.5, .5, 5000))).toEqual(paused)
  const resumed = model.resume(20000)
  for (const timestamp of [900, 1000, 5000, 19999]) {
    expect(model.handleInput(hit(.5, .5, timestamp))).toEqual(resumed)
  }
  expect(model.handleInput(hit(.5, .5, 20001)).scores[0].score).toBe(10)
  model.update(30000)
  model.start(30001)
  model.setTargets([{ id: 100, playerId: 1, kind: 'bubble', x: .5, y: .5, radius: .1 }])
  expect(model.handleInput(hit(.5, .5, 20001)).scores[0].score).toBe(0)
  expect(model.handleInput(hit(.5, .5, 30002)).scores[0].score).toBe(10)
})

it('handles a pause at the round deadline without throwing', () => {
  const model = new BubbleBattleModel({ countdownMs: 0, roundDurationMs: 1000 })
  model.start(0)
  expect(model.pause(1000).phase).toBe('results')
  expect(model.pause(2000).phase).toBe('results')
  expect(model.resume(2000).phase).toBe('results')
})
