# Keep Ups

An original camera football game inspired by EyeToy: Play's Keep Ups / Soccer
Craze. The [Sony manual](https://db.hfsplay.fr/files/2019/12/02/EyeToy_-_Play_USA_XomAEr4.pdf)
describes keeping the ball airborne and bonus interactions. A
[published game analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC4290029/)
describes head/arm play and hitting bonus targets with the ball. Written sources
were reviewed; no frame-by-frame original-footage match is claimed.

## Our version

- One spinning paper football per player over the uncropped mirrored camera.
  Original local canvas artwork, bunting, touchline, squash/release, trails and
  confetti. Reduced motion removes decorative spin, squash, trails and confetti;
  essential ball movement remains visible. The bounce apex stays below the HUD
  in normal framing. There are no redundant labels over the ball's flight path.
- Measured head, wrists, arm segments and torso come through `KeepUpsInput` as
  normalized BODY_MOVE events. Head contacts earn 15 points, other body touches
  10; successive touches add up to 15 extra points. Ball collisions use actual
  camera aspect ratio, so a ball remains round and correctly placed in 1–4 lanes.
- Gravity, wall rebounds and lateral deflection form a continuous trajectory.
  Gravity and sideways speed increase through the round; directional drift replaces
  the old repeating left/right bounce that could sustain stationary headers.
  A 120 Hz fixed simulation step prevents tunnelling. Only descending balls
  contact a surface, with a 240 ms contact cooldown. A short pose-frame history
  lets the simulation use the correct observation at each timestamp. Samples
  older than 200 ms, missing/ambiguous bodies, invalid confidence and old input
  across pause/replay cannot produce saves. No video pixels enter the game.
- Three touches unlock a golden hoop. Sending the ball through earns +30 and
  switches the hoop to the opposite side. Each player has three lives. A drop costs
  one life and breaks the streak; another ball arrives after 900 ms only while
  lives remain. Eliminated players stop scoring. The round ends immediately when
  everyone is out; surviving players continue independently. Best streak is kept.
- Original synthesized thuds/headers, a drop whistle, and layered noise/clap/
  rising-tone crowd celebrations on five-touch streaks and bonus hoops. Shared
  mute, pause, visibility and exit cleanup apply; no external audio assets.
- A maximum 30-second challenge with 1–4 separate scores. Beginning at eight
  seconds, each gust has a 900 ms directional warning followed by one second of
  sideways force, alternating direction every six seconds. Hearts, warning arrows,
  wind strokes and an out-of-lives message explain the stakes. These are original
  difficulty rules, not an exact reproduction of the original match.
- Local three-second stick-figure tutorial, shared three-second hand-ready hold,
  three-count start, results and replay. Pointer movement or keyboard aiming is
  available for simulation. Manual input expires rather than creating a permanent
  invisible paddle. Tracking guidance appears when the player is not visible.

The catalog now has five games and the tournament plays each once, then ranks
players by total points. Public camera routes derive from that same catalog.
Rocket Rumble remains hidden; its prototype remains in source/development but
is excluded from public production JavaScript to retain existing size budgets.
No new model, dependency, network permission, tracking or camera upload added.

## Validation boundary

Synthetic model/browser checks exercise pose-driven contacts, continuous
rebounds, headers and arm segments, hoops, drop/re-serve, stale/lost input,
player isolation, pause/replay, camera retention and tournament completion.
They do not establish physical webcam accuracy, comfort, four-person spacing,
audio latency or speaker quality. Those remain real-hardware review items.
