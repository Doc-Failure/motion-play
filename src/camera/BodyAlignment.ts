import type {StickBody,PosePoint} from './poseTracking'
export interface AlignmentState { ready:boolean; progress:number; message:string }
/** Framing/reacquisition check, never an artificial offset applied to measured joints. */
export class BodyAlignment {
 private start:number|null=null
 private previous=-Infinity
 private anchor:PosePoint[]=[]
 private samples=0
 constructor(readonly players:number){}
 observe(bodies:StickBody[],time:number,aspect=1):AlignmentState{
  const reset=(message:string):AlignmentState=>{this.start=null;this.anchor=[];this.samples=0;this.previous=time;return {ready:false,progress:0,message}}
  if(bodies.length!==this.players)return reset(`Face the camera · ${bodies.length} of ${this.players} players visible`)
  const anchors:PosePoint[]=[]
  for(let i=0;i<bodies.length;i++){
   const b=bodies[i],who=`Player ${i+1}`
   if(!b.head||b.torso.length!==2||b.arms.length!==2||b.hands.length!==2)return reset(`${who}: keep your head, hips and both arms visible`)
   if(Math.abs(b.neck.x-(i+.5)/this.players)>.35/this.players)return reset(`${who}: stand in the middle of your lane`)
   const joints=[b.head,...b.torso,...b.arms.flat()]
   if(joints.some(p=>p.x<.035||p.x>.965||p.y<.04||p.y>.96)||b.torso[1].y-b.neck.y>.5)return reset(`${who}: step back so your arms and hips fit`)
   if(b.torso[1].y-b.neck.y<.12)return reset(`${who}: move a little closer`)
   if(b.hands.some(p=>p.y>b.neck.y-.03))return reset(`${who}: raise both hands above your shoulders`)
   anchors.push(b.neck,b.torso[1],...b.hands)
  }
  const moved=this.anchor.length!==anchors.length||anchors.some((p,i)=>Math.hypot((p.x-this.anchor[i].x)*aspect,p.y-this.anchor[i].y)>.025)
  if(this.start===null||time-this.previous>400||time<=this.previous||moved){this.start=time;this.anchor=anchors.map(p=>({...p}));this.samples=0}
  this.previous=time;this.samples++
  const progress=Math.min(1,(time-this.start)/2000)
  const ready=progress===1&&this.samples>=8
  return {ready,progress:ready?1:Math.min(progress,.95),message:ready?'Ready! Lower your hands and move to check the stick person.':`Hold still · ${Math.max(1,Math.ceil((2000-(time-this.start))/1000))}s`}
 }
}
