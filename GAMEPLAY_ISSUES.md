# Gameplay issues

| Priority | Game or system | How to reproduce | Status and evidence |
|---|---|---|---|
| High | Marble Mountain | Beginners had to discover shoulder steering, braking and two different fork rewards before seeing a successful play. | Replaced by Marble Bowling. The tutorial demonstrates a single upward sweep, the ball travels along that aim and the pins visibly fall. |
| High | Shadow Snap | Stand away from the original pose thumbnail and match just the wrist angles. | Fixed. The same full-body openings now drive masking and scoring. See tests/ShadowSnap.test.ts and tests/e2e/shadow-snap.spec.ts. |
| High | Camera sizing | Start with a square camera stream, then switch its intrinsic resolution to wide during the Net Rally ready screen. | Fixed. tests/e2e/camera-lobby.spec.ts verifies retained stream, centering and aligned targets. |
| High | Legacy input | Observe a gesture captured before a render but delivered afterward. Inspect whether the model rejects ordinary camera samples as stale. | Fixed for the affected action games. Their tests cover capture-time grading and old-frame rejection. |
| Medium | Legacy progression | Open an older component directly and finish a round. Many use a single difficulty and never offer another level. | Fixed. Each development title now has staged goals in the workshop. All 30 advanced from level one in active-input browser checks. |
| High | Legacy ready gate | Finish the ready hold in Graffiti Race, Fish Frenzy or Plate Spinner. The ready prompt disappears and the game stays paused asking players to ready up. | Fixed. The two-player and solo collection passes reached results and replayed all 45 implementations. |
| High | Fruit Slash, Basketball Blitz, Magic Duel | Move a tracked wrist at swipe speed. The previous camera branch always passed an empty event array. | A per-wrist swipe detector now uses measured landmarks and clears its history when a wrist disappears. |
| High | Keep Ups, Six Hoops, Net Rally, Goalkeeper | Raise both hands, then occlude one. A surviving limb could inherit its partner's sample ID and an artificial displacement. | Fixed in the normalized input adapter. tests/PoseSwipes.test.ts exercises occlusion. |
| Medium | Workshop introductions | Enter a swipe, dodge or cleaning title without a dedicated video. Its instructions previously played the Bubble Battle popping demonstration. | Development intros now illustrate the movement used by that title and honor reduced motion. The public catalog keeps its game-specific clips. |

## Target and collection games

| Game | Fixed problem and design change | Chromium level-one score | Four-player model p95 (ms) |
|---|---|---:|---:|
| bubble-battle | Bubbles initially appeared below the viewport and a render stall could drop seven coincident targets. Start on-screen with a safe bubble, give all lanes a shared hazard schedule, alternate consecutive hazards with bubbles and allow one fresh wave after stalls. Rising speed and bubble radius scale with pressure. | 290 | 0.0235 |
| whack-a-mole | Repeating a random hole let a player farm the same spot. Avoid consecutive repeats, ignore samples captured before a mole appeared or before resume, and shorten reveal and respawn timings independently. | 310 | 0.0068 |
| meteor-smash | Sparse frames scheduled meteors in the future and delayed hits used the render-time position. Place catch-up waves on the elapsed timeline and resolve fresh hits at capture time. Descent and inter-wave intervals scale independently. | 260 | 0.0229 |
| fruit-slash | The model rejected a swipe delivered even 1 ms after the latest render. Grade fresh swipes up to 200 ms late against fruit at capture time, waiting for an identified wrist or an explicit pointer swipe. Flight duration and throw interval tighten together. | 280 | 0.005 |
| pinata-party | Each new piñata appeared at the exact same spot. Shift the next target to a reachable new place after a break, with larger offsets and shorter respawn delay at higher stages. Retain the three-hit rhythm and cooperative candy goal. | 120 | 0.0056 |
| monster-defense | All monsters marched straight at one speed. Preserve the three warning lanes, introduce a readable sine path at higher stages and use that same path to grade hits. Gate travel time and wave spacing scale by stage. | 140 | 0.0067 |
| balloon-panic | A teammate could turn a valid balloon into a penalty in the middle of another player’s swing. Store calls per lane, offer a valid balloon when missing, place different colors in separate reachable locations and tune reveal cadence. | 290 | 0.0059 |
| fruit-catcher | An abandoned basket kept catching indefinitely. Each fresh observed position now catches at most one fruit. Hide a stale basket after 300 ms. Schedule falling fruit in elapsed time and scale fall time separately from arrival rate. | 250 | 0.0275 |
| gold-rush | A sparse render created coins with future birthdays. Resolve waves on elapsed time and accept hits at capture-time coin positions. Reduce fall duration and spawn interval through higher stages. | 230 | 0.0272 |
| fish-frenzy | Players could receive unequal fish values from the same wave. Share each wave’s species across all lanes with independent placements. Introduce curved swimming at higher stages and use matching capture-time collision geometry. | 180 | 0.0223 |
| supermarket-rush | A fixed-height conveyor and uniform timing rewarded camping. Separate grocery paths vertically as pressure increases, and adjust conveyor speed and item spacing independently. Each lane still receives the same sequence. | 150 | 0.0065 |
| star-collector | The same six points repeated indefinitely. Alternate horizontally mirrored constellations each pass. Shorten star lifetime and increase spawn frequency through levels. | 220 | 0.0039 |
| treasure-grab | All rounds reused the same arrangement. Later rounds can rotate the whole treasure map, preserving authored clearance between curses and neighboring treasures. expose a seeded RNG for reproducing the orientation. Increase arrival rate and shorten lifetimes. | 150 | 0.0054 |

