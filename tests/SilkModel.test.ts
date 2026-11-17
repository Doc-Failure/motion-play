import {describe,it,expect} from 'vitest'
import {SilkModel} from '../src/minigames/silk-squad/SilkModel'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
const input=(x:number,y:number,timestamp:number,playerId:1|2|3|4=1,kind:MotionInputEvent['kind']='ARM_MOVE'):MotionInputEvent=>({playerId,kind,x,y,timestamp,confidence:1})
function model(players:1|2|3|4=1){const m=new SilkModel({playerCount:players,countdownMs:0});m.start(0);return m}
describe('Silk Squad capture simulation',()=>{
 it('animates original bots and only arm movement events capture them',()=>{const m=model(),b=m.update(300).bugs[0];expect(b.x).not.toBe(m.update(500).bugs[0].x);const target=m.snapshot().bugs[0];m.input(input(target.x,target.y,500,1,'MOTION_HIT'));m.input(input(target.x,target.y,500,1,'HAND_PINCH'));expect(m.snapshot().scores[0].score).toBe(0);m.input(input(target.x,target.y,500));expect(m.snapshot().catches[1]).toBe(1);expect(m.snapshot().webs[0].kind).toBe('catch')})
 it('updates aim without awarding points and debounces duplicate shots',()=>{const m=model(),b=m.update(500).bugs[0];m.input(input(b.x,b.y,500,1,'ARM_POSITION'));expect(m.snapshot().aim[1]?.x).toBe(b.x);expect(m.snapshot().catches[1]).toBe(0);m.input(input(b.x,b.y,500));m.input(input(b.x,b.y,500));expect(m.snapshot().webs).toHaveLength(1)})
 it('requires two separated casts on gold armor and isolates player scores',()=>{const m=model(4),s=m.update(2000),b=s.bugs.find(b=>b.playerId===4&&b.kind==='armored')!;expect(b.kind).toBe('armored');m.input(input(b.x,b.y,2000,4));expect(m.snapshot().scores[3].score).toBe(0);const target=m.update(2400).bugs.find(x=>x.id===b.id)!;m.input(input(target.x,target.y,2400,4));expect(m.snapshot().scores.map(s=>s.score)).toEqual([0,0,0,30]);expect(m.snapshot().catches[4]).toBe(1)})
 it('does not score low-confidence, stale, malformed, paused or wrong-player input',()=>{const m=model();const b=m.update(500).bugs[0];for(const e of [{...input(b.x,b.y,500),confidence:.1},{...input(b.x,b.y,500),x:NaN},input(b.x,b.y,0),input(b.x,b.y,500,2)])m.input(e);expect(m.snapshot().catches[1]).toBe(0);m.pause(600);m.input(input(b.x,b.y,700));expect(m.snapshot().catches[1]).toBe(0);m.resume(1000);m.input(input(b.x,b.y,900));expect(m.snapshot().catches[1]).toBe(0)})
 it('accepts a bounded inference delay at captured target coordinates and rejects replayed edges',()=>{
  const m=model(),b=m.update(1000).bugs[0];m.update(1300)
  m.input(input(b.x,b.y,1000));expect(m.snapshot().catches[1]).toBe(1)
  const replay=model(),target=replay.update(1000).bugs[0];replay.input(input(target.x,target.y,1000));replay.update(1350);replay.input(input(.5,.5,1000));expect(replay.snapshot().webs).toHaveLength(1)
  m.input(input(.3,.4,1660,1,'ARM_POSITION'));m.input(input(.8,.8,1650,1,'ARM_POSITION'))
  expect(m.snapshot().aim[1]?.x).toBe(.3)
 })
 it('preserves waves and expirations across sparse updates and pause',()=>{const a=model(),b=model();for(let t=100;t<=30000;t+=100)a.update(t);b.update(30000);expect(a.snapshot()).toEqual(b.snapshot());const before=a.pause(30100);expect(a.update(50000).bugs).toEqual(before.bugs);a.resume(51000);expect(a.update(51100).elapsed).toBe(30200)})
 it('expires effects, caps bot count, ends safely and resets replay',()=>{const m=model(4);for(let t=0;t<60000;t+=1000)expect(m.update(t).bugs.length).toBeLessThanOrEqual(20);expect(m.pause(60000).phase).toBe('results');expect(m.start(61000).catches[1]).toBe(0);expect(m.snapshot().webs).toEqual([])})
})
