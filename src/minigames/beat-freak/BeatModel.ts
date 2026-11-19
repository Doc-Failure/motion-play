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
/** Speaker positions on one shared stage. Each instrument belongs to one musician. */
export function jamStage(players:PlayerCount,starter:boolean) {
 const pads=starter?beatPads.slice(0,Math.max(2,players)):beatPads
 const stage=pads.map((pad,i)=>({...pad,owner:(1+Math.floor(i*players/pads.length)) as PlayerId}))
 if(players===1)return starter?stage.map((pad,i)=>({...pad,x:i?.74:.26,y:.55})):stage
 return stage.map(pad=>{
  const instruments=stage.filter(p=>p.owner===pad.owner)
  const y=instruments.length===1 ? .55 : (instruments[0]===pad ? .34 : .72)
  return {...pad,x:(pad.owner-.5)/players,y}
 })
}
export interface BeatNote {id:number;pad:Pad;at:number}
export interface FlyingBeat extends BeatNote {playerId:PlayerId;progress:number}
export interface BeatJudgment {id:number;playerId:PlayerId;pad:Pad;kind:'perfect'|'good'|'miss'|'combo';at:number;points:number}
export interface BeatSnapshot extends GameSessionSnapshot {
 elapsed:number;beat:number;section:string;notes:FlyingBeat[];judgments:BeatJudgment[]
 combo:Record<PlayerId,number>;best:Record<PlayerId,number>;hits:Record<PlayerId,number>;perfect:Record<PlayerId,number>;misses:Record<PlayerId,number>
}
const counts=():Record<PlayerId,number>=>({1:0,2:0,3:0,4:0})
/** One deterministic score shared by all players. Paired accents arrive together. */
export function beatChart(duration=60000,pressure=0):BeatNote[]{
 const chart:BeatNote[]=[],starter=pressure<.28
 const pattern:Pad[]=starter?[0,1,0,1,0,0,1,1]:[0,1,2,3,0,2,1,3,2,0,3,1,0,3,2,1]
 const mix=duration/3-pressure*2500,groove=2*duration/3-pressure*2500
 let id=1
 for(let beat=2;beat*BEAT_MS<duration-(starter?420:GOOD_MS);beat++){
  if((pressure<.42 || beat<8) && beat%2)continue
  const at=beat*BEAT_MS,pad=pattern[(starter?beat/2-1:beat-2)%pattern.length]
  chart.push({id:id++,pad,at})
  if(pressure>=.42&&at>=mix&&beat%4===2)chart.push({id:id++,pad:((pad+2)%4) as Pad,at:at+BEAT_MS/2})
  if(pressure>=.7&&at>=groove&&beat%4===0)chart.push({id:id++,pad:((pad+1)%4) as Pad,at})
 }
 return chart.filter(n=>n.at<duration-(starter?420:GOOD_MS)).sort((a,b)=>a.at-b.at||a.id-b.id)
}
export class BeatModel {
 private readonly session:GameSession
 readonly chart:readonly BeatNote[]
 private readonly ids:PlayerId[]
 private readonly duration:number
 readonly starter:boolean
 readonly early:number
 readonly late:number
 readonly lead:number
 readonly stage:ReturnType<typeof jamStage>
 private parts:BeatNote[][]
 private aspect:number
 private resolved:Record<PlayerId,Set<number>>={1:new Set(),2:new Set(),3:new Set(),4:new Set()}
 private combo=counts();private best=counts();private hits=counts();private perfect=counts();private misses=counts()
 private judgments:BeatJudgment[]=[];private nextJudgment=1
 private history=new Map<PlayerId,{time:number;points:Set<string>}>()
 private elapsed=0;private lastTime=0;private inputNotBefore=0
 constructor(options:{playerCount?:PlayerCount;countdownMs?:number;roundDurationMs?:number;aspectRatio?:number;pressure?:number}={}){
  const difficulty=Math.min(1,Math.max(-.15,options.pressure??0))
  this.starter=difficulty<.28
  this.early=Math.round(300-90*difficulty);this.late=Math.round(420-210*difficulty);this.lead=this.starter?1050:LEAD_MS
  const count=options.playerCount??1;this.duration=options.roundDurationMs??60000;this.aspect=options.aspectRatio??16/9
  this.session=new GameSession({...options,playerCount:count});this.ids=Array.from({length:count},(_,i)=>(i+1) as PlayerId);this.stage=jamStage(count,this.starter)
  const chart=beatChart(this.duration,options.pressure)
  const instruments=this.ids.map(id=>this.stage.map((p,i)=>p.owner===id?i:-1).filter(i=>i>=0))
  this.chart=count===1?chart:chart.flatMap((note,index)=>{
   const slot=index%count
   const seats=this.starter&&count>=3?this.ids.filter((_,i)=>i%2===index%2):[this.ids[slot]]
   return seats.map(owner=>{
    const pads=instruments[owner-1],pad=pads[Math.floor(index/count)%pads.length] as Pad
    return {...note,id:note.id*4+owner,pad}
   })
  })
  this.parts=this.ids.map(id=>this.chart.filter(n=>this.stage[n.pad].owner===id))
 }
 get hitRadiusY(){return this.starter?Math.min(.18,.27*this.aspect):.14*Math.min(1,this.aspect)}
 get hitRadiusX(){return this.hitRadiusY/(this.aspect*this.ids.length)}
 setAspectRatio(aspect:number){if(Number.isFinite(aspect)&&aspect>0)this.aspect=aspect}
 start(time:number){
  const state=this.session.start(time);this.resolved={1:new Set(),2:new Set(),3:new Set(),4:new Set()}
  this.combo=counts();this.best=counts();this.hits=counts();this.perfect=counts();this.misses=counts();this.history.clear();this.judgments=[];this.nextJudgment=1
  this.lastTime=time;this.elapsed=0;this.inputNotBefore=time+state.countdownRemainingMs;return this.snapshot()
 }
 private advance(time:number){
  if(!Number.isFinite(time))throw new Error('Time must be finite.')
  const now=Math.max(time,this.lastTime),state=this.session.update(now);this.lastTime=now;this.elapsed=this.duration-state.roundRemainingMs
  if(state.phase==='playing'||state.phase==='results'){
   // A 150 ms capture-latency allowance lets an observed on-time strike arrive
   // after a render tick, without permitting late movement to score as on-time.
   for(const id of this.ids)for(const note of this.parts[id-1])if(!this.resolved[id].has(note.id)&&(state.phase==='results'||this.elapsed>note.at+this.late+150)){
    this.resolved[id].add(note.id);this.combo[id]=0;this.misses[id]++
    if(this.elapsed-note.at<900)this.judgments.push({id:this.nextJudgment++,playerId:id,pad:note.pad,kind:'miss',at:note.at+this.late+150,points:0})
   }
   this.judgments=this.judgments.filter(j=>this.elapsed-j.at<850)
  }
  return state
 }
 private apply(event:MotionInputEvent){
  const {playerId:id,timestamp:time}=event
  if(event.kind!=='MOTION_HIT'||!this.ids.includes(id)||!Number.isFinite(time)||time<this.inputNotBefore||time<this.lastTime-150||![event.x,event.y,event.confidence].every(Number.isFinite)||event.x<0||event.x>1||event.y<0||event.y>1||event.confidence<.35||event.confidence>1)return
  const state=this.advance(time);if(state.phase!=='playing')return
  const point=`${event.x}:${event.y}`,previous=this.history.get(id)
  if(previous&&(time<previous.time||time===previous.time&&previous.points.has(point)))return
  const points=previous?.time===time?previous.points:new Set<string>();points.add(point);this.history.set(id,{time,points})
  const captured=this.elapsed-Math.max(0,this.lastTime-time)
  const worldX=(event.x+id-1)/this.ids.length
  const pad=this.stage.findIndex(p=>p.owner===id&&((worldX-p.x)/this.hitRadiusX)**2+((event.y-p.y)/this.hitRadiusY)**2<=1)
  if(pad<0)return
  const note=this.parts[id-1].filter(n=>n.pad===pad&&!this.resolved[id].has(n.id)&&captured>=n.at-this.early&&captured<=n.at+this.late).sort((a,b)=>Math.abs(captured-a.at)-Math.abs(captured-b.at))[0]
  if(!note)return
  this.resolved[id].add(note.id);this.hits[id]++;this.combo[id]++;this.best[id]=Math.max(this.best[id],this.combo[id])
  const perfect=Math.abs(captured-note.at)<=(this.starter?130:PERFECT_MS),multiplier=Math.min(3,1+Math.floor((this.combo[id]-1)/8)),score=(perfect?15:10)*multiplier
  if(perfect)this.perfect[id]++
  this.session.awardScore(id,score)
  this.judgments.push({id:this.nextJudgment++,playerId:id,pad:pad as Pad,kind:perfect?'perfect':'good',at:this.elapsed,points:score})
  if(this.combo[id]%8===0)this.judgments.push({id:this.nextJudgment++,playerId:id,pad:pad as Pad,kind:'combo',at:this.elapsed,points:0})
  return
 }

