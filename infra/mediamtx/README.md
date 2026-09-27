# MediaMTX — the live video server

Collaborators publish here with a stream key; viewers read HLS from here. Keys
are checked by the site (`/api/live/auth`) against Supabase, and the server
tells the site who is live (`/api/live/hook`, via `hook.sh`). The design and
the reasons are in `plans/live-video.md`.

## Keys

```bash
npm run live:key -- new "Anna"      # prints her server address and key, once
npm run live:key -- list            # everyone, and who is live
npm run live:key -- revoke <slug>   # off the site at once; refused at next connect
```

## Run it on this Mac (how it was proven, 26 September 2026)

Needs `brew install mediamtx`, `npm run dev` on :3000, and in `.env.local`:
`LIVE_AUTH_SECRET`, `LIVE_HOOK_SECRET` (each `openssl rand -hex 32`),
`LIVE_HLS_BASE=http://localhost:8888`, `LIVE_INGEST_HOST=localhost`.

```bash
cd infra/mediamtx
set -a; . ../../.env.local; set +a
MTX_AUTHHTTPADDRESS="http://mtx:$LIVE_AUTH_SECRET@localhost:3000/api/live/auth" \
LIVE_HOOK_URL=http://localhost:3000/api/live/hook LIVE_SERVER_NAME=local \
mediamtx mediamtx.yml
```

Then publish (OBS: server `rtmp://localhost:1935/live`, stream key as printed)
and open `http://localhost:3000/live-test` (404 on the production site only).

## On a server

Built this way on 27 September 2026: `live-a`, a Hetzner CPX12 (1 vCPU, 2 GB,
Ubuntu 26.04) in Europe at `2.28.224.143`, hostname `2-28-224-143.sslip.io`.
The account and the server are made by a person.

1. **Ports** (`ufw`): 22/tcp, 80/tcp and 443/tcp (Caddy), 1936/tcp (RTMPS),
   8890/udp (SRT). Nothing else — plain RTMP on 1935 still listens but is not
   let in, so a key never crosses the internet in the clear over RTMP.
2. **A hostname** for the server, e.g. `live.meditatewithme.com`, or
   `<ip-with-dashes>.sslip.io` until the domain is pointed. The site is HTTPS,
   so HLS must be too.
3. **MediaMTX**, pinned: the `linux_amd64` release of v1.21.1 from
   github.com/bluenviron/mediamtx/releases into `/opt/mediamtx/`, with
   `mediamtx.yml` and `hook.sh` from this folder beside it. Set
   `authHTTPAddress` from the environment, not the file.
4. **Secrets** in `/etc/mediamtx.env` (mode 600, root):

   ```
   MTX_AUTHHTTPADDRESS=https://mtx:<LIVE_AUTH_SECRET>@<site>/api/live/auth
   LIVE_HOOK_URL=https://<site>/api/live/hook
   LIVE_HOOK_SECRET=<LIVE_HOOK_SECRET>
   LIVE_SERVER_NAME=a
   ```

5. **systemd**, `/etc/systemd/system/mediamtx.service`:

   ```ini
   [Unit]
   Description=MediaMTX
   After=network-online.target
   Wants=network-online.target

   [Service]
   WorkingDirectory=/opt/mediamtx
   EnvironmentFile=/etc/mediamtx.env
   ExecStart=/opt/mediamtx/mediamtx /opt/mediamtx/mediamtx.yml
   Restart=always
   RestartSec=2
   DynamicUser=yes

   [Install]
   WantedBy=multi-user.target
   ```

   The default `KillMode=control-group` takes `hook.sh` down with MediaMTX.
   `hook.sh` also checks for its parent every beat, because a hard kill of
   MediaMTX alone once left it reporting a dead stream as live.

   The secret in `MTX_AUTHHTTPADDRESS` reaches the route as Basic auth, not in
   the URL, so it stays out of Vercel's request logs.

6. **Caddy** for HTTPS on HLS, `/etc/caddy/Caddyfile`:

   ```
   <hostname> {
     reverse_proxy localhost:8888
   }
   ```

7. **RTMPS**, so keys don't cross the internet in the clear. MediaMTX
   (running as a `DynamicUser`) cannot read Caddy's certificates, which are
   private to the `caddy` user, so a root timer copies them daily into
   `/etc/mediamtx/tls/` (readable by the service) — on `live-a` that is
   `/usr/local/bin/mediamtx-certs` and `mediamtx-certs.timer`. **No restart**: MediaMTX
   watches the files and reloads them itself, and a restart would cut off
   whoever is live. Copy atomically — write to a temporary file, then `mv`
   the key first and the certificate second. Then, in `/etc/mediamtx.env`:

   ```
   MTX_RTMPENCRYPTION=optional
   MTX_RTMPSADDRESS=:1936
   MTX_RTMPSERVERCERT=/etc/mediamtx/tls/cert.pem
   MTX_RTMPSERVERKEY=/etc/mediamtx/tls/key.pem
   ```

   Collaborators use `rtmps://<hostname>:1936/live` — `npm run live:key`
   prints that for any host but localhost. **SRT stays unencrypted**: its
   key travels in the clear unless a passphrase is set, so over the internet
   RTMPS is the one to hand out.
8. **Vercel env** (for `dev` and production): `LIVE_AUTH_SECRET`,
   `LIVE_HOOK_SECRET`, `LIVE_HLS_BASE=https://<hostname>`, the same two
   secrets as `/etc/mediamtx.env`. Previews sit behind Vercel's login, so for
   `dev` the server points at `meditatewithme-git-dev-…vercel.app` and both of
   its URLs end in `?x-vercel-protection-bypass=<secret>` — the project's
   *Protection Bypass for Automation* (created 27 September 2026, note
   "live-a MediaMTX server"). Revoking it in Project Settings → Deployment
   Protection cuts the server off from `dev`. Production needs no bypass.
9. **Updates:** `unattended-upgrades` for the OS; MediaMTX only by changing
   the pinned version here and redeploying, after reading its changelog —
   HLS sessions regressed in several releases from 1.18 to 1.21.0, and
   1.21.1 (20 September 2026) is the first with the fix. Retest on an iPhone
   and in Chrome, with the publisher dropping for 10 and for 40 seconds,
   before any upgrade goes live.
10. **An uptime check** on `https://<hostname>/` that messages a person.
