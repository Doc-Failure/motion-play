import {GameSession,type GameSessionSnapshot} from '../../game/GameSession'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'

export const BEAT_MS=600,STEP_MS=150,LEAD_MS=1400,GOOD_MS=210,PERFECT_MS=85
export type Pad=0|1|2|3
export const beatPads:readonly {x:number;y:number;name:string;color:string;symbol:string}[]=[
 {x:.18,y:.32,name:'Kick',color:'#f4ae79',symbol:'●'},
 {x:.82,y:.32,name:'Clap',color:'#f39fb8',symbol:'✦'},
 {x:.18,y:.73,name:'Pluck',color:'#78cbd3',symbol:'◆'},
 {x:.82,y:.73,name:'Chime',color:'#bfa6e4',symbol:'♫'},
]
export interface BeatNote {id:number;pad:Pad;at:number}
export interface FlyingBeat extends BeatNote {playerId:PlayerId;progress:number}
export interface BeatJudgment {id:number;playerId:PlayerId;pad:Pad;kind:'perfect'|'good'|'miss'|'combo';at:number;points:number}
export interface BeatSnapshot extends GameSessionSnapshot {
 elapsed:number;beat:number;section:string;notes:FlyingBeat[];judgments:BeatJudgment[]
 combo:Record<PlayerId,number>;best:Record<PlayerId,number>;hits:Record<PlayerId,number>;perfect:Record<PlayerId,number>;misses:Record<PlayerId,number>
}
const counts=():Record<PlayerId,number>=>({1:0,2:0,3:0,4:0})
/** One deterministic score shared by all players. Paired accents arrive together. */
export function beatChart(duration=60000):BeatNote[]{
 const chart:BeatNote[]=[],pattern:Pad[]=[0,1,2,3,0,2,1,3,2,0,3,1,0,3,2,1]
 let id=1
 for(let beat=4;beat*BEAT_MS<duration-GOOD_MS;beat++){
  const at=beat*BEAT_MS,pad=pattern[(beat-4)%pattern.length]
  chart.push({id:id++,pad,at})
  if(at>=20000&&beat%4===2)chart.push({id:id++,pad:((pad+2)%4) as Pad,at:at+BEAT_MS/2})
  if(at>=40000&&beat%4===0)chart.push({id:id++,pad:((pad+1)%4) as Pad,at})
 }
 return chart.filter(note=>note.at<duration-GOOD_MS).sort((a,b)=>a.at-b.at||a.id-b.id)
}
export class BeatModel {
 private readonly session:GameSession
 readonly chart:readonly BeatNote[]
 private readonly ids:PlayerId[]
 private readonly duration:number
 private aspect:number
 private resolved:Record<PlayerId,Set<number>>={1:new Set(),2:new Set(),3:new Set(),4:new Set()}
 private combo=counts();private best=counts();private hits=counts();private perfect=counts();private misses=counts()
 private judgments:BeatJudgment[]=[];private nextJudgment=1
 private history=new Map<PlayerId,{time:number;points:Set<string>}>()
 private elapsed=0;private lastTime=0;private inputNotBefore=0
 constructor(options:{playerCount?:PlayerCount;countdownMs?:number;roundDurationMs?:number;aspectRatio?:number}={}){
  const count=options.playerCount??1;this.duration=options.roundDurationMs??60000;this.aspect=options.aspectRatio??16/9
  this.session=new GameSession({...options,playerCount:count});this.ids=Array.from({length:count},(_,i)=>(i+1) as PlayerId);this.chart=beatChart(this.duration)
 }
 setAspectRatio(aspect:number){if(Number.isFinite(aspect)&&aspect>0)this.aspect=aspect}
 start(time:number){
  const state=this.session.start(time);this.resolved={1:new Set(),2:new Set(),3:new Set(),4:new Set()}
  this.combo=counts();this.best=counts();this.hits=counts();this.perfect=counts();this.misses=counts();this.history.clear();this.judgments=[];this.nextJudgment=1
  this.lastTime=time;this.elapsed=0;this.inputNotBefore=time+state.countdownRemainingMs;return this.snapshot()
 }
 update(time:number){
  if(!Number.isFinite(time))throw new Error('Time must be finite.')
  const now=Math.max(time,this.lastTime),state=this.session.update(now);this.lastTime=now;this.elapsed=this.duration-state.roundRemainingMs
  if(state.phase==='playing'||state.phase==='results'){
   // A 150 ms capture-latency allowance lets an observed on-time strike arrive
   // after a render tick, without permitting late movement to score as on-time.
   for(const id of this.ids)for(const note of this.chart)if(!this.resolved[id].has(note.id)&&(state.phase==='results'||this.elapsed>note.at+GOOD_MS+150)){
    this.resolved[id].add(note.id);this.combo[id]=0;this.misses[id]++
    if(this.elapsed-note.at<900)this.judgments.push({id:this.nextJudgment++,playerId:id,pad:note.pad,kind:'miss',at:note.at+GOOD_MS+150,points:0})
   }
   this.judgments=this.judgments.filter(j=>this.elapsed-j.at<850)
  }
  return this.snapshot()
 }
 hit(event:MotionInputEvent){
  const {playerId:id,timestamp:time}=event
  if(event.kind!=='MOTION_HIT'||!this.ids.includes(id)||!Number.isFinite(time)||time<this.inputNotBefore||time<this.lastTime-150||![event.x,event.y,event.confidence].every(Number.isFinite)||event.x<0||event.x>1||event.y<0||event.y>1||event.confidence<.35||event.confidence>1)return this.snapshot()
  const state=this.update(time);if(state.phase!=='playing')return state
  const point=`${event.x}:${event.y}`,previous=this.history.get(id)
  if(previous&&(time<previous.time||time===previous.time&&previous.points.has(point)))return state
  const points=previous?.time===time?previous.points:new Set<string>();points.add(point);this.history.set(id,{time,points})
  const captured=this.elapsed-Math.max(0,this.lastTime-time),radius=.14
  const pad=beatPads.findIndex(p=>((event.x-p.x)/(radius*Math.min(1,1/this.aspect)))**2+((event.y-p.y)/(radius*Math.min(1,this.aspect)))**2<=1)
  if(pad<0)return this.snapshot()
  const note=this.chart.filter(n=>n.pad===pad&&!this.resolved[id].has(n.id)&&Math.abs(captured-n.at)<=GOOD_MS).sort((a,b)=>Math.abs(captured-a.at)-Math.abs(captured-b.at))[0]
  if(!note)return this.snapshot()
  this.resolved[id].add(note.id);this.hits[id]++;this.combo[id]++;this.best[id]=Math.max(this.best[id],this.combo[id])
  const perfect=Math.abs(captured-note.at)<=PERFECT_MS,multiplier=Math.min(3,1+Math.floor((this.combo[id]-1)/8)),score=(perfect?15:10)*multiplier
  if(perfect)this.perfect[id]++
  this.session.awardScore(id,score)
  this.judgments.push({id:this.nextJudgment++,playerId:id,pad:pad as Pad,kind:perfect?'perfect':'good',at:this.elapsed,points:score})
  if(this.combo[id]%8===0)this.judgments.push({id:this.nextJudgment++,playerId:id,pad:pad as Pad,kind:'combo',at:this.elapsed,points:0})
  return this.snapshot()
 }
 pause(time:number){const state=this.update(time);if(state.phase==='playing'||state.phase==='countdown')this.session.pause(this.lastTime);return this.snapshot()}
 resume(time:number){const now=Math.max(time,this.lastTime),state=this.session.resume(now);this.lastTime=now;this.inputNotBefore=now+state.countdownRemainingMs;this.history.clear();return this.snapshot()}
 /** Read the same round clock for audio lookahead without advancing simulation. */
 playbackAt(time:number){const state=this.session.getSnapshot(Math.max(time,this.lastTime));return {phase:state.phase,elapsed:this.duration-state.roundRemainingMs,duration:this.duration}}
 private snapshot():BeatSnapshot{
  const state=this.session.getSnapshot()
  const notes=this.ids.flatMap(playerId=>this.chart.filter(n=>!this.resolved[playerId].has(n.id)&&this.elapsed>=n.at-LEAD_MS&&this.elapsed<=n.at+GOOD_MS).map(n=>({...n,playerId,progress:Math.max(0,Math.min(1,(this.elapsed-n.at+LEAD_MS)/LEAD_MS))})))
  return {...state,elapsed:this.elapsed,beat:this.elapsed/BEAT_MS,section:this.elapsed<2400?'Find the beat':this.elapsed<20000?'Warm up':this.elapsed<40000?'Mix it up':'Full groove',notes,judgments:this.judgments.map(j=>({...j})),combo:{...this.combo},best:{...this.best},hits:{...this.hits},perfect:{...this.perfect},misses:{...this.misses}}
 }
}
