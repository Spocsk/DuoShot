---
title: "Spécifications des aperçus vidéo App Store (2026) : tailles, durée, format — iPhone Duo inclus"
description: "Tailles d’aperçu vidéo acceptées par appareil (iPhone Duo inclus), durée 15–30 s, 500 Mo, H.264 ou ProRes, 30 ips, et le lien entre aperçus et captures."
lang: fr
slug: app-preview-specifications
alternate: /guides/app-preview-specifications
updated: 2026-11-09
published: 2026-11-09
---

# Spécifications des aperçus vidéo App Store (2026)

Les aperçus sont les courtes vidéos qui se lancent en haut de votre fiche App Store. Ils sont facultatifs, mais dès que vous en ajoutez un, il **apparaît toujours avant vos captures** sur iPhone, iPad, Mac et Apple TV, même si vous réorganisez l’ordre dans App Store Connect. L’aperçu est donc la première chose que les gens voient : bien préparer le fichier compte.

Tout ce qui suit provient de la [référence App Store Connect d’Apple](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications), vérifiée le 9 novembre 2026.

## La version courte

| Exigence | Valeur |
| --- | --- |
| Aperçus par taille d’appareil et par langue | Jusqu’à 3 |
| Durée | 15 à 30 secondes |
| Taille de fichier maximale | 500 Mo |
| Fréquence d’images maximale | 30 ips |
| Formats | .mov, .m4v, .mp4 (H.264) ; .mov (ProRes 422 HQ uniquement) |
| Image d’affiche par défaut | 5 secondes (vous pouvez la changer) |
| Traitement après dépôt | Jusqu’à 24 heures |
| Orientation | iOS : portrait ou paysage. macOS, tvOS, visionOS : paysage uniquement |

## Résolutions acceptées par appareil

Le point clé : App Store Connect ne veut **pas** la résolution native de votre appareil. Il accepte un ensemble fixe de tailles vidéo par classe d’écran. Utilisez la résolution acceptée, pas la résolution de l’écran.

### iPhone

| Classe d’écran | Appareils d’exemple | Portrait accepté | Paysage accepté |
| --- | --- | --- | --- |
| iPhone Duo | iPhone Duo | 886 × 1920 | 1920 × 886 |
| Dynamic Island, grand | iPhone Air, 18 Pro Max, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max | 886 × 1920 | 1920 × 886 |
| Face ID, grand | 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, 11, XS Max, XR | 886 × 1920 | 1920 × 886 |
| Dynamic Island, moyen | 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro | 886 × 1920 | 1920 × 886 |
| Face ID, moyen | 17e, 16e, 14, 13 / 13 Pro / 13 mini, 12 / 12 Pro / 12 mini, 11 Pro, XS, X | 886 × 1920 | 1920 × 886 |
| Bouton principal, grand | 8 Plus, 7 Plus, 6s Plus, 6 Plus | 1080 × 1920 | 1920 × 1080 |
| Bouton principal, moyen | SE (2ᵉ/3ᵉ gén.), 8, 7, 6s, 6 | 750 × 1334 | 1334 × 750 |
| Bouton principal, 4" | SE (1ʳᵉ gén.), 5s, 5c, 5 | 1080 × 1920 | 1920 × 1080 |
| Bouton principal, 3,5" | — | Non pris en charge | Non pris en charge |

Si vous sautez une classe, Apple utilise un aperçu redimensionné d’une classe voisine (par exemple, Dynamic Island grand bascule sur Face ID grand et inversement).

### iPad, Mac, Apple TV, Vision Pro

| Écran | Résolutions acceptées |
| --- | --- |
| iPad 13" (iPad Pro M5/M4 et générations 12,9" antérieures, iPad Air M4/M3/M2) | 1200 × 1600 ou 1600 × 1200 |
| iPad Pro 12,9" (2ᵉ gén.) | 1200 × 1600, 1600 × 1200, 900 × 1200, 1200 × 900 |
| iPad 11" (dont iPad A16, iPad mini A20 Pro / A17 Pro) | 1200 × 1600 ou 1600 × 1200 |
| iPad 10,5" | 1200 × 1600 ou 1600 × 1200 |
| iPad 9,7" | 900 × 1200 ou 1200 × 900 |
| Mac | 1920 × 1080 |
| Apple TV | 1920 × 1080 |
| Apple Vision Pro | 3840 × 2160 |

