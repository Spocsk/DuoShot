# Raffinage S01 — screenshots Duo

Fiche recopiée dans le repo à partir du plan d’exécution DuoShot v1.0 (12 sept. 2026). L’upload d’origine `raffinage-S01-screenshots-duo` peut manquer sur une VM fraîche.

## Décisions produit

- Nom figé : **DuoShot**
- Frames **gelés** (aucun chassis)
- Preview outil sans compte ; **download ZIP = compte**
- Auth : Google + e-mail (signup et signin, magic link + mot de passe). Pas d’Apple
- Uploads : client → Supabase Storage UE, jamais le body de fonction Vercel (4,5 Mo)
- Sharp Node, ZIP relû via URL signée
- `/specs` = source citée pour les pixels (humains + GEO)
- Signup : case 16+ + privacy, version consignée
- Compte : export JSON + suppression
- Pas d’analytics / CMP en v1

## Pages

`/`, `/specs`, `/tool`, `/signup`, `/login`, `/account`, `/privacy`, `/terms`, `/cookies`, `/legal/subprocessors`, `llms.txt`, sitemap, robots.

## Contrôles bloquants

Pixels exacts, pas d’alpha, JPEG/PNG, RGB.
