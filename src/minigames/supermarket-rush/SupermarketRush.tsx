import {useLegacyReadyGate} from '../../game/useLegacyReadyGate'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { SupermarketRushModel } from './SupermarketRushModel'

export function SupermarketRush({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const challenge = useChallenge()
  const pressure = challenge?.pressure ?? 0
  const [model] = useState(() => new SupermarketRushModel({ pressure, roundDurationMs: challenge ? 36_000 : undefined, playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  useLegacyReadyGate(snapshot.phase,externalPauseReason,()=>setSnapshot(model.resume(performance.now())))
  const [pauseReason, setPauseReason] = useState<string | null>(null)
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
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to shop?') }
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
  return <section className="grocery-game" aria-labelledby="grocery-title"><GameFeedback snapshot={snapshot} />
    <header className="bubble-game__header">
      <div><p className="eyebrow">Motion hit game</p><h1 id="grocery-title">Supermarket Rush</h1></div>
      <dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button ref={pauseButtonRef} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="grocery-rules">Pick the grocery on your list for 10 points. Wrong picks cost 5. Let other groceries pass!</p>
    <div className={`grocery-boards grocery-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => {
        const pick = snapshot.lastPicks[playerId]
        return <section className={`grocery-player grocery-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
        <h2>Player {playerId}<span>{score} points · {snapshot.collected[playerId]} collected</span></h2>
        <div className="grocery-board" aria-label={`Player ${playerId} Supermarket Rush play area`} onPointerDown={(event) => pointerHit(playerId, event)}>
          <p className="grocery-order" role="status">Shopping list: <strong>{snapshot.orders[playerId]}</strong></p>
          <div className="grocery-belt" aria-hidden="true">← conveyor ←</div>
          {snapshot.items.filter((grocery) => grocery.playerId === playerId).map((grocery) => <button key={grocery.id} className="grocery-target" style={{ left: `${grocery.x * 100}%`, top: `${grocery.y * 100}%` }} type="button" aria-label={`Pick Player ${playerId} ${grocery.kind} ${grocery.id}`} disabled={snapshot.phase !== 'playing'} onPointerDown={(event) => event.stopPropagation()} onClick={() => hitAt(playerId, grocery.x, grocery.y)}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              {grocery.kind === 'apple' ? <><path d="M50 30C15 8 5 60 28 79Q40 91 50 80Q70 94 83 66C98 30 72 12 50 30Z" fill="#ee654f"/><path d="m50 30 4-18q18-8 22 2-10 15-22 7" fill="#72b779"/></> : grocery.kind === 'bread' ? <><path d="M15 71 12 37Q19 10 38 22 55 5 68 22 92 16 90 41L84 78Z" fill="#f4cb86"/><path d="m29 39 3 18m20-24 1 24m19-17-1 17"/></> : <><path d="m26 30 13-16 31 3 10 17-3 49-51-3Z" fill="#fff8e7"/><path d="m26 30 40 3 14 1m-14-1 4-16"/><path d="m32 44 35 2-1 23-35-2Z" fill="#66c7df"/></>}
            </svg><span>{grocery.kind}</span>
          </button>)}
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Check your shopping list!</span></div>}
        </div>
        <p className="grocery-feedback" role="status" aria-label={`Player ${playerId} pick feedback`} aria-atomic="true">{pick ? pick.correct
          ? `✓ ${pick.kind} picked! +10 points.`
          : `Oops, ${pick.kind}! −5 points. Look for ${pick.requested}.`
          : 'Ready? Look for the grocery on your list.'}</p>
      </section>})}
    </div>
    <p className="grocery-help">Wave at the matching grocery, click it, or focus its button and press Enter or Space. Leave a moment between picks.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Supermarket Rush paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Shopping paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Supermarket Rush results"><h2 ref={resultsRef} tabIndex={-1}>Shopping complete!</h2><ChallengeResult scores={snapshot.scores}/><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
