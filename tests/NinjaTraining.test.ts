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

describe('MIXED hit-and-avoid input',()=>{
  it.each([1,2,3,4] as const)('telegraphs identical obstacles for %i players and charges each only once',count=>{
    const m=game(count);m.start(0)
    const warning=m.update(4200).obstacles
    expect(warning).toHaveLength(count);expect(warning.every(o=>!o.active)).toBe(true)
    expect(m.hit(input(.3,.62,4500)).contacts[1]).toBe(0)
    const before=m.update(4900)
    expect(before.obstacles.every(o=>o.active)).toBe(true)
    const contact=m.hit({...input(.3,.62,4900,count),kind:'BODY_MOVE'})
    expect(contact.contacts[count]).toBe(1)
    expect(contact.scores[count-1].score).toBe(before.scores[count-1].score-10)
    expect(contact.contacts[1===count?2:1]).toBe(0)
    expect(m.hit(input(.3,.62,5000,count)).contacts[count]).toBe(1)
    expect(m.update(6000).obstacles).toEqual([])
  })
  it('accepts motion hits on obstacles, with symbol feedback and no reward for absent tracking',()=>{
    const m=game();m.start(0)
    const before=m.update(5000),contact=m.hit(input(.3,.62,5000))
    expect(contact.scores[0].score).toBe(before.scores[0].score-10)
    expect(contact.effects.at(-1)).toMatchObject({kind:'obstacle',points:-10})
    const noInput=game();noInput.start(0)
    expect(noInput.update(6000).contacts[1]).toBe(0)
    expect(noInput.update(6000).scores[0].score).toBeLessThanOrEqual(0)
  })
  it('keeps BODY_MOVE separate from strikes throughout the round',()=>{
    const m=game();m.start(0);const n=m.update(1100).ninjas[0]
    expect(m.hit({...input(n.x,n.y,1100),kind:'BODY_MOVE'}).hits[1]).toBe(0)
    defendUntil(m,18500,1100)
    const before=m.update(18500).hits[1]
    const late=m.update(18500).ninjas.find(n=>n.pose==='leap')!
    expect(m.hit({...input(late.x,late.y,18500),kind:'BODY_MOVE'}).hits[1]).toBe(before)
  })
  it('matches obstacle collision bounds to cqmin in tall lanes',()=>{
    const m=new NinjaTrainingModel({countdownMs:0,aspectRatio:.25});m.start(0)
    expect(m.hit(input(.3,.67,5000)).contacts[1]).toBe(0)
    expect(m.hit(input(.3,.63,5000)).contacts[1]).toBe(1)
  })
  it.each([NaN,Infinity,-1,1.1])('rejects malformed coordinates/confidence %s before advancing time',value=>{
    const m=game();m.start(0);m.update(4900)
    expect(m.hit({...input(.3,.62,5000),x:value}).contacts[1]).toBe(0)
    expect(m.hit({...input(.3,.62,5000),confidence:value}).contacts[1]).toBe(0)
    expect(m.update(4900).elapsed).toBe(4900)
  })
  it('rejects invalid players and unrelated kinds',()=>{
    const m=game();m.start(0)
    expect(m.hit(input(.3,.62,5000,2)).contacts[2]).toBe(0)
    for(const kind of ['FREEZE','HAND_SWIPE','HAND_POSITION','MOTION_BRUSH'] as const)
      expect(m.hit({...input(.3,.62,5000),kind}).contacts[1]).toBe(0)
  })
  it('rejects stale captures but permits distinct samples from one camera frame',()=>{
    const m=game();m.start(0);m.update(5200)
    expect(m.hit(input(.3,.62,4900)).contacts[1]).toBe(0)
    m.hit(input(.8,.2,5200))
    expect(m.hit(input(.3,.62,5200)).contacts[1]).toBe(1)
  })
  it('freezes hazard warning and rejects pause-crossing captures on recovery',()=>{
    const m=game();m.start(0);const paused=m.pause(4500)
    expect(m.update(30000).obstacles).toEqual(paused.obstacles)
    m.resume(30000)
    expect(m.hit(input(.3,.62,29500)).contacts[1]).toBe(0)
    expect(m.update(30400).obstacles[0].active).toBe(true)
    expect(m.hit(input(.3,.62,30400)).contacts[1]).toBe(1)
  })
  it('keeps late-round obstacle warnings, clears results and resets contact state on replay',()=>{
    const m=game();m.start(0);m.hit(input(.3,.62,5000))
    defendUntil(m,22500,5000)
    expect(m.update(22500).obstacles).toHaveLength(1)
    const final=m.update(60000)
    expect(final.obstacles).toEqual([])
    expect(m.hit(input(.3,.62,61000)).scores).toEqual(final.scores)
    expect(m.start(62000).contacts[1]).toBe(0)
    expect(m.hit(input(.3,.62,67000)).contacts[1]).toBe(1)
  })
  it('keeps obstacle schedules and missed-target totals deterministic across a full round',()=>{
    const a=game(4),b=game(4);a.start(0);b.start(0)
    for(let t=50;t<=60000;t+=50)a.update(t)
    const fine=a.update(60000),coarse=b.update(60000)
    expect(coarse.scores).toEqual(fine.scores)
    expect(coarse.misses).toEqual(fine.misses)
    expect(coarse.contacts).toEqual(fine.contacts)
  })
})


