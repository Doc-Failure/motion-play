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
