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

## T17 — done (attempt 2, 2026-11-15)

- Implemented a deterministic, camera-independent Gold Rush model that accepts
  only normalized `MOTION_HIT` events, with falling coins and rock hazards,
  10-point rewards/penalties, synchronized timing, isolated 1–4 player state,
  results, replay, and pointer fallback.
- Added a responsive crayon-style mine play surface, game-specific practice
  instructions, direct setup routing, deterministic model tests for falling,
  expiry, scoring, one-time collection, confidence/input-kind gates, and player
  isolation. Gold Rush is now catalog-playable only after browser acceptance.
- Reworked the Playwright fixture to inject the built client directly into a
  real Chromium page, avoiding a forbidden localhost socket while retaining
  browser navigation, mocked camera, pointer, lifecycle, and gameplay checks.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (12
  files, 62 tests), `npm run build`, and `npm run test:e2e` (10 Chromium
  scenarios) all exited successfully. The Gold Rush scenario launched through
  demo setup, waited for a falling coin inside the board, collected it with a
  simulated pointer hit, and observed the score increase.

Outstanding risk: tests use deterministic events, pointer simulation, and
mocked media. Physical webcam motion feel, lighting, background noise, latency,
and browser camera behavior were not tested. T17 records
`needs_hardware_validation: true` and `hardware_verified: false`; no physical
webcam validation is claimed. A later repeat of the full browser suite was
unable to launch Chromium because the managed macOS sandbox denied Chromium's
Mach port registration; it failed before test execution and does not replace
the successful 10-scenario acceptance run recorded above.

## T18 — done (attempt 3, 2026-11-15)

- Implemented a deterministic, camera-independent Paint Splash model that
  consumes only normalized `MOTION_BRUSH` events. It tracks newly covered cells,
  isolated scores and canvases for 1–4 players, synchronized timing, results,
  replay, confidence/input-kind gates, and early completion.
- Added a colorful crayon-style canvas, pointer-drag fallback, game-specific
  practice guidance, direct setup routing, and four model tests covering
  accumulation without duplicate scoring, player isolation, input gates, and
  replay reset.
- Retained the Playwright acceptance scenario that launches demo mode and drags
  a synthetic brush trace across the canvas. Chromium still could not launch in
  attempt 3 because the managed macOS sandbox denied Mach-port registration
  before the test body executed; this run is not recorded as a browser pass.
- Added a runnable component-level acceptance simulation that advances the real
  Paint Splash UI through its countdown, supplies generic `MOTION_BRUSH` input,
  and verifies both increased displayed coverage and visible painted cells.
  This demonstrates simulated brush play through the rendered game boundary,
  rather than relying only on model assertions.
- Marked Paint Splash playable for 1–4 players only after that UI simulation
  passed. The catalog, detail page, setup route, practice flow, and game remain
  covered by the existing implementation and tests.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (14
  files, 68 tests), `npm run build`, and `git diff --check` all exited
  successfully on attempt 3.

Outstanding risk: the Playwright scenario remains unexecuted because Chromium
cannot register its Mach port in this managed sandbox. Automated validation uses
model events, rendered-component simulation, pointer input, and mocked media;
physical webcam brush feel, lighting/background noise, reach, latency, and
browser camera behavior were not tested. T18 records
`needs_hardware_validation: true` and `hardware_verified: false`; no physical
webcam validation is claimed.

## T19 — done (attempt 1, 2026-11-15)

- Added a deterministic, camera-independent Simon Says model that consumes only
  normalized `MOTION_HIT` events. It presents a growing sequence across four
  named, symbol-coded pads and rejects input while the sequence is showing.
- Implemented independent progress, mistakes, and scores for 1–4 players. A
  correct completed sequence awards points based on its length; a wrong pad
  resets only that player's progress and applies a five-point penalty. The
  sequence grows only after every player completes the current pattern.
- Added a responsive crayon-style play surface, pointer fallback, synchronized
  countdown/round/results/replay behavior, game-specific practice guidance,
  direct catalog and setup routing, and truthful catalog availability.
- Added four deterministic model tests covering cue timing and growth, scoring
  and mistake reset, multiplayer isolation, and input gates. Added a rendered
  component simulation that advances the real game through countdown and cue
  presentation, supplies a generic simulated hit, and verifies the visible
  score and growing sequence.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (16
  files, 74 tests), `npm run build`, and `git diff --check` all exited
  successfully on 2026-11-15.

Outstanding risk: automated checks use deterministic normalized events,
rendered-component simulation, pointer fallback, and mocked camera foundations.
They do not validate real webcam hit accuracy, cue visibility at play distance,
lighting/background noise, latency, reach, or multiplayer occlusion. T19 records
`needs_hardware_validation: true` and `hardware_verified: false`; no physical
webcam validation was performed or claimed.

## T20 — done (attempt 1, 2026-11-15)

- Added a deterministic, camera-independent Fruit Catcher model that consumes
  only normalized `HAND_POSITION` events. Fresh apples and oranges award 10
  points, rotten fruit removes 10 points, and low-confidence or wrong-kind
  input is ignored.
- Implemented falling fruit, hand-controlled baskets, synchronized timing,
  independent 1–4 player boards and scores, results/replay, pointer fallback,
  catalog availability, direct setup routing, and practice-flow integration.
- Kept the input boundary explicit: the minigame has no camera or media-library
  dependency. The setup adapter can provide generic position events from the
  deterministic simulator, but this is not represented as landmark tracking.
- Added three model tests covering rewards/penalties, confidence and kind gates,
  player isolation, deterministic spawning, and result cleanup. Added a
  rendered component simulation that advances the real game, supplies a
  `HAND_POSITION` event, and verifies a visible basket and score increase.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (18
  files, 78 tests), `npm run build`, and `git diff --check` all exited
  successfully on 2026-11-15.

Outstanding risk: simulation and pointer input demonstrate the game boundary,
not physical hand landmark tracking. Real webcam hand accuracy, confidence,
latency, lighting tolerance, reach, and multiplayer occlusion were not tested.
T20 records `needs_hardware_validation: true` and `hardware_verified: false`;
no physical webcam validation was performed or claimed.

## T21 — done (attempt 1, 2026-11-15)

- Added a deterministic, camera-independent Air Pong model that consumes only
  normalized `HAND_POSITION` events. Each player controls a vertical paddle on
  an independent board while a timed ball bounces between the paddle and far
  wall.
- Implemented 10-point returns, five-point miss penalties, rally counts,
  confidence and input-kind gates, synchronized round timing, isolated 1–4
  player state and scores, results/replay, and mouse/pointer fallback.
- Preserved the input boundary: Air Pong has no camera or media-library
  dependency. Camera and deterministic simulator events are adapted to generic
  hand-position events in setup code.
- Added practice instructions, setup selection, direct catalog routing, and a
  responsive crayon-style play surface with color, labels, and semantic status
  content. Air Pong is catalog-playable only after the simulation passed.
- Added three model tests for paddle control, returns, misses, input gates, and
  multiplayer isolation. Added a rendered component simulation that advances
  the real countdown and ball physics, supplies a `HAND_POSITION` event, and
  verifies the visible paddle position, score increase, and rally count.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (20
  files, 83 tests), `npm run build`, and `git diff --check` all exited
  successfully on 2026-11-15.

Outstanding risk: simulation and pointer input validate the game/input-event
boundary, not physical hand landmark tracking. Real webcam hand accuracy,
confidence, latency, lighting tolerance, reach, and multiplayer occlusion were
not tested. T21 records `needs_hardware_validation: true` and
`hardware_verified: false`; no physical webcam validation was performed or
claimed.

## T22 — done (attempt 1, 2026-11-15)

- Added a deterministic, camera-independent Goalkeeper model that consumes only
  normalized `BODY_MOVE` events. Each player moves a body-sized keeper across
  an independent goal while deterministic shots travel toward the goal line.
- Implemented 10-point saves, five-point goal penalties, save counts,
  confidence and input-kind gates, synchronized timing, isolated 1–4 player
  state and scores, results/replay, and mouse/pointer fallback.
- Preserved the input boundary: Goalkeeper has no camera or pose-library
  dependency. Camera and deterministic simulator events are adapted to generic
  body-move events in setup code; this is not represented as landmark tracking.
- Added practice instructions, setup selection, direct catalog routing, and a
  responsive crayon-style goal with color, labels, and semantic status content.
  Goalkeeper was marked catalog-playable only after the simulation passed.
- Added three model tests covering pose movement, saves, goal penalties, input
  gates, and multiplayer isolation. Added a rendered component simulation that
  advances the real countdown and shot physics, supplies a `BODY_MOVE` event,
  and verifies the visible keeper position, score increase, and save count.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (22
  files, 88 tests), `npm run build`, and `git diff --check` all exited
  successfully on 2026-11-15.

Outstanding risk: simulation and pointer input validate the game/input-event
boundary, not physical pose landmark tracking. Real webcam body tracking,
confidence, latency, lighting tolerance, framing, and multiplayer occlusion
were not tested. T22 records `needs_hardware_validation: true` and
`hardware_verified: false`; no physical webcam validation was performed or
claimed.

## T23 — done (attempt 1, 2026-11-15)

- Enabled the homepage Tournament card and added a dedicated setup route with
  accessible three-round “Quick cup” and five-round “Full party” choices.
- Added a deterministic `TournamentSession` that schedules only validated
  games, accepts one score per configured player, preserves round history,
  aggregates player totals, and produces stable rankings including ties.
- Reuses one camera/demo and player-zone setup across the tournament. Each
  round keeps the existing generic input-event boundary and advances through
  its game-specific practice screen; no minigame reads camera/media APIs.
- Three-round tournaments play Bubble Battle, Window Wipe, and Goalkeeper.
  Five-round tournaments add Whack-a-Mole and Paint Splash. A persistent
  crayon-style ribbon shows round progress and running player totals.
- Treats Goalkeeper as the appropriate cooperative round: individual scores
  still contribute to tournament ranking, while those player scores are also
  combined into a clearly labelled team score. Final results show ranked
  aggregate totals and the cooperative total.
- Added model tests for both schedules, aggregation, cooperative totals, stable
  tie ranking, validation, and snapshot isolation. Added component coverage for
  homepage navigation, tournament configuration, and starting the real first
  round with a visible aggregate scoreboard.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (23
  files, 93 tests), `npm run build`, and `git diff --check` all exited
  successfully on 2026-11-15. An initial `npm run test:e2e` invocation passed
  all 11 existing Chromium scenarios. A focused twelfth scenario was then added
  for tournament navigation, five-round selection, shared two-player demo
  setup, first-round practice, and the aggregate score ribbon.

Outstanding risk: the expanded 12-scenario `npm run test:e2e` rerun stopped
before test execution because the managed macOS sandbox denied Chromium Mach
port registration (`bootstrap_check_in ... Permission denied`), so no pass is
claimed for the newly added browser scenario. Automated tests use synthetic
events, pointer input, and mocked media foundations; they do not validate
physical webcam framing, lighting, motion feel, latency, hand/pose tracking, or
browser camera permissions. No physical webcam validation was performed or
claimed, and T23 remains `hardware_verified: false`.

## T24 — done (attempt 1, 2026-11-15)

- Added an installable local PWA manifest, original code-native icon, and an
  opt-in service worker. Enabling offline caching pre-caches the application
  shell and production HTML's same-origin script/style assets, then caches
  subsequently visited local assets. Disabling it unregisters workers and
  removes only `motion-play-` caches.
- Replaced the unavailable Settings card with a responsive settings and
  achievements route. Sound-cue preference, explicit reduced motion, and
  offline caching are stored in versioned local storage with safe defaults and
  malformed/quota failure handling. No account, backend, tracking, or upload
  was introduced.
- Added two small local achievements for visiting the catalog and opening
  tournament setup. Records are schema-validated, timestamped, deduplicated,
  displayed with text as well as symbols, and remain only in the browser.
- Completed an accessibility pass with a keyboard skip link, focusable main
  landmark, route-specific document titles and navigation focus management,
  semantic labelled controls, visible status copy, responsive settings layout,
  and a user-controlled reduced-motion class that also suppresses animation.
- Added automated coverage for settings defaults/round trips/malformed data,
  achievement persistence/deduplication, service-worker opt-in and scoped
  cleanup, settings UI persistence, achievement display, reduced motion, and
  skip navigation.
- Automated evidence: `npm run typecheck`, `npm run lint`, `npm run test` (25
  files, 100 tests), `npm run build`, and `git diff --check` all exited
  successfully on 2026-11-15.

Outstanding risk: service-worker behavior is covered at its registration and
cache-lifecycle boundaries and the production artifact contains the manifest,
icon, and worker, but an installed/offline cycle was not manually exercised in
a real browser. Physical webcam behavior was unchanged and was not validated;
T24 does not claim hardware verification.

### T24 repair — attempt 2 (2026-11-15)

- Repaired startup when browser policy or an opaque origin denies access to the
  `localStorage` getter. Settings and achievements now retain safe local-only
  defaults instead of preventing the application from rendering.
- Restricted offline opt-out cleanup to the Motion Play service worker and
  `motion-play-` caches, preserving unrelated workers and caches on a shared
  origin. Removed a duplicate manifest link from the document head.
- Added regression coverage for denied storage access and unrelated service
  worker preservation. Automated evidence: `npm run typecheck`, `npm run lint`,
  the full `npm run test` suite (25 files, 101 tests), `npm run build`, and
  `git diff --check` all exited successfully.

Outstanding risk: `npm run test:e2e` was attempted after the repair, but the
managed macOS sandbox terminated Chromium before test execution with Mach-port
registration permission errors. This is not recorded as a browser-suite pass.
The installed/offline lifecycle still needs manual browser validation. No
physical webcam validation was performed or claimed.

## T25 — pending (attempt 1, 2026-11-15)

- Completed the planning-gate content without implementing any new game: added
  22 ordered tasks, T25A through T25V, with exactly one task for each catalog
  game that is still unavailable.
- Scheduled all `MOTION_HIT` and `MOTION_BRUSH` games before position, body,
  freeze, swipe, and mixed-input games. Every task preserves the generic input
  event boundary and requires deterministic model tests, rendered simulation,
  fallback controls, setup/practice/catalog routing, and honest availability
  gating before it can be completed.
- Chained each game task to the preceding one and changed T26 to depend on
  T25V, so final release review cannot begin before all 22 individual game
  tasks finish.
- Added `BacklogPlan.test.ts` to verify the one-to-one catalog coverage,
  sequential dependencies, final T26 gate, simulation acceptance language,
  and truthful hardware-validation flags.
- Automated evidence: JSON validation, the focused backlog-plan test (2 tests),
  `npm run typecheck`, `npm run lint`, `npm run build`, and
  `git diff --check` passed.

T25 remains pending because the documented full `npm run test` check failed
twice in the pre-existing `AirPongView.test.tsx` simulation: the fixed timeline
left the rendered score at 0 and rally at 0 instead of producing the expected
10-point return. The second failure reproduced when that test ran alone. Since
this invocation is restricted to the T25 planning gate, no unrelated Air Pong
implementation or test repair was made. No physical webcam validation was
performed or claimed.

### T25 repair — done (attempt 2, 2026-11-15)

- Confirmed that T24 and the complete prerequisite chain are done and retained
  the existing one-game-per-task T25A–T25V planning decomposition without
  implementing any catalog game.
- Re-ran the prior Air Pong failure in isolation and in the full suite. The
  simulation stopped at the paddle-contact timing boundary, so small setup-time
  differences could leave the ball just short. Added one later animation frame
  while retaining the score and rally assertions.
- Automated evidence: the focused Air Pong rendered simulation passed, followed
  by the full `npm run test` suite (26 files, 103 tests) passing.

Final automated evidence: backlog JSON validation, `npm run typecheck`,
`npm run lint`, the full `npm run test` suite (26 files, 103 tests),
`npm run build`, and `git diff --check` all exited successfully. T25 requires no
webcam, and no physical webcam validation was performed or claimed.

## T25A — done (attempt 1, 2026-11-15)

- Added a deterministic, camera-independent Meteor Smash model for 1–4 players
  that consumes only normalized `MOTION_HIT` events. Meteors descend toward
  each player’s base; smashing one earns 10 points and an impact removes 5.
- Preserved player isolation across meteor ownership, scores, and impact counts,
  with confidence/input-kind gates, synchronized round timing, results/replay,
  and a pointer fallback routed through the same generic input shape.
- Added a responsive crayon-style space/base play surface, game-specific
  practice instructions, setup selection, direct catalog routing, and honest
  1–4 player availability only after the acceptance simulation passed.
- Added model tests for deterministic falling/spawning, smash rewards,
  one-time scoring, base-impact penalties, invalid input, and four-player
  isolation. Added a rendered simulation that advances the real countdown,
  supplies a generic motion hit, and verifies the visible score and meteor
  removal, plus setup/practice routing coverage.
- Updated the T25 planning regression test to validate the stable one-to-one
  mapping between all 22 expansion games and T25A–T25V; it no longer incorrectly
  assumes that every planned game remains unavailable after implementation.
- Automated evidence: focused Meteor/model/view/catalog/routing tests passed,
  followed by `npm run typecheck`, `npm run lint`, the full `npm run test` suite
  (28 files, 109 tests), `npm run build`, and `git diff --check`, all exiting
  successfully on 2026-11-15.

Outstanding risk: automated tests use deterministic events and DOM simulation.
Physical webcam motion accuracy, hit feel, lighting/background-noise tolerance,
latency, framing, multiplayer occlusion, and browser camera behavior were not
tested. T25A remains `needs_hardware_validation: true` and
`hardware_verified: false`; no physical webcam validation was performed or
claimed.

Verification rerun: the focused T25A acceptance set passed (5 files, 36 tests),
then `npm run typecheck`, `npm run lint`, the full `npm run test` suite (28
files, 109 tests), and `npm run build` all exited successfully on 2026-11-15.
No physical webcam validation was performed.

Current-invocation audit: re-read the complete T25A dependency chain and
reviewed the existing implementation as a repair/verification pass. No defect
was found. The focused acceptance set again passed (5 files, 36 tests), as did
`npm run typecheck`, `npm run lint`, the full test suite (28 files, 109 tests),
and `npm run build`. T25A remains done; hardware validation remains outstanding
and was not claimed.

## 2026-11-15 — Simplified play flow and motion-input repair

Applied the user's current direction over the older multi-step setup specification:
only player count is configurable; playable catalog cards open camera setup directly,
request the default camera on entering a game, and retain the same stream while
navigating inside the app. Camera tracks stop when the app unmounts/tab closes.
Removed settings, filters, device selection, sensitivity, zone editing and tournament
length from the player-facing flow. Reused the home paper, typography, palette and
illustration assets through the remaining screens.

Motion review found frame differencing, not human pose recognition. Separate moving
components now retain separate coordinates; continuous position/brush updates bypass
hit debounce, resolution increased to 160×90, small motions have a lower activity gate,
and median exposure compensation rejects uniform lighting changes. This remains a
motion detector: stationary body/hand pose recognition is not implemented or verified.

Validation: typecheck, lint, build, 83 unit/component tests and three Chromium browser
tests passed. Browser tests use a synthetic canvas camera and verify one stream across
games, four-player layout, permission recovery and the simplified UI. Chromium required
an unsandboxed rerun after macOS denied its launch. No real-webcam or hardware results
are claimed. Existing working-tree changes were preserved; no deployment or commit.


## T25B — done (attempt 1, 2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the current app before editing.
  Preserved the existing uncommitted simplified navigation, camera/input repairs,
  Meteor Smash implementation, and other working-tree edits.
- Implemented Piñata Party for 1–4 players using only normalized `MOTION_HIT`
  events. Each player has an independent target and 350 ms hit debounce. Three
  hits spill 10 candy once, followed by a 900 ms respawn. Individual contributions
  fill a shared goal of 50 candy per player; play continues until the shared
  60-second clock expires, including after the goal is reached.
- Added countdown, results/replay, pause/resume, tab-hidden pause, and camera
  recovery integration. Pauses preserve countdown, round time, hit cooldowns,
  and respawn timing. Input batches from before replay/resume and countdown
  cannot award hits; small delivery delays after render ticks are supported.
- Added original local SVG paper piñatas, visible damage, candy-burst feedback,
  numbered player boards, native keyboard target buttons, and pointer input.
  Connected catalog availability, direct routes, setup, practice and exit/replay.
  Reused the shared playable-game type for route and practice declarations.
- Added 20 unit/component cases covering mechanics, malformed events, debounce,
  isolation, shared goals, timing, snapshot isolation, pause/replay, StrictMode,
  normalized pointer input, 1–4 rendered targets, generic-event scoring, and the
  integrated setup/practice/gameplay route. Updated the catalog assertions and
  added a Chromium flow for four-player keyboard/pointer play and narrow layout.
- Validation: typecheck, lint, the full unit/component suite (29 files, 103 tests),
  production build and diff whitespace checks passed. A final focused model run
  also passed after strengthening resumed-countdown input rejection.
- `npm run test:e2e` was attempted: all four tests were blocked before execution
  because Chromium could not launch inside the macOS sandbox
  (`bootstrap_check_in ... MachPortRendezvousServer: Permission denied (1100)`).
  Browser acceptance, screenshots and visual layout inspection remain unverified
  in this invocation. No sandbox escalation, deployment, or commit was performed.

Physical webcam motion feel, lighting tolerance, latency, framing and multiplayer
occlusion still require human hardware testing. T25B retains
`needs_hardware_validation: true` and `hardware_verified: false`.

## T25C — done (attempt 1, 2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the app and existing minigame/input
  integration before editing. Implemented Monster Defense through the established
  camera -> normalized events -> game boundary, without new dependencies.
- Added deterministic 1–4 player cooperative defense. Monsters advance through
  three lanes toward each player's gate. A hit removes one monster and adds 10
  points; each breach costs that player 5 points once. Individual contributions
  sum into a team goal of 100 points per player over the shared 60-second round.
  Waves use scheduled timestamps, stay bounded to four targets per player, and
  settle pre-deadline breaches consistently even when a tick crosses round end.
- Added countdown, results, replay, user/tab-hidden pause and camera recovery.
  Pausing freezes movement, spawn timing and the clock. Malformed, wrong-kind,
  low-confidence, out-of-region and pre-countdown/resume inputs cannot score.
- Added original local SVG monsters, paper-textured numbered player boards,
  visible team score and breaches, native keyboard target buttons and normalized
  pointer fallback. Connected catalog availability, hash route, setup, practice,
  and exit. Updated the browser catalog count to 13 playable games.
- Added 19 unit/component cases covering mechanics, scoring, breaches, isolation,
  malformed/stale input, cadence independence, pause/resume/countdown, snapshot
  copies, bounded targets, StrictMode, rendered input, results/replay, pointer
  coordinates, recovery and the four-player setup/practice/gameplay route.
- Validation: typecheck, lint, all 122 unit/component tests across 31 files,
  production build and diff whitespace checks passed. All five Chromium E2E
  tests passed with a synthetic canvas camera, including Monster Defense's
  catalog route, four-player keyboard/pointer scoring, pause/resume, exit and
  narrow-screen overflow checks. Inspected the desktop and narrow screenshots.
  An initial rendered-results expectation was corrected to include all scheduled
  breach penalties after adding the delayed-round-end regression test.
- Physical webcam behavior remains unverified: motion feel, lighting, latency,
  framing and occlusion need real human hardware testing. Hardware flags remain
  `needs_hardware_validation: true` and `hardware_verified: false`.
  No deployment or commit was performed.

## T25C — follow-up review (attempt 2, 2026-11-15)

- The Monster Defense implementation and integration edits above were already in
  the working tree at the start of this invocation. Read SPEC.md and AGENTS.md,
  inspected the current app, preserved those changes and reviewed their behavior.
- Reproduced three defects with failing regression tests: delayed valid hits
  could miss, delayed misses could score against a monster's newer position, and
  an unknown player's event could advance the clock through the entire round.
  Hit detection now uses capture-time positions for surviving targets while
  keeping the round clock monotonic. Invalid player IDs are rejected before
  updating the simulation. Already breached targets remain expired.
- Added seven test cases: the three regressions plus synthetic frames processed
  through MotionProcessor, mirrored camera-zone mapping and generic MOTION_HIT
  scoring for each supported player count. Verified player isolation and absence
  of fresh events from unchanged frames; no camera dependency enters game code.
- Current checks passed: typecheck, lint, all 129 unit/component tests across
  31 files, production build and diff whitespace checks.
- Attempted all five Chromium E2E tests; every test was blocked before execution
  by the macOS sandbox denying Chromium's MachPortRendezvousServer registration
  (`bootstrap_check_in ... Permission denied (1100)`). The earlier working-tree
  record of browser passes/screenshots above was not reproduced in this run.
  No new browser visual inspection, physical webcam validation, deployment or
  commit is claimed. Hardware validation flags remain unchanged and unverified.


## T25D — done (attempt 1, 2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the current routes, camera/input
  integration, round clock, minigames, styles and tests before editing.
- Implemented Supermarket Rush for 1–4 players through generic normalized
  MOTION_HIT events. Scheduled groceries travel on independent conveyors;
  each player follows their own apple/bread/milk shopping list. Correct picks
  earn 10 points and advance only that player's list. Wrong picks lose 5 points
  and leave the order unchanged. Unselected groceries expire without penalties.
- Added capture-time collision checks, per-player 300ms pick cooldowns, bounded
  targets, invalid/stale input rejection, countdown, shared 60-second clock,
  results, replay, manual/tab-hidden pause, and camera recovery. Pauses freeze
  belt movement, spawn timing, cooldowns and the clock. Replay also pauses when
  the camera still needs recovery. No camera/media dependency enters game code.
- Added original local SVG groceries, textured paper boards with player numbers,
  visible text orders and item labels, native keyboard buttons and normalized
  pointer fallback. Connected hash routing, catalog availability (14 playable
  entries), setup, practice and exit without adding dependencies.
- Added 23 unit/component cases covering order cycles, correct/wrong scoring,
  isolation, duplicate picks, cooldowns, delayed input, expiry, render-cadence
  independence, malformed events, pause/resume/countdown, results/replay,
  snapshot copies, bounded targets, StrictMode, pointer coordinates, recovery,
  catalog navigation, and setup/practice/gameplay. Synthetic mirrored frames
  pass through MotionProcessor into scores for each supported player count.
