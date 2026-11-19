import {useContext,useEffect,useRef,useState} from 'react'
import {gameAudio} from '../../audio/GameAudio'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import {GameFeedback} from '../../game/GameFeedback'
import {InputFeedbackContext} from '../../game/InputFeedbackContext'
import {RoundHud} from '../../game/RoundHud'
import {useRoundRecovery,type RoundRecoveryProps} from '../../game/useRoundRecovery'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import {BowlingModel,bowlX,bowlY,ROLLS,sweepAim} from './BowlingModel'
import './bowling.css'

const colors=['#70d5db','#ff9fb3','#c1a8ef','#a2d99f']
const debug=new URLSearchParams(window.location.search).has('gameDebug')
type Props=RoundRecoveryProps & {playerCount:PlayerCount;inputEvents?:MotionInputEvent[];manual:boolean;onExit():void}

export function MarbleBowling({playerCount,inputEvents,manual,onExit,externalPauseReason,onReconnect}:Props){
  const pressure=useChallenge()?.pressure??0
  const {aspectRatio=1}=useContext(InputFeedbackContext)
  // Extend narrow lanes down the playfield while keeping pins and marbles round.
  const laneHeight=Math.max(130,100/aspectRatio)
  const depth=laneHeight/130
  const [model]=useState(()=>new BowlingModel(playerCount,pressure))
  const [snap,setSnap]=useState(()=>model.start(performance.now()))
  const [pinArtFailed,setPinArtFailed]=useState(false)
  const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion')
  const recovery=useRoundRecovery({model,snapshot:snap,setSnapshot:setSnap,title:'Marble Bowling',externalPauseReason,onReconnect,onExit})
  const drags=useRef(new Map<number,{id:PlayerId;x:number;y:number}>())
  useEffect(()=>{
    drags.current.clear()
    if(snap.phase==='paused'||snap.phase==='results')return
    let frame=0
    function tick(){setSnap(model.update(performance.now()));frame=requestAnimationFrame(tick)}
    frame=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(frame)
  },[model,snap.phase])
  useEffect(()=>{if(inputEvents?.length)model.input(inputEvents,performance.now())},[model,inputEvents])
  const scored=snap.lanes.reduce((sum,l)=>sum+l.knocked,0), strikes=snap.lanes.reduce((sum,l)=>sum+l.strikes,0)
  const sound=useRef({scored:0,strikes:0})
  useEffect(()=>{
    if(strikes>sound.current.strikes)gameAudio.play('combo')
    else if(scored>sound.current.scored)gameAudio.play('crack')
    sound.current={scored,strikes}
  },[scored,strikes])
  const leaders=snap.scores.filter(s=>s.score===Math.max(...snap.scores.map(p=>p.score)))
  return <section className="bowling-game" aria-label="Marble Bowling" data-phase={snap.phase}>
    <RoundHud title="Marble Bowling" snapshot={snap} onExit={onExit} exitRef={recovery.exitButtonRef}/>
    <GameFeedback snapshot={snap} scoreFeedback={false}/>
    <div className="bowling-boards">{snap.lanes.map(lane=>{
      const done=lane.rolls===ROLLS&&!lane.shot
      const message=done?'All rolls played':lane.shot?lane.feedback:lane.rolls===0?'Sweep up ↑':'Roll again ↑'
      return <section key={lane.id}><div role="group" tabIndex={0} aria-label={`Player ${lane.id} Marble Bowling play area`}
        aria-description="Sweep or drag upward toward the pins. Keyboard: left and right to aim, space to roll."
        data-rolls={lane.rolls} data-score={snap.scores[lane.id-1].score}
        onKeyDown={e=>{
          if(!['ArrowLeft','ArrowRight',' ','Enter','ArrowUp'].includes(e.key))return
          e.preventDefault()
          if(e.key==='ArrowLeft'||e.key==='ArrowRight')model.aim(lane.id,e.key==='ArrowLeft'?-8:8,performance.now())
          else if(!e.repeat)model.roll(lane.id,performance.now())
        }}
        onPointerDown={e=>{
          if(e.button!==0||snap.phase!=='playing'||lane.shot||done)return
          e.currentTarget.setPointerCapture(e.pointerId)
          drags.current.set(e.pointerId,{id:lane.id,x:e.clientX,y:e.clientY})
        }}
        onPointerUp={e=>{
          const start=drags.current.get(e.pointerId)
          drags.current.delete(e.pointerId)
          if(!start||start.id!==lane.id)return
          const rect=e.currentTarget.getBoundingClientRect(),rise=(start.y-e.clientY)/rect.height
          const dx=(e.clientX-start.x)/rect.width
          const aim=sweepAim(dx,rise)
          if(aim!==null)model.roll(lane.id,performance.now(),aim)
        }}
        onLostPointerCapture={e=>drags.current.delete(e.pointerId)}>
        <svg viewBox={`0 0 100 ${laneHeight}`} aria-label={`Player ${lane.id} bowling lane`} role="img">
          <g transform={`scale(1 ${depth})`}>
          <path d="M14 20 Q48 17 86 20 L98 116 Q50 121 2 116 Z" fill="#f4d69c99" stroke="#704e3c" strokeWidth="1.3"/>
          <path d="M16 22 5 114 M84 22 95 114" stroke="#fcf1cf" fill="none" strokeWidth="2"/>
          <path d="M9 97 Q49 100 91 97" stroke="#997b59" strokeDasharray="2 2" fill="none"/>
          {!lane.shot&&!done&&<path d={`M50 103 L${bowlX(lane.aim,.74)} ${bowlY(.74)}`} stroke="#39565e" fill="none" strokeDasharray="1 3" strokeLinecap="round"/>}
          </g>
          {[...lane.pins].reverse().map((pin,i)=>{const frame=pin.down?(reducedMotion||pin.impactAge===null||pin.impactAge>=180?3:pin.impactAge>=70?2:1):0;return <g key={i} transform={`translate(${pin.x} ${pin.y*depth})`}>
            {!pinArtFailed?<svg x="-9" y="-22" width="18" height="24" viewBox={`${frame*543} 0 543 724`} preserveAspectRatio="xMidYMid meet" data-pin-frame={frame}>
              <image href={`${import.meta.env.BASE_URL}assets/minigames/marble-bowling/pin-poses.webp`} x="0" y="0" width="2172" height="724" onError={()=>setPinArtFailed(true)}/>
            </svg>:<g className={pin.down?'bowling-pin down':'bowling-pin'}>
              <path d="M-2 1 Q-5 -2 -3 -6 Q-1 -10 -2 -12 Q-3 -16 0 -16 Q3 -16 2 -12 Q1 -9 3 -6 Q5 -1 2 1 Z" fill="#fff8dc" stroke="#44384a" strokeWidth=".95"/>
              <path d="M-1.7 -10.5 L1.7 -10.5" stroke="#e36851" strokeWidth="2"/>
            </g>}
            {debug&&!pin.down&&<ellipse rx={model.hitRadius} ry={model.hitRadius*depth} fill="none" stroke="#ffeb00" strokeWidth=".7"/>}
          </g>})}
          {!done&&lane.progress<1&&<g transform={`translate(${bowlX(lane.aim,lane.progress)} ${bowlY(lane.progress)*depth})`}>
            <circle r="5" fill={colors[lane.id-1]} stroke="#343644" strokeWidth="1.2"/>
            <path d="M-3 2 Q2 0 2 -4 M-2 -2 l.8 -.7" stroke="#fff8dc" strokeWidth="1.1" fill="none"/>
          </g>}
        </svg>
        <div className="bowling-label"><small>P{lane.id} · Roll {Math.min(ROLLS,lane.rolls+(lane.shot?0:1))}/{ROLLS}</small>
          <strong aria-live="polite">{message}</strong></div>
      </div></section>
    })}</div>
    {(manual||snap.phase==='playing')&&<p className={manual?'bowling-manual':'bowling-key-hint'}>Drag up to roll · ← → aim · Space rolls</p>}
    {snap.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(snap.countdownRemainingMs/1000)}</strong></div>}
    {recovery.pauseDialog}
    {snap.phase==='results'&&<div role="dialog" aria-label="Marble Bowling results" className="battle-results">
      <h2 ref={recovery.resultsHeading} tabIndex={-1}>{playerCount===1?'Final frame':leaders.length>1?'Tied game!':`Player ${leaders[0].playerId} wins!`}</h2>
      {snap.lanes.map(l=><p key={l.id}>P{l.id} · {snap.scores[l.id-1].score} pts · {l.knocked} {l.knocked===1?'pin':'pins'} · {l.strikes} {l.strikes===1?'strike':'strikes'} · {l.rolls}/{ROLLS} rolls</p>)}
      <ChallengeResult scores={snap.scores}/>
      <div className="result-actions"><button className="crayon-button" onClick={()=>setSnap(model.start(performance.now()))}>Play again</button>
        <button className="crayon-button" onClick={onExit}>Back to games</button></div>
    </div>}
  </section>
}
