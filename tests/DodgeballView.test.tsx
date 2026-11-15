import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Dodgeball } from '../src/minigames/dodgeball/Dodgeball'
let frame: FrameRequestCallback
let now = 0
function tick(time: number) { now = time; act(() => frame(time)) }
const props = { playerCount: 2 as const, onExit: vi.fn() }

describe('Dodgeball rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it.each([1,2,3,4] as const)('renders %i lanes and explains the input alternative', playerCount => {
    render(<Dodgeball {...props} playerCount={playerCount}/>)
    expect(screen.getAllByRole('group', {name: /Dodgeball play area/})).toHaveLength(playerCount)
    expect(screen.getByText(/not tracked body outlines/)).toBeVisible()
  })
  it('normalizes pointer control, supports keyboard and clears simulation on leave', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<Dodgeball {...props}/>); tick(3000)
    const board = screen.getByRole('group', {name: 'Player 2 Dodgeball play area'})
    vi.spyOn(board, 'getBoundingClientRect').mockReturnValue({left:100, width:400} as DOMRect)
    fireEvent.pointerMove(board, {clientX:140})
    expect(screen.getByLabelText('Player 2 movement marker')).toHaveStyle({left:'10%'})
    const first = screen.getByRole('group', {name: 'Player 1 Dodgeball play area'})
    fireEvent.keyDown(first, {key: 'ArrowLeft'})
    for (let time = 3100; time <= 4800; time += 100) tick(time)
    expect(screen.getByText('-5 points · 0 dodges · 1 bonks')).toBeVisible()
    expect(screen.getByText('10 points · 1 dodges · 0 bonks')).toBeVisible()
    fireEvent.pointerLeave(board)
    expect(screen.queryByLabelText('Player 2 movement marker')).not.toBeInTheDocument()
    fireEvent.blur(first)
    expect(screen.queryByLabelText('Player 1 movement marker')).not.toBeInTheDocument()
  })
  it('consumes generic events in StrictMode, focuses results and replays cleanly', () => {
    const {rerender} = render(<StrictMode><Dodgeball {...props}/></StrictMode>); tick(3000)
    now = 4700
    rerender(<StrictMode><Dodgeball {...props} inputEvents={[{playerId:1, kind:'BODY_MOVE', x:.1,y:.5,confidence:1,timestamp:4700}]}/></StrictMode>)
    tick(4800)
    expect(screen.getByText('10 points · 1 dodges · 0 bonks')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', {name:'Dodgeball results'})).toHaveTextContent('Player 1: 10 points')
    expect(screen.getByRole('heading', {name:'Player 1 wins!'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button', {name:'Play again'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('group', {name:'Player 1 Dodgeball play area'})).toHaveFocus()
    expect(screen.getAllByText('0 points · 0 dodges · 0 bonks')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', {name:'Exit game'})); expect(props.onExit).toHaveBeenCalled()
  })
  it('freezes manual pauses, blocks camera recovery and restores focus', () => {
    const reconnect = vi.fn()
    const {rerender} = render(<Dodgeball {...props} onReconnect={reconnect}/>); tick(4000)
    fireEvent.click(screen.getByRole('button', {name:'Pause'})); tick(14000)
    expect(screen.getByText('59s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', {name:'Resume round'}))
    expect(screen.getByRole('button', {name:'Pause'})).toHaveFocus()
    rerender(<Dodgeball {...props} externalPauseReason="Camera disconnected" onReconnect={reconnect}/>)
    expect(screen.getByRole('button', {name:'Resume round'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {name:'Reconnect camera'})); expect(reconnect).toHaveBeenCalledOnce()
    rerender(<Dodgeball {...props}/>); fireEvent.click(screen.getByRole('button', {name:'Resume round'}))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
})
