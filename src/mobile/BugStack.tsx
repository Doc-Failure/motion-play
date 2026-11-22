import { useCallback, useEffect, useReducer, useState } from 'react'
import { useBugStackCamera } from '../camera/useBugStackCamera'
import type { HandControl } from '../input/BugStackGestures'
import { blocks, HEIGHT, landing, level, move, newStack, shapeOf, WIDTH, type Kind, type Move, type Stack } from '../minigames/bug-stack/model'
import '../design/typography.css'
import './bug-stack.css'

type Action = Move | { seed: number } | { hand: HandControl }
function reduce(state: Stack, action: Action): Stack {
  if (typeof action === 'object' && 'seed' in action) return newStack(action.seed)
  if (typeof action === 'object' && 'hand' in action) {
    const { column, rotate, drop } = action.hand
    let next = move(state, { column })
    if (rotate) next = move(next, 'rotate')
    return drop ? move(next, 'drop') : next
  }
  return move(state, action)
}

function Board({ state, intro }: { state: Stack; intro: boolean }) {
  const cells = state.board.flat()
  const ghost = new Set(blocks(landing(state)).map(({ x, y }) => y * WIDTH + x))
  for (const { x, y } of blocks(state.piece)) if (y >= 0) cells[y * WIDTH + x] = state.piece.kind
  if (intro) {
    const sample = ['........L.', '..OOS..LLL', 'J.OOSS.TT.', 'JJJIISZZTT']
    sample.forEach((row, i) => [...row].forEach((c, x) => {
      cells[(HEIGHT - sample.length + i) * WIDTH + x] = c === '.' ? null : c as Kind
    }))
  }
  return <div className="bug-board" role="img" aria-label="Falling blocks playfield">
    {cells.map((kind, i) => <i aria-hidden="true" key={i}
      className={kind ? 'tile ' + kind : !intro && ghost.has(i) ? 'shadow-cell' : ''} />)}
  </div>
}

function NextPiece({ kind }: { kind: Kind }) {
  const shape = shapeOf(kind).filter(row => row.includes('#'))
  return <div className="bug-next" aria-label={'Next piece ' + kind}
    style={{ gridTemplateColumns: 'repeat(' + shape[0].length + ', 1fr)' }}>
    {shape.flatMap((row, i) => [...row].map((cell, j) =>
      <i key={i + '-' + j} className={cell === '#' ? 'tile ' + kind : ''} />))}
  </div>
}

export default function BugStack() {
  const [state, dispatch] = useReducer(reduce, 0, newStack)
  const [mode, setMode] = useState<'intro' | 'camera' | 'touch'>('intro')
  const [paused, setPaused] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const cameraOn = mode === 'camera' && !paused && !state.over
  const hand = useCallback((event: HandControl) => dispatch({ hand: event }), [])
  const { video, status, error } = useBugStackCamera(cameraOn, hand, attempt)
  const playing = !paused && !state.over && (mode === 'touch' || (cameraOn && status === 'tracking'))
  const speed = Math.max(150, 850 - (level(state) - 1) * 75)
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => dispatch('fall'), speed)
    return () => window.clearInterval(timer)
  }, [playing, speed])
  useEffect(() => {
    const hide = () => { if (document.hidden && mode !== 'intro') setPaused(true) }
    document.addEventListener('visibilitychange', hide)
    return () => document.removeEventListener('visibilitychange', hide)
  }, [mode])
  const start = (choice: 'camera' | 'touch') => {
    dispatch({ seed: Date.now() >>> 0 })
    setPaused(false)
    setMode(choice)
  }
  const intro = mode === 'intro'
  const cameraError = cameraOn && status === 'error'
  return <main className="bug-stack">
    <header className="bug-heading"><div><small>playpop.party</small><h1>Bug Stack<span aria-hidden="true">✳</span></h1></div>
      {!intro && !state.over && !paused && <button onClick={() => setPaused(true)}>Pause</button>}
    </header>
    <div className="bug-layout">
      <div className="bug-field"><Board state={state} intro={intro} />
        {(intro || state.over || paused || cameraError) && <div className="bug-dialog">
          <h2>{intro ? 'Hand-gesture Tetris' : state.over ? 'Stack full!' : paused ? 'Paused' : 'Camera help'}</h2>
          {intro && <><p>Fill a row with bugs to clear it.</p><p>Slide your hand to steer, pinch to turn, and swipe down to drop.</p>
            <button className="primary" onClick={() => start('camera')}>Play with camera</button>
            <button onClick={() => start('touch')}>Play by touch</button></>}
          {state.over && <><p>{state.score} points · {state.lines} rows</p>
            <button className="primary" onClick={() => start(mode === 'touch' ? 'touch' : 'camera')}>Play again</button></>}
          {paused && !state.over && <button className="primary" onClick={() => setPaused(false)}>Resume</button>}
          {cameraError && <><p role="alert">{error}</p><button className="primary" onClick={() => setAttempt(n => n + 1)}>Retry camera</button>
            <button onClick={() => setMode('touch')}>Continue by touch</button></>}
          {!intro && <button onClick={() => { setPaused(false); setMode('intro'); dispatch({ seed: 0 }) }}>Back to start</button>}
        </div>}
      </div>
      <aside className="bug-rail">
        <section><h2>Next</h2><NextPiece kind={state.bag[0]} /></section>
        <dl><dt>Score</dt><dd>{state.score}</dd><dt>Rows</dt><dd>{state.lines}</dd><dt>Level</dt><dd>{level(state)}</dd></dl>
        {mode === 'camera' && <div className="bug-preview"><video ref={video} autoPlay playsInline muted aria-label="Mirrored camera preview" />
          <span role="status">{paused || state.over ? 'Camera off' : status === 'starting' ? 'Starting camera…' : status === 'tracking' ? 'Hand found' : status === 'error' ? 'Camera off' : 'Show one hand'}</span></div>}
      </aside>
      <footer className="bug-footer">
        {mode === 'touch' && !state.over && !paused ? <div className="bug-controls">
          {(['left', 'rotate', 'right', 'drop'] as const).map((action, i) => <button key={action}
            aria-label={action} onClick={() => dispatch(action)}>{['←', '↻', '→', '↓'][i]}</button>)}</div>
        : mode === 'camera' && !paused && !state.over ? <p>Slide to steer · Pinch to turn · Swipe down to drop</p>
        : intro ? <p>Camera play stays on your device.</p> : null}
      </footer>
    </div>
  </main>
}
