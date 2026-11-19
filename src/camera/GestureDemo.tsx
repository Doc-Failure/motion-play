import {useEffect,useRef} from 'react'
import type {InputKind} from '../app/catalog'

/** A movement lesson for workshop games that have no dedicated tutorial clip. */
export function GestureDemo({kind,title}:{kind:InputKind;title:string}) {
  const ref=useRef<SVGSVGElement>(null)
  useEffect(()=>{
    const query=window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const change=()=>{
      if(query?.matches||document.documentElement.classList.contains('reduce-motion'))ref.current?.pauseAnimations?.()
      else ref.current?.unpauseAnimations?.()
    }
    change();query?.addEventListener('change',change)
    return ()=>query?.removeEventListener('change',change)
  },[])
  const body=kind==='BODY_MOVE'||kind==='FREEZE'
  const points=body?[[168,80],[168,80],[168,80],[168,80]]:
    kind==='HAND_SWIPE'?[[137,110],[137,110],[206,46],[206,46]]:
    kind==='MOTION_BRUSH'?[[155,91],[210,76],[161,68],[204,92]]:
    kind==='HAND_POSITION'?[[143,99],[175,72],[188,67],[188,67]]:[[143,99],[143,99],[197,67],[147,95]]
  const path=(x:number,y:number)=>`M115 74 Q137 87 ${x} ${y}`
  return <svg className="gesture-demo" ref={ref} viewBox="0 0 280 150" role="img" aria-label={title+' movement demonstration'}>
    <rect width="280" height="150" fill="#fff"/>
    <g stroke="#323442" strokeLinecap="round" strokeLinejoin="round" strokeWidth="7" fill="none">
      {body&&<animateTransform attributeName="transform" type="translate" dur="2.4s" repeatCount="indefinite"
        values={kind==='FREEZE'?'0 0;45 -5;45 -5;45 -5;0 0':'0 0;36 3;64 0;24 -2;0 0'}/>}
      <circle cx="113" cy="36" r="13" fill="#ffdfa7"/>
      <path d="M113 51L115 99 M113 69L90 81 76 71 M115 99L98 132 M115 99L134 132"/>
      <path d={path(points[0][0],points[0][1])}>
        <animate attributeName="d" dur="2s" repeatCount="indefinite" values={[...points,points[0]].map(([x,y])=>path(x,y)).join(';')}/>
      </path>
    </g>
    {!body&&<circle cx={points[2][0]} cy={points[2][1]} r="13" stroke="#99733e" fill="none" strokeWidth="2" strokeDasharray="4 3"/>}
  </svg>
}
