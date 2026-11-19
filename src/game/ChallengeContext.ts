import {createContext,useContext} from 'react'
import type {ArcadeGame} from './arcade'

interface Challenge {
  game:ArcadeGame
  level:number
  continuing:boolean
  pressure:number
  players:number
  team:boolean
  nextLevel():void
  replaySolo?(score:number):void
}
export const ChallengeContext=createContext<Challenge|null>(null)
export function useChallenge(){return useContext(ChallengeContext)}
