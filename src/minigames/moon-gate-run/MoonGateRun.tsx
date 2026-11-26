import { useContext, useEffect, useState } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { InputFeedbackContext } from '../../game/InputFeedbackContext'
import { RoundHud } from '../../game/RoundHud'
import { ChallengeResult } from '../../game/ArcadeRound'
import { useChallenge } from '../../game/ChallengeContext'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import type { PlayerCount } from '../../input/PlayerZoneMapper'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import { Landscape, TrailRunner, Enemy } from './RunArtwork'
import { Sprite } from './Sprites'
import { preloadSprites } from './animation'
import { MoonGateModel } from './MoonGateModel'
import { FLOOR, GATE_DISTANCE, location, platforms, RUNNER_X } from './course'
import './run.css'

const scenery = '/assets/minigames/moon-gate-run/'
const pct = (value: number) => value * 100 + '%'
type Props = RoundRecoveryProps & { playerCount: PlayerCount; inputEvents: MotionInputEvent[]; onExit(): void }

export function MoonGateRun({ playerCount, inputEvents, onExit, ...recoveryProps }: Props) {
  const { aspectRatio = 1 } = useContext(InputFeedbackContext)
  const level = useChallenge()?.level ?? 1
  const [{ model, initial }] = useState(() => {
    const model = new MoonGateModel(playerCount, aspectRatio, level)
    return { model, initial: model.start(performance.now()) }
  })
  const [s, set] = useState(initial)
  const recovery = useRoundRecovery({ model, snapshot: s, setSnapshot: set, title: 'Moon Gate Run', onExit, ...recoveryProps })
  useEffect(preloadSprites, [])
  useEffect(() => { model.setAspect(aspectRatio) }, [aspectRatio, model])
  useEffect(() => {
    if (s.phase !== 'playing' && s.phase !== 'countdown') return
    let frame = requestAnimationFrame(tick)
    function tick(time: number) { set(model.update(time)); frame = requestAnimationFrame(tick) }
    return () => cancelAnimationFrame(frame)
  }, [model, s.phase])
  useEffect(() => {
    for (const e of inputEvents) set(model.input(e))
  }, [model, inputEvents])

  const foe = s.foe
  const reduced = document.documentElement.classList.contains('reduce-motion') || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const firstWin = Math.min(...s.runners.filter(r=>r.won).map(r=>r.fallen!.at))
  const playing = s.phase === 'playing'
  const jumpSoon = platforms.some(p => p.start > s.distance && p.start-s.distance < .18)
  return <section className="gate-run" aria-label="Moon Gate Run" data-phase={s.phase}>
    <GameFeedback snapshot={s} theme="dojo" showScoreBursts={false}/>
    <RoundHud title="Moon Gate Run" snapshot={s} onExit={onExit} exitRef={recovery.exitButtonRef}>
      {s.runners.map((r,i) => <div key={r.id}><dt>P{r.id}</dt><dd>{s.scores[i].score}</dd>
        <span aria-label={`Player ${r.id} health ${r.life} of 6`}>♥ {r.life}</span></div>)}
    </RoundHud>
    <Landscape players={playerCount} distance={s.distance} time={s.elapsed} openAge={s.elapsed-firstWin} reduced={reduced}/>
    <div className="gate-boards">{s.runners.map(r => {
      const active = r.life > 0 && !r.won
      const fallen = r.fallen
      const age = fallen ? s.elapsed-fallen.at : Infinity
      return <div key={r.id}><div className="gate-lane" role="group" aria-label={`Player ${r.id} Moon Gate Run play area`}>
        {platforms.map((p,i) => {
          const x = RUNNER_X + p.start - s.distance
          if(x>=1 || x+p.width<=0)return null
          const style={left:pct(x),width:pct(p.width),height:pct(p.height),bottom:pct(1-FLOOR)}
          if(p.art==='crate')return <img key={p.start} className="gate-platform" alt="crate" src={scenery+'crate.webp'} style={style}/>
          const edge=p.start+p.width
          const loaded=r.landedOn===i && s.distance<=edge && r.grounded && r.height>=p.height-.001
          const released=r.landedOn===i && (s.distance>edge ? s.distance-edge<.055 : s.elapsed-r.jumpAt<240)
          const frame=loaded ? (s.elapsed-r.landAt<120 ? 1 : 2) : released ? 3 : 0
          return <Sprite key={p.start} sheet="bridge" frame={reduced ? 0 : frame} className="gate-platform" style={style}/>
        })}
        <TrailRunner r={r} time={s.elapsed} gateAge={s.gateAge} distance={s.distance} reduced={reduced}/>
        {foe && active && r.enemy===foe.index && r.hp>0 && <Enemy foe={foe} r={r} time={s.elapsed} reduced={reduced}
          defeatAge={null} enabled={playing} onSwat={() => set(model.input({kind:'MOTION_HIT',playerId:r.id,x:foe.x,y:foe.y,confidence:1,timestamp:performance.now()}))}/>}
        {fallen && age<(fallen.foe.boss?1300:640) && <Enemy foe={fallen.foe} r={r} time={s.elapsed} reduced={reduced}
          defeatAge={age} enabled={false} onSwat={()=>{}}/>}
      </div></div>
    })}</div>
    {playing && s.runners.map(r => <button key={r.id} type="button" className="gate-jump"
      disabled={!r.life || r.won} style={{left:pct((r.id-1+.03)/playerCount)}}
      aria-label={`Jump Player ${r.id}`} onClick={() => set(model.jump(r.id, performance.now()))}>
      {r.won?'Gate cleared':!r.life?'Out':`↑ Jump${jumpSoon?'!':''}${playerCount > 1?' P'+r.id:''}`}
    </button>)}
    {playing && <aside className="gate-route" aria-label="Route progress"><strong>{foe?.boss?'Thunder Oni':location(s.distance)}</strong>
      <progress aria-label="Distance to Moon Gate" max={GATE_DISTANCE} value={s.distance}/></aside>}
    {playing && <div className="gate-pause">{recovery.pauseButton}</div>}
    {s.phase === 'countdown' && <div className="game-curtain"><strong>{Math.ceil(s.countdownRemainingMs/1000)}</strong></div>}
    {recovery.pauseDialog}
    {s.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Moon Gate Run results">
      <h2 ref={recovery.resultsHeading} tabIndex={-1}>{s.runners.some(r => r.won)?'Moon Gate cleared!':'Trail’s end'}</h2>
      {s.runners.map((r,i) => <p key={r.id}>P{r.id} · {s.scores[i].score} points · {r.won?'Thunder Oni defeated':location(s.distance)} · {r.cleared} landings</p>)}
      <ChallengeResult scores={s.scores} finalLevel={5}/>
      <div className="result-actions"><button className="crayon-button" onClick={() => set(model.start(performance.now()))}>Play again</button>
        <button className="crayon-button" onClick={onExit}>Back to games</button></div>
    </div>}
  </section>
}
