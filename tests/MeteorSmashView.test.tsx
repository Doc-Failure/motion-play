import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MeteorSmash } from '../src/minigames/meteor-smash/MeteorSmash'

describe('Meteor Smash rendered simulation', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
  it('renders a meteor and scores it through generic MOTION_HIT input', () => {
    let nextFrame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { nextFrame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const start = 0
    vi.spyOn(performance, 'now').mockReturnValue(start)
    const props = { playerCount: 1 as const, onExit: vi.fn() }
    const { rerender } = render(<MeteorSmash {...props} />)
    act(() => nextFrame?.(start + 3_100))
    const meteor = screen.getByLabelText('falling meteor')
    expect(meteor).toBeVisible()
    const x = Number.parseFloat(meteor.style.left) / 100
    rerender(<MeteorSmash {...props} inputEvents={[{ playerId: 1, kind: 'MOTION_HIT', x, y: -.08, confidence: 1, timestamp: start + 3_101 }]} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.queryByLabelText('falling meteor')).not.toBeInTheDocument()
  })
})
