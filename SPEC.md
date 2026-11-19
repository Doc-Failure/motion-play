# Motion Play — Product Specification v1.0

## Vision
A joyful, original, browser-based motion-controlled party game inspired by the *interaction genre* of EyeToy, not its assets or branding. One shared webcam, 1–4 local players, no backend, no accounts, no uploads. Players share one mirrored live-camera playfield, with side-by-side tracking zones, game-specific playfields and synchronized rounds. Family-friendly, easy to understand, playable on a Mac desktop browser. No copyrighted third-party game artwork/audio.

## Non-negotiables
- Client-only React + TypeScript + Vite; Phaser for gameplay. Static hosting and optional installable PWA. No Electron or runtime server/API. `localhost` for development; production HTTPS for camera permissions.
- Support 1, 2, 3, 4 players. Gameplay uses one uncropped mirrored camera image. Transparent player lanes overlay each normalized camera input region, including three/four players standing side by side. Objects and motion must occupy identical screen coordinates; never move a person’s targets into a separate grid.
- One camera video stream; configurable **camera input regions** mapped independently to each player's game viewport. Default left/right camera regions for 2 people, four adjustable regions for 3–4, allowing side-by-side physical arrangement. Mirroring and coordinate normalization must be consistent.
- Per-player score, interaction state, cooldowns; shared clock and round lifecycle. No networked multiplayer.
- Local processing only; never send camera images/landmarks to a server. No analytics/tracking by default. Keep the camera stream active across in-app navigation once activated; release tracks when the app closes; explain camera permission.
- 32 game catalog entries, with only validated games playable; others clearly marked 'Coming soon' until implemented. Working MVP before expanding.
- Design: **childlike hand-colored crayon and marker drawings**, intentionally uneven bold outlines, imperfect fills crossing borders, paper textures, sticker collages, scribbly stars/arrows, springy interactions; maintain strong text contrast/readability. Original artwork, SVG/Canvas procedural illustrations; local fonts/assets (respect licenses), no hotlinked images.

## Product navigation
Home (choose 1–4 players once per tab) -> Catalog or 5-Game Tournament -> small looping stick-figure movement demo + three-second simultaneous hand-ready buttons -> automatic 3-2-1 -> Gameplay -> Results -> Replay / Catalog. No extra Play/setup/confirmation screen. Replays and every tournament round use the same introduction.
Home: Game Catalog and 5-Game Tournament only. Quick Play is removed. Main catalog is a compact grid of playable games, with original game drawings on the same crayon sticker panels as the homepage. The catalog uses the same four-column grid, game order and Home control with or without a camera. Each tile goes directly to that game’s movement introduction. The tournament keeps its existing five-game schedule and aggregates points; additional catalog games can be played separately. Cooperative mode shares a goal; competitive/free-for-all has independent scores. 2v2 only when four players and a game supports it. Avoid promising co-op/teams for incompatible games.

## Camera, calibration and recovery
- Request the default webcam automatically on entry, subject to the browser’s native permission decision. Keep it across routes. Offer actionable permission-denied and camera-missing states; allow simulation demo mode without hardware. Player count is chosen once on Home, stored for the tab session, and can be changed deliberately from Home.
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
Large hand hover buttons; dwell 3 seconds with animated ring, cancel on leave, cooldown to prevent double-activation. Any detected player can choose with the same measured hand; ownership cannot change midway through a hold. Mouse/touch/keyboard fallback always available. Provide visible pause and restart routes.

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

Game entry uses a viewport-fitted, centered camera with a small movement demo and
three-second hand-ready buttons. Player count is chosen once on Home. No surrounding
site header/footer, repeated selector, extra Play button, or scrolling is needed.
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
up, combos reward consecutive hits, and marked obstacles warn before contact
penalties. Ninja waves run continuously; bamboo-breaking interludes are removed. Original local synthesized
percussion and plucked music use the shared mute/recovery lifecycle.
Gameplay keeps only compact scores/time, player labels, a short action cue and
pause/exit/sound controls over the camera. Detailed statistics appear in results.
The pack supplies lettering reference images rather than a font binary. The local
OFL Short Stack font is used throughout as a visual match, with no runtime download.

## Camera fit guidance and diagnostic body sticks (2026-11-16)
Camera setup suggests starting approximately 2–3 m (6–10 ft) away and stepping
back until head, hips and outstretched arms fit. Groups stand side by side.
This is a framing suggestion, not a measured distance or universal lens setting.
The automatic countdown repeats a short distance cue, including Quick Play.

