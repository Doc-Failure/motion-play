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
    expect(catalogGames.every((game) => game.available === false && game.players.join() === '1,2,3,4')).toBe(true)
  })
})

describe('App navigation', () => {
  beforeEach(() => visit('#/'))
  afterEach(() => visit('#/'))

  it('renders the homepage and makes only the catalog available', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /ready\. set\. move!/i })).toBeVisible()
    expect(screen.getByText('No accounts. No uploads. Just local play.')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Choose a game' })).toHaveAttribute('href', '#/catalog')
    expect(screen.getByRole('link', { name: /game catalog/i })).toHaveAttribute('href', '#/catalog')
    expect(screen.getAllByText('Coming soon')).toHaveLength(3)
  })

  it('browses all 32 coming-soon games and filters without changing availability', () => {
    visit('#/catalog')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Game Catalog' })).toBeVisible()
    expect(screen.getAllByRole('link', { name: /view .+ details/i })).toHaveLength(32)
    expect(screen.getAllByText('Coming soon')).toHaveLength(33)
    expect(screen.getByLabelText('Availability')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'Clean & Create' } })
    expect(screen.getAllByRole('link', { name: /view .+ details/i })).toHaveLength(6)
    fireEvent.change(screen.getByLabelText('Search games'), { target: { value: 'window' } })
    expect(screen.getByRole('link', { name: 'View Window Wipe details' })).toBeVisible()
    expect(screen.queryByRole('link', { name: 'View Paint Splash details' })).not.toBeInTheDocument()
  })

  it('shows honest details and prevents starting an unvalidated game', () => {
    visit('#/games/bubble-battle')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'Bubble Battle' })).toBeVisible()
    expect(screen.getByText('Pop floating bubbles and keep clear of the bombs.')).toBeVisible()
    const facts = screen.getByText('How you move').parentElement
    expect(facts && within(facts).getByRole('definition')).toHaveTextContent('MOTION HIT')
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled()
    expect(screen.getByText(/unlock only after its controls and scoring are validated/i)).toBeVisible()
    expect(screen.getByRole('link', { name: /all games/i })).toHaveAttribute('href', '#/catalog')
  })

  it('keeps decorative artwork out of the accessibility tree', () => {
    const { container } = render(<App />)
    expect(container.querySelector('.hero-art')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('heading', { level: 2, name: 'How do you want to play?' })).toBeVisible()
  })
})
