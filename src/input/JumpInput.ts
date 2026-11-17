import type {StickBody} from '../camera/poseTracking'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerCount,PlayerId} from './PlayerZoneMapper'
/** Shoulder/hip midpoint only: waving hands cannot trigger a jump. */
export function jumpInput(bodies:StickBody[],players:PlayerCount,time:number):MotionInputEvent[]{
 return Array.from({length:players},(_,p)=>{
  const owners=bodies.filter(b=>Math.floor(b.neck.x*players)===p)
  if(owners.length!==1)return []
  const b=owners[0],hip=b.torso[1]
  if(!hip)return []
  const size=Math.abs(hip.y-b.neck.y)
  if(size<.08)return []
  return [{playerId:(p+1) as PlayerId,kind:'BODY_MOVE' as const,x:(hip.x+b.neck.x)/2*players-p,y:(hip.y+b.neck.y)/2,activity:Math.max(.025,Math.min(.07,size*.22)),confidence:1,timestamp:time,pointerId:'torso'}]
 }).flat()
}
