# Visual audit — in progress

This is an initial inspection, not a completed game audit. The 1280 × 800
headless Chromium capture is in `docs/visual-audit/home-before.png`. It was
taken while the camera was opening; it does not show gameplay.

## Priorities

- [x] Capture introductions, active play and settled results for the currently
  public games with a synthetic camera; representative interaction tests cover
  collisions, reduced motion and recovery.
- [ ] Compare every game's interactions and readability during physical play;
  not every game has a matched before/after capture.
- [x] Improve the player-selection labels and camera-opening status. The
  updated pending-camera screenshot is `home-opening-after.png`.
- [x] Measure short synthetic rendering and input-response samples.
- [ ] Validate camera feel and sustained performance on real hardware.
- [ ] Generate and verify any further needed assets through Kimi WebBridge.

The home screen already has a coherent hand-drawn crayon direction.

## Ghost Catcher — first pass

Synthetic-camera captures: `docs/visual-audit/ghost-catcher-before.png` and
`docs/visual-audit/ghost-catcher-after.png` (different moments in the round).
The original ghost had flat geometric fills that contrasted with the crayon home
art. A transparent generated sprite uses an eased entrance, idle movement and
charge wobble; the procedural bat and fallback remain. The full-frame tint was
removed and life counts moved into the score bar so they do not overlap spawning
targets. Multiple ghosts can still obscure the player's body; review crowding
in physical play before changing spawn or collision behavior.
The two Chromium interaction and warning tests pass with synthetic camera input;
they do not verify physical camera feel or frame rate.

## Public game screen review

The original 11 public games were captured at 1280 × 720 using the same synthetic
camera figure, approximately two seconds after countdown. The
`games/*-intro.png` and `games/*-game.png` files record each screen; the
contact sheets give an overview. These stills are a first-pass visual review,
not evidence of physical tracking, sustained frame rate, or every game state.

| Game | Observations and next review |
| --- | --- |
| Paper Dojo | Towers are more transparent, ready ninjas have an outlined warning, and impact bursts appear larger and immediately. Check contrast over varied physical camera backgrounds. |
| Window Wipe | Dense foam obscured the player in the initial capture. Lowered its display opacity while keeping the underlying wipe mask; verify cleaned and uncleared areas remain distinguishable. |
| Paper Jam | The speaker targets are clear and distinct. Check whether moving record and active-speaker outlines remain legible in a busy room. |
| Cardboard Champ | Attack wind-ups now show an additional alert mark, and landed punches produce an expanding impact ring. Check telegraphs, punches and positioning with a physical camera. |
| Keep Ups | Life counts moved from the camera image to the score bar. Review ball visibility and feedback over real clothing and backgrounds. |
| Ghost Catcher | Ghost art now matches the crayon direction; life counts moved to the header. Check capture effects and crowding in motion. |
| UFO Juggler | The saucer is relatively small and close to the bottom of the frame. Life counts have moved to the score bar and the full-frame tint has been removed. Review overheating and rescue cues when multiple ships are active. |
| Six Hoops | Ball radius increased from 0.027 to 0.036 of camera height, including physics and diagnostic bounds. Synthetic one- and four-player contact and basket tests passed; physical reach still needs review. |
| Goalkeeper | The kicker has a wind-up outline and crayon marks, and saves produce a ring at the contact location. Synthetic one-, two- and four-player saves and recovery passed. Physical shot timing remains unverified. |
| Net Rally | Synthetic four-player capture shows readable team scores and a distinct net. Physical ball contact and team spacing still need review. |
| Kangaroo Race | The runner and obstacles appear small in the single-player capture. The jump warning has a larger outlined label and restrained pulse, disabled for reduced motion. Synthetic one- and four-player interaction tests passed; physical readability still needs review. |
| Marble Mountain | Added to the public catalog during this review. A lighter board tint leaves the synthetic player clearer while preserving visible rails and targets; compare `marble-mountain-before.png` and `marble-mountain-after.png` (different moments). One- and four-player simulated steering tests passed; physical shoulder tracking remains unverified. |

All intro screens share the same compact ready gate and movement demonstration.
The small instruction copy deserves a readability check at normal viewing
distance. No new art is justified from these stills alone for the sports games:
their essential moving elements and feedback need to be reviewed in context.

The settled results screens for all 12 currently public games are captured in `results/`
and `results-contact-sheet.jpg`. A synthetic no-input Paper Dojo round exposed
an overly specific “paper-perfect” result message; it has been changed to a
neutral completion message. Real-world viewing distance and interaction feel
still need checking.

