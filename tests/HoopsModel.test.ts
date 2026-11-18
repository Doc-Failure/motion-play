import {describe,expect,it} from 'vitest'
import {HoopsModel,hoops,type HoopBall} from '../src/minigames/six-hoops/HoopsModel'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
const event=(timestamp:number,x=.5,y=.5,extra:Partial<MotionInputEvent>={}):MotionInputEvent=>({playerId:1,kind:'BODY_MOVE',x,y,timestamp,confidence:1,pointerId:'head',...extra})
function setup(players:1|2|3|4=1){const m=new HoopsModel(players,1);m.start(0);m.update(3000);return m}
// Controlled physical initial conditions, independent of the serving schedule.
function ball(m:HoopsModel,extra:Partial<HoopBall>={}){(m as unknown as {balls:HoopBall[]}).balls=[{id:99,x:.5,y:.45,vx:0,vy:.2,spin:0,owner:null,touches:0,lastHit:-1000,state:'falling',ended:0,basket:-1,trail:[],...extra}]}
describe('Six Hoops shared court',()=>{
 it('has exactly three hoops per side and rewards the higher targets',()=>{expect(hoops).toHaveLength(6);expect(hoops.filter(h=>h.x<.5).map(h=>h.points)).toEqual([30,20,10]);expect(hoops.filter(h=>h.x>.5)).toHaveLength(3)})
 it.each([0,1,2,3,4,5])('scores a downward crossing of hoop %i once for its last toucher',i=>{const m=setup(4),h=hoops[i];ball(m,{x:h.x,y:h.y-.001,vy:.5,owner:3});const s=m.update(3020);expect(s.scores.map(p=>p.score)).toEqual([0,0,h.points,0]);expect(s.baskets).toEqual([0,0,1,0]);expect(m.update(3400).scores[2].score).toBe(h.points)})
 it('does not score untouched balls or upward crossings',()=>{for(const owner of [null,1] as const){const m=setup();ball(m,{x:.09,y:owner?.301:.299,vy:owner?-.4:.4,owner});expect(m.update(3020).scores[0].score).toBe(0)}})
 it.each([-1,1])('deflects toward the contacted side %i without teleporting to a hoop',side=>{const m=setup();ball(m);m.input([event(3000,.5-side*.035,.47)]);const s=m.update(3010),b=s.balls[0];expect(Math.sign(b.vx)).toBe(side);expect(b.vy).toBeLessThan(.2);expect(b.owner).toBe(1);expect(b.touches).toBe(1);expect(s.scores[0].score).toBe(0)})
 it('credits the latest player after a contested ball changes hands',()=>{const m=setup(4);ball(m,{x:.125,owner:3,touches:1});m.input([event(3000,.5,.47)]);const b=m.update(3010).balls[0];expect(b.owner).toBe(1);expect(b.touches).toBe(2)})
 it('uses measured horizontal movement to aim a centered contact',()=>{const m=setup();ball(m);m.input([event(3000,.42,.47)]);m.input([event(3040,.5,.47)]);expect(m.update(3050).balls[0].vx).toBeGreaterThan(0)})
 it('collides with an arm segment, with a cooldown against repeated overlapping frames',()=>{const m=setup();ball(m);m.input([event(3000,.65,.47,{pointerId:'arm',origin:{x:.35,y:.47}})]);expect(m.update(3010).balls[0].touches).toBe(1);for(let t=3020;t<3200;t+=20){m.input([event(t,.5,.47)]);m.update(t)}expect(m.update(3200).balls[0].touches).toBe(1)})
 it.each([1,2,3,4] as const)('converts %i lane-local body surfaces to the one camera court',players=>{const m=setup(players),x=(players-.5)/players;ball(m,{x});m.input([event(3000,.5,.47,{playerId:players})]);expect(m.update(3010).balls[0].owner).toBe(players)})
 it('rejects stale, malformed and low-confidence contacts',()=>{for(const e of [event(2700),event(3000,.5,.47,{confidence:.4}),event(3000,NaN),event(3000,.5,.47,{kind:'MOTION_HIT'})]){const m=setup();ball(m);m.input([e]);expect(m.update(3010).balls[0].owner).toBeNull()}})
 it('keeps old positions out of mixed-frame batches and does not collide with future observations',()=>{const m=setup();ball(m);m.input([event(3000,.5,.47),event(3040,.9,.9)]);expect(m.update(3010).balls[0].owner).toBeNull();expect(m.update(3050).balls[0].owner).toBeNull()})
 it('freezes on pause, clears old contacts on resume and resets replay',()=>{const m=setup();ball(m);m.input([event(3000,.5,.47)]);const s=m.pause(3000);expect(m.update(20000)).toEqual(s);m.resume(20000);expect(m.update(20010).balls[0].owner).toBeNull();expect(m.update(70000).phase).toBe('results');const fresh=m.start(80000);expect(fresh.balls).toEqual([]);expect(fresh.scores[0].score).toBe(0)})
 it('bounds round length and concurrent balls, and counts missed balls without awarding points',()=>{const m=setup();for(let t=3000;t<48000;t+=200){const s=m.update(t);expect(s.balls.filter(b=>b.state==='falling').length).toBeLessThanOrEqual(4)}const s=m.update(48000);expect(s.phase).toBe('results');expect(s.misses).toBeGreaterThan(0);expect(s.scores[0].score).toBe(0)})
 it('uses fixed physics steps across rendering rates',()=>{const a=setup(),b=setup();for(let t=3010;t<=9000;t+=10)a.update(t);expect(b.update(9000)).toEqual(a.update(9000))})
})

it('rebounds centrally with energy loss instead of a fixed launch speed',()=>{
 const speeds=[.25,.65].map(vy=>{const m=setup();ball(m,{vy});m.input([event(3000,.5,.49)]);return m.update(3010).balls[0].vy})
 expect(speeds[0]).toBeLessThan(0);expect(speeds[1]).toBeLessThan(speeds[0]);expect(Math.abs(speeds[1])).toBeLessThan(.65)
})
it('bounces off the rim edge without scoring and keeps constant gravity',()=>{
 const m=setup();ball(m,{x:.155,y:.275,vy:.4,owner:1});const s=m.update(3010);expect(s.scores[0].score).toBe(0);expect(s.balls[0].vy).toBeLessThan(0)
 const free=setup();ball(free,{x:.5,y:.4,vy:0});expect(free.update(3100).balls[0].vy).toBeCloseTo(.105,5)
})