An optional Test body tracking button in the lobby loads local MediaPipe Pose
Landmarker Lite. Confident joints draw a green human stick person with a head,
torso, jointed arms, wrist dots and legs over the uncropped mirrored camera.
Game artwork fades while the diagnostic is enabled so it cannot be confused
with the human skeleton. Visible upper-body segments remain available when hips
are outside the image; missing limbs are omitted. Occluded/low-confidence segments are
omitted; stale frames clear the overlay. This diagnostic does not supply game
input, award points or claim finger/hand-shape recognition. The enabled choice
carries from setup into gameplay. A Show/Hide wireframe button during any game
allows verification without leaving play. Leaving the active camera view, camera
failure or disabling the overlay releases the diagnostic while retaining the camera.

The optional local model/runtime is about 28.5 MB and loads only on request.
It uses a separate local document with its own restrictive policy, preserving
the main app’s blocked data connections. No camera uploads, external CDN fetches
or recordings are introduced. Offline shell installation excludes optional pose
files; when offline caching is enabled they are cached after first use. The
existing 3 MB core budget remains separate. Browser and photograph checks do
not establish physical-webcam or four-person pose quality.

## Rocket Rumble refinement (2026-11-16)
Rocket Rumble is an additional original game (catalog entry 33), inspired by
colour selection followed by a fireworks trigger. It replaces Fruit Catcher in
the public five: Rocket Rumble, Paper Dojo, Bubble Battle, Window Wipe and
Whack-a-Mole. Existing hidden implementations remain preserved.

One to four players tag matching colour/shape rockets and hit their own plunger
for a staggered fireworks chain. Two earn 40 points; three earn 90. Animated
launches, fuse indicators, linked tags, bounded transparent particle trails,
three burst patterns, original synthesized music/effects and a final fifteen-second
acceleration give the game its own identity. The live mirrored camera stays at
full opacity and remains uncropped. Reduced motion uses stationary fading rings;
shared pause/recovery freezes fuses, targets and particles. Game input remains
normalized MOTION_HIT, with pointer and keyboard fallback. No source-game assets,
code or audio are copied. Physical play quality remains unverified.

## Automatic human tracking during the test phase (2026-11-16)
The stick-person diagnostic now starts enabled when the camera becomes ready,
including direct game links and Quick Play. Hide wireframe remains available.
It previously defaulted off, which made the feature appear absent on localhost.
Existing Vite tabs require a reload to replace retained React state. Camera-only
model files load when the active camera view opens during this test phase;
the homepage does not load them. In-flight runtime loads are cancelled on exit
or disable. Artwork fades only after a human skeleton is actually detected.

## Player alignment check (2026-11-16)
An Align player(s) action reinitializes pose tracking and asks every selected player
to face the camera, stand in their lane, lift both hands above their shoulders and
hold still for two seconds. It requires visible head, hips and arm joints, safe
framing, and enough fresh stable observations. Missing joints, motion or stale
frames reset progress. Guidance asks players to step back/closer or recenter as
needed. Completion validates framing/confidence, not physical distance or an
artificial translation of measured joints. Head placement prefers measured ear
midpoints rather than the nose. Real-camera quality still needs validation.

During gameplay the alignment action uses shared pause/recovery and suppresses
input events; completion or cancellation leaves the round ready to resume.
Alignment can be cancelled, does not restart the camera, and never blocks normal
Play in setup. Failure of the diagnostic also releases the alignment pause block.

## Same-frame pose diagnostic (2026-11-16)
While wireframe tracking is visible, the camera image displayed behind it is the
same captured image used for that pose result. Capture and landmarks are paired
immutably and committed together before paint. Capture preserves the full frame
and aspect, with a 960px maximum width; the preview is mirrored exactly once.
Hiding the wireframe or losing tracking restores the underlying live video.
The live camera stream and game input processing remain active independently.

The diagnostic uses independent IMAGE-mode pose detection, avoiding single-pose
VIDEO-mode temporal smoothing that can trail movement. Scheduling targets 50ms
including inference time rather than adding an 80ms wait after every detection;
no physical FPS or latency guarantee is claimed. Pause/results dialogs hide the
skeleton so it cannot appear attached to interface controls. Calibration remains
a framing/confidence check and does not apply fabricated coordinate corrections.

## Shared three-second ready check (2026-11-16)
Every initial round, Quick Play and replay now waits over the centered camera for
all selected players to hold a measured wrist on their own ready button for five
continuous seconds. One detected body cannot ready multiple lanes. Leaving a
button, stale pose observations, a hidden tab or camera loss resets the hold.
The existing three-second countdown follows automatically. Keyboard users can
Tab/Enter to toggle each button; pointer/touch users hold it. This replaces the
older immediate-countdown direction without adding a confirmation dialog.

