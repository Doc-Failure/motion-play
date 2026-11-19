import { RoundHud } from '../../game/RoundHud'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import {useContext,useEffect,useRef,useState} from 'react'
import {InputFeedbackContext} from '../../game/InputFeedbackContext'
import {GameFeedback} from '../../game/GameFeedback'
import {KeyboardPlayArea} from '../../game/KeyboardPlayArea'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import {gameAudio} from '../../audio/GameAudio'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import {GhostModel,type GhostSnapshot} from './GhostModel'
import {drawGhosts} from './drawGhosts'
function Garden({snapshot,player,onInput}:{snapshot:GhostSnapshot;player:PlayerId;onInput:(e:MotionInputEvent)=>void}){
 const ref=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(!r.width||!r.height)return
 if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}
 const c=canvas.getContext('2d');if(c){c.setTransform(d,0,0,d,0,0);drawGhosts(c,snapshot,player,r.width,r.height,matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'))}},[snapshot,player])
 const act=(x:number,y:number)=>onInput({playerId:player,kind:'MOTION_BRUSH',x,y,confidence:1,timestamp:performance.now()})
 return <section><span className="sr-only" role="status">Player {player}: {snapshot.lives[player-1]} lives</span><KeyboardPlayArea enabled={snapshot.phase==='playing'&&snapshot.lives[player-1]>0} onAction={act} aria-label={`Player ${player} Ghost Catcher play area`} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();act((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}}><canvas ref={ref} style={{width:'100%',height:'100%',pointerEvents:'none'}} aria-label="Paper ghosts and bats" data-ghosts={JSON.stringify(snapshot.ghosts.filter(g=>g.playerId===player))}/></KeyboardPlayArea></section>
}
export function GhostCatcher({playerCount,inputEvents=[],onExit,onComplete,externalPauseReason,onReconnect}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}){
 const pressure=useChallenge()?.pressure??0
 const {aspectRatio=4/3}=useContext(InputFeedbackContext),[model]=useState(()=>new GhostModel(playerCount,aspectRatio,pressure)),[snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const heard=useRef(new Set<number>()),completed=useRef(false),charging=useRef(new Map<number,number>())
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Ghost Catcher',externalPauseReason,onReconnect,onExit})
 useEffect(()=>model.setAspectRatio(aspectRatio),[model,aspectRatio])
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setSnapshot(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{if(inputEvents.length)setSnapshot(model.input(inputEvents))},[model,inputEvents])
 useEffect(()=>{
  if(snapshot.phase!=='playing')return
  const cues=new Set<'rub'|'pop'|'bat'|'escape'>()
  for(const g of snapshot.ghosts){
   const stage=Math.floor(g.charge*3)
   if(g.state==='rising'&&stage>(charging.current.get(g.id)??0)){charging.current.set(g.id,stage);cues.add('rub')}
   if(g.state!=='rising'&&!heard.current.has(g.id)){heard.current.add(g.id);if(snapshot.elapsed-g.ended<200)cues.add(g.state==='caught'?(g.bat?'bat':'pop'):'escape')}
  }
  if(cues.has('pop')||cues.has('bat'))cues.delete('rub')
  for(const cue of cues)gameAudio.ghost(cue)
 },[snapshot])
 useEffect(()=>{if(snapshot.phase==='results'&&!completed.current){completed.current=true;onComplete?.(snapshot.scores)}},[snapshot,onComplete])
 return <section className="ghost-game" data-phase={snapshot.phase} aria-labelledby="ghost-title"><GameFeedback contact={()=>snapshot.ghosts.find(g=>g.state!=='rising')?.state} regions={()=>snapshot.ghosts.filter(g=>g.state==='rising').map(g=>{const ry=Math.min(.095,aspectRatio*.2)*(1+g.charge*.35)+.035;return {...g,rx:ry/aspectRatio,ry}})} snapshot={snapshot} musicPaused scoreFeedback={false}/><RoundHud title="Ghost Catcher" titleId="ghost-title" snapshot={snapshot} onExit={onExit} exitRef={recovery.exitButtonRef}>{snapshot.scores.map(s=><div key={s.playerId}><dt>P{s.playerId}</dt><dd>{s.score}</dd><span className="ghost-lives" aria-label={`Player ${s.playerId}: ${snapshot.lives[s.playerId-1]} lives`}>♥{snapshot.lives[s.playerId-1]}</span></div>)}</RoundHud>
 <div className="ghost-boards">{snapshot.scores.map(s=><Garden key={s.playerId} snapshot={snapshot} player={s.playerId} onInput={e=>model.input([e])}/>)}</div>
 {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(snapshot.countdownRemainingMs/1000)}</strong></div>}{recovery.pauseDialog}
 {snapshot.phase==='results'&&<div className="battle-results" role="dialog" aria-label="Ghost Catcher results"><h2 ref={recovery.resultsHeading} tabIndex={-1}>Ghost patrol complete!</h2>{snapshot.scores.map(s=><p key={s.playerId}>Player {s.playerId}: {s.score} points · {snapshot.captures[s.playerId-1]} caught · {5-snapshot.lives[s.playerId-1]} escaped · best streak {snapshot.best[s.playerId-1]}</p>)}<ChallengeResult scores={snapshot.scores}/><div className="result-actions"><button className="crayon-button" onClick={()=>{completed.current=false;heard.current.clear();charging.current.clear();setSnapshot(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}</section>
}
