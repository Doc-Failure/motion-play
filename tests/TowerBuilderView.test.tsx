import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TowerBuilder } from '../src/minigames/tower-builder/TowerBuilder'
import type { MotionInputEvent } from '../src/input/MotionProcessor'
let frame: FrameRequestCallback
let now = 0
function tick(time: number) { now = time; act(() => frame(time)) }
const props = { playerCount: 2 as const, onExit: vi.fn() }

describe('Tower Builder rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

  it.each([1, 2, 3, 4] as const)('renders %i transparent lanes with honest controls', playerCount => {
    render(<TowerBuilder {...props} playerCount={playerCount}/> )
    expect(screen.getAllByRole('group', { name: /Tower Builder play area/ })).toHaveLength(playerCount)
    expect(screen.getByText(/not tracked hands/)).toBeVisible()
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled()
  })

  it('normalizes deliberate pointer holds, stops on release and supports keyboard', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<TowerBuilder {...props}/>); tick(3000)
    const board = screen.getByRole('group', { name: 'Player 2 Tower Builder play area' })
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 400, height: 200 } as DOMRect)
    fireEvent.pointerDown(board, { clientX: 300, clientY: 264 })
    for (let time = 3100; time <= 3900; time += 100) tick(time)
    expect(within(screen.getByRole('region', { name: 'Player 2' })).getByText('10 contributed · 1 blocks · 0 towers')).toBeVisible()
    fireEvent.pointerUp(board); tick(5000)
    expect(screen.getByRole('progressbar', { name: 'Player 2 steady hold' })).toHaveAttribute('value', '0')
    const first = screen.getByRole('group', { name: 'Player 1 Tower Builder play area' })
    fireEvent.keyDown(first, { key: ' ' })
    for (let time = 5100; time <= 5900; time += 100) tick(time)
    fireEvent.keyUp(first, { key: ' ' })
    expect(screen.getByText('20 points')).toBeVisible()
  })

  it('previews keyboard positioning before a hold without awarding points', () => {
    render(<TowerBuilder {...props}/>); tick(3000)
    const board = screen.getByRole('group', { name: 'Player 1 Tower Builder play area' })
    fireEvent.focus(board)
    expect(board.querySelector('.tower-block--hand')).toHaveStyle({ left: '50%', top: '82%' })
    fireEvent.keyDown(board, { key: 'ArrowUp' })
    expect(parseFloat((board.querySelector('.tower-block--hand') as SVGElement).style.top)).toBeCloseTo(79)
    tick(5000)
    expect(screen.getByText('0 points')).toBeVisible()
    fireEvent.blur(board)
    expect(board.querySelector('.tower-block--hand')).not.toBeInTheDocument()
  })

  it('consumes generic events under StrictMode, shows cooperative results, replays and exits', () => {
    const { rerender } = render(<StrictMode><TowerBuilder {...props}/></StrictMode>); tick(3000)
    for (let time = 3000; time <= 3800; time += 100) {
      now = time
      const event: MotionInputEvent = { playerId: 1, kind: 'HAND_POSITION', x: .5, y: .82, confidence: 1, timestamp: time }
      rerender(<StrictMode><TowerBuilder {...props} inputEvents={[event]}/></StrictMode>)
    }
    expect(screen.getByText('10 contributed · 1 blocks · 0 towers')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', { name: 'Tower Builder results' })).toHaveTextContent('Team: 10 points')
    expect(screen.getByRole('heading', { name: 'Teamwork builds wonders!' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Play again' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Player 1 Tower Builder play area' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: 'Exit game' })); expect(props.onExit).toHaveBeenCalled()
  })

  it('blocks camera recovery, freezes time, restores focus and pauses for a hidden tab', () => {
    const reconnect = vi.fn()
    const { rerender } = render(<TowerBuilder {...props} onReconnect={reconnect}/>); tick(4000)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' })); tick(14000)
    expect(screen.getByText('59s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'Resume round' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toHaveFocus()
    rerender(<TowerBuilder {...props} externalPauseReason="Camera disconnected" onReconnect={reconnect}/> )
    expect(screen.getByRole('button', { name: 'Resume round' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reconnect camera' })); expect(reconnect).toHaveBeenCalledOnce()
    rerender(<TowerBuilder {...props}/> )
    fireEvent.click(screen.getByRole('button', { name: 'Resume round' }))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
    expect(screen.getByRole('button', { name: 'Resume round' })).toBeDisabled()
  })
})
