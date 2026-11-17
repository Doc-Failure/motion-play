import {act,render,screen,fireEvent} from '@testing-library/react'
import {it,expect,vi,afterEach} from 'vitest'
import {RocketRumble} from '../src/minigames/rocket-rumble/RocketRumble'
import {NinjaTraining} from '../src/minigames/ninja-training/NinjaTraining'
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
for(const [name,Game] of [['Rocket Rumble',RocketRumble],['Paper Dojo',NinjaTraining]] as const)it(`${name} reports its final scores once and resets completion on replay`,()=>{
 let now=0,id=0;const frames=new Map<number,FrameRequestCallback>()
 vi.spyOn(performance,'now').mockImplementation(()=>now)
 vi.stubGlobal('requestAnimationFrame',vi.fn((callback:FrameRequestCallback)=>{frames.set(++id,callback);return id}))
 vi.stubGlobal('cancelAnimationFrame',vi.fn((key:number)=>frames.delete(key)))
 vi.stubGlobal('matchMedia',vi.fn(()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()})))
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(null)
 const advance=(time:number)=>{now=time;const callbacks=[...frames.values()];frames.clear();act(()=>callbacks.forEach(fn=>fn(time)))}
 const complete=vi.fn();render(<Game playerCount={2} onExit={()=>{}} onComplete={complete}/>)
 advance(65000);advance(66000)
 expect(complete).toHaveBeenCalledTimes(1);expect(complete).toHaveBeenCalledWith([{playerId:1,score:expect.any(Number)},{playerId:2,score:expect.any(Number)}]);expect(complete.mock.calls[0][0].every((s:{score:number})=>Number.isFinite(s.score))).toBe(true)
 now=70000;fireEvent.click(screen.getByRole('button',{name:'Play again'}));advance(135000)
 expect(complete).toHaveBeenCalledTimes(2)
})
