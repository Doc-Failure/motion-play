import type {StickBody} from '../camera/poseTracking'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerCount,PlayerId} from './PlayerZoneMapper'
/** Camera adapter only: pass measured wrists/head, never infer a body from pixel motion. */
export function boxingInput(bodies:StickBody[],players:PlayerCount,time:number):MotionInputEvent[]{
 const events:MotionInputEvent[]=[]
 for(let p=0;p<players;p++){
  const owners=bodies.filter(b=>Math.floor(b.neck.x*players)===p)
  if(owners.length!==1)continue
  const b=owners[0],playerId=(p+1) as PlayerId
  for(const [i,h] of b.hands.entries()){const x=h.x*players-p;if(x>=0&&x<=1)events.push({playerId,kind:'HAND_POSITION',x,y:h.y,confidence:h.visibility??1,timestamp:time,pointerId:String(b.wristIds?.[i]??i)})}
  if(b.head)events.push({playerId,kind:'BODY_MOVE',x:b.head.x*players-p,y:b.head.y,confidence:b.head.visibility??1,timestamp:time})
 }
 return events
}
