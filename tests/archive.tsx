import {createRoot} from 'react-dom/client'
import {BeatFreak} from '../src/minigames/beat-freak/BeatFreak'
import {Goalkeeper} from '../src/minigames/goalkeeper/Goalkeeper'
import {PunchArena} from '../src/minigames/punch-arena/PunchArena'
import {loadSessionPlayers} from '../src/app/playerSession'
import {ArcadeRound} from '../src/game/ArcadeRound'
import '../src/styles.css'
import '../src/game/camera-play.css'

export function ArchivedGame() {
  const slug=location.hash.slice(1),players=loadSessionPlayers()??1
  const game=slug==='original-punch'?'original-punch':slug==='original-keeper'?'original-keeper':'retired-jam'
  const Component=game==='original-punch'?PunchArena:game==='original-keeper'?Goalkeeper:BeatFreak
  return <div className="camera-play" data-players={players}><div className="camera-arena" style={{inset:0}}>
    <ArcadeRound game={game} players={players} enabled>
      <Component playerCount={players} onExit={()=>location.reload()}/>
    </ArcadeRound>
  </div></div>
}
createRoot(document.getElementById('archive')!).render(<ArchivedGame/>)
