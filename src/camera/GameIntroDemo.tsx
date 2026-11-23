import jenga from '../assets/intros/jenga.mp4'
import lava from '../assets/intros/floor-is-lava.mp4'
import {GestureDemo} from './GestureDemo'
import {keeperInstructions,rallyInstructions} from '../minigames/camera-sports/rallyFormation'
import snap from '../assets/intros/shadow-snap.mp4'
import marble from '../assets/intros/marble-bowling.mp4'
import race from '../assets/intros/kangaroo-race.mp4'
import keeper from '../assets/intros/goalkeeper.mp4'
import net from '../assets/intros/net-rally.mp4'
import hoops from '../assets/intros/six-hoops.mp4'
import ufos from '../assets/intros/ufo-juggler.mp4'
import ghosts from '../assets/intros/ghost-catcher.mp4'
import {useEffect,useRef} from 'react'
import {getGameBySlug} from '../app/catalog'
import bubbles from '../assets/intros/bubble-battle.mp4'
import dojo from '../assets/intros/ninja-training.mp4'
import wipe from '../assets/intros/window-wipe.mp4'
import football from '../assets/intros/keep-ups.mp4'
import boxing from '../assets/intros/punch-arena.mp4'
const demos:Record<string,{video:string;instruction:string}>={
 jenga:{video:jenga,instruction:'Hold on a lower block, then slide your hand sideways to pull. Hold over a top slot to stack it. Keep the tower balanced!'},
 'floor-is-lava':{video:lava,instruction:'Keep both feet in view. Step onto the grass before the island disappears and the lava arrives!'},
 'shadow-snap':{video:snap,instruction:'Step back until your whole body fits. Fill the cutout and tuck in any red edges before the shutter clicks.'},
 'marble-bowling':{video:marble,instruction:'Sweep one hand up toward the pins to roll. Each pin scores 1. Clear a fresh rack in one roll for a +3 strike!'},
 'kangaroo-race':{video:race,instruction:'Your kangaroo runs automatically. Keep your hips in view and jump over obstacles!'},
 'goalkeeper':{video:keeper,instruction:'Watch the footballer above. React to the shot and block the ball below with your hands or body!'},
 'net-rally':{video:net,instruction:'Stand on your side. Bump the ball over the net. Alone? Play on the left against the robot.'},
 'six-hoops':{video:hoops,instruction:'Stand back with room to move. Bump falling balls sideways into a hoop with your head or body!'},
 'jump-rush':{video:race,instruction:'Step back until your hips are visible. You control the kangaroo: jump to make it hop over hurdles!'},
 'ufo-juggler':{video:ufos,instruction:'Wave to spin saucers up. Coast when hot. Rescue them into orbit!'},
 'ghost-catcher':{video:ghosts,instruction:'Rub ghosts until they pop. Swat bats. Five escapes and you’re out!'},
 'bubble-battle':{video:bubbles,instruction:'Pop the bubbles. Keep clear of bombs.'},
 'ninja-training':{video:dojo,instruction:'Swat leaping ninjas until they tumble. A ninja that gets through or a marked obstacle you touch costs 1 HP.'},
 'window-wipe':{video:wipe,instruction:'Sweep away soap. Rub the ink spots.'},
 ...(import.meta.env.DEV?{'rocket-rumble':{video:'/src/assets/intros/rocket-rumble.mp4',instruction:'Tag matching rockets. Hit the switch.'}}:{}),
 'keep-ups':{video:football,instruction:'Keep the ball up. Three lives — watch for wind!'},
 'punch-arena':{video:boxing,instruction:'Jab the robot. Duck or lean away when it winds up.'},
}
function instructions(game:string,players:number,solo:string) {
 if(game==='goalkeeper'&&players>1)return keeperInstructions(players)
 if(game==='shadow-snap'&&players>1)return 'Each player fills one cutout. Fit together for the photo. Red spill and empty space cost points.'
 if(game==='net-rally')return rallyInstructions(players)
 if(players>1&&game==='window-wipe')return 'Everyone cleans the same window. Sweep your area and scrub the ink together!'
 return solo
}
export function GameIntroDemo({game,players=1}:{game:string;players?:number}){
 const ref=useRef<HTMLVideoElement>(null),details=getGameBySlug(game),demo=demos[game]??{video:bubbles,instruction:details?.rules??'Move your arms to play.'}
 useEffect(()=>{
  const query=window.matchMedia?.('(prefers-reduced-motion: reduce)')
  const update=()=>{if(query?.matches||document.documentElement.classList.contains('reduce-motion'))ref.current?.pause();else void ref.current?.play().catch(()=>undefined)}
  update();query?.addEventListener('change',update);return()=>query?.removeEventListener('change',update)
 },[])
 return <div className="game-intro-demo">
  {import.meta.env.DEV&&!demos[game]&&details?<GestureDemo kind={details.input} title={details.title}/>:<video ref={ref} src={demo.video} autoPlay muted loop playsInline preload="auto" aria-label={`${details?.title??'Game'} movement demonstration`}/>}
  <div><h1>{details?.title??'Let’s play'}</h1><p>{instructions(game,players,demo.instruction)}</p></div>
 </div>
}
