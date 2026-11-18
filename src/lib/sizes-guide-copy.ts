import type { Locale } from "./specs";
import { BADGE, NEWS_APRIL, SPECS_APRIL } from "./iphone-duo-guide";

/** Shared by the visible FAQ and its structured data. Figures come from Apple's screenshot specifications (checked 2026-11-18). */
export function sizesGuideCopy(locale: Locale) {
  return locale === "fr" ? {
    faqHeading: "Questions fréquentes sur les tailles",
    faq: [
      { q: "Quelle taille de capture App Store est obligatoire pour iPhone ?", a: "App Store Connect exige au moins une capture pour l’iPhone avec Dynamic Island (écran moyen) : 1206 × 2622 ou 1179 × 2556 pixels en portrait, dimensions inversées en paysage. Apple marque aussi l’iPhone avec Face ID (grand écran), 1284 × 2778 ou 1242 × 2688, comme requis si l’app tourne sur iPhone et que vous ne fournissez pas de captures Dynamic Island (grand écran), comme 1320 × 2868." },
      { q: "1206 × 2622 et 1179 × 2556, est-ce la même chose ?", a: "Ce sont deux tailles différentes, mais Apple les range toutes deux sous l’iPhone avec Dynamic Island (écran moyen), l’emplacement qu’elle exige pour les apps iPhone : « At least one screenshot for iPhone with Dynamic Island (medium display). » Un jeu à l’une ou l’autre taille remplit cette exigence ; vous n’avez pas besoin des deux." },
      { q: "Quelles sont les tailles des captures iPhone Duo ?", a: "L’iPhone Duo accepte 1398 × 2034 pixels pour l’écran externe et 2007 × 2853 pixels pour l’écran interne en portrait, ou 2034 × 1398 et 2853 × 2007 en paysage, dans le même emplacement iPhone Duo." },
      { q: "Les captures iPhone Duo sont-elles obligatoires ?", a: `Apple le formule à deux endroits. Ses spécifications des captures indiquent : « ${SPECS_APRIL} » Son actualité développeurs iPhone Duo du 5 octobre 2026 indique : « ${NEWS_APRIL} » Apple ajoute : « ${BADGE} »` },
      { q: "Quelle taille de capture iPad est requise ?", a: "Si l’app tourne sur iPad, App Store Connect exige l’écran iPad 13″ : 2064 × 2752 ou 2048 × 2732 pixels en portrait. Pour l’écran 11″, Apple précise : « If screenshots with the accepted sizes aren't provided, scaled screenshots for 13\" displays are used. » Les groupes iPad plus petits se replient en chaîne : le 12,9″ utilise des captures 13″ mises à l’échelle, le 10,5″ des captures 12,9″ et le 9,7″ des captures 10,5″." },
      { q: "Combien de captures peut-on déposer par taille ?", a: "Apple accepte de 1 à 10 captures par taille d’appareil, en PNG, JPG ou JPEG, sans canal alpha ni transparence." },
      { q: "Pourquoi App Store Connect n’accepte-t-il pas ma capture ?", a: "Vérifiez trois points : les dimensions correspondent exactement à une taille acceptée, le fichier est dans le bon groupe d’appareil, et l’image n’a pas de canal alpha (Apple : « Images can’t include alpha channels or transparencies. »). Notre vérificateur gratuit, sur /tools/iphone-duo-screenshot-checker, teste les dimensions et la transparence dans votre navigateur." },
    ],
  } : {
    faqHeading: "Screenshot size FAQ",
    faq: [
      { q: "Which App Store screenshot size is required for iPhone?", a: "App Store Connect requires at least one screenshot for iPhone with Dynamic Island (medium display): 1206 × 2622 or 1179 × 2556 pixels in portrait, with dimensions swapped for landscape. Apple also marks iPhone with Face ID (large display), 1284 × 2778 or 1242 × 2688, as required if the app runs on iPhone and you don't provide Dynamic Island (large display) screenshots, such as 1320 × 2868." },
      { q: "Is 1206 × 2622 the same as 1179 × 2556?", a: "They are two different pixel sizes, but Apple lists both under iPhone with Dynamic Island (medium display), the slot it requires for iPhone apps: “At least one screenshot for iPhone with Dynamic Island (medium display).” A set at either size meets that requirement; you don't need both." },
      { q: "What are the iPhone Duo screenshot sizes?", a: "iPhone Duo accepts 1398 × 2034 pixels for the outer display and 2007 × 2853 pixels for the inner display in portrait, or 2034 × 1398 and 2853 × 2007 in landscape, all in the same iPhone Duo slot." },
      { q: "Are iPhone Duo screenshots mandatory?", a: `Apple words it in two places. Its Screenshot specifications say: “${SPECS_APRIL}” Its iPhone Duo developer news of October 5, 2026 says: “${NEWS_APRIL}” Apple also says: “${BADGE}”` },
      { q: "Which iPad screenshot size is required?", a: "If the app runs on iPad, App Store Connect requires the iPad 13\" display: 2064 × 2752 or 2048 × 2732 pixels in portrait. For the 11\" display, Apple notes: “If screenshots with the accepted sizes aren't provided, scaled screenshots for 13\" displays are used.” Smaller iPad groups fall back in a chain: 12.9\" uses scaled 13\" screenshots, 10.5\" uses scaled 12.9\" screenshots and 9.7\" uses scaled 10.5\" screenshots." },
      { q: "How many screenshots can I upload per size?", a: "Apple accepts 1 to 10 screenshots per device size, as PNG, JPG or JPEG files without alpha channels or transparency." },
      { q: "Why won't App Store Connect accept my screenshot?", a: "Check three things: the dimensions match one of the accepted sizes exactly, the file is in the right device group, and the image has no alpha channel (Apple: “Images can’t include alpha channels or transparencies.”). Our free checker at /en/tools/iphone-duo-screenshot-checker tests dimensions and transparency in your browser." },
    ],
  };
}