The common camera-game instruction label has been enlarged and outlined. Paper
Jam, Window Wipe and Paper Dojo had smaller overrides, which have also been
increased. Results panels use a short entrance unless reduced motion is enabled.
The four-player race warning is captured in `kangaroo-warning-four-after.png`.
Portrait-width synthetic browser checks verify that the three game-specific
labels remain at least 12 px and do not overlap the sound control.

Window Wipe's updated screenshot is `window-wipe-after.png`; compare it with
`games/window-wipe-game.png`. The synthetic player is clearer while the foam
and ink remain visible. Its browser tests exercised wiping and mirrored lanes.

UFO Juggler's updated one- and four-player captures are `ufo-flight-after.png`
and `ufo-four-after.png`. The score bar now shows each player's remaining
lives, leaving the launch area unobstructed. The one- and four-player interaction
tests and synthetic motion-mask test passed. Physical tracking remains unverified.

Keep Ups captures `keep-ups-after.png` and `keep-ups-four-after.png` show life
counts in the score bar. One- and four-player pose fixtures and pointer fallback
passed in Chromium; these are simulated inputs, not physical webcam validation.

The matching generated bat (`bat-original.png`, 1254 × 1254 RGBA, and
`bat-candidate.webp`, 160 × 160) was downloaded via the same ChatGPT
conversation. Prompt: “Create a matching reusable sprite for the same game:
one friendly little purple bat, wings spread, cute expressive face. Match the
previous ghost closely: childlike wax-crayon scribble strokes, uneven black
outline, imperfect coloring, subtle paper texture within the character.
Transparent background with generous clear padding. One isolated character,
no words, no scenery, no interface, no gradients or realistic shadows.” It is
not integrated: the current procedural bat has independently flapping wings,
and a static replacement would lose that motion. Evaluate an articulated sprite
or retain the current drawing after an in-motion comparison.

## Automated checks

- All 11 synthetic-camera introduction/gameplay screenshot checks passed.
- Window Wipe's two targeted browser interaction tests passed after the opacity change.
- Kangaroo Race's one- and four-player synthetic pose checks passed with the
  warning visible; the four-player check also verifies reduced motion.
- Goalkeeper one-, two- and four-player browser interaction checks passed;
  the isolated one-player Six Hoops basket check also passed.
- On this machine, a short four-player synthetic Ghost Catcher probe sampled
  120 animation intervals: debug off 60.2 FPS / 17.6 ms p95 / 75.3 ms to
  first visible charge; debug on 60.3 FPS / 17.3 ms p95 / 91.5 ms to charge.
  A separate debug-on run measured 38.2 FPS / 53.9 ms p95 / 38.7 ms to charge.
  These are software-only samples and do not establish sustained frame rate or
  physical movement latency; capture hardware and system load are excluded.
- A single-worker idle synthetic-camera sweep sampled 120 animation intervals
  per game. It measured 53.1 FPS / 34.6 ms p95 for Goalkeeper and approximately
  59–60.5 FPS / 17.4–18.7 ms p95 for the other games. A Goalkeeper rerun
  measured 60.1 FPS / 18.6 ms p95. A separate Marble
  Mountain rerun confirmed its active game view at 60.3 FPS / 18.7 ms p95.
  These brief samples exclude actual pose inference and active physical play.
- An earlier Chromium interaction run passed 25 of 28 tests. Two Paper Dojo
  tests then expected a removed manual Pause button; one Keep Ups test missed
  the short wind-warning state under load and passed on an isolated rerun.
  The Paper Dojo tests have since been updated for automatic recovery; consult
  the latest browser-run results rather than treating that earlier run as current.
- An earlier full unit run had five failures in legacy Jump Rush and manual
  Pause expectations. Those tests were updated for the current specification;
  the later combined-workspace run reported 1,257 passing tests in 107 files.
  See `GAMEPLAY_IMPROVEMENTS.md` for its measurement methods and limitations.

## Generated artwork follow-up

- Paper Dojo now uses a four-pose transparent crayon ninja sheet for running,
  anticipation, flight and the hit tumble, with the original puppet retained
  as a loading/error fallback. The source and prompt are recorded in
  `docs/visual-audit/asset-manifest.md`. Compare
  `docs/visual-audit/games/ninja-training-game.png` with
  `docs/visual-audit/paper-dojo-crayon-after.png`.
- Goalkeeper uses a generated crayon kicker with procedural wind-up and kick;
  compare `docs/visual-audit/games/goalkeeper-game.png` and
  `docs/visual-audit/goalkeeper-crayon-after.png`.
- Shared results actions use a generated blank yellow crayon button background;
  their labels remain accessible text. See `docs/visual-audit/results-buttons-after.png`.
  Other button families have not yet been converted.
- Chromium synthetic-camera Paper Dojo gameplay and narrow-layout visual
  captures passed after the sprite and button changes. These checks do not
  establish real-camera tracking quality.

