import {describe,expect,it} from 'vitest'
import {stickBodies, type PosePoint} from '../src/camera/poseTracking'
import {shadowPoseInput} from '../src/input/ShadowPoseInput'
import type {PlayerCount} from '../src/input/PlayerZoneMapper'
import {ShadowModel} from '../src/minigames/shadow-snap/ShadowModel'
import {armVector, pictureDeck, type Pose} from '../src/minigames/shadow-snap/poses'
import {makeCutout, measureFit, fitDeductions} from '../src/minigames/shadow-snap/cutout'
import {scoreGoal} from '../src/game/arcade'

const aspect=4/3
function rawPose(center:number,width:number,pose:Pose):PosePoint[]{
  const points=Array.from({length:33},()=>({x:0,y:0,visibility:0}))
  // Anatomical left wrist (15) appears on the mirrored screen's right in this fixture.
  for(let side=0;side<2;side++){
    const joint=1-side,sx=center+(side===0?-1:1)*width/2
    points[11+joint]={x:1-sx,y:.48,visibility:.95}
    const [dx,dy]=armVector(pose[side],side)
    points[15+joint]={x:1-sx-dx*width,y:.48+dy*width*aspect,visibility:.94}
  }
  return points
}
const shapes=new Map<string,ReturnType<typeof makeCutout>>()
function input(poses:Pose[],players:PlayerCount,time:number){
  const bodies=poses.map((pose,i)=>{
    const key=[players,i,...pose].join('/')
    if(!shapes.has(key))shapes.set(key,makeCutout(pose,i,players,aspect))
    return shapes.get(key)!
  })
  return shadowPoseInput(stickBodies(poses.map((p,i)=>rawPose((i+.5)/players,.18/players,p)),bodies),players,time)
}
describe('Shadow Snap',()=>{
  it('retains the whole mask with its mirrored owner after sorting and rejects ambiguous seats',()=>{
    const left=rawPose(.25,.1,['up','up']),right=rawPose(.75,.1,['out','up'])
    const masks=[makeCutout(['out','up'],1,2,aspect),makeCutout(['up','up'],0,2,aspect)]
    const events=shadowPoseInput(stickBodies([right,left],masks),2,700)
    expect(events.map(e=>e.playerId)).toEqual([1,2])
    expect(events[0].bodyMask).toBe(masks[1])
    expect(events[1].bodyMask).toBe(masks[0])
    expect(shadowPoseInput(stickBodies([left,left],masks),2,700)).toEqual([])
    expect(shadowPoseInput(stickBodies([left]),1,700)).toEqual([])
  })
  it('distinguishes spill from missing coverage and gives a small free margin',()=>{
    const target=makeCutout(['up','up'],0,1,aspect)
    const perfect=measureFit(target,target)!
    expect(perfect).toEqual({outside:0,empty:0,sleevesFilled:true})
    const cells=target.cells.slice()
    let filled=0
    for(let i=0;i<cells.length&&filled<target.area;i++)if(!cells[i]){cells[i]=1;filled++}
    expect(measureFit({...target,cells},target)).toMatchObject({outside:.5,empty:0})
    const partial=Uint8Array.from(target.cells,(v,i)=>i%2?v:0)
    const fit=measureFit({...target,cells:partial},target)!
    expect(fit.outside).toBe(0)
    expect(fit.empty).toBeCloseTo(.5,1)
    expect(fitDeductions({outside:.10,empty:.15})).toEqual({outside:0,empty:0})
    expect(measureFit({...target,cells:new Uint8Array(cells.length)},target)).toBeNull()
    expect(measureFit(makeCutout(['down','down'],0,1,aspect),target)?.sleevesFilled).toBe(false)
  })
  it('charges a miss once per person and names each deduction',()=>{
    const m=new ShadowModel(2),s=m.start(0)
    const events=input(s.picture.poses,2,9750)
    const target=s.targets[0]
    const cells=target.cells.slice()
    for(let i=0;i<cells.length;i++)if(i%2===0)cells[i]=Number(!cells[i])
    events[0].bodyMask={...target,cells}
    const cost=fitDeductions(measureFit(events[0].bodyMask,target)!)
    const result=m.update(9750,events)
    expect(result.outcome).toBe('miss')
    expect(cost.outside).toBeGreaterThan(0)
    expect(cost.empty).toBeGreaterThan(0)
    expect(result.scores.map(p=>p.score)).toEqual([-cost.outside-cost.empty,0])
    expect(m.update(9800,events).deductions).toEqual([cost,{outside:0,empty:0}])
  })
  it('subtracts an imperfect fit from a successful photo only for that person',()=>{
    const model=new ShadowModel(2),initial=model.start(0)
    const target=initial.targets[0],cells=target.cells.slice()
    // Leave a quarter of the opening empty and add spill around the outside.
    for(let i=0;i<cells.length;i+=4)cells[i]=0
    let added=0
    for(let i=0;i<cells.length&&added<target.area*.22;i++)if(!target.cells[i]){cells[i]=1;added++}
    const mask={...target,cells},cost=fitDeductions(measureFit(mask,target)!)
    expect(cost.empty).toBeGreaterThan(0)
    expect(cost.outside).toBeGreaterThan(0)
    let s=initial
    for(let t=3000;t<=3500;t+=50){
      const observed=input(initial.picture.poses,2,t)
      observed[0].bodyMask=mask
      s=model.update(t,observed)
    }
    expect(s.photos).toBe(1)
    expect(s.scores.map(p=>p.score)).toEqual([20-cost.outside-cost.empty,20])
  })
  it('requires the team to fit together and discards holds when the feed changes shape',()=>{
    const m=new ShadowModel(2),s=m.start(0)
    for(let t=3000;t<=3450;t+=50)m.update(t,input(s.picture.poses,2,t).slice(0,1))
    for(let t=3500;t<=3950;t+=50)m.update(t,input(s.picture.poses,2,t).slice(1))
    expect(m.update(4000,input(s.picture.poses,2,4000)).photos).toBe(0)
    m.setAspect(1)
    const resized=m.update(4050,input(s.picture.poses,2,4050))
    expect(resized.targets[0].width).toBe(96)
    expect(resized.seats.every(p=>!p.fit&&!p.matched)).toBe(true)
  })
  it.each([1,2,3,4] as const)('rewards every contributor exactly once for a %i-person photo',players=>{
    const model=new ShadowModel(players,0,()=>.4)
    let s=model.start(0)
    for(let t=3000;t<=3450;t+=50) s=model.update(t,input(s.picture.poses.slice(0,-1),players,t))
    expect(s.photos).toBe(0)
    for(let t=3500;t<=3950;t+=50) s=model.update(t,input(s.picture.poses,players,t))
    expect(s.outcome).toBe('snap')
    expect(s.scores.map(p=>p.score)).toEqual(Array(players).fill(20))
    expect(model.update(4050).photos).toBe(1)
    const next=model.update(5000)
    expect(next.picture.name).not.toBe(s.picture.name)
    expect(next.seats.every(p=>!p.matched)).toBe(true)
  })
  it('finishes when a recovery pause arrives on the last frame',()=>{
    const model=new ShadowModel(2)
    model.start(0)
    model.update(38990)
    expect(model.pause(39000).phase).toBe('results')
  })
  it('ignores repeated, stale, low-confidence and paused observations',()=>{
    const m=new ShadowModel(1),pose=m.start(0).picture.poses
    for(let t=3000;t<4000;t+=20)expect(m.update(t,input(pose,1,3000)).photos).toBe(0)
    for(let t=4010;t<4510;t+=50)expect(m.update(t,input(pose,1,t).map(e=>({...e,confidence:.2}))).photos).toBe(0)
    m.update(4520,input(pose,1,4520));m.update(4720,input(pose,1,4720))
    m.pause(4730);expect(m.update(8000,input(pose,1,8000)).phase).toBe('paused')
    m.resume(8100);expect(m.update(8110,input(pose,1,8110)).seats[0].progress).toBe(0)
  })
  it('times out an incomplete group, clears locks on replay and caps the expert challenge',()=>{
    const m=new ShadowModel(4,1,()=>.42)
    let s=m.start(0)
    for(let t=3000;t<3500;t+=50)s=m.update(t,input(s.picture.poses.slice(0,3),4,t))
    expect(s.seats.filter(p=>p.matched)).toHaveLength(3)
    expect(m.update(9000).outcome).toBe('miss')
    expect(m.update(39000).phase).toBe('results')
    const fresh=m.start(39001)
    expect(fresh.photos).toBe(0);expect(fresh.seats.every(p=>!p.matched)).toBe(true)
    expect(scoreGoal('shadow-snap',9,4)).toBe(440)
    expect(pictureDeck(4,1).length).toBeGreaterThan(pictureDeck(4,0).length)
  })
})
it('keeps twelve seeded cooperative rounds achievable at tutorial, medium and expert difficulty',()=>{
  for(const level of [1,4,8]) for(const seed of [3,7,19,41]){
    let state=seed
    const random=()=>((state=(1664525*state+1013904223)>>>0)/2**32)
    const model=new ShadowModel(4,(level-1)/7,random)
    let round=model.start(0)
    let opened=3000,last=round.picture
    for(let time=3000;time<=39000;time+=50){
      if(round.picture!==last){opened=time;last=round.picture}
      const events=input(round.picture.poses,4,time).filter(e=>time-opened>=700+e.playerId*180)
      round=model.update(time,events)
    }
    expect(round.phase).toBe('results')
    expect(round.scores.reduce((sum,p)=>sum+p.score,0)).toBeGreaterThanOrEqual(scoreGoal('shadow-snap',level,4))
    expect(new Set(round.scores.map(p=>p.score)).size).toBe(1)
    expect(round.album).toHaveLength(3)
  }
})
