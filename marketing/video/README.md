# Vidéos sociales DuoShot

Paquet autonome Remotion : 1080×1920, 30 fps, vidéos de 15 à 30 secondes. Prérequis : **Node 24**. Depuis `marketing/video/` :

```sh
npm install
npm run prepare-assets
npm run render -- scripts/*.json --platform tiktok
```

Remotion télécharge Chrome Headless Shell au premier rendu. Aucun service de génération d’images : Harbor est l’application fictive du site, dessinée uniquement dans `src/lib/pipeline/harbor-screens.ts`. Le préparateur bundle ce fichier avec esbuild et rasterise ses trois vues en PNG pleine résolution avec sharp, en français et anglais. La vue classique centre l’écran externe sur le fond bicolore du site. Les polices, leurs licences et le logo sont copiés depuis le dépôt. Tous les fichiers générés de `public/` sont ignorés. Le CLI prépare automatiquement les ressources absentes ; dans Studio, lancer d’abord `prepare-assets`.

## Écrire un JSON

Voir `scripts/v1-accepts.json` et `scripts/v2-real.json`. Champs : `id` en kebab-case, `title` facultatif, `lang` (`en` / `fr`), `durationSec` (15–30), `endUrl`, `scenes` (1–12). Chaque scène dure **au moins 0,5 s** et a un `text` facultatif, sauf `title` et `end`. La somme des durées doit correspondre au total à 0,01 s près. Les limites sont arrondies cumulativement à 30 fps. Le titre de la première scène est visible dès l’image 0 pour la vignette TikTok/Reels.

| Type | Champs spécifiques |
| --- | --- |
| `title` | `text`, `subtitle?`, `theme?: dark / light` (dark par défaut) |
| `outer` | `capture` externe 1398×2034 |
| `inner` | `capture` interne 2007×2853 |
| `classic` | `capture` classique 1206×2622 |
| `outer-to-inner` | `outer`, `inner` à échelle commune |
| `side-by-side` | `outer`, `inner` à échelle commune, dimensions dessous |
| `before-after` | `before`, `after`, `beforeLabel?`, `afterLabel?`, échelle commune et dimensions dessous |
| `reframe` | `classic`, `outer`, `inner`, transition avec proportions réelles |
| `zip` | `files` (1–8) : `{ name, format: "png" ou "jpeg", dims? }` |
| `end` | `text`, `logo?` (true par défaut) |

Captures : `harbor:en:1:outer`, `harbor:fr:3:inner`, `harbor:en:1:classic`, ou chemin relatif à `marketing/video/public/` (ex. `custom/screen.png`). Pour les chemins personnalisés, fournir une image aux dimensions du type choisi ; `before-after` conserve aussi les proportions intrinsèques avec `object-fit: contain`. Une capture absente affiche des rayures et « PLACEHOLDER — capture manquante : … » ; le CLI avertit. Aucune image n’est étirée.

`endUrl` commence par `https://duoshot.site/` et contient `utm_source={platform}`, `utm_medium=social`, `utm_campaign` non vide. L’URL complète est réservée au fichier de légende ; seul le texte de la scène de fin est affiché.

Règles éditoriales sur tous les textes, titres, labels et noms de fichiers :

- Aucune diagonale en pouces, entière ou décimale (`6 inches`, `6"`, `5.4”`, `5,4 po`, `6-inch`). Les dimensions en pixels et « up to 10 per size » restent autorisées.
- Dire « accepted / acceptées » plutôt que required, requis, exigé, obligatoire ou mandatory.
- Aucune promesse d’envoi vers App Store Connect / ASC, y compris upload, send, push, submit, transfer, deliver, export to et leurs équivalents français. Les textes et labels d’une scène sont analysés ensemble. Une négation explicite (« No upload to App Store Connect », « pas d’envoi vers ASC ») est autorisée.
- Aucun mot promo, coupon, discount, rabais, réduction ou remise ; aucun pourcentage. Après « code », les mots contenant un chiffre ou au moins quatre lettres entièrement en majuscules sont interdits, sauf PNG, JPEG, JPG, HEIC et ZIP. PRODUCTHUNT et FAZIER en majuscules sont interdits ; « Product Hunt » en texte normal est autorisé.
- Vouvoiement en français : pas de tutoiement ni d’impératif singulier en début de texte ou de phrase (« Télécharge », « Choisis », « Crée », etc.). « Je télécharge », « Téléchargez » et « Choisissez » sont autorisés.

