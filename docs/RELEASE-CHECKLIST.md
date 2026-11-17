# Motion Play release review

Status on 2026-11-16: **not cleared for public release**. This is a local release
candidate and a repeatable review procedure. No deployment is authorized by this
checklist. Automated camera fixtures do not validate a physical webcam.

T26 navigation lifecycle review snapshot: `ea99847d338919e993de`.
**934 unit/component tests in 80 files** and **17 packaging tests** passed,
plus typecheck, lint and production build/integrity. All byte budgets pass:
2,651,787 core bytes plus 28,456,010 pose bytes, 31,107,797 total.

Earlier Chromium evidence remains **56 permanent passes / 39 intentional
hidden-game skips** on a preceding build. This review's six baseline privacy
scenarios and three new lifecycle scenarios failed at engine launch; both offline
scenarios were blocked by loopback permissions, and dependency audit by registry
DNS. No fresh browser, inference, visual or performance pass is claimed.
Cross-browser, offline, security audit and human release gates remain open.

The public selection is Rocket Rumble, Paper Dojo, Bubble Battle, Window Wipe
and Whack-a-Mole. Other implementations remain hidden. Rocket Rumble uses
normalized motion hits for matching rockets and triggering fireworks. Paper Dojo
avoidance uses observed movement areas, not full-body pose recognition.

## Reproduce the automated review

Use Node 20+ and the committed lockfile. Run commands sequentially; do not rebuild
`dist` or run another Playwright invocation while browser checks read that folder
or write `test-results`.

```sh
npm ci
npx playwright install chromium firefox webkit
npm run typecheck
npm run lint
npm run test
npm run test:packaging
npm run build
npm run check:release
npm run test:e2e
npm run test:e2e:offline
npm run test:e2e:cross-browser
npm audit
```

`test:e2e` remains the Chromium regression. The cross-browser command runs the
same scenarios in Chromium, Firefox and WebKit. WebKit automation is useful
engine coverage; it does not certify Safari's real camera, permissions or audio.
The separate offline test starts an ephemeral loopback-only static server and
needs permission to listen locally. Other browser tests serve built files through
Playwright routing. Never replace a browser launch failure with a claimed pass.
Hidden-game skips are intentional and do not certify those implementations.

If another local workflow needs to rebuild `dist`, make a separate copy immediately
after a successful build/integrity check, before any rebuild begins:

```sh
review_dir=$(mktemp -d /tmp/motion-play-review.XXXXXX)
cp -R dist/. "$review_dir/"
node --input-type=module - "$review_dir" <<'JS'
import { checkRelease } from './scripts/release.mjs'
console.log((await checkRelease(process.argv[2])).version)
JS
MOTION_PLAY_DIST="$review_dir" npm run test:e2e:cross-browser
MOTION_PLAY_DIST="$review_dir" npm run test:e2e:offline
```

All browser artifact readers, including the offline server and cadence report,
honor `MOTION_PLAY_DIST`; the default remains `dist`. Use a distinct Playwright
`--output` directory if another browser invocation is also running.

## Packaging and offline behavior

- `npm run build` produces a static root-hosted `dist/` directory. No runtime
  application server, API, accounts, remote model downloads or credentials are needed.
  The local body-tracking diagnostic reads its bundled model and WASM locally.
  Serve over HTTPS in production; opening `index.html` with `file://` is unsupported.
  Subdirectory hosting is not certified by this build.
- `dist/release-report.json` records a deterministic release ID, per-file SHA-256,
  raw and gzip sizes and byte budgets. `npm run check:release` rejects changed,
  missing or extra files, a mismatched worker, external/missing HTML/CSS assets,
  source maps, common secret-file extensions and budget overruns. This is not a
  general-purpose secret scanner or dependency vulnerability audit.
- Literal JavaScript imports, re-exports and dynamic imports must resolve to local
  packaged files, including imports in the optional pose runtime. Bare unresolved
  modules and external/data module URLs fail packaging and integrity checks.
  The existing TypeScript parser distinguishes code from comments/string contents.
  Computed runtime URLs still require explicit contracts such as the pose file list;
  this is not a complete analysis of JavaScript behavior. Quoted CSS `@import`
  dependencies and `url(...)` loads are checked too. Core `.js`, `.mjs` and `.cjs`
  files share the JavaScript budget.
- Packaging requires the complete canonical CSP from `config/privacy-policy.json`
  as the first head element, before resource loads. Vite uses the same source.
  A partial policy, a commented/template/body tag, or a policy inserted after a
  script fails packaging. This checks the generated HTML contract; it is not a
  general-purpose HTML sanitizer.
- Every packaged HTML document is checked. `pose/tracker.html` is required and
  must start with its exact separate policy from `config/privacy-policy.json`.
  Only that document receives the same-origin fetch/WASM exception; other HTML
  documents require the main app policy. Packaging and integrity checks both
  reject a missing, weakened, commented-out or late diagnostic policy.
- Both packaging and integrity checks require nonempty diagnostic entry/runtime,
  model, SIMD and non-SIMD WASM loaders/binaries, license, model card and provenance
  files. These JavaScript-loaded dependencies are not discoverable by HTML/CSS
  link checks. Regression coverage removes and empties each required file. This
  establishes bundle completeness, not model inference or browser compatibility.