## iPhone Duo : aperçus et captures ne partagent pas le même ratio

C’est le piège des soumissions 2027. Les **captures** iPhone Duo utilisent le ratio propre au Duo (1398 × 2034 ou 2007 × 2853, environ 1,45:1, voir notre [guide des tailles de captures iPhone Duo](/guides/screenshot-size/iphone-duo)). Les **aperçus** vidéo du Duo utilisent la taille vidéo iPhone standard, 886 × 1920 (19,5:9). Apple précise que les résolutions de l’appareil Duo indiquées sur la page des aperçus sont « à titre de référence » uniquement.

Apple indique aussi que lorsque le ratio d’un aperçu diffère de celui de vos captures, il s’affiche dans la section **« Pour aller plus loin »** (« A Closer Look ») de la fiche plutôt qu’en premier. En lisant ces deux règles ensemble, un aperçu Duo en 886 × 1920 placé à côté de captures au ratio Duo devrait donc atterrir dans « Pour aller plus loin » plutôt qu’au-dessus de vos captures. Prévoyez des captures Duo capables de porter le message principal à elles seules.

## Spécifications d’encodage vidéo

| | H.264 | ProRes 422 (HQ uniquement) |
| --- | --- | --- |
| Débit cible | 10–12 Mbit/s | VBR ~220 Mbit/s |
| Vidéo | Progressive, jusqu’au profil High niveau 4.0 | Progressive, sans références externes |
| Fréquence d’images maximale | 30 ips | 30 ips |
| Audio | Stéréo, AAC 256 kbit/s, 44,1 ou 48 kHz | Stéréo, PCM (16/24/32 bits) ou AAC 256 kbit/s, 44,1 ou 48 kHz |
| Extensions | .mov, .m4v, .mp4 | .mov |

L’audio doit être stéréo, soit une piste à deux canaux (G puis D), soit deux pistes mono (G puis D), toutes les pistes activées.

## Liste de vérification avant dépôt

- Enregistrez sur l’appareil, puis exportez à la résolution **acceptée** pour chaque classe visée (un seul fichier 886 × 1920 couvre tous les iPhone Face ID / Dynamic Island et l’iPhone Duo).
- Gardez une durée de 15 à 30 secondes et une fréquence de 30 ips ou moins. Les enregistrements d’écran à 60 ips doivent être réencodés.
- Utilisez H.264 à 10–12 Mbit/s, sauf raison particulière de choisir ProRes.
- Si la vidéo a du son, exportez-le au format stéréo ci-dessus (Apple ne liste que de la stéréo AAC ou PCM).
- Choisissez l’image d’affiche à dessein : c’est ce que les gens voient avant la lecture et pendant l’installation.
- Si votre interface est identique sur toutes les tailles et toutes les langues, ne déposez que la plus grande taille requise ; Apple la réduit. Les aperçus localisés manquants basculent sur la langue la plus proche.
- Prévoyez jusqu’à 24 heures de traitement avant de soumettre pour validation.

## La place de DuoShot (honnêtement)

Je développe [DuoShot](/), et il ne crée pas les vidéos d’aperçu. Il crée les **captures** qui se trouvent à côté : il exporte un ZIP aux dimensions exactes d’App Store Connect, y compris les nouveaux formats iPhone Duo. Si vous préparez une fiche prête pour le Duo, utilisez un éditeur vidéo pour l’aperçu en 886 × 1920 et [l’outil DuoShot](/tool) pour les captures Duo.

## Guides liés

- [Tailles de captures App Store (tous les appareils)](/guides/app-store-screenshot-sizes)
- [Creative assets App Store (bandeau et résultats de recherche)](/guides/app-store-creative-assets)
- [Taille de capture iPhone Duo](/guides/screenshot-size/iphone-duo)
- [iPhone Duo dans App Store Connect](/guides/iphone-duo-app-store-connect)
- [Règles des captures App Store](/guides/app-store-screenshot-guidelines)
