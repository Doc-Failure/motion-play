import {expect,it} from 'vitest'
import {HandSwipeTracker} from '../src/input/HandSwipe'
const sample=(timestamp:number,x:number)=>({playerId:1 as const,kind:'HAND_POSITION' as const,x,y:.7,confidence:.95,timestamp})

it('recognizes the first release after holding still past an old anchor',()=>{
  const tracker = new HandSwipeTracker()
  for(let t=0;t<=250;t+=50)expect(tracker.sample(sample(t,.42))).toBeNull()
  expect(tracker.sample(sample(300,.56))).toMatchObject({swipe:{fromX:.42,durationMs:50}})
  expect(tracker.sample(sample(350,.56))).toBeNull()
})

it('lets gradual movement accumulate across the end of a stationary hold',()=>{
  const tracker = new HandSwipeTracker()
  for(let t=0;t<=240;t+=40)tracker.sample(sample(t,.4+(t%80===0?.002:0)))
  for(let step=1;step<=5;step++){
    const stroke=tracker.sample(sample(240+step*20,.402+step*.018))
    if(step<5)expect(stroke).toBeNull()
    else expect(stroke).toMatchObject({kind:'HAND_SWIPE',swipe:{durationMs:100}})
  }
})
