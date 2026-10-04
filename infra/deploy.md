# Production deploy on the VPS

Production runs only on the DuoShot VPS: Docker Compose behind Traefik, with
the self-hosted Supabase stack from `infra/supabase`. Vercel and Coolify are no
longer used to deploy. The `duoshot.vercel.app` host only redirects to
`https://duoshot.site` (see `next.config.ts`).

## Image

`.github/workflows/container.yml` builds `ghcr.io/spocsk/duoshot:<full sha>`
for each `main` commit whose CI run passed (or on manual dispatch). The
`NEXT_PUBLIC_*` values are baked in at build time from the repository variables.
Runtime secrets live only on the VPS in `/data/duoshot/app.env` (root-only); they
are never committed nor passed on a command line.

## Containers

The application compose project is `i9qtpe5bpyig86s1aljxr5gv`. Its
`docker-compose.yml` lives in the project directory backed up by
`infra/supabase/backup-offline.sh` (currently
`/data/coolify/services/i9qtpe5bpyig86s1aljxr5gv/`). It runs two services from
the **same image**:

| Service | Container | Role |
| --- | --- | --- |
| `web` | `web-i9qtpe5bpyig86s1aljxr5gv` | Public Next.js server, routed by Traefik, bound to `127.0.0.1:3000` on the host. |
| `render` | `render-i9qtpe5bpyig86s1aljxr5gv` | Durable render worker host. Not routed. |

The render service has this shape (the live compose file is the source of
truth; this is not a verbatim copy):

```yaml
  render:
    image: ghcr.io/spocsk/duoshot:<sha>          # always the same tag as web
    container_name: render-i9qtpe5bpyig86s1aljxr5gv
    env_file: /data/duoshot/app.env
    environment:
      HOSTNAME: 127.0.0.1                         # Next only listens inside the container
      PORT: "3000"
    labels:
      - traefik.enable=false
    mem_limit: 1280m
    cpus: 1.5
    pids_limit: 256
    healthcheck:                                  # GET /api/health inside the container
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
    networks:
      - supabase-private
      - i9qtpe5bpyig86s1aljxr5gv
```

The render container runs its own Next server on its loopback (for its health
check and the rollback route). The systemd unit `duoshot-render-worker.service`
(see `infra/systemd/`) starts `scripts/run-render-worker.mjs` in it with
`docker exec`. By default (`RENDER_WORKER_MODE=process`) that script runs the
standalone worker bundle `dist/render-worker.mjs` in its own Node process: it
claims jobs with the service-role key, heartbeats their leases and renders with
Sharp **outside any Next server**, so a heavy render can neither stall an HTTP
request nor outlive its timeout (`RENDER_JOB_TIMEOUT_MS`, default 15 minutes:
the job fails with `RENDER_INTERRUPTED`, its quota is refunded and the worker
restarts). Export rendering also never competes with public traffic in `web`
for memory or CPU. The image build runs `node dist/render-worker.mjs --check`,
so an image whose bundle cannot load Sharp is never published.

Rollback without recreating anything: put `RENDER_WORKER_MODE=http` in
`/etc/duoshot/compose.env` and `systemctl restart duoshot-render-worker.service`.
The script then polls `http://127.0.0.1:3000/api/internal/render-worker` inside
the render container as before (renders run in that container's Next server).
Remove the line and restart the unit to return to the standalone worker.

The systemd units in `infra/systemd/` and `nightly-backup.sh` find these
containers by their compose labels (`com.docker.compose.project` =
`DUOSHOT_COMPOSE_PROJECT`, default `i9qtpe5bpyig86s1aljxr5gv`, and
`com.docker.compose.service=web|render`), not by name, and refuse to act when
zero or several running containers match. Keep the service names `web` and
`render`; override the project in `/etc/duoshot/compose.env` if it changes.

**Run exactly one `web` container.** The API rate limits in
`src/lib/rate-limit.ts` keep their counters in that process's memory: with
several replicas each would count separately (multiplying the effective limit)
and a restart resets them. Scaling `web` out first needs a shared store
(Redis or PostgreSQL) for those counters.

### Secrets

`/data/duoshot/app.env` holds two distinct bearer secrets (32+ characters each,
e.g. `openssl rand -hex 32`); `node scripts/check-deployment-env.mjs` checks both:

| Variable | Used by |
| --- | --- |
| `CRON_SECRET` | `/api/cron/*`, called by `duoshot-maintenance@.service` |
| `RENDER_WORKER_SECRET` | `/api/internal/render-worker`, called by `duoshot-render-worker.service` |

While `RENDER_WORKER_SECRET` is unset, the worker route and script fall back to
`CRON_SECRET` and log `render_worker_secret_fallback`: set it, then recreate
**both** `render` and `web` so they read the same value. `/api/internal/*`
also answers 404 to anything that did not come straight from a container
loopback or the private Docker network (see `infra/systemd/README.md`).

## Deploy procedure

Run as root on the VPS. Pick the image built from the merged `main` commit.
Confirm the compose directory and the service names (`web`, `render`) against
the live file before the first run; step 3 prints the service names.

```bash
SHA=<full commit sha>                       # must have a green "Build VPS image" run
IMAGE=ghcr.io/spocsk/duoshot:$SHA
cd /data/coolify/services/i9qtpe5bpyig86s1aljxr5gv

# 1. Pull the image first, so nothing stops if the pull fails.
docker pull "$IMAGE"

# 2. Back up the compose file.
cp -p docker-compose.yml "docker-compose.yml.before-${SHA:0:7}-$(date -u +%Y%m%dT%H%M%SZ)"

# 3. Replace BOTH image tags (web and render) with $IMAGE, then validate.
#    Edit the two image: lines, then:
grep -n 'image: ghcr.io/spocsk/duoshot' docker-compose.yml   # both lines show $SHA
docker compose config --quiet
docker compose config --services                             # must list web and render

# 4. Stop the worker, recreate render, start the worker. The stop waits (up to
#    TimeoutStopSec=120) for the running job to finish or be given up.
systemctl stop duoshot-render-worker.service
docker compose up -d --no-deps --force-recreate --wait render
systemctl start duoshot-render-worker.service

# 5. Recreate web.
docker compose up -d --no-deps --force-recreate --wait web

# 6. Check health.
docker inspect -f '{{.State.Health.Status}}' render-i9qtpe5bpyig86s1aljxr5gv web-i9qtpe5bpyig86s1aljxr5gv
curl -fsS http://127.0.0.1:3000/api/health
curl -fsS https://duoshot.site/api/health
systemctl is-active duoshot-render-worker.service
journalctl -u duoshot-render-worker.service -n 20 --no-pager   # render_worker_mode { mode: 'process' }, render_worker_started
```

Apply additive database migrations before step 4 when the release needs them.
Do not print `docker compose config` or `docker inspect` in full: they expose
the environment.

Rollback: restore the backed-up compose file (or set both tags back to the
previous sha) and repeat steps 4 to 6.
