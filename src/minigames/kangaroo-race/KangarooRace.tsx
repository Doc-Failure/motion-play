import {useEffect,useRef,useState} from 'react'
import {Kangaroo} from '../jump-rush/Kangaroo'
import {GameFeedback} from '../../game/GameFeedback'
import {gameAudio} from '../../audio/GameAudio'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import {RaceModel,obstacleTypes} from './RaceModel'
import './race.css'
const colors=['#74d6df','#ed9ba5','#bfa5e7','#a5d88b']
export function KangarooRace({playerCount,inputEvents=[],onExit,externalPauseReason,onReconnect}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void}){
 const [model]=useState(()=>new RaceModel(playerCount)),[s,setS]=useState(()=>model.start(performance.now())),heard=useRef(new Map<number,number>())
 const recovery=useRoundRecovery({model,snapshot:s,setSnapshot:setS,title:'Kangaroo Race',externalPauseReason,onReconnect,onExit})
 useEffect(()=>{let frame=0;const tick=(t:number)=>{setS(model.update(t));frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{for(const e of inputEvents)setS(model.moveBody(e))},[model,inputEvents])
 useEffect(()=>{if(s.phase!=='playing')return;const cues=new Set<string>();for(const r of s.racers)if(r.serial>(heard.current.get(r.playerId)??0)){heard.current.set(r.playerId,r.serial);if(s.elapsed-r.cueAt<150&&r.cue)cues.add(r.cue)}if(cues.has('bump'))gameAudio.play('crack','dojo');else if(cues.has('clear'))gameAudio.play('combo');else if(cues.has('jump'))gameAudio.play('swoosh')},[s])
 const move=(playerId:PlayerId,y:number)=>setS(model.moveBody({playerId,kind:'BODY_MOVE',x:.5,y,confidence:1,timestamp:performance.now()}))
 const leader=Math.max(0,...s.scores.map(p=>p.score)),winners=s.scores.filter(p=>p.score===leader)
 return <section className="race-game" data-phase={s.phase} aria-label="Kangaroo Race"><GameFeedback snapshot={s} scoreFeedback={false}/><header className="bubble-game__header"><h1>Kangaroo Race</h1><dl>{s.scores.map(p=><div key={p.playerId}><dt>P{p.playerId}</dt><dd>{p.score}m</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(s.roundRemainingMs/1000)}s</dd></div></dl><button ref={recovery.exitButtonRef} className="text-button" onClick={onExit}>Exit game</button></header>
 <div className="race-track" data-racers={JSON.stringify(s.racers)}>{s.racers.map(r=>{const ground=25+r.playerId*(58/playerCount),x=15+(r.distance/Math.max(80,leader))*30,obstacle=x+(r.next-r.distance)*2.2,type=obstacleTypes[r.obstacle%3],soon=(r.next-r.distance)/(8+s.elapsed/45000*4)<.5
 return <div key={r.playerId} className="race-lane" role="group" tabIndex={0} aria-label={`Player ${r.playerId} Kangaroo Race play area`} style={{top:`${ground-58/playerCount}%`,height:`${58/playerCount}%`}} onKeyDown={e=>{if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();move(r.playerId,e.key==='ArrowDown'?.7:.45)}}} onPointerMove={e=>{const b=e.currentTarget.getBoundingClientRect();move(r.playerId,Math.max(0,Math.min(1,(e.clientY-b.top)/b.height)))}}>
  <div className="race-ground" style={{borderColor:colors[r.playerId-1]}}/>
  <span className="race-player-label" style={{color:colors[r.playerId-1]}}>P{r.playerId} · {Math.max(0,3-r.hits)} ♥ · {Math.floor(r.distance)}m</span>
  <div className="race-roo" style={{left:`${x}%`,transform:`translateY(${-r.height*85}%) rotate(${s.elapsed<r.stunUntil?-12:0}deg)`}}><Kangaroo player={r.playerId} height={r.height}/></div>
  {r.hits<3&&<div className={`race-obstacle race-obstacle--${type}`} style={{left:`${obstacle}%`}} aria-label={`${type} ahead`}>{type==='log'?<svg viewBox="0 0 80 40"><path d="M13 6h52v29H13Z" fill="#ad794d"/><ellipse cx="65" cy="20" rx="12" ry="15" fill="#efd1a1"/><path d="M20 14h30m-30 12h23m22-16c-12 0-12 22 0 22" fill="none"/></svg>:type==='rock'?<svg viewBox="0 0 80 55"><path d="m4 49 15-33 30-9 27 41Z" fill="#a6b5c4"/><path d="m19 16 16 20 14-29m-14 29 41 12" fill="none"/></svg>:<svg viewBox="0 0 80 35"><ellipse cx="40" cy="18" rx="36" ry="12" fill="#29313c"/><path d="M4 18 16 7m48 0 12 11" fill="none"/></svg>}</div>}
  <span className="race-cue">{r.hits>=3?'Finished':!r.tracked?'Stand tall in view':s.elapsed<r.stunUntil?'Oops!':soon?'JUMP!':s.elapsed-r.cueAt<700&&r.cue==='clear'?'Nice jump!':''}</span>
 </div>})}</div>
 <p role="status">Jump to clear obstacles. Three bumps end your run. Farthest distance wins!</p>
 {s.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(s.countdownRemainingMs/1000)}</strong></div>}{recovery.pauseDialog}
 {s.phase==='results'&&<div className="battle-results" role="dialog" aria-label="Kangaroo Race results"><h2 ref={recovery.resultsHeading} tabIndex={-1}>{playerCount===1?'What a run!':winners.length>1?'It’s a tie!':`Player ${winners[0].playerId} wins!`}</h2>{s.scores.map(p=><p key={p.playerId}>Player {p.playerId}: {p.score}m · {s.racers[p.playerId-1].cleared} cleared</p>)}<div className="result-actions"><button className="crayon-button" onClick={()=>{heard.current.clear();setS(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}</section>
}
