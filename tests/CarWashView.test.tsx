import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CarWash } from '../src/minigames/car-wash/CarWash'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Car Wash rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i numbered cars with mud and accessible progress', (playerCount) => {
    render(<CarWash {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('region', { name: /Player/ })).toHaveLength(playerCount)
    expect(screen.getAllByRole('progressbar')).toHaveLength(playerCount)
    expect(document.querySelectorAll('.car-mud')).toHaveLength(26 * playerCount)
  })

  it('normalizes pointer dragging and supports keyboard scrubbing only in the owning board', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<CarWash {...props} />)
    tick(3000)
    const board = screen.getByLabelText('Player 2 Car Wash play area')
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    const initial = board.querySelectorAll('.car-mud').length
    fireEvent.pointerMove(board, { clientX: 300, clientY: 200, buttons: 0 })
    expect(board.querySelectorAll('.car-mud')).toHaveLength(initial)
    fireEvent.pointerDown(board, { clientX: 300, clientY: 200 })
    expect(board.querySelectorAll('.car-mud').length).toBeLessThan(initial)
    const afterClick = board.querySelectorAll('.car-mud').length
    fireEvent.pointerMove(board, { clientX: 240, clientY: 150, buttons: 1 })
    expect(board.querySelectorAll('.car-mud').length).toBeLessThan(afterClick)
    const playerOne = screen.getByLabelText('Player 1 Car Wash play area')
    expect(playerOne.querySelectorAll('.car-mud')).toHaveLength(initial)
    fireEvent.keyDown(playerOne, { key: 'ArrowLeft' })
    fireEvent.keyDown(playerOne, { key: ' ' })
    expect(playerOne.querySelectorAll('.car-mud').length).toBeLessThan(initial)
    expect(screen.getByRole('progressbar', { name: 'Player 1 cleaning progress' })).not.toHaveAttribute('value', '0')
  })

  it('supports StrictMode, generic brushes, results, replay, focus and exit', () => {
    const { rerender } = render(<StrictMode><CarWash {...props} /></StrictMode>)
    tick(3000)
    const event: MotionInputEvent = { playerId: 1, kind: 'MOTION_BRUSH', x: .5, y: .5, confidence: 1, timestamp: 3000 }
    rerender(<StrictMode><CarWash {...props} inputEvents={[event]} /></StrictMode>)
    expect(screen.getByRole('progressbar', { name: 'Player 1 cleaning progress' })).not.toHaveAttribute('value', '0')
    expect(screen.getByRole('progressbar', { name: 'Player 2 cleaning progress' })).toHaveAttribute('value', '0')
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Car Wash results' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Great scrubbing, team!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Wash again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    expect(screen.getAllByText('0% clean · 0 patches')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(props.onExit).toHaveBeenCalled()
  })

  it('shows a camera brush without keyboard focus and removes its trace when motion stops', () => {
    const { rerender } = render(<CarWash {...props} />)
    tick(3000)
    const event: MotionInputEvent = { playerId: 2, kind: 'MOTION_BRUSH', x: .35, y: .25, confidence: 1, timestamp: 3000 }
    rerender(<CarWash {...props} inputEvents={[event]} />)
    const board = screen.getByLabelText('Player 2 Car Wash play area')
    const trace = board.querySelector('.car-brush-trace')!
    expect(trace).toHaveAttribute('cx', '350')
    expect(trace).toHaveAttribute('cy', '150')
    expect(board).not.toHaveFocus()
    expect(screen.getByLabelText('Player 1 Car Wash play area').querySelector('.car-brush-trace')).toBeNull()
    tick(3350)
    expect(board.querySelector('.car-brush-trace')).toBeNull()
  })

  it('pauses on manual, camera and tab events and freezes input', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<CarWash {...props} onReconnect={reconnect} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(10000)
    fireEvent.keyDown(screen.getByLabelText('Player 1 Car Wash play area'), { key: 'Enter' })
    expect(screen.getByRole('progressbar', { name: 'Player 1 cleaning progress' })).toHaveAttribute('value', '0')
    expect(screen.getByText('60s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    rerender(<CarWash {...props} onReconnect={reconnect} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(reconnect).toHaveBeenCalledOnce()
    rerender(<CarWash {...props} externalPauseReason={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })

  it('keeps replay paused when camera recovery is still required', () => {
    const { rerender } = render(<CarWash {...props} />)
    tick(63000)
    rerender(<CarWash {...props} externalPauseReason="Camera disconnected" />)
    fireEvent.click(screen.getByRole('button', { name: 'Wash again' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
  })
})