- Packaging also checks the install manifest: start/shortcut URLs must launch
  the root-hosted hash-route app, scope must be the hosting root, and icons,
  screenshots and shortcut icons must be local files included in the artifact.
  External URLs, absent artwork and malformed manifest collections fail the
  build and integrity check. This does not certify browser installation behavior.
- Current raw payload budgets: core JavaScript 550,000 bytes, CSS 160,000 bytes,
  core payload 3,000,000 bytes, optional pose/hand assets 40,000,000 bytes and total
  43,000,000 bytes. The separate pose allowance was introduced by the concurrent
  diagnostic integration; its download/performance implications need review.
  Payload totals exclude the generated worker/report themselves.
  Gzip measurements describe individual files, not assumed server compression.
  Do not raise budgets without reviewing the regression.
- Bundled Short Stack and React/React DOM/Scheduler licenses are copied into
  `dist/licenses/`. Font and user-supplied artwork provenance remains documented
  in `src/assets/fonts/README.md` and `src/assets/home/README.md`. Verify permission
  to distribute the supplied artwork before a public release. Phaser remains a
  declared dependency but is not imported by the current production entry graph.
- Offline caching is off by default. There is no public settings/install flow in
  this refinement phase; the persisted legacy `offlineCaching` setting remains
  supported and is exercised by the offline browser test.
- Opt-in installs the core packaged assets, including CSS images/fonts. The
  optional `pose/` diagnostic is excluded from installation precaching. An earlier
  Chromium test covered caching its document/runtime after first use; full model
  inference offline and other engines remain unverified.
  A new genuine-offline regression initializes the bundled model on a blank canvas,
  confirms model/WASM cache entries, reloads offline and repeats inference. It is
  currently blocked before assertions by loopback permissions; blank input cannot
  validate human detection or physical webcam quality.
  Root/index navigations use the app shell; other packaged documents retain
  their own HTML. The diagnostic iframe must load `pose/tracker.html` and its
  separate privacy policy. Unknown document paths are left to the host.
  Missing files reject installation. Only packaged GET assets enter the cache;
  arbitrary runtime responses are never stored. Each build has its own cache.
  An update waits for old app tabs to close before activation; first installation
  claims the page. Disabling caching unregisters this worker and removes only
  `motion-play-` caches. Browser storage eviction can still remove offline data.
  If recaching fails because storage quota is exhausted, the worker still returns
  the successfully fetched online response. Cache open/read errors also fall back
  to the packaged asset's network URL; network failures still propagate. The Node
  harness covers these paths and preserves the packaged-GET-only boundary.
- Before a later authorized deployment, review host MIME types, HTTPS, compression,
  and cache headers. Use revalidation for HTML/worker/report and long-lived immutable
  caching only for hashed assets. Confirm manifest/icon delivery on the actual
  host. Hosting header behavior and install prompts have not been certified here.

## Privacy and lifecycle review

- Camera processing stays in the page: one video source, 160×90 RGBA processing
  frames, normalized player events, no camera-to-game media imports. Frames live
  in memory and are not stored in localStorage, IndexedDB, or offline caches.
- Camera requests specify `audio: false`. Home/catalog do not request the camera;
  entering a camera lobby or Quick Play follows a player action. A retained stream
  survives in-app navigation. Only the visible lobby/game video receives it;
  leaving that view pauses and detaches the video. Returning to the catalog/home
  unmounts game loops, audio scheduling and the diagnostic without stopping the
  retained stream. A late permission grant while outside a camera route remains
  detached until that route reopens. Seven component regressions cover these
  transitions across all five games; the browser Back scenario remains unverified
  after engine launch failures. Teardown stops owned tracks; a permission request
  resolving after cancellation also stops its returned tracks.
- Production HTML applies a CSP with `connect-src 'none'`, local scripts/fonts,
  local/data/blob images, local/blob media, no objects or form submission. Inline
  styles remain allowed for React positioning and crayon effects. Development
  retains Vite's normal HMR behavior; development is not a privacy release test.
- The diagnostic loads a separate local iframe with its own CSP allowing
  same-origin connections and WASM compilation. During the current test phase,
  tracking starts enabled after camera readiness; Hide wireframe disables it.
  Its roughly 28.5 MB local model/runtime can therefore load on entering a camera
  view, rather than requiring a separate diagnostic click. Home does not load it.
  The main document's blocked POST probes do not certify this iframe. Review its
  requests and performance separately; it does not feed game scoring.
- A separate release regression checks that the diagnostic can read local assets,
  rejects external GET/POST probes, and leaves the main document's local fetches
  blocked. A test route contains probes if enforcement regresses. This new case
  has not passed yet because all three engines failed to launch in this review.
  The diagnostic's `connect-src 'self'` permits same-origin fetches; do not claim
  its policy blocks same-origin POSTs like the main document does.
- The synthetic release scenario checks local GET requests, no microphone request,
  no default worker registration, storage keys and blocked same-origin/external
  POST probes. It does not inspect browser-vendor traffic or OS camera behavior.
