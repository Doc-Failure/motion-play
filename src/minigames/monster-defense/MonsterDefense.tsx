import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { MonsterDefenseModel } from './MonsterDefenseModel'

export function MonsterDefense({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const [model] = useState(() => new MonsterDefenseModel({ playerCount }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const pauseHeadingRef = useRef<HTMLHeadingElement>(null)
  const resultsRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.hit(event)) }, [inputEvents, model])
  useEffect(() => {
    if (externalPauseReason) {
      setSnapshot(model.pause(performance.now()))
      setPauseReason(externalPauseReason)
    }
  }, [externalPauseReason, model])
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to defend the gates?') }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [model])
  useEffect(() => {
    if (snapshot.phase === 'results') resultsRef.current?.focus()
    if (snapshot.phase === 'paused') pauseHeadingRef.current?.focus()
  }, [snapshot.phase])

  const hitAt = (playerId: PlayerId, x: number, y: number) => setSnapshot(model.hit({ playerId, kind: 'MOTION_HIT', x, y, confidence: 1, timestamp: performance.now() }))
  const pointerHit = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    hitAt(playerId, (event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height)
  }
  const goalReached = snapshot.teamScore >= snapshot.teamGoal
  return <section className="monster-game" aria-labelledby="monster-title"><GameFeedback snapshot={snapshot} />
    <header className="bubble-game__header">
      <div><p className="eyebrow">Together • Motion hit game</p><h1 id="monster-title">Monster Defense</h1></div>
      <dl><div><dt>Team score</dt><dd>{snapshot.teamScore} / {snapshot.teamGoal}</dd></div><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="monster-rules">Stop each monster for 10 points before it reaches the gate. Each breach costs 5. Reach {snapshot.teamGoal} points together!</p>
    <p className="monster-team-status" role="status">{goalReached ? 'Great teamwork! Goal reached — keep defending!' : 'Every player protects a gate and adds to the team score.'}</p>
    <div className={`monster-boards monster-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => <section className={`monster-player monster-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
        <h2>Player {playerId}<span>{score} points · {snapshot.breaches[playerId]} breaches</span></h2>
        <div className="monster-board" aria-label={`Player ${playerId} Monster Defense play area`} onPointerDown={(event) => pointerHit(playerId, event)}>
          <div className="monster-gate" aria-hidden="true">Gate</div>
          {snapshot.monsters.filter((monster) => monster.playerId === playerId).map((monster) => <button key={monster.id} className="monster-target" style={{ left: `${monster.x * 100}%`, top: `${monster.y * 100}%` }} type="button" aria-label={`Stop Player ${playerId} monster ${monster.id}`} disabled={snapshot.phase !== 'playing'} onPointerDown={(event) => event.stopPropagation()} onClick={() => hitAt(playerId, monster.x, monster.y)}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="m22 30-7-20 24 12Q55 8 68 24L88 12l-5 25q15 21 2 43L65 89l-7-9-17 10-8-10-20 2Q4 50 22 30Z" fill="#90cb78" stroke="#34254c" strokeWidth="4" strokeLinejoin="round"/><path d="m20 48 5-10m-5 22 5-9m52 4 5-10" stroke="#5a9e65" strokeWidth="4"/><ellipse cx="40" cy="42" rx="12" ry="14" fill="#fff8e7" stroke="#34254c" strokeWidth="3"/><ellipse cx="66" cy="42" rx="10" ry="12" fill="#fff8e7" stroke="#34254c" strokeWidth="3"/><path d="m42 40 1 5m21-6 1 5m-29 18q18 17 36-3" fill="none" stroke="#34254c" strokeWidth="5" strokeLinecap="round"/><path d="m46 67 6 5 4-6" fill="#fff8e7"/></svg>
          </button>)}
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Protect your gate!</span></div>}
        </div>
      </section>)}
    </div>
    <p className="monster-help">Wave at a monster, click it, or focus its button and press Enter or Space.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Monster Defense paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Defense paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Monster Defense results"><h2 ref={resultsRef} tabIndex={-1}>{goalReached ? 'Great teamwork!' : 'Thanks, gate defenders!'}</h2><p>Team score: {snapshot.teamScore} / {snapshot.teamGoal}</p><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points contributed</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
