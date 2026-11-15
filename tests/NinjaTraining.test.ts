import { describe, expect, it } from 'vitest'
import { NinjaTrainingModel } from '../src/minigames/ninja-training/NinjaTrainingModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
const input=(x:number,y:number,timestamp:number,playerId:1|2|3|4=1):MotionInputEvent=>({playerId,kind:'MOTION_HIT',x,y,timestamp,confidence:1})
const game=(count:1|2|3|4=1)=>new NinjaTrainingModel({countdownMs:0,playerCount:count})

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
  it('runs a debounced bamboo bonus with break animation events and resets for another bundle',()=>{
    const m=game();m.start(0);expect(m.update(18500).bonus).toBe(true)
    const first=m.hit(input(.5,.55,18500));expect(first.planks[1]).toBe(2)
    expect(m.hit(input(.5,.55,18500)).planks[1]).toBe(2)
    m.hit(input(.5,.55,18700));const broken=m.hit(input(.5,.55,18900))
    expect(broken.planks[1]).toBe(0);expect(broken.boards[1]).toBe(1)
    expect(broken.effects.some(e=>e.kind==='break')).toBe(true)
    expect(m.update(19500).planks[1]).toBe(3)
    expect(m.update(24500).bonus).toBe(false)
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
    const normal=game();normal.start(0);expect(normal.update(14000).ninjas.some(n=>n.flightMs<2500)).toBe(true)
  })
})
