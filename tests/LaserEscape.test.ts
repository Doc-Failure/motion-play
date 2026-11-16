import { describe, expect, it } from 'vitest'
import { LaserEscapeModel, laserReach } from '../src/minigames/laser-escape/LaserEscapeModel'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'
import { MotionProcessor } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
const event = (timestamp: number, x = 0, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({playerId:1,kind:'BODY_MOVE',x,y:.5,confidence:1,timestamp,...extra})
const make = (playerCount: 1 | 2 | 3 | 4 = 1, roundDurationMs = 60000) => {
  const model = new LaserEscapeModel({playerCount, countdownMs:0, roundDurationMs}); model.start(0); return model
}
function track(model: LaserEscapeModel, from = 900, to = 2100, x = 0) {
  for (let time = from; time <= to; time += 100) model.moveBody(event(time, x))
}

describe('Laser Escape continuous swept-line model', () => {
  it.each([1,2,3,4] as const)('isolates escapes and laser penalties for %i players', count => {
    const model = make(count)
    for (let time = 900; time <= 2100; time += 100) for (let id = 1; id <= count; id++) {
      model.moveBody(event(time, id % 2 ? 0 : .5, {playerId:id as 1|2|3|4}))
    }
    const state = model.update(2200)
    expect(state.scores.map(s => s.score)).toEqual(Array.from({length:count}, (_, i) => i % 2 ? -5 : 10))
    expect(state.lanes.map(l => [l.escapes,l.hits])).toEqual(Array.from({length:count},(_,i) => i % 2 ? [0,1] : [1,0]))
    expect(model.update(2200)).toEqual(state)
  })
  it.each([1,2,3,4] as const)('accepts only the mirrored synthetic motion lane for %i players', count => {
    const model = make(count), zones = defaultCameraZones(count), zone = zones[count - 1]
    const processor = new MotionProcessor({smoothing:0, minimumZoneActivity:.001})
    const width = 320, height = 180, data = new Uint8ClampedArray(width*height*4)
    processor.process({width,height,data},zones,0)
    const cx = Math.floor((1-zone.x-zone.width*.5)*width)
    for (let time = 900; time <= 2100; time += 100) {
      for (let y=50;y<130;y++) for(let x=cx-Math.floor(zone.width*width*.12);x<cx+Math.floor(zone.width*width*.12);x++) data.fill(time%200?255:0,(y*width+x)*4,(y*width+x+1)*4)
      const motion = processor.process({width,height,data},zones,time)
      expect(motion.positions).toHaveLength(1)
      model.moveBody({...motion.positions![0], ...motion.zones.find(z=>z.playerId===count)!.centroid!, kind:'BODY_MOVE'})
    }
    expect(model.update(2200).scores.map(s=>s.score)).toEqual([...Array(count-1).fill(0),-5])
  })
  it('keeps tested implementation metadata separate from public visibility', () => {
    expect(getGameBySlug('laser-escape')).toMatchObject({available:true,input:'BODY_MOVE',players:[1,2,3,4]})
    expect(isGameVisible('laser-escape')).toBe(false)
  })
  it('telegraphs, sweeps continuously and reverses on the next wave', () => {
    const model = make()
    expect(model.update(500)).toMatchObject({beamX:.15,active:false,direction:'right'})
    expect(model.update(1600)).toMatchObject({beamX:.5,active:true})
    expect(model.update(3000)).toMatchObject({beamX:.85,active:false,direction:'left'})
    expect(model.update(4600)).toMatchObject({beamX:.5,active:true})
  })
  it('detects crossing between updates even when neither endpoint overlaps', () => {
    const model = make(); model.moveBody(event(1200,.37)); model.update(1550)
    expect(model.update(2200).lanes[0].hits).toBe(1)
  })
  it('includes the collision boundary and charges only once per sweep', () => {
    const model = make(); track(model,900,2100,.15-laserReach)
    expect(model.update(2200).scores[0].score).toBe(-5)
    expect(model.update(2900).lanes[0].hits).toBe(1)
  })
  it('does not award absent, expired, incomplete or released tracking', () => {
    const model = make(4)
    model.moveBody(event(900)); model.moveBody(event(1500,0,{playerId:2}))
    model.moveBody(event(900,0,{playerId:3})); model.releaseBody(3)
    expect(model.update(2200).scores.map(s=>s.score)).toEqual([0,0,0,0])
  })
  it('does not erase a known collision when tracking disappears', () => {
    const model=make(); model.moveBody(event(900,.15)); model.moveBody(event(1100,0,{confidence:0}))
    expect(model.update(2200).scores[0].score).toBe(-5)
  })
  it('resolves elapsed movement against old positions before accepting future input', () => {
    const model = make(); model.moveBody(event(1400,.5)); model.moveBody(event(1700,0))
    expect(model.update(2200).scores[0].score).toBe(-5)
  })
  it('is independent of render cadence and never reuses tracking across later sweeps', () => {
    const a=make(), b=make()
    for(let time=900;time<=2100;time+=100) {
      a.moveBody(event(time)); b.moveBody(event(time))
      for(let sub=time+10;sub<time+100;sub+=10) a.update(sub)
    }
    expect(b.update(10000)).toEqual(a.update(10000))
    expect(b.update(10000).scores[0].score).toBe(10)
  })
  it('honors countdown, exclusive round endpoint, delayed results and replay', () => {
    const model = new LaserEscapeModel({countdownMs:3000,roundDurationMs:2200}); model.start(0)
    model.moveBody(event(1000)); expect(model.update(3000).lanes[0].bodyX).toBeNull()
    track(model,3900,5100)
    expect(model.update(10000)).toMatchObject({phase:'results',scores:[{playerId:1,score:0}]})
    expect(model.start(11000).lanes[0]).toMatchObject({escapes:0,hits:0,bodyX:null})
    const delayed=make(1,2300); track(delayed)
    expect(delayed.update(10000)).toMatchObject({phase:'results',scores:[{playerId:1,score:10}]})
  })
  it('freezes countdown and sweep, discards interrupted input and requires fresh tracking', () => {
    const model=make(); track(model,900,1300)
    const paused=model.pause(1400); expect(model.update(10000)).toEqual(paused)
    model.resume(11400); model.moveBody(event(1500))
    expect(model.update(12200).scores[0].score).toBe(0)
    const countdown=new LaserEscapeModel(); countdown.start(0);countdown.pause(1000);countdown.resume(11000)
    expect(countdown.update(12000).countdownRemainingMs).toBe(1000)
  })
  it.each([{kind:'MOTION_HIT' as const},{playerId:4 as const},{x:NaN},{x:-1},{x:2},{y:Infinity},{y:-1},{y:2},{confidence:NaN},{confidence:1.1},{confidence:.2},{timestamp:NaN},{timestamp:-1}])('rejects malformed input %o', extra => {
    const model=make(); model.moveBody(event(900,.5,extra)); expect(model.update(2200).scores[0].score).toBe(0)
  })
  it('rejects duplicate, reordered and stale packets after tracking loss', () => {
    const model=make(); model.moveBody(event(900)); model.moveBody(event(950,0,{confidence:0}))
    model.moveBody(event(900,.5)); model.moveBody(event(950,.5));model.update(1400);model.moveBody(event(1300,.5))
    expect(model.update(2200).scores[0].score).toBe(0)
  })
  it('scores a fully tracked reverse sweep independently of the first', () => {
    const model=make(); track(model)
    track(model,3900,5100,1)
    expect(model.update(5200)).toMatchObject({scores:[{playerId:1,score:20}],lanes:[{escapes:2,hits:0}]})
  })
  it('requires continuous tracking even when the first and last samples are fresh', () => {
    const model=make();model.moveBody(event(900));model.moveBody(event(1900))
    expect(model.update(2200).scores[0].score).toBe(0)
  })
  it('returns detached snapshots and tolerates invalid update times', () => {
    const model=make();const state=model.update(100);state.lanes[0].hits=99;state.scores[0].score=999
    expect(model.update(NaN).lanes[0].hits).toBe(0); expect(model.update(100).scores[0].score).toBe(0)
  })
})
