import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { HandSwipeTracker } from '../../input/HandSwipe'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { basketFlightMs, BasketballBlitzModel } from './BasketballBlitzModel'
import './basketball-blitz.css'

export function BasketballBlitz({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void
}) {
  const [initial] = useState(() => { const model = new BasketballBlitzModel({ playerCount }); return { model, snapshot: model.start(performance.now()) } })
  const { model } = initial
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const tracker = useRef(new HandSwipeTracker())
  const pointers = useRef(new Map<PlayerId, number>())
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Basketball Blitz', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.shoot(event)) }, [inputEvents, model])
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
    if (swipe) setSnapshot(model.shoot(swipe))
  }
  return <section className="basket-game" aria-labelledby="basket-title">
    <GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="basket-title">Basketball Blitz</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="basket-rules">Swipe up from the ball toward the hoop · Basket +2. Pointer / keyboard simulation; hand tracking unavailable.</p>
    <div className="basket-boards">{snapshot.scores.map(({ playerId, score }) => <section className="basket-player" key={playerId}>
      <h2>Player {playerId}<span>{score} points</span></h2>
      <p>{snapshot.stats[playerId - 1].baskets} / {snapshot.stats[playerId - 1].attempts} baskets</p>
      <div id={`basket-player-${playerId}`} className="basket-board" role="group" tabIndex={0} aria-label={`Player ${playerId} Basketball Blitz play area`} aria-describedby="basket-help"
        onPointerDown={event => { release(playerId); pointer(playerId, event) }} onPointerMove={event => pointer(playerId, event)}
        onPointerLeave={() => release(playerId)} onPointerUp={() => release(playerId)} onPointerCancel={() => release(playerId)} onBlur={() => release(playerId)}
        onKeyDown={event => {
          if (event.key !== 'ArrowUp') return
          event.preventDefault()
          if (event.repeat) return
          setSnapshot(model.shoot({ playerId, kind: 'HAND_SWIPE', x: .5, y: .5, confidence: 1, timestamp: performance.now(), swipe: { fromX: .5, fromY: .8, durationMs: 120 } }))
        }}>
        <svg className="basket-art" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M34 12 L67 13 L68 27 L33 26Z" fill="#fff9e944" stroke="#29313c" strokeWidth="1"/>
          <path d="M39 26 L43 38 L58 37 L62 26 M44 27 L49 37 M55 27 L51 37" fill="none" stroke="#fff9e9" strokeWidth="1"/>
          <path d="M38 25 Q50 22 62 25 Q51 29 38 25Z" fill="none" stroke="#f28c46" strokeWidth="2"/>
          <ellipse cx="50" cy="80" rx="16" ry="16" fill="#ffe17a22" stroke="#ffe17a" strokeWidth="1" strokeDasharray="3 2"/>
        </svg>
        <span className="basket-launch-label">Swipe up ↑</span>
        {!snapshot.shots.some(shot => shot.playerId === playerId) && <span className="basket-ball" style={{left:'50%',top:'80%'}} role="img" aria-label="Basketball ready"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 20 Q20 15 38 21 M20 2 Q15 20 21 38 M6 7 Q30 19 33 34 M33 6 Q8 19 7 33" fill="none" stroke="currentColor" strokeWidth="2"/></svg></span>}
        {snapshot.shots.filter(shot => shot.playerId === playerId).map(shot => {
          const t = Math.min(1, (snapshot.time - shot.launchedAt) / basketFlightMs)
          return <span key={shot.launchedAt} className="basket-ball basket-ball--flying" role="img" aria-label="Basketball in flight" style={{ left: `${(shot.fromX + (shot.aimX - shot.fromX) * t) * 100}%`, top: `${(shot.fromY + (.25 - shot.fromY) * t - .22 * Math.sin(Math.PI * t)) * 100}%` }}><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 20 Q20 15 38 21 M20 2 Q15 20 21 38 M6 7 Q30 19 33 34 M33 6 Q8 19 7 33" fill="none" stroke="currentColor" strokeWidth="2"/></svg></span>
        })}
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Ready to shoot!</span></div>}
      </div>
    </section>)}</div>
    <p id="basket-help" className="basket-help">Start a quick pointer or touch swipe inside the dotted circle and aim up at the hoop. Focus a lane and press Arrow Up to simulate an accurate shot. Wait for each ball to land before shooting again.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Basketball Blitz results"><h2 ref={results} tabIndex={-1}>Great shooting!</h2>{snapshot.scores.map(({ playerId, score }) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { tracker.current.reset(); pointers.current.clear(); setSnapshot(model.start(performance.now())); document.getElementById('basket-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
