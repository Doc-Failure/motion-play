import {act,render,screen,fireEvent} from '@testing-library/react'
import {afterEach,it,expect,vi} from 'vitest'
import {BeatFreak} from '../src/minigames/beat-freak/BeatFreak'
import {gameAudio} from '../src/audio/GameAudio'
function clock(){let now=0,next:FrameRequestCallback=()=>{};vi.spyOn(performance,'now').mockImplementation(()=>now);vi.stubGlobal('requestAnimationFrame',vi.fn((fn:FrameRequestCallback)=>{next=fn;return 1}));vi.stubGlobal('cancelAnimationFrame',vi.fn());return(time:number)=>{now=time;act(()=>next(time))}}
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
it('animates records, scores a normalized arm strike and emits the matching instrument once',()=>{
 const tick=clock(),strike=vi.spyOn(gameAudio,'rhythmStrike'),props={playerCount:2 as const,onExit:vi.fn()}
 const view=render(<BeatFreak {...props}/>);tick(4700)
 expect(document.querySelectorAll('.beat-note')).toHaveLength(4)
 tick(5400)
 const event={playerId:2 as const,kind:'MOTION_HIT' as const,x:.18,y:.32,confidence:1,timestamp:5400}
 view.rerender(<BeatFreak {...props} inputEvents={[event]}/> )
 expect(document.querySelectorAll('header dd')[1]).toHaveTextContent('15')
 expect(document.querySelectorAll('header dd')[0]).toHaveTextContent('0')
 expect(screen.getByText('PERFECT!')).toBeVisible();expect(strike).toHaveBeenCalledWith(0,true)
 view.rerender(<BeatFreak {...props} inputEvents={[{...event}]}/> );expect(strike).toHaveBeenCalledTimes(1)
 view.rerender(<BeatFreak {...props} externalPauseReason="Camera disconnected"/> )
 expect(screen.getByRole('button',{name:'Resume round'})).toBeDisabled()
})
it('supports direct speaker keyboard activation, number keys and cumulative completion/replay',()=>{
 const tick=clock(),complete=vi.fn();render(<BeatFreak playerCount={1} onExit={()=>{}} onComplete={complete}/>);tick(5400)
 fireEvent.click(screen.getByRole('button',{name:'Player 1 Kick speaker 1'}))
 expect(document.querySelector('header dd')).toHaveTextContent('15')
 tick(6000);const board=screen.getByRole('group',{name:'Player 1 Paper Jam play area'})
 fireEvent.keyUp(board,{key:'2'});expect(document.querySelector('header dd')).toHaveTextContent('30')
 tick(65000);tick(66000);expect(complete).toHaveBeenCalledTimes(1)
 expect(screen.getByRole('dialog').querySelector('h2')).toHaveFocus()
 fireEvent.click(screen.getByRole('button',{name:'Play again'}));tick(130000)
 expect(complete).toHaveBeenCalledTimes(2)
})
