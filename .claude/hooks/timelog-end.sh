#!/usr/bin/env bash
# Append one unconfirmed row per session to .timelog/pending.tsv.
#
# WALL-CLOCK IS NOT ENGAGED TIME. This records how long the session was open,
# which is an upper bound and usually a bad one — it counts you making coffee
# while an agent ran. Nothing here reaches TIMELOG.md until you confirm it with
# `npm run timelog`.
set -uo pipefail
payload=$(cat)
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
id=$(printf '%s' "$payload" | jq -r '.session_id // "unknown"' 2>/dev/null || echo unknown)
reason=$(printf '%s' "$payload" | jq -r '.session_end_reason // "other"' 2>/dev/null || echo other)
stamp="$root/.timelog/sessions/$id"
[ -f "$stamp" ] || exit 0
start=$(cat "$stamp"); end=$(date +%s)
[ "$start" -gt 0 ] 2>/dev/null || exit 0
mins=$(( (end - start) / 60 ))

# `date -r EPOCH` is BSD/macOS; `date -d @EPOCH` is GNU. This runs on whichever
# machine the session is open on, so try both rather than assuming.
fmt() { date -r "$1" +"$2" 2>/dev/null || date -d "@$1" +"$2" 2>/dev/null || echo "?"; }
commits=$(git -C "$root" log --since="@$start" --until="@$end" --pretty=%h 2>/dev/null | tr '\n' ' ' | sed 's/ $//')
printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
  "$(fmt "$start" %Y-%m-%d)" "$(fmt "$start" %H:%M)" "$(date +%H:%M)" \
  "$mins" "$reason" "${commits:--}" \
  >> "$root/.timelog/pending.tsv"
rm -f "$stamp"
exit 0
