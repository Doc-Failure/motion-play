import {describe,it,expect} from 'vitest'
import {KeepUpsModel,surfaceDistance,footballWind,KEEP_UPS_DURATION} from '../src/minigames/keep-ups/KeepUpsModel'
import {keepUpsInput} from '../src/input/KeepUpsInput'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
import type {StickBody} from '../src/camera/poseTracking'
const head=(timestamp:number,x=.5,y=.4,extra:Partial<MotionInputEvent>={}):MotionInputEvent=>({playerId:1,kind:'BODY_MOVE',x,y,timestamp,confidence:1,pointerId:'head',...extra})
function run(m:KeepUpsModel,from:number,to:number,track=true){let s=m.update(from);for(let t=from+20;t<=to;t+=20){if(track)m.input([head(t,s.balls[0].x)]);s=m.update(t)}return s}
const game=(players:1|2|3|4=1,aspect=4/3)=>{const m=new KeepUpsModel(players,aspect);m.start(0);m.update(3000);return m}
describe('Keep Ups physics',()=>{
 it('rebounds from a fresh measured head and awards header points to only its player',()=>{const m=game(2);const s=run(m,3000,4100);expect(s.scores[0].score).toBe(15);expect(s.scores[1].score).toBe(0);expect(s.balls[0].vy).toBeLessThan(0);expect(s.balls[0].cue).toBe('header')})
 it('rebounds from an arm segment between its endpoints',()=>{const m=game();let s=m.update(3000);for(let t=3020;t<=4100;t+=20){m.input([head(t,.8,.4,{pointerId:'arm',origin:{x:.2,y:.4}})]);s=m.update(t)}expect(s.scores[0].score).toBe(10);expect(s.balls[0].cue).toBe('bounce')})
 it('does not turn a missed, stale or low-confidence body into an invisible save',()=>{for(const e of [head(3000),head(3500,.5,.4,{confidence:.2}),head(3500,.9),head(3500,.5,.4,{x:NaN})]){const m=game();m.input([e]);expect(m.update(4400).scores[0].score).toBe(0)}})
 it('only contacts a surface once during a rebound and can build a measured streak',()=>{const m=game();const s=run(m,3000,11000);expect(s.balls[0].touches).toBeGreaterThan(2);expect(s.balls[0].touches).toBeLessThan(10);expect(s.balls[0].best).toBe(s.balls[0].touches);expect(s.scores[0].score).toBeGreaterThan(45)})
 it('clears missing input immediately and automatically serves after a drop',()=>{const m=game();m.input([head(3600)]);m.input([]);const dropped=m.update(4700);expect(dropped.balls[0].drops).toBe(1);expect(dropped.balls[0].streak).toBe(0);expect(dropped.scores[0].score).toBe(0);expect(m.update(5800).balls[0].y).toBeLessThan(.5)})
 it('preserves a streak record after a non-final drop',()=>{const m=game();const good=run(m,3000,6500);m.input([]);const lost=m.update(10000);expect(lost.balls[0].best).toBe(good.balls[0].best);expect(lost.balls[0].streak).toBe(0);expect(lost.phase).toBe('playing')})
 it('freezes physics on pause and rejects old surfaces after resume',()=>{const m=game();run(m,3000,3900);const paused=m.pause(3900);m.input([head(9000)]);expect(m.update(9000).balls).toEqual(paused.balls);m.resume(10000);m.input([head(3800)]);const s=m.update(11000);expect(s.scores).toEqual(paused.scores)})
 it('ends at 30 active seconds even with perfect tracking, and replays with clean stats',()=>{const m=game();expect(run(m,3000,32980).phase).toBe('playing');expect(run(m,32980,33000).phase).toBe('results');const s=m.start(35000);expect(s.scores[0].score).toBe(0);expect(s.balls[0]).toMatchObject({streak:0,touches:0,drops:0});expect(s.phase).toBe('countdown')})
 it('uses fixed physics substeps consistently across different render cadences',()=>{const a=game(),b=game();for(let t=3017;t<4500;t+=17)a.update(t);expect(a.update(4500).balls).toEqual(b.update(4500).balls)})
 it.each([1,2,3,4] as const)('keeps circular ball collision in the camera plane for %i players',players=>{const m=game(players,4/3/players),s=run(m,3000,4100);expect(s.balls).toHaveLength(players);expect(s.scores[0].score).toBe(15);expect(s.balls.every(b=>b.x>=0&&b.x<=1)).toBe(true)})
})
it('measures aspect-correct distance to a body segment',()=>{expect(surfaceDistance(.5,.3,head(0,.8,.4,{origin:{x:.2,y:.4}}),2).distance).toBeCloseTo(.1);expect(surfaceDistance(.6,.4,head(0,.5,.4),2).distance).toBeCloseTo(.2)})
it('maps mirrored head and arm surfaces without moving them between player lanes',()=>{
 const b:StickBody={neck:{x:.7,y:.3},head:{x:.7,y:.2},hands:[],arms:[[{x:.6,y:.3},{x:.8,y:.4}]],torso:[],legs:[],x:.7,headRadius:.03}
 expect(keepUpsInput([b],2,100)).toEqual([expect.objectContaining({playerId:2,x:.4-Number.EPSILON/2,y:.2,pointerId:'head'}),expect.objectContaining({playerId:2,x:.6000000000000001,y:.4,origin:{x:.19999999999999996,y:.3}})])
 expect(keepUpsInput([b,b],2,100)).toEqual([])
})

