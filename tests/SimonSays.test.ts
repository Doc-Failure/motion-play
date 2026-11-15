import { describe, expect, it } from 'vitest'
import { SimonSaysModel } from '../src/minigames/simon-says/SimonSaysModel'

const hit = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1) => ({ playerId, kind: 'MOTION_HIT' as const, x, y, confidence: 1, timestamp })

describe('SimonSaysModel', () => {
  it('shows a deterministic growing sequence before accepting hits', () => {
    const model = new SimonSaysModel({ countdownMs: 0, cueMs: 100, gapMs: 20, random: () => 0 })
    expect(model.start(0)).toMatchObject({ sequence: ['sun'], turn: 'showing', activeCue: 'sun' })
    expect(model.hit(hit(.25, .28, 50)).scores[0].score).toBe(0)
    expect(model.update(120).turn).toBe('input')
    expect(model.hit(hit(.25, .28, 121))).toMatchObject({ sequence: ['sun', 'sun'], turn: 'showing' })
  })

  it('scores a completed pattern and resets progress after a mistake', () => {
    const model = new SimonSaysModel({ countdownMs: 0, cueMs: 10, gapMs: 0, random: () => 0 })
    model.start(0); model.update(10)
    expect(model.hit(hit(.75, .28, 11)).progress[0]).toMatchObject({ entered: 0, mistakes: 1 })
    expect(model.hit(hit(.25, .28, 12)).scores[0].score).toBe(5)
  })

  it('isolates player progress and waits for every player before growing', () => {
    const model = new SimonSaysModel({ playerCount: 2, countdownMs: 0, cueMs: 10, gapMs: 0, random: () => 0 })
    model.start(0); model.update(10)
    let snapshot = model.hit(hit(.25, .28, 11))
    expect(snapshot.sequence).toEqual(['sun'])
    expect(snapshot.progress).toEqual([{ playerId: 1, entered: 1, mistakes: 0, completed: true }, { playerId: 2, entered: 0, mistakes: 0, completed: false }])
    snapshot = model.hit(hit(.25, .28, 12, 2))
    expect(snapshot.sequence).toEqual(['sun', 'sun'])
    expect(snapshot.scores.map(({ score }) => score)).toEqual([10, 10])
  })

  it('rejects wrong-kind, low-confidence, and out-of-board events', () => {
    const model = new SimonSaysModel({ countdownMs: 0, cueMs: 10, gapMs: 0, random: () => 0 })
    model.start(0); model.update(10)
    model.hit({ ...hit(.25, .28, 11), kind: 'MOTION_BRUSH' })
    model.hit({ ...hit(.25, .28, 12), confidence: .1 })
    const snapshot = model.hit(hit(.5, .5, 13))
    expect(snapshot.scores[0].score).toBe(0)
    expect(snapshot.progress[0]).toMatchObject({ entered: 0, mistakes: 0 })
  })
})
