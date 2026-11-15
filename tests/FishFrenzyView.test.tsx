import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FishFrenzy } from '../src/minigames/fish-frenzy/FishFrenzy'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Fish Frenzy rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i isolated waters and explains camera limitations', (playerCount) => {
    render(<FishFrenzy {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('region', { name: /Player/ })).toHaveLength(playerCount)
    tick(3100)
    expect(screen.getAllByRole('group', { name: /Fish Frenzy play area/ })).toHaveLength(playerCount)
    expect(screen.getByText(/not tracked hands/)).toBeVisible()
  })

  it('normalizes pointer movement, supports keyboard casts, and expires the visible net', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<FishFrenzy {...props} random={() => .4} />)
    tick(3000)
    const board = screen.getByRole('group', { name: 'Player 2 Fish Frenzy play area' })
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    fireEvent.pointerMove(board, { clientX: 148, clientY: 188 })
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('5 points · 1 caught · 0 missed')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('0 points · 0 caught · 0 missed')).toBeVisible()
    expect(screen.getByRole('img', { name: 'Player 2 net' })).toHaveStyle({ left: '12%', top: '44%' })
    tick(3400)
    expect(screen.queryByRole('img', { name: 'Player 2 net' })).not.toBeInTheDocument()
    tick(4100)
    fireEvent.keyDown(board, { key: 'Enter' })
    expect(screen.getByText('10 points · 2 caught · 0 missed')).toBeVisible()
    tick(4200)
    fireEvent.keyDown(board, { key: 'ArrowRight' })
    expect(screen.getByRole('img', { name: 'Player 2 net' })).toHaveStyle({ left: '17%' })
  })

  it('supports StrictMode, generic position events, winning results, replay and exit', () => {
    const random = () => .4
    const { rerender } = render(<StrictMode><FishFrenzy {...props} random={random} /></StrictMode>)
    tick(3000)
    const event: MotionInputEvent = { playerId: 1, kind: 'HAND_POSITION', x: .12, y: .44, confidence: 1, timestamp: 3000 }
    rerender(<StrictMode><FishFrenzy {...props} random={random} inputEvents={[event]} /></StrictMode>)
    expect(screen.getByText('5 points · 1 caught · 0 missed')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Fish Frenzy results' })).toHaveTextContent('Player 1 wins!')
    expect(within(screen.getByRole('dialog')).getByRole('heading')).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    expect(screen.getAllByText('0 points · 0 caught · 0 missed')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(props.onExit).toHaveBeenCalled()
  })

  it('pauses for user, tab and camera recovery, then retains the block on replay', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<FishFrenzy {...props} onReconnect={reconnect} />)
    tick(4000)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(14000)
    expect(screen.getByText('59s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    rerender(<FishFrenzy {...props} onReconnect={reconnect} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(reconnect).toHaveBeenCalledOnce()
    rerender(<FishFrenzy {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    tick(73000)
    expect(screen.getByRole('heading', { name: 'It’s a tie!' })).toHaveFocus()
    rerender(<FishFrenzy {...props} externalPauseReason="Camera disconnected" />)
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
  })
})
