# UFO Juggler

An original spin-and-rescue game over the live mirrored camera. The initial suggestion described bouncing saucers; research corrected that: the [Sony EyeToy: Play manual](https://db.hfsplay.fr/files/2019/12/02/EyeToy_-_Play_USA_XomAEr4.pdf) describes spinning UFOs to propel them upward, and the [published movement analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC4290029/) describes spinning them so they elevate and escape. These are written references; no claim of watching or reproducing a gameplay video. The implementation uses original drawings, sounds and rules, without the original game's enemy ship or characters.

## Rules and feedback

Wave over a saucer in short bursts to build engine spin. Above 0.38 spin it rises; neglect it and it sinks. The marked safe band, needle and WAVE / COAST labels show when to act or rest. Excess spin builds heat: the pilot looks worried, the ship shakes and smokes, then its engine sputters and cools for one second. Cooling is visible; input cannot bypass it.

Reach the marked orbit line to rescue the pilot for 50 points, with a consecutive rescue bonus capped at 40. Catch a sinking ship below the danger height and restore lift for a one-time 10-point close-save bonus. A crash costs one of three lives and breaks the rescue streak. Each lane is independent; eliminated players stop spawning/scoring. All players eliminated ends early. Otherwise the round lasts 40 active seconds.

New ships arrive every 6.2 seconds initially, 4.8 seconds after 12 seconds, then 3.6 seconds after 25 seconds. After 12 seconds, arrivals come in pairs. At most two ships per player early, then three, with distinct horizontal slots. All players receive the same spawning schedule. No difficulty/setup choices added.

Original art includes glass domes, green pilots, rotating rim lights, crayon metal hatching, thruster plumes, orbit markings and landing pads. Spin, launch, overheat, crash and close-save sounds are locally synthesized; consecutive-rescue fanfares rise in pitch. Launches rise out of view with a point label; crashes disperse into paper pieces. Reduced-motion disables decorative rocking, spinning, smoke travel, launch acceleration and fragment travel; essential ship motion and textual feedback remain.

## Integration and privacy

Seventh public catalog game, with original icon and generated three-second stick-figure tutorial. Existing three-second hand-ready hold and countdown, player count retained once per tab, shared pause/reconnect/replay, and persistent camera remain. The tournament retains the existing five-game schedule; UFO Juggler is selectable separately. Seven camera-navigation cards use distinct positions without scrolling.

CameraSetup supplies normalized spatial motion-mask events. No pixel/media/pose library is imported by the minigame. Freshness, confidence, player ownership and coordinate validation occur in the model. Only latest-frame points count, and a timestamp can add energy once per player regardless of mask density or replayed samples. This is motion overlap, not finger recognition or a claim to classify clockwise hand circles. Pointer waving and arrows/Space are fallbacks.

Physics uses fixed 20 ms steps, including spawning, engine decay, heating and flight. Shared PauseClock clears input timing at interruptions. No new packages or external resources. Already-hidden Magic Duel and Fruit Slash remain available in source/development but their runtime implementations are omitted from production, preserving unchanged size budgets.

## Validation limits

Automated model tests cover managed launches, overheating, early loss, round cap, duplicate masks, stale/invalid events, mixed timestamps, pause/resume, cadence equivalence, one-time close saves, survivor isolation and four-player aspect ratios. Browser tests use synthetic canvas media. Physical arm comfort, lighting, multiplayer reach and speaker quality still require a real playtest.

Final verification: 13 UFO model tests and nine shared audio tests pass; App/catalog/tournament tests passed during integration. All three final UFO browser scenarios pass, including synthetic-camera overheat → controlled launch → paired arrivals. Catalog routes, narrow-screen camera navigation and the seven tutorial/readiness/countdown flows also pass. Flight, heat and multiplayer captures were visually reviewed. Build/typecheck, lint, release integrity and whitespace checks pass within unchanged budgets; artifact `35b3215630ce4ea79c08`.
