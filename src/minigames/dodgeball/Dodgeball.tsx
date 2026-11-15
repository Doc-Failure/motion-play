import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { DodgeballModel } from './DodgeballModel'
import './dodgeball.css'

export function Dodgeball({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void
}) {
  const [model] = useState(() => new DodgeballModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const controls = useRef(new Map<PlayerId, number>())
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Dodgeball', externalPauseReason, onReconnect, onExit })
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
  return <section className="dodge-game" aria-labelledby="dodge-title">
    <GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="dodge-title">Dodgeball</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="dodge-rules">Steer your marker left or right, clear of the dashed path before the ball arrives. Dodge +10 · Bonk −5. Webcam motion-center control is unverified.</p>
    <div className="dodge-boards">{snapshot.lanes.map(lane => <section className="dodge-player" key={lane.playerId} aria-label={`Player ${lane.playerId}`}>
      <h2>Player {lane.playerId}<span>{snapshot.scores.find(score => score.playerId === lane.playerId)?.score} points · {lane.dodges} dodges · {lane.hits} bonks</span></h2>
      <div id={`dodge-player-${lane.playerId}`} className="dodge-board" role="group" tabIndex={0} aria-label={`Player ${lane.playerId} Dodgeball play area`} aria-describedby="dodge-help"
        onPointerMove={event => pointer(lane.playerId, event)} onPointerDown={event => pointer(lane.playerId, event)} onPointerLeave={() => release(lane.playerId)} onPointerUp={event => { if (event.pointerType !== 'mouse') release(lane.playerId) }} onPointerCancel={() => release(lane.playerId)} onBlur={() => release(lane.playerId)}
        onKeyDown={event => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); steer(lane.playerId, (controls.current.get(lane.playerId) ?? lane.bodyX ?? .5) + (event.key === 'ArrowLeft' ? -.08 : .08)) } }}>
        <svg className="dodge-stage" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d={`M${lane.ballX * 100} 15v63`} className="dodge-path"/>
          <path d="M2 78Q50 80 98 78" className="dodge-line"/>
        </svg>
        {lane.progress > 0 && <svg className="dodge-ball" viewBox="0 0 50 50" style={{ left: `${lane.ballX * 100}%`, top: `${( .15 + lane.progress * .63) * 100}%` }} aria-label={`Player ${lane.playerId} incoming ball`}><path d="M4 24C1-2 47-2 46 24S3 51 4 24Z"/><path d="M8 12q17 7 33 0M8 36q17-8 33 0M23 4q-7 19 2 42"/></svg>}
        {lane.bodyX !== null && <span className="dodge-marker" style={{ left: `${lane.bodyX * 100}%` }} aria-label={`Player ${lane.playerId} movement marker`}>★</span>}
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Find a clear spot!</span></div>}
      </div>
      <p role="status" aria-label={`Player ${lane.playerId} dodge feedback`}>{lane.feedback}</p>
    </section>)}</div>
    <p id="dodge-help" className="dodge-help">Webcam motion centers steer a marker, not tracked body outlines. Keep moving to provide a fresh position. Missing input earns no points. Webcam control is unverified. Simulation: move the pointer inside a lane, or focus it and use ← →.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Dodgeball results"><h2 ref={results} tabIndex={-1}>{playerCount === 1 ? 'Great dodging!' : leaders.length > 1 ? 'It’s a tie!' : `Player ${leaders[0].playerId} wins!`}</h2>{snapshot.scores.map(({playerId, score}) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { setSnapshot(model.start(performance.now())); document.getElementById('dodge-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
