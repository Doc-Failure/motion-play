import { RoundHud } from '../../game/RoundHud'
import {keeperInstructions,rallyInstructions} from './rallyFormation'
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
import {SportsModel,keeperGoalLimit,rallyLabel,type Sport} from './SportsModel'
import {drawSports} from './drawSports'
export function CameraSport({mode,playerCount,inputEvents=[],onExit,externalPauseReason,onReconnect}:RoundRecoveryProps&{mode:Sport;playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void}){
 const title=mode==='keeper'?'Goalkeeper':'Net Rally',{aspectRatio=4/3}=useContext(InputFeedbackContext)
 const pressure=useChallenge()?.pressure??0
 const [model]=useState(()=>new SportsModel(mode,playerCount,aspectRatio*playerCount,undefined,pressure)),[s,setS]=useState(()=>model.start(performance.now())),ref=useRef<HTMLCanvasElement>(null),heard=useRef(0)
 const recovery=useRoundRecovery({model,snapshot:s,setSnapshot:setS,title,externalPauseReason,onReconnect,onExit})
 useEffect(()=>model.setAspectRatio(aspectRatio*playerCount),[model,aspectRatio,playerCount])
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setS(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>model.input(inputEvents),[model,inputEvents])
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(!r.width||!r.height)return
  if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}const c=canvas.getContext('2d');if(c){c.setTransform(d,0,0,d,0,0);drawSports(c,s,r.width,r.height,playerCount,matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'))}
 },[s,playerCount])
 useEffect(()=>{if(s.phase!=='playing'||s.serial<=heard.current)return;heard.current=s.serial;if(s.elapsed-s.cueTime>200)return;gameAudio.play(s.cue==='save'?'combo':s.cue==='point'?'score':s.cue==='goal'?'miss':s.cue==='kick'?'swoosh':'tag')},[s])
 const act=(x:number,y:number)=>{const lane=Math.min(playerCount-1,Math.floor(x*playerCount));model.input([{playerId:(lane+1) as PlayerId,kind:'BODY_MOVE',x:x*playerCount-lane,y,timestamp:performance.now(),confidence:1,pointerId:'simulation'}])}
 const goals=s.shots.reduce((n,shot)=>n+shot.goals,0)
 const saves=s.shots.reduce((n,shot)=>n+shot.saves,0)
 const goalsLeft=keeperGoalLimit(playerCount)-goals
 const trio=mode==='net'&&playerCount===3
 const winningSide=s.teams[0]>s.teams[1]?0:1
 let outcome=playerCount===1?'Final whistle!':'Team defence complete!'
 if(trio)outcome=s.returns===5?'Five returns!':'Team rally complete!'
 else if(mode==='net'){
  outcome=s.teams[0]===s.teams[1]?'Draw!':`${rallyLabel(winningSide,playerCount)} wins!`
  if(playerCount===1&&s.teams[1]>s.teams[0])outcome='Robot wins!'
 }
 return <section className="sport-game" data-mode={mode} data-phase={s.phase} aria-label={title}>
 <GameFeedback snapshot={s} musicPaused scoreFeedback={false} contact={()=>s.elapsed-s.cueTime<700?s.cue:null}
   regions={()=>mode==='keeper'?s.shots.filter(b=>b.state==='incoming'&&b.progress>=.4).map(b=>({...b,rx:.075/aspectRatio,ry:.075})):[{...s.ball,rx:.035/(aspectRatio*playerCount),ry:.035}]}/>
 <RoundHud title={title} snapshot={s} onExit={onExit} exitRef={recovery.exitButtonRef} scoreLabel={mode==='net'?'Match score':'Player scores'}>
  {trio&&<div><dt>Team returns</dt><dd>{s.returns}/5</dd></div>}
  {mode==='net'&&!trio&&s.teams.map((score,side)=><div key={side}><dt>{rallyLabel(side,playerCount)}</dt><dd>{score}</dd></div>)}
  {mode==='keeper'&&s.scores.map(p=><div key={p.playerId}><dt>P{p.playerId}</dt><dd>{p.score}</dd>
   {playerCount===1&&<span className="keeper-lives" aria-label={`Player 1: ${goalsLeft} goals remaining`}>♥{goalsLeft}</span>}</div>)}
  {mode==='keeper'&&playerCount>1&&<div><dt>Team</dt><dd>{s.scores.reduce((n,p)=>n+p.score,0)}</dd>
   <span className="keeper-lives" aria-label={`Team: ${goalsLeft} goals remaining`}>♥{goalsLeft}</span></div>}</RoundHud>
 <div className="sport-boards" style={{gridTemplateColumns:'1fr'}}><section><KeyboardPlayArea enabled={s.phase==='playing'} onAction={act} aria-label={`${title} play area`} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();act((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}}><canvas ref={ref} aria-label={mode==='keeper'?'Incoming footballs and goal':'Volleyball court and net'} data-state={JSON.stringify(s)} style={{width:'100%',height:'100%',pointerEvents:'none'}}/></KeyboardPlayArea></section></div>
 <p role="status">{mode==='keeper'?keeperInstructions(playerCount):rallyInstructions(playerCount)}</p>
 {s.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(s.countdownRemainingMs/1000)}</strong></div>}{recovery.pauseDialog}
 {s.phase==='results'&&<div className="battle-results" role="dialog" aria-label={`${title} results`}><h2 ref={recovery.resultsHeading} tabIndex={-1}>{outcome}</h2>
 {mode==='keeper'&&playerCount>1&&<p>{saves} team saves · {goals} conceded</p>}
 {trio&&<p>{s.returns} of 5 team returns</p>}{mode==='net'&&!trio&&<p>{s.teams[0]} — {s.teams[1]}</p>}{s.scores.map(p=><p key={p.playerId}>Player {p.playerId}: {p.score} points{mode==='keeper'?` · ${s.shots[p.playerId-1].saves} saves · best streak ${s.shots[p.playerId-1].best}${s.shots[p.playerId-1].saves?` · average save ${Math.round(s.shots[p.playerId-1].saveDelayMs/s.shots[p.playerId-1].saves)} ms into the save window`:''}`:''}</p>)}<ChallengeResult scores={s.scores}/><div className="result-actions"><button className="crayon-button" onClick={()=>{heard.current=0;setS(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}</section>
}