Les erreurs listent les chemins concernés.

Geist porte les titres et légendes ; Plex Mono 500 porte dimensions et noms de fichiers. Zone sûre : 250 px en haut, 380 px en bas, 60 px sur les côtés. Sous les 220 px du texte et un espace de 20 px, la capture dispose de 974 px de haut, puis de 16 px d’espace et de 60 px pour ses dimensions. L’échelle commune est `min(960 / 2007, 974 / 2853) ≈ 0,3414` pixel vidéo par pixel de capture : `outer`, `inner`, `classic`, `outer-to-inner` et `reframe` conservent cette référence. Les scènes à deux écrans utilisent une échelle plus petite, identique pour les deux captures, avec dimensions sous chacune. Les proportions sont conservées.

`outer-to-inner` agrandit la fenêtre au format interne et termine son fondu en 0,8 s au maximum (plus tôt pour les scènes courtes). Le texte principal apparaît seulement une fois l’interne entièrement affiché. Les dimensions se fondent exactement avec les captures. `reframe` recadre d’abord la capture classique au format externe par un zoom uniforme dans une fenêtre de découpe, révèle l’externe, puis agrandit la fenêtre vers l’interne ; les libellés suivent les mêmes fondus.

Les longs textes sont réduits jusqu’à 84 px pour les titres, 52 px pour les légendes, puis répartis en pages si nécessaire. Garder une rédaction courte pour une bonne lecture. Les noms et métadonnées ZIP peuvent descendre à 24 px pour éviter une pagination inutile : les quatre fichiers de l’exemple restent sur une seule page. Au-delà de quatre fichiers, chaque groupe possède sa propre `Sequence` et son temps local, partagé avec ses textes.

## Markdown

```md
## exemple · en · 15 s
Titre : Accepted Duo sizes
Fin : https://duoshot.site/en?utm_source=<platform>&utm_medium=social&utm_campaign=launch
1. 0–3 s · title · « Your real app. »
2. 3–12 s · side-by-side harbor:en:1:outer harbor:en:1:inner · « Accepted sizes »
3. 12–15 s · end · « DuoShot by @Spocsk · duoshot.site »
```

Un bloc `## id · langue · durée s` par vidéo. `Titre :` est facultatif. Scènes numérotées, plages continues depuis zéro avec `–` ou `-`, références dans l’ordre du tableau, puis texte entre `« »` ou `""`. Un point médian dans le texte est conservé. Pour ZIP : `zip shot-01.png shot-02.jpg`, ou `zip shot-01.png@1398×2034` pour conserver les dimensions. `<plateforme>` et `<platform>` deviennent `{platform}`. Le format court utilise les thèmes et labels par défaut ; personnaliser les autres options dans le JSON.

```sh
npm run convert -- scripts-example.md --out scripts
```

Chaque bloc produit `<out>/<id>.json` après validation ; les erreurs indiquent la ligne de la scène, de `Titre :` ou de `Fin :` concernée. Les deux exemples Markdown produisent les mêmes scripts que les JSON fournis ; leurs textes sont conservés à l’identique.

## Rendu, aperçu et vérification

```sh
npm run render -- scripts/*.json
npm run render -- scripts/v2-real.json --platform instagram,youtube --out out --concurrency 2
npm run studio
npm test
npm run typecheck
```

Tous les scripts et l’ensemble des chemins de sortie sont validés avant toute préparation, création de dossier, construction du bundle ou rendu. Les ids dupliqués et toute collision entre `<id>.mp4`, `<id>-<platform>.mp4` et `<id>-<platform>.txt` arrêtent le CLI avec les scripts et le chemin concernés (par exemple `demo` et `demo-tiktok`). Le bundle est ensuite construit une fois. Le rendu est indépendant de la plateforme : un `<id>.mp4` H.264 / yuv420p (CRF 18), avec piste AAC silencieuse, puis une copie `<id>-<platform>.mp4` et un `<id>-<platform>.txt` contenant l’URL UTM résolue. Plateformes par défaut : TikTok, Instagram et YouTube. Dossier de sortie : `--out`, sinon `VIDEO_OUT_DIR`, sinon `/workspace/videos/`, créé si nécessaire. Le shell développe `scripts/*.json`. Le CLI affiche progression et temps par vidéo.
