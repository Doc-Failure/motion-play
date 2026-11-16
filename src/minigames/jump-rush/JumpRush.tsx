import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { JumpRushModel } from './JumpRushModel'
import './jump-rush.css'

export function JumpRush({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void
}) {
  const [model] = useState(() => new JumpRushModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Jump Rush', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.moveBody(event)) }, [inputEvents, model])
  useEffect(() => { if (snapshot.phase === 'results') results.current?.focus() }, [snapshot.phase])
  const move = (playerId: PlayerId, x: number, y: number) => setSnapshot(model.moveBody({ playerId, kind: 'BODY_MOVE', x, y, confidence: 1, timestamp: performance.now() }))
  const pointer = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width && rect.height) move(playerId, Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)))
  }
  const release = (id: PlayerId) => setSnapshot(model.releaseBody(id))
  const best = Math.max(...snapshot.scores.map(score => score.score))
  const leaders = snapshot.scores.filter(score => score.score === best)
  return <section className="jump-game" aria-labelledby="jump-title">
    <GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="jump-title">Jump Rush</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="jump-rules">Rise just before the hurdle reaches ☆. Clear +10 · Bump −5. Motion-center control; webcam play unverified.</p>
    <div className="jump-boards">{snapshot.lanes.map(lane => <section className="jump-player" key={lane.playerId} aria-label={`Player ${lane.playerId}`}>
      <h2>Player {lane.playerId}<span>{snapshot.scores.find(score => score.playerId === lane.playerId)?.score} points · {lane.cleared} cleared</span></h2>
      <div id={`jump-player-${lane.playerId}`} className="jump-board" role="group" tabIndex={0} aria-label={`Player ${lane.playerId} Jump Rush play area`} aria-describedby="jump-help"
        onPointerMove={event => pointer(lane.playerId, event)} onPointerDown={event => pointer(lane.playerId, event)} onPointerLeave={() => release(lane.playerId)} onPointerUp={event => { if (event.pointerType !== 'mouse') release(lane.playerId) }} onPointerCancel={() => release(lane.playerId)} onBlur={() => release(lane.playerId)}
        onKeyDown={event => {
          if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
          event.preventDefault()
          if (!event.repeat) move(lane.playerId, .5, event.key === 'ArrowDown' ? .7 : .45)
        }}>
        <span className="jump-ground" aria-hidden="true"/>
        <span className="jump-launch" aria-hidden="true">☆</span>
        <span className="jump-hurdle" style={{ left: `${snapshot.obstacleX * 100}%` }} aria-label="Incoming hurdle"><svg viewBox="0 0 70 70" aria-hidden="true"><path d="M16 61 18 15 53 12 57 62 M7 60 25 63 M47 62 65 60" fill="none" stroke="#29313c" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><path d="m18 18 36-3" stroke="#f28c46" strokeWidth="13"/><path d="m20 16 32-2" stroke="#f5c847" strokeWidth="3" strokeDasharray="6 3"/></svg></span>
        <span className={`jump-runner${lane.airborne ? ' is-airborne' : ''}`} aria-label={lane.airborne ? 'Hopping' : 'Grounded'}>★</span>
        {lane.position && <span className="jump-marker" style={{ left: `${lane.position.x * 100}%`, top: `${lane.position.y * 100}%` }} aria-label={`Player ${lane.playerId} movement marker`}>★</span>}
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Time your rise!</span></div>}
      </div>
      <p role="status" aria-label={`Player ${lane.playerId} jump feedback`}>{lane.feedback}</p>
    </section>)}</div>
    <p id="jump-help" className="jump-help">Rise to trigger a short hop, then lower to reset. This does not recognize physical jumps. Simulation: move the pointer upward, or focus a lane and press Down then Up near each hurdle. Keep movement fresh.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Jump Rush results"><h2 ref={results} tabIndex={-1}>{playerCount === 1 ? 'Great hopping!' : leaders.length > 1 ? 'It’s a tie!' : `Player ${leaders[0].playerId} wins!`}</h2>{snapshot.scores.map(({playerId, score}) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { setSnapshot(model.start(performance.now())); document.getElementById('jump-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