Paper Dojo's airborne ninja now uses a generated determined attack pose, with
its original leap sprite as a loading/error fallback. The Chromium continuous
play test checked the attack and hit poses and passed with a simulated camera;
see `docs/visual-audit/paper-dojo-attack-after.png`.

Goalkeeper now has a four-pose generated kicker sheet, driven by the existing
shot clock, with the previous single image and vector drawing retained as
fallbacks. Compare `docs/visual-audit/goalkeeper-crayon-after.png` with
`docs/visual-audit/goalkeeper-sheet-after.png`; the four-player capture is
`docs/visual-audit/goalkeeper-sheet-four-after.png`. Chromium tests exercised
one- and four-player play with simulated camera input and observed wind-up,
kick and follow-through frames. Physical webcam performance was not tested.

Kangaroo Race now uses a four-pose crayon sheet selected by the simulation clock
for running, jumping, landing and stumbling. The original procedural drawing is
retained as a loading/error fallback, with numbered player-color badges. Compare
`docs/visual-audit/kangaroo-warning-after.png` with
`docs/visual-audit/kangaroo-sprite-jump-after.png`; the four-player capture is
`docs/visual-audit/kangaroo-sprite-four-after.png`. One- and four-player Chromium
checks exercised synthetic body movement, jumps, reduced motion, pause and replay;
physical webcam play was not tested.

Cardboard Champ now renders a generated four-pose crayon boxer body (ready,
attack, hit and knockout) with separately animated gloves. Its dashed attack
rectangle and contact ring were removed; a smaller glove and textual duck cue
remain. Compare `docs/visual-audit/boxing-warning-improved.png` with
`docs/visual-audit/boxing-sprite-warning-after.png`. A source review of the
other visible games did not identify another equivalent NPC impact-location
rectangle. The Chromium boxing checks covered simulated one-player wrist input,
four-player controls, reduced motion, pause and replay; real-camera play was
not tested.

Follow-up: the Cardboard Champ sheet was rebuilt at 512 × 512 from the
preserved original to improve detail at gameplay size; compare
`boxing-sprite-warning-after.png` and `boxing-higher-resolution-after.png`.
Ghost Catcher now has a generated four-cell bat sheet with flapping and touch
reactions, seen in `ghost-bat-sheet-after.png`. Results buttons use a cleaner
generated sticker, visible in `results-buttons-clean-after.png`; the previous
asset is retained. Marble Mountain rotates its ball with steering and disables
the rotation under reduced motion. Isolated Chromium checks passed for the
boxer, bat, results screenshot and marble rotation with simulated input. A
broader Marble Mountain check failed its later level-reset score assertion;
this remains unresolved. No physical camera testing was performed.

The home player selector and title now have warmer contrasting backdrops; the
selector moved below the game choices. Catalog header text is visually hidden
but retained for assistive technology, the catalog tournament shortcut was
removed, Back to Home is blue, and four regenerated crayon tile backgrounds
have pale centers. See `home-controls-refreshed.png` and
`catalog-tiles-refreshed.png`. Gameplay instructions and tools have separate
space and are hidden behind results; see `boxing-results-clear.png`.

Cardboard Champ's hit message now sits above the boxer, leaving its existing
surprised sprite face visible (`boxing-face-visible-after.png`). Kangaroo Race
frames remain square in one- and four-player layouts
(`kangaroo-proportions-after.png`). Ghost Catcher now uses a four-pose ghost
sheet for idle, wave, touch and capture; the capture score appears above the
character (`ghost-expression-after.png`). Browser checks used simulated camera
input; physical webcam play remains unverified.

Kangaroo Race now uses a four-frame running sheet and advances automatically
while the round is active; jumping remains driven by normalized camera input.
The runner stays in place as obstacles approach, and the existing recovery pause
still applies to camera loss. Browser testing used simulated input only.

Neutral tutorial, results and shared status surfaces now use white instead of
the previous cream. The tutorial videos were regenerated with white backgrounds
while preserving the original clips under `docs/visual-audit/intro-before-white/`.
See `white-tutorial-after.png` and `white-results-after.png`. Intentional crayon
colors on artwork and action buttons remain.

The white neutral treatment was extended to remaining cream UI backgrounds,
including game-specific status panels. The Marble Bowling and Shadow Snap
introductory cards and video backgrounds were checked in Chromium; see
`marble-bowling-white-tutorial.png`. These changes are local until deployed.

The home title backing and shared paper artwork also use white, including when
the camera is unavailable. Paper Dojo's intro card and embedded video were
checked in Chromium; see `white-home-after.png` and
`ninja-white-tutorial-after.png`. The deployment must be updated separately.
