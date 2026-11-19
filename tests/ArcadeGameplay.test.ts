import {expect,it} from 'vitest'
import {visibleGameSlugs} from '../src/app/catalog'
import {challengePressure,scoreGoal} from '../src/game/arcade'
import {SportsModel} from '../src/minigames/camera-sports/SportsModel'
import {MotionProcessor} from '../src/input/MotionProcessor'
import {defaultCameraZones} from '../src/input/PlayerZoneMapper'
import {SyntheticMotionSimulator} from '../src/input/SyntheticMotionSimulator'

it.each(visibleGameSlugs)('%s ramps across levels and caps endless play',game=>{
 const goals=Array.from({length:12},(_,i)=>scoreGoal(game,i+1))
 expect(goals[1]).toBeGreaterThan(goals[0])
 expect(goals).toEqual([...goals].sort((a,b)=>a-b))
 expect(goals[8]).toBe(goals[11])
 expect(challengePressure(8)).toBe(1)
 expect(challengePressure(50,.1)).toBeCloseTo(.9)
})

it('lets a tracked defender qualify across seeded courts and levels while idle teammates earn zero',()=>{
 let wins=0,saves=0
 for(const level of [1,4,8])for(const seed of [1,42,9876,63117]){
  const m=new SportsModel('keeper',4,4/3,seed,challengePressure(level))
  let s=m.start(0)
  for(let t=3000;t<=43000;t+=40){
   s=m.update(t)
   const shot=s.shots[0]
   if(shot.state==='incoming'&&shot.progress>.42)m.input([{playerId:1,x:shot.x,y:shot.y,timestamp:t,confidence:.95,kind:'BODY_MOVE',pointerId:'head'}])
  }
  wins+=Number(s.scores[0].score>=scoreGoal('goalkeeper',level,4));saves+=s.shots[0].saves
  expect(s.phase).toBe('results');expect(s.scores.slice(1).map(p=>p.score)).toEqual([0,0,0])
 }
 expect(wins).toBe(12)
 console.info(`Seeded keeper: ${wins}/12 levels cleared, ${saves} saves at 25 Hz observations`)
})

it('processes synthetic four-lane camera frames inside a camera-frame budget',()=>{
 const fixture=new SyntheticMotionSimulator(160,90),processor=new MotionProcessor({spatialSampling:true}),zones=defaultCameraZones(4)
 const samples:number[]=[]
 for(let i=0;i<180;i++){
  const frame=fixture.next(),start=performance.now()
  processor.process(frame,zones,i*50)
  if(i>=20)samples.push(performance.now()-start)
 }
 samples.sort((a,b)=>a-b)
 const percentile=(fraction:number)=>samples[Math.floor(samples.length*fraction)]
 console.info(`160×90 motion processing: median ${percentile(.5).toFixed(2)} ms, p95 ${percentile(.95).toFixed(2)} ms`)
 expect(percentile(.95)).toBeLessThan(33)
})
