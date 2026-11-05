#!/usr/bin/env bash
# Creates GitHub Issues from backlog/*.md (run once, from the repo root, after `gh auth login`).
# Each file: first line "# Title", a line "Labels: a, b", then the issue body.
set -euo pipefail
command -v gh >/dev/null || { echo "Install the GitHub CLI first: https://cli.github.com"; exit 1; }

declare -A COLORS=( [feature]=1f6feb [security]=d73a4a [design]=a2459b [chore]=8a8a8a [guidelines]=3c7d5a [P1]=b60205 [P2]=fbca04 [P3]=c2e0c6 )
for l in "${!COLORS[@]}"; do gh label create "$l" --color "${COLORS[$l]}" --force >/dev/null; done

for f in backlog/*.md; do
  title=$(head -n1 "$f" | sed 's/^# //')
  labels=$(grep -m1 '^Labels:' "$f" | sed 's/^Labels: *//; s/ *, */,/g')
  if gh issue list --state all --search "in:title \"$title\"" --json title -q '.[].title' | grep -Fxq "$title"; then
    echo "skip (exists): $title"; continue
  fi
  body=$(tail -n +2 "$f" | grep -v '^Labels:')
  gh issue create --title "$title" --label "$labels" --body "$body" >/dev/null && echo "created: $title"
done
