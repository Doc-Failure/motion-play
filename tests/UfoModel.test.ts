import {describe,it,expect} from 'vitest'
import {UfoModel,type UfoSnapshot} from '../src/minigames/ufo-juggler/UfoModel'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
const motion=(t:number,x=.5,y=.62,playerId:1|2=1):MotionInputEvent=>({kind:'MOTION_HIT',playerId,x,y,confidence:.53,timestamp:t})
function pilot(m:UfoModel,from:number,to:number,player:1|2=1){let s!:UfoSnapshot;for(let t=from;t<=to;t+=40){s=m.update(t);m.input(s.ships.filter(v=>v.playerId===player&&v.state==='flying'&&v.spin<.85).map(v=>motion(t,v.x,v.y,player)))}return m.update(to)}
describe('UFO Juggler',()=>{
 it('launches through sustained spin management, scores once, and isolates lanes',()=>{const m=new UfoModel(2);m.start(0);const s=pilot(m,3000,7000);expect(s.rescues).toEqual([1,0]);expect(s.scores[0].score).toBe(50);expect(s.scores[1].score).toBe(0);expect(m.input([motion(7000)]).scores[0].score).toBe(50)})
 it('constant waving overheats an engine and interrupts its climb',()=>{const m=new UfoModel(1);m.start(0);let hot=false;for(let t=3000;t<=5600;t+=40){const s=m.update(t),ship=s.ships.find(v=>v.state==='flying');if(ship){m.input([motion(t,ship.x,ship.y)]);hot ||= ship.coolUntil>s.elapsed}}expect(hot).toBe(true)})
 it('neglected ships crash, three losses end early, and replay resets state',()=>{const m=new UfoModel(1);m.start(0);const s=m.update(30000);expect(s.phase).toBe('results');expect(s.lives).toEqual([0]);expect(s.elapsed).toBeLessThan(40000);const r=m.start(40000);expect(r.lives).toEqual([3]);expect(r.rescues).toEqual([0]);expect(r.ships).toEqual([])})
 it('caps a successful round at forty seconds',()=>{const m=new UfoModel(1);m.start(0);const s=pilot(m,3000,43000);expect(s.phase).toBe('results');expect(s.rescues[0]).toBeGreaterThan(4);expect(s.roundRemainingMs).toBe(0);expect(s.lives[0]).toBeGreaterThan(0)})
 it('duplicates and dense masks cannot instantly charge ships',()=>{const m=new UfoModel(1);m.start(0);m.update(3000);for(let i=0;i<20;i++)m.input(Array(100).fill(motion(3000)));expect(m.update(3000).ships[0].spin).toBeLessThan(.3)})
 it('rejects stale, future, weak, malformed and wrong-kind inputs',()=>{const m=new UfoModel(1);m.start(0);m.update(3000);m.input([motion(2000),motion(4000),motion(3000,NaN),{...motion(3000),confidence:0},{...motion(3000),kind:'BODY_MOVE'}]);expect(m.update(3000).ships[0].spin).toBe(.22)})
 it('cannot reuse old contact locations with a newer off-target sample',()=>{const m=new UfoModel(1);m.start(0);m.update(3000);m.input([motion(3000)]);const before=m.update(3080).ships[0].spin;m.input([motion(3000),motion(3080,0,0)]);expect(m.update(3080).ships[0].spin).toBe(before)})
 it('pauses engines and rejects input from before resume',()=>{const m=new UfoModel(1);m.start(0);const s=m.update(3200);m.pause(3200);expect(m.update(9000).ships).toEqual(s.ships);m.resume(9000);const before=m.update(9000);m.input([motion(3200)]);expect(m.update(9000)).toEqual(before);expect(m.update(9100).roundRemainingMs).toBe(39700)})
 it('matches simulation at fast, slow and stalled rendering rates',()=>{const run=(step:number)=>{const m=new UfoModel(1);m.start(0);for(let t=0;t<14000;t+=step)m.update(t);return m.update(14000)};expect(run(16)).toEqual(run(250));expect(run(16)).toEqual(run(3000))})
 it('awards a close save only once per ship',()=>{const m=new UfoModel(1);m.start(0);m.update(5400);const s=pilot(m,5440,5920);expect(s.scores[0].score).toBe(10);expect(s.ships[0].rescued).toBe(true);expect(pilot(m,5960,6240).scores[0].score).toBe(10)})
 it('keeps surviving players active after another loses all ships',()=>{const m=new UfoModel(2);m.start(0);const s=pilot(m,3000,24000,2);expect(s.lives[0]).toBe(0);expect(s.lives[1]).toBeGreaterThan(0);expect(s.phase).toBe('playing');expect(s.scores[0].score).toBe(0)})
 it('supports narrow four-player lanes and bounded active ships',()=>{const m=new UfoModel(4,1/3);m.start(0);const s=pilot(m,3000,20000);expect(s.rescues[0]).toBeGreaterThan(0);expect(s.ships.filter(v=>v.playerId===1&&v.state==='flying').length).toBeLessThanOrEqual(3);expect(s.scores.slice(1).every(v=>v.score===0)).toBe(true)})
})

it('introduces simultaneous saucers after the opening wave, in distinct slots',()=>{
 const m=new UfoModel(1);m.start(0);let simultaneous=false
 for(let t=3000;t<=33000;t+=40){
  const active=pilot(m,t,t).ships.filter(v=>v.state==='flying')
  expect(new Set(active.map(v=>v.x)).size).toBe(active.length)
  expect(new Set(active.map(v=>v.born)).size).toBe(active.length)
  simultaneous ||= active.length>=2
 }
 expect(simultaneous).toBe(true)
})
