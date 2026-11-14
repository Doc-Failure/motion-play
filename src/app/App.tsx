import { useEffect, useMemo, useState } from 'react'
import { CrayonBurst } from '../design/CrayonBurst'
import { ScribbleIcon, type ScribbleIconName } from '../design/ScribbleIcon'
import { catalogCategories, catalogGames, getGameBySlug, type CatalogCategory, type Difficulty } from './catalog'
import { GameArt } from './GameArt'
import { CameraSetup } from '../camera/CameraSetup'

type Route = { page: 'home' } | { page: 'catalog' } | { page: 'camera' } | { page: 'detail'; slug: string }
const routeFromHash = (): Route => {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash === 'catalog') return { page: 'catalog' }
  if (hash === 'camera') return { page: 'camera' }
  if (hash.startsWith('games/')) return { page: 'detail', slug: hash.slice(6) }
  return { page: 'home' }
}

function AppHeader() {
  return <header className="site-header" aria-label="Motion Play"><a className="wordmark" href="#/" aria-label="Motion Play home"><span aria-hidden="true" className="wordmark-spark">✦</span> Motion Play</a><p className="local-note"><span aria-hidden="true">●</span> Play together, right here</p></header>
}

function Home() {
  const actions: Array<{ title: string; description: string; icon: ScribbleIconName; tone: string; href?: string; featured?: boolean }> = [
    { title: 'Quick Play', description: 'Set up your camera or try the no-camera demo.', icon: 'play', tone: 'coral', href: '#/camera', featured: true },
    { title: 'Game Catalog', description: 'Peek at every game in the toy box.', icon: 'cards', tone: 'blue', href: '#/catalog' },
    { title: 'Tournament', description: 'Play a set of games and chase the top score.', icon: 'trophy', tone: 'yellow' },
    { title: 'Settings', description: 'Tune sound, motion, and accessibility.', icon: 'gear', tone: 'green' },
  ]
  return <>
    <section className="hero" id="top" aria-labelledby="app-title"><div className="hero-copy"><p className="eyebrow"><span aria-hidden="true">〰</span> Your living room is the playground</p><h1 id="app-title">Ready. Set.<span>Move!</span></h1><p className="intro">Grab your people, make some room, and play joyful games with your whole body.</p><a className="crayon-button crayon-button--primary" href="#/catalog"><ScribbleIcon name="play" />Choose a game<span aria-hidden="true" className="button-arrow">→</span></a><p className="privacy-note"><ScribbleIcon name="home" /> No accounts. No uploads. Just local play.</p></div><div className="hero-art" aria-hidden="true"><CrayonBurst /></div></section>
    <section className="play-menu" id="play-menu" aria-labelledby="play-menu-title"><div className="section-heading"><p className="eyebrow">Pick your path</p><h2 id="play-menu-title">How do you want to play?</h2></div><div className="action-grid">{actions.map((action) => {
      const content = <><div className="action-icon" aria-hidden="true"><ScribbleIcon name={action.icon} /></div><div><h3>{action.title}</h3><p>{action.description}</p>{action.href ? <span className="browse-label">Browse 32 games <span aria-hidden="true">→</span></span> : <span className="coming-soon">Coming soon</span>}</div></>
      return action.href ? <a className={`action-card action-card--${action.tone}`} href={action.href} key={action.title}>{content}</a> : <article className={`action-card action-card--${action.tone}${action.featured ? ' action-card--featured' : ''}`} key={action.title}>{action.featured && <span className="sticker">Start here!</span>}{content}</article>
    })}</div></section>
  </>
}

