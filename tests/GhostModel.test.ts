import {describe,it,expect} from 'vitest'
import {GhostModel} from '../src/minigames/ghost-catcher/GhostModel'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
function event(t:number,x=.5,y=.86,playerId:1|2=1):MotionInputEvent{return {kind:'MOTION_BRUSH',playerId,x,y,confidence:.53,timestamp:t}}
function rub(m:GhostModel,from:number,to:number,playerId:1|2=1){for(let t=from;t<=to;t+=40){const s=m.update(t),g=s.ghosts.find(g=>g.playerId===playerId&&g.state==='rising');if(g)m.input([event(t,g.x,g.y,playerId)])}return m.update(to)}
describe('Ghost Catcher',()=>{
 it('requires repeated rubbing, counts a capture once and isolates player scores',()=>{const m=new GhostModel(2);m.start(0);m.update(3000);expect(m.input([event(3000)]).scores[0].score).toBe(0);const s=rub(m,3040,3840);expect(s.scores.map(s=>s.score)).toEqual([25,0]);expect(s.ghosts.find(g=>g.playerId===1)?.state).toBe('caught');expect(m.input([event(3840)]).scores[0].score).toBe(25)})
 it('duplicate samples and dense masks cannot instantly pop a ghost',()=>{const m=new GhostModel(1);m.start(0);m.update(3000);for(let i=0;i<30;i++)m.input(Array(100).fill(event(3000)));expect(m.update(3000).ghosts[0].charge).toBeLessThan(.1)})
 it('rejects stale, future, invalid, wrong-kind and off-target motion',()=>{const m=new GhostModel(1);m.start(0);m.update(3000);m.input([event(2000),event(4000),event(3000,NaN),event(3000,0,0),{...event(3000),confidence:0},{...event(3000),kind:'BODY_MOVE'}]);expect(m.update(3000).ghosts[0].charge).toBe(0)})
 it('pauses motion and rejects pre-resume samples',()=>{const m=new GhostModel(1);m.start(0);const a=m.update(3200);m.pause(3200);expect(m.update(9000).ghosts).toEqual(a.ghosts);m.resume(9000);m.input([event(3200)]);expect(m.update(9000).ghosts[0].charge).toBe(0);expect(m.update(9100).roundRemainingMs).toBe(44700)})
 it('five escapes end the round early and replay resets lives and scores',()=>{const m=new GhostModel(1);m.start(0);let s=m.update(3000);for(let t=3040;t<48000&&s.phase!=='results';t+=40)s=m.update(t);expect(s.phase).toBe('results');expect(s.lives).toEqual([0]);expect(s.elapsed).toBeLessThan(45000);const replay=m.start(50000);expect(replay.lives).toEqual([5]);expect(replay.ghosts).toEqual([]);expect(replay.scores[0].score).toBe(0)})
 it('ends at 45 seconds and freezes results',()=>{const m=new GhostModel(1);m.start(0);expect(m.update(48000).phase).toBe('results');expect(m.update(50000)).toEqual(m.update(48000))})
 it('introduces bats and escalates waves',()=>{const m=new GhostModel(1);m.start(0);let bats=false;for(let t=3000;t<16000;t+=40){const s=rub(m,t,t);bats ||= s.ghosts.some(g=>g.bat)}expect(bats).toBe(true);expect(m.update(16000).wave).toBe(2)})
})

it('keeps positions, waves and escapes identical across fast, slow and stalled rendering',()=>{
 const run=(cadence:number)=>{const m=new GhostModel(2);m.start(0);for(let t=0;t<18000;t+=cadence)m.update(t);return m.update(18000)}
 expect(run(16)).toEqual(run(250));expect(run(16)).toEqual(run(3000))
})
it('does not reuse a previous hit location with a newer off-target sample',()=>{
 const m=new GhostModel(1);m.start(0);m.update(3000);m.input([event(3000)])
 m.update(3080);const charge=m.update(3080).ghosts[0].charge
 m.input([event(3000),event(3080,0,0)])
 expect(m.update(3080).ghosts[0].charge).toBe(charge)
})
it('records the actual capture points including the streak bonus',()=>{
 const m=new GhostModel(1);m.start(0);const first=rub(m,3000,3800)
 expect(first.ghosts.find(g=>g.state==='caught')?.points).toBe(25)
 const next=rub(m,4680,5520)
 expect(next.ghosts.find(g=>g.state==='caught')?.points).toBe(30)
 expect(next.scores[0].score).toBe(55)
})
it('eliminated players cannot receive more points while another player continues',()=>{
 const m=new GhostModel(2);m.start(0);let s=m.update(3000)
 for(let t=3040;t<=24000;t+=40)s=rub(m,t,t,2)
 expect(s.lives[0]).toBe(0);expect(s.lives[1]).toBeGreaterThan(0);expect(s.phase).toBe('playing')
 const score=s.scores[0].score;m.input([event(24000)]);expect(m.update(24000).scores[0].score).toBe(score)
})
