import {useContext,useEffect,useRef,useState} from 'react'
import {InputFeedbackContext} from '../../game/InputFeedbackContext'
import {GameFeedback} from '../../game/GameFeedback'
import {KeyboardPlayArea} from '../../game/KeyboardPlayArea'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import {gameAudio} from '../../audio/GameAudio'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import {SportsModel,rallyLabel,type Sport} from './SportsModel'
import {drawSports} from './drawSports'
export function CameraSport({mode,playerCount,inputEvents=[],onExit,externalPauseReason,onReconnect}:RoundRecoveryProps&{mode:Sport;playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void}){
 const title=mode==='keeper'?'Goalkeeper':'Net Rally',{aspectRatio=4/3}=useContext(InputFeedbackContext)
 const [model]=useState(()=>new SportsModel(mode,playerCount,aspectRatio*playerCount)),[s,setS]=useState(()=>model.start(performance.now())),ref=useRef<HTMLCanvasElement>(null),heard=useRef(0)
 const recovery=useRoundRecovery({model,snapshot:s,setSnapshot:setS,title,externalPauseReason,onReconnect,onExit})
 useEffect(()=>model.setAspectRatio(aspectRatio*playerCount),[model,aspectRatio,playerCount])
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setS(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>model.input(inputEvents),[model,inputEvents])
 useEffect(()=>{const canvas=ref.current;if(!canvas)return;const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);if(!r.width||!r.height)return
  if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d)}const c=canvas.getContext('2d');if(c){c.setTransform(d,0,0,d,0,0);drawSports(c,s,r.width,r.height,playerCount,matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion'))}
 },[s,playerCount])
 useEffect(()=>{if(s.phase!=='playing'||s.serial<=heard.current)return;heard.current=s.serial;if(s.elapsed-s.cueTime>200)return;gameAudio.play(s.cue==='save'?'combo':s.cue==='point'?'score':s.cue==='goal'?'miss':s.cue==='kick'?'swoosh':'tag')},[s])
 const act=(x:number,y:number)=>{const lane=Math.min(playerCount-1,Math.floor(x*playerCount));model.input([{playerId:(lane+1) as PlayerId,kind:'BODY_MOVE',x:x*playerCount-lane,y,timestamp:performance.now(),confidence:1,pointerId:'simulation'}])}
 const winners=s.scores.filter(p=>p.score===Math.max(...s.scores.map(v=>v.score)))
 return <section className="sport-game" data-mode={mode} data-phase={s.phase} aria-label={title}><GameFeedback snapshot={s} musicPaused scoreFeedback={false}/><header className="bubble-game__header"><h1>{title}</h1><dl aria-label={mode==='net'?'Match score':'Player scores'}>{mode==='net'?s.teams.map((score,side)=><div key={side}><dt>{rallyLabel(side,playerCount)}</dt><dd>{score}</dd></div>):s.scores.map(p=><div key={p.playerId}><dt>P{p.playerId}</dt><dd>{p.score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(s.roundRemainingMs/1000)}s</dd></div></dl><button ref={recovery.exitButtonRef} className="text-button" onClick={onExit}>Exit game</button></header>
 <div className="sport-boards" style={{gridTemplateColumns:'1fr'}}><section><KeyboardPlayArea enabled={s.phase==='playing'} onAction={act} aria-label={`${title} play area`} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();act((e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height)}}><canvas ref={ref} aria-label={mode==='keeper'?'Incoming footballs and goal':'Volleyball court and net'} data-state={JSON.stringify(s)} style={{width:'100%',height:'100%',pointerEvents:'none'}}/></KeyboardPlayArea></section></div>
 <p role="status">{mode==='keeper'?'Watch the kicker. Block the ball with your hands or body before it gets past you!':playerCount===1?'Stand on the LEFT. Bump the ball over the net. First to five!':playerCount===2?'1 vs 1 · P1 left, P2 right. Hit up and across. First to five!':'Left team versus right team. Hit up and across. First to five!'}</p>
 {s.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(s.countdownRemainingMs/1000)}</strong></div>}{recovery.pauseDialog}
 {s.phase==='results'&&<div className="battle-results" role="dialog" aria-label={`${title} results`}><h2 ref={recovery.resultsHeading} tabIndex={-1}>{mode==='net'?s.teams[0]===s.teams[1]?'Draw!':s.teams[0]>s.teams[1]?`${rallyLabel(0,playerCount)} wins!`:playerCount===1?'Robot wins!':`${rallyLabel(1,playerCount)} wins!`:playerCount===1?'Final whistle!':winners.length>1?'It’s a tie!':`Player ${winners[0].playerId} wins!`}</h2>{mode==='net'&&<p>{s.teams[0]} — {s.teams[1]}</p>}{s.scores.map(p=><p key={p.playerId}>Player {p.playerId}: {p.score} points{mode==='keeper'?` · ${s.shots[p.playerId-1].saves} saves`:''}</p>)}<div className="result-actions"><button className="crayon-button" onClick={()=>{heard.current=0;setS(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}</section>
}
