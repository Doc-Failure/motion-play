import { CrayonBurst } from '../design/CrayonBurst'
import { ScribbleIcon, type ScribbleIconName } from '../design/ScribbleIcon'

type HomeAction = {
  title: string
  description: string
  icon: ScribbleIconName
  tone: 'coral' | 'blue' | 'yellow' | 'green'
  featured?: boolean
}

const actions: HomeAction[] = [
  { title: 'Quick Play', description: 'Jump into a surprise game made for your group.', icon: 'play', tone: 'coral', featured: true },
  { title: 'Game Catalog', description: 'Peek at every game in the toy box.', icon: 'cards', tone: 'blue' },
  { title: 'Tournament', description: 'Play a set of games and chase the top score.', icon: 'trophy', tone: 'yellow' },
  { title: 'Settings', description: 'Tune sound, motion, and accessibility.', icon: 'gear', tone: 'green' },
]

export function App() {
  return (
    <main className="home-shell">
      <header className="site-header" aria-label="Motion Play home">
        <a className="wordmark" href="#top" aria-label="Motion Play home">
          <span aria-hidden="true" className="wordmark-spark">✦</span>
          Motion Play
        </a>
        <p className="local-note"><span aria-hidden="true">●</span> Play together, right here</p>
      </header>

      <section className="hero" id="top" aria-labelledby="app-title">
        <div className="hero-copy">
          <p className="eyebrow"><span aria-hidden="true">〰</span> Your living room is the playground</p>
          <h1 id="app-title">Ready. Set.<span>Move!</span></h1>
          <p className="intro">Grab your people, make some room, and play joyful games with your whole body.</p>
          <a className="crayon-button crayon-button--primary" href="#play-menu">
            <ScribbleIcon name="play" />
            Choose a game
            <span aria-hidden="true" className="button-arrow">→</span>
          </a>
          <p className="privacy-note"><ScribbleIcon name="home" /> No accounts. No uploads. Just local play.</p>
        </div>

        <div className="hero-art" aria-hidden="true"><CrayonBurst /></div>
      </section>

      <section className="play-menu" id="play-menu" aria-labelledby="play-menu-title">
        <div className="section-heading">
          <p className="eyebrow">Pick your path</p>
          <h2 id="play-menu-title">How do you want to play?</h2>
        </div>
        <div className="action-grid">
          {actions.map((action) => (
            <article className={`action-card action-card--${action.tone}${action.featured ? ' action-card--featured' : ''}`} key={action.title}>
              {action.featured && <span className="sticker">Start here!</span>}
              <div className="action-icon" aria-hidden="true"><ScribbleIcon name={action.icon} /></div>
              <div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
                <span className="coming-soon">Coming soon</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="home-footer"><p><span aria-hidden="true">★</span> Made for 1–4 local players <span aria-hidden="true">★</span></p></footer>
    </main>
  )
}
