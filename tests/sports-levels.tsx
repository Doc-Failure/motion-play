import {useEffect, useState} from 'react'
import {createRoot} from 'react-dom/client'
import {ArcadeRound} from '../src/game/ArcadeRound'
import {KeepUps} from '../src/minigames/keep-ups/KeepUps'
import {SixHoops} from '../src/minigames/six-hoops/SixHoops'
import {CameraSport} from '../src/minigames/camera-sports/CameraSport'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
import '../src/styles.css'
import '../src/game/camera-play.css'
import '../src/game/game-polish.css'

type Sport = 'keep-ups' | 'six-hoops' | 'goalkeeper' | 'net-rally'

export function SportsFixture({game}: {game: Sport}) {
  const [inputEvents, setInputEvents] = useState<MotionInputEvent[]>([])
  useEffect(() => {
    function receiveFrame(event: Event) {
      setInputEvents((event as CustomEvent<MotionInputEvent[]>).detail)
    }
    window.addEventListener('sports-fixture-frame', receiveFrame)
    return () => window.removeEventListener('sports-fixture-frame', receiveFrame)
  }, [])

  const props = {playerCount: 1 as const, inputEvents, onExit() {}}
  let content
  if (game === 'keep-ups') content = <KeepUps {...props}/>
  else if (game === 'six-hoops') content = <SixHoops {...props}/>
  else content = <CameraSport mode={game === 'goalkeeper' ? 'keeper' : 'net'} {...props}/>

  return <div className="camera-play" data-players="1">
    <div className="camera-arena" style={{inset: 0}}>
      <ArcadeRound game={game} enabled players={1}>{content}</ArcadeRound>
    </div>
  </div>
}

const container = document.getElementById('sports-fixture')!
createRoot(container).render(<SportsFixture game={location.hash.slice(1) as Sport}/>)
