import {GameSession, type GameSessionSnapshot} from '../../game/GameSession'
import type {MotionInputEvent} from '../../input/MotionProcessor'
import type {PlayerCount, PlayerId} from '../../input/PlayerZoneMapper'
import {pictureDeck, type Picture} from './poses'
import {makeCutout,measureFit,fitDeductions,type Fit,type Cutout} from './cutout'

const duration=36000
const freshness=300
const holdMs=340

function freshSeat() {
  return {fit:null as Fit|null, progress:0, held:0, last:-Infinity, matched:false,delta:0}
}

export class ShadowModel {
  private session:GameSession
  private deck:Picture[]
  private order:number[]=[]
  private index=0
  private seats:ReturnType<typeof freshSeat>[]=[]
  private opened=0
  private closeAt=0
  private outcome:''|'snap'|'miss'=''
  private album:Picture[]=[]
  private photos=0
  private streak=0
  private best=0
  private readonly windowMs:number
  private readonly tolerance:number
  private targets:Cutout[]=[]
  private deductions:{outside:number;empty:number}[]=[]

  constructor(private players:PlayerCount, pressure=0, private random=Math.random,private aspect=4/3) {
    this.session=new GameSession({playerCount:players,roundDurationMs:duration})
    this.deck=pictureDeck(players,pressure)
    this.windowMs=6400+350*(players-1)-1800*pressure
    this.tolerance=.34-.07*pressure
  }
  private shuffle(exclude:number) {
    const rest=this.deck.map((_,i)=>i).filter(i=>i!==exclude)
    for(let i=rest.length-1;i>0;i--){
      const j=Math.floor(this.random()*(i+1))
      const pick=rest[j]
      rest[j]=rest[i]
      rest[i]=pick
    }
    return rest
  }
  private open(elapsed:number) {
    this.targets=this.deck[this.index].poses.map((pose,i)=>makeCutout(pose,i,this.players,this.aspect))
    this.opened=elapsed
    this.outcome=''
    this.seats=Array.from({length:this.players},freshSeat)
  }
  start(now:number) {
    const round=this.session.start(now)
    this.index=0
    this.order=this.shuffle(0)
    this.photos=this.streak=this.best=0
    this.album=[]
    this.deductions=Array.from({length:this.players},()=>({outside:0,empty:0}))
    this.open(0)
    return this.snapshot(round)
  }
  pause(now:number) {
    const round=this.session.update(now)
    if(round.phase!=='playing' && round.phase!=='countdown')return this.snapshot(round)
    if(!this.outcome)this.seats=this.seats.map(freshSeat)
    return this.snapshot(this.session.pause(now))
  }
  resume(now:number) {return this.snapshot(this.session.resume(now))}
  setAspect(aspect:number) {
    if(aspect>0&&Number.isFinite(aspect)&&aspect!==this.aspect){
      this.aspect=aspect
      this.targets=this.deck[this.index].poses.map((p,i)=>makeCutout(p,i,this.players,aspect))
      if(!this.outcome)this.seats=this.seats.map(freshSeat)
    }
  }
  private fitsPose(fit:Fit|null) {
    return fit?.sleevesFilled && fit.outside<=this.tolerance && fit.empty<=this.tolerance+.05
  }
  update(now:number,events:readonly MotionInputEvent[]=[]) {
    const round=this.session.update(now)
    if(round.phase!=='playing')return this.snapshot(round)
    const elapsed=duration-round.roundRemainingMs
    if(this.outcome){
      if(elapsed<this.closeAt+750)return this.snapshot(round)
      if(!this.order.length)this.order=[...this.shuffle(this.index),this.index]
      this.index=this.order.shift()!
      this.open(elapsed)
    }
    for(let i=0;i<this.players;i++){
      const seat=this.seats[i]
      const event=events.find(e=>e.kind==='BODY_MASK'&&e.playerId===i+1&&e.confidence>=.6&&e.timestamp<=now&&now-e.timestamp<=freshness&&e.timestamp>=now-(elapsed-this.opened))
      if(!event?.bodyMask){
        Object.assign(seat,freshSeat())
        continue
      }
      if(event.timestamp<=seat.last)continue
      const fit=measureFit(event.bodyMask,this.targets[i])
      const gap=event.timestamp-seat.last
      seat.held=this.fitsPose(fit)&&this.fitsPose(seat.fit)&&gap<=freshness?seat.held+gap:0
      seat.fit=fit
      seat.last=event.timestamp
      seat.progress=Math.min(1,seat.held/holdMs)
      seat.matched=seat.progress===1
    }
    const success=this.seats.every(s=>s.matched)
    if(success||elapsed-this.opened>=this.windowMs){
      this.streak=success?this.streak+1:0
      this.outcome=success?'snap':'miss'
      this.closeAt=elapsed
      if(success){
        this.photos++;this.best=Math.max(this.best,this.streak)
        this.album=[...this.album.slice(-2),this.deck[this.index]]
      }
      this.seats.forEach((seat,i)=>{
        if(!seat.fit)return
        const penalty=fitDeductions(seat.fit)
        this.deductions[i].outside+=penalty.outside
        this.deductions[i].empty+=penalty.empty
        seat.delta=(success?20+Math.min(10,(this.streak-1)*2):0)-penalty.outside-penalty.empty
        this.session.awardScore((i+1) as PlayerId,seat.delta)
      })
    }
    return this.snapshot(this.session.getSnapshot())
  }
  private snapshot(round:GameSessionSnapshot) {
    return {...round,targets:this.targets,deductions:this.deductions.map(d=>({...d})),picture:this.deck[this.index],seats:this.seats.map(s=>({...s})),outcome:this.outcome,
      photos:this.photos,album:this.album,streak:this.streak,best:this.best,seconds:Math.max(0,Math.ceil((this.windowMs-duration+round.roundRemainingMs+this.opened)/1000))}
  }
}
