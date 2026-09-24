# Registre des traitements (art. 30 RGPD) — DuoShot v1.0

Date : 2026-09-24. Responsable : exploitant DuoShot (FR / CNIL). Notice interne, pas un avis d’avocat.

| Traitement | Finalité | Base | Données | Destinataires | Durée | Transferts |
| --- | --- | --- | --- | --- | --- | --- |
| Compte Auth | Fournir l’outil et le ZIP | Contrat 6.1.b | e-mail, id Auth | Supabase eu-west-3 | Jusqu’à suppression | — |
| Consentement | Preuve 16+ / privacy | Obligation légale | kind, version, timestamp | Supabase | Compte | — |
| Captures + ZIP | Générer les screenshots | Contrat | PNG/JPEG, ZIP | Storage privé | 24 h | Paris |
| Quotas / exports | Limiter le Free, historique | Contrat | compteurs, métadonnées set | Supabase | Compte | — |
| Facturation | Encaisser Indie/Studio/pack | Contrat + obligation légale | e-mail, ids Stripe | Stripe | Légal comptable | US/EU DPF-CCT |
| Magic link / reçus | Délivrer le service | Contrat | e-mail | Supabase SMTP / Resend | Transactionnel | US possible |
| DSAR | Accès / effacement | Obligation légale | export JSON, statut | Supabase | Preuve courte | — |
| Analytics produit facultatives | Parcours, funnels, engagement | Consentement | ID pseudonyme, événements, pages normalisées, temps visible | Mixpanel UE | Selon rétention configurée dans le projet ; effacement sur demande | UE |

Vercel Web Analytics mesure le trafic agrégé. Mixpanel ne démarre qu’après acceptation ; pas de marketing en v1. Sous-traitants : `/legal/subprocessors`. Violation : notifier la CNIL sous 72 h si risque élevé. Pas de DPO art. 37 en solo — à réévaluer.
