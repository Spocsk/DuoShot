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

The render container runs its own Next server on its loopback. The systemd unit
`duoshot-render-worker.service` (see `infra/systemd/`) starts
`scripts/run-render-worker.mjs` in it with `docker exec`; the worker calls
`http://127.0.0.1:3000/api/internal/render-worker` inside that same container,
so export rendering never competes with public traffic in `web` for memory or CPU.

## Deploy procedure

Run as root on the VPS. Pick the image built from the merged `main` commit.

```sh
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

# 4. Stop the worker, recreate render, start the worker.
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
journalctl -u duoshot-render-worker.service -n 20 --no-pager
```

Apply additive database migrations before step 4 when the release needs them.
Do not print `docker compose config` or `docker inspect` in full: they expose
the environment.

Rollback: restore the backed-up compose file (or set both tags back to the
previous sha) and repeat steps 4 to 6.
