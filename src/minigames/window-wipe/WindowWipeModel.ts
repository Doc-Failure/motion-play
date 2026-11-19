import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export const WIPE_COLUMNS = 40, WIPE_ROWS = 30
export const WIPE_CELLS = WIPE_COLUMNS * WIPE_ROWS
export const WINDOW_CHANGE_MS = 800
export interface InkSpot { id:number; x:number; y:number; remaining:number }
export interface WipeDab { x:number; y:number; radiusX:number; radiusY:number }
export interface WipeStroke { x:number; y:number; angle:number; at:number }
export interface WipeEffect { id:number; playerId:PlayerId; kind:'scrub'|'pop'|'window'; x:number; y:number; born:number }
export interface WindowWipeSnapshot extends GameSessionSnapshot {
  elapsed:number
  dabs:WipeDab[]
  cleaned:number[]
  progress:number
  windows:number
  spots:InkSpot[]
  celebrating:boolean
  strokes:Record<PlayerId,WipeStroke|null>
  effects:WipeEffect[]
}
const strokes=():Record<PlayerId,WipeStroke|null>=>({1:null,2:null,3:null,4:null})
/** The crew shares three ink spots. Their positions rotate between windows. */
export function windowSpots(window:number):InkSpot[] {
  const patterns=[[[.24,.33],[.73,.43],[.48,.73]],[[.7,.28],[.27,.58],[.67,.79]],[[.38,.24],[.76,.61],[.23,.78]]]
  return patterns[window%patterns.length].map(([x,y],id)=>({id,x,y,remaining:3}))
}
export function wipeRadii(aspect:number){return {x:.135*Math.min(1,1/aspect),y:.135*Math.min(1,aspect)}}

