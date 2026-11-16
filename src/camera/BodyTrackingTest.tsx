import { useEffect, useState, type RefObject } from 'react'
import { createPoseTracker, stickBodies, type PoseTracker, type StickBody } from './poseTracking'
import './body-tracking.css'

const colors=['#7dffb3','#72e8ff','#ff9cf5','#ffe67b']
export function BodyTrackingTest({videoRef,players,compact=false,createTracker=createPoseTracker}:{videoRef:RefObject<HTMLVideoElement>;players:number;compact?:boolean;createTracker?:(players:number,signal?:AbortSignal)=>Promise<PoseTracker>}) {
  const [bodies,setBodies]=useState<StickBody[]>([])
  const [status,setStatus]=useState('Loading body tracking…')
  useEffect(()=>{
    const controller=new AbortController()
    let disposed=false,timer=0,tracker:PoseTracker|undefined,lastVideo=-1,lastFresh=0
    setBodies([]);setStatus('Loading body tracking…')
    const tick=()=>{
      if(disposed||!tracker)return
      const video=videoRef.current,now=performance.now()
      if(document.hidden||!video||video.paused||video.ended||video.readyState<2||!video.videoWidth||video.currentTime===lastVideo){
        if(now-lastFresh>600){setBodies([]);setStatus('Waiting for a clear camera image…')}
      } else {
        lastVideo=video.currentTime;lastFresh=now
        try {
          const detected=stickBodies(tracker.detect(video,now))
          setBodies(detected)
          setStatus(detected.length?`${detected.length} of ${players} bodies visible · stretch both arms out`:'No body found · step back and face the camera')
        }catch(error){console.warn('Local body tracking stopped',error);setBodies([]);setStatus('Body tracking unavailable · you can still play');tracker.close();tracker=undefined;return}
      }
      timer=window.setTimeout(tick,80)
    }
    void createTracker(players,controller.signal).then(value=>{
      if(disposed){value.close();return}
      tracker=value;lastFresh=performance.now();tick()
    }).catch(()=>{if(!disposed)setStatus('Body tracking unavailable · you can still play')})
    return()=>{disposed=true;controller.abort();window.clearTimeout(timer);tracker?.close()}
  },[videoRef,players,createTracker])
  return <div data-tracked={bodies.length>0} className={`body-test${compact?' body-test--game':''}`}>
    <svg className="body-test__sticks" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Detected human stick figure" role="img">
      {bodies.map((body,index)=><g key={index} stroke={colors[index%colors.length]} fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {[body.torso,...body.arms,...body.legs].filter(chain=>chain.length>1).map((chain,i)=><polyline key={i} points={chain.map(p=>`${p.x*1000},${p.y*1000}`).join(' ')} vectorEffect="non-scaling-stroke"/>)}
        {body.head&&<><ellipse cx={body.head.x*1000} cy={body.head.y*1000} rx={body.headRadius*1000} ry={body.headRadius*1000*((videoRef.current?.videoWidth??1)/(videoRef.current?.videoHeight||1))} vectorEffect="non-scaling-stroke"/><line x1={body.head.x*1000} y1={(body.head.y+body.headRadius*((videoRef.current?.videoWidth??1)/(videoRef.current?.videoHeight||1)))*1000} x2={body.neck.x*1000} y2={body.neck.y*1000} vectorEffect="non-scaling-stroke"/></>}
        {body.hands.map((hand,i)=><ellipse key={i} cx={hand.x*1000} cy={hand.y*1000} rx="9" ry="9" fill={colors[index%colors.length]} stroke="#26313f" strokeWidth="2" vectorEffect="non-scaling-stroke"/>)}
      </g>)}
    </svg>
    <p className="body-test__status" role="status">{compact?status.split(' · ')[0]:status}<small>{compact?'Following your body · pose test only':'Test only · missing lines mean low confidence · pictures stay on this device'}</small></p>
  </div>
}
