import {expect,it} from 'vitest'
import {keepUpsInput} from '../src/input/KeepUpsInput'
import type {StickBody} from '../src/camera/poseTracking'
const body:StickBody={neck:{x:.75,y:.3},torso:[{x:.75,y:.3},{x:.75,y:.6}],arms:[[{x:.75,y:.3},{x:.8,y:.4}]],legs:[[{x:.75,y:.6},{x:.8,y:.8}]],hands:[{x:.8,y:.4}],head:{x:.75,y:.2},headRadius:.03,x:.75}
it('includes measured head, arms, torso and leg surfaces for basketball in lane-local coordinates',()=>{
 const events=keepUpsInput([body],2,100,true)
 expect(events.every(e=>e.playerId===2&&e.timestamp===100&&e.kind==='BODY_MOVE')).toBe(true)
 expect(events.find(e=>e.pointerId==='head')).toMatchObject({x:.5,y:.2})
 expect(events.some(e=>e.y===.8&&e.origin?.y===.6)).toBe(true)
 expect(keepUpsInput([body],2,100).some(e=>e.y===.8)).toBe(false)
})
it('does not infer a body when a lane is empty or ambiguous',()=>{
 expect(keepUpsInput([],2,100,true)).toEqual([])
 expect(keepUpsInput([body,body],2,100,true)).toEqual([])
})
it('keeps a measured hand over a teammate’s area attributed to its original owner on the rally court',()=>{
 const teammate={...body,neck:{x:.62,y:.3},hands:[{x:.85,y:.45}]}
 const events=keepUpsInput([teammate],4,100,true,'court')
 expect(events.find(e=>e.pointerId==='hand-0')).toMatchObject({playerId:3,x:.85,coordinateSpace:'court'})
 expect(keepUpsInput([teammate,teammate],4,100,true,'court')).toEqual([])
})
