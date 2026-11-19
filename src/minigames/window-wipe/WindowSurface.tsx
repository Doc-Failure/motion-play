import { useLayoutEffect, useRef, useState } from 'react'
import { type WindowWipeSnapshot } from './WindowWipeModel'

function random(seed:number){return()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646}}
const palettes=[['#d3e7f1','#fff4e9','#adccd9'],['#e9dbf3','#fff5e5','#c2a8d3'],['#d7eddd','#fff6d6','#a5cbb7']]
function foam(ctx:CanvasRenderingContext2D,width:number,height:number,index:number){
 const rng=random(9107+index*271),[base,cream,shadow]=palettes[index%3],size=Math.min(width,height)
 ctx.clearRect(0,0,width,height);ctx.globalCompositeOperation='source-over'
 ctx.globalAlpha=.65;ctx.fillStyle=base;ctx.fillRect(0,0,width,height)
 ctx.globalAlpha=.35
 for(let i=0;i<115;i++){
  ctx.fillStyle=i%3===0?cream:base;ctx.beginPath();ctx.ellipse(rng()*width,rng()*height,size*(.035+rng()*.12),size*(.025+rng()*.08),rng()*Math.PI,0,Math.PI*2);ctx.fill()
 }
 // Chalky swoops keep the foam handmade; no rectangular smudge tiles.
 ctx.lineCap='round';ctx.lineWidth=Math.max(2,size*.009);ctx.strokeStyle=cream;ctx.globalAlpha=.22
 for(let i=0;i<55;i++){const x=rng()*width,y=rng()*height;ctx.beginPath();ctx.moveTo(x,y);ctx.quadraticCurveTo(x+size*.11,y-size*.06,x+size*.2,y-size*.01);ctx.stroke()}
 for(let i=0;i<95;i++){
  const x=rng()*width,y=rng()*height,r=size*(.004+rng()*.025)
  ctx.globalAlpha=.55;ctx.fillStyle=cream;ctx.strokeStyle=i%3?cream:shadow;ctx.lineWidth=Math.max(1,size*.002)
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke()
  ctx.globalAlpha=.8;ctx.strokeStyle='#fff';ctx.beginPath();ctx.arc(x,y,r*.65,Math.PI,Math.PI*1.5);ctx.stroke()
 }
 ctx.globalAlpha=1
}
function sparkle(ctx:CanvasRenderingContext2D,x:number,y:number,r:number){ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.quadraticCurveTo(x,y,x,y+r);ctx.quadraticCurveTo(x,y,x-r,y);ctx.quadraticCurveTo(x,y,x,y-r);ctx.fill()}

/** Model-owned brush discs drive paint; the hidden coverage grid never becomes artwork. */
export function WindowSurface({snapshot,index}:{snapshot:WindowWipeSnapshot;index:number}){
 const mask=useRef<HTMLCanvasElement>(null),particles=useRef<HTMLCanvasElement>(null),painted=useRef({index:-1,count:0,width:0,height:0})
 const [size,setSize]=useState({width:640,height:480})
 const reduced=()=>document.documentElement.classList.contains('reduce-motion')||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
 useLayoutEffect(()=>{
  const element=mask.current?.parentElement;if(!element)return
  const resize=()=>{const r=element.getBoundingClientRect();if(!r.width||!r.height)return;const scale=Math.min(devicePixelRatio||1,1.5,1000/r.width,1200/r.height);setSize({width:Math.round(r.width*scale),height:Math.round(r.height*scale)})}
  resize();if(typeof ResizeObserver==='undefined')return
  const observer=new ResizeObserver(resize);observer.observe(element);return()=>observer.disconnect()
 },[])
 useLayoutEffect(()=>{
  // jsdom has no raster context. Browser acceptance exercises the real renderer.
  if(typeof CanvasRenderingContext2D==='undefined')return
  const ctx=mask.current?.getContext('2d'),fx=particles.current?.getContext('2d');if(!ctx||!fx)return
  const {width,height}=size,dabs=snapshot.dabs,prior=painted.current
  const reset=prior.index!==index||prior.width!==width||prior.height!==height||dabs.length<prior.count
  if(reset){foam(ctx,width,height,index);prior.count=0}
  ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000'
  for(let i=prior.count;i<dabs.length;i++){
   const dab=dabs[i];ctx.save();ctx.translate(dab.x*width,dab.y*height);ctx.scale(dab.radiusX*width,dab.radiusY*height)
   const feather=ctx.createRadialGradient(0,0,.88,0,0,1);feather.addColorStop(0,'#000');feather.addColorStop(1,'#0000');ctx.fillStyle=feather
   ctx.beginPath();ctx.arc(0,0,1,0,Math.PI*2);ctx.fill();ctx.restore()
  }
  ctx.globalCompositeOperation='source-over';painted.current={index,count:dabs.length,width,height}
  fx.clearRect(0,0,width,height)
  const small=Math.min(width,height),still=reduced()
  for(const effect of snapshot.effects){
   const age=(snapshot.elapsed-effect.born)/1000;if(age<0||age>1.2)continue
   const count=effect.kind==='window'?20:effect.kind==='pop'?11:5
   for(let i=0;i<count;i++){
    const angle=i*2.39996+effect.id,travel=still?0:age*small*(effect.kind==='window'?.7:.16)
    const x=effect.x*width+Math.cos(angle)*travel,y=effect.y*height+Math.sin(angle)*travel-(still?0:age*small*.08)
    const radius=small*(effect.kind==='scrub'?.008:.018)*(1-age*.45)
    fx.globalAlpha=Math.max(0,1-age/(effect.kind==='window'?1.2:.85))
    if(effect.kind==='scrub'){fx.strokeStyle=i%2?'#fffbee':'#c5edff';fx.lineWidth=Math.max(1,small*.003);fx.beginPath();fx.arc(x,y,radius*(1+age),0,Math.PI*2);fx.stroke()}
    else {fx.fillStyle=i%2?'#fff9d1':'#ffe077';sparkle(fx,x,y,radius)}
   }
  }
  fx.globalAlpha=1
 },[snapshot,index,size])
 return <><canvas ref={mask} className={`wipe-foam${snapshot.celebrating?' wipe-foam--cleared':''}`} width={size.width} height={size.height} aria-hidden="true"/><canvas ref={particles} className="wipe-particles" width={size.width} height={size.height} aria-hidden="true"/></>
}

export function WindowFrame(){return <svg className="wipe-frame" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true"><g fill="none" strokeLinejoin="round"><path d="M7 5 393 8 396 590 4 595Z" stroke="#334f58" strokeWidth="13"/><path d="M9 9 390 12 391 587 9 590Z" stroke="#edc487" strokeWidth="8"/><path d="m14 17 372 1m1 2 1 559M18 581l361-2M16 24l-1 550" stroke="#fff0be" strokeWidth="2"/><path d="m3 594 392-2" stroke="#334f58" strokeWidth="13"/><path d="m3 590 392-2" stroke="#e4ac68" strokeWidth="9"/></g></svg>}
export function Squeegee(){return <svg viewBox="0 0 120 100" aria-hidden="true"><g stroke="#334f58" strokeWidth="3" strokeLinejoin="round"><path d="m52 40 16 1-4 48q-7 8-13-1Z" fill="#f6c867"/><path d="m12 21 92-4 4 21-94 5Z" fill="#6bc6cf"/><path d="m9 17 95-3 1 10-96 3Z" fill="#fff5d6"/><path d="m13 41 94-4" strokeWidth="6"/><path d="m20 29 71-3m-34 28-1 25" stroke="#fff8e4" strokeWidth="3"/></g></svg>}
