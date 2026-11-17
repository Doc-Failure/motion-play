import { describe, expect, it } from 'vitest'
import { WindowWipeModel } from '../src/minigames/window-wipe/WindowWipeModel'

const brush = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1) => ({ playerId, kind: 'MOTION_BRUSH' as const, x, y, confidence: 1, timestamp })

describe('WindowWipeModel', () => {
  it('handles repeated pauses and a pause arriving at round end', () => {
    const model = new WindowWipeModel({ countdownMs: 0, roundDurationMs: 1000 })
    model.start(0)
    const paused = model.pause(100)
    expect(model.pause(200)).toEqual(paused)
    model.resume(300)
    expect(model.pause(1200).phase).toBe('results')
  })

  it('accumulates a brush trace and awards only newly cleaned cells', () => {
    const model = new WindowWipeModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    const first = model.brush(brush(.05, .08, 10))
    expect(first.progress[1]).toBeGreaterThan(0)
    const score = first.scores[0].score
    expect(model.brush(brush(.05, .08, 20)).scores[0].score).toBe(score)
    expect(model.brush({ ...brush(.5, .5, 30), kind: 'MOTION_HIT' }).scores[0].score).toBe(score)
  })

  it('keeps two-player cleaning and scores isolated', () => {
    const model = new WindowWipeModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    const playerTwo = model.brush(brush(.5, .5, 10, 2))
    expect(playerTwo.progress[1]).toBe(0)
    expect(playerTwo.progress[2]).toBeGreaterThan(0)
    expect(playerTwo.scores[0].score).toBe(0)
    expect(playerTwo.scores[1].score).toBeGreaterThan(0)
  })

  it('rejects low-confidence and out-of-round brush input', () => {
    const model = new WindowWipeModel({ countdownMs: 100 })
    model.start(0)
    expect(model.brush(brush(.5, .5, 50)).progress[1]).toBe(0)
    model.update(100)
    expect(model.brush({ ...brush(.5, .5, 110), confidence: .1 }).progress[1]).toBe(0)
  })

  it('preserves progress while paused', () => {
    const model = new WindowWipeModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    const cleaned = model.brush(brush(.5, .5, 100)).progress[1]
    expect(model.pause(1_000).phase).toBe('paused')
    expect(model.update(5_000).progress[1]).toBe(cleaned)
    expect(model.resume(6_000)).toMatchObject({ phase: 'playing', roundRemainingMs: 9_000 })
  })
})

// Fill measured points without interpolating imaginary paths between body parts.
function cleanWindow(model:WindowWipeModel,time:number,playerId:1|2=1){
 for(let row=0;row<30;row++)for(let column=0;column<40;column++)model.brush(brush((column+.5)/40,(row+.5)/30,time,playerId))
 const initial=model.update(time)
 for(const spot of initial.spots[playerId])for(let i=0;i<3;i++){time+=200;model.brush(brush(spot.x+(i%2?.025:-.025),spot.y,time,playerId))}
 return {state:model.update(time),time}
}

