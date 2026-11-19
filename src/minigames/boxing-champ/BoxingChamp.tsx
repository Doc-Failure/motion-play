import { RoundHud } from '../../game/RoundHud'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import {useContext,useEffect,useRef,useState} from 'react'
import {InputFeedbackContext} from '../../game/InputFeedbackContext'
import {GameFeedback} from '../../game/GameFeedback'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import {gameAudio} from '../../audio/GameAudio'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import {BoxingModel,boxingGeometry,type Boxer} from './BoxingModel'
import {BOXING_CONTACT_MS} from './boxingAttack'
import {drawBoxer} from './drawBoxer'
function Ring({boxer,time,enabled,onInput}:{boxer:Boxer;time:number;enabled:boolean;onInput:(e:MotionInputEvent)=>void}){
 const {aspectRatio=1}=useContext(InputFeedbackContext)
 const canvas=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{const c=canvas.current?.getContext('2d');if(c)drawBoxer(c,boxer,time,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'),canvas.current!.clientWidth/Math.max(1,canvas.current!.clientHeight))},[boxer,time])
 const input=(x:number,y:number,kind:'HAND_POSITION'|'BODY_MOVE',t=performance.now())=>onInput({playerId:boxer.playerId,kind,x,y,timestamp:t,confidence:1,pointerId:'simulation'})
 return <section><h2>Player {boxer.playerId}</h2><div role="group" tabIndex={0} aria-label={`Player ${boxer.playerId} Cardboard Champ play area`} onPointerMove={e=>{if(!enabled)return;const r=e.currentTarget.getBoundingClientRect();input((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height,'HAND_POSITION')}} onKeyDown={e=>{if(!enabled||e.repeat)return;if(e.key===' '||e.key==='Enter'){e.preventDefault();const t=performance.now();const x=boxingGeometry(aspectRatio).x;input(x-.3,.35,'HAND_POSITION',t-70);input(x,.35,'HAND_POSITION',t)}if(e.key==='ArrowDown'){e.preventDefault();input(.5,.65,'BODY_MOVE')}}}>
 <canvas ref={canvas} width={1000} height={1000} data-windup={enabled&&boxer.health>0&&boxer.attack>=0&&time-boxer.attack>=0&&time-boxer.attack<BOXING_CONTACT_MS} style={{width:'100%',height:'100%',pointerEvents:'none'}} aria-label="Cardboard robot boxing opponent"/>
 </div></section>
}
export function BoxingChamp({playerCount,inputEvents=[],onExit,onComplete,trackingHint,externalPauseReason,onReconnect}:RoundRecoveryProps&{trackingHint?:string;playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}){
 const {aspectRatio=1}=useContext(InputFeedbackContext)
 const pressure=useChallenge()?.pressure??0
 const [model]=useState(()=>new BoxingModel(playerCount,aspectRatio,pressure)),[snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 useEffect(()=>model.setAspectRatio(aspectRatio),[model,aspectRatio])
 const heard=useRef(new Map<number,number>()),completed=useRef(false)
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Cardboard Champ',externalPauseReason,onReconnect,onExit})
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setSnapshot(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{for(const e of inputEvents)setSnapshot(model.input(e))},[inputEvents,model])
 useEffect(()=>{if(snapshot.phase!=='playing')return;for(const b of snapshot.boxers)if(b.cue&&b.serial>(heard.current.get(b.playerId)??0)){heard.current.set(b.playerId,b.serial);gameAudio.boxing(b.cue==='counter'?'hit':b.cue)}},[snapshot])
 useEffect(()=>{if(snapshot.phase==='results'&&!completed.current){completed.current=true;onComplete?.(snapshot.scores)}},[snapshot,onComplete])
 return <section className="boxing-game" data-phase={snapshot.phase} aria-labelledby="boxing-title"><GameFeedback contact={()=>snapshot.boxers.find(b=>snapshot.elapsed-b.cueAt<600&&b.cue)?.cue} regions={()=>snapshot.boxers.flatMap(b=>{const {x,scale}=boxingGeometry(aspectRatio);return [{playerId:b.playerId,x,y:.35,rx:.18*scale,ry:.13},{playerId:b.playerId,x,y:.57,rx:.21*scale,ry:.17}]})} snapshot={snapshot} musicPaused scoreFeedback={false}/>
 <RoundHud title="Cardboard Champ" titleId="boxing-title" snapshot={snapshot} onExit={onExit} exitRef={recovery.exitButtonRef}/>
 <div className="boxing-boards">{snapshot.boxers.map(b=><Ring key={b.playerId} boxer={b} time={snapshot.elapsed} enabled={snapshot.phase==='playing'} onInput={e=>setSnapshot(model.input(e))}/>)}</div>
 <p role="status">{trackingHint??<>Jab the robot. Duck when the yellow warning appears. <span>Keyboard: Space to punch · ↓ to duck</span></>}</p>
 {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(snapshot.countdownRemainingMs/1000)}</strong></div>}{recovery.pauseDialog}
 {snapshot.phase==='results'&&<div className="battle-results" role="dialog" aria-label="Cardboard Champ results"><h2 ref={recovery.resultsHeading} tabIndex={-1}>You rocked the ring!</h2>{snapshot.scores.map((s,i)=><p key={s.playerId}>Player {s.playerId}: {s.score} points · {snapshot.boxers[i].kos} knockouts · {snapshot.boxers[i].hits}/{snapshot.boxers[i].swings} jabs · best streak {snapshot.boxers[i].best}</p>)}<ChallengeResult scores={snapshot.scores}/><div className="result-actions"><button className="crayon-button" onClick={()=>{completed.current=false;heard.current.clear();setSnapshot(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}
 </section>
}
