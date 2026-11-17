import type {PosePoint,StickBody} from '../camera/poseTracking'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerId} from './PlayerZoneMapper'
export interface DetectedHand {points:PosePoint[];confidence:number;side:string}
/** Pinch edges require a fresh open hand first; no held-pinch autofire. */
export class HandGestureProcessor {
 private state=new Map<string,{armed:boolean;time:number}>()
 private shots=new Map<number,number>()
 private last=-Infinity
 reset(){this.state.clear();this.shots.clear();this.last=-Infinity}
 process(hands:DetectedHand[],bodies:StickBody[],players:number,aspect:number,time:number):MotionInputEvent[]{
  if(!Number.isFinite(time)||time<=this.last)return []
  if(time-this.last>400)this.state.clear()
  this.last=time
  const events:MotionInputEvent[]=[],seen=new Set<string>()
  const distance=(a:PosePoint,b:PosePoint)=>Math.hypot((a.x-b.x)*aspect,a.y-b.y)
  for(const h of hands){
   if(h.confidence<.6||h.confidence>1||!Number.isFinite(h.confidence)||h.points.length!==21||h.points.some(p=>![p.x,p.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)))continue
   const points=h.points.map(p=>({...p,x:1-p.x})),wrist=points[0]
   const owner=bodies.map(b=>({body:b,d:Math.min(...b.hands.map(p=>distance(p,wrist)))})).sort((a,b)=>a.d-b.d)[0]
   if(!owner||owner.d>.13||bodies.some(b=>b!==owner.body&&b.hands.some(p=>distance(p,wrist)<owner.d+.025)))continue
   const playerId=(Math.floor(owner.body.neck.x*players)+1) as PlayerId
   if(playerId<1||playerId>players)continue
   const palm=distance(points[5],points[17]);if(palm<.015)continue
   const aim={x:(points[4].x+points[8].x)/2,y:(points[4].y+points[8].y)/2},x=aim.x*players-(playerId-1)
   if(x<0||x>1)continue
   const key=`${playerId}:${h.side}`,previous=this.state.get(key)
   if(seen.has(key))continue;seen.add(key)
   const ratio=distance(points[4],points[8])/palm
   let armed=previous?.armed??false
   if(ratio>.55)armed=true
   const base={playerId,x,y:aim.y,origin:{x:Math.max(0,Math.min(1,wrist.x*players-(playerId-1))),y:wrist.y},confidence:h.confidence,timestamp:time}
   events.push({...base,kind:'HAND_POSITION'})
   if(ratio<.25&&armed){if(time-(this.shots.get(playerId)??-Infinity)>=350){events.push({...base,kind:'HAND_PINCH'});this.shots.set(playerId,time)}armed=false}
   this.state.set(key,{armed,time})
  }
  for(const key of this.state.keys())if(!seen.has(key))this.state.delete(key)
  return events
 }
}
