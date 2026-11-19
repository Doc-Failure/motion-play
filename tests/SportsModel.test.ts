import {expect,it} from 'vitest'
import {SportsModel} from '../src/minigames/camera-sports/SportsModel'
import {kickerPose} from '../src/minigames/camera-sports/kickerPose'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
const e=(timestamp:number,x=.25,y=.4,playerId:1|2|3|4=1):MotionInputEvent=>({playerId,kind:'BODY_MOVE',x,y,timestamp,confidence:1,pointerId:'head'})
it('shows ready, wind-up, kick and follow-through at the actual shot phases',()=>{
 const m=new SportsModel('keeper',1,4/3,42);m.start(0)
 for(const [time,pose] of [[3000,0],[3200,1],[3460,2],[3700,3],[4000,0]] as const){
  const state=m.update(time);expect(kickerPose(state.shots[0],state.elapsed)).toBe(pose)
 }
})
it('launches from the top with no destination disclosed before the kick',()=>{
 const endpoints:number[]=[]
 for(const seed of [1,42,9876]){
  const m=new SportsModel('keeper',4,4/3,seed);m.start(0)
  const waiting=m.update(3400)
  expect(waiting.shots.every(s=>s.x===.5&&s.y===.32&&s.progress===0)).toBe(true)
  expect(waiting.cue).toBeNull()
  const flying=m.update(3800)
  expect(flying.cue).toBe('kick')
  expect(flying.shots[0].y).toBeGreaterThan(.32)
  expect(flying.shots[1].progress).toBeLessThan(flying.shots[0].progress);expect(flying.shots[3].progress).toBe(0)
  const arrival=m.update(4850).shots[0]
  expect(arrival.y).toBeCloseTo(.9);expect(arrival.state).toBe('goal')
  endpoints.push(arrival.x)
 }
 expect(new Set(endpoints).size).toBe(3)
})
it('requires reaction in the lower goal, not contact with the kicker',()=>{
 const m=new SportsModel('keeper',1,4/3,42);m.start(0)
 for(let t=3000;t<=3950;t+=10){const shot=m.update(t).shots[0];m.input([e(t,shot.x,shot.y)])}
 expect(m.update(3950).shots[0].saves).toBe(0)
 m.input([])
 const shot=m.update(4300).shots[0]
 expect(shot.y).toBeGreaterThan(.5)
 m.input([e(4300,shot.x,shot.y)])
 expect(m.update(4310).shots[0].saves).toBe(1)
})
it.each([1,2,3,4] as const)('keeper requires fresh contact and isolates %i players',players=>{const m=new SportsModel('keeper',players);m.start(0);for(let t=3000;t<4800;t+=20){const shot=m.update(t).shots[0];m.input([e(t,shot.x,shot.y)])}const s=m.update(5800);expect(s.shots[0].saves).toBe(1);expect(s.scores[0].score).toBe(10);expect(s.shots.slice(1).every(v=>v.goals===1)).toBe(true)})
it('never saves with missing, stale or low-confidence input',()=>{for(const input of [[],[e(3100)],[{...e(4900),confidence:.2}]]){const m=new SportsModel('keeper',1);m.start(0);m.input(input);const s=m.update(5400);expect(s.shots[0].saves).toBe(0);expect(s.shots[0].goals).toBe(1)}})
it('keeper ends after eight goals and resets replay',()=>{const m=new SportsModel('keeper',1);m.start(0);const s=m.update(43000);expect(s.phase).toBe('results');expect(s.shots[0].goals).toBe(8);expect(m.start(50000).shots[0].goals).toBe(0)})
it('does not bridge pause with stale observations',()=>{const m=new SportsModel('keeper',1);m.start(0);const s=m.pause(4500);expect(m.update(12000)).toEqual(s);m.resume(12000);m.input([e(4600)]);expect(m.update(14000).shots[0].saves).toBe(0)})
it('net floor awards the opposite team and finishes at five points',()=>{const m=new SportsModel('net',2);m.start(0);const s=m.update(63000);expect(s.phase).toBe('results');expect(Math.max(...s.teams)).toBe(5);expect(s.scores.some(p=>p.score===50)).toBe(true)})
it('measured body contact returns the ball towards the opposing court',()=>{const m=new SportsModel('net',2);m.start(0);for(let t=3000;t<5000;t+=20){const s=m.update(t),b=s.ball;m.input([e(t,b.x*2,Math.min(.99,b.y+.03))]);if(b.touches){expect(b.vy).toBeLessThan(0);expect(b.vx).toBeGreaterThan(0);return}}throw Error('No contact')})
it('net blocks low crossings and solo robot has bounded reach',()=>{const m=new SportsModel('net',1);m.start(0);for(let t=3000;t<10000;t+=10){const s=m.update(t);expect(s.aiX).toBeGreaterThanOrEqual(.58);expect(s.aiX).toBeLessThanOrEqual(.92);expect(s.ball.x).toBeLessThan(.5)} })
it.each(['keeper','net'] as const)('%s physics is independent of render cadence',mode=>{const a=new SportsModel(mode,2,4/3,123),b=new SportsModel(mode,2,4/3,123);a.start(0);b.start(0);for(let t=0;t<=9000;t+=10)a.update(t);expect(b.update(9000)).toEqual(a.update(9000))})
it('a controlled solo rally can beat the robot within the time limit',()=>{const m=new SportsModel('net',1);m.start(0);for(let t=3000;t<63000;t+=20){const s=m.update(t),b=s.ball;if(b.x<.46)m.input([e(t,Math.max(.04,b.x-.02),.48)]);else m.input([])}const s=m.update(63000);expect(s.phase).toBe('results');expect(s.teams[0]).toBeGreaterThan(s.teams[1])})
it.each([3,4] as const)('awards team points consistently to %i participants',players=>{const m=new SportsModel('net',players);m.start(0);const s=m.update(63000);for(const p of s.scores){const side=(p.playerId-.5)/players<.5?0:1;expect(p.score).toBe(s.teams[side]*10)}})

