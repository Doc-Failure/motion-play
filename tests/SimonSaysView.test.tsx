import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SimonSays } from '../src/minigames/simon-says/SimonSays'

describe('Simon Says simulated play', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('accepts a generic simulated hit after showing the pattern', () => {
    let nextFrame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { nextFrame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const start = 0
    vi.spyOn(performance, 'now').mockReturnValue(start)
    const { rerender } = render(<SimonSays playerCount={1} random={() => 0} onExit={vi.fn()} />)
    act(() => nextFrame?.(start + 3_100))
    act(() => nextFrame?.(start + 3_900))
    rerender(<SimonSays playerCount={1} random={() => 0} inputEvents={[{ playerId: 1, kind: 'MOTION_HIT', x: .25, y: .28, confidence: 1, timestamp: start + 3_901 }]} onExit={vi.fn()} />)
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Watch closely — 2 lights')
  })
})
