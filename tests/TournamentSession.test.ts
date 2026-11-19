import { describe, expect, it } from 'vitest'
import { TournamentSession,TOURNAMENT_GAME_COUNT } from '../src/game/TournamentSession'

describe('TournamentSession', () => {
  it('uses only the current public games and never includes hidden implementations', () => {
    expect(TOURNAMENT_GAME_COUNT).toBe(5)
    expect(new TournamentSession(2).schedule.map(round=>round.game)).toEqual(['ninja-training','window-wipe','punch-arena','keep-ups','ghost-catcher'])
  })

  it('aggregates isolated player totals, ranks ties stably, and recognizes joint winners by raw total points', () => {
    const tournament = new TournamentSession(2, 5)
    tournament.record([{ playerId: 1, score: 20 }, { playerId: 2, score: 10 }])
    tournament.record([{ playerId: 1, score: 5 }, { playerId: 2, score: 15 }])
    tournament.record([{ playerId: 1, score: 0 }, { playerId: 2, score: 0 }])
    tournament.record([{ playerId: 1, score: 0 }, { playerId: 2, score: 0 }])
    const snapshot = tournament.record([{ playerId: 1, score: 10 }, { playerId: 2, score: 10 }])
    expect(snapshot.totals).toEqual([{ playerId: 1, score: 35 }, { playerId: 2, score: 35 }])
    expect(snapshot.ranking.map((entry) => entry.playerId)).toEqual([1, 2])
    expect(snapshot.completed[4]).toMatchObject({ scoring: 'competitive', teamScore: 20 })
    expect(snapshot.cooperativeTotal).toBe(20)
    expect(snapshot.winners.map(entry=>entry.playerId)).toEqual([1,2])
    expect(snapshot.isComplete).toBe(true)
  })

  it('rejects incomplete results and preserves immutable snapshots', () => {
    const tournament = new TournamentSession(2, 5)
    expect(() => tournament.record([{ playerId: 1, score: 10 }])).toThrow(/every player/)
    const first = tournament.record([{ playerId: 1, score: 10 }, { playerId: 2, score: 0 }])
    first.totals[0].score = 999
    expect(tournament.snapshot().totals[0].score).toBe(10)
  })
})


it('awards the five-game tournament to the most total points, not the most rounds won',()=>{
 const session=new TournamentSession(2,5)
 for(let round=0;round<4;round++)session.record([{playerId:1,score:20},{playerId:2,score:10}])
 expect(session.snapshot().winners).toEqual([])
 const final=session.record([{playerId:1,score:0},{playerId:2,score:100}])
 expect(final.winners).toEqual([{playerId:2,score:140}])
 expect(final.totals).toEqual([{playerId:1,score:80},{playerId:2,score:140}])
 expect(new Set(final.completed.map(round=>round.game)).size).toBe(5)
 expect(()=>session.record([{playerId:1,score:0},{playerId:2,score:0}])).toThrow(/complete/)
})
