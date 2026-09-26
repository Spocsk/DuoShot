# Supabase on the dedicated CX23

Base: official `supabase/supabase`, tag `self-hosted/v0.8.2`, commit
`564eab8ad7840b13324f68b1bfac074ef8d51c21`.
Copy its `docker/` directory to `/data/duoshot/supabase`, then copy
`compose.cx23.yml` alongside `docker-compose.yml` and run `prepare-private.sh`
with that directory. The script refuses to replace existing credentials.

The default stack runs PostgreSQL, Auth, PostgREST, Storage and Envoy.
Studio/Meta are optional (`--profile admin`); Realtime, Edge Functions,
image transformations and the connection pooler are not used by DuoShot.
The API is bound to **127.0.0.1:8000**; PostgreSQL has no published port.
Signup is disabled until SMTP, OAuth and migration checks are complete.
No source production data is imported by this preparation.

Passwords, JWT signing keys and API keys are generated on the host in a
root-only `.env`. Do not print `docker compose config`, `docker inspect`,
or the official `run.sh secrets` into logs; these can reveal credentials.
Use `docker compose config --quiet` for validation.

Start/check with `docker compose up -d --wait`, `docker compose ps`, and
`docker stats --no-stream`. Limits are an initial memory budget, not a
capacity guarantee. Verify RSS/OOM counts and representative load before
DNS cutover. Never run `down -v` on a populated installation.

Before opening production: configure the final HTTPS API hostname,
SMTP/Google OAuth, attach the resource to Coolify, migrate database/auth
and Storage separately, verify RLS/private buckets, install encrypted
off-host backups, and test a restore. Back up both PostgreSQL and the
Storage directory; the database alone does not contain image files.

Official references:
- https://supabase.com/docs/guides/self-hosting/docker
- https://supabase.com/docs/guides/self-hosting/restore-from-platform
- https://supabase.com/docs/guides/self-hosting/migrate/storage