The scores come from an active-input Chromium run. Model timings are the 95th percentile of 12,000 four-player update, input and snapshot samples per game at expert difficulty after warm-up.

## Movement and creative games

| Game | Reproduction and fix |
|---|---|
| Dodgeball | A fixed sequence lets a player park at one edge. Subsequent throws aim at each lane’s previously observed marker with a visible flight path. Level pressure shortens flight from 1.80 to 1.35 seconds and the cycle from 2.40 to 1.75 seconds. A sample delivered one render frame late is usable until its measured freshness expires. |
| Laser Escape | Sweeping from .15 to .85 with .12 contact tolerance left only 3% of the lane at either edge. The laser now leaves an alternating safe pocket at least 12.5% wide in expert play, and announces which side is safe. Warning and sweep times fall gradually. |
| Dance Challenge | The four-cue loop repeated verbatim and 18% directional travel was awkward for smaller players. Open at 15%, shorten the action window gradually, and rotate the sequence each phrase. Eligible near-current captures retain their input anchor. |
| Freeze! | The threshold for joining a cue also penalized tiny motion during stillness. Use separate activity thresholds [.015 join, .028 break] and keep the visible hold bar synchronized with its level-specific 1.2–1.5 second requirement. |
| Jump Rush | The original hurdles repeated one timing demand forever. The workshop version progresses from a 1.80 to 1.45 second approach with a 650 to 575 ms hop. The same hop curve controls clearance and the kangaroo animation. |
| Paint Splash | Quick motions skipped patches between detected positions, and malformed samples could advance time. Join nearby consecutive same-hand stamps, cap the gap and distance, reject invalid samples and scale the brush radius across levels. Arrow keys and space operate the brush from the focused canvas. |
| Car Wash | Single touches cleaned every stain. Advanced cars now have up to five marked stubborn patches that need a moving second scrub. The lighter loosened state shows where the second pass is needed. The scored brush and trace use the same size. |
| Pizza Maker | Every ticket used two toppings and always waited 900 ms between orders. Upper levels add three-topping supreme tickets at a capped frequency and reduce the serving wait to 600 ms. |
| Graffiti Race | Fast swipes left unpainted gaps, even when crossing the correct patch. Swept strokes now recover those patches while long tracking gaps and distant contacts stay separate. The trace and reveal use the same per-level radius. |
| Tower Builder | Modest jitter restarted a stable hold and a straight vertical column offered no variety. Beginning holds tolerate .047 movement, narrowing to .037. Upper floors introduce small alternating, reachable offsets. |
| Air Pong | A motionless phantom paddle scored indefinitely, serves took roughly five seconds to reach it, and frame-rate variation changed rebounds. The first serve approaches in 1.75 seconds with a changing angle. Collision at the actual wall-crossing time needs a fresh hand or active manual paddle. Missed tracking gives no score change. Ball acceleration is capped and fresh keyboard or pointer steering is supported. |

## Skill games

| Game | Reproduction and change |
|---|---|
| Basketball Blitz | Make repeated baskets from the same spot. The rim now moves after a make, the projected swipe still determines the shot, and a miss tells the player which way to adjust. |
| Simon Says | Let one participant miss the first pattern. Successful players can now progress when the response window ends, while a group with no completions repeats the cue. |
| Plate Spinner | Tap a nearly dropped plate. Last-second rescues now earn 15 points with a visible warning. Later stages vary decay by plate. |
| Magic Duel | Send correctly ordered stroke segments one frame after rendering. Fresh segments can complete the trace, and a broken stroke directs the player to dot one. Later stages include additional patterns. |
| Rocket Rumble | Leave a single rocket with no possible color partner. The launcher clears the stranded rocket and prepares a new rack after 420 ms. |
| Silk Squad | Give every player the same inputs and compare the armored bugs assigned to each seat. The mix and path now give equal scoring opportunities. New bugs reserve separate positions. |

## Historical components

Original Punch Arena rejected an otherwise correct swipe arriving after a render. It now accepts up to 180 ms of delivery delay while rejecting repeated strokes and pre-spawn hits. Original Goalkeeper previously let a stale position save later shots. A save now requires a recent observation near the crossing. Both components have capped challenge curves. Paper Jam stays outside the public catalog and the workshop picker. Its retained component and rhythm chart were exercised through the test harness.

Keyboard replay in guided Window Wipe exposed a shared focus issue. The exit control was hidden when ready released into countdown, so trying to focus it immediately had no effect. Recovery now retries that focus on the first playable frame if the player has not focused another control.

In solo Net Rally, replaying a ball near x = .54 and y = .66 kept it between the robot paddle and the net for over 40 seconds. The paddle now leaves a ball's diameter of clearance. Each solo restart serves to the human, so a robot dropping its own feed cannot award idle points. The captured position cleared in 790 ms at square, 4:3 and 16:9 aspect ratios. A simulated player then beat the robot 5–0 and started level two in Chromium.
