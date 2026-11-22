import { useEffect, useRef, useState } from 'react'
import type { Feet, FloorPoint, FloorSample } from '../../input/LavaFeet'
import type { PlayerCount } from '../../input/PlayerZoneMapper'
import { RoundHud } from '../../game/RoundHud'
import { ChallengeResult } from '../../game/ArcadeRound'
import { useChallenge } from '../../game/ChallengeContext'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { containCameraFrame } from '../../game/cameraGeometry'
import { LavaFlood } from './LavaFlood'
import { LavaRound, WAVES } from './LavaRound'

const LAVA_ART = '/assets/minigames/floor-is-lava/'
type Props = RoundRecoveryProps & { frame: ReturnType<typeof containCameraFrame>; playerCount: PlayerCount; sample?: FloorSample; simulation: boolean; onExit(): void }
const color = ['#ffe485', '#a4dfff', '#e7b4ff', '#ffb6aa']
function demoFeet(points: FloorPoint[]): Feet[] {
  return points.map(({ x, y }) => [{ x: x - .012, y }, { x: x + .012, y }])
}

export function FloorIsLava({ frame, playerCount, sample, simulation, onExit, externalPauseReason, onReconnect }: Props) {
  const pressure = useChallenge()?.pressure ?? 0
  const [model] = useState(() => new LavaRound(playerCount, pressure))
  const [snap, setSnap] = useState(() => model.start(performance.now()))
  const feed = useRef(sample)
  const markers = useRef(Array.from({ length: playerCount }, (_, i) => ({ x: (i + .5) / playerCount, y: .82 })))
  const [moving, select] = useState(0)
  const recovery = useRoundRecovery({ model, snapshot: snap, setSnapshot: setSnap, title: 'Floor Is Lava', externalPauseReason, onReconnect, onExit })
  useEffect(() => { feed.current = sample }, [sample])
  useEffect(() => {
    if (snap.phase === 'paused' || snap.phase === 'results') return
    const timer = window.setInterval(() => {
      const now = performance.now()
      setSnap(model.update(now, simulation ? { feet: demoFeet(markers.current), time: now } : feed.current))
    }, 50)
    return () => window.clearInterval(timer)
  }, [model, simulation, snap.phase])
  useEffect(() => {
    if (!simulation || snap.phase !== 'playing') return
    const steer = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLSelectElement || !['ArrowLeft','ArrowRight'].includes(e.key)) return
      e.preventDefault()
      const point = markers.current[moving]
      point.x = Math.max(.02, Math.min(.98, point.x + (e.key === 'ArrowLeft' ? -.035 : .035)))
    }
    window.addEventListener('keydown', steer)
    return () => window.removeEventListener('keydown', steer)
  }, [simulation, snap.phase, moving])
  const { zone, flooded, wave, seconds, home } = snap
  const x = zone.left * 1000, w = (zone.right - zone.left) * 1000, y = zone.top * 600
  const instruction = home === playerCount ? 'Hold here' : 'Get home'
  const cue = flooded ? (home === playerCount ? 'Everyone’s home!' : 'Lava!') : `${instruction} · ${seconds}`
  return <section className="lava-game" aria-label="Floor Is Lava" data-phase={snap.phase} data-flooded={flooded}>
    <RoundHud title="Floor Is Lava" snapshot={snap} onExit={onExit} exitRef={recovery.exitButtonRef}>
      <div><dt>Wave</dt><dd>{wave + 1}/{WAVES}</dd></div><div><dt>All home</dt><dd>{snap.rescued}</dd></div>
    </RoundHud>
    <LavaFlood frame={frame} zone={zone} flooded={flooded} elapsedMs={snap.floodElapsedMs}/>
    <svg viewBox="0 0 1000 600" preserveAspectRatio="none" aria-label="Shared lava playfield" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}
      onPointerDown={e => {
        if (!simulation || snap.phase !== 'playing') return
        const box = e.currentTarget.getBoundingClientRect()
        markers.current[moving] = { x: (e.clientX - box.left) / box.width, y: (e.clientY - box.top) / box.height }
      }}>
      <rect data-home-zone="" x={x} y={y} width={w} height={600-y} fill="#68e49b" fillOpacity=".20" stroke="#143d32" strokeWidth="9"/>
      <rect x={x} y={y} width={w} height={600-y} fill="none" stroke="#acffae" strokeWidth="5" strokeDasharray="16 6"/>
      <image href={LAVA_ART + 'home.webp'} x={x+9} y={y-56} width="78" height="78"/>
      <g transform={`translate(${x+w/2},${y+27})`}><rect x="-47" y="-17" width="94" height="32" rx="12" fill="#eaffc3" stroke="#284436" strokeWidth="3"/><text textAnchor="middle" y="6" fontSize="18" fontWeight="bold" fill="#17392c">HOME</text></g>
      {snap.feet.map((pair,i) => <g key={i} fill={color[i]} stroke="#242c36" strokeWidth="2.5">
        {pair.map((p,j) => <ellipse key={j} cx={p.x*1000} cy={p.y*600} rx="7" ry="5"/>)}
      </g>)}
    </svg>
    <div style={{ position:'absolute', top:'12%', left:'50%', transform:'translateX(-50%)', textAlign:'center', padding:'.35rem .9rem', border:'3px solid #29313c', borderRadius:14, background:'#fff8de', color:'#29313c', pointerEvents:'none' }} role="timer" aria-label="Home countdown">
      <strong style={{ fontSize:'clamp(18px,3vw,38px)' }}>{cue}</strong>
      <div>{home} of {playerCount} home</div>
    </div>
    {snap.phase === 'playing' && simulation && <div className="game-tools" style={{background:'#fff',padding:5}}>
      <label>Move <select value={moving} onChange={e=>select(Number(e.target.value))}>{markers.current.map((_,i)=><option key={i} value={i}>P{i+1}</option>)}</select></label>
      <small>Click the floor or use ← →</small>
    </div>}
    {snap.phase === 'playing' && !simulation && !flooded && snap.feet.length < playerCount && <p>Step back until both feet are visible for every player.</p>}
    {snap.phase === 'countdown' && <div className="game-curtain"><strong>{Math.ceil(snap.countdownRemainingMs/1000)}</strong></div>}
    {recovery.pauseDialog}
    {snap.phase === 'results' && <div role="dialog" className="battle-results" aria-label="Floor Is Lava results">
      <h2 ref={recovery.resultsHeading} tabIndex={-1}>Everyone home on {snap.rescued} of {WAVES} waves</h2>
      <ChallengeResult scores={snap.scores}/>
      <div className="result-actions"><button className="crayon-button" onClick={()=>{markers.current=markers.current.map((_,i)=>({x:(i+.5)/playerCount,y:.82}));select(0);setSnap(model.start(performance.now()))}}>Play again</button>
      <button className="crayon-button" onClick={onExit}>Back to games</button></div>
    </div>}
  </section>
}
