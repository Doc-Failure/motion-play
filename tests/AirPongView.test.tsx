import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AirPong } from '../src/minigames/air-pong/AirPong'

describe('Air Pong simulated hand play', () => {
  afterEach(() => vi.unstubAllGlobals())
  it('moves the rendered paddle and returns the ball through HAND_POSITION simulation', () => {
    let nextFrame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { nextFrame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const start = performance.now()
    const props = { playerCount: 1 as const, onExit: vi.fn() }
    const { rerender } = render(<AirPong {...props} />)
    act(() => nextFrame?.(start + 3_100))
    rerender(<AirPong {...props} inputEvents={[{ playerId: 1, kind: 'HAND_POSITION', x: .1, y: .5, confidence: 1, timestamp: start + 3_101 }]} />)
    const paddle = screen.getByLabelText('Player 1 hand-controlled paddle')
    expect(paddle).toHaveStyle({ top: '50%' })
    for (const offset of [4_100, 5_100, 6_100, 7_100, 8_100, 8_600]) act(() => nextFrame?.(start + offset))
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Rally 1')).toBeVisible()
  })
})
