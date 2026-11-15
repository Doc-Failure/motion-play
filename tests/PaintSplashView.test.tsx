import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaintSplash } from '../src/minigames/paint-splash/PaintSplash'

describe('PaintSplash simulated play', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('renders generic brush input as visible paint and increased coverage', () => {
    let nextFrame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      nextFrame = callback
      return 1
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())

    const { rerender } = render(<PaintSplash playerCount={1} onExit={vi.fn()} />)
    act(() => nextFrame?.(performance.now() + 3_100))

    rerender(<PaintSplash playerCount={1} inputEvents={[{
      playerId: 1,
      kind: 'MOTION_BRUSH',
      x: .5,
      y: .5,
      confidence: 1,
      timestamp: performance.now() + 3_101,
    }]} onExit={vi.fn()} />)

    expect(screen.getByText(/%/)).not.toHaveTextContent('0%')
    expect(screen.getByLabelText('Player 1 Paint Splash play area').querySelectorAll('.is-painted').length).toBeGreaterThan(0)
  })
})
