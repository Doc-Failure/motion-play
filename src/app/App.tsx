import { GameCanvas } from '../game/GameCanvas'

export function App() {
  return (
    <main className="app-shell">
      <section className="welcome" aria-labelledby="app-title">
        <p className="eyebrow">Wave, wiggle, play!</p>
        <h1 id="app-title">Motion Play</h1>
        <p className="intro">
          A local party-game playground. The first games are still being drawn.
        </p>
      </section>
      <GameCanvas />
    </main>
  )
}
