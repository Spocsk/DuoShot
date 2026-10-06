import type { ReactNode } from "react";
import { getTranslator } from "@/lib/i18n";
import { PLANS } from "@/lib/plans";
import { INNER_PORTRAIT, OUTER_PORTRAIT } from "@/lib/screenshot-copy";
import { duoSpec, type Locale } from "@/lib/specs";
import { DuoPair, duoWidth } from "./duo";
import { OgFrame } from "./frame";
import { HARBOR_SCREEN, OG } from "./theme";

export type OgPage =
  | "home"
  | "specs"
  | "rejection"
  | "pricing"
  | "why-not-ai"
  | "tool"
  | "review"
  | "legal"
  | "subprocessors"
  | "terms"
  | "privacy"
  | "cookies";

type Copy = { eyebrow: string; title: string; lead?: string; alt: string };

const LEGAL = { fr: "Informations légales", en: "Legal" } as const;

/** Text of each card. Titles follow the page headings; `alt` describes the picture for screen readers. */
const COPY: Record<OgPage, Record<Locale, Copy>> = {
  home: {
    fr: { eyebrow: "iPhone Duo · App Store Connect", title: "Captures iPhone Duo.\nAux dimensions App Store.", alt: `DuoShot : captures iPhone Duo aux dimensions App Store, ${OUTER_PORTRAIT} et ${INNER_PORTRAIT} px.` },
    en: { eyebrow: "iPhone Duo · App Store Connect", title: "iPhone Duo screenshots.\nExact App Store sizes.", alt: `DuoShot: iPhone Duo screenshots at exact App Store sizes, ${OUTER_PORTRAIT} and ${INNER_PORTRAIT} px.` },
  },
  specs: {
    fr: { eyebrow: "Dimensions", title: "Tailles des captures iPhone Duo", lead: "Portrait, PNG ou JPEG opaque.", alt: `Tailles des captures iPhone Duo : écran fermé ${OUTER_PORTRAIT} px, écran ouvert ${INNER_PORTRAIT} px.` },
    en: { eyebrow: "Dimensions", title: "iPhone Duo screenshot sizes", lead: "Portrait, opaque PNG or JPEG.", alt: `iPhone Duo screenshot sizes: closed display ${OUTER_PORTRAIT} px, open display ${INNER_PORTRAIT} px.` },
  },
  rejection: {
    fr: { eyebrow: "Points à vérifier", title: "Captures refusées ? Dimensions et canal alpha.", alt: "Bilan de préparation DuoShot : dimensions vérifiées, canal alpha aplati, PNG opaque." },
    en: { eyebrow: "Checks", title: "Screenshots rejected? Dimensions and alpha.", alt: "DuoShot preparation report: dimensions checked, alpha channel flattened, opaque PNG." },
  },
  pricing: {
    fr: { eyebrow: "Tarifs", title: "Essai, Indie, Studio.", lead: "Commencez sans carte. Deux exports HD offerts.", alt: `Tarifs DuoShot : essai gratuit, Indie ${PLANS.indie.monthlyEur} € par mois, Studio ${PLANS.studio.monthlyEur} € par mois.` },
    en: { eyebrow: "Pricing", title: "Trial, Indie, Studio.", lead: "Start without a card. Two HD exports included.", alt: `DuoShot pricing: free trial, Indie €${PLANS.indie.monthlyEur} per month, Studio €${PLANS.studio.monthlyEur} per month.` },
  },
  "why-not-ai": {
    fr: { eyebrow: "Pourquoi DuoShot", title: "Votre IA redimensionne. Connect veut plus.", alt: "Comparaison : une IA redimensionne, DuoShot aplatit l’alpha, masque la charnière, évalue le risque 2.3.3 et prépare le ZIP." },
    en: { eyebrow: "Why DuoShot", title: "Your AI resizes. Connect wants more.", alt: "Comparison: an AI resizes, DuoShot flattens alpha, masks the hinge, scores the 2.3.3 risk and packs the ZIP." },
  },
  tool: {
    fr: { eyebrow: "Outil", title: "Composez vos captures Duo.", lead: "Import, double aperçu, ZIP.", alt: "L’outil DuoShot : captures iPhone Duo fermé et ouvert." },
    en: { eyebrow: "Tool", title: "Compose your Duo screenshots.", lead: "Drop, dual preview, ZIP.", alt: "The DuoShot tool: closed and open iPhone Duo screenshots." },
  },
  review: {
    fr: { eyebrow: "Validation client · Studio", title: "Captures à valider avant le dépôt.", alt: "Lien de validation DuoShot : captures iPhone Duo à valider." },
    en: { eyebrow: "Client review · Studio", title: "Screenshots to approve before upload.", alt: "DuoShot review link: iPhone Duo screenshots to approve." },
  },
  legal: {
    fr: { eyebrow: LEGAL.fr, title: "Mentions légales", alt: "DuoShot : mentions légales." },
    en: { eyebrow: LEGAL.en, title: "Legal notice", alt: "DuoShot: legal notice." },
  },
  subprocessors: {
    fr: { eyebrow: LEGAL.fr, title: "Sous-traitants", alt: "DuoShot : liste des sous-traitants." },
    en: { eyebrow: LEGAL.en, title: "Sub-processors", alt: "DuoShot: sub-processor list." },
  },
  terms: {
    fr: { eyebrow: LEGAL.fr, title: "Conditions générales", alt: "DuoShot : conditions générales." },
    en: { eyebrow: LEGAL.en, title: "Terms", alt: "DuoShot: terms." },
  },
  privacy: {
    fr: { eyebrow: LEGAL.fr, title: "Confidentialité", alt: "DuoShot : politique de confidentialité." },
    en: { eyebrow: LEGAL.en, title: "Privacy", alt: "DuoShot: privacy policy." },
  },
  cookies: {
    fr: { eyebrow: LEGAL.fr, title: "Cookies", alt: "DuoShot : cookies." },
    en: { eyebrow: LEGAL.en, title: "Cookies", alt: "DuoShot: cookies." },
  },
};