describe('Ninja Training integration',()=>{
  it('declares MIXED capability rather than inventing a camera event kind',()=>{
    expect(getGameBySlug('ninja-training')).toMatchObject({input:'MIXED',available:true,players:[1,2,3,4]})
  })
  it.each([1,2,3,4] as const)('maps mirrored synthetic movement only into player %i obstacle contact',count=>{
    const m=game(count);m.start(0)
    const zones=defaultCameraZones(count),zone=zones[count-1]
    const processor=new MotionProcessor({smoothing:0,minimumZoneActivity:.0005})
    const width=640,height=180,data=new Uint8ClampedArray(width*height*4)
    processor.process({width,height,data},zones,0)
    const cx=Math.floor((1-zone.x-zone.width*.3)*width),cy=Math.floor(.62*height)
    for(let y=cy-5;y<cy+5;y++)for(let x=cx-5;x<cx+5;x++)data.fill(255,(y*width+x)*4,(y*width+x+1)*4)
    const motion=processor.process({width,height,data},zones,5000)
    expect(motion.positions).toHaveLength(1)
    const centroid=motion.zones.find(z=>z.playerId===count)!.centroid!
    const contact=m.hit({...motion.positions![0],...centroid,kind:'BODY_MOVE'})
    expect([1,2,3,4].map(id=>contact.contacts[id as 1|2|3|4])).toEqual([1,2,3,4].map(id=>id===count?1:0))
  })
})


describe('Dojo ranks and health',()=>{
  it.each([1,2,3,4])('takes %i distinct swats, awarding the defeat once',level=>{
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
  it('shortens flight on every rank and permits four camera hits even in the last wave',()=>{
    const flights=[1,2,3,4].map(level=>new NinjaTrainingModel({level,countdownMs:0}).start(0).ninjas[0].flightMs)
    expect(flights).toEqual([...flights].sort((a,b)=>b-a))
    expect(new Set(flights).size).toBe(4)
    const m=new NinjaTrainingModel({level:4,countdownMs:0,pressure:1})
    m.start(0)
    for(let t=250;t<=38000;t+=280) {
      for(const n of m.update(t).ninjas.filter(n=>n.pose==='leap'))m.hit(input(n.x,n.y,t))
    }
    const active=m.update(38100)
    expect(active.phase).toBe('playing')
    expect(active.ninjas[0].flightMs).toBeGreaterThan(4*280)
    expect(active.scores[0].score).toBeGreaterThanOrEqual(95)
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
    expect(state.obstacles.every(o=>o.playerId===2)).toBe(true)
    expect(m.update(30000).phase).toBe('results')
    expect(m.start(31000).health).toMatchObject({1:5,2:5})
  })
  it('charges one health for an obstacle, preserves it through pause and restores it on a new round',()=>{
    const m=game(2);m.start(0);const before=m.update(4900)
    const event=input(.3,.62,5000,2)
    const after=m.hit(event)
    expect(after.health[2]).toBe(before.health[2]-1)
    expect(after.health[1]).toBe(before.health[1])
    expect(m.hit({...event,timestamp:5100}).health).toEqual(after.health)
    expect(m.pause(5150).health).toEqual(m.resume(15000).health)
  })
})
