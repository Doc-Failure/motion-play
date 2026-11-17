import {HandPointerStabilizer} from '../input/HandPointerStabilizer'
import {gameAudio} from '../audio/GameAudio'
import {useEffect,useLayoutEffect,useRef,useState,type RefObject} from 'react'
import {createPortal} from 'react-dom'
import {WebcamMenuDwell,projectMenuSample,MENU_HOLD_MS,type WebcamMenuInput,type CameraMenuFrame} from '../input/WebcamMenuInput'
import {containCameraFrame} from '../game/cameraGeometry'
import {BodyTrackingTest} from './BodyTrackingTest'
import type {StickBody} from './poseTracking'
import type {MotionInputEvent} from '../input/MotionProcessor'
import type {DwellTarget} from '../input/DwellController'
import './webcam-navigation.css'

type Choice={element:HTMLElement;rect:DOMRect;target:DwellTarget}
function choices(ids:WeakMap<HTMLElement,string>,next:()=>string):Choice[]{
 return [...document.querySelectorAll<HTMLElement>('a[href],button')].flatMap(element=>{
  if(element instanceof HTMLButtonElement&&element.disabled||element.closest('[hidden],[inert],[aria-hidden="true"],[aria-disabled="true"]')||element.closest('[aria-label$="play area"]')||element.classList.contains('player-ready-button')||element.classList.contains('skip-link'))return []
  const style=getComputedStyle(element),rect=element.getBoundingClientRect()
  if(style.visibility==='hidden'||style.display==='none'||rect.width<=0||rect.height<=0||rect.bottom<=0||rect.top>=innerHeight||rect.right<=0||rect.left>=innerWidth)return []
  let id=ids.get(element);if(!id){id=next();ids.set(element,id)}
  return [{element,rect,target:{id,x:rect.left/innerWidth,y:rect.top/innerHeight,width:rect.width/innerWidth,height:rect.height/innerHeight}}]
 }).sort((a,b)=>a.rect.width*a.rect.height-b.rect.width*b.rect.height)
}
export function WebcamNavigation({feed,videoRef,cameraView,activeFrame,activeVideoRef,ready,readyCheck=false,requesting,players,routeKey,onStart,onPose}:{feed:WebcamMenuInput;videoRef:RefObject<HTMLVideoElement>;cameraView:boolean;activeFrame?:CameraMenuFrame;activeVideoRef?:RefObject<HTMLVideoElement>;ready:boolean;readyCheck?:boolean;requesting:boolean;players:number;routeKey:string;onStart():void;onPose:(bodies:StickBody[],time:number)=>void}){
 const smoother=useRef(new HandPointerStabilizer()),model=useRef(new WebcamMenuDwell()),ids=useRef(new WeakMap<HTMLElement,string>()),counter=useRef(0),last=useRef(-Infinity),dialogs=useRef('')
 const [pointers,setPointers]=useState<MotionInputEvent[]>([]),[active,setActive]=useState<{rect:DOMRect;progress:number}|null>(null)
 const [tracking,setTracking]=useState<boolean|undefined>(undefined),[aspect,setAspect]=useState(16/9)
 const [viewport,setViewport]=useState(()=>({width:innerWidth,height:innerHeight}))
 const frame=cameraView?(activeFrame??{left:0,top:0,...viewport}):containCameraFrame(viewport.width,viewport.height,aspect)
 const projection=useRef(frame);projection.current=frame
 const renderedVideo=useRef<RefObject<HTMLVideoElement>|undefined>(undefined);renderedVideo.current=cameraView?activeVideoRef:videoRef
 const {left:menuLeft,top:menuTop,width:menuWidth,height:menuHeight}=frame
 useLayoutEffect(()=>{
  const enabled=ready&&!cameraView
  document.body.classList.toggle('camera-menu-active',enabled)
  const geometry={left:menuLeft,top:menuTop,width:menuWidth,height:menuHeight}
  if(enabled){for(const key of ['left','top','width','height'] as const)document.documentElement.style.setProperty(`--menu-camera-${key}`,`${geometry[key]}px`);window.scrollTo({top:0,left:0,behavior:'instant'})}
  return()=>{document.body.classList.remove('camera-menu-active')}
 },[ready,cameraView,menuLeft,menuTop,menuWidth,menuHeight])
 useEffect(()=>{model.current.resetForScene();smoother.current.reset();setActive(null);setPointers([])},[routeKey,cameraView,players,frame.left,frame.top,frame.width,frame.height])
 useEffect(()=>{
  const cancel=()=>{model.current.resetForScene();smoother.current.reset();setActive(null);setPointers([])}
  const resize=()=>{setViewport({width:innerWidth,height:innerHeight});cancel()}
  const unsubscribe=feed.subscribe(sample=>{
   const now=performance.now();last.current=now
   if(document.hidden||now<sample.time||now-sample.time>1000){cancel();return}
   const rectangle=renderedVideo.current?.current?.getBoundingClientRect()
   const image=rectangle&&rectangle.width>0&&rectangle.height>0?rectangle:projection.current
   const projected=projectMenuSample(sample,image,innerWidth,innerHeight)
   const visibleDialogs=[...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter(element=>element.getBoundingClientRect().width>0&&getComputedStyle(element).visibility!=='hidden'&&!element.closest('[hidden]')).map(element=>element.getAttribute('aria-label')??'dialog').join('|')
   if(visibleDialogs!==dialogs.current){dialogs.current=visibleDialogs;model.current.reset(true);smoother.current.reset()}
   const measured=smoother.current.process(projected,innerWidth,innerHeight,Math.min(image.width,image.height))
   const targets=choices(ids.current,()=>`webcam-choice-${++counter.current}`).filter(choice=>measured.events.some(point=>{
    const top=document.elementFromPoint?.(point.x*innerWidth,point.y*innerHeight)
    return !top||choice.element.contains(top)||top.contains(choice.element)
   }))
   const state=model.current.process(measured,targets.map(c=>c.target))
   setPointers(measured.events);setActive(state.activeId?{rect:targets.find(c=>c.target.id===state.activeId)!.rect,progress:state.progress}:null)
   if(state.activatedId){const element=targets.find(c=>c.target.id===state.activatedId)?.element;if(element?.isConnected){element.focus({preventScroll:true});element.click()}}
  })
  const stale=setInterval(()=>{if(performance.now()-last.current>1000)cancel()},200)
  window.addEventListener('blur',cancel);window.addEventListener('resize',resize);window.addEventListener('scroll',cancel);document.addEventListener('visibilitychange',cancel)
  return()=>{unsubscribe();clearInterval(stale);window.removeEventListener('blur',cancel);window.removeEventListener('resize',resize);window.removeEventListener('scroll',cancel);document.removeEventListener('visibilitychange',cancel)}
 },[feed])
 return createPortal(<>
  {!cameraView&&<div className="webcam-menu-background" hidden={!ready}><div className="webcam-menu-frame" style={frame}>
   <video ref={videoRef} muted playsInline onLoadedMetadata={event=>{const video=event.currentTarget;if(video.videoWidth&&video.videoHeight)setAspect(video.videoWidth/video.videoHeight)}} aria-label="Mirrored navigation camera"/>
   {ready&&<BodyTrackingTest videoRef={videoRef} players={players} readyMode showSkeleton={false} onPoseSample={onPose} onTrackingStatus={setTracking}/>}
  </div></div>}
  <div className="webcam-navigation" onPointerDown={gameAudio.unlock} onKeyDown={gameAudio.unlock} aria-label="Webcam navigation">
   {!cameraView&&(!ready?<button className="webcam-navigation__enable crayon-button" disabled={requesting} onClick={onStart}>{requesting?'Opening camera…':'Enable webcam navigation'}</button>:<div className="webcam-navigation__instruction"><span>{tracking===false?'Body tracking unavailable':'Put your hand on a choice · hold for 3 seconds'}</span>{tracking===false&&<button onClick={onStart}>Retry camera</button>}</div>)}
   {ready&&(!readyCheck||active)&&pointers.map((point,index)=><div className="webcam-navigation__hand" key={point.pointerId??index} style={{left:`${point.x*100}%`,top:`${point.y*100}%`}} aria-hidden="true"/>)}
   {active&&<div className="webcam-navigation__hold" style={{left:active.rect.left,top:active.rect.top,width:active.rect.width,height:active.rect.height}} aria-hidden="true"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" pathLength="100" strokeDasharray={`${active.progress*100} 100`}/></svg><span>Hold · {Math.max(1,Math.ceil((1-active.progress)*MENU_HOLD_MS/1000))}s</span></div>}
  </div>
 </>,document.body)
}