- Local preferences use `motion-play:settings:v1`; achievements use
  `motion-play:achievements:v1`. Clearing site data resets progress/preferences.
  There is no analytics SDK, tracking endpoint or backend in the current source.

## Performance and accessibility review

The release scenario attaches `synthetic-four-player-frame-cadence.json` to its
Playwright result. It samples 90 animation-frame intervals during four-player
Paper Dojo with a 320×240 canvas camera. Median/p95 intervals are diagnostics,
not hardware latency or a 60 FPS certification. New reports also identify the
release, Playwright project, actual browser version and diagnostic runtime/status
so results are attributable to a build and show whether pose was loading/running.
These fields have not produced a fresh sample because engine launch is blocked.
The preceding review's Chromium sample
recorded 16.7 ms median and 17.5 ms p95 across 90 intervals at 1280×720; the JSON
is retained at `/tmp/motion-play-release-review/chromium-synthetic-four-player-frame-cadence.json`.
The user agent is Playwright's desktop emulation, not evidence of a physical
Windows device. Current capture processes at
most one new decoded frame per 50 ms timer plus processing time; adaptive FPS is
not implemented. Do not describe this as a measured 20–30 FPS hardware result.

Before public release, record device/OS/browser versions and repeat full rounds
for all five games with 1, 2, 3 and 4 real people. Record median/p95 render and
processing cadence, CPU/memory, observed input latency and thermal behavior.
Exercise long sessions, reconnects and navigation to detect growing memory or
extra capture streams. Review keyboard focus, visible controls at narrow/desktop
sizes and browser zoom, operating-system reduced motion, mute persistence,
readable text/contrast, and results/replay with users of different ages.

The keyboard skip link focuses the main content without changing the hash route.
Regression coverage checks both the catalog and an active synthetic camera game,
including stream continuity. This is partial keyboard coverage, not a completed
accessibility review.

Bubble Battle, Window Wipe and Whack-a-Mole now offer a stable keyboard focus
target per player. Arrows move a bounded cursor; Space/Enter emit normalized
hit/brush events through the existing game models. Only keyboard focus reveals
the cursor and control reminder. Countdown, pause, recovery and results block
keyboard actions. Their results headings receive focus, and replay returns focus
to Pause. Games already managing their own replay focus retain that behavior.
This closes a missing keyboard fallback, but does not clear the broader
accessibility/usability gate.

## Outstanding human gates

| Gate | Required evidence | Current status |
| --- | --- | --- |
| Chromium production regression | Synthetic navigation, scoring, recovery, audio scheduling, layout | Earlier build passed 56 permanent cases / 39 intentional hidden-game skips. Fresh privacy cases blocked at launch; current artifact unverified |
| Offline integration | Genuine worker, offline art/fonts/play and opt-out cleanup | Earlier scenario passed including diagnostic document/runtime; current run blocked by loopback listen EPERM |
| Firefox and WebKit | Same regression in engines that successfully launch | Open: attempted launches aborted before assertions in this environment |
| Safari on a Mac | Real permission flow, camera video, audio unlock, reconnect and tab recovery | Open |
| Physical camera | One/two/four people, lighting, occlusion, field of view, mirrored targets, no false awards | Open |
| Performance | Real-device cadence/latency and long-session measurements | Open; synthetic diagnostics only |
| Accessibility/usability | Keyboard, reduced motion, zoom/contrast, mute, different ages | Open; automated coverage is partial |
| Dependency security | Successful current `npm audit`, disposition of findings | Open: registry DNS lookup failed during this review |
| Public packaging | Artwork distribution rights, host headers/MIME, installation/update review | Open |
| Public release | Named human reviewer, date, evidence links, explicit deployment authorization | Open; no deployment performed |

For each human gate, append reviewer, date, exact environment, observations,
failures/fixes and evidence before changing its status. Keep
`needs_hardware_validation: true` and `hardware_verified: false` until real human
hardware testing has occurred.

## Latest local review (2026-11-16)

### Navigation cleanup with camera continuity

Found that a hash-route exit left hidden gameplay mounted, with its animation
loop and music still scheduled. The hidden lobby preview also retained the stream
during gameplay. Reproduced both defects in component regressions. Camera views
now attach the stream through one effect with pause/detach cleanup, and inactive
routes unmount gameplay and reset its flow. Camera ownership and retained player
count are preserved; returning opens setup without another permission request.
Late grants on an inactive route cannot attach a hidden preview.

Added seven component cases and a browser Back scenario traversing all five public
games, checking cancelled frame loops, silent audio scheduling, detached videos,
released diagnostic and one continuous camera request. The browser scenario is
not yet validated.

Full unit/component suite: **934 passed in 80 files**, with **17 packaging tests**,
typecheck, lint, build and artifact integrity passing. Snapshot
`ea99847d338919e993de` contains 39 payload files with unchanged passing budgets.
This is cleanup correctness and a size check, not a measured FPS improvement.

