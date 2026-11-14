# Motion Play — autonomous Codex starter kit

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
`MAX_TASKS` is not necessary: the positional argument limits successful tasks; each task gets at most `MAX_RETRIES` (default 3). The runner stops on failure, missing dependencies, or no eligible tasks. Use `CTRL-C` to stop. Task logs go in `logs/` and are ignored by Git. Commits require completed checks and task status evidence.

If no tasks remain eligible or all are done, the loop stops. For T25, Codex must split the 22 remaining games into small separate entries before proceeding. No auto-deploy, no `--yolo` or unrestricted filesystem access.

## Validation
The runner checks `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` once scripts exist. It additionally runs `npm run test:e2e` if present. Tests may fail until dependencies have been installed. Script refuses to commit failing changes; Codex still must update task status legitimately. **Green synthetic tests cannot certify gameplay with physical webcam**.

## Product milestones requiring human review
1. 2-player Bubble Battle running against actual Mac camera.
2. Four-player camera framing and independent scoring.
3. First ten games and hand/pose tracking.
4. Before public deployment.

## Security/limitations
Sandbox `workspace-write` still allows changes in the project. Review changes before running. Tasks may require dependency installation/network access and the sandbox may block that; allow targeted permissions manually rather than bypassing sandbox. Codex usage may incur costs. Script runs locally and does not upload camera footage.
