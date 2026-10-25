import { describe, expect, it } from "vitest";
import v1 from "../scripts/v1-accepts.json";
import v2 from "../scripts/v2-real.json";
import { platforms, resolveEndUrl, validateScript } from "./schema";

const clone = () => structuredClone(v1);

describe("script schema", () => {
  it.each([v1, v2])("accepts $id", (script) => expect(validateScript(script).id).toBe(script.id));
  it.each([14.9, 30.1])("rejects duration %s", (durationSec) => expect(() => validateScript({ ...v1, durationSec })).toThrow("durationSec"));
  it("rejects mismatched durations", () => expect(() => validateScript({ ...v1, durationSec: 19 })).toThrow("Somme"));
  it("allows a difference below 0.01 s", () => expect(validateScript({ ...v1, durationSec: 18.009 }).durationSec).toBe(18.009));
  it("rejects unknown scenes", () => expect(() => validateScript({ ...v1, scenes: [{ type: "unknown", durationSec: 18 }] })).toThrow("scenes.0.type"));
  it.each([
    "https://duoshot.site/en?utm_medium=social&utm_campaign=launch",
    v1.endUrl.replace("{platform}", "tiktok"),
    v1.endUrl.replace("duoshot.site", "evil.example"),
    v1.endUrl.replace("duoshot.site", "duoshot.site.evil.example"),
    v1.endUrl.replace("https:", "http:"),
    v1.endUrl.replace("utm_medium=social", "utm_medium=email"),
    v1.endUrl.replace("utm_campaign=duo-launch-oct23", "utm_campaign="),
  ])("rejects invalid URL %s", (endUrl) => expect(() => validateScript({ ...v1, endUrl })).toThrow("endUrl"));

  it.each([
    "5,4″", '5.4"', "5.4”", "7,6″", "7.6 in", "6,9 pouces", "5.4-inch", "5.4''", "6,9 po", "5,4 po", '6"', "6″", "6 inches", "6-inch",
    "required", "Required", "requis", "exigé", "exigées", "obligatoires", "mandatory",
    "upload to App Store Connect", "Send to ASC", "App Store Connect : téléverser", "envoyer vers ASC",
    "code PRODUCTHUNT", "PRODUCTHUNT", "promo", "coupon", "FAZIER", "code LAUNCH", "CODE LAUNCH", "code launch23", "code 1234", "discount", "rabais", "réduction", "remise", "-30 %", "30% off", "30 % de réduction", "30 %", "30%",
  ])("rejects editorial copy: %s", (text) => {
    const script = clone(); script.scenes[0].text = text;
    expect(() => validateScript(script)).toThrow("scenes.0.text");
  });
  it.each(["tu", "toi", "ton", "ta", "tes", "t'aider", "T’offrir"]) ("rejects French tutoiement: %s", (text) => {
    expect(() => validateScript({ ...v1, lang: "fr", title: text })).toThrow("vouvoiement");
  });
  it.each(["télécharge", "choisis", "essaie", "essaye", "importe", "exporte", "prépare", "crée", "ajoute", "découvre", "regarde", "teste", "ouvre", "glisse", "dépose", "clique", "va", "fais", "prends", "mets", "vois"])("rejects singular imperative %s at sentence starts", (verb) => {
    for (const title of [verb, `${verb[0].toUpperCase()}${verb.slice(1)} vos captures`, `Vos captures. ${verb} maintenant`, `Vos captures ! « ${verb} »`, `Vos captures\n${verb}`]) {
      expect(() => validateScript({ ...v1, lang: "fr", title })).toThrow("vouvoiement");
    }
  });
  it.each(["Je télécharge", "Téléchargez", "Choisissez", "Je choisis", "Vous créez", "Je vois vos captures"])("allows French copy: %s", (title) => {
    expect(validateScript({ ...v1, lang: "fr", title }).title).toBe(title);
  });
  it.each(["1398×2034", "2007 × 2853", "up to 10 per size", "Product Hunt", "producthunt", "fazier", "code PNG", "code JPEG", "code JPG", "code HEIC", "code ZIP", "code source", "code APP"])("allows editorial copy: %s", (title) => {
    expect(validateScript({ ...v1, title }).title).toBe(title);
  });
  it.each(["upload", "send", "push", "submit", "transfer", "deliver", "export to", "envoi", "envoyer", "envoyez", "transférer", "transférez", "téléverser", "publier", "publiez"])("checks delivery action across scene fields: %s", (action) => {
    expect(() => validateScript({ ...v1, scenes: [{ type: "title", durationSec: 18, text: action, subtitle: "App Store Connect" }] })).toThrow(/scenes\.0\.text[\s\S]*scenes\.0\.subtitle/);
    expect(() => validateScript({ ...v1, scenes: [{ type: "before-after", durationSec: 18, before: "a.png", after: "b.png", text: "ASC", beforeLabel: "Your captures", afterLabel: action }] })).toThrow("scenes.0.afterLabel");
  });
  it.each(["No upload to App Store Connect", "pas d'envoi vers App Store Connect", "Pas d’envoi vers ASC", "Do not send to ASC", "Never push to ASC", "Sans transfert vers ASC", "N’envoyez pas vers ASC", "Ne publiez jamais sur App Store Connect"])("allows explicit delivery negation: %s", (text) => {
    expect(validateScript({ ...v1, scenes: [{ type: "title", durationSec: 18, text }] }).scenes[0].text).toBe(text);
  });
  it("handles negation across scene fields", () => {
    expect(() => validateScript({ ...v1, scenes: [{ type: "title", durationSec: 18, text: "No upload to", subtitle: "App Store Connect" }] })).not.toThrow();
  });
  it("checks actions and targets across fields even when separated by punctuation", () => {
    expect(() => validateScript({ ...v1, scenes: [{ type: "title", durationSec: 18, text: "Upload your captures.", subtitle: "App Store Connect" }] })).toThrow("promesse");
    expect(() => validateScript({ ...v1, scenes: [{ type: "title", durationSec: 18, text: "No upload.", subtitle: "App Store Connect" }] })).not.toThrow();
  });
  it.each(["No AI. Upload to ASC", "No upload to ASC, send to ASC", "Not required. Deliver to ASC"])("does not let unrelated negation hide a delivery: %s", (text) => {
    expect(() => validateScript({ ...v1, scenes: [{ type: "title", durationSec: 18, text }] })).toThrow("promesse");
  });
  it("does not combine unrelated scenes for delivery promises", () => {
    expect(() => validateScript({ ...v1, scenes: [{ type: "title", durationSec: 9, text: "Export your files" }, { type: "title", durationSec: 9, text: "App Store Connect" }] })).not.toThrow();
  });
  it.each([0, 0.001, 0.499])("rejects scenes shorter than 0.5 s: %s", (durationSec) => {
    expect(() => validateScript({ ...v1, scenes: [{ type: "title", text: "Accepted sizes", durationSec }, { type: "end", text: "duoshot.site", durationSec: 18 - durationSec }] })).toThrow("scenes.0.durationSec : Chaque scène doit durer au moins 0,5 s.");
  });
  it("allows French vouvoiement and whole-word substrings", () => {
    expect(validateScript({ ...v1, lang: "fr", title: "Vos captures acceptées · station · total" }).lang).toBe("fr");
  });
  it("checks every visible text field and lists all paths", () => {
    expect(() => validateScript({ ...v2, title: "required", scenes: [
      { type: "title", durationSec: 5, text: "Accepted sizes", subtitle: "5,4″" },
      { type: "before-after", durationSec: 5, before: "a.png", after: "b.png", beforeLabel: "coupon", afterLabel: "mandatory" },
      { type: "zip", durationSec: 10, files: [{ name: "PRODUCTHUNT.png", format: "png", dims: "5.4-inch" }] },
    ] })).toThrow(/title[\s\S]*scenes\.0\.subtitle[\s\S]*scenes\.1\.beforeLabel[\s\S]*scenes\.1\.afterLabel[\s\S]*scenes\.2\.files\.0\.name[\s\S]*scenes\.2\.files\.0\.dims/);
  });
  it("rejects mismatched Harbor sizes", () => expect(() => validateScript({ ...v1, scenes: [{ type: "outer", capture: "harbor:en:1:classic", durationSec: 18 }] })).toThrow("capture outer"));
  it.each(["../secret.png", "/tmp/a.png", "https://example.com/a.png", "a/../b.png", "a\\b.png", "harbor:en:4:outer"])("rejects capture outside public: %s", (capture) => {
    expect(() => validateScript({ ...v1, scenes: [{ type: "outer", capture, durationSec: 18 }] })).toThrow("capture");
  });
});

describe("resolveEndUrl", () => {
  it.each(platforms)("resolves %s", (platform) => {
    const url = new URL(resolveEndUrl(v1.endUrl, platform));
    expect(url.searchParams.get("utm_source")).toBe(platform);
    expect(url.searchParams.get("utm_campaign")).toBe("duo-launch-oct23");
    expect(url.searchParams.get("utm_content")).toBe("v1-accepts");
  });
});