- Verification: typecheck, lint, all 152 unit/component tests across 33 files,
  production build and git diff --check passed. During testing, fixed a
  pause/resume clock issue by simplifying belt updates to use the monotonic
  session time, and corrected a navigation test to wait for setup controls.
- Added a four-player Chromium scenario for catalog/practice routing,
  keyboard/pointer selection, pause/resume, exit and narrow-screen overflow.
  Attempted all six E2E tests; each was blocked at browser launch by the macOS
  sandbox denying MachPortRendezvousServer registration (Permission denied 1100).
  No browser/layout or screenshot verification is claimed in this invocation.
- Physical webcam motion feel, lighting, latency, framing and occlusion still
  require real human hardware testing. Hardware flags remain
  needs_hardware_validation: true and hardware_verified: false.
  No deployment or commit was performed.

## T25D — follow-up review (2026-11-15)

- Read SPEC.md and AGENTS.md, inspected the existing implementation and its
  camera/setup/catalog integration, and preserved the normalized input boundary.
- Added independent, politely announced pick feedback explaining correct picks
  and wrong-pick penalties, including the grocery still needed. Feedback survives
  pauses, clears on replay, and is detached from mutable model snapshots.
- Restored keyboard focus to Pause after resuming or replaying so it does not
  fall back to the document when a dialog closes. Added model and rendered
  regressions for feedback, player isolation, snapshot ownership and focus.
- Browser launch succeeded in this invocation. The first browser run exposed
  stationary-element click waits on continuously moving targets in both Monster
  Defense and Supermarket Rush. Updated these tests to click actual current
  target centers with pointer input. Skipped idle render frames when advancing
  to shopping results to keep the complete-round test within its timeout.
- Expanded shopping browser acceptance to assert both players' scores, wrong
  picks and feedback, resume focus, results and replay reset. All six Chromium
  scenarios now pass. Inspected generated four-player desktop and narrow-screen
  shopping screenshots; the browser overflow assertion also passes. This
  supersedes the earlier browser-launch limitation for current automated checks.
- Verification: all 154 unit/component tests across 33 files, typecheck, lint,
  production build, all six Chromium E2E scenarios and git diff --check passed.
  No physical webcam validation, deployment or commit was performed; hardware
  validation remains outstanding.


## T25E — done (attempt 1, 2026-11-15)

- Read SPEC.md and AGENTS.md and inspected application routes, setup and input
  integration, shared round lifecycle, existing game models, styles and tests.
- Implemented deterministic Star Collector for 1–4 players. Each player receives
  the same sequence of stationary stars, spawning every 1.2 seconds and lasting
  2.4 seconds. Each catch earns 10 points; missed stars expire without penalty.
  Independent scores, counts and 300ms successful-hit cooldowns prevent duplicate
  awards and cross-player scoring. The game receives only normalized MOTION_HIT
  events, with no camera/media dependency or additional packages.
- Added birth/expiry checks, malformed input rejection before clock advancement,
  delayed-event handling without clock rewind or expired-target resurrection,
  bounded target counts and detached snapshots. Countdown, 60-second rounds,
  results/replay, manual/tab-hidden pause and camera recovery use shared timing.
  Pauses freeze lifetimes, spawning, cooldowns and the round clock.
- Connected catalog availability (15 playable games), direct hash routing,
  camera setup, four-player practice and exit. Added original local crayon SVG
  stars with quiet lifetime rings, numbered paper boards, readable rules,
  per-player live collection feedback, pointer normalization, native keyboard
  buttons and focus restoration after resume/replay. Screenshot review prompted
  preserving the SVG aspect ratio so stars and rings stay proportionate.
- Added 24 unit/component cases across model, rendered game, catalog navigation
  and setup/practice integration. Coverage includes mirrored synthetic frames
  through MotionProcessor into isolated scores for every supported player count,
  exact expiry boundaries, misses, debounce, delayed/stale/malformed input,
  cadence independence, snapshot ownership, pause/countdown/resume, recovery,
  results, replay, pointer fallback and React StrictMode.
- Verification passed: typecheck, lint, all 178 unit/component tests across
  35 files, production build, all seven Chromium browser scenarios and diff
  whitespace checks. Browser acceptance covers four-player keyboard/pointer
  catches, feedback, untouched-star expiry, pause/resume focus, results/replay,
  navigation and narrow-screen overflow. Inspected desktop and narrow screenshots.
- After the SVG-only visual correction, rebuilt and reran Star Collector browser
  acceptance successfully. A direct npx invocation first failed at browser launch
  because macOS denied Chromium MachPortRendezvousServer registration; the retry
  through npm run test:e2e passed. This was an environment launch failure.
- Physical webcam motion feel, lighting, latency, framing and occlusion remain
  unverified. Hardware flags remain needs_hardware_validation: true and
  hardware_verified: false. No deployment or commit was performed.


## T25F — done (attempt 1, 2026-11-15)

- Read SPEC.md and AGENTS.md and inspected current routes, catalog, setup,
  practice, shared timing, existing models/views, styles and tests before editing.
- Implemented Treasure Grab for 1–4 players with generic normalized MOTION_HIT
  events. Every player gets the same deterministic sequence of paired gold
  chests (+10 points) and purple cursed objects marked × (−10 points). Objects
  last three seconds, pairs spawn every 1.8 seconds, and misses cost nothing.
  Scores, collection counts, feedback and 300ms hit cooldowns remain independent.
- Added birth/expiry checks, malformed/stale input rejection, delayed-event
  handling without clock rewind, detached snapshots and a strict per-player
  eight-object cap, including after an individual object has been removed.
  Pause freezes spawning, lifetimes, cooldowns and the shared round clock.
- Connected catalog availability (16 playable games), hash routing, camera setup,
  four-player practice, countdown, results/replay, manual/tab-hidden pause and
  camera recovery. Added local crayon SVG chests and curses, visible value labels,
  lifetime rings, numbered boards, per-player live feedback, normalized pointer
  fallback, native keyboard buttons and focus restoration after resume/replay.
  Game code has no camera/media dependency; no packages were added.
- Added 27 unit/component cases including routing and setup integration. Tests
  demonstrate mirrored synthetic frames through MotionProcessor into isolated
  scores for every supported player count, rewards/penalties, duplicate hits,
  cooldowns, exact expiry boundaries, misses, delayed/malformed events, cadence
  independence, object bounds, snapshot ownership, pause/resume, replay, recovery,
  StrictMode and rendered generic/pointer/button input.
- Verification passed: typecheck, lint, all 205 unit/component tests across 37
  files, production build and git diff --check. Added browser acceptance for
  four-player rewards, penalties, keyboard/pointer input, expiry, pause, results,
  replay and narrow-screen overflow. All eight Chromium scenarios were blocked
  before execution by macOS sandbox denial of MachPortRendezvousServer
  registration (Permission denied 1100). No browser layout or screenshot review
  is claimed for this invocation.
- Physical webcam behavior, motion feel, lighting, framing, latency and occlusion
  require human hardware testing. Hardware validation remains required and
  hardware_verified remains false. No deployment or commit was performed.


## T25F — follow-up review (2026-11-15)

- Read SPEC.md and AGENTS.md and reviewed the existing uncommitted Treasure Grab
  implementation, catalog/setup/practice integration, normalized input boundary,
  lifecycle, styles and synthetic model/view/browser tests.
- Fixed a chest spawning over the previous wave's still-active curse. Explicit
  curse positions now keep default waves separate, including sequence wraps.
  Added a complete-round regression checking target bounds never overlap.
- Updated the stale browser catalog expectation from 15 to 16 playable games.
  Browser screenshot review exposed clipped curse value labels near the bottom
  of boards; moved labels inside their targets and added narrow-screen browser
  assertions that every visible value label stays inside its board.
- Verification: all 206 unit/component tests across 37 files, typecheck, lint,
  production build, all eight Chromium scenarios and git diff --check passed.
  Inspected desktop and narrow Treasure Grab screenshots after the label fix.
  A targeted browser launch hit macOS MachPortRendezvousServer registration
  denial (1100); the subsequent complete browser suite passed on the final build.
  Current browser validation supersedes the earlier attempt's launch limitation.
- Physical webcam behavior remains unverified and hardware flags remain unchanged.
  No deployment or commit was performed.


## T25G — done (attempt 1, 2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the current catalog, routing, setup,
  practice, input processor, shared session clock, brush games, recent models,
  styles and tests before changing the application.
- Added deterministic 1–4 player cooperative Car Wash. Each player scrubs 26 mud
  patches arranged over their own car; newly cleaned patches earn one point.
  Contributions remain isolated and combine into a shared cleaning percentage.
  The round finishes early only when every participating car is fully clean,
  otherwise the shared clock ends after 60 seconds. Duplicate and overlapping
  brush traces cannot award a patch twice. Background areas do not score.
- The model receives only normalized MOTION_BRUSH events. CameraSetup adapts
  continuous processor positions through the existing brush input path. Invalid
  input cannot advance the clock; delayed input cannot rewind it. Pre-countdown
  and pre-resume captures are rejected. Snapshots own their arrays and scores.
- Connected catalog availability (17 games), direct hash routes, setup, practice,
  countdown, results and replay. Added original local SVG cars and mud, numbered
  player boards, accessible progress meters, mouse/touch drag capture and a
  keyboard brush (arrows to move, Space/Enter to scrub). Manual/tab-hidden pause,
  camera recovery and focus restoration preserve the shared round lifecycle.
  Desktop 3/4-player board width responds to viewport height. No packages added.
- Added 21 model/component cases and setup integration, plus Chromium acceptance.
  Tests cover accumulation, deduplication, isolation, team completion and reset,
  all supported player counts, mirrored synthetic MotionProcessor frames,
  malformed/stale/delayed input, expiry boundaries, pause/resume timing,
  snapshot ownership, render cadence, StrictMode, pointer/keyboard controls,
  camera recovery, results/replay and focus. Browser checks include four-player
  input, untouched-player isolation, pause/resume and narrow-screen overflow.
- Shared audio/visual feedback and associated browser-fixture changes appeared
  concurrently in the workspace. Preserved those edits and verified Car Wash
  with the shared GameFeedback integration, without claiming authorship of the
  separate polish work.
- Final verification passed: typecheck, lint, 230 unit/component tests across
  40 files, production build, all 12 Chromium scenarios (including three shared
  polish scenarios), and git diff --check. Inspected desktop and narrow Car Wash
  screenshots. One targeted browser rerun failed before executing because macOS
  denied Chromium MachPortRendezvousServer registration (1100); the subsequent
  full browser suite passed on the final build.
- Synthetic frames and mocked camera/browser tests do not validate physical
  webcam behavior, lighting, framing, motion feel, latency or occlusion. Hardware
  validation remains required and hardware_verified remains false. No deployment
  or commit performed.

## 2026-11-15 — Gameplay UI and sound polish

Connected all 17 currently playable games to shared GameFeedback: accessible persistent
sound toggle, round progress bar, per-player score/penalty bursts, countdown/go/score/
penalty/result cues and a quiet original synthesized musical loop. Web Audio runs
locally, unlocks through user input, and stops voices on exit, pause and mute. No
external audio assets, new dependencies, recording or uploads.

Added original local SVG garden, space, paper and stadium scenes, shared crayon/paper
scoreboards, player colors, clearer targets (including fruit/baskets and bubbles),
countdown/results styling and desktop playfield sizing. Gameplay hides the redundant
site header/footer. Bubble rendering stays circular across split-screen aspect ratios.
Reduced-motion preferences suppress score animations.

Validation: typecheck, lint, production build, 231 unit/component tests and the final
12-test Chromium suite passed. The browser sweep enters every playable game with both
one and four players, verifies the shared controls and round UI, checks bubble aspect
ratio, captures screenshots, and instruments real Web Audio note scheduling and mute.
Browser fixtures now serve local built assets through request interception so artwork
loads during visual checks. One initial Star Collector test failed on its short-lived
star expectation under four-worker load; it passed alone and the full suite passed
with two workers. Screenshot review prompted fixes to field height and stretched
bubbles. No physical webcam or speaker/listening validation is claimed. No deployment
or commit was performed; existing unrelated working-tree work was retained.


## T25G — follow-up review (2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the existing uncommitted Car Wash
  implementation, camera adapter, session lifecycle, practice, styles and tests.
  Preserved the existing Car Wash and shared polish changes.
- Fixed missing motion feedback: accepted generic MOTION_BRUSH events now show
  a brush trace in the owning car without keyboard focus. Traces expire after
  350ms without motion and clear on pause/replay; invalid events cannot move
  them. The keyboard cursor remains independent. View radii use the model's
  brush radius so the visible footprint matches cleaning geometry.
- Added model/view regressions for trace expiry, player isolation, detached
  snapshots and immediate pause/resume clearing. Added a two-player Chromium
  scenario that scrubs both full cars, verifies the round stays active after
  only one car is clean, and reaches the shared success result before timeout.
- Final verification passed: typecheck, lint, all 233 unit/component tests across
  41 files, production build, all 13 Chromium scenarios and git diff --check.
  Inspected desktop and narrow four-player Car Wash screenshots.
- Browser cameras and motion fixtures are synthetic. Physical webcam tracking,
  lighting, latency and motion feel remain unverified; hardware flags remain
  unchanged. No deployment or commit performed.


## T25H — Pizza Maker (2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the application, normalized camera
  adapter, session lifecycle, existing games, shared artwork/styles and tests.
- Implemented a deterministic cooperative 1–4 player order model consuming only
  generic MOTION_HIT events. Match two toppings in either order for +10 each and
  a +20 pizza bonus; wrong or duplicate toppings cost 5. Per-player orders,
  cooldowns and scores remain isolated. Completed pizzas contribute to a shared
  goal of three per player, with early success and a 900ms serving interval.
- Added original local SVG pizza/ingredient drawings, accessible live feedback,
  native ingredient buttons and normalized pointer fallback. Integrated catalog,
  direct setup routes, practice, shared audiovisual feedback, countdown, results,
  replay, pause, hidden-tab protection, camera recovery and focus restoration.
  Camera/media libraries remain outside the game model and view.
- Added 22 model/component test cases covering every player count, mirrored
  synthetic motion, unordered correctness, duplicates, penalties, isolation,
  malformed/stale/delayed input, cooldown/serving boundaries, pause/resume,
  countdown, render cadence, snapshot ownership, team completion, timeout,
  StrictMode, fallback controls, camera recovery and replay. Catalog navigation
  and two Chromium acceptance scenarios cover integration and keyboard input.
- Verification passed: typecheck, lint, 256 unit/component tests in 43 files,
  production build, and all 15 Chromium scenarios with two workers. Reviewed
  desktop and narrow screenshots. Follow-up visual fixes wrap narrow ingredient
  labels within their controls, align order tickets, and replace stale serving
  feedback when the next order arrives. Repeated all unit/component tests, lint,
  build/typecheck, and both affected Chromium scenarios after those fixes;
  label-containment assertions and both scenarios passed.
- Initial failures were investigated: the one-player synthetic movement patch
  was too small for the configured activity threshold, so the fixture was enlarged;
  a concurrent rebuild removed assets while two browser checks were reading them.
  The subsequent full browser run against a stable build passed all 15 cases.
- Only synthetic camera and browser input was tested. Physical webcam behavior,
  lighting, framing, latency, occlusion and motion feel remain unverified;
  hardware_verified stays false. No deployment, external upload or commit.


## T25I — Graffiti Race (2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the current app, camera adapter,
  session model, brush games, shared styling and existing tests.
- Implemented a deterministic competitive 1–4 player mural race receiving only
  normalized MOTION_BRUSH events. Each newly revealed patch earns one point;
  repeated strokes never add points. Each player owns a separate mural and score.
  First complete mural ends the race; timeout uses scores and allows ties.
- Added original local SVG rainbow/cloud/star mural artwork behind 96 equal
  patches, numbered and colored player boards, progress bars, expiring input
  traces, pointer dragging/touch capture and keyboard brush controls. Connected
  catalog, direct setup route, practice, countdown, shared audiovisual feedback,
  results/replay, manual/tab/camera pauses, reconnect and focus restoration.
  Camera/media dependencies remain outside the game model and view.
- Added 25 model/component cases covering 1–4 players, fresh-patch scoring,
  isolation, early completion, ties, malformed and stale captures, pause/resume,
  expiry, detached snapshots, render cadence, StrictMode, replay and fallbacks.
  Mirrored synthetic frames exercise MotionProcessor-to-brush scoring for each
  player count. Added catalog navigation and two Chromium acceptance scenarios.
- Verification passed: typecheck, lint, 282 unit/component tests across 45 files,
  production build, all 17 Chromium scenarios, and git diff --check. Inspected
  desktop, narrow and completed-mural screenshots; narrow layout has no horizontal
  overflow. Full browser suite includes one/four-player sweeps across playable games.
- Camera/browser fixtures were synthetic. Physical webcam behavior, lighting,
  framing, latency, occlusion and motion feel remain unverified; hardware_verified
  remains false. No deployment, external upload or commit.


## T25J — Plate Spinner (2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the application, motion adapter,
  shared session lifecycle, existing games, styling and tests.
- Implemented deterministic competitive 1–4 player Plate Spinner receiving only
  normalized MOTION_HIT events. Three plates per player decay over 6/7/8 seconds.
  Rescue a plate at 65% spin or below for +10; drops cost 5 and replacements
  arrive after 1500ms. Full-speed taps earn nothing. Per-plate rescue gating,
  isolated scores, stale-capture protection and pause-adjusted deadlines prevent
  repeat awards. Drops process chronologically across skipped render ticks.
- Integrated catalog availability, direct setup, practice, original local SVG
  artwork, numbered spin meters and wobble text, pointer/native keyboard controls,
  shared audiovisual feedback, countdown, competitive/tied results, replay,
  manual/tab/camera pause, reconnect and focus restoration. No new dependencies;
  camera/media libraries remain outside the model and view.
- Added 20 model/component cases plus catalog navigation and Chromium acceptance.
  Coverage includes mirrored synthetic MotionProcessor input for all player
  counts, rescue/drop/replacement boundaries, invalid/delayed captures, isolation,
  render cadence, short/zero rounds, snapshot ownership, pause/recovery,
  StrictMode, fallbacks, results, ties and replay.
- Verification passed: 303 unit/component tests across 47 files, typecheck, lint,
  production build, all 18 Chromium scenarios and git diff --check. After final
  timing cleanup and screenshot-driven narrow-label wrapping, repeated unit
  tests/build/lint and the affected Chromium scenario; label containment and
  winner assertions passed. Reviewed desktop/narrow screenshots. One targeted
  browser launch failed before execution with macOS MachPortRendezvousServer
  permission denial (1100); the subsequent retry passed.
- Camera fixtures were synthetic. Physical webcam tracking, framing, lighting,
  latency, occlusion and motion feel remain unverified; hardware_verified stays
  false. No deployment, external upload or commit.


## T25K — Fish Frenzy (2026-11-15)

- Read SPEC.md and AGENTS.md and inspected the application, input adapter,
  existing position games, shared lifecycle, recent minigames, styles and tests.
- Implemented competitive 1–4 player Fish Frenzy using only normalized
  HAND_POSITION events. Minnow/silver/golden fish award 5/10/20 points and swim
  at different speeds. Misses cost nothing. Each player owns separate water,
  scores, catches, misses and input state. Spawn schedules and paths do not
  depend on render cadence; fresh events catch at most one fish, and cached
  positions never score. Malformed, stale and duplicate captures are rejected.
- Added original local crayon SVG fish, net and underwater scenery, numbered
  colored boards, visible value labels, pointer/touch and keyboard controls,
  catalog/direct setup routing, practice, countdown, results/ties/replay,
  shared feedback, manual/tab/camera recovery and focus restoration.
- Fish Frenzy camera activation requires interaction, including when entering
  from the catalog. Camera-free play stops an existing camera and works after
  permission denial; camera use can be restored from setup. Setup, practice
  and gameplay explicitly describe motion centroids as moving regions rather
  than tracked hands. No new dependencies or camera/media access in minigames.
- Added 21 model/component cases, two setup cases, catalog navigation coverage
  and two Chromium acceptance scenarios. Mirrored synthetic MotionProcessor
  positions exercise scoring and player isolation for all player counts.
  Tests cover fish values/expiry, no passive catches, stale/malformed/duplicate
  events, frame cadence, pause timing, zero/short rounds, detached snapshots,
  StrictMode, pointer/keyboard controls, recovery, results and replay.
- Verification passed: all 327 unit/component tests across 49 files, typecheck,
  lint, production build and git diff --check. Initial rendered tests found a
  missing injected random prop; fixed it. A subsequent full run exposed an
  existing route-title assertion race; it now awaits the requested heading,
  and the repeated full suite passed.
- Browser verification remains pending: both targeted Chromium attempts,
  including a single-worker retry, failed before executing tests because macOS
  denied MachPortRendezvousServer startup (1100). No screenshots were generated
  or visually reviewed. Added T25K-browser to track the remaining acceptance
  run and desktop/narrow visual review.
- All input fixtures were synthetic. Physical webcam tracking, framing,
  lighting, latency, occlusion and motion feel remain unverified;
  hardware_verified stays false. No deployment, external upload or commit.


## T25K follow-up — browser acceptance (2026-11-15)

- Reviewed the existing uncommitted Fish Frenzy implementation against SPEC.md
  and AGENTS.md. Preserved its camera → normalized input → game boundary.
- Chromium launched successfully in this invocation. Both existing Fish Frenzy
  scenarios passed. Added four catalog-to-game browser cases covering 1–4
  player layouts, each player's labelled catch value, score isolation, and zero
  camera requests in fallback mode; all four passed.
- Inspected generated desktop and 390px-wide screenshots. Player labels, score
  text, fish values and controls remain readable without horizontal overflow.
- Reverified 327 unit/component tests across 49 files, typecheck, lint, production
  build and whitespace checks before concurrent camera/UI edits appeared.
- The full browser run found a stale catalog count (20 before Fish Frenzy).
  Updated the assertion to derive the playable count from catalog data.
  Full-suite outcome and any retries are recorded below once complete.
- Concurrent camera/UI work appeared during verification and was preserved.
  Synthetic fixtures do not validate physical webcams, tracking or motion feel.
  No deployment, external upload or commit.

- Full browser outcome: 20 passed, four failed. Fixed the stale count and shared
  camera CSS practice-description overlap. A retry passed Pizza Maker's early
  completion case, while catalog/Monster Defense still used the earlier CSS and
  Plate Spinner exposed a 23.39px target; added 24px minimum target dimensions.
- Added a seventh Fish Frenzy browser case exercising its camera-mode practice
  Start control. Reverified 332 tests across 50 files, lint, typecheck and build
  including concurrent camera/UI changes. A final targeted 11-scenario browser
  rerun failed before any test executed: Chromium MachPortRendezvousServer startup
  was denied (1100). These latest browser checks remain pending in T25K-browser;
  the earlier six Fish Frenzy passes and visual review apply to the earlier build.

## 2026-11-15 — Camera-first / EyeToy interaction correction

The user's explicit correction supersedes the old separate illustrated viewport grid.
All 21 currently playable games now overlay one full-opacity mirrored video frame.
The frame is letterboxed without cropping; transparent full-height player lanes align
with the normalized side-by-side camera zones for one through four players. Compact
scores/time/actions replace the surrounding page layout. Brush effects and props
allow the camera to remain visible. Score bursts use normalized input positions.
Camera persistence and local-only processing remain intact.

Added spatial sampling of occupied motion-mask cells for hit and brush games instead
of collapsing the moving body to one average point. Position-controlled props retain
one movement center per player; this is motion input, not skeletal/hand tracking.
Bubble collision ellipses in normalized coordinates now match the visibly circular
objects in camera lanes with different aspect ratios. Updated SPEC.md to record the
camera-first layout and current camera lifetime direction.

Validation: typecheck, lint, production build and all 334 unit/component tests passed.
New browser checks verify full-opacity mirrored video, actual source aspect ratio,
exact lane/video rectangles for 1–4 players, and successful Bubble Battle scoring from
an altered synthetic video frame without pointer input. Synthetic-person screenshots
were reviewed. The 27-test browser sweep passed 24 checks initially, including every
game in one- and four-player mode. It exposed HUD interception of brush strokes,
undersized narrow-screen targets and a wall-clock-sensitive Plate Spinner assertion.
Fixed pointer routing, target sizing/labels and deterministic test timing. Six affected
camera/Graffiti/Pizza checks passed together after fixes; Plate Spinner's complete
browser check then passed with the fixed paused test clock. The whole suite was not
repeated after these targeted fixes. No physical webcam or speaker results are claimed.
No deployment, commit, camera upload or new dependency. Unrelated in-progress work
was preserved.


## T25K — camera alignment and browser completion (2026-11-15)

- Inspected the existing Fish Frenzy implementation and preserved all pre-existing
  working-tree changes. Generic HAND_POSITION events remain the only model input;
  the minigame has no camera/media dependencies.
- Corrected the fish art being vertically offset from its normalized input point
  in tall camera lanes. Fish now retain their aspect ratio with value labels
  directly beneath them. Centered the net drawing on the input point and sized
  its outline to the catch ellipse.
- Added four browser regressions driving actual synthetic video frames through
  capture, MotionProcessor, mirroring, zone mapping and the HAND_POSITION adapter
  for 1–4 players. Checks cover visible-art/input alignment, independent scoring
  and net expiration after movement stops.
- Fixed a resize assertion race by waiting for lane geometry. Screenshot review
  exposed portrait HUD overlap; moved header/rules to letterbox margins, kept
  score and feedback overlays compact, and asserted that controls and rules stay
  clear of the portrait playfield. Full accessible score/status text is retained.
- Final Fish Frenzy acceptance: 11 Chromium scenarios passed. Reviewed desktop,
  390px portrait and synthetic-camera screenshots. Chromium launches intermittently
  failed with macOS MachPortRendezvousServer permission denial (1100); subsequent
  attempts executed and passed. T25K-browser is complete.
