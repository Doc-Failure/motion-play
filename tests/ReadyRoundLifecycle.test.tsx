import {useCallback,useState} from 'react'
import {act,fireEvent,render,screen} from '@testing-library/react'
import {afterEach,it,expect,vi} from 'vitest'
import {GameSession} from '../src/game/GameSession'
import {InputFeedbackContext} from '../src/game/InputFeedbackContext'
import {useRoundRecovery} from '../src/game/useRoundRecovery'
afterEach(()=>vi.restoreAllMocks())
it('pauses initial and replay countdowns until the shared gate releases them',()=>{
 let now=0;vi.spyOn(performance,'now').mockImplementation(()=>now)
 const model=new GameSession({playerCount:1,roundDurationMs:1000})
 function Round({blocked}:{blocked:boolean}){
  const [snapshot,setSnapshot]=useState(()=>model.start(now))
  const recovery=useRoundRecovery({model,snapshot,setSnapshot,title:'Round',externalPauseReason:blocked?'Ready check':null,onExit:()=>{}})
  return <><output>{snapshot.phase}</output>{recovery.pauseDialog}<button onClick={()=>setSnapshot(model.update(now))}>Tick</button><button onClick={()=>setSnapshot(model.start(now))}>Replay</button></>
 }
 function Harness(){
  const [gate,setGate]=useState(false),request=useCallback(()=>setGate(true),[])
  return <InputFeedbackContext.Provider value={{events:[],playerCount:1,readyGateActive:gate,requestReadyGate:request}}><span data-testid="gate">{String(gate)}</span><button onClick={()=>setGate(false)}>Release</button><Round blocked={gate}/></InputFeedbackContext.Provider>
 }
 render(<Harness/>);expect(screen.getByTestId('gate')).toHaveTextContent('true');expect(screen.getByRole('status')).toHaveTextContent('paused')
 now=5000;fireEvent.click(screen.getByText('Release'));expect(screen.getByRole('status')).toHaveTextContent('countdown')
 now=8000;fireEvent.click(screen.getByText('Tick'));expect(screen.getByRole('status')).toHaveTextContent('playing')
 now=9000;fireEvent.click(screen.getByText('Tick'));expect(screen.getByRole('status')).toHaveTextContent('results')
 now=10000;fireEvent.click(screen.getByText('Replay'));expect(screen.getByTestId('gate')).toHaveTextContent('true');expect(screen.getByRole('status')).toHaveTextContent('paused')
 now=20000;act(()=>fireEvent.click(screen.getByText('Tick')));expect(screen.getByRole('status')).toHaveTextContent('paused')
 fireEvent.click(screen.getByText('Release'));expect(screen.getByRole('status')).toHaveTextContent('countdown')
 expect(screen.getByTestId('gate')).toHaveTextContent('false')
})
