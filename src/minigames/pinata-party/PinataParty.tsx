import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { PinataPartyModel } from './PinataPartyModel'

export function PinataParty({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const [model] = useState(() => new PinataPartyModel({ playerCount }))
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
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to keep playing?') }
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
  const goalReached = snapshot.teamCandy >= snapshot.teamGoal
  return <section className="pinata-game" aria-labelledby="pinata-title">
    <header className="bubble-game__header">
      <div><p className="eyebrow">Together • Motion hit game</p><h1 id="pinata-title">Piñata Party</h1></div>
      <dl><div><dt>Team candy</dt><dd>{snapshot.teamCandy} / {snapshot.teamGoal}</dd></div><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="pinata-rules">Hit your piñata 3 times to spill 10 candy. Leave a little space between hits! Reach {snapshot.teamGoal} candy together.</p>
    <p className="pinata-team-status" role="status">{goalReached ? 'Sweet teamwork! Goal reached — keep collecting!' : 'Every player adds to the same candy jar.'}</p>
    <div className={`pinata-boards pinata-boards--${playerCount}`}>
      {snapshot.pinatas.map((pinata) => <section className={`pinata-player pinata-player--${pinata.playerId}`} key={pinata.playerId} aria-label={`Player ${pinata.playerId}`}>
        <h2>Player {pinata.playerId}<span>{snapshot.scores.find((entry) => entry.playerId === pinata.playerId)?.score} candy</span></h2>
        <div className="pinata-board" aria-label={`Player ${pinata.playerId} Piñata Party play area`} onPointerDown={(event) => pointerHit(pinata.playerId, event)}>
          <span className="pinata-bunting" aria-hidden="true">▼ ▽ ▼ ▽ ▼</span>
          <div className="pinata-rope" aria-hidden="true" />
          <button className="pinata-target" style={{ left: `${pinata.x * 100}%`, top: `${pinata.y * 100}%` }} type="button" aria-label={`Hit Player ${pinata.playerId} piñata`} disabled={snapshot.phase !== 'playing' || pinata.readyAt !== null} onPointerDown={(event) => event.stopPropagation()} onClick={() => hitAt(pinata.playerId, pinata.x, pinata.y)}>
            <svg viewBox="0 0 160 200" aria-hidden="true"><path d="M80 8 98 48 142 34 126 80 155 104 120 125 133 172 88 155 56 192 44 147 5 133 34 97 14 56 61 58Z" fill="#e45b9d" stroke="#34254c" strokeWidth="6" strokeLinejoin="round"/><path d="m35 78 91-6M30 101l112-3M23 126l98-3M47 146l74-2" stroke="#f5c847" strokeWidth="14"/><path d="m34 88 94-5M28 114l108-3M44 137l79-1" stroke="#66c7df" strokeWidth="8"/><path d="m51 77 3 9m21-11 2 9m25-10 3 9M43 101l3 9m22-11 2 10m25-10 1 9" stroke="#34254c" strokeOpacity=".5" strokeWidth="3"/><path d="m58 56 10-3m27-3 10-2" stroke="#34254c" strokeWidth="5" strokeLinecap="round"/>{pinata.hits > 0 && <path d={pinata.hits === 1 ? 'm78 61-9 29 14 14' : 'm78 61-9 29 14 14-18 23 19 28'} fill="none" stroke="#34254c" strokeWidth="5"/>}</svg>
          </button>
          {pinata.readyAt !== null && <div className="pinata-candy" role="status"><span aria-hidden="true">✦ 🍬 ✦</span><strong>+10 candy!</strong><small>New piñata coming…</small></div>}
          <p className="pinata-hit-count">{pinata.hits} / {snapshot.hitsToBreak} hits</p>
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Let’s fill the candy jar!</span></div>}
        </div>
      </section>)}
    </div>
    <p className="pinata-help">Wave at your piñata, click it, or focus its button and press Enter or Space.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Piñata Party paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Party paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Piñata Party results"><h2 ref={resultsRef} tabIndex={-1}>{goalReached ? 'Sweet teamwork!' : 'What a candy party!'}</h2><p>Team candy: {snapshot.teamCandy} / {snapshot.teamGoal}</p><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} candy contributed</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
