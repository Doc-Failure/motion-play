import { useEffect, useRef, useState } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { FreezeModel, freezeTargetMs } from './FreezeModel'
import './freeze.css'

export function Freeze({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void
}) {
  const [model] = useState(() => new FreezeModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const simulated = useRef(new Map<PlayerId, { held: boolean; movingUntil: number }>())
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Freeze!', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => {
      for (const [playerId, sample] of simulated.current) model.input({ playerId, kind: 'FREEZE', x: .5, y: .5,
        activity: sample.held || time < sample.movingUntil ? .1 : 0, confidence: 1, timestamp: time })
      setSnapshot(model.update(time)); frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { if (snapshot.phase === 'paused' || snapshot.phase === 'results') simulated.current.clear() }, [snapshot.phase])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.input(event)) }, [inputEvents, model])
  useEffect(() => { if (snapshot.phase === 'results') results.current?.focus() }, [snapshot.phase])
  const release = (id: PlayerId) => { simulated.current.delete(id); setSnapshot(model.release(id)) }
  const best = Math.max(...snapshot.scores.map(score => score.score))
  const leaders = snapshot.scores.filter(score => score.score === best)
  return <section className="freeze-game" aria-labelledby="freeze-title">
    <GameFeedback snapshot={snapshot} musicPaused={snapshot.cue !== 'Move!'}/>
    <header className="bubble-game__header"><h1 id="freeze-title">Freeze!</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="freeze-rules">Wiggle on Move, settle on Ready, then Freeze! Hold for +10; a wiggle costs 5. Motion activity only; webcam play unverified.</p>
    <div className="freeze-boards">{snapshot.lanes.map(lane => <section className="freeze-player" key={lane.playerId} aria-label={`Player ${lane.playerId}`}>
      <h2>Player {lane.playerId}<span>{snapshot.scores.find(score => score.playerId === lane.playerId)?.score} points · {lane.freezes} statues</span></h2>
      <div id={`freeze-player-${lane.playerId}`} className="freeze-board" role="group" tabIndex={0} aria-label={`Player ${lane.playerId} Freeze! play area`} aria-describedby="freeze-help"
        onPointerMove={() => simulated.current.set(lane.playerId, { held: false, movingUntil: performance.now() + 140 })}
        onPointerDown={() => simulated.current.set(lane.playerId, { held: false, movingUntil: performance.now() + 140 })}
        onPointerLeave={() => release(lane.playerId)} onPointerCancel={() => release(lane.playerId)} onBlur={() => release(lane.playerId)}
        onKeyDown={event => { if (event.code === 'Space') { event.preventDefault(); simulated.current.set(lane.playerId, { held: true, movingUntil: 0 }) } }}
        onKeyUp={event => { if (event.code === 'Space') { event.preventDefault(); simulated.current.set(lane.playerId, { held: false, movingUntil: 0 }) } }}>
        <div role="status" aria-label={`Player ${lane.playerId} freeze cue`} className={`freeze-cue${snapshot.cue === 'Freeze!' ? ' is-frozen' : ''}`}>
          <strong aria-hidden="true">{snapshot.cue === 'Move!' ? '〰' : snapshot.cue === 'Ready…' ? '…' : '❄'}</strong><span>{snapshot.cue}</span>
          <progress aria-label={`Player ${lane.playerId} stillness progress`} max={freezeTargetMs} value={Math.min(freezeTargetMs, lane.heldMs)}/>
        </div>
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Wiggle, then be a statue!</span></div>}
      </div>
      <p role="status" aria-label={`Player ${lane.playerId} freeze feedback`}>{lane.feedback}</p>
    </section>)}</div>
    <p id="freeze-help" className="freeze-help">Simulation: move the pointer, then stop inside a lane. Or focus a lane, hold Space to move and release to freeze. Leaving or losing focus stops simulation. Camera input measures changing pixels, not poses or player presence. Move each cue to join; missing frames earn nothing.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Freeze! results"><h2 ref={results} tabIndex={-1}>{playerCount === 1 ? 'Super statues!' : leaders.length > 1 ? 'It’s a tie!' : `Player ${leaders[0].playerId} wins!`}</h2>{snapshot.scores.map(({playerId, score}) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { simulated.current.clear(); setSnapshot(model.start(performance.now())); document.getElementById('freeze-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
