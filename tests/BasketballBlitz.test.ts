import { describe, expect, it } from 'vitest'
import { BasketballBlitzModel } from '../src/minigames/basketball-blitz/BasketballBlitzModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../src/input/PlayerZoneMapper'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'
const input = (timestamp = 200, playerId: PlayerId = 1, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId, kind: 'HAND_SWIPE', x: .5, y: .5, confidence: 1, timestamp, swipe: { fromX: .5, fromY: .8, durationMs: 100 }, ...extra })
function game(playerCount: PlayerCount = 1) {
  const model = new BasketballBlitzModel({playerCount, countdownMs: 0}); model.start(0); return model
}
describe('Basketball Blitz generic swipe model', () => {
  it.each([1,2,3,4] as const)('resolves accurate shots once with %i isolated players', count => {
    const model = game(count)
    const launch = model.shoot(input(200, count))
    expect(launch.scores.every(s=>s.score===0)).toBe(true)
    expect(launch.shots).toHaveLength(1)
    expect(model.shoot(input(200,count)).stats[count-1].attempts).toBe(1)
    expect(model.shoot(input(400,count)).stats[count-1].attempts).toBe(1)
    expect(model.update(849).scores[count-1].score).toBe(0)
    const state = model.update(850)
    expect(state.scores.map(s => s.score)).toEqual([...Array(count-1).fill(0),2])
    expect(state.stats[count-1]).toMatchObject({attempts:1,baskets:1})
    expect(model.update(900).scores).toEqual(state.scores)
    expect(model.shoot(input(1000,count)).stats[count-1].attempts).toBe(2)
  })
  it('projects aim from direction, recording misses without points',()=>{
    const model=game()
    expect(model.shoot(input(200,1,{x:.7})).shots[0]).toMatchObject({made:false})
    expect(model.update(850)).toMatchObject({scores:[{score:0}],stats:[{attempts:1,baskets:0}]})
    const angled=game()
    expect(angled.shoot(input(200,1,{x:.45,swipe:{fromX:.4,fromY:.8,durationMs:100}})).shots[0].made).toBe(true)
  })
  it.each([
    {kind:'MOTION_HIT'}, {kind:'HAND_POSITION'}, {playerId:4}, {confidence:.59}, {confidence:NaN}, {confidence:1.1},
    {x:NaN}, {x:Infinity}, {x:-.1}, {y:1.1}, {timestamp:NaN}, {swipe:undefined},
    {swipe:{fromX:NaN,fromY:.8,durationMs:100}}, {swipe:{fromX:.5,fromY:1.1,durationMs:100}},
    {swipe:{fromX:.5,fromY:.8,durationMs:0}}, {swipe:{fromX:.5,fromY:.8,durationMs:251}},
    {swipe:{fromX:.5,fromY:.8,durationMs:NaN}}, {y:.75}, {y:.7,swipe:{fromX:.5,fromY:.8,durationMs:200}},
    {y:.95}, {x:.9,y:.7}, {swipe:{fromX:.1,fromY:.8,durationMs:100}},
  ] as Partial<MotionInputEvent>[])('rejects malformed, weak or non-shooting swipes %j', extra => {
    expect(game().shoot(input(200,1,extra)).stats[0].attempts).toBe(0)
  })
  it('rejects stale events and duplicate strokes after flight',()=>{
    const model=game();model.update(400)
    expect(model.shoot(input()).stats[0].attempts).toBe(0)
    model.shoot(input(450));model.update(1100)
    expect(model.shoot(input(300)).stats[0].attempts).toBe(1)
  })
  it('ignores countdown and strokes crossing countdown',()=>{
    const model=new BasketballBlitzModel();model.start(0)
    expect(model.shoot(input()).stats[0].attempts).toBe(0)
    expect(model.shoot(input(3050)).stats[0].attempts).toBe(0)
    expect(model.shoot(input(3200)).stats[0].attempts).toBe(1)
  })
  it('freezes flight and clock during pause and rejects bridging strokes',()=>{
    const model=game(2);model.shoot(input());const paused=model.pause(400)
    expect(model.update(10000)).toEqual(paused)
    expect(model.shoot(input(500,2))).toEqual(paused)
    model.resume(10000)
    expect(model.shoot(input(10050,2)).stats[1].attempts).toBe(0)
    expect(model.update(10450).scores[0].score).toBe(2)
    expect(model.shoot(input(10500,2)).stats[1].attempts).toBe(1)
  })
  it('resolves on time with sparse frames and never scores at or after the round boundary',()=>{
    const make=()=>{const m=new BasketballBlitzModel({countdownMs:0,roundDurationMs:1000});m.start(0);return m}
    const slow=make(),fast=make()
    slow.shoot(input());fast.shoot(input())
    for(let t=200;t<=2000;t+=10)fast.update(t)
    expect(slow.update(2000)).toEqual(fast.update(2000))
    expect(slow.update(2000).scores[0].score).toBe(2)
    const edge=make();edge.shoot(input(350))
    expect(edge.update(1000)).toMatchObject({phase:'results',scores:[{score:0}],shots:[]})
    expect(edge.shoot(input(1100)).stats[0].attempts).toBe(1)
    edge.start(2000)
    expect(edge.shoot(input(2050)).stats[0].attempts).toBe(0)
    expect(edge.shoot(input(2200)).stats[0].attempts).toBe(1)
  })
  it('returns detached snapshots',()=>{
    const model=game(),state=model.shoot(input())
    state.shots[0].made=false;state.stats[0].attempts=99;state.scores[0].score=900
    expect(model.update(850)).toMatchObject({scores:[{score:2}],stats:[{attempts:1,baskets:1}]})
  })
  it('records implementation while keeping it out of public play',()=>{
    expect(getGameBySlug('basketball-blitz')).toMatchObject({available:true,input:'HAND_SWIPE',players:[1,2,3,4]})
    expect(isGameVisible('basketball-blitz')).toBe(false)
  })
})
