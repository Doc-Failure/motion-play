import {HAND_HOLD_MS} from '../input/gestureTiming'
import {GameIntroDemo} from './GameIntroDemo'
import {useEffect,useRef,useState} from 'react'
import {PlayerReadyModel} from './PlayerReadyModel'
import type {StickBody} from './poseTracking'
import './player-ready.css'
export interface ReadyPoseSample {bodies:StickBody[];time:number}
export function PlayerReadyGate({players,sample,aspect,enabled,onComplete,onBack,onReconnect,introGame}:{players:number;introGame?:string;sample:ReadyPoseSample|null;aspect:number;enabled:boolean;onComplete():void;onBack():void;onReconnect():void}){
 const holdSeconds=HAND_HOLD_MS/1000
 const [model]=useState(()=>new PlayerReadyModel(players,introGame ? .68 : .4))
 const [state,setState]=useState(()=>model.update(performance.now(),[]))
 const manual=useRef(Array<boolean>(players).fill(false)),done=useRef(false),latest=useRef(sample),options=useRef({aspect,enabled,onComplete})
 latest.current=sample;options.current={aspect,enabled,onComplete}
 useEffect(()=>{
  const reset=()=>{manual.current.fill(false);model.reset();setState(model.update(performance.now(),[]))}
  const tick=()=>{
   if(done.current)return
   const now=performance.now(),current=options.current,pose=latest.current
   if(document.hidden||!current.enabled){reset();return}
   if(pose)model.observe(pose.bodies,pose.time,current.aspect)
   const next=model.update(now,manual.current,current.enabled);setState(next)
   if(next.complete){done.current=true;current.onComplete()}
  }
  const timer=window.setInterval(tick,50)
  document.addEventListener('visibilitychange',reset);window.addEventListener('blur',reset)
  return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',reset);window.removeEventListener('blur',reset)}
 },[model])
 return <div className={`player-ready-gate${introGame?' player-ready-gate--intro':''}`} style={{'--ready-y':introGame?'68%':'40%'} as import('react').CSSProperties} role="group" aria-label="Players ready check">
  {introGame&&<GameIntroDemo game={introGame} players={players}/>}
  <div className="player-ready-gate__instruction" id="player-ready-instructions" role="status"><strong>{enabled?(introGame?'Hand here to start':'Everyone, put a hand on your button'):'Waiting for the camera'}</strong><span>{state.contacts.every(Boolean)?`Hold · ${Math.max(1,Math.ceil((1-state.progress)*holdSeconds))}s`:players>1?`Hold together for ${holdSeconds} seconds to start`:`Hold your hand here for ${holdSeconds} seconds to start`}</span></div>
  <div className="player-ready-gate__lanes" style={{gridTemplateColumns:`repeat(${players},minmax(0,1fr))`}}>{state.contacts.map((contact,p)=><div className="player-ready-gate__lane" key={p}>
   <button className={`player-ready-button${contact?' player-ready-button--held':''}`} type="button" aria-label={`Ready Player ${p+1}`} aria-pressed={contact} aria-describedby="player-ready-instructions" disabled={!enabled}
    onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);manual.current[p]=true}}
    onPointerUp={()=>{manual.current[p]=false}} onPointerCancel={()=>{manual.current[p]=false}} onLostPointerCapture={()=>{manual.current[p]=false}}
    onKeyDown={e=>{if(e.repeat&&(e.key==='Enter'||e.key===' '))e.preventDefault()}}
    onClick={e=>{if(e.detail===0)manual.current[p]=!manual.current[p]}}>
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff55" strokeWidth="5"/><circle cx="50" cy="50" r="45" fill="none" stroke={contact?'#7dffb3':'#ffe17a'} strokeWidth="6" pathLength="100" strokeDasharray={`${state.progress*100} 100`} transform="rotate(-90 50 50)"/><path d="M34 60V33q0-8 6-8t6 8v16-28q0-8 6-8t6 8v28-24q0-8 6-8t6 8v25-14q0-7 6-7t6 7v30q0 19-22 19H49q-11-2-19-15l-9-15q-4-7 2-10t11 8" fill={contact?'#7dffb3':'#fff1d0'} stroke="#29313c" strokeWidth="2.5" strokeLinejoin="round"/></svg>
    <strong>P{p+1}</strong><span>{contact?'Keep your hand here':'Hand here'}</span>
   </button>
  </div>)}</div>
  <div className="player-ready-gate__tools"><button type="button" onClick={onBack}>{introGame?'← Games':'Change players / games'}</button>{!enabled&&<button type="button" onClick={onReconnect}>Reconnect camera</button>}{!introGame&&<small>Keyboard: Tab to each button, Enter to toggle ready · mouse/touch: hold</small>}</div>
 </div>
}
