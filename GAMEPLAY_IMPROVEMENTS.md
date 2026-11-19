# Motion Play gameplay improvements

The collection review covers 12 public games, 30 development games and three archived implementations. The full inventory, per-game changes and repeatable verification are in [the tracker](GAME_IMPROVEMENT_TRACKER.md), [the issue register](GAMEPLAY_ISSUES.md) and [the progress report](GAMEPLAY_PROGRESS.md). Development games use the same camera, ready and results flow as the public catalog. The production picker retains its twelve titles.

The twelve games in the public catalog support consecutive arcade levels on the same camera stream. Six Hoops was the first redesign because its old serve positions excluded both outside lanes in a four-player game. The baseline findings for each game are in [GAMEPLAY_AUDIT.md](GAMEPLAY_AUDIT.md).

## Playing a set

Choose a game, complete the shared ready check, then play after the three-second countdown. The HUD names the level and score goal. A round ends at its clock, life limit or match point. Reaching the displayed goal unlocks the next level at results. Multiplayer Goalkeeper, Window Wipe, Shadow Snap and three-player Net Rally use combined contributions. In a local competitive game, any qualifying player can unlock the next round for the group. The individual scores and team standings still decide who won.

Next level after a clear goes directly to a fresh countdown. Replaying the current level gives families another simultaneous ready check. Three rounds of a 40-second game take about two minutes of play. Players choose when to end their set. Net Rally retains its first-to-five rule and 60-second tiebreak clock. The five-game tournament uses its existing round schedule and points aggregation.

Results keep a best score for each player slot, game, level and player count on this browser. A family can replay or leave without saving camera data. Player slots are local seats and can be occupied by different people across sessions.

## Difficulty and scoring

The target at level L is `min(cap, opening + (L − 1) × increment)`. The shared difficulty input P is `min(1, (L − 1) / 7)`. Optional solo assistance can be enabled with `?soloAssist=1` before the route hash. A replay below 65% of the goal eases P by 0.05, up to 0.15, and a clear restores 0.05. Each model applies P to its own mechanics. Challenge peaks at level 8 and subsequent levels sustain capped play. Score targets are expressed in native points, except for race metres.

