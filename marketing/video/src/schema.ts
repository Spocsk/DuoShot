import { z } from "zod";

export const platforms = ["tiktok", "instagram", "youtube"] as const;
export const PlatformSchema = z.enum(platforms);
export type Platform = z.infer<typeof PlatformSchema>;

// Restrict captures to the package public directory, including on Windows.
export const CaptureSchema = z.string().min(1).refine((ref) => {
  if (ref.startsWith("harbor:")) return /^harbor:(en|fr):[1-3]:(outer|inner|classic)$/.test(ref);
  return !ref.startsWith("/") && !/[\\:?#\x00]/.test(ref)
    && ref.split("/").every((part) => part !== ".." && part !== "." && part.length > 0);
}, "Capture attendue : harbor:<en|fr>:<1..3>:<outer|inner|classic> ou chemin relatif au dossier public.");

const visible = z.string().trim().min(1, "Le texte visible ne peut pas être vide.");
const base = { durationSec: z.number().finite().min(0.5, "Chaque scène doit durer au moins 0,5 s."), text: visible.optional() };
export const SceneSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("title"), text: visible, subtitle: visible.optional(), theme: z.enum(["dark", "light"]).default("dark") }),
  z.object({ ...base, type: z.literal("outer"), capture: CaptureSchema }),
  z.object({ ...base, type: z.literal("inner"), capture: CaptureSchema }),
  z.object({ ...base, type: z.literal("classic"), capture: CaptureSchema }),
  z.object({ ...base, type: z.literal("outer-to-inner"), outer: CaptureSchema, inner: CaptureSchema }),
  z.object({ ...base, type: z.literal("side-by-side"), outer: CaptureSchema, inner: CaptureSchema }),
  z.object({ ...base, type: z.literal("before-after"), before: CaptureSchema, after: CaptureSchema, beforeLabel: visible.optional(), afterLabel: visible.optional() }),
  z.object({ ...base, type: z.literal("reframe"), classic: CaptureSchema, outer: CaptureSchema, inner: CaptureSchema }),
  z.object({ ...base, type: z.literal("zip"), files: z.array(z.object({ name: visible, format: z.enum(["png", "jpeg"]), dims: visible.optional() })).min(1).max(8) }),
  z.object({ ...base, type: z.literal("end"), text: visible, logo: z.boolean().default(true) }),
]);
export type Scene = z.infer<typeof SceneSchema>;

