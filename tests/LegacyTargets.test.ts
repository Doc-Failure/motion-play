import {describe,expect,it} from 'vitest'
import type {GameSessionSnapshot} from '../src/game/GameSession'
import {MotionProcessor,type MotionInputEvent} from '../src/input/MotionProcessor'
import {defaultCameraZones} from '../src/input/PlayerZoneMapper'
import {HandSwipeTracker} from '../src/input/HandSwipe'
import {BubbleBattleModel} from '../src/minigames/bubble-battle/BubbleBattleModel'
import {WhackAMoleModel} from '../src/minigames/whack-a-mole/WhackAMoleModel'
import {MeteorSmashModel} from '../src/minigames/meteor-smash/MeteorSmashModel'
import {FruitSlashModel} from '../src/minigames/fruit-slash/FruitSlashModel'
import {PinataPartyModel} from '../src/minigames/pinata-party/PinataPartyModel'
import {MonsterDefenseModel} from '../src/minigames/monster-defense/MonsterDefenseModel'
import {BalloonPanicModel} from '../src/minigames/balloon-panic/BalloonPanicModel'
import {FruitCatcherModel} from '../src/minigames/fruit-catcher/FruitCatcherModel'
import {GoldRushModel} from '../src/minigames/gold-rush/GoldRushModel'
import {FishFrenzyModel} from '../src/minigames/fish-frenzy/FishFrenzyModel'
import {SupermarketRushModel} from '../src/minigames/supermarket-rush/SupermarketRushModel'
import {StarCollectorModel} from '../src/minigames/star-collector/StarCollectorModel'
import {TreasureGrabModel} from '../src/minigames/treasure-grab/TreasureGrabModel'

interface Target {x:number;y:number;playerId:number}
type Options={playerCount:2;countdownMs:100;roundDurationMs:30000;pressure:number;random:()=>number}
function simulator<S extends GameSessionSnapshot>(
  model:{start(t:number):S;update(t:number):S},
  act:(event:MotionInputEvent)=>S,
  targets:(snapshot:S)=>Target[],
  kind:MotionInputEvent['kind']='MOTION_HIT',
) {
  return {
    start:(t:number)=>model.start(t),
    step(t:number,observe = (event:MotionInputEvent)=>event) {
      const state=model.update(t)
      const item=targets(state).find(p=>p.playerId===2&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1)
      if(!item||state.phase!=='playing')return state
      const swipe=kind==='HAND_SWIPE'?{fromX:Math.max(0,item.x-.22),fromY:item.y,durationMs:90}:undefined
      return act(observe({playerId:2,kind,confidence:.9,timestamp:t,x:swipe?Math.min(1,item.x+.22):item.x,y:item.y,swipe}))
    },
  }
}
const games={
  'bubble-battle':(o:Options)=>{const m=new BubbleBattleModel(o);return simulator(m,e=>m.handleInput(e),s=>s.targets.filter(t=>t.kind==='bubble'))},
  'whack-a-mole':(o:Options)=>{const m=new WhackAMoleModel(o);return simulator(m,e=>m.hit(e),s=>s.moles.map(t=>({...t,x:(t.hole%3+.5)/3,y:(Math.floor(t.hole/3)+.5)/3})))},
  'meteor-smash':(o:Options)=>{const m=new MeteorSmashModel(o);return simulator(m,e=>m.hit(e),s=>s.meteors)},
  'fruit-slash':(o:Options)=>{const m=new FruitSlashModel(o);return simulator(m,e=>m.slash(e),s=>s.fruit.filter(t=>t.kind!=='bomb'),'HAND_SWIPE')},
  'pinata-party':(o:Options)=>{const m=new PinataPartyModel(o);return simulator(m,e=>m.hit(e),s=>s.pinatas.filter(t=>t.readyAt===null))},
  'monster-defense':(o:Options)=>{const m=new MonsterDefenseModel(o);return simulator(m,e=>m.hit(e),s=>s.monsters)},
  'balloon-panic':(o:Options)=>{const m=new BalloonPanicModel(o);return simulator(m,e=>m.hit(e),s=>s.balloons.filter(t=>t.color===s.calls[t.playerId]))},
  'fruit-catcher':(o:Options)=>{const m=new FruitCatcherModel(o);return simulator(m,e=>m.moveHand(e),s=>s.fruit.filter(t=>t.kind!=='rotten'),'HAND_POSITION')},
  'gold-rush':(o:Options)=>{const m=new GoldRushModel(o);return simulator(m,e=>m.hit(e),s=>s.items.filter(t=>t.kind==='coin'))},
  'fish-frenzy':(o:Options)=>{const m=new FishFrenzyModel(o);return simulator(m,e=>m.moveHand(e),s=>s.fish,'HAND_POSITION')},
  'supermarket-rush':(o:Options)=>{const m=new SupermarketRushModel(o);return simulator(m,e=>m.hit(e),s=>s.items.filter(t=>t.kind===s.orders[t.playerId]))},
  'star-collector':(o:Options)=>{const m=new StarCollectorModel(o);return simulator(m,e=>m.hit(e),s=>s.items)},
  'treasure-grab':(o:Options)=>{const m=new TreasureGrabModel(o);return simulator(m,e=>m.hit(e),s=>s.items.filter(t=>t.kind==='treasure'))},
}
function cameraObservation(event:MotionInputEvent):MotionInputEvent {
  if(event.swipe){
    const wrists = new HandSwipeTracker()
    wrists.sample({...event,kind:'HAND_POSITION',x:event.swipe.fromX,y:event.swipe.fromY,timestamp:event.timestamp-event.swipe.durationMs})
    return wrists.sample({...event,kind:'HAND_POSITION'})!
  }
  // The camera is unmirrored. Player two occupies the left side of the raw frame.
  const width=160,height=90, data=new Uint8ClampedArray(width*height*4)
  const zones=defaultCameraZones(2),zone=zones[event.playerId-1]
  const processor=new MotionProcessor({smoothing:0})
  processor.process({width,height,data},zones,event.timestamp-25)
  const cx=Math.min(width-6,Math.max(5,Math.round((1-zone.x-zone.width*event.x)*width)))
  const cy=Math.min(height-6,Math.max(5,Math.round((zone.y+zone.height*event.y)*height)))
  for(let y=cy-5;y<=cy+5;y++)for(let x=cx-5;x<=cx+5;x++)data.fill(255,(y*width+x)*4,(y*width+x+1)*4)
  const result=processor.process({width,height,data},zones,event.timestamp)
  const samples=event.kind==='HAND_POSITION'?result.positions:result.events
  const measured=samples?.find(e=>e.playerId===event.playerId)
  if(!measured)throw Error('Synthetic patch did not yield a player-local observation')
  return {...measured,kind:event.kind}
}

