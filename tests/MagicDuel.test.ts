import { describe, expect, it } from 'vitest'
import { MagicDuelModel, magicPatterns } from '../src/minigames/magic-duel/MagicDuelModel'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../src/input/PlayerZoneMapper'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'
const input = (timestamp = 200, playerId: PlayerId = 1, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId, kind: 'HAND_SWIPE', x: .5, y: .7, confidence: 1, timestamp, swipe: { fromX: .25, fromY: .3, durationMs: 100 }, ...extra })
function game(playerCount: PlayerCount = 1) { const m = new MagicDuelModel({ playerCount, countdownMs: 0 }); m.start(0); return m }
function cast(m: MagicDuelModel, pattern = 0, time = 200, playerId: PlayerId = 1) {
  const points = magicPatterns[pattern].points
  return points.slice(1).map((p, i) => m.trace(input(time + i*200, playerId, { ...p, swipe: {fromX:points[i].x,fromY:points[i].y,durationMs:100} }))).at(-1)!
}
describe('Magic Duel ordered spatial patterns', () => {
  it.each([1,2,3,4] as const)('casts once with %i isolated players', count => {
    const m=game(count), s=cast(m,0,200,count)
    expect(s.scores.map(s=>s.score)).toEqual([...Array(count-1).fill(0),20])
    expect(cast(m,0,600,count).scores).toEqual(s.scores)
    expect(m.trace(input(400,count)).scores).toEqual(s.scores)
  })
  it.each([0,1,2])('recognizes pattern %i and cycles predictably', pattern=>{
    const m=game();m.update(pattern*5000)
    expect(cast(m,pattern,pattern*5000+200).scores[0].score).toBe(20)
    expect(m.update(15000).pattern).toBe(0)
  })
  it('accumulates short forward segments on each edge',()=>{
    const m=game()
    expect(m.trace(input(100,1,{x:.375,y:.5})).progress[0].step).toBe(0)
    expect(m.trace(input(200,1,{swipe:{fromX:.375,fromY:.5,durationMs:100}})).progress[0].step).toBe(1)
    expect(m.trace(input(400,1,{x:.75,y:.3,swipe:{fromX:.5,fromY:.7,durationMs:100}})).scores[0].score).toBe(20)
  })
  it.each([
    {x:.75,y:.3}, // skip a corner
    {x:.5,y:.3}, // leave the drawn edge
    {x:.1,y:.1}, // backwards
    {swipe:{fromX:.1,fromY:.3,durationMs:100}}, // disconnected
  ])('resets a spatial mismatch without penalty %j', extra=>{
    const m=game();expect(m.trace(input(200,1,extra)).progress[0].step).toBe(0)
    expect(cast(m,0,400).scores[0].score).toBe(20)
  })
  it('resets progress on a wrong second stroke',()=>{
    const m=game();m.trace(input())
    expect(m.trace(input(400)).progress[0]).toMatchObject({step:0,startedAt:null})
    expect(cast(m,0,600).scores[0].score).toBe(20)
  })
  it.each([
    {kind:'MOTION_HIT'}, {kind:'HAND_POSITION'}, {playerId:4}, {confidence:.59}, {confidence:NaN}, {confidence:1.1},
    {x:NaN}, {x:Infinity}, {x:-.1}, {y:1.1}, {timestamp:NaN}, {swipe:undefined},
    {swipe:{fromX:NaN,fromY:.3,durationMs:100}}, {swipe:{fromX:.25,fromY:.3,durationMs:0}},
    {swipe:{fromX:.25,fromY:.3,durationMs:251}}, {swipe:{fromX:.25,fromY:.3,durationMs:NaN}},
    {swipe:{fromX:.49,fromY:.69,durationMs:100}},
  ] as Partial<MotionInputEvent>[])('rejects malformed or insufficient input %j',extra=>{
    expect(game().trace(input(200,1,extra)).progress[0].step).toBe(0)
  })
  it('rejects stale, duplicate and countdown-crossing events',()=>{
    const m=game();m.update(250);expect(m.trace(input()).progress[0].step).toBe(0)
    m.trace(input(300));expect(m.trace(input(300)).progress[0].step).toBe(1)
    expect(m.trace(input(290)).progress[0].step).toBe(1)
    const countdown=new MagicDuelModel();countdown.start(0)
    expect(countdown.trace(input()).progress[0].step).toBe(0)
    expect(countdown.trace(input(3050)).progress[0].step).toBe(0)
    expect(cast(countdown,0,3200).scores[0].score).toBe(20)
  })
  it('expires traces and rejects strokes crossing pattern changes',()=>{
    const m=game();m.trace(input());expect(m.update(3100).progress[0].step).toBe(0)
    expect(m.trace(input(5050,1,{x:.3,y:.7,swipe:{fromX:.3,fromY:.25,durationMs:100}})).progress[0].step).toBe(0)
    expect(cast(m,1,5200).scores[0].score).toBe(20)
  })
  it('agrees across sparse/frequent updates and freezes during pause',()=>{
    const a=game(),b=game();for(let t=0;t<=12300;t+=10)b.update(t)
    expect(a.update(12300)).toEqual(b.update(12300))
    const m=game();m.trace(input());const state=m.pause(300)
    expect(state.progress[0].step).toBe(0)
    expect(m.update(10000)).toEqual(state);expect(m.trace(input(500))).toEqual(state)
    m.resume(10000);expect(m.trace(input(10050)).progress[0].step).toBe(0)
    expect(cast(m,0,10200).scores[0].score).toBe(20)
  })
  it('preserves completed spells across pause and clears replay state',()=>{
    const m=game();cast(m);m.pause(500);m.resume(10000)
    expect(cast(m,0,10200).scores[0].score).toBe(20)
    const result=m.update(100000);expect(result.phase).toBe('results')
    expect(m.update(200000)).toEqual(result)
    expect(m.start(200000).scores[0].score).toBe(0)
    expect(m.trace(input(200050)).progress[0].step).toBe(0)
    expect(cast(m,0,200200).scores[0].score).toBe(20)
  })
  it('rejects scoring at the exact round boundary and returns detached state',()=>{
    const m=new MagicDuelModel({countdownMs:0,roundDurationMs:400});m.start(0)
    const s=m.trace(input());s.progress[0].cursor.x=0;s.scores[0].score=99
    expect(m.update(200).progress[0].cursor.x).toBe(.5)
    expect(cast(m,0,400)).toMatchObject({phase:'results',scores:[{score:0}]})
  })
  it('records implementation while preserving public visibility',()=>{
    expect(getGameBySlug('magic-duel')).toMatchObject({available:true,input:'HAND_SWIPE',players:[1,2,3,4]})
    expect(isGameVisible('magic-duel')).toBe(false)
  })
})
