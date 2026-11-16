import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { HandSwipeTracker } from '../../input/HandSwipe'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { PunchArenaModel } from './PunchArenaModel'
import './punch-arena.css'

export function PunchArena({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect, random }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void; random?: () => number
}) {
  const [initial] = useState(() => { const model = new PunchArenaModel({ playerCount, random }); return { model, snapshot: model.start(performance.now()) } })
  const { model } = initial
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const tracker = useRef(new HandSwipeTracker())
  const pointers = useRef(new Map<PlayerId, number>())
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Punch Arena', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.punch(event)) }, [inputEvents, model])
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
    if (swipe) setSnapshot(model.punch(swipe))
  }
  return <section className="punch-game" aria-labelledby="punch-title">
    <GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="punch-title">Punch Arena</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="punch-rules">Match pad arrows +10 · Wrong direction −5. Pointer / keyboard simulation; hand tracking unavailable.</p>
    <div className="punch-boards">{snapshot.scores.map(({ playerId, score }) => <section className="punch-player" key={playerId}>
      <h2>Player {playerId}<span>{score} points</span></h2>
      <div id={`punch-player-${playerId}`} className="punch-board" role="group" tabIndex={0} aria-label={`Player ${playerId} Punch Arena play area`} aria-describedby="punch-help"
        onPointerDown={event => { release(playerId); pointer(playerId, event) }} onPointerMove={event => pointer(playerId, event)}
        onPointerLeave={() => release(playerId)} onPointerUp={() => release(playerId)} onPointerCancel={() => release(playerId)} onBlur={() => release(playerId)}
        onKeyDown={event => {
          if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return
          event.preventDefault()
          if (event.repeat) return
          const target = snapshot.targets.find(item => item.playerId === playerId)
          if (!target) return
          const dx = event.key === 'ArrowRight' ? .25 : event.key === 'ArrowLeft' ? -.25 : 0
          const dy = event.key === 'ArrowDown' ? .25 : event.key === 'ArrowUp' ? -.25 : 0
          setSnapshot(model.punch({ playerId, kind: 'HAND_SWIPE', x: target.x, y: target.y, confidence: 1, timestamp: performance.now(), swipe: { fromX: target.x - dx, fromY: target.y - dy, durationMs: 120 } }))
        }}>
        {snapshot.targets.filter(item => item.playerId === playerId).map(item => <span key={item.id} className="punch-target" style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }} role="img" aria-label={`Punch ${item.direction} pad`}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M15 13 Q52 1 85 16 L94 76 Q56 101 13 85 L7 48Z" fill="#f28c46" stroke="#29313c" strokeWidth="6" strokeLinejoin="round"/><path d="M20 20 77 14 M86 24 90 69 M22 88 72 92" fill="none" stroke="#ffe17a" strokeWidth="4" strokeLinecap="round"/></svg>
          <strong aria-hidden="true">{{left:'←',right:'→',up:'↑',down:'↓'}[item.direction]}</strong>
        </span>)}
        <svg className="punch-trails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{snapshot.trails.filter(trail => trail.playerId === playerId).map(trail => <path key={playerId} d={`M${trail.fromX*100} ${trail.fromY*100} L${trail.x*100} ${trail.y*100}`} fill="none" stroke="#ffe17a" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>)}</svg>
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Ready to punch!</span></div>}
      </div>
    </section>)}</div>
    <p id="punch-help" className="punch-help">Finish a quick pointer or touch swipe on a pad, following its arrow. Focus a lane and press the matching arrow key to simulate a punch. Each pad scores once; missed pads expire.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Punch Arena results"><h2 ref={results} tabIndex={-1}>Great punching!</h2>{snapshot.scores.map(({ playerId, score }) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { tracker.current.reset(); pointers.current.clear(); setSnapshot(model.start(performance.now())); document.getElementById('punch-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
