import {expect,it} from 'vitest'
import {RaceModel} from '../src/minigames/kangaroo-race/RaceModel'
import {racePose} from '../src/minigames/kangaroo-race/racePose'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
it('selects jump, landing and stumble poses from the simulated race clock',()=>{
 const model=new RaceModel(1);const racer=model.start(0).racers[0]
 expect(racePose(racer,0)).toBe('run')
 const jumping={...racer,jumpAt:100}
 expect(racePose(jumping,200)).toBe('jump')
 expect(racePose(jumping,650)).toBe('land')
 expect(racePose({...jumping,stunUntil:900},650)).toBe('stumble')
 expect(racePose(jumping,800)).toBe('run')
})
const event=(t:number,y=.6,playerId:1|2|3|4=1):MotionInputEvent=>({playerId,kind:'BODY_MOVE',x:.5,y,confidence:1,timestamp:t,pointerId:'torso',activity:.04})
function run(players:1|2|3|4,jump=true){const m=new RaceModel(players);m.start(0);for(let t=3000;t<48000;t+=20){const s=m.update(t);for(const r of s.racers){const until=(r.next-r.distance)/(8+s.elapsed/45000*4);m.moveBody(event(t,jump&&r.playerId===1&&until<.35&&until>0?.52:.6,r.playerId))}}return m.update(48000)}
it.each([1,2,3,4] as const)('ranks %i runners by distance and isolates jumps and collisions',players=>{const s=run(players);expect(s.phase).toBe('results');expect(s.racers[0].cleared).toBeGreaterThan(3);if(players>1){expect(s.racers[1].hits).toBe(3);expect(s.scores[0].score).toBeGreaterThan(s.scores[1].score)}})
it('runs automatically without tracking but never invents a jump',()=>{const m=new RaceModel(1);m.start(0);const running=m.update(3800);expect(running.racers[0].distance).toBeGreaterThan(0);expect(running.racers[0].tracked).toBe(false);expect(running.racers[0].height).toBe(0);const later=m.update(12000);expect(later.racers[0].hits).toBeGreaterThan(0);expect(later.racers[0].cleared).toBe(0)})
it('stops each runner after three bumps and ends when everyone is out',()=>{const s=run(4,false);expect(s.racers.every(r=>r.hits===3)).toBe(true);expect(s.scores.every(p=>p.score>0)).toBe(true);expect(s.elapsed).toBeLessThan(45000)})
it('rejects waving, duplicates and bad observations',()=>{const m=new RaceModel(1);m.start(0);m.moveBody(event(3000));m.moveBody({...event(3000,.4),kind:'BODY_MOVE'});expect(m.update(3020).racers[0].height).toBe(0);m.moveBody({...event(3040,.4),kind:'MOTION_HIT'});expect(m.update(3060).racers[0].height).toBe(0);m.moveBody({...event(3080),confidence:.2});expect(m.update(3500).racers[0].tracked).toBe(false)})
it('requires returning down to rearm; holding high cannot auto-hop',()=>{const m=new RaceModel(1);m.start(0);m.moveBody(event(3000));m.moveBody(event(3100,.5));for(let t=3120;t<=4100;t+=20)m.moveBody(event(t,.5));expect(m.update(4100).racers[0].serial).toBe(1);expect(m.update(4100).racers[0].height).toBe(0)})
it('freezes recovery and resets distance, lives and tracking on replay',()=>{const m=new RaceModel(1);m.start(0);m.moveBody(event(3100));const paused=m.pause(3200);expect(m.update(10000)).toEqual(paused);m.resume(10000);m.moveBody(event(3300,.4));expect(m.update(10100).racers[0].tracked).toBe(false);m.update(60000);const s=m.start(61000);expect(s.scores[0].score).toBe(0);expect(s.racers[0].hits).toBe(0)})
it('matches fine and coarse rendering without counting expired tracking',()=>{const a=new RaceModel(1),b=new RaceModel(1);a.start(0);b.start(0);a.moveBody(event(3000));b.moveBody(event(3000));for(let t=3010;t<=6000;t+=10)a.update(t);expect(b.update(6000)).toEqual(a.update(6000))})
