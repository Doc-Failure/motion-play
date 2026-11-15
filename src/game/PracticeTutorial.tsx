import { useEffect, useState } from 'react'
import type { PlayerCount } from '../input/PlayerZoneMapper'

const PRACTICE_SECONDS = 7

export function PracticeTutorial({ playerCount, game = 'bubble-battle', onStart, onBack }: { playerCount: PlayerCount; game?: 'bubble-battle' | 'window-wipe' | 'whack-a-mole' | 'balloon-panic' | 'gold-rush' | 'paint-splash'; onStart(): void; onBack(): void }) {
  const [remaining, setRemaining] = useState(PRACTICE_SECONDS)
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((current) => {
      if (current <= 1) { window.clearInterval(timer); queueMicrotask(onStart); return 0 }
      return current - 1
    }), 1_000)
    return () => window.clearInterval(timer)
  }, [onStart])

  const wiping = game === 'window-wipe'
  const whacking = game === 'whack-a-mole'
  const ballooning = game === 'balloon-panic'
  const mining = game === 'gold-rush'
  const painting = game === 'paint-splash'
  return <section className="practice-card" aria-labelledby="practice-title"><p className="eyebrow">Optional practice • {remaining}s</p><h1 id="practice-title">{wiping ? 'Sweep across the window' : whacking ? 'Whack the popping mole' : ballooning ? 'Match the balloon color' : mining ? 'Grab the falling gold' : painting ? 'Splash color everywhere' : 'Wave at the bubbles'}</h1><p>{wiping ? 'Move continuously to scrub away each smudge. Every player cleans only their own window.' : whacking ? 'Move over a mole while it is above the ground. Be quick—each one ducks away.' : ballooning ? 'Watch the color callout, then hit only balloons of that color. Wrong colors lose 5 points.' : mining ? 'Hit falling gold coins for 10 points. Avoid the dark rocks—they take 10 points away.' : painting ? 'Keep moving across your canvas to cover fresh paper. Each player paints only their own canvas.' : 'Each player stays in their own camera zone. Move over bubbles, avoid the dark bombs, and watch your motion meter before the round starts.'}</p><div className={`practice-zones practice-zones--${playerCount}`} aria-label={`${playerCount} player practice preview`}>{Array.from({ length: playerCount }, (_, index) => <div key={index}><span className="practice-bubble" aria-hidden="true">{wiping ? '✦' : whacking ? '●' : ballooning ? '◉' : mining ? '★' : painting ? '✎' : '○'}</span><strong>Player {index + 1}</strong></div>)}</div><div className="practice-actions"><button className="crayon-button crayon-button--primary" type="button" onClick={onStart}>Start round now</button><button className="text-button" type="button" onClick={onBack}>Back to setup</button></div></section>
}