## Silk Squad (2026-11-16)
Original catalog entry 34 is a hand-gesture robot-catching game inspired by the
interaction premise of WEB SLINGERS. It uses original robot-bug SVG artwork,
procedural animation and synthesized audio, with no source attraction assets,
code, characters or branding. The public five are now Silk Squad, Rocket Rumble,
Paper Dojo, Bubble Battle and Window Wipe; Whack-a-Mole remains implemented but
hidden. Quick Play includes the new game.

A local Hand Landmarker measures 21 finger joints. An open hand arms a cast;
pinching thumb and index fires once, and opening again is required to rearm.
Hand ownership is matched to a confident body wrist and its player lane. Missing,
ambiguous, low-confidence or stale observations produce no gesture. Minigames
receive normalized HAND_POSITION/HAND_PINCH events, never camera/model objects.
Pointer, touch and keyboard remain available when hand tracking is unavailable.

A 60-second round animates eight-legged scout, spring and golden armored bots,
web casts, net wraps and cocoons traveling to each player's collection jar.
Golden bots need two casts. Streaks increase rewards; waves accelerate. Pause
freezes the simulation, shared sound controls govern original web/capture cues
and a quiet musical loop, and reduced motion removes cocoon travel/rotation.
The complete uncropped camera stays behind the game. Finger and pose tracking
share the same captured image; hiding diagnostic sticks retains required gesture
tracking without fading the artwork. The optional local assets total about
36.3 MB, including a 7.8 MB hand model; the core budget stays 3 MB. Physical
webcam gesture reliability and four-person performance remain unverified.

## Ready-hold reliability correction (2026-11-16)
The ready check advances from captured pose observation timestamps rather than
polling a cached contact against wall time. It accepts observations up to one
second old, resets after larger gaps, and cannot finish without new measured
samples spanning three seconds. This accommodates slower inference without
silently counting frozen video. A small exit margin stabilizes an already-entered
button against wrist jitter; entry still requires the original visible circle.
A measured departure resets the hold immediately. Keyboard/touch alternatives
retain their own three-second timing.

Silk Squad returns the pose tracker without awaiting Hand Landmarker. Finger
model initialization and inference begin after the ready hold ends, without
reloading pose tracking or restarting the camera. Slow or failed finger loading
cannot block wrist readiness. Models close safely if initialization finishes
late after leaving the view. Real physical webcam quality remains unverified.

## Silk Squad arm-motion controls (2026-11-16 user correction)
Silk Squad now casts from deliberate arm movement, superseding the finger-pinch
mechanic. It uses measured shoulder, elbow and arm-end joints from the existing
body tracker; no finger model is loaded. Move an arm over a bot to cast. Continued
arm motion can cast repeatedly at a bounded cadence, while holding still stops
firing. Shoulder-relative motion rejects whole-body translation and small jitter;
missing/ambiguous joints and stale samples reset movement history. Aim follows
that arm's endpoint, and the visible web travels from the forearm to the target.
Only normalized ARM_POSITION/ARM_MOVE events cross into the game. Keyboard/touch
alternatives, one shared retained camera, three-second ready checks and the
original visual/audio effects remain. Actual webcam motion feel needs validation.

## Webcam website navigation and five-game tournaments (current user direction)
After the initial browser camera permission/Enable action, any confidently
tracked hand can navigate Home, Catalog, player count, Play, pause/resume, mute,
replay, exit and tournament results. One shared camera stays active across routes.
Home and Catalog put their controls over a full uncropped mirrored camera frame,
using the same contain/letterbox geometry as gameplay. All current menu choices
fit inside that frame without scrolling. The poster-style Home remains before
camera activation; native mouse/touch/keyboard alternatives remain available.

UI_POINTER events retain measured mirrored camera coordinates and wrist identity.
Only translation/scaling into the actual camera rectangle is applied; there is
no virtual cursor, player-lane expansion or reach remapping. Any detected body
can choose without remaining in a game lane. A small marker sits on the measured
wrist. Buttons highlight and show a countdown during a continuous three-second
hold by the same wrist. Missing/weak/departed wrists reset progress; cached
frames cannot advance it. Deliberate movement rearms after activation or a new
screen. Stale frames, resize, scrolling and visibility changes cancel holds.

A local pose tracker runs in the active view, even when diagnostic sticks are
hidden. Menu frames and measured positions are paired to avoid independent video
motion behind the hand marker. Processing remains local with no finger model or
uploads. Gameplay objects are excluded from website selection; the separate
simultaneous three-second ready buttons retain their original camera-space logic.

Home offers only Game Catalog and 5-Game Tournament. Catalog also links
to the tournament. The focused five are Rocket Rumble, Paper Dojo, Bubble Battle,
Window Wipe and Paper Jam. Silk Squad is deferred/hidden at the user's request;
its code is preserved for later work. The retired Quick Play URL opens Catalog.

