import type {BodyMask} from '../../input/MotionProcessor'
import {armVector,type Pose} from './poses'

/** World units are fractions of camera height, so the printed and scored limbs keep their proportions. */
export interface Stroke {x:number;y:number;endX:number;endY:number;r:number}
export interface Cutout extends BodyMask {area:number;forearms:number[][];strokes:Stroke[];aspect:number}

export function makeCutout(pose:Pose, seat:number, count:number, aspect:number):Cutout {
  const height=96,width=Math.max(1,Math.min(240,Math.round(height*aspect)))
  const cx=(seat+.5)*aspect/count, scale=Math.min(1.12,aspect/count/.68)
  const cy=count>=3?.46:.50
  const strokes:Stroke[]=[]
  const sleeves=new Map<Stroke,number[]>()
  const limb=(x:number,y:number,endX:number,endY:number,r:number)=>strokes.push({
    x:cx+x*scale,y:cy+y*scale,endX:cx+endX*scale,endY:cy+endY*scale,r:r*scale})
  limb(0,-.30,0,-.27,.058)
  limb(0,-.23,0,-.18,.034)
  limb(0,-.13,0,.045,.089)
  limb(-.028,-.15,.028,-.15,.066)
  for(let side=0;side<2;side++){
    const sign=side?1:-1,[dx,dy]=armVector(pose[side],side)
    const shoulder=.065*sign, elbow=shoulder+.115*dx+.018*sign
    limb(shoulder,-.17,elbow,-.17+.115*dy,.034)
    limb(elbow,-.17+.115*dy,shoulder+.238*dx,-.17+.238*dy,.027)
    sleeves.set(strokes[strokes.length-1],[])
    limb(sign*.040,.055,sign*.072,.23,.048)
    limb(sign*.072,.23,sign*.097,.385,.038)
    limb(sign*.097,.385,sign*.124,.39,.029)
  }
  const cells=new Uint8Array(width*height)
  let area=0
  for(const s of strokes){
    const sleeve=sleeves.get(s)
    const dx=s.endX-s.x,dy=s.endY-s.y,length=dx*dx+dy*dy
    const left=Math.max(0,Math.floor((Math.min(s.x,s.endX)-s.r)/aspect*width))
    const right=Math.min(width,Math.ceil((Math.max(s.x,s.endX)+s.r)/aspect*width))
    const top=Math.max(0,Math.floor((Math.min(s.y,s.endY)-s.r)*height))
    const bottom=Math.min(height,Math.ceil((Math.max(s.y,s.endY)+s.r)*height))
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      const px=(x+.5)*aspect/width-s.x,py=(y+.5)/height-s.y
      const t=length?Math.max(0,Math.min(1,(px*dx+py*dy)/length)):0
      const i=y*width+x
      if((px-t*dx)**2+(py-t*dy)**2>s.r*s.r)continue
      if(sleeve)sleeve.push(i)
      if(!cells[i]){cells[i]=1;area++}
    }
  }
  return {width,height,cells,area,forearms:[...sleeves.values()],strokes,aspect}
}

export function measureFit(body:BodyMask,target:Cutout){
  if(body.width!==target.width||body.height!==target.height||body.cells.length!==target.cells.length)return null
  let occupied=0,inside=0
  for(let i=0;i<body.cells.length;i++)if(body.cells[i]){occupied++;inside+=target.cells[i]}
  if(occupied<5)return null
  const sleevesFilled=target.forearms.every(indices=>indices.length>0 &&
    indices.reduce((sum,i)=>sum+body.cells[i],0)>=indices.length*.24)
  return {outside:1-inside/occupied,empty:1-inside/target.area,sleevesFilled}
}

export type Fit=NonNullable<ReturnType<typeof measureFit>>

// Small variations in clothing, body shape and segmentation are free.
export function fitDeductions(fit:Pick<Fit,'outside'|'empty'>){
  return {outside:Math.round(Math.max(0,fit.outside-.10)*12),empty:Math.round(Math.max(0,fit.empty-.15)*12)}
}
