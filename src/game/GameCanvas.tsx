import { useEffect, useRef } from 'react'

import { createGame } from './createGame'

export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const game = createGame(host)
    return () => game.destroy(true)
  }, [])

  return (
    <section className="game-card" aria-labelledby="game-preview-title">
      <h2 id="game-preview-title">Game preview</h2>
      <div ref={hostRef} className="game-canvas" data-testid="game-canvas" />
    </section>
  )
}
