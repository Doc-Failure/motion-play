import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BodyTrackingTest } from '../src/camera/BodyTrackingTest'
import { stickBodies, type PosePoint } from '../src/camera/poseTracking'

function pose() {
  const points:PosePoint[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1}))
  points[11]={x:.3,y:.3,visibility:1};points[12]={x:.7,y:.3,visibility:1}
  points[23]={x:.4,y:.8,visibility:1};points[24]={x:.6,y:.8,visibility:1}
  points[13]={x:.2,y:.4,visibility:1};points[15]={x:.1,y:.2,visibility:1}
  return points
}
afterEach(()=>vi.useRealTimers())
describe('diagnostic stick geometry',()=>{
  it('mirrors measured joints once and draws one torso with two arms and hand dots',()=>{
    const [body]=stickBodies([pose()])
    expect(body.torso).toEqual([{x:.5,y:.3},{x:.5,y:.8}])
    expect(body.arms).toHaveLength(2);expect(body.hands).toHaveLength(2)
    expect(body.arms[0].at(-1)?.x).toBeCloseTo(.9)
  })
  it('never invents a torso or arm from missing, occluded or offscreen joints',()=>{
    const points=pose();points[13].visibility=.1
    expect(stickBodies([points])[0].arms).toHaveLength(1)
    points[11].visibility=.2;expect(stickBodies([points])).toEqual([])
    expect(stickBodies([[]])).toEqual([])
    const bad=pose();bad[24].x=NaN;expect(stickBodies([bad])).toEqual([])
    bad[24].x=1.5;expect(stickBodies([bad])).toEqual([])
  })
  it('orders multiple measured bodies from left to right in the mirrored image',()=>{
    const left=pose(),right=pose()
    left[23].x=.1;left[24].x=.2;right[23].x=.8;right[24].x=.9
    expect(stickBodies([left,right]).map(body=>body.x)).toEqual([expect.closeTo(.15),expect.closeTo(.85)])
  })
})
function video() {
  const element=document.createElement('video')
  Object.defineProperties(element,{readyState:{value:4},videoWidth:{value:640},paused:{value:false},currentTime:{value:1,writable:true}})
  return {current:element}
}
it('draws actual detector output, clears empty results and releases the runtime on exit',async()=>{
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']})
  const ref=video(),tracker={detect:vi.fn().mockReturnValue([pose()]),close:vi.fn()},create=vi.fn().mockResolvedValue(tracker)
  const {container,unmount}=render(<BodyTrackingTest videoRef={ref} players={2} createTracker={create}/>)
  await act(async()=>{await Promise.resolve()})
  expect(create).toHaveBeenCalledWith(2)
  expect(screen.getByRole('status')).toHaveTextContent('1 of 2 bodies visible')
  expect(container.querySelectorAll('polyline')).toHaveLength(3)
  tracker.detect.mockReturnValue([]);ref.current.currentTime=2
  act(()=>vi.advanceTimersByTime(160))
  expect(container.querySelectorAll('polyline')).toHaveLength(0)
  expect(screen.getByRole('status')).toHaveTextContent('No body found')
  unmount();expect(tracker.close).toHaveBeenCalledOnce()
})
it('clears stale skeletons when the decoded camera feed stalls',async()=>{
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']})
  const tracker={detect:vi.fn().mockReturnValue([pose()]),close:vi.fn()}
  const {container}=render(<BodyTrackingTest videoRef={video()} players={1} createTracker={async()=>tracker}/>)
  await act(async()=>{await Promise.resolve()})
  expect(container.querySelectorAll('polyline')).toHaveLength(3)
  act(()=>vi.advanceTimersByTime(800))
  expect(container.querySelectorAll('polyline')).toHaveLength(0)
  expect(tracker.detect).toHaveBeenCalledOnce()
})
it('closes a runtime that finishes loading after the test has been hidden',async()=>{
  let resolve!:(tracker:{detect:()=>PosePoint[][];close:()=>void})=>void
  const promise=new Promise<{detect:()=>PosePoint[][];close:()=>void}>(r=>{resolve=r})
  const tracker={detect:vi.fn().mockReturnValue([]),close:vi.fn()}
  const {unmount}=render(<BodyTrackingTest videoRef={video()} players={1} createTracker={()=>promise}/>)
  unmount();await act(async()=>resolve(tracker))
  expect(tracker.close).toHaveBeenCalledOnce();expect(tracker.detect).not.toHaveBeenCalled()
})
it('shows an honest failure while leaving play available',async()=>{
  render(<BodyTrackingTest videoRef={video()} players={1} createTracker={async()=>{throw new Error('No WASM')}}/>)
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('Body tracking unavailable · you can still play'))
})
