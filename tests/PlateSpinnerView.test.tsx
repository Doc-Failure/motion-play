import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlateSpinner } from '../src/minigames/plate-spinner/PlateSpinner'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Plate Spinner rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i player boards and plates', (playerCount) => {
    render(<PlateSpinner {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('region', { name: /Player/ })).toHaveLength(playerCount)
    expect(screen.getAllByRole('status', { name: /spin feedback/ })).toHaveLength(playerCount)
    tick(5200)
    expect(screen.getAllByRole('button', { name: /Spin Player/ })).toHaveLength(playerCount * 3)
  })

  it('normalizes pointer input into the owning board', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<PlateSpinner {...props} />)
    tick(5200)
    const board = screen.getByLabelText('Player 2 Plate Spinner play area')
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    fireEvent.pointerDown(board, { clientX: 180, clientY: 180 })
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('10 points · 0 drops')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('0 points · 0 drops')).toBeVisible()
  })

  it('supports StrictMode, generic input, results, replay and exit', () => {
    const { rerender } = render(<StrictMode><PlateSpinner {...props} /></StrictMode>)
    tick(5200)
    const event: MotionInputEvent = { playerId: 1, kind: 'MOTION_HIT', x: .2, y: .4, confidence: 1, timestamp: 5200 }
    rerender(<StrictMode><PlateSpinner {...props} inputEvents={[event]} /></StrictMode>)
    expect(screen.getByText('10 points · 0 drops')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Plate Spinner results' })).toHaveTextContent('points')
    expect(within(screen.getByRole('dialog')).getByRole('heading')).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    expect(screen.getAllByText('0 points · 0 drops')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(props.onExit).toHaveBeenCalled()
  })

  it('supports native target buttons and pauses for user, tab visibility and camera recovery', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<PlateSpinner {...props} onReconnect={reconnect} />)
    tick(5200)
    fireEvent.click(screen.getByRole('button', { name: 'Spin Player 1 plate 1' }))
    expect(screen.getByText('10 points · 0 drops')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(10000)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled()
    expect(screen.getByText('58s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    rerender(<PlateSpinner {...props} onReconnect={reconnect} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(reconnect).toHaveBeenCalledOnce()
    rerender(<PlateSpinner {...props} externalPauseReason={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
  it('keeps replay paused when the camera still needs recovery', () => {
    const { rerender } = render(<PlateSpinner {...props} />)
    tick(63000)
    expect(screen.getByRole('heading', { name: 'It’s a tie!' })).toHaveFocus()
    rerender(<PlateSpinner {...props} externalPauseReason="Camera disconnected" />)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    tick(100000)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
  })


})
