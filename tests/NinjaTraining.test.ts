import { describe, expect, it } from 'vitest'
import { NinjaTrainingModel } from '../src/minigames/ninja-training/NinjaTrainingModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'
import { getGameBySlug } from '../src/app/catalog'
const input=(x:number,y:number,timestamp:number,playerId:1|2|3|4=1):MotionInputEvent=>({playerId,kind:'MOTION_HIT',x,y,timestamp,confidence:1})
const game=(count:1|2|3|4=1)=>new NinjaTrainingModel({countdownMs:0,playerCount:count})

// Keep a player alive while advancing to the late-wave case being exercised.
function defendUntil(model:NinjaTrainingModel, end:number, start=0) {
  for(let t=start+250;t<end-1500;t+=250) {
    for(const ninja of model.update(t).ninjas.filter(n=>n.pose==='leap'))model.hit(input(ninja.x,ninja.y,t,ninja.playerId))
  }
}

describe('Paper Dojo simulation',()=>{
  it('choreographs runs, wind-ups and arcs from alternating tower sides',()=>{
    const m=game();expect(m.start(0).ninjas[0].pose).toBe('run')
    expect(m.update(500).ninjas[0].pose).toBe('ready')
    const a=m.update(1200).ninjas[0];expect(a.pose).toBe('leap');expect(a.x).toBeGreaterThan(.1);expect(a.y).toBeLessThan(.33)
    const b=m.update(2500).ninjas.find(n=>n.side===1)!;expect(b.pose).toBe('leap');expect(b.x).toBeGreaterThan(.5)
  })
  it('awards each hit once and rejects low confidence, stale and unrelated input',()=>{
    const m=game();m.start(0);const n=m.update(1000).ninjas[0]
    expect(m.hit({...input(n.x,n.y,1000),confidence:.1}).scores[0].score).toBe(0)
    expect(m.hit({...input(n.x,n.y,1000),kind:'BODY_MOVE'}).scores[0].score).toBe(0)
    expect(m.hit(input(n.x,n.y,1000)).scores[0].score).toBe(10)
    expect(m.hit(input(n.x,n.y,1000)).hits[1]).toBe(1)
    expect(m.hit({...input(n.x,n.y,1000),x:NaN}).scores[0].score).toBe(10)
  })
  it('does not score during a wind-up or countdown',()=>{
    const m=game();const n=m.start(0).ninjas[0]
    expect(m.hit(input(n.x,n.y,20)).scores[0].score).toBe(0)
    const c=new NinjaTrainingModel();c.start(0)
    expect(c.hit(input(.5,.5,100)).scores[0].score).toBe(0)
  })
  it('isolates players and creates identical fair attack schedules',()=>{
    const m=game(4);m.start(0);const state=m.update(1100),n=state.ninjas.find(n=>n.playerId===3)!
    expect(state.ninjas.map(n=>n.x)).toEqual([n.x,n.x,n.x,n.x])
    const hit=m.hit(input(n.x,n.y,1100,3));expect(hit.scores.map(s=>s.score)).toEqual([0,0,10,0])
    expect(hit.ninjas.filter(n=>n.playerId!==3)).toHaveLength(3)
  })
  it('makes collision bounds match the round puppet in tall player lanes',()=>{
    const m=new NinjaTrainingModel({countdownMs:0,aspectRatio:.3});m.start(0);const n=m.update(1100).ninjas[0]
    expect(m.hit(input(n.x,n.y+.06,1100)).scores[0].score).toBe(0)
    expect(m.hit(input(n.x,n.y+.01,1100)).scores[0].score).toBe(10)
  })
  it('rewards streaks and clears them on a breach',()=>{
    const m=game();m.start(0)
    for(let i=0;i<5;i++){
      const at=i*1550+1000,n=m.update(at).ninjas.find(n=>n.pose==='leap')!
      m.hit(input(n.x,n.y,at))
    }
    const s=m.update(7200);expect(s.bestCombos[1]).toBe(5);expect(s.scores[0].score).toBe(60)
    const missed=m.update(13000);expect(missed.misses[1]).toBeGreaterThan(0);expect(missed.combos[1]).toBe(0)
  })
  it('resolves the same breaches and trajectory on fine and coarse ticks',()=>{
    const a=game(),b=game();a.start(0);b.start(0)
    for(let t=50;t<=17000;t+=50)a.update(t)
    const fine=a.update(17000),coarse=b.update(17000)
    expect(coarse.scores).toEqual(fine.scores)
    expect(coarse.misses).toEqual(fine.misses)
    expect(coarse.ninjas).toEqual(fine.ninjas)
  })
  it.each([18500,22500,42500,46500])('keeps ninjas attackable through the former bonus windows at %i ms',at=>{
    const m=game();m.start(0)
    defendUntil(m,at)
    const state=m.update(at),n=state.ninjas.find(n=>n.pose==='leap')!
    expect(n).toBeDefined()
    const hit=m.hit(input(n.x,n.y,at))
    expect(hit.hits[1]).toBe(state.hits[1]+1)
    expect(hit.scores[0].score).toBeGreaterThan(state.scores[0].score)
    expect(hit.effects.at(-1)?.kind).toBe('hit')
  })
  it('freezes trajectories and effects through a long pause and rejects paused captures',()=>{
    const m=game();m.start(0);const paused=m.pause(1200)
    expect(m.update(30000).ninjas).toEqual(paused.ninjas)
    expect(m.update(30000).roundRemainingMs).toBe(paused.roundRemainingMs)
    m.resume(30000);const n=paused.ninjas[0]
    expect(m.hit(input(n.x,n.y,2000)).scores[0].score).toBe(0)
    expect(m.update(30100).elapsed).toBeCloseTo(1300)
  })
  it('finishes, replays with clean effects, and accelerates later waves',()=>{
    const m=new NinjaTrainingModel({countdownMs:0,roundDurationMs:10000});m.start(0)
    expect(m.update(10000).phase).toBe('results')
    const reset=m.start(11000);expect(reset.scores[0].score).toBe(0);expect(reset.bestCombos[1]).toBe(0);expect(reset.effects).toEqual([])
    const normal=game();normal.start(0);expect(normal.update(8000).ninjas.some(n=>n.flightMs<2500)).toBe(true)
  })
})

