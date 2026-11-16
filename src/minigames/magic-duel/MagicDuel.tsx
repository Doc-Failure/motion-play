import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { HandSwipeTracker } from '../../input/HandSwipe'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { MagicDuelModel, magicPatterns } from './MagicDuelModel'
import './magic-duel.css'

export function MagicDuel({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void
}) {
  const [initial] = useState(() => { const model = new MagicDuelModel({ playerCount }); return { model, snapshot: model.start(performance.now()) } })
  const { model } = initial
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const tracker = useRef(new HandSwipeTracker())
  const pointers = useRef(new Map<PlayerId, number>())
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Magic Duel', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.trace(event)) }, [inputEvents, model])
  useEffect(() => {
    if (snapshot.phase !== 'playing') { tracker.current.reset(); pointers.current.clear() }
    if (snapshot.phase === 'results') results.current?.focus()
  }, [snapshot.phase])
  const release = (id: PlayerId) => { tracker.current.reset(id); pointers.current.delete(id) }
  const pointer = (id: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    if (snapshot.phase !== 'playing') return
    if (pointers.current.get(id) !== event.pointerId) { release(id); pointers.current.set(id, event.pointerId) }
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const swipe = tracker.current.sample({ playerId: id, kind: 'HAND_POSITION', x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height, confidence: 1, timestamp: performance.now() })
    if (swipe) setSnapshot(model.trace(swipe))
  }
  return <section className="magic-game" aria-labelledby="magic-title">
    <GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="magic-title">Magic Duel</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="magic-rules">Trace numbered dots (+20) · Enter per edge to simulate. hand tracking unavailable.</p>
    <div className="magic-boards">{snapshot.scores.map(({ playerId, score }) => <section className="magic-player" key={playerId}>
      <h2>Player {playerId}<span>{score} points</span></h2>
      <div id={`magic-player-${playerId}`} className="magic-board" role="group" tabIndex={0} aria-label={`Player ${playerId} Magic Duel play area`} aria-describedby="magic-help"
        onPointerDown={event => { release(playerId); pointer(playerId, event) }} onPointerMove={event => pointer(playerId, event)}
        onPointerLeave={() => release(playerId)} onPointerUp={() => release(playerId)} onPointerCancel={() => release(playerId)} onBlur={() => release(playerId)}
        onKeyDown={event => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          if (event.repeat || snapshot.phase !== 'playing') return
          const progress = snapshot.progress[playerId - 1]
          if (progress.cast) return
          const target = magicPatterns[snapshot.pattern].points[progress.step + 1]
          setSnapshot(model.trace({ playerId, kind: 'HAND_SWIPE', x: target.x, y: target.y, confidence: 1, timestamp: performance.now(), swipe: { fromX: progress.cursor.x, fromY: progress.cursor.y, durationMs: 120 } }))
        }}>
        <svg className="magic-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={magicPatterns[snapshot.pattern].points.map(p => `${p.x*100},${p.y*100}`).join(' ')} fill="none" stroke="#29313c" strokeWidth="4" strokeLinejoin="round"/>
          <polyline points={magicPatterns[snapshot.pattern].points.map(p => `${p.x*100},${p.y*100}`).join(' ')} fill="none" stroke="#ffe17a" strokeWidth="2" strokeDasharray="3 1"/>
          {magicPatterns[snapshot.pattern].points.map((p, i, points) => i === points.length - 1 && p.x === points[0].x && p.y === points[0].y ? null : <g key={i}><circle cx={p.x*100} cy={p.y*100} r="4" fill={i <= snapshot.progress[playerId-1].step ? '#72b779' : '#fff9e9'} stroke="#29313c" strokeWidth=".8"/><text x={p.x*100} y={p.y*100+1.5} textAnchor="middle" fill="#29313c" fontSize="5">{i === 0 && snapshot.pattern === 2 ? '1/4' : i+1}</text></g>)}
          <circle cx={snapshot.progress[playerId-1].cursor.x*100} cy={snapshot.progress[playerId-1].cursor.y*100} r="5" fill="none" stroke="#e45b9d" strokeWidth="1.5"/>
        </svg>
        <p className="magic-status" role="status">{snapshot.progress[playerId-1].cast ? 'Spell cast! ✦' : `${magicPatterns[snapshot.pattern].name} · ${snapshot.progress[playerId-1].step}/${magicPatterns[snapshot.pattern].points.length-1} strokes · ${Math.ceil(snapshot.spellRemainingMs/1000)}s`}</p>
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Ready to cast!</span></div>}
      </div>
    </section>)}</div>
    <p id="magic-help" className="magic-help">Trace from 1 through each numbered dot with quick pointer or touch strokes. Finish within 3 seconds; mistakes reset your trace. A new pattern appears every 5 seconds. Focus a lane and press Enter once per edge to simulate a stroke.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Magic Duel results"><h2 ref={results} tabIndex={-1}>Wonderful spells!</h2>{snapshot.scores.map(({ playerId, score }) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { tracker.current.reset(); pointers.current.clear(); setSnapshot(model.start(performance.now())); document.getElementById('magic-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
