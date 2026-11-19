import type {Shot} from './SportsModel'

/** Sheet cells follow the shot clock; no independent animation timer can drift. */
export function kickerPose(shot:Shot,elapsed:number):0|1|2|3 {
 if(shot.state!=='incoming')return 0
 if(shot.progress===0)return elapsed-shot.resolved>=180?1:0
 if(shot.progress<.16)return 2
 if(shot.progress<.32)return 3
 return 0
}
