import {memo,useId,useLayoutEffect,useRef} from 'react'
import type {BodyMask} from '../../input/MotionProcessor'
import type {Cutout} from './cutout'

const Holes=memo(function Holes({targets}:{targets:Cutout[]}) {
  return <>{targets.map((t,i)=><g key={i}>{t.strokes.map((s,k)=><line key={k} x1={s.x} y1={s.y} x2={s.endX} y2={s.endY} strokeWidth={2*s.r} strokeLinecap="round"/>)}</g>)}</>
})

// Draw only flat ink for pixels spilling past the cut edge. No camera image enters the game.
function SpilledInk({body,target,manual}:{body?:BodyMask;target:Cutout;manual:boolean}){
  const ref=useRef<HTMLCanvasElement>(null)
  useLayoutEffect(()=>{
    const canvas=ref.current,ctx=canvas?.getContext('2d')
    if(!canvas||!ctx)return
    ctx.clearRect(0,0,canvas.width,canvas.height)
    if(!body||body.width!==target.width||body.height!==target.height)return
    const ink=ctx.createImageData(body.width,body.height)
    for(let i=0;i<body.cells.length;i++)if(body.cells[i]&&(!target.cells[i]||manual)){
      const k=i*4
      ink.data[k]=target.cells[i]?93:181;ink.data[k+1]=target.cells[i]?171:73;ink.data[k+2]=target.cells[i]?147:56;ink.data[k+3]=220
    }
    ctx.putImageData(ink,0,0)
  },[body,target,manual])
  return <canvas aria-hidden="true" ref={ref} width={target.width} height={target.height}/>
}
export function Cardboard({targets,bodies,manual}:{targets:Cutout[];bodies:(BodyMask|undefined)[];manual:boolean[]}){
  const id=useId().replace(/:/g,''),aspect=targets[0].aspect
  return <div className="snap-cardboard">
    <svg viewBox={`0 0 ${aspect} 1`} preserveAspectRatio="none" role="img" aria-label="Cardboard wall with full-body pose cutouts">
      <defs>
        <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width={aspect} height="1">
          <rect width={aspect} height="1" fill="white"/><g stroke="black"><Holes targets={targets}/></g>
        </mask>
        <pattern id={id+'grain'} width=".065" height=".051" patternUnits="userSpaceOnUse">
          <rect width=".065" height=".051" fill="#d7af7c"/><path d="M0 .011 .065 .006 M.015 .032 .043 .029" stroke="#bb905f" strokeWidth=".0012"/>
        </pattern>
      </defs>
      <rect width={aspect} height="1" fill={`url(#${id}grain)`} mask={`url(#${id})`}/>
    </svg>
    {targets.map((t,i)=><SpilledInk key={i} target={t} body={bodies[i]} manual={manual[i]}/>)}
  </div>
}
