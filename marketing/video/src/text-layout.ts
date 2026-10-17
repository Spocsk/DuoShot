/** Fit measured glyph advances, shrinking before resorting to timed pages. */
export function fitText(text: string, width: number, height: number, minimum: number, maximum: number, measure: (value: string, size: number) => number) {
  const linesAt = (size: number) => {
    const lines: string[] = [];
    for (const paragraph of text.split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        const candidate = line ? `${line} ${word}` : word;
        if (measure(candidate, size) <= width) { line = candidate; continue; }
        if (line) { lines.push(line); line = ""; }
        for (const char of Array.from(word)) {
          if (line && measure(line + char, size) > width) { lines.push(line); line = ""; }
          line += char;
        }
      }
      lines.push(line);
    }
    return lines;
  };
  const min = Math.min(minimum, maximum);
  let size = maximum;
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
