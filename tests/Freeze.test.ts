import { describe, expect, it } from 'vitest'
import { FreezeModel } from '../src/minigames/freeze/FreezeModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones, type PlayerCount, type PlayerId } from '../src/input/PlayerZoneMapper'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'
const event = (timestamp: number, activity = 0, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'FREEZE', x: .5, y: .5, activity, confidence: 1, timestamp, ...extra })
function make(playerCount: PlayerCount = 1, roundDurationMs = 60000) {
  const model = new FreezeModel({ playerCount, countdownMs: 0, roundDurationMs }); model.start(0); return model
}
function hold(model: FreezeModel, start = 3000, end = 4200, playerId: PlayerId = 1) {
  for (let time = start; time <= end; time += 100) model.input(event(time, 0, {playerId}))
}
describe('Freeze generic activity model', () => {
  it.each([1,2,3,4] as const)('isolates participation, penalties and scores for %i players', count => {
    const model = make(count)
    for (let id=1;id<=count;id++) model.input(event(100,.1,{playerId:id as PlayerId}))
    for (let time=3000;time<=4500;time+=100) for(let id=1;id<=count;id++) model.input(event(time,id%2 ? 0 : .1,{playerId:id as PlayerId}))
    expect(model.update(4500).scores.map(s=>s.score)).toEqual(Array.from({length:count},(_,i)=>i%2 ? -5 : 10))
    expect(model.update(4500).lanes.map(l=>l.freezes)).toEqual(Array.from({length:count},(_,i)=>i%2 ? 0 : 1))
  })
  it('uses exact cue boundaries and allows settling during Ready', () => {
    const model=make();model.input(event(2399,.015));model.input(event(2400,1));
    expect(model.update(2400).cue).toBe('Ready…')
    model.input(event(2999,1))
    expect(model.update(3000).cue).toBe('Freeze!')
    hold(model);expect(model.update(4200).scores[0].score).toBe(10)
    expect(model.update(5000)).toMatchObject({cue:'Move!',cueIndex:1,lanes:[{armed:false,heldMs:0,awarded:false}]})
  })
  it('requires a full 1200ms of observed stillness and awards only once', () => {
    const model=make();model.input(event(0,.1));hold(model,3000,4100)
    expect(model.update(4100).scores[0].score).toBe(0)
    hold(model,4200,4900);expect(model.update(4900).scores[0].score).toBe(10)
  })
  it('penalizes a false move only once, including after earning a statue', () => {
    const model=make();model.input(event(0,.1));hold(model)
    model.input(event(4300,.1));model.input(event(4400,.1));model.input(event(4500,0))
    expect(model.update(4600)).toMatchObject({scores:[{score:5}],lanes:[{failed:true,freezes:1}]})
  })
  it('never awards idle, absent, unarmed, or missing samples', () => {
    const idle=make();hold(idle);expect(idle.update(4999).scores[0].score).toBe(0)
    const absent=make();absent.input(event(0,.1));absent.input(event(3000,0))
    expect(absent.update(4999)).toMatchObject({scores:[{score:0}],lanes:[{heldMs:0}]})
    expect(make().update(60000).scores[0].score).toBe(0)
  })
  it.each(['gap','release','invalid'] as const)('restarts a hold after %s', reason => {
    const model=make();model.input(event(0,.1));hold(model,3000,3600)
    if(reason==='release') model.release(1)
    if(reason==='invalid') model.input(event(3650,0,{confidence:0}))
    hold(model,reason==='gap' ? 3900 : 3700,4800)
    expect(model.update(4800).scores[0].score).toBe(0)
  })
  it.each([{kind:'BODY_MOVE' as const},{playerId:4 as const},{activity:undefined},{activity:NaN},{activity:Infinity},{activity:-.1},{activity:1.1},{confidence:.59},{confidence:1.1},{confidence:NaN},{x:-1},{x:1.1},{y:NaN},{y:Infinity},{y:-.1},{timestamp:NaN},{timestamp:-1}])('rejects malformed participation %o', extra => {
    const model=make();model.input(event(0,.1,extra));hold(model)
    expect(model.update(4500).scores[0].score).toBe(0)
  })
  it('rejects duplicate, reordered and late packets', () => {
    const model=make();model.input(event(100,.1));model.input(event(3000,0));model.input(event(3000,.1));model.input(event(2999,.1))
    model.update(3100);model.input(event(3050,.1));hold(model,3200,4400)
    expect(model.update(4400).scores[0].score).toBe(10)
  })
  it('cannot bridge cue, pause, countdown or round boundaries', () => {
    const model=make();model.input(event(0,.1));hold(model,3000,3500)
    const paused=model.pause(3500);expect(model.update(10000)).toEqual(paused)
    model.input(event(10001,.1));model.resume(13500);model.input(event(3600,.1))
    hold(model,13600,14600);expect(model.update(14600).scores[0].score).toBe(0)
    model.update(15000);hold(model,18000,19200);expect(model.update(19200).scores[0].score).toBe(0)
    const short=make(1,4200);short.input(event(0,.1));hold(short)
    expect(short.update(4200)).toMatchObject({phase:'results',scores:[{score:0}]})
    expect(short.start(5000)).toMatchObject({phase:'playing',cueIndex:0,lanes:[{armed:false,freezes:0,heldMs:0}]})
    const countdown=new FreezeModel({countdownMs:3000});countdown.start(0);countdown.input(event(100,.1));hold(countdown,6000,7200)
    expect(countdown.update(7200).scores[0].score).toBe(0)
  })
  it('is independent of render cadence, returns detached snapshots and handles large jumps', () => {
    const a=make(),b=make()
    a.input(event(100,.1));b.input(event(100,.1))
    for(let time=3000;time<=4400;time+=100) {
      a.input(event(time));b.input(event(time));a.update(time+50)
    }
    const state=a.update(4500);state.lanes[0].freezes=999;state.scores[0].score=999
    expect(a.update(NaN)).toEqual(b.update(4500))
    expect(a.update(1000000).scores[0].score).toBe(10)
  })
  it('preserves final feedback and cue state until replay, including late input and focus loss', () => {
    const model = make(1, 4500)
    model.input(event(100, .1)); hold(model)
    const results = model.update(4500)
    expect(results).toMatchObject({ phase: 'results', cue: 'Freeze!', lanes: [{ freezes: 1, awarded: true }] })
    expect(model.update(1000000)).toEqual(results)
    expect(model.input(event(1000001, .1))).toEqual(results)
    expect(model.release(1)).toEqual(results)
    expect(model.start(1000100)).toMatchObject({ cue: 'Move!', lanes: [{ freezes: 0, awarded: false, heldMs: 0 }] })
  })
  it('ends at the round boundary even when rendering skips past it', () => {
    const regular = make(1, 4500), delayed = make(1, 4500)
    for (const model of [regular, delayed]) { model.input(event(100, .1)); hold(model) }
    expect(delayed.update(1000000)).toEqual(regular.update(4500))
  })
  it.each([1,2,3,4] as const)('adapts mirrored synthetic activity and explicit still frames for %i players', count => {
    const processor=new MotionProcessor({smoothing:0}),zones=defaultCameraZones(count),model=make(count)
    const width=160,height=80,data=new Uint8ClampedArray(width*height*4)
    expect(processor.process({width,height,data},zones,0).freezeSamples).toBeUndefined()
    const zone=zones[count-1],cx=Math.floor((1-zone.x-zone.width/2)*width)
    for(let y=20;y<40;y++) for(let x=cx-6;x<cx+6;x++) data.fill(255,(y*width+x)*4,(y*width+x+1)*4)
    for(const sample of processor.process({width,height,data},zones,100).freezeSamples!) model.input(sample)
    for(let time=3000;time<=4200;time+=100) for(const sample of processor.process({width,height,data},zones,time).freezeSamples!) model.input(sample)
    expect(model.update(4200).scores.map(s=>s.score)).toEqual([...Array(count-1).fill(0),10])
    processor.reset();expect(processor.process({width,height,data},zones,4300).freezeSamples).toBeUndefined()
  })
  it('does not treat exposure cancellation as stillness evidence', () => {
    const processor=new MotionProcessor(),zones=defaultCameraZones(1),width=16,height=16
    processor.process({width,height,data:new Uint8ClampedArray(1024)},zones,0)
    const samples=processor.process({width,height,data:new Uint8ClampedArray(1024).fill(255)},zones,100).freezeSamples
    expect(samples).toMatchObject([{kind:'FREEZE',activity:0,confidence:0}])
  })
  it('records implementation availability while preserving refinement gating', () => {
    expect(getGameBySlug('freeze')).toMatchObject({available:true,input:'FREEZE',players:[1,2,3,4]})
    expect(isGameVisible('freeze')).toBe(false)
  })
})
