import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { JumpRush } from '../src/minigames/jump-rush/JumpRush'
let frame: FrameRequestCallback
let now = 0
function tick(time: number) { now = time; act(() => frame(time)) }
const props = { playerCount: 2 as const, onExit: vi.fn() }

describe('JumpRush rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it.each([1,2,3,4] as const)('renders %i lanes and explains the input alternative', playerCount => {
    render(<JumpRush {...props} playerCount={playerCount}/>)
    expect(screen.getAllByRole('group', {name: /Jump Rush play area/})).toHaveLength(playerCount)
    expect(screen.getByText(/You are the kangaroo/)).toBeVisible()
  })
  it('normalizes pointer input and supports keyboard hopping without key repeat', () => {
    vi.stubGlobal('PointerEvent', MouseEvent)
    render(<JumpRush {...props}/>); tick(4500)
    const board=screen.getByRole('group',{name:'Player 2 Jump Rush play area'})
    vi.spyOn(board,'getBoundingClientRect').mockReturnValue({left:100,top:50,width:400,height:200} as DOMRect)
    fireEvent.pointerMove(board,{clientX:300,clientY:190});tick(4700)
    fireEvent.pointerMove(board,{clientX:300,clientY:140})
    expect(screen.getAllByLabelText('Hopping')).toHaveLength(1)
    const first=screen.getByRole('group',{name:'Player 1 Jump Rush play area'})
    fireEvent.keyDown(first,{key:'ArrowDown'});tick(4750)
    fireEvent.keyDown(first,{key:'ArrowUp',repeat:true})
    expect(screen.getAllByLabelText('Hopping')).toHaveLength(2)
    tick(4760);fireEvent.keyDown(first,{key:'ArrowUp'});tick(4800)
    expect(screen.getAllByText('10')).toHaveLength(2)
    fireEvent.pointerLeave(board);fireEvent.blur(first)
    expect(screen.queryByLabelText('Player 2 movement marker')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Player 1 movement marker')).not.toBeInTheDocument()
  })
  it('consumes generic events in StrictMode, focuses results and replays cleanly', () => {
    const {rerender} = render(<StrictMode><JumpRush {...props}/></StrictMode>); tick(3000)
    for (const [time,y] of [[4500,.7],[4700,.45]]) {
      now=time
      rerender(<StrictMode><JumpRush {...props} inputEvents={[{playerId:1,kind:'BODY_MOVE',x:.5,y,confidence:1,timestamp:time}]}/></StrictMode>)
      tick(time)
    }
    tick(4800)
    expect(screen.getByText('10')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog', {name:'Jump Rush results'})).toHaveTextContent('Player 1: 10 points')
    expect(screen.getByRole('heading', {name:'Player 1 wins!'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button', {name:'Play again'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', {name:'Exit game'})).toHaveFocus()
    expect(screen.getAllByText('0')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', {name:'Exit game'})); expect(props.onExit).toHaveBeenCalled()
  })
  it('freezes manual pauses, blocks camera recovery and restores focus', () => {
    const reconnect = vi.fn()
    const {rerender} = render(<JumpRush {...props} onReconnect={reconnect}/>); tick(4000)
    rerender(<JumpRush {...props} externalPauseReason="Camera disconnected"/>); tick(14000);rerender(<JumpRush {...props}/>)
    expect(screen.getByText('39s')).toBeVisible()
    fireEvent.click(screen.getByRole('button', {name:'Resume round'}))
    expect(screen.getByRole('button', {name:'Exit game'})).toHaveFocus()
    rerender(<JumpRush {...props} externalPauseReason="Camera disconnected" onReconnect={reconnect}/>)
    expect(screen.getByRole('button', {name:'Resume round'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button', {name:'Reconnect camera'})); expect(reconnect).toHaveBeenCalledOnce()
    rerender(<JumpRush {...props}/>); fireEvent.click(screen.getByRole('button', {name:'Resume round'}))
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
})
