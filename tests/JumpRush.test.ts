import { describe, expect, it } from 'vitest'
import { JumpRushModel, jumpFreshMs } from '../src/minigames/jump-rush/JumpRushModel'
import { MotionProcessor, type MotionInputEvent } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'
const input = (timestamp: number, y = .7, playerId: 1 | 2 | 3 | 4 = 1, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId, kind: 'BODY_MOVE', x: .5, y, confidence: 1, timestamp, ...extra })
const game = (count: 1 | 2 | 3 | 4 = 1, roundDurationMs = 60000) => {
  const model = new JumpRushModel({ playerCount: count, countdownMs: 0, roundDurationMs }); model.start(0); return model
}
function hop(model: JumpRushModel, impact = 1800, id: 1 | 2 | 3 | 4 = 1) {
  model.moveBody(input(impact - 300, .7, id)); model.moveBody(input(impact - 100, .45, id))
}
describe('Jump Rush normalized motion mechanic', () => {
  it.each([1,2,3,4] as const)('gives %i isolated players one outcome per hurdle', count => {
    const model = game(count); hop(model)
    for (let id = 2; id <= count; id++) model.moveBody(input(1700, .7, id as 2 | 3 | 4))
    const state = model.update(1800)
    expect(state.scores.map(s => s.score)).toEqual([10, ...Array(count - 1).fill(-5)])
    expect(state.lanes.map(l => l.hits)).toEqual([0, ...Array(count - 1).fill(1)])
    expect(model.update(1900).lanes[0].cleared).toBe(1)
  })
  it('requires fresh upward travel; horizontal, downward and held input cannot jump', () => {
    const model = game()
    model.moveBody(input(1500)); model.moveBody(input(1600, .7, 1, { x: .9 })); model.moveBody(input(1700, .9))
    expect(model.update(1800).lanes[0]).toMatchObject({ hits: 1, cleared: 0 })
  })
  it('accumulates gradual fresh upward travel', () => {
    const model = game()
    for (const [t,y] of [[1300,.7],[1450,.64],[1600,.58],[1750,.51]]) model.moveBody(input(t,y))
    expect(model.update(1800).scores[0].score).toBe(10)
  })
  it('expires an early hop and requires lowering before another rise', () => {
    const model = game()
    model.moveBody(input(800)); model.moveBody(input(900,.45))
    for (let t=1100;t<=1700;t+=200) model.moveBody(input(t,.45))
    expect(model.update(1800).lanes[0].hits).toBe(1)
    hop(model,4200)
    expect(model.update(4200).scores[0].score).toBe(5)
  })
  it('applies exactly one penalty per obstacle', () => {
    const model = game(); hop(model); model.update(1800)
    model.moveBody(input(4100)); expect(model.update(4200).scores[0].score).toBe(5)
    expect(model.update(4201).scores[0].score).toBe(5)
  })
  it.each([jumpFreshMs + 1, 1000])('awards no clear with %ims of missing input', gap => {
    const model = game(); model.moveBody(input(1100)); model.moveBody(input(1300,.45))
    expect(model.update(1300 + gap).lanes[0].position).toBeNull()
    expect(model.update(2500).scores[0].score).toBe(0)
  })
  it('accepts exact freshness boundary and rejects an input arriving at impact as too late to hop', () => {
    const model = game(); model.moveBody(input(1200)); model.moveBody(input(1450,.45))
    expect(model.update(1800).scores[0].score).toBe(10)
    const late = game(); late.moveBody(input(1600)); late.moveBody(input(1800,.45))
    expect(late.update(1800).lanes[0].hits).toBe(1)
  })
  it.each([{confidence:.59},{confidence:NaN},{confidence:1.1},{x:-.1},{x:Infinity},{y:1.1},{y:NaN}])('invalidates tracking on malformed observation %j', extra => {
    const model = game(); hop(model); model.moveBody(input(1750,.45,1,extra))
    expect(model.update(1800).scores[0].score).toBe(0)
    expect(model.update(1800).lanes[0].hits).toBe(0)
  })
  it('rejects duplicate, stale, reordered, wrong kind and unknown player packets', () => {
    const model = game(); model.moveBody(input(1500))
    for (const e of [input(1500,.4),input(1490,.4),input(NaN,.4),input(1600,.4,2),input(1600,.4,1,{kind:'MOTION_HIT'})]) model.moveBody(e)
    expect(model.update(1800).lanes[0].cleared).toBe(0)
    model.moveBody(input(1700,.4))
    expect(model.update(1800).scores[0].score).toBe(-5)
  })
  it('does not bridge gaps or explicit releases into a hop', () => {
    const model = game(); model.moveBody(input(1000)); model.moveBody(input(1500,.4))
    expect(model.update(1500).lanes[0].airborne).toBe(false)
    model.releaseBody(1); model.moveBody(input(1700,.1))
    expect(model.update(1800).lanes[0].hits).toBe(1)
  })
  it('freezes timing and drops pre-pause movement, then resumes the same obstacle', () => {
    const model = game(); hop(model); model.pause(1750); model.moveBody(input(1800,.2))
    expect(model.update(10000).phase).toBe('paused')
    model.resume(10000); model.moveBody(input(9900,.4)); model.moveBody(input(10020,.7))
    expect(model.update(10050).lanes[0]).toMatchObject({cleared:0,hits:1})
  })
  it('matches fine and skipped rendering without awarding untracked waves', () => {
    const fast=game(), slow=game(); hop(fast); hop(slow)
    for (let t=1700;t<=7000;t+=10) fast.update(t)
    expect(slow.update(7000)).toEqual(fast.update(7000))
    expect(slow.update(7000).scores[0].score).toBe(10)
  })
  it('ends exactly at the round boundary, preserves results, and resets replay', () => {
    const model=game(1,1800); hop(model)
    const result=model.update(9000)
    expect(result.phase).toBe('results'); expect(result.scores[0].score).toBe(0)
    expect(model.moveBody(input(10000,.1))).toEqual(result)
    expect(model.releaseBody(1)).toEqual(result); expect(model.update(20000)).toEqual(result)
    expect(model.start(30000).lanes[0]).toMatchObject({cleared:0,hits:0,position:null})
  })
  it('ignores countdown input and supports countdown pause', () => {
    const model = new JumpRushModel(); model.start(0)
    model.moveBody(input(1000)); expect(model.pause(2000).countdownRemainingMs).toBe(1000)
    model.resume(12000); expect(model.update(13000).phase).toBe('playing')
    expect(model.moveBody(input(13100,.4)).lanes[0].airborne).toBe(false)
  })
  it.each([1,2,3,4] as const)('isolates rising mirrored synthetic motion in lane %i', count => {
    const model=game(count), zones=defaultCameraZones(count), zone=zones[count-1]
    const processor=new MotionProcessor({smoothing:0,minimumZoneActivity:.001})
    const width=640,height=180,data=new Uint8ClampedArray(width*height*4)
    processor.process({width,height,data},zones,0)
    const cx=Math.floor((1-zone.x-zone.width*.5)*width)
    for (const [time,localY] of [[1500,.7],[1700,.3]]) {
      const cy=Math.floor(localY*height)
      for(let y=cy-24;y<cy+24;y++) for(let x=cx-Math.floor(zone.width*width*.12);x<cx+Math.floor(zone.width*width*.12);x++) data.fill(255,(y*width+x)*4,(y*width+x+1)*4)
      const result=processor.process({width,height,data},zones,time)
      expect(result.positions).toHaveLength(1)
      const centroid=result.zones.find(z=>z.playerId===count)!.centroid!
      model.moveBody({...result.positions![0],...centroid,kind:'BODY_MOVE'})
    }
    expect(model.update(1800).scores.map(s=>s.score)).toEqual([...Array(count-1).fill(0),10])
  })
  it('exposes the new game in the public catalog', () => {
    expect(getGameBySlug('jump-rush')).toMatchObject({available:true,input:'BODY_MOVE',players:[1,2,3,4]})
    expect(isGameVisible('jump-rush')).toBe(true)
  })

})

it('animates a continuous hop arc through brief tracking loss instead of snapping down',()=>{
 const model=game();model.moveBody(input(100,.7));model.moveBody(input(200,.45))
 expect(model.update(200).lanes[0].hopHeight).toBe(0)
 expect(model.update(362.5).lanes[0].hopHeight).toBeCloseTo(.75)
 model.releaseBody(1)
 expect(model.update(525).lanes[0].hopHeight).toBe(1)
 expect(model.update(687.5).lanes[0].hopHeight).toBeCloseTo(.75)
 expect(model.update(850).lanes[0].hopHeight).toBe(0)
})