The tournament has five competitive rounds: Bubble Battle, Window Wipe, Paper
Dojo, Paper Jam and Rocket Rumble. Keep player count for all rounds; no other
setup settings. Each game reports its actual final points once, automatic
advancement opens the next ready hold, and raw points are summed per player.
Highest total after all five wins; equal highest totals share the win. Points
are not converted to placements or normalized. Window Wipe shows its actual
points in tournament play. Final results, new tournament and Home work by webcam.
Physical webcam quality, motion comfort, multi-person reliability and performance
remain subject to real hardware testing; automated input is not physical evidence.


## Paper Dojo cleanup (2026-11-17)
Paper Dojo has no visible body wireframe or diagnostic controls in setup/gameplay.
Local pose inference continues for webcam navigation and the three-second ready
hold. The bamboo-breaking minigame, bonus pauses, related scoring/effects and
bundle statistics are removed. Ninja waves and marked obstacles continue through
the complete 60-second round with existing combos, audio, pause/replay and
competitive tournament completion. Tower artwork remains at the sides.

## Window Wipe rebuild (2026-11-17)
Window Wipe now uses a successive-window clean-and-reveal loop. Procedural
translucent soap hides the live camera; normalized brush discs smoothly reveal
it. A hidden 40×30 coverage grid measures cleaning, with aspect-aware circles
matching all 1–4 camera lanes. Separate arm samples never paint between arms.
Three ink spots need fresh rubbing movement across three passes. Dot indicators,
pop stars, a moving squeegee, bubble trails and a frame-clear celebration provide
visual feedback. At 94% soap removed and all spots rubbed out, remaining crumbs
clear and a 1.2-second celebration advances that player's window independently.
The 60-second round keeps running; completed windows do not end it early.

Soap earns up to 100 points, ink spots 10 each and a completed window another 50.
Scores accumulate across windows (180 per completed pane) in standalone and
five-game tournament play. Progress includes soap and ink. Malformed, duplicated,
stale, pre-resume or pre-window observations cannot score; stationary cached
positions cannot rub ink away. Paint history is bounded and resets per window.

Original locally synthesized filtered swishes, squeaks, bubble pops, sparkle
fanfare and a quiet plucked tune share mute/pause/recovery/cleanup. No downloaded
art or music, new dependency, camera uploads or copied source-game assets.
Reduced motion removes decorative movement. Mouse/touch dragging and keyboard
fallback remain; diagnostics start hidden for Window Wipe and can be enabled
with its existing wireframe control. Pose tracking continues for navigation and
ready holds. Physical camera sensitivity and audio perception need real-device
validation. See the game's README for reference analysis and implementation.

## Paper Jam rhythm game (2026-11-17)
Paper Jam is an original Beat Freak-style game at #/camera/beat-freak. It replaces
Whack-a-Mole in the focused five and the fourth tournament round; the existing
Whack implementation stays hidden for later refinement. Home retains only
Catalog and 5-Game Tournament. Current five: Rocket Rumble, Paper Dojo, Bubble
Battle, Window Wipe and Paper Jam.

Four original instrument speakers surround the uncropped live camera in each
player lane. Records approach from the center over 1.4 seconds. Fresh normalized
MOTION_HIT input at the speaker earns Perfect (±85 ms, 15 points) or Good
(±210 ms, 10 points). Misses break streaks; every eight hits build multipliers
up to ×3. All 1–4 players receive the same deterministic 60-second chart, with
four count-in beats, quarter notes, offbeat pickups and paired accents. No finger
shapes, new settings, external music or source-game assets are used.

A 100 BPM original background track is scheduled with 25 ms polling/120 ms
lookahead on the round's absolute 150 ms subdivision grid and Web Audio clock.
Instrument strikes add percussion, plucks/chimes and perfect/streak accents.
Camera/visibility/manual pauses freeze notes and the music timeline together;
future voices are cancelled. Re-enable sound rejoins the current grid. Animated
speakers, records, timing rings, a deck, meters and judgment sparks provide visual
feedback. Reduced motion removes decorative spinning/pulsing/thumps while
retaining essential record travel.

Player isolation, concrete event validation, per-frame spatial deduplication,
150 ms stale/capture-delivery limits and pre-resume guards prevent cached or
invalid scores. Simultaneous distinct arm samples can hit paired speakers.
Pointer/touch, native speaker buttons, aim/action fallback and number keys 1–4
remain available. Shared webcam navigation and three-second ready checks still
control setup, play, replay and results. Physical reach, camera latency and
perceived music synchronization remain hardware-validation requirements.


