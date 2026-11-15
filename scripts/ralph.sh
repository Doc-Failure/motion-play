#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "$0")/.."

LIMIT="${1:-1}"
MAX_RETRIES="${MAX_RETRIES:-3}"
[[ "$LIMIT" =~ ^[0-9]+$ ]] && [[ "$LIMIT" -ge 1 ]] || { echo 'Usage: scripts/ralph.sh [positive-task-count]' >&2; exit 2; }
[[ "$MAX_RETRIES" =~ ^[0-9]+$ ]] && [[ "$MAX_RETRIES" -ge 1 ]] || { echo 'MAX_RETRIES must be positive' >&2; exit 2; }
command -v codex >/dev/null || { echo 'Install and log in to Codex CLI first.' >&2; exit 2; }
command -v python3 >/dev/null || { echo 'Python 3 required.' >&2; exit 2; }
command -v git >/dev/null || { echo 'Git required.' >&2; exit 2; }
mkdir -p logs

if [[ ! -d .git ]]; then
  git init -q
  git add AGENTS.md SPEC.md BOOTSTRAP_PROMPT.md README.md .gitignore tasks scripts
  git -c user.name='Motion Play Bootstrap' -c user.email='bootstrap@localhost' commit -qm 'chore: add Motion Play specification and autonomous workflow' || {
    echo 'Unable to make initial commit: configure Git and retry.' >&2; exit 1;
  }
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo 'Working tree has existing changes; Ralph will preserve and verify them with the next iteration.'
fi

next_focus() {
  python3 - <<'PY'
import json
from pathlib import Path
items=json.loads(Path('tasks/backlog.json').read_text())
for x in items:
    if x['status']=='pending':
        print(x['id']+'|'+x['title']); break
PY
}
verify() {
  if [[ ! -f package.json ]]; then
    echo 'No package.json; task not verifiable.' >&2
    return 1
  fi
  python3 - <<'PY'
import json,subprocess,sys
from pathlib import Path
pkg=json.loads(Path('package.json').read_text())
scripts=pkg.get('scripts',{})
required=('typecheck','lint','test','build')
missing=[s for s in required if s not in scripts]
if missing:
    print('Missing verification scripts:', ', '.join(missing),file=sys.stderr);sys.exit(1)
for name in [*required, 'test:e2e']:
    if name not in scripts: continue
    print('VERIFY npm run '+name,flush=True)
    result=subprocess.run(['npm','run',name],check=False)
    if result.returncode:
        print('FAILED:',name,file=sys.stderr);sys.exit(result.returncode)
PY
}

success_count=0
while (( success_count < LIMIT )); do
  task="$(next_focus)"
  if [[ -z "$task" ]]; then
    echo 'No pending backlog focus remains. Add a new objective or continue interactively.'
    break
  fi
  id="${task%%|*}"
  title="${task#*|}"
  echo "==== $id: $title ===="
  successful=false
  for ((attempt=1; attempt<=MAX_RETRIES; attempt++)); do
    echo "Attempt $attempt/$MAX_RETRIES"
    log="logs/${id}_attempt${attempt}_$(date +%Y%m%d_%H%M%S).log"
    prompt="Read SPEC.md and AGENTS.md, inspect the current application, and autonomously advance Motion Play. Suggested backlog focus: ${id}: ${title}. Treat the backlog as a planning aid, not a lock: prioritize current defects, coherent integration, UI consistency, and the user's latest intent; update planning records truthfully. Add relevant tests and run appropriate checks. Do not deploy or claim physical webcam validation without real human hardware testing."
    # Workspace-limited permissions; never --yolo or danger-full-access.
    if codex exec --sandbox workspace-write --cd "$PWD" "$prompt" 2>&1 | tee "$log"; then
      echo 'Codex invocation finished.'
    else
      echo 'Codex invocation failed; retrying if possible.' >&2
    fi
    # Verify outside the agent; never trust a self-reported success alone.
    if verify 2>&1 | tee -a "$log"; then
      git add -A
      if git diff --cached --quiet; then
        echo 'No changes to commit; stop to avoid false completion.' >&2; exit 1
      fi
      git commit -m "feat: complete ${id}" || { echo 'Commit failed'; exit 1; }
      successful=true
      success_count=$((success_count+1))
      echo "Verified and committed $id ($success_count/$LIMIT)"
      break
    fi
    echo "Iteration for $id did not pass verification." >&2
  done
  if [[ "$successful" != 'true' ]]; then
    echo "STOP: $id failed after $MAX_RETRIES attempts. Inspect logs and task status; no automatic rollback." >&2
    exit 1
  fi
done
