import { useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { KeyboardPlayArea } from '../../game/KeyboardPlayArea'
import { InputFeedbackContext } from '../../game/InputFeedbackContext'
import { useRoundRecovery } from '../../game/useRoundRecovery'
import { GameFeedback } from '../../game/GameFeedback'
import { gameAudio } from '../../audio/GameAudio'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { WindowWipeModel } from './WindowWipeModel'
import { WindowSurface, WindowFrame, Squeegee } from './WindowSurface'
import './window-wipe.css'

export function WindowWipe({playerCount,inputEvents=[],onExit,onComplete,externalPauseReason,onReconnect}:{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;externalPauseReason?:string|null;onReconnect?():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}){
 const {aspectRatio=16/9}=useContext(InputFeedbackContext)
 const [model]=useState(()=>new WindowWipeModel({playerCount,aspectRatio}))
 const [snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const completionSent=useRef(false),heard=useRef(0)
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Window Wipe',externalPauseReason,onReconnect,onExit})
 useEffect(()=>{model.setAspectRatio(aspectRatio)},[model,aspectRatio])
 useEffect(()=>{let frame=0,last=-Infinity;const tick=(now:number)=>{if(now-last>=33){setSnapshot(model.update(now));last=now}frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{for(const event of inputEvents)setSnapshot(model.brush(event))},[inputEvents,model])
 useEffect(()=>{if(snapshot.phase==='results'&&onComplete&&!completionSent.current){completionSent.current=true;onComplete(snapshot.scores)}else if(snapshot.phase==='countdown')completionSent.current=false},[snapshot,onComplete])
 useEffect(()=>{
  if(snapshot.phase!=='playing')return
  for(const effect of snapshot.effects){if(effect.id<=heard.current)continue;gameAudio.play(effect.kind==='window'?'shine':effect.kind==='pop'?'bubble':'scrub','wash');heard.current=effect.id}
 },[snapshot])
 const brushAt=(playerId:PlayerId,x:number,y:number)=>setSnapshot(model.brush({playerId,kind:'MOTION_BRUSH',x,y,confidence:1,timestamp:performance.now()}))
 const pointer=(id:PlayerId,event:PointerEvent<HTMLDivElement>)=>{
  const bounds=event.currentTarget.getBoundingClientRect();if(bounds.width&&bounds.height)brushAt(id,(event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height)
 }
 const replay=()=>{heard.current=0;setSnapshot(model.start(performance.now()))}
 const players=snapshot.scores.map(score=>score.playerId)
 return <section className="wipe-game" aria-labelledby="wipe-title" data-phase={snapshot.phase}>
  <GameFeedback snapshot={snapshot} theme="wash" scoreFeedback={false}/>
  <header className="bubble-game__header"><h1 id="wipe-title">Window Wipe</h1><dl>{snapshot.scores.map(score=><div key={score.playerId}><dt>P{score.playerId}</dt><dd>{score.score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs/1000)}s</dd></div></dl><button ref={recovery.exitButtonRef} className="text-button" type="button" onClick={onExit}>Exit game</button></header>
  <p className="wipe-cue">Sweep the soap away · rub the ink spots</p>
  <div className={`wipe-boards wipe-boards--${playerCount}`}>{players.map(id=>{
   const celebrating=snapshot.celebrating[id],index=snapshot.windows[id]-(celebrating?1:0),stroke=snapshot.strokes[id]
   return <div className="wipe-player" key={id} style={{'--wipe-accent':['#70c7d3','#f29f94','#c5a4dd','#b2d493'][id-1]} as CSSProperties}>
    <h2>Player {id}</h2>
    <KeyboardPlayArea className="wipe-board" enabled={snapshot.phase==='playing'&&!celebrating} onAction={(x,y)=>brushAt(id,x,y)} aria-label={`Player ${id} Window Wipe play area`}
     onPointerDown={event=>{event.currentTarget.setPointerCapture?.(event.pointerId);pointer(id,event)}} onPointerMove={event=>{if(event.buttons)pointer(id,event)}}>
     <div className="wipe-glass-reflection" aria-hidden="true"/>
     <WindowSurface key={index} snapshot={snapshot} id={id} index={index}/>
     <svg className="wipe-ink" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">{snapshot.spots[id].filter(spot=>spot.remaining>0).map(spot=><g key={spot.id} transform={`translate(${spot.x*1000} ${spot.y*1000}) scale(${Math.min(1,1/aspectRatio)} ${Math.min(1,aspectRatio)})`} opacity={.4+spot.remaining*.18}>
      <path d="M-52-8Q-72-48-28-40Q-3-80 22-42Q67-64 53-20Q88 4 49 24Q59 67 15 47Q-13 72-33 40Q-77 48-54 14Q-77 2-52-8Z" fill="#7d7292" stroke="#4f4c67" strokeWidth="5"/>
      <path d="m-31-18 48-7m-44 25 58-9m-38 30 22-6" stroke="#ada1b5" strokeWidth="6" strokeLinecap="round"/>
      {[0,1,2].map(i=><circle key={i} cx={i*20-20} cy="76" r="6" fill={i<spot.remaining?'#fff6d8':'#6b617766'} stroke="#4f4c67" strokeWidth="2"/>)}
     </g>)}</svg>
     <WindowFrame/>
     <div className="wipe-pane-status"><span>Window {index+1}</span><div role="progressbar" aria-label={`Player ${id} window cleaning progress`} aria-valuenow={snapshot.progress[id]} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${snapshot.progress[id]}%`}}/></div><strong>{snapshot.progress[id]}%</strong></div>
     {stroke&&!celebrating&&snapshot.elapsed-stroke.at<450&&<div className="wipe-squeegee" style={{left:`${stroke.x*100}%`,top:`${stroke.y*100}%`,rotate:`${stroke.angle}deg`}} aria-hidden="true"><Squeegee/></div>}
     {celebrating&&<div className="wipe-celebration" role="status"><span aria-hidden="true">✦</span><strong>Squeaky clean!</strong><small>+50 · next window!</small></div>}
     {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.max(1,Math.ceil(snapshot.countdownRemainingMs/1000))}</strong><span>Ready, steady… sparkle!</span></div>}
    </KeyboardPlayArea>
   </div>
  })}</div>
  {recovery.pauseDialog}
  {snapshot.phase==='results'&&<div className="battle-results wipe-results" role="dialog" aria-label="Window Wipe results"><p className="eyebrow">A sparkling finish</p><h2 ref={recovery.resultsHeading} tabIndex={-1}>Look at you shine!</h2><div className="battle-results__scores">{snapshot.scores.map(score=><p key={score.playerId}><strong>Player {score.playerId}</strong><span>{score.score} points</span><small>{snapshot.windows[score.playerId]} windows cleaned · {snapshot.progress[score.playerId]}% of this pane</small></p>)}</div><div className="result-actions"><button className="crayon-button crayon-button--primary" type="button" onClick={replay}>Wipe again</button><button className="crayon-button" type="button" onClick={onExit}>Back to games</button></div></div>}
 </section>
}
