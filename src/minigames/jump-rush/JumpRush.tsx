import {Kangaroo} from './Kangaroo'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { gameAudio } from '../../audio/GameAudio'
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
  const heard = useRef({wave:0,jumps:0,hits:0,cleared:0})
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Jump Rush', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.moveBody(event)) }, [inputEvents, model])
  useEffect(()=>{
    if(snapshot.phase!=='playing')return
    const cleared=snapshot.lanes.reduce((n,l)=>n+l.cleared,0),hits=snapshot.lanes.reduce((n,l)=>n+l.hits,0),jumps=snapshot.lanes.filter(l=>l.airborne).length
    if(cleared>heard.current.cleared)gameAudio.play('combo')
    else if(hits>heard.current.hits)gameAudio.play('crack','dojo')
    else if(jumps>heard.current.jumps)gameAudio.play('swoosh')
    else if(snapshot.impactRemainingMs<550&&heard.current.wave!==snapshot.wave+1){gameAudio.play('tick');heard.current.wave=snapshot.wave+1}
    Object.assign(heard.current,{cleared,hits,jumps})
  },[snapshot])
  const move = (playerId: PlayerId, x: number, y: number) => setSnapshot(model.moveBody({ playerId, kind: 'BODY_MOVE', x, y, confidence: 1, timestamp: performance.now() }))
  const pointer = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    if (rect.width && rect.height) move(playerId, Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)))
  }
  const best = Math.max(...snapshot.scores.map(score => score.score)),leaders = snapshot.scores.filter(score => score.score === best)
  const prompt=snapshot.impactRemainingMs<550?'JUMP!':'Get ready…'
  return <section className="jump-game" data-phase={snapshot.phase} aria-labelledby="jump-title">
    <GameFeedback snapshot={snapshot} scoreFeedback={false}/>
    <header className="bubble-game__header"><h1 id="jump-title">Jump Rush</h1><dl>{snapshot.scores.map(s=><div key={s.playerId}><dt>P{s.playerId}</dt><dd>{s.score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl><button ref={recovery.exitButtonRef} className="text-button" onClick={onExit}>Exit game</button></header>
    <div className="jump-boards">{snapshot.lanes.map(lane => <section className="jump-player" key={lane.playerId} aria-label={`Player ${lane.playerId}`}>
      <div className="jump-board" role="group" tabIndex={0} aria-label={`Player ${lane.playerId} Jump Rush play area`} aria-describedby="jump-help"
        onPointerMove={event => pointer(lane.playerId, event)} onPointerLeave={() => setSnapshot(model.releaseBody(lane.playerId))}
        onBlur={() => setSnapshot(model.releaseBody(lane.playerId))}
        onKeyDown={event => {if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;event.preventDefault();move(lane.playerId,.5,event.key === 'ArrowDown' ? .7 : .45)}}>
        <svg className="jump-scenery" viewBox="0 0 600 500" preserveAspectRatio="none" aria-hidden="true"><path d="M0 430 Q300 412 600 430 L600 500H0Z" fill="#72b77955"/><path d="M0 430 Q300 412 600 430" stroke="#fff5d7" strokeWidth="5" strokeDasharray="15 12"/><path d="M30 450l18-8m75 37 20-9m270-26 19-8m100 37 18-8" stroke="#f5c847" strokeWidth="5"/></svg>
        <span className="jump-launch">YOU · P{lane.playerId}</span>
        <span className={`jump-hurdle${lane.feedback.startsWith('✕')&&snapshot.obstacleX<.25?' is-broken':''}`} style={{ left: `${snapshot.obstacleX * 100}%` }} aria-label="Incoming hurdle"><svg viewBox="0 0 80 90" aria-hidden="true"><path d="M16 82 18 25 63 22 66 82 M7 82h22m28 0h20" fill="none" stroke="#29313c" strokeWidth="7" strokeLinecap="round"/><path d="m18 27 46-3" stroke="#f28c46" strokeWidth="17"/><path d="m19 24 44-3" stroke="#fff5d7" strokeWidth="7" strokeDasharray="8 9"/><path d="m25 44 32-2" stroke="#f5c847" strokeWidth="4"/></svg></span>
        <span className="jump-runner" style={{top:`${76-lane.hopHeight*23}%`}} aria-label={lane.airborne ? 'Hopping' : 'Grounded'}><Kangaroo player={lane.playerId} height={lane.hopHeight}/></span>
        <span className="jump-prompt" data-urgent={snapshot.impactRemainingMs<550}>{lane.airborne?'↑':prompt}</span>
        <span key={`${lane.cleared}-${lane.hits}`} className="jump-burst" aria-hidden="true">{lane.feedback.startsWith('✓')?'✦ +10 ✦':lane.feedback.startsWith('✕')?'−5':''}</span>
      </div>
      <p role="status" aria-label={`Player ${lane.playerId} jump feedback`}>{lane.feedback}</p>
    </section>)}</div>
    <p id="jump-help">You are the kangaroo — jump to make it hop · +10 clear / −5 bump · Keyboard: Down then Up</p>
    {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong></div>}
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Jump Rush results"><h2 ref={recovery.resultsHeading} tabIndex={-1}>{playerCount === 1 ? 'Finish line!' : leaders.length > 1 ? 'It’s a tie!' : `Player ${leaders[0].playerId} wins!`}</h2>{snapshot.scores.map(({playerId, score},i) => <p key={playerId}>Player {playerId}: {score} points · {snapshot.lanes[i].cleared} cleared</p>)}<div className="result-actions"><button className="crayon-button" onClick={() => { heard.current={wave:0,jumps:0,hits:0,cleared:0};setSnapshot(model.start(performance.now())) }}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}
  </section>
}
