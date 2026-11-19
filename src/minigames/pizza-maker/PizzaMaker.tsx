import {useLegacyReadyGate} from '../../game/useLegacyReadyGate'
import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { GameFeedback } from '../../game/GameFeedback'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { PizzaMakerModel, ingredientTargets } from './PizzaMakerModel'

export function PizzaMaker({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect }: {
  playerCount: PlayerCount
  inputEvents?: MotionInputEvent[]
  onExit(): void
  externalPauseReason?: string | null
  onReconnect?(): void
}) {
  const challenge = useChallenge()
  const [model] = useState(() => new PizzaMakerModel({ playerCount, pressure:challenge?.pressure, roundDurationMs:challenge ? 40000 : undefined }))
  const [snapshot, setSnapshot] = useState(() => model.start(performance.now()))
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const pauseHeadingRef = useRef<HTMLHeadingElement>(null)
  const resultsRef = useRef<HTMLHeadingElement>(null)
  const pauseButtonRef = useRef<HTMLButtonElement>(null)
  const previousPhaseRef = useRef(snapshot.phase)
  useLegacyReadyGate(snapshot.phase,externalPauseReason,()=>{
    setSnapshot(model.resume(performance.now()))
    setPauseReason(null)
  })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.hit(event)) }, [inputEvents, model])
  useEffect(() => {
    if (externalPauseReason && (snapshot.phase === 'playing' || snapshot.phase === 'countdown')) {
      setSnapshot(model.pause(performance.now()))
      setPauseReason(externalPauseReason)
    }
  }, [externalPauseReason, model, snapshot.phase])
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) { setSnapshot(model.pause(performance.now())); setPauseReason('The tab was hidden. Ready to cook?') }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [model])
  useEffect(() => {
    if (snapshot.phase === 'results') resultsRef.current?.focus()
    if (snapshot.phase === 'paused') pauseHeadingRef.current?.focus()
    if ((previousPhaseRef.current === 'paused' || previousPhaseRef.current === 'results')
      && (snapshot.phase === 'playing' || snapshot.phase === 'countdown')) pauseButtonRef.current?.focus()
    previousPhaseRef.current = snapshot.phase
  }, [snapshot.phase])

  const hitAt = (playerId: PlayerId, x: number, y: number) => setSnapshot(model.hit({ playerId, kind: 'MOTION_HIT', x, y, confidence: 1, timestamp: performance.now() }))
  const pointerHit = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    hitAt(playerId, (event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height)
  }
  return <section className="pizza-game" aria-labelledby="pizza-title"><GameFeedback snapshot={snapshot} />
    <header className="bubble-game__header">
      <div><p className="eyebrow">Motion hit game</p><h1 id="pizza-title">Pizza Maker</h1></div>
      <dl><div><dt>Team pizzas</dt><dd>{snapshot.teamPizzas} / {snapshot.teamGoal}</dd></div><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>
      <button ref={pauseButtonRef} className="text-button" type="button" disabled={snapshot.phase !== 'playing' && snapshot.phase !== 'countdown'} onClick={() => { setSnapshot(model.pause(performance.now())); setPauseReason('Take a breather!') }}>Pause</button>
      <button className="text-button" type="button" onClick={onExit}>Exit game</button>
    </header>
    <p className="pizza-rules">Match the requested toppings in any order: +10 each, +20 per pizza. Wrong or repeated toppings cost 5. Serve {snapshot.teamGoal} pizzas together!</p>
    <div className={`pizza-boards pizza-boards--${playerCount}`}>
      {snapshot.scores.map(({ playerId, score }) => {
        const order = snapshot.orders.find((entry) => entry.playerId === playerId)!
        const serving = order.added.length === order.requested.length
        return <section className={`pizza-player pizza-player--${playerId}`} key={playerId} aria-label={`Player ${playerId}`}>
        <h2>Player {playerId}<span>{score} points · {order.completed} pizzas</span></h2>
        <p className="pizza-order" aria-label={`Player ${playerId} order`}>Order: {order.requested.map((kind) => `${order.added.includes(kind) ? '✓ ' : ''}${kind}`).join(' + ')}</p>
        <div className="pizza-board" aria-label={`Player ${playerId} Pizza Maker play area`} onPointerDown={(event) => pointerHit(playerId, event)}>
          <svg className="pizza-pie" viewBox="0 0 200 140" aria-hidden="true">
            <path d="M22 74C12 4 174 0 181 66S38 142 22 74Z" fill="#e8ad60"/>
            <path d="M33 72C23 19 161 14 168 65S45 126 33 72Z" fill="#ee654f"/>
            <path d="M42 70C33 28 152 23 157 64S50 116 42 70Z" fill="#ffe48a"/>
            {order.added.map((kind, index) => <g key={kind} transform={`translate(${65 + index * 60} 62)`}><IngredientArt kind={kind}/></g>)}
          </svg>
          {serving && <p className="pizza-serving" role="status">✓ Pizza served!</p>}
          {ingredientTargets.map((target) => <button key={target.kind} className="pizza-target" style={{ left: `${target.x * 100}%`, top: `${target.y * 100}%` }} type="button" aria-label={`Pick Player ${playerId} ${target.kind}`} disabled={snapshot.phase !== 'playing' || serving} onPointerDown={(event) => event.stopPropagation()} onClick={() => hitAt(playerId, target.x, target.y)}>
            <svg viewBox="-40 -40 80 80" aria-hidden="true"><IngredientArt kind={target.kind}/></svg><span>{target.kind}</span>
          </button>)}
          {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Check your pizza order!</span></div>}
        </div>
        <p className="pizza-feedback" role="status" aria-label={`Player ${playerId} pick feedback`} aria-atomic="true">{order.feedback}</p>
      </section>})}
    </div>
    <p className="pizza-help">Wave at a topping, click it, or focus its button and press Enter or Space. Leave a moment between picks. Each player has their own order.</p>
    {snapshot.phase === 'paused' && <div className="battle-results" role="dialog" aria-label="Pizza Maker paused"><h2 ref={pauseHeadingRef} tabIndex={-1}>Kitchen paused</h2><p>{externalPauseReason || pauseReason}</p><button className="crayon-button" type="button" disabled={Boolean(externalPauseReason)} onClick={() => { setSnapshot(model.resume(performance.now())); setPauseReason(null) }}>Resume</button>{externalPauseReason && onReconnect && <button className="crayon-button" type="button" onClick={onReconnect}>Reconnect camera</button>}<button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Pizza Maker results"><h2 ref={resultsRef} tabIndex={-1}>{snapshot.teamPizzas >= snapshot.teamGoal ? "Tasty teamwork!" : "Pizza party complete!"}</h2><ChallengeResult scores={snapshot.scores}/><p>Team pizzas: {snapshot.teamPizzas} / {snapshot.teamGoal}</p><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={() => setSnapshot(model.start(performance.now()))}>Play again</button><button className="text-button" type="button" onClick={onExit}>Back to setup</button></div>}
  </section>
}

function IngredientArt({ kind }: { kind: 'tomato' | 'mushroom' | 'basil' }) {
  return kind === 'tomato' ? <><path d="M-26 0C-29-33 28-32 27 0S-24 34-26 0Z" fill="#ee654f"/><path d="m-14-6 28 13M-12 10 13-12" stroke="#ffe48a"/></> : kind === 'mushroom' ? <><path d="m-8-1-4 28 27-2-6-27" fill="#fff8e7"/><path d="M-30 0C-32-38 31-38 31 0Z" fill="#bd916e"/></> : <><path d="M-27 23Q-35-33 27-25 36 25-27 23Z" fill="#72b779"/><path d="m-25 21 43-38"/></>
}
