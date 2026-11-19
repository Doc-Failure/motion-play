import { createContext } from 'react'
import type { MotionInputEvent } from '../input/MotionProcessor'
export const InputFeedbackContext = createContext<{events: MotionInputEvent[]; playerCount: number; aspectRatio?: number; readyGateActive?:boolean; requestReadyGate?:()=>void; workshopHud?:{title:string;exit():void}}>({events:[],playerCount:1})
