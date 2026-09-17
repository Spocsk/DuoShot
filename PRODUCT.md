# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Utilisateur principal : un indie iOS qui prépare **sa** fiche App Store pour iPhone Duo (écran fermé 5,4″ / écran ouvert 7,6″), souvent après un resize d’IA ou un rejet guideline 2.3.3.

Secondaire, en upsell : un studio / une agence qui prépare les visuels pour des clients (plan Studio : lien review). Ce n’est pas le job d’entrée.

## Product Purpose

DuoShot compose un set de screenshots Duo **sans chassis** et sort le ZIP qu’App Store Connect attend : un fichier par dalle, pixels exacts, RGB opaque, outer compact ≠ inner regular.

Succès : le set part vers Connect sans alpha, sans clone outer/inner, sans mauvaise arborescence. Le preview est libre ; le ZIP HD demande un compte (2 essais offerts).

## Positioning

DuoShot n’est pas un resize. L’IA sort un PNG joli ; Connect note 1398×2034, 2007×2853, un canal RGB opaque, et deux étagères qui ne sont pas le même listing. Le mécanisme propre : flatten, score clone 2.3.3, overlay de pli, ZIP `Client/App/duo-outer-portrait/`.

Pitch figé (ne pas paraphraser en « outil de resize ») :

- FR : « Ton IA resize. Nous on te sort le ZIP que Connect accepte du premier coup — sans alpha, sans clone outer/inner, sans rejet. »
- EN : « Your AI resizes. We hand you the ZIP Connect accepts first try — no alpha, no outer/inner clone, no rejection. »

## Operating Context

L’utilisateur droppe des PNG/JPEG (deux dépôts : fermé / ouvert), vérifie les checks (alpha, pixels, clone, charnière), ajuste fit / fond / titre, télécharge un ZIP. Une orientation par set. Cap 10 images ; avertissement sous 3.

Les pixels d’étagère et la guideline 2.3.3 vivent sur `/specs` et la FAQ — pas dans le hero ni le lead de l’outil.

Harbor est l’app **démo** des visuels marketing et du ZIP exemple (`src/components/harbor-ui.tsx`), pas le nom du produit.

Hors scope v1 (ne pas vendre ni prototyper comme livrable) : chassis / frames device, Sign in with Apple, tent/clock, vidéo App Store 15–30 s, upload vers Connect, A/B, API publique, CMP analytics. Invites d’équipe Studio : 3 sièges livrés.

## Capabilities and Constraints

- Étagère Duo : outer 5,4″ 1398×2034 / 2034×1398 ; inner 7,6″ 2007×2853 / 2853×2007. Option 6,9″ (Indie/Studio) : 1320×2868, 1290×2796, 1260×2736 et paysages. Source de vérité datée : `SPECS_VERSION_DATE` dans `src/lib/specs.ts` et `/specs`. Ne pas inventer d’autres tailles.
- Export v1 : étagère séparée, un PNG (défaut PNG-24) ou JPEG q90 par dalle. Pas de fenêtre boxed.
- Uploads navigateur → Supabase Storage (jamais le body Vercel). Sharp en route handlers Node.
- Auth v1 : Google, e-mail + mot de passe, magic link. Pas d’Apple.
- Offres affichées : Free (preview + exemple + 2 ZIP HD après compte) ; Launch 29 € / 60 j jusqu’au **23 oct. 2026** ; Indie 12 €/mois ; Studio 49 €/mois + 3 sièges + lien review. Stripe live / Vercel Pro : pas tant que le checkout n’est pas validé.
- Locales : français par défaut, anglais sous `/en`.
- Mentions légales : éditeur personne physique en France ; identifiants société (SIRET, siège) **non encore remplis**.
- Rétention Storage : 24 h.

Ouvert : date de bascule Stripe live.

## Brand Commitments

- Nom : **DuoShot**. Harbor n’est pas un rebrand.
- Voix : directe, impatient vis-à-vis du reviewer Apple, anti-joli-inutile. Le copy expédié (pitch, outil, « Pourquoi pas l’IA », décodeur de rejet) est contraignant ; ne pas le ramollir ni y recoller le jargon pixels dans le hero / tool lead.
- Interface produit existante : crème / encre, identité déjà en place. Init ne la documente pas ; ne pas la remplacer sans demande explicite de redesign.

## Evidence on Hand

- Visuels démo Harbor et ZIP exemple dans le repo.
- Specs publiques versionnées (`/specs`, `docs/iphone-duo-base-connaissances.md`).
- Pas de témoignages clients, logos clients, métriques de rejet évité, ni études de cas. **Ne pas en fabriquer.**

## Product Principles

1. Connect est le juge, pas le visiteur marketing : pixels, alpha, clone, ZIP d’abord.
2. Outer et inner sont deux listings ; les coller, c’est mentir (2.3.3).
3. Sans device, sans chassis : on compose l’étagère, on n’habille pas un mockup téléphone.
4. Dire le risque (clone, set incomplet, overlay brûlé) plutôt que de le cacher derrière un export « magique ».
5. Le jargon pixels reste sur `/specs` ; l’outil parle fermé / ouvert.

## Accessibility & Inclusion

On vise WCAG 2.2 AA dans le travail d’interface (contraste, labels, cibles, clavier). Ce n’est **pas** une promesse publique ni un argument commercial. Pas d’exigence RGAA / audit formel enregistrée.
