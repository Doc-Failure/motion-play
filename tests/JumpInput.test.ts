import {expect,it} from 'vitest'
import {jumpInput} from '../src/input/JumpInput'
import type {StickBody} from '../src/camera/poseTracking'
import {JumpRushModel} from '../src/minigames/jump-rush/JumpRushModel'
const body=(x=.5,y=.4):StickBody=>({neck:{x,y},torso:[{x,y},{x,y:y+.2}],arms:[],legs:[],hands:[],headRadius:.02,x})
it.each([1,2,3,4] as const)('maps measured torso rise for %i players, ignoring arms',players=>{
 const bodies=Array.from({length:players},(_,p)=>body((p+.5)/players))
 const model=new JumpRushModel({playerCount:players,countdownMs:0});model.start(0)
 jumpInput(bodies,players,1500).forEach(e=>model.moveBody(e))
 bodies[0].hands=[{x:.1,y:.1}]
 expect(jumpInput(bodies,players,1500)).toEqual(jumpInput(bodies.map(b=>({...b,hands:[]})),players,1500))
 bodies[0]=body(.5/players,.34)
 model.update(1700) // camera observations arrive slightly behind rendering
 jumpInput(bodies,players,1680).forEach(e=>model.moveBody(e))
 expect(model.update(1800).scores.map(s=>s.score)).toEqual([10,...Array(players-1).fill(-5)])
})
it('does not invent torso input when hips are missing or two people share a lane',()=>{
 expect(jumpInput([{...body(),torso:[]}],1,10)).toEqual([])
 expect(jumpInput([body(),body()],1,10)).toEqual([])
})
it('small tracking jitter cannot trigger hops and held elevation cannot repeat',()=>{
 const model=new JumpRushModel({countdownMs:0});model.start(0)
 for(const [t,y] of [[1500,.4],[1600,.395],[1700,.402]])jumpInput([body(.5,y)],1,t).forEach(e=>model.moveBody(e))
 expect(model.update(1800).lanes[0].cleared).toBe(0)
 for(let t=3900;t<=6500;t+=100)jumpInput([body(.5,t===3900?.4:.34)],1,t).forEach(e=>model.moveBody(e))
 expect(model.update(6600).lanes[0].cleared).toBe(1)
})
