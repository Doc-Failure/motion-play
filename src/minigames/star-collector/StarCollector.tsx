import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { StarCollectorModel } from './StarCollectorModel'

export function StarCollector({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const [model] = useState(() => new StarCollectorModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
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
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to collect stars?') }
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
  return <section className="star-game" aria-labelledby="star-title">
    <header className="bubble-game__header">
      <div><p className="eyebrow">Motion hit game</p><h1 id="star-title">Star Collector</h1></div>
      <dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button ref={pauseButtonRef} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="star-rules">Touch each star for 10 points before its ring runs out. Missed stars cost nothing!</p>
    <div className={`star-boards star-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => <section className={`star-player star-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
        <h2>Player {playerId}<span>{score} points · {snapshot.collected[playerId]} collected</span></h2>
        <div className="star-board" aria-label={`Player ${playerId} Star Collector play area`} onPointerDown={(event) => pointerHit(playerId, event)}>
          <span className="star-sky" aria-hidden="true">✦ · ✧ · ✦</span>
          {snapshot.items.filter((star) => star.playerId === playerId).map((star) => <button key={star.id} className="star-target" style={{ left: `${star.x * 100}%`, top: `${star.y * 100}%` }} type="button" aria-label={`Collect Player ${playerId} star ${star.id}`} disabled={snapshot.phase !== 'playing'} onPointerDown={(event) => event.stopPropagation()} onClick={() => hitAt(playerId, star.x, star.y)}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#c8b5d8" strokeWidth="5" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#68418c" strokeWidth="5" pathLength="1" strokeDasharray={`${star.remaining} 1`} transform="rotate(-90 50 50)" />
              <path d="m50 12 12 25 27 5-20 20 3 27-23-14-25 12 6-28L11 39l28-3Z" fill="#f5c847" />
              <path d="m45 32 5-10m18 26 10-2M33 64l-3 10" fill="none" stroke="#fff8e7" strokeWidth="4" />
            </svg>
          </button>)}
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Get ready to catch stars!</span></div>}
        </div>
        <p className="star-feedback" role="status" aria-label={`Player ${playerId} collection feedback`} aria-atomic="true">{snapshot.collected[playerId] > 0 ? `★ ${snapshot.collected[playerId]} ${snapshot.collected[playerId] === 1 ? 'star' : 'stars'} collected! +10 for each catch.` : 'Ready? Catch a star before it disappears.'}</p>
      </section>)}
    </div>
    <p className="star-help">Wave at a star, click it, or focus its button and press Enter or Space. Leave a moment between catches. The purple ring shows its time left.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Star Collector paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Stargazing paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Star Collector results"><h2 ref={resultsRef} tabIndex={-1}>A sky full of stars!</h2><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
