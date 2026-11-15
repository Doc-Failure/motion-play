# Codex instructions — Motion Play

Read `SPEC.md` and inspect the current application before making changes.
`tasks/backlog.json` and `tasks/progress.md` are planning aids, not execution
locks: update, reorder, split, add, or complete tasks when that helps deliver the
user's requested outcome.

- Follow the user's current request and use sensible defaults. You may address
  related defects, consistency problems, and missing integration work in the
  same invocation when doing so produces a coherent, verified result.
- Work autonomously for as long as useful. Parallel agents are optional when
  available, but keep ownership clear and avoid overlapping edits.
- Preserve the architecture boundary: camera -> input events -> game. Minigames
  receive normalized input events and must not bind directly to camera/media
  libraries.
- Implement code with relevant tests. Run checks appropriate to the change and
  report failures honestly; never fabricate test or hardware results.
- Keep the childlike imperfect crayon identity consistent across the complete
  experience without sacrificing accessibility.
- Real-webcam behavior requires honest hardware validation. Synthetic tests are
  useful but must not be described as physical verification.
- Keep planning records truthful when they are relevant, but do not let stale
  task ordering prevent bug fixes, UI work, integration, or user-requested
  improvements.
- Commits are allowed when the user requests them or when an automation runner
  owns the workflow. Do not deploy or perform destructive/external mutations
  without explicit authorization.
- Keep dependencies concise, maintained, and justified. Never expose secrets,
  weaken privacy, add tracking, or upload camera data.
