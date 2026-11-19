import {GameSession} from '../../game/GameSession'
import {PauseClock} from '../../game/PauseClock'
import {bowlingSweep,isValidSwipe} from '../../input/HandSwipe'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount,PlayerId} from '../../input/PlayerZoneMapper'

export const ROLLS = 3
export const FLIGHT_MS = 740
export const STRIKE_BONUS = 3
const RESET_MS = 1350
// Coordinates match the illustrated lane. A throw starts at (50,107) and ends at y=17.
export const bowlX = (aim:number, progress:number) => 50 + aim * progress
export const bowlY = (progress:number) => 107 - 90 * progress
type Pin = {x:number;y:number;down:boolean}
type Shot = {aim:number;start:number;hits:number[];scored:boolean}
type Lane = {id:PlayerId;rolls:number;rack:number;rackThrows:number;pins:Pin[];shot:Shot|null;readyAt:number;
  aim:number;knocked:number;strikes:number;feedback:string}

export function sweepAim(dx:number,rise:number){
  if(!Number.isFinite(dx)||!Number.isFinite(rise)||rise<.065||Math.abs(dx)>rise*1.7)return null
  return 58*dx/rise
}

export function bowlingRack(rack:number,pressure:number,seed:number):Pin[] {
  const side=(seed+rack)%2===0?1:-1
  const spread=7+5*pressure
  const offset=rack===0?0:side*(7+6*pressure)
  const positions=[[0,43],[-spread,35],[spread,35]]
  if(pressure>=.25) positions.push([side*(spread+6),27])
  if(pressure>=.55) positions.push([-side*(spread+7),27])
  if(pressure>=.75 && rack%2===1) positions[0][0]+=side*7
  return positions.map(([x,y])=>({x:50+offset+x,y,down:false}))
}

// Sweep the ball through the rack, then propagate impacts into nearby pins behind it.
// Times are relative to release, so the same roll lands identically at any frame rate.
function impactTimes(pins:Pin[], aim:number, radius:number) {
  const hits=pins.map(pin=>{
    const dx=pin.x-50,dy=107-pin.y
    const length=Math.hypot(aim,90)
    const along=(aim*dx+90*dy)/length
    const distance=Math.abs(90*dx-aim*dy)/length
    if(pin.down || distance>radius)return Infinity
    return FLIGHT_MS*(along-Math.sqrt(radius*radius-distance*distance))/length
  })
  for(const [i,pin] of pins.entries()){
    for(const [j,other] of pins.entries()){
      if(other.down || other.y>=pin.y || Math.hypot(other.x-pin.x,other.y-pin.y)>14.5)continue
      hits[j]=Math.min(hits[j],hits[i]+74)
    }
  }
  return hits
}

export class BowlingModel {
  private session:GameSession
  private clock=new PauseClock()
  private lanes:Lane[]=[]
  private seed=0
  private now=0
  private go=0
  private end=0
  private pressure:number
  readonly hitRadius:number

  constructor(players:PlayerCount,pressure=0,private random=Math.random){
    this.pressure=Math.max(0,Math.min(1,pressure))
    this.hitRadius=8.5-1.8*this.pressure
    this.session=new GameSession({playerCount:players,roundDurationMs:30000})
  }

  start(time:number){
    const state=this.session.start(time)
    this.clock.reset(time)
    this.now=time
    this.go=time+state.countdownRemainingMs
    this.end=this.go+state.roundRemainingMs
    this.seed=Math.floor(this.random()*2)
    this.lanes=state.scores.map(({playerId:id})=>({id,rolls:0,rack:0,rackThrows:0,
      pins:bowlingRack(0,this.pressure,this.seed),shot:null,readyAt:this.go,aim:0,
      knocked:0,strikes:0,feedback:'Sweep up to roll'}))
    return this.snapshot()
  }

