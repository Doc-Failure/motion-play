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
import {UfoModel,type UfoSnapshot,type UfoCue} from './UfoModel'
import {drawUfos} from './drawUfos'
function Airspace({snapshot,player,onInput}:{snapshot:UfoSnapshot;player:PlayerId;onInput:(e:MotionInputEvent)=>void}){
 const ref=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(!r.width||!r.height)return
 if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}
 const c=canvas.getContext('2d');if(c){c.setTransform(d,0,0,d,0,0);drawUfos(c,snapshot,player,r.width,r.height,matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'))}},[snapshot,player])
 const act=(x:number,y:number)=>onInput({playerId:player,kind:'MOTION_BRUSH',x,y,confidence:1,timestamp:performance.now()})
 return <section><span className="sr-only" role="status">Player {player}: {snapshot.lives[player-1]} lives</span><KeyboardPlayArea enabled={snapshot.phase==='playing'&&snapshot.lives[player-1]>0} onAction={act} aria-label={`Player ${player} UFO Juggler play area`} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();act((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}}><canvas ref={ref} style={{width:'100%',height:'100%',pointerEvents:'none'}} aria-label="Spinning saucers and alien pilots" data-ships={JSON.stringify(snapshot.ships.filter(g=>g.playerId===player))}/></KeyboardPlayArea></section>
}
export function UfoJuggler({playerCount,inputEvents=[],onExit,onComplete,externalPauseReason,onReconnect}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}){
 const pressure=useChallenge()?.pressure??0
 const {aspectRatio=4/3}=useContext(InputFeedbackContext),[model]=useState(()=>new UfoModel(playerCount,aspectRatio,pressure)),[snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const heard=useRef(new Map<number,number>()),completed=useRef(false)
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'UFO Juggler',externalPauseReason,onReconnect,onExit})
 useEffect(()=>model.setAspectRatio(aspectRatio),[model,aspectRatio])
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setSnapshot(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{if(inputEvents.length)setSnapshot(model.input(inputEvents))},[model,inputEvents])
 useEffect(()=>{
  if(snapshot.phase!=='playing')return
  const cues=new Set<UfoCue>()
  for(const ship of snapshot.ships)if(ship.cue&&ship.serial>(heard.current.get(ship.id)??0)){
   heard.current.set(ship.id,ship.serial);if(snapshot.elapsed-ship.cueAt<200)cues.add(ship.cue)
  }
  if(cues.size>1)cues.delete('spin')
  for(const cue of cues)gameAudio.ufo(cue,Math.max(...snapshot.streak))

 },[snapshot])
 useEffect(()=>{if(snapshot.phase==='results'&&!completed.current){completed.current=true;onComplete?.(snapshot.scores)}},[snapshot,onComplete])
 return <section className="ufo-game" data-phase={snapshot.phase} aria-labelledby="ufo-title"><GameFeedback contact={()=>snapshot.ships.find(b=>snapshot.elapsed-b.cueAt<600&&b.cue)?.cue} regions={()=>snapshot.ships.filter(s=>s.state==='flying').map(s=>{const radius=Math.min(.11,aspectRatio*.23)+.035;return {...s,rx:radius/aspectRatio,ry:radius/1.4}})} snapshot={snapshot} musicPaused scoreFeedback={false}/><RoundHud title="UFO Juggler" titleId="ufo-title" snapshot={snapshot} onExit={onExit} exitRef={recovery.exitButtonRef}>{snapshot.scores.map(s=><div key={s.playerId}><dt>P{s.playerId}</dt><dd>{s.score}</dd><span className="ufo-lives" aria-label={`Player ${s.playerId}: ${snapshot.lives[s.playerId-1]} lives`}>♥{snapshot.lives[s.playerId-1]}</span></div>)}</RoundHud>
 <div className="ufo-boards">{snapshot.scores.map(s=><Airspace key={s.playerId} snapshot={snapshot} player={s.playerId} onInput={e=>model.input([e])}/>)}</div>
 {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(snapshot.countdownRemainingMs/1000)}</strong></div>}{recovery.pauseDialog}
 {snapshot.phase==='results'&&<div className="battle-results" role="dialog" aria-label="UFO Juggler results"><h2 ref={recovery.resultsHeading} tabIndex={-1}>Flight school complete!</h2>{snapshot.scores.map(s=><p key={s.playerId}>Player {s.playerId}: {s.score} points · {snapshot.rescues[s.playerId-1]} rescued · {3-snapshot.lives[s.playerId-1]} crashed</p>)}<ChallengeResult scores={snapshot.scores}/><div className="result-actions"><button className="crayon-button" onClick={()=>{completed.current=false;heard.current.clear();setSnapshot(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}</section>
}
