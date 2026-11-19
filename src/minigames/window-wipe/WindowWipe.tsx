import { RoundHud } from '../../game/RoundHud'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { useContext, useEffect, useRef, useState, type PointerEvent } from 'react'
import { KeyboardPlayArea } from '../../game/KeyboardPlayArea'
import { InputFeedbackContext } from '../../game/InputFeedbackContext'
import { useRoundRecovery } from '../../game/useRoundRecovery'
import { GameFeedback } from '../../game/GameFeedback'
import { gameAudio } from '../../audio/GameAudio'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { WindowWipeModel,wipeRadii } from './WindowWipeModel'
import { WindowSurface, WindowFrame, Squeegee } from './WindowSurface'
import './window-wipe.css'

export function WindowWipe({playerCount,inputEvents=[],onExit,onComplete,externalPauseReason,onReconnect}:{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;externalPauseReason?:string|null;onReconnect?():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}){
 const {aspectRatio:laneAspect=16/9}=useContext(InputFeedbackContext)
 const aspectRatio=laneAspect*playerCount
 const pressure=useChallenge()?.pressure??0
 const [model]=useState(()=>new WindowWipeModel({playerCount,aspectRatio,pressure,roundDurationMs:42000}))
 const [snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const completionSent=useRef(false),heard=useRef(0)
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Window Wipe',externalPauseReason,onReconnect,onExit})
 useEffect(()=>{model.setAspectRatio(aspectRatio)},[model,aspectRatio])
 useEffect(()=>{let frame=0,last=-Infinity;const tick=(now:number)=>{if(now-last>=33){setSnapshot(model.update(now));last=now}frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{if(inputEvents.length)setSnapshot(model.brushFrame(inputEvents))},[inputEvents,model])
 useEffect(()=>{if(snapshot.phase==='results'&&onComplete&&!completionSent.current){completionSent.current=true;onComplete(snapshot.scores)}else if(snapshot.phase==='countdown')completionSent.current=false},[snapshot,onComplete])
 useEffect(()=>{
  if(snapshot.phase!=='playing')return
  for(const effect of snapshot.effects){if(effect.id<=heard.current)continue;gameAudio.play(effect.kind==='window'?'shine':effect.kind==='pop'?'bubble':'scrub','wash');heard.current=effect.id}
 },[snapshot])
 const brushAt=(worldX:number,y:number)=>{
  const lane=Math.min(playerCount-1,Math.floor(worldX*playerCount))
  setSnapshot(model.brush({playerId:(lane+1) as PlayerId,kind:'MOTION_BRUSH',x:worldX*playerCount-lane,y,confidence:1,timestamp:performance.now()}))
 }
 const pointer=(event:PointerEvent<HTMLDivElement>)=>{
  const bounds=event.currentTarget.getBoundingClientRect();if(bounds.width&&bounds.height)brushAt((event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height)
 }
 const replay=()=>{heard.current=0;setSnapshot(model.start(performance.now()))}
 const players=snapshot.scores.map(score=>score.playerId)
 const celebrating=snapshot.celebrating,index=snapshot.windows-Number(celebrating)
 const owner=playerCount===1?'Player 1':'Team'
 return <section className="wipe-game" aria-labelledby="wipe-title" data-phase={snapshot.phase}>
  <GameFeedback contact={()=>snapshot.effects.at(-1)?.kind} regions={()=>snapshot.spots.filter(s=>s.remaining).map(s=>{const r=wipeRadii(aspectRatio);return {...s,rx:r.x+.035,ry:r.y+.035*Math.min(1,aspectRatio)}})} snapshot={snapshot} theme="wash" scoreFeedback={false}/>
  <RoundHud title="Window Wipe" titleId="wipe-title" snapshot={snapshot} onExit={onExit} exitRef={recovery.exitButtonRef}/>
  <p className="wipe-cue">{playerCount>1?'One window for the whole crew · scrub the ink together':'Sweep the soap away · rub the ink spots'}</p>
  <div className="wipe-boards" style={{gridTemplateColumns:'1fr'}}><div className="wipe-player">
    <KeyboardPlayArea className="wipe-board" enabled={snapshot.phase==='playing'&&!celebrating} onAction={brushAt} aria-label={`${owner} Window Wipe play area`}
     onPointerDown={event=>{event.currentTarget.setPointerCapture?.(event.pointerId);pointer(event)}} onPointerMove={event=>{if(event.buttons)pointer(event)}}>
     <div className="wipe-glass-reflection" aria-hidden="true"/>
     <WindowSurface key={index} snapshot={snapshot} index={index}/>
     <svg className="wipe-ink" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">{snapshot.spots.filter(spot=>spot.remaining>0).map(spot=><g key={spot.id} transform={`translate(${spot.x*1000} ${spot.y*1000}) scale(${Math.min(1,1/aspectRatio)} ${Math.min(1,aspectRatio)})`} opacity={.4+spot.remaining*.18}>
      <path d="M-52-8Q-72-48-28-40Q-3-80 22-42Q67-64 53-20Q88 4 49 24Q59 67 15 47Q-13 72-33 40Q-77 48-54 14Q-77 2-52-8Z" fill="#7d7292" stroke="#4f4c67" strokeWidth="5"/>
      <path d="m-31-18 48-7m-44 25 58-9m-38 30 22-6" stroke="#ada1b5" strokeWidth="6" strokeLinecap="round"/>
      {[0,1,2].map(i=><circle key={i} cx={i*20-20} cy="76" r="6" fill={i<spot.remaining?'#fff6d8':'#6b617766'} stroke="#4f4c67" strokeWidth="2"/>)}
     </g>)}</svg>
     <WindowFrame/>
     <div className="wipe-pane-status"><span>Window {index+1}{playerCount>1&&` · Team ${snapshot.scores.reduce((n,p)=>n+p.score,0)} pts`}</span><div role="progressbar" aria-label={`${owner} window cleaning progress`} aria-valuenow={snapshot.progress} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${snapshot.progress}%`}}/></div><strong>{snapshot.progress}%</strong></div>
     {players.map(id=>{
       const stroke=snapshot.strokes[id]
       return stroke&&!celebrating&&snapshot.elapsed-stroke.at<450&&<div key={id} className="wipe-squeegee" style={{left:`${stroke.x*100}%`,top:`${stroke.y*100}%`,rotate:`${stroke.angle}deg`}} aria-hidden="true"><Squeegee/></div>
     })}
     {celebrating&&<div className="wipe-celebration" role="status"><span aria-hidden="true">✦</span><strong>Squeaky clean!</strong><small>+50 · next window!</small></div>}
     {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.max(1,Math.ceil(snapshot.countdownRemainingMs/1000))}</strong><span>Ready, steady… sparkle!</span></div>}
    </KeyboardPlayArea>
   </div>
  </div>
  {recovery.pauseDialog}
  {snapshot.phase==='results'&&<div className="battle-results wipe-results" role="dialog" aria-label="Window Wipe results"><p className="eyebrow">A sparkling finish</p><h2 ref={recovery.resultsHeading} tabIndex={-1}>Look at you shine!</h2><p>{snapshot.windows} windows cleaned · {snapshot.progress}% of this pane</p><div className="battle-results__scores">{snapshot.scores.map(score=><p key={score.playerId}><strong>Player {score.playerId}</strong><span>{score.score} points</span></p>)}</div><ChallengeResult scores={snapshot.scores}/><div className="result-actions"><button className="crayon-button crayon-button--primary" type="button" onClick={replay}>Wipe again</button><button className="crayon-button" type="button" onClick={onExit}>Back to games</button></div></div>}
 </section>
}