The six baseline privacy cases and the final three-engine lifecycle case failed
before assertions: Chromium Mach-port denial (1100), Firefox SIGABRT, WebKit
Abort trap 6. Both offline cases failed at loopback `listen EPERM`;
`npm audit --fetch-retries=0 --fetch-timeout=15000` failed registry DNS ENOTFOUND.
Logs/traces: `/tmp/motion-play-t26-baseline-browsers`,
`/tmp/motion-play-t26-lifecycle-browsers*`,
`/tmp/motion-play-t26-lifecycle-offline*`; unit/audit logs are
`/tmp/motion-play-t26-unit.log` and `/tmp/motion-play-t26-audit.log`.
No current browser, visual, inference, performance, dependency-security or
physical-webcam pass is claimed. T26 remains pending; no deployment, upload,
dependency change or commit.

### Module dependencies, stable artifacts and diagnostic release coverage

Closed two packaging gaps: `.mjs`/`.cjs` scripts bypassed the JavaScript budget,
and imported modules/styles could be absent or external while packaging passed.
Added three Node regression cases covering static/re-export/dynamic module loads,
CSS imports, comments/strings and script budgets. Both preparation and integrity
review enforce dependencies; no new package was added.

Added diagnostic iframe privacy probes, genuine offline blank-frame inference,
and attributable cadence metadata. All browser artifact reads now accept
`MOTION_PLAY_DIST` to review a stable copy while another workflow rebuilds `dist`.
The first shared build completed, but its integrity check lost a font file to a
concurrent rebuild; the first offline attempt likewise lost its report. Neither
is recorded as a passing shared-artifact check. An isolated Vite build and both
release preparation/integrity succeeded at `/tmp/motion-play-t26.LSWyHS`:
`444c112d6734d39a686b`, 39 files, 2,651,813 core bytes + 28,456,010 pose bytes =
31,107,823 total, with all budgets unchanged and passing. Source changes in the
concurrent camera-alignment workflow were preserved and are not attributed to
this packaging work.

Full unit/component runs passed first 922 cases, then 927 in 79 files including
the concurrent alignment tests. Seventeen packaging tests, typecheck, lint and
whitespace checks passed. Six three-engine privacy cases failed before assertions
(Chromium Mach-port permission denial 1100, Firefox SIGABRT, WebKit Abort trap 6).
Both offline cases using the isolated artifact failed at loopback `listen EPERM`.
`npm audit` failed registry DNS ENOTFOUND. Logs/traces are under
`/tmp/motion-play-t26-browsers-snapshot*` and
`/tmp/motion-play-t26-offline-snapshot*`. New browser cases remain unverified;
there is no fresh performance or physical-camera evidence. T26 stays pending.
No deployment, upload, dependency changes or commit.

### Public keyboard controls and results focus

Bubble Battle, Window Wipe and Whack-a-Mole lacked keyboard gameplay controls.
Added one focusable play area per player, arrow-key aiming and Space/Enter
hit/brush actions, with a visible cursor and keyboard-only control reminder.
The reminder spans the viewport rather than a narrow player lane. Integer cursor
steps clamp positions to [0,1]; browser modifier shortcuts pass through. Existing
normalized input, scoring, player isolation and camera boundaries are preserved.
Countdown, pause, recovery and results block keyboard movement/actions.

Results focus now moves to these games' headings, and replay returns it to Pause.
The shared handler only owns results/replay focus when a game attaches its results
ref. The first full test run caught nine conflicts with games owning replay focus;
scoped ownership fixed them, and full reruns passed.

Added **17 unit/component cases** and **three permanent browser scenarios** for
keyboard scoring in 1–4 player lanes, bounds, shortcut preservation, recovery and
focus. The final **922 tests in 78 files** also include the concurrent diagnostic
updates. **14 packaging tests**, lint, typecheck, build and integrity pass. Final
snapshot `4b98994e70ca1d43e808` has 39 payload files: 2,647,331 core bytes plus
28,456,010 pose bytes, 31,103,341 total. All existing byte budgets pass. These sizes
do not measure FPS.

Three focused Chromium keyboard cases passed before/after a responsive-help fix;
reviewed final 1280×720 and 390×844 screenshots under
`/tmp/motion-play-keyboard-final`. Camera-denied simulation is not a webcam test.
A subsequent full Chromium run passed **56 permanent cases / 39 intentional
hidden-game skips**, including camera recovery, all five public games, audio,
privacy and the synthetic cadence sample above. The runner reported 57 passes
because it also collected one concurrent temporary localhost diagnostic; that
harness has since been removed. The full run used `8368e7bd9de3759fa74e`; a later
diagnostic-provenance rebuild produced the final ID with identical core JS/CSS.

Earlier privacy-only and 12-case privacy/keyboard three-engine attempts failed at
engine launch: Chromium Mach-port permission denial (1100), Firefox SIGABRT and
WebKit Abort trap 6. Later Chromium successes supersede its launch failure; they
do not clear Firefox/WebKit. Offline integration failed loopback `listen EPERM`;
the dependency audit failed registry DNS ENOTFOUND. No cross-browser certification,
physical-webcam, hardware-performance or dependency-security pass is claimed.
T26 remains pending. No deployment, upload, dependency changes or commit.

