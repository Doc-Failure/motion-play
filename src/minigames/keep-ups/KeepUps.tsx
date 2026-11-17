import {useContext,useEffect,useRef,useState} from 'react'
import {InputFeedbackContext} from '../../game/InputFeedbackContext'
import {GameFeedback} from '../../game/GameFeedback'
import {KeyboardPlayArea} from '../../game/KeyboardPlayArea'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import {gameAudio} from '../../audio/GameAudio'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import {KeepUpsModel,KEEP_UPS_LIVES,footballWind,type Football} from './KeepUpsModel'
import {drawFootball} from './drawFootball'
function Pitch({ball,time,enabled,onInput}:{ball:Football;time:number;enabled:boolean;onInput:(e:MotionInputEvent)=>void}){
 const ref=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);if(!rect.width||!rect.height)return
  if(canvas.width!==Math.round(rect.width*dpr)||canvas.height!==Math.round(rect.height*dpr)){canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr)}
  const c=canvas.getContext('2d');if(c){c.setTransform(dpr,0,0,dpr,0,0);drawFootball(c,ball,time,rect.width,rect.height,window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'))}
 },[ball,time])
 const touch=(x:number,y:number)=>onInput({playerId:ball.playerId,kind:'BODY_MOVE',x,y,confidence:1,timestamp:performance.now(),pointerId:'simulation'})
 return <section><span className="sr-only" role="status">Player {ball.playerId}: {Math.max(0,KEEP_UPS_LIVES-ball.drops)} lives</span><KeyboardPlayArea enabled={enabled} onAction={touch} aria-label={`Player ${ball.playerId} Keep Ups play area`} onPointerMove={e=>{if(!enabled)return;const r=e.currentTarget.getBoundingClientRect();touch((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}}>
  <canvas ref={ref} data-ball-x={ball.x} data-ball-y={ball.y} data-streak={ball.streak} data-touches={ball.touches} data-lives={Math.max(0,KEEP_UPS_LIVES-ball.drops)} data-wind={footballWind(time).warning?'warning':footballWind(time).active?'gust':'calm'} style={{width:'100%',height:'100%',pointerEvents:'none'}} aria-label="Spinning football"/>
 </KeyboardPlayArea></section>
}
export function KeepUps({playerCount,inputEvents=[],onExit,onComplete,trackingHint,externalPauseReason,onReconnect}:RoundRecoveryProps&{trackingHint?:string;playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}){
 const {aspectRatio=4/3}=useContext(InputFeedbackContext)
 const [model]=useState(()=>new KeepUpsModel(playerCount,aspectRatio)),[snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const manual=useRef(new Map<PlayerId,MotionInputEvent>())
 const heard=useRef(new Map<number,number>()),completed=useRef(false)
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Keep Ups',externalPauseReason,onReconnect,onExit})
 useEffect(()=>model.setAspectRatio(aspectRatio),[model,aspectRatio])
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setSnapshot(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{model.input([...inputEvents,...[...manual.current.values()].filter(e=>performance.now()-e.timestamp<200)])},[model,inputEvents])
 useEffect(()=>{if(snapshot.phase!=='playing')return;for(const b of snapshot.balls)if(b.cue&&b.serial>(heard.current.get(b.playerId)??0)){heard.current.set(b.playerId,b.serial);gameAudio.football(b.cue,b.streak)}},[snapshot])
 useEffect(()=>{if(snapshot.phase==='results'&&!completed.current){completed.current=true;onComplete?.(snapshot.scores)}},[snapshot,onComplete])
 return <section className="keep-ups-game" data-phase={snapshot.phase} aria-labelledby="keep-ups-title"><GameFeedback snapshot={snapshot} musicPaused scoreFeedback={false}/>
 <header className="bubble-game__header"><h1 id="keep-ups-title">Keep Ups</h1><dl>{snapshot.scores.map(s=><div key={s.playerId}><dt>P{s.playerId}</dt><dd>{s.score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs/1000)}s</dd></div></dl><button ref={recovery.exitButtonRef} className="text-button" onClick={onExit}>Exit game</button></header>
 <div className="football-boards">{snapshot.balls.map(b=><Pitch key={b.playerId} ball={b} time={snapshot.elapsed} enabled={snapshot.phase==='playing'&&b.drops<KEEP_UPS_LIVES} onInput={e=>{manual.current.set(e.playerId,e);model.input([...inputEvents,...[...manual.current.values()].filter(v=>performance.now()-v.timestamp<200)])}}/>)}</div>
 <p role="status">{trackingHint??'Three lives. Keep moving, watch the wind, and aim for the hoops!'}</p>
 {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(snapshot.countdownRemainingMs/1000)}</strong></div>}{recovery.pauseDialog}
 {snapshot.phase==='results'&&<div className="battle-results" role="dialog" aria-label="Keep Ups results"><h2 ref={recovery.resultsHeading} tabIndex={-1}>{snapshot.balls.every(b=>b.drops>=KEEP_UPS_LIVES)?'Out of lives!':'Full time!'}</h2>{snapshot.scores.map((s,i)=><p key={s.playerId}>Player {s.playerId}: {s.score} points · best streak {snapshot.balls[i].best}</p>)}<div className="result-actions"><button className="crayon-button" onClick={()=>{completed.current=false;heard.current.clear();manual.current.clear();setSnapshot(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}
 </section>
}
