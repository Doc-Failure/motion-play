import {useLegacyReadyGate} from '../../game/useLegacyReadyGate'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { FishFrenzyModel, fishKinds } from './FishFrenzyModel'

export function FishFrenzy({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect, random }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
  random?: () => number
}) {
  const challenge = useChallenge()
  const pressure = challenge?.pressure ?? 0
  const [model] = useState(() => new FishFrenzyModel({ pressure, roundDurationMs: challenge ? 36_000 : undefined, playerCount, random }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  useLegacyReadyGate(snapshot.phase,externalPauseReason,()=>setSnapshot(model.resume(performance.now())))
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const pauseHeadingRef = useRef<HTMLHeadingElement>(null)
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const pauseButtonRef = useRef<HTMLButtonElement>(null)
  const previousPhaseRef = useRef(snapshot.phase)
  const keyboardNets = useRef(new Map<PlayerId, { x: number; y: number }>())
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.moveHand(event)) }, [inputEvents, model])
  useEffect(() => {
    if (externalPauseReason && (snapshot.phase === 'playing' || snapshot.phase === 'countdown')) {
      setSnapshot(model.pause(performance.now()))
      setPauseReason(externalPauseReason)
    }
  }, [externalPauseReason, model, snapshot.phase])
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to fish?') }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [model])
  useEffect(() => {
    if (snapshot.phase === 'results') resultsRef.current?.focus()
    if (snapshot.phase === 'paused') pauseHeadingRef.current?.focus()
    if ((previousPhaseRef.current === 'paused' || previousPhaseRef.current === 'results')
      && (snapshot.phase === 'playing' || snapshot.phase === 'countdown')) pauseButtonRef.current?.focus()
    previousPhaseRef.current = snapshot.phase
  }, [snapshot.phase])

  const moveAt = (playerId: PlayerId, x: number, y: number) => {
    keyboardNets.current.set(playerId, { x, y })
    setSnapshot(model.moveHand({ playerId, kind: 'HAND_POSITION', x, y, confidence: 1, timestamp: performance.now() }))
  }
  const pointerMove = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    moveAt(playerId, Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)))
  }
  const keyboardMove = (playerId: PlayerId, event: KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(event.key)) return
    event.preventDefault()
    const net = keyboardNets.current.get(playerId) ?? { x: .5, y: .5 }
    moveAt(playerId, Math.max(0, Math.min(1, net.x + (event.key === 'ArrowRight' ? .05 : event.key === 'ArrowLeft' ? -.05 : 0))),
      Math.max(0, Math.min(1, net.y + (event.key === 'ArrowDown' ? .05 : event.key === 'ArrowUp' ? -.05 : 0))))
  }
  const best = Math.max(...snapshot.scores.map(({ score }) => score))
  const leaders = snapshot.scores.filter(({ score }) => score === best)
  return <section className="fish-game" aria-labelledby="fish-title"><GameFeedback snapshot={snapshot} />
    <header className="bubble-game__header">
      <div><p className="eyebrow">Position game</p><h1 id="fish-title">Fish Frenzy</h1></div>
      <dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button ref={pauseButtonRef} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="fish-rules">Guide your net over swimming fish! Minnow +5 · Silver +10 · Golden +20. Misses cost nothing. Most points wins!</p>
    <div className={`fish-boards fish-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => {
        const net = snapshot.nets.find((net) => net.playerId === playerId)
        return <section className={`fish-player fish-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
          <h2>Player {playerId}<span>{score} points · {snapshot.caught[playerId - 1]} caught · {snapshot.missed[playerId - 1]} missed</span></h2>
          <div className="fish-board" role="group" tabIndex={0} aria-label={`Player ${playerId} Fish Frenzy play area`} aria-describedby="fish-help"
            onPointerMove={(event) => pointerMove(playerId, event)} onPointerDown={(event) => { event.currentTarget.setPointerCapture?.(event.pointerId); pointerMove(playerId, event) }} onKeyDown={(event) => keyboardMove(playerId, event)}>
            <svg className="fish-water" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 92Q20 85 40 93T100 91V100H0Z" fill="#f5d58e"/><path d="M8 98q-8-18 0-26m0 20q12-14 4-20M91 99q-9-15-2-28m0 19q10-13 6-21" stroke="#397960" strokeWidth="2" fill="none"/><path d="M5 12q10-4 20 0m35 4q15-5 28-1M10 65q10-4 20 0m25-25q10-4 25 0" stroke="#fff8e7" strokeWidth="1" fill="none"/></svg>
            {snapshot.fish.filter((fish) => fish.playerId === playerId).map((fish) => <div key={fish.id} className={`swimming-fish swimming-fish--${fish.kind}`} style={{ left: `${fish.x * 100}%`, top: `${fish.y * 100}%` }} aria-label={`${fish.kind} fish worth ${fishKinds[fish.kind].value} points`}>
              <svg viewBox="0 0 100 60" aria-hidden="true" style={{ transform: fish.direction === 1 ? undefined : 'scaleX(-1)' }}><path d="M30 30 5 8l2 43Zm-4 0C40 0 83 4 95 29 81 59 40 59 26 30Z"/><path d="m48 12 8-10 11 10M48 48l9 10 12-10"/><circle cx="78" cy="24" r="3" fill="#34254c"/><path d="m48 20-6 10 6 9" fill="none"/></svg>
              <span>+{fishKinds[fish.kind].value}</span>
            </div>)}
            {net && <svg className="fish-net" viewBox="-50 -50 100 100" preserveAspectRatio="none" style={{ left: `${net.x * 100}%`, top: `${net.y * 100}%` }} role="img" aria-label={`Player ${playerId} net`}><circle r="46" fill="#fff8e755"/><path d="M-32-32 32 32M-44-12 12 44M-12-44 44 12M-32 32 32-32M-44 12 12-44M-12 44 44-12" strokeWidth="2"/><path d="m33 33 14 14" strokeWidth="7"/></svg>}
            {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Nets ready!</span></div>}
          </div>
          <p className="fish-feedback" role="status" aria-label={`Player ${playerId} fishing feedback`} aria-atomic="true">{snapshot.feedback[playerId - 1]}</p>
        </section>
      })}
    </div>
    <p className="fish-help" id="fish-help">Move with a mouse or finger, or focus your water and use arrow keys; Space or Enter casts at that spot. Camera control follows moving regions, not tracked hands. Keep moving to catch!</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Fish Frenzy paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Fishing paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Fish Frenzy results"><h2 ref={resultsRef} tabIndex={-1}>{playerCount === 1 ? 'What a catch!' : leaders.length > 1 ? 'It’s a tie!' : `Player ${leaders[0].playerId} wins!`}</h2><ChallengeResult scores={snapshot.scores}/><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points · {snapshot.caught[playerId - 1]} caught</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => { keyboardNets.current.clear(); setSnapshot(model.start(performance.now())) }}>Play again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}

