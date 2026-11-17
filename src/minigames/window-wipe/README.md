# Window Wipe

A rebuilt, original camera cleaning game inspired by the clean-and-reveal loop
of Wishi Washi in EyeToy: Play. The published [game analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC4290029/)
describes clearing soap with upper-body movements to reveal the player. Our
artwork, sounds, layouts, scoring, ink spots and transitions are original.
No source-game artwork, soundtrack, recordings or code are used.

## Play

Sweep soap away to uncover the mirrored live camera. Rub the three ink spots
back and forth: their dots show three remaining passes, then a bubble pop and
sparkles confirm removal. Clean at least 94% of the soap and all spots to finish
a pane; remaining crumbs clear automatically. A short sparkle celebration lifts
the foam before a new colored window arrives. Each player progresses independently.

A round lasts 60 seconds, with one to four side-by-side camera lanes. Soap earns
one point per percentage removed, each ink spot earns ten points, and a finished
window adds fifty points (180 total for a complete window). The next window resets
coverage, not points. Standalone and tournament play share the same scoring.
The progress indicator includes both soap and ink. Timing, completion and effects
freeze during pause, camera recovery, hidden tabs and the three-second ready hold.

## Graphics and sound

- Procedural translucent foam, chalky swirls and translucent soap bubbles cover
  the live camera. Model-owned elliptical brush discs erase the foam smoothly;
  the internal coverage grid is never drawn. The visible brush and scoring use
  the same normalized camera coordinates and aspect-aware radii.
- A hand-drawn window frame, colorful squeegee following productive movement,
  floating bubble trails, ink-pop stars and a pane-clear stamp react to cleaning.
  Simulation time drives particles; CSS animations pause with the model.
- Original local Web Audio supplies filtered soap swishes, short rising squeaks,
  bubble pops, an ascending completion fanfare and a quiet plucked accompaniment.
  Shared mute, visibility, pause, exit and replay cleanup cover noise sources as
  well as pitched voices. No music downloads or extra assets are required.
- Reduced motion removes entrance, lift and celebration movement and particle
  travel; essential cleaning and score information remain visible. Scores, dots,
  progress and text communicate without sound or color alone.

## Input and verification

Only normalized MOTION_BRUSH events enter the model. Camera frame differencing
and spatial sampling remain upstream. The game never reads raw video, pixels,
landmarks or media libraries. Distinct samples in a single capture can clean
separate arm regions; the game never fills imaginary paths between samples.
Malformed, low-confidence, reordered, duplicated and stale samples cannot score.
Pre-resume/pre-window captures cannot paint a new pane. Ink removal requires
fresh spaced movement, not a held cached point. Paint history is bounded by
newly revealed coverage and resets with each window.

Pointer dragging and keyboard aim/action provide equivalent fallback input.
Body diagnostics start hidden in this game, with the existing Show wireframe
control available; background tracking continues for menu navigation/readiness.

Unit tests cover lifecycle, validation, player isolation, rubbing, multiple
windows, scoring, replay, transition freezing, narrow-lane geometry and retained
paint. Browser tests verify actual canvas erasure, effects, audio scheduling,
muting, pointer/keyboard play, mirrored synthetic motion, camera recovery,
viewport containment and tournament integration. Automated synthetic camera
checks do not establish physical webcam sensitivity or perceived speaker quality.
