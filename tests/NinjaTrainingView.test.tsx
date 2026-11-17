import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NinjaTraining } from '../src/minigames/ninja-training/NinjaTraining'
import type { MotionInputEvent } from '../src/input/MotionProcessor'

function clock(){
  let next:FrameRequestCallback|undefined, now=0
  vi.stubGlobal('requestAnimationFrame',vi.fn((callback:FrameRequestCallback)=>{next=callback;return 1}))
  vi.stubGlobal('cancelAnimationFrame',vi.fn())
  vi.spyOn(performance,'now').mockImplementation(()=>now)
  return (time:number)=>{now=time;act(()=>next?.(time))}
}
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks()})
describe('original Paper Dojo view',()=>{
  it('animates puppets, accepts generic camera input and pauses safely',()=>{
    const tick=clock(),exit=vi.fn()
    const {rerender}=render(<NinjaTraining playerCount={1} onExit={exit}/>)
    tick(4100)
    const ninja=screen.getByRole('button',{name:'Swat Player 1 ninja 1'})
    expect(ninja).toBeEnabled()
    expect(ninja).toHaveClass('dojo-ninja--leap')
    const x=parseFloat(ninja.style.left)/100,y=parseFloat(ninja.style.top)/100
    const event:MotionInputEvent={playerId:1,kind:'MOTION_HIT',x,y,confidence:1,timestamp:4100}
    rerender(<NinjaTraining playerCount={1} onExit={exit} inputEvents={[event]}/>)
    expect(screen.getByText('POW!')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.queryByRole('button',{name:'Pause'})).not.toBeInTheDocument()
    const hidden=vi.spyOn(document,'hidden','get').mockReturnValue(true);fireEvent(document,new Event('visibilitychange'))
    tick(30000)
    expect(screen.getByRole('dialog',{name:'Paper Dojo paused'})).toBeVisible()
    hidden.mockReturnValue(false);fireEvent(document,new Event('visibilitychange'))
    fireEvent.click(screen.getByRole('button',{name:'Resume round'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:'Exit game'}));expect(exit).toHaveBeenCalled()
  })
  it('supports uninterrupted keyboard/pointer strikes and a clean replay',()=>{
    const tick=clock();render(<NinjaTraining playerCount={1} onExit={vi.fn()}/>)
    tick(4100)
    fireEvent.click(screen.getByRole('button',{name:'Swat Player 1 ninja 1'}))
    tick(21500)
    expect(screen.queryByRole('button',{name:/bamboo/i})).not.toBeInTheDocument()
    const late=document.querySelector<HTMLButtonElement>('.dojo-ninja--leap')!
    expect(late).toBeEnabled()
    fireEvent.click(late)
    expect(screen.getByText('POW!')).toBeInTheDocument()
    expect(screen.queryByText(/Bamboo burst/i)).not.toBeInTheDocument()
    tick(64000)
    expect(screen.getByRole('dialog',{name:'Paper Dojo results'})).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'Play again'}))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })
  it('renders four independent lanes and disables resume during external recovery',()=>{
    const tick=clock(),props={playerCount:4 as const,onExit:vi.fn()}
    const {rerender}=render(<NinjaTraining {...props}/>);tick(4100)
    for(const id of [1,2,3,4])expect(screen.getByLabelText(`Player ${id} Paper Dojo play area`)).toBeVisible()
    rerender(<NinjaTraining {...props} externalPauseReason="Camera disconnected"/>)
    expect(screen.getByRole('dialog',{name:'Paper Dojo paused'})).toHaveTextContent('Camera disconnected')
    expect(screen.getByRole('button',{name:'Resume round'})).toBeDisabled()
  })
})

describe('Paper Dojo obstacle simulation',()=>{
  it('renders warning, normalized BODY_MOVE contact, player isolation and one penalty per obstacle',()=>{
    const tick=clock(),props={playerCount:4 as const,onExit:vi.fn()}
    const {rerender}=render(<NinjaTraining {...props}/>);tick(7200)
    expect(screen.getByRole('button',{name:'Player 3 obstacle: warning'})).toBeDisabled()
    tick(8000)
    const event:MotionInputEvent={playerId:3,kind:'BODY_MOVE',x:.3,y:.62,confidence:1,timestamp:8000}
    rerender(<NinjaTraining {...props} inputEvents={[event]}/>)
    expect(screen.getByRole('button',{name:'Player 3 obstacle: bumped'})).toBeDisabled()
    expect(screen.getByRole('button',{name:'Player 1 obstacle: avoid'})).toBeEnabled()
    expect(screen.getByText('BUMP!')).toBeVisible()
    const score=document.querySelectorAll('.dojo-game header dd')[2].textContent
    rerender(<NinjaTraining {...props} inputEvents={[{...event}]}/>)
    expect(document.querySelectorAll('.dojo-game header dd')[2]).toHaveTextContent(score!)
  })
  it('offers keyboard/pointer simulation with a compact action cue',()=>{
    const tick=clock();render(<NinjaTraining playerCount={1} onExit={vi.fn()}/>);tick(8000)
    fireEvent.click(screen.getByRole('button',{name:'Player 1 obstacle: avoid'}))
    expect(screen.getByText('BUMP!')).toBeVisible()
    expect(screen.getByText(/Swat ninjas · keep clear of marked obstacles/)).toBeVisible()
    tick(9000)
    expect(screen.queryByRole('button',{name:/obstacle/})).not.toBeInTheDocument()
  })
})
