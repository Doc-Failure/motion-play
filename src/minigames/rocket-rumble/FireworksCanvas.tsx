import {useEffect,useRef} from 'react'
import {colors,type RocketSnapshot} from './RocketModel'

/** Deterministic, bounded particle trails; the transparent canvas never dims the camera. */
export function FireworksCanvas({snapshot,playerId,reduced}:{snapshot:RocketSnapshot;playerId:number;reduced:boolean}){
 const ref=useRef<HTMLCanvasElement>(null)
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return
  const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2)
  if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
  const c=canvas.getContext('2d');if(!c)return;c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h)
  for(const r of snapshot.rockets.filter(r=>r.playerId===playerId)){
   const age=snapshot.elapsed-r.born;if(age>=900)continue
   const x=r.x*w,y=r.y*h,gradient=c.createLinearGradient(x,y,x,Math.min(h,y+100))
   gradient.addColorStop(0,colors[r.color]);gradient.addColorStop(1,'transparent');c.strokeStyle=gradient;c.lineWidth=3;c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x-8,y+40,x,y+100);c.stroke()
  }
  for(const b of snapshot.bursts.filter(b=>b.playerId===playerId)){
   const age=snapshot.elapsed-b.at;if(age< -180||age>1750)continue
   const x=b.x*w,y=b.y*h,scale=Math.min(w,h)
   if(age<0){c.strokeStyle=colors[b.color];c.lineWidth=3;c.beginPath();c.moveTo(x,y+70*(1+age/180));c.lineTo(x,y+8);c.stroke();continue}
   const t=age/1000,fade=Math.max(0,1-age/1750)
   c.strokeStyle=colors[b.color];c.fillStyle=colors[b.color]
   if(reduced){c.globalAlpha=fade;c.lineWidth=3;c.beginPath();c.arc(x,y,scale*.11,0,Math.PI*2);c.stroke();c.globalAlpha=1;continue}
   c.shadowColor=colors[b.color];c.shadowBlur=5
   const count=64
   for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2,seed=((i*37+b.id*17)%101)/101,speed=scale*(.13+seed*.18)
    const point=(s:number)=>{
     if(b.color===2){return {x:x+16*Math.sin(a)**3*scale*.012*(1-Math.exp(-s*4)),y:y-(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))*scale*.012*(1-Math.exp(-s*4))+s*s*scale*.025}}
     return {x:x+Math.cos(a)*speed*(1-Math.exp(-t*2.4))*.8*(s/(t||1)),y:y+Math.sin(a)*speed*(1-Math.exp(-t*2.4))*.8*(s/(t||1))+s*s*scale*(b.color===1?.13:.065)}
    }
    const p=point(t),tail=point(Math.max(0,t-.09-seed*.06));c.globalAlpha=fade*(.65+.35*Math.sin(i+age/90)**2);c.lineWidth=seed> .7?2.2:1.2;c.beginPath();c.moveTo(tail.x,tail.y);c.lineTo(p.x,p.y);c.stroke()
    c.fillStyle=i%5===0?'#fffbe1':colors[b.color];c.beginPath();c.arc(p.x,p.y,seed> .8?2:1.2,0,Math.PI*2);c.fill()
   }
   c.shadowBlur=0;c.globalAlpha=fade*.35;c.lineWidth=1;c.beginPath();c.arc(x,y,Math.min(scale*.22,t*scale*.35),0,Math.PI*2);c.stroke();c.globalAlpha=1
  }
 },[snapshot,playerId,reduced])
 return <canvas ref={ref} className="fireworks-canvas" aria-hidden="true"/>
}
