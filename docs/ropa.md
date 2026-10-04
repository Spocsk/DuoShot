# Registre des traitements (art. 30 RGPD) — DuoShot v1.0

Date : 2026-09-24, mise à jour 2026-10-04 (DataFast seul outil d’analytics ; liste d’alerte « Prévenez-moi »). Responsable : exploitant DuoShot (FR / CNIL). Notice interne, pas un avis d’avocat.

| Traitement | Finalité | Base | Données | Destinataires | Durée | Transferts |
| --- | --- | --- | --- | --- | --- | --- |
| Compte Auth | Fournir l’outil et le ZIP | Contrat 6.1.b | e-mail, id Auth | Supabase eu-west-3 | Jusqu’à suppression | — |
| Consentement | Preuve 16+ / privacy | Obligation légale | kind, version, timestamp | Supabase | Compte | — |
| Captures + ZIP | Générer les screenshots | Contrat | PNG/JPEG, ZIP | Storage privé | 24 h | Paris |
| Quotas / exports | Limiter le Free, historique | Contrat | compteurs, métadonnées set | Supabase | Compte | — |
| Facturation | Encaisser Indie/Studio/pack | Contrat + obligation légale | e-mail, ids Stripe | Stripe | Légal comptable | US/EU DPF-CCT |
| Magic link / reçus | Délivrer le service | Contrat | e-mail | Supabase SMTP / Resend | Transactionnel | US possible |
| Liste d’alerte « Prévenez-moi » (`waitlist`) | Prévenir d’un événement précis : ouverture du dépôt Duo dans App Store Connect (`apple_duo_open`) ou lancement (`launch`) | Consentement (double opt-in), art. 6.1.a | e-mail, sujet, langue, jeton aléatoire, dates d’inscription et de confirmation ; aucun lien avec un compte | Supabase (service role seul, RLS sans politique) ; e-mail via Resend | Jusqu’à désinscription (suppression de la ligne) ; liste purgée au plus tard 3 mois après l’envoi de l’alerte ; une adresse non confirmée ne reçoit rien d’autre que l’e-mail de confirmation | Resend : US possible |
| DSAR | Accès / effacement | Obligation légale | export JSON, statut | Supabase | Preuve courte | — |
| Connexion App Store Connect (si `ASC_CONNECTOR_ENABLED`) | Envoyer les captures rendues vers la fiche App Store du client | Contrat 6.1.b | Issuer ID, Key ID, clé privée .p8 chiffrée AES-256-GCM (`ASC_ENCRYPTION_KEY`), auteur, dates de vérification ; ids app/version/localisation dans la file de rendu | Supabase (service role seul) ; Apple (App Store Connect API) | Jusqu’à révocation ou suppression du compte/espace (cascade) ; tâches de rendu 24 h | Apple (US) à l’initiative du client |
| Analytics produit facultatives | Parcours, funnels, engagement | Consentement | ID pseudonyme, événements, pages normalisées, temps visible | DataFast | Selon rétention DataFast ; effacement sur demande | Voir `/legal/subprocessors` |
| Analytics historiques Mixpanel (collecte arrêtée le 2026-10-04) | Effacement des événements déjà reçus | Obligation légale (art. 17) | ID pseudonyme, événements antérieurs | Mixpanel UE | Jusqu’à effacement (file `analytics_erasure_jobs`) ou suppression du projet | UE |

DataFast ne démarre qu’après acceptation ; Mixpanel ne reçoit plus de données ; pas de marketing en v1 : la liste d’alerte sert uniquement l’événement choisi. Désinscription : lien dans chaque e-mail, qui supprime la ligne (confirmation par bouton, jamais sur simple ouverture du lien). La suppression d’un compte ne touche pas cette liste (aucun lien) ; une demande d’effacement par e-mail se traite en supprimant les lignes de cette adresse. Sous-traitants : `/legal/subprocessors`. Violation : notifier la CNIL sous 72 h si risque élevé. Pas de DPO art. 37 en solo — à réévaluer.
