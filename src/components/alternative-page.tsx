import Link from "next/link";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { FaqList } from "@/components/faq-list";
import { Button } from "@/components/ui/button";
import { JsonLd } from "@/lib/json-ld";
import { alternativePath, type AlternativeView } from "@/lib/alternatives";
import { comparisonPath } from "@/lib/comparisons";
import { localizedPath, toolPath } from "@/lib/site";
import type { Locale } from "@/lib/specs";

export function AlternativePage({ locale, data }: { locale: Locale; data: AlternativeView }) {
  const path = alternativePath(data.slug);
  return <div className="flex min-h-full flex-col">
    <JsonLd
      locale={locale}
      path={path}
      faq={data.faq}
      breadcrumb={data.breadcrumb}
      article={{ title: data.title, description: data.description, dateModified: data.dateModified, abstract: data.answer }}
    />
    <SiteHeader locale={locale} path={path} />
    <main id="main" className="mx-auto w-full max-w-4xl px-5 py-12">
      <nav aria-label="Breadcrumb" className="text-sm text-[var(--muted)]">
        <ol className="flex flex-wrap gap-2">
          {data.breadcrumb.map((crumb, index) => {
            const last = index === data.breadcrumb.length - 1;
            return <li key={crumb.path} className="flex items-center gap-2">
              {index > 0 && <span aria-hidden="true">/</span>}
              {last
                ? <span aria-current="page">{crumb.name}</span>
                : <Link href={localizedPath(locale, crumb.path)} className="ds-link">{crumb.name}</Link>}
            </li>;
          })}
        </ol>
      </nav>
      <p className="ds-label mt-4">{data.updatedLabel}</p>
      <h1 className="font-display mt-3 text-4xl sm:text-5xl">{data.title}</h1>
      <p className="mt-4 text-lg">{data.answer}</p>

      <section className="mt-10" aria-labelledby="alt-table">
        <h2 id="alt-table" className="font-display text-3xl">
          {locale === "fr" ? `Comparatif : DuoShot et ${data.name}` : `Comparison: DuoShot and ${data.name}`}
        </h2>
        <div className="mt-6 overflow-x-auto" role="region" aria-label={data.tableCaption} tabIndex={0}>
          <table className="w-full text-left text-sm">
            <thead className="ds-spec-head">
              <tr>
                <th scope="col" className="p-3 font-medium">{data.columns.label}</th>
                <th scope="col" className="p-3 font-medium">{data.columns.duoshot}</th>
                <th scope="col" className="p-3 font-medium">{data.columns.competitor}</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.label} className="border-t border-[var(--line)]">
                  <th scope="row" className="p-3 font-medium">{row.label}</th>
                  <td className="min-w-44 p-3 align-top">{row.duoshot}</td>
                  <td className="min-w-44 p-3 align-top">{row.competitor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-[var(--muted)]">
          {locale === "fr" ? "Sources : " : "Sources: "}
          {data.sources.map((source, index) => (
            <span key={source}>
              {index > 0 ? ", " : ""}
              <a href={source} className="ds-link">{source}</a>
            </span>
          ))}
          {" — "}
          {data.updatedLabel}
        </p>
      </section>

      <section className="mt-10" aria-labelledby="alt-strengths">
        <h2 id="alt-strengths" className="font-display text-3xl">{data.strengthsHeading}</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5">
          {data.strengths.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>

      <section className="mt-10" aria-labelledby="alt-when">
        <h2 id="alt-when" className="font-display text-3xl">{data.whenToChooseHeading}</h2>
        <p className="mt-4 max-w-3xl leading-relaxed">{data.whenToChoose}</p>
      </section>

      <section className="mt-10" aria-labelledby="alt-faq">
        <h2 id="alt-faq" className="font-display text-3xl">{data.faqHeading}</h2>
        <FaqList items={[...data.faq]} />
      </section>

      <section className="mt-10" aria-labelledby="alt-related">
        <h2 id="alt-related" className="font-display text-3xl">{data.relatedHeading}</h2>
        <ul className="mt-4 space-y-3">
          {data.comparisonSlug && (
            <li>
              <Link href={localizedPath(locale, comparisonPath(data.comparisonSlug))} className="ds-link">
                {`DuoShot vs ${data.name}`}
              </Link>
            </li>
          )}
          <li>
            <Link href={toolPath(locale)} className="ds-link">
              {locale === "fr" ? "Générateur de captures DuoShot" : "DuoShot screenshot generator"}
            </Link>
          </li>
          <li>
            <Link href={localizedPath(locale, "/pricing")} className="ds-link">
              {locale === "fr" ? "Tarifs DuoShot" : "DuoShot pricing"}
            </Link>
          </li>
          <li>
            <Link href={localizedPath(locale, "/specs")} className="ds-link">
              {locale === "fr" ? "Tailles des captures iPhone Duo" : "iPhone Duo screenshot sizes"}
            </Link>
          </li>
        </ul>
      </section>

      <Button as="link" variant="primary" href={toolPath(locale)} className="mt-8">
        {locale === "fr" ? "Préparer vos captures" : "Prepare your screenshots"}
      </Button>
    </main>
    <SiteFooter locale={locale} />
  </div>;
}
