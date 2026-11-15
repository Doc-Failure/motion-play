import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PizzaMaker } from '../src/minigames/pizza-maker/PizzaMaker'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Pizza Maker rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i player boards and pizza orders', (playerCount) => {
    render(<PizzaMaker {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('region', { name: /Player/ })).toHaveLength(playerCount)
    expect(screen.getAllByRole('status', { name: /pick feedback/ })).toHaveLength(playerCount)
    expect(screen.getAllByLabelText(/Player \d order/)).toHaveLength(playerCount)
    tick(3000)
    expect(screen.getAllByRole('button', { name: /Pick Player/ })).toHaveLength(playerCount * 3)
  })

  it('normalizes pointer input into the owning board', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<PizzaMaker {...props} />)
    tick(3000)
    const board = screen.getByLabelText('Player 2 Pizza Maker play area')
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    fireEvent.pointerDown(board, { clientX: 180, clientY: 256 })
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('10 points · 0 pizzas')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('0 points · 0 pizzas')).toBeVisible()
  })

  it('supports StrictMode, generic input, results, replay and exit', () => {
    const { rerender } = render(<StrictMode><PizzaMaker {...props} /></StrictMode>)
    tick(3000)
    const event: MotionInputEvent = { playerId: 1, kind: 'MOTION_HIT', x: .2, y: .78, confidence: 1, timestamp: 3000 }
    rerender(<StrictMode><PizzaMaker {...props} inputEvents={[event]} /></StrictMode>)
    expect(screen.getByText('10 points · 0 pizzas')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Pizza Maker results' })).toHaveTextContent('10 points')
    expect(screen.getByRole('heading', { name: 'Pizza party complete!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    expect(screen.getAllByText('0 points · 0 pizzas')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(props.onExit).toHaveBeenCalled()
  })

  it('supports native target buttons and pauses for user, tab visibility and camera recovery', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<PizzaMaker {...props} onReconnect={reconnect} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Pick Player 1 tomato' }))
    expect(screen.getByText('10 points · 0 pizzas')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(10000)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled()
    expect(screen.getByText('60s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    rerender(<PizzaMaker {...props} onReconnect={reconnect} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(reconnect).toHaveBeenCalledOnce()
    rerender(<PizzaMaker {...props} externalPauseReason={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
  it('keeps replay paused when the camera still needs recovery', () => {
    const { rerender } = render(<PizzaMaker {...props} />)
    tick(63000)
    rerender(<PizzaMaker {...props} externalPauseReason="Camera disconnected" />)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    tick(100000)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
  })

  it('explains correct and wrong picks in each player’s live feedback and clears it on replay', () => {
    render(<PizzaMaker {...props} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Pick Player 1 tomato' }))
    expect(screen.getByRole('status', { name: 'Player 1 pick feedback' })).toHaveTextContent('✓ tomato added! +10 points.')
    tick(4800)
    fireEvent.click(screen.getByRole('button', { name: 'Pick Player 2 mushroom' }))
    expect(screen.getByRole('status', { name: 'Player 2 pick feedback' })).toHaveTextContent('Oops! mushroom is not on this order. −5 points.')
    expect(screen.getByRole('status', { name: 'Player 1 pick feedback' })).toHaveTextContent('✓ tomato added! +10 points.')
    tick(63000)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getAllByText('Ready? Match both toppings in any order.')).toHaveLength(2)
  })

})
