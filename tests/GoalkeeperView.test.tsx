import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Goalkeeper } from '../src/minigames/goalkeeper/Goalkeeper'

describe('Goalkeeper simulated pose play', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
  it('moves the rendered keeper and saves a shot through BODY_MOVE simulation', () => {
    let nextFrame: FrameRequestCallback | undefined
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { nextFrame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const start = 0
    vi.spyOn(performance, 'now').mockReturnValue(start)
    const props = { playerCount: 1 as const, onExit: vi.fn() }
    const { rerender } = render(<Goalkeeper {...props} />)
    act(() => nextFrame?.(start + 3_100))
    rerender(<Goalkeeper {...props} inputEvents={[{ playerId: 1, kind: 'BODY_MOVE', x: .22, y: .78, confidence: 1, timestamp: start + 3_101 }]} />)
    expect(screen.getByLabelText('Player 1 pose-controlled goalkeeper')).toHaveStyle({ left: '22%', top: '78%' })
    // A held physical pose continues supplying frames throughout the approach.
    for(const offset of [4100,5100,5960]){
      rerender(<Goalkeeper {...props} inputEvents={[{playerId:1,kind:'BODY_MOVE',x:.22,y:.78,confidence:1,timestamp:start+offset}]}/>)
    }
    for (const offset of [6_100, 6_300]) act(() => nextFrame?.(start + offset))
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Saves 1')).toBeVisible()
  })
})