describe('Dojo camera input',()=>{
  it.each([1,2,3,4] as const)('maps a mirrored swat into player %i’s lane',count=>{
    const model=game(count);model.start(0)
    const target=model.update(1100).ninjas.find(n=>n.playerId===count)!
    const zones=defaultCameraZones(count),zone=zones[count-1]
    const processor=new MotionProcessor({smoothing:0,minimumZoneActivity:.0005})
    const width=640,height=180,data=new Uint8ClampedArray(width*height*4)
    processor.process({width,height,data},zones,0)
    const cx=Math.floor((1-zone.x-zone.width*target.x)*width),cy=Math.floor(target.y*height)
    for(let y=cy-5;y<=cy+5;y++)for(let x=cx-5;x<=cx+5;x++)data.fill(255,(y*width+x)*4,(y*width+x+1)*4)
    const {events}=processor.process({width,height,data},zones,1100)
    expect(events).toHaveLength(1)
    expect(model.hit(events[0]).scores.map(p=>p.score)).toEqual(Array.from({length:count},(_,i)=>i+1===count?10:0))
  })
  it('ignores motion and swats in empty space during former obstacle windows',()=>{
    const model=game(2);model.start(0)
    for(const time of [4500,5000,5500]){
      const before=model.update(time)
      for(const kind of ['BODY_MOVE','MOTION_HIT'] as const){
        const after=model.hit({...input(.3,.62,time,2),kind})
        expect(after.health).toEqual(before.health)
        expect(after.scores).toEqual(before.scores)
      }
    }
    expect(getGameBySlug('ninja-training')?.input).toBe('MOTION_HIT')
  })
  it('accepts a second distinct sample from one capture and rejects stale or malformed swats',()=>{
    const model=game();model.start(0)
    const n=model.update(1200).ninjas[0],swat=input(n.x,n.y,1200)
    for(const bad of [{x:NaN},{confidence:Infinity},{confidence:-1},{timestamp:1000},{playerId:2 as const}]){
      expect(model.hit({...swat,...bad}).hits[1]).toBe(0)
    }
    model.hit({...swat,x:.9})
    expect(model.hit(swat).hits[1]).toBe(1)
  })
})

