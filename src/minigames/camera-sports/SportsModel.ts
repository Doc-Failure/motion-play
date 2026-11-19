import {rallyNetX} from './rallyFormation'
import {GameSession,type GameSessionSnapshot} from '../../game/GameSession'
import {PauseClock} from '../../game/PauseClock'
import {surfaceDistance,resolveBodyContact} from '../../game/physics/bodyCollision'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
export type Sport='keeper'|'net'
export const keeperGoalLimit=(players:PlayerCount)=>players*8
function courtEvent(e:MotionInputEvent,players:PlayerCount):MotionInputEvent {
 if(e.coordinateSpace==='court')return e
 const x=(local:number)=>(local+e.playerId-1)/players
 return {...e,coordinateSpace:'court',x:x(e.x),origin:e.origin?{x:x(e.origin.x),y:e.origin.y}:undefined}
}
export const NET={top:.56,halfWidth:.012,floor:.96,radius:.035,gravity:.85}
export function rallySide(player:PlayerId,players:PlayerCount){return players===1?0:((player-.5)/players<.5?0:1)}
export function rallyLabel(side:number,players:PlayerCount){return players===1?(side?'ROBOT':'P1'):Array.from({length:players},(_,i)=>(i+1) as PlayerId).filter(p=>rallySide(p,players)===side).map(p=>`P${p}`).join(' + ')}
export interface Shot {playerId:PlayerId;x:number;y:number;progress:number;state:'incoming'|'save'|'goal';resolved:number;number:number;saves:number;goals:number;streak:number;best:number;saveDelayMs:number}
export interface RallyBall {x:number;y:number;vx:number;vy:number;lastHit:number;serveAt:number;touches:number}
export interface SportsSnapshot extends GameSessionSnapshot {mode:Sport;elapsed:number;shots:Shot[];ball:RallyBall;teams:number[];returns:number;aiX:number;lastTouch:PlayerId|null;cue:'kick'|'save'|'goal'|'hit'|'point'|null;serial:number;cueTime:number}
export class SportsModel {
 private session:GameSession;private clock=new PauseClock();private now=0;private begins=0;private elapsed=0;private floor=0
 private frames:{time:number;events:MotionInputEvent[]}[]=[];private shots:Shot[]=[];private ball:RallyBall={x:.25,y:.25,vx:.15,vy:0,lastHit:-1000,serveAt:0,touches:0}
 private returns=0;private serveNumber=0;private crossingOwner:PlayerId|null=null
 private lastTouch:PlayerId|null=null;private aiX=.75;private teams=[0,0];private cue:SportsSnapshot['cue']=null;private serial=0;private cueTime=0
 constructor(readonly mode:Sport,readonly players:PlayerCount,private aspect=4/3,private readonly shotSeed=Math.floor(Math.random()*0xffffffff),private pressure=0){this.session=new GameSession({playerCount:players,roundDurationMs:mode==='keeper'?40000:60000})}
 setAspectRatio(v:number){if(Number.isFinite(v)&&v>0)this.aspect=v}
 start(t:number){this.session.start(t);this.clock.reset(t);this.now=t;this.begins=t+3000;this.floor=t;this.elapsed=0;this.frames=[];this.returns=0;this.serveNumber=0;this.teams=[0,0];this.aiX=.75;this.cue=null;this.serial=0;this.shots=Array.from({length:this.players},(_,i)=>({playerId:(i+1) as PlayerId,x:.5,y:.32,progress:0,state:'incoming',resolved:i*300,number:0,saves:0,goals:0,streak:0,best:0,saveDelayMs:0}));this.serve(0);return this.snapshot()}
 input(events:MotionInputEvent[]){if(this.clock.paused)return
  const valid=events.filter(e=>e.kind==='BODY_MOVE'&&e.playerId>=1&&e.playerId<=this.players&&Number.isInteger(e.playerId)&&e.confidence>=.6&&e.confidence<=1&&[e.x,e.y,e.timestamp,...(e.origin?[e.origin.x,e.origin.y]:[])].every(Number.isFinite)&&e.x>=0&&e.x<=1&&e.y>=0&&e.y<=1&&(!e.origin||e.origin.x>=0&&e.origin.x<=1&&e.origin.y>=0&&e.origin.y<=1)&&e.timestamp>=this.floor&&this.clock.accepts(e.timestamp))
  if(!valid.length){this.frames=[];return}const time=Math.max(...valid.map(e=>e.timestamp));if(time<=(this.frames.at(-1)?.time??-Infinity))return
  this.frames=this.frames.filter(f=>time-f.time<350).slice(-20);this.frames.push({time,events:valid.filter(e=>e.timestamp===time).map(e=>courtEvent(e,this.players))})
 }
 update(t:number){if(!Number.isFinite(t)||this.clock.paused||this.session.getSnapshot().phase==='results')return this.snapshot();this.now=Math.max(this.now,this.clock.time(t));const end=this.mode==='keeper'?40000:60000,target=Math.min(end,Math.max(0,this.now-this.begins))
  while(this.elapsed+10<=target){this.elapsed+=10;this.session.update(this.begins+this.elapsed);if(this.mode==='keeper')this.stepKeeper();else this.stepNet();if(this.session.getSnapshot().phase==='results')break}
  this.session.update(this.now);return this.snapshot()
 }
 private contacts(){
  const now=this.begins+this.elapsed
  for(let i=this.frames.length-1;i>=0;i--){
   const frame=this.frames[i],age=now-this.clock.time(frame.time)
   if(age>=0)return age<=200?frame.events:[]
  }
  return []
 }
 private emit(cue:SportsSnapshot['cue']){this.cue=cue;this.serial++;this.cueTime=this.elapsed}
 private stepKeeper(){const contacts=this.contacts()
  for(const s of this.shots){if(this.elapsed<s.resolved)continue
   if(s.state!=='incoming'){if(this.elapsed-s.resolved<650)continue;s.number++;s.state='incoming';s.progress=0;s.resolved=this.elapsed;}
   const duration=Math.max(850,1400-s.number*36-150*this.pressure),age=this.elapsed-s.resolved
   const prior=s.progress;s.progress=Math.min(1,Math.max(0,(age-450)/duration))
   if(prior===0&&s.progress>0)this.emit('kick')
   // A per-match seed gives everyone the same shot sequence without advertising it.
   let hash=(this.shotSeed^Math.imul(s.number+1,0x9e3779b9))>>>0
   hash=Math.imul(hash^(hash>>>16),0x85ebca6b)>>>0
   const spread=Math.min(.78,.48+s.number*.034+this.pressure*.10)
   const aim=.5+(hash/4294967296-.5)*spread,curve=(((hash>>>8)%100)/100-.5)*.18
   s.x=.5+(aim-.5)*s.progress+Math.sin(s.progress*Math.PI)*curve;s.y=.32+s.progress*.58
   const x=(s.playerId-1+s.x)/this.players
   let saver:PlayerId|null=null,nearest=.075
   if(s.progress>=.4&&s.progress<1)for(const e of contacts){
    const distance=surfaceDistance(x,s.y,e,this.aspect).distance
    if(distance<nearest){nearest=distance;saver=e.playerId}
   }
   if(saver!==null){
    s.state='save';s.resolved=this.elapsed
    const owner=this.shots[saver-1]
    owner.saves++;owner.streak++;owner.best=Math.max(owner.best,owner.streak)
    owner.saveDelayMs+=Math.max(0,age-450-duration*.4)
    this.session.awardScore(saver,10+Math.min(20,(owner.streak-1)*2));this.emit('save')
   }else if(s.progress>=1){s.state='goal';s.resolved=this.elapsed;s.goals++;s.streak=0;this.emit('goal')
    if(this.shots.reduce((n,shot)=>n+shot.goals,0)>=keeperGoalLimit(this.players)){
     if(this.session.getSnapshot().phase==='playing')this.session.finish(this.begins+this.elapsed)
     break
    }}
  }
 }
 private serve(side:number){
  const n=this.serveNumber++,depth=[.25,.24,.27,.26][n%4]
  // Solo restarts feed the human. Doubles alternate all four receiving positions.
  const x=this.players===3?((n%3)+.5)/3:this.players===4?[.125,.625,.375,.875][n%4]:side&&this.players!==1?1-depth:depth
  const speed=.18+Math.min(6,n)*.002+this.pressure*.035
  this.lastTouch=null;this.crossingOwner=null
  this.ball={x,y:.3,vx:x<rallyNetX(this.players)?speed:-speed,vy:0,lastHit:-1000,serveAt:this.elapsed+650,touches:0}
 }
 private stepNet(){
  const b=this.ball;if(this.elapsed<b.serveAt)return
  const net=rallyNetX(this.players),dt=.01,rx=NET.radius/this.aspect,prior={x:b.x,y:b.y}
  const oldAi=this.aiX
  if(this.players===1){
   this.aiX+=Math.max(-.0022,Math.min(.0022,b.x-this.aiX))
   // Leave room for a ball to fall between the net and the paddle's inner tip.
   const innerLimit=net+NET.halfWidth+.055+2*(NET.radius+.012)/this.aspect+.012
   this.aiX=Math.min(.91,Math.max(innerLimit,this.aiX))
  }
  b.y+=b.vy*dt+.5*NET.gravity*dt*dt;b.vy+=NET.gravity*dt;b.x+=b.vx*dt
  if(b.x<rx||b.x>1-rx){b.x=Math.max(rx,Math.min(1-rx,b.x));if(b.x===rx&&b.vx<0||b.x===1-rx&&b.vx>0)b.vx*=-.78}
  if(b.y<NET.radius){b.y=NET.radius;if(b.vy<0)b.vy*=-.65}
  this.netCollision(prior)
  if(this.players===3 && this.crossingOwner!==null && (prior.x<net)!==(b.x<net) && b.y+NET.radius<=NET.top){
   this.session.awardScore(this.crossingOwner,10);this.crossingOwner=null;this.returns++;this.emit('point')
   if(this.returns===5){this.session.finish(this.begins+this.elapsed);return}
  }
  let index=this.frames.length-1;while(index>=0&&this.clock.time(this.frames[index].time)>this.begins+this.elapsed)index--;const frame=this.frames[index],previous=this.frames[index-1]
  if(frame&&this.begins+this.elapsed-this.clock.time(frame.time)<=180){

   for(const e of frame.events){
    const side=rallySide(e.playerId,this.players)
    // A player's body cannot save the opponent's ball through the central net.
    if(side!==(b.x<net?0:1))continue
    const old=previous?.events.find(v=>v.playerId===e.playerId&&v.pointerId===e.pointerId)
    if(!resolveBodyContact(b,e,{aspect:this.aspect,radius:NET.radius+(e.pointerId==='head'?.035:.022),restitution:.92,previous:old,sampleSeconds:previous?(frame.time-previous.time)/1000:0,sampleAge:this.begins+this.elapsed-this.clock.time(frame.time),maxSpeed:1.65}))continue
    if(this.elapsed-b.lastHit>=100){b.lastHit=this.elapsed;b.touches++;this.lastTouch=e.playerId;this.crossingOwner=e.playerId;this.emit('hit')}
    break
   }
  }
  // The visible angled robot paddle obeys the same collision response as a body.
  if(this.players===1&&b.x>.5){
   const paddle=(x:number):MotionInputEvent=>({playerId:1,kind:'BODY_MOVE',x:x+.055,y:.63,origin:{x:x-.055,y:.72},timestamp:0,confidence:1,pointerId:'robot'})
   if(resolveBodyContact(b,paddle(this.aiX),{aspect:this.aspect,radius:NET.radius+.012,restitution:.98,previous:paddle(oldAi),sampleSeconds:dt,maxSpeed:1.65})&&this.elapsed-b.lastHit>=100){b.lastHit=this.elapsed;b.touches++;this.lastTouch=null;this.emit('hit')}
  }
  // Body separation must never push a ball through the solid net.
  this.netCollision(prior)
  b.x=Math.max(rx,Math.min(1-rx,b.x))
  if(b.y+NET.radius>=NET.floor){
   if(this.players===3){this.serve(0);return}
   const loser=b.x<net?0:1,winner=1-loser;this.teams[winner]++
   for(let p=1;p<=this.players;p++)if(rallySide(p as PlayerId,this.players)===winner)this.session.awardScore(p as PlayerId,10)
   this.emit('point');if(this.teams[winner]>=5&&this.session.getSnapshot().phase==='playing')this.session.finish(this.begins+this.elapsed);else this.serve(loser)
  }
 }
 private netCollision(prior:{x:number;y:number}){
  const net=rallyNetX(this.players),b=this.ball,left=net-NET.halfWidth,right=net+NET.halfWidth,r=NET.radius,rx=r/this.aspect
  if(b.y+r<=NET.top)return
  if(prior.y+r<=NET.top&&b.vy>0&&b.x>=left&&b.x<=right){b.y=NET.top-r;b.vy*=-.55;return}
  if(prior.x<=left-rx&&b.x>left-rx&&b.x<right+rx){b.x=left-rx;if(b.vx>0)b.vx*=-.65;return}
  if(prior.x>=right+rx&&b.x<right+rx&&b.x>left-rx){b.x=right+rx;if(b.vx<0)b.vx*=-.65;return}
  const x=Math.max(left,Math.min(right,b.x)),y=Math.max(NET.top,Math.min(NET.floor,b.y))
  const dx=(b.x-x)*this.aspect,dy=b.y-y,d=Math.hypot(dx,dy)
  if(d>=r)return
  const nx=d>.00001?dx/d:(prior.x<net?-1:1),ny=d>.00001?dy/d:0
  b.x=x+nx*(r+.001)/this.aspect;b.y=y+ny*(r+.001)
  const dot=b.vx*this.aspect*nx+b.vy*ny
  if(dot<0){b.vx-=1.65*dot*nx/this.aspect;b.vy-=1.65*dot*ny}
 }
 pause(t:number){this.update(t);const phase=this.session.getSnapshot().phase;if(phase==='playing'||phase==='countdown'){this.session.pause(this.now);this.clock.pause(t);this.frames=[]}return this.snapshot()}
 resume(t:number){if(this.clock.paused){this.clock.resume(t);this.session.resume(this.now);this.floor=t;this.frames=[]}return this.snapshot()}
 private snapshot():SportsSnapshot{return {...this.session.getSnapshot(this.now),mode:this.mode,elapsed:this.elapsed,shots:this.shots.map(s=>({...s})),ball:{...this.ball},teams:[...this.teams],returns:this.returns,aiX:this.aiX,lastTouch:this.lastTouch,cue:this.cue,serial:this.serial,cueTime:this.cueTime}}
}
