import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { LaserEscapeModel } from './LaserEscapeModel'
import './laser-escape.css'

export function LaserEscape({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void
}) {
  const [model] = useState(() => new LaserEscapeModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const controls = useRef(new Map<PlayerId, number>())
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Laser Escape', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => {
      let next = model.update(time)
      if (next.phase === 'playing') for (const [playerId, x] of controls.current) {
        next = model.moveBody({ playerId, kind: 'BODY_MOVE', x, y: .78, confidence: 1, timestamp: time })
      }
      setSnapshot(next); frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.moveBody(event)) }, [inputEvents, model])
  useEffect(() => {
    controls.current.clear()
    if (snapshot.phase === 'results') results.current?.focus()
  }, [snapshot.phase])
  const steer = (playerId: PlayerId, x: number) => {
    const value = Math.max(0, Math.min(1, x))
    controls.current.set(playerId, value)
    setSnapshot(model.moveBody({ playerId, kind: 'BODY_MOVE', x: value, y: .78, confidence: 1, timestamp: performance.now() }))
  }
  const release = (playerId: PlayerId) => { controls.current.delete(playerId); setSnapshot(model.releaseBody(playerId)) }
  const pointer = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width) steer(playerId, (event.clientX - rect.left) / rect.width)
  }
  const best = Math.max(...snapshot.scores.map(score => score.score))
  const leaders = snapshot.scores.filter(score => score.score === best)
  return <section className="laser-game" aria-labelledby="laser-title">
    <GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="laser-title">Laser Escape</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="laser-rules">Keep your star clear of the sweeping line. Escape +10 · Laser touch −5. Follow the arrow; dashes warn before each sweep. Webcam motion-center control is unverified.</p>
    <div className="laser-boards">{snapshot.lanes.map(lane => <section className="laser-player" key={lane.playerId} aria-label={`Player ${lane.playerId}`}>
      <h2>Player {lane.playerId}<span>{snapshot.scores.find(score => score.playerId === lane.playerId)?.score} points · {lane.escapes} escapes · {lane.hits} touches</span></h2>
      <div id={`laser-player-${lane.playerId}`} className="laser-board" role="group" tabIndex={0} aria-label={`Player ${lane.playerId} Laser Escape play area`} aria-describedby="laser-help"
        onPointerMove={event => pointer(lane.playerId, event)} onPointerDown={event => pointer(lane.playerId, event)} onPointerLeave={() => release(lane.playerId)} onPointerUp={event => { if (event.pointerType !== 'mouse') release(lane.playerId) }} onPointerCancel={() => release(lane.playerId)} onBlur={() => release(lane.playerId)}
        onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); steer(lane.playerId, (controls.current.get(lane.playerId) ?? lane.bodyX ?? .5) + (event.key === 'ArrowLeft' ? -.08 : .08)) } }}>
        <svg className={`laser-stage${snapshot.active ? ' is-active' : ''}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={`M${snapshot.beamX * 100} 0q-1 25 0 50t0 50`} className="laser-beam"/>
          <path d={`M${snapshot.beamX * 100} 0q-1 25 0 50t0 50`} className="laser-core"/>
        </svg>
        <span className="laser-cue" aria-label={`Laser sweeping ${snapshot.direction}`}>{snapshot.active ? 'Sweep' : 'Get ready'} {snapshot.direction === 'right' ? '→' : '←'}</span>
        {lane.bodyX !== null && <span className="laser-marker" style={{ left: `${lane.bodyX * 100}%` }} aria-label={`Player ${lane.playerId} movement marker`}>★</span>}
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Watch the sweeping line!</span></div>}
      </div>
      <p role="status" aria-label={`Player ${lane.playerId} laser feedback`}>{lane.feedback}</p>
    </section>)}</div>
    <p id="laser-help" className="laser-help">Webcam motion centers steer a marker, not tracked body outlines. Keep moving to provide a fresh position. Keep a fresh position throughout a sweep to earn escape points. A laser touch costs 5 points once per sweep. Webcam control is unverified. Simulation: move the pointer inside a lane, or focus it and use ← →.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Laser Escape results"><h2 ref={results} tabIndex={-1}>{playerCount === 1 ? 'Great escaping!' : leaders.length > 1 ? 'It’s a tie!' : `Player ${leaders[0].playerId} wins!`}</h2>{snapshot.scores.map(({playerId, score}) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { setSnapshot(model.start(performance.now())); document.getElementById('laser-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
