import { NinjaPuppet, type NinjaPose } from './NinjaPuppet'
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
import { DOJO_LEVELS, ONI_REPEL_HITS, PLAYER_HEALTH } from './dojoRanks'
import './dojo.css'

const art = `${import.meta.env.BASE_URL}assets/minigames/paper-dojo/`

function activePose(ninja: PaperNinja, elapsed: number, reduced: boolean): NinjaPose {
  const sinceHit = elapsed - ninja.lastSwat
  if (sinceHit >= 320) return ninja.chargeHits>=ONI_REPEL_HITS?'stagger':ninja.pose
  return !reduced && sinceHit >= 150 ? 'stagger' : 'recoil'
}

function LaunchBurst({ninja, reduced}: {ninja:PaperNinja; reduced:boolean}) {
  const age = ninja.progress * ninja.flightMs
  if (reduced || ninja.pose !== 'leap' || age >= 340) return null
  const progress = age / 340
  return <span className="dojo-launch-burst" aria-hidden="true" style={{
    left: ninja.side === -1 ? '4%' : '96%',
    scale: .55 + progress * 1.05,
    opacity: Math.min(1, (1-progress)*2),
    rotate: `${ninja.side * progress * 24}deg`,
  }}/>
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
    const launched=snapshot.ninjas.filter(n=>n.pose==='leap').reduce((latest,n)=>Math.max(latest,n.born+1),0)
    if(launched>lastLaunch.current){gameAudio.play('swoosh','dojo');lastLaunch.current=launched}
  },[snapshot])
  useEffect(()=>{if(snapshot.phase==='results')results.current?.focus()},[snapshot.phase])
  const hitAt=(playerId:PlayerId,x:number,y:number)=>setSnapshot(model.hit({playerId,kind:'MOTION_HIT',x,y,confidence:1,timestamp:performance.now()}))
  const pointer=(id:PlayerId,event:PointerEvent<HTMLDivElement>)=>{
    const rect=event.currentTarget.getBoundingClientRect()
    if(rect.width&&rect.height)hitAt(id,(event.clientX-rect.left)/rect.width,(event.clientY-rect.top)/rect.height)
  }
  const replay=()=>{lastLaunch.current=0;setSnapshot(model.start(performance.now()))}
  const reduced = document.documentElement.classList.contains('reduce-motion') || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const scenery=model.boss?'violet':model.rank.slug
  const bossDefeated=snapshot.scores.some(({playerId})=>snapshot.hits[playerId]>0)
  const best=Math.max(...snapshot.scores.map(s=>s.score))
  return <section className="dojo-game" aria-labelledby="dojo-title" data-phase={snapshot.phase} data-rank={model.rank.slug}>
    <GameFeedback contact={()=>snapshot.effects.at(-1)?.kind} regions={()=>snapshot.ninjas.map(n=>({...n,rx:model.radius*Math.min(1.5,1/aspectRatio),ry:model.radius*Math.min(1,1.5*aspectRatio)}))} snapshot={snapshot} theme="dojo" showScoreBursts={false}/>
    <RoundHud title="Paper Dojo" titleId="dojo-title" snapshot={snapshot} onExit={onExit} exitRef={recovery.exitButtonRef}>
      {snapshot.scores.map(({playerId, score}) => {
        const hp = snapshot.health[playerId]
        const hurt = snapshot.effects.some(e => e.playerId === playerId && e.kind === 'miss')
        return <div key={playerId}><dt>P{playerId} <span className="dojo-life" data-hurt={hurt} role="meter" aria-label={`Player ${playerId} health`}
          aria-valuemin={0} aria-valuemax={PLAYER_HEALTH} aria-valuenow={hp} aria-valuetext={`${hp} of ${PLAYER_HEALTH} hearts`} style={{'--life':`${100*hp/PLAYER_HEALTH}%`} as CSSProperties}>
          {'♥'.repeat(hp)}{'♡'.repeat(PLAYER_HEALTH-hp)}
        </span></dt><dd>{score}</dd></div>
      })}
    </RoundHud>
    <div className="dojo-wave" role="status">Level {level} · {model.rank.dojo}<small>{model.rank.name} · {model.rank.hits} {model.rank.hits===1?'hit':'hits'} · {model.boss?`${ONI_REPEL_HITS} swats repel a charge`:`Wave ${snapshot.wave}`}</small></div>
    <div className="dojo-scenery" aria-hidden="true"><Tower rank={scenery}/><Tower rank={scenery} right/></div>
    <div className={`dojo-boards dojo-boards--${playerCount}`}>{snapshot.scores.map(({playerId})=><section className="dojo-player" key={playerId} aria-label={`Player ${playerId}`}>
      <h2>Player {playerId}{snapshot.combos[playerId]>=2 && <small> · {snapshot.combos[playerId]} in a row</small>}</h2>
      <div className="dojo-board" aria-label={`Player ${playerId} Paper Dojo play area`} onPointerDown={e=>pointer(playerId,e)}>
        {snapshot.health[playerId]===0 && snapshot.phase==='playing' && <span className="dojo-rest">Training complete</span>}
        {model.boss && snapshot.hits[playerId]>0 && snapshot.phase==='playing' && !snapshot.effects.some(e=>e.playerId===playerId && e.kind==='hit') && <span className="dojo-rest">Boss defeated!</span>}
        {snapshot.ninjas.filter(n=>n.playerId===playerId).map(n=><button key={n.id}
          className={`dojo-ninja dojo-ninja--${n.pose}`} style={{left:`${n.x*100}%`,top:`${n.y*100}%`}}
          aria-label={model.boss?`Swat Player ${playerId} Thunder Oni`:`Swat Player ${playerId} ninja ${n.id}`} aria-describedby={`dojo-hp-${n.id}`}
          disabled={snapshot.phase!=='playing'||n.pose!=='leap'} onPointerDown={e=>e.stopPropagation()} onClick={()=>hitAt(playerId,n.x,n.y)}>
          <LaunchBurst ninja={n} reduced={reduced}/>
          <NinjaPuppet rank={model.rank.slug} pose={activePose(n,snapshot.elapsed,reduced)} side={n.side}
            flightFrame={reduced ? 1 : Math.min(2,Math.floor(n.progress*3))}/>
          <svg className="dojo-hp-ring" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="48" pathLength="100" strokeDasharray={`${100*n.hp/model.rank.hits} 100`}/>
          </svg>
          <span className="sr-only" id={`dojo-hp-${n.id}`}>{n.hp} of {model.rank.hits} health remaining</span>
        </button>)}
        {snapshot.effects.filter(e=>e.playerId===playerId && e.kind==='hit').map(effect=><div key={effect.id}
          className="dojo-effect dojo-effect--hit" style={{left:`${effect.x*100}%`,top:`${effect.y*100}%`}} aria-hidden="true">
          <NinjaPuppet rank={model.rank.slug} side={effect.side} pose={reduced || snapshot.elapsed-effect.born>=400?'defeated':snapshot.elapsed-effect.born>=150?'stagger':'recoil'}/>
        </div>)}
        {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.max(1,Math.ceil(snapshot.countdownRemainingMs/1000))}</strong><span>{model.boss?`Boss battle! Land ${ONI_REPEL_HITS} swats to repel each charge.`:'Hands up. Here they come!'}</span></div>}
      </div>
    </section>)}</div>
    {recovery.pauseDialog}
    {snapshot.phase==='results'&&<div className="battle-results dojo-results" role="dialog" aria-label="Paper Dojo results"><p className="eyebrow">Level {level} · {model.rank.dojo}</p><h2 ref={results} tabIndex={-1}>{model.boss?(bossDefeated?'Thunder Oni defeated!':'Thunder Oni held the gate!'):playerCount===1?'Training round complete!':`Top score: ${best}`}</h2><div className="battle-results__scores">{snapshot.scores.map(s=><p key={s.playerId}><strong>Player {s.playerId}</strong><span>{s.score} points</span><small>{snapshot.health[s.playerId]}/{PLAYER_HEALTH} HP · {model.boss?(snapshot.hits[s.playerId]?'Boss defeated':'Boss survived'):`${snapshot.hits[s.playerId]} defeated`} · {snapshot.misses[s.playerId]} missed · best streak {snapshot.bestCombos[s.playerId]}</small></p>)}</div><ChallengeResult scores={snapshot.scores} finalLevel={DOJO_LEVELS}/><div className="result-actions"><button className="crayon-button crayon-button--primary" onClick={replay}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}
  </section>
}