## Physical camera menu correction (2026-11-17)
The earlier small-preview/expanded-cursor navigation is superseded. Home and
Catalog now overlay the full mirrored camera, with choices placed around the
visible body. Native three-second hand overlap selects the actual button at
that image location. Both menus fit the same complete camera frame on desktop
and portrait screens. No Up/Down controls or separate camera preview remain.
Gameplay navigation uses the same physical projection into its existing camera
rectangle, while three-second player readiness stays separate. Real-device
tracking/comfort validation remains open.

## Minimal game introduction (2026-11-17)

The complete uncropped mirrored camera remains the background. Each of the five
public games has an original, local, silent three-second looping MP4 illustrating
its own movement. Show only its compact title/demo/one instruction, one ready
hand button per selected player, the three-second hold progress, and a small Games
exit. Hide gameplay HUD, targets, wireframe, diagnostic/recovery notices related
to waiting for ready, and tournament ribbon during this introduction. After all
players hold together for three fresh seconds, show only the three-second countdown
over the camera, then reveal gameplay. Genuine camera errors retain recovery.
The hand marker and ready contact use measured palm centers when confident finger
landmarks are present, otherwise wrists, projected into the actual video rectangle
without invented offsets or reach amplification. Physical hardware verification
remains required. Decorative kids/rainbow/sun stay at menu edges.

## Font exploration (2026-11-17)

Motion Scribble revision 02 is the active original two-weight handwriting face,
with a separate editable /font-preview.html specimen and local TTF/WOFF2 files.
Letter shapes, lean, baseline and stroke pressure vary, with contextual alternate
forms for repeated letters and real Bold headings instead of synthetic outlines. Player
choice cards have independent grid sizing so inherited card aspect ratios cannot
push a choice outside the camera image.

## Stable hand selection and unified timing (2026-11-17)

All navigation and player-ready selections use one 3,000 ms hold constant,
including game entry, every tournament round and replay. The gameplay countdown
remains three seconds after readiness. Require fresh simultaneous observations
for all players; preserve interruption, missing-tracking and scene-change guards.

The visible hand pointer and its menu hit testing use the same stabilized sample.
A camera-size-aware 3–9 px rest band suppresses small tremors; moderate movement
is lightly smoothed and large deliberate reaches follow immediately. Each hand
has independent history. Missing/weak/stale data, scene/geometry/visibility
changes and long sample gaps clear that history. No extrapolated or invented
captures, button-center snapping or game-input smoothing is introduced.

## Focused catalog reduction (2026-11-17)

Rocket Rumble and Bubble Battle are hidden for quality rework. Retain their
implementation and unit coverage, but omit them from Catalog, tournament rounds,
and public camera/detail routes. Bare /camera defaults to Paper Dojo. The current
public set is Paper Dojo, Window Wipe and Paper Jam. Tournament labels and schedule
follow this same set, temporarily three distinct rounds without repeating games.
The eight remaining original EyeToy: Play candidates and the separately paused
Rocket Rumble are documented in docs/EYETOY-PLAY-CATALOG.md, with regional aliases
and explicit distinctions between missing adaptations and hidden generic prototypes.


## Cardboard Champ — Boxing Chump inspired adaptation
The public catalog now includes Cardboard Champ (`punch-arena`) alongside Paper
Dojo, Window Wipe and Paper Jam. The tournament uses these four distinct games.
The former generic Punch Arena remains in source for historical tests but is no
longer mounted. The new game uses measured wrist travel for head/body punches
and fresh head position for ducking/leaning away from telegraphed robot punches.
Camera geometry passes through `input/BoxingInput`; the game never reads media.
Original articulated cardboard robot, impact bursts, guard/recoil/KO animation,
synthesized thuds/windup/dodge/bell sounds, local stick-figure demo, 1–4 isolated
lanes, sixty-second score chase, pause/replay and shared three-second ready hold.
No new model/dependency or network access. Missing tracking never earns a dodge.
This is an original adaptation, not an exact rule/asset reproduction. Physical
camera reach, occlusion, punch feel and speaker playback still need validation.


## Keep Ups — camera football
The public catalog and tournament now include Keep Ups (`keep-ups`) as the fifth
game, after Paper Dojo, Window Wipe, Paper Jam and Cardboard Champ. Each round is
played once; total points decide the winner. Keep Ups uses normalized measured
head, wrist, arm and torso surfaces with a fresh-pose physics simulation, round
footballs, headers, streaks, golden hoops and automatic re-serves. Original
artwork/tutorial and synthesized contact/crowd feedback retain the camera-first
presentation. No extra settings or confirmation steps. Details and physical
validation limits: `docs/KEEP-UPS.md`. Public camera routes now derive directly
from the visible catalog rather than requiring a second hard-coded route list.


