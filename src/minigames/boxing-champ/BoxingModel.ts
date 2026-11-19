import {BOXING_CONTACT_MS,BOXING_WINDUP_MS} from './boxingAttack'
import {GameSession,type GameSessionSnapshot} from '../../game/GameSession'
import {PauseClock} from '../../game/PauseClock'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'
export const boxingGeometry=(aspect:number)=>({x:aspect<.65?.5:.66,scale:Math.min(2,1/Math.max(.2,aspect))})
export type BoxingCue='hit'|'body'|'guard'|'counter'|'windup'|'dodge'|'ouch'|'ko'
export interface Boxer {playerId:PlayerId;health:number;stamina:number;combo:number;best:number;swings:number;hits:number;kos:number;nextAttack:number;attack:number;resolved:boolean;recover:number;lastHit:number;cue:BoxingCue|null;cueAt:number;serial:number;side:number}
export interface BoxingSnapshot extends GameSessionSnapshot {elapsed:number;boxers:Boxer[]}
/** All collision coordinates are normalized within the same uncropped player lane. */
export class BoxingModel {
 private session:GameSession;private clock=new PauseClock();private now=0;private startAt=0
 private boxers:Boxer[]=[];private hands=new Map<string,MotionInputEvent>();private heads=new Map<PlayerId,MotionInputEvent>();private floor=0
 constructor(private players:PlayerCount,private aspect=1,private pressure=0){this.session=new GameSession({playerCount:players,roundDurationMs:42000})}
 setAspectRatio(aspect:number){if(Number.isFinite(aspect)&&aspect>0)this.aspect=aspect}
 start(t:number){this.session.start(t);this.clock.reset(t);this.now=t;this.startAt=t+3000;this.floor=t;this.hands.clear();this.heads.clear();this.boxers=Array.from({length:this.players},(_,i)=>({playerId:(i+1) as PlayerId,health:100,stamina:100,combo:0,best:0,swings:0,hits:0,kos:0,nextAttack:3500,attack:-1,resolved:true,recover:0,lastHit:-999,cue:null,cueAt:0,serial:0,side:1}));return this.update(t)}
 private cue(b:Boxer,cue:BoxingCue){b.cue=cue;b.cueAt=this.elapsed;b.serial++}
 get elapsed(){return Math.max(0,this.now-this.startAt)}
 update(t:number):BoxingSnapshot{
  if(!Number.isFinite(t)||this.clock.paused)return this.snapshot()
  this.now=Math.max(this.now,this.clock.time(t));const state=this.session.update(this.now)
  if(state.phase==='playing')for(const b of this.boxers){
   if(b.health<=0&&this.elapsed>=b.recover){b.health=100;b.nextAttack=this.elapsed+2000;b.resolved=true}
   if(b.health<=0)continue
   if(this.elapsed>=b.nextAttack){b.attack=this.elapsed;b.resolved=false;b.nextAttack=this.elapsed+Math.max(2400,3500-b.kos*180-this.pressure*580);b.side*=-1;this.cue(b,'windup')}
   if(!b.resolved&&this.elapsed>=b.attack+BOXING_CONTACT_MS){
    b.resolved=true;const head=this.heads.get(b.playerId)
    // Missing or old tracking is neither a successful dodge nor a penalty.
    if(head&&this.now-this.clock.time(head.timestamp)<=350){
     const safe=head.y>.53||(b.side===1?head.x<.36:head.x>.64)
     if(safe){this.session.awardScore(b.playerId,15);this.cue(b,'dodge')}
     else{b.stamina=Math.max(0,b.stamina-25);b.combo=0;this.cue(b,'ouch');if(b.stamina===0){b.stamina=100;this.session.awardScore(b.playerId,-20)}}
    }
   }
  }
  return this.snapshot()
 }
 input(e:MotionInputEvent){
  const b=this.boxers.find(b=>b.playerId===e.playerId)
  if(!b||!Number.isFinite(e.timestamp)||e.timestamp<this.floor||!this.clock.accepts(e.timestamp)||e.confidence<.6||e.confidence>1||!Number.isFinite(e.confidence)||![e.x,e.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1)||this.clock.time(e.timestamp)<this.now-350)return this.snapshot()
  if(e.kind==='BODY_MOVE'){const old=this.heads.get(e.playerId);if(!old||e.timestamp>old.timestamp)this.heads.set(e.playerId,e);return this.snapshot()}
  if(e.kind!=='HAND_POSITION')return this.snapshot()
  const key=`${e.playerId}:${e.pointerId??'hand'}`,old=this.hands.get(key)
  if(old&&e.timestamp<=old.timestamp)return this.snapshot()
  this.hands.set(key,e);this.update(e.timestamp)
  if(this.session.getSnapshot().phase!=='playing'||!old||old.timestamp<this.floor||this.clock.time(old.timestamp)<this.startAt||e.timestamp-old.timestamp>250||e.timestamp-old.timestamp<16||b.health<=0||this.elapsed-b.lastHit<260)return this.snapshot()
  const speed=Math.hypot(e.x-old.x,e.y-old.y)/(e.timestamp-old.timestamp)*1000
  if(speed<.65||Math.hypot(e.x-old.x,e.y-old.y)<.035)return this.snapshot()
  const {x,scale}=boxingGeometry(this.aspect)
  const head=Math.hypot((e.x-x)/(.18*scale),(e.y-.35)/.13)<1,body=Math.hypot((e.x-x)/(.21*scale),(e.y-.57)/.17)<1
  if(!head&&!body)return this.snapshot()
  b.swings++
  b.lastHit=this.elapsed
  if(!b.resolved&&this.elapsed-b.attack<BOXING_WINDUP_MS&&head){this.cue(b,'guard');return this.snapshot()}
  const counter=b.cue==='dodge'&&this.elapsed-b.cueAt<=680
  b.combo++;b.hits++;b.best=Math.max(b.best,b.combo);b.health=Math.max(0,b.health-(head?20:15));this.session.awardScore(b.playerId,(head?10:8)+Math.min(10,b.combo-1)+(counter?12:0));this.cue(b,counter?'counter':head?'hit':'body')
  if(b.health===0){b.kos++;b.recover=this.elapsed+950;b.resolved=true;this.session.awardScore(b.playerId,50);this.cue(b,'ko')}
  return this.snapshot()
 }
 pause(t:number){this.update(t);const p=this.session.getSnapshot().phase;if(p==='playing'||p==='countdown'){this.session.pause(this.now);this.clock.pause(t);this.hands.clear();this.heads.clear()}return this.snapshot()}
 resume(t:number){if(this.clock.paused){this.clock.resume(t);this.session.resume(this.now);this.floor=t;this.hands.clear();this.heads.clear()}return this.snapshot()}
 private snapshot():BoxingSnapshot{return {...this.session.getSnapshot(this.now),elapsed:this.elapsed,boxers:this.boxers.map(b=>({...b}))}}
}
