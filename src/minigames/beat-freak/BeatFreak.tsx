import {useContext,useEffect,useRef,useState,type CSSProperties} from 'react'
import {gameAudio} from '../../audio/GameAudio'
import {GameFeedback} from '../../game/GameFeedback'
import {KeyboardPlayArea} from '../../game/KeyboardPlayArea'
import {InputFeedbackContext} from '../../game/InputFeedbackContext'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import {BeatModel,beatPads,BEAT_MS,LEAD_MS} from './BeatModel'
import {BeatScheduler} from './BeatScheduler'
import './beat.css'

function Speaker({pad}:{pad:number}){return <svg viewBox="0 0 120 120" aria-hidden="true"><g stroke="#343346" strokeWidth="3" strokeLinejoin="round"><path d="m11 14 96-4 5 98-99 4Z" fill="var(--pad-color)"/><path d="m18 21 81-3 4 83-83 3Z" fill="#343346"/><circle cx="61" cy="66" r="29" fill="#f9efda"/><circle className="beat-speaker__cone" cx="61" cy="66" r="20" fill="var(--pad-color)"/><circle cx="61" cy="66" r="8" fill="#343346"/><path d="m35 29 47-1" stroke="#fff6d9" strokeWidth="4"/><circle cx="23" cy="19" r="2" fill="#fff6d9"/><circle cx="103" cy="104" r="2" fill="#fff6d9"/></g><text x="61" y="71" textAnchor="middle" fontSize="17" fill="#fff6d9">{pad+1}</text></svg>}
function Record(){return <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="43" fill="#343346" stroke="#fff3d5" strokeWidth="4"/><circle cx="50" cy="50" r="32" fill="none" stroke="var(--pad-color)" strokeWidth="2"/><circle cx="50" cy="50" r="20" fill="var(--pad-color)"/><circle cx="50" cy="50" r="5" fill="#fff3d5"/><path d="m25 23 9-5m42 57-9 5" stroke="#fff3d5" strokeWidth="3" strokeLinecap="round"/></svg>}
export function BeatFreak({playerCount,inputEvents=[],onExit,onComplete,externalPauseReason,onReconnect}:RoundRecoveryProps&{playerCount:PlayerCount;inputEvents?:MotionInputEvent[];onExit():void;onComplete?:(scores:{playerId:PlayerId;score:number}[])=>void}){
 const {aspectRatio=16/9}=useContext(InputFeedbackContext)
 const [model]=useState(()=>new BeatModel({playerCount,aspectRatio}))
 const [snapshot,setSnapshot]=useState(()=>model.start(performance.now()))
 const heard=useRef(0),completion=useRef(false),scheduler=useRef(new BeatScheduler())
 const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Paper Jam',externalPauseReason,onReconnect,onExit})
 useEffect(()=>{model.setAspectRatio(aspectRatio)},[model,aspectRatio])
 useEffect(()=>{let frame=0,last=-Infinity;const tick=(now:number)=>{if(now-last>=16){setSnapshot(model.update(now));last=now}frame=requestAnimationFrame(tick)};frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)},[model])
 useEffect(()=>{for(const event of inputEvents)setSnapshot(model.hit(event))},[model,inputEvents])
 useEffect(()=>{
  const clockScheduler=scheduler.current;clockScheduler.reset();if(snapshot.phase!=='playing')return
  const tick=()=>{const clock=model.playbackAt(performance.now());if(clock.phase==='playing')clockScheduler.pump(clock.elapsed,clock.duration,(step,delay)=>gameAudio.rhythmStep(step,delay))}
  tick();const timer=setInterval(tick,25);return()=>{clearInterval(timer);clockScheduler.reset()}
 },[model,snapshot.phase])
 useEffect(()=>{
  if(snapshot.phase!=='playing')return
  for(const judgment of snapshot.judgments){
   if(judgment.id<=heard.current)continue
   if(judgment.kind==='perfect'||judgment.kind==='good')gameAudio.rhythmStrike(judgment.pad,judgment.kind==='perfect')
   else if(judgment.kind==='combo')gameAudio.play('combo','beat')
   heard.current=judgment.id
  }
 },[snapshot])
 useEffect(()=>{if(snapshot.phase==='results'&&onComplete&&!completion.current){completion.current=true;onComplete(snapshot.scores)}else if(snapshot.phase==='countdown')completion.current=false},[snapshot,onComplete])
 const hit=(id:PlayerId,x:number,y:number)=>setSnapshot(model.hit({playerId:id,kind:'MOTION_HIT',x,y,timestamp:performance.now(),confidence:1}))
 const replay=()=>{heard.current=0;setSnapshot(model.start(performance.now()))}
 const pulse=Math.max(0,1-(snapshot.elapsed%BEAT_MS)/220)
 return <section className="beat-game" data-phase={snapshot.phase} data-elapsed={Math.round(snapshot.elapsed)} data-section={snapshot.section} aria-labelledby="beat-title">
  <GameFeedback snapshot={snapshot} theme="beat" musicPaused scoreFeedback={false}/>
  <header className="bubble-game__header"><h1 id="beat-title">Paper Jam</h1><dl>{snapshot.scores.map(s=><div key={s.playerId}><dt>P{s.playerId}</dt><dd>{s.score}</dd></div>)}<div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs/1000)}s</dd></div></dl><button ref={recovery.exitButtonRef} className="text-button" onClick={onExit}>Exit game</button></header>
  <div className="beat-boards">{snapshot.scores.map(({playerId:id})=>{
   const judgments=snapshot.judgments.filter(j=>j.playerId===id),latest=judgments.at(-1)
   return <section key={id} className="beat-player"><h2>Player {id}</h2><KeyboardPlayArea className="beat-board" enabled={snapshot.phase==='playing'} aria-label={`Player ${id} Paper Jam play area`} onAction={(x,y)=>hit(id,x,y)} onKeyUp={event=>{if(event.altKey||event.ctrlKey||event.metaKey)return;const pad=Number(event.key)-1;if(pad>=0&&pad<4&&event.target===event.currentTarget&&snapshot.phase==='playing'){event.preventDefault();hit(id,beatPads[pad].x,beatPads[pad].y)}}}>
    <svg className="beat-tracks" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">{beatPads.map((pad,i)=><path key={i} d={`M500 520L${pad.x*1000} ${pad.y*1000}`} stroke={pad.color} fill="none" strokeWidth="3" strokeDasharray="5 14" vectorEffect="non-scaling-stroke"/>)}</svg>
    <div className="beat-deck" style={{'--beat-pulse':pulse} as CSSProperties} aria-hidden="true"><svg viewBox="0 0 160 110"><path d="m10 20 137-7 5 83-139 5Z" fill="#fff5dbe6" stroke="#343346" strokeWidth="4"/><circle className="beat-turntable" cx="65" cy="56" r="32" fill="#343346"/><circle cx="65" cy="56" r="15" fill="#f4ae79"/><circle cx="65" cy="56" r="4" fill="#fff5db"/><path d="m106 30 10 8-15 34-14 1" stroke="#343346" strokeWidth="4" fill="none"/><path d="m123 58 4 0m-5 12 5 0m-5 12 5 0" stroke="#78cbd3" strokeWidth="5"/></svg></div>
    {beatPads.map((pad,i)=>{
     const upcoming=snapshot.notes.filter(n=>n.playerId===id&&n.pad===i).sort((a,b)=>a.at-b.at)[0]
     const recent=[...judgments].reverse().find(j=>j.pad===i&&j.kind!=='combo'&&snapshot.elapsed-j.at<230)
     const timing=upcoming?Math.max(0,(upcoming.at-snapshot.elapsed)/LEAD_MS):1
     return <button key={i} className={`beat-speaker${recent&&recent.kind!=='miss'?' beat-speaker--hit':''}${upcoming&&Math.abs(upcoming.at-snapshot.elapsed)<210?' beat-speaker--ready':''}`} style={{left:`${pad.x*100}%`,top:`${pad.y*100}%`,'--pad-color':pad.color,'--cone-pulse':pulse} as CSSProperties} disabled={snapshot.phase!=='playing'} aria-label={`Player ${id} ${pad.name} speaker ${i+1}`} onClick={()=>hit(id,pad.x,pad.y)}>
      <Speaker pad={i}/><svg className="beat-timing" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46" pathLength="100" strokeDasharray={`${(1-timing)*100} 100`}/></svg><span>{pad.symbol} {pad.name}</span>
     </button>
    })}
    {snapshot.notes.filter(n=>n.playerId===id).map(note=>{
     const pad=beatPads[note.pad],p=note.progress,x=.5+(pad.x-.5)*p,y=.52+(pad.y-.52)*p
     return <div key={note.id} className="beat-note" data-pad={note.pad} data-due={note.at} style={{left:`${x*100}%`,top:`${y*100}%`,scale:.55+p*.45,rotate:`${(snapshot.elapsed-note.at)/4}deg`,'--pad-color':pad.color} as CSSProperties} aria-hidden="true"><Record/></div>
    })}
    {latest&&snapshot.elapsed-latest.at<700&&<div key={latest.id} className={`beat-judgment beat-judgment--${latest.kind}`} role="status"><strong>{latest.kind==='perfect'?'PERFECT!':latest.kind==='good'?'NICE!':latest.kind==='combo'?'ON FIRE!':'Keep the beat!'}</strong>{latest.points>0&&<small>+{latest.points}</small>}{latest.kind!=='miss'&&Array.from({length:6},(_,i)=><i key={i} style={{'--spark':i} as CSSProperties}/> )}</div>}
    {snapshot.combo[id]>=2&&<div className="beat-combo"><strong>{snapshot.combo[id]}</strong><span>IN A ROW</span>{snapshot.combo[id]>8&&<small>×{Math.min(3,1+Math.floor((snapshot.combo[id]-1)/8))}</small>}</div>}
    <div className="beat-meter" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i} style={{height:`${8+Math.abs(Math.sin(snapshot.beat*1.8+i*.8))*20*(.3+pulse)}px`}}/>)}</div>
    {snapshot.phase==='countdown'&&<div className="game-curtain"><strong>{Math.max(1,Math.ceil(snapshot.countdownRemainingMs/1000))}</strong><span>Hit the speaker when the record lands!</span></div>}
   </KeyboardPlayArea></section>
  })}</div>
  <p className="beat-cue"><strong>{snapshot.section}</strong> · Hit the speaker as its record arrives <span>Keyboard: 1 · 2 · 3 · 4</span></p>
  {recovery.pauseDialog}
  {snapshot.phase==='results'&&<div className="battle-results beat-results" role="dialog" aria-label="Paper Jam results"><p className="eyebrow">That was your jam</p><h2 ref={recovery.resultsHeading} tabIndex={-1}>You brought the beat!</h2><div className="battle-results__scores">{snapshot.scores.map(s=><p key={s.playerId}><strong>Player {s.playerId}</strong><span>{s.score} points</span><small>{snapshot.perfect[s.playerId]} perfect · {snapshot.hits[s.playerId]} hits · best streak {snapshot.best[s.playerId]}</small></p>)}</div><div className="result-actions"><button className="crayon-button crayon-button--primary" onClick={replay}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div></div>}
 </section>
}
