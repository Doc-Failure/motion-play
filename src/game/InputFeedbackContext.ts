import { createContext } from 'react'
import type { MotionInputEvent } from '../input/MotionProcessor'
export const InputFeedbackContext = createContext<{events: MotionInputEvent[]; playerCount: number; aspectRatio?: number}>({events:[],playerCount:1})
