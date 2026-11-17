Optional local body-tracking diagnostic

MediaPipe Tasks Vision 0.10.32 (Apache-2.0). The vision_bundle.mjs and wasm/
files are unmodified copies from the pinned @mediapipe/tasks-vision package.
Upstream: https://github.com/google-ai-edge/mediapipe

Pose Landmarker Lite float16 version 1 (Apache-2.0):
https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task
Model card source:
https://storage.googleapis.com/mediapipe-assets/Model%20Card%20BlazePose%20GHUM%203D.pdf
The extracted model card and Apache license are included alongside this notice.

During the test phase the diagnostic starts enabled when the camera is ready, and draws only confident human head, torso, arm, leg
joints and wrist dots. Game art fades during diagnosis; it is never an input
to the pose model. Visible arms can be drawn even when hips are offscreen. It does not supply game input or infer camera distance.
2–3 m is a starting suggestion; actual framing depends on lens, height and group.

All camera processing is on the device. No uploads, remote model/CDN requests,
telemetry or body images stored. The local iframe isolates model/WASM fetches
from the main app's connect-src 'none' policy. Its own policy permits local
asset loading and WebAssembly, with no remote connections. Model/runtime assets
(~28.5 MB) load when the active camera view opens during this test phase; Hide wireframe disables tracking. The core shell retains
its 3 MB budget. Offline caching stores these optional files only after use;
a first-ever diagnostic needs access to the local static site files.

The enabled choice carries from setup into gameplay. A Show/Hide wireframe
button in games controls the diagnostic without restarting the camera. The
runtime stops when the active camera view is left, unavailable, or disabled.
Low-confidence joints are omitted; a stale camera frame clears the drawing.
Hand dots represent pose-estimated wrists, not finger or hand-shape tracking.
Real webcam/multi-person tracking quality still needs physical validation.

WebGL is required for image preprocessing even with CPU model inference.
Unsupported initialization shows an unavailable message and leaves Play usable.

Same-frame rendering: each result is paired with its captured camera image,
committed before paint. Only the latest frame is retained in memory, never saved
or uploaded. The matched image sits behind gameplay; hiding tracking restores
the underlying live video. Independent IMAGE-mode detection avoids temporal
smoothing in single-person VIDEO mode. Reference for that upstream behavior:
https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/cc/vision/pose_landmarker/pose_landmarker_graph.cc
The diagnostic can run at a lower frame rate than the source video. Neither
pixel correspondence nor photo-based tests prove physical webcam pose accuracy.

Silk Squad / shared ready-check extension (2026-11-16)

Hand Landmarker float16 version 1 (Apache-2.0), unmodified:
https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
Official model/landmark documentation:
https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker
The existing Apache license covers these bundled MediaPipe model/runtime files.
The hand model adds about 7.8 MB; optional pose + hand assets total 36.3 MB.
No new npm dependency was added. Models are served from this app, never a CDN
at runtime. Offline use requires loading these optional files while online first.

Pose wrists now support the shared five-second ready buttons. In Silk Squad,
Hand Landmarker supplies actual finger landmarks, matched to pose wrists for
player ownership; normalized open-to-pinch edges drive casts. The diagnostic
wrist dots alone still do not infer finger gestures. Hiding the sticks does not
stop the pose/hand models needed for Silk Squad or an active ready check.
Hands and pose are measured on the same captured frame, retained only in memory.
No recordings, uploads or raw-image game inputs are introduced. Actual physical
hand recognition, field of view and multi-person performance need user testing.

Interaction inspiration only:
https://disneyland.disney.go.com/attractions/disney-california-adventure/web-slingers-spider-man-adventure/
All game robot art, animation, web effects and synthesized audio are original.

Silk Squad arm-motion correction (2026-11-16): the public game now uses only
Pose Landmarker. Shoulder-relative elbow/arm-end movement emits normalized arm
position and cast events, with jitter rejection, reacquisition and cooldowns.
No finger shapes, pinch recognition or hand-model requests are used by Silk Squad.
The optional hand model/runtime support remains preserved for future precision
input; it is not initialized by this game. The five-second wrist-ready check
continues to use pose observations. Physical motion feel remains unverified.
