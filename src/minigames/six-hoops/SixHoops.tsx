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
import {HOOPS_RADIUS,HoopsModel,type HoopsSnapshot} from './HoopsModel'
import {drawHoops} from './drawHoops'
function Court({snapshot,players,onInput}:{snapshot:HoopsSnapshot;players:PlayerCount;onInput:(e:MotionInputEvent)=>void}){
 const ref=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(!r.width||!r.height)return
  if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}
  const c=canvas.getContext('2d');if(c){c.setTransform(d,0,0,d,0,0);drawHoops(c,snapshot,r.width,r.height,matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'))}
 },[snapshot])
 const act=(x:number,y:number)=>{if(snapshot.phase!=='playing')return;const lane=Math.min(players-1,Math.floor(x*players));onInput({playerId:(lane+1) as PlayerId,kind:'BODY_MOVE',x:x*players-lane,y,confidence:1,timestamp:performance.now(),pointerId:'simulation'})}
 return <div className="hoops-boards" style={{gridTemplateColumns:'1fr'}}><section><KeyboardPlayArea enabled={snapshot.phase==='playing'} onAction={act} aria-label="Six Hoops play area" onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();act((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}}><canvas ref={ref} style={{width:'100%',height:'100%',pointerEvents:'none'}} aria-label="Six baskets, three on each side" data-balls={JSON.stringify(snapshot.balls)} data-baskets={snapshot.baskets.join(',')}/></KeyboardPlayArea></section></div>
}
export function SixHoops({playerCount,inputEvents=[],onExit,externalPauseReason,onReconnect}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void}){
 const {aspectRatio=4/3}=useContext(InputFeedbackContext)
 const pressure=useChallenge()?.pressure??0
 const [model]=useState(()=>new HoopsModel(playerCount,aspectRatio*playerCount,pressure)),[snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const heard=useRef(0)
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Six Hoops',externalPauseReason,onReconnect,onExit})
 useEffect(()=>model.setAspectRatio(aspectRatio*playerCount),[model,aspectRatio,playerCount])
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setSnapshot(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>model.input(inputEvents),[model,inputEvents])
 useEffect(()=>{if(snapshot.phase!=='playing')return;const fresh=snapshot.effects.filter(e=>e.id>heard.current&&snapshot.elapsed-e.time<150);heard.current=Math.max(heard.current,...snapshot.effects.map(e=>e.id));const score=fresh.find(e=>e.kind==='score');if(score)gameAudio.hoops('swish',score.points);else if(fresh.some(e=>e.kind==='touch'))gameAudio.hoops('bounce');else if(fresh.some(e=>e.kind==='miss'))gameAudio.hoops('miss')},[snapshot])
 const best=Math.max(...snapshot.scores.map(s=>s.score)),winners=snapshot.scores.filter(s=>s.score===best)
 return <section className="hoops-game" data-phase={snapshot.phase} aria-labelledby="hoops-title"><GameFeedback contact={()=>snapshot.effects.at(-1)?.kind} regions={()=>snapshot.balls.filter(b=>b.state==='falling').map(b=>({...b,rx:HOOPS_RADIUS/(aspectRatio*playerCount),ry:HOOPS_RADIUS}))} snapshot={snapshot} musicPaused scoreFeedback={false}/>
  <RoundHud title="Six Hoops" titleId="hoops-title" snapshot={snapshot} onExit={onExit} exitRef={recovery.exitButtonRef}/>
  <Court snapshot={snapshot} players={playerCount} onInput={e=>model.input([e])}/>
  <p role="status">Bump balls sideways with your head or body. Higher hoops = more points!</p>
  {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(snapshot.countdownRemainingMs/1000)}</strong></div>}{recovery.pauseDialog}
  {snapshot.phase==='results'&&<div className="battle-results" role="dialog" aria-label="Six Hoops results"><h2 ref={recovery.resultsHeading} tabIndex={-1}>{playerCount===1?'Full time!':winners.length>1?'It’s a tie!':`Player ${winners[0].playerId} wins!`}</h2>{snapshot.scores.map(s=><p key={s.playerId}>Player {s.playerId}: {s.score} points · {snapshot.baskets[s.playerId-1]}/{snapshot.attempts[s.playerId-1]} shots made · best streak {snapshot.bestStreak[s.playerId-1]}</p>)}<ChallengeResult scores={snapshot.scores}/><div className="result-actions"><button className="crayon-button" onClick={()=>{heard.current=0;setSnapshot(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}
 </section>
}
