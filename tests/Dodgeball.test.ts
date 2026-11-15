import { describe, expect, it } from 'vitest'
import { DodgeballModel, dodgeReach } from '../src/minigames/dodgeball/DodgeballModel'
import { MotionProcessor } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'
import { getGameBySlug, isGameVisible } from '../src/app/catalog'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
const event = (timestamp: number, x = .1, extra: Partial<MotionInputEvent> = {}): MotionInputEvent => ({ playerId: 1, kind: 'BODY_MOVE', x, y: .5, confidence: 1, timestamp, ...extra })
const make = (playerCount: 1 | 2 | 3 | 4 = 1, roundDurationMs = 60000) => {
  const model = new DodgeballModel({ playerCount, countdownMs: 0, roundDurationMs }); model.start(0); return model
}

describe('Dodgeball normalized movement model', () => {
  it.each([1,2,3,4] as const)('isolates scores and collisions across %i players', count => {
    const model = make(count)
    for (let id = 1; id <= count; id++) model.moveBody(event(1700, id % 2 ? .1 : .5, { playerId: id as 1 | 2 | 3 | 4 }))
    const state = model.update(1800)
    expect(state.scores.map(s => s.score)).toEqual(Array.from({length: count}, (_, i) => i % 2 ? -5 : 10))
    expect(state.lanes.map(l => [l.dodges, l.hits])).toEqual(Array.from({length: count}, (_, i) => i % 2 ? [0,1] : [1,0]))
    expect(model.update(1800).scores).toEqual(state.scores)
  })
  it.each([1,2,3,4] as const)('maps a mirrored synthetic patch into only player %i', count => {
    const model = make(count), zones = defaultCameraZones(count), zone = zones[count - 1]
    const processor = new MotionProcessor({ smoothing: 0, minimumZoneActivity: .001 })
    const width = 320, height = 180, data = new Uint8ClampedArray(width * height * 4)
    processor.process({ width, height, data }, zones, 0)
    const cx = Math.floor((1 - zone.x - zone.width * .15) * width)
    for (let time = 1500; time <= 1700; time += 100) {
      for (let y = 50; y < 130; y++) for (let x = cx - Math.floor(zone.width * width * .12); x < cx + Math.floor(zone.width * width * .12); x++) {
        data.fill(time % 200 ? 255 : 0, (y * width + x) * 4, (y * width + x + 1) * 4)
      }
      const motion = processor.process({ width, height, data }, zones, time)
      expect(motion.positions).toHaveLength(1)
      const sample = motion.positions![0], centroid = motion.zones.find(z => z.playerId === count)!.centroid!
      model.moveBody({ ...sample, ...centroid, kind: 'BODY_MOVE' })
    }
    expect(model.update(1800).scores.map(s => s.score)).toEqual([...Array(count - 1).fill(0), 10])
  })
  it('records implementation availability while preserving public refinement gating', () => {
    expect(getGameBySlug('dodgeball')).toMatchObject({ available: true, input: 'BODY_MOVE', players: [1,2,3,4] })
    expect(isGameVisible('dodgeball')).toBe(false)
  })
  it('includes marker and ball reach at the collision edge', () => {
    const model = make(); model.moveBody(event(1700, .5 + dodgeReach))
    expect(model.update(1800).lanes[0].hits).toBe(1)
  })
  it('does not reward absent, expired, low-confidence or explicitly released positions', () => {
    const model = make(4)
    model.moveBody(event(1000, .1)); model.moveBody(event(1700, .1, {playerId: 2}))
    model.moveBody(event(1750, .1, {playerId: 2, confidence: .2}))
    model.moveBody(event(1700, .1, {playerId: 3})); model.releaseBody(3)
    expect(model.update(1800).scores.map(s => s.score)).toEqual([0,0,0,0])
  })
  it('resolves an impact before accepting a later position', () => {
    const model = make(); model.moveBody(event(1700, .5))
    expect(model.moveBody(event(1850, .1)).scores[0].score).toBe(-5)
  })
  it('handles coarse render steps identically and never reuses old input for later awards', () => {
    const a = make(), b = make()
    a.moveBody(event(1700)); b.moveBody(event(1700))
    for (let time = 1800; time <= 10000; time += 100) a.update(time)
    expect(b.update(10000)).toEqual(a.update(10000))
    expect(b.update(10000).scores[0].score).toBe(10)
  })
  it('honors countdown, round end and replay without late scores', () => {
    const model = new DodgeballModel({countdownMs: 3000, roundDurationMs: 1800})
    model.start(0); model.moveBody(event(1000))
    expect(model.update(3000).lanes[0].bodyX).toBeNull()
    model.moveBody(event(4700))
    expect(model.update(4800).phase).toBe('results')
    expect(model.update(9000).scores[0].score).toBe(0)
    expect(model.start(10000).lanes[0].dodges).toBe(0)
    expect(model.update(10000).lanes[0].bodyX).toBeNull()
  })
  it('processes valid impacts before a delayed update past results', () => {
    const model = make(1, 2000); model.moveBody(event(1700))
    const state = model.update(10000)
    expect(state.phase).toBe('results'); expect(state.scores[0].score).toBe(10)
  })
  it('freezes countdown and flight during pauses and requires fresh input after resume', () => {
    const model = make(); model.moveBody(event(1500))
    const paused = model.pause(1600)
    expect(model.update(10000)).toEqual(paused)
    model.resume(11600)
    model.moveBody(event(1700)) // queued before resume
    expect(model.update(11800).scores[0].score).toBe(0)
    const countdown = new DodgeballModel(); countdown.start(0); countdown.pause(1000)
    countdown.resume(11000)
    expect(countdown.update(12000).countdownRemainingMs).toBe(1000)
  })
  it.each([
    {kind: 'MOTION_HIT' as const}, {playerId: 4 as const}, {x: NaN}, {y: Infinity}, {x: -1}, {y: 2},
    {confidence: NaN}, {confidence: 1.1}, {timestamp: NaN}, {timestamp: -1},
  ])('rejects malformed input %o', extra => {
    const model = make(); model.moveBody(event(1700, .1, extra))
    expect(model.update(1800).scores[0].score).toBe(0)
  })
  it('rejects duplicate, reordered and stale samples, including after tracking loss', () => {
    const model = make(); model.moveBody(event(1600, .5)); model.moveBody(event(1700, .1, {confidence: 0}))
    model.moveBody(event(1600)); model.moveBody(event(1700));
    expect(model.update(1800).scores[0].score).toBe(0)
    model.update(4100); model.moveBody(event(4000))
    expect(model.update(4200).scores[0].score).toBe(0)
  })
  it('returns detached snapshots', () => {
    const model = make(); const state = model.update(100)
    state.lanes[0].ballX = 1; state.scores[0].score = 999
    expect(model.update(100).lanes[0].ballX).toBe(.5)
    expect(model.update(100).scores[0].score).toBe(0)
  })
})
