import {describe,it,expect,vi} from 'vitest'
import {WebcamMenuDwell,WebcamMenuInput,menuPointers,projectMenuSample,type MenuSample} from '../src/input/WebcamMenuInput'
import {containCameraFrame} from '../src/game/cameraGeometry'
import type {StickBody} from '../src/camera/poseTracking'
const targets=[{id:'catalog',x:.1,y:.2,width:.3,height:.3},{id:'tournament',x:.6,y:.2,width:.3,height:.3}]
const sample=(t:number,x=.2,playerId:1|2|3|4=1,pointerId='wrist'):MenuSample=>({time:t,events:[{playerId,kind:'UI_POINTER',confidence:1,timestamp:t,x,y:.3,pointerId}]})
const hold=(model:WebcamMenuDwell,start=0,x=.2,id:1|2|3|4=1)=>{let result=model.process(sample(start,x,id),targets);for(let t=start+500;t<=start+2000;t+=500)result=model.process(sample(t,x,id),targets);return result}
describe('two-second camera choices',()=>{
 it('requires two full seconds of fresh wrist observations, rather than elapsed wall time alone',()=>{
  const m=new WebcamMenuDwell();m.process(sample(0),targets)
  for(let t=500;t<=1500;t+=500)expect(m.process(sample(t),targets).activatedId).toBeNull()
  expect(m.process(sample(1999),targets).progress).toBeCloseTo(1999/2000)
  expect(m.process(sample(2000),targets).activatedId).toBe('catalog')
  const frozen=new WebcamMenuDwell();frozen.process(sample(0),targets)
  expect(frozen.process(sample(2000),targets).progress).toBe(0)
 })
 it.each([1,2,3,4] as const)('lets player %i hold a real button without stretching their lane',id=>{
  expect(hold(new WebcamMenuDwell(),0,.2,id).activatedId).toBe('catalog')
 })
 it('resets immediately on departure, missing or low-confidence wrists',()=>{
  for(const interruption of [{time:1200,events:[]} as MenuSample,sample(1200,.5),{...sample(1200),events:sample(1200).events.map(e=>({...e,confidence:.1}))}]){
   const m=new WebcamMenuDwell();m.process(sample(0),targets);m.process(sample(600),targets);m.process(interruption,targets)
   expect(m.process(sample(1500),targets).progress).toBe(0)
   expect(m.process(sample(2000),targets).progress).toBeCloseTo(1/4)
  }
 })
 it('does not combine different hands into a single hold, but accepts either hand',()=>{
  const m=new WebcamMenuDwell();m.process(sample(0,.2,1,'left'),targets);m.process(sample(500,.2,1,'left'),targets)
  expect(m.process(sample(1000,.2,1,'right'),targets).progress).toBe(0)
  for(let t=1500;t<=2500;t+=500)expect(m.process(sample(t,.2,1,'right'),targets).activatedId).toBeNull()
  expect(m.process(sample(3000,.2,1,'right'),targets).activatedId).toBe('catalog')
 })
 it('does not repeat while a hand stays on its chosen button and can choose the next button',()=>{
  const m=new WebcamMenuDwell();expect(hold(m).activatedId).toBe('catalog')
  for(let t=3500;t<=7000;t+=500)expect(m.process(sample(t),targets).activatedId).toBeNull()
  expect(hold(m,7500,.7).activatedId).toBe('tournament')
 })
 it('guards a newly opened screen against stationary hands; deliberate movement rearms it',()=>{
  const m=new WebcamMenuDwell();m.reset(true)
  for(let t=0;t<=4000;t+=500){const s=sample(t);s.events.push({...s.events[0],x:.7,pointerId:'other'});expect(m.process(s,targets).activatedId).toBeNull()}
  expect(hold(m,4500,.3).activatedId).toBe('catalog')
 })
 it('ignores stale, replayed, invalid and incorrectly stamped observations',()=>{
  const m=new WebcamMenuDwell();m.process(sample(200),targets)
  expect(m.process(sample(100),targets).activatedId).toBeNull()
  const invalid=sample(300);invalid.events[0].x=NaN;expect(m.process(invalid,targets).activeId).toBeNull()
  const stamp=sample(400);stamp.events[0].timestamp=399;expect(m.process(stamp,targets).activeId).toBeNull()
 })
 it('keeps actual mirrored wrist coordinates and stable wrist identities without reach scaling',()=>{
  const first={neck:{x:.125,y:.3},hands:[{x:.2,y:.5}],wristIds:[16]} as StickBody
  const other={neck:{x:.375,y:.3},hands:[{x:.7,y:.4}],wristIds:[15]} as StickBody
  expect(menuPointers([first,other],4,50)).toEqual([
   {playerId:1,kind:'UI_POINTER',x:.2,y:.5,confidence:1,timestamp:50,pointerId:'0:16'},
   {playerId:2,kind:'UI_POINTER',x:.7,y:.4,confidence:1,timestamp:50,pointerId:'1:15'},
  ])
  expect(menuPointers([first,first],4,50)).toEqual([])
 })
 it.each([[1440,900],[390,844],[900,600]])('projects a wrist exactly over its uncropped camera image at %i × %i',(width,height)=>{
  const frame=containCameraFrame(width,height,4/3),raw=sample(0,.2),projected=projectMenuSample(raw,frame,width,height).events[0]
  expect(projected.x*width).toBeCloseTo(frame.left+.2*frame.width)
  expect(projected.y*height).toBeCloseTo(frame.top+.3*frame.height)
  expect(projected.pointerId).toBe('wrist')
 })

 it('allows movement across game-lane boundaries and two bodies in the same half of the camera',()=>{
  const body={neck:{x:.1,y:.3},hands:[{x:.2,y:.5}],wristIds:[15]} as StickBody
  const moved={...body,neck:{x:.9,y:.3}}
  expect(menuPointers([body],4,0)[0].pointerId).toBe(menuPointers([moved],4,100)[0].pointerId)
  expect(menuPointers([body,{...body,neck:{x:.2,y:.3}}],2,100)).toHaveLength(2)
 })
 it('unsubscribes navigation consumers',()=>{
  const feed=new WebcamMenuInput(),listener=vi.fn(),stop=feed.subscribe(listener)
  feed.publish(sample(0));stop();feed.publish(sample(100));expect(listener).toHaveBeenCalledOnce()
 })
})

it('allows the initial on-button hold after scene setup but preserves protection after activation',()=>{
 const m=new WebcamMenuDwell();m.resetForScene();expect(hold(m).activatedId).toBe('catalog')
 m.resetForScene();for(let t=3500;t<=7000;t+=500)expect(m.process(sample(t),targets).activatedId).toBeNull()
 expect(hold(m,7500,.7).activatedId).toBe('tournament')
})
it('does not strand a hand after a tracking interruption before any selection',()=>{
 const m=new WebcamMenuDwell();m.process(sample(0),targets);m.process(sample(500),targets);m.resetForScene()
 expect(hold(m,1000).activatedId).toBe('catalog')
})

it('a stationary second player cannot block another hand entering a choice after navigation',()=>{
 const m=new WebcamMenuDwell();m.reset(true)
 const two=(time:number,x:number)=>({time,events:[...sample(time,x,1,'first').events,...sample(time,.7,2,'second').events]})
 // The second hand is the only one initially detected after the scene changes.
 m.process(sample(0,.7,2,'second'),targets)
 m.process(two(100,.5),targets)
 for(let t=200;t<2200;t+=200)expect(m.process(two(t,.2),targets).activatedId).toBeNull()
 expect(m.process(two(2200,.2),targets).activatedId).toBe('catalog')
})
