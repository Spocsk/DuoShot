import type { Locale } from "../specs";
import { PLANS } from "../plans";
import { REVIEW_TTL_DAYS } from "../reviews";
import { createTranslator } from "./core";
import { fr } from "./fr";
import { en } from "./en";

const freeMonths = 12 - PLANS.indie.yearlyEur / PLANS.indie.monthlyEur;

/** FAQ entries for the landing and pricing pages and their JSON-LD. Server components only. */
export const FAQ: Record<Locale, { q: string; a: string }[]> = {
  fr: [
    {
      q: "DuoShot peut-il éviter des retards lors de la validation Apple ?",
      a: "Un problème de captures peut entraîner des corrections et des allers-retours avec Apple, et retarder votre publication de plusieurs jours. DuoShot contrôle les dimensions et le format des fichiers, signale les points de cadrage et de similarité à examiner et vous aide à vérifier la lisibilité près du pli avant soumission. Il ne détecte pas tous les problèmes : vous devez confirmer que les captures montrent fidèlement votre app en usage. DuoShot ne garantit ni l’approbation ni un délai de validation ; la décision reste celle d’Apple.",
    },
    {
      q: "Pourquoi une IA ne suffit-elle pas pour préparer ces captures ?",
      a: "Une IA peut aider à créer ou redimensionner une image, mais elle ne peut pas confirmer seule que les captures montrent l’app réelle en usage, que les écrans fermé et ouvert racontent la même séquence et que le texte reste lisible près du pli. DuoShot prépare et signale les points à examiner ; la validation du contenu reste humaine.",
    },
    {
      q: "Quelles tailles pour l’iPhone Duo ?",
      a: "Écran fermé 5,4″ : 1398×2034 (portrait) et 2034×1398 (paysage). Écran ouvert 7,6″ : 2007×2853 et 2853×2007. Taille iPhone 6,3″ requise pour App Store Connect, incluse dans l’essai gratuit : 1206×2622 et 2622×1206. Connect accepte aussi 1179×2556 et 2556×1179 ; DuoShot exporte en 1206×2622 ou son paysage. Option 6,9″ (Indie / Studio) : 1320×2868, 1290×2796, 1260×2736 et leurs paysages.",
    },
    {
      q: "Faut-il un iPhone Duo physique ?",
      a: "Non. DuoShot compose à partir de vos PNG/JPEG. Aucun device, aucun simulateur.",
    },
    {
      q: "Capture dans un cadre d’appareil ou fichier par écran ?",
      a: "Un fichier par écran (fermé / ouvert), aux dimensions exactes. Pas de coque d’appareil ni de cadre autour de la capture.",
    },
    {
      q: "Comment ça se paie ?",
      a: `Accès libre : aperçu, contrôles et ZIP exemple. Essai gratuit : ${PLANS.free.freeExports} exports après inscription, sans carte, avec les captures Duo sélectionnées et la taille iPhone 6,3″ requise. Le 6,9″ est optionnel avec Indie et Studio. Indie : ${PLANS.indie.monthlyEur} €/mois ou ${PLANS.indie.yearlyEur} €/an. Studio : ${PLANS.studio.monthlyEur} €/mois ou ${PLANS.studio.yearlyEur} €/an avec ${PLANS.studio.seats} sièges et une revue client pendant ${REVIEW_TTL_DAYS} jours. L’année offre ${freeMonths} mois par rapport au paiement mensuel.`,
    },
    {
      q: "PNG ou JPEG ?",
      a: "PNG RGB opaque par défaut. JPEG qualité 90 en option. Vérifiez les dimensions et le rendu des fichiers exportés.",
    },
    {
      q: "Combien d’images dans un set ?",
      a: "1 à 10. Un avertissement sous 3 visuels. Une seule orientation par set.",
    },
    {
      q: "Conservez-vous mes fichiers ?",
      a: "Oui, le temps du traitement : sources et ZIP expirent après 24 h, les médias de revue après 7 jours ou révocation. La purge serveur est prévue toutes les 15 minutes, avec reprise en cas d’échec. Les brouillons locaux restent sur votre appareil.",
    },
    {
      q: "Que partagent les membres Studio ?",
      a: createTranslator("fr", fr).tf("pricing_local_projects", { seats: PLANS.studio.seats }),
    },
  ],
  en: [
    {
      q: "Can DuoShot help avoid delays during Apple review?",
      a: "Screenshot issues can lead to corrections and back-and-forth with Apple, delaying your release by days. DuoShot checks file dimensions and format, flags framing and similarity issues to examine, and helps you review legibility near the fold before submission. It cannot detect every issue: you must confirm that the screenshots accurately show your app in use. DuoShot guarantees neither approval nor a review time; Apple makes the final decision.",
    },
    {
      q: "Why isn’t AI alone enough to prepare these screenshots?",
      a: "AI can help create or resize an image, but it cannot confirm on its own that the screenshots show the real app in use, that the closed and open screens tell the same story, and that text remains legible near the fold. DuoShot prepares the files and flags items to review; a person makes the final content decision.",
    },
    {
      q: "What sizes for iPhone Duo?",
      a: "Closed (outer) screen 5.4″: 1398×2034 (portrait) and 2034×1398 (landscape). Open (inner) screen 7.6″: 2007×2853 and 2853×2007. Required 6.3″ iPhone size for App Store Connect, included in the free trial: 1206×2622 and 2622×1206. Connect also accepts 1179×2556 and 2556×1179; DuoShot exports 1206×2622 or its landscape. Optional 6.9″ (Indie / Studio): 1320×2868, 1290×2796, 1260×2736 and their landscapes.",
    },
    {
      q: "Do I need a physical iPhone Duo?",
      a: "No. DuoShot composes from your PNG/JPEG files. No device, no simulator.",
    },
    {
      q: "Device frame or one file per screen?",
      a: "One file per screen (closed / open), at the exact dimensions. No device chassis or frame around the screenshot.",
    },
    {
      q: "How does payment work?",
      a: `Open access includes preview, checks, and an example ZIP. Free trial includes ${PLANS.free.freeExports} exports after signup, no card, with selected Duo screenshots and the required 6.3″ iPhone size. The 6.9″ size is optional with Indie and Studio. Indie is €${PLANS.indie.monthlyEur}/month or €${PLANS.indie.yearlyEur}/year. Studio is €${PLANS.studio.monthlyEur}/month or €${PLANS.studio.yearlyEur}/year with ${PLANS.studio.seats} seats and a ${REVIEW_TTL_DAYS}-day client review. Annual billing includes ${freeMonths} months free compared with monthly billing.`,
    },
    {
      q: "PNG or JPEG?",
      a: "Opaque RGB PNG by default. JPEG quality 90 optional. Review the exported dimensions and appearance.",
    },
    {
      q: "How many images in a set?",
      a: "1 to 10. A warning under 3 visuals. One orientation per set.",
    },
    {
      q: "Do you keep our files?",
      a: "Only for processing: sources and ZIPs expire after 24 hours; review media after 7 days or revocation. Server cleanup is scheduled every 15 minutes, with retries on failure. Local drafts remain on your device.",
    },
    {
      q: "What do Studio members share?",
      a: createTranslator("en", en).tf("pricing_local_projects", { seats: PLANS.studio.seats }),
    },
  ],
};
