import {FullscreenButton} from '../design/FullscreenButton'
import {TOURNAMENT_GAME_COUNT} from '../game/TournamentSession'
import type {PlayerCount} from '../input/PlayerZoneMapper'
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

type Route = { page: 'home' } | { page: 'catalog' } | { page: 'settings' } | { page: 'camera'; game?: PlayableGame; autoPlay?: boolean; workshop?:boolean; tournament?:boolean } | { page: 'detail'; slug: string }
const routeFromHash = (): Route => {
  const hash = window.location.hash.replace(/^#\/?/, '')
  if(import.meta.env.DEV && hash.startsWith('workshop/')){
    const slug=hash.slice('workshop/'.length)
    if(getGameBySlug(slug)?.available)return {page:'camera',game:slug as PlayableGame,workshop:true}
    return {page:'catalog'}
  }
  if (hash === 'camera/marble-mountain' || hash === 'games/marble-mountain') return {page:'camera',game:'marble-bowling'}
  if (hash === 'camera/jump-rush' || hash === 'games/jump-rush') return {page:'camera',game:'kangaroo-race'}
  if ((hash.startsWith('camera/') && !isGameVisible(hash.slice(7))) || (hash.startsWith('games/') && !isGameVisible(hash.slice(6)))) return {page:'catalog'}
  if (hash === 'tournament') return {page:'camera',tournament:true}
  if (hash === 'catalog') return { page: 'catalog' }
  if (hash === 'settings') return { page: 'settings' }
  if (hash === 'camera') return { page: 'camera',game:visibleCatalogGames[0].slug as PlayableGame }
  if (hash === 'quick-play') return { page: 'catalog' }
  if (hash.startsWith('camera/')) return {page:'camera',game:hash.slice(7) as PlayableGame}
  if (hash.startsWith('games/')) return { page: 'detail', slug: hash.slice(6) }
  return { page: 'home' }
}

function AppHeader() {
  return <header className="site-header" aria-label="playpop.party"><a className="wordmark" href="#/" aria-label="playpop.party home"><span aria-hidden="true" className="wordmark-spark">✦</span> playpop.party</a><p className="local-note"><span aria-hidden="true">●</span> Play together, right here</p></header>
}

function Home() {
  const actions: Array<{ title: string; description: string; icon: PackIconName; tone: string; href?: string; featured?: boolean }> = [
    { title: 'Game Catalog', description: 'Peek at every game in the toy box.', icon: 'cards', tone: 'blue', href: '#/catalog' },
    { title: `${TOURNAMENT_GAME_COUNT}-Game Tournament`, description: `${TOURNAMENT_GAME_COUNT} games. Highest total points wins.`, icon: 'trophy', tone: 'purple', href: '#/tournament' },
  ]
  return <div className="reference-home"><GeneratedHomeScene /><section className="hero" id="top" aria-labelledby="app-title"><div className="hero-copy"><h1 id="app-title" aria-label="playpop.party"><span className="title-red">p</span><span className="title-orange">l</span><span className="title-green">a</span><span className="title-blue">y</span><span className="title-blue-dark">p</span><span className="title-pink">o</span><span className="title-red">p</span><span className="title-purple">.party</span></h1><p className="intro">Camera Party Games for 1–4 Players</p></div></section>
    <section className="play-menu" id="play-menu" aria-labelledby="play-menu-title"><div className="section-heading"><p className="eyebrow">Pick your path</p><h2 id="play-menu-title">How do you want to play?</h2></div><div className="action-grid">{actions.map((action) => {
      const content = <><div className="action-icon" aria-hidden="true"><PackIcon name={action.icon} /></div><div><h3>{action.title}</h3><span className="sr-only">{action.description}</span>{!action.href && <span className="coming-soon">Coming soon</span>}</div></>
      return action.href ? <a className={`action-card action-card--${action.tone}`} href={action.href} key={action.title}>{content}</a> : <article className={`action-card action-card--${action.tone}${action.featured ? ' action-card--featured' : ''}`} key={action.title}>{action.featured && <span className="sticker">Start here!</span>}{content}</article>
    })}</div></section></div>
}

function PlayerPicker({ tournament, onChoose }: { tournament: boolean; onChoose: (players: PlayerCount) => void }) {
  return <div className="reference-home player-welcome">
    <GeneratedHomeScene />
    <section className="hero"><div className="hero-copy"><h1>How many players?</h1></div></section>
    <div className="welcome-players" role="group" aria-label="Choose players">
      {([1, 2, 3, 4] as const).map(count =>
        <button className="action-card action-card--blue" key={count} onClick={() => onChoose(count)}
          aria-description={count === 1 ? "Play solo or share one player slot cooperatively." : undefined}
          aria-label={count === 1 ? '1 player' : `${count} players`}>
          <strong>{count}</strong><span>{count === 1 ? 'player / co-op' : 'players'}</span>
        </button>
      )}
    </div>
    <a className="player-picker-back back-link" href={tournament ? '#/' : '#/catalog'}>{tournament ? '← Home' : '← Games'}</a>
  </div>
}

function Catalog() {
  return <section className="catalog-page catalog-picker" aria-labelledby="catalog-title"><h1 id="catalog-title" className="sr-only">Game Catalog</h1><header className="catalog-toolbar"><a className="back-link" href="#/">← Back to Home</a></header>
    <div className="catalog-grid">{visibleCatalogGames.map(game => <a className="game-card" key={game.slug} href={`#/camera/${game.slug}`} aria-label={`Play ${game.title}`}><GameDoodle slug={game.slug}/><div className="game-card__body"><h2>{game.title}</h2><p className="sr-only">{game.rules}</p></div></a>)}</div></section>
}

function GameDetail({ slug }: { slug: string }) {
  const game = getGameBySlug(slug)
  if (!game) return <section className="not-found"><h1>Game not found</h1><a className="crayon-button" href="#/catalog">Back to catalog</a></section>
  return <article className="detail-page" aria-labelledby="game-title"><a className="back-link" href="#/catalog">← All games</a><div className="detail-layout"><GameArt game={game} large /><div className="detail-copy"><span className={game.available ? 'available-now' : 'coming-soon'}>{game.available ? 'Playable • 1–4 players' : 'Coming soon'}</span><p className="eyebrow">{game.category}</p><h1 id="game-title">{game.title}</h1><p className="detail-rules">{game.rules}</p><dl className="detail-facts"><div><dt>How you move</dt><dd>{game.input.replace('_', ' ')}</dd></div><div><dt>Mode</dt><dd>{game.mode}</dd></div><div><dt>Difficulty</dt><dd>{game.difficulty}</dd></div><div><dt>Players</dt><dd>{game.players.join(', ')}</dd></div></dl><div className="start-panel">{game.available ? <a className="crayon-button crayon-button--primary" href={`#/camera/${game.slug}`}>Play</a> : <button className="crayon-button crayon-button--disabled" disabled>Start game</button>}<p>{game.available ? 'Choose your players and play.' : 'This game is not playable yet. It will unlock only after its controls and scoring are validated.'}</p></div></div></div></article>
}

export function App() {
  const [route, setRoute] = useState(routeFromHash)
  const [players, setPlayers] = useState<PlayerCount | null>(null)
  const playing = route.page === 'camera' && players !== null
  const [settings] = useState(loadSettings)
  useEffect(() => {
    const navigate = () => {
      setPlayers(null)
      setRoute(routeFromHash())
    }
    window.addEventListener('hashchange', navigate)
    return () => window.removeEventListener('hashchange', navigate)
  }, [])
  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', settings.reducedMotion)
    saveSettings(settings)
    void syncOfflineCaching(settings.offlineCaching).catch(() => undefined)
  }, [settings])
  useEffect(() => {
    if (route.page === 'catalog') unlockAchievement('catalog-explorer')
    document.title = `${route.page === 'home' ? '' : `${route.page === 'detail' ? getGameBySlug(route.slug)?.title ?? 'Game' : route.page[0].toUpperCase() + route.page.slice(1)} · `}playpop.party`
    document.getElementById('main-content')?.focus({ preventScroll: true })
  }, [route])
  return <><a className="skip-link" href="#main-content" onClick={(event) => {
    event.preventDefault()
    document.getElementById('main-content')?.focus()
  }}>Skip to main content</a><main onPointerDown={gameAudio.unlock} onKeyDown={gameAudio.unlock} className="home-shell" id="main-content" tabIndex={-1}>
    {route.page === 'detail' && <AppHeader />}
    {route.page === 'home' && <Home />}
    {(route.page === 'catalog' || route.page === 'settings') && <Catalog />}
    {route.page === 'detail' && <GameDetail slug={route.slug} />}
    {route.page === 'camera' && players === null && <PlayerPicker tournament={!!route.tournament} onChoose={setPlayers} />}
    <CameraSetup workshop={route.page === 'camera' && route.workshop} webcamNavigation selectedPlayers={players ?? undefined}
      navigationKey={`${window.location.hash}|${players ?? 'menu'}`} active={playing} autoPlay={playing}
      initialGame={route.page === 'camera' ? route.game : undefined} tournament={route.page === 'camera' && route.tournament} />
    {route.page === 'detail' && <footer className="home-footer"><p><span aria-hidden="true">★</span> Made for 1–4 local players <span aria-hidden="true">★</span></p></footer>}</main><FullscreenButton/></>
}
