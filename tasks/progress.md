# Progress

## T01 — done (2026-11-14)

- Added a client-only Vite + React + strict TypeScript scaffold with a Phaser
  welcome scene and lifecycle-safe React host.
- Added pinned dependencies and scripts for `typecheck`, `lint`, `test`, and
  `build`, plus an accessible baseline shell and local development instructions.
- Added two Vitest/Testing Library checks covering the visible application/game
  host and Phaser cleanup on unmount.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (1 file, 2 tests passed), and `npm run build` all exited successfully.

Outstanding risk: Phaser currently produces a large-bundle advisory during the
successful Vite build; route/scene code splitting should be considered when the
gameplay surface grows. T01 does not use a webcam, so no physical hardware
validation was performed or claimed.

Physical camera verification remains required at milestone gates; simulation is
not sufficient.

## T02 — done (2026-11-14)

- Replaced the scaffold screen with a responsive homepage containing the four
  specified destinations: Quick Play, Game Catalog, Tournament, and Settings.
  Future flows are explicitly labelled `Coming soon` rather than presented as
  working navigation.
- Added reusable hand-drawn SVG icon primitives and an original, locally
  rendered crayon-style hero illustration. Added paper texture, uneven outlines,
  sticker treatments, and responsive four-, two-, and one-column layouts without
  external artwork or font dependencies.
- Included visible keyboard focus, semantic heading structure, strong text
  contrast, decorative-art hiding, and a reduced-motion media query.
- Added homepage tests for the core message, privacy promise, specified
  destinations, unavailable states, internal call-to-action, and decorative SVG
  accessibility behavior.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (1 file, 3 tests passed), and `npm run build` all exited successfully.

Outstanding risk: responsive behavior is covered structurally through CSS media
queries but does not yet have browser screenshot tests; Playwright is scheduled
for T10. T02 does not use a webcam, so no physical hardware validation was
performed or claimed.

## T03 — done (2026-11-14)

- Added the exact ordered set of all 32 games from the specification as typed,
  centralized catalog data, including rules, mechanic category, input kind,
  difficulty, mode, and 1–4-player support.
- Added responsive catalog browsing with text search and category, difficulty,
  player-count, and availability controls. Availability is intentionally fixed
  to `Coming soon` because no minigame has passed its later implementation and
  validation task.
- Added hash-based navigation from the homepage to the catalog and to a detail
  view for every game. Detail views include procedural local artwork, rules,
  mode, difficulty, supported players, and a disabled start control with an
  explicit validation explanation.
- Added automated checks for the exact catalog order and uniqueness, honest
  availability, all 32 detail links, filtering, detail metadata, disabled start
  behavior, and decorative-art accessibility.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (1 file, 5 tests passed), and `npm run build` all exited successfully.

Outstanding risk: responsive catalog behavior is covered through CSS and DOM
tests but not browser screenshots; Playwright remains scheduled for T10. T03
does not use a webcam, so no physical hardware validation was performed or
claimed.

## T04 — done (2026-11-14)

- Added a browser-native `CameraSource` boundary under `src/camera` that owns a
  single video stream, requests constrained video without audio, supports an
  exact selected device, reports video inputs, listens for track disconnection,
  and releases every track on restart or teardown.
- Added a responsive, accessible camera setup route reached from Quick Play.
  Permission is requested only after pressing Start camera; the flow includes
  named device selection, a CSS-mirrored preview, privacy and lifecycle copy,
  retry guidance for denied/missing/busy/unsupported failures, disconnect
  recovery, and a no-hardware demo mode.
- Added synthetic unit and component coverage for permission gating, exact
  device constraints, audio exclusion, camera enumeration, stream replacement
  and cleanup, mirrored-ready presentation, actionable failure states, demo
  mode, and track-end recovery.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (3 files, 10 tests passed), and `npm run build` all exited successfully.

Outstanding risk: tests use mocked media devices and streams. Real permission
prompts, camera labels, framing, lighting, disconnection behavior, and browser
compatibility have not been physically verified. T04 remains marked
`needs_hardware_validation: true` and `hardware_verified: false`; no physical
webcam validation is claimed.

## T05 — done (2026-11-14)

- Added typed normalized camera-zone and game-viewport models for all supported
  player counts. Default camera regions are side-by-side for 1–4 people, while
  game viewports remain independently defined as fullscreen, side-by-side, or a
  2 × 2 grid with the fourth tile unused for three players.
- Added mirrored raw-camera to player-local coordinate mapping with explicit
  out-of-zone rejection, stable boundary handling, and constrained adjustable
  zones that remain inside the normalized frame.
