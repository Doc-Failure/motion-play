import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { ChallengeContext, useChallenge } from './ChallengeContext'
import { challengePressure, scoreGoal, type ArcadeGame } from './arcade'
import type { PlayerScore } from './GameSession'

interface RoundProps {
  game: ArcadeGame
  players: number
  enabled: boolean
  children: ReactNode
}

export function ArcadeRound({ game, players, children, enabled }: RoundProps) {
  const [round, setRound] = useState({ level: 1, assist: 0, attempt: 0, continuing: false })
  const { level, assist } = round
  const [assistEnabled] = useState(() => new URLSearchParams(window.location.search).get('soloAssist') === '1')
  const solo = players === 1
  const team = !solo && (['jenga','floor-is-lava','shadow-snap','window-wipe','goalkeeper','pinata-party','monster-defense','car-wash','pizza-maker','tower-builder'].includes(game) || (game === 'net-rally' && players === 3))

  if (!enabled) return <>{children}</>
  const pressure = challengePressure(level, solo ? assist : 0)
  function nextLevel() {
    setRound(previous => ({ level: previous.level + 1, assist: Math.max(0, previous.assist - .05),
      attempt: previous.attempt + 1, continuing: true }))
  }
  function replaySolo(score: number) {
    const ratio = score / scoreGoal(game, level)
    const adjustment = ratio < .65 ? .05 : ratio >= 1 ? -.05 : 0
    setRound(previous => ({ ...previous, assist: Math.min(.15, Math.max(0, previous.assist + adjustment)),
      attempt: previous.attempt + 1, continuing: false }))
  }
  return <ChallengeContext.Provider value={{
    game, level, pressure, players, team, nextLevel, continuing: round.continuing,
    replaySolo: solo && assistEnabled ? replaySolo : undefined,
  }}>
    <Fragment key={round.attempt}>{children}</Fragment>
  </ChallengeContext.Provider>
}

export function ChallengeLabel() {
  const challenge = useChallenge()
  if (!challenge) return null
  const { game, level } = challenge
  return <span className="arcade-goal">Level {level} · {challenge.team?'Team goal':'Aim for'} {scoreGoal(game, level, challenge.players)}{game === 'kangaroo-race' ? 'm' : ' pts'}</span>
}

export function ChallengeResult({ scores, finalLevel }: { scores: PlayerScore[]; finalLevel?: number }) {
  const challenge = useChallenge()
  const key = challenge && `motion-play:best:${challenge.game}:${scores.length}:${challenge.level}${challenge.team?':team':''}`
  // Results may keep rendering for animations. Write only when the final scores or level change.
  const values = scores.map(player => player.score).join(',')
  useEffect(() => {
    if (!key) return
    const current = values.split(',').map(Number)
    let records = current
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      if (Array.isArray(saved)) {
        records = current.map((value, i) => Number.isFinite(saved[i]) ? Math.max(value, saved[i]) : value)
      }
      localStorage.setItem(key, JSON.stringify(records))
    } catch {
      // Results remain playable with storage unavailable.
    }
  }, [key, values])

  if (!challenge) return null
  const { game, level, nextLevel } = challenge
  const goal = scoreGoal(game, level, challenge.players)
  const total = scores.reduce((sum,p)=>sum+p.score,0)
  const cleared = (challenge.team ? total : Math.max(...scores.map(player => player.score))) >= goal

  return <div className="arcade-result">
    <strong>Level {level} {cleared ? 'complete' : `· goal ${goal}`}</strong>
    {challenge.team && <span>Team score {total}</span>}
    {cleared && finalLevel === level && <span>All {finalLevel} levels complete!</span>}
    {cleared && finalLevel !== level && <button type="button" className="crayon-button" onClick={nextLevel}>Next level · aim for {scoreGoal(game, level + 1, challenge.players)}</button>}
  </div>
}
