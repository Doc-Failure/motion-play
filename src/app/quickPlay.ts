import { visibleCatalogGames } from './catalog'
import type { PlayableGame } from '../camera/CameraSetup'

export function pickQuickPlayGame(random = Math.random): PlayableGame {
  // A retained player count must work with whichever game is selected.
  const games = visibleCatalogGames.filter(game => game.available && [1,2,3,4].every(count => game.players.includes(count)))
  if (!games.length) throw new Error('No playable games are available.')
  const index = Math.min(games.length-1, Math.max(0,Math.floor(random()*games.length)))
  return games[index].slug as PlayableGame
}
