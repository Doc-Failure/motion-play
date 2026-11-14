import type { CSSProperties } from 'react'
import type { CatalogGame } from './catalog'

export function GameArt({ game, large = false }: { game: CatalogGame; large?: boolean }) {
  return <div className={`game-art${large ? ' game-art--large' : ''}`} style={{ '--art-one': game.colors[0], '--art-two': game.colors[1] } as CSSProperties} aria-hidden="true"><span className="game-art__sun">✦</span><span className="game-art__doodle">{game.id.toString().padStart(2, '0')}</span><span className="game-art__trail">〰</span></div>
}