function Catalog() {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'All' | CatalogCategory>('All')
  const [difficulty, setDifficulty] = useState<'All' | Difficulty>('All')
  const [players, setPlayers] = useState<'All' | '1' | '2' | '3' | '4'>('All')
  const filtered = useMemo(() => catalogGames.filter((game) => {
    const words = `${game.title} ${game.rules} ${game.category} ${game.input}`.toLowerCase()
    return words.includes(query.trim().toLowerCase()) && (category === 'All' || game.category === category) && (difficulty === 'All' || game.difficulty === difficulty) && (players === 'All' || game.players.includes(Number(players)))
  }), [category, difficulty, players, query])
  return <section className="catalog-page" aria-labelledby="catalog-title"><a className="back-link" href="#/">← Home</a><div className="catalog-heading"><div><p className="eyebrow">The whole toy box</p><h1 id="catalog-title">Game Catalog</h1><p>Explore all 32 planned motion games. Play buttons appear only after a game has been tested and validated.</p></div><span className="count-sticker">{filtered.length} of 32</span></div>
    <form className="catalog-filters" onSubmit={(event) => event.preventDefault()} aria-label="Filter games"><label className="search-field">Search games<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try “bubbles” or “brush”" /></label><label>Category<select value={category} onChange={(event) => setCategory(event.target.value as 'All' | CatalogCategory)}><option>All</option>{catalogCategories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Difficulty<select value={difficulty} onChange={(event) => setDifficulty(event.target.value as 'All' | Difficulty)}><option>All</option><option>Easy</option><option>Normal</option><option>Hard</option></select></label><label>Players<select value={players} onChange={(event) => setPlayers(event.target.value as typeof players)}><option>All</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label><label>Availability<select disabled aria-describedby="availability-note"><option>Coming soon</option></select></label></form>
    <p id="availability-note" className="filter-note">All games are coming soon until their controls and scoring pass validation.</p>
    {filtered.length ? <div className="catalog-grid">{filtered.map((game) => <article className="game-card" key={game.slug}><GameArt game={game} /><div className="game-card__body"><div className="game-card__topline"><span>{game.category}</span><span className="coming-soon">Coming soon</span></div><h2>{game.title}</h2><p>{game.rules}</p><dl className="game-facts"><div><dt>Input</dt><dd>{game.input.replace('_', ' ')}</dd></div><div><dt>Difficulty</dt><dd>{game.difficulty}</dd></div><div><dt>Players</dt><dd>1–4</dd></div></dl><a className="details-link" href={`#/games/${game.slug}`} aria-label={`View ${game.title} details`}>View details <span aria-hidden="true">→</span></a></div></article>)}</div> : <div className="empty-state"><span aria-hidden="true">✎</span><h2>No games found</h2><p>Try a different search or filter.</p></div>}
  </section>
}

function GameDetail({ slug }: { slug: string }) {
  const game = getGameBySlug(slug)
  if (!game) return <section className="not-found"><h1>Game not found</h1><a className="crayon-button" href="#/catalog">Back to catalog</a></section>
  return <article className="detail-page" aria-labelledby="game-title"><a className="back-link" href="#/catalog">← All games</a><div className="detail-layout"><GameArt game={game} large /><div className="detail-copy"><span className="coming-soon">Coming soon</span><p className="eyebrow">{game.category}</p><h1 id="game-title">{game.title}</h1><p className="detail-rules">{game.rules}</p><dl className="detail-facts"><div><dt>How you move</dt><dd>{game.input.replace('_', ' ')}</dd></div><div><dt>Mode</dt><dd>{game.mode}</dd></div><div><dt>Difficulty</dt><dd>{game.difficulty}</dd></div><div><dt>Players</dt><dd>{game.players.join(', ')}</dd></div></dl><div className="start-panel"><button className="crayon-button crayon-button--disabled" disabled>Start game</button><p>This game is not playable yet. It will unlock only after its controls and scoring are validated.</p></div></div></div></article>
}

export function App() {
  const [route, setRoute] = useState(routeFromHash)
  useEffect(() => { const navigate = () => setRoute(routeFromHash()); window.addEventListener('hashchange', navigate); return () => window.removeEventListener('hashchange', navigate) }, [])
  return <main className="home-shell"><AppHeader />{route.page === 'home' ? <Home /> : route.page === 'catalog' ? <Catalog /> : route.page === 'camera' ? <CameraSetup /> : <GameDetail slug={route.slug} />}<footer className="home-footer"><p><span aria-hidden="true">★</span> Made for 1–4 local players <span aria-hidden="true">★</span></p></footer></main>
}