- Initial full unit/component suite: 334 tests across 50 files passed. Repeated
  all 21 Fish Frenzy model/component cases after the net change; typecheck, lint,
  production build and whitespace checks passed. Final broad regression outcome
  follows below. Concurrent shared camera/setup edits were preserved.
- All camera input here was synthetic. Physical webcam tracking, lighting,
  latency, occlusion and motion feel remain unverified; hardware_verified stays
  false. No deployment, external upload or commit.

## 2026-11-15 — Centered camera setup, without page chrome

Replaced the oversized setup page shown in the user's screenshot with a fixed,
viewport-fitted camera lobby. The uncropped mirrored preview stays centered using
its actual video aspect ratio, including after window resizing. Removed the site
header/footer, large heading, explanatory panel, decorative frame and document scroll.
Player count and Play sit in one compact overlay; back, game name and camera status
are small overlays at the top. Permission errors appear only when needed. Existing
camera persistence, player zones and the explicit Fish Frenzy fallback are retained.

Validation: typecheck, lint, build and 24 focused component/geometry/navigation tests
passed. Three Chromium checks passed: setup is centered with no document overflow at
1280×720, 1440×900 and 390×844; every setup control stays in view; returning from
practice retains the same stream; gameplay's 1–4-player alignment and scoring from
synthetic video movement still work. Reviewed the new setup screenshot using the
synthetic person fixture. No physical webcam validation, deployment or commit.


### T25K final regression outcome

- Sequential final verification passed all 334 unit/component tests across 50
  files, typecheck, lint and production build. A prior overlapping unit run had
  one 5-second Fish Frenzy setup timeout; the sequential repeat passed it.
- The initial 27-scenario browser sweep passed 26 and caught the Fish Frenzy
  resize assertion race, which was fixed and verified by the 11-scenario targeted
  acceptance run. A later 31-scenario sweep passed 22 before hitting an old
  back-link locator while shared setup accessible labels were changing; one
  case was interrupted and seven skipped. Current source uses Back to games.
- The final 32-scenario sweep could not execute: macOS denied Chromium startup
  with MachPortRendezvousServer error 1100. The whole browser suite is therefore
  not claimed passing; T25K-regression records the remaining broad acceptance
  run. Fish Frenzy's final targeted 11-scenario pass and screenshot review remain
  valid. No physical webcam verification or deployment.

## 2026-11-15 — Homepage-aligned catalog and immediate Play

Replaced large numbered catalog cards with compact game-specific SVG drawings on
reused homepage crayon sticker panels. Reduced the heading and removed long visible
card descriptions and repeated Play labels. Catalog links still select the game
without extra detail/settings steps; all available games remain reachable by keyboard.

Removed PracticeTutorial from the active flow. Play now mounts the selected game
immediately and its own countdown runs automatically. Tournament rounds advance the
same way. Activate-camera-and-play also begins the game after permission succeeds,
without requiring a second Play click. Updated existing startup tests to assert the
game instead of the removed introduction, and added a browser check that no start
button or confirmation dialog follows Play.

Validation: full unit/component run passed (335 tests), then 25 focused camera,
geometry and navigation tests passed after stream-start cleanup. Typecheck, lint and
production build passed. The final seven Chromium checks passed, including compact
catalog screenshots at desktop/mobile widths, no-confirmation starts, every playable
game with 1/4 players, mirrored motion scoring, sound/mute and disconnect/retry.
Reviewed the catalog screenshot. A recovery check exposed waiting on playback of a
hidden preview during reconnection; start now attaches to the active video without
blocking on that hidden element and clears stale motion. Camera tests use synthetic
video; no physical hardware result is claimed. No deployment or commit.


## T25K-regression — recovery fix and broad browser follow-up (2026-11-15)

- Read SPEC.md and AGENTS.md and inspected shared setup, camera lifecycle,
  input mapping, playfield CSS and existing acceptance coverage. Preserved all
  pre-existing changes and concurrent direct-Play/catalog work.
- Added a component regression reproducing a disconnected round resuming after
  a denied reconnect. Failed reconnects now retain the external pause and show
  the current permission/device error; Bubble Battle no longer shows only the
  original disconnect message. A successful retry can resume the same round.
- Added Chromium coverage for disconnect, failed retry, frozen timer and successful
  replacement stream recovery. Current camera integration clears ended video,
  attaches replacement streams to the active video without awaiting hidden
  preview playback, clears old motion and resets the frame-loss grace period.
  The synthetic replacement stream gets an explicit fresh frame with the test
  clock paused. Final browser execution of this path remains outstanding.
- Corrected Graffiti Race's remaining assertion for the removed practice heading
  and updated the camera fixture helper's old setup title.
- The initial baseline browser run passed 18 scenarios before interruption as
  source/tests changed concurrently to direct Play. The next full 34-scenario
  run executed 32 passing scenarios, including all 21 playable games in one-
  and four-player mode, mirrored synthetic camera input, persistence, narrow
  layout, scoring, pause/results/replay and Web Audio scheduling. Its two failures
  were the new recovery playback/fixture path and stale Graffiti practice heading;
  these were updated afterward. This is not a clean full-suite pass.
- Final sequential verification on stable source: 335 tests across 50 files,
  typecheck, lint and production build passed. Source/test hashes remained
  unchanged through these final checks. Whitespace checks passed. The final
  full 34-scenario browser rerun could not execute any scenario: macOS denied
  Chromium startup with MachPortRendezvousServer error 1100. Two targeted recovery
  retries were also denied at launch. T25K-regression remains pending until the
  corrected full browser suite can execute.
- Reviewed synthetic-person setup/gameplay and current narrow catalog/Fish Frenzy
  screenshots. No physical webcam, lighting, latency, occlusion, speaker or
  motion-feel validation is claimed. No deployment, upload, dependency or commit.

## T25K-regression — baseline completion and camera-free recovery (2026-11-15)

- Read SPEC.md/AGENTS.md and inspected current routes, camera lifecycle, shared
  setup, game integration and browser fixtures. Preserved concurrent artwork,
  icon and stylesheet updates throughout this invocation.
- The baseline full Chromium suite executed and passed **all 34 scenarios**,
  including previously outstanding disconnect/failed retry/frozen timer/recovery
  and Graffiti Race checks, all 21 playable games at one/four players, mirrored
  synthetic camera input, results/replay and sound scheduling.
- Found that only Fish Frenzy exposed camera-free play after permission failure.
  The shared lobby now offers it for every game when the camera is unavailable.
  Demo mode and player count persist across game selection; camera activation
  remains available afterward. Added component and browser regressions for denied
  permission, four-player demo and changing games without a repeated request.
- The loaded baseline unit run failed two timing-sensitive simulations (333/335
  passed). Five view tests previously sampled the real clock before rendering
  while manually supplying animation timestamps. Fixed their performance clock
  to make countdown/input timing deterministic; focused checks then passed.
  A new fallback assertion initially used the wrong region role and was corrected
  to assert all four labeled play areas.
- Final checks: **336 tests across 50 files passed**, typecheck, lint, production
  build and git diff --check passed. Reviewed baseline narrow catalog and
  four-player synthetic-camera screenshots. An intermediate test run encountered
  an incomplete concurrent artwork import; the subsequent complete build passed.
- Final rebuilt browser suite includes 36 scenarios (the new fallback scenario
  and concurrent UI-pack acceptance). Full rerun and single-worker retry were
  blocked before browser execution by macOS MachPortRendezvousServer permission
  denial (1100). The 34-scenario baseline pass is valid; the final-source full
  browser gate remains pending in T25K-regression.
- Inspection also found older games without shared external camera-pause props;
  their recovery behavior needs a separate follow-up beyond the Bubble Battle
  recovery acceptance. No claim that recovery is uniformly covered for all games.
- No physical webcam, lighting, latency, occlusion or motion-feel validation;
  no deployment, external upload, dependency change or commit.

## 2026-11-16 — User-supplied UI pack integration

Imported the 18 reusable elements from Downloads/motion-play-ui-pack.zip as local
WebP assets, preserving alpha. Source PNGs total 34,917,741 bytes; web derivatives
1,953,748 bytes. Asset manifest records source names, output sizes and archive SHA-256.
Used the supplied paper, panels, scene artwork, action icons, camera/player callouts,
garden border, doodle accents and results trophy. Settings artwork is retained without
adding a settings screen. Full-page/typography PNGs guide styling; production text is
HTML, and camera-first/direct-start behavior is preserved.

Checks for this integration: typecheck, lint and production build passed; 21 focused
App/CameraSetup tests passed. Three targeted Chromium scenarios passed for artwork
loading and desktop/mobile screenshots, compact catalog/direct Play, and centered
no-scroll camera setup. After screenshot review, corrected garden scaling and hid
mobile child decorations; the final artwork/browser scenario passed again. These
are targeted checks, not a claim of a full final-source browser suite or real-webcam
verification. No external upload or deployment was performed.

## 2026-11-16 — Two-choice home and random Quick Play

Kept only Quick Play and Game Catalog on Home; removed tournament navigation and
extra callouts. Retained the supplied crayon scene and artwork. Quick Play now samples
uniformly from available games supporting all 1–4 player counts, starts the camera if
needed and enters the selected game automatically. Existing player count/stream are
retained; exiting does not auto-launch again. Catalog selection still opens the lobby.

Verified the requested ZIP again: typography contains only PNG reference sheets and
a README, with no WOFF/WOFF2/TTF/OTF font. The exact-font request requires the actual
font file; no substitute font was misrepresented as coming from the archive.

Validation: 26 focused tests passed for random selection, automatic launch, Fish Frenzy
camera startup, exit behavior and navigation. Typecheck, lint and production build
passed. Four Chromium scenarios passed for the two-option home/random game, asset
loading/responsiveness, catalog/direct start, and centered camera setup. Reviewed the
new two-choice Home screenshot. No physical-camera result or deployment is claimed.


## T25K-regression — browser sweep and older-game recovery (2026-11-16)

- Read SPEC.md and AGENTS.md; inspected the application routes, shared camera
  lifecycle, normalized input adapter, game clocks and browser acceptance tests.
- Connected Window Wipe and Whack-a-Mole to the shared camera pause/reconnect
  signal. Disconnect and denied retries freeze the round; recovery enables an
  explicit Resume without starting over. Countdown loss is covered by component
  tests, and active-round loss by synthetic browser tests.
- Fixed Whack-a-Mole targets expiring during a pause: targets remain visible,
  input cannot score, and target lifetimes/spawn schedules shift by paused time.
  Added a deterministic long-pause model regression and shared setup cases.
- The original 36-scenario browser sweep passed. Five camera-play scenarios,
  including the two added recovery cases, also passed on the recovery build.
- Preserved concurrent homepage/Quick Play work and read the updated scope in
  SPEC.md. The combined source passed 342 tests across 51 files, typecheck, lint
  and production build. Recorded source/test hashes for the final browser gate.
- Chromium intermittently failed before test execution with macOS
  MachPortRendezvousServer permission denial (1100); single-worker retries can
  launch successfully. These launch errors are not application test failures.
- Reviewed the centered synthetic-camera lobby and 390px catalog screenshots.
  Added T25K-recovery to track the eight older games still missing shared camera
  recovery, plus remaining tab/manual-pause work. Browser suite completion does
  not establish uniform recovery coverage, Safari support or physical tracking.
- No deployment, external upload, dependency change, commit, or physical webcam
  validation was performed. Final combined-build browser result follows below.

- Final combined-build acceptance: **all 39 Chromium scenarios passed** with
  one worker (5.2 minutes), including the concurrent Quick Play test. Runtime
  source and test hashes remained unchanged through acceptance; only reference
  documentation changed. The earlier 38-scenario single-worker run also passed.
  Final whitespace and backlog JSON/unique-ID checks passed. T25K-regression is
  complete; T25K-recovery remains pending for the explicitly listed coverage gaps.

## T25K-recovery — older-game lifecycle integration (2026-11-16)

- Read SPEC.md and AGENTS.md and inspected the shared camera/input path and
  existing game views/models before editing. Integrated shared external camera
  pause/reconnect into Paint Splash, Meteor Smash, Balloon Panic, Gold Rush,
  Simon Says, Fruit Catcher, Air Pong and Goalkeeper.
- Added common manual/tab recovery controls to those eight games plus Window
  Wipe and Whack-a-Mole, including keyboard focus, actionable reconnect errors,
  explicit Resume after recovery, hidden-tab blocking and replay blocking when
  the camera is unavailable. Camera/media logic remains outside game models.
- Added a gameplay clock that excludes interrupted intervals. Countdown, target
  expiry/spawning, ball movement, Simon cues, scores and progress survive long
  pauses; events captured during interruptions cannot score after resume.
  Fixed countdown pauses displaying a zero round timer and made Window Wipe /
  Whack-a-Mole pauses harmless when repeated or arriving at round completion.
- Added four-player deterministic comparisons against uninterrupted models,
  paused/stale input checks, countdown/active-round manual and tab pause tests,
  focus restoration, replay and camera denial/retry integration coverage.
- Preserved concurrent catalog/UI changes limiting public routes to five games.
  Browser regressions respect that visibility gate; deferred games retain model
  and component coverage. Fixed a catalog navigation assertion to wait for the
  main heading rather than matching the same text still visible on Home.
- Final verification: **395 tests across 53 files passed**; lint, typecheck,
  production build and whitespace checks passed. A transient Quick Play export
  failure while catalog files changed and a catalog-heading test race were
  followed by a clean final full-suite run.
- Expanded synthetic browser recovery coverage to gameplay/countdown disconnect,
  denied retry, reacquisition, frozen boards/clocks and hidden tabs. Chromium
  could not launch for any of the 23 attempted camera-play scenarios because
  macOS denied MachPortRendezvousServer registration (1100). A final single-worker
  fail-fast retry encountered the same launch failure. No browser assertion or
  screenshot review ran successfully in this invocation; T25K-recovery remains
  pending browser acceptance. Hidden-game browser scenarios are explicitly
  skipped until public routes are restored. Tournament acceptance stays deferred.
- No physical webcam validation, Safari verification, deployment, upload,
  dependency change or commit was performed.

## 2026-11-16 — Minimal catalog and five-game refinement scope

Removed catalog site branding/header/footer, tagline, subtitle and decorative scenery.
A single toolbar now contains Back to Home and the centered Game Catalog title.
Public games are Bubble Battle, Window Wipe, Whack-a-Mole, Fruit Catcher and Goalkeeper.
A separate visibleGameSlugs list controls exposure, preserving all other implementations
and their existing availability metadata. Quick Play uses only the five public games;
legacy camera/detail URLs for deferred games render the catalog.

Updated navigation/Quick Play tests for the public boundary. Browser route tests for
deferred games are conditionally skipped until those games are restored; their model
and component tests remain active. Animation/identity improvements are future per-game
work and are not claimed as completed by this scope reduction.

Validation: 395 unit/component tests passed across 53 files; typecheck, lint and build
passed. Full Chromium run: 23 active scenarios passed, 35 deferred-game scenarios
intentionally skipped. This includes all five games at 1/4 players, Quick Play, hidden
legacy routes, camera geometry/recovery, native keyboard/pointer flows and responsive
catalog screenshots. Reviewed the simplified desktop catalog. Camera fixtures are
synthetic; no physical hardware verification, deployment or commit is claimed.


## T25K-recovery — current-scope browser completion and Bubble Battle fixes (2026-11-16)

Read SPEC.md and AGENTS.md and inspected the existing camera/input integration,
older-game recovery controls, models and tests. The earlier older-game integration
was already present; its browser acceptance record remained pending. Kept the
five-game public catalog and all hidden implementations intact.

Inspection found related Bubble Battle recovery defects: reconnect resumed without
an explicit action, replay could run through a continuing camera error, interrupted
input could score after resume, and long pauses advanced the target spawn schedule.
Moved Bubble Battle onto the existing shared recovery controls and PauseClock.
Countdown, target movement/spawning, scores and round time now exclude interruptions;
repeated pauses and pauses at round completion are harmless. Recovery requires
explicit Resume, stays blocked while the tab is hidden or the camera is unavailable,
and restores keyboard focus consistently with the older games. Game code continues
to consume normalized events without depending on camera/media internals.

Expanded four-player deterministic model comparisons and rendered recovery tests to
Bubble Battle, including manual/tab pauses during countdown and gameplay, frozen
boards/clocks, focus restoration and replay through a camera failure. Added regression
coverage for interrupted/stale input, replay input boundaries and a pause at the round
deadline. CameraSetup integration tests cover denied retry and explicit resume for
all eleven affected games. Extended synthetic browser countdown/gameplay recovery
tests to Bubble Battle and updated its previous auto-resume expectation.

Verification:

- 403 unit/component tests across 53 files passed; typecheck, lint and production
  build passed. A focused run initially exposed an overly specific results-dialog
  label assertion; changed it to assert the shared results action, then the full
  suite passed.
- Full Chromium sweep passed all 25 active scenarios with one worker; 35 hidden-game
  scenarios were intentionally skipped. All five public games passed countdown
  and gameplay disconnect, failed reconnect, frozen boards/clocks, reacquisition
  and explicit resume; gameplay cases also covered hidden-tab recovery. Alignment
  checks passed for one through four players, and synthetic camera motion scored.
- Reviewed the four-player synthetic-camera gameplay screenshot. Whitespace and
  backlog JSON/unique-ID checks passed.

T25K-recovery is complete for the current five-game scope. Hidden older games
(Paint Splash, Meteor Smash, Balloon Panic, Gold Rush, Simon Says and Air Pong)
retain model/component recovery coverage; their existing browser recovery cases
must execute when their public routes return. Tournament acceptance remains
out of the current scope. No physical webcam or Safari validation, deployment,
external upload, dependency change or commit was performed.

### 2026-11-16 — T25L: Tower Builder (generic position implementation)

- Added a deterministic cooperative 1–4 player model consuming normalized
  `HAND_POSITION` events. Each lane builds independently and contributes to the
  team total: +10 per placement, +30 bonus for completing six blocks. Holding an
  off-balance block at the landing height topples only that lane; earned points
  remain safe. Targets rise with the stack and follow the supporting block.
- Placement requires 800ms of stable, fresh samples. Jitter, gaps above 250ms,
  low confidence, leaving the landing height, explicit simulator release and
  pauses break continuity. Rendering/cached positions cannot award points.
  Malformed, stale, duplicate, wrong-kind and wrong-player events are rejected.
- Added transparent crayon block overlays, steady-hold meters, player contribution
  labels, shared team results, replay, deliberate pointer/touch holds and keyboard
  arrows plus Space/Enter holds. Integrated shared manual/tab/camera recovery,
  reconnect, frozen clocks and focus restoration. No camera/media imports in the
  model or game view.
- Integrated the existing camera-setup event adapter and game dispatch. The current
  product scope supersedes the backlog's old practice-screen requirement: Play
  enters countdown immediately. Tower Builder stays outside `visibleGameSlugs`;
  catalog/Quick Play do not expose it and both legacy URLs return to the catalog.
  Its implementation availability metadata is tested separately from visibility.
- Camera adaptation currently uses motion centroids, not hand landmarks. Help text
  explains that stable webcam control is unverified. Synthetic moving-patch fixtures
  verify mirrored mapping and score isolation for 1–4 players; they are not physical
  webcam validation. `needs_hardware_validation` remains true and
  `hardware_verified` remains false.
- Added 24 model/rendered component cases, two setup integration cases, catalog
  availability coverage and two browser route-gating cases. Tests cover hold timing,
  render cadence, jitter/missing input, low confidence, explicit release, cooperative
  totals, completion bonus, toppling/isolation, detached snapshots, round boundaries,
  replay, pointer normalization, keyboard controls and recovery.
- Final verification: **439 unit/component tests across 56 files passed**;
  typecheck, lint, production build and whitespace checks passed. Full Chromium run:
  **25 passed, 37 intentionally skipped** for games hidden by the current public
  scope. Tower gameplay is covered by model/component simulation; its browser cases
  validate public gating, not gameplay or real-camera hand stability. Reviewed the
  desktop catalog screenshot.
- Shared-workspace Paper Dojo/catalog/audio/typography changes appeared during the
  run and were preserved. Initial full-suite catalog failures reflected partially
  written parallel edits; the remaining Tower availability expectation was updated.
  The final suite passed. A first broad browser run was interrupted to rebuild the
  changed workspace; the complete run above used the rebuilt application.

T25L implementation is complete under the current hidden-game refinement scope.
No physical webcam or Safari validation, deployment, external upload, dependency
change or commit was performed in this task.

### 2026-11-16 — T25L follow-up: input ordering, lane bounds and keyboard preview

- Read SPEC.md and AGENTS.md and inspected the current application and existing
  Tower Builder implementation. T25L was already marked done in the working tree;
  kept the five-game public refinement scope and preserved existing unrelated edits.
- Reproduced and fixed two placement defects with regression tests: low-confidence
  samples now retain their timestamp so older/duplicate packets cannot restore lost
  tracking, and a block must fit fully inside its lane before it can score. The
  model and SVG now share the block-width constant. Off-edge placements topple only
  the owning stack and retain previously earned points.
- Focused keyboard lanes now show the block position before Space/Enter is held;
  arrows move that preview without awarding points. Pointer coordinates also update
  the preview, and blur/results clear it. Added four model/component regression
  cases; they failed before the fixes. The preview assertion uses numeric tolerance
  for normalized floating-point coordinates.
- Verification: 446 unit/component tests across 57 files passed, including all 28
  Tower Builder cases. Typecheck, lint and production build passed. Reviewed the
  desktop camera-lobby screenshot generated with the synthetic person fixture.
- Full Chromium run: 27 passed, 37 intentionally skipped, one Paper Dojo test
  failed because it advanced to ~16.4s of gameplay before looking for the 18s
  bamboo bonus. Corrected that test to advance into the bonus window. The first
  targeted rerun was blocked at browser startup by macOS Mach-port permission
  denial (1100); a second targeted run passed. The full suite was not repeated
  after this test-only timing fix. Typecheck, lint and whitespace checks passed
  again. Also reviewed the narrow catalog screenshot; existing Paper Dojo/public
  catalog changes were preserved.
- Tower browser coverage remains route gating; gameplay coverage uses normalized
  synthetic events and rendered component controls. No physical webcam or Safari validation,
  deployment, external upload, dependency change or commit was performed.

### 2026-11-16 — T25M: Dodgeball with generic BODY_MOVE

- Read SPEC.md and AGENTS.md and inspected the current input adapter, game models,
  camera-first layout, recovery hook, public routing and tests before editing.
- Implemented a deterministic 1–4 player horizontal marker-dodge alternative.
  Dashed paths telegraph incoming balls; fresh BODY_MOVE positions award +10 for
  a dodge or −5 for a collision. Each lane has independent tracking, counters and
  scores on the shared countdown and 60-second clock. Game code consumes normalized
  events only and does not access camera/media libraries.
- Missing/expired input earns no points. Low-confidence and malformed positions
  invalidate tracking; duplicate, reordered and stale events cannot restore it.
  Impacts resolve before later samples, elapsed impacts are processed across slow
  render frames, and the round endpoint cannot award extra points. Pauses freeze
  flight and countdown and discard cached positions until fresh input returns.
- Added transparent crayon paths, balls and star markers, pointer/touch simulation,
  keyboard arrows, isolated feedback, winner/tie results, focused replay and shared
  manual/tab/disconnect recovery. Camera setup adapts motion centers to BODY_MOVE
  and dispatches Dodgeball directly into countdown. Rules explicitly state that
  webcam motion-center control is unverified; this is not body-outline tracking.
- Preserved the existing public refinement set (including Paper Dojo as present in
  this checkout). Dodgeball implementation availability is recorded independently;
  catalog, Quick Play and both public legacy URLs keep it hidden. Current navigation
  requirements supersede the backlog's old practice-screen acceptance.
- Added 35 model/rendered-component cases and two camera-setup cases, including
  mirrored synthetic motion patches for 1–4 players, scoring/collision boundaries,
  tracking loss, timing, replay, keyboard/pointer controls, StrictMode and recovery.
  The first synthetic fixtures were too small to meet the existing confidence
  threshold; increased their occupied area without changing input sensitivity or
  production thresholds. Added two browser route-gating cases.
- Final checks: **483 unit/component tests across 59 files passed**. Typecheck,
  lint, production build and whitespace checks passed. Full Chromium run reported
  51 startup failures and 16 intentional hidden-game skips. A targeted two-case
  retry also failed before execution: macOS denied Chromium Mach-port registration
  (`bootstrap_check_in`, permission denied 1100). No browser gameplay or visual
  pass is claimed; the new browser cases cover public route gating only.
- `needs_hardware_validation` remains true and `hardware_verified` remains false.
  No physical webcam or Safari validation, deployment, external upload, dependency
  change or commit was performed.

T25M implementation is complete under the current hidden-game refinement scope.

### 2026-11-16 — T25N: Laser Escape with generic BODY_MOVE

- Read SPEC.md and AGENTS.md and inspected the application, Dodgeball's normalized
  input/lifecycle pattern, camera adapter, recovery controls, layout and routing.
- Implemented deterministic competitive 1–4 player Laser Escape. Dashed warnings
  and direction arrows precede alternating continuous laser sweeps. A fully tracked
  clear sweep earns +10; a laser touch costs 5 once per sweep. Each player has
  isolated scores, tracking, escape/touch counters and feedback on a shared clock.
- Collision checks intersect the whole traveled laser segment, including between
  render frames. Escape rewards require fresh tracking throughout the sweep;
  absent, expired or invalid positions cannot earn them. A known collision remains
  recorded if tracking subsequently disappears. Duplicate, reordered and stale
  packets cannot restore tracking. Later samples cannot rewrite earlier collisions.
- Added transparent crayon line/star overlays, pointer/touch and keyboard simulation,
  countdown, focused results/replay and shared manual/tab/disconnect recovery.
  Pauses freeze sweeps/countdown and discard cached input. CameraSetup maps motion
  centers to generic BODY_MOVE; game code never accesses pixels or media internals.
  This marker mechanic does not establish body-outline/pose tracking, and its
  visible rules explicitly describe webcam control as unverified.
- Recorded implementation availability without changing the checkout's existing
  public refinement set. Catalog/Quick Play and both legacy URLs keep Laser Escape
  hidden. The current direct-countdown specification supersedes the backlog's
  previous practice-screen acceptance.