describe('Dojo ranks and health',()=>{
  it.each([1,2,3,4,5])('takes %i distinct swats, awarding the defeat once',level=>{
    const model=new NinjaTrainingModel({level,countdownMs:0})
    model.start(0)
    for(let i=0;i<level;i++){
      const time=950+i*280
      const n=model.update(time).ninjas.find(n=>n.id===1)!
      expect(n.hp).toBe(level-i)
      const event=input(n.x,n.y,time)
      const hit=model.hit(event)
      if(i<level-1){
        expect(hit.effects.at(-1)?.kind).toBe('armor')
        expect(hit.scores[0].score).toBe(0)
        expect(model.hit({...event,x:n.x+.001}).ninjas.find(n=>n.id===1)?.hp).toBe(n.hp-1)
      } else {
        expect(hit.scores[0].score).toBe(10)
        expect(hit.hits[1]).toBe(1)
      }
    }
  })
  it('shortens flight on every rank and permits five camera hits even in the last wave',()=>{
    const flights=[1,2,3,4,5].map(level=>new NinjaTrainingModel({level,countdownMs:0}).start(0).ninjas[0].flightMs)
    expect(flights).toEqual([...flights].sort((a,b)=>b-a))
    expect(new Set(flights).size).toBe(5)
    const m=new NinjaTrainingModel({level:5,countdownMs:0,pressure:1})
    m.start(0)
    for(let t=250;t<=38000;t+=280) {
      for(const n of m.update(t).ninjas.filter(n=>n.pose==='leap'))m.hit(input(n.x,n.y,t))
    }
    const active=m.update(38100)
    expect(active.phase).toBe('playing')
    expect(active.ninjas[0].flightMs).toBeGreaterThan(4*280)
    expect(active.scores[0].score).toBeGreaterThanOrEqual(115)
  })
  it('retires only the depleted lane, ends when everyone is out, and restores health on replay',()=>{
    const m=game(2);m.start(0)
    for(let t=250;t<=13000;t+=250){
      for(const n of m.update(t).ninjas.filter(n=>n.playerId===2&&n.pose==='leap'))m.hit(input(n.x,n.y,t,2))
    }
    const state=m.update(13100)
    expect(state.health[1]).toBe(0)
    expect(state.health[2]).toBeGreaterThan(0)
    expect(state.phase).toBe('playing')
    expect(state.ninjas.every(n=>n.playerId===2)).toBe(true)
    expect(m.update(30000).phase).toBe('results')
    expect(m.start(31000).health).toMatchObject({1:5,2:5})
  })
  it('charges a breach once and preserves the remaining hearts through pause',()=>{
    const model=game();model.start(0)
    expect(model.update(3349).health[1]).toBe(5)
    expect(model.update(3350).health[1]).toBe(4)
    expect(model.update(3350).health[1]).toBe(4)
    expect(model.pause(3500).health).toEqual(model.resume(15000).health)
  })
})

describe('Thunder Oni boss encounter',()=>{
  const boss=(playerCount:1|2=1)=>new NinjaTrainingModel({level:6,playerCount,countdownMs:0})
  it('returns from the opposite tower with the same wounds and pauses between charges',()=>{
    const m=boss()
    const first=m.start(0).ninjas[0]
    expect(first.hp).toBe(12)
    const target=m.update(900).ninjas[0]
    m.hit(input(target.x,target.y,900))
    const next=m.update(2950)
    expect(next.ninjas).toHaveLength(1)
    expect(next.ninjas[0]).toMatchObject({id:first.id,hp:11,side:1,pose:'run'})
    expect(next.health[1]).toBe(4)
    const paused=m.pause(3000)
    expect(m.update(12000).ninjas).toEqual(paused.ninjas)
    expect(m.resume(12000).ninjas).toEqual(paused.ninjas)
    expect(m.update(12500).ninjas[0].hp).toBe(11)
  })
  it.each([2,3])('repels the charge only after three swats (%i landed)',count=>{
    const m=boss();m.start(0)
    for(let i=0;i<count;i++){
      const time=900+i*280,n=m.update(time).ninjas[0]
      m.hit(input(n.x,n.y,time))
    }
    const after=m.update(2950)
    expect(after.health[1]).toBe(count===3?5:4)
    expect(after.ninjas[0]).toMatchObject({hp:12-count,chargeHits:0})
  })
  it('awards a single boss defeat and displays the final pose before results and replay',()=>{
    const m=boss();m.start(0)
    let time=900
    for(let i=0;i<12;i++){
      if(i===6)time=3850
      const n=m.update(time).ninjas[0]
      expect(n.hp).toBe(12-i)
      m.hit(input(n.x,n.y,time))
      time+=280
    }
    const finish=time-280
    expect(m.update(finish+400)).toMatchObject({phase:'playing',ninjas:[],hits:{1:1},scores:[{score:160}]})
    expect(m.update(finish+850).phase).toBe('results')
    expect(m.start(finish+900).ninjas[0].hp).toBe(12)
  })
  it('keeps two lanes independent and resolves repeated breaches on a coarse tick',()=>{
    const m=boss(2);m.start(0)
    for(let t=900;t<6000;t+=280){
      const n=m.update(t).ninjas.find(n=>n.playerId===2 && n.pose==='leap')
      if(n)m.hit(input(n.x,n.y,t,2))
    }
    const solo=m.update(7000)
    expect(solo.phase).toBe('playing')
    expect(solo.hits[2]).toBe(1)
    expect(solo.ninjas.map(n=>n.playerId)).toEqual([1])
    const end=m.update(20000)
    expect(end.phase).toBe('results')
    expect(end.health[1]).toBe(0)
    expect(end.health[2]).toBe(5)
    expect(end.scores[0].score).toBe(-25)
  })
})
