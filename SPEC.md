# Motion Play — Product Specification v1.0

## Vision
A joyful, original, browser-based motion-controlled party game inspired by the *interaction genre* of EyeToy, not its assets or branding. One shared webcam, 1–4 local players, no backend, no accounts, no uploads. Players share one mirrored live-camera playfield, with side-by-side player lanes and synchronized rounds. Family-friendly, easy to understand, playable on a Mac desktop browser. No copyrighted third-party game artwork/audio.

## Non-negotiables
- Client-only React + TypeScript + Vite; Phaser for gameplay. Static hosting and optional installable PWA. No Electron or runtime server/API. `localhost` for development; production HTTPS for camera permissions.
- Support 1, 2, 3, 4 players. Gameplay uses one uncropped mirrored camera image. Transparent player lanes overlay each normalized camera input region, including three/four players standing side by side. Objects and motion must occupy identical screen coordinates; never move a person’s targets into a separate grid.
- One camera video stream; configurable **camera input regions** mapped independently to each player's game viewport. Default left/right camera regions for 2 people, four adjustable regions for 3–4, allowing side-by-side physical arrangement. Mirroring and coordinate normalization must be consistent.
- Per-player score, interaction state, cooldowns; shared clock and round lifecycle. No networked multiplayer.
- Local processing only; never send camera images/landmarks to a server. No analytics/tracking by default. Keep the camera stream active across in-app navigation once activated; release tracks when the app closes; explain camera permission.
- 32 game catalog entries, with only validated games playable; others clearly marked 'Coming soon' until implemented. Working MVP before expanding.
- Design: **childlike hand-colored crayon and marker drawings**, intentionally uneven bold outlines, imperfect fills crossing borders, paper textures, sticker collages, scribbly stars/arrows, springy interactions; maintain strong text contrast/readability. Original artwork, SVG/Canvas procedural illustrations; local fonts/assets (respect licenses), no hotlinked images.

## Product navigation
Title / Home -> Catalog -> Centered Camera Lobby (player count only) -> Play -> automatic 3-2-1 -> Gameplay -> Results -> Replay / Catalog. Quick Play chooses a random compatible game and starts it as soon as the camera is ready. No practice or start-confirmation screen.
Home: Quick Play and Game Catalog. Tournament is deferred. Main catalog is a compact grid of playable games, with original game drawings on the same crayon sticker panels as the homepage. Each tile goes directly to that game’s camera lobby. Quick Play picks among implemented compatible games. The planned tournament mode rotates 3 or 5 implemented games and aggregates points. Cooperative mode shares a goal; competitive/free-for-all has independent scores. 2v2 only when four players and a game supports it. Avoid promising co-op/teams for incompatible games.

## Camera, calibration and recovery
- User selects a `videoinput` device and starts a permission request only on interaction. Offer actionable permission-denied and camera-missing states; allow simulation demo mode without hardware.
- Mirror preview; render adjustable overlays for player zones. Players wave to test; visually indicate motion detection per region. Estimate background noise, expose sensitivity slider and recalibrate button. Avoid background motion registering as player hits.
- Detect low confidence, occlusion, extreme noise/lighting changes. No false awards from missing tracking. Pause on camera disconnect and prolonged player tracking loss (~3 seconds), allow reacquisition. Pause on tab visibility loss. Reconnect/recalibrate without full restart.
- Use one captured video source and low-resolution processing; FPS adaptive. Be cautious: four people on one camera may require wide-angle webcam, sufficient light, space, and distance.

## Input architecture
`CameraSource` -> `MotionProcessor` -> `PlayerZoneMapper` -> `InputEvents` -> `GameSession` -> `GameMode`/Phaser scene.
Frame differencing / background subtraction initially for general motion, with denoising, temporal smoothing, threshold, and hit debouncing. Frame differencing measures *motion*, not hand contact. Distinct input types:
- MOTION_HIT (bubbles, moles, balloons, stars): motion-mask overlap + per-target cooldown.
- MOTION_BRUSH (wipe, paint): accumulate motion trace by region; per-player contributions.
- HAND_POSITION and HAND_SWIPE (paddle, precise catching, slashing): optional MediaPipe Hand/Pose landmarks, local models downloaded with the app; low-confidence => no event.
- BODY_MOVE and FREEZE (dodge, jump, freeze): optional pose-based input or explicit alternative mechanic where reasonable.
Advanced interactions must not be falsely claimed working until implemented/tested. Game code must never read raw camera pixels or MediaPipe internals directly. All events are player-local and normalized [0,1], with time stamp, confidence and type.
Mouse/keyboard simulation backend for development and automated tests; deterministic synthetic video/motion fixtures. Debug mode: show thresholds, masks, zones, FPS, hit events, confidence.