/** Only normalized brush samples enter this game; no camera, pixels or pose SDK. */
export class WindowWipeModel {
  private readonly session:GameSession
  private readonly ids:PlayerId[]
  private readonly pressure:number
  private readonly duration:number
  private aspect:number
  private cleaned=new Set<number>()
  private dabs:WipeDab[]=[]
  private windows=0
  private spots:InkSpot[]=[]
  private clearAt:number|null=null
  private strokes=strokes()
  private effects:WipeEffect[]=[]
  private nextEffect=1
  private lastEffect:Record<PlayerId,number>={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity}
  private histories=new Map<PlayerId,{time:number;points:Set<string>}>()
  private spotHistory=new Map<string,{time:number;x:number;y:number}>()
  private windowStarted=0
  private contributors=new Set<PlayerId>()
  private lastTime=0
  private inputNotBefore=0
  private elapsed=0
  constructor(options:{playerCount?:PlayerCount;countdownMs?:number;roundDurationMs?:number;aspectRatio?:number;pressure?:number}={}) {
    const count=options.playerCount??1
    this.pressure=options.pressure??0
    this.duration=options.roundDurationMs??60000;this.aspect=options.aspectRatio??16/9
    this.session=new GameSession({...options,playerCount:count})
    this.ids=Array.from({length:count},(_,i)=>(i+1) as PlayerId)
  }
  setAspectRatio(aspect:number){if(Number.isFinite(aspect)&&aspect>0)this.aspect=aspect}
  start(time:number) {
    const state=this.session.start(time)
    this.cleaned.clear();this.dabs=[];this.windows=0;this.strokes=strokes();this.effects=[];this.nextEffect=1
    this.histories.clear();this.spotHistory.clear();this.clearAt=null;this.contributors.clear()
    this.lastEffect={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity};this.windowStarted=time
    this.spots=windowSpots(0)
    this.elapsed=0;this.lastTime=time;this.inputNotBefore=time+state.countdownRemainingMs
    return this.snapshot()
  }
  private advance(time:number) {
    if(!Number.isFinite(time))throw new Error('Time must be finite.')
    const now=Math.max(time,this.lastTime),state=this.session.update(now)
    this.lastTime=now
    // Remaining time is frozen by GameSession during pauses and ready holds.
    this.elapsed=this.duration-state.roundRemainingMs
    if(state.phase==='playing' && this.clearAt!==null && this.elapsed-this.clearAt>=WINDOW_CHANGE_MS){
      this.clearAt=null;this.cleaned.clear();this.dabs=[];this.spots=windowSpots(this.windows)
      this.strokes=strokes();this.windowStarted=now;this.histories.clear();this.spotHistory.clear();this.contributors.clear()
    }
    if(state.phase==='playing')this.effects=this.effects.filter(effect=>this.elapsed-effect.born<WINDOW_CHANGE_MS)
    if(state.phase==='results'){this.effects=[];this.strokes=strokes()}
    return state
  }
 private apply(event:MotionInputEvent) {
    const {playerId:id,timestamp:time}=event
    // Reject malformed observations BEFORE advancing the clock or touching history.
    if(event.kind!=='MOTION_BRUSH'||!this.ids.includes(id)||!Number.isFinite(time)||time<this.inputNotBefore||time<this.lastTime-150||![event.x,event.y,event.confidence].every(Number.isFinite)||event.x<0||event.x>1||event.y<0||event.y>1||event.confidence<.2||event.confidence>1)return
    const state=this.advance(time)
    if(state.phase!=='playing'||this.clearAt!==null||time<this.windowStarted)return
    const worldX=(id-1+event.x)/this.ids.length
    const point=`${worldX}:${event.y}`,history=this.histories.get(id)
    if(history&&(time<history.time||time===history.time&&history.points.has(point)))return
    const points=history?.time===time?history.points:new Set<string>();points.add(point);this.histories.set(id,{time,points})
    const previous=this.strokes[id],r=wipeRadii(this.aspect),before=this.percent()
    let changed=false
    const left=Math.max(0,Math.floor((worldX-r.x)*WIPE_COLUMNS)),right=Math.min(WIPE_COLUMNS,Math.ceil((worldX+r.x)*WIPE_COLUMNS))
    const top=Math.max(0,Math.floor((event.y-r.y)*WIPE_ROWS)),bottom=Math.min(WIPE_ROWS,Math.ceil((event.y+r.y)*WIPE_ROWS))
    for(let row=top;row<bottom;row++)for(let column=left;column<right;column++){
      const x=(column+.5)/WIPE_COLUMNS,y=(row+.5)/WIPE_ROWS
      if(((worldX-x)/r.x)**2+((event.y-y)/r.y)**2<=1){const cell=row*WIPE_COLUMNS+column;if(!this.cleaned.has(cell)){this.cleaned.add(cell);changed=true}}
    }
    if(changed)this.dabs.push({x:worldX,y:event.y,radiusX:r.x,radiusY:r.y})
    this.session.awardScore(id,this.percent()-before)
    for(const spot of this.spots){
      const dx=(worldX-spot.x)/(r.x+.035),dy=(event.y-spot.y)/(r.y+.035*Math.min(1,this.aspect))
      if(!spot.remaining||dx*dx+dy*dy>1)continue
      const key=String(spot.id),last=this.spotHistory.get(key)
      if(last&&(time-last.time<160||Math.hypot((worldX-last.x)*this.aspect,event.y-last.y)<.018*Math.min(1,this.aspect)))continue
      this.spotHistory.set(key,{time,x:worldX,y:event.y});spot.remaining--;changed=true
      if(!spot.remaining){this.session.awardScore(id,10);this.effect(id,'pop',spot.x,spot.y)}
    }
    if(changed){
      this.contributors.add(id)
      const angle=previous&&this.elapsed-previous.at<350?Math.max(-40,Math.min(40,Math.atan2(event.y-previous.y,(worldX-previous.x)*this.aspect)*25)):0
      this.strokes[id]={x:worldX,y:event.y,angle,at:this.elapsed}
      if(this.elapsed-this.lastEffect[id]>=100){this.effect(id,'scrub',worldX,event.y);this.lastEffect[id]=this.elapsed}
    }
    if(this.percent()>=86+Math.min(4,this.windows)*1.2+4*this.pressure&&this.spots.every(spot=>!spot.remaining)){
      const crew=this.ids.filter(player=>this.contributors.has(player))
      const bonus=150-this.percent()
      crew.forEach((player,i)=>this.session.awardScore(player,Math.floor(bonus/crew.length)+Number(i<bonus%crew.length)))
      this.clearAt=this.elapsed;this.windows++;this.effect(id,'window',.5,.5)
    }
    return
  }

 update(time:number){this.advance(time);return this.snapshot()}
 brush(event:MotionInputEvent){this.apply(event);return this.snapshot()}
 brushFrame(events:MotionInputEvent[]){
  for(const event of events)this.apply(event)
  return this.snapshot()
 }
 pause(time:number){const state=this.update(time);if(state.phase==='playing'||state.phase==='countdown')this.session.pause(this.lastTime);return this.snapshot()}
  resume(time:number){const now=Math.max(time,this.lastTime),state=this.session.resume(now);this.lastTime=now;this.inputNotBefore=now+state.countdownRemainingMs;this.histories.clear();this.strokes=strokes();return this.snapshot()}
  private percent(){return Math.floor(this.cleaned.size/WIPE_CELLS*100)}
  private effect(playerId:PlayerId,kind:WipeEffect['kind'],x:number,y:number){this.effects.push({id:this.nextEffect++,playerId,kind,x,y,born:this.elapsed})}
  private snapshot():WindowWipeSnapshot {
    const progress=this.clearAt!==null?100:Math.floor(this.percent()*.9+(9-this.spots.reduce((n,s)=>n+s.remaining,0))/9*10)
    return {...this.session.getSnapshot(),elapsed:this.elapsed,dabs:this.dabs.map(d=>({...d})),cleaned:[...this.cleaned],
      progress,windows:this.windows,celebrating:this.clearAt!==null,spots:this.spots.map(s=>({...s})),
      strokes:{...this.strokes},effects:this.effects.map(e=>({...e}))}
  }
}
