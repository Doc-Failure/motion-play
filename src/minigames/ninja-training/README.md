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
- Five costumes smile during the approach and wind-up. At takeoff they switch to scowling push-off, tuck and reach frames. A small burst behind the trailing foot expands and fades over 340 ms of simulation time. Reduced motion keeps the expression change and omits the burst. A thin gold ring
  around each ninja shows remaining health. Swats trigger recoil and defeat
  poses. Player hearts and score feedback stay in the HUD.
- Original local Web Audio pitch-bent drum/woodblock effects, launch swooshes,
  plucked pentatonic accompaniment and fanfare. Shared persistent mute remains.
- Pointer targets and keyboard Enter/Space work alongside normalized MOTION_HIT
  input; per-player input, stale capture guards, aspect-correct hit regions and
  score isolation live in the model. Camera/media code stays outside the game.

## Controls

Swat a leaping ninja in your own lane. The camera supplies normalized
`MOTION_HIT` events. Touch, pointer and keyboard strikes use the same hit test.
Empty space is safe. Each ninja that gets through costs one heart and five points.

Model tests cover choreography, scoring/debounce, players, geometry, fine/coarse
clock equivalence, continuous waves, pause, replay and escalating waves. View tests
cover generic input, visible effects, uninterrupted play, lifecycle and recovery. Browser checks
use synthetic canvas video to exercise real motion processing and audio scheduling.
Physical webcam feel, camera occlusion and speaker quality still need hardware review.

During play, labels show only player identity. Scores, timer, a single action cue
and sound/pause/exit controls leave the camera clear. Swats, missed ninjas
and best streaks are summarized after the round.

Paper Dojo hides the body diagnostic and its controls in setup and gameplay.
Local pose inference stays active for webcam menus and the three-second ready
hold, while the live camera and original tower artwork remain unobstructed.

## Current arcade levels

Each level runs for up to 40 seconds. The shared camera is framed by a pair of illustrated buildings. The level name and opponent rank appear in the wave cue. Each score badge shows five heart slots and a health bar. Each breach costs one of five HP. Depleted players keep their score and sit out until the next round. The tournament uses the first dojo.

| Level | Dojo | Opponent | Hits to defeat | Qualifying score |
|---|---|---|---:|---:|
| 1 | Bamboo Pavilion | Leaf Scout | 1 | 35 |
| 2 | Lantern Gate | Lantern Runner | 2 | 55 |
| 3 | Frost Lookout | Frost Guard | 3 | 75 |
| 4 | Golden Crane Pagoda | Golden Crane Master | 4 | 95 |
| 5 | Moon Gate | Violet Shadow | 5 | 115 |
| 6 | Moon Gate | Thunder Oni (boss) | 12 | 135 |

Each partial hit shortens the gold ring and plays a recoil pose. The final swat plays recoil, stagger and defeat on the simulation clock. Reduced motion shows the defeated pose immediately. Hits on one ninja must be separated by at least 210 ms of simulation time. Only a defeat awards points. Enemies accelerate across ranks and waves. Artwork provenance, dimensions and the original prompt are in the [rank sprite manifest](../../../public/assets/minigames/paper-dojo/manifest.json).


Thunder Oni returns from alternating towers with its remaining HP. Three swats in one charge repel it. A charge that breaks through takes a heart and five points. Defeat earns 160 points. Each player fights one boss in their lane, and the round closes when all lanes finish.
