import {visibleCatalogGames} from '../app/catalog'
import type { PlayerCount, PlayerId } from '../input/PlayerZoneMapper'
import type { PlayableGame } from '../camera/CameraSetup'

export const TOURNAMENT_GAME_COUNT = 5
export type TournamentLength = typeof TOURNAMENT_GAME_COUNT
export type TournamentScoring = 'competitive' | 'cooperative'
export type TournamentScore = { playerId: PlayerId; score: number }
export type TournamentRound = { game: PlayableGame; title: string; scoring: TournamentScoring }
export type CompletedTournamentRound = TournamentRound & { scores: TournamentScore[]; teamScore: number }

const rounds: readonly TournamentRound[] = visibleCatalogGames.map(game=>({
  game:game.slug as PlayableGame,title:game.title,
  scoring:game.mode==='Cooperative'?'cooperative':'competitive',
}))

export class TournamentSession {
  readonly schedule: readonly TournamentRound[]
  readonly playerCount: PlayerCount
  private completed: CompletedTournamentRound[] = []

  constructor(playerCount: PlayerCount, length: TournamentLength=TOURNAMENT_GAME_COUNT) {
    this.playerCount = playerCount
    this.schedule = rounds.slice(0, length)
  }

  get roundIndex() { return this.completed.length }
  get currentRound() { return this.schedule[this.roundIndex] ?? null }
  get isComplete() { return this.roundIndex === this.schedule.length }

  record(scores: readonly TournamentScore[]) {
    const round = this.currentRound
    if (!round) throw new Error('Tournament is already complete')
    const expected = Array.from({ length: this.playerCount }, (_, index) => index + 1)
    if (scores.length !== expected.length || scores.some((entry, index) => entry.playerId !== expected[index] || !Number.isFinite(entry.score))) {
      throw new Error('Round scores must contain one finite score for every player in order')
    }
    const copied = scores.map((entry) => ({ ...entry }))
    this.completed.push({ ...round, scores: copied, teamScore: copied.reduce((total, entry) => total + entry.score, 0) })
    return this.snapshot()
  }

  snapshot() {
    const totals = Array.from({ length: this.playerCount }, (_, index) => ({ playerId: (index + 1) as PlayerId, score: 0 }))
    for (const round of this.completed) for (const score of round.scores) totals[score.playerId - 1].score += score.score
    const ranking = [...totals].sort((a, b) => b.score - a.score || a.playerId - b.playerId)
    return {
      length: this.schedule.length as TournamentLength,
      roundIndex: this.roundIndex,
      currentRound: this.currentRound,
      completed: this.completed.map((round) => ({ ...round, scores: round.scores.map((score) => ({ ...score })) })),
      totals,
      ranking,
      winners: this.isComplete ? ranking.filter(entry=>entry.score===ranking[0].score) : [],
      cooperativeTotal: this.completed.filter((round) => round.scoring === 'cooperative').reduce((total, round) => total + round.teamScore, 0),
      isComplete: this.isComplete,
    }
  }
}
