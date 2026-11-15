import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StarCollector } from '../src/minigames/star-collector/StarCollector'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Star Collector rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i player boards and constellations', (playerCount) => {
    render(<StarCollector {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('region', { name: /Player/ })).toHaveLength(playerCount)
    expect(screen.getAllByRole('status', { name: /collection feedback/ })).toHaveLength(playerCount)
    tick(3000)
    expect(screen.getAllByRole('button', { name: /Collect Player/ })).toHaveLength(playerCount)
  })

  it('normalizes pointer input into the owning board', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<StarCollector {...props} />)
    tick(3000)
    const board = screen.getByLabelText('Player 2 Star Collector play area')
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    fireEvent.pointerDown(board, { clientX: 200, clientY: 200 })
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('10 points · 1 collected')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('0 points · 0 collected')).toBeVisible()
  })

  it('supports StrictMode, generic input, results, replay and exit', () => {
    const { rerender } = render(<StrictMode><StarCollector {...props} /></StrictMode>)
    tick(3000)
    const event: MotionInputEvent = { playerId: 1, kind: 'MOTION_HIT', x: .25, y: .5, confidence: 1, timestamp: 3000 }
    rerender(<StrictMode><StarCollector {...props} inputEvents={[event]} /></StrictMode>)
    expect(screen.getByText('10 points · 1 collected')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Star Collector results' })).toHaveTextContent('10 points')
    expect(screen.getByRole('heading', { name: 'A sky full of stars!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    expect(screen.getAllByText('0 points · 0 collected')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(props.onExit).toHaveBeenCalled()
  })

  it('supports native target buttons and pauses for user, tab visibility and camera recovery', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<StarCollector {...props} onReconnect={reconnect} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Collect Player 1 star 1' }))
    expect(screen.getByText('10 points · 1 collected')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(10000)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled()
    expect(screen.getByText('60s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    rerender(<StarCollector {...props} onReconnect={reconnect} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(reconnect).toHaveBeenCalledOnce()
    rerender(<StarCollector {...props} externalPauseReason={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
  it('keeps replay paused when the camera still needs recovery', () => {
    const { rerender } = render(<StarCollector {...props} />)
    tick(63000)
    rerender(<StarCollector {...props} externalPauseReason="Camera disconnected" />)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    tick(100000)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
  })

  it('announces catches independently and expires untouched stars', () => {
    render(<StarCollector {...props} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Collect Player 1 star 1' }))
    expect(screen.getByRole('status', { name: 'Player 1 collection feedback' })).toHaveTextContent('1 star collected!')
    expect(screen.getByRole('status', { name: 'Player 2 collection feedback' })).toHaveTextContent('Ready?')
    tick(5400)
    expect(screen.queryByRole('button', { name: 'Collect Player 2 star 2' })).not.toBeInTheDocument()
    tick(63000)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getAllByText('Ready? Catch a star before it disappears.')).toHaveLength(2)
  })
})