describe.each(Object.entries(games))('%s', (slug,create)=>{
  it('scores through mirrored motion frames or the identified wrist swipe adapter',()=>{
    const model=create({playerCount:2,countdownMs:100,roundDurationMs:30000,pressure:.5,random:()=>.5})
    let state=model.start(0)
    for(let t=100;t<2500&&state.scores[1].score===0;t+=260)state=model.step(t,cameraObservation)
    expect(state.scores[1].score).toBeGreaterThan(0)
    expect(state.scores[0].score).toBe(0)
  })
  it('supports five seeded difficulty stages, fresh input, isolated scores, timed results and clean replay',()=>{
    for(const pressure of [0,.25,.5,.75,1]){
      let seed=205
      const model=create({playerCount:2,countdownMs:100,roundDurationMs:30000,pressure,random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32)})
      expect(model.start(0).phase).toBe('countdown')
      let firstHit=Infinity
      for(let t=100;t<30100;t+=260){
        const state=model.step(t)
        expect(state.phase).toBe('playing')
        if(state.scores[1].score>0)firstHit=Math.min(firstHit,t)
        expect(state.scores[0].score).toBeLessThanOrEqual(0)
      }
      expect(firstHit).toBeLessThan(2100)
      const result=model.step(30100)
      expect(result.phase).toBe('results')
      expect(result.scores[1].score).toBeGreaterThanOrEqual(slug==='monster-defense'?100:slug==='pinata-party'?50:90)
      expect(model.start(30500).scores.map(p=>p.score)).toEqual([0,0])
    }
  })
})
it('keeps simultaneous color calls independent and every live balloon physically selectable',()=>{
  const m=new BalloonPanicModel({playerCount:2,countdownMs:0,random:()=>0})
  const first=m.start(0)
  for(const b of first.balloons)expect(m.hit({playerId:b.playerId,kind:'MOTION_HIT',confidence:1,timestamp:20,x:b.x,y:b.y}).scores[b.playerId-1].score).toBe(10)
  const balloons=m.update(1900).balloons
  for(const a of balloons)for(const b of balloons)if(a.id!==b.id&&a.playerId===b.playerId)expect(Math.hypot(a.x-b.x,a.y-b.y)).toBeGreaterThan(.28)
})
it('clears a vanished basket without silently scoring for it',()=>{
  const m=new FruitCatcherModel({countdownMs:0,spawnIntervalMs:10000,random:()=>.5})
  m.start(0)
  m.moveHand({playerId:1,kind:'HAND_POSITION',x:.5,y:.5,confidence:.95,timestamp:5})
  expect(m.update(1800).hands).toEqual([])
  expect(m.update(1800).scores[0].score).toBe(0)
})
