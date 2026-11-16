import {describe,it,expect} from 'vitest'
import {BodyAlignment} from '../src/camera/BodyAlignment'
import {stickBodies,type PosePoint} from '../src/camera/poseTracking'
function person(){
 const p:PosePoint[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}))
 p[0]={x:.5,y:.12,visibility:1};p[7]={x:.46,y:.12,visibility:1};p[8]={x:.54,y:.12,visibility:1}
 p[11]={x:.35,y:.3,visibility:1};p[12]={x:.65,y:.3,visibility:1};p[23]={x:.4,y:.7,visibility:1};p[24]={x:.6,y:.7,visibility:1}
 p[15]={x:.2,y:.15,visibility:1};p[16]={x:.8,y:.15,visibility:1}
 return stickBodies([p])[0]
}
describe('measured player alignment',()=>{
 it('requires fresh confident raised-arm observations over two seconds',()=>{const c=new BodyAlignment(1);for(let t=0;t<2000;t+=80)expect(c.observe([person()],t).ready).toBe(false);expect(c.observe([person()],2000)).toMatchObject({ready:true,progress:1})})
 it('provides framing and gesture feedback rather than inventing offsets',()=>{
  const c=new BodyAlignment(1),body=person();expect(c.observe([],0).message).toContain('0 of 1')
  body.hands[0].y=.5;expect(c.observe([body],80).message).toContain('raise both hands')
  body.arms=[];expect(c.observe([body],160).message).toContain('both arms visible')
  const large=person();large.arms[0][1].x=.01;expect(c.observe([large],240).message).toContain('step back')
  const off=person();off.neck.x=.95;expect(c.observe([off],320).message).toContain('middle of your lane')
 })
 it('resets holds after movement, missing joints, duplicate time or stalled frames',()=>{
  const c=new BodyAlignment(1);for(let t=0;t<=1600;t+=80)c.observe([person()],t)
  const b=person();b.hands[0].x+=.06;expect(c.observe([b],1680).progress).toBe(0)
  expect(c.observe([],1760).progress).toBe(0);c.observe([person()],1840)
  expect(c.observe([person()],4000).progress).toBe(0);expect(c.observe([person()],4000).ready).toBe(false)
 })
 it('checks each selected lane instead of accepting extra or misplaced people',()=>{
  const left=person(),right=person();left.neck.x=.25;right.neck.x=.75
  const c=new BodyAlignment(2);expect(c.observe([left],0).ready).toBe(false)
  for(let t=80;t<=2080;t+=80)c.observe([left,right],t)
  expect(c.observe([left,right],2160).ready).toBe(true)
  right.neck.x=.5;expect(c.observe([left,right],2240).message).toContain('Player 2')
 })
 it('uses the measured ear midpoint for the head rather than a forward-projecting nose',()=>{
  const p:PosePoint[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:1}))
  p[0].x=.7;p[7].x=.4;p[8].x=.5
  expect(stickBodies([p])[0].head?.x).toBeCloseTo(.55)
 })
})
