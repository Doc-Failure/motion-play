import {HOP_MS,type Racer} from './RaceModel'

export type RacePose='run'|'jump'|'land'|'stumble'
/** Artwork follows the simulation clock, including pauses and replays. */
export function racePose(racer:Racer,elapsed:number):RacePose {
 if(elapsed<racer.stunUntil)return 'stumble'
 const age=elapsed-racer.jumpAt
 if(age>=0&&age<HOP_MS)return age<HOP_MS*.7?'jump':'land'
 return 'run'
}