## Keep Ups challenge revision
Keep Ups is now capped at 30 active seconds with three lives per player. Each
drop costs a life; only players with lives remaining receive another ball.
Eliminated players stop scoring, and all players eliminated ends the round early.
Gravity and lateral speed rise across the round. Directional gusts begin at eight
seconds with a 900 ms warning, last one second, and reverse every six seconds.
A sustained lateral drift replaces the old repeating bounce to require movement.
Lives, wind and elimination have minimal visible/readable feedback; replay resets
them. The tournament continues to use total points and advances on early finish.

### Ghost Catcher
Original rising paper ghosts and bats, continuous rubbing capture, expressive inflation, confetti and synthesized sound. Six catalog entries; tournament retains five existing rounds. 45-second cap, five escapes per player, escalating waves, isolated lanes and shared three-second readiness. See docs/GHOST-CATCHER.md.

### UFO Juggler
Seventh public game: spin saucers upward with short waving bursts, coast to avoid overheating, rescue pilots into orbit. Three lives per player, 40-second cap, increasing simultaneous ships, original art/audio/tutorial. Existing five-game tournament remains unchanged. See docs/UFO-JUGGLER.md.

### Multiplayer hand-menu release handling
A first detected hand already on a player-count button can begin its three-second hold immediately. Scene/geometry/tracking resets preserve release protection only when a prior choice actually activated it. After selection or dialog changes, release/re-entry is evaluated independently for each measured hand; one stationary player must not block another player's deliberate choice. Same-hand hold continuity and accidental-repeat protection remain in place.

### Minimal gameplay controls and results
Public games omit the manual Pause and Show/Hide wireframe buttons. Camera-disconnect and tab-visibility recovery continue automatically. Results use two matching side-by-side buttons for replay and Back to games across all seven visible games. Returning from automatic recovery focuses Exit game for keyboard access.

### Fullscreen control
A compact four-corner fullscreen button stays at the bottom right across menus and games, outside the camera-layout containers. It requests fullscreen for the document so camera overlays, navigation and results remain included, reflects fullscreenchange including browser exits, and toggles back to windowed mode. The sound control leaves room for it. Entry requires the browser's direct click/touch/keyboard activation; denied requests show an inline retry hint, not an alert. Unsupported fullscreen APIs omit the control.


### Jump Rush — requested obstacle jumping game (2026-11-17)
- Eighth public catalog game; existing five-game tournament schedule stays unchanged. Other four newly requested games remain pending.
- One to four isolated lanes on the shared camera. The input adapter uses measured shoulder/hip midpoint movement, with a rise threshold proportional to torso height (clamped to 2.5–7% of frame height). Arm motion alone is excluded; missing hips or multiple bodies in a lane produce no input. This detects torso rise, not independently verified foot lift.
- Forty-second rounds, a hurdle every 2.4 seconds, +10 for a timed hop and −5 for a tracked bump. Lowering rearms the next hop. Missing tracking cannot award clears. Up to 150 ms of camera/render skew is accepted without retroactively changing scored hurdles.
- Dedicated local movement video, three-second ready hold, three-second countdown, jump prompt, animated crayon hurdle/star, success burst and original synthesized cues. Paired replay/catalog actions; automatic recovery remains, no manual pause or wireframe button.
- Physical webcam jump comfort, lighting, distance and speaker playback remain unverified. Unit and browser fixtures are synthetic evidence only.


### Six Hoops — six baskets controlled with head/body (2026-11-18)
- Ninth public catalog entry, separate from the hidden swipe-based Basketball Blitz prototype. One shared camera court with exactly six hoops: three per side, valued 30/20/10 from top to bottom. The existing five-game tournament schedule is unchanged.
- Forty-five-second rounds; falling balls arrive more frequently over time, with at most four active balls. Measured head, hand, arm, torso and leg surfaces are normalized by the input adapter; the game converts lane-local input back into shared-court coordinates. No raw camera or pose-library access inside the minigame.
- Contact offset and measured horizontal body movement determine deflection. Gravity, edge rebounds and a 240 ms contact cooldown govern subsequent flight. Only a descending rim crossing after a body touch scores; the most recent toucher receives the points. Untouched balls and misses award no points. No automatic hoop aiming.
- Fixed 10 ms physics, bounded fresh-frame history, ambiguity/invalid-input guards, pause/replay reset, shared three-second readiness and countdown. Original local stick-figure demo, basketball artwork, trails, stretching nets, point bursts and synthesized bounce/swish/miss cues; shared mute/reduced-motion/fullscreen controls.
- Synthetic unit/browser tests do not constitute physical camera or speaker verification. Reachability, contact sensitivity and multiplayer comfort need real-world testing.

