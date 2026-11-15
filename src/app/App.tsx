import { gameAudio } from '../audio/GameAudio'
import { useEffect, useState } from 'react'
import { GeneratedHomeScene } from '../design/GeneratedHomeScene'
import { ScribbleIcon, type ScribbleIconName } from '../design/ScribbleIcon'
import { catalogGames, getGameBySlug } from './catalog'
import { GameArt } from './GameArt'
import { CameraSetup, type PlayableGame } from '../camera/CameraSetup'
import { loadSettings, saveSettings, unlockAchievement } from './localPreferences'
import { syncOfflineCaching } from './offlineCache'

type Route = { page: 'home' } | { page: 'catalog' } | { page: 'settings' } | { page: 'camera'; game?: PlayableGame; tournament?: boolean } | { page: 'detail'; slug: string }
const routeFromHash = (): Route => {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if (hash === 'catalog') return { page: 'catalog' }
  if (hash === 'settings') return { page: 'settings' }
  if (hash === 'camera') return { page: 'camera' }
  if (hash === 'tournament') return { page: 'camera', tournament: true }
  if (hash === 'camera/plate-spinner') return { page: 'camera', game: 'plate-spinner' }
  if (hash === 'camera/pizza-maker') return { page: 'camera', game: 'pizza-maker' }
  if (hash === 'camera/graffiti-race') return { page: 'camera', game: 'graffiti-race' }
  if (hash === 'camera/car-wash') return { page: 'camera', game: 'car-wash' }
  if (hash === 'camera/window-wipe') return { page: 'camera', game: 'window-wipe' }
  if (hash === 'camera/whack-a-mole') return { page: 'camera', game: 'whack-a-mole' }
  if (hash === 'camera/treasure-grab') return { page: 'camera', game: 'treasure-grab' }
  if (hash === 'camera/star-collector') return { page: 'camera', game: 'star-collector' }
  if (hash === 'camera/supermarket-rush') return { page: 'camera', game: 'supermarket-rush' }
  if (hash === 'camera/monster-defense') return { page: 'camera', game: 'monster-defense' }
  if (hash === 'camera/pinata-party') return { page: 'camera', game: 'pinata-party' }
  if (hash === 'camera/meteor-smash') return { page: 'camera', game: 'meteor-smash' }
  if (hash === 'camera/balloon-panic') return { page: 'camera', game: 'balloon-panic' }
  if (hash === 'camera/gold-rush') return { page: 'camera', game: 'gold-rush' }
  if (hash === 'camera/paint-splash') return { page: 'camera', game: 'paint-splash' }
  if (hash === 'camera/simon-says') return { page: 'camera', game: 'simon-says' }
  if (hash === 'camera/fruit-catcher') return { page: 'camera', game: 'fruit-catcher' }
  if (hash === 'camera/air-pong') return { page: 'camera', game: 'air-pong' }
  if (hash === 'camera/goalkeeper') return { page: 'camera', game: 'goalkeeper' }
  if (hash === 'camera/bubble-battle') return { page: 'camera', game: 'bubble-battle' }
  if (hash.startsWith('games/')) return { page: 'detail', slug: hash.slice(6) }
  return { page: 'home' }
}

function AppHeader() {
  return <header className="site-header" aria-label="Motion Play"><a className="wordmark" href="#/" aria-label="Motion Play home"><span aria-hidden="true" className="wordmark-spark">✦</span> Motion Play</a><p className="local-note"><span aria-hidden="true">●</span> Play together, right here</p></header>
}

function Home() {
  const actions: Array<{ title: string; description: string; icon: ScribbleIconName; tone: string; href?: string; featured?: boolean }> = [
    { title: 'Quick Play', description: 'Jump in with your camera or try demo mode.', icon: 'play', tone: 'yellow', href: '#/camera', featured: true },
    { title: 'Tournament', description: 'Play a set of games and chase the top score.', icon: 'trophy', tone: 'purple', href: '#/tournament' },
    { title: 'Game Catalog', description: 'Peek at every game in the toy box.', icon: 'cards', tone: 'blue', href: '#/catalog' },
  ]
  return <div className="reference-home"><GeneratedHomeScene /><section className="hero" id="top" aria-labelledby="app-title"><div className="hero-copy"><h1 id="app-title" aria-label="Motion Play!"><span className="title-red">M</span><span className="title-orange">o</span><span className="title-green">t</span><span className="title-blue">i</span><span className="title-blue-dark">o</span><span className="title-pink">n</span> <span className="title-purple">Play!</span></h1><p className="intro">Camera Party Games for 1–4 Players</p></div></section>
    <section className="play-menu" id="play-menu" aria-labelledby="play-menu-title"><div className="section-heading"><p className="eyebrow">Pick your path</p><h2 id="play-menu-title">How do you want to play?</h2></div><div className="action-grid">{actions.map((action) => {
      const content = <><div className="action-icon" aria-hidden="true"><ScribbleIcon name={action.icon} /></div><div><h3>{action.title}</h3><span className="sr-only">{action.description}</span>{!action.href && <span className="coming-soon">Coming soon</span>}</div></>
      return action.href ? <a className={`action-card action-card--${action.tone}`} href={action.href} key={action.title}>{content}</a> : <article className={`action-card action-card--${action.tone}${action.featured ? ' action-card--featured' : ''}`} key={action.title}>{action.featured && <span className="sticker">Start here!</span>}{content}</article>
    })}</div><div className="home-callouts"><p><span className="camera-doodle" aria-hidden="true">◉</span> Use your camera<br />to play with your body!</p><p><span className="players-doodle" aria-hidden="true">●●●●</span> 1–4 Players</p></div><p className="privacy-note"><ScribbleIcon name="home" /> No accounts. No uploads. Just local play.</p></section></div>
}

