import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PunchArena } from '../src/minigames/punch-arena/PunchArena'
let frame: FrameRequestCallback
let now=0
function tick(time:number){now=time;act(()=>frame(time))}
const props={playerCount:2 as const,random:()=>.5,onExit:vi.fn()}
describe('Punch Arena rendered simulation',()=>{
  beforeEach(()=>{
    now=0;vi.spyOn(performance,'now').mockImplementation(()=>now)
    vi.stubGlobal('requestAnimationFrame',vi.fn((callback:FrameRequestCallback)=>{frame=callback;return 1}))
    vi.stubGlobal('cancelAnimationFrame',vi.fn())
    vi.stubGlobal('PointerEvent',MouseEvent)
  })
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
  it.each([1,2,3,4] as const)('renders %i lanes with explicit simulation controls',playerCount=>{
    render(<PunchArena {...props} playerCount={playerCount}/> )
    expect(screen.getAllByRole('group',{name:/Punch Arena play area/})).toHaveLength(playerCount)
    expect(screen.getByText(/hand tracking unavailable/)).toBeVisible()
  })
  it('normalizes pointer strokes, requires speed, and breaks strokes on leave',()=>{
    render(<PunchArena {...props}/>);tick(3100)
    const board=screen.getByRole('group',{name:'Player 2 Punch Arena play area'})
    vi.spyOn(board,'getBoundingClientRect').mockReturnValue({left:100,top:50,width:400,height:200} as DOMRect)
    fireEvent.pointerMove(board,{clientX:300,clientY:210});tick(3200)
    fireEvent.pointerMove(board,{clientX:300,clientY:150})
    expect(screen.getByText('10 points')).toBeVisible()
    fireEvent.pointerLeave(board);tick(3300)
    fireEvent.pointerMove(board,{clientX:300,clientY:210})
    expect(screen.getByText('10 points')).toBeVisible()
  })
  it('consumes generic swipes in StrictMode and focuses results/replay',()=>{
    const {rerender}=render(<StrictMode><PunchArena {...props}/></StrictMode>);tick(3200)
    const events=[{playerId:1 as const,kind:'HAND_SWIPE' as const,x:.5,y:.5,confidence:1,timestamp:3200,swipe:{fromX:.5,fromY:.8,durationMs:100}}]
    rerender(<StrictMode><PunchArena {...props} inputEvents={events}/></StrictMode>)
    expect(screen.getByText('10 points')).toBeVisible()
    rerender(<StrictMode><PunchArena {...props} inputEvents={[...events]}/></StrictMode>)
    expect(screen.getByText('10 points')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog',{name:'Punch Arena results'})).toHaveTextContent('Player 1: 10 points')
    expect(screen.getByRole('heading',{name:'Great punching!'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button',{name:'Play again'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('group',{name:'Player 1 Punch Arena play area'})).toHaveFocus()
    expect(screen.getAllByText('0 points')).toHaveLength(2)
  })
  it('supports directional keyboard simulation without repeats',()=>{
    render(<PunchArena {...props}/>);tick(3200)
    const board=screen.getByRole('group',{name:'Player 1 Punch Arena play area'})
    fireEvent.keyDown(board,{key:'ArrowUp',repeat:true})
    expect(screen.getAllByText('0 points')).toHaveLength(2)
    fireEvent.keyDown(board,{key:'ArrowUp'})
    expect(screen.getByText('10 points')).toBeVisible()
    expect(screen.getByText('0 points')).toBeVisible()
  })
  it('preserves manual/camera/tab recovery and exit',()=>{
    const reconnect=vi.fn();const {rerender}=render(<PunchArena {...props} onReconnect={reconnect}/>);tick(4000)
    fireEvent.click(screen.getByRole('button',{name:'Pause'}));tick(14000)
    expect(screen.getByText('59s')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Resume round'}))
    expect(screen.getByRole('button',{name:'Pause'})).toHaveFocus()
    rerender(<PunchArena {...props} externalPauseReason="Camera disconnected" onReconnect={reconnect}/>)
    expect(screen.getByRole('button',{name:'Resume round'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'Reconnect camera'}));expect(reconnect).toHaveBeenCalledOnce()
    rerender(<PunchArena {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Resume round'}))
    vi.spyOn(document,'hidden','get').mockReturnValue(true);fireEvent(document,new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
    fireEvent.click(screen.getByRole('button',{name:'Return to setup'}));expect(props.onExit).toHaveBeenCalled()
  })
})
