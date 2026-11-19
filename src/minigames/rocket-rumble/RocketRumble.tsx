import {useContext,useEffect,useRef,useState,type CSSProperties} from 'react'
import {InputFeedbackContext} from '../../game/InputFeedbackContext'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import {GameFeedback} from '../../game/GameFeedback'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import {gameAudio} from '../../audio/GameAudio'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import {RocketModel,colors,symbols} from './RocketModel'
import {FireworksCanvas} from './FireworksCanvas'
import './rockets.css'
export function RocketRumble({playerCount,inputEvents=[],onExit,externalPauseReason,onReconnect,onComplete}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}){
 const {aspectRatio=1}=useContext(InputFeedbackContext)
 const challenge=useChallenge()
 const [model]=useState(()=>new RocketModel({playerCount,aspectRatio,pressure:challenge?.pressure,roundDurationMs:challenge?36000:undefined}))
 const [snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const completionSent=useRef(false)
 useEffect(()=>{if(snapshot.phase==='results'&&onComplete&&!completionSent.current){completionSent.current=true;onComplete(snapshot.scores)}else if(snapshot.phase==='countdown')completionSent.current=false},[snapshot,onComplete])
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Rocket Rumble',externalPauseReason,onReconnect,onExit})
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'))
 const heard=useRef(new Set<number>()),selectedBefore=useRef(0),launched=useRef(0),results=useRef<HTMLHeadingElement>(null)
 useEffect(()=>{model.setAspectRatio(aspectRatio)},[model,aspectRatio])
 useEffect(()=>{const q=window.matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(q.matches||document.documentElement.classList.contains('reduce-motion'));q.addEventListener('change',change);const o=new MutationObserver(change);o.observe(document.documentElement,{attributes:true,attributeFilter:['class']});return()=>{q.removeEventListener('change',change);o.disconnect()}},[])
 useEffect(()=>{let raf=0;const tick=(now:number)=>{setSnapshot(model.update(now));raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf)},[model])
 useEffect(()=>{for(const e of inputEvents)setSnapshot(model.hit(e))},[inputEvents,model])
 useEffect(()=>{
  if(snapshot.phase!=='playing')return
  const selected=snapshot.rockets.filter(r=>r.selected).length
  if(selected>selectedBefore.current)gameAudio.play('tag','fireworks');selectedBefore.current=selected
  const newest=Math.max(0,...snapshot.rockets.map(r=>r.id));if(newest>launched.current){gameAudio.play('launch','fireworks');launched.current=newest}
  for(const burst of snapshot.bursts)if(burst.at<=snapshot.elapsed&&!heard.current.has(burst.id)){heard.current.add(burst.id);gameAudio.play('boom','fireworks')}
 },[snapshot])
 useEffect(()=>{if(snapshot.phase==='results')results.current?.focus()},[snapshot.phase])
 const hit=(playerId:PlayerId,x:number,y:number)=>setSnapshot(model.hit({playerId,kind:'MOTION_HIT',x,y,confidence:1,timestamp:performance.now()}))
 return <section className="rocket-game" data-phase={snapshot.phase} data-finale={snapshot.finale} aria-labelledby="rocket-title">
  <GameFeedback snapshot={snapshot} theme="fireworks"/>
  <header className="bubble-game__header"><h1 id="rocket-title">Rocket Rumble</h1><dl>{snapshot.scores.map(s=><div key={s.playerId}><dt>P{s.playerId}</dt><dd>{s.score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs/1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
  <div className="rocket-boards">{snapshot.scores.map(({playerId})=>{
   const selected=snapshot.rockets.filter(r=>r.playerId===playerId&&r.selected),armed=selected.length>=2
   const closing=Boolean(selected.length && selected[0].expires-snapshot.elapsed<1500)
   return <section key={playerId}><h2>Player {playerId}</h2><div className="rocket-board" aria-label={`Player ${playerId} Rocket Rumble play area`} onPointerDown={e=>{const r=e.currentTarget.getBoundingClientRect();if(r.width&&r.height)hit(playerId,(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}}>
    <svg className="rocket-threads" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><polyline points={selected.map(r=>`${r.x*1000},${r.y*1000}`).join(' ')} fill="none" stroke={selected.length?colors[selected[0].color]:'none'} strokeWidth="3" strokeDasharray="6 8" vectorEffect="non-scaling-stroke"/></svg>
    {snapshot.rockets.filter(r=>r.playerId===playerId).map(r=><button key={r.id} className={`sky-rocket${r.selected?' sky-rocket--selected':''}${selected.length&&selected[0].color!==r.color?' sky-rocket--other':''}`} style={{left:`${r.x*100}%`,top:`${r.y*100}%`,'--rocket-color':colors[r.color]} as CSSProperties} aria-label={`${r.selected?'Tagged':'Tag'} ${symbols[r.color]} rocket ${r.id} for Player ${playerId}`} aria-pressed={r.selected} disabled={snapshot.phase!=='playing'||snapshot.elapsed-r.born<900||r.selected} onPointerDown={e=>e.stopPropagation()} onClick={()=>hit(playerId,r.x,r.y)}>
     <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" fill="none" stroke="var(--rocket-color)" strokeWidth="2" opacity=".7" pathLength="100" strokeDasharray={`${Math.max(0,(r.expires-snapshot.elapsed)/(r.expires-r.born)*100)} 100`} transform="rotate(-90 50 50)"/><g stroke="#303040" strokeWidth="3" strokeLinejoin="round"><path d="m26 72-9 16 20-5m36-11 9 16-20-5" fill="var(--rocket-color)"/><path d="M33 34h34v49H33Z" fill="var(--rocket-color)"/><path d="m28 35 22-26 23 26Z" fill="#fff1cd"/><path d="m38 37 18 44m-8-44 17 33" stroke="#fff8dd" opacity=".55"/><path d="m50 83-3 10 8 1" fill="none" stroke="#ffcf78"/></g><text x="50" y="65" textAnchor="middle" fill="#303040" fontSize="26">{['☀','◆','♥'][r.color]}</text></svg>
     {r.selected&&<span className="rocket-tag" aria-hidden="true">✓</span>}
    </button>)}
    <FireworksCanvas snapshot={snapshot} playerId={playerId} reduced={reduced}/>
    <button className={`rocket-switch${armed?' rocket-switch--armed':''}`} style={{'--rocket-color':selected.length?colors[selected[0].color]:'#f4e4c5'} as CSSProperties} disabled={!armed||snapshot.phase!=='playing'} aria-label={`Launch Player ${playerId} fireworks`} onPointerDown={e=>e.stopPropagation()} onClick={()=>hit(playerId,.5,.82)}><svg viewBox="0 0 140 90" aria-hidden="true"><path d="M68 18v47" stroke="#f8d992" strokeWidth="10"/><path d="M39 12h61v18H39Z" fill="var(--rocket-color)" stroke="#303040" strokeWidth="4"/><path d="m26 57 88-1 10 30H16Z" fill="#566b7b" stroke="#303040" strokeWidth="4"/><path d="m41 62 8 16m16-17 8 16m16-17 8 16" stroke="#f8d992" strokeWidth="6"/></svg><span>{armed?`${closing?'Launch now!':'BOOM!'} +${10*selected.length*selected.length}`:selected.length?'Tag one more':'Tag matching rockets'}</span></button>
    {snapshot.bursts.filter(b=>b.playerId===playerId&&b.points>0&&snapshot.elapsed>=b.at&&snapshot.elapsed-b.at<1400).map(b=><div className="rocket-cheer" key={b.id} style={{color:colors[b.color]}}>{b.size>=4?'SPECTACULAR!':b.size>=3?'BRILLIANT!':'BEAUTIFUL!'}<strong>+{b.points}</strong></div>)}
    {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.max(1,Math.ceil(snapshot.countdownRemainingMs/1000))}</strong><span>Tag a matching pair. Hit the switch!</span></div>}
   </div></section>
  })}</div>
  <div className="rocket-cue" role="status">{snapshot.finale?'✦ GRAND FINALE ✦':'Tag one colour · two or more · hit BOOM!'}<small>{snapshot.finale?'Build bigger chains for a sparkling finish':'☀ Sun · ◆ Diamond · ♥ Heart'}</small></div>
  {recovery.pauseDialog}
  {snapshot.phase==='results'&&<div className="battle-results rocket-results" role="dialog" aria-label="Rocket Rumble results"><p className="eyebrow">That was a show!</p><h2 ref={results} tabIndex={-1}>You lit up the sky</h2>{snapshot.scores.map(s=><p key={s.playerId}><strong>Player {s.playerId}: {s.score} points</strong><small>{snapshot.chains[s.playerId]} fireworks chains · biggest chain {snapshot.best[s.playerId]}</small></p>)}<ChallengeResult scores={snapshot.scores}/><button className="crayon-button crayon-button--primary" onClick={()=>{heard.current.clear();selectedBefore.current=0;launched.current=0;setSnapshot(model.start(performance.now()))}}>Play again</button><button className="text-button" onClick={onExit}>Back to games</button></div>}
 </section>
}
