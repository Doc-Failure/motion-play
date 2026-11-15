import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { TreasureGrabModel } from './TreasureGrabModel'

export function TreasureGrab({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const [model] = useState(() => new TreasureGrabModel({ playerCount }))
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
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to find treasure?') }
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
  return <section className="treasure-game" aria-labelledby="treasure-title"><GameFeedback snapshot={snapshot} />
    <header className="bubble-game__header">
      <div><p className="eyebrow">Motion hit game</p><h1 id="treasure-title">Treasure Grab</h1></div>
      <dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button ref={pauseButtonRef} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="treasure-rules">Grab gold chests for +10. Avoid purple cursed objects marked ×: −10 points. Let curses fade away!</p>
    <div className={`treasure-boards treasure-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => <section className={`treasure-player treasure-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
        <h2>Player {playerId}<span>{score} points · {snapshot.collected[playerId]} collected</span></h2>
        <div className="treasure-board" aria-label={`Player ${playerId} Treasure Grab play area`} onPointerDown={(event) => pointerHit(playerId, event)}>
          <span className="treasure-sky" aria-hidden="true">✦ · X marks the spot · ✦</span>
          {snapshot.items.filter((item) => item.playerId === playerId).map((item) => <button key={item.id} className={`treasure-target treasure-target--${item.kind}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }} type="button" aria-label={`Player ${playerId} ${item.kind === 'treasure' ? 'gold chest +10' : 'cursed object minus 10'} ${item.id}`} disabled={snapshot.phase !== 'playing'} onPointerDown={(event) => event.stopPropagation()} onClick={() => hitAt(playerId, item.x, item.y)}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#c8b5d8" strokeWidth="5" />
              <circle cx="50" cy="50" r="45" fill="none" stroke="#68418c" strokeWidth="5" pathLength="1" strokeDasharray={`${item.remaining} 1`} transform="rotate(-90 50 50)" />
              {item.kind === 'treasure' ? <>
                <path d="M19 47Q17 24 49 25q32-2 32 24L79 77 21 79Z" fill="#f5c847" />
                <path d="m20 48 60 1M49 27l1 49M22 64l57-1" fill="none" />
                <path d="m43 45 14 1-1 16-13-1Z" fill="#fff8e7" />
              </> : <>
                <path d="m34 27 30 2 14 23-9 27-41-2-10-25Z" fill="#b995d6" />
                <path d="m36 42 27 24m-1-25L37 66" fill="none" strokeWidth="8" />
              </>}
            </svg><span>{item.kind === 'treasure' ? 'Chest +10' : 'Curse −10'}</span>
          </button>)}
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Get ready to hunt treasure!</span></div>}
        </div>
        <p className="treasure-feedback" role="status" aria-label={`Player ${playerId} collection feedback`} aria-atomic="true">{snapshot.feedback[playerId] || 'Ready? Find a gold chest. Leave the curses alone.'}</p>
      </section>)}
    </div>
    <p className="treasure-help">Wave at a chest, click it, or focus its button and press Enter or Space. Leave a moment between grabs. Rings show time left; missed objects cost nothing.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Treasure Grab paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Treasure hunt paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Treasure Grab results"><h2 ref={resultsRef} tabIndex={-1}>Your treasure haul!</h2><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
