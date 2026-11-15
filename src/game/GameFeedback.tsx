import { useEffect, useRef, useState } from 'react'
import { gameAudio } from '../audio/GameAudio'

interface FeedbackSnapshot {
  phase: string
  roundRemainingMs: number
  countdownRemainingMs: number
  scores: { playerId: number; score: number }[]
}
export function GameFeedback({ snapshot }: { snapshot: FeedbackSnapshot }) {
  const [sound, setSound] = useState(gameAudio.enabled)
  const [bursts, setBursts] = useState<{playerId: number; amount: number; id: number}[]>([])
  const previous = useRef(snapshot)
  const countdown = Math.ceil(snapshot.countdownRemainingMs / 1000)
  const seconds = Math.ceil(snapshot.roundRemainingMs / 1000)
  const duration = useRef(Math.max(snapshot.roundRemainingMs, 1))
  useEffect(() => {
    document.addEventListener('pointerdown', gameAudio.unlock)
    document.addEventListener('keydown', gameAudio.unlock)
    return () => {
      document.removeEventListener('pointerdown', gameAudio.unlock)
      document.removeEventListener('keydown', gameAudio.unlock)
      gameAudio.stop()
    }
  }, [])
  useEffect(() => {
    if (snapshot.phase === 'countdown') gameAudio.play('tick')
  }, [snapshot.phase, countdown])
  useEffect(() => {
    if (snapshot.phase === 'playing') gameAudio.play('go')
    if (snapshot.phase !== 'playing') {
      if (snapshot.phase !== 'countdown') gameAudio.stop()
      if (snapshot.phase === 'results') gameAudio.play('finish')
      return
    }
    let step = 0
    const timer = window.setInterval(() => gameAudio.music(step++), 300)
    return () => { window.clearInterval(timer); gameAudio.stop() }
  }, [snapshot.phase])
  useEffect(() => {
    const before = previous.current
    previous.current = snapshot
    if (snapshot.phase !== 'playing' || before.phase !== 'playing') return
    const changes = snapshot.scores.flatMap(score => {
      const amount = score.score - (before.scores.find(item => item.playerId === score.playerId)?.score ?? score.score)
      return amount ? [{playerId:score.playerId, amount, id:performance.now()}] : []
    })
    if (changes.length) {
      gameAudio.play(changes.some(change => change.amount < 0) ? 'miss' : 'score')
      setBursts(changes)
    }
  }, [snapshot])
  useEffect(() => {
    if (!bursts.length) return
    const timer = window.setTimeout(() => setBursts([]), 850)
    return () => window.clearTimeout(timer)
  }, [bursts])
  return <>
    <div className="game-tools"><span className="game-live-label">✦ Move. Play. Smile.</span><button className="sound-toggle" type="button" aria-label={sound ? 'Mute game sound' : 'Enable game sound'} aria-pressed={!sound} onClick={() => {gameAudio.setEnabled(!sound); setSound(!sound)}}>{sound ? '♫ Sound on' : '♫ Sound off'}</button></div>
    <div className={`round-track${seconds <= 10 ? ' round-track--ending' : ''}`} aria-hidden="true"><span style={{width:`${Math.min(100, snapshot.roundRemainingMs / duration.current * 100)}%`}} /></div>
    <div className="score-bursts" aria-hidden="true">{bursts.map(burst => <span key={`${burst.playerId}-${burst.id}`} className={burst.amount < 0 ? 'score-burst score-burst--miss' : 'score-burst'}>P{burst.playerId} {burst.amount > 0 ? '+' : '−'}{Math.abs(burst.amount)} {burst.amount > 0 ? '✦' : 'Oops!'}</span>)}</div>
  </>
}
