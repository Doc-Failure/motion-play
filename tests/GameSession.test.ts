import { describe, expect, it } from 'vitest'
import { GameSession } from '../src/game/GameSession'

describe('GameSession', () => {
  it('runs one shared countdown and round clock at exact boundaries', () => {
    const session = new GameSession({ playerCount: 2, countdownMs: 3_000, roundDurationMs: 10_000 })

    expect(session.start(1_000)).toMatchObject({ phase: 'countdown', countdownRemainingMs: 3_000, roundRemainingMs: 10_000 })
    expect(session.update(3_999)).toMatchObject({ phase: 'countdown', countdownRemainingMs: 1 })
    expect(session.update(4_000)).toMatchObject({ phase: 'playing', countdownRemainingMs: 0, roundRemainingMs: 10_000 })
    expect(session.update(13_999)).toMatchObject({ phase: 'playing', roundRemainingMs: 1 })
    expect(session.update(14_000)).toMatchObject({ phase: 'results', roundRemainingMs: 0 })
  })

  it('keeps scores isolated by player and ignores awards outside active play', () => {
    const session = new GameSession({ playerCount: 4, countdownMs: 100, roundDurationMs: 1_000 })
    session.start(0)
    expect(session.awardScore(1, 50)).toBe(0)
    session.update(100)

    expect(session.awardScore(1, 10)).toBe(10)
    expect(session.awardScore(2, 25)).toBe(25)
    expect(session.awardScore(1, -3)).toBe(7)
    expect(session.getSnapshot().scores).toEqual([
      { playerId: 1, score: 7 }, { playerId: 2, score: 25 },
      { playerId: 3, score: 0 }, { playerId: 4, score: 0 },
    ])
    expect(() => session.awardScore(4, Number.NaN)).toThrow(/finite/)

    session.update(1_100)
    expect(session.awardScore(2, 100)).toBe(25)
  })

  it('freezes countdown and gameplay clocks while paused', () => {
    const countdownPause = new GameSession({ playerCount: 1, countdownMs: 3_000, roundDurationMs: 5_000 })
    countdownPause.start(0)
    expect(countdownPause.pause(1_000)).toMatchObject({ phase: 'paused', countdownRemainingMs: 2_000 })
    expect(countdownPause.getSnapshot(50_000).countdownRemainingMs).toBe(2_000)
    countdownPause.resume(50_000)
    expect(countdownPause.update(51_999).phase).toBe('countdown')
    expect(countdownPause.update(52_000).phase).toBe('playing')

    const playPause = new GameSession({ playerCount: 1, countdownMs: 0, roundDurationMs: 5_000 })
    playPause.start(100)
    expect(playPause.pause(2_100)).toMatchObject({ phase: 'paused', roundRemainingMs: 3_000 })
    expect(playPause.awardScore(1, 5)).toBe(0)
    playPause.resume(20_000)
    expect(playPause.update(22_999)).toMatchObject({ phase: 'playing', roundRemainingMs: 1 })
    expect(playPause.update(23_000).phase).toBe('results')
  })

  it('resets scores and timing on replay without leaking old snapshot data', () => {
    const session = new GameSession({ playerCount: 2, countdownMs: 0, roundDurationMs: 100 })
    session.start(0)
    session.awardScore(1, 9)
    const oldResults = session.update(100)
    expect(oldResults.scores[0].score).toBe(9)

    const replay = session.start(200)
    expect(replay).toMatchObject({ phase: 'playing', roundRemainingMs: 100 })
    expect(replay.scores.map(({ score }) => score)).toEqual([0, 0])
    expect(oldResults.scores[0].score).toBe(9)
  })

  it('rejects invalid players, timestamps, durations, and transitions', () => {
    expect(() => new GameSession({ playerCount: 1, countdownMs: -1 })).toThrow(/Countdown/)
    const session = new GameSession({ playerCount: 1 })
    expect(() => session.pause(0)).toThrow(/idle/)
    session.start(10)
    expect(() => session.start(10)).toThrow(/countdown/)
    expect(() => session.update(9)).toThrow(/monotonic/)
    expect(() => session.awardScore(2, 1)).toThrow(/not in this session/)
  })
})
