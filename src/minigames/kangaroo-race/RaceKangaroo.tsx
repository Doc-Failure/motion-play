import {useEffect,useState,type CSSProperties} from 'react'
import {Kangaroo} from '../jump-rush/Kangaroo'
import type {RacePose} from './racePose'

const colors=['#74d6df','#ed9ba5','#bfa5e7','#a5d88b']
const positions:Record<RacePose,string>={run:'0 0',jump:'100% 0',land:'0 100%',stumble:'100% 100%'}
export function RaceKangaroo({player,height,pose,running,elapsed}:{player:number;height:number;pose:RacePose;running:boolean;elapsed:number}){
 const [loaded,setLoaded]=useState(false)
 const [runLoaded,setRunLoaded]=useState(false)
 const sheet=`${import.meta.env.BASE_URL}assets/minigames/kangaroo-race/kangaroo-poses.webp`
 const runSheet=`${import.meta.env.BASE_URL}assets/minigames/kangaroo-race/kangaroo-run.webp`
 useEffect(()=>{const image=new Image();image.onload=()=>setRunLoaded(true);image.src=runSheet;return()=>{image.onload=null}},[runSheet])
 const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.documentElement.classList.contains('reduce-motion')
 const frame=reduced?0:Math.floor(elapsed/150)%4
 const useRun=pose==='run'&&runLoaded
 const background=useRun?`url(${runSheet}) ${frame%2?'100%':'0'} ${frame>=2?'100%':'0'} / 200% 200% no-repeat`:`url(${sheet}) ${positions[pose]} / 200% 200% no-repeat`
 if(!loaded)return <><img src={sheet} alt="" hidden onLoad={()=>setLoaded(true)}/><Kangaroo player={player} height={height}/></>
 return <span className="race-roo__sprite" role="img" aria-label={`Your kangaroo, Player ${player}`} data-pose={pose} data-running={running} data-run-frame={useRun?frame:undefined}>
  <span className="race-roo__art" aria-hidden="true" style={{background}}/>
  <span className="race-roo__badge" aria-hidden="true" style={{background:colors[player-1]} as CSSProperties}>{player}</span>
 </span>
}
