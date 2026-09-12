import type { Locale } from "./specs";
import { SITE_PITCH_EN, SITE_PITCH_FR } from "./site";

type Dict = Record<string, string>;

const fr: Dict = {
  pitch: SITE_PITCH_FR,
  nav_tool: "Outil",
  nav_specs: "Pixels",
  nav_account: "Compte",
  nav_login: "Connexion",
  nav_signup: "Créer un compte",
  nav_pricing: "Tarifs",
  cta_tool: "Composer un set",
  cta_specs: "Voir les pixels Duo",
  hero_kicker: "iPhone Duo · App Store · sans chassis",
  hero_lead:
    "Outer 5,4″ et inner 7,6″ aux pixels d’étagère. Contain, cover ou smart. Fond uni, dégradé ou flou. ZIP prêt à déposer.",
  how_title: "Trois minutes, zéro device",
  how_1: "Dépose 1 à 10 PNG ou JPEG. Une orientation par set.",
  how_2: "Preview dual outer + inner. Titre optionnel, deux polices, deux positions.",
  how_3: "Compte requis pour le ZIP. URL signée, fichiers effacés sous 24 h.",
  pricing_title: "Plans",
  plan_free: "Free — 1 set HD / jour, Duo seulement, README marqué DuoShot.",
  plan_indie: "Indie — 12 €/mois, ou 29 € lancement 60 jours. Inclut le 6,9″.",
  plan_studio: "Studio — 49 €/mois, 3 sièges, préfixe client-slug dans le ZIP.",
  plan_pack: "Pack app — 19 € / app supplémentaire.",
  faq_title: "FAQ",
  footer_legal: "Mentions",
  tool_title: "Étagère Duo",
  tool_drop: "Dépose tes captures ici, ou clique pour choisir.",
  tool_warn: "Moins de 3 visuels : l’App Store aime les sets complets.",
  tool_cap: "Maximum 10 images.",
  tool_download: "Télécharger le ZIP",
  tool_need_account: "Le preview est libre. Le ZIP demande un compte.",
  specs_title: "Pixels iPhone Duo",
  specs_intro: "Tailles d’étagère figées, versionnées. Pas l’angle de charnière.",
  login_title: "Connexion",
  signup_title: "Créer un compte",
  age_label: "J’ai 16 ans ou plus.",
  privacy_label: "J’accepte la politique de confidentialité.",
  google: "Continuer avec Google",
  magic: "Lien magique",
  password: "Mot de passe",
  email: "E-mail",
  no_apple: "Pas de Sign in with Apple en v1.",
  account_title: "Compte",
  export_data: "Exporter mes données (JSON)",
  delete_account: "Supprimer mon compte",
  lang_switch: "EN",
};

const en: Dict = {
  pitch: SITE_PITCH_EN,
  nav_tool: "Tool",
  nav_specs: "Pixels",
  nav_account: "Account",
  nav_login: "Log in",
  nav_signup: "Sign up",
  nav_pricing: "Pricing",
  cta_tool: "Compose a set",
  cta_specs: "See Duo pixels",
  hero_kicker: "iPhone Duo · App Store · frameless",
  hero_lead:
    "Outer 5.4″ and inner 7.6″ at shelf pixels. Contain, cover or smart. Solid, gradient or blur. Submission-ready ZIP.",
  how_title: "Three minutes, no device",
  how_1: "Drop 1–10 PNG or JPEG files. One orientation per set.",
  how_2: "Dual outer + inner preview. Optional title, two fonts, two positions.",
  how_3: "Account required for the ZIP. Signed URL, files deleted within 24 h.",
  pricing_title: "Plans",
  plan_free: "Free — 1 HD set / day, Duo only, DuoShot-branded README.",
  plan_indie: "Indie — €12/month, or €29 launch for 60 days. Includes 6.9″.",
  plan_studio: "Studio — €49/month, 3 seats, client-slug ZIP prefix.",
  plan_pack: "App pack — €19 per extra app.",
  faq_title: "FAQ",
  footer_legal: "Legal",
  tool_title: "Duo shelf",
  tool_drop: "Drop captures here, or click to choose.",
  tool_warn: "Fewer than 3 visuals: the App Store prefers complete sets.",
  tool_cap: "Maximum 10 images.",
  tool_download: "Download ZIP",
  tool_need_account: "Preview is free. The ZIP needs an account.",
  specs_title: "iPhone Duo pixels",
  specs_intro: "Frozen shelf sizes, versioned. Not hinge angle.",
  login_title: "Log in",
  signup_title: "Create an account",
  age_label: "I am 16 or older.",
  privacy_label: "I accept the privacy policy.",
  google: "Continue with Google",
  magic: "Magic link",
  password: "Password",
  email: "Email",
  no_apple: "No Sign in with Apple in v1.",
  account_title: "Account",
  export_data: "Export my data (JSON)",
  delete_account: "Delete my account",
  lang_switch: "FR",
};

export function t(locale: Locale, key: keyof typeof fr): string {
  return (locale === "en" ? en : fr)[key];
}

export const FAQ: Record<
  Locale,
  { q: string; a: string }[]
> = {
  fr: [
    {
      q: "Quelles tailles pour l’iPhone Duo ?",
      a: "Outer 5,4″ : 1398×2034 (portrait) et 2034×1398 (paysage). Inner 7,6″ : 2007×2853 et 2853×2007. Option 6,9″ (Indie/Studio) : 1320×2868, 1290×2796, 1260×2736 et leurs paysages.",
    },
    {
      q: "Faut-il un iPhone Duo physique ?",
      a: "Non. DuoShot compose depuis tes PNG/JPEG. Aucun device, aucun simulateur.",
    },
    {
      q: "Boxed window ou étagère séparée ?",
      a: "v1.0 exporte l’étagère séparée : un fichier par dalle (outer / inner), pixels exacts. Pas de chassis, pas de fenêtre boxed.",
    },
    {
      q: "PNG ou JPEG ?",
      a: "PNG-24 par défaut (RGB, sans alpha). JPEG qualité 90 en option. Les contrôles bloquent tout écart de pixels, l’alpha et les espaces non RGB.",
    },
    {
      q: "Combien d’images dans un set ?",
      a: "1 à 10. Un avertissement sous 3 visuels. Une seule orientation par set.",
    },
  ],
  en: [
    {
      q: "What sizes for iPhone Duo?",
      a: "Outer 5.4″: 1398×2034 (portrait) and 2034×1398 (landscape). Inner 7.6″: 2007×2853 and 2853×2007. Optional 6.9″ (Indie/Studio): 1320×2868, 1290×2796, 1260×2736 and their landscapes.",
    },
    {
      q: "Do I need a physical iPhone Duo?",
      a: "No. DuoShot composes from your PNG/JPEG files. No device, no simulator.",
    },
    {
      q: "Boxed window or separate shelf?",
      a: "v1.0 exports a separate shelf: one file per display (outer / inner), exact pixels. No chassis, no boxed window.",
    },
    {
      q: "PNG or JPEG?",
      a: "PNG-24 by default (RGB, no alpha). JPEG quality 90 optional. Blocking checks reject wrong pixels, alpha, and non-RGB color.",
    },
    {
      q: "How many images in a set?",
      a: "1 to 10. A warning under 3 visuals. One orientation per set.",
    },
  ],
};
