/** Faces follow the same simulation clock and contact charge as the ghost. */
export function ghostPose(elapsed:number,charge:number,caught:boolean,reduced:boolean):0|1|2|3 {
 if(caught)return 3
 if(charge>0)return 2
 return reduced?0:Math.floor(elapsed/600)%2 as 0|1
}
