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
# Needs LIVE_HOOK_URL, LIVE_HOOK_SECRET and LIVE_SERVER_NAME in MediaMTX's
# environment; MediaMTX adds MTX_PATH.

since=$(date -u +%Y-%m-%dT%H:%M:%SZ)

post() {
  # The secret goes to curl on stdin, not in its arguments, so `ps` never
  # shows it.
  printf 'header = "Authorization: Bearer %s"\n' "$LIVE_HOOK_SECRET" |
    curl -fsS -m 10 -X POST --config - \
      -H 'Content-Type: application/json' \
      -d "{\"path\":\"$MTX_PATH\",\"state\":\"$1\",\"since\":\"$since\",\"server\":\"$LIVE_SERVER_NAME\"}" \
      "$LIVE_HOOK_URL" >/dev/null || true
}

trap 'post offline; exit 0' INT TERM

# If MediaMTX itself is killed outright, nobody sends SIGINT and this script
# would carry on saying `seen` for a server that no longer exists. So each
# beat first checks that the MediaMTX that started it is still there.
server=$PPID

post online
while :; do
  sleep 30 &
  wait $!
  if ! kill -0 "$server" 2>/dev/null; then
    post offline
    exit 0
  fi
  post seen
done
