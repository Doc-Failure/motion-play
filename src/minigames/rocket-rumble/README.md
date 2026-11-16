# Rocket Rumble

An original camera-first matching-and-fireworks game inspired by the interaction
of selecting a colour group and triggering a detonation. All illustrations,
particles, sounds, scoring, choreography and UI here are original implementations.
No EyeToy assets, soundtrack, level data or source code are included.

Tag two or three rockets sharing a colour AND shape (Sun, Diamond, Heart), then
hit the launch switch. A pair earns 40 points; three earn 90. Switching colour
while a group is tagged does not charge a penalty or select an incompatible
rocket. Fuses show remaining lifetime; each new wave resets expired selections.
The last fifteen seconds bring a faster finale. Rounds last sixty seconds.

- Nine staggered launches per player with eased ascent and gently floating targets.
- Linked selection paths, fuse rings, persistent tagged state, an armed plunger,
  sequential ignition, chrysanthemum/willow/heart patterns, sparks and point cheers.
- Transparent, deterministic Canvas particles, bounded by recent burst lifetime.
  Per-lane rendering caps device pixel ratio at two. No full-screen flash or camera
  dimming. Reduced motion substitutes stationary fading rings for moving particles.
- Original Web Audio whistles, low booms, locally generated filtered crackle,
  sparkling overtones and a quiet plucked theme. All share persistent mute and
  stop on pause, visibility recovery and unmount.
- Camera/media libraries remain outside the game. Normalized MOTION_HIT events,
  pointer, and keyboard activation share the same model with aspect-correct hit
  regions, input confidence/age checks, debounce and independent player scores.
- Shared countdown, camera/tab/manual recovery, frozen particles/fuses during
  pause, focused results, clean replay, one to four side-by-side camera lanes.

Model tests cover matching, trigger gating, score isolation, capture validation,
coarse/fine timing, expiration, geometry, pause and replay. Browser tests exercise
real motion processing on synthetic video, keyboard chains, drawn Canvas pixels,
real audio noise scheduling, mute, pause, finale, results and responsive layouts.
These do not establish physical webcam feel, speaker quality or four real players.

The public five remain limited: Rocket Rumble replaces Fruit Catcher for refinement.
