import {GameSession,type GameSessionOptions} from '../../game/GameSession'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerId} from '../../input/PlayerZoneMapper'
export const colors=['#ffd36b','#72e4ef','#f8a4cf']
export const symbols=['Sun','Diamond','Heart']
export interface Rocket {id:number;playerId:PlayerId;color:number;born:number;expires:number;x:number;y:number;selected:boolean}
export interface Burst {id:number;playerId:PlayerId;color:number;x:number;y:number;at:number;size:number;points:number}
const counts=()=>({1:0,2:0,3:0,4:0})
export class RocketModel {
 private session:GameSession
 private duration:number
 private players:number
 private elapsed=0
 private lastTime=0
 private notBefore=0
 private nextWave=0
 private id=1
 private aspect=1
 private rockets:Rocket[]=[]
 private bursts:Burst[]=[]
 private chains=counts()
 private best=counts()
 private cooldown={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity}
 private history=new Map<string,number>()
 constructor(options:GameSessionOptions&{aspectRatio?:number}){this.session=new GameSession(options);this.duration=options.roundDurationMs??60000;this.players=options.playerCount;this.setAspectRatio(options.aspectRatio??1)}
 setAspectRatio(value:number){if(Number.isFinite(value)&&value>0)this.aspect=value}
 start(time:number){this.session.start(time);this.elapsed=0;this.lastTime=time;this.notBefore=time+this.session.getSnapshot().countdownRemainingMs;this.nextWave=0;this.id=1;this.rockets=[];this.bursts=[];this.chains=counts();this.best=counts();this.cooldown={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity};this.history.clear();return this.update(time)}
 update(time:number){
  if(!Number.isFinite(time))throw new Error('Time must be finite')
  const now=Math.max(time,this.lastTime),s=this.session.update(now);this.lastTime=now
  if(s.phase==='playing'||s.phase==='results'){
   this.elapsed=this.duration-s.roundRemainingMs
   while(this.nextWave<this.duration&&this.nextWave<=this.elapsed){
    const born=this.nextWave,wave=Math.floor(born/6000)
    this.rockets=this.rockets.filter(r=>born<r.expires)
    for(let p=1;p<=this.players;p++)for(let i=0;i<9;i++){
     if(this.rockets.filter(r=>r.playerId===p).length>=12)break
     this.rockets.push({id:this.id++,playerId:p as PlayerId,color:(i+Math.floor(i/3)+wave)%3,born:born+i*130,expires:Math.min(born+(born>=45000?6000:8500),born<45000?45000:Infinity),x:[.2,.5,.8][i%3],y:[.25,.43,.61][Math.floor(i/3)],selected:false})
    }
    this.nextWave=Math.min(born+(born>=45000?6000:8500),born<45000?45000:Infinity)
   }
   this.rockets=this.rockets.filter(r=>this.elapsed<r.expires)
   this.bursts=this.bursts.filter(b=>this.elapsed-b.at<1800)
  }
  if(s.phase==='results')this.rockets=[]
  return this.snapshot()
 }
 private position(r:Rocket){const age=this.elapsed-r.born;return {...r,y:age<900?1.08+(r.y-1.08)*Math.sin(Math.max(0,age)/900*Math.PI/2):r.y+Math.sin((age-900)/900+r.id)*.018}}
 hit(e:MotionInputEvent){
  if(e.kind!=='MOTION_HIT'||!Number.isInteger(e.playerId)||e.playerId<1||e.playerId>this.players||!Number.isFinite(e.timestamp)||e.timestamp<this.notBefore||e.timestamp<this.lastTime-120||!Number.isFinite(e.confidence)||e.confidence<.25||e.confidence>1||![e.x,e.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1))return this.snapshot()
  const prior=this.history.get(`${e.playerId}:${e.x}:${e.y}`)
  if(prior!==undefined&&e.timestamp<=prior)return this.snapshot()
  const s=this.update(e.timestamp);if(s.phase!=='playing')return s
  if(this.history.size>512)for(const [key,time] of this.history)if(time<e.timestamp-150)this.history.delete(key)
  this.history.set(`${e.playerId}:${e.x}:${e.y}`,e.timestamp)
  if(this.elapsed-this.cooldown[e.playerId]<180)return s
  const chosen=this.rockets.filter(r=>r.playerId===e.playerId&&r.selected)
  const sx=Math.min(1,1/this.aspect),sy=Math.min(1,this.aspect)
  if(chosen.length>=2&&Math.abs(e.x-.5)<=.16*sx&&Math.abs(e.y-.82)<=.1*sy){
   const points=10*chosen.length*chosen.length
   this.session.awardScore(e.playerId,points);this.chains[e.playerId]++;this.best[e.playerId]=Math.max(this.best[e.playerId],chosen.length)
   chosen.forEach((r,i)=>{const pos=this.position(r);this.bursts.push({id:this.id++,playerId:e.playerId,color:r.color,x:pos.x,y:Math.max(.2,pos.y-.13),at:this.elapsed+180+i*140,size:chosen.length,points:i===0?points:0})})
   this.rockets=this.rockets.filter(r=>!chosen.includes(r));this.cooldown[e.playerId]=this.elapsed;return this.snapshot()
  }
  const target=this.rockets.find(r=>{const p=this.position(r);return r.playerId===e.playerId&&!r.selected&&this.elapsed-r.born>=900&&((e.x-p.x)/(.09*sx))**2+((e.y-p.y)/(.09*sy))**2<=1})
  if(target&&(!chosen.length||chosen[0].color===target.color)){target.selected=true;this.cooldown[e.playerId]=this.elapsed}
  return this.snapshot()
 }
 pause(time:number){const s=this.update(time);if(s.phase==='playing'||s.phase==='countdown')this.session.pause(this.lastTime);return this.snapshot()}
 resume(time:number){this.session.resume(time);this.lastTime=time;this.notBefore=time;return this.snapshot()}
 snapshot(){return {...this.session.getSnapshot(),elapsed:this.elapsed,rockets:this.rockets.filter(r=>this.elapsed>=r.born).map(r=>this.position(r)),bursts:this.bursts.map(b=>({...b})),chains:{...this.chains},best:{...this.best},finale:this.elapsed>=45000}}
}
export type RocketSnapshot=ReturnType<RocketModel['snapshot']>
