import {describe,it,expect} from 'vitest'
import {HandPointerStabilizer} from '../src/input/HandPointerStabilizer'
import {WebcamMenuDwell,type MenuSample} from '../src/input/WebcamMenuInput'
const sample=(time:number,x=.3,y=.4,id='left'):MenuSample=>({time,events:[{playerId:1,kind:'UI_POINTER',timestamp:time,confidence:1,x,y,pointerId:id}]})
describe('stable measured hand pointers',()=>{
 it('keeps a held hand still through small two-axis capture tremors, with fresh capture times',()=>{
  const filter=new HandPointerStabilizer()
  filter.process(sample(0),1440,900,900)
  for(let t=50;t<=3000;t+=50){
   const point=filter.process(sample(t,.3+Math.sin(t)*4/1440,.4+Math.cos(t)*4/900),1440,900,900).events[0]
   expect(point).toMatchObject({x:.3,y:.4,timestamp:t})
  }
 })
 it('follows a deliberate reach immediately and tracks slow movement without an accumulating offset',()=>{
  const filter=new HandPointerStabilizer();filter.process(sample(0),1000,800,800)
  expect(filter.process(sample(50,.75,.7),1000,800,800).events[0]).toMatchObject({x:.75,y:.7})
  let point=sample(0).events[0];filter.reset();filter.process(sample(100),1000,800,800)
  for(let t=150;t<=600;t+=50)point=filter.process(sample(t,.3+(t-100)*.00004),1000,800,800).events[0]
  expect(point.x).toBeGreaterThan(.312);expect(.32-point.x).toBeLessThan(.01)
 })
 it('drops missing and weak hands immediately and reacquires at their measured position',()=>{
  const filter=new HandPointerStabilizer();filter.process(sample(0),1000,800)
  expect(filter.process({time:50,events:[]},1000,800).events).toEqual([])
  expect(filter.process(sample(100,.302),1000,800).events[0].x).toBe(.302)
  const weak=sample(150,.303);weak.events[0].confidence=.2
  expect(filter.process(weak,1000,800).events).toEqual([])
  expect(filter.process(sample(200,.304),1000,800).events[0].x).toBe(.304)
 })
 it('does not share filtering between hands or bridge a long gap',()=>{
  const filter=new HandPointerStabilizer()
  filter.process(sample(0,.3,.4,'left'),1000,800)
  expect(filter.process(sample(50,.302,.4,'right'),1000,800).events[0].x).toBe(.302)
  expect(filter.process(sample(1200,.305,.4,'right'),1000,800).events[0].x).toBe(.305)
  filter.reset();expect(filter.process(sample(1300,.309),1000,800).events[0].x).toBe(.309)
 })
 it('cannot let a deliberately departed hand finish a three-second selection',()=>{
  const filter=new HandPointerStabilizer(),dwell=new WebcamMenuDwell(),targets=[{id:'play',x:.1,y:.2,width:.3,height:.3}]
  const update=(t:number,x=.3)=>dwell.process(filter.process(sample(t,x),1000,800),targets)
  for(let t=0;t<=1400;t+=100)expect(update(t).activatedId).toBeNull()
  expect(update(1500,.7)).toMatchObject({activeId:null,progress:0})
  expect(update(1600).progress).toBe(0)
  for(let t=1700;t<4600;t+=100)expect(update(t,.3+Math.sin(t)*.004).activatedId).toBeNull()
  expect(update(4600).activatedId).toBe('play')
 })
 it('rejects invalid, replayed and mismatched observations',()=>{
  const filter=new HandPointerStabilizer();filter.process(sample(100),1000,800)
  expect(filter.process(sample(100),1000,800).events).toEqual([])
  const bad=sample(150);bad.events[0].timestamp=100
  expect(filter.process(bad,1000,800).events).toEqual([])
  expect(filter.process(sample(200),0,800).events).toEqual([])
 })
})