  private advance(time:number){
    if(!Number.isFinite(time)||this.clock.paused||this.session.getSnapshot().phase==='results')return
    this.now=Math.max(this.now,this.clock.time(time))
    // A marble released just before the horn still gets its full flight.
    const state=this.session.update(Math.min(this.now,this.end-1))
    if(state.phase!=='playing')return
    for(const lane of this.lanes){
      const shot=lane.shot
      if(!shot)continue
      const age=this.now-shot.start
      shot.hits.forEach((at,i)=>{
        if(at>age||lane.pins[i].down)return
        lane.pins[i].down=true
        lane.knocked++
        this.session.awardScore(lane.id,1)
      })
      if(age>=FLIGHT_MS&&!shot.scored){
        shot.scored=true
        const hits=shot.hits.filter(Number.isFinite).length
        const cleared=lane.pins.every(p=>p.down)
        if(cleared && lane.rackThrows===1){
          this.session.awardScore(lane.id,STRIKE_BONUS)
          lane.strikes++
          lane.feedback='Strike! +3 bonus'
        }else lane.feedback=cleared?'Rack cleared!':hits?`+${hits} · ${lane.pins.filter(p=>!p.down).length} left`:'Miss!'
      }
      if(age>=RESET_MS){
        lane.shot=null
        if(lane.rolls<ROLLS && lane.pins.every(p=>p.down)){
          lane.rack++
          lane.rackThrows=0
          lane.pins=bowlingRack(lane.rack,this.pressure,this.seed)
        }
      }
    }
    const finished=this.lanes.every(lane=>lane.rolls===ROLLS&&!lane.shot)
    if(finished || (this.now>=this.end && this.lanes.every(lane=>!lane.shot||lane.shot.scored))){
      this.session.finish(Math.min(this.now,this.end-1))
    }
  }

  private available(id:PlayerId,time:number){
    this.advance(time)
    const lane=this.lanes[id-1]
    if(!lane||this.session.getSnapshot().phase!=='playing'||this.now>=this.end||lane.rolls>=ROLLS||lane.shot)return
    return lane
  }
  aim(id:PlayerId,change:number,time:number){
    const lane=this.available(id,time)
    if(lane)lane.aim=Math.max(-49,Math.min(49,lane.aim+change))
  }
  roll(id:PlayerId,time:number,aim?:number,capture=time){
    const lane=this.available(id,time)
    if(!lane||!this.clock.accepts(capture)||this.clock.time(capture)<lane.readyAt)return
    lane.aim=Math.max(-49,Math.min(49,aim??lane.aim))
    lane.rolls++
    lane.rackThrows++
    lane.shot={aim:lane.aim,start:this.now,hits:impactTimes(lane.pins,lane.aim,this.hitRadius),scored:false}
    lane.feedback='Rolling…'
    lane.readyAt=this.now+RESET_MS
  }
  input(events:MotionInputEvent[],time:number){
    for(const e of events){
      if(!isValidSwipe(e,bowlingSweep)||!e.swipe||e.timestamp>time||time-e.timestamp>250)continue
      const aim=sweepAim(e.x-e.swipe.fromX,e.swipe.fromY-e.y)
      if(aim!==null)this.roll(e.playerId,time,aim,e.timestamp)
    }
  }
  update(time:number){this.advance(time);return this.snapshot()}
  pause(time:number){
    this.advance(time)
    if(['playing','countdown'].includes(this.session.getSnapshot().phase)){
      this.session.pause(Math.min(this.now,this.end-1))
      this.clock.pause(time)
    }
    return this.snapshot()
  }
  resume(time:number){
    if(this.clock.paused){
      this.clock.resume(time)
      this.session.resume(Math.min(this.now,this.end-1))
    }
    return this.snapshot()
  }
  private snapshot(){
    return {...this.session.getSnapshot(this.now),lanes:this.lanes.map(lane=>({...lane,
      pins:lane.pins.map(pin=>({...pin})),progress:lane.shot?Math.min(1,(this.now-lane.shot.start)/FLIGHT_MS):0}))}
  }
}
