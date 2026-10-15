import { Fragment, type ReactNode } from "react";
import Link from "next/link";

/** Inline syntax used by the local guides. React escapes all source text. */
function inline(text: string): ReactNode[] {
  const tokens = /(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s,]+)/g;
  return text.split(tokens).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{inline(part.slice(2, -2))}</strong>;
    const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    const href = link?.[2] ?? (/^https?:\/\//.test(part) ? part : null);
    if (href) {
      const label = link?.[1] ?? part;
      if (href.startsWith("/") && !href.startsWith("//")) return <Link key={index} className="ds-link" href={href}>{label}</Link>;
      if (/^https?:\/\//.test(href)) return <a key={index} className="ds-link" href={href}>{label}</a>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}

/** Renders the headings, paragraphs, lists and comparison tables in our guides. */
export function GuideMarkdown({ body }: { body: string }) {
  const blocks = body.trim().split(/\r?\n\s*\r?\n/);
  return blocks.map((block, index) => {
    const lines = block.split(/\r?\n/);
    const heading = block.match(/^(#{1,3}) (.+)$/);
    if (heading) {
      const Heading = heading[1].length === 1 ? "h1" : heading[1].length === 2 ? "h2" : "h3";
      return <Heading key={index} className={`font-display ${Heading === "h1" ? "text-4xl sm:text-5xl" : Heading === "h2" ? "mt-12 text-3xl" : "mt-8 text-2xl"}`}>{inline(heading[2])}</Heading>;
    }
    if (lines.every((line) => line.startsWith("|"))) {
      const rows = lines.map((line) => line.slice(1, -1).split("|").map((cell) => cell.trim()));
      return <div key={index} className="mt-6 overflow-x-auto" role="region" aria-label={rows[0].slice(1).join(", ")} tabIndex={0}>
        <table className="w-full text-left text-sm">
          <thead className="ds-spec-head"><tr>{rows[0].map((cell, column) => <th key={column} scope="col" className="p-3 font-medium">{inline(cell)}</th>)}</tr></thead>
          <tbody>{rows.slice(2).map((row, rowIndex) => <tr key={rowIndex} className="border-t border-[var(--line)]">{row.map((cell, column) => column === 0
            ? <th key={column} scope="row" className="p-3 font-medium">{inline(cell)}</th>
            : <td key={column} className="min-w-44 p-3 align-top">{inline(cell)}</td>)}</tr>)}</tbody>
        </table>
      </div>;
    }
    if (lines.every((line) => line.startsWith("- "))) {
      return <ul key={index} className="mt-5 max-w-3xl list-disc space-y-3 pl-6">{lines.map((line, item) => <li key={item}>{inline(line.slice(2))}</li>)}</ul>;
    }
    return <p key={index} className="mt-5 max-w-3xl leading-relaxed">{inline(block)}</p>;
  });
}
