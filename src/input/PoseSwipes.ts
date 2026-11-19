import type {StickBody} from '../camera/poseTracking'
import {HandSwipeTracker,type SwipeLimits} from './HandSwipe'
import type {MotionInputEvent} from './MotionProcessor'
import type {PlayerCount,PlayerId} from './PlayerZoneMapper'

/** Track each anatomical wrist independently in its owner's mirrored lane. */
export class PoseSwipes {
  constructor(private limits?:SwipeLimits) {}
  private hands=new Map<string,HandSwipeTracker>()

  sample(bodies:StickBody[],players:PlayerCount,time:number) {
    const seen=new Set<string>(),events:MotionInputEvent[]=[]
    for(let i=0;i<players;i++){
      const owners=bodies.filter(body=>Math.min(players-1,Math.floor(body.neck.x*players))===i)
      if(owners.length!==1)continue
      const body=owners[0]
      body.hands.forEach((point,j)=>{
        const x=point.x*players-i
        if(x<0||x>1)return
        const id=body.wristIds?.[j]
        if(id===undefined)return
        const key=`${i}:${id}`,tracker=this.hands.get(key)??new HandSwipeTracker(this.limits)
        seen.add(key)
        this.hands.set(key,tracker)
        const event=tracker.sample({kind:'HAND_POSITION',playerId:(i+1) as PlayerId,pointerId:key,x,y:point.y,
          confidence:Math.min(point.visibility??1,point.presence??1),timestamp:time})
        if(event)events.push(event)
      })
    }
    for(const key of this.hands.keys())if(!seen.has(key))this.hands.delete(key)
    return events
  }
}
