import {GameSession,type GameSessionSnapshot} from '../../game/GameSession'
import {PauseClock} from '../../game/PauseClock'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
export const BALL_RADIUS=.045,KEEP_UPS_DURATION=30000,KEEP_UPS_LIVES=3
export function footballWind(time:number){const cycle=Math.floor((time-8000)/6000),phase=(time-8000)%6000;return {direction:cycle%2?-1:1,warning:time>=8000&&phase<900,active:time>=8000&&phase>=900&&phase<1900}}
export interface Football {playerId:PlayerId;x:number;y:number;vx:number;vy:number;spin:number;streak:number;best:number;drops:number;touches:number;lastHit:number;serveAt:number;cue:'bounce'|'header'|'bonus'|'drop'|null;cueAt:number;serial:number;hoop:number;trail:{x:number;y:number}[]}
export interface KeepUpsSnapshot extends GameSessionSnapshot {elapsed:number;balls:Football[]}
export function surfaceDistance(x:number,y:number,e:MotionInputEvent,aspect:number){
 const a=e.origin??e,dx=(e.x-a.x)*aspect,dy=e.y-a.y,length=dx*dx+dy*dy
 const t=length?Math.max(0,Math.min(1,((x-a.x)*aspect*dx+(y-a.y)*dy)/length)):0
 return {distance:Math.hypot((x-a.x)*aspect-dx*t,y-a.y-dy*t),x:a.x+(e.x-a.x)*t,y:a.y+dy*t}
}
export class KeepUpsModel {
 private session:GameSession;private clock=new PauseClock();private now=0;private startAt=0;private simulated=0;private floor=0
 private samples:{time:number;events:MotionInputEvent[]}[]=[];private balls:Football[]=[]
 constructor(players:PlayerCount,private aspect=4/3){this.session=new GameSession({playerCount:players,roundDurationMs:KEEP_UPS_DURATION});this.balls=Array.from({length:players},(_,i)=>this.ball((i+1) as PlayerId))}
 private ball(playerId:PlayerId):Football{return {playerId,x:.5,y:.16,vx:0,vy:.03,spin:0,streak:0,best:0,drops:0,touches:0,lastHit:-1000,serveAt:0,cue:null,cueAt:0,serial:0,hoop:0,trail:[]}}
 setAspectRatio(v:number){if(Number.isFinite(v)&&v>0)this.aspect=v}
 start(t:number){this.session.start(t);this.clock.reset(t);this.now=t;this.startAt=t+3000;this.simulated=0;this.floor=t;this.samples=[];this.balls=this.balls.map(b=>this.ball(b.playerId));return this.snapshot()}
 input(events:MotionInputEvent[]){
  if(this.clock.paused)return this.snapshot()
  const valid=events.filter(e=>e.kind==='BODY_MOVE'&&this.balls.some(b=>b.playerId===e.playerId)&&e.timestamp>=this.floor&&this.clock.accepts(e.timestamp)&&e.confidence>=.6&&e.confidence<=1&&[e.x,e.y,e.timestamp,...(e.origin?[e.origin.x,e.origin.y]:[])].every(Number.isFinite)&&e.x>=0&&e.x<=1&&e.y>=0&&e.y<=1&&(!e.origin||e.origin.x>=0&&e.origin.x<=1&&e.origin.y>=0&&e.origin.y<=1))
  if(!valid.length){this.samples=[];return this.snapshot()}
  const time=Math.max(...valid.map(e=>e.timestamp))
  if(time>(this.samples.at(-1)?.time??-Infinity)){this.samples=this.samples.filter(s=>time-s.time<250).slice(-15);this.samples.push({time,events:valid})}
  return this.snapshot()
 }
 update(t:number):KeepUpsSnapshot{
  if(!Number.isFinite(t)||this.clock.paused||this.session.getSnapshot().phase==='results')return this.snapshot()
  this.now=Math.max(this.now,this.clock.time(t))
  const elapsed=Math.min(KEEP_UPS_DURATION,Math.max(0,this.now-this.startAt))
  // Fixed substeps avoid tunnelling through a head/arm on slow camera frames.
  while(this.simulated+1000/120<=elapsed){this.simulated+=1000/120;this.session.update(this.startAt+this.simulated);for(const b of this.balls)this.step(b,1/120);if(this.balls.every(b=>b.drops>=KEEP_UPS_LIVES)){if(this.session.getSnapshot().phase==='playing')this.session.finish(this.startAt+this.simulated);break}}
  this.session.update(this.now)
  return this.snapshot()
 }
 private step(b:Football,dt:number){
  const time=this.simulated
  if(b.drops>=KEEP_UPS_LIVES||time<b.serveAt)return
  if(b.y>1.05){b.x=.5;b.y=.16;b.vx=0;b.vy=.03;b.trail=[]}
  const gravity=.85+.7*time/KEEP_UPS_DURATION,wind=footballWind(time)
  if(wind.active)b.vx=Math.max(-.65,Math.min(.65,b.vx+wind.direction*.3/Math.max(.65,this.aspect)*dt))
  const prior=b.y;b.vy+=gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;b.spin+=b.vx*dt*6
  const rx=BALL_RADIUS/this.aspect
  if(b.x<rx||b.x>1-rx){b.x=Math.max(rx,Math.min(1-rx,b.x));b.vx*=-.85}
  if(b.y<.13){b.y=.13;b.vy=Math.abs(b.vy)*.5}
  if(b.vy>0&&time-b.lastHit>240){
   const frame=[...this.samples].reverse().find(s=>this.clock.time(s.time)<=this.startAt+time)
   const contacts=(frame?.events??[]).filter(e=>e.playerId===b.playerId&&this.clock.time(e.timestamp)<=this.startAt+time&&this.startAt+time-this.clock.time(e.timestamp)<200)
   for(const e of contacts){const near=surfaceDistance(b.x,b.y,e,this.aspect),radius=BALL_RADIUS+(e.pointerId==='head'?.035:.025)
    if(near.distance>radius||prior>near.y+radius*.3)continue
    b.y=Math.min(b.y,near.y-radius);b.vy=-Math.max(.28,Math.sqrt(2*gravity*Math.max(.04,b.y-.15)))
    b.vx=Math.max(-.36,Math.min(.36,(b.x-near.x)*1.2+(Math.floor(b.touches/3)%2?-.18:.18)*(1+.6*time/KEEP_UPS_DURATION)))/Math.max(.65,this.aspect)
    b.lastHit=time;b.streak++;b.touches++;b.best=Math.max(b.best,b.streak)
    this.session.awardScore(b.playerId,(e.pointerId==='head'?15:10)+Math.min(15,b.streak-1));this.cue(b,e.pointerId==='head'?'header':'bounce');break
   }
  }
  const hoopX=b.hoop%2?.75:.25
  if(b.streak>=3&&Math.hypot((b.x-hoopX)*this.aspect,b.y-.2)<.085){b.hoop++;this.session.awardScore(b.playerId,30);this.cue(b,'bonus')}
  if(b.y>1.05){b.drops++;b.streak=0;b.serveAt=time+900;this.cue(b,'drop')}
  if(Math.floor(time/40)!==Math.floor((time-dt*1000)/40)){b.trail.push({x:b.x,y:b.y});if(b.trail.length>7)b.trail.shift()}
 }
 private cue(b:Football,cue:Football['cue']){b.cue=cue;b.cueAt=this.simulated;b.serial++}
 pause(t:number){this.update(t);const p=this.session.getSnapshot().phase;if(p==='playing'||p==='countdown'){this.session.pause(this.now);this.clock.pause(t);this.samples=[]}return this.snapshot()}
 resume(t:number){if(this.clock.paused){this.clock.resume(t);this.session.resume(this.now);this.floor=t;this.samples=[]}return this.snapshot()}
 private snapshot():KeepUpsSnapshot{return {...this.session.getSnapshot(this.now),elapsed:this.simulated,balls:this.balls.map(b=>({...b,trail:b.trail.map(p=>({...p}))}))}}
}