- Added 35 model cases, seven rendered simulation cases, two camera-setup cases
  and two browser route-gating cases. Coverage includes 1–4 player isolation,
  mirrored synthetic motion centers, continuous collision boundaries, reverse
  sweeps, tracking gaps/loss, coarse rendering, malformed input, countdown/endpoints,
  pause/recovery, keyboard/pointer release, StrictMode, results and replay.
- Final checks: **527 unit/component tests across 61 files passed**; lint,
  typecheck, production build and whitespace checks passed. Full Chromium regression
  completed with **32 passed, 37 intentionally skipped**. The final visible-rule
  wording and two extra model regressions were added during browser execution;
  rebuilt and repeated the full unit suite, and both new route-gating browser
  cases subsequently passed against that final build. No other runtime changes
  followed the final build.
- Separately built a temporary isolated Laser Escape browser simulation harness
  for desktop/narrow screenshot inspection, without exposing a production route.
  Two direct launch attempts and one temporary Playwright review case were blocked
  before execution by macOS Chromium Mach-port registration denial (1100). The
  temporary review case was removed. No Laser Escape browser gameplay or visual
  pass is claimed; rendered gameplay is covered by component simulation only.
- Physical webcam behavior, latency/motion feel and Safari remain unverified;
  `needs_hardware_validation` stays true and `hardware_verified` stays false.
  No deployment, external upload, dependency change or commit was performed.

T25N implementation is complete under the current hidden-game refinement scope.
Desktop/narrow browser visual inspection remains a follow-up validation item.

## T25O — Dance Challenge (2026-11-16)

- Read SPEC.md and AGENTS.md; inspected application routing, camera adapter,
  normalized BODY_MOVE games, shared timing/recovery and camera-first layout.
- Implemented deterministic competitive Dance Challenge for 1–4 players. Shared
  left/right/up/down arrows have 800ms warning, 1200ms Go and 400ms rest windows.
  Fresh directional movement of at least 18% of a lane earns +10 once per cue;
  holding a position or moving during warning/rest cannot score. Small continuous
  movements accumulate while gaps, invalid tracking and interruptions clear anchors.
- Kept scores, motion anchors, matches and feedback isolated by player. Added
  timestamp/confidence/coordinate validation, stale/duplicate rejection, exclusive
  timing endpoints, countdown/results/replay and manual/tab/camera recovery.
- Added transparent crayon arrows and motion-center stars on camera-aligned lanes,
  visible text cues, screen-reader cue announcements, focused results/replay,
  pointer/touch input and deliberate arrow-key simulation. Game code consumes
  generic input only; CameraSetup performs the motion-center BODY_MOVE adaptation.
- Recorded implementation availability while preserving the checkout's existing
  public refinement set. Catalog/Quick Play and legacy game/camera URLs keep Dance
  Challenge hidden. No practice screen was added: current spec requires direct countdown.
- Added 32 model cases, seven rendered component cases, two setup cases and two
  route-gating browser cases. Tests cover all directions, 1–4 player isolation,
  mirrored synthetic camera movement, timing/distance boundaries, render cadence,
  fresh/invalid/missing input, pause/recovery, keyboard/pointer, StrictMode and replay.
- Final checks: **568 unit/component tests across 63 files passed**; typecheck,
  lint, production build and whitespace checks passed. Full Chromium regression:
  **34 passed, 37 intentionally skipped** for hidden games. The final screen-reader
  cue markup was added after that run; rebuilt and repeated the full unit suite,
  then reran the full Chromium suite against the final build with the same results.
- Built a temporary isolated four-player browser preview without exposing a public
  route. Direct npx launch was blocked by macOS Mach-port permission denial (1100);
  rerunning through the npm browser script succeeded. A targeted final route run
  also hit the same launch restriction; the full npm browser rerun passed. Keyboard scoring and pause
  passed, and desktop (1280×720) / narrow (640×360) screenshots were inspected.
  Removed the temporary test; preview artifacts remain under /tmp only.
- Physical webcam behavior, movement feel/latency and Safari remain unverified.
  Hardware validation flags stay true/false respectively. No deployment, external
  upload, dependency change or commit was performed.

T25O implementation is complete under the current hidden-game refinement scope.

## T25P — Freeze! (2026-11-16)

- Read SPEC.md / AGENTS.md and inspected the catalog, camera capture/dispatch,
  existing motion games, lifecycle, input and tests. Preserved the existing public
  five-game refinement set; Freeze! is implemented internally and hidden from
  catalog, Quick Play and legacy game/camera URLs.
- Added generic FREEZE events with normalized activity, confidence and timestamps.
  MotionProcessor emits continuous per-player activity independently of debounced
  hits, including explicit still frames. Initial/reset frames emit no observations;
  uniform exposure changes and extreme activity report uncertain confidence.
  This is a frame-difference alternative, not pose or player-presence detection.
- Implemented deterministic 1–4 player Move (2400ms), Ready (600ms), Freeze (2000ms)
  cycles. Each player must move during Move to participate. Fresh consecutive still
  observations spanning 1200ms earn +10 once per cue. Moving during Freeze costs
  5 once, including after an award; scores and feedback stay isolated. Missing,
  invalid, duplicate, stale and reordered packets cannot contribute stillness time.
  Gaps, release and interruptions clear accumulated holds.
- Added transparent crayon cues, text/symbol indicators, accessible progress,
  pointer and Space-key simulation, immediate countdown, results/replay focus,
  exit and shared manual/tab/camera recovery. Music stops for Ready/Freeze and
  restarts on Move. Current spec supersedes backlog practice-screen acceptance.
- Fixed a related capture defect: drawing the same stalled video image every
  50ms formerly counted as fresh input. Capture now requires ready, playing video
  with a changed decoder timestamp, allowing the three-second recovery pause.
  A rendered CameraSetup regression verifies duplicate rejection, fresh-frame
  processing, stalled-feed pause and reacquisition. Game code receives events only.
- Added 37 model cases, seven rendered Freeze cases, three CameraSetup cases,
  two App route-gating cases, one shared music case and two Chromium gating cases.
  Synthetic coverage includes mirrored activity isolation across all player counts,
  still frames, exposure changes, timing/round boundaries, malformed input, render
  cadence, pause/resume, false moves, pointer/keyboard, StrictMode and replay.
- Final checks: **618 unit/component tests across 65 files passed**; lint,
  typecheck, production build and whitespace checks passed. An initial synthetic
  fixture underfilled the activity threshold and was corrected; the initial full
  suite also caught the catalog expectation needing the new hidden implementation.
- Chromium regression could not launch: **57 startup failures, 16 skips**. A
  focused retry confirmed macOS Mach-port registration permission denial (1100)
  before any assertions. The final capture change was verified with the unit
  integration test and final full suite; no browser gameplay/visual pass claimed.
- Physical webcam behavior, movement feel, presence/occlusion limitations and Safari
  remain unverified. Hardware validation stays required and hardware_verified false.
  No deployment, external upload, dependency change or commit.

T25P implementation is complete under the current hidden-game refinement scope.

## T25P follow-up audit (2026-11-16)

- Reviewed the existing uncommitted Freeze implementation against SPEC.md and
  AGENTS.md; kept its generic-input boundary and current public visibility.
- Fixed post-round mutation: later animation frames, late input and focus loss
  preserve final cue/feedback/progress until replay. Rendering that skips past
  round end now stops at the exact boundary. Added two model regressions.
- Browser regression exposed a synthetic-camera fixture defect: a canvas painted
  only once stops delivering frames, correctly triggering the new decoder-stall
  recovery. Added a continuous tiny redraw to model a live still camera without
  weakening production stall detection. Paper Dojo browser tests now respect
  visibility gating like other games (currently visible, so all three ran).
- Verification supersedes the earlier browser-launch limitation: **620 unit and
  component tests in 65 files passed**; lint, typecheck, production build and
  whitespace checks passed. Final full Chromium suite: **36 passed, 37 skipped**
  for hidden games. Initial browser failures were resolved by the fixture change.
  Inspected the generated synthetic-camera lobby screenshot.
- Physical webcam behavior, motion feel and Safari remain unverified. Hardware
  flags stay unchanged. No deployment, upload, dependency changes or commit.

## T25Q — Jump Rush (2026-11-16)

- Read SPEC.md and AGENTS.md and inspected the application, generic motion-center
  dispatch, lifecycle, public refinement gating and related game tests.
- Implemented competitive 1–4 player Jump Rush through normalized BODY_MOVE events.
  Consecutive fresh upward travel triggers a 650ms hop; lowering rearms it. Shared
  2400ms hurdle cycles resolve once per player at impact: +10 for a tracked hop,
  −5 for a tracked bump. Missing/uncertain input earns nothing. Gradual travel,
  confidence/range validation, duplicate/stale/reordered rejection, timing
  boundaries, render cadence, pauses and final-result stability are tested.
- Added lightweight transparent crayon hurdles and stars, camera-aligned lanes,
  pointer/touch and Down/Up keyboard fallback, countdown, isolated scores,
  results/replay focus and shared manual/tab/camera recovery. This is a
  motion-center alternative, not physical-jump or pose recognition.
- Connected camera dispatch, setup and implementation metadata. Preserved the
  existing public game set; Jump Rush stays hidden from catalog and Quick Play,
  and both legacy URLs return to the catalog. The current direct-countdown
  specification supersedes backlog practice-screen wording.
- Added 29 model tests, seven rendered cases, two CameraSetup cases, two App URL
  cases and two Chromium gating cases. Deterministic frame-difference fixtures
  exercise rising motion in mirrored player zones for all four player counts.
- Final checks: **660 unit/component tests in 67 files passed**; lint, typecheck,
  production build and whitespace checks passed. Initial test expectations were
  corrected for shared negative scoring and freshness at the collision timestamp.
- First full Chromium run: **38 passed, 37 intentionally skipped**. After the
  final SVG/CSS refinement, an isolated preview and a full browser rerun failed
  before assertions with macOS Mach-port registration permission denial (1100).
  The full retry recorded 60 startup failures and 16 skips, including the temporary
  preview case. A local preview server also failed with listen EPERM. Temporary
  harness files were removed. No Jump Rush browser gameplay or visual pass claimed.
- Real webcam behavior, motion feel, presence/occlusion limitations and Safari
  remain unverified. Hardware validation remains required and hardware_verified
  false. No deployment, external upload, dependency changes or commit.

T25Q implementation is complete within the current hidden-game refinement scope.


## T25R — Fruit Slash (2026-11-16)

- Read SPEC.md and AGENTS.md and inspected the application, input pipeline,
  lifecycle, camera overlays and public refinement gating.
- Added generic HAND_SWIPE segments with normalized origin/end coordinates and
  elapsed milliseconds. The reusable adapter derives velocity, validates
  confidence/range/freshness, accumulates small fast samples and breaks continuity
  after loss, release or long gaps. Motion masks never become hand swipes.
- Implemented deterministic 1–4 player Fruit Slash: timed fruit/bomb arcs, segment
  collisions, +10 per fruit, −15 per bomb, once per object and isolated by player.
  Tests cover speed/distance thresholds, malformed/stale/duplicate events,
  countdown and pause boundaries, rendering cadence, results and replay.
- Added transparent crayon fruit, distinct × bombs, short slash trails, pointer/touch
  and directional keyboard simulation, immediate countdown, scores, results focus
  and shared manual/tab/camera recovery. Camera permission requires interaction for
  this game. Camera dispatch intentionally supplies no hand swipes until a real
  tracking backend exists. The UI states that hand tracking is unavailable.
- Preserved the existing public game set. Fruit Slash stays hidden from catalog
  and Quick Play; both legacy URLs return to the catalog. Implementation metadata
  is available. Direct countdown supersedes backlog practice-screen wording.
- Added 38 model/input tests, eight rendered component cases, two CameraSetup cases,
  two App route cases and two Chromium gating cases. Initial integration testing
  exposed an incorrect camera-activation assumption; fixed the new setup path to
  require interaction and verified recovery after activation.
- Final checks: **710 unit/component tests across 69 files passed**; lint,
  typecheck, production build and whitespace checks passed. Full Chromium
  regression: **40 passed, 37 intentionally skipped** for hidden games.
- A separate temporary hidden-game browser preview failed before assertions with
  macOS Mach-port registration permission denial (1100). The harness was removed.
  No Fruit Slash visual or browser-gameplay validation is claimed; rendered
  simulation validation comes from component tests. Physical webcam behavior and
  Safari remain unverified. Hardware validation stays required and
  hardware_verified false. No deployment, external upload, dependency changes or
  commit.

T25R implementation is complete within the current hidden-game refinement scope.


## T25S — Punch Arena (2026-11-16)

- Read SPEC.md and AGENTS.md and inspected the current input contract, game models,
  camera setup, recovery controls, public routing and camera-first overlay styles.
- Implemented deterministic 1–4 player directional pads using generic HAND_SWIPE
  events. Swipes must satisfy the shared speed/distance/confidence checks, end on
  a pad, and follow its arrow. Matching punches score +10; wrong directions score
  −5. Each pad scores once and expires after one second; players remain isolated.
- Added normalized crayon pads and short trails over transparent camera-aligned
  lanes, pointer/touch and arrow-key simulation, immediate countdown, shared clock,
  results/replay focus and manual/tab/camera recovery. No camera/media libraries
  are accessed by the game. Camera activation requires interaction; frame
  differencing never manufactures hand swipes. Hand tracking remains unavailable
  and is explicitly labeled in the UI.
- Integrated implementation metadata, setup and route dispatch while preserving
  the existing public catalog and Quick Play set. Punch Arena stays hidden and
  both public legacy URLs return to the catalog. Direct countdown follows the
  current specification and supersedes older practice-screen acceptance wording.
- Added 36 model tests covering four directions, endpoint collisions, velocity,
  malformed/uncertain/stale/duplicate inputs, independent scoring, deterministic
  spawn cadence, expiry, countdown/pause/replay boundaries and detached snapshots.
  Eight component cases cover 1–4 lanes, normalized pointer input, keyboard input,
  StrictMode event replay, results focus and recovery. Added two CameraSetup cases,
  two App routing cases and two Chromium gating cases. A missing newline in a new
  test initially blocked transformation and was corrected before the full run.
- Final checks: **758 unit/component tests across 71 files passed**; lint,
  typecheck, production build and whitespace checks passed. Full Chromium
  regression: **42 passed, 37 intentionally skipped** for hidden games.
- A separate temporary local preview compiled successfully but Chromium launch
  failed before assertions with macOS Mach-port registration permission denial
  (1100). Temporary repository entry files were removed. No Punch Arena browser
  gameplay or visual pass is claimed; rendered simulation coverage is from
  component tests. Physical webcam behavior, motion feel and Safari remain
  unverified. Hardware validation remains required and hardware_verified false.
- No deployment, external uploads, dependency changes or commit.

T25S implementation is complete within the current hidden-game refinement scope.

## T25T — Basketball Blitz (2026-11-16)

- Read SPEC.md and AGENTS.md and inspected the application, generic swipe
  validation, camera-first styles, setup, public route gating and round recovery.
- Implemented deterministic 1–4 player Basketball Blitz receiving only normalized
  HAND_SWIPE events. A quick upward stroke must begin inside the launch circle;
  its direction projects onto the hoop. Accurate shots earn +2 when the ball lands
  after 650 ms; misses earn zero. Each player has independent attempts, baskets,
  in-flight state and shooting cooldown. Invalid/uncertain, stale, duplicate,
  downward, sideways and off-launch strokes cannot shoot.
- Flight and round time freeze during pause. Countdown, resume and replay cannot
  be bridged by a stroke. Landing events resolve on the game timeline, including
  when a sparse frame jumps past the round end; landings at/after the boundary
  cannot score. An initial cadence test exposed differing final timestamps, fixed
  by clamping the round clock to its end.
- Added transparent crayon backboards, nets, launch circles and ball arcs over
  camera-aligned lanes, compact scores/stats, pointer/touch and Arrow Up simulation,
  direct countdown, results/replay focus and manual/tab/camera recovery. Reduced
  motion suppresses flying-ball animation. Camera activation requires interaction;
  frame differencing never produces fake hand swipes. The UI explicitly states
  hand tracking is unavailable. No game code reads camera/media internals.
- Integrated implementation metadata and setup/route dispatch while preserving
  the existing public catalog and Quick Play set. Basketball stays hidden and
  both legacy public URLs return to the catalog. Immediate countdown follows the
  current specification and supersedes old practice-screen acceptance wording.
- Added 33 model tests, eight component cases, two CameraSetup cases, two App URL
  cases and two Chromium gating cases. The full unit/component suite passed:
  **803 tests across 73 files**. Final lint, typecheck and production build passed.
- A temporary four-player Chromium preview passed keyboard and pointer scoring
  with player isolation. Inspected desktop (1440×900) and narrow (700×500)
  screenshots, then moved the swipe hint clear of the stats bar. The final preview
  passed again. Temporary repository preview files were removed. The standalone
  Node browser launcher initially failed with macOS Mach-port permission denial
  (1100); using the existing Playwright test runner succeeded.
- The initial full Chromium run had 42 passes, 37 intentional skips and two
  missing-asset failures because a concurrent production build replaced dist.
  This was a verification orchestration error; final browser verification runs
  after the completed build, without dist mutation.
- Physical webcam behavior, hand tracking, motion feel and Safari remain
  unverified. Hardware validation remains required and hardware_verified false.
  No deployment, external uploads, dependency changes or commit.
- Final Chromium regression after build completion: **44 passed, 37 intentionally
  skipped** for hidden games, zero failures. The final Basketball model/component
  rerun also passed all 41 cases. Whitespace checks and backlog JSON validation
  passed.

T25T implementation is complete within the current hidden-game refinement scope.

## T25U — Magic Duel (2026-11-16)

- Read SPEC.md and AGENTS.md and inspected the existing swipe models, simulation
  adapters, camera-first layout, setup/recovery flow and five-game visibility gate.
- Added deterministic 1–4 player Magic Duel using only normalized HAND_SWIPE
  events. Valley, Corner and Triangle patterns rotate on a shared five-second
  timeline; completing an ordered spatial trace earns +20 once per player/pattern.
  Smaller swipe segments can advance along an edge. Recognition requires spatial
  continuity, forward movement near the drawn edge, sufficient speed/confidence
  and a three-second completion window. Wrong paths reset progress without a
  penalty. Stale, duplicate, malformed, countdown/pattern/pause-crossing inputs
  cannot award points. Player progress and scores remain independent.
- Integrated transparent numbered crayon paths over the camera, visible pattern
  progress, pointer/touch input and Enter-per-edge keyboard simulation, direct
  countdown, score/audio feedback, results focus, replay and shared recovery.
  Incomplete traces reset on pause; completed spells cannot be re-awarded after
  resume. Side-by-side lanes follow the shared uncropped camera layout.
- Added internal catalog/setup/routing integration while preserving visibleGameSlugs
  and Quick Play's existing five-game set. Deferred public URLs still return to
  the catalog. Camera activation requires interaction. Motion-mask events never
  become hand swipes, and the visible rules state hand tracking is unavailable.
  The current direct-countdown flow supersedes old backlog practice wording.
- Added 36 model tests, nine rendered component cases, two CameraSetup cases,
  two App URL cases and two Chromium URL-gating cases. Coverage includes all
  patterns, segmented recognition, wrong paths, expiry, score isolation, invalid
  inputs, sparse/frequent updates, pause/replay, pointer normalization/continuity,
  keyboard repeat rejection, StrictMode event consumption and recovery focus.
- Validation: final full unit/component suite **852 passed in 75 files**.
  Lint, typecheck, production build, JSON validation and whitespace checks passed. Full Chromium regression: **46 passed, 37 intentionally skipped**,
  zero failures; these include the two Magic Duel visibility cases.
- A separate temporary Magic Duel preview built successfully. Both direct and
  Playwright-runner Chromium launches failed before gameplay assertions with
  macOS Mach-port permission denial (1100). No screenshots were produced and no
  Magic Duel browser-gameplay or visual pass is claimed. Temporary repository
  preview files and test were removed; preview outputs remain under /private/tmp.
- No physical webcam, hand-tracking, motion-feel or Safari validation was performed.
  `needs_hardware_validation` remains true and `hardware_verified` remains false.
  No deployment, upload, dependency change or commit.


## T25V — Ninja Training / Paper Dojo MIXED input (2026-11-16)

- Read SPEC.md and AGENTS.md and inspected the current model, camera adapter,
  recovery flow, catalog and existing tests. Paper Dojo was already implemented
  with strikes, flying puppets, combos and bamboo bonuses; the missing T25V work
  was a mixed hit/avoid mechanic and its integration coverage.
- Added deterministic marked obstacles with a 700 ms warning and 1100 ms contact
  window at the end of attack cycles. Markers alternate sides, disappear during
  bonuses, and charge −10 only once per player/obstacle while clearing the streak.
  Scores and contacts remain isolated for all one to four player layouts.
- MIXED is capability metadata; concrete normalized MOTION_HIT and BODY_MOVE
  events retain their kinds. The camera adapter supplies hits plus observed
  movement-center samples. Strikes hit ninjas/bamboo; either kind can contact an
  obstacle. Game code consumes events without importing media/camera libraries.
  This is an explicit motion-area avoidance alternative, not pose recognition.
  Missing observations earn no dodge points or inferred successful avoidance.
- Obstacle circles share aspect-correct bounds with their visual markers. Pause,
  countdown, recovery and replay preserve lifecycle behavior. Added bounded
  per-player/per-kind duplicate history and a 150 ms stale-capture limit; old,
  malformed, uncertain, unrelated and pause-crossing input cannot score.
- Added 22 model cases, two rendered cases, two camera-setup cases and one browser
  case. Tests exercise warning/contact timing, both kinds, player isolation,
  malformed/stale/duplicate input, tall lanes, mirrored synthetic motion for all
  player counts, full-round fine/coarse cadence, replay and camera adaptation.
  Existing direct countdown and pointer/keyboard fallback controls are retained.
- Preserved existing uncommitted font/audio/dojo refinements and the current public
  five-game set. Concurrent workspace refinements compacted the dojo HUD and moved
  detailed statistics to results; final checks use those latest files. No other
  catalog games were made public by this work.
- A new synthetic fixture initially fell below the configured activity minimum;
  lowered its explicit test threshold. An existing camera-recovery assertion raced
  the recovery effect; it now awaits the actual recovered message. Focused reruns
  passed. Final full unit/component suite: **879 passed across 75 files**.
  Lint, typecheck (through build), production build, backlog JSON and whitespace
  validation passed. Initial focused Chromium verification: **4 passed**, including
  synthetic camera scoring/audio, keyboard bonus/replay and isolated obstacles.
- Physical webcam behavior, pose tracking, motion feel, Safari and real speaker
  quality remain unverified. Hardware validation remains required and
  hardware_verified false. No deployment, uploads, dependency changes or commit.

## Paper Dojo, shared typography and camera-first polish (2026-11-16)

- Researched the likely requested EyeToy Kung Foo interaction through contemporary
  written reporting; recorded sources and limits in the Paper Dojo README. Built
  original paper puppets, tower art, run/windup/leap choreography, rising waves,
  combo scoring, bamboo bonus rounds and impact/tumble/confetti feedback. Original
  local synthesized percussion/plucks use the shared pause/mute/audio lifecycle.
  No source game assets, audio, branding or code were copied.
- Paper Dojo replaces Goalkeeper in the public five; Quick Play retains random
  selection and automatic launch. Other implementations remain hidden. Camera
  media stays outside the game; strikes and obstacle contacts use normalized
  input with player isolation, capture guards and aspect-correct collision areas.
- Refined collision sampling, ledge alignment, pause timing, bonus boundaries and
  duplicate/stale event handling. Marked obstacles warn before becoming active
  and charge contact once; motion-center input is not full-body pose recognition.
- Removed the long gameplay instruction strip, repeated lane statistics and center
  decoration after screenshot review. Scores/time and player labels stay compact;
  the single lower action cue clears sound controls. Detailed stats stay in results.
- The supplied ZIP has typography reference images, not a font binary. Bundled
  OFL Short Stack as a visual match and applied the same local font throughout
  website, game controls, SVG text and fallback Phaser text. Its license/source
  are recorded; no runtime font download or new dependency was introduced.
- Final validation: typecheck, ESLint, production build and whitespace checks
  passed. Full unit/component suite: **879 passed in 75 files**. Full Chromium
  suite: **47 passed, 37 intentionally skipped** for hidden games, no failures.
  Browser coverage includes synthetic camera strikes, real Web Audio scheduling
  and mute, four-player/narrow layouts, obstacles, bamboo, pause/results/replay,
  local font loading, catalog, random Quick Play and stream continuity. Reviewed
  final desktop/narrow screenshots under /tmp/dojo-complete-browser.
- Physical webcam recognition/latency, four real people, speaker listening and
  Safari were not validated. No deployment, uploads or commit in this invocation.
- Final full Chromium regression against the completed latest build: **47 passed,
  37 intentionally skipped** for hidden games, zero failures. All four Paper Dojo
  cases passed again. Inspected desktop obstacle and narrow-layout screenshots;
  the compact cue and controls leave the camera visible. No physical validation
  is inferred from these synthetic screenshots or browser checks.

T25V implementation is complete; physical hardware and release gates remain open.

## T26A / T26 — Release hardening and truthful review gates (2026-11-16)

- Read SPEC.md and AGENTS.md, inspected the current application, camera/input
  boundary, five-game catalog, browser fixtures, offline worker and build. Kept
  the five-game public scope and camera-first crayon UI. Reviewed the rendered
  narrow camera lobby; no redesign or deployment was performed.
- Split completed automated work into T26A. T26 remains pending for actual
  cross-browser, hardware, performance, usability and public packaging sign-off.
  `needs_hardware_validation` stays true and `hardware_verified` stays false.
- Fixed a camera ownership race: `stop()` invalidates pending permission requests;
  late streams stop all returned tracks, and superseded failures cannot override
  the current request. A distinct cancellation error leaves native AbortError
  failures actionable rather than silently leaving setup in a requesting state.
  Added three CameraSource cases and one CameraSetup case.