| Game | Clock | Goal, opening / increment / cap | Rules and progression |
|---|---:|---:|---|
| Six Hoops | 45 s | 10 / 5 / 50 | Each lane gets an opening serve by 1.1 s. Drops rotate through lanes and move within each lane across cycles. Later levels add lateral release velocity. The interval is max(950, 2240 − 480P − elapsedMs/65) divided by min(2, players), with four falling balls maximum. A descending basket after contact gives the last toucher 30, 20 or 10 points by height. Consecutive makes add 5, 10, then 15. A touched miss breaks its owner’s streak. |
| UFO Juggler | 40 s | 50 / 20 / 190 | Add one saucer at a time into a free slot. Rotate preferred slots. Intervals are 4.2, 1.95 and 1.7 s across three waves, minus 0.5P seconds. A solo pilot who clears the screen gets another ship within about 0.7 s. Spin decays at 0.28 + 0.045P per second. Coast to avoid overheating. A rescue gives 50 plus up to 40 streak points. A late save adds 10 once per ship. |
| Ghost Catcher | 45 s | 50 / 35 / 295 | Reachable columns, gentle sideways drift, quick bats and at most four to six rising targets per player depending on wave. The spawn interval floors at 750 ms. Rise speed scales by 1 + 0.22(wave − 1) + 0.18P. A ghost gives 25 and a bat gives 15, plus 5 per previous consecutive catch up to 20. Five escapes end a player's run. |
| Kangaroo Race | 45 s | 65 / 15 / 170 | First obstacle at 15 m. Identical courses and different required hop heights for logs, rocks and gaps. The obstacle name precedes the jump cue. Normal speed is 8 + 4 × round fraction + 1.6P m/s. Required clearance rises by 0.10P. A fresh measured rise starts a hop and lowering rearms it. Three bumps end the run. Distance, clears, bumps and best clear streak explain the result. |
| Window Wipe | 42 s | 55 / 18 / 181 | Clear soap and scrub three ink spots on one shared pane. The crew splits the completion bonus among contributors. Required coverage is 86 + 1.2 × min(4, cleared windows) + 4P percent. A clean pane changes after 0.8 s. Points follow newly cleaned coverage, with 10 per ink spot and a completion top-up to 180 total per pane. Each sample checks the affected grid rectangle. A batch of brush samples produces one display snapshot. |
| Paper Dojo | 40 s | 35 / 20 / 175 | Ninjas enter within easier reach, show their windup, then leap in a repeating eight-entry side pattern. Flight time floors at 1200 ms and spawn interval at 650 ms. Each level adds up to 300 ms less flight time and 190 ms less between spawns at peak pressure. Swats give 10, doubling on the fifth consecutive swat and tripling on the ninth. An escape costs 5 and a marked obstacle costs 10 once. |
| Paper Jam (retired) | 42 s | 40 / 30 / 250 | Two solo speakers at levels 1–2, one cue every 1.2 s. In a band, each opening musician has one numbered speaker. Level 3 adds instruments, level 4 adds offbeats, and level 6 adds paired accents on the ordinary curve. Opening timing accepts 300 ms early through 420 ms late. A perfect gives 15 and a good hit gives 10. Every eight prior consecutive hits raises the multiplier, up to 3×. |
| Cardboard Champ | 42 s | 40 / 25 / 215 | A landed head/body jab gives 10/8 plus up to 10 combo points. Dodge for 15, then connect within 680 ms for a one-use 12-point counter bonus. Knockouts add 50 and bring back the opponent after 950 ms. Later opponents and levels shorten attack spacing down to 2.4 s while retaining the visible windup. Empty stamina costs 20. |
| Keep Ups | 30 s | 20 / 10 / 90 | Gravity is 0.85 + 0.55 × round fraction + 0.18P. Wind force scales separately with P while the warning stays synchronized with the gust. A header gives 15 and another meaningful body touch gives 10, plus up to 15 streak points. Hoops add 30 after three consecutive touches and require a fresh tracked player and a new entry. |
| Goalkeeper | 40 s | 20 / 10 / 90 | A shared match seed produces equal shot sequences. Kicks stagger by 300 ms per starting station. Any defender can save across the shared goal, the team allows eight goals per player and its target is the solo goal multiplied by 1 + 0.5 × (players − 1), rounded up. Aim spread starts at 0.48 + 0.10P and grows by 0.034 per shot to 0.78. Flight time starts at 1400 − 150P ms and decreases by 36 ms per shot to an 850 ms floor. Each save gives 10 plus 2 per previous consecutive save up to 20 extra. Results include saves, best streak and mean time into the eligible save window. |
| Net Rally | 60 s | 20 / 10 / 50 | After a 650 ms reset, serve depth rotates across four positions. Horizontal serve speed is 0.18 + 0.002 × min(6, rally count) + 0.035P. Gravity, solid net, actual body impulses and bounded robot reach govern returns. Three players work together to send five touched balls across a net at one-third court width, earning 10 points per crossing for the sender. In singles and doubles each won rally is worth one on the match board and ten arcade points per winning teammate. The match ends at five or time. |
| Marble Bowling | 30 s or everyone finishes three rolls | 3 / 1 / 9 | One point per pin, plus three for a first-roll strike. A missed or partial roll leaves the rack in place. Each lane uses the same rack sequence. The contact radius falls from 8.5 to 6.7 lane units, with wider spacing as levels progress. Four- and five-pin racks appear at pressure 0.25 and 0.55, with split formations from 0.75. |


## Input and diagnostics

The motion processor retains spatial denoising and exposure compensation. It now releases a strong difference signal more quickly on a stationary frame. The normalized camera-to-game boundary, stale-input checks, local lanes, contact separation and cooldowns remain in force. Paper Jam and Window Wipe batch same-frame actions into a single display snapshot. Keep Ups locates the latest eligible body frame without copying and reversing the input history.

Open a game with `?gameDebug` before the hash, for example `/?gameDebug#/camera/six-hoops`. Cyan points and segments are the normalized input delivered to the game. Yellow outlines show modeled targets in games with spatial targets. The overlay shows the interval between diagnostic renders, age of the latest normalized observation and short-lived score changes. The race uses torso rise and distance crossings. Its track and jump cue show the obstacle timing.

## Validation and limits

The automated scenarios use deterministic normalized events, synthetic video pixels, synthetic pose landmarks, keyboard or pointer input as appropriate. The browser exercises the public navigation, ready gate, actual game view, recovery and results. On the shared goal, an ideal synthetic defender observing its sector every 40 ms cleared the four-player team goal in **12 of 12** trials across four seeds and levels 1, 4 and 8, making **188 saves**. The other three defenders earned zero individual points in every trial. Six Hoops simulations at expert pressure check reachable serve positions for one through four players, four-ball occupancy, and a final difference of at most one serve per lane.

Physical movement-to-display latency includes exposure, camera buffering, tracking, rendering and display scanout. Browser timings below cover only their described software paths. A physical webcam session with children and adults, including four people standing side by side, is still needed to assess comfort, occlusion, reach and perceived fairness. The ideal keeper's completion rate measures deterministic reachability and scoring isolation. Human completion rates will differ.

### Measurement method

