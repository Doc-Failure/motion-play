import {describe,it,expect} from 'vitest'
import {RocketModel} from '../src/minigames/rocket-rumble/RocketModel'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
const event=(x:number,y:number,timestamp:number,playerId:1|2|3|4=1):MotionInputEvent=>({kind:'MOTION_HIT',x,y,timestamp,playerId,confidence:1})
function model(players:1|2|3|4=1){const m=new RocketModel({playerCount:players,countdownMs:0});m.start(0);m.update(2500);return m}
function tag(m:RocketModel,id:number,time:number){const r=m.update(time).rockets.find(r=>r.id===id)!;return m.hit(event(r.x,r.y,time,r.playerId))}
describe('fireworks chain mechanics',()=>{
 it('launches nine rockets with three matching shape/color sets per player',()=>{
  for(const count of [1,2,3,4] as const){const m=model(count),s=m.snapshot();expect(s.rockets).toHaveLength(count*9);for(let p=1;p<=count;p++)for(let c=0;c<3;c++)expect(s.rockets.filter(r=>r.playerId===p&&r.color===c)).toHaveLength(3)}
 })
 it('requires matching pair and a separate trigger, then scores exactly once',()=>{
  const m=model();const ids=m.snapshot().rockets.filter(r=>r.color===0).map(r=>r.id)
  tag(m,ids[0],2500);m.hit(event(.5,.82,2700));expect(m.snapshot().scores[0].score).toBe(0)
  const other=m.snapshot().rockets.find(r=>r.color===1)!;tag(m,other.id,2900);expect(m.snapshot().rockets.filter(r=>r.selected)).toHaveLength(1)
  tag(m,ids[1],3100);tag(m,ids[2],3300)
  const s=m.hit(event(.5,.82,3500));expect(s.scores[0].score).toBe(90);expect(s.bursts).toHaveLength(3);expect(s.bursts.map(b=>b.at)).toEqual([3680,3820,3960]);expect(s.best[1]).toBe(3)
  m.hit(event(.5,.82,3500));m.hit(event(.5,.82,3800));expect(m.snapshot().scores[0].score).toBe(90)
 })
 it('rejects countdown, launching, low-confidence, malformed and stale captures',()=>{
  const m=new RocketModel({playerCount:1});m.start(0)
  m.hit(event(.2,.25,1000));expect(m.snapshot().rockets).toHaveLength(0)
  m.update(3100);m.hit(event(.2,.25,3100));expect(m.snapshot().rockets.some(r=>r.selected)).toBe(false)
  m.update(5500);const r=m.snapshot().rockets[0]
  for(const e of [{...event(r.x,r.y,5500),confidence:0},{...event(r.x,r.y,5500),kind:'BODY_MOVE'},{...event(r.x,r.y,5500),x:NaN},event(r.x,r.y,3000),event(r.x,r.y,5500,2)])m.hit(e as MotionInputEvent)
  expect(m.snapshot().rockets.some(r=>r.selected)).toBe(false)
 })
 it('debounces body sweeps and isolates player selections and points',()=>{
  const m=model(4),r=m.snapshot().rockets.filter(r=>r.playerId===3&&r.color===0)
  tag(m,r[0].id,2500);tag(m,r[1].id,2500);expect(m.snapshot().rockets.filter(r=>r.selected)).toHaveLength(1)
  tag(m,r[1].id,2700);m.hit(event(.5,.82,2900,1));expect(m.snapshot().scores.every(s=>s.score===0)).toBe(true)
  m.hit(event(.5,.82,3100,3));expect(m.snapshot().scores.map(s=>s.score)).toEqual([0,0,40,0])
 })
 it('freezes particles, fuse clocks and targets across pause and rejects paused input',()=>{
  const m=model();tag(m,1,2500);const before=m.pause(2600);m.update(20000);expect(m.snapshot().elapsed).toBe(before.elapsed);expect(m.snapshot().rockets).toEqual(before.rockets)
  m.resume(21000);m.hit(event(.5,.82,20000));expect(m.snapshot().rockets.filter(r=>r.selected)).toHaveLength(1)
  m.update(21200);expect(m.snapshot().elapsed).toBe(2800)
 })
 it('expires selections without ghost chains and preserves coarse/fine scheduling',()=>{
  const m=model();tag(m,1,2500);m.update(8500);expect(m.snapshot().rockets.some(r=>r.selected)).toBe(false)
  const coarse=model(),fine=model();for(let t=2600;t<=59000;t+=100)fine.update(t);coarse.update(59000)
  expect(coarse.snapshot()).toEqual(fine.snapshot());expect(coarse.snapshot().finale).toBe(true)
 })
 it('caps particles, completes the round and clears replay state',()=>{
  const m=model();tag(m,1,2500);tag(m,6,2700);m.hit(event(.5,.82,2900));m.update(60000);expect(m.snapshot().phase).toBe('results');expect(m.snapshot().rockets).toEqual([]);m.start(61000);expect(m.snapshot().scores[0].score).toBe(0);expect(m.snapshot().best[1]).toBe(0);expect(m.snapshot().bursts).toEqual([])
 })
 it('finishes safely when camera recovery arrives across the round boundary',()=>{const m=model();expect(m.pause(61000).phase).toBe('results')})
 it('uses aspect-correct hit areas in tall multiplayer lanes',()=>{
  const m=new RocketModel({playerCount:4,countdownMs:0,aspectRatio:.3});m.start(0);const r=m.update(2500).rockets[0]
  m.hit(event(r.x,r.y+.07,2500));expect(m.snapshot().rockets[0].selected).toBe(false)
  m.hit(event(r.x,r.y,2700));expect(m.snapshot().rockets[0].selected).toBe(true)
 })
})
