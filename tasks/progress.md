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
