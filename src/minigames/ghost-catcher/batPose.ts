/** Flap from simulation time; the startled face signals a touch in progress. */
export function batPose(elapsed:number,charge:number,reduced:boolean):0|1|2|3 {
 if(charge>0)return 3
 if(reduced)return 1
 return ([0,1,2,1] as const)[Math.floor(elapsed/140)%4]
}
