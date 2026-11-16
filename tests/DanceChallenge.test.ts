import { describe, expect, it } from 'vitest'
import { DanceChallengeModel, danceCues } from '../src/minigames/dance-challenge/DanceChallengeModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'
import { MotionProcessor } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'
const event = (timestamp: number, x = .5, y = .5, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'BODY_MOVE', x, y, confidence: 1, timestamp, ...extra })
const make = (playerCount: 1|2|3|4 = 1, roundDurationMs = 60000) => {
  const model = new DanceChallengeModel({playerCount, countdownMs:0, roundDurationMs}); model.start(0); return model
}
describe('Dance Challenge directional motion', () => {
  it.each([1,2,3,4] as const)('isolates matches and allows one award per cue for %i players', count => {
    const model = make(count)
    for(const time of [800,900,1000]) for(let id=1; id<=count; id++) {
      const playerId=id as 1|2|3|4
      model.moveBody(event(time,time===800 ? .5 : time===900 ? (id%2 ? .3 : .7) : 0,.5,{playerId}))
    }
    expect(model.update(1100).scores.map(s=>s.score)).toEqual(Array(count).fill(10))
    expect(model.update(1100).lanes.map(l=>l.matches)).toEqual(Array(count).fill(1))
  })
  it('never shares another player’s movement or score', () => {
    const model=make(4)
    for(const time of [800,900]) for(let id=1;id<=3;id++) {
      model.moveBody(event(time,time===800 ? .5 : id===2 ? .3 : .7,.5,{playerId:id as 1|2|3}))
    }
    expect(model.update(1000).scores.map(s=>s.score)).toEqual([0,10,0,0])
  })
  it('produces the same score with fine or coarse render cadence', () => {
    const a=make(),b=make()
    for(const [time,x] of [[800,.5],[900,.4],[1000,.3]]) {
      a.moveBody(event(time,x));b.moveBody(event(time,x))
      for(let sub=time+10;sub<time+100;sub+=10) a.update(sub)
    }
    expect(a.update(60000)).toEqual(b.update(60000))
    expect(b.update(60000).scores[0].score).toBe(10)
  })
  it('matches all four directions on a shared deterministic clock', () => {
    const model=make()
    const ends=[[.3,.5],[.7,.5],[.5,.3],[.5,.7]]
    danceCues.forEach((cue,index)=>{
      const time=index*2400+800
      expect(model.update(time)).toMatchObject({cue,active:true,cueIndex:index})
      model.moveBody(event(time));model.moveBody(event(time+100,...ends[index] as [number,number]))
    })
    expect(model.update(8200)).toMatchObject({scores:[{playerId:1,score:40}],lanes:[{matches:4}]})
  })
  it('requires movement within Go, excludes the window endpoint and ignores held or wrong-direction positions', () => {
    const model=make()
    model.moveBody(event(700)); model.moveBody(event(800,.2)); // warning cannot supply anchor
    model.moveBody(event(900,.2));model.moveBody(event(1000,.4))
    model.moveBody(event(1100,.4,.1)); // vertical motion cannot match left
    model.moveBody(event(2000,0))
    expect(model.update(2200).scores[0].score).toBe(0)
    expect(model.update(2400)).toMatchObject({cue:'right',active:false})
  })
  it('accumulates small fresh movements, includes distance boundary and preserves current marker', () => {
    const model=make(); model.moveBody(event(800))
    model.moveBody(event(900,.44)); model.moveBody(event(1000,.38)); model.moveBody(event(1100,.32))
    expect(model.update(1200)).toMatchObject({scores:[{score:10}],lanes:[{position:{x:.32,y:.5}}]})
  })
  it('does not reuse anchors after gaps, invalid tracking, releases or later cues', () => {
    const model=make(4)
    for(let id=1;id<=4;id++) model.moveBody(event(800,.5,.5,{playerId:id as 1|2|3|4}))
    model.moveBody(event(850,.5,.5,{playerId:2,confidence:0}))
    model.releaseBody(3)
    for(let id=1;id<=3;id++) model.moveBody(event(1200,.1,.5,{playerId:id as 1|2|3|4}))
    model.moveBody(event(3200,.8,.5,{playerId:4}))
    expect(model.update(3300).scores.map(s=>s.score)).toEqual([0,0,0,0])
  })
  it.each([{kind:'MOTION_HIT' as const},{playerId:4 as const},{x:NaN},{x:-1},{x:2},{y:Infinity},{y:-1},{y:2},{confidence:NaN},{confidence:1.1},{confidence:.2},{timestamp:NaN},{timestamp:-1}])('rejects malformed input %o', extra => {
    const model=make();model.moveBody(event(800));model.moveBody(event(900,.1,.5,extra))
    expect(model.update(1000).scores[0].score).toBe(0)
  })
  it('rejects duplicates, out-of-order packets and stale input after loss or render advancement', () => {
    const model=make();model.moveBody(event(800));model.moveBody(event(850,.5,.5,{confidence:0}))
    model.moveBody(event(800));model.moveBody(event(850,0));model.update(1000);model.moveBody(event(950,0))
    expect(model.update(1100).scores[0].score).toBe(0)
  })
  it('freezes pauses, discards old anchors and interrupted packets, and requires fresh movement on resume', () => {
    const model=make();model.moveBody(event(800));const paused=model.pause(850)
    expect(model.update(10000)).toEqual(paused)
    model.resume(10850);model.moveBody(event(900,.1));model.moveBody(event(10900,.5))
    expect(model.update(10900).scores[0].score).toBe(0)
    model.moveBody(event(11000,.2));model.moveBody(event(11100,0))
    expect(model.update(11100).scores[0].score).toBe(10)
  })
  it('honors countdown, round endpoint, large frame gaps, results and clean replay', () => {
    const model=new DanceChallengeModel({countdownMs:3000,roundDurationMs:1000});model.start(0)
    model.pause(1000);model.resume(11000)
    expect(model.update(12000).countdownRemainingMs).toBe(1000)
    model.moveBody(event(13800));model.moveBody(event(14000,0))
    expect(model.update(100000)).toMatchObject({phase:'results',scores:[{score:0}]})
    expect(model.start(100001)).toMatchObject({phase:'countdown',cueIndex:0,lanes:[{matches:0,matched:false,position:null}]})
  })
  it('returns detached snapshots and tolerates invalid update times', () => {
    const model=make();model.moveBody(event(800));const state=model.update(850)
    state.lanes[0].position!.x=999;state.lanes[0].matches=999;state.scores[0].score=999
    expect(model.update(NaN)).toMatchObject({lanes:[{matches:0,position:{x:.5}}],scores:[{score:0}]})
  })
  it.each([1,2,3,4] as const)('matches mirrored synthetic motion centers only in player %i lane', count => {
    const model=make(count), zones=defaultCameraZones(count), zone=zones[count-1]
    const processor=new MotionProcessor({smoothing:0,minimumZoneActivity:.001})
    const width=640,height=180,data=new Uint8ClampedArray(width*height*4)
    processor.process({width,height,data},zones,0)
    // Separate changing blocks: raw camera rightward motion becomes screen leftward.
    for(const [time,localX] of [[800,.8],[900,.2]]) {
      const cx=Math.floor((1-zone.x-zone.width*localX)*width)
      for(let y=40;y<140;y++) for(let x=cx-Math.floor(zone.width*width*.12);x<cx+Math.floor(zone.width*width*.12);x++) data.fill(255,(y*width+x)*4,(y*width+x+1)*4)
      const result=processor.process({width,height,data},zones,time)
      expect(result.positions).toHaveLength(1)
      const centroid=result.zones.find(z=>z.playerId===count)!.centroid!
      model.moveBody({...result.positions![0],...centroid,kind:'BODY_MOVE'})
    }
    expect(model.update(1000).scores.map(s=>s.score)).toEqual([...Array(count-1).fill(0),10])
  })
  it('records implementation availability while preserving public refinement gating', () => {
    expect(getGameBySlug('dance-challenge')).toMatchObject({available:true,input:'BODY_MOVE',players:[1,2,3,4]})
    expect(isGameVisible('dance-challenge')).toBe(false)
  })
})
