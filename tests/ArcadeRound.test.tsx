import {catalogGames} from '../src/app/catalog'
import {scoreGoal,type ArcadeGame} from '../src/game/arcade'
import {useContext} from 'react'
import {render,screen,fireEvent} from '@testing-library/react'
import {expect,it} from 'vitest'
import {ArcadeRound,ChallengeLabel,ChallengeResult} from '../src/game/ArcadeRound'
import {ChallengeContext} from '../src/game/ChallengeContext'

function Probe({score}:{score:number}){
 const challenge=useContext(ChallengeContext)
 return <><ChallengeLabel/><output>{challenge?.pressure.toFixed(2)}</output><ChallengeResult scores={[{playerId:1,score}]}/></>
}
function round(players:number,score:number){
 return <ArcadeRound enabled game="six-hoops" players={players}><Probe score={score}/></ArcadeRound>
}
it('offers the next level only after reaching the goal',()=>{
 const {rerender}=render(round(1,-115))
 expect(screen.queryByRole('checkbox')).toBeNull()
 expect(screen.queryByRole('button')).toBeNull()
 expect(screen.queryByText(/P1 best/)).toBeNull()
 rerender(round(1,30))
 fireEvent.click(screen.getByRole('button',{name:/Next level/}))
 expect(screen.getByText(/Level 2 · Aim/)).toBeVisible()
 expect(screen.getByRole('status')).toHaveTextContent('0.14')
})
it('applies optional solo assistance in capped steps on ordinary replays',()=>{
 function Repeat() {
   const challenge=useContext(ChallengeContext)!
   return <><output>{challenge.pressure.toFixed(2)}</output>
     <button onClick={()=>challenge.replaySolo?.(0)}>Play again</button>
     <button onClick={challenge.nextLevel}>Advance</button></>
 }
 const original=window.location.href
 window.history.replaceState(null,'','?soloAssist=1')
 try {
   const {rerender}=render(<ArcadeRound enabled game="six-hoops" players={1}><Repeat/></ArcadeRound>)
   for(let i=0;i<4;i++)fireEvent.click(screen.getByRole('button',{name:'Play again'}))
   expect(screen.getByRole('status')).toHaveTextContent('-0.15')
   fireEvent.click(screen.getByRole('button',{name:'Advance'}))
   expect(screen.getByRole('status')).toHaveTextContent('0.04')
   rerender(<ArcadeRound key="group" enabled game="six-hoops" players={4}><Repeat/></ArcadeRound>)
   fireEvent.click(screen.getByRole('button',{name:'Play again'}))
   expect(screen.getByRole('status')).toHaveTextContent('0.00')
 } finally { window.history.replaceState(null,'',original) }
})
it('keeps the higher local record when a player replays',()=>{
 const {rerender}=render(round(1,37))
 rerender(round(1,2))
 expect(localStorage.getItem('motion-play:best:six-hoops:1:1')).toBe('[37]')
})
it('lets individual contributions qualify the whole cleaning team',()=>{
 render(<ArcadeRound enabled game="window-wipe" players={2}><ChallengeLabel/>
   <ChallengeResult scores={[{playerId:1,score:30},{playerId:2,score:30}]}/></ArcadeRound>)
 expect(screen.getByText('Level 1 · Team goal 55 pts')).toBeVisible()
 expect(screen.getByText('Team score 60')).toBeVisible()
 expect(screen.getByRole('button',{name:/Next level/})).toBeEnabled()
})

it.each(catalogGames.filter(game=>game.available).map(game=>game.slug as ArcadeGame))(
  '%s advances through five qualified goals and keeps an unsuccessful round on its level',slug=>{
    function Scores({qualify}:{qualify:boolean}){
      const round=useContext(ChallengeContext)!
      const goal=scoreGoal(slug,round.level,2)
      return <><ChallengeLabel/><ChallengeResult scores={[
        {playerId:1,score:qualify?goal:goal-1},{playerId:2,score:0}
      ]}/></>
    }
    const renderRound=(qualify:boolean)=><ArcadeRound game={slug} enabled players={2}><Scores qualify={qualify}/></ArcadeRound>
    const {rerender}=render(renderRound(false))
    for(let level=1;level<=5;level++){
      expect(screen.getByText(new RegExp(`^Level ${level} · (Team goal|Aim for)`))).toBeVisible()
      expect(screen.queryByRole('button',{name:/Next level/})).toBeNull()
      rerender(renderRound(true))
      fireEvent.click(screen.getByRole('button',{name:/Next level/}))
      rerender(renderRound(false))
    }
  }
)