const editorialRules: [RegExp, string][] = [
  [/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)?\s*(?:-\s*)?(?:[″“”„"]|''|in(?:ch(?:es)?)?\b|pouces?\b|po\b)/iu, "Les diagonales d’écran sont interdites ; utilisez les dimensions en pixels."],
  [/(?<![\p{L}\p{N}_])(?:required|requis(?:e|es)?|exigé(?:e)?s?|obligatoires?|mandatory)(?![\p{L}\p{N}_])/iu, "Utilisez accepted / acceptées pour les tailles."],
  [/(?<!\p{L})(?:promo|coupon|discount|rabais|réduction|remise)(?!\p{L})/iu, "Les codes promotionnels sont interdits."],
  [/\b(?:PRODUCTHUNT|FAZIER)\b/u, "Les codes promotionnels sont interdits."],
  [/\d+(?:[.,]\d+)?\s*%/u, "Les pourcentages sont interdits."],
];

function hasPromoCode(value: string): boolean {
  return [...value.matchAll(/\bcode\s+([\p{L}\p{N}_-]+)/giu)].some(([, code]) =>
    !/^(?:PNG|JPEG|JPG|HEIC|ZIP)$/iu.test(code)
    && (/\d/u.test(code) || /^\p{Lu}{4,}$/u.test(code)));
}

function promisesAscDelivery(value: string): boolean {
  // Keep explicit negation local to its action: "No upload …, send …" still fails.
  // Punctuation between fields must not hide a promise spread over headline/labels.
  if (!/(?:app\s+store\s+connect|\basc\b)/iu.test(value)) return false;
  const actions = /\b(?:upload(?:s|ed|ing)?|send(?:s|ing)?|push(?:es|ed|ing)?|submit(?:s|ted|ting)?|transfer(?:s|red|ring)?|deliver(?:s|ed|ing)?|export(?:s|ed|ing)?\s+to|envoi|envois|envoyer|envoyez|envoie|envoient|transférer|transférez|transfert|téléverser|téléversez|téléversement|publier|publiez)\b/giu;
  return [...value.matchAll(actions)].some((match) => {
    const before = value.slice(0, match.index);
    const after = value.slice(match.index + match[0].length);
    return !/(?:\bno|\bnot|\bnever|\bwithout|\bpas|\baucun(?:e)?|\bsans|\bjamais)\s*(?:(?:d['’]|de\s+)|(?:automatic(?:ally)?|direct(?:ly)?)\s+)?$/iu.test(before)
      && !/^\s+(?:pas|jamais)\b/iu.test(after);
  });
}

const tutoiement = /(?<![\p{L}\p{N}_])(?:(?:tu|toi|ton|ta|tes)(?![\p{L}\p{N}_])|t['’])/iu;
const singularImperative = /(?:^|[.!?…\n]\s*)[\s«“"'’–—-]*(?:télécharge|choisis|essaie|essaye|importe|exporte|prépare|crée|ajoute|découvre|regarde|teste|ouvre|glisse|dépose|clique|va|fais|prends|mets|vois)(?![\p{L}\p{N}_])/iu;

function validEndUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return value.startsWith("https://duoshot.site/") && url.origin === "https://duoshot.site"
      && url.searchParams.getAll("utm_source").length === 1
      && url.searchParams.get("utm_source") === "{platform}"
      && url.searchParams.get("utm_medium") === "social"
      && Boolean(url.searchParams.get("utm_campaign")?.trim());
  } catch { return false; }
}

export const ScriptSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "L’id doit être en kebab-case."),
  title: visible.optional(),
  lang: z.enum(["fr", "en"]),
  durationSec: z.number().finite().min(15).max(30),
  endUrl: z.string().refine(validEndUrl, "URL attendue : https://duoshot.site/… avec utm_source={platform}, utm_medium=social et utm_campaign non vide."),
  scenes: z.array(SceneSchema).min(1).max(12),
}).superRefine((script, ctx) => {
  const total = script.scenes.reduce((sum, scene) => sum + scene.durationSec, 0);
  if (Math.abs(total - script.durationSec) > 0.010000001) {
    ctx.addIssue({ code: "custom", path: ["scenes"], message: `Somme des scènes ${total} s ≠ durée ${script.durationSec} s (tolérance 0,01 s).` });
  }
  const texts: { value: string; path: (string | number)[] }[] = [];
  if (script.title) texts.push({ value: script.title, path: ["title"] });
  script.scenes.forEach((scene, index) => {
    const sceneTexts: { value: string; path: (string | number)[] }[] = [];
    for (const field of ["text", "subtitle", "beforeLabel", "afterLabel"] as const) {
      if (field in scene) {
        const value = (scene as unknown as Record<string, unknown>)[field];
        if (typeof value === "string") sceneTexts.push({ value, path: ["scenes", index, field] });
      }
    }
    if (scene.type === "zip") scene.files.forEach((file, i) => {
      texts.push({ value: file.name, path: ["scenes", index, "files", i, "name"] });
      if (file.dims) texts.push({ value: file.dims, path: ["scenes", index, "files", i, "dims"] });
    });
    texts.push(...sceneTexts);
    if (promisesAscDelivery(sceneTexts.map(({ value }) => value).join(" "))) {
      for (const { path } of sceneTexts) ctx.addIssue({ code: "custom", path, message: "Aucune promesse d’envoi vers App Store Connect / ASC." });
    }
    // Catch accidental use of a known Harbor size in the wrong scene slot.
    for (const [field, expected] of Object.entries(scene.type === "outer" || scene.type === "inner" || scene.type === "classic"
      ? { capture: scene.type } : { outer: "outer", inner: "inner", classic: "classic" })) {
      const ref = (scene as unknown as Record<string, unknown>)[field];
      if (typeof ref === "string" && ref.startsWith("harbor:") && !ref.endsWith(`:${expected}`)) {
        ctx.addIssue({ code: "custom", path: ["scenes", index, field], message: `Cette scène attend une capture ${expected}.` });
      }
    }
  });
  for (const { value, path } of texts) {
    for (const [pattern, message] of editorialRules) {
      if (pattern.test(value)) ctx.addIssue({ code: "custom", path, message });
    }
    if (hasPromoCode(value)) ctx.addIssue({ code: "custom", path, message: "Les codes promotionnels sont interdits." });
    // Titles and ZIP metadata are also visible copy; scene prose is checked together above.
    if ((path[0] === "title" || path.includes("files")) && promisesAscDelivery(value)) {
      ctx.addIssue({ code: "custom", path, message: "Aucune promesse d’envoi vers App Store Connect / ASC." });
    }
    if (script.lang === "fr" && (tutoiement.test(value) || singularImperative.test(value))) {
      ctx.addIssue({ code: "custom", path, message: "En français, utilisez le vouvoiement." });
    }
  }
});
export type VideoScript = z.infer<typeof ScriptSchema>;

export function validateScript(json: unknown): VideoScript {
  const result = ScriptSchema.safeParse(json);
  if (!result.success) throw new Error(result.error.issues.map((issue) => `${issue.path.join(".") || "script"} : ${issue.message}`).join("\n"));
  return result.data;
}

export function resolveEndUrl(url: string, platform: Platform): string {
  PlatformSchema.parse(platform);
  if (!validEndUrl(url)) throw new Error("endUrl invalide : domaine ou paramètres UTM incorrects.");
  return url.replaceAll("{platform}", platform).replaceAll(/%7Bplatform%7D/gi, platform);
}
