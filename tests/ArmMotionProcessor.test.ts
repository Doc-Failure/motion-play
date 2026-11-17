import {describe,it,expect} from 'vitest'
import {ArmMotionProcessor,retainArmCasts} from '../src/input/ArmMotionProcessor'
import type {StickBody} from '../src/camera/poseTracking'
const point=(x:number,y:number)=>({x,y,visibility:1})
function body(center=.5,offset=0):StickBody {
 const neck=point(center,.3),shoulder=point(center-.1,.3),elbow=point(center-.12,.45+offset),end=point(center-.15,.6+offset)
 return {neck,arms:[[neck,shoulder,elbow,end]],torso:[],legs:[],hands:[end],x:center,headRadius:.02}
}
const shots=(events:ReturnType<ArmMotionProcessor['process']>)=>events.filter(e=>e.kind==='ARM_MOVE')
describe('body-pose arm casting',()=>{
 it('aims without firing on the first or stationary observation',()=>{
  const p=new ArmMotionProcessor()
  expect(p.process([body()],1,1,0).map(e=>e.kind)).toEqual(['ARM_POSITION'])
  for(let t=50;t<3000;t+=50)expect(shots(p.process([body()],1,1,t))).toEqual([])
 })
 it('fires from arm movement without receiving finger landmarks',()=>{
  const p=new ArmMotionProcessor();p.process([body()],1,1,0)
  const [event]=shots(p.process([body(.5,-.08)],1,1,100))
  expect(event).toMatchObject({playerId:1,kind:'ARM_MOVE',x:.35,origin:{x:.38,y:.37}})
 })
 it('detects elbow movement even when the wrist remains in place',()=>{
  const p=new ArmMotionProcessor(),pose=body();p.process([pose],1,1,0)
  const changed=body();changed.arms[0][2].y-=.05
  expect(shots(p.process([changed],1,1,100))).toHaveLength(1)
 })
 it('does not fire from tiny jitter or whole-body translation',()=>{
  const p=new ArmMotionProcessor();p.process([body()],1,1,0)
  for(let t=50;t<2000;t+=50)expect(shots(p.process([body(.5,t%100===0?.003:-.003)],1,1,t))).toEqual([])
  const translated=body();translated.neck={...translated.neck,x:.55};translated.arms=translated.arms.map(chain=>chain.map(j=>({...j,x:j.x+.05})))
  expect(shots(p.process([translated],1,1,2050))).toEqual([])
 })
 it('repeats during continuous arm motion with a bounded cooldown and stops when still',()=>{
  const p=new ArmMotionProcessor(),times:number[]=[]
  for(let t=0;t<=1500;t+=50){const offset=.08*Math.sin(t/180);if(shots(p.process([body(.5,offset)],1,1,t)).length)times.push(t)}
  expect(times.length).toBeGreaterThanOrEqual(2)
  expect(times.slice(1).every((t,i)=>t-times[i]>=420)).toBe(true)
  for(let t=1600;t<=2400;t+=100)expect(shots(p.process([body(.5,.08*Math.sin(1500/180))],1,1,t))).toEqual([])
 })
 it('isolates player lanes and refuses ambiguous ownership',()=>{
  const p=new ArmMotionProcessor();p.process([body(.25),body(.75)],2,1,0)
  expect(shots(p.process([body(.25),body(.75,-.08)],2,1,100)).map(e=>e.playerId)).toEqual([2])
  expect(p.process([body(.25),body(.26)],2,1,200)).toEqual([])
 })
 it('reacquires a lost arm without an automatic shot and ignores stale or repeated times',()=>{
  const p=new ArmMotionProcessor();p.process([body()],1,1,0);p.process([],1,1,100)
  expect(shots(p.process([body(.5,-.1)],1,1,200))).toEqual([])
  expect(shots(p.process([body(.5,.1)],1,1,1000))).toEqual([])
  expect(p.process([body(.5,-.1)],1,1,1000)).toEqual([])
 })
 it('rejects low-confidence joints, jumps, out-of-lane endpoints and invalid samples',()=>{
  const p=new ArmMotionProcessor();p.process([body()],1,1,0)
  const weak=body(.5,-.1);weak.arms[0][2].visibility=.1
  expect(p.process([weak],1,1,100)).toEqual([])
  expect(p.process([body()],1,NaN,200)).toEqual([])
  const outside=body(.75);outside.arms[0][3].x=.4
  expect(p.process([outside],2,1,300)).toEqual([])
  const start=body();p.process([start],1,1,400);const jump=body(.5,-.5)
  expect(shots(p.process([jump],1,1,450))).toEqual([])
 })
 it('retains cast edges across newer positions, deduplicates and clears on loss or expiry',()=>{
  const p=new ArmMotionProcessor();p.process([body()],1,1,0)
  const events=p.process([body(.5,-.08)],1,1,100),position=events.filter(e=>e.kind==='ARM_POSITION')
  expect(shots(retainArmCasts(events,position,150))).toHaveLength(1)
  expect(shots(retainArmCasts(events,events,150))).toHaveLength(1)
  expect(shots(retainArmCasts(events,position,501))).toEqual([])
  expect(retainArmCasts(events,[],150)).toEqual([])
 })
})


it.each([1,2,3,4])('assigns casts to the last of %s body lanes without cross-player points',players=>{
 const poses=Array.from({length:players},(_,i)=>{const center=(i+.5)/players,b=body(center);b.arms=b.arms.map(c=>c.map(j=>({...j,x:center+(j.x-center)/players})));return b})
 const processor=new ArmMotionProcessor();processor.process(poses,players,1,0)
 poses[players-1].arms[0][3].y-=.08/players
 expect(shots(processor.process(poses,players,1,100)).map(e=>e.playerId)).toEqual([players])
})
