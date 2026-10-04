import type { Locale } from "../specs";

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
      a: "Écran fermé 5,4″ : 1398×2034 (portrait) et 2034×1398 (paysage). Écran ouvert 7,6″ : 2007×2853 et 2853×2007. Option 6,9″ (Indie / Studio) : 1320×2868, 1290×2796, 1260×2736 et leurs paysages.",
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
      a: "Accès libre : aperçu, contrôles et ZIP exemple. Essai : 2 ZIP HD après inscription, sans carte. Indie : 12 €/mois ou 120 €/an. Studio : 49 €/mois ou 490 €/an avec 3 sièges et une revue client pendant 7 jours. L’année offre deux mois par rapport au paiement mensuel.",
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
      q: "Les projets Studio sont-ils partagés entre membres ?",
      a: "Pas encore. Les projets sont enregistrés sur cet appareil et ne sont pas encore synchronisés entre membres. Les membres Studio partagent l’abonnement, le quota quotidien et les liens de validation client ; pour transmettre un set, exportez le ZIP ou envoyez un lien de validation.",
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
      a: "Closed (outer) screen 5.4″: 1398×2034 (portrait) and 2034×1398 (landscape). Open (inner) screen 7.6″: 2007×2853 and 2853×2007. Optional 6.9″ (Indie / Studio): 1320×2868, 1290×2796, 1260×2736 and their landscapes.",
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
      a: "Open access includes preview, checks, and an example ZIP. Trial includes 2 HD ZIPs after signup, no card. Indie is €12/month or €120/year. Studio is €49/month or €490/year with 3 seats and a 7-day client review. Annual billing includes two months free compared with monthly billing.",
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
      q: "Are Studio projects shared between members?",
      a: "Not yet. Projects are saved on this device and are not yet synced between members. Studio members share the subscription, the daily quota and client review links; to hand over a set, export the ZIP or send a review link.",
    },
  ],
};
