import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BodyTrackingTest } from '../src/camera/BodyTrackingTest'
import { createPoseTracker, stickBodies, type PosePoint } from '../src/camera/poseTracking'

function pose() {
  const points:PosePoint[]=Array.from({length:33},()=>({x:.5,y:.5,visibility:1,presence:1}))
  points[11]={x:.3,y:.3,visibility:1};points[12]={x:.7,y:.3,visibility:1}
  points[23]={x:.4,y:.8,visibility:1};points[24]={x:.6,y:.8,visibility:1}
  points[13]={x:.2,y:.4,visibility:1};points[15]={x:.1,y:.2,visibility:1}
  return points
}
beforeEach(()=>{vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue({drawImage:vi.fn(),setTransform:vi.fn()} as unknown as CanvasRenderingContext2D)})
afterEach(()=>vi.useRealTimers())
describe('diagnostic stick geometry',()=>{
  it('mirrors measured joints once and draws one torso with two arms and hand dots',()=>{
    const [body]=stickBodies([pose()])
    expect(body.torso).toEqual([{x:.5,y:.3},{x:.5,y:.8}])
    expect(body.arms).toHaveLength(2);expect(body.hands).toHaveLength(2)
    expect(body.arms[0].at(-1)?.x).toBeCloseTo(.9)
  })
  it('keeps wrist identities stable when the other hand is hidden',()=>{
    const points=pose();expect(stickBodies([points])[0].wristIds).toEqual([15,16])
    points[15].visibility=.1;expect(stickBodies([points])[0].wristIds).toEqual([16])
  })
  it('never invents a torso or arm from missing, occluded or offscreen joints',()=>{
    const points=pose();points[13].visibility=.1
    expect(stickBodies([points])[0].arms).toHaveLength(1)
    points[11].visibility=.2;expect(stickBodies([points])).toEqual([])
    expect(stickBodies([[]])).toEqual([])
    const bad=pose();bad[24].x=NaN;expect(stickBodies([bad])[0].torso).toEqual([])
    bad[24].x=1.5;expect(stickBodies([bad])[0].torso).toEqual([])
  })
  it('orders multiple measured bodies from left to right in the mirrored image',()=>{
    const left=pose(),right=pose()
    left[23].x=.1;left[24].x=.2;right[23].x=.8;right[24].x=.9
    expect(stickBodies([left,right]).map(body=>body.x)).toEqual([expect.closeTo(.15),expect.closeTo(.85)])
  })
})
function video() {
  const element=document.createElement('video')
  Object.defineProperties(element,{readyState:{value:4},videoWidth:{value:640},videoHeight:{value:480},paused:{value:false},currentTime:{value:1,writable:true}})
  return {current:element}
}
it('draws actual detector output, clears empty results and releases the runtime on exit',async()=>{
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']})
  const ref=video(),tracker={detect:vi.fn().mockReturnValue([pose()]),close:vi.fn()},create=vi.fn().mockResolvedValue(tracker)
  const {container,unmount}=render(<BodyTrackingTest videoRef={ref} players={2} createTracker={create}/>)
  await act(async()=>{await Promise.resolve()})
  expect(create).toHaveBeenCalledWith(2,expect.any(AbortSignal),false)
  expect(screen.getByRole('status')).toHaveTextContent('1 of 2 bodies visible')
  expect(container.querySelectorAll('polyline')).toHaveLength(5)
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
  expect(container.querySelectorAll('polyline')).toHaveLength(5)
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

it('labels gameplay sticks as a joint diagnostic rather than claiming they drive game inputs',async()=>{
  const tracker={detect:vi.fn().mockReturnValue([pose()]),close:vi.fn()}
  render(<BodyTrackingTest videoRef={video()} players={1} compact createTracker={async()=>tracker}/>)
  await waitFor(()=>expect(screen.getByRole('status')).toHaveTextContent('1 of 1 bodies visible'))
  expect(screen.getByRole('status')).toHaveTextContent('Following your body · pose test only')
  expect(screen.getByRole('img',{name:'Detected human stick figure'})).toBeVisible()
})

it('moves the whole stick person with measured human joints, mirrored once',()=>{
  const points=pose(),before=stickBodies([points])[0]
  const after=stickBodies([points.map(p=>({...p,x:p.x+.05}))])[0]
  expect(after.head!.x).toBeCloseTo(before.head!.x-.05)
  expect(after.neck.x).toBeCloseTo(before.neck.x-.05)
  expect(after.legs).toHaveLength(2)
  after.arms.forEach((chain,i)=>chain.forEach((p,j)=>expect(p.x).toBeCloseTo(before.arms[i][j].x-.05)))
  after.legs.forEach((chain,i)=>chain.forEach((p,j)=>expect(p.x).toBeCloseTo(before.legs[i][j].x-.05)))
  const partial=pose();partial[25].visibility=.1
  expect(stickBodies([partial])[0].legs).toHaveLength(1)
})


it('cancels a loading local runtime immediately when tracking is disabled',async()=>{
  const controller=new AbortController(),pending=createPoseTracker(1,controller.signal)
  expect(document.querySelector('iframe[title="Local body tracking runtime"]')).not.toBeNull()
  controller.abort()
  await expect(pending).rejects.toHaveProperty('name','AbortError')
  expect(document.querySelector('iframe[title="Local body tracking runtime"]')).toBeNull()
})
it('does not mount a runtime for a cancelled request',async()=>{
  const controller=new AbortController();controller.abort()
  await expect(createPoseTracker(1,controller.signal)).rejects.toHaveProperty('name','AbortError')
  expect(document.querySelector('iframe[title="Local body tracking runtime"]')).toBeNull()
})
it('releases a detector that resolves after runtime initialization was cancelled',async()=>{
  const controller=new AbortController(),pending=createPoseTracker(1,controller.signal)
  const frame=document.querySelector('iframe[title="Local body tracking runtime"]') as HTMLIFrameElement
  let resolve!:(tracker:{detect:()=>PosePoint[][];close:()=>void})=>void
  const delayed=new Promise<{detect:()=>PosePoint[][];close:()=>void}>(r=>{resolve=r})
  Object.assign(frame.contentWindow!,{createLocalPoseTracker:()=>delayed})
  frame.dispatchEvent(new Event('load'));controller.abort()
  await expect(pending).rejects.toHaveProperty('name','AbortError')
  const tracker={detect:()=>[],close:vi.fn()};resolve(tracker);await Promise.resolve()
  expect(tracker.close).toHaveBeenCalledOnce()
})


it('detects on the captured image and commits its mirrored pixels with the joints',async()=>{
  const ref=video(),host=document.createElement('div');host.append(ref.current);document.body.append(host)
  const tracker={detect:vi.fn().mockReturnValue([pose()]),close:vi.fn()}
  const {unmount}=render(<BodyTrackingTest videoRef={ref} players={1} createTracker={async()=>tracker}/>)
  await waitFor(()=>expect(tracker.detect).toHaveBeenCalled())
  const image=(tracker.detect.mock.calls as unknown as unknown[][])[0][0] as HTMLCanvasElement
  expect(image).toBeInstanceOf(HTMLCanvasElement)
  expect(image.width).toBe(640);expect(image.height).toBe(480)
  const ctx=image.getContext('2d')!
  expect(ctx.drawImage).toHaveBeenCalledWith(ref.current,0,0,640,480)
  expect(ctx.setTransform).toHaveBeenCalledWith(-1,0,0,1,640,0)
  expect(ctx.drawImage).toHaveBeenCalledWith(image,0,0)
  const matched=host.querySelector('.pose-matched-frame') as HTMLCanvasElement
  expect(matched.hidden).toBe(false)
  unmount();expect(host.querySelector('canvas')).toBeNull();host.remove()
})

it('keeps each inferred frame immutable instead of repainting an older pose over newer pixels',async()=>{
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']})
  const ref=video(),tracker={detect:vi.fn().mockReturnValue([pose()]),close:vi.fn()}
  render(<BodyTrackingTest videoRef={ref} players={1} createTracker={async()=>tracker}/>)
  await act(async()=>{await Promise.resolve()})
  const first=(tracker.detect.mock.calls as unknown as unknown[][])[0][0]
  ref.current.currentTime=2;act(()=>vi.advanceTimersByTime(60))
  const second=(tracker.detect.mock.calls as unknown as unknown[][])[1][0]
  expect(first).not.toBe(second)
  expect(first).toBeInstanceOf(HTMLCanvasElement);expect(second).toBeInstanceOf(HTMLCanvasElement)
})


it('retains gesture inference while hiding diagnostic UI and artwork fading',async()=>{
  const status=vi.fn(),events=vi.fn(),tracker={detect:vi.fn().mockReturnValue([pose()]),detectHands:vi.fn().mockReturnValue([]),close:vi.fn()}
  const {container}=render(<BodyTrackingTest videoRef={video()} players={1} showSkeleton={false} withHands onHandStatus={status} onHandEvents={events} createTracker={async()=>tracker}/>)
  await waitFor(()=>expect(tracker.detectHands).toHaveBeenCalled())
  expect(status).toHaveBeenCalledWith(true)
  expect(events).toHaveBeenCalledWith([])
  expect(container.querySelector('.body-test')).toHaveAttribute('data-tracked','false')
  expect(container.querySelector('.body-test')).not.toBeVisible()
})


it('defers finger inference during the body-only ready check without reloading models',async()=>{
  vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']})
  const ref=video(),tracker={detect:vi.fn().mockReturnValue([pose()]),detectHands:vi.fn().mockReturnValue([]),close:vi.fn()},create=vi.fn().mockResolvedValue(tracker),events=vi.fn()
  const {rerender}=render(<BodyTrackingTest videoRef={ref} players={1} withHands onHandEvents={events} handInputEnabled={false} createTracker={create}/>)
  await act(async()=>{await Promise.resolve()})
  expect(tracker.detectHands).not.toHaveBeenCalled()
  rerender(<BodyTrackingTest videoRef={ref} players={1} withHands onHandEvents={events} handInputEnabled createTracker={create}/>)
  ref.current.currentTime=2;act(()=>vi.advanceTimersByTime(100))
  expect(tracker.detectHands).toHaveBeenCalledOnce();expect(create).toHaveBeenCalledOnce()
})


it('keeps ready poses available while the Silk Squad finger model has not started or finished loading',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']})
 let finish!:(available:boolean)=>void
 const load=new Promise<boolean>(resolve=>{finish=resolve}),ref=video(),events=vi.fn(),status=vi.fn(),samples=vi.fn()
 const tracker={detect:vi.fn().mockReturnValue([pose()]),enableHands:vi.fn().mockReturnValue(load),detectHands:vi.fn().mockReturnValue([]),close:vi.fn()},create=vi.fn().mockResolvedValue(tracker)
 const props={videoRef:ref,players:1,withHands:true,onHandEvents:events,onHandStatus:status,onPoseSample:samples,createTracker:create}
 const {rerender}=render(<BodyTrackingTest {...props} handInputEnabled={false}/>)
 await act(async()=>{await Promise.resolve()})
 expect(samples).toHaveBeenCalled();expect(tracker.enableHands).not.toHaveBeenCalled();expect(status).not.toHaveBeenCalledWith(true)
 rerender(<BodyTrackingTest {...props} handInputEnabled/>)
 ref.current.currentTime=2;act(()=>vi.advanceTimersByTime(100))
 expect(tracker.enableHands).toHaveBeenCalledOnce();expect(tracker.detectHands).not.toHaveBeenCalled()
 ref.current.currentTime=3;act(()=>vi.advanceTimersByTime(100));expect(tracker.detect).toHaveBeenCalledTimes(3)
 await act(async()=>finish(true))
 ref.current.currentTime=4;act(()=>vi.advanceTimersByTime(100));expect(tracker.detectHands).toHaveBeenCalledOnce()
 expect(create).toHaveBeenCalledOnce();expect(status).toHaveBeenLastCalledWith(true)
})

it('emits arm casts with hidden sticks, skips fingers and resets movement during the ready hold',async()=>{
 vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']})
 const ref=video(),points=pose(),events=vi.fn(),tracker={detect:vi.fn().mockImplementation(()=>[points]),detectHands:vi.fn(),close:vi.fn()},create=vi.fn().mockResolvedValue(tracker)
 const props={videoRef:ref,players:1,withArms:true,showSkeleton:false,onArmEvents:events,createTracker:create}
 const {rerender}=render(<BodyTrackingTest {...props} armInputEnabled={false}/>)
 await act(async()=>{await Promise.resolve()})
 expect(events).toHaveBeenLastCalledWith([])
 rerender(<BodyTrackingTest {...props} armInputEnabled/>)
 points[15].y=.3;ref.current.currentTime=2;act(()=>vi.advanceTimersByTime(100))
 expect(events.mock.lastCall![0].some((e:{kind:string})=>e.kind==='ARM_MOVE')).toBe(false)
 points[15].y=.4;ref.current.currentTime=3;act(()=>vi.advanceTimersByTime(100))
 expect(events.mock.lastCall![0].some((e:{kind:string})=>e.kind==='ARM_MOVE')).toBe(true)
 expect(tracker.detectHands).not.toHaveBeenCalled();expect(create).toHaveBeenCalledWith(1,expect.any(AbortSignal),false)
})

it('keeps navigation pose samples while restoring live video when diagnostic sticks are hidden',async()=>{
 const ref=video(),host=document.createElement('div');host.append(ref.current);document.body.append(host)
 const sample=vi.fn(),tracker={detect:vi.fn().mockReturnValue([pose()]),close:vi.fn()}
 const {unmount}=render(<BodyTrackingTest videoRef={ref} players={1} showSkeleton={false} onPoseSample={sample} createTracker={async()=>tracker}/>)
 await waitFor(()=>expect(sample).toHaveBeenCalled())
 expect(host.querySelector('.pose-matched-frame')).not.toBeVisible()
 unmount();host.remove()
})

it('uses the measured palm center for selection and falls back when fingers are occluded or implausible',()=>{
 const points=pose();points[15]={x:.3,y:.4,visibility:1}
 for(const id of [17,19,21])points[id]={x:.34,y:.34,visibility:1}
 const body=stickBodies([points])[0]
 expect(body.hands[0]).toMatchObject({x:.7,y:.4})
 expect(body.palms![0].x).toBeCloseTo(.68);expect(body.palms![0].y).toBeCloseTo(.37)
 points[17].visibility=.1;points[19].visibility=.1
 expect(stickBodies([points])[0].palms![0]).toEqual(body.hands[0])
 for(const id of [17,19,21])points[id]={x:.9,y:.9,visibility:1}
 expect(stickBodies([points])[0].palms![0]).toEqual(body.hands[0])
})