### Cache storage recovery and diagnostic bundle completeness

Read SPEC.md/AGENTS.md and inspected navigation, camera/diagnostic lifecycle,
release policies, worker and browser fixtures. Fixed online play failing when an
installed worker cannot open or read Cache Storage. Added network recovery without
intercepting arbitrary runtime requests or masking genuine network failures.
Closed a packaging gap where removing the JavaScript-loaded model or WASM files
could still produce a passing artifact. Both packaging and integrity now require
the complete nonempty optional diagnostic bundle and its notices.

Passed **901 unit/component tests in 77 files**, **14 packaging tests**, lint,
typecheck, production build and artifact integrity. The two new packaging cases
exercise open/read failures and missing/empty diagnostic files. Snapshot
`d04e56e8c3872539696b` contains 39 payload files: 2,643,121 core bytes and
28,455,777 optional pose bytes, 31,098,898 total. All budgets pass. Payload ID
excludes the worker/report; worker integrity is checked separately.

The focused production privacy/cadence scenario failed before app assertions in
Chromium (Mach-port permission denial 1100), Firefox (SIGABRT) and WebKit
(Abort trap 6). Offline integration failed at loopback `listen EPERM`.
`npm audit --fetch-retries=0 --fetch-timeout=15000` failed registry DNS ENOTFOUND.
No fresh browser, visual, performance, dependency-security or physical-webcam
pass is claimed. Earlier Rocket Rumble and gameplay-wireframe focused browser
passes are recorded in tasks/progress.md; they do not clear these gates.
T26 stays pending. No deployment, upload or commit performed.

### Diagnostic policy packaging review

Inspected the application, diagnostic lifecycle/runtime, production policies,
worker routing and release/browser tests. Closed a release-check gap: the opt-in
iframe's CSP was present in source but not enforced by packaging. Both build and
integrity review now check every shipped HTML document and require the diagnostic
document. Two added regression tests cover missing/weakened/misplaced policies,
integrity checks, and confinement of the exception to that exact document.
Runtime permissions and the public UI are unchanged.

Passed **891 unit/component tests in 76 files**, **12 packaging tests**, lint,
typecheck, build and artifact integrity. Snapshot `81a1e9d9edc2a9314e84` contains
39 payload files: 2,623,498 core bytes and 28,455,625 optional pose bytes,
31,079,123 total. All budgets pass. No current cadence/latency measurements were
possible because the browser engines could not start.

Focused production privacy scenarios failed before application assertions in all
three engines: Chromium Mach-port permission denial (1100), Firefox SIGABRT,
WebKit Abort trap 6. The offline scenario failed at loopback `listen EPERM`.
`npm audit --fetch-retries=0 --fetch-timeout=15000` failed registry DNS ENOTFOUND.
No browser, dependency-security, performance or physical-camera pass is claimed
for this review. T26 remains pending; no deployment, upload or commit performed.

### Earlier local review

Reviewed the existing skip-link and canonical CSP changes and added recovery for
service-worker recache quota failures. Unit/component checks passed **884 tests
in 75 files**; all **8 packaging tests**, typecheck, lint, build and artifact
integrity passed. Payload ID `824cdc462ab1cb06de64` contains 28 files totaling
2,617,869 bytes; all byte budgets pass. The ID describes payload files; worker
integrity is checked separately against the current source template.

The current Chromium run was stopped after repeated browser startup failures:
24 failed, 2 interrupted, 60 not run. macOS denied Chromium Mach-port registration
(1100), before app assertions. Focused Firefox and WebKit release scenarios both
failed at launch (SIGABRT / Abort trap 6). The separate offline scenario failed
before assertions with loopback `listen EPERM`. No current browser, screenshot,
cadence or physical-camera pass is claimed. Dependency audit again failed with
registry DNS `ENOTFOUND`. T26 remains pending.

Concurrent MediaPipe dependency and `public/pose` additions appeared after these
checks. They were preserved and are outside this reviewed artifact; rebuild and
repeat validation after that integration is complete.

## Manifest packaging follow-up (2026-11-16)

Added manifest validation for root-hosted launch/scope, local install artwork,
screenshots and shortcuts. Regression cases reject external/credentialed URLs,
unpackaged launch paths, missing files and malformed collections. Both packaging
and integrity verification enforce the same checks.

Latest checks passed **891 unit/component tests in 76 files**, **9 packaging
tests**, lint, typecheck, build, artifact integrity and whitespace checks. An
intermediate full run had one failing diagnostic stale-frame test; its concurrent
fake-clock correction was present in the subsequent passing run. Initial vendor
lint and byte-budget failures were also resolved by the concurrent integration.

Built snapshot `860529c8bde09c27a1aa`: 38 payload files, 31,077,067 bytes total,
including 28,453,772 optional pose bytes and 2,623,295 core bytes. This snapshot
includes concurrent diagnostic changes, which were preserved. Passing byte
budgets does not certify that runtime's privacy, offline behavior or performance.
Further source changes require a fresh build and integrity check.

