# Gameplay progress

## Resume

Read GAME_IMPROVEMENT_TRACKER.md and GAMEPLAY_ISSUES.md first. Inventory derives from src/app/catalog.ts, src/camera/CameraSetup.tsx and src/minigames. The catalog has 12 public titles. Jump Rush redirects to Kangaroo Race. Paper Jam is retired by request. Its source and two superseded components are included in the review without republishing them.

## Completed

- Shadow Snap now measures simultaneous full-body fits against cardboard openings. Separate spill and empty penalties apply once per photo. Chromium verified one- and four-player simulations, camera-free replay and sampled camera/wall pixels. Firefox and WebKit verified the solo photo path. Actual local model initialization and blank-frame inference also passed offline. GAMEPLAY_IMPROVEMENTS.md records the timing measurement and remaining hardware limitations.
- Chromium verified camera aspect changes after startup and retained the same stream across catalog and ready screen. The responsive ready-screen checks passed for Paper Dojo and Marble Mountain.

## Marble Bowling replacement

Marble Bowling occupies the former Marble Mountain catalog slot. Its new scoring key keeps historical downhill scores separate. The opening rack has three pins positioned for a straight strike, then the next rack shifts left or right. All players see the same layouts and have their own rolls and pins. Synthetic wrist input scored six points for a solo strike and six only for player four in a four-player round. Chromium also verified the old game link, pointer and keyboard rolls, the three-roll finish, replay and level advancement. Model tests cover partial racks, stale input, slower gestures, delayed frames, pause and last-second shots. Two seeds at each of levels 1, 2, 4, 6, 8 and 15 gave all four scripted players an achievable goal. A separate two-player Chromium walkthrough entered play, reached results and retried, with a 19 ms 95th-percentile frame interval in a 30-frame sample using a simulated camera and stubbed detector. Physical release comfort and aim still need a webcam playtest. [Four-player browser capture](docs/gameplay-review/marble-bowling.webp)

The final suite passed 1,448 unit tests. All nine bowling scenarios passed across Chromium, Firefox and WebKit. Chromium also passed the responsive intro and two-player collection checks. The production build, release-integrity check and lint passed. The full test run exposed a Kangaroo Race recovery view calling an unavailable media-query API in the test browser. That view now handles the missing API, and the shared stage test reflects its existing automatic running and gesture-controlled jumping.

## First collection pass

All 12 public titles reached gameplay, results and the replay button in the Chromium production visual audit. The development workshop now exercises the other catalog implementations without adding them to the public picker. The first full-collection run found an extra pause after readiness in some older games. Ten bespoke pause views now use the same ready-release bridge. The new synthetic wrist adapter drives Fruit Slash, Basketball Blitz and Magic Duel, and contact identity in the ball games now stays with the same anatomical limb when its partner leaves view. Original Punch Arena accepts bounded camera delivery latency. The original Goalkeeper expires stale keeper positions.

## Camera interactions

Identified left and right wrists now maintain separate swipe histories. Holding still preserves a usable starting position and small movements can accumulate across multiple samples. Synthetic Chromium input scored in Basketball Blitz, Simon Says, Plate Spinner, Magic Duel, Rocket Rumble and Silk Squad via the actual camera-to-game path. In Whack-a-Mole a moving patch in player two's portion of the captured frame earned 20 points while player one remained at zero. Ball-game tests also cover the surviving arm and wrist keeping their identity when another limb becomes occluded.

## Full-collection regression

All 45 implementations completed a solo Chromium pass and a separate two-player pass. Each run entered active play, captured the playfield, sampled 30 animation frames, reached results and replayed. Catalog and workshop routes used a simulated MediaStream. The three archived components ran in their own test harness. No uncaught page errors were recorded in those passes. The solo suite also verified a measured wrist shooting a basket for player two while stationary player one scored zero. The developer workshop is available from the local Vite server at `/#/workshop/<catalog-slug>`. Its routes are excluded from the production catalog.

