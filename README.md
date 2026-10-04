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

Projet Supabase : [DuoShot](https://supabase.com/dashboard/project/jvhqcmqwrihbtwrggwuq) (`jvhqcmqwrihbtwrggwuq`).

### Activer Google

1. [Google Cloud Console → Identifiants](https://console.cloud.google.com/apis/credentials) : écran de consentement OAuth (External, app DuoShot), puis **ID client OAuth 2.0** type Application Web.
2. URI de redirection autorisée (côté Google) — uniquement le callback Supabase :

   `https://jvhqcmqwrihbtwrggwuq.supabase.co/auth/v1/callback`

3. [Supabase → Authentication → Providers → Google](https://supabase.com/dashboard/project/jvhqcmqwrihbtwrggwuq/auth/providers) : activer, coller Client ID + secret. Aucun secret dans git.
4. [URL Configuration](https://supabase.com/dashboard/project/jvhqcmqwrihbtwrggwuq/auth/url-configuration) :

   - **Site URL** : `https://duoshot.site`
   - **Redirect URLs** :
     - `https://duoshot.site/auth/callback`
     - `https://duoshot.site/**`
     - `http://localhost:3000/auth/callback`
     - `http://localhost:3000/**`

   Sans ces URLs prod, GoTrue ignore `redirectTo` et renvoie le SSO vers `http://localhost:3000`.

Sans provider allumé, le bouton Google affiche une erreur dans l’app (plus de JSON brut GoTrue). SMTP Resend si le quota mail Free sature.

## Plans

| Offre | Prix | Notes |
| --- | --- | --- |
| Essai | 0 | Preview + ZIP exemple. 2 ZIP HD après compte |
| Indie | 12 €/mo ou 120 €/an | 100 ZIP/jour UTC, 6,9″, multi-sets, préfixe Client/App |
| Studio | 49 €/mo ou 490 €/an | + 3 sièges et reviews client pendant 7 jours |

Ne pas passer Stripe **live** tant que le checkout n’est pas validé.

## Specs

Voir [`docs/`](docs/) et la page publique `/specs` (date de version + disclaimer guideline 2.3.3).
