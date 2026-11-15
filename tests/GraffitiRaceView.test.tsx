import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MURAL_PATCHES } from '../src/minigames/graffiti-race/GraffitiRaceModel'
import { GraffitiRace } from '../src/minigames/graffiti-race/GraffitiRace'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Graffiti Race rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i numbered walls with hidden murals and accessible progress', (playerCount) => {
    render(<GraffitiRace {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('region', { name: /Player/ })).toHaveLength(playerCount)
    expect(screen.getAllByRole('progressbar')).toHaveLength(playerCount)
    expect(document.querySelectorAll('.graffiti-cover')).toHaveLength(96 * playerCount)
  })

  it('normalizes pointer dragging and supports keyboard painting only in the owning board', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<GraffitiRace {...props} />)
    tick(3000)
    const board = screen.getByLabelText('Player 2 Graffiti Race play area')
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    const initial = board.querySelectorAll('.graffiti-cover').length
    fireEvent.pointerMove(board, { clientX: 300, clientY: 200, buttons: 0 })
    expect(board.querySelectorAll('.graffiti-cover')).toHaveLength(initial)
    fireEvent.pointerDown(board, { clientX: 300, clientY: 200 })
    expect(board.querySelectorAll('.graffiti-cover').length).toBeLessThan(initial)
    const afterClick = board.querySelectorAll('.graffiti-cover').length
    fireEvent.pointerMove(board, { clientX: 240, clientY: 150, buttons: 1 })
    expect(board.querySelectorAll('.graffiti-cover').length).toBeLessThan(afterClick)
    const playerOne = screen.getByLabelText('Player 1 Graffiti Race play area')
    expect(playerOne.querySelectorAll('.graffiti-cover')).toHaveLength(initial)
    fireEvent.keyDown(playerOne, { key: 'ArrowLeft' })
    fireEvent.keyDown(playerOne, { key: ' ' })
    expect(playerOne.querySelectorAll('.graffiti-cover').length).toBeLessThan(initial)
    expect(screen.getByRole('progressbar', { name: 'Player 1 mural progress' })).not.toHaveAttribute('value', '0')
  })

  it('supports StrictMode, generic brushes, results, replay, focus and exit', () => {
    const { rerender } = render(<StrictMode><GraffitiRace {...props} /></StrictMode>)
    tick(3000)
    const event: MotionInputEvent = { playerId: 1, kind: 'MOTION_BRUSH', x: .5, y: .5, confidence: 1, timestamp: 3000 }
    rerender(<StrictMode><GraffitiRace {...props} inputEvents={[event]} /></StrictMode>)
    expect(screen.getByRole('progressbar', { name: 'Player 1 mural progress' })).not.toHaveAttribute('value', '0')
    expect(screen.getByRole('progressbar', { name: 'Player 2 mural progress' })).toHaveAttribute('value', '0')
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Graffiti Race results' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Player 1 wins!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Paint again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    expect(screen.getAllByText('0% revealed · 0 patches')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(props.onExit).toHaveBeenCalled()
  })

  it('reveals the mural and announces the first finisher before time expires', () => {
    const { rerender } = render(<GraffitiRace {...props} />)
    tick(3000)
    const events: MotionInputEvent[] = MURAL_PATCHES.map(({ x, y }) => ({ playerId: 2, kind: 'MOTION_BRUSH', x, y, confidence: 1, timestamp: 3000 }))
    rerender(<GraffitiRace {...props} inputEvents={events} />)
    expect(screen.getByRole('heading', { name: 'Player 2 wins!' })).toHaveFocus()
    expect(screen.getByLabelText('Player 2 Graffiti Race play area').querySelectorAll('.graffiti-cover')).toHaveLength(0)
    expect(screen.getByLabelText('Player 1 Graffiti Race play area').querySelectorAll('.graffiti-cover')).toHaveLength(MURAL_PATCHES.length)
  })

  it('announces equal nonzero coverage as a tie at the timer', () => {
    const { rerender } = render(<GraffitiRace {...props} />)
    tick(3000)
    const events: MotionInputEvent[] = ([1, 2] as const).map((playerId) => ({ playerId, kind: 'MOTION_BRUSH', x: .5, y: .5, confidence: 1, timestamp: 3000 }))
    rerender(<GraffitiRace {...props} inputEvents={events} />)
    tick(63000)
    expect(screen.getByRole('heading', { name: 'A colorful tie!' })).toHaveFocus()
  })

  it('shows a camera brush without keyboard focus and removes its trace when motion stops', () => {
    const { rerender } = render(<GraffitiRace {...props} />)
    tick(3000)
    const event: MotionInputEvent = { playerId: 2, kind: 'MOTION_BRUSH', x: .35, y: .25, confidence: 1, timestamp: 3000 }
    rerender(<GraffitiRace {...props} inputEvents={[event]} />)
    const board = screen.getByLabelText('Player 2 Graffiti Race play area')
    const trace = board.querySelector('.graffiti-brush-trace')!
    expect(trace).toHaveAttribute('cx', '350')
    expect(trace).toHaveAttribute('cy', '150')
    expect(board).not.toHaveFocus()
    expect(screen.getByLabelText('Player 1 Graffiti Race play area').querySelector('.graffiti-brush-trace')).toBeNull()
    tick(3350)
    expect(board.querySelector('.graffiti-brush-trace')).toBeNull()
  })

  it('pauses on manual, camera and tab events and freezes input', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<GraffitiRace {...props} onReconnect={reconnect} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(10000)
    fireEvent.keyDown(screen.getByLabelText('Player 1 Graffiti Race play area'), { key: 'Enter' })
    expect(screen.getByRole('progressbar', { name: 'Player 1 mural progress' })).toHaveAttribute('value', '0')
    expect(screen.getByText('60s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    rerender(<GraffitiRace {...props} onReconnect={reconnect} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(reconnect).toHaveBeenCalledOnce()
    rerender(<GraffitiRace {...props} externalPauseReason={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })

  it('keeps replay paused when camera recovery is still required', () => {
    const { rerender } = render(<GraffitiRace {...props} />)
    tick(63000)
    rerender(<GraffitiRace {...props} externalPauseReason="Camera disconnected" />)
    fireEvent.click(screen.getByRole('button', { name: 'Paint again' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
  })
})
