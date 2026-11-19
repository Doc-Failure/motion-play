import {useEffect,useMemo,useRef,useState} from 'react'
import {gameAudio} from '../../audio/GameAudio'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import {GameFeedback} from '../../game/GameFeedback'
import {RoundHud} from '../../game/RoundHud'
import {useRoundRecovery, type RoundRecoveryProps} from '../../game/useRoundRecovery'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
import {ShadowModel} from './ShadowModel'
import {Cardboard} from './Cardboard'
import {fitDeductions,makeCutout,type Fit} from './cutout'
import {armVector, type Direction, type Pose} from './poses'
import './shadow.css'

const ink='#343246', mint='#187751'
const colors=['#74cede','#f49baf','#bda4df','#f0c25e']
const directions:Direction[]=['down','out','up']

function Figure({pose,arms,matched,index}: {pose:Pose;arms:boolean[];matched:boolean;index:number}) {
  return <g transform={`translate(${index*80} 0)`} strokeLinecap="round" strokeLinejoin="round">
    <g stroke={ink} strokeWidth="2.5" fill={matched?'#8bdba9':colors[index]}>
      <circle cx="40" cy="24" r="8"/>
      <path d="M34 35 Q40 32 46 35 L50 55 Q41 59 30 54 Z"/>
      <path d="m36 56-7 15-7 1m21-16 8 14 6 1" fill="none" strokeWidth="5"/>
    </g>
    {pose.map((d,side)=>{
      const [dx,dy]=armVector(d,side),sx=side===0?33:47,sy=37
      const x=sx+dx*26,y=sy+dy*26, elbow=sx+(side===0?-1:1)*(d==='out'?13:10)
      return <g key={side} stroke={arms[side]?mint:ink}>
        <path d={`M${sx} ${sy} Q${elbow} ${sy+dy*8+4} ${x} ${y}`} fill="none" strokeWidth="5"/>
        <circle cx={x} cy={y} r="3.2" fill={arms[side]?'#95e7a4':'#fff2c6'} strokeWidth="1.5"/>
      </g>
    })}
  </g>
}

function poseHint(fit:Fit|null,left:Direction,right:Direction) {
  if(!fit)return `L ${left} · R ${right}`
  if(fit.empty>.42 && fit.outside<.12)return 'Step a little closer'
  if(fit.outside>.36 && fit.empty<.15)return 'Take a step back'
  if(!fit.sleevesFilled)return 'Reach into both sleeves'
  return fit.empty>.32||fit.outside>.27?'Line up your outline':'Hold still'
}

function CameraStamp({snapped}: {snapped:boolean}) {
  return <svg aria-hidden="true" viewBox="0 0 42 32" className="snap-camera" fill="none" stroke={ink} strokeWidth="2.4" strokeLinejoin="round">
    <path d="m3 10 8-1 3-5 11 1 3 4 10 1-1 17-34 1Z" fill="#f1af79"/>
    <circle cx="21" cy="18" r="7" fill={snapped?'#86dfab':'#fff2bc'}/>
    {snapped?<path d="m17 18 3 3 5-6"/>:<circle cx="21" cy="18" r="3" fill="#5a5771"/>}
  </svg>
}

type Props=RoundRecoveryProps & {playerCount:PlayerCount;inputEvents?:MotionInputEvent[];simulation?:boolean;aspect:number;onExit():void}

