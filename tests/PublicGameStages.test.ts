import {expect,it} from 'vitest'
import {challengePressure} from '../src/game/arcade'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
import {NinjaTrainingModel} from '../src/minigames/ninja-training/NinjaTrainingModel'
import {WindowWipeModel,WIPE_CELLS} from '../src/minigames/window-wipe/WindowWipeModel'
import {BoxingModel} from '../src/minigames/boxing-champ/BoxingModel'
import {KeepUpsModel} from '../src/minigames/keep-ups/KeepUpsModel'
import {GhostModel} from '../src/minigames/ghost-catcher/GhostModel'
import {UfoModel} from '../src/minigames/ufo-juggler/UfoModel'
import {HoopsModel} from '../src/minigames/six-hoops/HoopsModel'
import {SportsModel} from '../src/minigames/camera-sports/SportsModel'
import {RaceModel} from '../src/minigames/kangaroo-race/RaceModel'
import {BowlingModel} from '../src/minigames/marble-bowling/BowlingModel'
import {ShadowModel} from '../src/minigames/shadow-snap/ShadowModel'

const levels=[1,2,4,6,8]
const event=(kind:MotionInputEvent['kind'],timestamp:number,x:number,y:number):MotionInputEvent=>({kind,timestamp,x,y,playerId:1,confidence:1})
function checkStages(game:string,trend:'increase'|'decrease',measure:(pressure:number)=>number){
  const samples=levels.map(level=>measure(challengePressure(level)))
  for(let i=1;i<samples.length;i++){
    if(trend==='increase')expect(samples[i],`${game} level ${levels[i]}`).toBeGreaterThan(samples[i-1])
    else expect(samples[i],`${game} level ${levels[i]}`).toBeLessThan(samples[i-1])
  }
  console.info(game,samples.map(s=>Number(s.toFixed(4))).join(' / '))
}

