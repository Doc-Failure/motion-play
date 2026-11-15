import { describe, expect, it } from 'vitest'
import { MotionProcessor, type MotionFrame } from '../src/input/MotionProcessor'
import { defaultCameraZones } from '../src/input/PlayerZoneMapper'
import { SyntheticMotionSimulator } from '../src/input/SyntheticMotionSimulator'

function frame(width: number, height: number, bright: Array<[number, number]> = [], background = 20): MotionFrame {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const value = bright.some(([x, y]) => y * width + x === pixel) ? 240 : background
    data.set([value, value, value, 255], pixel * 4)
  }
  return { width, height, data }
}

describe('MotionProcessor', () => {
  it('denoises isolated changes and emits normalized, player-local motion events', () => {
    const processor = new MotionProcessor({ smoothing: 0, minimumNeighbors: 2, minimumZoneActivity: .01 })
    const zones = defaultCameraZones(2)
    processor.process(frame(20, 10), zones, 0)
    const isolated = processor.process(frame(20, 10, [[2, 2]]), zones, 10)
    expect(isolated.events).toEqual([])
    processor.process(frame(20, 10), zones, 20)
    const block = Array.from({ length: 4 }, (_, y) => Array.from({ length: 4 }, (_, x) => [x + 14, y + 3] as [number, number])).flat()
    const result = processor.process(frame(20, 10, block), zones, 300)
    expect(result.events).toHaveLength(1)
    expect(result.events[0]).toMatchObject({ playerId: 1, kind: 'MOTION_HIT' })
    expect(result.events[0].x).toBeGreaterThan(0)
    expect(result.events[0].x).toBeLessThan(1)
    expect(result.zones[1].activity).toBe(0)
  })

  it('debounces repeated hits per player and allows a later hit', () => {
    const processor = new MotionProcessor({ smoothing: 0, minimumNeighbors: 1, minimumZoneActivity: .01, debounceMs: 200 })
    const zones = defaultCameraZones(1); const moving = Array.from({ length: 16 }, (_, index) => [index % 4 + 2, Math.floor(index / 4) + 2] as [number, number])
    processor.process(frame(10, 10), zones, 0)
    expect(processor.process(frame(10, 10, moving), zones, 10).events).toHaveLength(1)
    expect(processor.process(frame(10, 10), zones, 20).events).toHaveLength(0)
    expect(processor.process(frame(10, 10, moving), zones, 250).events).toHaveLength(1)
  })

  it('calibrates above deterministic ambient noise and simulator frames are repeatable', () => {
    const processor = new MotionProcessor({ smoothing: 0, sensitivity: 1 })
    expect(processor.calibrate([frame(4, 4, [], 20), frame(4, 4, [], 32)])).toBe(12)
    const result = processor.process(frame(4, 4, [], 35), defaultCameraZones(1), 0)
    expect(result.threshold).toBeGreaterThan(20)
    const first = new SyntheticMotionSimulator(20, 10); const second = new SyntheticMotionSimulator(20, 10)
    expect(first.next().data).toEqual(second.next().data)
    expect(first.next().data).toEqual(second.next().data)
  })
})

it('keeps separated hands separate and provides positions between debounced hits', () => {
  const processor = new MotionProcessor({smoothing: 0})
  const zones = defaultCameraZones(1)
  const hands = [2, 14].flatMap(left => Array.from({length: 9}, (_, i) => [left + i % 3, 3 + Math.floor(i / 3)] as [number, number]))
  processor.process(frame(20, 10), zones, 0)
  const first = processor.process(frame(20, 10, hands), zones, 10)
  expect(first.events).toHaveLength(2)
  expect(first.events.every(event => Math.abs(event.x - .5) > .2)).toBe(true)
  const next = processor.process(frame(20, 10), zones, 60)
  expect(next.events).toHaveLength(0)
  expect(next.positions).toHaveLength(2)
})
it('ignores uniform lighting changes', () => {
  const processor = new MotionProcessor({smoothing: 0})
  processor.process(frame(20, 10, [], 20), defaultCameraZones(1), 0)
  expect(processor.process(frame(20, 10, [], 100), defaultCameraZones(1), 50).events).toEqual([])
})