- Extended camera setup with accessible 1–4 player selection, color-and-label
  zone overlays, per-player left/top/width/height controls, and a separate game
  viewport preview. Changing player count restores sensible default regions.
- Added unit and component coverage for every layout, mirrored coordinates,
  edges, custom subregions, invalid edit constraints, four-player controls, and
  separation between camera zones and viewport tiles.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (4 files, 15 tests passed), and `npm run build` all exited successfully.

Outstanding risk: automated tests use geometry and mocked camera controllers.
Real multi-person framing, mirroring feel, occlusion, wide-angle coverage, and
zone usability have not been physically verified. T05 remains marked
`needs_hardware_validation: true` and `hardware_verified: false`; no physical
webcam validation is claimed.

## T06 — done (2026-11-14)

- Added a browser-native, low-resolution `MotionProcessor` boundary that accepts
  RGBA frames and camera zones, then applies frame differencing, temporal
  smoothing, neighborhood denoising, a sensitivity-controlled threshold, and an
  ambient-noise floor estimated during recalibration.
- Added player-local `MOTION_HIT` events containing normalized coordinates,
  confidence, and timestamps. Motion is summarized independently for every
  configured camera zone, with per-player debounce and no raw camera access in
  game code.
- Added a deterministic synthetic frame simulator that runs through the same
  processor as webcam frames, plus live per-player motion meters, sensitivity
  and recalibration controls, and an optional pixel-mask debug overlay showing
  zones, threshold, processing FPS, and current hit count.
- Added automated coverage for denoising, thresholds, calibration, player-zone
  isolation, normalized coordinates, debounce, repeatable simulation, and the
  calibration/debug UI.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (5 files, 19 tests passed), and `npm run build` all exited successfully.

Outstanding risk: all motion behavior was validated with generated frames and
mocked media streams. Physical webcam motion feel, background flicker rejection,
lighting changes, processing latency, framing, and browser compatibility have
not been physically tested. T06 remains marked `needs_hardware_validation: true`
and `hardware_verified: false`; no physical webcam validation is claimed.

## T07 — done (2026-11-14)

- Added a deterministic, framework-independent `GameSession` boundary with
  explicit idle, countdown, playing, paused, and results states. A monotonic
  shared clock drives configurable countdown and round durations without
  coupling game logic to camera or media APIs.
- Added isolated score storage for each of 1–4 players. Score changes are
  accepted only during active gameplay, support penalties, reject unknown
  players and invalid values, and reset cleanly for replay.
- Added automated coverage for exact timing boundaries, pause/resume during
  countdown and gameplay, score isolation, inactive-state score rejection,
  replay/reset behavior, immutable prior snapshots, invalid transitions, and
  monotonic timestamp enforcement.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (6 files, 24 tests passed), and `npm run build` all exited successfully.

Outstanding risk: T07 is a logic-only session layer and is not yet wired to a
playable minigame; that integration belongs to T08. No webcam behavior was
changed or physically validated, and no hardware validation is claimed.

## T08 — done (2026-11-14)

- Added a deterministic, camera-independent Bubble Battle model that consumes
  only normalized `MOTION_HIT` events. It uses the shared `GameSession` for the
  three-second countdown, 60-second round, isolated one-player score, results,
  and replay lifecycle.
- Implemented floating bubble and bomb targets, overlap hit detection, +10
  bubble scoring, −15 bomb penalties, target consumption, confidence gating,
  and safe handling of asynchronously delivered motion-event timestamps.
- Added a responsive crayon play surface with clear score/time/rules/status,
  results and replay controls, plus mouse/touch input translated into the same
  generic motion event shape. No minigame code reads camera pixels or media APIs.
- Connected the game to the existing camera calibration and deterministic demo
  flow while retaining the live capture element during gameplay. The catalog
  now truthfully exposes Bubble Battle for one player only; all other games and
  multiplayer Bubble Battle remain unavailable.
- Added model coverage for timing, deterministic spawning, scoring, penalties,
  misses, confidence/player rejection, consumed targets, results cleanup, and
  delayed event delivery. Added UI coverage for catalog availability and launch
  from simulated motion setup.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (7 files, 31 tests passed), and `npm run build` all exited successfully.

Outstanding risk: automated coverage uses deterministic events, generated
frames, and mocked media streams. Real webcam hit feel, lighting/background
noise behavior, latency, framing, and browser compatibility were not physically
tested. T08 remains `needs_hardware_validation: true` and
`hardware_verified: false`; no physical webcam validation is claimed. Two-player
Bubble Battle is intentionally deferred to T09.

## T09 — done (2026-11-14)