## Motion menus
Large hand hover buttons; dwell ~1.2 seconds with animated ring, cancel on leave, cooldown to prevent double-activation. Player 1 controls menu by default to avoid conflicts. Mouse/touch/keyboard fallback always available. Provide visible pause and restart routes.

## Game mechanics and UX
Default 60-second round (configurable by game), 3-second countdown, sound cues, score/pop particles, color-coded player identity, clear hazards, results podium. Accessible reduced motion / reduced sound toggles; no rapid flashes, readable text, color + symbol identification, volume/mute. Child-friendly positive feedback. Difficulty presets Easy / Normal / Hard adjust object speed/size and hazard rate but not input threshold silently. Mobile can show unsupported notice if camera/player experience isn't suitable; desktop-first.

## 32-game catalog
Each entry is a planned game, not a promise that the feature already works. Implementation mechanisms below are hints; precise pose games require advanced tracking.

### Hit & Destroy (8)
1. Bubble Battle — Pop floating bubbles, avoid bombs. MOTION_HIT. MVP.
2. Whack-a-Mole — Strike appearing moles. MOTION_HIT.
3. Meteor Smash — Destroy meteors before base impact. MOTION_HIT.
4. Fruit Slash — Swipe fruit, avoid bombs. HAND_SWIPE.
5. Punch Arena — Punch targets by gesture/velocity. HAND_SWIPE.
6. Piñata Party — Repeated hits spill candy. MOTION_HIT.
7. Monster Defense — Stop approaching monsters. MOTION_HIT.
8. Balloon Panic — Hit only instructed colored balloons. MOTION_HIT.

### Catch & Collect (6)
9. Fruit Catcher — Catch fruit, dodge rotten fruit. HAND_POSITION.
10. Gold Rush — Collect falling coins, dodge hazards. MOTION_HIT.
11. Fish Frenzy — Catch fish of differing value. HAND_POSITION.
12. Supermarket Rush — Select correct groceries on conveyor. MOTION_HIT.
13. Star Collector — Touch ephemeral stars. MOTION_HIT.
14. Treasure Grab — Grab treasures, avoid cursed objects. MOTION_HIT.

### Move & Survive (6)
15. Dodgeball — Body movement to avoid incoming balls. BODY_MOVE.
16. Laser Escape — Dodge moving laser lines. BODY_MOVE.
17. Dance Challenge — Match simple movement cues. BODY_MOVE.
18. Freeze! — Move, then become still on cue. FREEZE.
19. Ninja Training — Hit targets and avoid obstacles. MIXED.
20. Jump Rush — Jump over incoming obstacles. BODY_MOVE.

### Clean & Create (6)
21. Window Wipe — Clean dirty surface with moving hands/body region. MOTION_BRUSH.
22. Paint Splash — Cover canvas with paint. MOTION_BRUSH.
23. Car Wash — Scrub vehicle to reveal clean art. MOTION_BRUSH.
24. Pizza Maker — Touch/select ingredients to match order. MOTION_HIT / HAND_POSITION.
25. Graffiti Race — Reveal hidden mural by painting. MOTION_BRUSH.
26. Tower Builder — Move blocks with stable hand position. HAND_POSITION.

### Skill & Precision (6)
27. Air Pong — Hand position controls paddle. HAND_POSITION.
28. Goalkeeper — Block balls with body/hands. BODY_MOVE.
29. Basketball Blitz — Swipe upward to shoot. HAND_SWIPE.
30. Simon Says — Reproduce a sequence of target touches. MOTION_HIT.
31. Plate Spinner — Touch plates periodically. MOTION_HIT.
32. Magic Duel — Draw simple hand patterns. HAND_SWIPE.

## Prioritized first 10
Bubble Battle; Window Wipe; Whack-a-Mole; Balloon Panic; Gold Rush; Paint Splash; Simon Says; Fruit Catcher; Air Pong; Goalkeeper. Complete motion-only mechanics before hand/pose-dependent games. Reuse shared interfaces; not 32 separate applications.