- The camera processing check warms up for 20 frames, then times 160 synthetic RGBA frames at the production processing resolution of 160 × 90 with all four lanes enabled. It includes frame differencing, exposure compensation, denoising, region mapping and event generation. It excludes frame acquisition and pose inference.
- The four-player Chromium probe changes pixels in a 320 × 240 canvas camera, then observes the first nonzero ghost charge and samples 120 animation intervals with diagnostics enabled. Its timing measures new pixels to observable game state. A static mock pose detector isolates the motion-mask path.
- The results test uses a virtual clock to finish Paper Dojo, repeat readiness, verify score reset and return to the catalog on one camera request. Virtual time is excluded from performance measurements.
- The public-route checks use Chromium on this machine. Performance depends on load, browser, capture rate, camera and pose inference. A sustained 60 FPS across typical desktops, physical motion latency, speaker timing and multiplayer comfort remain unverified.

### Results from the original eleven-game overhaul

| Check | Result |
|---|---|
| Full Vitest suite | 1,257 passed in 107 files, including historical game models, multiplayer mapping, pause/reconnect, tournament flow, capped progression and replay. |
| Chromium | All 46 targeted browser scenarios passed across the final runs on build e9634fc0a9958c259428. Two cases needed fixture corrections and separate reruns. The Six Hoops pilot now aims toward the nearer basket, and the Window Wipe test isolates its motion-mask input from pose initialization. |
| Packaging | 17 packaging tests passed. TypeScript, ESLint, production build, release budgets and release checksum verification passed. |
| Software motion processor | Four lanes at 160 × 90, 160 timed frames. Median 2.80 ms, p95 12.15 ms during the full test run. |
| Four-player Ghost Catcher, single Chromium worker | 120 animation intervals, 60.4 FPS mean and 17.7 ms p95 frame interval. First changed camera patch to observable ghost charge was 36.5 ms in this run. |
| Same synthetic timing scenario during concurrent tests | 33.8 FPS, 54.2 ms p95 frame interval and 74.6 ms to first charge. These short samples show substantial sensitivity to machine load. |
| Goalkeeper scoring isolation | Four match seeds at each of three levels. All 12 scripted defenders advanced; all 36 idle competitors finished with zero. |

The camera sampler reuses its canvas and includes processing cost in the polling period. At low processing cost it targets a 33 ms sampling interval and accepts fresh decoded frames only. It leaves additional rendering time when processing is expensive. Ghost Catcher and UFO Juggler publish contact feedback as soon as the input batch resolves. The debug overlay also displays recent game events including touches, saves, misses and bumps.

For reproduction, run `npm test` and `npm run build`. Use `npm run test:e2e -- arcade-levels arcade-timing --workers=1` for the level flow and timing probe. The game-specific Chromium scenarios cover much more than menu launch, including synthetic saves, basket ownership, steady rubbing, overheating, physical-object contacts, keyboard fallbacks and camera recovery. The visual audit visits each catalog entry separately.

## Historical Marble Mountain validation (replaced by Marble Bowling)

Players steer and brake throughout a descent, choosing a route at each fork. Each lane uses the same seeded sequence. A shoulder slope inside ±0.045 produces neutral steering. A further 0.33 reaches full steering. The adapter corrects for camera aspect ratio and suppresses ambiguous lane observations. The model rejects observations older than 250 ms. If input stops, steering returns to braking after 300 ms and the lane cannot score while untracked.

Across four seeds at each of levels 1, 4 and 8, two simulated players aimed independently using shoulder landmarks at 20 Hz. One rang all 172 bells, the other passed all 172 gates, and both idle lanes scored zero across the 12 runs. Separate tests cover wall rebounds, the bank bonus, duplicate samples, irregular drawing intervals, pause, and replay resets.

The one- and four-player Chromium scenarios open the game through the catalog, use synthetic shoulder landmarks, score, pause, and advance to level 2 on one retained stream. A third browser scenario verifies keyboard braking and replay after a missed goal. One four-lane run sampled 90 real animation intervals at **58.7 FPS**, with an **18.7 ms** p95 interval. The first synthetic steering observation took **47.9 ms** to produce an observable position change greater than 0.001 lane widths. This measures the browser path from mock detector output through rendered game state. Camera capture, real pose inference, display scanout and human reaction time require separate measurement.

The full Vitest run passed 1,267 tests in 108 files. The production build, release integrity and all 17 packaging tests passed. The new movement clip is generated locally and weighs 5,595 bytes. The already hidden Tower Builder prototype stays available in development and is omitted from the production bundle to fit the existing offline size limits. Four-person shoulder visibility, comfortable steering angles and perceived braking still need a physical playtest.

## Multiplayer and Paper Jam follow-up (before Paper Jam retired)

