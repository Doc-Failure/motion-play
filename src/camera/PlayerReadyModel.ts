import {HAND_HOLD_MS} from '../input/gestureTiming'
import type {StickBody} from './poseTracking'
/** A simultaneous hold. Stationary measured hands count; pixel motion does not. */
export class PlayerReadyModel {
 private since:number|null=null
 private sampleTime=-Infinity
 private camera:boolean[]
 private last=-Infinity
 private manualOnly=false
 constructor(readonly players:number,readonly targetY=.4){this.camera=Array(players).fill(false)}
 observe(bodies:StickBody[],time:number,aspect:number){
  if(!Number.isFinite(time)||time<=this.sampleTime)return
  if(time-this.sampleTime>1000&&!this.manualOnly)this.since=null
  this.sampleTime=time;const previous=this.camera.slice();this.camera.fill(false)
  for(let p=0;p<this.players;p++){
   const owners=bodies.filter(b=>Math.floor(b.neck.x*this.players)===p)
   if(owners.length!==1)continue
   const radius=previous[p] ? .18 : .16
   const rx=radius*Math.min(1,1/(aspect/this.players)),ry=radius*Math.min(1,aspect/this.players)
   this.camera[p]=(owners[0].palms??owners[0].hands).some(h=>((h.x*this.players-p-.5)/rx)**2+((h.y-this.targetY)/ry)**2<=1)
  }
 }
 reset(){this.since=null;this.sampleTime=-Infinity;this.camera.fill(false);this.last=-Infinity;this.manualOnly=false}
 update(time:number,manual:readonly boolean[],enabled=true){
  if(!Number.isFinite(time))throw new Error('Time must be finite')
  const fresh=time>=this.sampleTime&&time-this.sampleTime<=1000
  const contacts=this.camera.map((value,p)=>enabled&&(Boolean(manual[p])||(fresh&&value)))
  const all=contacts.every(Boolean),manualOnly=this.camera.every((_,p)=>Boolean(manual[p]))
  if(manualOnly!==this.manualOnly)this.since=null
  this.manualOnly=manualOnly
  // Camera progress advances only on new captured observations, never cached ticks.
  const observedTime=manualOnly?time:Math.min(time,this.sampleTime)
  // A frozen tab/main thread cannot fill the ring by skipping observations.
  if(!all||time<this.last||time-this.last>1000)this.since=null
  if(all&&this.since===null)this.since=observedTime
  this.last=time
  const progress=this.since===null?0:Math.min(1,Math.max(0,observedTime-this.since)/HAND_HOLD_MS)
  return {contacts,progress,complete:all&&progress===1}
 }
}
