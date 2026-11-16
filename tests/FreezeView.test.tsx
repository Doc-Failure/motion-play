import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Freeze } from '../src/minigames/freeze/Freeze'
let frame: FrameRequestCallback
let now = 0
function tick(time: number) { now = time; act(() => frame(time)) }
const props = { playerCount: 2 as const, onExit: vi.fn() }
function still(start=6000,end=7200) { for(let t=start;t<=end;t+=100) tick(t) }
describe('Freeze rendered simulation', () => {
  beforeEach(() => {
    now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
  })
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })
  it.each([1,2,3,4] as const)('renders %i transparent lanes with honest input guidance', playerCount => {
    render(<Freeze {...props} playerCount={playerCount}/>)
    expect(screen.getAllByRole('group',{name:/Freeze! play area/})).toHaveLength(playerCount)
    expect(screen.getByText(/not poses or player presence/)).toBeVisible()
    expect(screen.getByText(/webcam play unverified/)).toBeVisible()
  })
  it('supports pointer and Space-key movement, stillness, false moves and isolated scores', () => {
    render(<Freeze {...props}/>);tick(3000)
    const first=screen.getByRole('group',{name:'Player 1 Freeze! play area'})
    const second=screen.getByRole('group',{name:'Player 2 Freeze! play area'})
    fireEvent.pointerMove(first);fireEvent.keyDown(second,{code:'Space'});tick(3100)
    tick(5400);fireEvent.keyUp(second,{code:'Space'});still()
    expect(screen.getAllByText('10 points · 1 statues')).toHaveLength(2)
    expect(screen.getByRole('progressbar',{name:'Player 1 stillness progress'})).toHaveValue(1200)
    fireEvent.pointerMove(first);tick(7250)
    expect(screen.getByText('5 points · 1 statues')).toBeVisible()
    fireEvent.pointerLeave(first);fireEvent.blur(second)
    expect(screen.getByRole('progressbar',{name:'Player 2 stillness progress'})).toHaveValue(0)
  })
  it('consumes generic events in StrictMode, focuses results and replays cleanly', () => {
    const {rerender}=render(<StrictMode><Freeze {...props}/></StrictMode>)
    for(const time of [3100,...Array.from({length:13},(_,i)=>6000+i*100)]) {
      now=time
      rerender(<StrictMode><Freeze {...props} inputEvents={[{kind:'FREEZE',playerId:2,x:.5,y:.5,confidence:1,activity:time===3100 ? .1 : 0,timestamp:time}]}/></StrictMode>)
      tick(time)
    }
    tick(63000)
    expect(screen.getByRole('dialog',{name:'Freeze! results'})).toHaveTextContent('Player 2: 10 points')
    expect(screen.getByRole('heading',{name:'Player 2 wins!'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button',{name:'Play again'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getAllByText('0 points · 0 statues')).toHaveLength(2)
    expect(screen.getByRole('group',{name:'Player 1 Freeze! play area'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button',{name:'Exit game'}));expect(props.onExit).toHaveBeenCalled()
  })
  it('pauses the clock, clears simulation and blocks resume through camera and tab recovery', () => {
    const reconnect=vi.fn()
    const {rerender}=render(<Freeze {...props} onReconnect={reconnect}/>);tick(3100)
    const first=screen.getByRole('group',{name:'Player 1 Freeze! play area'})
    fireEvent.keyDown(first,{code:'Space'});tick(3200)
    fireEvent.click(screen.getByRole('button',{name:'Pause'}));tick(13200)
    expect(screen.getByText('60s')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Resume round'}))
    expect(screen.getByRole('button',{name:'Pause'})).toHaveFocus()
    still(16000,17200);expect(screen.getAllByText('0 points · 0 statues')).toHaveLength(2)
    rerender(<Freeze {...props} externalPauseReason="Camera disconnected" onReconnect={reconnect}/>)
    expect(screen.getByRole('button',{name:'Resume round'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'Reconnect camera'}));expect(reconnect).toHaveBeenCalledOnce()
    rerender(<Freeze {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Resume round'}))
    vi.spyOn(document,'hidden','get').mockReturnValue(true)
    fireEvent(document,new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
  })
})
