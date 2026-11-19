import {GameSession,type GameSessionSnapshot} from '../../game/GameSession'
import {PauseClock} from '../../game/PauseClock'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
export interface Ghost {id:number;playerId:PlayerId;x:number;y:number;charge:number;bat:boolean;born:number;state:'rising'|'caught'|'escaped';ended:number;points:number}
export interface GhostSnapshot extends GameSessionSnapshot {elapsed:number;wave:number;ghosts:Ghost[];lives:number[];combo:number[];captures:number[];best:number[]}
/** Motion-mask samples represent moving pixels, never stationary pose landmarks. */
export class GhostModel {
 private session:GameSession;private clock=new PauseClock();private now=0;private startAt=0;private elapsed=0;private next=0;private serial=0;private ghosts:Ghost[]=[];private lives:number[];private combo:number[];private captures:number[]=[];private best:number[]=[];private samples=new Map<number,number>()
 constructor(private players:PlayerCount,private aspect=4/3,private pressure=0){this.session=new GameSession({playerCount:players,roundDurationMs:45000});this.lives=Array(players).fill(5);this.combo=Array(players).fill(0)}
 setAspectRatio(a:number){if(Number.isFinite(a)&&a>0)this.aspect=a}
 start(t:number){this.session.start(t);this.clock.reset(t);this.now=t;this.startAt=t+3000;this.elapsed=0;this.next=0;this.serial=0;this.ghosts=[];this.captures=Array(this.players).fill(0);this.best=Array(this.players).fill(0);this.lives.fill(5);this.combo.fill(0);this.samples.clear();return this.snapshot()}
 update(t:number){
  if(!Number.isFinite(t)||this.clock.paused||this.session.getSnapshot().phase==='results')return this.snapshot()
  const target=Math.max(this.now,this.clock.time(t))
  if(target<this.startAt){this.now=target;this.session.update(target);return this.snapshot()}
  if(this.next===0){this.now=this.startAt;this.session.update(this.now);this.step(0)}
  // Fixed 20 ms simulation: slow frames must not grant extra escape time.
  while(this.startAt+this.elapsed+20<=target&&this.session.getSnapshot().phase==='playing'){
   this.elapsed+=20;this.now=this.startAt+this.elapsed;this.session.update(this.now)
   if(this.session.getSnapshot().phase==='playing')this.step(.02)
  }
  this.now=target;this.session.update(target)
  return this.snapshot()
 }
 private step(dt:number){
  const elapsed=this.elapsed
  const wave=1+Math.floor(elapsed/12000)
  if(elapsed>=this.next){this.next=elapsed+Math.max(750,1900-wave*230-this.pressure*200);const n=this.serial++
   for(let i=0;i<this.players;i++)if(this.lives[i]>0&&this.ghosts.filter(g=>g.playerId===i+1&&g.state==='rising').length<4+Math.min(2,wave-1))this.ghosts.push({id:n*this.players+i,playerId:(i+1) as PlayerId,x:[.5,.27,.73,.4,.62][n%5],y:.86,charge:0,bat:n>3&&n%4===0,born:elapsed,state:'rising',ended:0,points:0})
  }
  for(const g of this.ghosts)if(g.state==='rising'){
   if(this.lives[g.playerId-1]===0){g.state='escaped';g.ended=elapsed-850;continue}
   const column=Math.floor(g.id/this.players)%5
   g.x=[.5,.27,.73,.4,.62][column]+Math.sin((elapsed-g.born)/1300+column)*(.023+.012*(wave-1)+.025*this.pressure)
   g.y-=dt*(g.bat?.12:.065)*(1+(wave-1)*.22+this.pressure*.18)
   if(g.y<.13){g.state='escaped';g.ended=elapsed;this.lives[g.playerId-1]=Math.max(0,this.lives[g.playerId-1]-1);this.combo[g.playerId-1]=0}
  }
  this.ghosts=this.ghosts.filter(g=>g.state==='rising'||elapsed-g.ended<850)
  if(this.lives.every(v=>v===0))this.session.finish(this.now)
 }
 input(events:MotionInputEvent[]){
  if(this.clock.paused||this.session.getSnapshot().phase!=='playing')return this.snapshot()
  for(let p=1;p<=this.players;p++){
   const valid=events.filter(e=>e.playerId===p&&(e.kind==='MOTION_BRUSH'||e.kind==='MOTION_HIT')&&e.confidence>=.51&&e.confidence<=1&&[e.x,e.y,e.timestamp].every(Number.isFinite)&&e.x>=0&&e.x<=1&&e.y>=0&&e.y<=1&&this.clock.accepts(e.timestamp)&&Math.abs(this.clock.time(e.timestamp)-this.now)<=150)
   if(!valid.length||this.lives[p-1]===0)continue
   const timestamp=Math.max(...valid.map(e=>e.timestamp)),last=this.samples.get(p)??timestamp-33
   if(timestamp<=last)continue
   this.samples.set(p,timestamp)
   const amount=Math.min(80,timestamp-last)/650
   for(const g of this.ghosts)if(g.playerId===p&&g.state==='rising'&&valid.some(e=>e.timestamp===timestamp&&Math.hypot((e.x-g.x)*this.aspect,e.y-g.y)<Math.min(.095,this.aspect*.2)*(1+g.charge*.35)+.035)){
    g.charge=Math.min(1,g.charge+amount*(g.bat?3:1))
    if(g.charge>=1){g.state='caught';g.ended=this.elapsed;this.combo[p-1]++;this.captures[p-1]++;this.best[p-1]=Math.max(this.best[p-1],this.combo[p-1]);g.points=(g.bat?15:25)+Math.min(20,(this.combo[p-1]-1)*5);this.session.awardScore(g.playerId,g.points)}
   }
  }
  return this.snapshot()
 }
 pause(t:number){this.update(t);if(['playing','countdown'].includes(this.session.getSnapshot().phase)){this.session.pause(this.now);this.clock.pause(t);this.samples.clear()}return this.snapshot()}
 resume(t:number){if(this.clock.paused){this.clock.resume(t);this.session.resume(this.now);this.samples.clear()}return this.snapshot()}
 private snapshot():GhostSnapshot{return {...this.session.getSnapshot(this.now),elapsed:this.elapsed,wave:1+Math.floor(this.elapsed/12000),ghosts:this.ghosts.map(g=>({...g})),lives:[...this.lives],combo:[...this.combo],captures:[...this.captures],best:[...this.best]}}
}
