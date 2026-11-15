import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FruitCatcher } from '../src/minigames/fruit-catcher/FruitCatcher'

describe('Fruit Catcher simulated hand play', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('moves the rendered basket and catches fruit through a HAND_POSITION event', () => {
    let nextFrame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { nextFrame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const start = performance.now()
    const props = { playerCount: 1 as const, random: () => .5, onExit: vi.fn() }
    const { rerender } = render(<FruitCatcher {...props} />)
    act(() => nextFrame?.(start + 3_100))
    act(() => nextFrame?.(start + 4_800))
    rerender(<FruitCatcher {...props} inputEvents={[{ playerId: 1, kind: 'HAND_POSITION', x: .5, y: .5, confidence: 1, timestamp: start + 4_801 }]} />)
    expect(screen.getByLabelText('hand-controlled basket')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })
})