## Technical boundaries
- `src/app` React routes/navigation/settings/catalog; `src/design` palette, scribble UI primitives; `src/camera` video lifecycle; `src/input` frame differencing, zones, simulated input, optional pose backend; `src/game` session/scoring/tournament; `src/minigames/<slug>` Phaser scenes and game data; `src/audio`; `tests` unit/browser.
- Define an input interface resembling `{playerId, kind, x, y, confidence, timestamp, velocity?}` (exact types evolve once). Game modes receive events, not landmarks or image frames.
- 60 FPS rendering target, 20–30 FPS processing target, low perceived motion latency; measure rather than promise. Worker/OffscreenCanvas only if profiling warrants.
- Use `localStorage` for settings and achievements, IndexedDB if large local datasets. Static host: Cloudflare Pages or Vercel. Cache offline assets in optional PWA, with explicit offline behavior and no camera uploads.
- Favor minimal dependencies and browser-native APIs. Pin packages and document any model files/weights required for offline play.

## Testing and release gates
- Vitest: mapping/mirroring, motion thresholds, debounce, scoring, hazard penalties, player isolation, tournament ranking, serialization.
- Playwright: mocked permissions/camera, synthetic frame movement, 1–4 split layouts, catalog navigation, practice, countdown, scoring, resume/restart, permission failures, responsive screenshots. Synthetic tests CANNOT validate real-camera tracking or motion feel.
- Real-hardware review gates: after 2-player Bubble Battle, after 4-player mode, after first 10 games, before public release. Check lighting, occlusion, input lag, usability by different ages, Safari compatibility.
- Automated checks expected in package.json: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, `npm run test:e2e` (when browser dependencies installed). No pretend passes.
- No public deployment, purchases, cloud resources, account creation or external uploads without user approval. No credentials in repo.

## Definition of MVP
A polished illustrated homepage, complete 32-entry catalog with correct availability status, 1–4-player selection and calibration flow, 1–2-player real-camera Bubble Battle, independent scores, synced countdown, results/replay, fake-camera tests, and helpful hardware setup. Four-player support then first 10 games, then full 32.

## Product decisions / defaults
Family-friendly all ages; competitive default, optional co-op; no login; progress local; sound on with mute; 60-second default; English UI first, localization-ready; choose original noninfringing visuals. Prefer shipping working features to unverified breadth.

## Current playfield direction (user correction, 2026-11-15)
The live mirrored camera image is the game screen. Keep the person clearly visible
at full opacity; draw targets, hazards, smudges and feedback directly over them.
Preserve the complete video aspect ratio with letterboxing, never cover-crop.
Use compact score/time/control overlays and lightweight crayon framing rather than
opaque illustrated boards. Brush games must reveal the person beneath their effects.
Player count remains the only setup choice; preserve stream continuity.

Camera setup follows the same camera-first presentation: a viewport-fitted, centered
preview with a small player-count selector and Play button over it. No surrounding
site header/footer, oversized game heading, explanatory panel, or scrolling is needed.
Show permission/recovery explanations only when an error occurs.

Game selection uses compact illustrated crayon stickers matching the homepage panels,
without numbered placeholder art or oversized card descriptions. Play starts the game
countdown immediately: no practice screen, confirmation dialog or second start button.
Tournament rounds also advance directly into their countdown.

## Current scope (2026-11-16)
Home offers only Quick Play and Game Catalog. Tournament and extra home callouts are
deferred. Quick Play randomly selects an available game supporting all retained
player counts and launches its countdown once the camera is ready. It needs no
additional Play/confirmation click. Returning from a game does not auto-relaunch it.
The UI pack contains typography PNG references only, not an installable font file.

## Five-game refinement phase (2026-11-16)
The public catalog and Quick Play expose only Bubble Battle, Window Wipe, Whack-a-Mole,
Fruit Catcher and Paper Dojo while each game is refined individually. All other game
implementations remain in the codebase but are hidden; legacy public URLs return to
the catalog. Restoring games is controlled by visibleGameSlugs in src/app/catalog.ts.
The catalog header contains only Back to Home and Game Catalog, with no site header,
tagline, subtitle or decorative sheets/scenery around it. Improving animation and
distinct game identities is subsequent per-game work, not completed by hiding games.

## Paper Dojo and typography refinement (2026-11-16)
Paper Dojo replaces Goalkeeper in the public five. Original paper ninjas run and
telegraph attacks from side towers, leap across the live camera, and react to
normalized strikes with animated impacts, tumbles and paper confetti. Waves speed
up, combos reward consecutive hits, marked obstacles warn before contact penalties,
and bamboo bonus rounds require three strikes. Original local synthesized
percussion and plucked music use the shared mute/recovery lifecycle.
Gameplay keeps only compact scores/time, player labels, a short action cue and
pause/exit/sound controls over the camera. Detailed statistics appear in results.
The pack supplies lettering reference images rather than a font binary. The local
OFL Short Stack font is used throughout as a visual match, with no runtime download.
