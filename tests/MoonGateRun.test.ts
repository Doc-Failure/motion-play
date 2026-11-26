import { describe, expect, it } from 'vitest'
import { MoonGateModel } from '../src/minigames/moon-gate-run/MoonGateModel'
import { GATE_DISTANCE, platforms } from '../src/minigames/moon-gate-run/course'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
import type { PlayerId } from '../src/input/PlayerZoneMapper'

function sample(timestamp: number, kind: MotionInputEvent['kind'], x: number, y: number, playerId: PlayerId = 1): MotionInputEvent {
  return { timestamp, kind, x, y, playerId, confidence: 1, activity: .045 }
}
describe('Moon Gate Run', () => {
  it('uses fresh, player-owned torso rise for a jump that lands on the crate then steps off', () => {
    const m = new MoonGateModel(2, .8)
    m.start(0)
    const edge = 3000 + platforms[0].start/.00021
    m.input(sample(edge-340,'BODY_MOVE',.5,.60))
    m.input(sample(edge-280,'BODY_MOVE',.5,.54))
    expect(m.update(edge+1).runners[0].height).toBeGreaterThan(platforms[0].height)
    const landed = m.update(edge+550).runners
    expect(landed[0]).toMatchObject({height: .10, grounded:true, cleared:1})
    expect(landed[1]).toMatchObject({height:.10, cleared:0})
    expect(landed[1].life).toBe(landed[0].life-1)
    expect(m.update(edge+1450).runners[0]).toMatchObject({height:0, cleared:1})
  })
  it('accepts separate spatial samples in one frame and rejects replay, misses, held poses and stale data', () => {
    const m = new MoonGateModel(2, .8)
    m.start(0)
    const f = m.update(4300).foe!
    m.input(sample(4300,'MOTION_HIT',0,0))
    m.input(sample(4300,'MOTION_HIT',f.x,f.y))
    expect(m.input(sample(4300,'MOTION_HIT',f.x,f.y)).scores.map(p=>p.score)).toEqual([10,0])
    m.input(sample(4400,'BODY_MOVE',.5,.58))
    m.input(sample(5050,'BODY_MOVE',.5,.49))
    expect(m.update(5100).runners[0].height).toBe(0)
    m.pause(5200)
    const distance=m.update(7600).distance
    m.resume(7700)
    expect(m.input(sample(5350,'BODY_MOVE',.5,.2)).distance).toBe(distance)
    expect(m.update(7800).runners[0].height).toBe(0)
  })
  it('checks delayed swats against the enemy present when the camera captured them', () => {
    const m = new MoonGateModel(1, 1.6)
    m.start(0)
    const arrival = m.update(3630)
    const f = arrival.foe!
    expect(m.input(sample(3530,'MOTION_HIT',f.x,f.y)).scores[0].score).toBe(0)
    expect(m.input(sample(3630,'MOTION_HIT',f.x,f.y)).scores[0].score).toBe(10)
  })
  it.each([1,5])('scrolls to a persistent boss and requires a victory for level %i qualification', level => {
    const m = new MoonGateModel(4,.45,level)
    m.start(0)
    let s=m.update(3000)
    let bossHits=0
    for(let t=3100;t<62000 && s.phase==='playing';t+=100){
      s=m.update(t)
      const f=s.foe
      if(!f)continue
      if(f.boss){
        expect(s.distance).toBe(GATE_DISTANCE)
        if(t%300!==0)continue
        if (s.runners[0].hp>0) bossHits++
      }
      s=m.input(sample(t,'MOTION_HIT',f.x,f.y))
    }
    expect(s.phase).toBe('results')
    expect(s.runners[0].won).toBe(true)
    expect(bossHits).toBe(8+(level-1)*2)
    expect(s.runners.slice(1).every(p=>!p.won && !p.life)).toBe(true)
    expect(m.start(65000).runners[0]).toMatchObject({life:6,won:false,cleared:0})
  })
  it('ends a missed run without automatically clearing the gate',()=>{
    const m=new MoonGateModel(1,1.6);m.start(0)
    const s=m.update(64000)
    expect(s.phase).toBe('results')
    expect(s.runners[0]).toMatchObject({life:0,won:false})
    expect(s.scores[0].score).toBe(0)
  })
})
