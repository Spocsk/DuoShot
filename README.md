# DuoShot

Tes screenshots Duo, justes, en 3 minutes. Sans device.

Pipeline App Store **sans chassis** pour iPhone Duo : outer 5,4″, inner 7,6″, option 6,9″ (Indie/Studio). Preview sans compte, ZIP avec compte.

## Stack

- Next.js App Router + TypeScript + Tailwind
- `@supabase/ssr` (PKCE, cookies) — pas d’auth-helpers
- Sharp en route handlers **Node** (pas Edge)
- Uploads navigateur → Supabase Storage (jamais dans le body des route handlers)
- Stripe Checkout + Resend (mock si les secrets absents)

## Démarrage

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Quality gate : `npm test` (Vitest) puis, après `npm run build`, `npm run test:e2e` (Cypress). GitHub Actions lance les deux sur chaque PR.

Renseigne uniquement les **noms** de variables dans `.env.example`. Les secrets vont dans `.env.local` en local et dans `/data/duoshot/app.env` (root uniquement) sur le VPS — jamais dans git.

Analytics : Datafast, seul outil d’analytics, mesure les pages et parcours uniquement après accord. Configuration : [`docs/datafast.md`](docs/datafast.md). Événements, rapports et effacement des données Mixpanel historiques : [`docs/analytics.md`](docs/analytics.md).

Le lien review Studio (`POST /api/reviews`) exige `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_SECRET_KEY`) en local **et** sur le VPS — sans ça l’API répond 503.

## Production et déploiement

La production tourne uniquement sur le VPS DuoShot : Docker Compose derrière Traefik, avec Supabase auto-hébergé (`infra/supabase`). Vercel et Coolify ne servent plus aux déploiements ; `duoshot.vercel.app` redirige seulement vers `https://duoshot.site`.

- **Image** : après une CI verte sur `main`, `.github/workflows/container.yml` publie `ghcr.io/spocsk/duoshot:<sha>`. Les `NEXT_PUBLIC_*` sont figés au build depuis les variables du dépôt.
- **Conteneurs** : `web` (site public) et `render` (worker de rendu dédié, non routé) utilisent la même image et le même `/data/duoshot/app.env`. `APP_ENV=production` est obligatoire sur le VPS (`scripts/check-deployment-env.mjs`) et autorise seules les clés Stripe `sk_live_`/`rk_live_`.
- **Déployer** : procédure pas à pas (pull, sauvegarde du compose, deux tags d’image, worker, health checks) dans [`infra/deploy.md`](infra/deploy.md).
- **Tâches planifiées et worker** : unités systemd dans [`infra/systemd/`](infra/systemd/README.md) ; sécurité et alertes de l’hôte dans [`infra/host/`](infra/host/README.md).

## Auth

Google OAuth, e-mail + mot de passe, magic link OTP. **Pas** de Sign in with Apple en v1.

En production, l’auth est le GoTrue du **Supabase auto-hébergé** sur le VPS (`infra/supabase`), exposé en HTTPS sur `https://api.duoshot.site` derrière Traefik (santé : `https://api.duoshot.site/auth/v1/health`). L’ancien projet Supabase Cloud n’est plus utilisé par la production ; ne pas y reconfigurer l’auth.

### Côté app

- `NEXT_PUBLIC_SUPABASE_URL` = `https://api.duoshot.site` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (ou `NEXT_PUBLIC_SUPABASE_ANON_KEY`) : figés au build de l’image depuis les variables du dépôt GitHub.
- `SUPABASE_INTERNAL_URL` (optionnel, serveur uniquement) : URL Docker privée de l’API ; le navigateur utilise toujours l’URL publique HTTPS.
- `SUPABASE_SERVICE_ROLE_KEY` (ou `SUPABASE_SECRET_KEY`) : serveur uniquement, dans `/data/duoshot/app.env`.
- OAuth, magic link et confirmation reviennent sur `https://duoshot.site/auth/callback` (`src/app/auth/callback`) ; `src/app/auth/confirm` traite les liens e-mail à `token_hash`.

### Côté GoTrue (VPS)

La configuration vit dans les fichiers d’environnement root-only de la stack Supabase (voir [`infra/supabase/README.md`](infra/supabase/README.md)), jamais dans git :

- `SITE_URL` = `https://duoshot.site` ; `ADDITIONAL_REDIRECT_URLS` contient `https://duoshot.site/auth/callback`. Sans ces URLs, GoTrue ignore `redirectTo` et renvoie vers `SITE_URL`.
- `API_EXTERNAL_URL` : URL publique de l’API Auth, sous `/auth/v1` sur `https://api.duoshot.site` (le callback Google en dépend).
- Google : provider activé avec Client ID + secret dans l’environnement Auth. Dans [Google Cloud Console → Identifiants](https://console.cloud.google.com/apis/credentials), l’URI de redirection autorisée est le callback GoTrue `https://api.duoshot.site/auth/v1/callback`, avec l’origine `https://duoshot.site`.
- E-mail : SMTP Resend (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME`), confirmation e-mail obligatoire (`ENABLE_EMAIL_AUTOCONFIRM=false`), inscriptions ouvertes (`DISABLE_SIGNUP=false`).

Après toute modification, vérifier les réglages effectifs avec la clé publique sur `https://api.duoshot.site/auth/v1/settings` (Google activé, inscriptions ouvertes, confirmation requise).

En local, pointer `NEXT_PUBLIC_SUPABASE_URL` vers une instance Supabase de développement dont la liste de redirections inclut `http://localhost:3000/auth/callback`.

## Plans

| Offre | Prix | Notes |
| --- | --- | --- |
| Essai | 0 | Preview + ZIP exemple. 2 ZIP HD après compte |
| Indie | 12 €/mo ou 120 €/an | 100 ZIP/jour UTC, 6,9″, multi-sets, préfixe Client/App |
| Studio | 49 €/mo ou 490 €/an | + 3 sièges et reviews client pendant 7 jours |

Ne pas passer Stripe **live** tant que le checkout n’est pas validé.

## Specs

Voir [`docs/`](docs/) et la page publique `/specs` (date de version + disclaimer guideline 2.3.3).
