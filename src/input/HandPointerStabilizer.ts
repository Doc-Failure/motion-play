import type {MotionInputEvent} from './MotionProcessor'
import type {MenuSample} from './WebcamMenuInput'

type Position={x:number;y:number;time:number}
/** Screen-space tremor suppression. Never extrapolates or creates observations. */
export class HandPointerStabilizer {
 private positions=new Map<string,Position>()
 private last=-Infinity
 reset(){this.positions.clear();this.last=-Infinity}
 process(sample:MenuSample,width:number,height:number,cameraSize=Math.min(width,height)):MenuSample{
  if(![sample.time,width,height,cameraSize].every(Number.isFinite)||width<=0||height<=0||cameraSize<=0||sample.time<=this.last){this.positions.clear();return {...sample,events:[]}}
  const gap=sample.time-this.last;this.last=sample.time
  if(gap>1000)this.positions.clear()
  const present=new Set<string>(),radius=Math.max(3,Math.min(9,cameraSize*.012))
  const events:MotionInputEvent[]=[]
  for(const point of sample.events){
   if(point.kind!=='UI_POINTER'||point.timestamp!==sample.time||!Number.isInteger(point.playerId)||point.playerId<1||point.playerId>4||![point.x,point.y,point.confidence].every(Number.isFinite)||point.x<0||point.x>1||point.y<0||point.y>1||point.confidence<.6||point.confidence>1)continue
   const id=`${point.playerId}:${point.pointerId??'hand'}`
   if(present.has(id))continue
   present.add(id)
   const before=this.positions.get(id),rawX=point.x*width,rawY=point.y*height
   let x=rawX,y=rawY
   if(before){
    const dx=rawX-before.x,dy=rawY-before.y,distance=Math.hypot(dx,dy)
    // Small capture noise stays inside the marker. A deliberate reach/exit
    // takes effect on its first frame, without a trailing animation.
    const alpha=distance<=radius?0:distance>radius*6?1:1-Math.exp(-(sample.time-before.time)/45)
    x=before.x+dx*alpha;y=before.y+dy*alpha
   }
   this.positions.set(id,{x,y,time:sample.time})
   events.push({...point,x:x/width,y:y/height})
  }
  for(const id of this.positions.keys())if(!present.has(id))this.positions.delete(id)
  return {...sample,events}
 }
}
