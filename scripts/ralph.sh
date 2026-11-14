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
  echo 'Working tree has uncommitted changes. Commit/stash them first to avoid mixing tasks.' >&2
  exit 2
fi

next_task() {
  python3 - <<'PY'
import json
from pathlib import Path
items=json.loads(Path('tasks/backlog.json').read_text())
status={x['id']:x['status'] for x in items}
for x in items:
    if x['status']=='pending' and all(status.get(d)=='done' for d in x['depends_on']):
        print(x['id']+'|'+x['title']); break
PY
}
check_status() {
  python3 - "$1" <<'PY'
import sys,json
from pathlib import Path
items=json.loads(Path('tasks/backlog.json').read_text())
match=[x for x in items if x['id']==sys.argv[1]]
print(match[0]['status'] if len(match)==1 else 'unknown')
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
  task="$(next_task)"
  if [[ -z "$task" ]]; then
    echo 'No eligible pending tasks. Done or blocked; inspect tasks/backlog.json.'
    break
  fi
  id="${task%%|*}"
  title="${task#*|}"
  echo "==== $id: $title ===="
  successful=false
  for ((attempt=1; attempt<=MAX_RETRIES; attempt++)); do
    echo "Attempt $attempt/$MAX_RETRIES"
    log="logs/${id}_attempt${attempt}_$(date +%Y%m%d_%H%M%S).log"
    prompt="Read SPEC.md, AGENTS.md, tasks/backlog.json and tasks/progress.md. Implement ONLY task ${id}: ${title}. Read the complete task dependency chain. If repairing a prior failure, fix the current implementation, do not start another task. Add appropriate automated tests. Mark task ${id} done only after actually running relevant tests successfully; otherwise leave pending and state issues. Update tasks/progress.md truthfully. Do not commit, deploy, request external services, alter other tasks, skip the existing task acceptance expectations, or claim physical webcam validation."
    # Workspace-limited permissions; never --yolo or danger-full-access.
    if codex exec --sandbox workspace-write --cd "$PWD" "$prompt" 2>&1 | tee "$log"; then
      echo 'Codex invocation finished.'
    else
      echo 'Codex invocation failed; retrying if possible.' >&2
    fi
    # Verify outside the agent; never trust a self-reported success alone.
    if [[ "$(check_status "$id")" == 'done' ]] && verify 2>&1 | tee -a "$log"; then
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
    echo "Task $id not verified, or Codex has not marked it done." >&2
    if [[ "$(check_status "$id")" == 'blocked' ]]; then
      echo 'Agent marked task blocked; stopping for review.' >&2
      exit 1
    fi
  done
  if [[ "$successful" != 'true' ]]; then
    echo "STOP: $id failed after $MAX_RETRIES attempts. Inspect logs and task status; no automatic rollback." >&2
    exit 1
  fi
done
