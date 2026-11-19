import {useChallenge} from './ChallengeContext'
import {InputFeedbackContext} from './InputFeedbackContext'
import { useContext, useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { GameSessionSnapshot } from './GameSession'

export interface RoundRecoveryProps {
  externalPauseReason?: string | null
  onReconnect?(): void
}

/** Shared recovery UI consumes only the game's lifecycle, never camera internals. */
export function useRoundRecovery<S extends GameSessionSnapshot>({
  model, snapshot, setSnapshot, title, externalPauseReason, onReconnect, onExit,
}: RoundRecoveryProps & {
  model: { pause(time: number): S; resume(time: number): S }
  snapshot: S
  setSnapshot: Dispatch<SetStateAction<S>>
  title: string
  onExit(): void
}) {
  const {readyGateActive=false,requestReadyGate}=useContext(InputFeedbackContext)
  const challenge=useChallenge()
  const continuing=challenge?.continuing??false
  const replaySolo=challenge?.replaySolo
  const lastSoloScore=useRef(0)
  const finalSoloScore=snapshot.phase==='results' && replaySolo ? snapshot.scores[0]?.score : undefined
  const priorRoundPhase=useRef('idle')
  const wasReadyGate=useRef(readyGateActive)
  const [reason, setReason] = useState('Resume when you are ready.')
  const [hidden, setHidden] = useState(document.hidden)
  const phase = useRef(snapshot.phase)
  phase.current = snapshot.phase
  const heading = useRef<HTMLHeadingElement>(null)
  const resultsHeading = useRef<HTMLHeadingElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const wasPaused = useRef(false)
  const ownedResults = useRef(false)
  const focusAfterCountdown = useRef(false)
  const cameraBlocked = useRef(false)
  const previousBlockReason=useRef<string|null>(null)
  const pause = useCallback((message: string) => {
    if (phase.current !== 'playing' && phase.current !== 'countdown') return
    const next = model.pause(performance.now())
    phase.current = next.phase
    setSnapshot(next)
    setReason(message)
  }, [model, setSnapshot])

  useEffect(()=>{
    if(finalSoloScore!==undefined) lastSoloScore.current=finalSoloScore
    if(snapshot.phase==='countdown' && priorRoundPhase.current==='results' && replaySolo) {
      priorRoundPhase.current=snapshot.phase
      replaySolo(lastSoloScore.current)
      return
    }
    const newRound=snapshot.phase==='countdown'&&((priorRoundPhase.current==='idle'&&!continuing)||priorRoundPhase.current==='results')
    priorRoundPhase.current=snapshot.phase
    if(newRound&&requestReadyGate){requestReadyGate();pause('Everyone hold a hand on your ready button.')}
  },[snapshot.phase,finalSoloScore,requestReadyGate,pause,continuing,replaySolo])
  useEffect(()=>{
    const released=wasReadyGate.current&&!readyGateActive;wasReadyGate.current=readyGateActive
    if(released&&phase.current==='paused'&&!externalPauseReason&&!document.hidden){const next=model.resume(performance.now());phase.current=next.phase;setSnapshot(next)}
  },[readyGateActive,externalPauseReason,model,setSnapshot])

  // Register before input consumption so a simultaneous disconnect blocks input.
  useEffect(() => {
    const recovered = cameraBlocked.current && !externalPauseReason
    const wasAlignment=previousBlockReason.current?.startsWith('Aligning player')
    previousBlockReason.current=externalPauseReason??null
    cameraBlocked.current = Boolean(externalPauseReason)
    if (externalPauseReason) pause(externalPauseReason)
    else if (document.hidden) pause('The tab was hidden. Resume when you are ready.')
    else if (recovered && snapshot.phase === 'paused') setReason(wasAlignment?'Alignment check ended. Resume when you are ready.':'Camera recovered. Resume when you are ready.')
  }, [externalPauseReason, pause, snapshot.phase])
  useEffect(() => {
    const visibility = () => {
      setHidden(document.hidden)
      if (document.hidden) pause('The tab was hidden. Resume when you are ready.')
    }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [pause])
  useEffect(() => {
    const restoring=wasPaused.current || ownedResults.current
    if (snapshot.phase === 'paused') heading.current?.focus()
    else if (snapshot.phase === 'results') resultsHeading.current?.focus()
    else if (restoring) {
      button.current?.focus()
      // In guided play the countdown hides the controls until the first playable frame.
      focusAfterCountdown.current = snapshot.phase==='countdown' && document.activeElement!==button.current
    } else if (snapshot.phase==='playing' && focusAfterCountdown.current) {
      focusAfterCountdown.current=false
      if(document.activeElement===document.body||document.activeElement?.id==='main-content')button.current?.focus()
    }
    wasPaused.current = snapshot.phase === 'paused'
    // Games with their own results/replay focus retain ownership of that focus.
    ownedResults.current = snapshot.phase === 'results' && Boolean(resultsHeading.current)
  }, [snapshot.phase])

  const blocked = Boolean(externalPauseReason) || hidden
  return {
    resultsHeading,
    exitButtonRef:button,
    pauseButton: <button ref={button} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => pause('Take a breather!')}>Pause</button>,
    pauseDialog: snapshot.phase === 'paused' && !readyGateActive && <div className="battle-results" role="dialog" aria-label={`${title} paused`}>
      <h2 ref={heading} tabIndex={-1}>Round paused</h2>
      <p>{externalPauseReason || reason}</p>
      <button className="crayon-button" type="button" disabled={blocked} onClick={() => {
        if (externalPauseReason || document.hidden) return
        setSnapshot(model.resume(performance.now()))
      }}>Resume round</button>
      {externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}
      <button className="text-button" type="button" onClick={onExit}>Return to setup</button>
    </div>,
  }
}
