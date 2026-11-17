import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const WIPE_COLUMNS = 40, WIPE_ROWS = 30
export const WIPE_CELLS = WIPE_COLUMNS * WIPE_ROWS
export const WINDOW_CHANGE_MS = 1200
export interface InkSpot { id:number; x:number; y:number; remaining:number }
export interface WipeDab { x:number; y:number; radiusX:number; radiusY:number }
export interface WipeStroke { x:number; y:number; angle:number; at:number }
export interface WipeEffect { id:number; playerId:PlayerId; kind:'scrub'|'pop'|'window'; x:number; y:number; born:number }
export interface WindowWipeSnapshot extends GameSessionSnapshot {
  elapsed:number
  dabs:Record<PlayerId,WipeDab[]>
  cleaned:Record<PlayerId,number[]>
  progress:Record<PlayerId,number>
  windows:Record<PlayerId,number>
  spots:Record<PlayerId,InkSpot[]>
  celebrating:Record<PlayerId,boolean>
  strokes:Record<PlayerId,WipeStroke|null>
  effects:WipeEffect[]
}
const counts=():Record<PlayerId,number>=>({1:0,2:0,3:0,4:0})
const sets=():Record<PlayerId,Set<number>>=>({1:new Set(),2:new Set(),3:new Set(),4:new Set()})
const strokes=():Record<PlayerId,WipeStroke|null>=>({1:null,2:null,3:null,4:null})
/** Equal original layouts for every player. Spot locations rotate between windows. */
export function windowSpots(window:number):InkSpot[] {
  const patterns=[[[.24,.33],[.73,.43],[.48,.73]],[[.7,.28],[.27,.58],[.67,.79]],[[.38,.24],[.76,.61],[.23,.78]]]
  return patterns[window%patterns.length].map(([x,y],id)=>({id,x,y,remaining:3}))
}
export function wipeRadii(aspect:number){return {x:.135*Math.min(1,1/aspect),y:.135*Math.min(1,aspect)}}