function Catalog() {
  return <section className="catalog-page" aria-labelledby="catalog-title"><a className="back-link" href="#/">← Home</a><div className="catalog-heading"><div><p className="eyebrow">Pick a game</p><h1 id="catalog-title">The toy box</h1><p>Click a game. Choose your players. Move!</p></div></div>
    <div className="catalog-grid">{catalogGames.filter(game => game.available).map(game => <a className="game-card" key={game.slug} href={`#/camera/${game.slug}`} aria-label={`Play ${game.title}`}><GameArt game={game}/><div className="game-card__body"><h2>{game.title}</h2><p>{game.rules}</p><span className="details-link">Play →</span></div></a>)}</div></section>
}

function GameDetail({ slug }: { slug: string }) {
  const game = getGameBySlug(slug)
  if (!game) return <section className="not-found"><h1>Game not found</h1><a className="crayon-button" href="#/catalog">Back to catalog</a></section>
  return <article className="detail-page" aria-labelledby="game-title"><a className="back-link" href="#/catalog">← All games</a><div className="detail-layout"><GameArt game={game} large /><div className="detail-copy"><span className={game.available ? 'available-now' : 'coming-soon'}>{game.available ? 'Playable • 1–4 players' : 'Coming soon'}</span><p className="eyebrow">{game.category}</p><h1 id="game-title">{game.title}</h1><p className="detail-rules">{game.rules}</p><dl className="detail-facts"><div><dt>How you move</dt><dd>{game.input.replace('_', ' ')}</dd></div><div><dt>Mode</dt><dd>{game.mode}</dd></div><div><dt>Difficulty</dt><dd>{game.difficulty}</dd></div><div><dt>Players</dt><dd>{game.players.join(', ')}</dd></div></dl><div className="start-panel">{game.available ? <a className="crayon-button crayon-button--primary" href={`#/camera/${game.slug}`}>Play</a> : <button className="crayon-button crayon-button--disabled" disabled>Start game</button>}<p>{game.available ? 'Choose your players and play.' : 'This game is not playable yet. It will unlock only after its controls and scoring are validated.'}</p></div></div></div></article>
}

export function App() {
  const [route, setRoute] = useState(routeFromHash)
  const [settings] = useState(loadSettings)
  useEffect(() => { const navigate = () => setRoute(routeFromHash()); window.addEventListener('hashchange', navigate); return () => window.removeEventListener('hashchange', navigate) }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion)
    saveSettings(settings)
    void syncOfflineCaching(settings.offlineCaching).catch(() => undefined)
  }, [settings])
  useEffect(() => {
    if (route.page === 'catalog') unlockAchievement('catalog-explorer')
    if (route.page === 'camera' && route.tournament) unlockAchievement('tournament-ready')
    document.title = `${route.page === 'home' ? '' : `${route.page === 'detail' ? getGameBySlug(route.slug)?.title ?? 'Game' : route.page[0].toUpperCase() + route.page.slice(1)} · `}Motion Play`
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [route])
  return <><a className="skip-link" href="#main-content">Skip to main content</a><main onPointerDown={gameAudio.unlock} onKeyDown={gameAudio.unlock} className="home-shell" id="main-content" tabIndex={-1}>{route.page !== 'home' && <AppHeader />}{route.page === 'home' ? <Home /> : route.page === 'catalog' ? <Catalog /> : route.page === 'settings' ? <Catalog /> : route.page === 'camera' ? null : <GameDetail slug={route.slug} />}<div hidden={route.page !== 'camera'}><CameraSetup active={route.page === 'camera'} initialGame={route.page === 'camera' ? route.game : undefined} tournament={route.page === 'camera' && route.tournament} /></div>{route.page !== 'home' && <footer className="home-footer"><p><span aria-hidden="true">★</span> Made for 1–4 local players <span aria-hidden="true">★</span></p></footer>}</main></>
}
