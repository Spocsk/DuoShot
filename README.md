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

Renseigne uniquement les **noms** de variables dans `.env.example`. Les secrets vont dans `.env.local` / Vercel Sensitive / Runtime Secrets — jamais dans git.

## Auth

Google OAuth, e-mail + mot de passe, magic link OTP. **Pas** de Sign in with Apple en v1.

Dans le dashboard Supabase : activer Google, autoriser les redirect URLs (`http://localhost:3000/auth/callback`, domaine prod), SMTP Resend si le quota mail Free sature.

## Plans

| Offre | Prix | Notes |
| --- | --- | --- |
| Free | 0 | 1 set HD / jour, Duo only, README marqué DuoShot |
| Indie | 12 €/mo ou 29 € lancement 60 j | + tailles 6,9″ |
| Studio | 49 €/mo | 3 sièges, préfixe `client-slug/` |
| Pack app | 19 € | App supplémentaire |

Ne pas passer Stripe **live** ni Vercel Pro tant que le checkout n’est pas validé.

## Specs

Voir [`docs/`](docs/) et la page publique `/specs` (date de version + disclaimer guideline 2.3.3).
