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

field() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$payload" | jq -r ".$1 // empty" 2>/dev/null
  elif command -v node >/dev/null 2>&1; then
    printf '%s' "$payload" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const v=JSON.parse(s)['$1'];if(v!=null)process.stdout.write(String(v))}catch{}})" 2>/dev/null
  else
    printf '%s' "$payload" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1
  fi
}
id=$(field session_id); id=${id:-unknown}
reason=$(field reason); reason=${reason:-other}
stamp="$root/.timelog/sessions/$id"
[ -f "$stamp" ] || exit 0
start=$(cat "$stamp"); end=$(date +%s)
[ "$start" -gt 0 ] 2>/dev/null || exit 0
mins=$(( (end - start) / 60 ))

# `date -r EPOCH` is BSD/macOS; `date -d @EPOCH` is GNU. This runs on whichever
# machine the session is open on, so try both rather than assuming.
fmt() { date -r "$1" +"$2" 2>/dev/null || date -d "@$1" +"$2" 2>/dev/null || echo "?"; }
# --all: a commit made on another branch during the session still counts.
commits=$(git -C "$root" log --all --since="@$start" --until="@$end" --pretty=%h 2>/dev/null | tr '\n' ' ' | sed 's/ $//')

# A session opened and shut inside a minute with nothing committed is not a
# session; it is the window being opened. Don't clutter the file with it.
if [ "$mins" -ge 1 ] || [ -n "$commits" ]; then
  printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$(fmt "$start" %Y-%m-%d)" "$(fmt "$start" %H:%M)" "$(date +%H:%M)" \
    "$mins" "$reason" "${commits:--}" \
    >> "$root/.timelog/pending.tsv"
fi
rm -f "$stamp"
exit 0
