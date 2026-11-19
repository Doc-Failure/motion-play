import {describe,expect,it} from 'vitest'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
import {DodgeballModel} from '../src/minigames/dodgeball/DodgeballModel'
import {LaserEscapeModel} from '../src/minigames/laser-escape/LaserEscapeModel'
import {DanceChallengeModel} from '../src/minigames/dance-challenge/DanceChallengeModel'
import {FreezeModel} from '../src/minigames/freeze/FreezeModel'
import {JumpRushModel} from '../src/minigames/jump-rush/JumpRushModel'
import {PaintSplashModel} from '../src/minigames/paint-splash/PaintSplashModel'
import {CarWashModel,CAR_MUD} from '../src/minigames/car-wash/CarWashModel'
import {PizzaMakerModel,ingredientTargets} from '../src/minigames/pizza-maker/PizzaMakerModel'
import {GraffitiRaceModel} from '../src/minigames/graffiti-race/GraffitiRaceModel'
import {TowerBuilderModel} from '../src/minigames/tower-builder/TowerBuilderModel'
import {AirPongModel} from '../src/minigames/air-pong/AirPongModel'
import type {GameSessionSnapshot} from '../src/game/GameSession'

const stages=[0,2/7,4/7,6/7,1]
const options=(pressure:number)=>({pressure,playerCount:2 as const,countdownMs:0,roundDurationMs:40000})
const input=(kind:MotionInputEvent['kind'],timestamp:number,x=.5,y=.5):MotionInputEvent=>({kind,timestamp,x,y,confidence:1,playerId:2})
type Model={start(t:number):GameSessionSnapshot;update(t:number):GameSessionSnapshot}
function simulate(model:Model,action:(t:number)=>void) {
  model.start(0)
  for(let t=0;t<40000;t+=80)action(t)
  const end=model.update(40000)
  expect(end.phase).toBe('results')
  expect(end.scores[0].score).toBe(0)
  const score=end.scores[1].score
  expect(model.start(40001).scores.map(p=>p.score)).toEqual([0,0])
  return score
}

describe.each(stages)('two-player simulations at level pressure %f',pressure=>{
  const opts=options(pressure)
  it('repositions for each aimed ball and escapes each changing laser gate',()=>{
    const dodge=new DodgeballModel(opts)
    expect(simulate(dodge,t=>{
      const lane=dodge.update(t).lanes[1]
      dodge.moveBody(input('BODY_MOVE',t,lane.ballX>.5?.18:.82))
    })).toBeGreaterThanOrEqual(90)
    const laser=new LaserEscapeModel(opts)
    expect(simulate(laser,t=>{
      const s=laser.update(t)
      laser.moveBody(input('BODY_MOVE',t,s.direction==='right'?.12:.88))
    })).toBeGreaterThanOrEqual(80)
  })
  it('performs announced dance directions and holds statues despite mild activity noise',()=>{
    const dance=new DanceChallengeModel(opts)
    let start=-1,cue=-1
    expect(simulate(dance,t=>{
      const s=dance.update(t)
      if(!s.active)return
      if(cue!==s.cueIndex){cue=s.cueIndex;start=t}
      const movement=Math.min(.26,(t-start)/1600)
      dance.moveBody(input('BODY_MOVE',t,.5+(s.cue==='left'?-movement:s.cue==='right'?movement:0),.5+(s.cue==='up'?-movement:s.cue==='down'?movement:0)))
    })).toBeGreaterThanOrEqual(90)
    const freeze=new FreezeModel(opts)
    expect(simulate(freeze,t=>{
      const s=freeze.update(t)
      freeze.input({...input('FREEZE',t),activity:s.cue==='Move!'?.08:.019})
    })).toBeGreaterThanOrEqual(40)
  })
  it('times small torso jumps against the original hurdle model',()=>{
    const jump=new JumpRushModel(opts)
    expect(simulate(jump,t=>{
      const s=jump.update(t)
      jump.moveBody({...input('BODY_MOVE',t,.5,s.impactRemainingMs<=300?.42:.5),pointerId:'torso',activity:.05})
    })).toBeGreaterThanOrEqual(90)
  })
  it('uses connected brush strokes to paint, reveal and scrub without cross-player scoring',()=>{
    const paint=new PaintSplashModel(opts),graffiti=new GraffitiRaceModel(opts),car=new CarWashModel(opts)
    for(const model of [paint,graffiti]){
      expect(simulate(model,t=>{
        const n=t/80, row=Math.floor(n/12)%8, col=n%12
        model.brush(input('MOTION_BRUSH',t,((row%2?11-col:col)+.5)/12,(row+.5)/8))
      })).toBe(96)
    }
    expect(simulate(car,t=>{
      const n=t/80,cell=CAR_MUD[Math.floor(n/2)%CAR_MUD.length]
      car.brush(input('MOTION_BRUSH',t,cell.x+(n%2?.04:-.04),cell.y))
    })).toBe(CAR_MUD.length)
  })
  it('completes regular and supreme recipes and stacks stable blocks',()=>{
    const pizza=new PizzaMakerModel(opts)
    expect(simulate(pizza,t=>{
      const order=pizza.update(t).orders[1]
      const next=order.requested.find(kind=>!order.added.includes(kind))
      const target=ingredientTargets.find(i=>i.kind===next)
      if(target)pizza.hit(input('MOTION_HIT',t,target.x,target.y))
    })).toBeGreaterThanOrEqual(110)
    const tower=new TowerBuilderModel(opts)
    expect(simulate(tower,t=>{
      const {target}=tower.update(t).lanes[1]
      tower.moveHand(input('HAND_POSITION',t,target.x+.008*Math.sin(t),target.y))
    })).toBeGreaterThanOrEqual(90)
  })
  it('returns moving serves while an untouched paddle scores zero',()=>{
    const pong=new AirPongModel(opts)
    expect(simulate(pong,t=>{
      const ball=pong.update(t).balls[1]
      pong.moveHand(input('HAND_POSITION',t,.1,ball.y))
    })).toBeGreaterThanOrEqual(45)
  })
})

