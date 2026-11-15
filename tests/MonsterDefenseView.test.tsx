import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MonsterDefense } from '../src/minigames/monster-defense/MonsterDefense'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

let frame: FrameRequestCallback
let now: number
const props = { playerCount: 2 as const, onExit: vi.fn() }
function tick(time: number) { now = time; act(() => frame(time)) }

describe('Monster Defense rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i player boards and a shared goal', (playerCount) => {
    render(<MonsterDefense {...props} playerCount={playerCount} />)
    expect(screen.getAllByRole('region', { name: /Player/ })).toHaveLength(playerCount)
    expect(screen.getByText(`0 / ${playerCount * 100}`)).toBeVisible()
    tick(3000)
    expect(screen.getAllByRole('button', { name: /Stop Player/ })).toHaveLength(playerCount)
  })

  it('normalizes pointer input into the owning board', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<MonsterDefense {...props} />)
    tick(3000)
    const board = screen.getByLabelText('Player 2 Monster Defense play area')
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    fireEvent.pointerDown(board, { clientX: 148, clientY: 150 })
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('10 points · 0 breaches')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Player 1' })).getByText('0 points · 0 breaches')).toBeVisible()
  })

  it('supports StrictMode, generic input, results, replay and exit', () => {
    const { rerender } = render(<StrictMode><MonsterDefense {...props} /></StrictMode>)
    tick(3000)
    const event: MotionInputEvent = { playerId: 1, kind: 'MOTION_HIT', x: .12, y: .25, confidence: 1, timestamp: 3000 }
    rerender(<StrictMode><MonsterDefense {...props} inputEvents={[event]} /></StrictMode>)
    expect(screen.getByText('10 / 200')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Monster Defense results' })).toHaveTextContent('Team score: -295 / 200')
    expect(screen.getByRole('heading', { name: 'Thanks, gate defenders!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('0 / 200')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' }))
    expect(props.onExit).toHaveBeenCalled()
  })

  it('supports native target buttons and pauses for user, tab visibility and camera recovery', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<MonsterDefense {...props} onReconnect={reconnect} />)
    tick(3000)
    fireEvent.click(screen.getByRole('button', { name: 'Stop Player 1 monster 1' }))
    expect(screen.getByText('10 / 200')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    tick(10000)
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled()
    expect(screen.getByText('60s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    rerender(<MonsterDefense {...props} onReconnect={reconnect} externalPauseReason="Camera disconnected" />)
    expect(screen.getByRole('dialog')).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' }))
    expect(reconnect).toHaveBeenCalledOnce()
    rerender(<MonsterDefense {...props} externalPauseReason={null} />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
})
