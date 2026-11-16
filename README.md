# Motion Play

A client-only motion-controlled party game, built with React, TypeScript, Vite,
and Phaser. Gameplay and camera features are being delivered incrementally from
the editable planning backlog in `tasks/backlog.json`.

## Local development

Requires Node.js 20 or newer.

```bash
npm install
npm run dev
```

## Checks

```bash
npm run typecheck
npm run lint
npm run test
npm run test:packaging
npm run build
npm run check:release
npm run test:e2e
npm run test:e2e:offline
npm run test:e2e:cross-browser
```

The browser tests run the production build with mocked local media streams and
deterministic synthetic motion fixtures. Run `npm run build` first and install
browser engines once with `npx playwright install chromium firefox webkit`.
The default browser regression uses Chromium; the cross-browser command also
runs Firefox and WebKit. The separate offline test needs a loopback static server.
Run browser commands sequentially after a successful build.
These checks do not perform or claim physical camera validation.

The [release checklist](docs/RELEASE-CHECKLIST.md) describes packaging, privacy,
offline updates, performance measurements and outstanding human review gates.
The build creates a static `dist/` artifact with a complete offline asset list,
bundled licenses and a checksum/size report. No deployment is performed.

## Autonomous runner

Files: `SPEC.md` product/game/style requirements; `AGENTS.md` agent rules; `tasks/backlog.json` prioritized tasks; `BOOTSTRAP_PROMPT.md` initial guidance; `scripts/ralph.sh` bounded iterative runner.

## Mac prerequisites
- Node.js 20+ and npm, Git, Python 3, and an up-to-date Codex CLI installed and authenticated (`codex login`).
- Work in a new folder or Git repository. Read the spec before running unattended code.
- Current Codex noninteractive CLI supports `codex exec --sandbox workspace-write`; old `--full-auto` is deprecated.

## Run
From the folder containing these files:
```bash
chmod +x scripts/ralph.sh
./scripts/ralph.sh 1      # first task, inspect changes
./scripts/ralph.sh 5      # up to five more tasks
```
`MAX_TASKS` is not necessary: the positional argument limits successful iterations; each iteration gets at most `MAX_RETRIES` (default 3). The runner stops on failed verification or when no pending planning focus remains. Use `CTRL-C` to stop. Task logs go in `logs/` and are ignored by Git. Existing working-tree changes are preserved, verified, and included in the next successful runner commit.

The backlog supplies a suggested focus rather than locking the agent to a task or dependency order. Codex may repair defects, align UI, update planning, and complete related integration work in the same iteration. No auto-deploy, no `--yolo`, and no fabricated hardware-validation claims.

## Validation
The runner checks `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` once scripts exist. It additionally runs `npm run test:e2e` if present. Tests may fail until dependencies have been installed. The script refuses to commit failing changes. **Green synthetic tests cannot certify gameplay with physical webcam**.

## Product milestones requiring human review
1. 2-player Bubble Battle running against actual Mac camera.
2. Four-player camera framing and independent scoring.
3. First ten games and hand/pose tracking.
4. Before public deployment.

## Security/limitations
Sandbox `workspace-write` still allows changes in the project. Review changes before running. Tasks may require dependency installation/network access and the sandbox may block that; allow targeted permissions manually rather than bypassing sandbox. Codex usage may incur costs. Script runs locally and does not upload camera footage.
