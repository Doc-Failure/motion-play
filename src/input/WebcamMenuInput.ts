import {HAND_HOLD_MS} from './gestureTiming'
import type {StickBody} from '../camera/poseTracking'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerId} from './PlayerZoneMapper'
import {DwellController,type DwellTarget,type DwellState} from './DwellController'
export const MENU_HOLD_MS=HAND_HOLD_MS
export interface MenuSample {events:MotionInputEvent[];time:number}
export interface CameraMenuFrame {left:number;top:number;width:number;height:number}
export class WebcamMenuInput {
 private listeners=new Set<(sample:MenuSample)=>void>()
 publish(sample:MenuSample){for(const listener of this.listeners)listener(sample)}
 subscribe(listener:(sample:MenuSample)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener)}}
}
/** Measured palms (or wrist fallbacks) keep their actual mirrored camera positions. Any player can choose. */
export function menuPointers(bodies:StickBody[],players:number,time:number):MotionInputEvent[]{
 if(!Number.isFinite(time)||!Number.isInteger(players)||players<1||players>4)return []
 return bodies.slice(0,4).flatMap((body,index)=>{
  if(!Number.isFinite(body.neck.x)||body.neck.x<0||body.neck.x>1)return []
  // Menu ownership follows the detected body, not arbitrary game-lane borders.
  if(bodies.some((other,otherIndex)=>otherIndex!==index&&Math.hypot(other.neck.x-body.neck.x,other.neck.y-body.neck.y)<.02))return []
  return (body.palms??body.hands).flatMap((point,wrist)=>{
   const confidence=Math.min(point.visibility??1,point.presence??1)
   return [point.x,point.y,confidence].every(Number.isFinite)&&point.x>=0&&point.x<=1&&point.y>=0&&point.y<=1&&confidence>=.6&&confidence<=1
    ?[{playerId:(index+1) as PlayerId,kind:'UI_POINTER' as const,x:point.x,y:point.y,confidence,timestamp:time,pointerId:`${index}:${body.wristIds?.[wrist]??wrist}`}]:[]
  })
 })
}
/** Translate the complete, uncropped camera rectangle into viewport coordinates. No reach scaling. */
export function projectMenuSample(sample:MenuSample,frame:CameraMenuFrame,width:number,height:number):MenuSample{
 if(![frame.left,frame.top,frame.width,frame.height,width,height].every(Number.isFinite)||frame.width<=0||frame.height<=0||width<=0||height<=0)return {...sample,events:[]}
 return {...sample,events:sample.events.map(point=>({...point,x:(frame.left+point.x*frame.width)/width,y:(frame.top+point.y*frame.height)/height}))}
}
const hits=(point:MotionInputEvent,target:DwellTarget)=>point.x>=target.x&&point.x<=target.x+target.width&&point.y>=target.y&&point.y<=target.y+target.height
const hand=(point:MotionInputEvent)=>point.pointerId??`${point.playerId}:hand`
/** A fresh, continuous hold by the same measured wrist. */
export class WebcamMenuDwell {
 private dwell=new DwellController({dwellMs:MENU_HOLD_MS,continuityMs:1000})
 private selected:string|null=null
 private selectedHand:string|null=null
 private last=-Infinity
 private blocked=false
 private releasePoints=new Map<string,{x:number;y:number}>()
 private releasedHands=new Set<string>()
 private blockedTarget:string|null=null
 /** Preserve release protection only after a selection actually happened. */
 resetForScene(){this.reset(this.blocked)}
 reset(requireRelease=false){this.dwell.cancel();this.selected=null;this.selectedHand=null;this.blocked=requireRelease;this.releasePoints.clear();this.releasedHands.clear();this.blockedTarget=null}
 process(sample:MenuSample,targets:DwellTarget[]):DwellState {
  const empty={activeId:null,progress:0,activatedId:null}
  if(!Number.isFinite(sample.time)||sample.time<=this.last)return empty
  this.last=sample.time
  const points=sample.events.filter(e=>e.kind==='UI_POINTER'&&Number.isInteger(e.playerId)&&e.playerId>=1&&e.playerId<=4&&Number.isFinite(e.confidence)&&e.confidence>=.6&&e.confidence<=1&&[e.x,e.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&e.timestamp===sample.time)
  let candidates=points.flatMap(point=>{const target=targets.find(t=>hits(point,t));return target?[{point,target}]:[]})
  if(this.blocked){
   if(!points.length){this.releasePoints.clear();this.releasedHands.clear();return empty}
   for(const point of points){
    const id=hand(point),anchor=this.releasePoints.get(id),candidate=candidates.find(c=>hand(c.point)===id)
    if(!anchor)this.releasePoints.set(id,point)
    // Each hand can leave/re-enter or move deliberately. A stationary second
    // player must never lock the first player's navigation.
    if(!candidate||anchor&&candidate.target.id!==this.blockedTarget&&Math.hypot(point.x-anchor.x,point.y-anchor.y)>=.05)this.releasedHands.add(id)
   }
   candidates=candidates.filter(c=>this.releasedHands.has(hand(c.point)))
   if(!candidates.length)return empty
   this.blocked=false;this.releasePoints.clear();this.releasedHands.clear();this.dwell.cancel()
  }
  const chosen=candidates.find(c=>c.target.id===this.selected&&hand(c.point)===this.selectedHand)??candidates[0]
  if(!chosen){this.dwell.cancel();this.selected=null;this.selectedHand=null;return empty}
  if(hand(chosen.point)!==this.selectedHand)this.dwell.cancel()
  // DwellController's single-controller arbitration is reused after wrist ownership.
  const state=this.dwell.process({...chosen.point,playerId:1},[chosen.target]);this.selected=state.activeId;this.selectedHand=hand(chosen.point)
  if(state.activatedId){this.blocked=true;this.blockedTarget=state.activatedId;this.releasePoints=new Map(points.map(point=>[hand(point),{x:point.x,y:point.y}]));this.releasedHands.clear()}
  return state
 }
}
