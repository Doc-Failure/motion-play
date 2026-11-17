import {STEP_MS} from './BeatModel'
/** Absolute round-grid lookahead, independent of visual frame rate. */
export class BeatScheduler {
 private next:number|null=null
 reset(){this.next=null}
 pump(elapsed:number,duration:number,schedule:(step:number,delaySeconds:number)=>void){
  if(!Number.isFinite(elapsed)||elapsed<0)return
  if(this.next===null||this.next*STEP_MS<elapsed-STEP_MS)this.next=elapsed%STEP_MS<=8?Math.floor(elapsed/STEP_MS):Math.ceil(elapsed/STEP_MS)
  while(this.next*STEP_MS<=elapsed+120&&this.next*STEP_MS<duration){
   const delay=this.next*STEP_MS-elapsed
   if(delay>=-8)schedule(this.next,Math.max(0,delay)/1000)
   this.next++
  }
 }
}
