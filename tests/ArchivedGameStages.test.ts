import {expect,it} from 'vitest'
import {challengePressure} from '../src/game/arcade'
import {beatChart} from '../src/minigames/beat-freak/BeatModel'
import {GoalkeeperModel} from '../src/minigames/goalkeeper/GoalkeeperModel'
import {PunchArenaModel} from '../src/minigames/punch-arena/PunchArenaModel'

it('keeps the archived punch pad and keeper save reachable at five stages',()=>{
  let previousSpeed=0,previousSpawn=Infinity
  for(const level of [1,2,4,6,8]){
    const pressure=challengePressure(level)
    const punch=new PunchArenaModel({pressure,countdownMs:0,random:()=>.5})
    punch.start(0)
    const first=punch.punch({playerId:1,kind:'HAND_SWIPE',x:.5,y:.5,confidence:1,timestamp:150,swipe:{fromX:.5,fromY:.75,durationMs:100}})
    expect(first.scores[0].score).toBe(10)
    const next=punch.update(1210).targets[0]
    expect(next.spawnedAt).toBeLessThan(previousSpawn)
    previousSpawn=next.spawnedAt

    const keeper=new GoalkeeperModel({pressure,countdownMs:0})
    const shot=keeper.start(0).shots[0]
    expect(shot.velocityY).toBeGreaterThan(previousSpeed)
    previousSpeed=shot.velocityY
    const crossing=(.78-shot.y)/shot.velocityY
    keeper.moveBody({kind:'BODY_MOVE',playerId:1,x:shot.x,y:.78,timestamp:crossing-50,confidence:1})
    expect(keeper.update(crossing+5).scores[0].score).toBe(10)
  }
})
it('keeps the retired rhythm chart playable across stages and adds advanced rhythms',()=>{
  const charts=[1,2,4,6,8].map(level=>beatChart(36000,challengePressure(level)))
  expect(charts.at(-1)!.length).toBeGreaterThan(charts[0].length)
  for(const chart of charts){
    expect(chart[0].at).toBeLessThan(2000)
    expect(chart.every((n,i)=>n.at<36000&&(!i||n.at>=chart[i-1].at))).toBe(true)
  }
})
