import {fireEvent,render,screen,waitFor,within} from '@testing-library/react'
import {describe,it,expect,vi} from 'vitest'
import {CameraSetup,type CameraController} from '../src/camera/CameraSetup'

const {game}=vi.hoisted(()=>({game:(name:string,scores:number[])=>(props:{playerCount:number;onComplete?:(scores:{playerId:number;score:number}[])=>void})=><section><h2>{name}</h2><button onClick={()=>{const result=Array.from({length:props.playerCount},(_,i)=>({playerId:i+1,score:scores[i]??0}));props.onComplete?.(result);props.onComplete?.(result)}}>Finish {name}</button></section>}))
vi.mock('../src/minigames/bubble-battle/BubbleBattle',()=>({BubbleBattle:game('Bubble Battle',[20,0])}))
vi.mock('../src/minigames/window-wipe/WindowWipe',()=>({WindowWipe:game('Window Wipe',[1,2])}))
vi.mock('../src/minigames/ninja-training/NinjaTraining',()=>({NinjaTraining:game('Paper Dojo',[0,0])}))
vi.mock('../src/minigames/ghost-catcher/GhostCatcher',()=>({GhostCatcher:game('Ghost Catcher',[0,0])}))
vi.mock('../src/minigames/rocket-rumble/RocketRumble',()=>({RocketRumble:game('Rocket Rumble',[0,50])}))
vi.mock('../src/minigames/boxing-champ/BoxingChamp',()=>({BoxingChamp:game('Cardboard Champ',[0,0])}))
vi.mock('../src/minigames/keep-ups/KeepUps',()=>({KeepUps:game('Keep Ups',[0,0])}))
describe('five-game tournament integration',()=>{
 it('advances once per game, sums actual points, announces the winner and retains camera/player count',async()=>{
  const source:CameraController={start:vi.fn().mockResolvedValue({}),stop:vi.fn(),listDevices:vi.fn().mockResolvedValue([])}
  render(<CameraSetup tournament source={source} readyGateEnabled={false}/>)
  await waitFor(()=>expect(screen.getByRole('button',{name:'Play Tournament'})).toBeEnabled())
  fireEvent.click(screen.getByRole('button',{name:'2 players'}));fireEvent.click(screen.getByRole('button',{name:'Play Tournament'}))
  for(const title of ['Paper Dojo','Window Wipe','Cardboard Champ','Keep Ups','Ghost Catcher']){
   expect(screen.getByRole('heading',{name:title})).toBeVisible()
   fireEvent.click(screen.getByRole('button',{name:'Finish '+title}))
  }
  const results=screen.getByRole('dialog',{name:'Tournament results'})
  expect(within(results).getByRole('heading',{name:'Player 2 wins!'})).toHaveFocus()
  expect(within(results).getAllByRole('listitem').map(li=>li.textContent)).toEqual(['Player 22 points','Player 11 points'])
  fireEvent.click(screen.getByRole('button',{name:'New tournament'}))
  expect(screen.getByRole('button',{name:'2 players'})).toHaveAttribute('aria-pressed','true')
  fireEvent.click(screen.getByRole('button',{name:'Play Tournament'}))
  expect(screen.getByRole('heading',{name:'Paper Dojo'})).toBeVisible()
  expect(source.start).toHaveBeenCalledOnce();expect(source.stop).not.toHaveBeenCalled()
 })
})
