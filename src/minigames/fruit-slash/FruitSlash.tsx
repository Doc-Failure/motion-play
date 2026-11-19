import {ChallengeResult} from '../../game/ArcadeRound'
import {useChallenge} from '../../game/ChallengeContext'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { GameFeedback } from '../../game/GameFeedback'
import { useRoundRecovery, type RoundRecoveryProps } from '../../game/useRoundRecovery'
import { HandSwipeTracker } from '../../input/HandSwipe'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerCount, PlayerId } from '../../input/PlayerZoneMapper'
import { FruitSlashModel } from './FruitSlashModel'
import './fruit-slash.css'

export function FruitSlash({ playerCount, inputEvents = [], onExit, externalPauseReason, onReconnect, random }: RoundRecoveryProps & {
  playerCount: PlayerCount; inputEvents?: MotionInputEvent[]; onExit(): void; random?: () => number
}) {
  const challenge = useChallenge()
  const pressure = challenge?.pressure ?? 0
  const [initial] = useState(() => { const model = new FruitSlashModel({ pressure, roundDurationMs: challenge ? 36_000 : undefined, playerCount, random }); return { model, snapshot: model.start(performance.now()) } })
  const { model } = initial
  const [snapshot, setSnapshot] = useState(initial.snapshot)
  const tracker = useRef(new HandSwipeTracker())
  const pointers = useRef(new Map<PlayerId, number>())
  const results = useRef<HTMLHeadingElement>(null)
  const recovery = useRoundRecovery({ model, snapshot, setSnapshot, title: 'Fruit Slash', externalPauseReason, onReconnect, onExit })
  useEffect(() => {
    let frame = 0
    const tick = (time: number) => { setSnapshot(model.update(time)); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [model])
  useEffect(() => { for (const event of inputEvents) setSnapshot(model.slash(event)) }, [inputEvents, model])
  useEffect(() => {
    if (snapshot.phase !== 'playing') { tracker.current.reset(); pointers.current.clear() }
    if (snapshot.phase === 'results') results.current?.focus()
  }, [snapshot.phase])
  const release = (id: PlayerId) => { tracker.current.reset(id); pointers.current.delete(id) }
  const pointer = (id: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    if (snapshot.phase !== 'playing') return
    if (pointers.current.get(id) !== event.pointerId) { release(id); pointers.current.set(id, event.pointerId) }
    const bounds = event.currentTarget.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const swipe = tracker.current.sample({ playerId: id, kind: 'HAND_POSITION', x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height, confidence: 1, timestamp: performance.now() })
    if (swipe) setSnapshot(model.slash(swipe))
  }
  return <section className="slash-game" aria-labelledby="slash-title">
    <GameFeedback snapshot={snapshot}/>
    <header className="bubble-game__header"><h1 id="slash-title">Fruit Slash</h1><dl><div><dt>Time</dt><dd>{Math.ceil(snapshot.roundRemainingMs / 1000)}s</dd></div></dl>{recovery.pauseButton}<button className="text-button" onClick={onExit}>Exit game</button></header>
    <p className="slash-rules">Swipe fruit +10 · Avoid × bombs −15. Sweep your hand across the fruit. A pointer or arrow key works too.</p>
    <div className="slash-boards">{snapshot.scores.map(({ playerId, score }) => <section className="slash-player" key={playerId}>
      <h2>Player {playerId}<span>{score} points</span></h2>
      <div id={`slash-player-${playerId}`} className="slash-board" role="group" tabIndex={0} aria-label={`Player ${playerId} Fruit Slash play area`} aria-describedby="slash-help"
        onPointerDown={event => { release(playerId); pointer(playerId, event) }} onPointerMove={event => pointer(playerId, event)}
        onPointerLeave={() => release(playerId)} onPointerUp={() => release(playerId)} onPointerCancel={() => release(playerId)} onBlur={() => release(playerId)}
        onKeyDown={event => {
          if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return
          event.preventDefault()
          if (event.repeat) return
          const horizontal = event.key === 'ArrowLeft' || event.key === 'ArrowRight'
          const reverse = event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          setSnapshot(model.slash({ playerId, kind: 'HAND_SWIPE', x: horizontal ? reverse ? 0 : 1 : .5, y: horizontal ? .5 : reverse ? 0 : 1, confidence: 1, timestamp: performance.now(), swipe: { fromX: horizontal ? reverse ? 1 : 0 : .5, fromY: horizontal ? .5 : reverse ? 1 : 0, durationMs: 120 } }))
        }}>
        {snapshot.fruit.filter(item => item.playerId === playerId).map(item => <span key={item.id} className={`slash-fruit slash-fruit--${item.kind}`} style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }} aria-label={item.kind}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M48 24 C14 5 3 51 18 77 Q50 101 82 76 C99 43 78 9 52 24Z" fill={item.kind === 'bomb' ? '#29313c' : item.kind === 'apple' ? '#ee654f' : '#f28c46'} stroke="#29313c" strokeWidth="6" strokeLinejoin="round"/><path d="m49 25 5-19 18 3" fill="none" stroke="#3a6841" strokeWidth="7" strokeLinecap="round"/>{item.kind === 'bomb' ? <path d="m34 40 32 32 m-2-34-30 35" stroke="#fff9e9" strokeWidth="9"/> : <path d="m25 40-3 19 m7-27-1 5" stroke="#fff9e9" strokeWidth="5" strokeLinecap="round"/>}</svg>
        </span>)}
        <svg className="slash-trails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{snapshot.trails.filter(trail => trail.playerId === playerId).map(trail => <path key={playerId} d={`M${trail.fromX*100} ${trail.fromY*100} L${trail.x*100} ${trail.y*100}`} fill="none" stroke="#ffe17a" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>)}</svg>
        {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Ready to slice!</span></div>}
      </div>
    </section>)}</div>
    <p id="slash-help" className="slash-help">Sweep quickly across fruit with a pointer or touch. Focus a lane and press an arrow key to slash across its center. Bombs have a white ×. Each object scores once.</p>
    {recovery.pauseDialog}
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-label="Fruit Slash results"><h2 ref={results} tabIndex={-1}>Nice slicing!</h2><ChallengeResult scores={snapshot.scores}/>{snapshot.scores.map(({ playerId, score }) => <p key={playerId}>Player {playerId}: {score} points</p>)}<button className="crayon-button" onClick={() => { tracker.current.reset(); pointers.current.clear(); setSnapshot(model.start(performance.now())); document.getElementById('slash-player-1')?.focus() }}>Play again</button><button className="text-button" onClick={onExit}>Back to setup</button></div>}
  </section>
}
