import {expect,it} from 'vitest'
import {BowlingModel,bowlingRack,FLIGHT_MS,sweepAim} from '../src/minigames/marble-bowling/BowlingModel'
import {challengePressure,scoreGoal} from '../src/game/arcade'
import {bowlingSweep,HandSwipeTracker} from '../src/input/HandSwipe'
import type {MotionInputEvent} from '../src/input/MotionProcessor'

const stroke=(time:number,dx=0,dy=-.2):MotionInputEvent=>({kind:'HAND_SWIPE',playerId:2,timestamp:time,
  x:.5+dx,y:.75+dy,confidence:.95,swipe:{fromX:.5,fromY:.75,durationMs:200}})

it('a measured moderate-speed sweep launches one ball and awards only its owner',()=>{
  const model=new BowlingModel(4),tracker=new HandSwipeTracker(bowlingSweep)
  model.start(0)
  for(let i=0;i<=6;i++){
    const timestamp=3110+i*50
    const event=tracker.sample({kind:'HAND_POSITION',playerId:2,x:.5,y:.8-i*.021,timestamp,confidence:1})
    if(event){model.input([event,event],timestamp+40)}
  }
  const result=model.update(4300)
  expect(result.scores.map(s=>s.score)).toEqual([0,6,0,0])
  expect(result.lanes[1]).toMatchObject({rolls:1,knocked:3,strikes:1})
})
it('rejects accidental, stale, low-confidence and pre-go inputs without consuming rolls',()=>{
  const m=new BowlingModel(2)
  m.start(0)
  m.input([stroke(2980)],3010)
  m.input([stroke(3100,.18,0),stroke(3100,.03,.1),{...stroke(3100),confidence:.3},stroke(3200)],3120)
  m.input([stroke(3010)],3500)
  expect(m.update(3900).lanes[1].rolls).toBe(0)
})
it('lets the player clear standing pins after a partial hit without double-counting',()=>{
  const m=new BowlingModel(2,.7,()=>0)
  m.start(0)
  m.roll(1,3000,-17)
  const first=m.update(4350).lanes[0]
  expect(first.knocked).toBeGreaterThan(0)
  expect(first.knocked).toBeLessThan(first.pins.length)
  m.roll(1,4400,0)
  const second=m.update(5200)
  expect(second.lanes[0].pins.every(p=>p.down)).toBe(true)
  expect(second.scores[0].score).toBe(first.pins.length)
  expect(second.lanes[0].strikes).toBe(0)
})
it.each([1,2,4,6,8,15])('offers reachable racks and an achievable level %i goal in three rolls',level=>{
  const pressure=challengePressure(level)
  for(const seed of [0,.6]){
    const m=new BowlingModel(4,pressure,()=>seed)
    let s=m.start(0)
    for(let roll=0;roll<3;roll++){
      const t=3100+roll*1800
      s=m.update(t)
      for(const lane of s.lanes){
        expect(lane.pins).toEqual(s.lanes[0].pins)
        const pin=lane.pins.find(p=>!p.down)!
        const aim=(pin.x-50)*90/(107-pin.y)
        expect(Math.abs(aim)).toBeLessThanOrEqual(49)
        m.roll(lane.id,t,aim)
      }
      s=m.update(t+1450)
    }
    expect(s.phase).toBe('results')
    expect(s.scores[0].score).toBeGreaterThanOrEqual(scoreGoal('marble-bowling',level))
    expect(new Set(s.scores.map(p=>p.score)).size).toBe(1)
    expect(s.lanes.every(l=>l.rolls===3)).toBe(true)
    expect(m.start(14000).lanes[0]).toMatchObject({rolls:0,knocked:0,strikes:0})
  }
})
it('finishes a buzzer-beating roll, freezes flight on pause, and rejects late releases',()=>{
  const m=new BowlingModel(2)
  m.start(0);m.roll(1,32950)
  const paused=m.pause(32980)
  expect(m.update(52000).lanes[0].progress).toBe(paused.lanes[0].progress)
  m.resume(55000)
  m.input([stroke(54900)],55020)
  m.roll(2,55100)
  const result=m.update(55000+FLIGHT_MS)
  expect(result.phase).toBe('results')
  expect(result.scores.map(s=>s.score)).toEqual([6,0])
})
it('uses identical swept collisions on delayed and frequent render frames',()=>{
  const play=(step:number)=>{
    const m=new BowlingModel(1,0,()=>0);m.start(0);m.roll(1,3100)
    for(let t=3100;t<4800;t+=step)m.update(t)
    return m.update(6000)
  }
  expect(play(16)).toEqual(play(1600))
  expect(sweepAim(.12,.2)).toBeGreaterThan(0)
  expect(sweepAim(.4,.1)).toBeNull()
  expect(bowlingRack(1,1,1)).not.toEqual(bowlingRack(1,1,0))
})
