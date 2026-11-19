import {describe,it,expect} from 'vitest'
import {BeatModel,beatChart,beatPads} from '../src/minigames/beat-freak/BeatModel'
import {BeatScheduler} from '../src/minigames/beat-freak/BeatScheduler'
import type {MotionInputEvent} from '../src/input/MotionProcessor'
const event=(time=2400,pad=0,playerId:1|2|3|4=1):MotionInputEvent=>({playerId,kind:'MOTION_HIT',...beatPads[pad],confidence:1,timestamp:time})
const game=(players:1|2|3|4=1)=>new BeatModel({countdownMs:0,playerCount:players,aspectRatio:1})
describe('Paper Jam timing and musician parts',()=>{
 it('teaches two reachable speakers with a single pulse every two beats',()=>{
  const m=game();m.start(0)
  expect(m.stage).toHaveLength(2)
  expect(m.chart[0]).toMatchObject({at:1200,pad:0})
  expect(m.chart.every((n,i)=>n.at===(i+1)*1200&&n.pad<2)).toBe(true)
  expect(m.update(149).notes).toEqual([])
  expect(m.update(150).notes[0].progress).toBe(0)
  expect(m.update(1620).notes).toHaveLength(1)
  expect(m.update(1621).notes.map(n=>n.at)).toEqual([2400])
 })
 it('introduces four instruments, offbeats and then paired accents on advanced charts',()=>{
  const normal=beatChart(42000,.5),expert=beatChart(42000,.9)
  expect(new Set(normal.map(n=>n.pad)).size).toBe(4)
  expect(normal.some(n=>n.at%600===300)).toBe(true)
  expect(normal.some((n,i)=>n.at===normal[i-1]?.at)).toBe(false)
  expect(expert.some((n,i)=>n.at===expert[i-1]?.at)).toBe(true)
  expect(new Set(expert.map(n=>n.id)).size).toBe(expert.length)
 })
 it.each([[-301,0],[-300,10],[-130,15],[130,15],[420,10],[421,0]])('grades beginner offset %i', (offset,score)=>{
  const m=game();m.start(0)
  expect(m.hit({...event(1200+offset),...m.stage[0]}).scores[0].score).toBe(score)
 })
 it('accepts an on-time capture arriving after a render, then consumes its note exactly once',()=>{
  const m=game();m.start(0);m.update(1290)
  const sample={...event(1200),...m.stage[0]}
  expect(m.hit(sample).scores[0].score).toBe(15)
  expect(m.hit(sample).scores[0].score).toBe(15)
 })
 it.each([1,2,3,4] as const)('assigns every note once and balances opportunities for %i musicians',players=>{
  const m=game(players);m.start(0)
  const parts=Array<number>(players).fill(0)
  for(const note of m.chart){
   const pad=m.stage[note.pad],owner=pad.owner,x=pad.x*players-owner+1
   if(players>1){
    const other=(owner%players+1) as 1|2|3|4
    const before=m.update(note.at)
    const wrong=m.stage.find(p=>p.owner===other)!
    // An attempt before this musician's turn cannot consume another part.
    if(!m.chart.some(n=>n.at===note.at&&m.stage[n.pad].owner===other)){
     expect(m.hit({...event(note.at,0,other),x:wrong.x*players-other+1,y:wrong.y}).scores).toEqual(before.scores)
    }
   }
   m.hit({...event(note.at,0,owner),x,y:pad.y});parts[owner-1]++
  }
  const final=m.update(60000)
  expect(Object.values(final.hits).slice(0,players)).toEqual(parts)
  expect(Math.max(...parts)-Math.min(...parts)).toBeLessThanOrEqual(1)
  expect(Object.values(final.misses)).toEqual([0,0,0,0])
 })
 it('builds combos, breaks on a missed cue, and rejects pre-resume captures',()=>{
  const m=game();m.start(0)
  for(const n of m.chart.slice(0,9))m.hit({...event(n.at),...m.stage[n.pad]})
  const paused=m.pause(m.chart[8].at+10)
  expect(paused.scores[0].score).toBe(150)
  expect(m.update(30000).notes).toEqual(paused.notes)
  m.resume(30000);expect(m.hit({...event(29000),...m.stage[0]}).scores).toEqual(paused.scores)
  expect(m.update(32000).combo[1]).toBe(0)
 })
 it('judges simultaneous accents separately at higher levels',()=>{
  const m=new BeatModel({playerCount:1,pressure:1,countdownMs:0})
  m.start(0)
  const pair=m.chart.filter((n,i,a)=>a.some((o,j)=>i!==j&&o.at===n.at)).slice(0,2)
  expect(m.hitFrame(pair.map(n=>({...event(n.at),...m.stage[n.pad]}))).hits[1]).toBe(2)
 })
 it('rejects a wrong instrument, stale, invalid or missing motion',()=>{
  const m=game();m.start(0);const sample={...event(1200),...m.stage[0]}
  for(const extra of [m.stage[1],{x:NaN},{y:Infinity},{confidence:.1},{timestamp:NaN},{kind:'HAND_POSITION' as const}]){
   expect(m.hit({...sample,...extra}).scores[0].score).toBe(0)
  }
 })
 it('resolves missed notes consistently and resets replay',()=>{
  const a=game(4),b=game(4);a.start(0);b.start(0)
  for(let t=50;t<=60000;t+=50)a.update(t)
  const fine=a.update(60000),coarse=b.update(60000)
  expect(coarse.misses).toEqual(fine.misses)
  expect(Object.values(coarse.misses).reduce((a,b)=>a+b,0)).toBe(b.chart.length)
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

it('shows only the active call and accepts a late, off-center beginner swat',()=>{
 const m=new BeatModel({countdownMs:0,aspectRatio:16/9})
 const first=m.start(0);expect(first.notes).toHaveLength(0)
 const cue=m.update(1550).notes[0],pad=m.stage[cue.pad]
 const s=m.hit({...event(1550),x:pad.x+.07,y:pad.y+.04})
 expect(s.scores[0].score).toBe(10)
 expect(s.notes.every(n=>n.id!==cue.id)).toBe(true)
})
it('keeps speaker hitboxes circular on a narrow stage and applies solo retry assistance',()=>{
 const m=new BeatModel({countdownMs:0,aspectRatio:.5,pressure:-.15});m.start(0)
 expect(m.hitRadiusY).toBeCloseTo(m.hitRadiusX*.5)
 const sample={...event(1650),...m.stage[0]}
 expect(m.hit({...sample,y:sample.y+m.hitRadiusY+.01}).scores[0].score).toBe(0)
 expect(m.hit({...sample,y:sample.y+m.hitRadiusY-.01}).scores[0].score).toBe(10)
})
it('accepts two distinct advanced strikes 180 ms apart across adjacent beats',()=>{
 const m=new BeatModel({countdownMs:0,pressure:1})
 m.start(0)
 const a=m.chart.find(n=>n.at===4800)!,b=m.chart.find(n=>n.at===5400)!
 expect(m.hit({...event(a.at+210),...m.stage[a.pad]}).hits[1]).toBe(1)
 expect(m.hit({...event(b.at-210),...m.stage[b.pad]}).hits[1]).toBe(2)
})
