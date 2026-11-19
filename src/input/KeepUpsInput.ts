import type {StickBody} from '../camera/poseTracking'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerCount,PlayerId} from './PlayerZoneMapper'
/** The neck identifies the player. A shared court keeps measured reaches across seat boundaries. */
export function keepUpsInput(bodies:StickBody[],players:PlayerCount,time:number,includeLegs=false,space:'player'|'court'='player'):MotionInputEvent[]{
 return Array.from({length:players},(_,p)=>{
  const owners=bodies.filter(b=>Math.min(players-1,Math.floor(b.neck.x*players))===p)
  if(owners.length!==1)return []
  const b=owners[0],playerId=(p+1) as PlayerId,events:MotionInputEvent[]=[]
  const point=(v:{x:number;y:number})=>({x:space==='court'?v.x:v.x*players-p,y:v.y,...(space==='court'?{coordinateSpace:space}:{})})
  if(b.head)events.push({playerId,kind:'BODY_MOVE',...point(b.head),timestamp:time,confidence:1,pointerId:'head'})
  for(const [i,hand] of b.hands.entries())events.push({playerId,kind:'BODY_MOVE',...point(hand),timestamp:time,confidence:hand.visibility??1,pointerId:`hand-${b.wristIds?.[i]??i}`})
  const segments=[
    ...b.arms.map((line,i)=>({id:`arm-${b.armIds?.[i]??i}`,line})),
    ...(includeLegs?b.legs.map((line,i)=>({id:`leg-${b.legIds?.[i]??i}`,line})):[]),
    {id:'torso',line:b.torso}
  ]
  for(const {id,line} of segments)for(let j=1;j<line.length;j++)events.push({playerId,kind:'BODY_MOVE',...point(line[j]),origin:point(line[j-1]),timestamp:time,confidence:1,pointerId:`${id}-${j}`})
  return events.filter(e=>e.x>=0&&e.x<=1&&(!e.origin||e.origin.x>=0&&e.origin.x<=1))
 }).flat()
}
