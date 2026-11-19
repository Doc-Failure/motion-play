import {GameSession,type GameSessionSnapshot} from '../../game/GameSession'
import {PauseClock} from '../../game/PauseClock'
import {resolveBodyContact} from '../../game/physics/bodyCollision'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
export const HOOPS_DURATION=45000,HOOPS_RADIUS=.036
export const hoops=[0,1].flatMap(side=>[.3,.51,.72].map((y,row)=>({x:side?.91:.09,y,points:30-row*10})))
export interface HoopBall {id:number;x:number;y:number;vx:number;vy:number;spin:number;owner:PlayerId|null;touches:number;lastHit:number;state:'falling'|'scored'|'missed';ended:number;basket:number;trail:{x:number;y:number}[]}
export interface HoopEffect {id:number;x:number;y:number;time:number;kind:'touch'|'score'|'miss';points:number;player:PlayerId|null;basket:number}
export interface HoopsSnapshot extends GameSessionSnapshot {elapsed:number;balls:HoopBall[];effects:HoopEffect[];baskets:number[];attempts:number[];bestStreak:number[];misses:number}
const valid=(e:MotionInputEvent)=>e.kind==='BODY_MOVE'&&[e.x,e.y,e.timestamp,e.confidence,...(e.origin?[e.origin.x,e.origin.y]:[])].every(Number.isFinite)&&e.x>=0&&e.x<=1&&e.y>=0&&e.y<=1&&e.confidence>=.6&&e.confidence<=1&&(!e.origin||e.origin.x>=0&&e.origin.x<=1&&e.origin.y>=0&&e.origin.y<=1)
/** One shared court, six baskets. Body surfaces arrive as lane-local input only. */
export class HoopsModel {
 private session:GameSession;private clock=new PauseClock();private now=0;private begins=0;private simulated=0;private floor=0;private nextBall=350;private serial=0;private effectId=0
 private balls:HoopBall[]=[];private effects:HoopEffect[]=[];private baskets:number[]=[];private attempts:number[]=[];private streak:number[]=[];private bestStreak:number[]=[];private misses=0
 private samples:{time:number;events:MotionInputEvent[]}[]=[]
 constructor(private players:PlayerCount,private aspect=4/3,private pressure=0){this.session=new GameSession({playerCount:players,roundDurationMs:HOOPS_DURATION})}
 setAspectRatio(v:number){if(Number.isFinite(v)&&v>0)this.aspect=v}
 start(t:number){this.session.start(t);this.clock.reset(t);this.now=t;this.begins=t+3000;this.floor=t;this.simulated=0;this.nextBall=350;this.serial=0;this.effectId=0;this.balls=[];this.effects=[];this.samples=[];this.baskets=Array(this.players).fill(0);this.attempts=Array(this.players).fill(0);this.streak=Array(this.players).fill(0);this.bestStreak=Array(this.players).fill(0);this.misses=0;return this.snapshot()}
 input(events:MotionInputEvent[]){
  if(this.clock.paused)return
  const accepted=events.filter(e=>valid(e)&&Number.isInteger(e.playerId)&&e.playerId>=1&&e.playerId<=this.players&&e.timestamp>=this.floor&&this.clock.accepts(e.timestamp))
  if(!accepted.length){this.samples=[];return}
  const time=Math.max(...accepted.map(e=>e.timestamp))
  if(time<=(this.samples.at(-1)?.time??-Infinity))return
  const frame=accepted.filter(e=>e.timestamp===time).map(e=>({...e,x:(e.x+e.playerId-1)/this.players,origin:e.origin?{x:(e.origin.x+e.playerId-1)/this.players,y:e.origin.y}:undefined}))
  this.samples=this.samples.filter(s=>time-s.time<500).slice(-24);this.samples.push({time,events:frame})
 }
 update(t:number):HoopsSnapshot{
  if(!Number.isFinite(t)||this.clock.paused||this.session.getSnapshot().phase==='results')return this.snapshot()
  this.now=Math.max(this.now,this.clock.time(t));const elapsed=Math.min(HOOPS_DURATION,Math.max(0,this.now-this.begins))
  while(this.simulated+10<=elapsed){this.simulated+=10;this.session.update(this.begins+this.simulated);if(this.simulated>=this.nextBall&&this.simulated<HOOPS_DURATION){this.spawn()
    const interval=Math.max(950,2240-480*this.pressure-this.simulated/65)/Math.min(2,this.players)
    this.nextBall+=this.serial<this.players?250:interval}
   for(const ball of this.balls)if(ball.state==='falling')this.step(ball,.01)
   this.balls=this.balls.filter(b=>b.state==='falling'||this.simulated-b.ended<850);this.effects=this.effects.filter(e=>this.simulated-e.time<850)
  }
  this.session.update(this.now);return this.snapshot()
 }
 private spawn(){
  if(this.balls.filter(b=>b.state==='falling').length>=4)return
  const id=this.serial++,lane=id%this.players,cycle=Math.floor(id/this.players)
  const offset=[.38,.62,.50,.30,.70][cycle%5]
  const x=(lane+(lane%2?1-offset:offset))/this.players
  this.balls.push({id,x,y:.13,vx:Math.sin(cycle*2.4)*.085*this.pressure/this.players,vy:.04,spin:0,owner:null,touches:0,lastHit:-1000,state:'falling',ended:0,basket:-1,trail:[]})
 }
 private step(b:HoopBall,dt:number){
  const prior={x:b.x,y:b.y},time=this.simulated,gravity=1.05
  b.vy+=gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=b.vx*dt*9
  const radiusX=HOOPS_RADIUS/this.aspect
  if(b.x<radiusX||b.x>1-radiusX){b.x=Math.max(radiusX,Math.min(1-radiusX,b.x));b.vx*=-.72}
  if(b.y<HOOPS_RADIUS){b.y=HOOPS_RADIUS;b.vy=Math.abs(b.vy)*.65}
  // A real descending crossing, after a body touch, is required for every basket.
  if(b.owner&&b.vy>0)for(const [i,h] of hoops.entries()){
   if(prior.y>=h.y||b.y<h.y)continue
   const x=prior.x+(b.x-prior.x)*(h.y-prior.y)/(b.y-prior.y)
   if(Math.abs(x-h.x)>.065-radiusX*.35)continue
   b.state='scored';b.basket=i;b.ended=time;b.x=h.x;b.y=h.y;const lane=b.owner-1
   this.baskets[lane]++;this.attempts[lane]++;this.streak[lane]++
   this.bestStreak[lane]=Math.max(this.bestStreak[lane],this.streak[lane])
   const points=h.points+5*Math.min(3,this.streak[lane]-1)
   this.session.awardScore(b.owner,points);this.effect(b,'score',points,i);return
  }
  for(const h of hoops)for(const side of [-1,1]){
   const cx=h.x+side*.065,cy=h.y,dx=(b.x-cx)*this.aspect,dy=b.y-cy,d=Math.hypot(dx,dy),r=HOOPS_RADIUS+.006
   if(d>=r||d<.0001)continue
   const nx=dx/d,ny=dy/d,dot=b.vx*this.aspect*nx+b.vy*ny
   b.x=cx+nx*(r+.001)/this.aspect;b.y=cy+ny*(r+.001)
   if(dot<0){b.vx-=1.65*dot*nx/this.aspect;b.vy-=1.65*dot*ny;this.effect(b,'touch',0,-1)}
  }
  {
   let index=this.samples.length-1;while(index>=0&&this.clock.time(this.samples[index].time)>this.begins+time)index--;const frame=this.samples[index]
   if(frame&&this.begins+time-this.clock.time(frame.time)<=180)for(const e of frame.events){
    const previous=this.samples[index-1],old=previous?.events.find(v=>v.playerId===e.playerId&&v.pointerId===e.pointerId)
    const hit=resolveBodyContact(b,e,{aspect:this.aspect,radius:HOOPS_RADIUS+(e.pointerId==='head'?.035:.018),previous:old,sampleSeconds:previous?(frame.time-previous.time)/1000:0,sampleAge:this.begins+time-this.clock.time(frame.time)})
    if(!hit)continue
    if(time-b.lastHit<100)break
    b.owner=e.playerId;b.touches++;b.lastHit=time;this.effect(b,'touch',0,-1);break
   }
  }
  if(b.y>1.05){if(b.owner){this.attempts[b.owner-1]++;this.streak[b.owner-1]=0}b.state='missed';b.ended=time;this.misses++;this.effect(b,'miss',0,-1)}
  if(time%40===0){b.trail.push({x:b.x,y:b.y});if(b.trail.length>8)b.trail.shift()}
 }
 private effect(b:HoopBall,kind:HoopEffect['kind'],points:number,basket:number){this.effects.push({id:++this.effectId,x:b.x,y:b.y,time:this.simulated,kind,points,player:b.owner,basket})}
 pause(t:number){this.update(t);const p=this.session.getSnapshot().phase;if(p==='playing'||p==='countdown'){this.session.pause(this.now);this.clock.pause(t);this.samples=[]}return this.snapshot()}
 resume(t:number){if(this.clock.paused){this.clock.resume(t);this.session.resume(this.now);this.floor=t;this.samples=[]}return this.snapshot()}
 private snapshot():HoopsSnapshot{return {...this.session.getSnapshot(this.now),elapsed:this.simulated,balls:this.balls.map(b=>({...b,trail:b.trail.map(p=>({...p}))})),effects:this.effects.map(e=>({...e})),baskets:[...this.baskets],attempts:[...this.attempts],bestStreak:[...this.bestStreak],misses:this.misses}}
}