describe('successive soapy windows',()=>{
 it('clears successive windows, celebrates once, keeps the clock running and sums points',()=>{
  const model=new WindowWipeModel({countdownMs:0,playerCount:2});model.start(0)
  const first=cleanWindow(model,100)
  expect(first.state.windows[1]).toBe(1);expect(first.state.progress[1]).toBe(100)
  expect(first.state.scores.map(s=>s.score)).toEqual([180,0])
  expect(first.state.effects.filter(e=>e.kind==='window')).toHaveLength(1)
  expect(first.state.phase).toBe('playing');expect(first.state.cleaned[2]).toHaveLength(0)
  const next=model.update(first.time+1200)
  expect(next.progress[1]).toBe(0);expect(next.celebrating[1]).toBe(false)
  expect(next.spots[1].map(s=>[s.x,s.y])).not.toEqual(first.state.spots[1].map(s=>[s.x,s.y]))
  const second=cleanWindow(model,first.time+1300)
  expect(second.state.windows[1]).toBe(2);expect(second.state.scores[0].score).toBe(360)
  expect(model.update(60000).phase).toBe('results')
 })
 it('requires fresh rubbing movement for ink, not a stationary or duplicated sample',()=>{
  const model=new WindowWipeModel({countdownMs:0});const spot=model.start(0).spots[1][0]
  expect(model.brush(brush(spot.x,spot.y,100)).spots[1][0].remaining).toBe(2)
  model.brush(brush(spot.x+.03,spot.y,100))
  expect(model.brush(brush(spot.x,spot.y,1000)).spots[1][0].remaining).toBe(2)
  expect(model.brush(brush(spot.x+.03,spot.y,1200)).spots[1][0].remaining).toBe(1)
  const popped=model.brush(brush(spot.x-.03,spot.y,1400))
  expect(popped.spots[1][0].remaining).toBe(0)
  expect(popped.effects.some(e=>e.kind==='pop')).toBe(true)
 })
 it('never fills the space between separate arms or across missing observations',()=>{
  const model=new WindowWipeModel({countdownMs:0,aspectRatio:1});model.start(0)
  model.brush(brush(.1,.5,100));model.brush(brush(.9,.5,100))
  const disconnected=model.brush(brush(.9,.6,2000))
  expect(disconnected.cleaned[1]).not.toContain(15*40+20)
 })
 it.each([{x:NaN},{y:Infinity},{x:-.1},{y:1.1},{confidence:NaN},{confidence:2},{timestamp:NaN},{playerId:4 as const}])('rejects malformed input without advancing the round: %j',extra=>{
  const model=new WindowWipeModel({countdownMs:0});model.start(0)
  expect(model.brush({...brush(.5,.5,5000),...extra}).roundRemainingMs).toBe(60000)
  expect(model.update(100).scores[0].score).toBe(0)
 })
 it('freezes a completed-window transition during pause and rejects pre-resume captures',()=>{
  const model=new WindowWipeModel({countdownMs:0});model.start(0)
  const {time}=cleanWindow(model,100);const paused=model.pause(time+100)
  expect(model.update(30000).celebrating).toEqual(paused.celebrating)
  model.resume(30000)
  expect(model.brush(brush(.5,.5,29950)).scores).toEqual(paused.scores)
  expect(model.update(31100).celebrating[1]).toBe(false)
  expect(model.update(31100).progress[1]).toBe(0)
 })
 it('keeps brush circles consistent with narrow camera lanes',()=>{
  const model=new WindowWipeModel({countdownMs:0,aspectRatio:.25});model.start(0)
  const state=model.brush(brush(.5,.5,10))
  expect(state.cleaned[1]).toContain(14*40+19)
  expect(state.cleaned[1]).not.toContain(17*40+19)
 })
 it('starts replay with clean scores, fresh foam and all spots restored',()=>{
  const model=new WindowWipeModel({countdownMs:0});model.start(0);cleanWindow(model,100);model.update(60000)
  const replay=model.start(61000)
  expect(replay.scores[0].score).toBe(0);expect(replay.windows[1]).toBe(0)
  expect(replay.cleaned[1]).toEqual([]);expect(replay.effects).toEqual([])
  expect(replay.spots[1].every(s=>s.remaining===3)).toBe(true)
 })
})

it('retains bounded smooth paint discs only when they reveal new soap, and resets them per pane',()=>{
 const model=new WindowWipeModel({countdownMs:0});model.start(0)
 const first=model.brush(brush(.5,.5,10))
 expect(first.dabs[1]).toHaveLength(1)
 expect(first.dabs[1][0]).toMatchObject({x:.5,y:.5,radiusX:.135/(16/9),radiusY:.135})
 const repeated=model.brush(brush(.5,.5,20));expect(repeated.dabs[1]).toHaveLength(1)
 // Snapshots cannot mutate the paint history retained by the game.
 repeated.dabs[1][0].x=.9;expect(model.update(30).dabs[1][0].x).toBe(.5)
 const complete=cleanWindow(model,100)
 expect(complete.state.dabs[1].length).toBeLessThanOrEqual(1200)
 const next=model.update(complete.time+1200)
 expect(next.dabs[1]).toEqual([])
 expect(model.brush(brush(.5,.5,complete.time+1190)).dabs[1]).toEqual([])
})
