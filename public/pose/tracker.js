/* Isolated optional diagnostic. No network calls except local model/WASM reads. */
import { FilesetResolver, PoseLandmarker, HandLandmarker } from './vision_bundle.mjs'

window.createLocalPoseTracker = async (players, withHands = false) => {
  const files = await FilesetResolver.forVisionTasks(new URL('./wasm', location.href).href)
  const tracker = await PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: new URL('./pose_landmarker_lite.task', location.href).href, delegate: 'CPU' },
    runningMode: 'IMAGE', numPoses: players,
    minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6,
    outputSegmentationMasks: false,
  })
  let hands, loading, closed = false
  // Ready buttons need pose wrists only. Never block them on the finger model.
  const enableHands = () => {
    if (!withHands || closed) return Promise.resolve(false)
    loading ??= (async () => {
      try {
        const value = await HandLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: new URL('./hand_landmarker.task', location.href).href, delegate: 'CPU' },
          runningMode: 'IMAGE', numHands: players * 2,
          minHandDetectionConfidence: .6, minHandPresenceConfidence: .6, minTrackingConfidence: .6,
        })
        if (closed) { value.close(); return false }
        hands = value
        return true
      } catch (error) { console.warn('Local hand detector unavailable', error); return false }
    })()
    return loading
  }
  // Independent frame inference avoids video-mode temporal smoothing lag.
  return {
    detect: frame => tracker.detect(frame).landmarks,
    enableHands: withHands ? enableHands : undefined,
    detectHands: withHands ? frame => {
      if (!hands) return []
      const r = hands.detect(frame)
      return r.landmarks.map((points, i) => ({ points, confidence: r.handedness[i]?.[0]?.score ?? 0, side: r.handedness[i]?.[0]?.categoryName ?? String(i) }))
    } : undefined,
    close: () => { if (closed) return; closed = true; tracker.close(); hands?.close() },
  }
}
