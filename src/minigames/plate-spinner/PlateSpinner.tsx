import { ChallengeResult } from '../../game/ArcadeRound'
import {useLegacyReadyGate} from '../../game/useLegacyReadyGate'
import { useChallenge } from '../../game/ChallengeContext'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { PlateSpinnerModel, plateTargets, wobbleThreshold } from './PlateSpinnerModel'

export function PlateSpinner({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const challenge = useChallenge()
  const [model] = useState(() => new PlateSpinnerModel({ playerCount, pressure:challenge?.pressure, roundDurationMs:challenge ? 36000 : undefined }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  useLegacyReadyGate(snapshot.phase, externalPauseReason, () => {
    setSnapshot(model.resume(performance.now()))
    setPauseReason(null)
  })
  const pauseHeadingRef = useRef<HTMLHeadingElement>(null)
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const pauseButtonRef = useRef<HTMLButtonElement>(null)
  const previousPhaseRef = useRef(snapshot.phase)
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.hit(event)) }, [inputEvents, model])
  useEffect(() => {
    if (externalPauseReason && (snapshot.phase === 'playing' || snapshot.phase === 'countdown')) {
      setSnapshot(model.pause(performance.now()))
      setPauseReason(externalPauseReason)
    }
  }, [externalPauseReason, model, snapshot.phase])
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to spin?') }
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

  const hitAt = (playerId: PlayerId, x: number, y: number) => setSnapshot(model.hit({ playerId, kind: 'MOTION_HIT', x, y, confidence: 1, timestamp: performance.now() }))
  const pointerHit = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    hitAt(playerId, (event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height)
  }
  const best = Math.max(...snapshot.scores.map(({ score }) => score))
  const leaders = snapshot.scores.filter(({ score }) => score === best)
  return <section className="plate-game" aria-labelledby="plate-title"><GameFeedback snapshot={snapshot} />
    <header className="bubble-game__header">
      <div><p className="eyebrow">Motion hit game</p><h1 id="plate-title">Plate Spinner</h1></div>
      <dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button ref={pauseButtonRef} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="plate-rules">Rescue wobbling plates for +10. A last-second save earns +15. A drop costs 5. Full-speed plates need no tap. Most points wins!</p>
    <div className={`plate-boards plate-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => <section className={`plate-player plate-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
        <h2>Player {playerId}<span>{score} points · {snapshot.drops[playerId - 1]} drops</span></h2>
        <div className="plate-board" aria-label={`Player ${playerId} Plate Spinner play area`} onPointerDown={(event) => pointerHit(playerId, event)}>
          <svg className="plate-stage" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M3 91Q50 87 97 92L98 100H2Z" fill="#e45b9d"/>{plateTargets.map(({id,x}) => <path key={id} d={`M${x*100} 40q-2 25 0 50`} stroke="#34254c" strokeWidth="1" fill="none"/>)}</svg>
          {snapshot.plates.filter((plate) => plate.playerId === playerId).map((plate) => {
            const target = plateTargets[plate.id]
            const wobbling = plate.spin <= wobbleThreshold
            return <button key={plate.id} className={`plate-target${wobbling ? ' plate-target--wobble' : ''}`} style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }} type="button" aria-label={`Spin Player ${playerId} plate ${plate.id + 1}`} disabled={snapshot.phase !== 'playing' || plate.dropped} onPointerDown={(event) => event.stopPropagation()} onClick={() => hitAt(playerId, target.x, target.y)}>
              <svg viewBox="0 0 100 70" aria-hidden="true"><path d={plate.dropped ? 'm15 40 20-10 8 26-25-3Zm42-7 30-8-8 30-27-8Z' : 'M5 35C2 5 94 3 96 32S8 66 5 35Z'} fill={plate.dropped ? '#c3a0e8' : '#66c7df'}/>{!plate.dropped && <><ellipse cx="50" cy="32" rx="29" ry="13" fill="#fff8e7"/><path d="m39 32 8 6 17-13" fill="none"/></>}</svg>
              <span>{plate.id + 1} · {plate.dropped ? 'Replacing…' : wobbling ? (plate.spin <= .2 ? 'Last chance! +15' : 'Wobbling!') : 'Spinning'}</span>
              <meter min="0" max="1" value={plate.dropped ? 0 : plate.spin} aria-label={`Player ${playerId} plate ${plate.id + 1} spin`} />
            </button>
          })}
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Keep all three plates spinning!</span></div>}
        </div>
        <p className="plate-feedback" role="status" aria-label={`Player ${playerId} spin feedback`} aria-atomic="true">{snapshot.feedback[playerId - 1]}</p>
      </section>)}
    </div>
    <p className="plate-help">Wave at a wobbling plate, click it, or focus its button and press Enter or Space. Each player has their own plates.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Plate Spinner paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Spinning paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Plate Spinner results"><h2 ref={resultsRef} tabIndex={-1}>{playerCount === 1 ? 'Great spinning!' : leaders.length > 1 ? "It’s a tie!" : `Player ${leaders[0].playerId} wins!`}</h2><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points · {snapshot.drops[playerId - 1]} drops</span></p>)}</div><ChallengeResult scores={snapshot.scores}/><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
