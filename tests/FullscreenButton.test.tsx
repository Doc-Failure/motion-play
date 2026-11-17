import {act,fireEvent,render,screen,waitFor} from '@testing-library/react'
import {afterEach,it,expect,vi} from 'vitest'
import {FullscreenButton} from '../src/design/FullscreenButton'
afterEach(()=>{vi.restoreAllMocks();Reflect.deleteProperty(document.documentElement,'requestFullscreen');Reflect.deleteProperty(document,'exitFullscreen');Reflect.deleteProperty(document,'fullscreenElement')})
it('tracks browser fullscreen changes, toggles the whole document, and reflects external exit',async()=>{
 let element:Element|null=null
 Object.defineProperty(document,'fullscreenElement',{configurable:true,get:()=>element})
 const sync=(value:Element|null)=>{element=value;document.dispatchEvent(new Event('fullscreenchange'))}
 const enter=vi.fn(async()=>sync(document.documentElement)),exit=vi.fn(async()=>sync(null))
 Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:enter});Object.defineProperty(document,'exitFullscreen',{configurable:true,value:exit})
 render(<FullscreenButton/>);fireEvent.click(screen.getByRole('button',{name:'Enter fullscreen'}))
 await waitFor(()=>expect(screen.getByRole('button',{name:'Exit fullscreen'})).toBeEnabled());expect(enter).toHaveBeenCalledOnce()
 fireEvent.click(screen.getByRole('button',{name:'Exit fullscreen'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Enter fullscreen'})).toBeEnabled());expect(exit).toHaveBeenCalledOnce()
 act(()=>sync(document.documentElement));act(()=>sync(null));expect(screen.getByRole('button',{name:'Enter fullscreen'})).toHaveAttribute('aria-pressed','false')
})
it('handles a denied request without claiming fullscreen or disabling retry',async()=>{
 Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:vi.fn().mockRejectedValue(new Error('Activation required'))})
 render(<FullscreenButton/>);fireEvent.click(screen.getByRole('button',{name:'Enter fullscreen'}))
 await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Click or press Enter'))
 expect(screen.getByRole('button',{name:'Enter fullscreen'})).toBeEnabled()
})
