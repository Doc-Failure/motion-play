import { describe, expect, it } from 'vitest'
import { TournamentSession } from '../src/game/TournamentSession'

describe('TournamentSession', () => {
  it('builds the requested three or five validated rounds in a stable order', () => {
    expect(new TournamentSession(2, 3).schedule.map((round) => round.game)).toEqual(['bubble-battle', 'window-wipe', 'goalkeeper'])
    expect(new TournamentSession(2, 5).schedule.map((round) => round.game)).toEqual(['bubble-battle', 'window-wipe', 'goalkeeper', 'whack-a-mole', 'paint-splash'])
  })

  it('aggregates isolated player totals, ranks ties stably, and tracks cooperative team scoring', () => {
    const tournament = new TournamentSession(2, 3)
    tournament.record([{ playerId: 1, score: 20 }, { playerId: 2, score: 10 }])
    tournament.record([{ playerId: 1, score: 5 }, { playerId: 2, score: 15 }])
    const snapshot = tournament.record([{ playerId: 1, score: 10 }, { playerId: 2, score: 10 }])
    expect(snapshot.totals).toEqual([{ playerId: 1, score: 35 }, { playerId: 2, score: 35 }])
    expect(snapshot.ranking.map((entry) => entry.playerId)).toEqual([1, 2])
    expect(snapshot.completed[2]).toMatchObject({ scoring: 'cooperative', teamScore: 20 })
    expect(snapshot.cooperativeTotal).toBe(20)
    expect(snapshot.isComplete).toBe(true)
  })

  it('rejects incomplete results and preserves immutable snapshots', () => {
    const tournament = new TournamentSession(2, 3)
    expect(() => tournament.record([{ playerId: 1, score: 10 }])).toThrow(/every player/)
    const first = tournament.record([{ playerId: 1, score: 10 }, { playerId: 2, score: 0 }])
    first.totals[0].score = 999
    expect(tournament.snapshot().totals[0].score).toBe(10)
  })
})
