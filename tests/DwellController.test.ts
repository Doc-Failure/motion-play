import { describe, expect, it } from 'vitest'
import { DwellController, type DwellTarget } from '../src/input/DwellController'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

const targets: DwellTarget[] = [
  { id: 'play', x: 0, y: .68, width: .5, height: .32 },
  { id: 'home', x: .5, y: .68, width: .5, height: .32 },
]
const sample = (x: number, y: number, timestamp: number, playerId: 1 | 2 = 1): MotionInputEvent => ({ playerId, kind: 'MOTION_HIT', x, y, confidence: 1, timestamp })

describe('DwellController', () => {
  it('activates after a continuous 1.2 second player-one hold', () => {
    const dwell = new DwellController()
    expect(dwell.process(sample(.25, .8, 0), targets)).toMatchObject({ activeId: 'play', progress: 0 })
    expect(dwell.process(sample(.25, .8, 400), targets).progress).toBeCloseTo(1 / 3)
    expect(dwell.process(sample(.25, .8, 800), targets).progress).toBeCloseTo(2 / 3)
    expect(dwell.process(sample(.25, .8, 1_200), targets)).toMatchObject({ activeId: null, activatedId: 'play' })
  })

  it('cancels on leave or target change and requires a fresh hold', () => {
    const dwell = new DwellController()
    dwell.process(sample(.25, .8, 0), targets)
    expect(dwell.process(sample(.25, .2, 500), targets).activeId).toBeNull()
    expect(dwell.process(sample(.75, .8, 700), targets).progress).toBe(0)
    expect(dwell.process(sample(.75, .8, 1_300), targets).activatedId).toBeNull()
  })

  it('ignores other players and applies an activation cooldown', () => {
    const dwell = new DwellController({ dwellMs: 100, cooldownMs: 500 })
    expect(dwell.process(sample(.25, .8, 0, 2), targets).activeId).toBeNull()
    dwell.process(sample(.25, .8, 0), targets)
    expect(dwell.process(sample(.25, .8, 100), targets).activatedId).toBe('play')
    expect(dwell.process(sample(.75, .8, 200), targets).activeId).toBeNull()
    expect(dwell.process(sample(.75, .8, 600), targets).activeId).toBe('home')
  })

  it('resets continuity after motion samples stop arriving', () => {
    const dwell = new DwellController({ continuityMs: 300 })
    dwell.process(sample(.25, .8, 0), targets)
    expect(dwell.process(sample(.25, .8, 700), targets).progress).toBe(0)
  })
})