Focused Chromium/Firefox/WebKit privacy cases all failed before assertions at
engine launch (Mach-port permission denial / SIGABRT / Abort trap 6). No browser,
visual or physical-camera pass is claimed. Offline browser integration was not
rerun in this follow-up. Online `npm audit` failed registry DNS ENOTFOUND; an
offline audit's zero result is not current vulnerability evidence. T26 remains
pending. No deployment, upload, commit or physical webcam testing was performed.

## Offline document routing follow-up (2026-11-16)

Fixed a service-worker integration defect found by inspecting the current app:
all navigations, including the opt-in diagnostic iframe, previously received
`index.html`. The worker now rewrites only root/index navigations. Packaged
subdocuments load their own HTML; unknown paths pass through. Extended the Node
worker harness to check the iframe document, root query handling, unknown paths
and exclusion of optional pose assets from installation precaching. Extended the
genuine offline browser scenario to inspect the controlled iframe's title/runtime
before going offline; its static server now supplies module/WASM MIME types.
This scenario loads the runtime only, without inference or physical tracking.

Passed **891 unit/component tests in 76 files**, **9 packaging tests**, typecheck,
lint, production build and artifact integrity. Snapshot `6095513601c2d92fa116`
contains 39 payload files: 2,623,342 core bytes plus 28,455,471 optional pose bytes
(31,078,813 total). All budgets pass. The payload ID excludes the worker/report;
worker integrity is checked separately. Existing working-tree changes were preserved.

Three focused production privacy cases failed before assertions: Chromium Mach-port
permission denial (1100), Firefox SIGABRT and WebKit Abort trap 6. The updated
offline browser scenario could not start its loopback server (`listen EPERM`).
`npm audit --fetch-retries=0 --fetch-timeout=15000` failed registry DNS ENOTFOUND.
No new browser, visual, inference, dependency-security, performance or physical
webcam pass is claimed. T26 remains pending. No deployment, upload or commit.

## Silk Squad and ready-check follow-up (2026-11-16)

The current public five are Silk Squad, Rocket Rumble, Paper Dojo, Bubble Battle
and Window Wipe. Whack-a-Mole remains hidden. All rounds/replays now require a
simultaneous five-second ready hold, followed by the three-second countdown.
Ready buttons consume measured body wrists with keyboard/pointer alternatives.
Silk Squad additionally consumes actual normalized finger-pinch events. Its hand
model is bundled locally under public/pose; the optional asset allowance is now
40 MB (about 36.3 MB used), total allowance 43 MB. The 3 MB core allowance remains.
Hide wireframe retains gesture tracking required by this game. Raw frames stay
in memory and no minigame imports camera/media libraries. Earlier statements
that diagnostic landmarks never drive input are superseded for these two uses.

Automated tests use synthetic camera images and detector fixtures; a separate
case initializes the real local hand model on a blank image and verifies no
invented gestures. These checks do not validate physical hand recognition.
Before release, test open/pinch/reopen reliability, bot targeting, camera framing,
1–4-person hand ownership, five-second simultaneous holds, actual latency,
visibility recovery and audio on real devices. No physical hand test or public
deployment has been performed.

Latest local verification for the Silk Squad follow-up: 962 unit/component tests
pass across 84 files; six targeted Chromium cases pass (the three Silk Squad
scenarios repeated twice with one worker). Broader Chromium coverage recorded
60 passes and 42 hidden-game skips, plus a synthetic pinch failure subsequently
resolved by waiting for fresh observed open/reopen gestures in the fixture.
Additional repeats exposed a test-helper race at ready-overlay removal and
synthetic frame freshness problems; these were corrected. Parallel model-loading
runs are not a performance pass. Final artifact `16595f3ac055d305161b` passes
lint, typecheck, build, integrity and whitespace checks; 17 packaging tests pass.
It has 2,678,783 core bytes and 36,278,006 optional bytes (38,956,789 total).
Human and cross-browser release gates remain open. See tasks/progress.md for
failed attempts and final evidence. These results supersede earlier Chromium
launch restrictions only for this follow-up; they do not certify physical input.

Silk Squad's current control is arm movement, superseding the earlier pinch
integration. It requests pose tracking only; shoulder-relative elbow/arm-end
movement produces normalized arm events. The optional finger weights remain
packaged but are not requested by this game. Latest checks: 980 unit/component
passes, 38 focused follow-up passes and five targeted Chromium passes, including
no finger-weight request, ready holds, repeated arm-wave capture and stillness.
Artifact `02f5c98deb7150c13dc4` passes build/integrity and existing byte budgets.
Physical arm sensitivity, multi-person tracking and actual latency remain human
review requirements. See tasks/progress.md for the initial helper-timeout failure
and final test evidence. No deployment has occurred.

## Webcam navigation and tournament follow-up

Home/catalog can now request the camera through their explicit Enable action.
After permission, pose wrists drive website choices, player setup, in-game
controls, results and scrolling. The retained stream decodes only in the current
menu-preview/lobby/game video. Leaving gameplay stops its loops/audio while menu
pose input continues. This supersedes the older requirement that all videos and
pose runtimes be detached on returning to Home/catalog. First browser permission
and recovery from unavailable hardware still require the browser/native fallback.

