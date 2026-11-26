import type { CSSProperties } from 'react'
import { type Cel, effectFrame, sheets, pack } from './animation'

const shared = '/assets/minigames/paper-dojo/'
type SpriteProps = {
  sheet: Cel['sheet']; frame: number; action?: string; rank?: string; faceLeft?: boolean
  className?: string; style?: CSSProperties
}
/** All atlases use fixed cells. The logical action and the drawn cel share the play clock. */
export function Sprite({sheet, frame, action, rank, faceLeft, className, style}: SpriteProps) {
  const legacy = sheet === 'actions' || sheet === 'flight'
  const [cols,rows] = legacy ? [sheet === 'actions' ? 5 : 3, 1] : sheets[sheet]
  const x = frame % cols, y = Math.floor(frame/cols)
  const url = legacy ? shared + rank + '-' + sheet : pack + sheet
  return <span aria-hidden="true" data-sprite={action ?? sheet} data-frame={frame} data-sheet={sheet} className={className}
    style={{display:'block',width:'100%',height:'100%',backgroundImage:`url("${url}.webp")`,
      backgroundSize:`${cols*100}% ${rows*100}%`,backgroundPosition:`${100*x/(cols-1)}% ${rows===1?0:100*y/(rows-1)}%`,
      transform:faceLeft?'scaleX(-1)':undefined,...style}}/>
}
export function Effect({row,age,duration,reduced,style,label}: {row:number;age:number;duration:number;reduced:boolean;style:CSSProperties;label:string}) {
  if (age < 0 || age >= duration) return null
  return <Sprite sheet="effects" frame={row*4+effectFrame(age,duration,reduced)} action={label} className="gate-effect" style={style}/>
}