it('avoids connecting brushes across tracking gaps or teleports',()=>{
  const run=(gap:number,endX:number)=>{
    const m=new PaintSplashModel({countdownMs:0,pressure:1})
    m.start(0);m.brush(inputP1(0,.2))
    return m.brush(inputP1(gap,endX)).painted[1]
  }
  const inputP1=(t:number,x:number):MotionInputEvent=>({...input('MOTION_BRUSH',t,x,.55),playerId:1})
  // Cell 52 lies between the two stamps but outside both brush disks.
  expect(run(80,.53)).toContain(52)
  expect(run(500,.53)).not.toContain(52)
  expect(run(80,.85)).not.toContain(52)
})

it('accepts a fresh dodge sample delivered one frame after capture without rewriting an impact',()=>{
  const dodge=new DodgeballModel(options(0))
  dodge.start(0);dodge.update(1700)
  dodge.moveBody(input('BODY_MOVE',1683,.18))
  expect(dodge.update(1800).scores[1].score).toBe(10)
  dodge.moveBody(input('BODY_MOVE',1790,.5))
  expect(dodge.update(1830).scores[1].score).toBe(10)
})
it('reconstructs the same angled pong ricochet across coarse or fine frames',()=>{
  const run=(step:number)=>{
    const model=new AirPongModel(options(1))
    model.start(0)
    model.setBall({playerId:2,x:.92,y:.91,velocityX:.00049,velocityY:.00037})
    for(let t=step;t<780;t+=step)model.update(t)
    return model.update(780).balls[1]
  }
  const fine=run(10),coarse=run(780)
  expect(coarse.x).toBeCloseTo(fine.x,9);expect(coarse.y).toBeCloseTo(fine.y,9)
  expect(coarse.velocityX).toBe(fine.velocityX);expect(coarse.velocityY).toBe(fine.velocityY)
})
it('changes reaction time, landing precision and art tools across five stages',()=>{
  const impact=new Set<number>(),brush=new Set<number>(),statue=new Set<number>(),serve=new Set<number>(),placement=new Set<number>()
  for(const pressure of stages){
    const opts=options(pressure)
    impact.add(new JumpRushModel(opts).start(0).impactRemainingMs)
    brush.add(new CarWashModel(opts).radius);statue.add(new FreezeModel(opts).targetMs)
    serve.add(new AirPongModel(opts).start(0).balls[0].velocityX)
    const tower=new TowerBuilderModel(opts);tower.start(0)
    for(let t=0;t<=800;t+=100)tower.moveHand(input('HAND_POSITION',t,.5,.82))
    placement.add(tower.update(800).lanes[1].target.x)
  }
  for(const values of [impact,brush,statue,serve,placement])expect(values.size).toBe(stages.length)
})
