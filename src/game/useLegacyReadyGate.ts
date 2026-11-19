import {useContext,useEffect,useRef} from 'react'
import {InputFeedbackContext} from './InputFeedbackContext'
import type {GameSessionPhase} from './GameSession'

/** Older games own their pause dialogs. Bridge only the shared physical ready check. */
export function useLegacyReadyGate(phase:GameSessionPhase,externalPauseReason:string|null|undefined,resume:()=>void){
  const {readyGateActive,requestReadyGate}=useContext(InputFeedbackContext)
  const previous=useRef({readyGateActive,phase})
  useEffect(()=>{
    const before=previous.current
    previous.current={readyGateActive,phase}
    if(before.phase==='results'&&phase==='countdown')requestReadyGate?.()
    if(before.readyGateActive&&!readyGateActive&&phase==='paused'&&!externalPauseReason&&!document.hidden)resume()
  },[phase,readyGateActive,requestReadyGate,externalPauseReason,resume])
}