- Extended Bubble Battle to one or two players while preserving the input
  boundary: the game consumes only player-local normalized `MOTION_HIT` events
  and remains independent of camera and media APIs.
- Added player-owned targets, isolated hit detection, scores, bomb penalties,
  and feedback. Each player receives targets in an independent side-by-side
  viewport while both share the same countdown and round clock.
- Added competitive results that identify a winner or tie, show both final
  scores, and reset both players' targets, feedback, timing, and scores on
  replay. Mouse/touch fallback is scoped to the selected player's viewport.
- Enabled one- and two-player setup and catalog availability while continuing
  to gate three- and four-player Bubble Battle for the later milestone.
- Added automated model coverage for cross-player target and score isolation,
  independent spawning, penalties, results timing, and replay reset, plus UI
  coverage for launching and rendering both player viewports.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test`
  (7 files, 34 tests passed), `npm run build`, and `git diff --check` all exited
  successfully.

Outstanding risk: automated coverage uses deterministic normalized events,
generated frames, mocked media streams, and DOM rendering. Physical two-person
camera framing, occlusion, lighting/background noise behavior, hit feel, input
latency, and browser compatibility were not tested. T09 remains
`needs_hardware_validation: true` and `hardware_verified: false`; no physical
webcam validation is claimed.

## T10 — done (attempt 4, 2026-11-14)

- Added Playwright configuration and a `test:e2e` script that runs the built
  client without a backend or external service.
- Added five browser scenarios covering catalog/detail gating, interaction-only
  camera requests, mocked stream selection and cleanup, actionable permission
  denial, deterministic synthetic-frame motion/debug output, two-player layout,
  countdown, and isolated pointer scoring.
- The media fixture supplies a local canvas-backed `MediaStream`; gameplay still
  receives only generic motion events and remains independent of media APIs.
- Installed Playwright's matching Chromium revision, corrected the test harness
  to run the built application from a local Vite preview origin, and made the
  moving-target pointer fixture wait until its bubble is actually inside the
  player viewport.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (7
  files, 34 tests), `npm run build`, `npm run test:e2e` (5 Chromium scenarios),
  and `git diff --check` all exited successfully.

Outstanding risk: these browser scenarios use mocked media streams and
deterministic synthetic motion. They do not validate physical webcam framing,
lighting, motion feel, latency, or browser camera permissions, and no hardware
validation was performed or claimed.

## T11 — done (2026-11-15)

- Extended Bubble Battle from two players to all supported 1–4 player counts.
  Three and four players use the specified 2 × 2 game layout while calibrated
  camera zones remain independent and continue producing player-local events.
- Preserved isolated targets, scores, penalties, feedback, results, and replay
  for every player. The catalog and detail view now accurately advertise 1–4
  player availability.
- Kept a mirrored live-camera surface visible beneath translucent game boards
  during real-camera play; demo mode retains its camera-free presentation. The
  camera stream remains owned by `CameraSetup`, and the minigame still consumes
  only generic normalized input events.
- Bounded spawn catch-up to the seven-target-per-player cap and reduced React
  snapshot rendering from 60 to approximately 30 updates per second, avoiding
  unnecessary long-round work while maintaining the shared clock.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (7
  files, 37 tests), `npm run build`, and `npm run test:e2e` (6 Chromium
  scenarios) all exited successfully.

Outstanding risk: the reported physical-camera disappearance and roughly
30-second crash could only be reproduced and guarded with mocked streams,
synthetic timing gaps, and browser automation. Real multi-person framing,
camera visibility, motion feel, sustained hardware performance, occlusion, and
lighting remain unverified. T11 remains `needs_hardware_validation: true` and
`hardware_verified: false`; a person must validate these behaviors with the
actual webcam.

## T11A — done, revised after user review (attempt 2, 2026-11-15)

- Added this user-authorized backlog item immediately after T11 to align the
  homepage with the supplied Motion Play crayon menu reference without
  reordering or implementing T12.
- Rebuilt the opening composition around a centered multicolor “Motion Play!”
  title, outlined 1–4-player banner, warm near-white paper, and four large
  yellow, purple, blue, and green menu tiles in the reference order.
- Added original local camera/player callouts and retained the existing
  procedural SVG illustration at low contrast. The shared generated bitmap is
  a design reference only and is not embedded or hotlinked in the application.
- Preserved semantic headings, keyboard focus, readable contrast, reduced
  motion behavior, responsive two-column mobile cards, honest coming-soon
  labels, and all existing navigation.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (7
  files, 37 tests), `npm run build`, `npm run test:e2e` (6 Chromium scenarios),
  and `git diff --check` all exited successfully. A 1200 × 800 local Chromium
  screenshot was also inspected for composition and clipping.

Outstanding risk: the procedural SVG behind the title deliberately echoes the
reference composition rather than reproducing the generated children, rainbow,
flowers, or lettering pixel-for-pixel. Mobile behavior is covered by responsive
CSS and DOM tests but has not received a physical-device visual review.

User review rejected the first pass as visually too clean and unlike the
supplied crayon illustration. The second pass therefore replaced the faded
generic hero art and polished cards with a purpose-built, edge-to-edge SVG/CSS
scene: a rough yellow cloud around the title, smiling sun, hatched clouds,
six-stroke rainbow, hand-drawn children, flowers, grass, stars, doubled uneven
outlines, and visibly scribbled menu fills. Conventional homepage chrome,
descriptions, and browse labels were removed so the four illustrated controls
remain dominant. The revised 1200 × 800 render was visually inspected, and all
37 unit/component tests, the production build, and all 6 Chromium scenarios
continued to pass. The artwork remains original code-native SVG and does not
embed the supplied bitmap.

## T12 — done (2026-11-15)

- Added a framework-independent `DwellController` that turns repeated generic
  player-local motion samples into deliberate menu choices. Player 1 controls
  the menu by default; other players are ignored.
- Implemented the specified 1.2-second dwell, cancellation when motion leaves a
  target or continuity is lost, and a 750 ms post-activation cooldown to avoid
  duplicate choices.
- Added a large three-choice overlay to the calibrated camera preview for Play,
  Recalibrate, and Home, with conic progress rings and concise usage guidance.
  It consumes normalized input events and does not access camera frames or
  media APIs.
- Kept every action as a semantic native button, providing mouse, touch,
  keyboard, visible focus, and screen-reader fallback independent of motion.
- Added controller tests for timing boundaries, target changes, leaving,
  continuity loss, player isolation, and cooldown, plus component coverage for
  focus and pointer activation.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (8
  files, 42 tests), `npm run build`, `npm run test:e2e` (6 Chromium scenarios),
  and `git diff --check` all exited successfully.

Outstanding risk: real-camera dwell comfort, accidental activation rate, and
the practical 1.2-second timing need human validation under varied lighting and
movement. Automated coverage uses normalized synthetic motion events and does
not claim physical webcam validation.

## T13 — done (2026-11-15)

- Added a seven-second optional practice screen before Bubble Battle with clear
  rules, one preview zone per player, automatic progression, Start now, and Back
  to setup routes.
- Added visible Pause and Exit controls during play. Pausing preserves the
  countdown/round clock, scores, targets, and feedback; Resume continues from
  the saved time rather than restarting.
- Pauses automatically when the browser tab becomes hidden and requires an
  explicit resume after returning. Added browser coverage for this lifecycle.
- Keeps the game mounted when the camera track disconnects or live frame
  processing stops for three seconds. The pause dialog offers Reconnect camera;
  a successful reconnect restores the mirrored gameplay feed and resumes the
  same round without losing scores.
- Tracking-loss detection is based on missing processed frames, not a player
  standing still, avoiding false tracking-loss claims from ordinary inactivity.
- Hardened the Bubble Battle model against sub-millisecond differences between
  animation-frame timestamps and `performance.now()` during asynchronous pause
  and reconnect events while retaining the strict shared session clock.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (8
  files, 44 tests), `npm run build`, `npm run test:e2e` (6 Chromium scenarios),
  and `git diff --check` all exited successfully.

Outstanding risk: automated reconnect coverage uses mocked streams, and frame
loss uses the browser processing watchdog. Physical disconnection, camera
reacquisition, lighting loss, and multi-person tracking still require human
webcam validation; no hardware verification is claimed.

The user supplied `/Users/conve/Downloads/motion-play-assets.zip` during this
task. It was deliberately not imported because T13 is a lifecycle/recovery
task and the repository permits only one backlog task per invocation. The
archive remains available for a later user-authorized UI asset integration.

## T13A — done (2026-11-15)

- Added this user-authorized task immediately after T13 and integrated every
  supplied visual from `/Users/conve/Downloads/motion-play-assets.zip`: paper
  texture, title cloud, sun/cloud group, rainbow, left/right children, and four
  colored crayon menu panels.
- Converted the 46 MB source PNG set into dimension-appropriate transparent
  WebP files totaling about 2 MB. All assets are bundled locally by Vite; there
  are no runtime hotlinks, remote requests, or external image dependencies.
- Replaced the procedural hero scene and CSS panel fills with the supplied
  artwork while retaining real semantic headings, links, button names, focus
  behavior, responsive layout, and screen-reader-hidden decoration.
- Kept existing SVG menu icons and HTML camera/player callouts because the ZIP
  did not include the separately requested icon or callout assets.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (8
  files, 44 tests), `npm run build`, `npm run test:e2e` (6 Chromium scenarios),
  and `git diff --check` all exited successfully. A 1200 × 800 Chromium render
  was inspected after integration for loading, layering, and clipping.

Outstanding risk: the generated raster assets increase the initial homepage
payload by about 2 MB and should receive a slower-device loading review. The
icons and lower callouts remain code-rendered and will not exactly match the
generated crayon medium unless the user supplies those missing assets.

## T14 — done (2026-11-15)

- Added a deterministic, camera-independent Window Wipe model that accepts only
  generic normalized `MOTION_BRUSH` events. Camera motion samples are adapted at
  the setup boundary; the minigame does not access video frames or media APIs.
- Implemented an independent 10 × 6 cleaning grid for each of 1–4 players.
  Brush traces clear nearby cells, award points only for newly cleaned cells,
  reject low-confidence/wrong-kind input, and preserve player isolation.
- Added synchronized countdown/round timing, per-player completion percentages,
  early completion when all windows are clean, results, and replay.
- Added responsive translucent window boards, visible smudges, pointer-drag
  fallback, game-specific practice instructions, and direct catalog detail →
  Window Wipe setup routing.
- Added a setup game selector while retaining Bubble Battle as Quick Play's
  default. The catalog now truthfully marks exactly Bubble Battle and Window
  Wipe playable; the other 30 entries remain Coming soon.
- Added model coverage for brush accumulation, no duplicate score, input-kind
  and confidence gates, pause preservation, and player isolation. Added UI and
  browser coverage that launches Window Wipe through demo mode and verifies a
  deterministic pointer brush increases cleaning progress.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (9
  files, 49 tests), `npm run build`, `npm run test:e2e` (7 Chromium scenarios),
  and `git diff --check` all exited successfully.

Outstanding risk: synthetic brush traces and pointer input cannot validate real
webcam scrubbing feel, background noise, reach, or fatigue. Physical camera
behavior remains unverified and no hardware verification is claimed.

## T15 — done (2026-11-15)

- Added a deterministic, camera-independent Whack-a-Mole model that consumes
  only generic normalized `HIT` events; the minigame has no camera or media API
  dependency.
- Implemented independent 3 × 3 boards for 1–4 players, seeded mole spawning,
  hit expiry, confidence and input-kind gates, isolated scoring, timed rounds,
  results, and replay.
- Added an accessible crayon-style mole board with pointer fallback, per-player
  instructions and score displays, game-specific practice guidance, setup game
  selection, and catalog detail routing.
- Marked Whack-a-Mole playable only after model, component, and browser
  simulation coverage passed. The catalog now truthfully exposes three playable
  games and keeps the remaining 29 entries gated as Coming soon.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (10
  files, 54 tests), `npm run build`, and `npm run test:e2e` (8 Chromium
  scenarios, including launching Whack-a-Mole and scoring a visible mole) all
  exited successfully.

Outstanding risk: synthetic hit events and pointer interaction cannot validate
real webcam hit accuracy, reach, lighting tolerance, or multi-player tracking.
Physical camera behavior remains unverified and no hardware verification is
claimed.

## T16 — done (2026-11-15)

- Added a deterministic Balloon Panic model that consumes only normalized
  `MOTION_HIT` events and has no camera/media dependency.
- Implemented called-color targets, 10-point correct hits, 5-point wrong-color
  penalties, expiring balloons, independent 1–4 player boards and scores,
  synchronized timing, results, replay, and pointer fallback.
- Added accessible crayon-style balloon boards, color names in addition to
  color cues, game-specific practice guidance, catalog/setup routing, and
  truthful availability updates.
- Added model coverage for deterministic spawning/expiry, correct and incorrect
  scoring, one-time hits, confidence/input-kind gates, and player isolation.
  Browser coverage launches the game through demo mode and scores the called
  color. Also made the existing Whack-a-Mole browser score assertion resilient
  to valid synthetic events occurring before its deliberate pointer hit.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (11
  files, 58 tests), `npm run build`, and `npm run test:e2e` (9 Chromium
  scenarios) all exited successfully.

Outstanding risk: the user reported that real motion capture is not working.
T16 validates only the game/input-event boundary and synthetic motion path; it
does not establish that a physical webcam produces usable hits. The ordered
backlog had no pending camera-defect task and repository instructions prohibited
inserting or skipping work in this invocation. Real webcam capture remains
unverified and needs a dedicated backlog task before any hardware claim.
