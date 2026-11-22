/* Isolated optional diagnostic. No network calls except local model/WASM reads. */
import { FilesetResolver, PoseLandmarker, HandLandmarker } from './vision_bundle.mjs'

function handModel(files, numHands, runningMode = 'IMAGE') {
  return HandLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: new URL('./hand_landmarker.task', location.href).href, delegate: 'CPU' },
    runningMode, numHands,
    minHandDetectionConfidence: .6, minHandPresenceConfidence: .6, minTrackingConfidence: .6,
  })
}

function mapHands(r) {
  return r.landmarks.map((points, i) => ({ points, confidence: r.handedness[i]?.[0]?.score ?? 0, side: r.handedness[i]?.[0]?.categoryName ?? String(i) }))
}

window.createLocalHandTracker = async () => {
  const files = await FilesetResolver.forVisionTasks(new URL('./wasm', location.href).href)
  const hands = await handModel(files, 1, 'VIDEO')
  return { detect: (frame, time) => mapHands(hands.detectForVideo(frame, time)), close: () => hands.close() }
}

window.createLocalPoseTracker = async (players, withHands = false, withMasks = false) => {
  const files = await FilesetResolver.forVisionTasks(new URL('./wasm', location.href).href)
  const tracker = await PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: new URL('./pose_landmarker_lite.task', location.href).href, delegate: 'CPU' },
    runningMode: 'IMAGE', numPoses: players,
    minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6,
    outputSegmentationMasks: withMasks,
  })
  let hands, loading, closed = false
  // Ready buttons need pose wrists only. Never block them on the finger model.
  const enableHands = () => {
    if (!withHands || closed) return Promise.resolve(false)
    loading ??= (async () => {
      try {
        const value = await handModel(files, players * 2)
        if (closed) { value.close(); return false }
        hands = value
        return true
      } catch (error) { console.warn('Local hand detector unavailable', error); return false }
    })()
    return loading
  }
  let silhouettes = []
  // Copy only a small binary occupancy grid while the inference callback owns its masks.
  function readSilhouette(mask, aspect) {
    const height = 96, width = Math.max(1, Math.min(240, Math.round(height * aspect)))
    const cells = new Uint8Array(width * height), pixels = mask.getAsFloat32Array()
    for (let y = 0; y < height; y++) {
      const row = Math.floor((y + .5) * mask.height / height) * mask.width
      for (let x = 0; x < width; x++) {
        const mirrored = Math.floor((width - x - .5) * mask.width / width)
        cells[y * width + x] = pixels[row + mirrored] >= .5 ? 1 : 0
      }
    }
    return { width, height, cells }
  }
  // Independent frame inference avoids video-mode temporal smoothing lag.
  return {
    detect(frame, _time, aspect = (frame.videoWidth || frame.width) / (frame.videoHeight || frame.height)) {
      if (!withMasks) return tracker.detect(frame).landmarks
      let landmarks = []
      tracker.detect(frame, result => {
        landmarks = result.landmarks
        silhouettes = (result.segmentationMasks ?? []).map(mask => readSilhouette(mask, aspect))
      })
      return landmarks
    },
    silhouettes: withMasks ? () => silhouettes : undefined,
    enableHands: withHands ? enableHands : undefined,
    detectHands: withHands ? frame => {
      if (!hands) return []
      return mapHands(hands.detect(frame))
    } : undefined,
    close: () => { if (closed) return; closed = true; tracker.close(); hands?.close() },
  }
}
