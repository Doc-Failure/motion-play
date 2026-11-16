# Motion Play release review

Status on 2026-11-16: **not cleared for public release**. This is a local release
candidate and a repeatable review procedure. No deployment is authorized by this
checklist. Automated camera fixtures do not validate a physical webcam.

Latest local snapshot: `81a1e9d9edc2a9314e84`. All **891 unit/component tests**
and **12 packaging tests** pass, along with lint, typecheck, build and artifact
integrity. Current three-engine checks are blocked at browser launch; offline
integration is blocked by loopback permissions; dependency audit is blocked by
registry DNS. These are unresolved gates. Earlier successful focused diagnostic
and offline runs are historical evidence, not passes for this review.

The public selection is Bubble Battle, Window Wipe, Whack-a-Mole, Fruit Catcher
and Paper Dojo. Other implementations remain hidden. Fruit Catcher uses a
motion-center alternative, not an implemented hand-landmark tracker. Paper Dojo
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

## Packaging and offline behavior

- `npm run build` produces a static root-hosted `dist/` directory. No runtime
  application server, API, accounts, remote model downloads or credentials are needed.
  The optional body-tracking diagnostic reads its bundled model and WASM locally.
  Serve over HTTPS in production; opening `index.html` with `file://` is unsupported.
  Subdirectory hosting is not certified by this build.
- `dist/release-report.json` records a deterministic release ID, per-file SHA-256,
  raw and gzip sizes and byte budgets. `npm run check:release` rejects changed,
  missing or extra files, a mismatched worker, external/missing HTML/CSS assets,
  source maps, common secret-file extensions and budget overruns. This is not a
  general-purpose secret scanner or dependency vulnerability audit.
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
- Packaging also checks the install manifest: start/shortcut URLs must launch
  the root-hosted hash-route app, scope must be the hosting root, and icons,
  screenshots and shortcut icons must be local files included in the artifact.
  External URLs, absent artwork and malformed manifest collections fail the
  build and integrity check. This does not certify browser installation behavior.
- Current raw payload budgets: core JavaScript 550,000 bytes, CSS 160,000 bytes,
  core payload 3,000,000 bytes, optional pose assets 30,000,000 bytes and total
  33,000,000 bytes. The separate pose allowance was introduced by the concurrent
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
  Root/index navigations use the app shell; other packaged documents retain
  their own HTML. The diagnostic iframe must load `pose/tracker.html` and its
  separate privacy policy. Unknown document paths are left to the host.
  Missing files reject installation. Only packaged GET assets enter the cache;
  arbitrary runtime responses are never stored. Each build has its own cache.
  An update waits for old app tabs to close before activation; first installation
  claims the page. Disabling caching unregisters this worker and removes only
  `motion-play-` caches. Browser storage eviction can still remove offline data.
  If recaching fails because storage quota is exhausted, the worker still returns
  the successfully fetched online response. The Node harness covers this path.
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
  survives in-app navigation. Teardown stops owned tracks; a permission request
  resolving after cancellation also stops its returned tracks.
- Production HTML applies a CSP with `connect-src 'none'`, local scripts/fonts,
  local/data/blob images, local/blob media, no objects or form submission. Inline
  styles remain allowed for React positioning and crayon effects. Development
  retains Vite's normal HMR behavior; development is not a privacy release test.
- The optional diagnostic loads a separate local iframe with its own CSP allowing
  same-origin connections and WASM compilation. The main document's blocked POST
  probes do not certify this iframe. Review and test that opt-in runtime's requests
  separately before clearing the privacy gate; it does not feed game scoring.
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
not hardware latency or a 60 FPS certification. Current capture processes at
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

## Outstanding human gates

| Gate | Required evidence | Current status |
| --- | --- | --- |
| Chromium production regression | Synthetic navigation, scoring, recovery, audio scheduling, layout | Earlier full regression: 48 passed / 37 skips; later diagnostic integration: 9 focused passes. Current review blocked at launch by Mach-port permission denial |
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