The [multiplayer review](GAMEPLAY_AUDIT.md#multiplayer-formats-across-the-twelve-public-games) records the choice of playfield for each public game. Ready checks still use one identified spot per person. A sports game can consume a measured full-court hand or body segment with the original player ID, including a hand reaching into a teammate’s area.

- **Paper Jam** starts with two solo speakers, or one instrument per person in a band. The cue on the instrument changes from **Get ready** to **HIT!** for the full scoring window. An opening good hit is worth 10, so four good hits qualify. Number keys and pointer/touch score on press. Duplicate input cannot score the same note twice. The new looping introduction demonstrates the cue and the swat.
- **Net Rally** assigns front and back positions in doubles and rotates short and deep serves. The three-player net sits at one-third court width. Five touched crossings complete that cooperative match. A floor drop starts the next serve, and each crossing credits its sender once. Singles retain the middle net.
- **Goalkeeper** combines the posts and centre into one goal. Opening kick windups stagger by 300 ms. Teammates can cover each other, and a save credits the closest eligible measured contact. The team’s goal allowance scales with player count. One struggling keeper can continue taking part.
- **Window Wipe** has one coverage mask, three ink spots and one completion event per pane. Everyone can finish a shared ink spot. The score awards new coverage once and divides the completion top-up among contributors. A completed pane earns 180 points across the crew.

Competitive games use the highest individual score for arcade qualification. Cooperative formats use the sum of contributions, with separate local record keys. Tournament totals retain individual contributions. The already-hidden Fish Frenzy prototype remains available in development and is omitted from the public bundle to meet the existing JavaScript budget.

All 1,268 unit tests and 17 packaging tests passed. Fifteen Chromium scenarios passed on the production build, covering Paper Jam timing, mirrored input, one- through four-player sports, shared cleaning, camera-free play, and a five-game tournament. The production build and release integrity checks passed. These runs used synthetic input. Physical webcam latency, comfortable reach in a crowded room, and whether beginners find the opening Paper Jam cue easy to follow still need an in-person playtest.

## Shadow Snap

The former wrist-angle check let players complete pictures with their bodies in the wrong place. A cardboard wall now shows the camera only through full-body openings. The local pose tracker supplies a small mirrored occupancy mask for each person. A neck identifies the player, and their whole mask counts even across another player's lane. Red ink shows spill. Each player sees their spill and empty space percentages as they move. [Captured solo photo using a simulated camera](docs/gameplay-review/shadow-snap-fit.webp)

A photo requires every player to fit at the same time for 340 ms, with fresh samples at most 300 ms apart. The tutorial allows 34% of the body outside and 39% of the opening empty, tightening to 27% and 32% at expert. Each forearm needs at least 24% coverage so dropping both arms doesn't pass a raised-arm pose. The group has 6.4 seconds plus 350 ms per additional person, decreasing by up to 1.8 seconds across levels.

Each successful photo earns 20 points per person plus two for each preceding consecutive capture, up to ten extra. On capture or prompt timeout, each person's score is reduced separately by round(12 × max(0, spill fraction − 0.10)) and round(12 × max(0, empty fraction − 0.15)). These charges happen once per picture. Missing or ambiguous tracking earns no credit or deduction. Results show the total for each deduction and the last three illustrated poses. All segmentation runs locally and the album contains drawings.

The deterministic four-person simulation cleared the team goal in 12 of 12 seeded rounds at levels 1, 4 and 8. It uses synthetic silhouettes and checks ownership, missing observations, duplicated samples, pose timing and scoring isolation. Physical-camera testing is still needed to tune the tolerances for clothing, different body shapes, room size and overlapping players.

A local scoring benchmark on Apple silicon using Node 20.15.1 measured four 171 × 96 masks together. After 100 warm-up iterations, 1,000 batches took 0.26 ms at the median and 0.48 ms at the 95th percentile. The measurement covers only fit scoring. Camera capture, model inference and display latency are separate. Chromium also exercised solo and four-player captures, keyboard replay, and the actual camera and cardboard colors inside and outside a solo cutout. The local pose model completed blank-frame inference offline with segmentation enabled.

## Collection-wide evidence

The full review includes earlier game models as well as the public catalog. The two-player and solo Chromium passes each exercised 45 implementations through play, results and replay. The twelve public games and thirty development games have separate five-stage model coverage. The two additional original components and retired rhythm game also have progression and input checks. The initial full-collection run exposed legacy ready dialogs that stayed paused on release. The verified runs include those fixes.

Detailed title-specific changes, timing measurements, scoring rules and known limits are in [the issue register](GAMEPLAY_ISSUES.md) and [the progress report](GAMEPLAY_PROGRESS.md). The reports distinguish synthetic webcam input, controller events, keyboard play and brief render-cadence measurements. The physical-device and family-play observations remain open.

The final build passed 1,443 unit tests, 17 packaging tests and release integrity checks. The final collection browser run passed all 65 scenarios. Both offline scenarios passed. Net Rally's solo robot now leaves enough space for the ball at the net, and each restart feeds the human player. A previously trapped rally cleared in 790 ms at three aspect ratios.