The current five are Rocket Rumble, Paper Dojo, Bubble Battle, Window Wipe and
Whack-a-Mole. Silk Squad is explicitly deferred. The five-round tournament sums
actual competitive points; highest total wins, ties share the win. Score callbacks
for all five games and stale/duplicate completion guards are integrated.

Latest artifact `94a708a2337f551c4581`: 2,694,829 core bytes and 36,279,145 optional
bytes, 38,973,974 total. Existing budgets pass; no dependency or privacy-policy
changes. Physical menu accuracy, comfort, lighting, multi-person behavior and
actual performance remain open human gates. See tasks/progress.md for automated
results, initial test failures, corrections and current evidence. No deployment.

Automated coverage for this follow-up: 994 unit/component passes, followed by 11
focused navigation/tournament regressions; 17 packaging passes; four body-tracking
Chromium passes; and three final Chromium navigation/tournament/mobile passes on
the artifact above. These use synthetic camera/pose input and do not certify
physical usability. Lint, typecheck/build, integrity and whitespace checks pass.


Home simplification follow-up: only Game Catalog and 5-Game Tournament remain.
Legacy Quick Play links open Catalog. Artifact `a238e5785e80e2430775` supersedes
that above: 2,694,442 core bytes plus 36,279,145 optional = 38,973,587 total;
existing budgets pass. See the latest tasks/progress.md entry for scoped checks.


Paper Dojo cleanup: bamboo-breaking interludes/statistics and the visible Dojo
body diagnostic are removed. Local tracking remains for navigation/ready holds.
Artifact `08d4725dcb2cbe053b93`: 2,691,405 core plus 36,279,145 optional bytes =
38,970,550 total. Existing budgets pass. Focused unit/component coverage passes
91 cases; lint, typecheck/build and integrity pass. Browser evidence and physical
verification limits are recorded in the latest tasks/progress.md entry.

## Window Wipe rebuild

Successive soapy windows replace the original static-smudge board. Fresh spatial
brush samples reveal the live camera, three-pass ink spots add rubbing feedback,
and players independently clear panes while accumulating points across the full
60-second round. Procedural foam/squeegee/bubbles/sparkles and original local
washing synthesis/music need no external assets or new dependencies. Camera,
ready holds, webcam navigation, pause/recovery and tournament totals remain shared.

Final artifact `118db6a352b556bb76c1`: 2,706,613 core bytes plus 36,279,145 optional
= 38,985,758 total. JavaScript 521,873 and CSS 153,283 bytes satisfy existing
budgets. Lint, typecheck/build and integrity pass. Full unit/component coverage
passed 1,016 cases; six targeted Chromium integration cases passed before the
final reduced-motion drift correction, whose browser evidence is recorded in
tasks/progress.md. The build retains its >500 kB JavaScript chunk advisory.
Physical cleaning reach/sensitivity, multiplayer framing and perceived audio
quality remain human checks; synthetic tests are not hardware validation.
No deployment has occurred.

## Paper Jam rhythm follow-up

Paper Jam replaces Whack-a-Mole in the public five and fourth tournament round.
It uses original art/music and normalized motion hits with capture-time scoring,
shared readiness/recovery and a round-grid audio lookahead scheduler. The hidden
Whack implementation remains available for later refinement.

Artifact `6e7c82bcef76803eff93`: JavaScript 537,709, CSS 157,418, core 2,726,584
plus 36,279,145 optional bytes = 39,005,729 total. All existing budgets pass.
1,048 unit/component tests and six targeted Chromium cases pass, including the
complete revised tournament. Lint, typecheck/build, integrity and whitespace
checks pass. Reviewed desktop/four-player/narrow captures. Physical reach,
camera latency and perceived speaker/music timing remain human release gates.
No deployment has occurred. See tasks/progress.md for exact evidence/limitations.

## Physical camera menu follow-up

The preview/expanded-cursor website navigation is superseded. Home and Catalog
now overlay the full uncropped mirrored camera; all current choices fit inside
that rectangle on desktop and portrait screens without scrolling. Any tracked
wrist can select by holding on the actual button for three seconds. Stable wrist
identity, fresh-sample timing, scene guards and physical letterbox projection
replace the previous upper-body reach/lane mapping. Five-second readiness remains.
One stream/local processing/native fallback remain; there are no new assets,
dependencies, camera uploads or recordings.

Artifact `cc43e35237ab0dd42b64`: JavaScript 538,845, CSS 159,543, core 2,729,845
plus 36,279,145 optional bytes = 39,008,990 total. Existing budgets pass. Final
full unit suite: 1,056 passes; focused follow-up: 17 passes. Three Chromium cases
pass (full navigation, complete tournament, desktop/portrait containment); the
containment/navigation case passed again after final label/layout cleanup.
Lint, typecheck/build, integrity and whitespace checks pass. Physical pose/hold
reliability and reach remain human release gates. See tasks/progress.md for logs.
No deployment has occurred.

## Minimal introduction follow-up