// Explicit initial conditions exercise real shared-court collisions, not auto-aim.
function rally(extra:Partial<import('../src/minigames/camera-sports/SportsModel').RallyBall>={},players:1|2|3|4=2){
 const m=new SportsModel('net',players,1);m.start(0);m.update(3000)
 Object.assign((m as unknown as {ball:object}).ball,{x:.25,y:.5,vx:0,vy:.5,serveAt:0,...extra})
 return m
}
it.each([1,2] as const)('1 vs 1: P%i returns from their own side with independent touch ownership',player=>{
 const x=player===1?.25:.75,m=rally({x})
 m.input([e(3000,.5,.55,player)])
 const s=m.update(3010)
 expect(s.lastTouch).toBe(player);expect(s.ball.vy).toBeLessThan(0)
 expect(s.ball.vx).toBe(0) // A centered hit does not magically aim at the other court.
 expect(s.teams).toEqual([0,0])
})
it.each([1,2] as const)('1 vs 1: a miss on P%i side awards only the opponent',player=>{
 const m=rally({x:player===1?.25:.75,y:.93,vy:.5})
 const s=m.update(3010)
 expect(s.teams).toEqual(player===1?[0,1]:[1,0])
 expect(s.scores.map(p=>p.score)).toEqual(player===1?[0,10]:[10,0])
})
it('does not let the solo player play on the robot side',()=>{
 const m=rally({x:.75},1);m.input([e(3000,.75,.55)])
 expect(m.update(3010).ball.touches).toBe(0)
})
it('blocks low net crossings, bounces off its tape, and allows a clean arc above',()=>{
 const low=rally({x:.44,y:.7,vx:1.6,vy:0}).update(3030)
 expect(low.ball.x).toBeLessThan(.5);expect(low.ball.vx).toBeLessThan(0)
 const top=rally({x:.5,y:.52,vx:0,vy:.6}).update(3010)
 expect(top.ball.vy).toBeLessThan(0);expect(top.ball.y).toBeLessThan(.56-.035+.001)
 const high=rally({x:.49,y:.3,vx:.8,vy:0}).update(3030)
 expect(high.ball.x).toBeGreaterThan(.5);expect(high.ball.vx).toBeGreaterThan(0)
})
it('has no robot paddle movement or automatic returns in two-player mode',()=>{
 const m=rally({x:.75,y:.62,vy:.4});const s=m.update(3200)
 expect(s.ball.touches).toBe(0);expect(s.aiX).toBe(.75)
})
it('rejects future and pre-resume contacts in Net Rally',()=>{
 const m=rally();m.input([e(3100,.5,.55)]);expect(m.update(3010).ball.touches).toBe(0)
 m.pause(3010);m.resume(9000);m.input([e(3010,.5,.55)]);expect(m.update(9010).ball.touches).toBe(0)
})

