import {act,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,it,expect,vi} from 'vitest'
import {WindowWipe} from '../src/minigames/window-wipe/WindowWipe'
import {gameAudio} from '../src/audio/GameAudio'
function clock(){let now=0,frame:FrameRequestCallback=()=>{};vi.spyOn(performance,'now').mockImplementation(()=>now);vi.stubGlobal('requestAnimationFrame',vi.fn((fn:FrameRequestCallback)=>{frame=fn;return 1}));vi.stubGlobal('cancelAnimationFrame',vi.fn());return(time:number)=>{now=time;act(()=>frame(time))}}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
it('renders layered soap, gives scrub feedback only for new cleaning and preserves recovery',()=>{
 const tick=clock(),play=vi.spyOn(gameAudio,'play'),exit=vi.fn()
 const props={playerCount:2 as const,onExit:exit},view=render(<WindowWipe {...props}/>);tick(3100)
 const event={playerId:2 as const,kind:'MOTION_BRUSH' as const,x:.5,y:.5,confidence:1,timestamp:3100}
 view.rerender(<WindowWipe {...props} inputEvents={[event]}/> )
 expect(screen.getByLabelText('Player 2 window cleaning progress')).not.toHaveAttribute('aria-valuenow','0')
 expect(screen.getByLabelText('Player 1 window cleaning progress')).toHaveAttribute('aria-valuenow','0')
 expect(document.querySelectorAll('.wipe-foam')).toHaveLength(2)
 expect(document.querySelectorAll('.wipe-squeegee')).toHaveLength(1)
 expect(play).toHaveBeenCalledWith('scrub','wash')
 const before=play.mock.calls.filter(call=>call[0]==='scrub').length
 view.rerender(<WindowWipe {...props} inputEvents={[{...event}]}/> )
 expect(play.mock.calls.filter(call=>call[0]==='scrub')).toHaveLength(before)
 view.rerender(<WindowWipe {...props} externalPauseReason="Camera disconnected"/> )
 expect(screen.getByRole('dialog',{name:'Window Wipe paused'})).toBeVisible()
 expect(screen.getByRole('button',{name:'Resume round'})).toBeDisabled()
 fireEvent.click(screen.getByRole('button',{name:'Return to setup'}));expect(exit).toHaveBeenCalled()
})
it('reports cumulative tournament scores once and resets completion on replay',()=>{
 const tick=clock(),complete=vi.fn();render(<WindowWipe playerCount={2} onExit={()=>{}} onComplete={complete}/>)
 tick(65000);tick(66000)
 expect(complete).toHaveBeenCalledTimes(1)
 expect(complete).toHaveBeenCalledWith([{playerId:1,score:0},{playerId:2,score:0}])
 fireEvent.click(screen.getByRole('button',{name:'Wipe again'}));tick(130000)
 expect(complete).toHaveBeenCalledTimes(2)
})
