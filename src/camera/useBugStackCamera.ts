import { useEffect, useRef, useState } from 'react'
import { CameraSource, cameraFailure } from './CameraSource'
import { createHandTracker } from './poseTracking'
import { BugStackGestures, type HandControl } from '../input/BugStackGestures'

type Status = 'starting' | 'seeking' | 'tracking' | 'error'
export function useBugStackCamera(enabled: boolean, onGesture: (event: HandControl) => void, attempt: number) {
  const video = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<Status>('starting')
  const [error, setError] = useState('')
  useEffect(() => {
    const preview = video.current
    if (!enabled || !preview) return
    const camera = new CameraSource()
    const abort = new AbortController()
    const gestures = new BugStackGestures()
    let raf = 0
    const stop = () => {
      abort.abort()
      cancelAnimationFrame(raf)
      camera.stop()
      preview.srcObject = null
    }
    const fail = (message: string) => {
      if (abort.signal.aborted) return
      stop()
      setError(message)
      setStatus('error')
    }
    async function start(element: HTMLVideoElement) {
      setStatus('starting')
      setError('')
      try {
        const stream = await camera.start(undefined, () => fail('Camera disconnected. Reconnect it and try again.'))
        if (abort.signal.aborted) return
        element.srcObject = stream
        await element.play()
      } catch (err) {
        const reason = cameraFailure(err)
        fail(reason === 'permission-denied' ? 'Allow camera access in your browser settings, then try again.'
          : reason === 'unsupported' ? 'Camera access needs HTTPS and a supported browser.'
          : 'Camera unavailable. Check that the front camera is free, then try again.')
        return
      }
      try {
        const tracker = await createHandTracker(abort.signal)
        let lastFrame = -Infinity
        let lastVideoTime = -1
        let lastSeen = -Infinity
        setStatus('seeking')
        const tick = (now: number) => {
          if (abort.signal.aborted) return
          if (element.readyState >= 2 && now - lastFrame >= 65 && element.currentTime !== lastVideoTime) {
            lastFrame = now
            lastVideoTime = element.currentTime
            try {
              const hand = tracker.detect(element, now)[0]
              const event = gestures.read(hand, element.videoWidth / element.videoHeight, now)
              if (event) {
                lastSeen = now
                setStatus('tracking')
                onGesture(event)
              }
            } catch { fail('Hand tracking stopped. Try the camera again.'); return }
          }
          if (now - lastSeen > 400) setStatus('seeking')
          raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      } catch { fail('Hand tracking could not start. Try again or play by touch.') }
    }
    void start(preview)
    return stop
  }, [enabled, onGesture, attempt])
  return { video, status, error }
}