### Movement feedback refinement — 2026-11-18
- Jump Rush now uses an original kangaroo avatar with numbered jersey and a persistent YOU / player label. A continuous parabolic hop replaces the two-position star; brief tracking loss does not snap the visual to ground, while untracked movement still cannot score. Tutorial wording and video identify the player-controlled kangaroo. This refines Jump Rush; the separate planned kangaroo distance-race task remains pending.
- Six Hoops uses constant gravity, contact-normal reflection relative to measured horizontal/vertical body motion, energy loss, bounded velocities and geometric separation. Glancing contacts redirect rather than forcing every touch upward. Rim endpoints and the actual top/side court boundaries rebound balls; the old invisible ceiling at 10% frame height is removed. Descending-only scoring and last-toucher ownership remain.


### Goalkeeper and Net Rally — 2026-11-18
- Public catalog now eleven games. Four-column camera-menu placement keeps all cards inside the camera frame. Existing five-game tournament unchanged.
- Goalkeeper replaces the routed legacy prototype with actual normalized head/hand/limb/torso surface collision checks. An animated footballer at the top kicks randomized, slightly curved shots down toward the lower goal. No destination marker is shown. Fresh overlap with the actual moving ball in the lower half saves it. Forty seconds, eight conceded goals per player, ten points plus capped save-streak bonuses. One to four isolated lanes, visible save deflection and goal-net response. No inferred default keeper or stale automatic saves.
- Net Rally uses one shared court split by a solid central net. Body contact returns the ball over it; letting it fall on your side gives the opponent a point. First side to five wins, or the higher score after sixty seconds; equal scores draw. Solo players stand left against a visible robot paddle with bounded movement/reach. Two to four players form left/right teams by their camera positions; three players split one left/two right. Every member of the winning side receives ten points per rally. Automatic serves and short reset delays avoid extra setup.
- Original generated local movement videos, canvas artwork/animation, synthesized cues, shared three-second ready hold/countdown, preserved camera, automatic pause/recovery and paired result actions. Inputs remain normalized and local; camera libraries stay outside games. Hidden Dodgeball and Laser Escape implementations stay in source/dev but are excluded from production to preserve existing release budgets.
- Synthetic tests cover scoring, stale-input rejection, pause/replay, frame cadence, multiplayer and robot beatability. Real webcam timing, comfort, lighting and speaker playback remain to be validated.


### Kangaroo Race — final requested game (2026-11-18)
- A distinct shared-screen race, separate from Jump Rush. One to four numbered, color-coded kangaroos run on visible parallel tracks over the retained camera background. Distance differences visibly separate the runners. The public catalog now has twelve games; existing five-game tournament unchanged.
- Fresh normalized torso rise produces a smooth 700 ms hop, with lowering required before another jump. Missing body tracking stops distance accumulation. Identical obstacle sequences (logs, rocks, gaps) require progressively different clearance heights. Collisions slow the runner for one second; three collisions end that runner’s attempt. Race ends at 45 seconds or when all runners finish; farthest whole metres wins, with joint winners for ties.
- Original kangaroo artwork, local movement demo, jump/clear/impact sound cues, distance/life labels, half-second jump warning, shared three-second readiness/countdown, camera persistence, automatic recovery and adjacent results buttons. Minigame receives only normalized events.
- Physical jump sensitivity, multiplayer spacing, comfort and speaker playback remain unverified; automated pose/media tests are synthetic. All five user-requested games are now implemented; implementation status does not imply hardware validation.

### Ball contact and Net Rally refinement — 2026-11-18
Keep Ups, Six Hoops and Net Rally share an aspect-correct body-contact resolver.
Rebounds follow the contact normal and fresh measured surface velocity, including
light tangential friction, energy loss, geometric separation and a total-speed
limit. Segment velocity is measured at the contact point. Stale observations and
large pose jumps cannot supply an impulse. Side/underside contacts work in both
flight directions; score debounce is separate from physical separation. Keep Ups
no longer adds invented sideways drift or bounces off an invisible HUD ceiling;
its existing wind, lives and difficulty progression remain.

Net Rally uses gravity-driven flight without target-seeking shots. The solid net
has matching rendered/collision bounds, dark-backed mesh, outlined posts, white
top tape, a NET label and a visible floor. Two players automatically play 1 vs 1:
P1 left, P2 right, one ball, no robot, rally scores shown directly, first to five
(or highest score at sixty seconds). Solo keeps the visible angled robot paddle;
three/four players retain side teams. Each player can contact only their own
side's ball. Intro instructions and results name the actual players. The hidden
Dance Challenge prototype remains available in development but is excluded from
production to keep the existing JavaScript budget intact.

Automated collision and synthetic camera tests are not real-webcam validation.
Physical contact feel, multi-person tracking and lighting still require testing.
Keep Ups hoop bonuses require fresh player tracking and rearm only after the
ball leaves both hoop areas. This prevents overlapping targets in narrow
four-player lanes from awarding bonuses every physics step. Tiny resting
contacts still separate physically but do not build the scoring streak.


