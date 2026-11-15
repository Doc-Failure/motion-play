import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { CAR_BRUSH_RADIUS, CAR_MUD, CarWashModel } from './CarWashModel'

export function CarWash({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const [model] = useState(() => new CarWashModel({ playerCount }))
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
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to scrub?') }
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
  return <section className="car-game" aria-labelledby="car-title"><GameFeedback snapshot={snapshot} />
    <header className="bubble-game__header">
      <div><p className="eyebrow">Motion brush · Team challenge</p><h1 id="car-title">Car Wash</h1></div>
      <dl><div><dt>Team clean</dt><dd>{snapshot.teamProgress}%</dd></div><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button ref={pauseButtonRef} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="car-rules">Scrub your muddy car. Every fresh patch helps the team. Clean all the cars together!</p>
    <div className={`car-boards car-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => <section className={`car-player car-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
        <h2>Player {playerId}<span>{snapshot.progress[playerId]}% clean · {score} patches</span></h2>
        <div className="car-board" role="group" tabIndex={0} aria-label={`Player ${playerId} Car Wash play area`} aria-describedby="car-help"
          onKeyDown={(event) => keyboardBrush(playerId, event)}
          onPointerDown={(event) => { event.currentTarget.focus(); event.currentTarget.setPointerCapture?.(event.pointerId); pointerBrush(playerId, event) }}
          onPointerMove={(event) => { if (event.buttons) pointerBrush(playerId, event) }}>
          <svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            <path d="M60 550q420-25 880 0" fill="none" stroke="#798a83" strokeWidth="6" strokeDasharray="20 12" />
            <g stroke="#253e48" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round">
              <path d="m105 490-8-178 126-12 92-201 371 5 96 195 119 14-6 179Z" fill="var(--car-color)" />
              <path d="m263 285 70-162 153 3-2 161Zm249 2 2-160 153 3 77 157Z" fill="#e2f6f6" />
              <path d="m500 311-1 168m-61-144 30 1m-320 40 58 2m591-1 58-1" fill="none" />
              <path d="M101 464q411 19 795-1" fill="none" />
              <ellipse cx="279" cy="500" rx="71" ry="65" fill="#38434b" /><ellipse cx="724" cy="502" rx="73" ry="64" fill="#38434b" />
              <ellipse cx="278" cy="500" rx="31" ry="29" fill="#fff8dc" /><ellipse cx="724" cy="502" rx="30" ry="30" fill="#fff8dc" />
            </g>
            {CAR_MUD.filter((cell) => !snapshot.cleaned[playerId].includes(cell.id)).map((cell) => <g className="car-mud" key={cell.id}>
              <rect x={cell.x * 1000 - 49} y={cell.y * 600 - 49} width="98" height="98" rx={18 + cell.id % 9} fill="#855738" stroke="#65452f" strokeWidth="3" transform={`rotate(${cell.id % 2 ? 3 : -3} ${cell.x * 1000} ${cell.y * 600})`} />
              <path d={`m${cell.x * 1000 - 28} ${cell.y * 600 - 15} 52 18m-44 16 30-2`} fill="none" stroke="#b28a61" strokeWidth="7" />
            </g>)}
            <ellipse className="car-cursor" cx={cursors[playerId].x * 1000} cy={cursors[playerId].y * 600} rx={CAR_BRUSH_RADIUS * 1000} ry={CAR_BRUSH_RADIUS * 600} fill="#ffffff55" stroke="#253e48" strokeWidth="5" strokeDasharray="12 8" />
            {snapshot.brushes[playerId] && <ellipse className="car-brush-trace" cx={snapshot.brushes[playerId].x * 1000} cy={snapshot.brushes[playerId].y * 600} rx={CAR_BRUSH_RADIUS * 1000} ry={CAR_BRUSH_RADIUS * 600} fill="#ffffff55" stroke="#253e48" strokeWidth="5" strokeDasharray="12 8" />}
          </svg>
          {snapshot.progress[playerId] === 100 && <span className="car-sparkle" aria-hidden="true">✦ Sparkling! ✦</span>}
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Ready, steady, scrub!</span></div>}
        </div>
        <progress max={100} value={snapshot.progress[playerId]} aria-label={`Player ${playerId} cleaning progress`} />
      </section>)}
    </div>
    <p className="car-help" id="car-help">Wave across the mud, or drag with a mouse or finger. Keyboard: focus your car, move the brush with arrow keys, then press Space or Enter to scrub.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Car Wash paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Car wash paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Car Wash results"><h2 ref={resultsRef} tabIndex={-1}>{snapshot.teamProgress === 100 ? 'A sparkling team effort!' : 'Great scrubbing, team!'}</h2><p>Team clean: {snapshot.teamProgress}%</p><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{snapshot.progress[playerId]}% clean · {score} patches</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Wash again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