Camera navigation now starts automatically, subject to native permission. Choose
players once on Home; retain that choice for the tab. Each of the five public
games, replays and tournament rounds shows its own small local stick-figure video,
five-second hand-ready buttons, then only the three-second countdown over the
camera. Gameplay HUD/diagnostics are hidden until play. Camera errors still offer
recovery; one stream is retained. Palm-center/wrist-fallback markers project into
the actual video rectangle. Paper Jam's normalized occupied-motion adapter no
longer drops rhythm hits to the generic debounce; comparison and remaining
differences are documented in [PAPER-JAM-AUDIT.md](PAPER-JAM-AUDIT.md).

Artifact `517397c1c7020fad54c6`: JavaScript 541,585; CSS 158,449; core 2,784,963;
optional pose 36,279,145; total 39,064,108 bytes in 45 payload files. Existing
budgets pass. Full unit run: 1,061 passes; subsequent focused run: 142 passes;
additional rhythm file: 29 passes. All 17 packaging checks pass. Twenty-one
unique targeted Chromium scenarios pass across runs; final all-five demo and
complete tournament/restart scenarios pass again on this artifact. Lint,
typecheck/build, integrity and whitespace pass. See tasks/progress.md for logs,
corrected fixture failures and limits. No fresh full cross-browser/offline run.
Real webcam/palm alignment, reach, multiplayer comfort and perceived audio timing
remain human release gates. No deployment or commit occurred.

## Three-second selection, stabilization and handwriting revision

All hand selections, including ready/replay/tournament starts, now use a shared
3,000 ms duration. The pointer and menu hit tests use the same stabilized measured
position, with camera-scaled tremor suppression and independent resettable hand
histories. Missing data cannot complete a hold. The original Motion Scribble
revision 02 family is active throughout the site, including contextual alternate
forms and real Regular/Bold weights. See SPEC.md for behavior details.

Artifact `2ea864c551ee2109feaa`: 51 files; JavaScript 542,813, CSS 159,825,
core 2,906,099, optional pose 36,279,145, total 39,185,244 bytes. Existing budgets
pass. Full unit suite: 1,069 cases in 93 files. All nine targeted Chromium cases
pass, including synthetic hand tremor, interrupted/replay readiness, the complete
tournament and font/layout checks. Lint/types/build/integrity/whitespace pass.
Physical camera steadiness, reach, perceived lag and human readability remain
human validation gates. No deployment/commit. See tasks/progress.md for evidence.

## Three-game public set after quality review

Rocket Rumble and Bubble Battle are hidden from catalog, direct public routes and
all tournament rounds. Their code/assets/model tests remain for later work. The
public catalog and tournament now use Paper Dojo, Window Wipe and Paper Jam;
labels and schedule share their count (three), preserving raw totals and restart.
Bare camera links default to Paper Dojo. Missing original-game options are tracked
in [EYETOY-PLAY-CATALOG.md](EYETOY-PLAY-CATALOG.md).

Artifact `b925fcec0c452d2a37a9`: JS 542,604; CSS 159,834; core 2,905,899;
optional pose 36,279,145; total 39,185,044 bytes. Existing budgets pass.
80 relevant unit/component checks and all eight targeted Chromium cases pass;
lint/types/build/integrity/whitespace pass. Full suites and physical webcam play
were not rerun. See tasks/progress.md for scope and evidence. No deployment/commit.

### 2026-11-17 Cardboard Champ review build

Artifact `9019530867f253e76159` adds original robot boxing to the four-game catalog
and tournament. 133 relevant unit/component checks pass; nine targeted Chromium
scenarios pass, with both boxing scenarios rerun after the final multiplayer
proportion adjustment. Build/types/lint and unchanged release budgets pass.
Synthetic camera-input scoring, stationary-hand rejection, replay/stream reuse,
reduced-motion four-player geometry, full tournament and menu flow verified.
Physical punch feel, reach/occlusion with 1–4 people and speaker playback remain
open hardware checks. See `docs/CARDBOARD-CHAMP.md`; this is not hardware approval.

### 2026-11-17 Keep Ups review build

Artifact `ae296928249eaac1948a` adds Keep Ups as the fifth public game/tournament
round. 109 relevant unit/component tests and all 11 targeted Chromium scenarios
pass; three football cases rerun after final arc/UI changes also pass. Reviewed
one-/four-player captures. Build/types/lint/release integrity and unchanged budgets
pass (JS 546,628; CSS 158,786; core 2,928,085; total 39,207,230 bytes).
Synthetic tests cover body contacts, scoring, loss of pose, fallback, retained
camera, replay and complete five-game tournament. Real camera comfort/occlusion,
1–4-person spacing, audio latency and speaker quality still require hardware
validation. See `docs/KEEP-UPS.md`; no release deployment or hardware approval.

### 2026-11-17 Keep Ups challenge revision

Artifact `8dd66c79c346545a65b6`: three lives, elimination/early finish, 30-second
cap, increasing speed and warned alternating gusts. 23 focused checks pass;
three final Keep Ups browser cases and the five-game tournament pass. Reviewed
life/wind feedback. Lint/types/build and unchanged budgets pass. Difficulty feel
and physical tracking remain hardware review items, not certified by these tests.
