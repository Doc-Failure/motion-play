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
