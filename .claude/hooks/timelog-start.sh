#!/usr/bin/env bash
# Stamp the moment a Claude Code session opens in this repo.
# Paired with timelog-end.sh. See TIMELOG.md for why this only ever records
# wall-clock, never engaged time.
#
# SessionStart also fires on /compact, /clear and --resume. Only the first
# start of a session may write the stamp — overwriting it on compaction would
# throw away everything before the compaction, and long sessions compact.
set -uo pipefail
payload=$(cat)
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
dir="$root/.timelog/sessions"
mkdir -p "$dir"

# jq if present, node otherwise (this is a Node project), sed as a last resort.
field() {
  if command -v jq >/dev/null 2>&1; then
    printf '%s' "$payload" | jq -r ".$1 // empty" 2>/dev/null
  elif command -v node >/dev/null 2>&1; then
    printf '%s' "$payload" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const v=JSON.parse(s)['$1'];if(v!=null)process.stdout.write(String(v))}catch{}})" 2>/dev/null
  else
    printf '%s' "$payload" | sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1
  fi
}
id=$(field session_id); id=${id:-unknown-$$}
now=$(date +%s)

# Orphans: a stamp older than 12h whose session never closed (crash, killed
# terminal). Record it as `unclosed` so the time is not silently lost; the
# confirm script shows these separately and you log them by hand.
for f in "$dir"/*; do
  [ -f "$f" ] || continue
  [ "$(basename "$f")" = "$id" ] && continue
  s=$(cat "$f" 2>/dev/null); [ "$s" -gt 0 ] 2>/dev/null || continue
  if [ $(( now - s )) -gt 43200 ]; then
    fmt() { date -r "$1" +"$2" 2>/dev/null || date -d "@$1" +"$2" 2>/dev/null || echo "?"; }
    commits=$(git -C "$root" log --all --since="@$s" --until="@$(( s + 43200 ))" --pretty=%h 2>/dev/null | tr '\n' ' ' | sed 's/ $//')
    printf '%s\t%s\t%s\t%s\t%s\t%s\n' "$(fmt "$s" %Y-%m-%d)" "$(fmt "$s" %H:%M)" "?" 0 unclosed "${commits:--}" >> "$root/.timelog/pending.tsv"
    rm -f "$f"
  fi
done

# First start wins. compact/resume/clear must not move it.
[ -f "$dir/$id" ] || echo "$now" > "$dir/$id"
exit 0
