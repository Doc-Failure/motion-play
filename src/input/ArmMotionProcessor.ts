import type {PosePoint,StickBody} from '../camera/poseTracking'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerId} from './PlayerZoneMapper'

type Point={x:number;y:number}
type ArmState={end:Point;elbow:Point;anchorEnd:Point;anchorElbow:Point;time:number}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y)
const valid=(p:PosePoint)=>[p.x,p.y].every(n=>Number.isFinite(n)&&n>=0&&n<=1)&&(p.visibility??1)>=.6&&(p.presence??1)>=.6

/** Measured arm movement, relative to the shoulder. No fingers or pixel motion. */
export class ArmMotionProcessor {
 private arms=new Map<string,ArmState>()
 private shots=new Map<number,number>()
 private selected=new Map<number,string>()
 private last=-Infinity
 reset(){this.arms.clear();this.shots.clear();this.selected.clear();this.last=-Infinity}
 process(bodies:StickBody[],players:number,aspect:number,time:number):MotionInputEvent[]{
  if(!Number.isFinite(time)||time<=this.last||!Number.isInteger(players)||players<1||players>4||!Number.isFinite(aspect)||aspect<=0)return []
  if(time-this.last>600)this.arms.clear()
  this.last=time
  const events:MotionInputEvent[]=[],seen=new Set<string>()
  for(let p=1;p<=players;p++){
   const owners=bodies.filter(b=>valid(b.neck)&&Math.floor(b.neck.x*players)+1===p)
   if(owners.length!==1)continue
   const body=owners[0],candidates:{event:MotionInputEvent;key:string;moving:boolean;travel:number}[]=[]
   for(const chain of body.arms){
    if(chain.length!==4||!chain.every(valid))continue
    const shoulder=chain[1],elbow=chain[2],end=chain[3],x=end.x*players-(p-1)
    if(x<0||x>1)continue
    const width=Math.hypot((shoulder.x-body.neck.x)*aspect,shoulder.y-body.neck.y)*2
    if(width<.04)continue
    const relative=(point:Point)=>({x:(point.x-shoulder.x)*aspect/width,y:(point.y-shoulder.y)/width})
    const key=`${p}:${shoulder.x<body.neck.x?'left':'right'}`
    if(seen.has(key))continue;seen.add(key)
    const previous=this.arms.get(key),point=relative(end),joint=relative(elbow)
    const step=previous?Math.max(distance(point,previous.end),distance(joint,previous.elbow)):0
    const dt=previous?(time-previous.time)/1000:0
    // Ignore detector jumps, long gaps and tiny jitter. A still arm never fires.
    const moving=!!previous&&dt>=.016&&dt<=.6&&step<=1.75&&step/dt>=.35
    const anchorEnd=moving?previous!.anchorEnd:point,anchorElbow=moving?previous!.anchorElbow:joint
    const travel=Math.max(distance(point,anchorEnd),distance(joint,anchorElbow))
    this.arms.set(key,{end:point,elbow:joint,anchorEnd,anchorElbow,time})
    candidates.push({key,moving,travel,event:{playerId:p as PlayerId,kind:'ARM_POSITION',x,y:end.y,origin:{x:Math.max(0,Math.min(1,elbow.x*players-(p-1))),y:elbow.y},confidence:Math.min(...chain.map(j=>j.visibility??1)),timestamp:time}})
   }
   const active=candidates.filter(c=>c.moving&&c.travel>=.12).sort((a,b)=>b.travel-a.travel)[0]
   const aim=active??candidates.find(c=>c.key===this.selected.get(p))??candidates[0]
   if(!aim)continue
   events.push(aim.event)
   if(active&&time-(this.shots.get(p)??-Infinity)>=420){
    events.push({...active.event,kind:'ARM_MOVE'})
    this.shots.set(p,time);this.selected.set(p,active.key)
    const state=this.arms.get(active.key)!
    state.anchorEnd=state.end;state.anchorElbow=state.elbow
   }
  }
  for(const key of this.arms.keys())if(!seen.has(key))this.arms.delete(key)
  return events
 }
}

/** Preserve short cast edges across batched React renders; the game deduplicates. */
export function retainArmCasts(previous:MotionInputEvent[],incoming:MotionInputEvent[],now:number){
 if(!incoming.length)return []
 return [...previous.filter(e=>e.kind==='ARM_MOVE'&&now>=e.timestamp&&now-e.timestamp<=400&&!incoming.some(n=>n.kind===e.kind&&n.playerId===e.playerId&&n.timestamp===e.timestamp)),...incoming]
}
