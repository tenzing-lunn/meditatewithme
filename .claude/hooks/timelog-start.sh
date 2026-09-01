#!/usr/bin/env bash
# Stamp the moment a Claude session opens in this repo.
# Paired with timelog-end.sh. See TIMELOG.md for why this only ever records
# wall-clock, never engaged time.
set -uo pipefail
payload=$(cat)
id=$(printf '%s' "$payload" | jq -r '.session_id // "unknown"' 2>/dev/null || echo unknown)
dir="$(git rev-parse --show-toplevel 2>/dev/null)/.timelog/sessions"
mkdir -p "$dir"
date +%s > "$dir/$id"
exit 0