it('Paper Dojo shortens ninja flight while a fresh swat still earns one hit',()=>{
  checkStages('Dojo flight ms','decrease',pressure=>{
    const model=new NinjaTrainingModel({playerCount:2,countdownMs:0,pressure})
    model.start(0)
    const target=model.update(1000).ninjas[0],hit=event('MOTION_HIT',1000,target.x,target.y)
    expect(model.hit(hit).hits[1]).toBe(1)
    expect(model.hit(hit).scores.map(p=>p.score)).toEqual([10,0])
    return target.flightMs
  })
})
it('Window Wipe asks for more coverage before a scrubbed pane clears',()=>{
  checkStages('Wipe percent at first clear','increase',pressure=>{
    const model=new WindowWipeModel({countdownMs:0,pressure})
    let state=model.start(0),t=0
    for(const spot of state.spots)for(const offset of [-.026,.026,-.026]){
      state=model.brush(event('MOTION_BRUSH',t+=190,spot.x+offset,spot.y))
    }
    expect(state.spots.every(s=>s.remaining===0)).toBe(true)
    for(let cell=0;cell<1200 && !state.celebrating;cell++)
      state=model.brush(event('MOTION_BRUSH',++t,(cell%40+.5)/40,(Math.floor(cell/40)+.5)/30))
    expect(state.celebrating).toBe(true)
    expect(state.scores[0].score).toBeGreaterThan(100)
    return state.cleaned.length/WIPE_CELLS*100
  })
})
it('Cardboard Champ brings the next attack forward and recognizes a measured jab',()=>{
  checkStages('Boxing attack interval ms','decrease',pressure=>{
    const model=new BoxingModel(2,1,pressure);model.start(0);model.update(3000)
    model.input(event('HAND_POSITION',3100,.39,.35))
    expect(model.input(event('HAND_POSITION',3180,.66,.35)).scores.map(p=>p.score)).toEqual([10,0])
    const boxer=model.update(6500).boxers[0]
    expect(boxer.cue).toBe('windup')
    return boxer.nextAttack-boxer.attack
  })
})
it('Keep Ups increases gravity and accepts the same measured header at each level',()=>{
  checkStages('Keep Ups height after 300ms','increase',pressure=>{
    const m=new KeepUpsModel(1,4/3,pressure);m.start(0)
    const y=m.update(3300).balls[0].y
    let s=m.update(3300)
    for(let t=3320;t<4800&&!s.balls[0].touches;t+=20){
      m.input([{...event('BODY_MOVE',t,s.balls[0].x,.45),pointerId:'head'}]);s=m.update(t)
    }
    expect(s.balls[0].touches).toBe(1)
    expect(s.scores[0].score).toBeGreaterThan(0)
    return y
  })
})
it('Ghost Catcher raises each ghost faster while allowing enough time for repeated brush samples',()=>{
  checkStages('Ghost y after 400ms','decrease',pressure=>{
    const m=new GhostModel(2,4/3,pressure);m.start(0)
    const y=m.update(3400).ghosts[0].y
    for(let t=3400;t<=4400;t+=40){
      const g=m.update(t).ghosts.find(g=>g.playerId===1&&g.state==='rising')
      if(g)m.input([event('MOTION_BRUSH',t,g.x,g.y)])
    }
    const s=m.update(4400)
    expect(s.captures).toEqual([1,0]);expect(s.scores[0].score).toBeGreaterThan(0)
    return y
  })
})
it('UFO Juggler increases spin decay and gives the contacted pilot an immediate boost',()=>{
  checkStages('UFO spin after 400ms','decrease',pressure=>{
    const m=new UfoModel(2,4/3,pressure);m.start(0)
    const ships=m.update(3400).ships,ship=ships[0]
    const after=m.input([event('MOTION_BRUSH',3400,ship.x,ship.y)])
    expect(after.ships[0].spin).toBeGreaterThan(ship.spin);expect(after.ships[1].spin).toBe(ships[1].spin)
    return ship.spin
  })
})
it('Six Hoops releases successive balls sooner while preserving head contact',()=>{
  checkStages('Six Hoops second release ms','decrease',pressure=>{
    const m=new HoopsModel(1,4/3,pressure);m.start(0)
    let touched=false
    for(let t=3350;t<7000;t+=10){
      const s=m.update(t)
      if(s.balls.some(b=>b.id===1)){expect(touched).toBe(true);return t-3000}
      const b=s.balls[0]
      if(b&&b.y>.22&&!touched){
        m.input([{...event('BODY_MOVE',t,b.x,b.y+.038),pointerId:'head'}])
        touched=m.update(t+10).balls[0].owner===1
      }
    }
    throw new Error('No second basketball within four seconds')
  })
})
it('Goalkeeper compresses the seeded flight window and leaves a reachable save interval',()=>{
  checkStages('Keeper progress after 850ms','increase',pressure=>{
    const m=new SportsModel('keeper',1,4/3,42,pressure);m.start(0)
    const progress=m.update(3850).shots[0].progress
    let s=m.update(3850)
    for(let t=3870;t<=4950&&!s.shots[0].saves;t+=20){
      const ball=s.shots[0];m.input([{...event('BODY_MOVE',t,ball.x,ball.y),pointerId:'head'}]);s=m.update(t)
    }
    expect(s.shots[0].saves).toBe(1)
    return progress
  })
})
it('Net Rally increases serve speed and a measured touch sends the ball across the court',()=>{
  checkStages('Net Rally horizontal serve speed','increase',pressure=>{
    const m=new SportsModel('net',2,4/3,42,pressure),initial=m.start(0),serve=Math.abs(initial.ball.vx)
    for(let t=3000;t<5100;t+=20){
      const s=m.update(t),b=s.ball
      if(b.touches){expect(s.lastTouch).toBe(1);expect(b.vx).toBeGreaterThan(0);return serve}
      m.input([{...event('BODY_MOVE',t,b.x,Math.min(.99,b.y+.03)),coordinateSpace:'court',pointerId:'head'}])
    }
    throw new Error('Opening serve did not reach the player')
  })
})
it('Kangaroo Race covers more ground and requires a measured rise to jump',()=>{
  checkStages('Race metres after 1s','increase',pressure=>{
    const m=new RaceModel(2,pressure);m.start(0)
    for(let t=3000;t<=4000;t+=50)m.moveBody({...event('BODY_MOVE',t,.5,t<3800?.6:.45),pointerId:'torso',activity:.05})
    const s=m.update(4000);expect(s.racers[0].height).toBeGreaterThan(0);expect(s.racers[1].distance).toBeGreaterThan(0);expect(s.racers[1].height).toBe(0)
    return s.racers[0].distance
  })
})
it('Marble Bowling narrows the strike window and leaves idle lanes untouched',()=>{
  checkStages('Bowling contact radius','decrease',pressure=>{
    const model=new BowlingModel(2,pressure,()=>0)
    model.start(0)
    model.roll(1,3050)
    const snap=model.update(3900)
    expect(snap.lanes[0].knocked).toBeGreaterThan(0)
    expect(snap.scores[1].score).toBe(0)
    return model.hitRadius
  })
})
it('Shadow Snap shortens the shutter window and awards the displayed cutout once',()=>{
  checkStages('Shadow Snap first timeout ms','decrease',pressure=>{
    const m=new ShadowModel(1,pressure,()=>.42),initial=m.start(0)
    let elapsed=0
    for(;elapsed<8000;elapsed+=10)if(m.update(3000+elapsed).outcome==='miss')break
    expect(elapsed).toBeLessThan(8000)
    const fitting=new ShadowModel(1,pressure,()=>.42);fitting.start(0)
    for(let t=3000;t<=3500;t+=50)fitting.update(t,[{...event('BODY_MASK',t,.5,.5),bodyMask:initial.targets[0]}])
    expect(fitting.update(3510)).toMatchObject({photos:1,scores:[{score:20}]})
    return elapsed
  })
})