### One kangaroo jumping game — 2026-11-18
Jump Rush and Kangaroo Race are consolidated into the single public Kangaroo Race entry. It retains the smooth torso-controlled hop, original kangaroo, varied logs/rocks/gaps, three-bump limit, 45-second round and multiplayer distance ranking. The catalog has eleven games. Old camera/jump-rush and games/jump-rush links open Kangaroo Race with its tutorial and standard readiness flow. The old Jump Rush model and tests remain as historical source; its component is no longer routed or bundled.

### Visual review — 2026-11-18
The eleven public introductions and active screens have an initial synthetic-camera screenshot review in `VISUAL_AUDIT.md`. Ghost Catcher uses a locally stored generated crayon ghost with the existing procedural motion and a procedural fallback. Window Wipe displays its existing erasable foam at reduced opacity so the camera player is clearer. These screenshots and synthetic tests do not establish physical-camera tracking, play comfort or 60 FPS performance; in-motion and real-hardware review remains open.

Ghost Catcher's life counts now sit beside each player's score instead of over
the spawn area. Its camera tint is removed, and ghosts ease into view with a
subtle idle wobble; reduced-motion mode suppresses the movement.

UFO Juggler likewise places life counts beside player scores and removes its
camera tint. Synthetic one- and four-player tests cover the HUD and interactions;
the optimized local ghost sprite keeps the core release within its asset budget.
Keep Ups also displays life counts alongside scores rather than over the camera.
Goalkeeper shows its remaining allowed goals alongside each player's score.
Player-selection labels and the camera-opening state use solid readable backing.

Six Hoops uses a ball radius of 3.6% of frame height, shared by rendering,
body contact, court boundaries, rim collision and diagnostics. Goalkeeper adds
wind-up and save feedback; Cardboard Champ adds attack and hit accents; Paper
Dojo uses clearer ready and impact cues with more transparent towers. Synthetic
browser checks do not replace real-camera validation.

### Catalog arcade levels

The twelve public games use score-qualified arcade levels. Next level starts a three-second countdown on the retained camera. Playing the current level again repeats readiness. Qualifying individual or team scores unlock the next level according to the game format. Results show the level outcome, with personal bests stored locally. The five-game tournament runs Paper Dojo, Window Wipe, Cardboard Champ, Keep Ups and Ghost Catcher. Paper Jam is retired from public play.

The current per-game clocks, challenge curves, scoring, diagnostic overlay and validation results are documented in [GAMEPLAY_IMPROVEMENTS.md](GAMEPLAY_IMPROVEMENTS.md).

### Marble Bowling

One to four players each get a lane, a matching sequence of pin racks, and three rolls within 30 seconds. Sweep a hand upward to release the marble. The sideways component of the sweep aims it. A standing pin gives one point, and clearing a fresh rack in one roll gives three extra points. Partial racks carry over. A cleared rack resets if rolls remain. Later levels widen the spacing and add back pins and split formations. A shot released before the buzzer still counts. Dragging upward or pressing Space after aiming with the arrow keys also rolls. Existing Marble Mountain links open Marble Bowling, which has its own high-score records.

### Play formats by player count

Camera zones identify players independently of the layout used for play. Net Rally has singles, cooperative three-person rallying, and doubles with net and backcourt positions. Goalkeeper places the team across one wide goal with staggered attackers. Window Wipe uses a shared pane. Shadow Snap assigns each person a part of one group picture. Their arcade qualification uses the team's combined contributions. The current decisions for every public game are in [GAMEPLAY_AUDIT.md](GAMEPLAY_AUDIT.md).

### Shadow Snap

In Shadow Snap a cardboard wall covers the playfield, with the mirrored camera visible through a full-body cutout for each player. Each 36-second round starts with raised arms in solo play or a group butterfly. Players line up their bodies and fill both sleeves. After everyone fits together for 340 ms the shutter clicks. Red ink marks body parts outside the cutout. Each player can lose points for spill and for unfilled cardboard openings, with small allowances for tracking noise and different body shapes. Later levels use more asymmetric poses and shorter pose windows. The album retains the last three illustrated poses. Camera-free players can move the arms of an on-screen figure using pointer or keyboard controls.

### Kangaroo Race — automatic runner (2026-11-19)

During an active round each unfinished kangaroo runs automatically; players
jump to clear approaching obstacles rather than running on the spot. The
runner stays in a fixed track position while obstacles approach. Three bumps
finish a player's run. Camera/tracking recovery and pause behavior still apply;
only observed jump input triggers a jump. A four-frame crayon running cycle is
used when motion is enabled, with a still frame for reduced motion.
