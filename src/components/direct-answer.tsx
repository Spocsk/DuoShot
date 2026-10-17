import type { directAnswer } from "@/lib/direct-answers";

export function DirectAnswer({ answer: { text, sourceUrl, sourceLabel } }: { answer: ReturnType<typeof directAnswer> }) {
  return <p data-testid="direct-answer" className="mt-4 text-lg"><span data-testid="direct-answer-text">{text}</span>{" "}<a href={sourceUrl} className="ds-link">{sourceLabel}</a></p>;
}
