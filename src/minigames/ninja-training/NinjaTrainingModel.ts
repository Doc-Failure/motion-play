import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

import { dojoRank, ONI_REPEL_HITS, PLAYER_HEALTH } from './dojoRanks'

export interface PaperNinja { id:number; playerId:PlayerId; side:-1|1; level:number; born:number; flightMs:number; hp:number; chargeHits:number; lastSwat:number; x:number; y:number; progress:number; pose:'run'|'ready'|'leap' }
export interface DojoEffect { id:number; playerId:PlayerId; kind:'hit'|'miss'|'armor'; x:number; y:number; born:number; side:number; points:number }
export interface DojoSnapshot extends GameSessionSnapshot {
  health:Record<PlayerId,number>; elapsed:number; wave:number; ninjas:PaperNinja[]; effects:DojoEffect[]
  combos:Record<PlayerId,number>; bestCombos:Record<PlayerId,number>; misses:Record<PlayerId,number>; hits:Record<PlayerId,number>
}
const counters = ():Record<PlayerId,number> => ({1:0,2:0,3:0,4:0})

/** An elapsed-time simulation: rendering, pause length and camera frame cadence do not change trajectories. */
export class NinjaTrainingModel {
  private readonly session:GameSession
  private health=counters()
  readonly rank:ReturnType<typeof dojoRank>
  readonly boss:boolean
  readonly radius:number
  private readonly count:PlayerCount
  private readonly pressure:number
  private readonly duration:number
  private aspect:number
  private ninjas:PaperNinja[]=[]
  private effects:DojoEffect[]=[]
  private combos=counters(); private best=counters(); private misses=counters(); private hits=counters()
  private lastHit=counters()
  private elapsed=0; private nextSpawn=0; private nextId=1; private wave=0; private lastTime=0; private inputNotBefore=0
  private inputHistory=new Map<string,{timestamp:number; points:Set<string>}>()
  constructor(options:{playerCount?:PlayerCount; countdownMs?:number; roundDurationMs?:number; aspectRatio?:number;pressure?:number; level?:number}={}) {
    this.rank=dojoRank(options.level??1)
    this.boss=this.rank.slug==='oni'
    this.radius=this.boss ? .15 : .1
    this.pressure=options.pressure??0;this.count=options.playerCount??1; this.duration=options.roundDurationMs??60_000
    this.session=new GameSession({...options,playerCount:this.count})
    this.aspect=options.aspectRatio??1
  }
  setAspectRatio(aspect:number) { if(Number.isFinite(aspect)&&aspect>0)this.aspect=aspect }
  start(time:number) {
    // Replays create a fresh session even when restarted from a paused game.
    if(this.session.getSnapshot().phase!=='idle'&&this.session.getSnapshot().phase!=='results') throw new Error('Finish the current round before replaying.')
    const state=this.session.start(time)
    this.health=counters(); for(let i=1;i<=this.count;i++)this.health[i as PlayerId]=PLAYER_HEALTH
    this.inputHistory.clear()
    this.ninjas=[];this.effects=[];this.combos=counters();this.best=counters();this.misses=counters();this.hits=counters()
    this.lastHit=counters()
    this.elapsed=0;this.nextSpawn=0;this.nextId=1;this.wave=0;this.lastTime=time;this.inputNotBefore=time+state.countdownRemainingMs
    return this.update(time)
  }
  update(time:number):DojoSnapshot {
    if(!Number.isFinite(time)) throw new Error('Time must be finite.')
    const now=Math.max(time,this.lastTime), before=this.session.getSnapshot()
    // Advance up to the final playing instant so late rendering still resolves every approach.
    const end=this.lastTime+before.countdownRemainingMs+before.roundRemainingMs
    const simTime=(before.phase==='countdown'||before.phase==='playing')?Math.min(now,Math.max(this.lastTime,end-.001)):now
    const state=this.session.update(simTime)
    if(state.phase==='playing') {
      const elapsed=this.duration-state.roundRemainingMs
      // Scheduled spawn/expiry events preserve results across coarse and fine time steps.
      while(this.nextSpawn<=elapsed) {
        const at=this.nextSpawn
        this.expire(at)
        const wave=Math.floor(at/6000), flightMs=this.boss ? this.rank.flight : this.rank.flight*Math.max(.87, 1-Math.min(wave,8)*.034-.07*this.pressure)
        if(!this.boss || at===0) {
          for(let i=1;i<=this.count;i++) {
            const playerId=i as PlayerId
            if(this.health[playerId]>0 && this.ninjas.filter(n=>n.playerId===playerId).length<5) this.ninjas.push({id:this.nextId++,playerId,side:([ -1,1,-1,1,1,-1,1,-1 ] as const)[this.wave%8],level:Math.floor(this.wave/2)%3,born:at,flightMs,hp:this.rank.hits,chargeHits:0,lastSwat:-Infinity,x:0,y:0,progress:0,pose:'run'})
          }
        }
        this.wave++
        this.nextSpawn+=this.boss ? 850+flightMs : Math.max(650,1550-Math.floor(at/6000)*90-190*this.pressure)
      }
      this.expire(elapsed)
      this.elapsed=elapsed
      this.effects=this.effects.filter(effect=>elapsed-effect.born<850)
      for(let i=1;i<=this.count;i++) if(elapsed-this.lastHit[i as PlayerId]>2200)this.combos[i as PlayerId]=0
    }
    const bossFinished=this.boss && this.ninjas.length===0 && !this.effects.some(e=>e.kind==='hit')
    if(state.phase==='playing' && (this.allOut() || bossFinished))this.session.finish(simTime)
    const final=this.session.update(now)
    this.lastTime=now
    if(final.phase==='results') {this.ninjas=[];this.effects=[]}
    return this.snapshot()
  }
  hit(event:MotionInputEvent) {
    if(event.kind!=='MOTION_HIT'||!Number.isInteger(event.playerId)||event.playerId<1||event.playerId>this.count||!Number.isFinite(event.timestamp)||event.timestamp<this.inputNotBefore||event.timestamp<this.lastTime-150||!Number.isFinite(event.confidence)||event.confidence<.2||event.confidence>1||![event.x,event.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1)) return this.snapshot()
    const state=this.update(event.timestamp)
    if(state.phase!=='playing'||this.health[event.playerId]===0)return state
    const id=event.playerId, captured=Math.max(0,this.elapsed-Math.max(0,this.lastTime-event.timestamp))
    // Permit distinct spatial samples from one frame, but never replay old captures.
    const key=`${id}:${event.kind}`, point=`${event.x}:${event.y}`, previous=this.inputHistory.get(key)
    if(previous && (event.timestamp<previous.timestamp || (event.timestamp===previous.timestamp && previous.points.has(point))))return state
    const points=previous?.timestamp===event.timestamp?previous.points:new Set<string>()
    points.add(point);this.inputHistory.set(key,{timestamp:event.timestamp,points})
    const target=this.ninjas.find(n=> {
      if(n.playerId!==id||captured<n.born+850)return false
      const p=this.position(n,captured)
      return this.overlaps(event,p,this.radius)
    })
    if(target) {
      if(captured-target.lastSwat<210)return state
      target.lastSwat=captured
      target.hp--
      if(this.boss)target.chargeHits++
      if(target.hp>0) {
        const p=this.position(target,captured)
        this.effects.push({id:this.nextId++,playerId:id,kind:'armor',x:p.x,y:p.y,born:this.elapsed,side:target.side,points:0})
        return this.snapshot()
      }
      this.ninjas=this.ninjas.filter(n=>n.id!==target.id)
      this.combos[id]=this.elapsed-this.lastHit[id]>2200?1:this.combos[id]+1
      this.lastHit[id]=this.elapsed;this.best[id]=Math.max(this.best[id],this.combos[id]);this.hits[id]++
      const points=this.boss ? 160 : 10*Math.min(3,1+Math.floor((this.combos[id]-1)/4)), p=this.position(target,captured)
      this.session.awardScore(id,points)
      this.effects.push({id:this.nextId++,playerId:id,kind:'hit',x:p.x,y:p.y,born:this.elapsed,side:target.side,points})
    }
    return this.snapshot()
  }
  pause(time:number) {
    const state=this.update(time)
    if(state.phase==='playing'||state.phase==='countdown') this.session.pause(this.lastTime)
    return this.snapshot()
  }
  resume(time:number) {
    const now=Math.max(time,this.lastTime)
    if(this.session.getSnapshot().phase==='paused')this.inputNotBefore=now+this.session.resume(now).countdownRemainingMs
    this.lastTime=now
    return this.snapshot()
  }
  private allOut() { return !Object.values(this.health).some(hp=>hp>0) }
  private damage(id:PlayerId) {
    this.health[id]=Math.max(0,this.health[id]-1)
  }
  private expire(at:number) {
    for(const n of this.ninjas) {
      const end=n.born+850+n.flightMs
      if(at<end||this.health[n.playerId]===0)continue
      if(!this.boss || n.chargeHits<ONI_REPEL_HITS){
        this.damage(n.playerId)
        this.session.awardScore(n.playerId,-5);this.misses[n.playerId]++;this.combos[n.playerId]=0
        const p=this.position(n,end)
        this.effects.push({id:this.nextId++,playerId:n.playerId,kind:'miss',x:p.x,y:p.y,born:end,side:n.side,points:-5})
      }
      if(this.boss && this.health[n.playerId]>0){
        n.chargeHits=0
        n.born=end
        n.side=n.side===-1?1:-1
        n.level=(n.level+1)%3
      }
    }
    this.ninjas=this.ninjas.filter(n=>this.health[n.playerId]>0&&at<n.born+850+n.flightMs)
  }
  private position(n:PaperNinja,at:number):PaperNinja {
    const age=Math.max(0,at-n.born), progress=Math.max(0,Math.min(1,(age-850)/n.flightMs)), startY=[.44,.655,.87][n.level]-.1*Math.min(1,this.aspect)
    const distance=age<350?.10+.05*age/350:age<850?.15:.15+.35*progress
    const inset=this.boss ? Math.max(distance,this.radius*Math.min(1.5,1/this.aspect)) : distance
    return {...n,x:n.side===-1?inset:1-inset,y:startY+(.55-startY)*progress-Math.sin(progress*Math.PI)*.19,progress,pose:age<350?'run':age<850?'ready':'leap'}
  }
  private overlaps(a:{x:number;y:number},b:{x:number;y:number},radius:number) {
    return ((a.x-b.x)/(radius*Math.min(1.5,1/this.aspect)))**2+((a.y-b.y)/(radius*Math.min(1,1.5*this.aspect)))**2<=1
  }
  private snapshot():DojoSnapshot {
    return {...this.session.getSnapshot(),health:{...this.health},elapsed:this.elapsed,wave:1+Math.floor(this.elapsed/6000),ninjas:this.ninjas.map(n=>this.position(n,this.elapsed)),effects:this.effects.map(e=>({...e})),combos:{...this.combos},bestCombos:{...this.best},misses:{...this.misses},hits:{...this.hits}}
  }
}
