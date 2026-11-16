# Motion Play release review

Status on 2026-11-16: **not cleared for public release**. This is a local release
candidate and a repeatable review procedure. No deployment is authorized by this
checklist. Automated camera fixtures do not validate a physical webcam.

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
  application server, API, accounts, model downloads or credentials are needed.
  Serve over HTTPS in production; opening `index.html` with `file://` is unsupported.
  Subdirectory hosting is not certified by this build.
- `dist/release-report.json` records a deterministic release ID, per-file SHA-256,
  raw and gzip sizes and byte budgets. `npm run check:release` rejects changed,
  missing or extra files, a mismatched worker, external/missing HTML/CSS assets,
  source maps, common secret-file extensions and budget overruns. This is not a
  general-purpose secret scanner or dependency vulnerability audit.
- Current raw payload budgets: JavaScript 550,000 bytes, CSS 160,000 bytes, total
  3,000,000 bytes. Payload totals exclude the generated worker/report themselves.
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
- Opt-in installs the complete packaged asset list, including CSS images/fonts.
  Missing files reject installation. Only packaged GET assets enter the cache;
  arbitrary runtime responses are never stored. Each build has its own cache.
  An update waits for old app tabs to close before activation; first installation
  claims the page. Disabling caching unregisters this worker and removes only
  `motion-play-` caches. Browser storage eviction can still remove offline data.
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

## Outstanding human gates

| Gate | Required evidence | Current status |
| --- | --- | --- |
| Chromium production regression | Synthetic navigation, scoring, recovery, audio scheduling, layout | 48 passed / 37 intentional hidden-game skips on final artifact |
| Offline integration | Genuine worker, offline art/fonts/play and opt-out cleanup | Earlier scenario passed; final separate run blocked by loopback listen EPERM |
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
