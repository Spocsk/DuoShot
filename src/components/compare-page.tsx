import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import {
  COMPARE_COLUMNS,
  COMPARE_PAGE_COPY,
  COMPARE_ROUTE,
  COMPARE_ROWS,
  type CompareCell,
} from "@/lib/compare";
import { localizedPath } from "@/lib/site";
import type { Locale } from "@/lib/specs";

function CellSource({ locale, source }: { locale: Locale; source: string }) {
  if (!source) return null;
  const label = locale === "fr" ? "Détails" : "Details";
  if (source.startsWith("/")) {
    return (
      <Link href={localizedPath(locale, source)} className="ds-link mt-1 inline-block text-xs">
        {label}
      </Link>
    );
  }
  return (
    <a href={source} target="_blank" rel="noopener noreferrer" className="ds-link mt-1 inline-block text-xs">
      {locale === "fr" ? "Source" : "Source"}
    </a>
  );
}

export function ComparePage({ locale }: { locale: Locale }) {
  const copy = COMPARE_PAGE_COPY[locale];
  const cell = "border-b border-[var(--line)] px-3 py-3 align-top text-left";
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader locale={locale} path={COMPARE_ROUTE[locale]} />
      <main id="main" className="mx-auto w-full max-w-6xl px-5 py-12">
        <h1 className="font-display text-5xl">{copy.heading}</h1>
        <p className="mt-4 max-w-2xl text-lg text-[var(--muted)]">{copy.lead}</p>
        <div className="mt-10 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className={`${cell} font-semibold`}>{locale === "fr" ? "Outil" : "Tool"}</th>
                {COMPARE_COLUMNS.map((column) => (
                  <th key={column.key} scope="col" className={`${cell} font-semibold`}>
                    {column.label[locale]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE_ROWS.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className={`${cell} font-semibold`}>{row.name}</th>
                  {COMPARE_COLUMNS.map((column) => {
                    const data: CompareCell = row[column.key];
                    return (
                      <td key={column.key} className={cell}>
                        <span>{data.value[locale]}</span>
                        <CellSource locale={locale} source={data.source} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-6 text-xs text-[var(--muted)]">{copy.pricesNote}</p>
        <p className="mt-8 max-w-3xl text-base">{copy.closing}</p>
        <p className="mt-4 max-w-3xl text-sm text-[var(--muted)]">{copy.disclaimer}</p>
      </main>
      <SiteFooter locale={locale} />
    </div>
  );
}
