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
    expect(document.querySelector('.dojo-effect--hit [data-sprite="recoil"]')).toBeVisible()
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
  it('shows a steady defeat pose when reduced motion is enabled',()=>{
    document.documentElement.classList.add('reduce-motion')
    try {
      const tick=clock()
      render(<NinjaTraining playerCount={1} onExit={vi.fn()}/>)
      tick(4100)
      expect(document.querySelector('.dojo-launch-burst')).toBeNull()
      fireEvent.click(screen.getByRole('button',{name:'Swat Player 1 ninja 1'}))
      expect(document.querySelector('.dojo-effect--hit [data-sprite="defeated"]')).toBeVisible()
      tick(4350)
      expect(document.querySelector('.dojo-effect--hit [data-sprite="defeated"]')).toBeVisible()
    } finally {
      document.documentElement.classList.remove('reduce-motion')
    }
  })
  it('changes the wind-up sprite at launch and freezes the burst with the round clock',()=>{
    const tick=clock(),props={playerCount:1 as const,onExit:vi.fn()}
    const {rerender}=render(<NinjaTraining {...props}/>)
    tick(3500)
    const ninja=screen.getByRole('button',{name:'Swat Player 1 ninja 1'})
    expect(ninja.querySelector('[data-sprite="ready"]')).toHaveStyle({backgroundImage:'url("/assets/minigames/paper-dojo/leaf-actions.webp")'})
    expect(ninja.querySelector('.dojo-launch-burst')).toBeNull()
    tick(3900)
    expect(ninja.querySelector('[data-sprite="leap"]')).toHaveStyle({backgroundImage:'url("/assets/minigames/paper-dojo/leaf-flight.webp")'})
    const burst=ninja.querySelector('.dojo-launch-burst')!
    const start=burst.getAttribute('style')
    tick(3990)
    const expanded=burst.getAttribute('style')
    expect(expanded).not.toBe(start)
    rerender(<NinjaTraining {...props} externalPauseReason="Camera disconnected"/>)
    tick(9000)
    expect(ninja.querySelector('.dojo-launch-burst')).toHaveAttribute('style',expanded!)
    rerender(<NinjaTraining {...props}/>)
    fireEvent.click(screen.getByRole('button',{name:'Resume round'}))
    tick(9350)
    expect(ninja.querySelector('.dojo-launch-burst')).toBeNull()
    expect(ninja).toBeEnabled()
  })
  it('supports uninterrupted keyboard/pointer strikes and a clean replay',()=>{
    const tick=clock();render(<NinjaTraining playerCount={1} onExit={vi.fn()}/>)
    tick(4100)
    fireEvent.click(screen.getByRole('button',{name:'Swat Player 1 ninja 1'}))
    for(let t=4500;t<21000;t+=500){
      tick(t)
      document.querySelectorAll<HTMLButtonElement>('.dojo-ninja--leap').forEach(n=>fireEvent.click(n))
    }
    tick(21700)
    expect(screen.queryByRole('button',{name:/bamboo/i})).not.toBeInTheDocument()
    const late=document.querySelector<HTMLButtonElement>('.dojo-ninja--leap')!
    expect(late).toBeEnabled()
    fireEvent.click(late)
    expect(document.querySelector('.dojo-effect--hit [data-sprite="recoil"]')).toBeVisible()
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

it('leaves the face clear and keeps player life in the HUD after a miss',()=>{
  const tick=clock()
  render(<NinjaTraining playerCount={1} onExit={vi.fn()}/>)
  tick(4100)
  const ninja=screen.getByRole('button',{name:'Swat Player 1 ninja 1'})
  expect(ninja).toHaveAccessibleDescription('1 of 1 health remaining')
  expect(ninja.querySelector('[data-sprite="leap"]')).toHaveAttribute('data-frame','0')
  tick(5100)
  expect(ninja.querySelector('[data-sprite="leap"]')).toHaveAttribute('data-frame','1')
  tick(5650)
  expect(ninja.querySelector('[data-sprite="leap"]')).toHaveAttribute('data-frame','2')
  tick(8050)
  expect(screen.getByRole('meter',{name:'Player 1 health'})).toHaveAttribute('aria-valuenow','3')
  expect(screen.queryByRole('button',{name:/obstacle/})).toBeNull()
  expect(document.querySelector('.score-burst')).toBeNull()
})