 update(time:number){this.advance(time);return this.snapshot()}
 hit(event:MotionInputEvent){this.apply(event);return this.snapshot()}
 hitFrame(events:MotionInputEvent[]){
  for(const event of events)this.apply(event)
  return this.snapshot()
 }
 pause(time:number){const state=this.update(time);if(state.phase==='playing'||state.phase==='countdown')this.session.pause(this.lastTime);return this.snapshot()}
 resume(time:number){const now=Math.max(time,this.lastTime),state=this.session.resume(now);this.lastTime=now;this.inputNotBefore=now+state.countdownRemainingMs;this.history.clear();return this.snapshot()}
 /** Read the same round clock for audio lookahead without advancing simulation. */
 playbackAt(time:number){const state=this.session.getSnapshot(Math.max(time,this.lastTime));return {phase:state.phase,elapsed:this.duration-state.roundRemainingMs,duration:this.duration}}
 private snapshot():BeatSnapshot{
  const state=this.session.getSnapshot()
  const notes=this.ids.flatMap(playerId=>this.parts[playerId-1].filter(n=>!this.resolved[playerId].has(n.id)&&this.elapsed>=n.at-this.lead&&this.elapsed<=n.at+this.late).map(n=>({...n,playerId,progress:Math.max(0,Math.min(1,(this.elapsed-n.at+this.lead)/this.lead))})))
  const firstDue=Math.min(...notes.map(n=>n.at))
  const cues=this.starter?notes.filter(n=>n.at===firstDue):notes
  return {...state,elapsed:this.elapsed,beat:this.elapsed/BEAT_MS,section:this.starter?'Follow the light':'Follow the beat',notes:cues,judgments:this.judgments.map(j=>({...j})),combo:{...this.combo},best:{...this.best},hits:{...this.hits},perfect:{...this.perfect},misses:{...this.misses}}
 }
}