it('supports a measured back-and-forth 1 vs 1 rally over the shared net',()=>{
 const m=new SportsModel('net',2);m.start(0);const touched=new Set<number>()
 for(let t=3000;t<18000;t+=20){
  const s=m.update(t),b=s.ball,player=b.x<.5?1:2
  if(s.lastTouch)touched.add(s.lastTouch)
  const x=b.x+(player===1?-.025:.025)
  if(b.x<.44||b.x>.56)m.input([e(t,x*2-(player-1),.58,player)])
  else m.input([])
 }
 expect([...touched].sort()).toEqual([1,2])
})
it.each([.75,4/3,16/9])('keeps fast and glancing net impacts finite at aspect %s',aspect=>{
 const m=rally({x:.46,y:.55,vx:1.6,vy:.4});m.setAspectRatio(aspect)
 for(let t=3010;t<8000;t+=10){const b=m.update(t).ball;expect([b.x,b.y,b.vx,b.vy].every(Number.isFinite)).toBe(true);expect(b.x).toBeGreaterThanOrEqual(0);expect(b.x).toBeLessThanOrEqual(1);if(b.y>.6)expect(Math.abs(b.x-.5)).toBeGreaterThanOrEqual(.012+.035/aspect-.002)}
})
it('lets a doubles partner reach across their teammate but rejects a return from the opposing team',()=>{
 for(const player of [1,3] as const){
  const m=rally({x:.35,y:.5},4)
  m.input([{...e(3000,.35,.55,player),coordinateSpace:'court'}])
  expect(m.update(3010).lastTouch).toBe(player===1?1:null)
 }
})
it('gives all three positions serves after drops and idle players no cooperative return points',()=>{
 const m=new SportsModel('net',3);m.start(0);const receivers=new Set()
 for(let t=3000;t<=63000;t+=50){
  const s=m.update(t)
  if(s.elapsed<s.ball.serveAt)receivers.add(Math.floor(s.ball.x*3)+1)
 }
 const s=m.update(63000)
 expect([...receivers].sort()).toEqual([1,2,3]);expect(s.returns).toBe(0)
 expect(s.scores.map(p=>p.score)).toEqual([0,0,0]);expect(s.phase).toBe('results')
})
it('counts five distinct touched crossings at the three-player net and credits each sender',()=>{
 const m=rally({},3)
 // Place the same live ball just before a short toss. The collision, upward
 // arc, crossing detection and match ending all run on the regular clock.
 let t=3000
 for(let i=0;i<5;i++){
  const player=i%2===0?1:2,x=1/3+(player===1?-.07:.07),dir=player===1?1:-1
  Object.assign((m as unknown as {ball:object}).ball,{x,y:.34,vx:dir*.55,vy:.45,serveAt:0,lastHit:-1000})
  m.input([{...e(t,x,.39,player),coordinateSpace:'court'}])
  expect(m.update(t+=10).lastTouch).toBe(player)
  m.input([])
  expect(m.update(t+=300).returns).toBe(i+1)
 }
 const s=m.update(t)
 expect(s.phase).toBe('results');expect(s.scores.map(p=>p.score)).toEqual([30,20,0])
 expect(m.start(t+1).returns).toBe(0)
})
it('credits the defender who covers another post and consumes that shot exactly once',()=>{
 const m=new SportsModel('keeper',4,4/3,42)
 m.start(0)
 const shot=m.update(4150).shots[0]
 const hand={...e(4150,shot.x/4,shot.y,2),coordinateSpace:'court' as const}
 m.input([hand,hand])
 const saved=m.update(4170)
 expect(saved.shots[0].state).toBe('save')
 expect(saved.shots[1].saves).toBe(1)
 expect(saved.scores.map(p=>p.score)).toEqual([0,10,0,0])
})
it('ends shared defence at the group concession limit and clears all contributions on replay',()=>{
 const m=new SportsModel('keeper',3)
 m.start(0)
 const s=m.update(43000)
 expect(s.shots.reduce((n,shot)=>n+shot.goals,0)).toBe(24)
 expect(s.phase).toBe('results')
 expect(m.start(43001).shots.every(shot=>shot.goals===0&&shot.saves===0)).toBe(true)
})

it.each([1, 4/3, 16/9])('allows a low ball beside the solo robot to drop at aspect %s', aspect => {
 const netEdge = .5 + .012 + .035 / aspect
 const m = rally({x: netEdge + .001, y: .66, vx: 0, vy: 0}, 1)
 m.setAspectRatio(aspect)
 // Replay the trapped position with the robot having already approached the net.
 Object.assign(m, {aiX: .59})
 const point = m.update(4250)
 expect(point.teams).toEqual([1, 0])
 expect(point.ball.x).toBeLessThan(.5)
 // Every fresh solo serve gives the human the next interaction.
 const idle = m.update(63000)
 expect(idle.teams).toEqual([1, 5])
})
