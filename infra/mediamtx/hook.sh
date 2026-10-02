#!/bin/sh
# Tells the site a stream is live, for as long as it is.
#
# MediaMTX starts this when a stream at live/<slug> comes online and sends it
# SIGINT when the stream goes offline. It posts `online` once, `seen` every 30
# seconds, and `offline` on the way out. If the whole server dies, `offline`
# never comes — /api/live stops trusting a stream 90 seconds after its last
# `seen`, which is what the loop is for.
#
# Every post carries `since`, the moment this stream came online. It is what
# makes the posts safe to arrive out of order: `online` and `seen` just set it,
# and `offline` only clears the row if it still holds this same `since`. So
# when a collaborator reconnects and the old stream's `offline` lands after the
# new stream's `online`, the new stream stays live.
#
# If the site answers 410 — an admin shut this stream off, or its key was
# revoked — the stream is cut here, through MediaMTX's API on this machine
# only (mediamtx.yml), and the script waits for MediaMTX to say `offline`.
#
# Needs LIVE_HOOK_URL, LIVE_HOOK_SECRET and LIVE_SERVER_NAME in MediaMTX's
# environment; MediaMTX adds MTX_PATH.

since=$(date -u +%Y-%m-%dT%H:%M:%SZ)

post() {
  # The secret goes to curl on stdin, not in its arguments, so `ps` never
  # shows it. Prints the HTTP status, 000 if the site could not be reached.
  printf 'header = "Authorization: Bearer %s"\n' "$LIVE_HOOK_SECRET" |
    curl -sS -m 10 -X POST --config - -o /dev/null -w '%{http_code}' \
      -H 'Content-Type: application/json' \
      -d "{\"path\":\"$MTX_PATH\",\"state\":\"$1\",\"since\":\"$since\",\"server\":\"$LIVE_SERVER_NAME\"}" \
      "$LIVE_HOOK_URL" 2>/dev/null || true
}

# Cut whoever is publishing to this path: ask the API what the source is
# (`"source":{"type":"rtmpConn","id":"…"}`) and kick that connection.
kick() {
  src=$(curl -s -m 5 "http://127.0.0.1:9997/v3/paths/get/$MTX_PATH")
  type=$(printf '%s' "$src" | sed -n 's/.*"source":{"type":"\([A-Za-z]*\)","id":"\([^"]*\)".*/\1/p')
  id=$(printf '%s' "$src" | sed -n 's/.*"source":{"type":"\([A-Za-z]*\)","id":"\([^"]*\)".*/\2/p')
  case "$type" in
    rtmpConn) kind=rtmpconns ;;
    rtmpsConn) kind=rtmpsconns ;;
    srtConn) kind=srtconns ;;
    *) return ;;
  esac
  curl -s -m 5 -X POST "http://127.0.0.1:9997/v3/$kind/kick/$id" >/dev/null
}

trap 'post offline >/dev/null; exit 0' INT TERM

# If MediaMTX itself is killed outright, nobody sends SIGINT and this script
# would carry on saying `seen` for a server that no longer exists. So each
# beat first checks that the MediaMTX that started it is still there.
server=$PPID

status=$(post online)
while :; do
  if [ "$status" = 410 ]; then kick; fi
  sleep 30 &
  wait $!
  if ! kill -0 "$server" 2>/dev/null; then
    post offline >/dev/null
    exit 0
  fi
  status=$(post seen)
done
