import { describe, expect, it } from 'vitest'
import { pickQuickPlayGame } from '../src/app/quickPlay'
import { visibleCatalogGames } from '../src/app/catalog'

describe('random quick play', () => {
  it('can choose every playable game while excluding unavailable games', () => {
    const games = visibleCatalogGames.filter(game => game.available && [1,2,3,4].every(count => game.players.includes(count)))
    for(let i=0;i<games.length;i++) expect(pickQuickPlayGame(() => (i+.5)/games.length)).toBe(games[i].slug)
    expect(pickQuickPlayGame(() => 0)).toBe(games[0].slug)
    expect(pickQuickPlayGame(() => .999999)).toBe(games.at(-1)!.slug)
  })
})
