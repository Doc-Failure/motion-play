import {ArmMotionProcessor} from '../input/ArmMotionProcessor'
import {HandGestureProcessor} from '../input/HandGestureProcessor'
import type {MotionInputEvent} from '../input/MotionProcessor'
import { createPortal } from 'react-dom'
import { BodyAlignment, type AlignmentState } from './BodyAlignment'
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPoseTracker, stickBodies, type PoseTracker, type StickBody } from './poseTracking'
import './body-tracking.css'

const colors=['#7dffb3','#72e8ff','#ff9cf5','#ffe67b']
export function BodyTrackingTest({videoRef,players,compact=false,onAlignmentChange,onPoseSample,showSkeleton=true,readyMode=false,withMasks=false,withHands=false,handInputEnabled=true,withArms=false,armInputEnabled=true,onArmEvents,onTrackingStatus,onHandEvents,onHandStatus,createTracker=createPoseTracker}:{videoRef:RefObject<HTMLVideoElement>;players:number;compact?:boolean;showSkeleton?:boolean;readyMode?:boolean;withMasks?:boolean;withArms?:boolean;armInputEnabled?:boolean;onArmEvents?:(events:MotionInputEvent[])=>void;onTrackingStatus?:(available:boolean|undefined)=>void;withHands?:boolean;handInputEnabled?:boolean;onHandEvents?:(events:MotionInputEvent[])=>void;onHandStatus?:(available:boolean|undefined)=>void;onPoseSample?:(bodies:StickBody[],time:number)=>void;onAlignmentChange?:(active:boolean)=>void;createTracker?:(players:number,signal?:AbortSignal,withHands?:boolean,withMasks?:boolean)=>Promise<PoseTracker>}) {
  const armsCallback=useRef(onArmEvents);armsCallback.current=onArmEvents
  const armsEnabled=useRef(armInputEnabled);armsEnabled.current=armInputEnabled
  const trackingCallback=useRef(onTrackingStatus);trackingCallback.current=onTrackingStatus
  const sampleCallback=useRef(onPoseSample);sampleCallback.current=onPoseSample
  const handsEnabled=useRef(handInputEnabled);handsEnabled.current=handInputEnabled
  const handsCallback=useRef(onHandEvents);handsCallback.current=onHandEvents
  const handStatus=useRef(onHandStatus);handStatus.current=onHandStatus
  const matchedFrame=useRef<HTMLCanvasElement>(null)
  const [frameParent,setFrameParent]=useState<HTMLElement|null>(null)
  const alignment=useRef<BodyAlignment|null>(null)
  const [check,setCheck]=useState<AlignmentState|null>(null)
  const [revision,setRevision]=useState(0)
  const [sample,setSample]=useState<{bodies:StickBody[];image:HTMLCanvasElement|null}>({bodies:[],image:null})
  const bodies=sample.bodies
  const [status,setStatus]=useState('Loading body tracking…')
  useLayoutEffect(()=>{
    const image=sample.image,canvas=matchedFrame.current
    if(!image||!canvas||!bodies.length)return
    // Commit the measured image and its landmarks together, before browser paint.
    canvas.width=image.width;canvas.height=image.height
    const context=canvas.getContext('2d');if(!context)return
    context.setTransform(-1,0,0,1,image.width,0);context.drawImage(image,0,0)
  },[bodies,sample.image])
  useEffect(()=>{if(!check?.ready)return;const timer=window.setTimeout(()=>setCheck(null),3500);return()=>window.clearTimeout(timer)},[check?.ready])
  const checking=Boolean(check&&!check.ready)
  useEffect(()=>{onAlignmentChange?.(checking);return()=>onAlignmentChange?.(false)},[checking,onAlignmentChange])
  useEffect(()=>{
    setFrameParent(videoRef.current?.parentElement??null)
    if(withHands)handStatus.current?.(undefined)
    const gestures=new HandGestureProcessor(),armMotion=new ArmMotionProcessor()
    trackingCallback.current?.(undefined)
    const controller=new AbortController()
    let handStarted=false,handReady=false
    let disposed=false,timer=0,tracker:PoseTracker|undefined,lastVideo=-1,lastFresh=0
    if(alignment.current&&alignment.current.players!==players){alignment.current=null;setCheck(null)}
    setSample({bodies:[],image:null});setStatus('Loading body tracking…')
    const tick=()=>{
      if(disposed||!tracker)return
      const video=videoRef.current,now=performance.now()
      if(document.hidden||!video||video.paused||video.ended||video.readyState<2||(!video.videoWidth||!video.videoHeight)||video.currentTime===lastVideo){
        if(now-lastFresh>600){armMotion.reset();armsCallback.current?.([]);gestures.reset();handsCallback.current?.([]);sampleCallback.current?.([],now);if(alignment.current)setCheck(alignment.current.observe([],now));setSample({bodies:[],image:null});setStatus('Waiting for a clear camera image…')}
      } else {
        lastVideo=video.currentTime;lastFresh=now
        try {
          const image=document.createElement('canvas')
          const width=video.videoWidth,height=video.videoHeight
          // Preserve aspect and all pixels. Never infer from an independently advancing video.
          image.width=Math.min(width,960);image.height=Math.round(image.width*height/width)
          const context=image.getContext('2d')
          if(!context)throw new Error('Camera frame capture unavailable')
          context.drawImage(video,0,0,image.width,image.height)
          const detected=stickBodies(tracker.detect(image,now,width/height),tracker.silhouettes?.())
          if(withArms){if(armsEnabled.current)armsCallback.current?.(armMotion.process(detected,players,width/height,now));else{armMotion.reset();armsCallback.current?.([])}}
          if(withHands&&!handsEnabled.current){gestures.reset();handsCallback.current?.([])}
          if(withHands&&handsEnabled.current&&!handStarted){
            handStarted=true
            if(tracker.enableHands){
              void tracker.enableHands().then(available=>{if(!disposed){handReady=available;handStatus.current?.(available)}}).catch(()=>{if(!disposed)handStatus.current?.(false)})
            }
          }
          if(withHands&&handsEnabled.current&&handReady){try{handsCallback.current?.(gestures.process(tracker.detectHands?.(image)??[],detected,players,width/height,now))}catch{gestures.reset();handsCallback.current?.([]);handStatus.current?.(false)}}
          setSample({bodies:detected,image:detected.length?image:null});sampleCallback.current?.(detected,now)
          if(alignment.current){const state=alignment.current.observe(detected,now,video.videoWidth/(video.videoHeight||1));setCheck(state);if(state.ready)alignment.current=null}
          setStatus(detected.length?`${detected.length} of ${players} bodies visible · stretch both arms out`:'No body found · step back and face the camera')
        }catch(error){trackingCallback.current?.(false);armMotion.reset();armsCallback.current?.([]);if(withHands){handStatus.current?.(false);handsCallback.current?.([])}alignment.current=null;setCheck(null);sampleCallback.current?.([],now);console.warn('Local body tracking stopped',error);setSample({bodies:[],image:null});setStatus('Body tracking unavailable · you can still play');tracker.close();tracker=undefined;return}
      }
      timer=window.setTimeout(tick,Math.max(16,50-(performance.now()-now)))
    }
    void createTracker(players,controller.signal,withHands,withMasks).then(value=>{
      if(disposed){value.close();return}
      tracker=value;trackingCallback.current?.(true);handReady=!value.enableHands&&Boolean(value.detectHands);if(withHands)handStatus.current?.(value.enableHands?undefined:handReady);lastFresh=performance.now();tick()
    }).catch(()=>{if(!disposed){trackingCallback.current?.(false);armsCallback.current?.([]);if(withHands)handStatus.current?.(false);alignment.current=null;setCheck(null);setStatus('Body tracking unavailable · you can still play')}})
    return()=>{disposed=true;controller.abort();window.clearTimeout(timer);tracker?.close()}
  },[videoRef,players,createTracker,revision,withHands,withArms,withMasks])
  return <>{frameParent&&createPortal(<canvas ref={matchedFrame} className="pose-matched-frame" aria-label="Camera frame matched to body tracking" hidden={!bodies.length||!(showSkeleton||withArms||withHands||withMasks||readyMode)}/>,frameParent)}<div data-aligning={checking} data-tracked={showSkeleton&&bodies.length>0} hidden={!showSkeleton&&!checking} className={`body-test${compact?' body-test--game':''}`}>
    {!readyMode&&<div className="body-test__align-controls"><button type="button" onClick={()=>{alignment.current=new BodyAlignment(players);setCheck({ready:false,progress:0,message:'Face the camera and raise both hands'});setRevision(value=>value+1)}}>{players===1?'Align player':'Align players'}</button>{check&&!check.ready&&<button type="button" onClick={()=>{alignment.current=null;setCheck(null)}}>Cancel alignment</button>}</div>}
    {check&&<div className={`body-alignment${check.ready?' body-alignment--ready':''}`} role="status"><strong>{check.message}</strong>{!check.ready&&<><small>Face the camera · lift both hands · hold still for 2 seconds</small><progress value={check.progress} max="1" aria-label="Player alignment progress"/></>}<small>{check.ready?'Framing checked · joints still follow the camera directly':'This checks framing and re-detects your body; no artificial offsets.'}</small></div>}
    <svg style={{visibility:showSkeleton?undefined:'hidden'}} className="body-test__sticks" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label="Detected human stick figure" role="img">
      {bodies.map((body,index)=><g key={index} stroke={colors[index%colors.length]} fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {[body.torso,...body.arms,...body.legs].filter(chain=>chain.length>1).map((chain,i)=><polyline key={i} points={chain.map(p=>`${p.x*1000},${p.y*1000}`).join(' ')} vectorEffect="non-scaling-stroke"/>)}
        {body.head&&<><ellipse cx={body.head.x*1000} cy={body.head.y*1000} rx={body.headRadius*1000} ry={body.headRadius*1000*((videoRef.current?.videoWidth??1)/(videoRef.current?.videoHeight||1))} vectorEffect="non-scaling-stroke"/><line x1={body.head.x*1000} y1={(body.head.y+body.headRadius*((videoRef.current?.videoWidth??1)/(videoRef.current?.videoHeight||1)))*1000} x2={body.neck.x*1000} y2={body.neck.y*1000} vectorEffect="non-scaling-stroke"/></>}
        {body.hands.map((hand,i)=><ellipse key={i} cx={hand.x*1000} cy={hand.y*1000} rx="9" ry="9" fill={colors[index%colors.length]} stroke="#26313f" strokeWidth="2" vectorEffect="non-scaling-stroke"/>)}
      </g>)}
    </svg>
    <p className="body-test__status" role="status">{compact?status.split(' · ')[0]:status}<small>{compact?(withArms?'Arm movement tracking · pictures stay on this device':'Following your body · pose test only'):'Test only · missing lines mean low confidence · pictures stay on this device'}</small></p>
  </div></>
}
