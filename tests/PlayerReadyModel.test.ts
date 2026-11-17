import {describe,it,expect} from 'vitest'
import {PlayerReadyModel} from '../src/camera/PlayerReadyModel'
import type {StickBody} from '../src/camera/poseTracking'
const bodies=(players:number)=>Array.from({length:players},(_,p)=>({neck:{x:(p+.5)/players,y:.3},hands:[{x:(p+.5)/players,y:.4}]} as StickBody))
describe('simultaneous hand-ready hold',()=>{
 it.each([1,2,3,4])('starts %s players only after three seconds of simultaneous stationary hands',players=>{
  const m=new PlayerReadyModel(players)
  for(let t=0;t<3000;t+=50){m.observe(bodies(players),t,1.5);expect(m.update(t,[]).complete).toBe(false)}
  m.observe(bodies(players),3000,1.5);expect(m.update(3000,[])).toMatchObject({complete:true,progress:1})
 })
 it('resets the whole hold if any person leaves their button',()=>{
  const m=new PlayerReadyModel(2)
  for(let t=0;t<=1800;t+=50){m.observe(bodies(2),t,1.5);m.update(t,[])}
  const missing=bodies(2);missing[1].hands=[];m.observe(missing,1850,1.5)
  expect(m.update(1850,[]).progress).toBe(0)
  m.observe(bodies(2),1900,1.5);expect(m.update(1900,[]).complete).toBe(false)
 })
 it('does not count cached detections or a large unobserved time jump',()=>{
  const m=new PlayerReadyModel(1);m.observe(bodies(1),0,1.5);m.update(0,[])
  expect(m.update(3000,[])).toMatchObject({complete:false,progress:0,contacts:[false]})
  m.observe(bodies(1),3100,1.5);expect(m.update(3100,[]).progress).toBe(0)
  const n=new PlayerReadyModel(1);n.update(0,[true]);expect(n.update(3000,[true]).complete).toBe(false)
 })
 it('requires each player in their own lane; one person cannot fill two buttons',()=>{
  const m=new PlayerReadyModel(2),one=bodies(2).slice(0,1);one[0].hands=[{x:.25,y:.4},{x:.75,y:.4}]
  m.observe(one,0,1.5);expect(m.update(0,[]).contacts).toEqual([true,false])
  m.observe([one[0],one[0]],50,1.5);expect(m.update(50,[]).contacts).toEqual([false,false])
 })
 it('uses the same physical circular hit area as tall player lanes',()=>{
  const m=new PlayerReadyModel(4),pose=bodies(4);pose[0].hands[0].y=.5;m.observe(pose,0,1.5)
  expect(m.update(0,[]).contacts).toEqual([false,true,true,true])
 })
 it('supports explicit keyboard/pointer contacts but resets on disable',()=>{
  const m=new PlayerReadyModel(2)
  for(let t=0;t<=3000;t+=50)m.update(t,[true,true])
  expect(m.update(3050,[true,true]).complete).toBe(true)
  expect(m.update(3100,[true,true],false)).toMatchObject({complete:false,progress:0})
  m.reset();expect(m.update(3150,[true,true]).progress).toBe(0)
 })
})


it('accepts measured holds with 450ms inference latency and 500ms observation cadence',()=>{
 const model=new PlayerReadyModel(1)
 for(let t=0;t<3000;t+=500){model.observe(bodies(1),t,1.5);expect(model.update(t+450,[]).complete).toBe(false)}
 model.observe(bodies(1),3000,1.5)
 expect(model.update(3450,[])).toMatchObject({progress:1,complete:true})
})
it('never completes from a cached near-finished camera sample and resets on a long observation gap',()=>{
 const model=new PlayerReadyModel(1)
 for(let t=0;t<=2800;t+=200){model.observe(bodies(1),t,1);model.update(t,[])}
 expect(model.update(3200,[])).toMatchObject({progress:2800/3000,complete:false})
 model.observe(bodies(1),6000,1)
 expect(model.update(6000,[])).toMatchObject({progress:0,complete:false})
})
it('tolerates small edge jitter only after a hand has entered its button',()=>{
 const model=new PlayerReadyModel(1),pose=bodies(1)
 pose[0].hands[0].x=.65;model.observe(pose,0,1);expect(model.update(0,[]).contacts).toEqual([true])
 pose[0].hands[0].x=.67;model.observe(pose,100,1);expect(model.update(100,[]).contacts).toEqual([true])
 pose[0].hands[0].x=.70;model.observe(pose,200,1);expect(model.update(200,[]).contacts).toEqual([false])
 pose[0].hands[0].x=.67;model.observe(pose,300,1);expect(model.update(300,[]).contacts).toEqual([false])
})

it('uses measured palms at the lower intro button and still requires three fresh seconds',()=>{
 const m=new PlayerReadyModel(2,.68),pose=bodies(2)
 pose.forEach(body=>body.palms=[{x:body.neck.x,y:.68}])
 for(let t=0;t<3000;t+=50){m.observe(pose,t,4/3);expect(m.update(t,[]).complete).toBe(false)}
 m.observe(pose,3000,4/3);expect(m.update(3000,[]).complete).toBe(true)
})
