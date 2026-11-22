import { describe, expect, it } from 'vitest'
import { homeZone, inside, LavaRound } from '../src/minigames/floor-is-lava/LavaRound'
import { lavaFeet, type Feet } from '../src/input/LavaFeet'
import { stickBodies } from '../src/camera/poseTracking'

const at = (x: number, y = .8): Feet => [{ x: x-.012, y }, { x: x+.012, y }]
const group = [at(.13), at(.24), at(.35), at(.46)]

describe('one shared HOME at zero', () => {
  it('lets four players cluster on the same side and scores only once', () => {
    const game = new LavaRound(4, 0, () => 0)
    game.start(0)
    expect(game.update(7900, { time:7900, feet:group }).rescued).toBe(0)
    const flood = game.update(8010, { time:8005, feet:[] })
    expect(flood.home).toBe(4)
    expect(flood.rescued).toBe(1)
    expect(game.update(8800).scores.map(s=>s.score)).toEqual([1,1,1,1])
    expect(game.update(10000).zone).not.toEqual(flood.zone)
  })
  it('requires both feet of every player and a recent frame, including at the exact boundary', () => {
    const zone = homeZone(2,0)
    expect(inside([{x:zone.left,y:.52},{x:zone.right,y:1}],zone)).toBe(true)
    expect(inside([{x:.2,y:.8},{x:zone.right+.001,y:.8}],zone)).toBe(false)
    for (const [time,feet,count] of [[7999,[at(.2)],1], [7499,[at(.2),at(.3)],0], [8000,[at(.2),at(.9)],1]] as const) {
      const game = new LavaRound(2,0,()=>0)
      game.start(0)
      const snap=game.update(8000,{time,feet:[...feet]})
      expect(snap.home).toBe(count);expect(snap.rescued).toBe(0)
    }
  })
  it('rejects late arrivals and an empty observation supersedes an earlier safe pose', () => {
    const game = new LavaRound(1,0,()=>0)
    game.start(0)
    game.update(7800,{time:7800,feet:[at(.2)]})
    game.update(7900,{time:7900,feet:[]})
    expect(game.update(8200,{time:8001,feet:[at(.2)]}).home).toBe(0)
  })
  it('shifts deadlines on pause and settles a deadline even when the flood render was skipped', () => {
    const game = new LavaRound(1,0,()=>0)
    game.start(0)
    game.pause(7000);game.resume(11000)
    game.update(11950,{time:11950,feet:[at(.2)]})
    expect(game.update(14000).rescued).toBe(1)
    expect(game.update(14000).wave).toBe(1)
    expect(game.update(42000).phase).toBe('results')
    expect(game.start(43000).rescued).toBe(0)
  })
  it('uses measured mirrored ankles and omits a person with an obscured leg', () => {
    const p = Array.from({length:33},()=>({x:.8,y:.5,visibility:1}))
    p[27]={x:.85,y:.91,visibility:1};p[28]={x:.75,y:.9,visibility:1}
    const hidden = p.map(v=>({...v}));hidden[27].visibility=0
    const frame = lavaFeet(stickBodies([p,hidden]),1234)
    expect(frame.time).toBe(1234);expect(frame.feet).toHaveLength(1)
    expect(frame.feet[0][0].x).toBeCloseTo(.15);expect(frame.feet[0][1]).toEqual({x:.25,y:.9,visibility:1})
  })
})
