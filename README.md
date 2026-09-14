# DuoShot

Tes screenshots Duo, justes, en 3 minutes. Sans device.

Pipeline App Store **sans chassis** pour iPhone Duo : outer 5,4″, inner 7,6″, option 6,9″ (Indie/Studio). Preview sans compte, ZIP avec compte.

## Stack

- Next.js App Router + TypeScript + Tailwind
- `@supabase/ssr` (PKCE, cookies) — pas d’auth-helpers
- Sharp en route handlers **Node** (pas Edge)
- Uploads navigateur → Supabase Storage (jamais le body Vercel 4,5 Mo)
- Stripe Checkout + Resend (mock si les secrets absents)

## Démarrage

```bash
cp .env.example .env.local
npm install
npm test
npm run dev
```

Quality gate : `npm test` (Vitest) puis, après `npm run build`, `npm run test:e2e` (Cypress). GitHub Actions lance les deux sur chaque PR ; Vercel reste le déploiement.

Renseigne uniquement les **noms** de variables dans `.env.example`. Les secrets vont dans `.env.local` / Vercel Sensitive / Runtime Secrets — jamais dans git.

## Auth

Google OAuth, e-mail + mot de passe, magic link OTP. **Pas** de Sign in with Apple en v1.

Projet Supabase : [DuoShot](https://supabase.com/dashboard/project/jvhqcmqwrihbtwrggwuq) (`jvhqcmqwrihbtwrggwuq`).

### Activer Google

1. [Google Cloud Console → Identifiants](https://console.cloud.google.com/apis/credentials) : écran de consentement OAuth (External, app DuoShot), puis **ID client OAuth 2.0** type Application Web.
2. URI de redirection autorisée (côté Google) — uniquement le callback Supabase :

   `https://jvhqcmqwrihbtwrggwuq.supabase.co/auth/v1/callback`

3. [Supabase → Authentication → Providers → Google](https://supabase.com/dashboard/project/jvhqcmqwrihbtwrggwuq/auth/providers) : activer, coller Client ID + secret. Aucun secret dans git.
4. [URL Configuration](https://supabase.com/dashboard/project/jvhqcmqwrihbtwrggwuq/auth/url-configuration) : Site URL + Redirect URLs

   - `http://localhost:3000/auth/callback`
   - origine prod (`NEXT_PUBLIC_SITE_URL` / domaine Vercel), même chemin `/auth/callback`

Sans provider allumé, le bouton Google affiche une erreur dans l’app (plus de JSON brut GoTrue). SMTP Resend si le quota mail Free sature.

## Plans

| Offre | Prix | Notes |
| --- | --- | --- |
| Free | 0 | Preview + ZIP exemple. 2 ZIP HD après compte |
| Launch | 29 € / 60 j | Tout Indie pendant le pic Duo |
| Indie | 12 €/mo | ZIP illimités, 6,9″, multi-sets, préfixe Client/App |
| Studio | 49 €/mo | + lien review client. Sièges = bientôt |

Ne pas passer Stripe **live** ni Vercel Pro tant que le checkout n’est pas validé.

## Specs

Voir [`docs/`](docs/) et la page publique `/specs` (date de version + disclaimer guideline 2.3.3).
