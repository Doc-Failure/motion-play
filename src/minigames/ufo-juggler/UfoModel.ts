import {GameSession,type GameSessionSnapshot} from '../../game/GameSession'
import {PauseClock} from '../../game/PauseClock'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
export type UfoCue='spin'|'launch'|'crash'|'overheat'|'save'
export interface Saucer {id:number;playerId:PlayerId;x:number;y:number;spin:number;heat:number;angle:number;born:number;state:'flying'|'launched'|'crashed';ended:number;points:number;cue:UfoCue|null;cueAt:number;serial:number;coolUntil:number;rescued:boolean}
export interface UfoSnapshot extends GameSessionSnapshot {elapsed:number;ships:Saucer[];lives:number[];rescues:number[];streak:number[]}
export const UFO_DURATION=40000
export class UfoModel {
 private session:GameSession;private clock=new PauseClock();private now=0;private startAt=0;private elapsed=0;private next=0;private serial=0;private ships:Saucer[]=[];private lives:number[];private rescues:number[];private streak:number[];private samples=new Map<number,number>()
 constructor(private players:PlayerCount,private aspect=4/3){this.session=new GameSession({playerCount:players,roundDurationMs:UFO_DURATION});this.lives=Array(players).fill(3);this.rescues=Array(players).fill(0);this.streak=Array(players).fill(0)}
 setAspectRatio(a:number){if(Number.isFinite(a)&&a>0)this.aspect=a}
 start(t:number){this.session.start(t);this.clock.reset(t);this.now=t;this.startAt=t+3000;this.elapsed=0;this.next=0;this.serial=0;this.ships=[];this.lives.fill(3);this.rescues.fill(0);this.streak.fill(0);this.samples.clear();return this.snapshot()}
 update(t:number){
  if(!Number.isFinite(t)||this.clock.paused||this.session.getSnapshot().phase==='results')return this.snapshot()
  const target=Math.max(this.now,this.clock.time(t))
  if(target<this.startAt){this.now=target;this.session.update(target);return this.snapshot()}
  if(this.next===0){this.now=this.startAt;this.session.update(this.now);this.step(0)}
  while(this.startAt+this.elapsed+20<=target&&this.session.getSnapshot().phase==='playing'){
   this.elapsed+=20;this.now=this.startAt+this.elapsed;this.session.update(this.now)
   if(this.session.getSnapshot().phase==='playing')this.step(.02)
  }
  this.now=target;this.session.update(target);return this.snapshot()
 }
 private step(dt:number){
  const time=this.elapsed
  if(time>=this.next){this.next=time+(time<12000?6200:time<25000?4800:3600);const n=this.serial++
   for(let p=1;p<=this.players;p++)if(this.lives[p-1]>0){
    const active=this.ships.filter(s=>s.playerId===p&&s.state==='flying'),limit=time<12000?2:3
    for(let j=0;j<(time<12000?1:2)&&active.length<limit;j++){
    const slot=(time<12000?[.5,.25,.75]:[.25,.75,.5]).find(x=>active.every(s=>s.x!==x))!
    const ship:Saucer={id:(n*this.players+p)*2+j,playerId:p as PlayerId,x:slot,y:.62,spin:.22,heat:0,angle:0,born:time,state:'flying',ended:0,points:0,cue:null,cueAt:0,serial:0,coolUntil:0,rescued:false};this.ships.push(ship);active.push(ship)
    }
   }
  }
  for(const s of this.ships)if(s.state==='flying'){
   if(this.lives[s.playerId-1]===0){s.state='crashed';s.ended=time-900;continue}
   s.spin=Math.max(0,s.spin-dt*.28);s.angle+=dt*(1+s.spin*12)
   s.heat=Math.max(0,Math.min(1,s.heat+dt*(s.spin>1.05?1.6:-.7)))
   if(s.heat>=1){s.spin=.05;s.coolUntil=time+1000;s.heat=.5;this.cue(s,'overheat')}
   const rising=s.spin>=.38&&time>=s.coolUntil
   s.y+=dt*(rising?-(.055+s.spin*.14):.075+(time/UFO_DURATION)*.025)
   if(s.y<.22){s.state='launched';s.ended=time;this.streak[s.playerId-1]++;this.rescues[s.playerId-1]++;s.points=50+Math.min(40,(this.streak[s.playerId-1]-1)*10);this.session.awardScore(s.playerId,s.points);this.cue(s,'launch')}
   else if(s.y>.94){s.state='crashed';s.ended=time;this.lives[s.playerId-1]--;this.streak[s.playerId-1]=0;this.cue(s,'crash')}
  }
  this.ships=this.ships.filter(s=>s.state==='flying'||time-s.ended<900)
  if(this.lives.every(v=>v===0))this.session.finish(this.now)
 }
 input(events:MotionInputEvent[]){
  if(this.clock.paused||this.session.getSnapshot().phase!=='playing')return this.snapshot()
  for(let p=1;p<=this.players;p++){
   if(this.lives[p-1]===0)continue
   const valid=events.filter(e=>e.playerId===p&&(e.kind==='MOTION_HIT'||e.kind==='MOTION_BRUSH')&&e.confidence>=.51&&e.confidence<=1&&[e.x,e.y,e.timestamp].every(Number.isFinite)&&e.x>=0&&e.x<=1&&e.y>=0&&e.y<=1&&this.clock.accepts(e.timestamp)&&Math.abs(this.clock.time(e.timestamp)-this.now)<=150)
   if(!valid.length)continue
   const timestamp=Math.max(...valid.map(e=>e.timestamp)),last=this.samples.get(p)??timestamp-33
   if(timestamp<=last)continue
   this.samples.set(p,timestamp)
   for(const s of this.ships)if(s.playerId===p&&s.state==='flying'&&this.elapsed>=s.coolUntil&&valid.some(e=>e.timestamp===timestamp&&Math.hypot((e.x-s.x)*this.aspect,(e.y-s.y)*1.4)<Math.min(.11,this.aspect*.23)+.035)){
    const before=s.spin;s.spin=Math.min(1.5,s.spin+Math.min(80,timestamp-last)/1000*1.35)
    if(!s.rescued&&s.y>.78&&before<.38&&s.spin>=.38){s.rescued=true;this.session.awardScore(s.playerId,10);this.cue(s,'save')}
    else if(this.elapsed-s.cueAt>(s.cue==='save'?650:240))this.cue(s,'spin')
   }
  }
  return this.snapshot()
 }
 private cue(s:Saucer,cue:UfoCue){s.cue=cue;s.cueAt=this.elapsed;s.serial++}
 pause(t:number){this.update(t);if(['playing','countdown'].includes(this.session.getSnapshot().phase)){this.session.pause(this.now);this.clock.pause(t);this.samples.clear()}return this.snapshot()}
 resume(t:number){if(this.clock.paused){this.clock.resume(t);this.session.resume(this.now);this.samples.clear()}return this.snapshot()}
 private snapshot():UfoSnapshot{return {...this.session.getSnapshot(this.now),elapsed:this.elapsed,ships:this.ships.map(s=>({...s})),lives:[...this.lives],rescues:[...this.rescues],streak:[...this.streak]}}
}