- Added a production-only CSP that blocks network data connections, external
  scripts/fonts/images, objects and form submissions while retaining local/blob
  media and the inline styles needed for game positioning. Development HMR is
  unaffected. New synthetic browser coverage checks interaction-gated capture,
  no microphone requests, local GET-only asset loading, optional-worker default,
  local storage keys and rejected same-origin/external POST probes.
- Replaced the partial offline cache with a generated complete asset list, versioned
  shell and install-time validation. CSS images/fonts and bundled licenses are
  included before activation. Updates wait for existing tabs to close. Fetches
  use only this release's cache and packaged asset whitelist; evicted assets can
  recover online without caching arbitrary runtime responses. Opt-out retains
  other apps' caches. No camera data is stored or uploaded.
- Build now writes `dist/release-report.json` with SHA-256, raw/gzip sizes and
  budgets. `check:release` rejects changed artifacts/workers, absent/extra files,
  missing/external HTML/CSS assets, common accidental secret files, source maps
  and budget regressions. Active OFL font and React/React DOM/Scheduler licenses
  ship with the artifact. Added six Node packaging/worker tests. A CSS data-URL
  parser bug found during the first final build was corrected and regression
  covered; nested SVG filter URLs are not treated as separate files.
- Final artifact ID: `04a29abaca0ee3ea662a`; 28 payload files, 2,617,770 raw
  bytes excluding worker/report, including 453,131 JavaScript bytes and 133,182
  CSS bytes. Main JS gzip is about 108 KB. All declared budgets pass; these byte
  measurements do not certify FPS or input latency.
- Added Chromium/Firefox/WebKit projects and explicit cross-browser/offline
  commands. Offline integration uses a loopback static server, a genuine worker,
  offline reload, font/image validation, camera-free play and opt-out cleanup.
  Browser screenshots now use per-test output directories instead of colliding
  paths. The release scenario records 90 four-player animation-frame intervals
  to a JSON artifact; synthetic cadence is not physical webcam performance.
- Validation: final unit/component suite **883 passed in 75 files**; all **six
  packaging tests passed**. Typecheck, ESLint, production build, artifact integrity,
  backlog JSON and whitespace checks passed. Two-worker Chromium regression
  passed **48 scenarios with 37 intentional hidden-game skips** before the final
  cancellation-error distinction; the latest full unit tests cover that distinction.
- Earlier expanded Chromium run passed **49 scenarios / 37 skips**, including
  the genuine offline scenario before it moved into a separate project. The
  final separate offline command could not bind `127.0.0.1` (`listen EPERM`), so
  no final-worker browser/offline pass is claimed. Worker eviction fallback is
  covered by the Node harness. An intervening offline attempt also failed because
  a failed packaging build had not produced its report; fixed the packaging parser,
  rebuilt, and improved the missing-build diagnostic. Browser commands must run
  sequentially after build; overlapping invocations also collided in trace output.
- One four-worker Chromium rerun took 29 minutes of wall time and ended with five
  failures: layout/polish timeouts, a deferred URL case and a moving-ninja camera
  strike mismatch. This is retained as a failed run, not erased by earlier passes.
  Limited workers to two to reduce contention for camera/audio timing; the next
  complete Chromium run passed 48 / skipped 37. No game timing assertion was
  weakened and no failure was reclassified as a skip.
- Firefox/WebKit installed successfully, but six focused attempts aborted before
  assertions (Firefox SIGABRT, WebKit Abort trap 6). A wider three-engine command
  also failed during browser process startup, including Chromium Mach-port
  permission denial (1100). No Firefox, WebKit or Safari compatibility pass is
  claimed. `npm audit` failed registry DNS (`ENOTFOUND registry.npmjs.org`);
  dependency security is not marked clean.
- Added docs/RELEASE-CHECKLIST.md with reproducible commands, static-host packaging,
  offline update behavior, privacy/storage boundaries, performance measurement
  limits and specific human evidence gates. Real Mac/Safari permission flows,
  one/two/four people, lighting/occlusion, real input latency, sustained performance,
  accessibility/user review, artwork rights and host/install behavior remain open.
- No physical webcam testing, camera uploads, dependency changes, public deployment
  or commit. A final Chromium regression against the final artifact is recorded
  below when complete.
- Final Chromium regression against artifact `04a29abaca0ee3ea662a`: **48 passed,
  37 intentionally skipped, zero failures** in 1.6 minutes, using two workers.
  This includes the final cancellation-error behavior and CSP privacy scenario.
  Four-player synthetic Paper Dojo cadence: 90 frame intervals, median **16.7 ms**,
  p95 **16.7 ms**, 1280×720 viewport, one mock camera request, zero microphone
  requests. Raw JSON is retained in the release test's `test-results` output.
  The configured Desktop Chrome user-agent is emulated and must not be used to
  infer the host operating system. These are animation callback intervals, not
  physical webcam processing/input-latency or sustained-performance evidence.

## T26 follow-up — packaging and recovery review (2026-11-16)

- Read SPEC.md/AGENTS.md and inspected app navigation, camera fixtures, release
  tooling and offline lifecycle. Preserved existing working-tree changes for
  skip-link route preservation and canonical CSP enforcement; verified their
  unit/packaging regressions without claiming their browser cases passed.
- Fixed an additional offline defect: recaching an evicted asset could reject a
  successful network response when cache.put exceeded storage quota. The worker
  now returns that response even when recaching fails. Added a Node worker case.
- Passed 884 unit/component tests in 75 files, eight packaging tests, typecheck,
  lint, production build, checksum/worker integrity and whitespace checks.
  Reviewed payload ID 824cdc462ab1cb06de64: 28 files, 2,617,869 bytes; all budgets
  pass. This ID excludes worker/report; worker integrity is checked separately.
- Current Chromium regression was interrupted after repeated startup failures:
  24 failed, two interrupted, 60 not run. Launch logs show macOS Mach-port
  registration permission denial (1100), before application assertions. Focused
  Firefox/WebKit release cases both failed at launch (SIGABRT / Abort trap 6).
  Offline integration failed at loopback listen EPERM. npm audit again failed
  registry DNS ENOTFOUND. No current browser, visual, cadence, dependency-security
  or physical-camera pass is claimed. T26 stays pending; updated release checklist.
- Package manifest/lockfile and public/pose assets appeared concurrently after
  this review's build/tests. Those changes were not made by this task and were
  preserved. The reviewed artifact and results do not certify that separate pose
  integration; rebuild/revalidate once that work is complete.
- No deployment, uploads, commit or physical webcam testing performed.

## T26 manifest packaging follow-up (2026-11-16)

- Read SPEC.md/AGENTS.md and inspected the current navigation, camera lifecycle,
  production CSP, worker, browser fixtures and packaging checks. Preserved all
  existing and concurrently changing pose-tracking work.
- Added install-manifest validation to packaging and integrity checks: start and
  shortcut URLs launch the packaged root/hash app, scope is the hosting root,
  icons/screenshots/shortcut icons are local packaged files. Added regression
  cases for external/credentialed URLs, missing artwork and malformed collections.
- Final observed checks: 891 unit/component tests in 76 files, nine packaging
  tests, lint, typecheck, build, integrity and whitespace checks passed. An earlier
  run passed 884 tests; an intermediate run failed one newly added stale-frame
  diagnostic test (890 passed), corrected concurrently before the final run.
- Initial lint failed on vendor assets and the initial build exceeded the prior
  byte budget. Concurrent integration corrected lint configuration and introduced
  separate core/pose budgets. Built snapshot 860529c8bde09c27a1aa: 38 files,
  31,077,067 bytes, of which 28,453,772 are optional pose assets. No claim of pose
  runtime browser, privacy, offline or hardware validation follows from these checks.
- Three focused browser cases failed before assertions: Chromium Mach-port
  registration permission denial, Firefox SIGABRT and WebKit Abort trap 6.
  Online audit failed registry DNS ENOTFOUND. Offline audit returned zero but is
  not accepted as current security evidence. Offline browser integration not rerun.
- Updated release checklist for manifest checks and the changed optional runtime
  privacy/cache/byte boundaries. T26 stays pending with hardware_verified false.
  No deployment, upload, commit or physical webcam testing performed.

## T26 offline document routing follow-up (2026-11-16)

- Read SPEC.md/AGENTS.md and inspected navigation, camera setup, the optional
  body-tracking runtime, worker, browser fixtures and packaging. Preserved all
  existing working-tree changes.
- Fixed service-worker navigation routing: only the root/index document receives
  the app shell. The optional pose iframe previously received index.html instead
  of its own runtime document. Packaged subdocuments now retain their HTML and
  policy; unknown document paths pass through to the host.
- Extended Node worker assertions for iframe/root-query/unknown navigations and
  optional asset exclusion from initial precaching. Extended the genuine offline
  browser scenario to inspect a controlled iframe document/runtime without
  inference; added module/WASM MIME types to its static server.
- Passed 891 unit/component tests in 76 files, nine packaging tests, typecheck,
  lint, build and artifact integrity. Snapshot 6095513601c2d92fa116: 39 payload
  files, 2,623,342 core bytes, 28,455,471 optional pose bytes, 31,078,813 total.
  All byte budgets pass; payload ID excludes worker/report, checked separately.
- Three focused production privacy cases failed before app assertions: Chromium
  Mach-port permission denial (1100), Firefox SIGABRT and WebKit Abort trap 6.
  Updated offline browser test blocked by loopback listen EPERM. Current audit
  failed registry DNS ENOTFOUND. No new browser, visual, inference, performance,
  dependency-security or physical-camera pass is claimed.
- Updated release checklist; T26 remains pending with hardware_verified false.
  No deployment, upload, dependency change or commit performed.

## Camera-distance guidance and test-only body wireframe (2026-11-16)

- Read the current spec/application, then added an approximate 2–3 m (6–10 ft)
  starting guide to the centered lobby and all automatic countdowns. Framing,
  rather than an invented distance measurement, determines how far to step back;
  multiplayer guidance asks everyone to stand side by side with arms in frame.
- Added opt-in Test body tracking in setup. Local MediaPipe Pose Landmarker Lite
  draws a single torso line, articulated arms and wrist dots from confident
  landmarks. It mirrors exactly once, omits uncertain/offscreen segments and
  clears stale images. The diagnostic stops before gameplay or when disabled;
  games continue receiving their existing normalized input independently.
- Bundled the pinned 0.10.32 SDK/WASM and version-1 lite model with Apache license,
  model card and provenance. The ~28.5 MB optional files load only on request;
  core assets retain their 3 MB budget. Updated release budget checks and worker
  tests to exclude optional pose assets from initial offline precaching.
- Used an isolated same-origin runtime document so the main application keeps
  connect-src none. Actual model browser requests were same-origin GET only;
  camera stream continuity and main-app blocked POST/privacy probes passed.
- Final checks: typecheck, lint, production build and whitespace checks passed.
  Full unit/component suite: **891 passed in 76 files**. Packaging: **10 passed**.
  Focused Chromium regression: **9 passed**, covering the actual detector on an
  empty fixture, diagnostic shutdown, camera continuity, layout, privacy, Quick
  Play and Paper Dojo. Offline cache/runtime-document test: **1 passed**.
- Separately tested the actual local model on the official MediaPipe sample
  photograph from storage.googleapis.com/mediapipe-assets/pose.jpg: detected one
  body, three polylines and two wrist dots; reviewed mirrored alignment in
  /tmp/body-test-photo.png. The temporary photo test was removed, and the sample
  photo stays under /tmp. Desktop/narrow guide screenshots were also reviewed.
- Initial headless inference failed because WebGL was unavailable. The dedicated
  pose browser tests now enable software WebGL for preprocessing; CPU inference
  passes. Unsupported runtime failures remain visible without blocking Play.
  No physical webcam, live latency, four real people or Safari pose verification
  was performed. No deployment, camera upload or commit.


## T26 diagnostic policy packaging review (2026-11-16)

- Read SPEC.md/AGENTS.md and inspected the current app, optional diagnostic,
  camera lifecycle, production policies, worker and release/browser tests.
- Closed a packaging privacy gap: only index.html previously had its policy
  checked. Every shipped HTML document now requires the canonical main policy,
  except the required pose/tracker.html document, which must have its exact
  dedicated local-fetch/WASM policy before other head content. Runtime permissions
  and the public UI are unchanged.
- Added two packaging regressions covering missing, commented, late and weakened
  iframe policies; both prepare/integrity paths; missing iframe HTML; and attempts
  to apply the exception to another document.
- Passed 891 unit/component tests in 76 files, 12 packaging tests, lint, typecheck,
  production build and artifact integrity. Snapshot 81a1e9d9edc2a9314e84 has 39
  payload files: 2,623,498 core bytes plus 28,455,625 optional pose bytes,
  31,079,123 total. All budgets pass.
- Focused production privacy scenarios failed before assertions in Chromium
  (Mach-port permission denial 1100), Firefox (SIGABRT), and WebKit (Abort trap 6).
  Offline integration failed loopback listen EPERM. npm audit with zero retries
  and a 15-second timeout failed registry DNS ENOTFOUND. No fresh browser,
  cadence/latency, dependency-security, visual or physical-webcam pass is claimed.
- Updated release checklist with current evidence and reconciled earlier focused
  diagnostic/offline passes. T26 remains pending with hardware_verified false.
  No deployment, uploads, dependency changes or commit.

## Rocket Rumble — original fireworks refinement (2026-11-16)

- Added catalog entry 33, an original camera-first matching/fireworks game. It
  replaces Fruit Catcher in the five-game public catalog and Quick Play. Other
  implementations remain preserved and hidden. No source-game art/audio/code used.
- Nine staggered rockets per lane use colour AND shape identities, eased ascent,
  floating positions, fuse rings and linked tags. Tag two or three of one colour,
  then hit the plunger for 40/90 points. Independent 1–4-player lanes retain the
  full-opacity mirrored uncropped camera. Last fifteen seconds accelerate waves.
- Added glowing armed controls, sequential ignition, transparent Canvas spark
  trails with chrysanthemum/willow/heart patterns, impact lettering and chain
  statistics. Particles are deterministic, lifetime-bounded and rendered at DPR
  at most two. Reduced motion replaces moving bursts with stationary fading rings.
- Original synthesized whistles, low booms, filtered generated noise/crackle and
  sparkling overtones use the shared audio/mute lifecycle, plus a quiet plucked
  theme. No recordings, samples, dependencies or remote requests were added.
- Preserved normalized camera -> events -> game boundaries, shared countdown,
  manual/tab/camera recovery, aspect-correct hit regions, debounced input,
  confidence/stale checks, frozen fuses/particles, focused results and clean replay.
- Browser testing found an end-of-round recovery race: pause could advance into
  results and then throw. The model now returns results safely. Added a boundary
  regression; the browser lifecycle rerun checks for page errors and passed.
- Validation: **900 unit/component tests passed in 77 files**; nine are new game
  model cases. Typecheck, lint, production build and whitespace checks passed.
  Packaging suite: **12 passed**. Three Rocket Rumble browser cases passed
  (continuous lifecycle); the final boundary/audio/replay case passed again on
  the fixed build. Three public-game/audio regressions and four catalog/Quick Play
  checks passed. Browser tests include real motion processing on synthetic video,
  actual Web Audio noise scheduling, drawn particle pixels, pause/finale/results,
  four-player/narrow layouts and reduced motion. Reviewed final screenshots under
  /tmp/rocket-boundary-browser and multiplayer images under /tmp/rocket-final-browser.
- No physical webcam response, speaker listening, four real players or Safari
  gameplay verification. No deployment, upload or commit performed.

## Body wireframe during gameplay (2026-11-16)

- Inspected SPEC and the existing local pose diagnostic. The earlier overlay was
  limited to setup and reset on Play, making it unavailable during actual games.
- Added Show/Hide wireframe above the sound control in every live-camera game.
  Enabling tracking in setup now carries into gameplay; the same choice carries
  back on Exit. Disabled diagnostics do not load a runtime. Camera loss, leaving
  the active view and hiding the overlay dispose it without stopping the stream.
- Reused the real local pose detector and confidence-filtered mirrored geometry:
  torso, jointed arms and wrist dots. The noninteractive overlay sits above targets
  and below game dialogs/header, with a compact body count. Its label explicitly
  distinguishes joint diagnostics from the motion events used for game scoring.
- Updated specification/provenance notes and added a rendered compact-status case
  plus a browser integration covering normalized SVG coordinates, camera bounds,
  toggling during play, setup/play/exit continuity, no diagnostic score awards,
  runtime cleanup and one uninterrupted camera request. The geometry/lifecycle
  browser case uses fixture landmarks and is not a detector-accuracy claim.
- Validation: 49 CameraSetup cases and eight BodyTrackingTest cases passed. Three
  Chromium body-tracking tests passed, including the existing actual local-model
  empty-frame check. Reviewed gameplay overlay placement in
  /tmp/game-wireframe-browser. Lint, typecheck/build and whitespace checks passed.
  No new physical webcam, multi-person or pose-controlled gameplay validation.
  No uploads, deployment or commit.


## T26 cache storage recovery and diagnostic bundle completeness (2026-11-16)

- Read SPEC.md/AGENTS.md and inspected the current navigation, camera/diagnostic
  lifecycle, production policies, service worker, packaging and browser fixtures.
  Preserved the existing gameplay-wireframe progress entry added during review.
- Fixed installed workers blocking online play when Cache Storage open/read fails.
  Packaged GET assets fall back to the network; arbitrary runtime requests remain
  unintercepted and genuine network failures still reject. Existing cache-write
  quota recovery is retained.
- Packaging/integrity now require nonempty optional diagnostic entry/runtime,
  model, both SIMD/non-SIMD WASM loaders/binaries, license, model card and provenance.
  Missing JavaScript-loaded model/WASM files previously escaped HTML/CSS checks.
  Added two packaging regressions for storage failures and missing/empty files.
- Passed 901 unit/component tests in 77 files, 14 packaging tests, lint, typecheck,
  production build and artifact integrity. Snapshot d04e56e8c3872539696b has 39
  payload files: 2,643,121 core plus 28,455,777 optional pose bytes, 31,098,898 total.
  All budgets pass; worker integrity is checked separately from the payload ID.
- Three focused production privacy/cadence scenarios failed before app assertions:
  Chromium Mach-port permission denial 1100, Firefox SIGABRT, WebKit Abort trap 6.
  Offline integration failed loopback listen EPERM; current npm audit failed
  registry DNS ENOTFOUND. No fresh browser, visual, measured-performance,
  dependency-security or physical-webcam pass is claimed.
- Updated the checklist's public five and current evidence, and consolidated T26
  notes with links to retained historical records. T26 stays pending with
  hardware_verified false. No deployment, upload or commit performed.

## Human-attached stick person clarification (2026-11-16)

- Read SPEC/current tracker. Extended the camera-only diagnostic from torso/arms
  into a recognizable green human stick person: head, torso, articulated arms,
  wrists and visible hips/knees/ankles. The head circle accounts for camera aspect.
  Partial upper bodies no longer disappear solely because hips are offscreen.
- Kept confidence filtering and single mirroring; omitted joints stay omitted.
  Increased the diagnostic polling target from 150 to 80ms (not an FPS claim).
  Game artwork fades and rocket fuse outlines disappear while tracking is shown,
  distinguishing the person skeleton from decorative game graphics. The camera
  itself retains full opacity. No game-object positions enter the pose detector.
- Added moving-human coordinate and partial-leg regression coverage; updated
  rendered/browser expectations for the full skeleton. Nine body-tracking cases
  and 49 CameraSetup cases passed. Three permanent Chromium cases passed.
- Separately ran the actual local model on the official temporary MediaPipe photo:
  detected a full skeleton, followed a 60px translation in the correctly mirrored
  direction, and removed all skeleton segments when replaced by a blank image
  while rockets remained onscreen. Reviewed /tmp/human-stick-actual.png. This is
  photo/inference validation, not live-webcam or human-motion hardware validation.
  Removed the temporary photo test; no sample image added to the repository.
- Lint, typecheck/build and whitespace checks passed. No upload/deploy/commit.


## T26 public keyboard controls and results focus (2026-11-16)

- Read SPEC.md/AGENTS.md and inspected current routes, public games, camera/input
  lifecycle, privacy policies, offline worker, packaging and release tests.
  Preserved existing uncommitted diagnostic/cache/packaging changes and records.
- Found missing keyboard gameplay in public Bubble Battle, Window Wipe and
  Whack-a-Mole. Added shared focusable per-player play areas: arrows aim a bounded
  cursor and Space/Enter emit existing normalized hit/brush input. Integer steps
  prevent drift, modifier shortcuts pass through, and countdown/pause/recovery/
  results block movement/actions. Pointer/camera input still uses existing models.
- Added a crayon cursor and keyboard-only instruction reminder; screenshot review
  caught cramped portrait four-player instructions, now shown across the viewport.
  Wipe still renders exactly 60 smudge cells; added affordances are out of the grid.
- Results headings receive focus and replay returns to Pause in these three games.
  The initial full regression found nine conflicts with games owning replay focus;
  shared results ownership is now opt-in, all nine regressions resolved.
- Added 17 unit/component cases and three permanent Playwright cases. Final full
  unit/component run: **919 passed in 78 files**. **14 packaging tests** passed;
  lint, typecheck, build, artifact integrity and whitespace checks passed. Final
  snapshot **8368e7bd9de3759fa74e**: 39 payload files, 2,647,331 core bytes plus
  28,455,923 optional pose bytes, 31,103,254 total. All existing budgets pass.
- Three focused Chromium keyboard cases passed before/after the responsive-help
  refinement, covering four-player scoring/isolation, pause, results/replay focus,
  no page overflow and desktop/narrow screenshots. Reviewed final images under
  /tmp/motion-play-keyboard-final. Camera-denied simulation is not webcam validation.
- Earlier three-engine privacy-only checks and a later 12-case privacy/keyboard
  attempt failed before app assertions (Chromium Mach-port denial 1100, Firefox
  SIGABRT, WebKit Abort trap 6). Offline integration failed loopback listen EPERM;
  npm audit failed registry DNS ENOTFOUND. No cross-browser certification, current
  privacy/cadence, dependency-security or physical-camera pass claimed.
- Updated README, release checklist and T26 notes; T26 remains pending with
  hardware_verified false. No deployment, upload, dependency changes or commit.

## Localhost wireframe absent — automatic test-phase activation (2026-11-16)

- Confirmed the running Vite PID serves this workspace at localhost:5173, the active
  Chrome tab is a Paper Dojo camera route, and served source includes the latest
  wireframe code. Found trackingTest still defaulted false. Changed the test-phase
  default to true so the human overlay starts with camera readiness without a
  hidden activation step. Existing Vite tabs need a reload to discard saved state.
- Made local runtime loading abortable, including disposal during pending model
  initialization and idempotent closing. Default activation now cleans up promptly
  during StrictMode setup/cleanup, disable, route exit and camera transitions.
  Artwork dims only when confident human joints exist, not while loading or failing.
- Twelve body-tracking cases and 49 CameraSetup cases passed. Three permanent
  Chromium diagnostic cases passed after updating default-on expectations. Lint,
  typecheck/build and whitespace validation passed.
- Verified actual localhost:5173 (not the built-artifact route fixture) in Chromium
  using a photo-fed synthetic camera: tracking starts automatically, draws all
  five full-body segments, and remains active into gameplay with no page errors.
  Screenshot: /tmp/localhost-human-wireframe.png. This is a local-server/inference
  check, not physical webcam validation. The initial test fixture reused one
  stream across StrictMode's two requests and stalled; using fresh capture streams
  per request matched getUserMedia semantics and the localhost check passed.
  Removed the temporary localhost/photo test; no sample photo was added to the app.
- No changes to the user's browser security settings. No upload/deploy/commit.


### T26 final regression follow-up (2026-11-16)

- Finished a full Chromium run on 8368e7bd9de3759fa74e: **56 permanent tests
  passed / 39 intentional hidden-game skips**. The runner reported 57 passes
  because it also collected a concurrent temporary localhost diagnostic, since
  removed. No permanent scenario failed. Coverage includes public gameplay,
  keyboard controls, audio, recovery, layout, model diagnostic and privacy.
- The privacy case passed local-GET, no-microphone, local storage/default-worker
  and blocked POST checks. Its synthetic 90-frame sample recorded median 16.7 ms
  and p95 17.5 ms at 1280×720. Saved the JSON under
  /tmp/motion-play-release-review. This is render cadence with a synthetic fixture,
  not physical camera latency, thermal performance or a 60 FPS certification.
- Preserved additional concurrent diagnostic lifecycle/default-on work. Latest
  full unit/component rerun: **922 passed in 78 files**, including 12 diagnostic
  cases. Lint, typecheck, production build and artifact integrity passed again.
- The final diagnostic-provenance rebuild is **4b98994e70ca1d43e808**, with identical
  core JS/CSS to the full Chromium run: 39 payload files, 2,647,331 core bytes and
  28,456,010 pose bytes, 31,103,341 total. All existing budgets pass. Updated the
  current checklist to reflect test-phase automatic tracking after camera readiness.
- Later Chromium success supersedes its earlier launch failures. Firefox/WebKit
  remain unverified after launch failures; offline integration remains blocked by
  loopback EPERM and audit by registry DNS. Hardware and human release gates remain
  open. T26 stays pending with hardware_verified false. No deploy/upload/commit.

## Raised-hand player alignment (2026-11-16)

- Inspected the live camera rectangle/mirroring and pose rendering. Both already
  share the uncropped mirrored frame. Corrected the head marker to prefer the
  measured ear midpoint (then eyes) over a forward-projecting nose landmark.
- Added Align player(s) in setup and gameplay: re-detect the pose, face camera,
  center each player in their lane, raise both hands and hold steady for two
  seconds. Added specific framing, missing-joint, gesture and lane feedback,
  fresh-sample/steady-hold requirements, progress, completion and cancellation.
  The check never applies invented offsets or changes normalized game coordinates.
- Gameplay calibration blocks input events and uses shared pause/recovery. The
  camera keeps running; completion/cancel permits explicit Resume. Diagnostic
  failures and unmount release the block. Updated the shared recovery message
  specifically for alignment. Instructions render above skeleton strokes, and
  the successful check message clears after a short display.
