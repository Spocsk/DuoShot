export function isUrlLike(token: string) {
  token = token.replace(/^(?:(?!@)[\p{P}\p{S}])+|(?:(?!\/)[\p{P}\p{S}])+$/gu, "");
  return token.includes("://") || token.startsWith("@") || /^(?:[a-z0-9-]+\.)+[a-z]{2,}(?:[/?#]\S*)?$/i.test(token);
}

/** Fit measured glyph advances, shrinking before resorting to timed pages. */
export function fitText(text: string, width: number, height: number, minimum: number, maximum: number, measure: (value: string, size: number) => number) {
  const min = Math.min(minimum, maximum);
  const floor = Math.min(min, 24);
  const tokens = text.split(/\s+/).filter(isUrlLike);
  let size = maximum;
  // Keep URLs and handles whole even when doing so requires going below min.
  while (size > floor && tokens.some((token) => measure(token, size) > width)) size = Math.max(floor, size - 2);
  const linesAt = (size: number) => {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        const candidate = line ? `${line} ${word}` : word;
        if (measure(candidate, size) <= width) { line = candidate; continue; }
        if (line) { lines.push(line); line = ""; }
        // At the floor, prefer slash boundaries; split oversized segments last.
        const segments = isUrlLike(word) && measure(word, size) > width ? word.split(/(?<=\/)/) : [word];
        for (const segment of segments) {
          if (line && measure(line + segment, size) > width) { lines.push(line); line = ""; }
          if (measure(segment, size) <= width) { line += segment; continue; }
          for (const char of Array.from(segment)) {
            if (line && measure(line + char, size) > width) { lines.push(line); line = ""; }
            line += char;
          }
        }
      }
      lines.push(line);
    }
    return lines;
  };
  let lines = linesAt(size);
  while (size > min && lines.length * size * 1.08 > height) { size = Math.max(min, size - 2); lines = linesAt(size); }
  const perPage = Math.max(1, Math.floor(height / (size * 1.08)));
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
  return { size, pages };
}

export function textPage(frame: number, duration: number, count: number) {
  return Math.max(0, Math.min(count - 1, Math.floor(frame / Math.max(1, duration) * count)));
}
