import type { ReactNode, Ref } from 'react'
import './round-hud.css'

interface RoundHudProps {
  title: string
  titleId?: string
  snapshot: { roundRemainingMs: number; scores: { playerId: number; score: number }[] }
  onExit(): void
  exitRef: Ref<HTMLButtonElement>
  scoreLabel?: string
  children?: ReactNode
}

export function RoundHud({ title, titleId, snapshot, onExit, exitRef, scoreLabel = 'Player scores', children }: RoundHudProps) {
  const seconds = Math.ceil(snapshot.roundRemainingMs / 1000)
  return <header className="round-hud">
    <h1 id={titleId} className="sr-only">{title}</h1>
    <dl className="round-hud__scores" aria-label={scoreLabel}>
      {children ?? snapshot.scores.map(({ playerId, score }) =>
        <div key={playerId}><dt>P{playerId}</dt><dd>{score}</dd></div>
      )}
    </dl>
    <dl className="round-hud__clock" data-ending={seconds <= 10}>
      <div>
        <dt><span className="sr-only">Time remaining</span><svg aria-hidden="true" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5"/><path d="M10 5.5V10l3 2"/></svg></dt>
        <dd>{seconds}s</dd>
      </div>
    </dl>
    <button type="button" ref={exitRef} className="round-hud__exit" onClick={onExit} aria-label="Exit game" title="Exit game">
      <svg aria-hidden="true" viewBox="0 0 20 20"><path d="m5 4.5 10 11m0-11-10 11"/></svg>
    </button>
  </header>
}
