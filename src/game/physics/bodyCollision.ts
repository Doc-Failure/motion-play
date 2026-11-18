import type {MotionInputEvent} from '../../input/MotionProcessor'

export interface MovingBall {x:number;y:number;vx:number;vy:number}
export function surfaceDistance(x:number,y:number,e:MotionInputEvent,aspect:number){
 const a=e.origin??e,dx=(e.x-a.x)*aspect,dy=e.y-a.y,length=dx*dx+dy*dy
 const t=length?Math.max(0,Math.min(1,((x-a.x)*aspect*dx+(y-a.y)*dy)/length)):0
 return {distance:Math.hypot((x-a.x)*aspect-dx*t,y-a.y-dy*t),x:a.x+(e.x-a.x)*t,y:a.y+dy*t,t}
}
/** Velocities and normals use camera-height units so a circular ball stays circular. */
export function resolveBodyContact(ball:MovingBall,event:MotionInputEvent,options:{aspect:number;radius:number;restitution?:number;previous?:MotionInputEvent;sampleSeconds?:number;sampleAge?:number;maxSpeed?:number}){
 const {aspect,radius,previous,sampleSeconds=0,sampleAge=0,restitution=.85,maxSpeed=1.8}=options
 const near=surfaceDistance(ball.x,ball.y,event,aspect)
 if(near.distance>radius)return false
 let ux=0,uy=0
 // Never turn reacquisition, old observations or an identity jump into an impulse.
 if(previous&&sampleSeconds>=.015&&sampleSeconds<=.15&&sampleAge<=80){
  const a=previous.origin??previous
  const oldX=a.x+(previous.x-a.x)*near.t,oldY=a.y+(previous.y-a.y)*near.t
  const dx=(near.x-oldX)*aspect,dy=near.y-oldY
  if(Math.hypot(dx,dy)<=.2){ux=dx/sampleSeconds;uy=dy/sampleSeconds;const speed=Math.hypot(ux,uy);if(speed>1.2){ux*=1.2/speed;uy*=1.2/speed}}
 }
 let nx=(ball.x-near.x)*aspect,ny=ball.y-near.y
 const distance=Math.hypot(nx,ny)
 if(distance>.00001){nx/=distance;ny/=distance}else{
  const speed=Math.hypot(ball.vx*aspect-ux,ball.vy-uy)
  nx=speed?-(ball.vx*aspect-ux)/speed:0;ny=speed?-(ball.vy-uy)/speed:-1
 }
 const incoming=(ball.vx*aspect-ux)*nx+(ball.vy-uy)*ny
 // Separate overlapping geometry even when the ball is already moving away.
 ball.x=near.x+nx*(radius+.001)/aspect;ball.y=near.y+ny*(radius+.001)
 if(incoming>=-.015)return false
 let vx=ball.vx*aspect-(1+restitution)*incoming*nx
 let vy=ball.vy-(1+restitution)*incoming*ny
 // Light tangential friction transfers a moving hand's sweep without auto-aim.
 const tangent=(vx-ux)*(-ny)+(vy-uy)*nx
 const friction=Math.min(Math.abs(tangent),Math.abs(incoming)*.22)*Math.sign(tangent)
 vx+=friction*ny;vy-=friction*nx
 const speed=Math.hypot(vx,vy)
 if(speed>maxSpeed){vx*=maxSpeed/speed;vy*=maxSpeed/speed}
 ball.vx=vx/aspect;ball.vy=vy
 return true
}
