import { StrictMode } from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FruitSlash } from '../src/minigames/fruit-slash/FruitSlash'
let frame: FrameRequestCallback
let now=0
function tick(time:number){now=time;act(()=>frame(time))}
const props={playerCount:2 as const,random:()=>.5,onExit:vi.fn()}
describe('Fruit Slash rendered simulation',()=>{
  beforeEach(()=>{
    now=0;vi.spyOn(performance,'now').mockImplementation(()=>now)
    vi.stubGlobal('requestAnimationFrame',vi.fn((callback:FrameRequestCallback)=>{frame=callback;return 1}))
    vi.stubGlobal('cancelAnimationFrame',vi.fn())
    vi.stubGlobal('PointerEvent',MouseEvent)
  })
  afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
  it.each([1,2,3,4] as const)('renders %i lanes with explicit simulation controls',playerCount=>{
    render(<FruitSlash {...props} playerCount={playerCount}/> )
    expect(screen.getAllByRole('group',{name:/Fruit Slash play area/})).toHaveLength(playerCount)
    expect(screen.getByText(/Sweep your hand across the fruit/)).toBeVisible()
  })
  it('normalizes pointer strokes, requires speed, and breaks strokes on leave',()=>{
    render(<FruitSlash {...props}/>);tick(4100)
    const board=screen.getByRole('group',{name:'Player 2 Fruit Slash play area'})
    vi.spyOn(board,'getBoundingClientRect').mockReturnValue({left:100,top:50,width:400,height:200} as DOMRect)
    fireEvent.pointerMove(board,{clientX:140,clientY:110});tick(4200)
    fireEvent.pointerMove(board,{clientX:460,clientY:110})
    expect(screen.getByText('10 points')).toBeVisible()
    fireEvent.pointerLeave(board);tick(4300)
    fireEvent.pointerMove(board,{clientX:140,clientY:110})
    expect(screen.getByText('10 points')).toBeVisible()
  })
  it('consumes generic swipes in StrictMode and focuses results/replay',()=>{
    const {rerender}=render(<StrictMode><FruitSlash {...props}/></StrictMode>);tick(4200)
    const events=[{playerId:1 as const,kind:'HAND_SWIPE' as const,x:.9,y:.3,confidence:1,timestamp:4200,swipe:{fromX:.1,fromY:.3,durationMs:100}}]
    rerender(<StrictMode><FruitSlash {...props} inputEvents={events}/></StrictMode>)
    expect(screen.getByText('10 points')).toBeVisible()
    rerender(<StrictMode><FruitSlash {...props} inputEvents={[...events]}/></StrictMode>)
    expect(screen.getByText('10 points')).toBeVisible()
    tick(63000)
    expect(screen.getByRole('dialog',{name:'Fruit Slash results'})).toHaveTextContent('Player 1: 10 points')
    expect(screen.getByRole('heading',{name:'Nice slicing!'})).toHaveFocus()
    fireEvent.click(screen.getByRole('button',{name:'Play again'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('group',{name:'Player 1 Fruit Slash play area'})).toHaveFocus()
    expect(screen.getAllByText('0 points')).toHaveLength(2)
  })
  it('supports directional keyboard simulation without repeats',()=>{
    render(<FruitSlash {...props}/>);tick(4200)
    const board=screen.getByRole('group',{name:'Player 1 Fruit Slash play area'})
    fireEvent.keyDown(board,{key:'ArrowUp',repeat:true})
    expect(screen.getAllByText('0 points')).toHaveLength(2)
    fireEvent.keyDown(board,{key:'ArrowUp'})
    expect(screen.getByText('20 points')).toBeVisible()
    expect(screen.getByText('0 points')).toBeVisible()
  })
  it('preserves manual/camera/tab recovery and exit',()=>{
    const reconnect=vi.fn();const {rerender}=render(<FruitSlash {...props} onReconnect={reconnect}/>);tick(4000)
    fireEvent.click(screen.getByRole('button',{name:'Pause'}));tick(14000)
    expect(screen.getByText('59s')).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Resume round'}))
    expect(screen.getByRole('button',{name:'Pause'})).toHaveFocus()
    rerender(<FruitSlash {...props} externalPauseReason="Camera disconnected" onReconnect={reconnect}/>)
    expect(screen.getByRole('button',{name:'Resume round'})).toBeDisabled()
    fireEvent.click(screen.getByRole('button',{name:'Reconnect camera'}));expect(reconnect).toHaveBeenCalledOnce()
    rerender(<FruitSlash {...props}/>);fireEvent.click(screen.getByRole('button',{name:'Resume round'}))
    vi.spyOn(document,'hidden','get').mockReturnValue(true);fireEvent(document,new Event('visibilitychange'))
    expect(screen.getByRole('dialog')).toHaveTextContent('The tab was hidden')
    fireEvent.click(screen.getByRole('button',{name:'Return to setup'}));expect(props.onExit).toHaveBeenCalled()
  })
})
