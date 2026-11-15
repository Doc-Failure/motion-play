import { useEffect, useState } from 'react'
import type { PlayableGame } from '../camera/CameraSetup'
import type { PlayerCount } from '../input/PlayerZoneMapper'

const PRACTICE_SECONDS = 7

export function PracticeTutorial({ playerCount, game = 'bubble-battle', onStart, onBack }: { playerCount: PlayerCount; game?: PlayableGame; onStart(): void; onBack(): void }) {
  const [remaining, setRemaining] = useState(PRACTICE_SECONDS)
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining((current) => {
      if (current <= 1) { window.clearInterval(timer); queueMicrotask(onStart); return 0 }
      return current - 1
    }), 1_000)
    return () => window.clearInterval(timer)
  }, [onStart])

  const spinning = game === 'plate-spinner'
  const graffiti = game === 'graffiti-race'
  const pizza = game === 'pizza-maker'
  const washing = game === 'car-wash'
  const wiping = game === 'window-wipe'
  const whacking = game === 'whack-a-mole'
  const treasure = game === 'treasure-grab'
  const collecting = game === 'star-collector'
  const shopping = game === 'supermarket-rush'
  const defending = game === 'monster-defense'
  const partying = game === 'pinata-party'
  const smashing = game === 'meteor-smash'
  const ballooning = game === 'balloon-panic'
  const mining = game === 'gold-rush'
  const painting = game === 'paint-splash'
  const remembering = game === 'simon-says'
  const pong = game === 'air-pong'
  const keeping = game === 'goalkeeper'
  return <section className="practice-card" aria-labelledby="practice-title"><p className="eyebrow">Optional practice • {remaining}s</p><h1 id="practice-title">{spinning ? 'Keep the plates spinning' : graffiti ? 'Reveal your secret mural' : pizza ? 'Match your pizza order' : washing ? 'Scrub the cars together' : treasure ? 'Find treasure, avoid curses' : collecting ? 'Catch the fading stars' : shopping ? 'Pick from your shopping list' : defending ? 'Protect the gates together' : partying ? 'Fill the candy jar together' : wiping ? 'Sweep across the window' : whacking ? 'Whack the popping mole' : smashing ? 'Smash meteors before impact' : ballooning ? 'Match the balloon color' : mining ? 'Grab the falling gold' : painting ? 'Splash color everywhere' : remembering ? 'Watch, then copy the pattern' : pong ? 'Move your paddle with your hand' : keeping ? 'Move your body across the goal' : 'Wave at the bubbles'}</h1><p>{spinning ? 'Rescue plates marked Wobbling for 10 points. A drop costs 5 points; a replacement arrives after a moment. Full-speed plates need no tap. Wave, click, or focus a plate button and press Enter or Space. Each player owns three plates; most points wins.' : graffiti ? 'Paint fresh patches on your own wall for points. First to reveal the whole mural wins; most patches wins at the timer. Wave, drag with a mouse or finger, or focus your wall and use arrow keys then Space or Enter to paint.' : pizza ? 'Choose both toppings on your order in any order: 10 points each and 20 bonus points per pizza. Wrong or repeated toppings cost 5. Each player has their own pizza; serve three pizzas per player together. Wave at a topping, click it, or focus its button and press Enter or Space. Leave a moment between picks.' : washing ? 'Keep moving over your car to scrub away the mud. Each fresh patch helps the team clean all the cars. Drag with a mouse or finger, or focus your car, use arrow keys to move the brush and Space or Enter to scrub.' : treasure ? 'Grab gold chests for 10 points. Purple cursed objects marked × lose 10 points. Let curses disappear; missed objects cost nothing. Each player has their own map. Wave, click, or focus a chest button and press Enter or Space.' : collecting ? 'Touch each star for 10 points before its purple lifetime ring runs out. Missed stars cost nothing. Each player has their own sky. Wave, click, or focus a star button and press Enter or Space.' : shopping ? 'Read your own shopping list, then hit that grocery on the moving belt for 10 points. Wrong picks cost 5 points. Each correct pick changes your list. Let other groceries pass. Wave, click, or focus a grocery button and press Enter or Space.' : defending ? 'Stop monsters in your own lane for 10 points before they reach the gate. Each breach costs 5 points. Everyone adds to the shared team goal. Wave, click a monster, or focus its button and press Enter or Space.' : partying ? 'Hit your own piñata three times to spill 10 candy into the shared jar. Leave a little space between hits, then try the new piñata. Wave, click, or focus the piñata button and press Enter or Space.' : wiping ? 'Move continuously to scrub away each smudge. Every player cleans only their own window.' : whacking ? 'Move over a mole while it is above the ground. Be quick—each one ducks away.' : smashing ? 'Hit each falling meteor for 10 points before it reaches your base. Every impact costs 5 points.' : ballooning ? 'Watch the color callout, then hit only balloons of that color. Wrong colors lose 5 points.' : mining ? 'Hit falling gold coins for 10 points. Avoid the dark rocks—they take 10 points away.' : painting ? 'Keep moving across your canvas to cover fresh paper. Each player paints only their own canvas.' : remembering ? 'Watch the pads light up, then hit the same pads in order. The pattern grows after everyone finishes.' : pong ? 'Move your hand up and down to line up the paddle. Each return earns 10 points; a miss loses 5.' : keeping ? 'Lean and duck to put your keeper in the shot path. Every save earns 10 points; a goal loses 5.' : 'Each player stays in their own camera zone. Move over bubbles, avoid the dark bombs, and watch your motion meter before the round starts.'}</p><div className={`practice-zones practice-zones--${playerCount}`} aria-label={`${playerCount} player practice preview`}>{Array.from({ length: playerCount }, (_, index) => <div key={index}><span className="practice-bubble" aria-hidden="true">{spinning ? '◉' : graffiti ? '✎' : pizza ? '△' : washing ? '✦' : treasure ? '◇' : collecting ? '★' : shopping ? '←' : defending ? '♧' : partying ? '🍬' : wiping ? '✦' : whacking ? '●' : smashing ? '☄' : ballooning ? '◉' : mining ? '★' : painting ? '✎' : remembering ? '☀' : pong ? '↕' : keeping ? '🥅' : '○'}</span><strong>Player {index + 1}</strong></div>)}</div><div className="practice-actions"><button className="crayon-button crayon-button--primary" type="button" onClick={onStart}>Start round now</button><button className="text-button" type="button" onClick={onBack}>Back to setup</button></div></section>
}
