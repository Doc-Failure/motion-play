import { describe, expect, it } from 'vitest'
import { FruitSlashModel } from '../src/minigames/fruit-slash/FruitSlashModel'
import { HandSwipeTracker, isValidSwipe } from '../src/input/HandSwipe'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../src/input/PlayerZoneMapper'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'

const input = (timestamp = 1200, playerId: PlayerId = 1, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId, kind: 'HAND_SWIPE', x: .9, y: .3, confidence: 1, timestamp, swipe: { fromX: .1, fromY: .3, durationMs: 100 }, ...extra })
function game(playerCount: PlayerCount = 1, random = () => .5) {
  const model = new FruitSlashModel({ playerCount, countdownMs: 0, random }); model.start(0); return model
}

describe('Fruit Slash generic swipe model', () => {
  it.each([1,2,3,4] as const)('slices a crossing segment with endpoints outside fruit, isolating %i players', count => {
    const model = game(count)
    const state = model.slash(input(1200, count))
    expect(state.scores.map(s => s.score)).toEqual([...Array(count-1).fill(0),10])
    expect(state.fruit.filter(f => f.spawnedAt === 0)).toHaveLength(count-1)
    expect(model.slash(input(1200, count)).scores).toEqual(state.scores)
    expect(model.slash(input(1201, count)).scores).toEqual(state.scores)
  })
  it('penalizes a bomb once and allows negative independent scores', () => {
    const model = game(2, () => 0)
    expect(model.slash(input()).scores.map(s => s.score)).toEqual([-15,0])
    expect(model.slash(input(1201)).scores.map(s => s.score)).toEqual([-15,0])
  })
  it('slices every intersected fruit and bomb in one segment', () => {
    const values = [.5,.5,0,.5,.8,.5]; let index = 0
    const model = game(1, () => values[index++ % values.length])
    const state = model.slash(input(1300,1,{x:.5,y:.95,swipe:{fromX:.5,fromY:.1,durationMs:100}}))
    expect(state.scores[0].score).toBe(-5)
    expect(state.fruit).toHaveLength(0)
  })
  it('requires a collision instead of proximity to the extended line', () => {
    const model = game()
    expect(model.slash(input(1200,1,{x:.3})).scores[0].score).toBe(0)
  })
  it.each([
    {kind:'MOTION_HIT'}, {kind:'HAND_POSITION'}, {playerId:4}, {confidence:.59}, {confidence:NaN}, {confidence:1.1},
    {x:NaN}, {x:Infinity}, {x:-.1}, {y:1.1}, {timestamp:NaN}, {swipe:undefined},
    {swipe:{fromX:NaN,fromY:.3,durationMs:100}}, {swipe:{fromX:-.1,fromY:.3,durationMs:100}},
    {swipe:{fromX:.1,fromY:.3,durationMs:0}}, {swipe:{fromX:.1,fromY:.3,durationMs:251}},
    {swipe:{fromX:.1,fromY:.3,durationMs:NaN}}, {swipe:{fromX:.85,fromY:.3,durationMs:100}},
    {x:.55,swipe:{fromX:.45,fromY:.3,durationMs:200}},
  ] as Partial<MotionInputEvent>[])('rejects wrong, uncertain or malformed input %j', extra => {
    const model=game(); expect(model.slash(input(1200,1,extra)).scores[0].score).toBe(0)
  })
  it('accepts delayed captures, rejects stale or reordered packets', () => {
    const model=game(); model.update(1250)
    expect(model.slash(input(990)).scores[0].score).toBe(0)
    expect(model.slash(input(1200)).scores[0].score).toBe(10)
    model.slash(input(1300,1,{y:0})); expect(model.slash(input(1290)).scores[0].score).toBe(10)
  })
  it('ignores countdown and segments bridging into play', () => {
    const model=new FruitSlashModel({random:()=>.5});model.start(0)
    expect(model.slash(input(1200)).scores[0].score).toBe(0)
    expect(model.slash(input(3100,1,{y:.97,swipe:{fromX:.1,fromY:.97,durationMs:200}})).scores[0].score).toBe(0)
    expect(model.slash(input(4200)).scores[0].score).toBe(10)
  })
  it('uses the same spawn timeline under sparse and frequent rendering', () => {
    const fast=game(),slow=game()
    for(let t=0;t<=1200;t+=10) fast.update(t)
    expect(slow.update(1200)).toEqual(fast.update(1200))
    expect(slow.slash(input())).toEqual(fast.slash(input()))
    for(let t=1200;t<=6000;t+=10) fast.update(t)
    expect(slow.update(6000)).toEqual(fast.update(6000))
    expect(slow.update(6000).fruit.every(f=>f.spawnedAt>3600)).toBe(true)
  })
  it('freezes the clock and prevents segments crossing a pause or replay', () => {
    const model=game(); const paused=model.pause(1100)
    expect(model.update(10000)).toEqual(paused)
    expect(model.slash(input(1200))).toEqual(paused)
    model.resume(10100)
    expect(model.slash(input(10110,1,{y:.305,swipe:{fromX:.1,fromY:.305,durationMs:100}})).scores[0].score).toBe(0)
    expect(model.slash(input(10200)).scores[0].score).toBe(10)
  })
  it('ends at the boundary, freezes results and resets on replay', () => {
    const model=new FruitSlashModel({countdownMs:0,roundDurationMs:1200,random:()=>.5});model.start(0)
    const result=model.slash(input())
    expect(result).toMatchObject({phase:'results',fruit:[],trails:[],scores:[{playerId:1,score:0}]})
    expect(model.update(2000)).toEqual(result)
    expect(model.slash(input(2100))).toEqual(result)
    expect(model.pause(2200)).toEqual(result)
    expect(model.start(3000)).toMatchObject({phase:'playing',trails:[],scores:[{playerId:1,score:0}]})
    expect(model.slash(input(3100,1,{y:.97,swipe:{fromX:.1,fromY:.97,durationMs:200}})).scores[0].score).toBe(0)
  })
  it('expires trails and returns detached snapshots', () => {
    const model=game();const state=model.slash(input())
    state.fruit[0].x=0;state.scores[0].score=900;state.trails[0].x=0
    expect(model.update(1200).scores[0].score).toBe(10)
    expect(model.update(1200).trails[0].x).toBe(.9)
    expect(model.update(1381).trails).toHaveLength(0)
  })
  it('records simulation implementation while preserving refinement gating', () => {
    expect(getGameBySlug('fruit-slash')).toMatchObject({available:true,input:'HAND_SWIPE',players:[1,2,3,4]})
    expect(isGameVisible('fruit-slash')).toBe(false)
  })
})

