# Paper Dojo

An original camera-first martial-arts party game. Catalog slot 19 (`ninja-training`)
is now Paper Dojo, one of the current five public games.

## Reference analysis

The likely requested EyeToy reference is Kung Foo. Contemporary reporting describes
small attackers running/jumping from three-storey buildings on either side of the
player, with a fast board-breaking bonus:
https://www.gamespot.com/articles/ects-2002-ps2-eye-toy-unveiled/1100-2878933/
https://www.gamespot.com/articles/first-look-eyetoy-mini-games/1100-6023891/

The key interaction is seeing the person between attack sources and physically
swatting an approaching object in that same camera space. Early motion-region
interaction is also discussed in Glenn Sheasby's Oxford thesis, section 2.2:
https://www.robots.ox.ac.uk/~tvg/publications/2013/GlennSheasby_Thesis.pdf

These written references informed the interaction analysis; no footage was claimed
as physically play-tested. No original assets, branding, characters, soundtrack,
voice samples, code or exact level sequences were imported.

## Original implementation

- New folded-paper masked puppets with articulated arms/legs, scarves and tilted
  flight. Simulation-time trajectories run, crouch/telegraph and arc toward the
  center from alternating sides and three ledge levels.
- Sixty-second rounds with gradually faster waves, per-player combo multipliers,
  forgiving score penalties and no violent imagery. One to four independent lanes
  overlay an uncropped mirrored camera. There is no body-pose recognition claim.
- Continuous ninja waves throughout the round. The bamboo-breaking interludes,
  their scoring and their result statistics have been removed.
- Marked paper obstacles warn before becoming active; motion-center contact or
  explicit pointer/keyboard simulation charges the owning player once. These
  events are not represented as full-body pose recognition.
- Tumbles, paper confetti, impact lettering, combo stamps, preparation glows. Pause freezes both simulation and decorative animation. Reduced
  motion suppresses tumbling/confetti/bounce/limb flourishes, retaining essential
  attack movement.
- Original local Web Audio pitch-bent drum/woodblock effects, launch swooshes,
  plucked pentatonic accompaniment and fanfare. Shared persistent mute remains.
- Pointer targets and keyboard Enter/Space work alongside normalized MOTION_HIT
  input; per-player input, stale capture guards, aspect-correct hit regions and
  score isolation live in the model. Camera/media code stays outside the game.

## Mixed input and obstacle alternative

`MIXED` describes the game's input capability, not a new event kind. The camera
adapter forwards normalized `MOTION_HIT` samples for strikes and `BODY_MOVE`
samples from the observed movement center for obstacle contact. The game never
reads camera frames, landmarks or media APIs. This is a motion-area avoidance
mechanic, not body-pose tracking: still body occupancy cannot be inferred from
frame differences. Missing observations never earn dodge points.

Every six-second attack cycle ends with a marked obstacle: 700 ms warning, then
1100 ms active. Motion in its circle costs 10 points once per player and clears
their streak. Markers alternate sides throughout the round.
Pointer/touch or Tab + Enter/Space simulate contact as well as strikes. Collision
bounds use the same aspect-correct circles as the rendered markers. Pauses freeze
warnings, and stale/duplicate, invalid and pause-crossing samples cannot score.

Model tests cover choreography, scoring/debounce, players, geometry, fine/coarse
clock equivalence, continuous waves, pause, replay and escalating waves. View tests
cover generic input, visible effects, uninterrupted play, lifecycle and recovery. Browser checks
use synthetic canvas video to exercise real motion processing and audio scheduling.
Physical webcam feel, camera occlusion and speaker quality still need hardware review.

During play, labels show only player identity. Scores, timer, a single action cue
and sound/pause/exit controls leave the camera clear. Swats, best streaks
and obstacle bumps are summarized after the round.

Paper Dojo hides the body diagnostic and its controls in setup and gameplay.
Local pose inference stays active for webcam menus and the three-second ready
hold, while the live camera and original tower artwork remain unobstructed.

## Current arcade levels

Each level runs for up to 40 seconds. The shared camera is framed by a pair of illustrated buildings. The level name and opponent rank appear in the wave cue. Each score badge shows five heart slots and a health bar. Each breach or marked obstacle contact costs one of five HP. Depleted players keep their score and sit out until the next round. The tournament uses the first dojo.

| Level | Dojo | Opponent | Hits to defeat | Qualifying score |
|---|---|---|---:|---:|
| 1 | Bamboo Pavilion | Leaf Scout | 1 | 35 |
| 2 | Lantern Gate | Lantern Runner | 2 | 55 |
| 3 | Frost Lookout | Frost Guard | 3 | 75 |
| 4 | Golden Crane Pagoda | Golden Crane Master | 4 | 95 |
| 5 | Moon Gate | Violet Shadow | 5 | 115 |

Partial hits remove one armor dot and play a recoil pose. The final swat plays recoil, stagger and defeat on the simulation clock. Reduced motion shows the defeated pose immediately. Hits on one ninja must be separated by at least 210 ms of simulation time. Only a defeat awards points. Enemies accelerate across ranks and waves. Artwork provenance, dimensions and the original prompt are in the [rank sprite manifest](../../../public/assets/minigames/paper-dojo/manifest.json).
