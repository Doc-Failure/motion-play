import { RoundHud } from '../../game/RoundHud'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { useContext, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { InputFeedbackContext } from '../../game/InputFeedbackContext'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { gameAudio } from '../../audio/GameAudio'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { NinjaTrainingModel, type PaperNinja } from './NinjaTrainingModel'
import { DOJO_LEVELS, PLAYER_HEALTH } from './dojoRanks'
import './dojo.css'

const art = `${import.meta.env.BASE_URL}assets/minigames/paper-dojo/`

function NinjaPuppet({rank, pose='leap', side=1, hit=false}: {rank:string; pose?:PaperNinja['pose']; side?:number; hit?:boolean}) {
  const attack = pose === 'leap' || hit
  return <img data-sprite={hit ? 'hit' : attack ? 'attack' : pose} alt="" draggable={false}
    src={`${art}${rank}-${attack ? 'leap' : 'ready'}.webp`}
    style={{width:'100%',height:'100%',objectFit:'contain',transform:`scaleX(${side===-1?1:-1})`}}
    onError={e=>{const img=e.currentTarget; if(!img.src.endsWith('/ninja-attack.webp')) img.src=art+'ninja-attack.webp'}}/>
}
function Tower({rank,right=false}: {rank:string;right?:boolean}) {
  return <img className={`dojo-tower${right?' dojo-tower--right':''}`} alt="" draggable={false}
    src={`${art}${rank}-dojo.webp`}
    onError={e=>{const img=e.currentTarget; if(!img.src.endsWith('/watchtower.webp')) img.src=art+'watchtower.webp'}}/>
}
export function NinjaTraining({playerCount,inputEvents=[],onExit,externalPauseReason,onReconnect,onComplete}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}) {
  const {aspectRatio=1}=useContext(InputFeedbackContext)
  const challenge=useChallenge()
  const level=challenge?.level??1
  const pressure=challenge?.pressure??0
  const [model]=useState(()=>new NinjaTrainingModel({playerCount,aspectRatio,pressure,level,roundDurationMs:40000}))
  const [snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const completionSent=useRef(false)
 useEffect(()=>{if(snapshot.phase==='results'&&onComplete&&!completionSent.current){completionSent.current=true;onComplete(snapshot.scores)}else if(snapshot.phase==='countdown')completionSent.current=false},[snapshot,onComplete])
  const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Paper Dojo',externalPauseReason,onReconnect,onExit})
  const lastLaunch=useRef(0)
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
    const launched=snapshot.ninjas.filter(n=>n.pose==='leap').reduce((id,n)=>Math.max(id,n.id),0)
    if(launched>lastLaunch.current){gameAudio.play('swoosh','dojo');lastLaunch.current=launched}
  },[snapshot])
  useEffect(()=>{if(snapshot.phase==='results')results.current?.focus()},[snapshot.phase])
  const hitAt=(playerId:PlayerId,x:number,y:number)=>setSnapshot(model.hit({playerId,kind:'MOTION_HIT',x,y,confidence:1,timestamp:performance.now()}))
  const pointer=(id:PlayerId,event:PointerEvent<HTMLDivElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect()
    if(rect.width&&rect.height)hitAt(id,(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height)
  }
  const replay=()=>{lastLaunch.current=0;setSnapshot(model.start(performance.now()))}
  const best=Math.max(...snapshot.scores.map(s=>s.score))
  return <section className="dojo-game" aria-labelledby="dojo-title" data-phase={snapshot.phase} data-rank={model.rank.slug}>
    <GameFeedback contact={()=>snapshot.effects.at(-1)?.kind} regions={()=>snapshot.ninjas.map(n=>({...n,rx:.1*Math.min(1,1/aspectRatio),ry:.1*Math.min(1,aspectRatio)}))} snapshot={snapshot} theme="dojo"/>
    <RoundHud title="Paper Dojo" titleId="dojo-title" snapshot={snapshot} onExit={onExit} exitRef={recovery.exitButtonRef}/>
    <div className="dojo-wave" role="status">Level {level} · {model.rank.dojo}<small>{model.rank.name} · {model.rank.hits} {model.rank.hits===1?'hit':'hits'} · Wave {snapshot.wave}</small></div>
    <div className="dojo-scenery" aria-hidden="true"><Tower rank={model.rank.slug}/><Tower rank={model.rank.slug} right/></div>
    <div className={`dojo-boards dojo-boards--${playerCount}`}>{snapshot.scores.map(({playerId})=><section className="dojo-player" key={playerId} aria-label={`Player ${playerId}`}>
      <h2>Player {playerId}<span className="dojo-health">HP {snapshot.health[playerId]}/{PLAYER_HEALTH}
        <span role="meter" aria-label={`Player ${playerId} health`} aria-valuemin={0} aria-valuemax={PLAYER_HEALTH} aria-valuenow={snapshot.health[playerId]}
          style={{ display:'block', width:'clamp(3rem,8vw,6.5rem)', height:12, border:'2px solid #40313a', borderRadius:5, background:'#eadfcd', overflow:'hidden' }}>
          <span style={{ display:'block', width:`${100*snapshot.health[playerId]/PLAYER_HEALTH}%`, height:'100%', background:snapshot.health[playerId]<=2?'#dd654a':'#438e66' }}/>
        </span></span></h2>
      <div className="dojo-board" aria-label={`Player ${playerId} Paper Dojo play area`} onPointerDown={e=>pointer(playerId,e)}>
        {snapshot.health[playerId]===0 && snapshot.phase==='playing' && <span className="dojo-rest">Training complete</span>}
        {snapshot.ninjas.filter(n=>n.playerId===playerId).map(n=><button key={n.id} className={`dojo-ninja dojo-ninja--${n.pose}`} style={{left:`${n.x*100}%`,top:`${n.y*100}%`,'--tilt':`${n.pose==='leap'?n.side*(25-50*n.progress):0}deg`} as CSSProperties} aria-label={`Swat Player ${playerId} ninja ${n.id}`} disabled={snapshot.phase!=='playing'||n.pose!=='leap'} onPointerDown={e=>e.stopPropagation()} onClick={()=>hitAt(playerId,n.x,n.y)}><NinjaPuppet rank={model.rank.slug} pose={n.pose} side={n.side}/>
          {model.rank.hits>1 && <span className="dojo-armor" aria-label={`${n.hp} hits remaining`}>{'●'.repeat(n.hp)}{'○'.repeat(model.rank.hits-n.hp)}</span>}{n.pose==='ready'&&<span className="dojo-warning" aria-hidden="true">!</span>}</button>)}
        {snapshot.obstacles.filter(o=>o.playerId===playerId).map(o=><button key={o.id} className={`dojo-obstacle${o.active?' dojo-obstacle--active':''}${o.struck?' dojo-obstacle--struck':''}`} style={{left:`${o.x*100}%`,top:`${o.y*100}%`}} aria-label={`Player ${playerId} obstacle: ${o.struck?'bumped':o.active?'avoid':'warning'}`} disabled={snapshot.phase!=='playing'||!o.active||o.struck} onPointerDown={e=>e.stopPropagation()} onClick={()=>hitAt(playerId,o.x,o.y)}><svg viewBox="0 0 100 100" aria-hidden="true"><path d="m50 4 12 23 26-14-10 28 19 10-23 12 13 25-27-11-10 20-12-22-25 14 10-28L4 50l23-12-13-25 27 11Z" fill="#f5c847" stroke="#713d42" strokeWidth="4"/><path d="m35 35 30 30m0-30L35 65" stroke="#713d42" strokeWidth="9" strokeLinecap="round"/></svg><span>{o.struck?'Bump −10':o.active?'Avoid!':'Watch out…'}</span></button>)}

        {snapshot.effects.filter(e=>e.playerId===playerId).map(effect=><div key={effect.id} className={`dojo-effect dojo-effect--${effect.kind}`} style={{left:`${effect.x*100}%`,top:`${effect.y*100}%`,'--away':effect.side===-1?'-1':'1'} as CSSProperties} aria-hidden="true">{effect.kind==='hit'?<><div className="dojo-tumble"><NinjaPuppet rank={model.rank.slug} side={effect.side} hit/></div><b>POW!<small>+{effect.points}</small></b></>:effect.kind==='armor'?<span style={{position:'absolute',right:0,top:0,padding:'0 .35em',background:'#ffe69c',borderRadius:5}}>Hit!</span>:effect.kind==='miss'?<b>WHOOPS!</b>:<b>BUMP!<small>−10</small></b>}{effect.kind!=='armor'&&Array.from({length:6},(_,i)=><i key={i} style={{'--piece':i} as CSSProperties}/>)}</div>)}
        {snapshot.combos[playerId]>=2&&<div key={snapshot.combos[playerId]} className="dojo-combo" aria-label={`Player ${playerId} combo`}>{snapshot.combos[playerId]}<small>IN A ROW</small>{snapshot.combos[playerId]>=5&&<span>×{Math.min(3,1+Math.floor((snapshot.combos[playerId]-1)/4))}</span>}</div>}
        {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.max(1,Math.ceil(snapshot.countdownRemainingMs/1000))}</strong><span>Hands up. Here they come!</span></div>}
      </div>
    </section>)}</div>
    {recovery.pauseDialog}
    {snapshot.phase==='results'&&<div className="battle-results dojo-results" role="dialog" aria-label="Paper Dojo results"><p className="eyebrow">Level {level} · {model.rank.dojo}</p><h2 ref={results} tabIndex={-1}>{playerCount===1?'Training round complete!':`Top score: ${best}`}</h2><div className="battle-results__scores">{snapshot.scores.map(s=><p key={s.playerId}><strong>Player {s.playerId}</strong><span>{s.score} points</span><small>{snapshot.health[s.playerId]}/{PLAYER_HEALTH} HP · {snapshot.hits[s.playerId]} defeated · {snapshot.misses[s.playerId]} missed · best streak {snapshot.bestCombos[s.playerId]} · {snapshot.contacts[s.playerId]} bumps</small></p>)}</div><ChallengeResult scores={snapshot.scores} finalLevel={DOJO_LEVELS}/><div className="result-actions"><button className="crayon-button crayon-button--primary" onClick={replay}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}
  </section>
}
