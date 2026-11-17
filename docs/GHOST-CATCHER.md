# Ghost Catcher

An original camera game inspired by the rubbing/inflating interaction in EyeToy: Play's Ghost Catcher / Ghost Eliminator. References: the [Sony manual](https://db.hfsplay.fr/files/2019/12/02/EyeToy_-_Play_USA_XomAEr4.pdf) describes preventing escapes; the [published EyeToy movement analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC4290029/) describes waving over ghosts and bats. Research used written sources, not a frame-by-frame gameplay video review. All drawing, code, tutorial and synthesized sounds here are original.

## Play

Rub the rising paper ghosts until they swell and pop; swat the faster bats. A gold ring and the ghost's expression show capture progress. Pops produce paper confetti, a ring and a rising chime; rubbing produces soft pitch bends, escapes a falling tone. Ghosts wobble, bats flap, and the camera stays visible behind a paper graveyard border.

1–4 separate lanes, 45-second cap, five escapes per player. Waves speed up every 12 seconds; spawn intervals shorten. Ghosts score 25, bats 15, with a capture streak bonus up to 20; escaping breaks the streak. Eliminated players stop spawning/scoring; all eliminated ends the round early. Replay resets the round through the same three-second hand-ready gate and countdown.

The catalog now has six games. The tournament stays at five rounds with its existing Paper Dojo / Window Wipe / Paper Jam / Cardboard Champ / Keep Ups schedule; Ghost Catcher is available separately in the catalog.

## Input and lifecycle

CameraSetup passes spatial motion-mask samples, mapped to MOTION_BRUSH at the game boundary. No hand pose, finger recognition or camera import inside the minigame. Samples retain their measured timestamp and normalized lane coordinates. Capture charge is capped per timestamp per player: more pixels or duplicate samples cannot instant-pop a ghost. Samples older/newer than 150 ms, malformed coordinates and invalid confidence are rejected. Confidence threshold matches small valid areas from the motion processor (0.51); whole-frame exposure changes are already suppressed upstream. A static pose is not a capture input.

Pointer motion and arrow/Space keyboard input offer fallbacks. Camera interruption, visibility pause, resume and replay use shared recovery and clear timestamp state. WebAudio honors mute/hidden state; reduced-motion disables ghost wobble and bat flapping. Gameplay position/capture cues remain visible.

## Packaging and validation

Hidden Silk Squad remains in source/dev builds but is excluded from production, as Rocket Rumble already was, to keep the unchanged release budgets. No new dependencies, external assets or camera uploads.

Tests cover repeated rubbing, duplicate masks, stale/invalid events, isolated player scores, pause, early elimination, replay and wave escalation. Browser checks use synthetic media and pointer input; they do not verify a physical webcam, room lighting, multi-person spacing, real arm comfort or speaker sound quality.

## Review improvements — 2026-11-17

- Replaced the frame-dependent 100 ms movement cap with a fixed 20 ms simulation. Ghost positions, spawning and escapes now match across 16 ms, 250 ms and 3-second render intervals; the round clock no longer outruns slow-moving ghosts on a busy device.
- Mixed-timestamp batches only use locations from the latest observation, preventing an older contact from acquiring charge on a newer off-target frame. The view preserves input kinds instead of turning unrelated input into brush events.
- Captures show their actual points and combo bonus. Ghosts grow into view; those near the escape line receive an exclamation mark, warning ring and warm outline. Loss text explicitly says “−1 life”; elimination clears remaining targets without producing additional fake loss effects.
- Multiplayer emits each sound cue at most once per rendered update, suppresses rub sounds under capture sounds, and skips delayed escape sounds after a rendering stall. Reduced-motion mode also freezes decorative confetti/ring expansion and score travel, while keeping readable fading feedback.

Validation: 11 model tests (including cadence equivalence, mixed timestamps, combo awards and elimination isolation) and eight audio tests pass. Final model tests rerun after cleanup. Build/typecheck, lint, release integrity and whitespace checks pass within unchanged budgets. Browser/hardware results are tracked in tasks/progress.md; synthetic tests remain distinct from physical webcam and speaker validation.
