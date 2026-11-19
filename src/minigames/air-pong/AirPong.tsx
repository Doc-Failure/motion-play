import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { AirPongModel, type AirPongSnapshot } from './AirPongModel'

export function AirPong({ playerCount, inputEvents = [], externalPauseReason, onReconnect, onExit }: RoundRecoveryProps & { playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void }) {
  const challenge = useChallenge()
  const [model] = useState(() => new AirPongModel({ playerCount, pressure:challenge?.pressure, roundDurationMs:challenge ? 40000 : undefined }))
  const [snapshot, setSnapshot] = useState<AirPongSnapshot>(() => model.start(performance.now()))
  const recovery = useRoundRecovery({ model: model, snapshot, setSnapshot, title: 'Air Pong', externalPauseReason, onReconnect, onExit })
  const manual=useRef(new Map<PlayerId,number>())
  useEffect(()=>{
    let frame=0
    const tick=(time:number)=>{
      let state=model.update(time)
      if(state.phase==='playing'){
        for(const [playerId,y] of manual.current)state=model.moveHand({kind:'HAND_POSITION',playerId,x:.1,y,confidence:1,timestamp:time})
      }else manual.current.clear()
      setSnapshot(state)
      frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(frame)
  },[model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.moveHand(event)) }, [inputEvents,model])
  const steer=(playerId:PlayerId,y:number)=>{
    if(snapshot.phase!=='playing')return
    y=Math.max(0,Math.min(1,y))
    manual.current.set(playerId,y)
    setSnapshot(model.moveHand({kind:'HAND_POSITION',playerId,x:.1,y,confidence:1,timestamp:performance.now()}))
  }
  const move=(playerId:PlayerId,event:PointerEvent<HTMLDivElement>)=>{
    const box=event.currentTarget.getBoundingClientRect()
    if(box.height)steer(playerId,(event.clientY-box.top)/box.height)
  }
  const players = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
  return <section className="pong-game" aria-labelledby="pong-title"><GameFeedback snapshot={snapshot} /><header className="bubble-game__header"><div><p className="eyebrow">Hand position game</p><h1 id="pong-title">Air Pong</h1></div><dl>{snapshot.scores.map(({ playerId, score }) => <div key={playerId}><dt>Player {playerId}</dt><dd>{score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" type="button" onClick={onExit}>Exit game</button></header><p className="pong-callout">Move your paddle up and down. Return the ball for 10 points!</p><div className={`pong-boards pong-boards--${playerCount}`}>{players.map((playerId) => { const paddle = snapshot.paddles.find((item) => item.playerId === playerId); const ball = snapshot.balls.find((item) => item.playerId === playerId); const rally = snapshot.rallies.find((item) => item.playerId === playerId)?.returns ?? 0; return <div className="pong-player" key={playerId}><h2><span>Player {playerId}</span><small>Rally {rally}</small></h2><div className="pong-board" role="group" tabIndex={0}
        onKeyDown={e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();steer(playerId,(paddle?.y??.5)+(e.key==='ArrowUp'?-.06:.06))}}}
        onPointerLeave={()=>manual.current.delete(playerId)} onPointerCancel={()=>manual.current.delete(playerId)} onBlur={()=>manual.current.delete(playerId)}
        aria-label={`Player ${playerId} Air Pong play area`} onPointerMove={(event) => move(playerId, event)} onPointerDown={(event) => move(playerId, event)}><span className="pong-net" aria-hidden="true" />{paddle && <i className="pong-paddle" style={{ top: `${paddle.y * 100}%`,left:'10%',opacity:paddle.confidence>0?1:.45 }} aria-label={`Player ${playerId} hand-controlled paddle`} />}{ball && <i className="pong-ball" style={{ left: `${ball.x * 100}%`, top: `${ball.y * 100}%` }} aria-label={`Player ${playerId} pong ball`}>●</i>}{snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Paddles ready!</span></div>}</div></div> })}</div>{recovery.pauseDialog}{snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Air Pong results"><h2>Final rally!</h2><ChallengeResult scores={snapshot.scores}/><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button></div>}</section>
}
