import type {StickBody} from '../camera/poseTracking'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerCount,PlayerId} from './PlayerZoneMapper'
/** Measured body surfaces become lane-local segments; game code never sees landmarks. */
export function keepUpsInput(bodies:StickBody[],players:PlayerCount,time:number,includeLegs=false):MotionInputEvent[]{
 return Array.from({length:players},(_,p)=>{
  const owners=bodies.filter(b=>Math.floor(b.neck.x*players)===p)
  if(owners.length!==1)return []
  const b=owners[0],playerId=(p+1) as PlayerId,events:MotionInputEvent[]=[]
  const point=(v:{x:number;y:number})=>({x:v.x*players-p,y:v.y})
  if(b.head)events.push({playerId,kind:'BODY_MOVE',...point(b.head),timestamp:time,confidence:1,pointerId:'head'})
  for(const [i,hand] of b.hands.entries())events.push({playerId,kind:'BODY_MOVE',...point(hand),timestamp:time,confidence:hand.visibility??1,pointerId:`hand-${i}`})
  for(const [i,line] of [...b.arms,...(includeLegs?b.legs:[]),b.torso].entries())for(let j=1;j<line.length;j++)events.push({playerId,kind:'BODY_MOVE',...point(line[j]),origin:point(line[j-1]),timestamp:time,confidence:1,pointerId:`body-${i}-${j}`})
  return events.filter(e=>e.x>=0&&e.x<=1&&(!e.origin||e.origin.x>=0&&e.origin.x<=1))
 }).flat()
}
