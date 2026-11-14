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
