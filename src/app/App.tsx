import { pickQuickPlayGame } from './quickPlay'
import { PackIcon, type PackIconName } from '../design/PackIcon'
import { GameDoodle } from '../design/GameDoodle'
import { gameAudio } from '../audio/GameAudio'
import { useEffect, useState } from 'react'
import { GeneratedHomeScene } from '../design/GeneratedHomeScene'
import { visibleCatalogGames, isGameVisible, getGameBySlug } from './catalog'
import { GameArt } from './GameArt'
import { CameraSetup, type PlayableGame } from '../camera/CameraSetup'
import { loadSettings, saveSettings, unlockAchievement } from './localPreferences'
import { syncOfflineCaching } from './offlineCache'

type Route = { page: 'home' } | { page: 'catalog' } | { page: 'settings' } | { page: 'camera'; game?: PlayableGame; autoPlay?: boolean } | { page: 'detail'; slug: string }
const routeFromHash = (): Route => {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if ((hash.startsWith('camera/') && !isGameVisible(hash.slice(7))) || (hash.startsWith('games/') && !isGameVisible(hash.slice(6)))) return {page:'catalog'}
  if (hash === 'catalog') return { page: 'catalog' }
  if (hash === 'settings') return { page: 'settings' }
  if (hash === 'camera') return { page: 'camera' }
  if (hash === 'quick-play') return { page: 'camera', game: pickQuickPlayGame(), autoPlay: true }
  if (hash === 'camera/punch-arena') return { page: 'camera', game: 'punch-arena' }
  if (hash === 'camera/fruit-slash') return { page: 'camera', game: 'fruit-slash' }
  if (hash === 'camera/jump-rush') return { page: 'camera', game: 'jump-rush' }
  if (hash === 'camera/freeze') return { page: 'camera', game: 'freeze' }
  if (hash === 'camera/dance-challenge') return { page: 'camera', game: 'dance-challenge' }
  if (hash === 'camera/laser-escape') return { page: 'camera', game: 'laser-escape' }
  if (hash === 'camera/dodgeball') return { page: 'camera', game: 'dodgeball' }
  if (hash === 'camera/tower-builder') return { page: 'camera', game: 'tower-builder' }
  if (hash === 'camera/ninja-training') return {page:'camera',game:'ninja-training'}
  if (hash === 'camera/fish-frenzy') return { page: 'camera', game: 'fish-frenzy' }
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
  const actions: Array<{ title: string; description: string; icon: PackIconName; tone: string; href?: string; featured?: boolean }> = [
    { title: 'Quick Play', description: 'Start a random game.', icon: 'play', tone: 'yellow', href: '#/quick-play', featured: true },
    { title: 'Game Catalog', description: 'Peek at every game in the toy box.', icon: 'cards', tone: 'blue', href: '#/catalog' },
  ]
  return <div className="reference-home"><GeneratedHomeScene /><section className="hero" id="top" aria-labelledby="app-title"><div className="hero-copy"><h1 id="app-title" aria-label="Motion Play!"><span className="title-red">M</span><span className="title-orange">o</span><span className="title-green">t</span><span className="title-blue">i</span><span className="title-blue-dark">o</span><span className="title-pink">n</span> <span className="title-purple">Play!</span></h1><p className="intro">Camera Party Games for 1–4 Players</p></div></section>
    <section className="play-menu" id="play-menu" aria-labelledby="play-menu-title"><div className="section-heading"><p className="eyebrow">Pick your path</p><h2 id="play-menu-title">How do you want to play?</h2></div><div className="action-grid">{actions.map((action) => {
      const content = <><div className="action-icon" aria-hidden="true"><PackIcon name={action.icon} /></div><div><h3>{action.title}</h3><span className="sr-only">{action.description}</span>{!action.href && <span className="coming-soon">Coming soon</span>}</div></>
      return action.href ? <a className={`action-card action-card--${action.tone}`} href={action.href} key={action.title}>{content}</a> : <article className={`action-card action-card--${action.tone}${action.featured ? ' action-card--featured' : ''}`} key={action.title}>{action.featured && <span className="sticker">Start here!</span>}{content}</article>
    })}</div></section></div>
}

function Catalog() {
  return <section className="catalog-page catalog-picker" aria-labelledby="catalog-title"><header className="catalog-toolbar"><a className="back-link" href="#/">← Back to Home</a><h1 id="catalog-title">Game Catalog</h1></header>
    <div className="catalog-grid">{visibleCatalogGames.map(game => <a className="game-card" key={game.slug} href={`#/camera/${game.slug}`} aria-label={`Play ${game.title}`}><GameDoodle slug={game.slug}/><div className="game-card__body"><h2>{game.title}</h2><p className="sr-only">{game.rules}</p></div></a>)}</div></section>
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
    document.title = `${route.page === 'home' ? '' : `${route.page === 'detail' ? getGameBySlug(route.slug)?.title ?? 'Game' : route.page[0].toUpperCase() + route.page.slice(1)} · `}Motion Play`
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [route])
  return <><a className="skip-link" href="#main-content">Skip to main content</a><main onPointerDown={gameAudio.unlock} onKeyDown={gameAudio.unlock} className="home-shell" id="main-content" tabIndex={-1}>{route.page === 'detail' && <AppHeader />}{route.page === 'home' ? <Home /> : route.page === 'catalog' ? <Catalog /> : route.page === 'settings' ? <Catalog /> : route.page === 'camera' ? null : <GameDetail slug={route.slug} />}<div hidden={route.page !== 'camera'}><CameraSetup active={route.page === 'camera'} initialGame={route.page === 'camera' ? route.game : undefined} autoPlay={route.page === 'camera' && route.autoPlay} /></div>{route.page === 'detail' && <footer className="home-footer"><p><span aria-hidden="true">★</span> Made for 1–4 local players <span aria-hidden="true">★</span></p></footer>}</main></>
}
