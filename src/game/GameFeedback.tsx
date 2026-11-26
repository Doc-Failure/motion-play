import {RoundHud} from './RoundHud'
import {GameplayDebug,type DebugRegion} from './GameplayDebug'
import {ChallengeLabel} from './ArcadeRound'
import { InputFeedbackContext } from './InputFeedbackContext'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { gameAudio, type Cue, type AudioTheme } from '../audio/GameAudio'

const debugEnabled=new URLSearchParams(window.location.search).has('gameDebug')
interface FeedbackSnapshot {
  phase: string
  roundRemainingMs: number
  countdownRemainingMs: number
  scores: { playerId: number; score: number }[]
}
export function GameFeedback({ snapshot, theme, regions, contact, musicPaused = false, scoreFeedback = true, showScoreBursts = true }: { snapshot: FeedbackSnapshot; regions?:()=>DebugRegion[]; contact?:()=>string|null|undefined; scoreFeedback?:boolean; showScoreBursts?:boolean; theme?: Exclude<AudioTheme,'default'>; musicPaused?: boolean }) {
  const play=useCallback((cue:Cue)=>{if(theme)gameAudio.play(cue,theme);else gameAudio.play(cue)},[theme])
  const input = useContext(InputFeedbackContext)
  const workshopExit=useRef<HTMLButtonElement>(null)
  const [sound, setSound] = useState(gameAudio.enabled)
  const [bursts, setBursts] = useState<{playerId: number; amount: number; id: number; x: number; y: number}[]>([])
  const previous = useRef(snapshot)
  const countdown = Math.ceil(snapshot.countdownRemainingMs / 1000)
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
    if (snapshot.phase === 'countdown'&&!input.readyGateActive) play('tick')
  }, [snapshot.phase, countdown, play,input.readyGateActive])
  useEffect(() => {
    if (snapshot.phase === 'playing') play('go')
    if (snapshot.phase !== 'playing') {
      if (snapshot.phase !== 'countdown') gameAudio.stop()
      if (snapshot.phase === 'results') play('finish')
      return
    }
  }, [snapshot.phase, play])
  useEffect(() => {
    if (snapshot.phase !== 'playing' || musicPaused) return
    let step = 0
    const timer = window.setInterval(() => gameAudio.music(step++,theme), theme?150:300)
    return () => { window.clearInterval(timer); gameAudio.stop() }
  }, [snapshot.phase, musicPaused, theme])
  useEffect(() => {
    const before = previous.current
    previous.current = snapshot
    if (!scoreFeedback || snapshot.phase !== 'playing' || before.phase !== 'playing') return
    const changes = snapshot.scores.flatMap(score => {
      const amount = score.score - (before.scores.find(item => item.playerId === score.playerId)?.score ?? score.score)
      const point = input.events.find(event => event.playerId === score.playerId)
      return amount ? [{playerId:score.playerId, amount, id:performance.now(),
        x: point?.coordinateSpace==='court'?point.x:((score.playerId - 1) + (point?.x ?? .5)) / input.playerCount,
        y: point?.y ?? .5}] : []
    })
    if (changes.length) {
      play(changes.some(change => change.amount < 0) ? 'miss' : 'score')
      if (showScoreBursts) setBursts(changes)
    }
  }, [snapshot, input, play,scoreFeedback,showScoreBursts])
  useEffect(() => {
    if (!bursts.length) return
    const timer = window.setTimeout(() => setBursts([]), 850)
    return () => window.clearTimeout(timer)
  }, [bursts])
  return <>
    {input.workshopHud&&<RoundHud title={input.workshopHud.title} snapshot={snapshot} onExit={input.workshopHud.exit} exitRef={workshopExit}/>}
    {debugEnabled&&<GameplayDebug contact={contact?.()} scores={snapshot.scores} regions={regions?.()??[]}/>}
    {snapshot.phase==='countdown'&&<div className="camera-distance-cue">Start about 2–3 m (6–10 ft) back · keep outstretched arms in view</div>}
    <div className="game-tools" data-phase={snapshot.phase}><ChallengeLabel/><button className="sound-toggle" type="button" aria-label={sound ? 'Mute game sound' : 'Enable game sound'} aria-pressed={!sound} onClick={() => {gameAudio.setEnabled(!sound); setSound(!sound)}}>{sound ? '♫ Sound on' : '♫ Sound off'}</button></div>
    <div className="score-bursts" aria-hidden="true">{bursts.map(burst => <span key={`${burst.playerId}-${burst.id}`} style={{left:`${burst.x * 100}%`,top:`${burst.y * 100}%`}} className={burst.amount < 0 ? 'score-burst score-burst--miss' : 'score-burst'}>P{burst.playerId} {burst.amount > 0 ? '+' : '−'}{Math.abs(burst.amount)} {burst.amount > 0 ? '✦' : 'Oops!'}</span>)}</div>
  </>
}
