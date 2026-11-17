import {describe,it,expect} from 'vitest'
import {BeatModel,beatChart,beatPads,GOOD_MS} from '../src/minigames/beat-freak/BeatModel'
import {BeatScheduler} from '../src/minigames/beat-freak/BeatScheduler'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
const event=(time=2400,pad=0,playerId:1|2|3|4=1):MotionInputEvent=>({playerId,kind:'MOTION_HIT',...beatPads[pad],confidence:1,timestamp:time})
const game=(players:1|2|3|4=1)=>new BeatModel({countdownMs:0,playerCount:players,aspectRatio:1})
describe('original Paper Jam chart and scoring',()=>{
 it('starts with a count-in, previews records and progresses into offbeats and paired accents',()=>{
  const chart=beatChart();expect(chart[0]).toMatchObject({at:2400,pad:0})
  expect(chart.every(n=>n.at<60000-GOOD_MS)).toBe(true)
  expect(new Set(chart.map(n=>n.id)).size).toBe(chart.length)
  expect(chart.some(n=>n.at>=20000&&n.at%600===300)).toBe(true)
  expect(chart.some((n,i)=>i>0&&n.at>=40000&&n.at===chart[i-1].at&&n.pad!==chart[i-1].pad)).toBe(true)
  const m=game();m.start(0);expect(m.update(999).notes).toEqual([])
  expect(m.update(1000).notes[0].progress).toBe(0)
  expect(m.update(1700).notes[0].progress).toBe(.5)
 })
 it.each([[-210,'good',10],[-85,'perfect',15],[0,'perfect',15],[85,'perfect',15],[210,'good',10]] as const)('judges capture offset %i as %s', (offset,kind,score)=>{
  const m=game();m.start(0);const hit=m.hit(event(2400+offset))
  expect(hit.scores[0].score).toBe(score);expect(hit.judgments.at(-1)?.kind).toBe(kind)
 })
 it('accepts consecutive valid strikes only 180 ms apart without a generic hit cooldown',()=>{
  const m=game();m.start(0)
  expect(m.hit(event(2610,0)).hits[1]).toBe(1)
  const second=m.hit(event(2790,1))
  expect(second.hits[1]).toBe(2);expect(second.scores[0].score).toBe(20)
 })
 it('rejects early, late, wrong-pad and unrelated gestures without phantom points',()=>{
  const m=game();m.start(0)
  expect(m.hit(event(2189)).scores[0].score).toBe(0)
  expect(m.hit(event(2400,1)).scores[0].score).toBe(0)
  expect(m.hit({...event(),kind:'HAND_POSITION'}).scores[0].score).toBe(0)
  expect(m.hit(event(2611)).scores[0].score).toBe(0)
 })
 it('judges a delayed on-time capture against capture time instead of render time',()=>{
  const m=game();m.start(0);m.update(2500)
  const hit=m.hit(event(2400));expect(hit.judgments.at(-1)?.kind).toBe('perfect')
  expect(hit.scores[0].score).toBe(15)
  expect(m.hit(event(2400)).scores[0].score).toBe(15)
 })
 it.each([1,2,3,4] as const)('uses identical charts and isolates scoring with %i players',players=>{
  const m=game(players);m.start(0)
  const score=m.hit(event(2400,0,players))
  expect(score.scores.map(s=>s.score)).toEqual(Array.from({length:players},(_,i)=>i===players-1?15:0))
 })
 it('supports two distinct strikes from one camera capture without replaying a note',()=>{
  const m=game();m.start(0)
  const chart=m.chart,pair=chart.find((n,i)=>i>0&&n.at===chart[i-1].at)!,notes=chart.filter(n=>n.at===pair.at)
  m.update(pair.at)
  const before=m.hit(event(pair.at,notes[0].pad))
  const both=m.hit(event(pair.at,notes[1].pad))
  expect(both.hits[1]).toBe(before.hits[1]+1)
  expect(m.hit(event(pair.at,notes[1].pad)).hits[1]).toBe(both.hits[1])
 })
 it('builds multipliers and breaks the combo when a note is missed',()=>{
  const m=game();m.start(0)
  for(const note of m.chart.slice(0,9))m.hit(event(note.at,note.pad))
  const streak=m.update(7300);expect(streak.combo[1]).toBe(9);expect(streak.best[1]).toBe(9)
  expect(streak.scores[0].score).toBe(8*15+30)
  const missed=m.update(m.chart[9].at+361)
  expect(missed.combo[1]).toBe(0);expect(missed.misses[1]).toBe(1)
 })
 it('keeps tall-lane collision bounds circular in camera pixels',()=>{
  const m=new BeatModel({countdownMs:0,aspectRatio:.25});m.start(0)
  expect(m.hit({...event(),y:beatPads[0].y+.05}).scores[0].score).toBe(0)
  expect(m.hit({...event(),y:beatPads[0].y+.02}).scores[0].score).toBe(15)
 })
 it.each([{x:NaN},{y:Infinity},{x:-.1},{y:1.1},{confidence:NaN},{confidence:.2},{confidence:2},{timestamp:NaN},{playerId:4 as const}])('rejects invalid input before clock changes: %j',extra=>{
  const m=game();m.start(0)
  expect(m.hit({...event(),...extra}).roundRemainingMs).toBe(60000)
 })
 it('freezes records, judgments and audio clock through a long pause; rejects pre-resume input',()=>{
  const m=game();m.start(0);const paused=m.pause(1700)
  expect(m.update(30000).notes).toEqual(paused.notes)
  expect(m.playbackAt(30000)).toMatchObject({phase:'paused',elapsed:1700})
  m.resume(30000);expect(m.hit(event(29950)).scores[0].score).toBe(0)
  expect(m.hit(event(30700)).scores[0].score).toBe(15)
 })
 it('resolves the same missed notes on fine/coarse ticks, then replays cleanly',()=>{
  const a=game(4),b=game(4);a.start(0);b.start(0)
  for(let time=50;time<=60000;time+=50)a.update(time)
  const fine=a.update(60000),coarse=b.update(60000)
  expect(coarse.misses).toEqual(fine.misses);expect(coarse.misses[1]).toBe(b.chart.length)
  expect(coarse.scores).toEqual(fine.scores);expect(coarse.phase).toBe('results')
  expect(b.start(61000)).toMatchObject({hits:{1:0,2:0,3:0,4:0},elapsed:0,judgments:[]})
 })
})
describe('audio-grid scheduler',()=>{
 it('schedules upcoming subdivisions once with exact delays, including a slightly late first downbeat',()=>{
  const scheduled:{step:number;delay:number}[]=[],s=new BeatScheduler(),play=(step:number,delay:number)=>scheduled.push({step,delay})
  s.pump(3,60000,play);s.pump(40,60000,play);s.pump(100,60000,play);s.pump(160,60000,play)
  expect(scheduled).toEqual([{step:0,delay:0},{step:1,delay:.11}])
  s.pump(200,60000,play);expect(scheduled.at(-1)).toEqual({step:2,delay:.1})
 })
 it('drops missed background steps after a stall instead of bursting late notes and resets on resume',()=>{
  const steps:number[]=[],s=new BeatScheduler(),play=(step:number)=>steps.push(step)
  s.pump(0,60000,play);s.pump(1990,60000,play)
  expect(steps).toEqual([0,14]);s.reset();s.pump(2110,60000,play)
  expect(steps).toEqual([0,14])
  s.pump(60000,60000,play);expect(steps).toEqual([0,14])
 })
})