it('rewards each reached hoop once and alternates the next target',()=>{
 const m=game()
 const b=(m as unknown as {balls:import('../src/minigames/keep-ups/KeepUpsModel').Football[]}).balls[0]
 b.streak=3;b.x=.25;b.y=.2;b.vx=0;b.vy=0;m.input([head(3000,.9,.8)])
 expect(m.update(3020).scores[0].score).toBe(30)
 expect(m.update(3040).scores[0].score).toBe(30)
 expect(m.update(3040).balls[0].hoop).toBe(1)
 b.y=.5;m.update(3060)
 b.x=.75;b.y=.2;b.vy=0
 expect(m.update(3080).scores[0].score).toBe(60)
 expect(m.update(3080).balls[0].hoop).toBe(2)
})
it('does not keep colliding with an older head after a new pose moves out of the way',()=>{
 const m=game();m.input([head(3500)]);m.update(3500)
 m.input([head(3520,.95)]);m.update(3520)
 expect(m.update(3800).scores[0].score).toBe(0)
})

it('keeps normal header arcs clear of the top score bar',()=>{
 const m=game();let s=m.update(3000),highest=1
 for(let t=3020;t<=9000;t+=20){m.input([head(t,s.balls[0].x)]);s=m.update(t);highest=Math.min(highest,s.balls[0].y)}
 expect(s.balls[0].touches).toBeGreaterThan(2);expect(highest).toBeGreaterThanOrEqual(.13)
})


it('loses a life on each miss and ends early after the third, without another serve',()=>{
 const m=game(),end=m.update(15000)
 expect(end.phase).toBe('results');expect(end.balls[0].drops).toBe(3)
 expect(end.elapsed).toBeLessThan(KEEP_UPS_DURATION)
 m.input([head(16000)]);expect(m.update(20000).balls).toEqual(end.balls)
 const replay=m.start(21000);expect(replay.balls[0].drops).toBe(0)
})
it('keeps surviving players in the match while eliminated players stop scoring',()=>{
 const m=game(2),s=run(m,3000,15000)
 expect(s.phase).toBe('playing');expect(s.balls[1].drops).toBe(3)
 expect(s.balls[0].drops).toBe(0);expect(s.scores[0].score).toBeGreaterThan(0)
 m.input([]);expect(m.update(28000).phase).toBe('results')
})
it('warns before each short gust and reverses the next gust direction',()=>{
 expect(footballWind(7999)).toMatchObject({warning:false,active:false})
 expect(footballWind(8000)).toMatchObject({warning:true,active:false,direction:1})
 expect(footballWind(8899).warning).toBe(true)
 expect(footballWind(8900)).toMatchObject({warning:false,active:true})
 expect(footballWind(9900).active).toBe(false)
 expect(footballWind(14000)).toMatchObject({warning:true,direction:-1})
})
it('requires repositioning rather than sustaining an endlessly repeating stationary header',()=>{
 const idle=game(),moving=game();let s=idle.update(3000)
 for(let t=3020;t<=33000;t+=20){idle.input([head(t)]);s=idle.update(t)}
 const active=run(moving,3000,33000)
 expect(s.balls[0].drops).toBe(3);expect(s.phase).toBe('results')
 expect(active.scores[0].score).toBeGreaterThan(s.scores[0].score)
})

it('does not farm overlapping hoops in a four-player lane or score a bonus without tracking',()=>{
 const m=game(4,1/3),b=(m as unknown as {balls:import('../src/minigames/keep-ups/KeepUpsModel').Football[]}).balls[0]
 b.streak=3;b.x=.5;b.y=.2;b.vx=0;b.vy=0
 expect(m.update(3020).scores[0].score).toBe(0)
 m.input([head(3020,.9,.8)])
 expect(m.update(3040).scores[0].score).toBe(30)
 expect(m.update(3120).scores[0].score).toBe(30)
 m.input([]);expect(m.update(3200).scores[0].score).toBe(30)
})
it('uses the real top boundary rather than the old invisible score-bar ceiling',()=>{
 const m=game(),b=(m as unknown as {balls:import('../src/minigames/keep-ups/KeepUpsModel').Football[]}).balls[0]
 b.y=.08;b.vy=-.3
 expect(m.update(3020).balls[0].y).toBeLessThan(.08)
 expect(m.update(3200).balls[0].y).toBeGreaterThanOrEqual(.045)
})