export function ogAlt(page: OgPage, locale: Locale): string {
  return COPY[page][locale].alt;
}

const mono = { fontFamily: "Plex Mono", fontWeight: 500 } as const;
const cardShadow = "0 30px 60px -24px rgba(20, 39, 46, 0.28), 0 4px 14px rgba(20, 39, 46, 0.06)";

function Check({ size = 26, tone = "ok" }: { size?: number; tone?: "ok" | "warn" | "off" }) {
  const fill = tone === "ok" ? OG.okSoft : tone === "warn" ? OG.reviewSoft : OG.mist;
  const stroke = tone === "ok" ? OG.ok : tone === "warn" ? OG.warning : OG.lineStrong;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="12" fill={fill} />
      {tone === "ok" ? <path d="M7 12.4l3.2 3.1L17 8.8" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" /> : null}
      {tone === "warn" ? <path d="M12 6.8v6.4M12 16.6v.4" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" fill="none" /> : null}
      {tone === "off" ? <path d="M8 12h8" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" fill="none" /> : null}
    </svg>
  );
}

/** The hero pair bottom right; the two export sizes stand in the left column under the title. */
function HomeArt({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const h = 284;
  const gap = 20;
  const size = (caption: string, value: string) => (
    <div style={{ display: "flex", flexDirection: "column", paddingLeft: 18, borderLeft: `2px solid ${OG.seaLine}` }}>
      <div style={{ display: "flex", fontSize: 18, fontWeight: 500, color: OG.muted }}>{caption}</div>
      <div style={{ display: "flex", alignItems: "baseline", marginTop: 4, ...mono, fontSize: 26, color: OG.ink }}>
        {value}
        <span style={{ marginLeft: 8, fontSize: 19, color: OG.muted }}>px</span>
      </div>
    </div>
  );
  return (
    <>
      <div style={{ position: "absolute", left: 72, top: 296, display: "flex", flexDirection: "column", gap: 22 }}>
        {size(t("closed_caption"), OUTER_PORTRAIT)}
        {size(t("open_caption"), INNER_PORTRAIT)}
      </div>
      <div style={{ position: "absolute", left: 1200 - 64 - duoWidth(h, gap), top: 288, display: "flex" }}>
        <DuoPair locale={locale} h={h} gap={gap} />
      </div>
    </>
  );
}

/** Both exported files drawn to scale, with blueprint-style dimension lines. */
function SpecsArt({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  const outer = duoSpec("duo-outer", "portrait");
  const inner = duoSpec("duo-inner", "portrait");
  const scale = 372 / inner.height;
  const file = (spec: { width: number; height: number }, caption: string) => {
    const w = Math.round(spec.width * scale);
    const h = Math.round(spec.height * scale);
    return (
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", flexDirection: "column", width: w, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "center", ...mono, fontSize: 20, color: OG.sea }}>{spec.width}</div>
          <div style={{ display: "flex", height: 10, marginTop: 6, borderLeft: `1.5px solid ${OG.sea}`, borderRight: `1.5px solid ${OG.sea}`, alignItems: "center" }}>
            <div style={{ width: "100%", height: 1.5, background: OG.sea, opacity: 0.6 }} />
          </div>
        </div>
        <div style={{ display: "flex" }}>
          <div
            style={{
              display: "flex",
              width: w,
              height: h,
              backgroundImage: HARBOR_SCREEN,
              borderRadius: 6,
              boxShadow: `${cardShadow}, 0 0 0 1px rgba(23, 33, 38, 0.08)`,
            }}
          />
          <div style={{ display: "flex", alignItems: "center", marginLeft: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 10, height: h, borderTop: `1.5px solid ${OG.sea}`, borderBottom: `1.5px solid ${OG.sea}` }}>
              <div style={{ width: 1.5, height: "100%", background: OG.sea, opacity: 0.6 }} />
            </div>
            <div style={{ display: "flex", marginLeft: 8, ...mono, fontSize: 20, color: OG.sea }}>{spec.height}</div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 16, fontSize: 17, fontWeight: 600, color: OG.muted, letterSpacing: "0.06em" }}>{caption.toUpperCase()}</div>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", right: 72, bottom: 64, display: "flex", alignItems: "flex-end", gap: 34 }}>
      {file(outer, t("closed_caption"))}
      {file(inner, t("open_caption"))}
    </div>
  );
}

/** The preparation report the tool shows before an upload. */
function RejectionArt({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const rows: { label: string; value: string; tone: "ok" | "warn" }[] = [
    { label: fr ? "Écran fermé" : "Closed display", value: `${OUTER_PORTRAIT} px`, tone: "ok" },
    { label: fr ? "Écran ouvert" : "Open display", value: `${INNER_PORTRAIT} px`, tone: "ok" },
    { label: fr ? "Canal alpha" : "Alpha channel", value: fr ? "Aplati à l’export" : "Flattened on export", tone: "warn" },
    { label: "Format", value: fr ? "PNG RGB opaque" : "Opaque RGB PNG", tone: "ok" },
  ];
  return (
    <div
      style={{
        position: "absolute",
        right: 72,
        top: 132,
        width: 488,
        display: "flex",
        flexDirection: "column",
        padding: "28px 30px 14px",
        borderRadius: 26,
        background: OG.surface,
        border: `1px solid ${OG.line}`,
        boxShadow: cardShadow,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em" }}>{fr ? "Bilan avant dépôt" : "Pre-upload report"}</div>
        <div style={{ display: "flex", padding: "6px 14px", borderRadius: 999, background: OG.okSoft, color: OG.ok, fontSize: 17, fontWeight: 600 }}>
          {fr ? "Prêt" : "Ready"}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 14 }}>
        {rows.map((row, i) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "17px 0",
              borderTop: i === 0 ? "none" : `1px solid ${OG.mist}`,
            }}
          >
            <Check tone={row.tone} />
            <div style={{ display: "flex", flex: 1, fontSize: 21, fontWeight: 500, color: OG.muted }}>{row.label}</div>
            <div style={{ display: "flex", ...(row.tone === "ok" && row.value.includes("×") ? mono : { fontWeight: 600 }), fontSize: 20, color: row.tone === "warn" ? OG.warning : OG.ink }}>
              {row.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PricingArt({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const per = fr ? "/ mois" : "/ month";
  const price = (eur: number) => (fr ? `${eur} €` : `€${eur}`);
  const plans = [
    { name: fr ? "Essai" : "Trial", price: price(0), note: fr ? "2 ZIP HD, sans carte" : "2 HD ZIPs, no card", period: "" },
    { name: "Indie", price: price(PLANS.indie.monthlyEur), note: fr ? `${PLANS.indie.dailyHdSets} sets HD par jour` : `${PLANS.indie.dailyHdSets} HD sets a day`, period: per, featured: true },
    { name: "Studio", price: price(PLANS.studio.monthlyEur), note: fr ? `${PLANS.studio.seats} sièges, validation client` : `${PLANS.studio.seats} seats, client review`, period: per },
  ];
  return (
    <div style={{ position: "absolute", right: 72, top: 128, width: 476, display: "flex", flexDirection: "column", gap: 16 }}>
      {plans.map((plan) => (
        <div
          key={plan.name}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "22px 28px",
            borderRadius: 24,
            background: OG.surface,
            border: plan.featured ? `2px solid ${OG.sea}` : `1px solid ${OG.line}`,
            boxShadow: plan.featured ? cardShadow : "0 10px 30px -18px rgba(20, 39, 46, 0.2)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", fontSize: 27, fontWeight: 700, letterSpacing: "-0.03em" }}>{plan.name}</div>
              {plan.featured ? (
                <div style={{ display: "flex", padding: "4px 11px", borderRadius: 8, background: OG.sea, color: OG.surface, fontSize: 14, fontWeight: 600 }}>
                  {fr ? "Recommandé" : "Recommended"}
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", marginTop: 6, fontSize: 17, fontWeight: 500, color: OG.muted }}>{plan.note}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 700, letterSpacing: "-0.04em" }}>{plan.price}</div>
            {plan.period ? <div style={{ display: "flex", fontSize: 17, fontWeight: 500, color: OG.muted }}>{plan.period}</div> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function WhyNotAiArt({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  const rows: [string, boolean][] = fr
    ? [["Redimensionner", true], ["Aplatir l’alpha", false], ["Masquer la charnière", false], ["Évaluer le risque 2.3.3", false], ["ZIP pour Connect", false]]
    : [["Resize", true], ["Flatten alpha", false], ["Mask the hinge", false], ["Score the 2.3.3 risk", false], ["ZIP for Connect", false]];
  const col = 106;
  return (
    <div
      style={{
        position: "absolute",
        right: 72,
        top: 140,
        width: 528,
        display: "flex",
        flexDirection: "column",
        padding: "10px 0 8px",
        borderRadius: 26,
        background: OG.surface,
        border: `1px solid ${OG.line}`,
        boxShadow: cardShadow,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", padding: "16px 28px 12px" }}>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", width: col, justifyContent: "center", fontSize: 18, fontWeight: 600, color: OG.muted }}>{fr ? "Votre IA" : "Your AI"}</div>
        <div style={{ display: "flex", width: col, justifyContent: "center", fontSize: 18, fontWeight: 700, color: OG.sea }}>DuoShot</div>
      </div>
      {rows.map(([label, ai]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", padding: "14px 28px", borderTop: `1px solid ${OG.mist}` }}>
          <div style={{ display: "flex", flex: 1, fontSize: 21, fontWeight: 500 }}>{label}</div>
          <div style={{ display: "flex", width: col, justifyContent: "center" }}>
            <Check tone={ai ? "ok" : "off"} />
          </div>
          <div style={{ display: "flex", width: col, justifyContent: "center" }}>
            <Check tone="ok" />
          </div>
        </div>
      ))}
      {/* DuoShot's column, outlined like the recommended plan. */}
      <div style={{ position: "absolute", top: 8, bottom: 8, right: 22, width: col + 12, borderRadius: 20, border: `2px solid ${OG.sea}`, opacity: 0.85 }} />
    </div>
  );
}

function ReviewArt({ locale }: { locale: Locale }) {
  const fr = locale === "fr";
  return (
    <div style={{ position: "absolute", left: 1200 - 60 - duoWidth(270, 19), top: 96, display: "flex", flexDirection: "column" }}>
      <DuoPair locale={locale} h={270} gap={19} />
      <div
        style={{
          position: "absolute",
          left: 70,
          top: 252,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 22px 16px 18px",
          borderRadius: 20,
          background: OG.surface,
          border: `1px solid ${OG.line}`,
          boxShadow: cardShadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 42, height: 42, borderRadius: 999, background: OG.reviewSoft, color: OG.warning, fontSize: 19, fontWeight: 700 }}>
          H
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{fr ? "Harbor · 4 captures" : "Harbor · 4 screenshots"}</div>
          <div style={{ display: "flex", marginTop: 2, fontSize: 16, fontWeight: 500, color: OG.muted }}>{fr ? "En attente de votre validation" : "Waiting for your approval"}</div>
        </div>
        <div style={{ display: "flex", marginLeft: 10, padding: "9px 16px", borderRadius: 12, background: OG.ink, color: OG.surface, fontSize: 17, fontWeight: 600 }}>
          {fr ? "Valider" : "Approve"}
        </div>
      </div>
    </div>
  );
}

/** Secondary pages: the hero pair, smaller, so every card still reads as DuoShot. */
function PairArt({ locale }: { locale: Locale }) {
  return (
    <div style={{ position: "absolute", left: 1200 - 60 - duoWidth(280, 20), top: 150, display: "flex" }}>
      <DuoPair locale={locale} h={280} gap={20} />
    </div>
  );
}

const ART: Record<OgPage, (props: { locale: Locale }) => ReactNode> = {
  home: HomeArt,
  specs: SpecsArt,
  rejection: RejectionArt,
  pricing: PricingArt,
  "why-not-ai": WhyNotAiArt,
  review: ReviewArt,
  tool: PairArt,
  legal: PairArt,
  subprocessors: PairArt,
  terms: PairArt,
  privacy: PairArt,
  cookies: PairArt,
};

export function OgCard({ page, locale }: { page: OgPage; locale: Locale }) {
  const copy = COPY[page][locale];
  const Art = ART[page];
  const narrow = ART[page] === PairArt || page === "specs" || page === "review";
  return (
    <OgFrame
      eyebrow={copy.eyebrow}
      title={copy.title}
      lead={copy.lead}
      textWidth={page === "home" ? 1056 : narrow ? 430 : 520}
      titleSize={page === "home" ? 70 : narrow ? 62 : 68}
      art={<Art locale={locale} />}
    />
  );
}
