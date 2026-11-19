import {useContext,useEffect,useRef,useState,type CSSProperties} from 'react'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import {GameFeedback} from '../../game/GameFeedback'
import {InputFeedbackContext} from '../../game/InputFeedbackContext'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import {KeyboardPlayArea} from '../../game/KeyboardPlayArea'
import {gameAudio} from '../../audio/GameAudio'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import {SilkModel,type Bug} from './SilkModel'
import './silk.css'
function Robot({bug,time}:{bug:Bug;time:number}){
 const beat=Math.sin(time/(bug.kind==='spring'?75:120)+bug.id),armor=bug.kind==='armored'
 return <svg viewBox="0 0 120 120" aria-hidden="true"><g stroke="#273340" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
 {[0,1,2,3].map(i=><g key={i}><path d={`M42 ${39+i*12} ${23-i*3} ${28+i*17+beat*7} ${10+i*2} ${43+i*17-beat*7}`} fill="none"/><path d={`M78 ${39+i*12} ${97+i*3} ${28+i*17-beat*7} ${110-i*2} ${43+i*17+beat*7}`} fill="none"/></g>)}
 <ellipse cx="60" cy="72" rx="28" ry="27" fill={armor?'#e5bb68':bug.kind==='spring'?'#e99ccf':'#7bd3c4'}/><path d="M44 49Q60 61 76 49m-16 8v39" fill="none" stroke="#ffffff88"/>
 <path d="M36 39q24-19 48 0l-3 23q-21 15-42 0Z" fill="#526a86"/><path d="M43 41h34v13H43Z" fill="#142b40"/>
 <circle cx="51" cy="47" r="4" fill="#d5fff7" stroke="none"/><circle cx="69" cy="47" r="4" fill="#d5fff7" stroke="none"/>
 <path d="M49 31 42 15m29 16 7-16" fill="none"/><circle cx="41" cy="14" r="5" fill="#fff0a2"/><circle cx="79" cy="14" r="5" fill="#fff0a2"/>
 {armor&&<path d="m46 69 14-7 14 7v13L60 95 46 82Z" fill={bug.health===2?'#fff1c0':'#a7c8d8'}/>}
 </g></svg>
}
export function SilkSquad({playerCount,inputEvents=[],externalPauseReason,onReconnect,onExit,armTrackingAvailable}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];armTrackingAvailable?:boolean;onExit():void}){
 const {aspectRatio=1}=useContext(InputFeedbackContext)
 const challenge=useChallenge()
 const [model]=useState(()=>new SilkModel({playerCount,aspectRatio,pressure:challenge?.pressure,roundDurationMs:challenge?36000:undefined})),[snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Silk Squad',externalPauseReason,onReconnect,onExit})
 const heard=useRef(new Set<number>())
 useEffect(()=>{model.setAspectRatio(aspectRatio)},[model,aspectRatio])
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setSnapshot(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{for(const event of inputEvents)setSnapshot(model.input(event))},[model,inputEvents])
 useEffect(()=>{if(snapshot.phase!=='playing')return;for(const web of snapshot.webs)if(!heard.current.has(web.id)){heard.current.add(web.id);gameAudio.play('swoosh','web');if(web.kind==='catch')gameAudio.play('tag','web')}},[snapshot])
 const shoot=(p:PlayerId,x:number,y:number)=>setSnapshot(model.input({playerId:p,kind:'ARM_MOVE',x,y,confidence:1,timestamp:performance.now()}))
 return <section className="silk-game" data-arm-tracking={armTrackingAvailable===undefined?'loading':armTrackingAvailable?'ready':'unavailable'} data-phase={snapshot.phase} aria-labelledby="silk-title"><GameFeedback snapshot={snapshot} theme="web" scoreFeedback={false}/>
  <header className="bubble-game__header"><h1 id="silk-title">Silk Squad</h1><dl>{snapshot.scores.map(s=><div key={s.playerId}><dt>P{s.playerId}</dt><dd>{s.score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs/1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
  <div className="silk-boards">{snapshot.scores.map(({playerId})=>{
   const aim=snapshot.aim[playerId],fresh=aim&&snapshot.elapsed-aim.at<450
   return <section key={playerId}><h2>Player {playerId} · {snapshot.catches[playerId]} caught</h2><KeyboardPlayArea className="silk-board" enabled={snapshot.phase==='playing'} aria-label={`Player ${playerId} Silk Squad play area`} onAction={(x,y)=>shoot(playerId,x,y)} onPointerDown={e=>{const r=e.currentTarget.getBoundingClientRect();shoot(playerId,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}}>
    <svg className="silk-corners" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80q45 0 45-80M0 130q80 0 80-130M400 80q-45 0-45-80M400 130q-80 0-80-130" fill="none" stroke="#e3fcf37a" strokeWidth="2"/></svg>
    {snapshot.bugs.filter(b=>b.playerId===playerId).map(b=><button className={`silk-bug silk-bug--${b.kind}`} key={b.id} style={{left:`${b.x*100}%`,top:`${b.y*100}%`,transform:`rotate(${Math.sin(snapshot.elapsed/300+b.id)*7}deg)`}} aria-label={`Catch Player ${playerId} ${b.kind} bot ${b.id}`} disabled={snapshot.phase!=='playing'} onPointerDown={e=>e.stopPropagation()} onClick={()=>shoot(playerId,b.x,b.y)}><Robot bug={b} time={snapshot.elapsed}/>{b.expires-snapshot.elapsed<1000?<small>Escaping!</small>:b.kind==='armored'&&<small>{b.health} webs</small>}</button>)}
    {snapshot.webs.filter(w=>w.playerId===playerId).map(w=>{const age=snapshot.elapsed-w.at,travel=Math.min(1,age/160),gone=Math.min(1,Math.max(0,(age-700)/800)),x=w.toX+(0.5-w.toX)*gone,y=w.toY+(.86-w.toY)*gone;return <div className={`silk-web silk-web--${w.kind}`} key={w.id} style={{opacity:age<950?1:Math.max(0,1-(age-950)/550)}} aria-hidden="true">
     <svg viewBox="0 0 1000 1000" preserveAspectRatio="none"><path d={`M${w.x*1000} ${w.y*1000} Q${(w.x+w.toX)*500+Math.sin(age/70)*20} ${(w.y+w.toY)*500} ${(w.x+(w.toX-w.x)*travel)*1000} ${(w.y+(w.toY-w.y)*travel)*1000}`} fill="none" stroke="#e6fffb" strokeWidth="4" strokeDasharray={age>500?'5 7':undefined} vectorEffect="non-scaling-stroke"/></svg>
     {w.bug&&age>=160&&<div className="silk-cocoon" style={{'--catch-x':`${w.toX*100}%`,'--catch-y':`${w.toY*100}%`,left:`${x*100}%`,top:`${y*100}%`,scale:1-gone*.7,rotate:`${gone*100}deg`} as CSSProperties}><Robot bug={w.bug} time={snapshot.elapsed}/><svg viewBox="0 0 120 120" className="silk-net">{[0,1,2,3,4].map(i=><ellipse key={i} cx="60" cy={35+i*11} rx={29-Math.abs(2-i)*4} ry="10" fill="none" stroke="#f2fff9" strokeWidth="3"/>)}</svg></div>}
     {w.points>0&&age>=160&&<b style={{left:`${w.toX*100}%`,top:`${w.toY*100}%`}}>GOTCHA!<strong>+{w.points}</strong></b>}
    </div>})}
    {fresh&&<div className="silk-aim" style={{left:`${aim.x*100}%`,top:`${aim.y*100}%`}} aria-hidden="true">＋</div>}
    {snapshot.combos[playerId]>=2&&<div className="silk-streak" key={snapshot.combos[playerId]}>{snapshot.combos[playerId]} in a row!</div>}
    <div className="silk-jar" aria-hidden="true"><svg viewBox="0 0 100 75"><path d="M18 15h64v50q-30 14-64 0Z" fill="#d7fcf13b" stroke="#32445a" strokeWidth="3"/><path d="M14 9h72v13H14Z" fill="#f2ca76" stroke="#32445a" strokeWidth="3"/><path d="M31 30v27" stroke="#fff8e9" strokeWidth="4"/></svg><span>{snapshot.catches[playerId]}</span></div>
    {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.max(1,Math.ceil(snapshot.countdownRemainingMs/1000))}</strong><span>Move your arms to cast webs!</span></div>}
   </KeyboardPlayArea></section>
  })}</div>
  <p className="silk-instructions">{armTrackingAvailable===false?'Body tracker unavailable · use mouse, touch or keyboard':'Wave your arms over the bots to cast webs'}<small>Golden bots need two webs · keep moving to cast again</small></p>
  {recovery.pauseDialog}
  {snapshot.phase==='results'&&<div className="battle-results" role="dialog" aria-label="Silk Squad results"><p className="eyebrow">Workshop rescued</p><h2 ref={recovery.resultsHeading} tabIndex={-1}>Nice catch, Silk Squad!</h2>{snapshot.scores.map(s=><p key={s.playerId}><strong>Player {s.playerId}: {s.score} points</strong><small>{snapshot.catches[s.playerId]} bots · best streak {snapshot.best[s.playerId]}</small></p>)}<ChallengeResult scores={snapshot.scores}/><button className="crayon-button crayon-button--primary" onClick={()=>{heard.current.clear();setSnapshot(model.start(performance.now()))}}>Play again</button><button className="text-button" onClick={onExit}>Back to games</button></div>}
 </section>
}
