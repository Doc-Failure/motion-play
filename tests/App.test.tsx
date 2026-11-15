import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../src/app/App'
import { catalogCategories, catalogGames } from '../src/app/catalog'

function visit(hash: string) {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('catalog data', () => {
  it('contains the complete, unique, ordered 32-game specification catalog', () => {
    const expectedTitles = ['Bubble Battle', 'Whack-a-Mole', 'Meteor Smash', 'Fruit Slash', 'Punch Arena', 'Piñata Party', 'Monster Defense', 'Balloon Panic', 'Fruit Catcher', 'Gold Rush', 'Fish Frenzy', 'Supermarket Rush', 'Star Collector', 'Treasure Grab', 'Dodgeball', 'Laser Escape', 'Dance Challenge', 'Freeze!', 'Ninja Training', 'Jump Rush', 'Window Wipe', 'Paint Splash', 'Car Wash', 'Pizza Maker', 'Graffiti Race', 'Tower Builder', 'Air Pong', 'Goalkeeper', 'Basketball Blitz', 'Simon Says', 'Plate Spinner', 'Magic Duel']
    expect(catalogGames).toHaveLength(32)
    expect(catalogGames.map((game) => game.id)).toEqual(Array.from({ length: 32 }, (_, index) => index + 1))
    expect(catalogGames.map((game) => game.title)).toEqual(expectedTitles)
    expect(new Set(catalogGames.map((game) => game.slug))).toHaveLength(32)
    expect(new Set(catalogGames.map((game) => game.title))).toHaveLength(32)
    expect(new Set(catalogGames.map((game) => game.category))).toEqual(new Set(catalogCategories))
    expect(catalogGames.filter((game) => game.available).map((game) => [game.slug, game.players])).toEqual([['bubble-battle', [1, 2, 3, 4]], ['whack-a-mole', [1, 2, 3, 4]], ['balloon-panic', [1, 2, 3, 4]], ['gold-rush', [1, 2, 3, 4]], ['window-wipe', [1, 2, 3, 4]], ['paint-splash', [1, 2, 3, 4]]])
    expect(catalogGames.filter((game) => !game.available).every((game) => game.players.join() === '1,2,3,4')).toBe(true)
  })
})

describe('App navigation', () => {
  beforeEach(() => visit('#/'))
  afterEach(() => visit('#/'))

  it('renders the homepage and makes only the catalog available', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Motion Play!' })).toBeVisible()
    expect(screen.getByText('Camera Party Games for 1–4 Players')).toBeVisible()
    expect(screen.getByText('No accounts. No uploads. Just local play.')).toBeVisible()
    expect(screen.getByRole('link', { name: /game catalog/i })).toHaveAttribute('href', '#/catalog')
    expect(screen.getByRole('link', { name: /quick play/i })).toHaveAttribute('href', '#/camera')
    expect(screen.getAllByText('Coming soon')).toHaveLength(2)
  })

  it('browses validated games and keeps the remaining catalog honestly gated', () => {
    visit('#/catalog')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Game Catalog' })).toBeVisible()
    expect(screen.getAllByRole('link', { name: /view .+ details/i })).toHaveLength(32)
    expect(screen.getAllByText('Play now')).toHaveLength(6)
    expect(screen.getAllByText('Coming soon')).toHaveLength(27)
    expect(screen.getByLabelText('Availability')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Clean & Create' } })
    expect(screen.getAllByRole('link', { name: /view .+ details/i })).toHaveLength(6)
    fireEvent.change(screen.getByLabelText('Search games'), { target: { value: 'window' } })
    expect(screen.getByRole('link', { name: 'View Window Wipe details' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'View Paint Splash details' })).not.toBeInTheDocument()
  })

  it('shows validated one- and two-player Bubble Battle details and a setup route', () => {
    visit('#/games/bubble-battle')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Bubble Battle' })).toBeVisible()
    expect(screen.getByText('Pop floating bubbles and keep clear of the bombs.')).toBeVisible()
    const facts = screen.getByText('How you move').parentElement
    expect(facts && within(facts).getByRole('definition')).toHaveTextContent('MOTION HIT')
    expect(screen.getByText('Playable • 1–4 players')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Set up & play' })).toHaveAttribute('href', '#/camera/bubble-battle')
    expect(screen.getByText(/choose a camera or no-camera demo/i)).toBeVisible()
    expect(screen.getByRole('link', { name: /all games/i })).toHaveAttribute('href', '#/catalog')
  })

  it('offers Gold Rush only after its simulated play acceptance passes', () => {
    visit('#/games/gold-rush')
    render(<App />)
    expect(screen.getByText('Playable • 1–4 players')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Set up & play' })).toHaveAttribute('href', '#/camera/gold-rush')
  })

  it('offers Paint Splash after its simulated play acceptance passes', () => {
    visit('#/games/paint-splash')
    render(<App />)
    expect(screen.getByText('Playable • 1–4 players')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Set up & play' })).toHaveAttribute('href', '#/camera/paint-splash')
  })

  it('continues to prevent starting an unvalidated game', () => {
    visit('#/games/meteor-smash')
    render(<App />)
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled()
    expect(screen.getByText(/unlock only after its controls and scoring are validated/i)).toBeVisible()
  })

  it('keeps decorative artwork out of the accessibility tree', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.generated-home-scene')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'How do you want to play?' })).toBeVisible()
  })
})
