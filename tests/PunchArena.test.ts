import { describe, expect, it } from 'vitest'
import { PunchArenaModel } from '../src/minigames/punch-arena/PunchArenaModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../src/input/PlayerZoneMapper'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'
const input = (timestamp = 200, playerId: PlayerId = 1, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId, kind: 'HAND_SWIPE', x: .5, y: .5, confidence: 1, timestamp, swipe: { fromX: .5, fromY: .8, durationMs: 100 }, ...extra })
function game(playerCount: PlayerCount = 1) {
  const model = new PunchArenaModel({playerCount, countdownMs: 0, random: () => .5}); model.start(0); return model
}
describe('Punch Arena generic swipe model', () => {
  it.each([1,2,3,4] as const)('scores a matching punch once with %i isolated players', count => {
    const model = game(count)
    const state = model.punch(input(200, count))
    expect(state.scores.map(s => s.score)).toEqual([...Array(count-1).fill(0),10])
    expect(state.targets).toHaveLength(count-1)
    expect(model.punch(input(200, count)).scores).toEqual(state.scores)
    expect(model.punch(input(201, count)).scores).toEqual(state.scores)
  })
  it.each([
    [0, .8, .5], [.3, .2, .5], [.5, .5, .8], [.9, .5, .2],
  ])('matches all four arrows for random %s', (roll, fromX, fromY) => {
    let n=0
    const model=new PunchArenaModel({countdownMs:0,random:()=>n++ % 3 === 0 ? roll : .5}); model.start(0)
    expect(model.punch(input(200,1,{swipe:{fromX,fromY,durationMs:100}})).scores[0].score).toBe(10)
  })
  it('penalizes the wrong direction once without affecting another player', () => {
    const model=game(2)
    const wrong=input(200,1,{swipe:{fromX:.1,fromY:.5,durationMs:100}})
    expect(model.punch(wrong).scores.map(s=>s.score)).toEqual([-5,0])
    expect(model.punch({...wrong,timestamp:201}).scores[0].score).toBe(-5)
  })
  it('requires the endpoint to land on the pad and does not extend segments',()=>{
    expect(game().punch(input(200,1,{y:.1})).scores[0].score).toBe(0)
    expect(game().punch(input(200,1,{x:.7})).scores[0].score).toBe(0)
  })
  it.each([
    {kind:'MOTION_HIT'}, {kind:'HAND_POSITION'}, {playerId:4}, {confidence:.59}, {confidence:NaN}, {confidence:1.1},
    {x:NaN}, {x:Infinity}, {x:-.1}, {y:1.1}, {timestamp:NaN}, {swipe:undefined},
    {swipe:{fromX:NaN,fromY:.8,durationMs:100}}, {swipe:{fromX:.5,fromY:1.1,durationMs:100}},
    {swipe:{fromX:.5,fromY:.8,durationMs:0}}, {swipe:{fromX:.5,fromY:.8,durationMs:251}},
    {swipe:{fromX:.5,fromY:.8,durationMs:NaN}}, {swipe:{fromX:.5,fromY:.55,durationMs:100}},
    {swipe:{fromX:.5,fromY:.6,durationMs:200}},
  ] as Partial<MotionInputEvent>[])('rejects invalid or insufficient velocity input %j', extra => {
    expect(game().punch(input(200,1,extra)).scores[0].score).toBe(0)
  })
  it('accepts ordinary delivery latency and rejects stale and out-of-order events',()=>{
    const delayed=game();delayed.update(250)
    expect(delayed.punch(input()).scores[0].score).toBe(10)
    const model=game();model.update(390)
    expect(model.punch(input()).scores[0].score).toBe(0)
    model.punch(input(300,1,{x:0}));expect(model.punch(input(290)).scores[0].score).toBe(0)
  })
  it('expires missed pads, spawns deterministically and rejects strokes starting before spawn',()=>{
    const slow=game(),fast=game()
    for(let t=0;t<=5000;t+=10) fast.update(t)
    expect(slow.update(5000)).toEqual(fast.update(5000))
    expect(game().update(1000).targets).toHaveLength(0)
    const model=game();expect(model.punch(input(1250)).scores[0].score).toBe(0)
    expect(model.punch(input(1350)).scores[0].score).toBe(10)
  })
  it('ignores countdown and strokes crossing countdown',()=>{
    const model=new PunchArenaModel({random:()=>.5});model.start(0)
    expect(model.punch(input()).scores[0].score).toBe(0)
    expect(model.punch(input(3050)).scores[0].score).toBe(0)
    expect(model.punch(input(3200)).scores[0].score).toBe(10)
  })
  it('freezes pads and time during pause and rejects bridging strokes on resume',()=>{
    const model=game();const state=model.pause(200)
    expect(model.update(10000)).toEqual(state)
    expect(model.punch(input(500))).toEqual(state)
    model.resume(10000)
    expect(model.punch(input(10050)).scores[0].score).toBe(0)
    expect(model.punch(input(10200)).scores[0].score).toBe(10)
  })
  it('ends exactly at the boundary, preserves results and resets replay',()=>{
    const model=new PunchArenaModel({countdownMs:0,roundDurationMs:500,random:()=>.5});model.start(0)
    const result=model.punch(input(500))
    expect(result).toMatchObject({phase:'results',targets:[],trails:[],scores:[{score:0}]})
    expect(model.update(5000)).toEqual(result)
    model.start(6000)
    expect(model.punch(input(6050)).scores[0].score).toBe(0)
    expect(model.punch(input(6200)).scores[0].score).toBe(10)
  })
  it('returns detached snapshots and expires feedback',()=>{
    const model=game(2),state=model.punch(input())
    state.targets[0].x=0;state.scores[0].score=900;state.trails[0].x=0
    expect(model.update(200)).toMatchObject({targets:[{x:.5}],scores:[{score:10},{score:0}],trails:[{x:.5}]})
    expect(model.update(381).trails).toHaveLength(0)
  })
  it('records implementation without exposing the deferred game publicly',()=>{
    expect(getGameBySlug('punch-arena')).toMatchObject({available:true,input:'MIXED',players:[1,2,3,4]})
    expect(isGameVisible('punch-arena')).toBe(true)
  })
})