The two runs observed 60–62 FPS and a maximum per-game 95th-percentile frame interval of 19 ms in these short headless Chromium samples. The pose detector was stubbed for this broad render test. It measures the browser rendering and synthetic video path, excluding the physical device and real-person inference. Per-title samples are in [cadence.json](docs/gameplay-review/cadence.json). Review sheets show all 45 playfields in catalog order. [Games 1–15](docs/gameplay-review/collection-1.webp) · [Games 16–30](docs/gameplay-review/collection-2.webp) · [Remaining games and original components](docs/gameplay-review/collection-3.webp).

The active-input checks for the 30 workshop titles earned enough points to open level two. Repeated Chromium checks of the six skill titles also passed through the actual camera input path. Separate model tests cover at least five settings per title. The public-game model sweep covers 60 cases across levels 1, 2, 4, 6 and 8, including flight time, collision timing, gravity, target coverage and shutter deadlines. The shared results test exercises five qualified transitions plus a missed goal for every available catalog entry. Public production visual tests verified all 12 games. Separate archived-input checks earned level two in the original goalkeeper, punch-pad and rhythm components. See [the issue register](GAMEPLAY_ISSUES.md) for title-specific changes.

The active public-game qualification checks included 810 points in Paper Dojo, 55 in Ghost Catcher, 50 in UFO Juggler, at least 55% coverage in Window Wipe, a 110-point knockout in Cardboard Champ and three obstacle clears in Kangaroo Race. In the four sports, Keep Ups earned 78 points, Six Hoops scored a basket, Goalkeeper recorded four saves and Net Rally beat the solo robot 5–0. Each of those games started level two with a fresh score. The Net Rally run uncovered a trapped ball that had left the human waiting over 40 seconds. The same starting position now clears in 790 ms at three aspect ratios.

### Final build and public regression

The final build passed typechecking, lint and release-integrity checks. Vitest passed 1,443 tests in 116 files and the packaging suite passed all 17. The release manifest for `88675398f24be409b77f` lists 510,657 JavaScript bytes, 159,607 CSS bytes and 2,867,901 core offline bytes, within the existing budgets.

The full Chromium production run had 116 passes, 57 skips and 14 failures. Twelve failures came from outdated route expectations. The other two covered keyboard focus on Window Wipe replay and a mobile navigation test selecting a retired catalog link. After correcting recovery and using the current menu paths, all 14 passed on rerun. Final-build checks covered 18 route assertions, Window Wipe keyboard scoring and focus, mobile camera navigation from catalog to tournament, and solo through four-player Net Rally. The development collection has a separate browser suite for titles hidden in production.

The final collection run passed all 65 Chromium scenarios in 3.1 minutes, including all 45 playable implementations, archived qualification, camera interactions and public level transitions. During integration two cases tried to reconnect to a test server that had closed. The workshop fixture now owns one local server for the lifetime of each worker. The final production Shadow Snap suite passed all three cases. Both offline scenarios passed, including local pose-model inference after reloading without network access.

### Reproduce

- Run `npm test` for model, input, UI and session regressions.
- Run `npm run build` followed by `npm run test:e2e` for public production routes.
- Run `npm run test:collection` for the development collection and archived components. Set `MP_REVIEW_PLAYERS=2` for a two-player layout pass and `MP_REVIEW_OUTPUT` to keep PNG and JSON evidence in a specific local directory.
- Run `npm run test:e2e:offline` for offline shell and model initialization, and `npm run check:release` to verify the release manifest and budgets.

### Remaining validation

Physical camera latency, fit tolerance across body types, four-person occlusion, and comfort over a family play session still need an observed hardware session. The automated passes do not establish those outcomes. Reopen the affected tracker cells after collecting that evidence.

UI follow-up: cream-colored neutral status backgrounds were changed to white
across game styles. Chromium checks covered tutorial cards and videos for
Marble Bowling, Shadow Snap and UFO Juggler, plus narrow Paper Dojo and Window
Wipe cues; this does not constitute a fresh gameplay or real-camera audit of
every game.
