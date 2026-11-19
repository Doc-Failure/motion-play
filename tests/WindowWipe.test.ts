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
    expect(first.progress).toBeGreaterThan(0)
    const score = first.scores[0].score
    expect(model.brush(brush(.05, .08, 20)).scores[0].score).toBe(score)
    expect(model.brush({ ...brush(.5, .5, 30), kind: 'MOTION_HIT' }).scores[0].score).toBe(score)
  })

  it('maps the second player onto the shared pane and credits their work', () => {
    const model = new WindowWipeModel({ playerCount: 2, countdownMs: 0 })
    model.start(0)
    const playerTwo = model.brush(brush(.5, .5, 10, 2))
    expect(playerTwo.dabs[0].x).toBe(.75)
    expect(playerTwo.progress).toBeGreaterThan(0)
    expect(playerTwo.scores[0].score).toBe(0)
    expect(playerTwo.scores[1].score).toBeGreaterThan(0)
  })

  it('rejects low-confidence and out-of-round brush input', () => {
    const model = new WindowWipeModel({ countdownMs: 100 })
    model.start(0)
    expect(model.brush(brush(.5, .5, 50)).progress).toBe(0)
    model.update(100)
    expect(model.brush({ ...brush(.5, .5, 110), confidence: .1 }).progress).toBe(0)
  })

  it('preserves progress while paused', () => {
    const model = new WindowWipeModel({ countdownMs: 0, roundDurationMs: 10_000 })
    model.start(0)
    const cleaned = model.brush(brush(.5, .5, 100)).progress
    expect(model.pause(1_000).phase).toBe('paused')
    expect(model.update(5_000).progress).toBe(cleaned)
    expect(model.resume(6_000)).toMatchObject({ phase: 'playing', roundRemainingMs: 9_000 })
  })
})

// Fill measured points without interpolating imaginary paths between body parts.
function cleanWindow(model:WindowWipeModel,time:number,playerId:1|2=1){
 for(let row=0;row<30;row++)for(let column=0;column<40;column++)model.brush(brush((column+.5)/40,(row+.5)/30,time,playerId))
 const initial=model.update(time)
 for(const spot of initial.spots)for(let i=0;i<3;i++){time+=200;model.brush(brush(spot.x+(i%2?.025:-.025),spot.y,time,playerId))}
 return {state:model.update(time),time}
}

describe('successive soapy windows',()=>{
 it('clears successive windows, celebrates once, keeps the clock running and sums points',()=>{
  const model=new WindowWipeModel({countdownMs:0,playerCount:1});model.start(0)
  const first=cleanWindow(model,100)
  expect(first.state.windows).toBe(1);expect(first.state.progress).toBe(100)
  expect(first.state.scores.map(s=>s.score)).toEqual([180])
  expect(first.state.effects.filter(e=>e.kind==='window')).toHaveLength(1)
  expect(first.state.phase).toBe('playing')
  const next=model.update(first.time+1200)
  expect(next.progress).toBe(0);expect(next.celebrating).toBe(false)
  expect(next.spots.map(s=>[s.x,s.y])).not.toEqual(first.state.spots.map(s=>[s.x,s.y]))
  const second=cleanWindow(model,first.time+1300)
  expect(second.state.windows).toBe(2);expect(second.state.scores[0].score).toBe(360)
  expect(model.update(60000).phase).toBe('results')
 })
 it('requires fresh rubbing movement for ink, not a stationary or duplicated sample',()=>{
  const model=new WindowWipeModel({countdownMs:0});const spot=model.start(0).spots[0]
  expect(model.brush(brush(spot.x,spot.y,100)).spots[0].remaining).toBe(2)
  model.brush(brush(spot.x+.03,spot.y,100))
  expect(model.brush(brush(spot.x,spot.y,1000)).spots[0].remaining).toBe(2)
  expect(model.brush(brush(spot.x+.03,spot.y,1200)).spots[0].remaining).toBe(1)
  const popped=model.brush(brush(spot.x-.03,spot.y,1400))
  expect(popped.spots[0].remaining).toBe(0)
  expect(popped.effects.some(e=>e.kind==='pop')).toBe(true)
 })
 it('never fills the space between separate arms or across missing observations',()=>{
  const model=new WindowWipeModel({countdownMs:0,aspectRatio:1});model.start(0)
  model.brush(brush(.1,.5,100));model.brush(brush(.9,.5,100))
  const disconnected=model.brush(brush(.9,.6,2000))
  expect(disconnected.cleaned).not.toContain(15*40+20)
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
  expect(model.update(31100).celebrating).toBe(false)
  expect(model.update(31100).progress).toBe(0)
 })
 it('keeps brush circles consistent with narrow camera lanes',()=>{
  const model=new WindowWipeModel({countdownMs:0,aspectRatio:.25});model.start(0)
  const state=model.brush(brush(.5,.5,10))
  expect(state.cleaned).toContain(14*40+19)
  expect(state.cleaned).not.toContain(17*40+19)
 })
 it('starts replay with clean scores, fresh foam and all spots restored',()=>{
  const model=new WindowWipeModel({countdownMs:0});model.start(0);cleanWindow(model,100);model.update(60000)
  const replay=model.start(61000)
  expect(replay.scores[0].score).toBe(0);expect(replay.windows).toBe(0)
  expect(replay.cleaned).toEqual([]);expect(replay.effects).toEqual([])
  expect(replay.spots.every(s=>s.remaining===3)).toBe(true)
 })
})

it('retains bounded smooth paint discs only when they reveal new soap, and resets them per pane',()=>{
 const model=new WindowWipeModel({countdownMs:0});model.start(0)
 const first=model.brush(brush(.5,.5,10))
 expect(first.dabs).toHaveLength(1)
 expect(first.dabs[0]).toMatchObject({x:.5,y:.5,radiusX:.135/(16/9),radiusY:.135})
 const repeated=model.brush(brush(.5,.5,20));expect(repeated.dabs).toHaveLength(1)
 // Snapshots cannot mutate the paint history retained by the game.
 repeated.dabs[0].x=.9;expect(model.update(30).dabs[0].x).toBe(.5)
 const complete=cleanWindow(model,100)
 expect(complete.state.dabs.length).toBeLessThanOrEqual(1200)
 const next=model.update(complete.time+1200)
 expect(next.dabs).toEqual([])
 expect(model.brush(brush(.5,.5,complete.time+1190)).dabs).toEqual([])
})

it('cleans one full pane as a team and splits its completion bonus once',()=>{
 const model=new WindowWipeModel({countdownMs:0,playerCount:2})
 const spots=model.start(0).spots
 const clean=(x:number,y:number,t:number)=>model.brush(brush(x*2-(x>=.5?1:0),y,t,x>=.5?2:1))
 for(let row=0;row<30;row++)for(let col=0;col<40;col++)clean((col+.5)/40,(row+.5)/30,100)
 let time=100
 for(const spot of spots)for(let i=0;i<3;i++)clean(spot.x+(i%2?.025:-.025),spot.y,time+=200)
 const s=model.update(time)
 expect(s.windows).toBe(1);expect(s.scores.every(p=>p.score>0)).toBe(true)
 expect(s.scores.reduce((sum,p)=>sum+p.score,0)).toBe(180)
 expect(model.update(time+801).progress).toBe(0)
})
