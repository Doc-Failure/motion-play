import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { App } from '../src/app/App'
import { catalogCategories, catalogGames, visibleCatalogGames } from '../src/app/catalog'

function visit(hash: string) {
  window.location.hash = hash
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

describe('catalog data', () => {
  it('contains the complete, unique, ordered 45-game specification catalog', () => {
    const expectedTitles = ['Bubble Battle', 'Whack-a-Mole', 'Meteor Smash', 'Fruit Slash', 'Cardboard Champ', 'Piñata Party', 'Monster Defense', 'Balloon Panic', 'Fruit Catcher', 'Gold Rush', 'Fish Frenzy', 'Supermarket Rush', 'Star Collector', 'Treasure Grab', 'Dodgeball', 'Laser Escape', 'Dance Challenge', 'Freeze!', 'Paper Dojo', 'Jump Rush', 'Window Wipe', 'Paint Splash', 'Car Wash', 'Pizza Maker', 'Graffiti Race', 'Tower Builder', 'Air Pong', 'Goalkeeper', 'Basketball Blitz', 'Simon Says', 'Plate Spinner', 'Magic Duel', 'Rocket Rumble', 'Silk Squad','Paper Jam','Keep Ups','Ghost Catcher','UFO Juggler','Six Hoops','Net Rally','Kangaroo Race','Marble Bowling', 'Shadow Snap', 'Floor Is Lava', 'Jenga']
    expect(catalogGames).toHaveLength(45)
    expect(catalogGames.map((game) => game.id)).toEqual(Array.from({ length: 45 }, (_, index) => index + 1))
    expect(catalogGames.map((game) => game.title)).toEqual(expectedTitles)
    expect(new Set(catalogGames.map((game) => game.slug))).toHaveLength(45)
    expect(new Set(catalogGames.map((game) => game.title))).toHaveLength(45)
    expect(new Set(catalogGames.map((game) => game.category))).toEqual(new Set(catalogCategories))
    expect(catalogGames.filter((game) => game.available).map((game) => [game.slug, game.players])).toEqual([['bubble-battle', [1, 2, 3, 4]], ['whack-a-mole', [1, 2, 3, 4]], ['meteor-smash', [1, 2, 3, 4]], ['fruit-slash', [1, 2, 3, 4]], ['punch-arena', [1, 2, 3, 4]], ['pinata-party', [1, 2, 3, 4]], ['monster-defense', [1, 2, 3, 4]], ['balloon-panic', [1, 2, 3, 4]], ['fruit-catcher', [1, 2, 3, 4]], ['gold-rush', [1, 2, 3, 4]], ['fish-frenzy', [1, 2, 3, 4]], ['supermarket-rush', [1, 2, 3, 4]], ['star-collector', [1, 2, 3, 4]], ['treasure-grab', [1, 2, 3, 4]], ['dodgeball', [1, 2, 3, 4]], ['laser-escape', [1, 2, 3, 4]], ['dance-challenge', [1, 2, 3, 4]], ['freeze', [1, 2, 3, 4]], ['ninja-training', [1, 2, 3, 4]], ['jump-rush', [1, 2, 3, 4]], ['window-wipe', [1, 2, 3, 4]], ['paint-splash', [1, 2, 3, 4]], ['car-wash', [1, 2, 3, 4]], ['pizza-maker', [1, 2, 3, 4]], ['graffiti-race', [1, 2, 3, 4]], ['tower-builder', [1, 2, 3, 4]], ['air-pong', [1, 2, 3, 4]], ['goalkeeper', [1, 2, 3, 4]], ['basketball-blitz', [1, 2, 3, 4]], ['simon-says', [1, 2, 3, 4]], ['plate-spinner', [1, 2, 3, 4]], ['magic-duel', [1, 2, 3, 4]], ['rocket-rumble', [1, 2, 3, 4]], ['silk-squad', [1, 2, 3, 4]], ['keep-ups', [1, 2, 3, 4]], ['ghost-catcher', [1, 2, 3, 4]], ['ufo-juggler', [1, 2, 3, 4]], ['six-hoops', [1, 2, 3, 4]], ['net-rally', [1, 2, 3, 4]], ['kangaroo-race', [1, 2, 3, 4]], ['marble-bowling', [1,2,3,4]], ['shadow-snap', [1,2,3,4]], ['floor-is-lava', [1,2,3,4]], ['jenga', [1,2,3,4]]])
    expect(catalogGames.filter((game) => !game.available).every((game) => game.players.join() === '1,2,3,4')).toBe(true)
  })

})

describe('App navigation', () => {
  beforeEach(() => { window.localStorage.clear(); window.sessionStorage.setItem('motion-play:players:v1','1'); visit('#/') })
  afterEach(() => {window.sessionStorage.clear();visit('#/')})
  it.each(visibleCatalogGames)('routes the public $title card to its camera flow',async game=>{
    visit(`#/camera/${game.slug}`);render(<App/>)
    await waitFor(()=>expect(document.title).toBe('Camera · Motion Play'))
    expect(screen.queryByRole('heading',{name:'Motion Play!'})).not.toBeInTheDocument()
    expect(document.querySelector('.camera-lobby')).not.toHaveAttribute('hidden')
  })
  it('asks for players once, persists the choice and allows changing it on Home',async()=>{
    window.sessionStorage.clear()
    render(<App/>)
    expect(screen.getByRole('heading',{name:'How many players?'})).toBeVisible()
    fireEvent.click(screen.getByRole('button',{name:'3 players'}))
    expect(screen.getByRole('heading',{name:'Motion Play!'})).toBeVisible()
    expect(window.sessionStorage.getItem('motion-play:players:v1')).toBe('3')
    fireEvent.click(screen.getByRole('link',{name:/game catalog/i}))
    await waitFor(()=>expect(screen.getByRole('heading',{name:'Game Catalog',level:1})).toBeVisible())
    expect(screen.queryByRole('group',{name:'Choose players once'})).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('link',{name:'← Back to Home'}))
    await waitFor(()=>expect(screen.getByRole('button',{name:'3 players · change'})).toBeVisible())
    fireEvent.click(screen.getByRole('button',{name:'3 players · change'}))
    fireEvent.click(screen.getByRole('button',{name:'2 players'}))
    expect(window.sessionStorage.getItem('motion-play:players:v1')).toBe('2')
  })
  it('keeps a simple home and sends game cards straight to play', async () => {
    render(<App />)
    expect(screen.getByRole('heading', {name: 'Motion Play!'})).toBeVisible()
    expect(screen.queryByRole('link', {name: 'Settings'})).not.toBeInTheDocument()
    expect(screen.getByRole('link', {name: /Tournament/})).toHaveAttribute('href','#/tournament')
    expect(screen.queryByRole('link', {name:/Quick Play/})).not.toBeInTheDocument()
    expect(document.querySelectorAll('.action-card')).toHaveLength(2)
    fireEvent.click(screen.getByRole('link', {name: /game catalog/i}))
    await waitFor(() => expect(screen.getByRole('heading', {name: 'Game Catalog', level: 1})).toBeVisible())
    expect(screen.getByRole('link', {name: 'Play Paper Dojo'})).toHaveAttribute('href', '#/camera/ninja-training')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
  it.each(['camera/jenga','games/jenga','camera/floor-is-lava','games/floor-is-lava'])('returns the hidden %s route to the catalog', path => {
    visit('#/'+path)
    render(<App />)
    expect(screen.getByRole('heading',{name:'Game Catalog'})).toBeVisible()
    expect(screen.queryByRole('link',{name:/Play (Jenga|Floor Is Lava)/})).not.toBeInTheDocument()
  })
  it('shows the selected games under a minimal catalog header', () => {
    visit('#/catalog')
    render(<App />)
    expect(screen.getByRole('heading',{name:'Game Catalog'})).toBeVisible()
    expect(screen.getByRole('link',{name:'← Back to Home'})).toHaveAttribute('href','#/')
    expect(visibleCatalogGames.map(game => game.slug)).toEqual(['ninja-training','window-wipe','punch-arena','keep-ups','ghost-catcher','ufo-juggler','six-hoops','goalkeeper','net-rally','kangaroo-race','marble-bowling','shadow-snap'])
    expect(screen.getAllByRole('link',{name:/^Play /})).toHaveLength(12)
    expect(screen.queryByRole('link',{name:'Play Jump Rush'})).not.toBeInTheDocument()
    expect(screen.getByRole('link',{name:'Play Kangaroo Race'})).toBeVisible()
    expect(screen.queryByLabelText('Motion Play')).not.toBeInTheDocument()
  })
  it('skips to main content without changing the catalog route', async () => {
    visit('#/catalog')
    render(<App />)
    const skip = screen.getByRole('link', { name: 'Skip to main content' })
    skip.focus()
    fireEvent.click(skip)
    await waitFor(() => expect(screen.getByRole('main')).toHaveFocus())
    expect(window.location.hash).toBe('#/catalog')
    expect(screen.getByRole('heading', { name: 'Game Catalog' })).toBeVisible()
  })
  it.each(['#/camera/beat-freak','#/games/beat-freak','#/camera/rocket-rumble','#/games/rocket-rumble','#/camera/bubble-battle','#/games/bubble-battle','#/camera/whack-a-mole','#/quick-play','#/camera/magic-duel','#/games/magic-duel','#/camera/basketball-blitz','#/games/basketball-blitz','#/camera/fruit-slash','#/games/fruit-slash','#/camera/meteor-smash','#/games/pizza-maker','#/camera/freeze','#/games/freeze'])('keeps deferred game URL %s in the catalog', hash => {
    visit(hash)
    render(<App />)
    expect(screen.getByRole('heading',{name:'Game Catalog'})).toBeVisible()
    expect(screen.queryByRole('button',{name:'Play Meteor Smash'})).not.toBeInTheDocument()
  })
})