export function ShadowSnap({playerCount,inputEvents,simulation=false,aspect,onExit,externalPauseReason,onReconnect}:Props) {
  const pressure=useChallenge()?.pressure??0
  const [model]=useState(()=>new ShadowModel(playerCount,pressure,Math.random,aspect))
  const [snap,setSnap]=useState(()=>model.start(performance.now()))
  const input=useRef(inputEvents)
  const [manual,setManual]=useState<Partial<Record<PlayerId,Pose>>>({})
  const manualMasks=useMemo(()=>Array.from({length:playerCount},(_,i)=>{
    const pose=manual[(i+1) as PlayerId]
    return pose?makeCutout(pose,i,playerCount,aspect):undefined
  }),[manual,playerCount,aspect])
  const controls=useRef(manualMasks)
  const recovery=useRoundRecovery({model,snapshot:snap,setSnapshot:setSnap,title:'Shadow Snap',externalPauseReason,onReconnect,onExit})
  useEffect(()=>{input.current=inputEvents},[inputEvents])
  useEffect(()=>{controls.current=manualMasks;model.setAspect(aspect)},[manualMasks,model,aspect])
  useEffect(()=>{
    if(snap.phase==='paused'||snap.phase==='results')return
    let frame=0
    function tick(){
      const now=performance.now()
      const events=(input.current??[]).filter(e=>!controls.current[e.playerId-1])
      controls.current.forEach((bodyMask,i)=>{
        if(bodyMask) events.push({kind:'BODY_MASK',playerId:(i+1) as PlayerId,x:(i+.5)/playerCount,y:.5,bodyMask,timestamp:now,confidence:1})
      })
      setSnap(model.update(now,events));frame=requestAnimationFrame(tick)
    }
    frame=requestAnimationFrame(tick)
    return ()=>cancelAnimationFrame(frame)
  },[model,playerCount,snap.phase])
  useEffect(()=>{
    if(snap.outcome==='snap')gameAudio.play('shutter')
  },[snap.outcome])
  function moveArm(id:PlayerId,side:number) {
    setManual(previous=>{
      const pose=previous[id]??['down','down']
      const next=directions[(directions.indexOf(pose[side])+1)%directions.length]
      return {...previous,[id]:side===0?[next,pose[1]]:[pose[0],next]}
    })
  }
  const {picture,seats}=snap
  const width=80*playerCount
  const caption=snap.outcome==='snap'?'Click! Picture taken':snap.outcome==='miss'?'Time’s up':picture.name
  return <section className="snap-game" aria-label="Shadow Snap" data-phase={snap.phase} data-photos={snap.photos}>
    <GameFeedback snapshot={snap} scoreFeedback={false}/>
    <RoundHud title="Shadow Snap" snapshot={snap} onExit={onExit} exitRef={recovery.exitButtonRef}/>
    <Cardboard targets={snap.targets} manual={manualMasks.map(Boolean)} bodies={seats.map((s,i)=>s.fit ?
      manualMasks[i]??inputEvents?.find(e=>e.playerId===i+1&&e.kind==='BODY_MASK')?.bodyMask : undefined)}/>
    <div className="snap-studio">
      <div className="snap-print" data-outcome={snap.outcome}>
        <div className="snap-caption"><CameraStamp snapped={snap.outcome==='snap'}/><strong aria-live="polite">{caption}</strong><span>{snap.seconds}s</span></div>
        <div className="snap-parts">{picture.poses.map(([left,right],i)=>{
          const seat=seats[i],fit=seat.fit,cost=fit&&fitDeductions(fit)
          return <div key={i} data-matched={seat.matched} data-left={left} data-right={right} aria-label={`Player ${i+1} pose`}>
            <b>{playerCount>1?`P${i+1} · ${picture.roles[i]}`:'Fit the cutout'}</b>
            {snap.outcome&&cost?<><span>{seat.delta>0?'+':''}{seat.delta} pts</span><small>Outside −{cost.outside} · Empty −{cost.empty}</small></>:
              <><span>{fit?`Outside ${Math.round(fit.outside*100)}% · Empty ${Math.round(fit.empty*100)}%`:'Step into shape'}</span>
              <small>{seat.matched?'✓ In position':poseHint(fit,left,right)}</small></>}
            <progress max="1" value={seat.progress} aria-label={`Player ${i+1} pose hold`}/>
          </div>
        })}</div>
      </div>
    </div>
    <details className="snap-controls" open={simulation||undefined} onToggle={e=>{if(!e.currentTarget.open)setManual({})}}>
      <summary>Pose controls</summary>
      <div>{seats.map((_,i)=><div role="group" aria-label={`Player ${i+1} Shadow Snap play area`} key={i}><b>P{i+1}</b>
        {['Left','Right'].map((side,j)=><button type="button" disabled={snap.phase!=='playing'} key={side} onClick={()=>moveArm((i+1) as PlayerId,j)} aria-label={`Player ${i+1} ${side.toLowerCase()} arm`}>{side} · {manual[(i+1) as PlayerId]?.[j]??'down'}</button>)}
      </div>)}</div>
    </details>
    {snap.phase==='countdown'&&<div className="game-curtain"><strong>{Math.ceil(snap.countdownRemainingMs/1000)}</strong></div>}
    {recovery.pauseDialog}
    {snap.phase==='results'&&<div role="dialog" className="battle-results" aria-label="Shadow Snap results">
      <h2 ref={recovery.resultsHeading} tabIndex={-1}>That’s a wrap!</h2>
      <p>{snap.photos} {snap.photos===1?'picture':'pictures'} taken · Best streak {snap.best}</p>
      {snap.album.length>0&&<div className="snap-album" aria-label="Last pose pictures">{snap.album.map((photo,index)=>
        <figure key={index}><svg viewBox={`0 0 ${width} 78`} aria-hidden="true">{photo.poses.map((pose,i)=>
          <Figure key={i} pose={pose} arms={[false,false]} matched={false} index={i}/>)}</svg>
          <figcaption>{photo.name}</figcaption></figure>)}</div>}
      {snap.scores.map(p=><p key={p.playerId}>Player {p.playerId} · {p.score} points · Outside −{snap.deductions[p.playerId-1].outside} · Empty −{snap.deductions[p.playerId-1].empty}</p>)}
      <ChallengeResult scores={snap.scores}/>
      <div className="result-actions"><button className="crayon-button" onClick={()=>{setManual({});setSnap(model.start(performance.now()))}}>Play again</button><button className="crayon-button" onClick={onExit}>Back to games</button></div>
    </div>}
  </section>
}
