import {GameSession,type GameSessionSnapshot} from '../../game/GameSession'
import {PauseClock} from '../../game/PauseClock'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
export const RACE_DURATION=45000,HOP_MS=700
export interface Racer {playerId:PlayerId;distance:number;next:number;obstacle:number;cleared:number;streak:number;best:number;hits:number;stunUntil:number;jumpAt:number;height:number;tracked:boolean;cue:'jump'|'clear'|'bump'|null;serial:number;cueAt:number}
export interface RaceSnapshot extends GameSessionSnapshot {elapsed:number;racers:Racer[]}
export const obstacleTypes=['log','rock','gap'] as const
interface Body {anchor:number;armed:boolean;time:number}
export class RaceModel {
 private session:GameSession;private clock=new PauseClock();private begins=0;private now=0;private elapsed=0;private bodies=new Map<PlayerId,Body>();private lastInput=new Map<PlayerId,number>();private racers:Racer[]=[]
 constructor(players:PlayerCount,private pressure=0){this.session=new GameSession({playerCount:players,roundDurationMs:RACE_DURATION})}
 start(t:number){const s=this.session.start(t);this.clock.reset(t);this.now=t;this.begins=t+3000;this.elapsed=0;this.bodies.clear();this.lastInput.clear();this.racers=s.scores.map(p=>({playerId:p.playerId,distance:0,next:15,obstacle:0,cleared:0,streak:0,best:0,hits:0,stunUntil:0,jumpAt:-1000,height:0,tracked:false,cue:null,serial:0,cueAt:0}));return this.snapshot()}
 moveBody(e:MotionInputEvent){
  const r=this.racers.find(r=>r.playerId===e.playerId)
  if(!r||e.kind!=='BODY_MOVE'||!Number.isFinite(e.timestamp)||!this.clock.accepts(e.timestamp)||e.timestamp<=(this.lastInput.get(e.playerId)??-Infinity)||this.clock.time(e.timestamp)<this.now-150)return this.snapshot()
  this.update(e.timestamp);if(this.session.getSnapshot().phase!=='playing'||r.hits>=3)return this.snapshot();this.lastInput.set(e.playerId,e.timestamp)
  if(![e.x,e.y,e.confidence].every(Number.isFinite)||e.x<0||e.x>1||e.y<0||e.y>1||e.confidence<.6||e.confidence>1){this.bodies.delete(e.playerId);return this.snapshot()}
  const threshold=e.pointerId==='torso'&&Number.isFinite(e.activity)?Math.max(.025,Math.min(.07,e.activity!)):.18
  const old=this.bodies.get(e.playerId),fresh=old&&this.now-old.time<=350
  let anchor=fresh?old.anchor:e.y,armed=fresh?old.armed:true
  if(!armed&&e.y-anchor>=threshold){armed=true;anchor=e.y}
  if(armed&&anchor-e.y>=threshold&&this.elapsed-r.jumpAt>HOP_MS&&this.elapsed>=r.stunUntil){r.jumpAt=this.elapsed;armed=false;anchor=e.y;this.cue(r,'jump')}
  else if(armed)anchor=Math.max(anchor,e.y)
  this.bodies.set(e.playerId,{anchor,armed,time:this.clock.time(e.timestamp)});return this.snapshot()
 }
 update(t:number){if(!Number.isFinite(t)||this.clock.paused||this.session.getSnapshot().phase==='results')return this.snapshot();this.now=Math.max(this.now,this.clock.time(t));const target=Math.min(RACE_DURATION,Math.max(0,this.now-this.begins))
  while(this.elapsed+10<=target){this.elapsed+=10;this.session.update(this.begins+this.elapsed)
   for(const r of this.racers){const body=this.bodies.get(r.playerId);r.tracked=!!body&&this.begins+this.elapsed-body.time<=350
    const p=Math.max(0,Math.min(1,(this.elapsed-r.jumpAt)/HOP_MS));r.height=4*p*(1-p)
    if(r.hits>=3)continue
    const speed=(8+this.elapsed/RACE_DURATION*4+this.pressure*1.6)*(this.elapsed<r.stunUntil?.2:1),before=Math.floor(r.distance);r.distance+=speed*.01
    this.session.awardScore(r.playerId,Math.floor(r.distance)-before)
    if(r.distance>=r.next){const required=[.25,.45,.6][r.obstacle%3]+this.pressure*.10;if(r.height>=required){r.cleared++;r.streak++;r.best=Math.max(r.best,r.streak);this.cue(r,'clear')}else{r.hits++;r.streak=0;r.stunUntil=this.elapsed+1000;this.cue(r,'bump')}
     r.obstacle++;r.next+=18+[0,4,2,6][r.obstacle%4]
    }
   }
   if(this.session.getSnapshot().phase==='playing'&&this.racers.every(r=>r.hits>=3)){this.session.finish(this.begins+this.elapsed);break}
  }
  this.session.update(this.now);return this.snapshot()
 }
 private cue(r:Racer,cue:Racer['cue']){r.cue=cue;r.serial++;r.cueAt=this.elapsed}
 pause(t:number){this.update(t);const p=this.session.getSnapshot().phase;if(p==='playing'||p==='countdown'){this.session.pause(this.now);this.clock.pause(t);this.bodies.clear()}return this.snapshot()}
 resume(t:number){if(this.clock.paused){this.clock.resume(t);this.session.resume(this.now);this.bodies.clear()}return this.snapshot()}
 private snapshot():RaceSnapshot{return {...this.session.getSnapshot(this.now),elapsed:this.elapsed,racers:this.racers.map(r=>({...r}))}}
}
