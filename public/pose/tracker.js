/* Isolated optional diagnostic. No network calls except local model/WASM reads. */
import { FilesetResolver, PoseLandmarker } from './vision_bundle.mjs'

window.createLocalPoseTracker = async (players) => {
  const files = await FilesetResolver.forVisionTasks(new URL('./wasm', location.href).href)
  const tracker = await PoseLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: new URL('./pose_landmarker_lite.task', location.href).href, delegate: 'CPU' },
    runningMode: 'VIDEO', numPoses: players,
    minPoseDetectionConfidence: .6, minPosePresenceConfidence: .6, minTrackingConfidence: .6,
    outputSegmentationMasks: false,
  })
  return { detect: (video, time) => tracker.detectForVideo(video, time).landmarks, close: () => tracker.close() }
}
