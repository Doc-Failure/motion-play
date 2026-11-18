import {expect,it} from 'vitest'
import {resolveBodyContact} from '../src/game/physics/bodyCollision'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
const surface=(x=.5,y=.5):MotionInputEvent=>({playerId:1,kind:'BODY_MOVE',x,y,timestamp:0,confidence:1,pointerId:'head'})
it('preserves impact direction and loses energy on a stationary surface',()=>{
 for(const aspect of [.5,1,16/9]){
  const b={x:.5,y:.45,vx:0,vy:.6}
  expect(resolveBodyContact(b,surface(),{aspect,radius:.06})).toBe(true)
  expect(b.vy).toBeCloseTo(-.51);expect(b.vx).toBe(0);expect(b.y).toBeLessThan(.45)
 }
})
it('reflects a side impact horizontally without inventing an upward launch',()=>{
 const b={x:.45,y:.5,vx:.6,vy:0}
 resolveBodyContact(b,surface(),{aspect:1,radius:.06})
 expect(b.vx).toBeLessThan(0);expect(b.vy).toBe(0)
})
it('allows upward-moving balls to hit the underside of an arm',()=>{
 const b={x:.5,y:.54,vx:0,vy:-.6}
 resolveBodyContact(b,{...surface(.7,.5),origin:{x:.3,y:.5}},{aspect:1,radius:.06})
 expect(b.vy).toBeGreaterThan(0)
})
it('does not score or inject energy when separating',()=>{
 const b={x:.5,y:.45,vx:0,vy:-.6}
 expect(resolveBodyContact(b,surface(),{aspect:1,radius:.06})).toBe(false)
 expect(b.vy).toBe(-.6)
})
it('transfers a fresh measured sweep, but not a stale or discontinuous observation',()=>{
 const bounce=(previous:MotionInputEvent,sampleAge=0)=>{
  const b={x:.5,y:.45,vx:0,vy:.6}
  resolveBodyContact(b,surface(),{aspect:1,radius:.06,previous,sampleSeconds:.04,sampleAge})
  return b
 }
 expect(bounce(surface(.46,.5)).vx).toBeGreaterThan(0)
 expect(bounce(surface(.46,.5),100).vx).toBe(0)
 expect(bounce(surface(.1,.5)).vx).toBe(0)
})
it('uses the contact point velocity on a rotating arm rather than its endpoint alone',()=>{
 const b={x:.31,y:.45,vx:0,vy:.6}
 resolveBodyContact(b,{...surface(.7,.5),origin:{x:.3,y:.5}},{aspect:1,radius:.06,previous:{...surface(.7,.6),origin:{x:.3,y:.5}},sampleSeconds:.05})
 expect(Math.abs(b.vy)).toBeLessThan(.7)
})
it('caps the total outgoing speed even on a fast moving body',()=>{
 const b={x:.5,y:.45,vx:0,vy:1.5}
 resolveBodyContact(b,surface(),{aspect:1,radius:.06,previous:surface(.5,.55),sampleSeconds:.02,maxSpeed:1.65})
 expect(Math.hypot(b.vx,b.vy)).toBeLessThanOrEqual(1.650001)
})
