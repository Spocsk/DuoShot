import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getMessages } from "@/lib/i18n";
import { localePrefix } from "@/lib/site";
import { CookiesContent, MentionsContent, PrivacyContent, TermsContent, SubprocessorsContent } from "./legal-pages";

describe.each(["fr", "en"] as const)("%s legal pages", (locale) => {
  const prefix = localePrefix(locale);
  it("renders the registered publisher details without registration placeholders", () => {
    const html = renderToStaticMarkup(createElement(MentionsContent, { locale }));
    expect(html).toContain("COUTO DE OLIVEIRA Dylan");
    expect(html).toMatch(/SIREN\s*: 909 361 362\s*;/);
    expect(html).toMatch(/SIRET \((?:siège|registered office)\)\s*: 909 361 362 00033/);
    expect(html).toContain("Appartement A, 46 impasse de l&#x27;Ancien Pressoir, 50400 Yquelon, France");
    expect(html).toContain("01/01/2022");
    expect(html).toContain("RNE");
    expect(html).toContain("RCS");
    expect(html).toContain("62.01Z");
    expect(html).toContain("FR32909361362");
    expect(html).toContain("293 B");
    expect(html).toContain(`href="${prefix}/account"`);
    expect(html).not.toMatch(/en attend(?:ant|te)|pending|will be completed|seront complétés/i);

    const legalCopy = Object.entries(getMessages(locale))
      .filter(([key]) => key.startsWith("legal_"))
      .map(([, value]) => value).join(" ");
    expect(legalCopy).not.toMatch(/en attend(?:ant|te)|pending|will be completed|seront complétés/i);
  });

  it("preserves legal links, inline cookie names and interpolated plan prices", () => {
    const cookies = renderToStaticMarkup(createElement(CookiesContent, { locale }));
    expect(cookies).toContain("<code>duoshot_locale_manual</code>");
    expect(cookies).toContain("<code>Accept-Language</code>");
    expect(cookies).toContain(`href="${prefix}/privacy"`);
    const privacy = renderToStaticMarkup(createElement(PrivacyContent, { locale }));
    expect(privacy).toContain(`href="${prefix}/legal/subprocessors"`);
    expect(privacy).toContain(`href="${prefix}/account"`);
    const terms = renderToStaticMarkup(createElement(TermsContent, { locale }));
    expect(terms).toContain(`href="${prefix}/privacy"`);
    expect(terms).toContain(locale === "fr" ? "12 €/mois" : "€12/month");
    expect(terms).toContain(locale === "fr" ? "TVA non applicable, art. 293 B du CGI" : "VAT not applicable");
    for (const content of [cookies, privacy, terms, renderToStaticMarkup(createElement(SubprocessorsContent, { locale }))]) {
      expect(content).not.toMatch(/\{\w+\}|legal_[a-z_]+|&lt;(?:account|privacy|subprocessors|code)&gt;/);
    }
  });
});
