import {expect,it} from 'vitest'
import {stickBodies,type PosePoint} from '../src/camera/poseTracking'
import {PoseSwipes} from '../src/input/PoseSwipes'
import {keepUpsInput} from '../src/input/KeepUpsInput'

function pose(center:number,first:number|null,second:number){
  const points:PosePoint[]=Array.from({length:33},()=>({x:0,y:0,visibility:0}))
  for(const [id,x,y] of [[11,center-.04,.4],[12,center+.04,.4],[13,center-.03,.46],[14,center+.03,.46],[16,second,.52]]){
    points[id]={x:1-x,y,visibility:1}
  }
  if(first!==null)points[15]={x:1-first,y:.52,visibility:1}
  return points
}

it('keeps the same physical wrist and elbow when the other arm disappears',()=>{
  const contacts=(left:number|null)=>keepUpsInput(stickBodies([pose(.25,left,.36)]),2,100,true)
  const ids=(left:number|null)=>contacts(left).filter(e=>e.x>.5).map(e=>e.pointerId)
  expect(ids(.1)).toEqual(ids(null))
  expect(ids(null)).toContain('hand-16')
})
it('uses real wrist movement for a swipe and never joins two different hands or players',()=>{
  const tracker=new PoseSwipes()
  const run=(a:number|null,b:number,t:number)=>tracker.sample(stickBodies([pose(.25,a,b),pose(.75,.65,.86)]),2,t)
  expect(run(.10,.36,0)).toEqual([])
  expect(run(null,.36,50)).toEqual([])
  const moved=run(null,.25,130)
  expect(moved).toHaveLength(1)
  expect(moved[0]).toMatchObject({kind:'HAND_SWIPE',playerId:1,pointerId:'0:16',x:.5,swipe:{fromX:.72}})
  tracker.sample([],2,140)
  expect(run(.28,.35,190)).toEqual([])
})
