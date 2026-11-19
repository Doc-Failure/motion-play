import type {StickBody} from '../camera/poseTracking'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerCount, PlayerId} from './PlayerZoneMapper'

/** Identify people by their neck, preserving the whole mirrored silhouette across lane edges. */
export function shadowPoseInput(bodies:StickBody[], players:PlayerCount, timestamp:number):MotionInputEvent[] {
  return Array.from({length:players},(_,i)=>i).flatMap(i=>{
    const owners=bodies.filter(b=>Math.min(players-1,Math.floor(b.neck.x*players))===i)
    if(owners.length!==1||!owners[0].silhouette)return []
    const body=owners[0]
    return [{kind:'BODY_MASK',playerId:(i+1) as PlayerId,x:body.neck.x,y:body.neck.y,coordinateSpace:'court',
      timestamp,confidence:1,bodyMask:body.silhouette}]
  })
}