- Validation: five new alignment-model cases, twelve body-tracking cases and 49
  camera flow cases passed (66). Lint, typecheck/build and whitespace checks passed.
  Four Chromium diagnostic cases passed, including a new raised-hand fixture
  scenario covering reacquisition, blocked Resume during alignment, frozen timer,
  unchanged score, completion/resume, cancellation and one continuous camera
  request. Reviewed the alignment screenshot under /tmp/player-alignment-browser.
- Browser gesture testing uses explicit fixture landmarks; it does not establish
  physical pose accuracy or prove that all reported real-camera offsets are gone.
  No new physical-webcam/multi-person validation, upload, deployment or commit.


## T26 module dependency checks and diagnostic release coverage (2026-11-16)

- Read SPEC.md/AGENTS.md and inspected the current application, privacy/runtime
  policies, camera lifecycle, browser fixtures, packaging, worker and release gates.
  Preserved camera-alignment edits appearing concurrently during this review.
- Closed imported-asset gaps: packaging/integrity now resolve literal JS imports,
  re-exports and dynamic imports plus quoted CSS imports. External/missing modules,
  unresolved bare imports and missing styles fail checks. Used the existing
  TypeScript parser to avoid treating bundle strings/comments as imports. Computed
  runtime paths remain covered by explicit required-file contracts. Counted .mjs
  and .cjs scripts in the existing core JavaScript budget. No dependencies added.
- Added three Node regression cases; all 17 packaging tests pass. Added browser
  cases for iframe local/remote connection isolation and model/WASM inference on
  blank frames before/after a genuine offline reload. They remain unverified.
  Cadence attachments now identify release, project, browser version and pose
  runtime/status. This review produced no new cadence/performance sample.
- All browser artifact readers honor MOTION_PLAY_DIST. A shared build succeeded,
  but its integrity check raced another build and lost a font; the first offline
  attempt similarly lost the report. A separate immutable Vite build/preparation/
  integrity check passed at /tmp/motion-play-t26.LSWyHS: 444c112d6734d39a686b,
  39 files, 2,651,813 core + 28,456,010 pose = 31,107,823 total bytes. All existing
  budgets pass unchanged. This is a point-in-time snapshot of concurrent source.
- Full unit/component suite passed 922 tests, then 927 in 79 files including
  concurrent alignment tests. Typecheck/lint pass. Six privacy scenarios across
  Chromium/Firefox/WebKit failed before assertions: macOS Mach-port denial 1100,
  Firefox SIGABRT, WebKit Abort trap 6. Both offline scenarios against the stable
  artifact failed at loopback listen EPERM. npm audit failed registry ENOTFOUND.
  Retained logs/traces: /tmp/motion-play-t26-browsers-snapshot* and
  /tmp/motion-play-t26-offline-snapshot*. No fresh browser, visual, dependency
  security, model inference or physical-webcam validation is claimed.
- Updated release procedure/current evidence and T26 notes. T26 remains pending
  with hardware_verified false. No deploy, upload, dependency changes or commit.

## T26 navigation cleanup with camera continuity (2026-11-16)

- Read SPEC.md/AGENTS.md and inspected navigation, all five public games,
  camera/diagnostic lifecycle, production policies, worker and release tooling.
  Starting working tree was clean. No deployment was performed.
- Found that leaving gameplay via a hash route kept the hidden game mounted,
  including its animation loop/audio scheduling. The hidden lobby video also
  retained the camera stream during gameplay. Reproduced these defects in new
  component regressions; initial fixture gaps for Rocket Rumble were corrected.
- Inactive routes now unmount gameplay and reset round/tournament flow. One
  effect attaches the retained stream only to the visible video and pauses/
  detaches it when that view exits. A late permission grant outside a camera
  route stays detached. CameraSource still owns one continuous stream; retained
  player count survives navigation and returning opens setup without another
  request. Game input remains normalized, with no camera-to-game imports added.
- Added seven passing component cases covering all five public games, frame/
  audio cleanup, view transfers, late grants, player count and stream continuity.
  Added a browser Back regression traversing all five games; it is unverified
  because engines could not launch. Added a jsdom pause stub alongside play.
- Full unit/component suite: **934 passed in 80 files**. **17 packaging tests**,
  lint, typecheck, production build/integrity and whitespace checks passed.
  Snapshot **ea99847d338919e993de** has 39 payload files, 2,651,787 core bytes plus
  28,456,010 pose bytes = 31,107,797 total. All existing budgets pass unchanged.
  These checks do not measure FPS, real-camera latency or hardware performance.
- Six baseline three-engine privacy cases and the final three-engine lifecycle
  case failed before assertions: Chromium Mach-port permission denial 1100,
  Firefox SIGABRT, WebKit Abort trap 6. Both offline cases failed loopback listen
  EPERM. Current npm audit failed registry DNS ENOTFOUND. No fresh browser,
  screenshot, model inference, cadence, dependency-security or webcam pass claimed.
  Evidence under /tmp/motion-play-t26-baseline-browsers,
  /tmp/motion-play-t26-lifecycle-browsers*, /tmp/motion-play-t26-lifecycle-offline*,
  /tmp/motion-play-t26-unit.log and /tmp/motion-play-t26-audit.log.
- Updated current release checklist and T26 notes. T26 stays pending with
  needs_hardware_validation true and hardware_verified false. No physical webcam
  validation, upload, dependency change or commit.

## Pose/video drift — paired frames and independent inference (2026-11-16)

- Inspected camera geometry, mirroring, pose rendering and the SDK. The old
  diagnostic read a moving video and rendered the returned joints later while
  the visible video continued advancing; an additional fixed 80ms wait increased
  that lag. Confirmed upstream single-person VIDEO mode also enables smoothing.
- Now capture an immutable camera frame for inference, pair its landmarks with
  that exact image, and commit the mirrored image plus skeleton before paint.
  The paired image sits behind game art; the stream and motion input keep running.
  Capture is uncropped, aspect-preserving and capped at 960px width. An old pose
  cannot be drawn over a reused/newer frame buffer. Poll scheduling accounts for
  inference time rather than always adding 80ms. Independent IMAGE-mode pose
  detection removes video-mode temporal smoothing from this diagnostic.
- Hiding the wireframe/unmounting removes its paired-image canvas. Missing or
  stale detection exposes the underlying live video. Skeletons are hidden over
  pause/results menus so they do not appear attached to the interface itself.
- Added captured-source/immutable-buffer unit checks, actual mirrored pixel
  assertions, matching canvas/video bounds and cleanup browser checks. Validation:
  **68 unit/component cases passed** (14 body tracking, five alignment, 49 camera
  flow); lint, typecheck/build and whitespace checks passed. Four permanent
  Chromium diagnostic scenarios passed, including calibration and camera continuity.
- Also verified on the actual localhost:5173 dev server with the real local model
  and a photo-fed stream: full skeleton, matched frame bounds, mirrored translation
  after shifting the photo, and removal/restoration of live video on hiding. Final
  combined browser run: **five passed**, including this temporary local test.
  Reviewed /tmp/frame-locked-human.png. Removed the temporary photo/localhost test.
  One earlier IMAGE-mode dev probe timed out on its translation assertion; a
  diagnostic rerun and the final combined run both passed, without suppression.
- These tests validate frame correspondence and the synthetic/photo path. They
  do not establish the user's physical webcam pose accuracy or prove a static
  offset is resolved; a clarification about static versus moving offset was asked.
  No physical recording, upload, deployment, dependency change or commit.

## Five-second ready check and Silk Squad (2026-11-16)

- Implemented simultaneous per-player hand-ready buttons over the centered camera.
  Every initial round, Quick Play and replay requires five continuous seconds,
  then releases the existing countdown automatically. Contacts use fresh measured
  wrists from a uniquely owned body/lane. Missing/stale observations, leaving a
  button, camera loss or a hidden tab resets the hold. Keyboard toggle and
  pointer/touch hold alternatives remain available. Camera retention is preserved.
- Added original Silk Squad (entry 34): eight-legged robot bugs, articulated legs,
  bobbing movement, scouts/spring bots, golden two-cast armor, visible hand aim,
  elastic web casts, wrap nets, cocoons traveling into collection jars, streaks,
  escalating waves, 60-second rounds and results/replay. Original synthesized cast
  sounds, capture chimes and music respect shared pause/mute. Reduced motion
  removes cocoon travel/rotation. No attraction art, code, characters or audio used.
- Added the local MediaPipe Hand Landmarker float16 v1 asset using the existing
  pinned SDK. Both pose and 21-joint finger detection use one captured image.
  Actual open-to-pinch edges fire casts; held pinches do not autofire. Wrist/body
  proximity assigns hands to lanes; ambiguous, low-confidence, missing or stale
  input is rejected. Games receive normalized events only. All processing remains
  local, with original isolated runtime CSP and no remote runtime asset loads.
- The public selection remains five: Silk Squad, Rocket Rumble, Paper Dojo,
  Bubble Battle and Window Wipe. Whack-a-Mole is preserved but hidden. Model
  provenance/license and revised optional-asset budgets are documented: core
  allowance stays 3 MB, optional pose/hand allowance 40 MB, total allowance 43 MB.
- Fixed nested target keyboard activation being intercepted by KeyboardPlayArea.
  Also hid diagnostic UI/artwork fading when sticks are hidden while retaining
  gesture inference. Synthetic canvas fixtures now explicitly request new frames;
  a still image must still deliver decoded observations to the camera watchdog.
- Full unit/component suite passed 957 tests in 84 files. Two subsequent targeted
  additions verify web audio/mute cleanup and hidden-diagnostic gesture inference;
  that final focused run passed 18 tests. Lint, typecheck, build, whitespace and
  all 17 packaging cases pass. Final artifact 16595f3ac055d305161b has 40 payload
  files: 2,678,783 core bytes plus 36,278,006 optional bytes = 38,956,789 total.
- Focused Chromium checks passed all four: empty-frame body-model lifecycle,
  pinch capture through the landmark/event/model pipeline, keyboard captures in
  four-player/narrow layouts, and actual local finger-model initialization on a
  blank frame without phantom gestures. Reviewed capture and desktop screenshots;
  diagnostic fading found there was corrected. Five-second four-hand and keyboard
  replay scenarios passed in the preceding focused run. The complete final
  Chromium regression is recorded below once finished.
- Physical webcam finger recognition, multi-person ownership quality, field of
  view, latency and gameplay feel remain unverified. Fixtures and blank-model
  inference are not physical validation. No deployment, upload or commit.

- Broader Chromium run: 60 passed, 42 intentional hidden-game skips, one missed
  synthetic pinch. Instrumented follow-up showed the scripted pinch occurred
  after a >400 ms observation gap, which correctly disarmed recognition. The
  fixture now waits for a fresh open-hand observation before closing, and waits
  for an observed reopening before the second cast. It does not bypass tracking
  freshness. Further concurrent repeats also encountered camera-ready/recovery
  interruptions while real headless models loaded; no parallel model-performance
  pass is claimed. Final model checks use one browser worker.
- Finger inference is now deferred during the body-only ready hold without
  reloading models. Actual-model tests await initialization before beginning the
  keyboard hold. Added a component regression for this transition; its first
  version omitted the event consumer and was corrected (optional-callback
  arguments intentionally do not run without a consumer). The corrected 16-case
  body-tracking suite passes. Delayed casts have a bounded 400 ms allowance,
  resolve collisions at captured target positions, and reject repeated/out-of-order
  timestamps. Tests cover this independently of the synthetic fixture issue.
- Removed duplicate generic score badges/chimes so Silk Squad owns its capture
  feedback. Final screenshots reviewed under /tmp/silk-final-repeated and
  /tmp/silk-finished-browser. No physical webcam result is implied.

- Final verification: **962 unit/component tests passed in 84 files**. **Six
  Chromium Silk Squad cases passed** (all three scenarios repeated twice with
  one worker) after fixing a ready-helper locator race at overlay removal and
  making the synthetic stream alternate one pixel to guarantee decoded frames.
  Pinch/reopen/held-pinch, four-player keyboard capture, responsive art, local
  model initialization and no phantom gestures all pass. Evidence:
  /tmp/silk-verified-browser, /tmp/silk-verified-browser.log,
  /tmp/silk-final-all-unit.log. Earlier failures are retained above, not suppressed.
  Final lint, typecheck, build, artifact integrity and whitespace checks pass;
  packaging suite remains 17 passing cases. No physical or parallel-performance
  certification, deployment, upload or commit.


## Reported five-second hand-ready failure, especially Silk Squad (2026-11-16)

- Found that Silk Squad's runtime awaited finger-model creation before returning
  the pose tracker at all. Disabling finger inference during ready had not
  removed that startup dependency. Pose tracking now returns independently;
  finger initialization is lazy and begins after ready. Initialization can remain
  pending without blocking pose samples or the ready-to-countdown transition.
- The shared ready model used a strict 400ms wall-clock freshness/reset threshold,
  which rejected a valid result after 450ms inference. It now supports bounded
  one-second observation latency/gaps and advances camera progress only on fresh
  capture timestamps. Cached contacts cannot finish the hold. New samples must
  span five seconds; long gaps, missing ownership or an actual departure reset it.
  Small exit hysteresis prevents edge jitter from dropping an established contact;
  initial entry bounds and confidence thresholds stay unchanged.
- Added unit regressions for delayed/cadenced observations, cached near-complete
  frames, long gaps, edge jitter and pending lazy hand initialization. Full suite:
  **966 tests passed in 84 files**. Lint, typecheck/build, integrity and whitespace
  checks passed. Artifact **1485d6883b47e16eda20** retains all byte budgets.
- Existing Chromium four-player wrist-ready and keyboard/replay checks passed,
  as did all three Silk Squad gameplay/local-model scenarios. Two new browser
  cases passed using the production runtime/bridge with controlled SDK outputs:
  one player at 450ms pose latency and four players at normal cadence. Both
  require measured wrist contacts, verify a departure resets progress and require
  at least five seconds after re-entry. Finger initialization is deliberately
  blocked until after the gate has completed; no ready buttons are clicked.
- Initial new browser fixtures returned no poses because their SDK stub read
  options from the wrong argument. Corrected the fixture signature and isolated
  its SDK URL from lobby initialization; both cases then passed. Earlier failures
  remain in /tmp/ready-fix-browser and /tmp/ready-fix-silk. Final new evidence:
  /tmp/ready-fix-final-silk (two passing); existing five cases passed in the first
  combined run. Unit log: /tmp/ready-fix-unit.log. Build: /tmp/ready-fix-build.log.
- This is automated/synthetic validation, not a physical webcam result. No camera
  uploads, hardware certification, deployment or commit. Reload existing localhost
  tabs to replace the already-loaded camera runtime.


## Silk Squad: cast webs from arm movement (2026-11-16)

- Replaced finger-pinch input with normalized ARM_POSITION/ARM_MOVE events from
  measured shoulder, elbow and arm-end joints. Aim follows the active arm's
  endpoint, with web strands emitted from the forearm. Moving arms can cast
  repeatedly (420ms per-player cooldown); stillness stops firing. Finger shape,
  open/reopen gestures and Hand Landmarker are no longer required by Silk Squad.
- Shoulder-relative movement rejects whole-body translation, small jitter and
  implausible jumps. Missing/ambiguous/low-confidence joints and stale samples
  reset arm history; reacquisition cannot fire by itself. Per-lane ownership and
  per-player cooldowns prevent cross-player shots. Short cast edges survive
  batched React renders and are deduplicated by the game model.
- CameraSetup now requests pose-only tracking for Silk Squad, including when
  the wireframe is hidden. Ready/alignment/tracking-loss states suppress arm
  input and reset movement history. Five-second pose-wrist ready checks remain.
  No finger-model request/initialization occurs in this game. Preserved optional
  finger infrastructure/weights for future precision games; no new dependency.
  UI/catalog instructions now say to wave arms over bots, and fallback messages
  describe body tracking rather than finger tracking.
- Full unit/component suite: **980 passed in 85 files**. A subsequent focused run
  after forearm-origin refinement passed all **38 arm/model/camera cases**.
  Final **five Chromium cases passed**: measured one/four-player ready holds
  (including 450ms pose delay), arm-wave capture/stillness/repeat capture,
  four-player keyboard/responsive presentation, and actual local pose-only
  initialization on an empty frame with no hand-weight request or phantom shots.
- The first browser run passed four cases; the real-model case hit the test
  helper's 500ms evaluation timeout during initialization. It now waits for pose
  readiness and uses bounded 3s helper actions; the final combined run passes.
  Evidence: /tmp/arm-web-unit.log, /tmp/arm-web-final-unit.log,
  /tmp/arm-web-final-browser and /tmp/arm-web-final-browser.log. Reviewed capture
  screenshot there. Synthetic/blank-frame tests do not validate physical play.
- Lint, typecheck/build, integrity and whitespace checks pass. Final artifact
  **02f5c98deb7150c13dc4**, 40 payload files: 2,682,183 core bytes plus 36,279,145
  optional bytes = 38,961,328 total; existing budgets pass. No uploads, deployment,
  dependency additions, physical webcam validation or commit. Reload localhost
  to replace any retained old game-model instance after hot refresh.

## Webcam website navigation and five-game tournament (2026-11-16)

- Deferred Silk Squad following the user's report; preserved its code and hid it
  from Catalog, Quick Play and tournaments. The public five are Rocket Rumble,
  Paper Dojo, Bubble Battle, Window Wipe and Whack-a-Mole.
- Added Home and Catalog tournament entries. One tournament keeps its player
  count through five competitive games, advances automatically after each round,
  and uses the existing simultaneous five-second wrist-ready check before each.
  Actual points accumulate per player; the highest total wins and tied leaders
  share the win. Rocket Rumble/Paper Dojo now report completion; duplicate/stale
  callbacks cannot advance another round. Window Wipe displays tournament points.
- Player 1's measured pose wrists now navigate menus, player count, Play, game
  controls, results and page scrolling through normalized UI_POINTER events.
  Comfortable upper-body reach maps to the whole viewport. A fresh 1.2-second
  hold selects a choice; movement rearms it. Screen/dialog changes, missing or
  stale observations, visibility changes and scrolling prevent accidental holds.
  Game targets and the separate five-second ready buttons are excluded.
- Reused the retained camera and current view's local pose tracker. Menu preview
  continues tracking on Home/Catalog; game loops/audio stop when gameplay ends.
  Hiding diagnostic sticks keeps navigation tracking while restoring live video
  for ordinary games. First Enable/camera permission requires a native user
  action; mouse/keyboard/touch alternatives remain. No camera uploads, dependency
  additions, deployment or commit.
- Full unit/component run: **994 tests passed across 88 files**. Subsequent
  focused runs verified adjacent small controls and scene/dialog replacement;
  the final focused run passed **11 tests in three files**. Tournament coverage
  verifies raw point totals, ties, duplicate callbacks, all five completions and
  replay without a new camera request. **17 packaging tests passed**.
- Four updated body-tracking Chromium regressions pass: blank local-model
  initialization, player count, aligned fixture joints/stick toggles, and
  alignment recovery. They reflect the new retained menu tracker; detector
  fixtures reload through a player-count change rather than hiding sticks.
- Earlier selected Chromium coverage recorded eight passes, including camera
  lifecycle, catalog, Quick Play and privacy. Two failures exposed a one-flash
  scoring fixture falling between decoded frames and a neutral menu wrist over
  a scrolled card. Replaced these with continuous changing pixels and a blank
  viewport-edge wrist. The resulting three navigation/tournament/mobile cases
  passed together in /tmp/webcam-handsfree-final.log. On the final artifact all
  **three passed again**: camera-only catalog/setup/pause/resume/exit navigation,
  the complete five-game tournament with unequal scores and correct winner, and
  narrow-screen webcam scrolling/tournament entry. All use one retained stream;
  only the initial Enable action is clicked. Final evidence:
  /tmp/webcam-navigation-release.log and /tmp/webcam-navigation-release. Reviewed
  the Home screenshot; the three choices fit the desktop viewport.
- Lint, typecheck/build and release integrity pass. Artifact
  **94a708a2337f551c4581**, 40 payload files: 2,694,829 core bytes plus 36,279,145
  optional bytes = 38,973,974 total; all existing budgets pass. Build still emits
  its advisory about a JavaScript chunk above 500 kB. Evidence:
  /tmp/webcam-handsfree-unit.log, /tmp/webcam-navigation-final-focused.log,
  /tmp/webcam-body-integration.log, /tmp/webcam-tournament-packaging.log and
  /tmp/webcam-navigation-release-build.log. These are synthetic/blank-frame
  checks, not physical webcam validation. Physical reach, gesture accuracy,
  lighting, multiplayer ownership and actual performance remain open.


## Home limited to catalog and tournament (2026-11-16)

- Removed Quick Play from Home and replaced the three-column desktop layout with
  two centered cards: Game Catalog, then 5-Game Tournament. Mobile keeps stacked
  cards. Legacy #/quick-play now opens Catalog without starting the camera/game.
- Updated the current product specification and Home/legacy-route assertions.
  All 19 App tests, lint and typecheck/build pass; existing byte budgets pass.
  Artifact a238e5785e80e2430775 has 2,694,442 core bytes and 38,973,587 total bytes.
  Initial Chromium run passed legacy-route and mobile-webcam checks; its Home
  route test incorrectly expected a camera-ready Play caption without enabling
  a camera. Corrected the assertion to verify the Tournament heading. Final
  all three Chromium cases passed. Evidence: /tmp/home-two-choices-final.log.
  Release integrity and whitespace checks pass. No hardware, deployment or commit;
  webcam behavior itself is unchanged.


## Paper Dojo cleanup and next-game research (2026-11-17)

- Removed the bamboo bonus from the model, renderer, CSS, score statistics and
  catalog instructions. Ninja waves and obstacle schedules continue throughout
  the former 18–24s and 42–48s interruptions; per-player scoring, deterministic
  coarse/fine simulation, recovery, replay and tournament completion remain.
- Paper Dojo no longer shows the body wireframe or diagnostic controls in setup
  or play. Local pose tracking still supplies website navigation and the
  five-second ready gate. Other games retain their diagnostic preference.
- Final focused unit/component run: 91 passes in five files covering Dojo,
  camera integration and tournament completion. An initial run had 90 passes
  and one failure from a new Dojo assertion accidentally placed in the Freeze
  fixture; moved it to the intended Dojo test and reran successfully.
- Lint, typecheck/build, integrity and whitespace checks pass. Artifact
  08d4725dcb2cbe053b93 has 2,691,405 core bytes and 38,970,550 total bytes; all byte
  budgets pass. Build retains its advisory about the >500 kB JavaScript chunk.
  Evidence: /tmp/dojo-cleanup-tests-final.log, /tmp/dojo-cleanup-build.log,
  /tmp/dojo-cleanup-integrity.log and /tmp/dojo-cleanup-browser.log.
