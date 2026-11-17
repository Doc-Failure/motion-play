import {describe,it,expect} from 'vitest'
import {HandGestureProcessor,type DetectedHand} from '../src/input/HandGestureProcessor'
import type {StickBody} from '../src/camera/poseTracking'
const body=(x=.5)=>({neck:{x,y:.3},hands:[{x,y:.5}]} as StickBody)
function hand(closed=false,x=.5):DetectedHand{
 const points=Array.from({length:21},()=>({x:1-x,y:.5}));points[5]={x:1-x-.04,y:.5};points[17]={x:1-x+.04,y:.5};points[4]={x:1-x-.02,y:.3};points[8]={x:1-x+(closed?-.015:.06),y:.3}
 return {points,confidence:.95,side:'Left'}
}
describe('real finger landmark pinch edges',()=>{
 it('requires opening first, fires once, then requires a release before another cast',()=>{
  const p=new HandGestureProcessor()
  expect(p.process([hand(true)],[body()],1,1,0).map(e=>e.kind)).toEqual(['HAND_POSITION'])
  p.process([hand()],[body()],1,1,100)
  expect(p.process([hand(true)],[body()],1,1,200).map(e=>e.kind)).toEqual(['HAND_POSITION','HAND_PINCH'])
  expect(p.process([hand(true)],[body()],1,1,300).map(e=>e.kind)).toEqual(['HAND_POSITION'])
  p.process([hand()],[body()],1,1,600);expect(p.process([hand(true)],[body()],1,1,700).some(e=>e.kind==='HAND_PINCH')).toBe(true)
 })
 it('assigns a hand to its owning measured body and mirrors aim once',()=>{
  const p=new HandGestureProcessor();p.process([hand(false,.75)],[body(.25),body(.75)],2,1,0)
  const event=p.process([hand(true,.75)],[body(.25),body(.75)],2,1,100).find(e=>e.kind==='HAND_PINCH')!
  expect(event.playerId).toBe(2);expect(event.x).toBeGreaterThan(.5)
 })
 it('resets recognition after occlusion, confidence loss or a stale observation',()=>{
  for(const missing of [[],[{...hand(),confidence:.1}]]){
   const p=new HandGestureProcessor();p.process([hand()],[body()],1,1,0);p.process(missing,[body()],1,1,100)
   expect(p.process([hand(true)],[body()],1,1,200).some(e=>e.kind==='HAND_PINCH')).toBe(false)
  }
  const p=new HandGestureProcessor();p.process([hand()],[body()],1,1,0);expect(p.process([hand(true)],[body()],1,1,1000).some(e=>e.kind==='HAND_PINCH')).toBe(false)
 })
 it('rejects malformed, unowned, ambiguous and repeated packets',()=>{
  const p=new HandGestureProcessor();expect(p.process([hand()],[],1,1,0)).toEqual([])
  expect(p.process([hand()],[body(),body(.51)],2,1,100)).toEqual([])
  const bad=hand();bad.points[4].x=NaN;expect(p.process([bad],[body()],1,1,200)).toEqual([])
  p.process([hand()],[body()],1,1,300);expect(p.process([hand(true)],[body()],1,1,300)).toEqual([])
 })
})