/** Only normalized brush samples enter this game; no camera, pixels or pose SDK. */
export class WindowWipeModel {
  private readonly session:GameSession
  private readonly ids:PlayerId[]
  private readonly duration:number
  private aspect:number
  private cleaned=sets()
  private dabs:Record<PlayerId,WipeDab[]>={1:[],2:[],3:[],4:[]}
  private windows=counts()
  private spots:Record<PlayerId,InkSpot[]>={1:[],2:[],3:[],4:[]}
  private clearAt:Record<PlayerId,number|null>={1:null,2:null,3:null,4:null}
  private strokes=strokes()
  private effects:WipeEffect[]=[]
  private nextEffect=1
  private lastEffect:Record<PlayerId,number>={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity}
  private histories=new Map<PlayerId,{time:number;points:Set<string>}>()
  private spotHistory=new Map<string,{time:number;x:number;y:number}>()
  private windowStarted=counts()
  private lastTime=0
  private inputNotBefore=0
  private elapsed=0
  constructor(options:{playerCount?:PlayerCount;countdownMs?:number;roundDurationMs?:number;aspectRatio?:number}={}) {
    const count=options.playerCount??1
    this.duration=options.roundDurationMs??60000;this.aspect=options.aspectRatio??16/9
    this.session=new GameSession({...options,playerCount:count})
    this.ids=Array.from({length:count},(_,i)=>(i+1) as PlayerId)
  }
  setAspectRatio(aspect:number){if(Number.isFinite(aspect)&&aspect>0)this.aspect=aspect}
  start(time:number) {
    const state=this.session.start(time)
    this.cleaned=sets();this.dabs={1:[],2:[],3:[],4:[]};this.windows=counts();this.strokes=strokes();this.effects=[];this.nextEffect=1
    this.histories.clear();this.spotHistory.clear();this.clearAt={1:null,2:null,3:null,4:null}
    this.lastEffect={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity};this.windowStarted=counts()
    for(const id of this.ids)this.spots[id]=windowSpots(0)
    this.elapsed=0;this.lastTime=time;this.inputNotBefore=time+state.countdownRemainingMs
    return this.snapshot()
  }
  update(time:number) {
    if(!Number.isFinite(time))throw new Error('Time must be finite.')
    const now=Math.max(time,this.lastTime),state=this.session.update(now)
    this.lastTime=now
    // Remaining time is frozen by GameSession during pauses and ready holds.
    this.elapsed=this.duration-state.roundRemainingMs
    if(state.phase==='playing')for(const id of this.ids){
      if(this.clearAt[id]!==null&&this.elapsed-this.clearAt[id]!>=WINDOW_CHANGE_MS){
        this.clearAt[id]=null;this.cleaned[id]=new Set();this.dabs[id]=[];this.spots[id]=windowSpots(this.windows[id])
        this.strokes[id]=null;this.windowStarted[id]=now;this.histories.delete(id)
        for(const spot of this.spots[id])this.spotHistory.delete(`${id}:${spot.id}`)
      }
    }
    if(state.phase==='playing')this.effects=this.effects.filter(effect=>this.elapsed-effect.born<WINDOW_CHANGE_MS)
    if(state.phase==='results'){this.effects=[];this.strokes=strokes()}
    return this.snapshot()
  }
  brush(event:MotionInputEvent) {
    const {playerId:id,timestamp:time}=event
    // Reject malformed observations BEFORE advancing the clock or touching history.
    if(event.kind!=='MOTION_BRUSH'||!this.ids.includes(id)||!Number.isFinite(time)||time<this.inputNotBefore||time<this.lastTime-150||![event.x,event.y,event.confidence].every(Number.isFinite)||event.x<0||event.x>1||event.y<0||event.y>1||event.confidence<.2||event.confidence>1)return this.snapshot()
    const state=this.update(time)
    if(state.phase!=='playing'||this.clearAt[id]!==null||time<this.windowStarted[id])return state
    const point=`${event.x}:${event.y}`,history=this.histories.get(id)
    if(history&&(time<history.time||time===history.time&&history.points.has(point)))return state
    const points=history?.time===time?history.points:new Set<string>();points.add(point);this.histories.set(id,{time,points})
    const previous=this.strokes[id],r=wipeRadii(this.aspect),before=this.percent(id)
    let changed=false
    for(let row=0;row<WIPE_ROWS;row++)for(let column=0;column<WIPE_COLUMNS;column++){
      const x=(column+.5)/WIPE_COLUMNS,y=(row+.5)/WIPE_ROWS
      if(((event.x-x)/r.x)**2+((event.y-y)/r.y)**2<=1){const cell=row*WIPE_COLUMNS+column;if(!this.cleaned[id].has(cell)){this.cleaned[id].add(cell);changed=true}}
    }
    if(changed)this.dabs[id].push({x:event.x,y:event.y,radiusX:r.x,radiusY:r.y})
    this.session.awardScore(id,this.percent(id)-before)
    for(const spot of this.spots[id]){
      const dx=(event.x-spot.x)/(r.x+.035),dy=(event.y-spot.y)/(r.y+.035*Math.min(1,this.aspect))
      if(!spot.remaining||dx*dx+dy*dy>1)continue
      const key=`${id}:${spot.id}`,last=this.spotHistory.get(key)
      if(last&&(time-last.time<160||Math.hypot((event.x-last.x)*this.aspect,event.y-last.y)<.018*Math.min(1,this.aspect)))continue
      this.spotHistory.set(key,{time,x:event.x,y:event.y});spot.remaining--;changed=true
      if(!spot.remaining){this.session.awardScore(id,10);this.effect(id,'pop',spot.x,spot.y)}
    }
    if(changed){
      const angle=previous&&this.elapsed-previous.at<350?Math.max(-40,Math.min(40,Math.atan2(event.y-previous.y,(event.x-previous.x)*this.aspect)*25)):0
      this.strokes[id]={x:event.x,y:event.y,angle,at:this.elapsed}
      if(this.elapsed-this.lastEffect[id]>=100){this.effect(id,'scrub',event.x,event.y);this.lastEffect[id]=this.elapsed}
    }
    if(this.percent(id)>=94&&this.spots[id].every(spot=>!spot.remaining)){
      this.session.awardScore(id,100-this.percent(id)+50)
      this.clearAt[id]=this.elapsed;this.windows[id]++;this.effect(id,'window',.5,.5)
    }
    return this.snapshot()
  }
  pause(time:number){const state=this.update(time);if(state.phase==='playing'||state.phase==='countdown')this.session.pause(this.lastTime);return this.snapshot()}
  resume(time:number){const now=Math.max(time,this.lastTime),state=this.session.resume(now);this.lastTime=now;this.inputNotBefore=now+state.countdownRemainingMs;this.histories.clear();this.strokes=strokes();return this.snapshot()}
  private percent(id:PlayerId){return Math.floor(this.cleaned[id].size/WIPE_CELLS*100)}
  private effect(playerId:PlayerId,kind:WipeEffect['kind'],x:number,y:number){this.effects.push({id:this.nextEffect++,playerId,kind,x,y,born:this.elapsed})}
  private snapshot():WindowWipeSnapshot {
    const dabs:Record<PlayerId,WipeDab[]>={1:[],2:[],3:[],4:[]},cleaned:Record<PlayerId,number[]>={1:[],2:[],3:[],4:[]},progress=counts(),celebrating={1:false,2:false,3:false,4:false},spots:Record<PlayerId,InkSpot[]>={1:[],2:[],3:[],4:[]}
    for(const id of this.ids){dabs[id]=this.dabs[id].map(dab=>({...dab}));cleaned[id]=[...this.cleaned[id]];celebrating[id]=this.clearAt[id]!==null;progress[id]=celebrating[id]?100:Math.floor(this.percent(id)*.9+(9-this.spots[id].reduce((sum,spot)=>sum+spot.remaining,0))/9*10);spots[id]=this.spots[id].map(spot=>({...spot}))}
    return {...this.session.getSnapshot(),elapsed:this.elapsed,dabs,cleaned,progress,windows:{...this.windows},celebrating,spots,strokes:{...this.strokes},effects:this.effects.map(effect=>({...effect}))}
  }
}
