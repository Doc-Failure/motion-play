import frostPoses from './frost-poses.webp'

const art = `${import.meta.env.BASE_URL}assets/minigames/paper-dojo/`

const poses = ['run', 'ready', 'recoil', 'stagger', 'defeated'] as const
export type NinjaPose = typeof poses[number] | 'leap'

export function NinjaPuppet({rank, pose, side, flightFrame=0}: {rank:string; pose:NinjaPose; side:number; flightFrame?:number}) {
  const airborne = pose === 'leap'
  const frame = airborne ? flightFrame : poses.indexOf(pose)
  const frames = airborne ? 3 : poses.length
  const sheet = rank === 'frost' && !airborne ? frostPoses : `${art}${rank}-${airborne ? 'flight' : 'actions'}.webp`
  return <span aria-hidden="true" data-sprite={pose} data-frame={frame} style={{
    display:'block', width:'100%', height:'100%',
    backgroundImage:`url("${sheet}")`, backgroundSize:`${100*frames}% 100%`,
    backgroundPosition:`${frame * 100/(frames-1)}% center`, transform:`scaleX(${side===-1?1:-1})`,
  }}/>
}
