import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { DanceChallengeModel } from './DanceChallengeModel'
import './dance-challenge.css'

const arrows = { left: '←', right: '→', up: '↑', down: '↓' }
export function DanceChallenge({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void
}) {
  const [model] = useState(() => new DanceChallengeModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Dance Challenge', externalPauseReason, onReconnect, onExit })
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
  return <section className="dance-game" aria-labelledby="dance-title">
    <GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="dance-title">Dance Challenge</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="dance-rules">Watch, then move toward the arrow on Go! +10 once per cue. Motion-center control; webcam play unverified.</p>
    <div className="dance-boards">{snapshot.lanes.map(lane => <section className="dance-player" key={lane.playerId} aria-label={`Player ${lane.playerId}`}>
      <h2>Player {lane.playerId}<span>{snapshot.scores.find(score => score.playerId === lane.playerId)?.score} points · {lane.matches} matches</span></h2>
      <div id={`dance-player-${lane.playerId}`} className="dance-board" role="group" tabIndex={0} aria-label={`Player ${lane.playerId} Dance Challenge play area`} aria-describedby="dance-help"
        onPointerMove={event => pointer(lane.playerId, event)} onPointerDown={event => pointer(lane.playerId, event)} onPointerLeave={() => release(lane.playerId)} onPointerUp={event => { if (event.pointerType !== 'mouse') release(lane.playerId) }} onPointerCancel={() => release(lane.playerId)} onBlur={() => release(lane.playerId)}
        onKeyDown={event => {
          const delta = { ArrowLeft: [-.22, 0], ArrowRight: [.22, 0], ArrowUp: [0, -.22], ArrowDown: [0, .22] }[event.key]
          if (!delta) return
          event.preventDefault()
          if (event.repeat) return
          const position = lane.position ?? { x: .5, y: .5 }
          move(lane.playerId, Math.max(0, Math.min(1, position.x + delta[0])), Math.max(0, Math.min(1, position.y + delta[1])))
        }}>
        <div role="status" aria-label={`Player ${lane.playerId} movement cue`} className={`dance-cue${snapshot.active ? ' is-active' : ''}`}><strong aria-hidden="true">{arrows[snapshot.cue]}</strong><span>{snapshot.active ? 'Go!' : snapshot.cueRemainingMs === 0 ? 'Rest' : 'Watch'} {snapshot.cue}</span></div>
        {lane.position && <span className="dance-marker" style={{ left: `${lane.position.x * 100}%`, top: `${lane.position.y * 100}%` }} aria-label={`Player ${lane.playerId} movement marker`}>★</span>}
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Follow the arrows!</span></div>}
      </div>
      <p role="status" aria-label={`Player ${lane.playerId} dance feedback`}>{lane.feedback}</p>
    </section>)}</div>
    <p id="dance-help" className="dance-help">Move your motion center toward each arrow during Go. This does not recognize dance poses. Simulation: move the pointer inside a lane, or focus it and tap an arrow key twice during Go. Keep movement fresh; holding a position earns no points.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Dance Challenge results"><h2 ref={results} tabIndex={-1}>{playerCount === 1 ? 'Great dancing!' : leaders.length > 1 ? 'It’s a tie!' : `Player ${leaders[0].playerId} wins!`}</h2>{snapshot.scores.map(({playerId, score}) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { setSnapshot(model.start(performance.now())); document.getElementById('dance-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
