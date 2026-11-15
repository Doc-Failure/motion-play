import { useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { InputFeedbackContext } from '../../game/InputFeedbackContext'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { gameAudio } from '../../audio/GameAudio'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { NinjaTrainingModel, type PaperNinja } from './NinjaTrainingModel'
import './dojo.css'

/** Original folded-paper puppet, articulated from simulation time rather than a static target icon. */
function NinjaPuppet({pose='leap',side=1,beat=0}: {pose?:PaperNinja['pose'];side?:number;beat?:number}) {
  const run=pose==='run',ready=pose==='ready',swing=Math.sin(beat/70)*28
  return <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
    <g transform={`translate(60 62) scale(${side===-1?1:-1} 1) translate(-60 -62)`} stroke="#292d39" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      <path d={`M67 41Q93 ${22+Math.sin(beat/100)*10} 111 42L89 48 108 60 72 52Z`} fill="var(--ninja-scarf,#f3c966)"/>
      <g transform={`rotate(${ready?22:run?swing:-38} 48 65)`}><path d="m47 63-20 8-13-12-7 8 18 20 28-11Z" fill="#477f8e"/></g>
      <g transform={`rotate(${ready?-38:run?-swing:38} 71 64)`}><path d="m70 59 17 3 12-18 9 5-12 28-22-1Z" fill="#477f8e"/></g>
      <g transform={`rotate(${ready?-20:run?swing:32} 49 84)`}><path d="m44 80-9 24-16 3 1 10 26-2 17-28Z" fill="#315967"/></g>
      <g transform={`rotate(${ready?22:run?-swing:-36} 67 85)`}><path d="m62 82 6 23 18 7-3 8-27-8-10-28Z" fill="#315967"/></g>
      <path d={ready?'M39 57 74 57 84 88 30 88Z':'M42 51 76 52 82 88 34 88Z'} fill="#5595a0"/>
      <path d="m42 53 17 17 17-18-5 35H49Z" fill="#ffffff15"/>
      <path d="m33 76 49 2-1 10-49-2Z" fill="var(--ninja-scarf,#f3c966)"/>
      <path d="m62 80 11 11-9 14-6-19" fill="var(--ninja-scarf,#f3c966)"/>
      <path d="m34 18 13-13 8 12 22-5 12 16-5 29-19 10-27-13-7-20Z" fill="#345c6b"/>
      <path d="m37 31 43-4 3 16-45 4Z" fill="#fff2c9"/>
      <path d="m46 36 8 1m13-3 7-2" strokeWidth="4"/>
      <path d="m36 15 10 9m26-11-5 11" stroke="#77b3ba"/>
      <path d="m40 56 10-3m15 6 9-6" stroke="#477f8e"/>
    </g>
  </svg>
}
function Tower({right=false}: {right?:boolean}) {
  return <svg className={`dojo-tower${right?' dojo-tower--right':''}`} viewBox="0 0 120 600" preserveAspectRatio="none" aria-hidden="true">
    <g fill="#e4ba82" stroke="#343642" strokeWidth="4" strokeLinejoin="round">
      <path d="M14 594 16 150 102 143 109 592Z"/>
      {[155,285,415].map(y=><g key={y}><path d={`M7 ${y}q50-42 108-6l-10 14-90 3Z`} fill="#507f83"/><path d={`m39 ${y+30} 39-1 2 67-42 2Z`} fill="#233942"/><path d={`m49 ${y+34} 3 59m12-59 2 59`} fill="none" stroke="#bb985d"/><path d={`M19 ${y+108}h85l6 12-98 3Z`} fill="#735c54"/></g>)}
      <path d="m10 145 45-61 58 54-17 13H23Z" fill="#507f83"/>
      <path d="m50 102 8-59 12 52" fill="#e4ba82"/>
    </g>
    <path d="m21 170 4 395m72-400 3 400M31 543l51-2m-49 17 47-2" fill="none" stroke="#f8dfa6" strokeWidth="3" opacity=".65"/>
  </svg>
}
export function NinjaTraining({playerCount,inputEvents=[],onExit,externalPauseReason,onReconnect}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void}) {
  const {aspectRatio=1}=useContext(InputFeedbackContext)
  const [model]=useState(()=>new NinjaTrainingModel({playerCount,aspectRatio}))
  const [snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
  const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Paper Dojo',externalPauseReason,onReconnect,onExit})
  const seenEffect=useRef(0),lastLaunch=useRef(0),wasBonus=useRef(false)
  const results=useRef<HTMLHeadingElement>(null)
  useEffect(()=>{model.setAspectRatio(aspectRatio)},[aspectRatio,model])
  useEffect(()=>{
    let frame=0,last=0
    const tick=(now:number)=>{if(now-last>=16){setSnapshot(model.update(now));last=now}frame=requestAnimationFrame(tick)}
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)
  },[model])
  useEffect(()=>{for(const event of inputEvents)setSnapshot(model.hit(event))},[inputEvents,model])
  useEffect(()=>{
    if(snapshot.phase!=='playing')return
    for(const effect of snapshot.effects) {
      if(effect.id<=seenEffect.current)continue
      if(effect.kind==='break'||effect.kind==='chip') gameAudio.play('crack','dojo')
      seenEffect.current=Math.max(seenEffect.current,effect.id)
    }
    const launched=snapshot.ninjas.filter(n=>n.pose==='leap').reduce((id,n)=>Math.max(id,n.id),0)
    if(launched>lastLaunch.current){gameAudio.play('swoosh','dojo');lastLaunch.current=launched}
    if(snapshot.bonus&&!wasBonus.current)gameAudio.play('combo','dojo')
    wasBonus.current=snapshot.bonus
  },[snapshot])
  useEffect(()=>{if(snapshot.phase==='results')results.current?.focus()},[snapshot.phase])
  const hitAt=(playerId:PlayerId,x:number,y:number)=>setSnapshot(model.hit({playerId,kind:'MOTION_HIT',x,y,confidence:1,timestamp:performance.now()}))
  const pointer=(id:PlayerId,event:PointerEvent<HTMLDivElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect()
    if(rect.width&&rect.height)hitAt(id,(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height)
  }
  const replay=()=>{seenEffect.current=lastLaunch.current=0;wasBonus.current=false;setSnapshot(model.start(performance.now()))}
  const best=Math.max(...snapshot.scores.map(s=>s.score))
  return <section className="dojo-game" aria-labelledby="dojo-title" data-phase={snapshot.phase}>
    <GameFeedback snapshot={snapshot} theme="dojo"/>
    <header className="bubble-game__header"><h1 id="dojo-title">Paper Dojo</h1><dl>{snapshot.scores.map(s=><div key={s.playerId}><dt>P{s.playerId}</dt><dd>{s.score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs/1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <div className={`dojo-wave${snapshot.bonus?' dojo-wave--bonus':''}`} role="status">{snapshot.bonus?`Bamboo burst! ${Math.ceil(snapshot.bonusRemainingMs/1000)}s`:`Wave ${snapshot.wave}`}<small>{snapshot.bonus?'Three quick strikes per bundle':'Swat the flying paper ninjas'}</small></div>
    <div className={`dojo-boards dojo-boards--${playerCount}`}>{snapshot.scores.map(({playerId})=><section className="dojo-player" key={playerId} aria-label={`Player ${playerId}`}>
      <h2>Player {playerId} <span>{snapshot.hits[playerId]} swats · {snapshot.misses[playerId]} through</span></h2>
      <div className="dojo-board" aria-label={`Player ${playerId} Paper Dojo play area`} onPointerDown={e=>pointer(playerId,e)}>
        <Tower/><Tower right/>
        <div className="dojo-center-mark" aria-hidden="true">守</div>
        {snapshot.ninjas.filter(n=>n.playerId===playerId).map(n=><button key={n.id} className={`dojo-ninja dojo-ninja--${n.pose}`} style={{left:`${n.x*100}%`,top:`${n.y*100}%`,'--ninja-scarf':['#f2c95d','#ee8e9f','#af9dd7'][n.level],'--tilt':`${n.pose==='leap'?n.side*(25-50*n.progress):0}deg`} as CSSProperties} aria-label={`Swat Player ${playerId} ninja ${n.id}`} disabled={snapshot.phase!=='playing'||n.pose!=='leap'} onPointerDown={e=>e.stopPropagation()} onClick={()=>hitAt(playerId,n.x,n.y)}><NinjaPuppet pose={n.pose} side={n.side} beat={snapshot.elapsed-n.born}/>{n.pose==='ready'&&<span className="dojo-warning" aria-hidden="true">!</span>}</button>)}
        {snapshot.bonus&&snapshot.planks[playerId]>0&&<button className="dojo-bamboo" aria-label={`Break Player ${playerId} bamboo`} disabled={snapshot.phase!=='playing'} onPointerDown={e=>e.stopPropagation()} onClick={()=>hitAt(playerId,.5,.55)}><svg viewBox="0 0 240 140" aria-hidden="true">{[0,1,2].map(i=><g key={i} className={i<snapshot.planks[playerId]?'':'dojo-bamboo--broken'}><path d={`M15 ${20+i*35} 222 ${15+i*35}l4 27-209 6Z`} fill="#d1b873" stroke="#3e4940" strokeWidth="4"/><path d={`m44 ${19+i*35} 1 27m119-30 2 27m-143-16 187-4`} stroke="#75844f" strokeWidth="4" fill="none"/></g>)}</svg><span>{snapshot.planks[playerId]} strikes left</span></button>}
        {snapshot.effects.filter(e=>e.playerId===playerId).map(effect=><div key={effect.id} className={`dojo-effect dojo-effect--${effect.kind}`} style={{left:`${effect.x*100}%`,top:`${effect.y*100}%`,'--away':effect.side===-1?'-1':'1'} as CSSProperties} aria-hidden="true">{effect.kind==='hit'?<><div className="dojo-tumble"><NinjaPuppet side={effect.side}/></div><b>POW!<small>+{effect.points}</small></b></>:effect.kind==='miss'?<b>WHOOPS!</b>:<b>{effect.kind==='break'?'CRACK!':'CHOP!'}</b>}{Array.from({length:6},(_,i)=><i key={i} style={{'--piece':i} as CSSProperties}/>)}</div>)}
        {snapshot.combos[playerId]>=2&&<div className="dojo-combo" aria-label={`Player ${playerId} combo`}>{snapshot.combos[playerId]}<small>IN A ROW</small>{snapshot.combos[playerId]>=5&&<span>×{Math.min(3,1+Math.floor((snapshot.combos[playerId]-1)/4))}</span>}</div>}
        {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.max(1,Math.ceil(snapshot.countdownRemainingMs/1000))}</strong><span>Hands up. Here they come!</span></div>}
      </div>
    </section>)}</div>
    <p className="dojo-rules">Swat before they reach the middle. +10 per ninja · streaks multiply points · missed attackers −5.</p>
    {recovery.pauseDialog}
    {snapshot.phase==='results'&&<div className="battle-results dojo-results" role="dialog" aria-label="Paper Dojo results"><p className="eyebrow">Training complete</p><h2 ref={results} tabIndex={-1}>{playerCount===1?'A paper-perfect finish!':`Top score: ${best}`}</h2><div className="battle-results__scores">{snapshot.scores.map(s=><p key={s.playerId}><strong>Player {s.playerId}</strong><span>{s.score} points</span><small>{snapshot.hits[s.playerId]} swats · best streak {snapshot.bestCombos[s.playerId]} · {snapshot.boards[s.playerId]} bundles</small></p>)}</div><button className="crayon-button crayon-button--primary" onClick={replay}>Play again</button><button className="text-button" onClick={onExit}>Back to games</button></div>}
  </section>
}