describe('hand swipe input contract', () => {
  const sample=(time:number,x:number,playerId:PlayerId=1,extra:Partial<MotionInputEvent>={}):MotionInputEvent=>({playerId,kind:'HAND_POSITION',timestamp:time,x,y:.3,confidence:1,...extra})
  it('derives speed from endpoints and accepts the exact speed threshold', () => {
    expect(isValidSwipe(input(100,1,{x:.5,swipe:{fromX:.3,fromY:.3,durationMs:250}}))).toBe(true)
  })
  it('requires successive fresh hand samples and isolates players', () => {
    const tracker=new HandSwipeTracker()
    expect(tracker.sample(sample(0,.1))).toBeNull()
    expect(tracker.sample(sample(100,.9,2))).toBeNull()
    expect(tracker.sample(sample(100,.9))).toMatchObject({kind:'HAND_SWIPE',swipe:{fromX:.1,fromY:.3,durationMs:100}})
    expect(tracker.sample(sample(100,.1))).toBeNull()
    expect(tracker.sample(sample(99,.1))).toBeNull()
    expect(tracker.sample(sample(400,.1))).toBeNull()
    tracker.reset();expect(tracker.sample(sample(450,.9))).toBeNull()
  })
  it('breaks continuity on low confidence, out-of-range positions and explicit release', () => {
    const tracker=new HandSwipeTracker()
    tracker.sample(sample(0,.1));tracker.sample(sample(20,.3,1,{confidence:.2}))
    expect(tracker.sample(sample(100,.9))).toBeNull()
    tracker.sample(sample(120,NaN));expect(tracker.sample(sample(200,.1))).toBeNull()
    tracker.reset(1);expect(tracker.sample(sample(210,.9))).toBeNull()
  })
  it('never manufactures a hand swipe from motion-mask hits', () => {
    const tracker=new HandSwipeTracker()
    expect(tracker.sample(sample(0,.1,1,{kind:'MOTION_HIT'}))).toBeNull()
    expect(tracker.sample(sample(100,.9,1,{kind:'MOTION_HIT'}))).toBeNull()
  })
  it('accumulates small fast samples so high-rate pointer input can slice', () => {
    const tracker=new HandSwipeTracker()
    tracker.sample(sample(0,.1))
    expect(tracker.sample(sample(20,.13))).toBeNull()
    expect(tracker.sample(sample(40,.16))).toBeNull()
    expect(tracker.sample(sample(60,.19))).toMatchObject({swipe:{fromX:.1,durationMs:60}})
  })
})
