import {GameSession,type GameSessionOptions} from '../../game/GameSession'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerId} from '../../input/PlayerZoneMapper'
export interface Bug {id:number;playerId:PlayerId;born:number;expires:number;x:number;y:number;kind:'scout'|'spring'|'armored';health:number}
export interface Web {id:number;playerId:PlayerId;at:number;x:number;y:number;toX:number;toY:number;kind:'miss'|'tug'|'catch';points:number;bug:Bug|null}
const perches = [
 {x:.5,y:.31}, {x:.24,y:.54}, {x:.76,y:.32},
 {x:.5,y:.65}, {x:.24,y:.24}, {x:.76,y:.6},
]
const counters=()=>({1:0,2:0,3:0,4:0})
export class SilkModel {
 private session:GameSession;private duration:number;private count:number;private aspect=1
 private readonly pressure:number
 private wave=0
 private elapsed=0;private last=0;private notBefore=0;private spawn=0;private id=1
 private bugs:Bug[]=[];private webs:Web[]=[];private catches=counters();private combos=counters();private best=counters()
 private inputs=new Map<string,number>()
 private aim:Partial<Record<PlayerId,{x:number;y:number;at:number}>>={}
 private shots={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity};private captures=counters()
 constructor(options:GameSessionOptions&{aspectRatio?:number;pressure?:number}){this.pressure=Math.max(0,Math.min(1,options.pressure??0));this.count=options.playerCount;this.duration=options.roundDurationMs??60000;this.session=new GameSession(options);this.setAspectRatio(options.aspectRatio??1)}
 setAspectRatio(n:number){if(Number.isFinite(n)&&n>0)this.aspect=n}
 start(t:number){const s=this.session.start(t);this.elapsed=0;this.last=t;this.notBefore=t+s.countdownRemainingMs;this.spawn=0;this.wave=0;this.id=1;this.bugs=[];this.webs=[];this.catches=counters();this.combos=counters();this.best=counters();this.aim={};this.shots={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity};this.captures=counters();this.inputs.clear();return this.update(t)}
 update(t:number){
  const now=Math.max(t,this.last),s=this.session.update(now);this.last=now
  if(s.phase==='playing'||s.phase==='results'){
   this.elapsed=this.duration-s.roundRemainingMs
   while(this.spawn<this.duration&&this.spawn<=this.elapsed){
    this.bugs=this.bugs.filter(b=>b.expires>this.spawn)
    const armorEvery=6-Math.round(2*this.pressure)
    const kind=(this.wave+1)%armorEvery===0?'armored':this.wave%3===2?'spring':'scout'
    for(let p=1;p<=this.count;p++){
     const neighbors=this.bugs.filter(b=>b.playerId===p)
     if(neighbors.length>=5)continue
     // Distinct resting points keep a new spawn away from an existing beetle.
     const perch=perches.map((_,i)=>perches[(this.wave+i)%perches.length]).find(point=>
       neighbors.every(other=>other.x!==point.x||other.y!==point.y))
     if(perch)this.bugs.push({id:this.id++,playerId:p as PlayerId,born:this.spawn,expires:this.spawn+7200-1000*this.pressure,...perch,kind,health:kind==='armored'?2:1})
    }
    this.wave++
    this.spawn+=Math.max(760,1600-360*this.pressure-Math.floor(this.spawn/(this.duration/4))*140)
   }
   this.bugs=this.bugs.filter(b=>b.expires>this.elapsed);this.webs=this.webs.filter(w=>this.elapsed-w.at<1500)
   for(let p=1;p<=this.count;p++)if(this.elapsed-this.captures[p as PlayerId]>3000)this.combos[p as PlayerId]=0
  }
  if(s.phase==='results')this.bugs=[]
  return this.snapshot()
 }
 private position(b:Bug,elapsed=this.elapsed){const t=(elapsed-b.born)/1000;return {...b,x:Math.max(.12,Math.min(.88,b.x+Math.sin(t*(1.2+.5*this.pressure)+b.born/1000)*(.042+.025*this.pressure))),y:b.y+Math.sin(t*(b.kind==='spring'?3.4:1.2)+b.born/1000)*.04}}
 input(e:MotionInputEvent){
  if(!['ARM_POSITION','ARM_MOVE'].includes(e.kind)||!Number.isInteger(e.playerId)||e.playerId<1||e.playerId>this.count||!Number.isFinite(e.timestamp)||e.timestamp<this.notBefore||e.timestamp<this.last-400||!Number.isFinite(e.confidence)||e.confidence<.6||e.confidence>1||![e.x,e.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))return this.snapshot()
  const key=`${e.playerId}:${e.kind}`
  if(e.timestamp<=(this.inputs.get(key)??-Infinity))return this.snapshot()
  const s=this.update(e.timestamp);if(s.phase!=='playing')return s
  this.inputs.set(key,e.timestamp)
  const p=e.playerId;this.aim[p]={x:e.x,y:e.y,at:this.elapsed}
  if(e.kind==='ARM_POSITION'||this.elapsed-this.shots[p]<350)return this.snapshot()
  this.shots[p]=this.elapsed
  const rx=.115*Math.min(1,1/this.aspect),ry=.115*Math.min(1,this.aspect)
  // Resolve bounded inference delay against the target at capture time.
  const capturedElapsed=this.elapsed-Math.max(0,this.last-e.timestamp)
  const bug=this.bugs.filter(b=>b.born<=capturedElapsed).map(b=>this.position(b,capturedElapsed)).filter(b=>b.playerId===p&&((e.x-b.x)/rx)**2+((e.y-b.y)/ry)**2<=1).sort((a,b)=>Math.hypot(a.x-e.x,a.y-e.y)-Math.hypot(b.x-e.x,b.y-e.y))[0]
  let points=0,kind:Web['kind']='miss'
  if(bug){const actual=this.bugs.find(b=>b.id===bug.id)!;actual.health--;kind=actual.health?'tug':'catch';if(!actual.health){this.bugs=this.bugs.filter(b=>b.id!==bug.id);this.catches[p]++;this.combos[p]++;this.best[p]=Math.max(this.best[p],this.combos[p]);this.captures[p]=this.elapsed;points=(bug.kind==='armored'?30:10)*Math.min(3,1+Math.floor(this.combos[p]/4));this.session.awardScore(p,points)}}else this.combos[p]=0
  const origin=e.origin&&[e.origin.x,e.origin.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1)?e.origin:{x:e.x,y:Math.min(.9,e.y+.14)}
  this.webs.push({id:this.id++,playerId:p,at:this.elapsed,x:origin.x,y:origin.y,toX:bug?.x??e.x,toY:bug?.y??Math.max(.1,e.y-.22),kind,points,bug:bug??null})
  return this.snapshot()
 }
 pause(t:number){const s=this.update(t);if(s.phase==='countdown'||s.phase==='playing')this.session.pause(this.last);this.aim={};return this.snapshot()}
 resume(t:number){this.session.resume(t);this.last=t;this.notBefore=t;return this.snapshot()}
 snapshot(){return {...this.session.getSnapshot(),elapsed:this.elapsed,bugs:this.bugs.map(b=>this.position(b)),webs:this.webs.map(w=>({...w})),aim:{...this.aim},catches:{...this.catches},combos:{...this.combos},best:{...this.best}}}
}
