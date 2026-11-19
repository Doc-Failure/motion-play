import {BOXING_ATTACK_END_MS} from './boxingAttack'
import type {Boxer} from './BoxingModel'

export function boxerPose(boxer:Boxer,time:number):0|1|2|3 {
 if(boxer.health<=0)return 3
 if((boxer.cue==='hit'||boxer.cue==='body'||boxer.cue==='counter')&&time-boxer.cueAt<350)return 2
 if(boxer.attack>=0&&time-boxer.attack>=0&&time-boxer.attack<BOXING_ATTACK_END_MS)return 1
 return 0
}
