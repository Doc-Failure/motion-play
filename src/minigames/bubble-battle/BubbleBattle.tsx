import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import type { PlayerId } from '../../input/PlayerZoneMapper'
import { BubbleBattleModel, type BubbleBattleSnapshot } from './BubbleBattleModel'

export function BubbleBattle({ playerCount, inputEvents = [], onExit }: { playerCount: 1 | 2; inputEvents?: MotionInputEvent[]; onExit: () => void }) {
  const model = useRef(new BubbleBattleModel({ playerCount }))
  const [snapshot, setSnapshot] = useState<BubbleBattleSnapshot>(() => model.current.start(performance.now()))

  useEffect(() => {
    let frame = 0
    const tick = (timestamp: number) => {
      setSnapshot(model.current.update(timestamp))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    for (const event of inputEvents) setSnapshot(model.current.handleInput(event))
  }, [inputEvents])

  const hitWithPointer = (playerId: PlayerId, event: PointerEvent<HTMLDivElement>) => {
    if (snapshot.phase !== 'playing') return
    const bounds = event.currentTarget.getBoundingClientRect()
    setSnapshot(model.current.handleInput({ playerId, kind: 'MOTION_HIT', x: (event.clientX - bounds.left) / bounds.width, y: (event.clientY - bounds.top) / bounds.height, confidence: 1, timestamp: performance.now() }))
  }

  const replay = () => setSnapshot(model.current.start(performance.now()))
  const seconds = Math.ceil(snapshot.roundRemainingMs / 1000)
  const players = Array.from({ length: playerCount }, (_, index) => (index + 1) as PlayerId)
  const topScore = Math.max(...snapshot.scores.map(({ score }) => score))
  const winners = snapshot.scores.filter(({ score }) => score === topScore).map(({ playerId }) => playerId)

  return <section className="bubble-game" aria-labelledby="bubble-game-title">
    <header className="bubble-game__header"><div><p className="eyebrow">{playerCount === 1 ? 'One-player motion game' : 'Two-player motion battle'}</p><h1 id="bubble-game-title">Bubble Battle</h1></div><dl>{snapshot.scores.map(({ playerId, score }) => <div key={playerId}><dt>Player {playerId}</dt><dd>{score}</dd></div>)}<div><dt>Time</dt><dd>{seconds}s</dd></div></dl><button className="text-button" type="button" onClick={onExit}>Exit game</button></header>
    <p className="bubble-game__rules">Move over bubbles for +10. Keep clear of bombs — they cost 15 points. Mouse or touch works too.</p>
    <div className={`bubble-boards bubble-boards--${playerCount}`}>{players.map((playerId) => <div key={playerId} className={`bubble-viewport bubble-viewport--${playerId}`}><h2>Player {playerId}</h2><div className="bubble-board" onPointerDown={(event) => hitWithPointer(playerId, event)} aria-label={`Player ${playerId} Bubble Battle play area`}>
      {snapshot.targets.filter((target) => target.playerId === playerId).map((target) => <span key={target.id} aria-hidden="true" className={`battle-target battle-target--${target.kind}`} style={{ left: `${(target.x - target.radius) * 100}%`, top: `${(target.y - target.radius) * 100}%`, width: `${target.radius * 200}%`, height: `${target.radius * 200}%` }}>{target.kind === 'bomb' ? '✹' : '○'}</span>)}
      {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Player {playerId}, get ready!</span></div>}
    </div><p className="bubble-feedback" role="status">{snapshot.lastResults[playerId] === 'bubble' ? 'Pop! +10' : snapshot.lastResults[playerId] === 'bomb' ? 'Oops — bomb! −15' : 'Wave at a bubble to pop it.'}</p></div>)}</div>
    {snapshot.phase === 'results' && <div className="battle-results" role="dialog" aria-labelledby="battle-results-title"><p className="eyebrow">Round complete</p><h2 id="battle-results-title">{playerCount === 1 ? 'Great popping!' : winners.length > 1 ? 'It’s a tie!' : `Player ${winners[0]} wins!`}</h2><div className="battle-results__scores">{snapshot.scores.map(({ playerId, score }) => <p key={playerId}><strong>Player {playerId}</strong><span>{score} points</span></p>)}</div><button className="crayon-button crayon-button--primary" type="button" onClick={replay}>Play again</button></div>}
  </section>
}
