import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SupermarketRush } from '../src/minigames/supermarket-rush/SupermarketRush'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Supermarket Rush rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i player boards and shopping lists', (playerCount) => {
    render(<SupermarketRush {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('region', { name: /Player/ })).toHaveLength(playerCount)
    expect(screen.getAllByRole('status', { name: /pick feedback/ })).toHaveLength(playerCount)
    expect(screen.getAllByText('Shopping list:')).toHaveLength(playerCount)
    tick(3000)
    expect(screen.getAllByRole('button', { name: /Pick Player/ })).toHaveLength(playerCount)
  })

  it('normalizes pointer input into the owning board', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<SupermarketRush {...props} />)
    tick(3000)
    const board = screen.getByLabelText('Player 2 Supermarket Rush play area')
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    fireEvent.pointerDown(board, { clientX: 452, clientY: 200 })
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('10 points · 1 collected')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('0 points · 0 collected')).toBeVisible()
  })

  it('supports StrictMode, generic input, results, replay and exit', () => {
    const { rerender } = render(<StrictMode><SupermarketRush {...props} /></StrictMode>)
    tick(3000)
    const event: MotionInputEvent = { playerId: 1, kind: 'MOTION_HIT', x: .88, y: .5, confidence: 1, timestamp: 3000 }
    rerender(<StrictMode><SupermarketRush {...props} inputEvents={[event]} /></StrictMode>)
    expect(screen.getByText('10 points · 1 collected')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Supermarket Rush results' })).toHaveTextContent('10 points')
    expect(screen.getByRole('heading', { name: 'Shopping complete!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    expect(screen.getAllByText('0 points · 0 collected')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(props.onExit).toHaveBeenCalled()
  })

  it('supports native target buttons and pauses for user, tab visibility and camera recovery', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<SupermarketRush {...props} onReconnect={reconnect} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Pick Player 1 apple 1' }))
    expect(screen.getByText('10 points · 1 collected')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(10000)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled()
    expect(screen.getByText('60s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    rerender(<SupermarketRush {...props} onReconnect={reconnect} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(reconnect).toHaveBeenCalledOnce()
    rerender(<SupermarketRush {...props} externalPauseReason={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
  it('keeps replay paused when the camera still needs recovery', () => {
    const { rerender } = render(<SupermarketRush {...props} />)
    tick(63000)
    rerender(<SupermarketRush {...props} externalPauseReason="Camera disconnected" />)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    tick(100000)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
  })

  it('explains correct and wrong picks in each player’s live feedback and clears it on replay', () => {
    render(<SupermarketRush {...props} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Pick Player 1 apple 1' }))
    expect(screen.getByRole('status', { name: 'Player 1 pick feedback' })).toHaveTextContent('✓ apple picked! +10 points.')
    tick(4800)
    fireEvent.click(screen.getByRole('button', { name: 'Pick Player 2 bread 4' }))
    expect(screen.getByRole('status', { name: 'Player 2 pick feedback' })).toHaveTextContent('Oops, bread! −5 points. Look for apple.')
    expect(screen.getByRole('status', { name: 'Player 1 pick feedback' })).toHaveTextContent('✓ apple picked! +10 points.')
    tick(63000)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getAllByText('Ready? Look for the grocery on your list.')).toHaveLength(2)
  })

})
