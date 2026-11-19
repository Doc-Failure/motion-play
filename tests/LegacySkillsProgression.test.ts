import {describe,expect,it} from 'vitest'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
import {BasketballBlitzModel, rimFor} from '../src/minigames/basketball-blitz/BasketballBlitzModel'
import {SimonSaysModel,PAD_CENTERS} from '../src/minigames/simon-says/SimonSaysModel'
import {PlateSpinnerModel,plateLifetime} from '../src/minigames/plate-spinner/PlateSpinnerModel'
import {MagicDuelModel,magicPatterns} from '../src/minigames/magic-duel/MagicDuelModel'
import {RocketModel} from '../src/minigames/rocket-rumble/RocketModel'
import {SilkModel} from '../src/minigames/silk-squad/SilkModel'

function touch(timestamp:number,x:number,y:number):MotionInputEvent {
  return {playerId:1,kind:'MOTION_HIT',timestamp,x,y,confidence:1}
}
describe.each([0,.25,.5,.75,1])('skill game pressure %s',pressure=>{
  const options={playerCount:2 as const,roundDurationMs:36000,countdownMs:0,pressure}
  it('keeps five banks of a moved basketball hoop hittable with delayed measured releases',()=>{
    const m=new BasketballBlitzModel(options)
    m.start(0)
    for(let basket=0;basket<5;basket++){
      const t=1000+basket*1000,rim=rimFor(basket,pressure)
      expect(m.update(t).stats[0].rimX).toBe(rim.x)
      m.shoot({...touch(t-90,.5+(rim.x-.5)*.3/.55,.5),kind:'HAND_SWIPE',swipe:{fromX:.5,fromY:.8,durationMs:100}})
      expect(m.update(t+650).scores.map(s=>s.score)).toEqual([2*(basket+1),0])
    }
  })
  it('gives an inactive Simon partner a response window then continues without granting them points',()=>{
    const m=new SimonSaysModel({...options,random:()=>0})
    const initial=m.start(0)
    const start=4000
    const input=m.update(start)
    expect(input.turn).toBe('input')
    input.sequence.forEach((pad,i)=>{
      const point=PAD_CENTERS[pad],event=touch(start+1+i*230,point.x,point.y)
      m.hit(event)
      m.hit(event)
    })
    const next=m.update(start+input.inputRemainingMs+1)
    expect(next.turn).toBe('showing')
    expect(next.sequence.length).toBe(initial.sequence.length+1)
    expect(next.scores.map(s=>s.score)).toEqual([initial.sequence.length*10,0])
  })
  it('awards a last-second plate rescue once before the fall and gives both lanes the same deadline',()=>{
    const m=new PlateSpinnerModel(options),s=m.start(0)
    expect(s.plates[0].expiresAt).toBe(plateLifetime(0,pressure))
    expect(s.plates[0].expiresAt).toBe(s.plates[3].expiresAt)
    const event=touch(s.plates[0].expiresAt-100,.2,.4)
    expect(m.hit(event).scores[0].score).toBe(15)
    expect(m.hit(event).scores[0].score).toBe(15)
    expect(m.update(s.plates[0].expiresAt).scores[1].score).toBe(-5)
  })
  it('keeps the active tracing wrist through a delayed Magic observation and changes spells after all casts',()=>{
    const m=new MagicDuelModel({...options,playerCount:1})
    m.start(0)
    const [a,b,c]=magicPatterns[0].points
    const stroke=(t:number,from:{x:number;y:number},to:{x:number;y:number},id:string):MotionInputEvent=>({
      ...touch(t,to.x,to.y),pointerId:id,kind:'HAND_SWIPE',swipe:{fromX:from.x,fromY:from.y,durationMs:140}
    })
    m.update(270)
    expect(m.trace(stroke(170,a,b,'left')).progress[0].step).toBe(1)
    expect(m.trace(stroke(360,c,a,'right')).progress[0].step).toBe(1)
    expect(m.trace(stroke(360,b,c,'left')).scores[0].score).toBe(20)
    expect(m.update(1060).pattern).toBe(1)
  })
  it('clears unmatchable Rocket singletons and deals a new rack independently',()=>{
    const m=new RocketModel(options);m.start(0)
    let now=2100
    for(let color=0;color<3;color++){
      const pair=m.update(now).rockets.filter(r=>r.playerId===1&&r.color===color).slice(0,2)
      for(const r of pair){
        const target=m.update(now).rockets.find(t=>t.id===r.id)!
        m.hit(touch(now,target.x,target.y));now+=200
      }
      m.hit(touch(now,.5,.82));now+=200
      expect(m.snapshot().rockets.some(r=>r.playerId===1&&r.color===color)).toBe(false)
    }
    const newRack=m.update(now+600)
    expect(newRack.scores.map(p=>p.score)).toEqual([120,0])
    expect(newRack.rockets.some(r=>r.playerId===1&&r.born>2000)).toBe(true)
    expect(newRack.rockets.filter(r=>r.playerId===2)).toHaveLength(9)
  })
  it('deals equally valuable Silk targets at the same playable coordinates to four competitors',()=>{
    const m=new SilkModel({...options,playerCount:4});m.start(0)
    for(let t=0;t<36000;t+=313){
      const s=m.update(t),first=s.bugs.filter(b=>b.playerId===1)
      expect(first.length).toBeLessThanOrEqual(5)
      for(let player=2;player<=4;player++)expect(s.bugs.filter(b=>b.playerId===player).map(b=>[b.kind,b.x,b.y])).toEqual(first.map(b=>[b.kind,b.x,b.y]))
      for(const bug of first){
        expect(bug.x).toBeGreaterThan(.10);expect(bug.y).toBeLessThan(.78)
      }
    }
  })
})
