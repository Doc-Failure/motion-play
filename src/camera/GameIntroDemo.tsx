import jumps from '../assets/intros/jump-rush.mp4'
import ufos from '../assets/intros/ufo-juggler.mp4'
import ghosts from '../assets/intros/ghost-catcher.mp4'
import {useEffect,useRef} from 'react'
import {getGameBySlug} from '../app/catalog'
import bubbles from '../assets/intros/bubble-battle.mp4'
import dojo from '../assets/intros/ninja-training.mp4'
import wipe from '../assets/intros/window-wipe.mp4'
import rockets from '../assets/intros/rocket-rumble.mp4'
import football from '../assets/intros/keep-ups.mp4'
import boxing from '../assets/intros/punch-arena.mp4'
import beat from '../assets/intros/beat-freak.mp4'
const demos:Record<string,{video:string;instruction:string}>={
 'jump-rush':{video:jumps,instruction:'Step back until your hips are visible. Jump when the hurdle reaches the star!'},
 'ufo-juggler':{video:ufos,instruction:'Wave to spin saucers up. Coast when hot. Rescue them into orbit!'},
 'ghost-catcher':{video:ghosts,instruction:'Rub ghosts until they pop. Swat bats. Five escapes and you’re out!'},
 'bubble-battle':{video:bubbles,instruction:'Pop the bubbles. Keep clear of bombs.'},
 'ninja-training':{video:dojo,instruction:'Swat the ninjas. Dodge marked obstacles.'},
 'window-wipe':{video:wipe,instruction:'Sweep away soap. Rub the ink spots.'},
 'rocket-rumble':{video:rockets,instruction:'Tag matching rockets. Hit the switch.'},
 'keep-ups':{video:football,instruction:'Keep the ball up. Three lives — watch for wind!'},
 'punch-arena':{video:boxing,instruction:'Jab the robot. Duck or lean away when it winds up.'},
 'beat-freak':{video:beat,instruction:'Hit a speaker when its record arrives.'},
}
export function GameIntroDemo({game}:{game:string}){
 const ref=useRef<HTMLVideoElement>(null),details=getGameBySlug(game),demo=demos[game]??{video:bubbles,instruction:details?.rules??'Move your arms to play.'}
 useEffect(()=>{
  const query=window.matchMedia?.('(prefers-reduced-motion: reduce)')
  const update=()=>{if(query?.matches||document.documentElement.classList.contains('reduce-motion'))ref.current?.pause();else void ref.current?.play().catch(()=>undefined)}
  update();query?.addEventListener('change',update);return()=>query?.removeEventListener('change',update)
 },[])
 return <div className="game-intro-demo"><h1>{details?.title??'Let’s play'}</h1><video ref={ref} src={demo.video} autoPlay muted loop playsInline preload="auto" aria-label={`${details?.title??'Game'} movement demonstration`}/><p>{demo.instruction}</p></div>
}
