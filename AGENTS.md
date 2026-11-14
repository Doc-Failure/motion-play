# Codex instructions — Motion Play
Read `SPEC.md` first. `tasks/backlog.json` is the ordered source for work. Read `tasks/progress.md` for context. Do NOT start a swarm.
- Implement **exactly one backlog task per invocation**. Choose the first `pending` task with all dependencies `done`; if none, report blocker rather than inventing work.
- Preserve separation: camera -> input events -> game; never bind minigames to raw camera/media libraries.
- Implement code + relevant tests. Run documented checks (when available) and fix failures; no fabricated test/hardware claims.
- No backend, Electron, cloud service, account, tracking, external image assets, or risky shell operations. No deployments or external mutations.
- Honor childlike imperfect crayon visual identity without sacrificing accessibility.
- For changes needing a real webcam, run synthetic tests and record `needs_hardware_validation`; NEVER set `hardware_verified` without a person testing.
- Update the selected task status to `done` **only when its automated acceptance conditions pass**; otherwise leave `pending` or set `blocked` with a reason. Update `tasks/progress.md` with concrete evidence and outstanding risks.
- Do not alter other task statuses, fabricate completed work, or change the acceptance criteria to make them pass. Do not commit; the outer runner commits verified changes.
- Keep dependencies concise and use maintained tools. Do not ask questions unless truly blocked; pick sensible defaults.
