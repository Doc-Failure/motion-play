import {describe,expect,it} from 'vitest'
import {enemyCel, runnerCel} from '../src/minigames/moon-gate-run/animation'
import {foeAt, GATE_DISTANCE, platforms} from '../src/minigames/moon-gate-run/course'
import {FINALE_MS, MoonGateModel} from '../src/minigames/moon-gate-run/MoonGateModel'

const gateTime=GATE_DISTANCE/.00021
const enemy=(p:number,boss=false)=>foeAt(boss?GATE_DISTANCE:.12+p*.93,boss?gateTime+p*3400:1000,gateTime,1.6,1)!
describe('Moon Gate sprite playback',()=>{
  it('alternates six distinct stride cells and shows the planted guard when scrolling stops',()=>{
    const m=new MoonGateModel(1,1.6),r=m.start(0).runners[0]
    expect(Array.from({length:6},(_,i)=>runnerCel(r,i*90,-1,false).frame)).toEqual([0,1,2,3,4,5])
    expect(runnerCel(r,450,-1,true)).toMatchObject({action:'run',frame:0})
    expect(runnerCel(r,20000,0,false).action).toBe('stop')
    expect(runnerCel(r,20300,300,false).action).toBe('guard')
  })
  it('shows a swing for a miss in the air without awarding a hit; a bump is distinct from a clean landing',()=>{
    const m=new MoonGateModel(1,1.6);m.start(0)
    m.jump(1,3600)
    let s=m.input({playerId:1,kind:'MOTION_HIT',x:.01,y:.01,confidence:1,timestamp:3800})
    expect(runnerCel(s.runners[0],s.elapsed,-1,false).action).toBe('air-swat')
    expect(s.scores[0].score).toBe(0)
    s=m.update(3000+platforms[0].start/.00021+32)
    expect(runnerCel(s.runners[0],s.elapsed,-1,false).action).toBe('scramble')
    expect(s.runners[0].rewardAt).toBeLessThan(0)
  })
  it('plays every takeoff frame and telegraphs both the ninja leap and the Oni slam',()=>{
    const pose=(p:number,boss=false)=>enemyCel(enemy(p,boss),10000,-1000,null,false)
    expect(pose(.41).action).toBe('wind-up')
    expect([.5,.66,.79].map(p=>pose(p).frame)).toEqual([0,1,2])
    expect(pose(.96).action).toBe('exit')
    expect([.05,.28,.45,.55,.64,.73,.81,.96].map(p=>pose(p,true).action))
      .toEqual(['entrance','guard','wind-up','charge','charge','charge','slam','recover'])
    expect(enemyCel(enemy(.5),1000,890,null,false)).toMatchObject({sheet:'reactions',frame:1})
    expect(enemyCel(enemy(.5,true),1000,890,null,false)).toMatchObject({sheet:'oni',frame:11})
  })
  it('lets a winning blow before the buzzer finish its collapse at zero on the clock',()=>{
    const m=new MoonGateModel(1,1.6);m.start(0)
    for(let time=3040;time<62960;time+=40){
      const s=m.update(time),f=s.foe
      if(!f)continue
      if(f.boss && f.progress>.60 && f.progress<.62)m.jump(1,time)
      if(!f.boss || s.runners[0].hp>1)m.input({playerId:1,kind:'MOTION_HIT',x:f.x,y:f.y,confidence:1,timestamp:time})
    }
    const f=m.update(62960).foe!
    const s=m.input({playerId:1,kind:'MOTION_HIT',x:f.x,y:f.y,confidence:1,timestamp:62960})
    expect(s.runners[0].won).toBe(true)
    expect(m.update(63100)).toMatchObject({phase:'playing',roundRemainingMs:0})
    expect(m.update(64300).phase).toBe('results')
  })
  it('holds the fallen boss in the lane, freezes its collapse on pause and plays victory before results',()=>{
    const m=new MoonGateModel(1,1.6);m.start(0)
    let s=m.update(3000),now=3000
    while(!s.runners[0].won && now<60000){
      now+=250;s=m.update(now)
      if(s.foe)s=m.input({playerId:1,kind:'MOTION_HIT',x:s.foe.x,y:s.foe.y,confidence:1,timestamp:now})
    }
    const r=s.runners[0],fallen=r.fallen!
    expect(r.won).toBe(true);expect(s.phase).toBe('playing')
    expect(runnerCel(r,s.elapsed,s.gateAge,false).action).toBe('finishing-swat')
    expect(runnerCel(r,s.elapsed+200,s.gateAge,false).action).toBe('celebrate')
    expect([0,200,370,520,700].map(age=>enemyCel(fallen.foe,s.elapsed+age,r.hitAt,age,false).frame)).toEqual([10,11,12,13,14])
    const paused=m.pause(now+250)
    expect(m.update(now+3000).elapsed).toBe(paused.elapsed)
    m.resume(now+3000)
    expect(m.update(now+3000+FINALE_MS).phase).toBe('results')
    expect(m.start(now+6000).runners[0].fallen).toBeNull()
  })
})
