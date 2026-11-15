import { GameSession, type GameSessionSnapshot } from '../../game/GameSession'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'

export interface PaperNinja { id:number; playerId:PlayerId; side:-1|1; level:number; born:number; flightMs:number; x:number; y:number; progress:number; pose:'run'|'ready'|'leap' }
export interface DojoEffect { id:number; playerId:PlayerId; kind:'hit'|'miss'|'chip'|'break'; x:number; y:number; born:number; side:number; points:number }
export interface DojoSnapshot extends GameSessionSnapshot {
  elapsed:number; wave:number; bonus:boolean; bonusRemainingMs:number; ninjas:PaperNinja[]; effects:DojoEffect[]
  combos:Record<PlayerId,number>; bestCombos:Record<PlayerId,number>; misses:Record<PlayerId,number>; hits:Record<PlayerId,number>; planks:Record<PlayerId,number>; boards:Record<PlayerId,number>
}
const counters = ():Record<PlayerId,number> => ({1:0,2:0,3:0,4:0})
const BONUS_CYCLE = 24_000, BONUS_START = 18_000

/** An elapsed-time simulation: rendering, pause length and camera frame cadence do not change trajectories. */
export class NinjaTrainingModel {
  private readonly session:GameSession
  private readonly count:PlayerCount
  private readonly duration:number
  private aspect:number
  private ninjas:PaperNinja[]=[]
  private effects:DojoEffect[]=[]
  private combos=counters(); private best=counters(); private misses=counters(); private hits=counters(); private boards=counters()
  private planks:Record<PlayerId,number>={1:3,2:3,3:3,4:3}
  private lastHit=counters(); private lastChip:Record<PlayerId,number>={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity}
  private nextBoard=counters()
  private elapsed=0; private nextSpawn=0; private nextId=1; private wave=0; private lastTime=0; private inputNotBefore=0
  private bonus=false
  constructor(options:{playerCount?:PlayerCount; countdownMs?:number; roundDurationMs?:number; aspectRatio?:number}={}) {
    this.count=options.playerCount??1; this.duration=options.roundDurationMs??60_000
    this.session=new GameSession({...options,playerCount:this.count})
    this.aspect=options.aspectRatio??1
  }
  setAspectRatio(aspect:number) { if(Number.isFinite(aspect)&&aspect>0)this.aspect=aspect }
  start(time:number) {
    // Replays create a fresh session even when restarted from a paused game.
    if(this.session.getSnapshot().phase!=='idle'&&this.session.getSnapshot().phase!=='results') throw new Error('Finish the current round before replaying.')
    const state=this.session.start(time)
    this.ninjas=[];this.effects=[];this.combos=counters();this.best=counters();this.misses=counters();this.hits=counters();this.boards=counters()
    this.planks={1:3,2:3,3:3,4:3};this.lastHit=counters();this.lastChip={1:-Infinity,2:-Infinity,3:-Infinity,4:-Infinity};this.nextBoard=counters()
    this.elapsed=0;this.nextSpawn=0;this.nextId=1;this.wave=0;this.lastTime=time;this.bonus=false;this.inputNotBefore=time+state.countdownRemainingMs
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
        const at=this.nextSpawn, inBonus=at%BONUS_CYCLE>=BONUS_START
        this.expire(at)
        if(!inBonus) {
          const wave=Math.floor(at/6000), flightMs=Math.max(1200,2500-wave*110)
          for(let i=1;i<=this.count;i++) {
            const playerId=i as PlayerId
            if(this.ninjas.filter(n=>n.playerId===playerId).length<5) this.ninjas.push({id:this.nextId++,playerId,side:(this.wave%2?1:-1),level:Math.floor(this.wave/2)%3,born:at,flightMs,x:0,y:0,progress:0,pose:'run'})
          }
          this.wave++
        }
        this.nextSpawn+=Math.max(650,1550-Math.floor(at/6000)*90)
      }
      const bonus=elapsed%BONUS_CYCLE>=BONUS_START
      // Any ninjas still in flight at a bonus boundary bow out without a penalty.
      this.expire(elapsed)
      if(bonus) this.ninjas=[]
      if(bonus&&!this.bonus) {this.planks={1:3,2:3,3:3,4:3};this.nextBoard=counters()}
      this.bonus=bonus;this.elapsed=elapsed
      for(let i=1;i<=this.count;i++) if(this.planks[i as PlayerId]===0&&elapsed>=this.nextBoard[i as PlayerId]) this.planks[i as PlayerId]=3
      this.effects=this.effects.filter(effect=>elapsed-effect.born<850)
      for(let i=1;i<=this.count;i++) if(elapsed-this.lastHit[i as PlayerId]>2200)this.combos[i as PlayerId]=0
    }
    const final=this.session.update(now)
    this.lastTime=now
    if(final.phase==='results') {this.ninjas=[];this.effects=[]}
    return this.snapshot()
  }
  hit(event:MotionInputEvent) {
    if(event.kind!=='MOTION_HIT'||!Number.isInteger(event.playerId)||event.playerId<1||event.playerId>this.count||!Number.isFinite(event.timestamp)||event.timestamp<this.inputNotBefore||!Number.isFinite(event.confidence)||event.confidence<.2||event.confidence>1||![event.x,event.y].every(v=>Number.isFinite(v)&&v>=0&&v<=1)) return this.snapshot()
    const state=this.update(event.timestamp)
    if(state.phase!=='playing')return state
    const id=event.playerId, captured=Math.max(0,this.elapsed-Math.max(0,this.lastTime-event.timestamp))
    if(this.bonus) {
      if(this.planks[id]===0||this.elapsed-this.lastChip[id]<180||Math.abs(event.x-.5)>.2||Math.abs(event.y-.55)>.12)return state
      this.lastChip[id]=this.elapsed;this.planks[id]--
      const broken=this.planks[id]===0
      if(broken){this.boards[id]++;this.nextBoard[id]=this.elapsed+600}
      const points=broken?30:5
      this.session.awardScore(id,points)
      this.effects.push({id:this.nextId++,playerId:id,kind:broken?'break':'chip',x:.5,y:.55,born:this.elapsed,side:0,points})
      return this.snapshot()
    }
    const target=this.ninjas.find(n=> {
      if(n.playerId!==id||captured<n.born+850)return false
      const p=this.position(n,captured)
      return ((event.x-p.x)/(.1*Math.min(1,1/this.aspect)))**2+((event.y-p.y)/(.1*Math.min(1,this.aspect)))**2<=1
    })
    if(target) {
      this.ninjas=this.ninjas.filter(n=>n.id!==target.id)
      this.combos[id]=this.elapsed-this.lastHit[id]>2200?1:this.combos[id]+1
      this.lastHit[id]=this.elapsed;this.best[id]=Math.max(this.best[id],this.combos[id]);this.hits[id]++
      const points=10*Math.min(3,1+Math.floor((this.combos[id]-1)/4)), p=this.position(target,captured)
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
  private expire(at:number) {
    this.ninjas=this.ninjas.filter(n=> {
      const end=n.born+850+n.flightMs
      // A bonus cancels any still-active attackers rather than charging for them later.
      const boundary=Math.floor(n.born/BONUS_CYCLE)*BONUS_CYCLE+BONUS_START
      if(at>=boundary&&end>=boundary)return false
      if(at<end)return true
      this.session.awardScore(n.playerId,-5);this.misses[n.playerId]++;this.combos[n.playerId]=0
      const p=this.position(n,end)
      this.effects.push({id:this.nextId++,playerId:n.playerId,kind:'miss',x:p.x,y:p.y,born:end,side:n.side,points:-5})
      return false
    })
  }
  private position(n:PaperNinja,at:number):PaperNinja {
    const age=Math.max(0,at-n.born), progress=Math.max(0,Math.min(1,(age-850)/n.flightMs)), startY=[.33,.52,.72][n.level]
    const distance=age<350?.03+.06*age/350:age<850?.09:.1+.4*progress
    return {...n,x:n.side===-1?distance:1-distance,y:startY+(.55-startY)*progress-Math.sin(progress*Math.PI)*.19,progress,pose:age<350?'run':age<850?'ready':'leap'}
  }
  private snapshot():DojoSnapshot {
    return {...this.session.getSnapshot(),elapsed:this.elapsed,wave:1+Math.floor(this.elapsed/6000),bonus:this.bonus,bonusRemainingMs:this.bonus?BONUS_CYCLE-this.elapsed%BONUS_CYCLE:0,ninjas:this.ninjas.map(n=>this.position(n,this.elapsed)),effects:this.effects.map(e=>({...e})),combos:{...this.combos},bestCombos:{...this.best},misses:{...this.misses},hits:{...this.hits},planks:{...this.planks},boards:{...this.boards}}
  }
}