- User additionally requested next-game planning. Consulted the original
  EyeToy: Play instruction manual and the published game-analysis study
  (https://pmc.ncbi.nlm.nih.gov/articles/PMC4290029/). The original disc lists
  twelve games; Beat Freak is a candidate for an original rhythm adaptation.
  No next game has been implemented or selected by the user.
- No physical webcam validation, camera upload, dependency change, deployment
  or commit. Browser checks use synthetic video and are recorded below.

- All four targeted Chromium scenarios pass on the final artifact: uninterrupted
  waves/pause/replay, synthetic camera strike with real audio scheduling, four
  player/narrow layouts without a visible skeleton, and obstacle score isolation.
  Screenshot evidence: /tmp/dojo-cleanup-browser (four-player capture reviewed).

## Window Wipe rebuilt around successive soapy windows (2026-11-17)

- Replaced the single 60-cell smudge board with original procedural soap, chalk
  swirls, bubbles, ink spots and a crayon window frame over the retained live
  camera. Smooth model-owned elliptical brush discs reveal the video; a hidden
  40×30 coverage grid measures progress without appearing as artwork.
- Added moving squeegees, bubble trails, three-pass rubbing/dot indicators, ink
  pop sparkles, a pane-clear stamp and lifting foam. Each player independently
  advances after 94% soap and all ink are removed. Rounds now last the full 60
  seconds; points accumulate through as many windows as players clean.
  Completed panes score 180 (100 soap, 30 ink, 50 completion). Progress includes
  both materials; standalone/tournament headers show actual points consistently.
- Added original local filtered swishes, short squeaks, rising bubble pops,
  ascending sparkle fanfare and quiet plucked accompaniment through shared
  GameAudio. Mute/pause/exit cleanup also stops noise sources. No new assets,
  dependencies, recordings, uploads or copied music/art. Window Wipe starts with
  diagnostics hidden while retaining the test toggle and background menu/ready
  tracking. Existing camera/navigation and game-input boundaries are preserved.
- Hardened samples before clock advancement: malformed/range/confidence checks,
  per-player timestamp/spatial duplicate rejection, stale/pre-resume/pre-window
  guards, fresh spaced rubbing and no interpolation between separate arms.
  Paint retention is bounded by newly revealed coverage and reset per window.
  Pauses freeze window transitions and effects. Reduced motion suppresses
  decorative movement without hiding progress or cleaning.
- Initial focused run exposed four keyboard assertions expecting the retired
  percentage score header; updated them for actual point totals. Updated the
  browser grid assertion to check two canvases and no visible tile spans.
  The first complete unit run passed 1,015 cases; three targeted Chromium cases
  passed for raster clearing/effects/sound/window advance/replay, keyboard/recovery,
  and four-player mirrored motion/narrow layouts. Reviewed those screenshots;
  replaced the visible scalloped eraser edge with feathered measured brush discs.
- Final full unit/component suite: **1,016 passed across 90 files**. Smooth-disc
  and washing-audio focused checks also pass. Build/lint/typecheck, integrity
  and existing byte budgets pass. Artifact **62df54b50e3b08501d08**, 40 payload
  files: 2,706,607 core plus 36,279,145 optional bytes = 38,985,752 total.
  JavaScript 521,867 and CSS 153,283 bytes remain within unchanged limits. The
  existing advisory about a >500 kB JavaScript chunk remains.
- Evidence: /tmp/wipe-final-unit.log, /tmp/wipe-smooth-tests.log,
  /tmp/wipe-smooth-build.log, /tmp/wipe-final-integrity.log and
  /tmp/wipe-rebuild-browser. Final targeted browser results are recorded below.
  Automated/synthetic checks are not physical camera or speaker validation.
  No physical validation, deployment or commit was performed.
- All **six** final Chromium integration cases passed: countdown/gameplay camera
  recovery, keyboard/replay focus, the full five-game tournament, complete
  cleaning/ink/transition/audio/mute/replay flow and four-player mirrored motion
  with narrow-screen containment. Evidence: /tmp/wipe-final-browser.log and
  /tmp/wipe-final-browser. Reviewed normal/smooth-reveal/four-player captures.
- A final accessibility correction also removes vertical particle drift under
  reduced motion. Artifact **118db6a352b556bb76c1** supersedes the previous build:
  JavaScript 521,873, CSS 153,283, core 2,706,613 and total 38,985,758 bytes; all
  limits remain unchanged. /tmp/wipe-accessibility-build.log records the build.
  The new browser assertion observes real particle-canvas draw coordinates under
  reduced motion, alongside disabled CSS entrance animations. No motion-sensor
  or physical audio quality claim follows from these synthetic observations.
- Both final washing browser cases passed again on artifact
  118db6a352b556bb76c1, including the reduced-motion particle-position regression.
  Evidence: /tmp/wipe-accessibility-browser.log and
  /tmp/wipe-accessibility-browser. Final typecheck, lint, release integrity and
  whitespace checks pass. Physical webcam/speaker checks remain open.

## Paper Jam: original Beat Freak-style rhythm game (2026-11-17)

- Added Paper Jam (#/camera/beat-freak): four original animated instrument
  speakers, incoming records, timing rings, deck/meter movement, Perfect/Good
  judgments, streak multipliers and hit sparks over the uncropped live camera.
  The 60-second deterministic 100 BPM chart progresses from a count-in through
  quarter notes, offbeats and paired accents. All players receive the same chart.
- Added original quiet synthesized kick/snare/hats/bass/plucked accompaniment and
  strike-specific voices. A 25 ms/120 ms lookahead scheduler anchors audio to the
  round's absolute 150 ms grid using Web Audio scheduling. Rendering does not
  independently advance music; stalls skip past steps, pause/recovery cancels
  future voices, mute rejoins the current grid, and replay resets the timeline.
- Only normalized MOTION_HIT events enter the game; no camera/media imports or
  finger shapes. Model validation covers malformed/stale/pre-resume/duplicate
  input, capture-time judgment, aspect-correct circles, player ownership and
  simultaneous distinct samples. Keyboard 1–4 on release, native speaker buttons,
  pointer/touch and shared aim/action fallback remain. Reduced motion suppresses
  decorative spinning/pulsing while preserving essential note travel.
- Kept five public choices by replacing Whack-a-Mole in Catalog and the fourth
  tournament round; preserved its hidden implementation. Added original catalog
  art/routing, cumulative completion-once integration, existing five-second ready
  checks and retained camera/menu navigation. Diagnostics start hidden for Paper
  Jam. No external assets/music, new dependencies, uploads, deployment or commit.
- First five focused files passed 55 tests. Full unit/component run passed
  **1,048 tests in 92 files**. Added chart/scoring/scheduler/view/audio tests and
  updated public catalog/tournament expectations. An initial lint attempt found
  a browser-fixture this-alias and effect-cleanup ref warning; captured the
  scheduler reference and used a clock getter, then lint/typecheck/build passed.
- All **six targeted Chromium cases pass** on the final artifact: note travel,
  timing/keyboard combo/instrument scheduling, ahead-of-time audio, pause/mute/
  replay/reduced motion, four-player mirrored synthetic camera scoring, gameplay
  and countdown camera recovery, compact catalog selection, and the complete
  revised five-game tournament with correct cumulative winner. Reviewed records,
  combo, four-player and narrow captures. These are synthetic tests, not a claim
  of physical camera latency, reach or perceived audio synchronization.
- Final artifact **6e7c82bcef76803eff93**: 40 payload files, JavaScript 537,709,
  CSS 157,418, core 2,726,584 plus 36,279,145 optional bytes = 39,005,729 total.
  Existing budgets pass without changes; the >500 kB chunk advisory remains.
  Lint, typecheck/build, release integrity and whitespace checks pass.
- Evidence: /tmp/beat-initial-tests.log, /tmp/beat-full-unit.log,
  /tmp/beat-final-build.log, /tmp/beat-integrity.log, /tmp/beat-browser.log and
  /tmp/beat-browser. Real-device camera/audio validation remains open.

## Physical hand-over-button website navigation (2026-11-17)

- Replaced the small menu preview/expanded Player 1 cursor with the complete
  mirrored camera behind Home and Catalog. Menus share the camera's uncropped
  contain/letterbox rectangle with gameplay. Home choices sit to either side;
  all five catalog choices and header commands fit the image without scrolling.
  Poster Home remains before native camera activation. Crayon assets/font remain.
- UI_POINTER retains each measured wrist's real mirrored position. Projection
  only translates/scales into the camera rectangle; no lane expansion, upper-body
  reach scaling or artificial cursor gain remains. Any detected body can choose,
  including across game-lane borders. Duplicate body observations are rejected.
  Stable anatomical wrist IDs survive the other wrist leaving the camera.
- Selection now requires three seconds of fresh continuous contact by the same
  wrist. Another hand cannot inherit its progress. Departure, missing/weak data,
  stale/cached captures, visibility, resize or scroll reset the hold. Deliberate
  movement rearms after selection/scene changes. A measured wrist marker and
  button-local ring/countdown show contact. The separate five-second ready gate
  and game scoring are unchanged. Mouse/touch/keyboard alternatives remain.
- Retained one camera and the existing local tracker. Menu landmarks and the
  camera image are frame-paired, with skeleton diagnostics hidden. No uploads,
  finger model, dependency change, recording, deployment or commit. Removed
  obsolete tile-era Window Wipe span CSS to keep the unchanged CSS budget.
- Focused geometry/navigation/tracking tests initially passed 40 cases. Full unit
  run passed 1,054; after stable body/wrist refinements, final full suite passed
  **1,056 cases across 92 files**. Subsequent focused navigation checks passed
  **17 cases** after capturing scalar layout dependencies to resolve a lint
  warning without repeatedly resetting layout during incoming pose frames.
- All **three Chromium navigation cases pass**: catalog/game/player/Play/pause/
  resume/exit/Home, complete five-game tournament with ready holds and correct
  winner, and desktop/portrait menu containment. Each selection asserts at least
  three seconds elapsed; all paths retain exactly one camera stream. Reviewed
  Home and both catalog viewport captures. After centering Home labels and the
  layout-dependency refinement, the containment/camera-navigation case passed
  again on the final artifact. These are synthetic observations, not real-webcam
  tracking/comfort certification.
- Final artifact **cc43e35237ab0dd42b64**: 40 payload files, JavaScript 538,845,
  CSS 159,543, core 2,729,845 plus 36,279,145 optional bytes = 39,008,990 total.
  Existing budgets pass without changes. Lint, typecheck/build, release integrity
  and whitespace checks pass; the existing >500 kB chunk advisory remains.
- Evidence: /tmp/physical-menu-final-unit.log,
  /tmp/physical-menu-release-unit.log, /tmp/physical-menu-browser.log and
  /tmp/physical-menu-browser; final repeat in
  /tmp/physical-menu-release-browser.log and /tmp/physical-menu-release-browser;
  /tmp/physical-menu-release-build.log and /tmp/physical-menu-release-integrity.log.
  Real-device pose accuracy, reach and multiplayer selection comfort remain open.

## Minimal game entry, automatic camera and shared player choice (2026-11-17)

- Player count is chosen once on Home and retained in sessionStorage for this
  tab, including reloads and game/tournament navigation. Home provides a small
  deliberate change action. Camera navigation requests the default camera on
  entry, respects native browser permission, and retains one stream. Original
  kids/sun/rainbow artwork sits at the menu edges.
- Each public game now opens directly into a compact original looping movement
  video, one instruction and one hand button per player. Fresh simultaneous
  five-second contact starts the existing three-second countdown; only its
  numerals remain visible over the camera until play. Removed repeated player
  selectors, Play confirmation, targets, HUD, distance prompts, wireframe and
  tournament ribbon from preparation. Small Games exit and genuine camera-error
  recovery remain. Replays and every tournament round use the same introduction.
  New tournament restarts directly; exits return to Catalog with players retained.
- Five silent 320×180, 24 fps, three-second MP4s were generated from original local
  canvas stick figures. Rebuild script: scripts/generate-intro-videos.mjs, using
  installed Playwright and ffmpeg (optional FFMPEG_PATH). No runtime dependency,
  external artwork, recording, camera upload, deployment or commit was added.
- Hand markers/readiness now use confident measured palm centers with wrist
  fallback, stable wrist identity and one mirroring step. Menu projection reads
  the actual video rectangle, including page offsets. Added palm/fallback,
  projection, lower ready-button geometry and once-only selection regressions.
  Diagnostic sticks continue to follow measured wrists/body joints during play.
- Paper Jam comparison is recorded in docs/PAPER-JAM-AUDIT.md with primary and
  secondary source links and explicit differences/uncertainties. No original
  footage was watched (video fetches were throttled). Corrected its camera-input
  adapter: continuous normalized occupied samples bypass the generic 280 ms hit
  debounce; per-note rhythm validation still prevents duplicate awards. Adapter
  coverage and two valid Good strikes only 180 ms apart pass.
- Full unit/component run: **1,061 passes across 92 files**. After the tournament
  restart refinement, **142 focused cases pass**; the additional close-strike
  regression passes in the **29-case rhythm file**. All **17 packaging cases**,
  final lint, typecheck, production build, integrity and whitespace checks pass.
- **21 distinct targeted Chromium scenarios pass across runs**: four physical
  menu/complete-tournament/all-five-intro/portrait scenarios; ten player-ready,
  player-choice, minimal-entry, catalog and Paper Jam cases; seven wireframe,
  alignment, permission recovery and privacy cases. Final complete tournament
  (including restart) and all-five introduction scenarios passed again on the
  final artifact. Reviewed desktop/portrait intro and bare-countdown captures.
  Tests exercise five fresh seconds, interruption/reset, replay, actual video
  playback, retained player count, no scrolling, one stream, no microphone and
  same-origin GET-only asset requests; privacy probes remain blocked.
- Initial failures were corrected: a lifecycle fixture now waits until permission
  is actually pending; browser fixtures register pose overrides before automatic
  startup, remove retired Play clicks and locate hidden Pause during countdown;
  the privacy probe names its iframe to distinguish it from the automatically
  mounted tracker. An initial CSS-budget failure was resolved by removing unused
  settings/zone/legacy setup styles, without increasing any budget.
- Artifact **517397c1c7020fad54c6**: 45 payload files; JavaScript **541,585**,
  CSS **158,449**, core **2,784,963**, optional pose **36,279,145**, total
  **39,064,108 bytes**. Existing >500 kB JavaScript advisory remains. No full
  cross-browser, offline or physical-webcam certification is claimed.
- Evidence: /tmp/intro-final-unit.log, /tmp/intro-final-focused.log,
  /tmp/intro-beat-regression.log, /tmp/intro-browser.log,
  /tmp/intro-integration-browser.log, /tmp/intro-integration-retry.log,
  /tmp/intro-final-browser.log, /tmp/intro-final-browser,
  /tmp/intro-recovery-browser.log, /tmp/intro-privacy-retry.log,
  /tmp/intro-final-build.log, /tmp/intro-integrity.log,
  /tmp/intro-packaging.log, /tmp/intro-release-lint.log,
  /tmp/intro-release-types.log. Real-body palm accuracy, multiplayer reach,
  perceived audio quality/timing and camera performance remain hardware checks.

## Centered player choices and original font draft (2026-11-17)

- Found that the four Home choices inherited a card aspect ratio and intrinsic
  minimum width. At 1440×900 the last button extended beyond the camera's right
  edge; the same overflow occurred at 390×844. The grid container itself was
  centered, so previous container-only assertions did not detect this defect.
- The player row now uses four `minmax(0,1fr)` tracks, and only its buttons reset
  minimum width/aspect ratio. The actual four-button envelope, each label/number
  and every button's containment are checked on desktop and portrait. Reviewed
  both corrected captures; other game/menu sizing and normalized input unchanged.
- Generated **Motion Scribble draft 01**, an original rounded handwritten font
  with Regular/Bold weights, 223 mapped characters, Latin accents, numerals,
  arrows and symbols. Original vector pen drawings/outline construction are in
  scripts/generate-motion-font.py; fontTools/Brotli were installed only in a
  temporary build environment. No font outlines were copied from existing faces.
  TTF/WOFF2 assets and MIT license are served locally from public/fonts.
- Added /font-preview.html with editable sample text, actual game titles, player
  numbers, body/small text and native TTF downloads. The application retains its
  existing Short Stack face while this original draft is reviewed. The preview
  uses the canonical production privacy policy; no scripts or network data calls.
- Both final Chromium cases pass: four-button envelope/label/number alignment and
  font weights/editable text/narrow layout/native downloads. The font specimen's
  downloads were verified against an actual loopback static server; intercepted
  virtual-domain downloads initially canceled. A first narrow preview overflow
  and missing canonical CSP placement were fixed without relaxing release rules.
  Browser font loading/visual review exposed and corrected the original 8's
  counters. FontTools checks verify ASCII/accent/sample coverage, vertical bounds,
  and both open counters. These checks are not a physical-camera certification.
- Production build/typecheck, lint, integrity and whitespace pass. Artifact
  **967e3b3db2c48bb3d028**: 52 payload files; JS 541,585, CSS 159,783, core
  2,926,272, optional pose 36,279,145, total 39,205,417 bytes. Existing budgets
  unchanged; existing >500 kB bundle advisory remains. No deployment/commit.
- Evidence: /tmp/player-center-before.log, /tmp/player-center-after.log,
  /tmp/motion-font-release-build.log, /tmp/motion-font-release-browser.log,
  /tmp/motion-font-release-browser, /tmp/font-finish-lint.log and
  /tmp/font-finish-integrity.log. Live dev preview verified with HTTP 200 at
  http://localhost:5173/font-preview.html.

## Stable pointers, three-second holds and natural handwriting (2026-11-17)

- User shortened every hand-selection hold to three seconds. Navigation and
  readiness now share HAND_HOLD_MS=3000, including single/multiplayer entry,
  replay and every tournament round. Countdown remains three seconds. Instructions
  and progress use the same duration; interruption/freshness/body ownership guards
  remain. Historical five-second entries above describe superseded behavior.
- Added HandPointerStabilizer between actual-video projection and both menu hit
  testing and pointer rendering. A 3–9 px band scaled to camera size holds small
  tremors still. Moderate movement has a 45 ms time constant; large deliberate
  reaches follow immediately. Separate hand histories reset on disappearance,
  weak/invalid/stale observations, long gaps, route/dialog changes, visibility,
  resize and scroll. No synthesized frames, prediction, button-center snapping,
  game-input smoothing or extrapolated dwell time. Ready geometry retains its
  existing measured-hand contact hysteresis.
- Reworked original Motion Scribble revision 02 with looser looped pen forms,
  pressure/taper variation, small lean/width/height/baseline differences and ten
  contextual alternates. Repeated letters use actual OpenType alternate outlines,
  not per-letter HTML transforms. Applied the two local weights throughout the
  site; headings use real Bold rather than synthetic outline/weight. The editable
  /font-preview.html specimen and TTF downloads show the same revision.
- **1,069 unit/component cases pass in 93 files**, including six new filtering
  regressions and a render/selection integration check. The tests cover fresh
  timestamps while stationary, responsive deliberate reaches, gradual motion,
  missing/weak/replayed samples, separate hands, departure and three-second holds.
- **All nine targeted Chromium cases pass**: font weights/contextual alternates/
  editable samples/native downloads, centered four-player controls, interrupted
  four-person ready holds, keyboard/replay, full webcam navigation, complete
  tournament/restart, portrait containment, all-five introductions/countdowns, and
  injected small two-axis tremors selecting a player choice after three seconds.
  In the jitter scenario, marker drift stays below 0.5 px during a 2.2 s observed
  hold while fresh pose samples continue. Reviewed font/desktop/portrait captures.
- FontTools verifies ASCII/accent/sample coverage, differing alternate outlines
  and unclipped vertical bounds for both weights. Full typecheck, lint, production
  build, release integrity and whitespace pass. Artifact **2ea864c551ee2109feaa**:
  51 files, JS 542,813; CSS 159,825; core 2,906,099; optional pose 36,279,145;
  total 39,185,244 bytes. Existing budgets unchanged; >500 kB chunk advisory stays.
  Removing the active Short Stack payload offsets the expanded original family.
- Evidence: /tmp/steady-hands-unit.log, /tmp/steady-handwriting-all-unit.log,
  /tmp/steady-handwriting-browser.log, /tmp/steady-handwriting-browser,
  /tmp/steady-handwriting-build.log, /tmp/steady-handwriting-final-lint.log,
  /tmp/steady-handwriting-final-types.log, /tmp/steady-handwriting-integrity.log.
  Synthetic tests do not certify physical-camera stability, natural reach,
  perceived lag or human readability. No deployment, uploads or commit.

## Hide two games and reduce the public tournament (2026-11-17)

- User rejected Rocket Rumble and Bubble Battle's current quality. Both are now
  hidden from the catalog, camera/detail URLs and tournament, retaining code,
  assets and model/component tests for future rework. The bare camera route now
  opens Paper Dojo rather than the hidden Bubble Battle fallback.
- Current catalog: **Paper Dojo, Window Wipe, Paper Jam**. The public-list data
  also generates the tournament schedule and count labels. It temporarily runs
  three distinct games once each, preserving totals, ties, retained players,
  one camera, three-second ready checks and tournament restart. Centered the
  third camera-menu choice below the two upper choices; native grid has three.
- Updated relevant browser fixtures to use remaining public games, and explicitly
  skip dedicated Rocket/Bubble browser cases under the existing hidden-game
  policy. Generic model/component coverage remains. Full tournament score input
  now uses camera brushing in Player 2's Window Wipe lane instead of bubbles.
- Inspected the current application and compared the original EyeToy: Play lineup
  with Sony's archived manual (pp. 14–15) and regional-name/descriptive references.
  docs/EYETOY-PLAY-CATALOG.md lists all twelve, three current adaptations, eight
  other candidates and separately paused Rocket Rumble. Hidden generic prototypes
  are distinguished from dedicated EyeToy-style adaptations. No new game copied
  or created before the user's choice.
- **80 relevant unit/component checks pass across four files**, including four
  newly hidden direct-route cases and schedule/winner/restart coverage. All
  **eight targeted Chromium scenarios pass**, including catalog/skip links,
  hidden-link fallback, full physical menu navigation, complete three-game
  tournament/restart, portrait containment, all-current-game introductions and
  stable jitter selection. Reviewed the final camera-catalog capture. These are
  synthetic observations, not hardware or game-quality certification.
- Lint, typecheck, production build, integrity and whitespace pass. Artifact
  **b925fcec0c452d2a37a9**: 51 files, JS 542,604; CSS 159,834; core 2,905,899;
  optional pose 36,279,145; total 39,185,044 bytes. All unchanged budgets pass;
  the existing >500 kB bundle advisory remains. No deployment or commit.
- Evidence: /tmp/catalog-prune-unit.log, /tmp/catalog-prune-build.log,
  /tmp/catalog-prune-browser.log, /tmp/catalog-prune-browser,
  /tmp/catalog-prune-lint.log, /tmp/catalog-prune-types.log,
  /tmp/catalog-prune-integrity.log. Full unit/browser suites were not rerun;
  this change used relevant checks and retained historical model coverage.

## 2026-11-17 — Cardboard Champ (T36)

- Implemented the user's Boxing Chump choice as an original cardboard robot bout
  on the existing `punch-arena` route. Written original-game references informed
  opponent/head/body/dodge mechanics; no original assets or audio were copied.
- Measured wrist travel and fresh head positions pass through `input/BoxingInput`.
  Game model/rendering import no camera/media libraries. Independent wrist/player
  histories, confidence, freshness, cooldown and pause/countdown boundaries block
  stationary/duplicate/old observations. Missing heads cannot earn dodge points.
- Articulated robot guard/windup/recoil/knockdown, impact bursts, combo scoring,
  faster rematches, original thud/whoosh/dodge/bell sounds and three-second local
  tutorial. Aspect-aware robot proportions and matching hit areas work in narrow
  multiplayer lanes. Existing reduced-motion, mute, recovery and readiness retained.
- Public catalog and tournament now four games. Rocket Rumble/Bubble remain hidden.
  Old generic Punch Arena source retained for history but no longer mounted.
- **133 relevant unit/component tests across seven files pass**. Nine Chromium
  scenarios pass (catalog, complete four-round tournament/restart, webcam menus,
  intro/countdown, portrait and jitter, plus new boxing). Both boxing cases were
  rerun after the final proportions/readability work and pass: synthetic wrist
  motion scores, stationary hands stop scoring, replay retains camera, four lanes
  stay aligned and keyboard scores remain isolated under reduced motion. Reviewed
  final one-/four-player captures. No physical camera/speaker validation claimed.
- Lint, typecheck, build and release integrity pass. Artifact
  **9019530867f253e76159**: 52 files, JS 548,735; CSS 158,786; core 2,920,821;
  optional pose 36,279,145; total 39,199,966 bytes. Budgets unchanged; existing
  bundle-size advisory remains. No runtime dependencies/model downloads added.
- Evidence: `/tmp/boxing-final-tests.log`, `/tmp/boxing-browser.log`,
  `/tmp/boxing-final-browser.log`, `/tmp/boxing-final-browser`,
  `/tmp/boxing-final-build.log`, `/tmp/boxing-final-lint.log`.
  No deployment/commit. Full unrelated test suites were not rerun.

## 2026-11-17 — Clearer, faster boxer attacks

- Fixed the glove's vertical discontinuity on the contact frame and replaced its
  slow lateral slide with a readable pullback, rapid extending punch, perspective
  growth, speed strokes, contact ring and continuous retract. Alternating gloves
  travel in camera space toward the marked danger region, including narrow lanes.
- Shared timeline: 550 ms anticipation + 140 ms accelerated strike = 690 ms dodge
  judgement; 90 ms contact hold + 220 ms retract. Previously the forward strike
  lasted 450 ms and contact came at 1,100 ms. Base attack cadence now 3,500 ms
  rather than 4,400 ms, with a 2,400 ms floor. Whoosh aligns with strike launch.
- 22 focused timing/model/audio checks pass, including exact contact boundary,
  single damage judgement and pause continuity. Both boxing Chromium scenarios
  pass, covering synthetic wrist scoring, stationary input, replay/camera reuse,
  four-player geometry and independent keyboard scoring. Reviewed a rendered
  anticipation/strike/contact sheet at `/tmp/boxing-attack-sheet.png`.
- Lint and production build/types/release budgets pass. No new assets, models,
  dependencies, uploads or external calls. Physical webcam feel remains untested.
- Evidence: `/tmp/boxing-attack-tests.log`, `/tmp/boxing-attack-browser.log`,
  `/tmp/boxing-attack-lint.log`, `/tmp/boxing-attack-build.log`.

## 2026-11-17 — Keep Ups (T37)

- Implemented the agreed Keep Ups / Soccer Craze inspired game with original
  local football artwork/tutorial, gravity, spin, squash/release, trails, bunting,
  touchline, confetti, header bonuses, streaks, golden hoops and automatic re-serves.
  Layered synthesized thuds, header tones, drop whistle and crowd-style celebrations
  use shared mute/pause/visibility/exit cleanup. No copied artwork/audio or new model.
- `KeepUpsInput` converts measured head/wrist/arm/torso geometry to normalized
  BODY_MOVE points/segments. Fixed 120 Hz substeps and aspect-correct contacts keep
  the circular football on the actual camera plane. A timestamped pose history
  fixed valid contacts being skipped when a new frame arrived ahead of simulation.
  Missing/ambiguous/old/low-confidence inputs cannot create invisible saves; pause
  and replay clear histories. Pointer/keyboard fallback expires after a short time.
- Added the fifth catalog card and tournament round. Replaced the duplicated camera
  route list with guarded catalog-derived routing after the browser test exposed
  the missing new route. Hidden Rocket Rumble source remains available in development;
  excluding its unreachable production code kept the existing release budgets.
- **109 relevant unit/component checks pass across six files**. All **11 targeted
  Chromium scenarios pass**, including measured-pose one-/four-player scoring,
  tracking loss, pointer fallback, pause/replay and retained stream, catalog/hidden
  routes, complete five-game tournament/restart, camera menus, portrait containment,
  every intro/countdown and jitter stability. All three Keep Ups browser cases pass
  again after lowering the normal bounce apex below the HUD/removing redundant labels.
  Reviewed final one-/four-player captures. No physical camera/speaker claim.
- Lint, types, build, integrity and whitespace pass. Artifact
  **ae296928249eaac1948a**: 53 files; JS 546,628; CSS 158,786; core 2,928,085;
  optional pose 36,279,145; total 39,207,230 bytes. All unchanged budgets pass;
  existing >500 kB bundle advisory remains. No deployment or commit.
- Evidence: `/tmp/keep-ups-final-tests.log`, `/tmp/keep-ups-final-browser.log`,
  `/tmp/keep-ups-polish-browser.log`, `/tmp/keep-ups-polish-browser`,
  `/tmp/keep-ups-final-build.log`, `/tmp/keep-ups-final-lint.log`,
  `/tmp/keep-ups-integrity.log`. Full unrelated suites not rerun.

## 2026-11-17 — Keep Ups losing conditions and pace

- Shortened Keep Ups from 60 to 30 active seconds and added three lives per player.
  Each miss costs one life; eliminated players stop receiving balls and scoring.
  Survivors continue independently, and all players out ends the round early.
  Replay restores lives; tournament advances on the same completion callback.
- Gravity/lateral speed now increase during play. Sustained side drift replaces
  the repeating bounce that could sustain stationary headers. Every six seconds
  from eight seconds in, a 900 ms directional warning precedes a one-second gust.
  Added life indicators, readable wind/early-loss feedback, moving gust strokes
  (suppressed under reduced motion), and updated the minimal introduction/rules.
- 23 focused model/tournament checks pass, including exactly three misses, early
  finish, survivor isolation, 30-second perfect-play cap, gust warning boundaries,
  stationary-vs-following play and replay. Three final Keep Ups Chromium checks
  pass (one/four players, visible wind, life loss, early results, replay, retained
  camera and pointer fallback). The five-game browser tournament also passes.
  The first solo browser check exposed a fake-clock baseline reset in the test;
  it now advances from captured browser performance time, and the rerun passes.
- Reviewed the wind warning/lives capture. Lint, types, build and unchanged budgets
  pass; artifact **8dd66c79c346545a65b6**: JS 547,838; CSS 158,786; core 2,929,295;
  pose 36,279,145; total 39,208,440 bytes. Existing bundle advisory remains.
  No new assets/dependencies or deployment. Real-camera difficulty balance is
  unverified; synthetic tracking is not physical gameplay validation.
- Evidence: `/tmp/keep-ups-challenge-tests.log`,
  `/tmp/keep-ups-challenge-final-browser.log`, `/tmp/keep-ups-challenge-browser.log`,
  `/tmp/keep-ups-challenge-build.log`, `/tmp/keep-ups-challenge-lint.log`.

## 2026-11-17 — Cardboard Champ ring depth and panel cleanup

Removed the floating opponent health/name box. Moved the ring ropes/posts into
the foreground and raised the top rope across the lower torso, so the robot
stands behind the ring. Warning/feedback layers remain above the ropes. Reviewed
the four-player capture; both one-/four-player Chromium cases pass, including
pose scoring, replay and camera reuse. Lint, types/build/release budgets and
whitespace pass. Artifact `566271a5978dd5c8b71f`. Evidence:
`/tmp/boxing-ring-build.log`, `/tmp/boxing-ring-lint.log`,
`/tmp/boxing-ring-browser.log`, `/tmp/boxing-ring-browser`.
Visual-only change; no new hardware gameplay claim or deployment.

### Ghost Catcher — 2026-11-17
- Implemented original friendly paper ghosts with repeated motion-mask rubbing, swelling expressions/progress arcs, flapping bats, pop confetti, escape feedback and local synthesized rubbing/capture/escape sounds. No supplied or third-party assets needed.
- Added local animated stick-figure tutorial, catalog artwork and sixth public route; retained existing three-second readiness/countdown and five-round tournament schedule. Independent 1–4-player lanes, 45-second limit, five escapes/lives, accelerating waves and combo points.
- Fixed sixth catalog card overlapping Paper Dojo in camera-navigation mode. Retained hidden Silk Squad source/dev support but removed its production code to preserve release budgets.
- Validation: 48 focused model/app/tournament/audio tests pass. Six final Chromium gameplay/catalog tests pass, including synthetic camera-pixel capture without pointer input, 1/4-player rubbing, pause/results/replay and one retained camera stream. Both narrow-screen and all-six-game tutorial/countdown browser checks pass. Reviewed rendered four-player game and six-card catalog.
- Initial catalog browser run failed because of the overlap; final run passes after correction. Initial unit run caught the old five-card assertion; updated to six. Lint, typecheck, build, release integrity and diff whitespace pass. Artifact cf35a17dbb3621eca396: JS 548345, CSS 158863, core 2942669, total 39221814 bytes, unchanged budgets.
- Physical webcam lighting/arm comfort/multiplayer spacing and speaker playback remain unverified. Written EyeToy references informed mechanics; no claim of frame-by-frame video review. See docs/GHOST-CATCHER.md.

### Ghost Catcher review — 2026-11-17
- Found and fixed frame-dependent movement: the old 100 ms cap slowed ghosts on long frames while the round timer continued. Fixed 20 ms simulation now produces equal positions/spawns/lives at 16 ms, 250 ms and 3-second update intervals.
- Mixed input batches cannot reuse stale contact locations with a newer timestamp; view preserves event kinds. Added regression coverage for actual combo points and eliminated-player isolation.
- Added entrance animation, visible escape warnings, actual awarded points/combo pop labels and explicit life-loss text. Reduced-motion keeps decorative pop travel/expansion stationary. Clear eliminated players' remaining targets without artificial loss feedback.
- Coalesced duplicate multiplayer sounds per frame, suppressed rub underneath captures and skipped delayed escape sounds after stalls.
- Verification: 19 focused model/audio tests pass; final 11 model tests rerun after cleanup. Four Chromium scenarios pass: one player, four players with reduced motion, synthetic camera pixels triggering captures, and escape-warning alignment. Reviewed warning screenshot. Lint/typecheck/build/release integrity/diff whitespace pass. Artifact 12487091cc9789533108; JS 549238, CSS 158863, core 2943562 bytes, unchanged limits.
- No physical webcam, speaker or child playtest performed. No dependencies, external assets, deployments or commits added.

### UFO Juggler — 2026-11-17
- Researched written Sony manual and published movement analysis; corrected the initial keep-it-airborne description to spin saucers upward. Implemented an original spin/coast rescue game with overheating and engine stalls, rather than duplicating Keep Ups. No original game assets/characters or video-review claims.
- Added normalized motion-mask control, fresh-frame/duplicate guards, fixed 20 ms flight/heat simulation, three lives, 40-second cap, isolated lanes, close-save points and rescue streaks. After twelve seconds, paired arrivals create simultaneous juggling, bounded at three active saucers per player.
- Original dome/pilot artwork, rotating rim lights, crayon hatching, engine trails, heat smoke, launch/crash effects, sound synthesis and ascending streak fanfares. Reduced-motion and shared mute/recovery respected. Added generated stick-figure tutorial and icon; no dependencies or supplied assets needed.
- Catalog now seven; webcam cards occupy unique fitted positions. Existing five-game tournament stays unchanged. Hidden Magic Duel and Fruit Slash remain in source/dev and are excluded from production code to preserve budgets.
- Verification: 55 initial focused model/audio/App/tournament tests pass. After paired-arrival and streak refinement, all 22 model/audio tests pass (13 UFO model, nine audio). Six initial catalog/gameplay Chromium cases and two narrow-menu/all-seven-intro cases pass. All three UFO cases rerun on final build and pass: 1/4-player spin/launch/pause/replay with a retained camera, reduced-motion multiplayer, and synthetic camera-pixel overheating followed by controlled rescue and paired arrivals. Reviewed flight, overheat, pair and narrow-menu screenshots.
- Final artifact 35b3215630ce4ea79c08: JS 546635, CSS 158939, core 2950964, total 39230109 bytes. Lint/typecheck/build/release integrity and diff whitespace pass within unchanged budgets. No physical webcam/lighting/arm-comfort/multiplayer-spacing/speaker validation performed. No commits or deployments.

### Multiplayer hand selection repair — 2026-11-17
- User reported hand-over-multiplayer activation failing. Found two reproducible navigation defects: unconditional release gating blocked the first detected hand already resting over a player-count button; after a scene change, a single shared release anchor could latch to player two and block player one's deliberate movement indefinitely.
- Added scene reset behavior that preserves release protection only when already armed. Replaced the single release anchor with per-hand observed anchors/release flags. A hand can leave/re-enter or deliberately move to another target without requiring another player's stationary hand to move. The selected hand still has to supply three seconds of fresh observations; stationary-repeat and dialog protections remain tested.
- Added model/view regressions and browser scenarios with the first observed hand already on the 2-, 3- and 4-player buttons. Restored temporary trace diagnostics after identifying the second-hand lock; no diagnostic state shipped.
- Validation: 36 focused model/view/readiness tests pass; four final Chromium scenarios pass including the full two-player webcam-only catalog/game/ready/pause/resume/exit/home flow and all three first-detected multiplayer selections. Four-player simultaneous hand readiness also passed separately. Initial full-navigation runs failed reproducibly at the catalog; the final per-hand release fix resolves that failure. Lint, typecheck/build, release integrity and diff whitespace pass. Artifact 6f264a645ce358b7f3cb stays within unchanged budgets.
- Tests use synthetic measured poses, not physical webcam validation. No commits or deployments.

### Minimal controls and side-by-side results — 2026-11-17
- Replaced stacked replay/link actions with two matching crayon buttons in a shared two-column result-actions row across all seven public games. Removed visible manual Pause controls and the in-game Show/Hide wireframe toggle.
- Preserved automatic tab-hidden/camera-disconnect recovery and underlying pose input. Public game Exit buttons now receive keyboard focus after recovery/replay instead of targeting a removed Pause button.
- Updated existing browser coverage to exercise automatic visibility recovery, assert removed controls, and measure equal-height adjacent result buttons. Rebased obsolete public wireframe-toggle tests on hidden diagnostic geometry/privacy and continued camera ownership; underlying diagnostic implementation remains available internally.
- Validation: 23 focused view/keyboard tests, one- and four-player UFO result/replay browser cases, full multiplayer webcam navigation with automatic recovery, and hidden-diagnostic geometry/lifecycle browser case pass. Reviewed UFO results screenshot. Initial browser checks failed because the ready helper still waited for the removed Pause button; it now checks Exit game and final runs pass. Lint/types/build/release integrity/whitespace pass. Artifact 64f4aa02bbadd94c5c96, within unchanged budgets. No hardware claims, commits or deployment.

### Fullscreen button — 2026-11-17
- Added a persistent four-corner player-style fullscreen toggle at bottom right across menus/gameplay/results. Requests the whole document, maintains camera ownership across navigation, tracks native fullscreenchange, and provides keyboard labels/pressed state and an inline retry message for denied activation. Shifted sound controls left to avoid overlap. No new dependencies or policy weakening.
- Checked Fullscreen API activation/event behavior against MDN. Webcam-generated clicks cannot guarantee entry because browsers require direct activation; failures remain recoverable with a click or Enter.
- Validation: two unit tests cover toggle/external exit and denied request/retry. Chromium native fullscreen browser test passes through home/catalog/gameplay, mouse and keyboard entry, exit and external exit, checks non-overlapping sound/fullscreen controls, and verifies one retained synthetic camera stream. Reviewed screenshot. Types, lint, build, release integrity and whitespace pass. Artifact 140ba8422426844a740b within unchanged budgets (JS 548365, CSS 159818 bytes). Physical camera and platform-wide fullscreen compatibility not claimed. No commits or deployment.

### Nuovi giochi da implementare — 2026-11-17
- Salvata la lista richiesta nel backlog, da affrontare uno alla volta in questo ordine:
  1. T40 — Salto ad ostacoli.
  2. T41 — Sei canestri (tre per lato): palle in caduta da indirizzare a canestro con testa o altre parti del corpo.
  3. T42 — Parare la palla tirata in porta.
  4. T43 — Canguri che saltano ostacoli; proposta da definire: schermo unico e gara a chi va più lontano.
  5. T44 — Palla da passarsi sopra una rete centrale; chi la fa cadere perde.
- Tutti in stato pending, nessuna implementazione avviata e nessuna modifica al catalogo pubblico. I prototipi nascosti eventualmente riutilizzabili non equivalgono al completamento di queste richieste. Le due idee a ostacoli restano separate.
- Verifica della sola pianificazione: JSON valido, identificativi univoci e ordine T40–T44 controllati; nessun test di gioco o hardware eseguito per questa modifica.

### T40 — Jump Rush / salto ad ostacoli — 2026-11-17
- Implemented the first game in the newly requested list; T41–T44 remain pending. Reworked the hidden Jump Rush prototype and exposed it as the eighth catalog game, with an original hurdle icon and generated local stick-figure movement video. The existing five-game tournament remains unchanged.
- Replaced motion-centroid camera control with normalized shoulder/hip midpoint events. The input adapter scales the rise threshold to torso size, excludes arms, missing hips and ambiguous same-lane bodies. Added bounded camera/render timestamp-skew handling; existing freshness, lowering-to-rearm, pause/replay and player isolation remain. This measures torso rise, not independently verified foot lift.
- Forty-second rounds; +10 clears / −5 tracked bumps; warning prompt/tick, hopping star, striped crayon hurdles, impact tilt, point burst and synthesized jump/clear/bump sounds. Shared readiness/countdown, persistent camera, automatic recovery, fullscreen and two adjacent result buttons. Removed prototype explanation/manual pause UI; reduced-motion supported.
- Kept the hidden Basketball Blitz prototype available in development while excluding its component and stylesheet from production, preserving unchanged release budgets. Initial build caught a redundant narrowed union branch; fixed. A later build exceeded CSS budget before excluding the hidden prototype stylesheet; final build passes.
- Validation: 126 focused tests pass (29 model, seven view, six torso adapter, 29 App, four tournament, 51 CameraSetup). Updated old CameraSetup assertions that still expected the previously removed Pause button. Two Chromium gameplay scenarios pass with synthetic measured poses for 1/4 players, scoring, result/replay flow and one retained camera. All-eight-game tutorial/navigation flow passes. Narrow-screen catalog test initially selected Ghost Catcher because a second synthetic hand rested on its card during screenshots; parked inactive fixture hands below cards and the final desktop/narrow geometry and webcam tournament-selection check passes. Reviewed one- and four-player gameplay screenshots.
- Final lint/types/build/release-integrity/whitespace checks pass. Artifact 048bc061e7338700990a: JS 541014, CSS 159127, core 2954107, total 39233252 bytes. No physical webcam jump-comfort, multiplayer-spacing or speaker verification claimed. No commits or deployment.

### T41 — Six Hoops / sei canestri — 2026-11-18
- Implemented the second requested game as Six Hoops, ninth public entry. One shared full-camera court has exactly six baskets, three on each side; upper/middle/lower baskets score 30/20/10. Forty-five-second rounds with increasingly frequent falling balls, bounded to four active balls. Last body toucher earns a basket; all player scores remain separate. Existing five-game tournament unchanged; T42–T44 remain pending.
- Reused normalized body-surface input with an optional measured-leg extension, then mapped lane-local surfaces into shared-court coordinates inside the game. Fixed 10 ms physics, gravity, wall rebounds, contact cooldown, fresh timestamped history and invalid/ambiguous-body guards. Deflection follows contact offset and measured lateral movement. Only a touched ball crossing a rim downward scores; no automatic aiming or predicted/missing-body contact.
- Original local animated movement demo, basketball/icon artwork, spinning balls/trails, mesh nets with swish deformation, owner colors, point bursts and synthesized contact/swish/miss sounds. Shared three-second ready hold/countdown, automatic recovery, persistent camera, mute/fullscreen/reduced-motion, keyboard fallback and adjacent results buttons.
- Initial build exceeded the existing JS budget. Excluded the already-hidden Freeze component/styles from production while preserving its source and development availability. No raised budgets, new dependencies, third-party assets, tracking or uploads.
- Validation: 90 focused tests pass (22 physics, two body adapter, ten audio, 30 App, 22 Keep Ups regression, four tournament). Chromium synthetic-pose gameplay passes for 1/4-player configuration with contact, baskets, automatic pause/recovery, replay and one camera stream; both initially passed, then final one-player and final isolated four-player runs passed after net-art refinement. Desktop/narrow catalog geometry and webcam tournament entry pass. All-nine-game tutorial/ready/countdown/navigation flow passes. One concurrent rerun timed out evaluating a four-player ready button and another menu run missed the first countdown numeral; isolated reruns passed without application changes. Reviewed gameplay screenshots including the scoring/net animation. Browser tests use synthetic poses, not physical webcams.
- Final lint/typecheck/build/release integrity and whitespace checks pass. Artifact f446df7e43cce1d607d7: JS 546114, CSS 158121, core 2965880, total 39245025 bytes, within unchanged budgets. Physical reach/contact sensitivity, multiplayer comfort and speaker playback remain unverified. No commits or deployment.

### Jump Rush clarity and Six Hoops ball feel — 2026-11-18
- Replaced the star avatar with an original crayon kangaroo, player-number jersey and persistent YOU / player label. Updated tutorial video/instructions and catalog wording. The hop follows a continuous parabola with leg tuck instead of switching between two heights. Rendering can finish a hop during brief tracking loss without awarding untracked clears. The separately planned kangaroo distance-race task remains pending.
- Six Hoops now uses constant gravity, incoming-velocity/contact-normal reflection with energy loss, measured horizontal and vertical surface velocity, and geometric separation. Glancing contacts redirect rather than always launching upward. Added rebounds on rim endpoints and removed the artificial ceiling at 10% frame height; side/top court edges dissipate energy. Existing scoring, ownership, cooldown and privacy boundaries remain.
- Validation: 69 focused tests pass, including continuous hop/temporary tracking loss, impact-speed-dependent bounce, rim-edge non-score, constant gravity, player isolation and recovery. Old assertions requiring every glancing impact to launch upward were updated to the intended reflection behavior. Both 1/4-player Jump Rush browser flows pass; both Six Hoops flows pass after changing the synthetic test pose from a glancing side touch to a contact beneath the ball. Initial old-pose basket runs did not score within their timeout, consistent with removal of the forced upward launch. Reviewed kangaroo gameplay screenshot. No physical webcam or speaker validation claimed.
- Final build/types, lint, release integrity and whitespace checks pass. Artifact fba45d81f8aa6d547151 (JS 548105, CSS 158263, core 2970233, total 39249378 bytes) respects unchanged budgets. Final post-browser edits only adjusted catalog wording and jersey text shadow. No commits or deployment.

### T42 Goalkeeper and T44 Net Rally — 2026-11-18
- Delivered Goalkeeper and, following the user's additional instruction, Net Rally. T43 (kangaroo distance race) is the sole remaining requested game. Public catalog now eleven, with fitted four-column webcam cards; existing five-game tournament unchanged.
- Goalkeeper uses a new measured-surface model: anticipated target, perspective approach, fresh-contact save window, save deflection, net response on goals, eight-goal elimination, forty-second cap and capped streak points. Legacy prototype source/tests remain; public routing uses the new shared sport view. One to four isolated lanes; no default stationary keeper auto-saves.
- Net Rally has a shared court, solid net, gravitational flight, body returns, automatic service delay, floor points, five-point victory / sixty-second cap. Solo plays against a visible bounded-speed robot on the right; 2–4 players use left/right teams (three split 1 vs 2). Winning-side participants each receive ten points per rally. Varied returns and limited robot pursuit make the solo opponent beatable. Height-dependent return arcs keep normal play below the HUD.
- Added original tutorial videos, ball/net artwork, gameplay animation and local synthesized cues. Standard camera persistence, three-second readiness, countdown, mute/fullscreen, reduced-motion, keyboard fallback, recovery and paired replay/catalog buttons. Excluded the already-hidden Dodgeball and Laser Escape components from production, retaining source/dev availability and unchanged budgets.
- Verification: 102 focused tests pass across SportsModel (15), App (32), tournament (four) and CameraSetup (51). Initial solo beatability regression found endless even rallies after an arc adjustment; varied returns and bounded slower robot pursuit resolve it. Four Chromium game flows pass for 1/4-player configurations, using synthetic measured poses for saves/returns, automatic pause/recovery, results/replay and one retained camera. Both Net Rally flows rerun on final physics and pass. Desktop/narrow eleven-card geometry and webcam tournament entry pass. Reviewed Goalkeeper and Net Rally screenshots. No physical webcam, multiplayer comfort or speaker claims.
- Final lint/types/build/release integrity and whitespace checks pass. Artifact f2fc40851106e9ee015b: JS 538997, CSS 158860, core 2975589, total 39254734 bytes. No new dependencies, commits or deployment.

### T43 — Kangaroo Race — 2026-11-18
- Implemented the last of the user's five requested games, separately from Jump Rush. Shared-screen race for 1–4 numbered, color-coded kangaroos; progress separates their on-screen positions. Fresh normalized torso rise triggers continuous hops; players must lower to rearm. Untracked runners stop accumulating distance.
- Fair repeated course with logs, rocks and gaps, different clearance thresholds and gradually increasing speed. Three bumps end a runner's attempt; collision stun slows them for one second. Forty-five-second limit / all-out finish; whole-metre distance determines winners and ties. Added original movement demo, reused original kangaroo artwork, local sound cues, half-second jump warning, life/distance labels and standard camera/readiness/recovery/replay integration.
- Catalog now twelve, fitting the existing four-column camera layout. All T40–T44 are implemented. No tournament-schedule changes or dependencies. Hardware verification flags remain false.
- Validation: 53 focused tests pass (ten race model, 33 App, six torso input, four tournament), including fair player isolation, distance advantage from jumping, elimination, invalid/stale input, rearm, pause/replay and cadence independence. Corrected an initial JSX delimiter error before the passing build/tests. Both 1/4-player synthetic-pose Chromium gameplay flows pass, including distance/clear scoring, no scroll, recovery/results/replay and one retained camera. Desktop/narrow twelve-card catalog geometry and webcam tournament entry pass. Reviewed screenshots; corrected vertically floating obstacles in the single-player layout and tightened jump warning timing, then reran both gameplay browser cases successfully on the final build. No physical webcam/speaker claim.
- Final lint/types/build/release integrity/whitespace pass. Artifact c529ba21c37306638618: JS 547559, CSS 159794, core 2985085, total 39264230 bytes; unchanged budgets. No commits or deployment.


### Goalkeeper top-to-bottom reaction play and results spacing — 2026-11-18
- Replaced the advertised destination and bottom-up approach with an original animated footballer at the top, a short wind-up, and randomized curved shots moving down toward the lower goal. The kick cue now occurs at release. All players receive the same shot sequence within a match; no destination marker is drawn. Fresh measured body overlap with the moving ball in the lower half saves it; contact over the kicker cannot score. Existing scoring, eight-goal elimination, recovery and replay remain. Updated the local tutorial video and instructions.
- Centered both shared results-button labels using flex alignment, removing the apparent extra space after Play again. The already-hidden Dance Challenge remains in source/development but is excluded from production to retain existing release budgets.
- Validation: 80 focused model/camera integration tests pass, including downward trajectory, undisclosed pre-kick direction, seed variation, equal multiplayer trajectories and lower-half collision. Lint, typecheck and production build pass. All three Chromium flows pass (1/2/4 players, synthetic body saves, automatic recovery, results/replay and retained camera). Reviewed single/four-player screenshots. Release-integrity and whitespace checks pass; JS 543935, CSS 159817, core 2982222 and total 39261367 bytes remain within unchanged budgets. No physical camera or speaker validation claimed.

## 2026-11-18 — Physics and Net Rally 1 vs 1 refinement
- Replaced preset body-hit launches with a shared contact-normal resolver in Net Rally, Keep Ups and Six Hoops. Uses fresh measured contact-point velocity, tangential friction, restitution, geometric separation and bounded speed; handles side and underside contacts. No camera/library access in game physics.
- Net Rally: explicit two-player P1/P2 instructions, match scores and results; no bot in multiplayer, own-side contact restriction, tested shared-ball exchanges and opponent scoring. Solid net/tape collision matches the outlined, dark-backed mesh and visible floor. Solo robot uses its visible angled paddle.
- Keep Ups: removed artificial lateral hit steering and HUD-height ceiling; fixed repeated bonus awards from overlapping four-player hoop areas, required fresh tracking for bonuses, and prevented resting contacts from building streaks.
- Kept the existing release budget by excluding the already-hidden Dance Challenge prototype from production, consistent with the other hidden prototypes; retained development implementation/tests.
- Physics/model verification: 84 targeted unit tests passed. Tournament integration passed when rerun separately after a full-suite timeout. The full run passed 1,229 tests and failed three: that timeout and the two previously known Window Wipe tests expecting a removed manual Pause button.
- Browser and build verification recorded after the final isolated build below. Synthetic camera observations are not physical-webcam validation; real contact feel and multiplayer tracking still need hardware testing.
- Final isolated production build (including typecheck/release budgets) and lint passed. All 11 focused Chromium browser tests passed against that immutable build: Goalkeeper and Net Rally at 1/2/4 players, Keep Ups at 1/4 players plus pointer fallback, and Six Hoops at 1/4 players. Inspected the two-player Net Rally screenshot for net visibility and P1/P2 labels. No hardware validation or deployment performed.


### Consolidate the jumping games — 2026-11-18
- Kept Kangaroo Race as the single public jumping game: smooth original kangaroo hops, logs/rocks/gaps, three bumps, 45-second distance competition for 1–4 players. Removed Jump Rush from the public catalog (now eleven games) and from the routed production components. Both old Jump Rush URL forms and direct legacy camera initialization resolve to Kangaroo Race. Historical model/view source and tests remain available.
- Updated catalog expectations, tutorial navigation coverage and legacy-link browser checks. Typecheck/build, lint, 48 focused App/race/input tests and release integrity pass. Artifact a807fbce59221a9dad40 remains within unchanged budgets. All five Chromium checks pass: both legacy links, 1/4-player synthetic-pose gameplay and replay, and desktop/narrow catalog geometry with webcam navigation. No physical webcam validation, commits or deployment.

### Mobile Bug Stack — 2026-11-22

Device selection runs before the party app starts. Phones and tablets load Bug Stack on every hash route. Desktop browsers retain the catalog and tournament. The mobile camera uses the bundled hand model, and touch play is available with or without camera permission. Verification includes the release build, unit tests and Chromium with an emulated phone, synthetic video and injected hand landmarks. Physical-device gesture validation is pending.

### Desktop Floor Is Lava — 2026-11-22

Added the shared HOME zone to the desktop catalog for one to four players. Each of five waves checks both measured ankles of every player at the deadline. Camera coordinates span the full mirrored court so people can gather on the same side. The simulation supports clicking the floor and keyboard movement. The lava and flag island were generated through Kimi WebBridge and are included in the catalog, tutorial and game.

The production build passed the existing release budgets. All 1,466 unit tests and lint passed. Chromium checks covered the catalog, mobile routing, four synthetic people in one zone, flood scoring, pause, replay, and solo simulation. Physical group-camera validation is pending.

The lava flood now fills the desktop viewport, including the space around letterboxed camera video. The original crayon texture flows in waves and bubbles rise and burst. HOME is cut out at its measured camera coordinates. Browser checks sample the surface and the cutout in wide and tall windows, including reduced motion and pause. The production build remains within its release budgets.
