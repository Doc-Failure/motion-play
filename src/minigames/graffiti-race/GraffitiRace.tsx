import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { GRAFFITI_BRUSH_RADIUS, MURAL_COLUMNS, MURAL_ROWS, MURAL_PATCHES, GraffitiRaceModel } from './GraffitiRaceModel'

export function GraffitiRace({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const [model] = useState(() => new GraffitiRaceModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const [cursors, setCursors] = useState<Record<PlayerId, { x: number; y: number }>>({ 1: { x: .5, y: .5 }, 2: { x: .5, y: .5 }, 3: { x: .5, y: .5 }, 4: { x: .5, y: .5 } })
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
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.brush(event)) }, [inputEvents, model])
  useEffect(() => {
    if (externalPauseReason && (snapshot.phase === 'playing' || snapshot.phase === 'countdown')) {
      setSnapshot(model.pause(performance.now()))
      setPauseReason(externalPauseReason)
    }
  }, [externalPauseReason, model, snapshot.phase])
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to paint?') }
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

  const brushAt = (playerId: PlayerId, x: number, y: number) => {
    setCursors((current) => ({ ...current, [playerId]: { x, y } }))
    setSnapshot(model.brush({ playerId, kind: 'MOTION_BRUSH', x, y, confidence: 1, timestamp: performance.now() }))
  }
  const pointerBrush = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    brushAt(playerId, (event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height)
  }
  const keyboardBrush = (playerId: PlayerId, event: KeyboardEvent<HTMLDivElement>) => {
    const cursor = cursors[playerId]
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      const x = Math.max(0, Math.min(1, cursor.x + (event.key === 'ArrowLeft' ? -.05 : event.key === 'ArrowRight' ? .05 : 0)))
      const y = Math.max(0, Math.min(1, cursor.y + (event.key === 'ArrowUp' ? -.05 : event.key === 'ArrowDown' ? .05 : 0)))
      setCursors((current) => ({ ...current, [playerId]: { x, y } }))
    } else if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      brushAt(playerId, cursor.x, cursor.y)
    }
  }
  const highScore = Math.max(...snapshot.scores.map(({ score }) => score))
  const leaders = snapshot.scores.filter(({ score }) => score === highScore)
  const resultTitle = highScore === 0 ? 'Ready for another splash?' : leaders.length > 1 ? 'A colorful tie!' : `Player ${leaders[0].playerId} wins!`
  return <section className="graffiti-game" aria-labelledby="graffiti-title"><GameFeedback snapshot={snapshot} />
    <header className="bubble-game__header">
      <div><p className="eyebrow">Motion brush · Mural race</p><h1 id="graffiti-title">Graffiti Race</h1></div>
      <dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button ref={pauseButtonRef} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="graffiti-rules">Paint your wall to uncover a secret mural! First to reveal every patch wins. Most patches wins when time runs out.</p>
    <div className={`graffiti-boards graffiti-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => <section className={`graffiti-player graffiti-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
        <h2>Player {playerId}<span>{snapshot.progress[playerId]}% revealed · {score} patches</span></h2>
        <div className="graffiti-board" role="group" tabIndex={0} aria-label={`Player ${playerId} Graffiti Race play area`} aria-describedby="graffiti-help"
          onKeyDown={(event) => keyboardBrush(playerId, event)}
          onPointerDown={(event) => { event.currentTarget.focus(); event.currentTarget.setPointerCapture?.(event.pointerId); pointerBrush(playerId, event) }}
          onPointerMove={(event) => { if (event.buttons) pointerBrush(playerId, event) }}>
          <svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <rect width="1000" height="600" fill="#fff0be" />
            <g stroke="#253e48" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round">
              <path d="M90 515Q500-390 910 515" fill="#ee799d" />
              <path d="M180 515Q500-235 820 515" fill="#f8cb50" />
              <path d="M270 515Q500-80 730 515" fill="#79be95" />
              <path d="M360 515Q500 75 640 515" fill="#85cfe4" />
              <path d="m68 140 37-8 16-38 18 37 40 6-30 28 7 40-36-18-35 20 6-41Z" fill="#f8cb50" />
              <path d="m819 85 32 26 40-8-15 39 21 35-41-2-28 29-11-40-36-19 33-23Z" fill="#ae8ed1" />
              <path d="M66 485q-44-65 15-83 10-69 66-40 57-38 77 17 76 12 35 88Z" fill="#fffdf4" />
              <path d="M744 473q-37-50 14-75-1-66 63-45 50-41 77 12 72-7 61 65l-9 42Z" fill="#fffdf4" />
              <path d="m420 520 77-108 87 109Z" fill="#ae8ed1" />
              <path d="m449 461 49-69 44 69" fill="#fffdf4" />
              <path d="m78 555 846-5M110 566l124-3m500 8 151-5" fill="none" stroke="#7557a8" />
            </g>
            {MURAL_PATCHES.filter((cell) => !snapshot.revealed[playerId].includes(cell.id)).map((cell) => <g className="graffiti-cover" key={cell.id}>
              <rect x={cell.x * 1000 - 1000 / (2 * MURAL_COLUMNS)} y={cell.y * 600 - 600 / (2 * MURAL_ROWS)} width={1000 / MURAL_COLUMNS} height={600 / MURAL_ROWS} fill="#e2d8cc" stroke="#b3a699" strokeWidth="2" />
              <path d={`m${cell.x * 1000 - 27} ${cell.y * 600 - 18} 52 12m-48 8 43 13m-39 6 34 8`} fill="none" stroke="#c6baad" strokeWidth="7" />
            </g>)}
            <ellipse className="graffiti-cursor" cx={cursors[playerId].x * 1000} cy={cursors[playerId].y * 600} rx={GRAFFITI_BRUSH_RADIUS * 1000} ry={GRAFFITI_BRUSH_RADIUS * 600} fill="#ffffff55" stroke="#253e48" strokeWidth="5" strokeDasharray="12 8" />
            {snapshot.brushes[playerId] && <ellipse className="graffiti-brush-trace" cx={snapshot.brushes[playerId].x * 1000} cy={snapshot.brushes[playerId].y * 600} rx={GRAFFITI_BRUSH_RADIUS * 1000} ry={GRAFFITI_BRUSH_RADIUS * 600} fill="#ffffff55" stroke="#253e48" strokeWidth="5" strokeDasharray="12 8" />}
          </svg>
          {snapshot.progress[playerId] === 100 && <span className="graffiti-sparkle" aria-hidden="true">✦ Mural revealed! ✦</span>}
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Ready, steady, paint!</span></div>}
        </div>
        <progress max={100} value={snapshot.progress[playerId]} aria-label={`Player ${playerId} mural progress`} />
      </section>)}
    </div>
    <p className="graffiti-help" id="graffiti-help">Wave across your wall, or drag with a mouse or finger. Keyboard: focus your wall, move the brush with arrow keys, then press Space or Enter to paint.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Graffiti Race paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Mural race paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Graffiti Race results"><h2 ref={resultsRef} tabIndex={-1}>{resultTitle}</h2><p>{leaders.length > 1 ? 'A shared finish!' : 'Fresh patches make your score.'}</p><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{snapshot.progress[playerId]}% revealed · {score} patches</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Paint again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
