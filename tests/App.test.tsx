import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    expect(catalogGames.filter((game) => game.available).map((game) => [game.slug, game.players])).toEqual([['bubble-battle', [1, 2, 3, 4]], ['whack-a-mole', [1, 2, 3, 4]], ['meteor-smash', [1, 2, 3, 4]], ['pinata-party', [1, 2, 3, 4]], ['monster-defense', [1, 2, 3, 4]], ['balloon-panic', [1, 2, 3, 4]], ['fruit-catcher', [1, 2, 3, 4]], ['gold-rush', [1, 2, 3, 4]], ['supermarket-rush', [1, 2, 3, 4]], ['star-collector', [1, 2, 3, 4]], ['treasure-grab', [1, 2, 3, 4]], ['window-wipe', [1, 2, 3, 4]], ['paint-splash', [1, 2, 3, 4]], ['air-pong', [1, 2, 3, 4]], ['goalkeeper', [1, 2, 3, 4]], ['simon-says', [1, 2, 3, 4]]])
    expect(catalogGames.filter((game) => !game.available).every((game) => game.players.join() === '1,2,3,4')).toBe(true)
  })

})

describe('App navigation', () => {
  beforeEach(() => { window.localStorage.clear(); visit('#/') })
  afterEach(() => visit('#/'))
  it('keeps a simple home and sends game cards straight to play', async () => {
    render(<App />)
    expect(screen.getByRole('heading', {name: 'Motion Play!'})).toBeVisible()
    expect(screen.queryByRole('link', {name: 'Settings'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', {name: /game catalog/i}))
    await waitFor(() => expect(screen.getByRole('heading', {name: 'The toy box'})).toBeVisible())
    expect(screen.getByRole('link', {name: 'Play Bubble Battle'})).toHaveAttribute('href', '#/camera/bubble-battle')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
  it.each(['Supermarket Rush', 'Star Collector', 'Treasure Grab'])('opens %s from its catalog link', async (title) => {
    visit('#/catalog')
    render(<App />)
    fireEvent.click(screen.getByRole('link', { name: `Play ${title}` }))
    expect(await screen.findByRole('button', { name: '4 players' })).toBeVisible()
    expect(screen.getByRole('heading', { name: title })).toBeVisible()
  })

})
