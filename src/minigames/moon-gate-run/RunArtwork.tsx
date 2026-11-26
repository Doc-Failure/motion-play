import { Sprite, Effect } from './Sprites'
import { runnerCel, enemyCel, playerBadge } from './animation'
import { FLOOR, GATE_DISTANCE, platforms, RUNNER_X, type Foe } from './course'
import type { Runner } from './MoonGateModel'

const pct = (n:number) => n*100+'%'
const landmarks = [
  {at:.3,art:'bamboo'}, {at:1.5,art:'bamboo'}, {at:2.56,art:'river'}, {at:3.8,art:'river'},
  {at:5.04,art:'river'}, {at:5.86,art:'bamboo'},
] as const
export function Landscape({distance,time,openAge,reduced,players}: {distance:number;time:number;openAge:number;reduced:boolean;players:number}) {
  const tile = openAge>=0 ? 3 : distance<2 ? 0 : distance<4.55 ? 1 : 2
  const tilePosition = distance*4/players
  const roadOffset = tilePosition%1
  return <>
    <div className="gate-landscape" aria-hidden="true">
      {landmarks.map(l=>{
        const x=(l.at-distance)*.59+.25
        if(x <= -.6 || x >= 1)return null
        const frame=reduced?0:Math.floor(time/(l.art==='river'?155:390)+l.at)%4
        return <Sprite key={l.at} sheet={l.art} frame={frame} className="gate-vista" style={{left:pct(x),width:'min(45%,42cqh)',height:'auto',aspectRatio:l.art==='river'?'248/178':'272/168'}}/>
      })}
      {distance>4.8 && <Sprite sheet="gate" action={openAge<0?'gate-closed':'gate-opening'}
        frame={openAge<0?0:reduced?3:Math.min(3,Math.floor(openAge/220))}
        className="gate-vista" style={{left:pct(.72+(GATE_DISTANCE-distance)*.48),width:'min(26%,41cqh)',height:'auto',aspectRatio:'1'}}/>}
    </div>
    <div className="gate-road" aria-hidden="true">{[0,1,2,3,4].map(i=><Sprite key={i} sheet="road" frame={tile} faceLeft={(i+Math.floor(tilePosition))%2===1}
      style={{position:'absolute',left:pct((i-roadOffset)/4),width:'25.2%'}}/>)}</div>
  </>
}

export function TrailRunner({r,time,gateAge,distance,reduced}: {r:Runner;time:number;gateAge:number;distance:number;reduced:boolean}) {
  const pose=runnerCel(r,time,gateAge,reduced)
  const surface=platforms[r.obstacle]
  const floor=surface && distance>=surface.start && distance<=surface.start+surface.width ? surface.height : 0
  const fall = r.life ? 0 : Math.min(1,(time-r.hurtAt)/400)
  const height=r.height*(1-fall)+floor*fall
  const stride = time%540
  const footAge = pose.action==='run' && !reduced ? stride%270 : 1000
  const dustAge = Math.min(time-r.jumpAt,time-r.landAt,footAge)
  const dust = dustAge===time-r.landAt ? 'landing-dust' : dustAge===time-r.jumpAt ? 'push-off-dust' : 'foot-dust'
  const wonAge = r.won ? time-r.fallen!.at : 0
  const victoryHop=r.won && !reduced ? Math.max(0,Math.sin(wonAge/460*2*Math.PI))*.025 : 0
  return <>
    <Sprite sheet="shadow" frame={Math.min(3,Math.floor(Math.max(0,height-floor)*14))} className="gate-shadow"
      style={{left:pct(RUNNER_X),bottom:pct(1-FLOOR+floor),width:'min(22%,11cqh)',height:'1.6%'}}/>
    <div className="gate-runner" data-airborne={!r.grounded} style={{left:pct(RUNNER_X),bottom:pct(1-FLOOR+height+victoryHop)}}>
      <Sprite {...pose} rank="leaf"/>
      <img className="gate-badge" src={playerBadge(r.id)} alt={`Player ${r.id}`}/>
      <Effect row={3} age={time-r.hurtAt} duration={520} reduced={reduced} label="heart-loss"
        style={{left:'-15%',top:'-22%',width:'42%',height:'42%'}}/>
      <Effect row={4} age={time-r.rewardAt} duration={520} reduced={reduced} label="landing-reward"
        style={{right:'-18%',top:'-24%',width:'46%',height:'46%'}}/>
      {time-r.rewardAt < 520 && <strong className="gate-bonus">+5</strong>}
    </div>
    {(!reduced || time-r.landAt<200) && <Effect row={0} age={dustAge} duration={195} reduced={reduced} label={dust}
      style={{left:pct(RUNNER_X-.10),bottom:pct(1-FLOOR+floor),width:dust==='landing-dust'?'15%':'10%',height:dust==='push-off-dust'?'6%':'4%'}}/>}
  </>
}

export function Enemy({foe,r,time,reduced,defeatAge,enabled,onSwat}: {
  foe:Foe;r:Runner;time:number;reduced:boolean;defeatAge:number|null;enabled:boolean;onSwat():void
}) {
  const defeated=defeatAge!==null
  const pose=enemyCel(foe,time,r.hitAt,defeatAge,reduced)
  const fall=defeatAge===null?0:Math.min(1,defeatAge/(foe.boss?630:390))
  const y=foe.y+(FLOOR-foe.ry-foe.y)*fall
  const hitAge=time-r.hitAt
  const launchAge=foe.boss?(foe.progress-.51)*3400:(foe.progress-.48)*foe.encounterMs
  return <button type="button" className="gate-foe" data-boss={foe.boss}
    aria-label={`Swat Player ${r.id} ${foe.name}, ${defeated?0:r.hp} health`} disabled={defeated||!enabled}
    style={{left:pct(foe.x),top:pct(y),width:pct(foe.rx*2),height:pct(foe.ry*2)}} onClick={onSwat}>
    <Sprite {...pose} rank={foe.rank} faceLeft/>
    {!defeated && <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="47"/><circle cx="50" cy="50" r="47"
      pathLength="100" strokeDasharray={`${100*r.hp/foe.maxHp} 100`} transform="rotate(-90 50 50)"/></svg>}
    <Effect row={1} age={hitAge} duration={235} reduced={reduced} label="hit-burst" style={{left:'-16%',top:'42%',width:'48%',height:'48%'}}/>
    {!defeated && <Effect row={1} age={launchAge} duration={220} reduced={reduced} label="takeoff-burst"
      style={{right:'-5%',bottom:0,width:'44%',height:'44%'}}/>}
    {foe.boss && !defeated && <Effect row={2} age={(foe.progress-.78)*3400} duration={340} reduced={reduced} label="slam-wave"
      style={{left:'-20%',bottom:'-7%',width:'140%',height:'31%'}}/>}
  </button>
}
