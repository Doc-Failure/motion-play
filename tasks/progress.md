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
