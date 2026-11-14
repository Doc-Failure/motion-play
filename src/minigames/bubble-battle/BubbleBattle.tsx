import { useEffect, useRef, useState, type PointerEvent } from 'react'
import type { MotionInputEvent } from '../../input/MotionProcessor'
import { BubbleBattleModel, type BubbleBattleSnapshot } from './BubbleBattleModel'

export function BubbleBattle({ inputEvents = [], onExit }: { inputEvents?: MotionInputEvent[]; onExit: () => void }) {
  const model = useRef(new BubbleBattleModel())
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

  const hitWithPointer = (event: PointerEvent<HTMLDivElement>) => {
    if (snapshot.phase !== 'playing') return
    const bounds = event.currentTarget.getBoundingClientRect()
    const input: MotionInputEvent = {
      playerId: 1,
      kind: 'MOTION_HIT',
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
      confidence: 1,
      timestamp: performance.now(),
    }
    setSnapshot(model.current.handleInput(input))
  }

  const replay = () => setSnapshot(model.current.start(performance.now()))
  const seconds = Math.ceil(snapshot.roundRemainingMs / 1000)
  return <section className="bubble-game" aria-labelledby="bubble-game-title">
    <header className="bubble-game__header"><div><p className="eyebrow">One-player motion game</p><h1 id="bubble-game-title">Bubble Battle</h1></div><dl><div><dt>Score</dt><dd>{snapshot.scores[0].score}</dd></div><div><dt>Time</dt><dd>{seconds}s</dd></div></dl><button className="text-button" type="button" onClick={onExit}>Exit game</button></header>
    <p className="bubble-game__rules">Move over bubbles for +10. Keep clear of bombs — they cost 15 points. Mouse or touch works too.</p>
    <div className="bubble-board" onPointerDown={hitWithPointer} aria-label="Bubble Battle play area">
      {snapshot.targets.map((target) => <span key={target.id} aria-hidden="true" className={`battle-target battle-target--${target.kind}`} style={{ left: `${(target.x - target.radius) * 100}%`, top: `${(target.y - target.radius) * 100}%`, width: `${target.radius * 200}%`, height: `${target.radius * 200}%` }}>{target.kind === 'bomb' ? '✹' : '○'}</span>)}
      {snapshot.phase === 'countdown' && <div className="game-curtain"><strong>{Math.max(1, Math.ceil(snapshot.countdownRemainingMs / 1000))}</strong><span>Get ready to move!</span></div>}
      {snapshot.phase === 'results' && <div className="game-curtain"><strong>Great popping!</strong><span>Final score: {snapshot.scores[0].score}</span><button className="crayon-button crayon-button--primary" type="button" onClick={replay}>Play again</button></div>}
    </div>
    <p className="bubble-feedback" role="status">{snapshot.lastResult === 'bubble' ? 'Pop! +10' : snapshot.lastResult === 'bomb' ? 'Oops — bomb! −15' : 'Wave at a bubble to pop it.'}</p>
  </section>
}
