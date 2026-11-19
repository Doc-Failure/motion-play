import {useContext,useEffect,useRef} from 'react'
import {InputFeedbackContext} from './InputFeedbackContext'
type DebugScore={playerId:number;score:number}

export interface DebugRegion {
 x:number;y:number;rx:number;ry:number
 /** Omit for targets on the shared court. */
 playerId?:number
}
export function GameplayDebug({scores,regions,contact}:{scores:DebugScore[];regions:DebugRegion[];contact?:string|null}){
 const input=useContext(InputFeedbackContext),canvas=useRef<HTMLCanvasElement>(null)
 const previous=useRef({time:0,scores,frame:0,message:'',until:0})
 useEffect(()=>{
  const el=canvas.current,c=el?.getContext('2d')
  if(!el||!c)return
  const w=el.clientWidth,h=el.clientHeight
  if(el.width!==w||el.height!==h){el.width=w;el.height=h}
  const now=performance.now(),last=previous.current,n=input.playerCount
  if(last.time&&now>last.time)last.frame=now-last.time
  last.time=now
  const delta=scores.flatMap((p,i)=>p.score===last.scores[i]?.score?[]:[`P${p.playerId} ${p.score-last.scores[i].score>0?'+':''}${p.score-last.scores[i].score}`])
  if(delta.length){last.message=delta.join(' ');last.until=now+600}
  last.scores=scores
  c.clearRect(0,0,w,h);c.lineWidth=2;c.strokeStyle='#ffe46a'
  for(const r of regions){
   const lanes=r.playerId?n:1,x=(r.x+(r.playerId??1)-1)*w/lanes
   c.beginPath();c.ellipse(x,r.y*h,r.rx*w/lanes,r.ry*h,0,0,Math.PI*2);c.stroke()
  }
  c.strokeStyle='#54fff3'
  for(const e of input.events){
   if(now-e.timestamp>200)continue
   const project=(x:number)=>w*(e.coordinateSpace==='court'?x:(e.playerId-1+x)/n)
   const x=project(e.x),y=e.y*h
   c.strokeRect(x-3,y-3,6,6)
   if(e.origin){c.beginPath();c.moveTo(project(e.origin.x),e.origin.y*h);c.lineTo(x,y);c.stroke()}
  }
  const age=input.events.length?Math.max(0,now-Math.max(...input.events.map(e=>e.timestamp))):null
  const label=`Render Δ ${last.frame.toFixed(1)} ms · sample age ${age===null?'—':Math.round(age)+' ms'} ${contact??''} ${now<last.until?last.message:''}`
  c.font='14px monospace';c.fillStyle='#182029';c.fillRect(4,h*.22-16,c.measureText(label).width+10,22)
  c.fillStyle='white';c.fillText(label,8,h*.22)
 })
 return <canvas ref={canvas} aria-label="Gameplay diagnostics" style={{position:'absolute',inset:0,width:'100%',height:'100%',zIndex:14,pointerEvents:'none'}}/>
}
