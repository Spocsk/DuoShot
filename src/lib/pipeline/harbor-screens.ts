/**
 * Harbor, the fictional surf and tide app used for every DuoShot example: the landing, the tool demo, the review
 * demo and the example ZIP. One drawing serves them all, so the app looks the same wherever it appears.
 *
 * Screens are laid out in iOS points at 3x: the closed screen is 466 × 678 pt (1398 × 2034 px), the open screen
 * 669 × 951 pt (2007 × 2853 px). In portrait the open screen folds across its middle height (see hingeBand), so the
 * open layouts keep every text and card out of FOLD_SAFE_PT and let only background art cross it.
 *
 * Pure string builders: no fs, no sharp, so scripts/render-harbor-assets.mjs can bundle this file.
 */

export type HarborLocale = "en" | "fr";
export type HarborSide = "outer" | "inner";

export const HARBOR_SCALE = 3;
export const HARBOR_SLIDE_IDS = ["today", "tide", "spots"] as const;
export type HarborSlideId = (typeof HARBOR_SLIDE_IDS)[number];

/** Open-screen band, in points, that holds no text or card: hinge (6 % of the height) plus a 2 % margin each side. */
export const FOLD_SAFE_PT = { top: 427, bottom: 524 } as const;

const C = {
  deep: "#0d2f3b",
  ocean: "#18505d",
  sea: "#2c7380",
  seaSoft: "#d7e8e8",
  bg: "#eef3f2",
  card: "#ffffff",
  ink: "#0f2a33",
  muted: "#5d7178",
  faint: "#8c9ca1",
  line: "#dfe7e6",
  sun: "#ef9f4f",
  good: "#2f9a77",
  fair: "#d39a3a",
  sand: "#ecdfc3",
  sandEdge: "#d9c69f",
  water: "#c3dcdd",
  waterDeep: "#a8cbcd",
} as const;

type Rating = "good" | "fair";

const COPY = {
  en: {
    beach: "North Beach", now: "Today · 15:00", swell: "Swell", swellMeta: "12 s · WNW", height: "1.4 m",
    good: "Good", goodLong: "Good conditions", byHour: "Swell by hour", byHourHint: "metres",
    wind: "Wind", windVal: "9 km/h", windSub: "Offshore",
    water: "Water", waterVal: "17 °C", waterSub: "Wetsuit 3/2",
    tide: "Tide", tideVal: "18:12", tideSub: "High · 2.1 m",
    tabs: ["Forecast", "Spots", "Tides", "Profile"],
    today: "Today", week: "7 days",
    tides: "Tides", tideHigh: "2.1 m", tideHighSub: "High tide at 18:12", tideNow: "Rising · 1.2 m now",
    tidesToday: "Today’s tides", high: "High", low: "Low",
    tideRows: [["high", "06:01", "1.9 m"], ["low", "12:04", "0.6 m"], ["high", "18:12", "2.1 m"], ["low", "00:26", "0.5 m"]],
    best: "Best window", bestVal: "16:00 – 18:30", bestSub: "Rising tide, offshore wind",
    sunrise: "Sunrise", sunriseVal: "07:52", sunset: "Sunset", sunsetVal: "19:14",
    spots: "Spots", search: "Search spots", nearby: "Nearby",
    spotRows: [
      ["West Reef", "1.6 m", "Good", "good", "2 km"],
      ["North Beach", "1.4 m", "Good", "good", "Here"],
      ["East Peak", "0.9 m", "Fair", "fair", "5 km"],
      ["The Cove", "0.6 m", "Glassy", "good", "7 km"],
    ],
    cove: "The Cove", coveMeta: "0.6 m · Glassy", coveBest: "Best at 16:00", coveWind: "6 km/h",
    bars: ["0.9", "1.1", "1.3", "1.4", "1.3", "1.1"],
    axis: "m",
  },
  fr: {
    beach: "Plage Nord", now: "Aujourd’hui · 15:00", swell: "Houle", swellMeta: "12 s · ONO", height: "1,4 m",
    good: "Bon", goodLong: "Bonnes conditions", byHour: "Houle par heure", byHourHint: "mètres",
    wind: "Vent", windVal: "9 km/h", windSub: "De terre",
    water: "Eau", waterVal: "17 °C", waterSub: "Combi 3/2",
    tide: "Marée", tideVal: "18:12", tideSub: "Pleine mer · 2,1 m",
    tabs: ["Prévisions", "Spots", "Marées", "Profil"],
    today: "Aujourd’hui", week: "7 jours",
    tides: "Marées", tideHigh: "2,1 m", tideHighSub: "Pleine mer à 18:12", tideNow: "Montante · 1,2 m",
    tidesToday: "Marées du jour", high: "Pleine mer", low: "Basse mer",
    tideRows: [["high", "06:01", "1,9 m"], ["low", "12:04", "0,6 m"], ["high", "18:12", "2,1 m"], ["low", "00:26", "0,5 m"]],
    best: "Meilleur créneau", bestVal: "16:00 – 18:30", bestSub: "Marée montante, vent de terre",
    sunrise: "Lever", sunriseVal: "07:52", sunset: "Coucher", sunsetVal: "19:14",
    spots: "Spots", search: "Rechercher un spot", nearby: "À proximité",
    spotRows: [
      ["Récif ouest", "1,6 m", "Bon", "good", "2 km"],
      ["Plage Nord", "1,4 m", "Bon", "good", "Ici"],
      ["Pic est", "0,9 m", "Moyen", "fair", "5 km"],
      ["La Crique", "0,6 m", "Lisse", "good", "7 km"],
    ],
    cove: "La Crique", coveMeta: "0,6 m · Lisse", coveBest: "Idéal à 16:00", coveWind: "6 km/h",
    bars: ["0,9", "1,1", "1,3", "1,4", "1,3", "1,1"],
    axis: "m",
  },
} as const;

type Copy = (typeof COPY)[HarborLocale];

const HOURS = ["06", "09", "12", "15", "18", "21"];
const SWELL = [0.9, 1.1, 1.3, 1.4, 1.3, 1.1];
const NOW_BAR = 3;

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

const n = (value: number) => Number(value.toFixed(2));

function esc(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type TextOptions = { w?: 400 | 600 | 700; fill?: string; anchor?: "start" | "middle" | "end"; opacity?: number; ls?: number };

/** x, y and font-size come first: the fold test reads them in that order. */
function text(x: number, y: number, size: number, value: string, o: TextOptions = {}): string {
  const anchor = o.anchor && o.anchor !== "start" ? ` text-anchor="${o.anchor}"` : "";
  const opacity = o.opacity !== undefined ? ` fill-opacity="${o.opacity}"` : "";
  const ls = o.ls !== undefined ? ` letter-spacing="${o.ls}"` : "";
  return `<text x="${n(x)}" y="${n(y)}" font-size="${size}" font-family="Inter" font-weight="${o.w ?? 400}" fill="${o.fill ?? C.ink}"${anchor}${opacity}${ls}>${esc(value)}</text>`;
}

/** Cards carry rx, which the fold test uses to find them. */
function card(x: number, y: number, width: number, height: number, o: { r?: number; fill?: string; opacity?: number; stroke?: string; shadow?: boolean } = {}): string {
  const r = o.r ?? 20;
  // Two offset layers stand in for a blurred shadow: a blur filter makes the server render several times slower.
  const shadow = o.shadow === false ? "" : `<rect x="${n(x + 1)}" y="${n(y + 4)}" width="${n(width - 2)}" height="${n(height)}" rx="${r}" fill="${C.deep}" fill-opacity=".035"/><rect x="${n(x)}" y="${n(y + 1.5)}" width="${n(width)}" height="${n(height)}" rx="${r}" fill="${C.deep}" fill-opacity=".045"/>`;
  const opacity = o.opacity !== undefined ? ` fill-opacity="${o.opacity}"` : "";
  const stroke = o.stroke ? ` stroke="${o.stroke}" stroke-width=".8"` : "";
  return `${shadow}<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" rx="${r}" fill="${o.fill ?? C.card}"${opacity}${stroke}/>`;
}

const ICONS = {
  wind: `<path d="M3 8h10.5a3 3 0 1 0-3-3"/><path d="M3 12.5h15a3 3 0 1 1-3 3"/><path d="M3 17h7"/>`,
  drop: `<path d="M12 3.2c-3.2 4.3-6 7.5-6 10.9a6 6 0 0 0 12 0c0-3.4-2.8-6.6-6-10.9z"/>`,
  tide: `<path d="M2.5 10.5c2.4 0 2.4-2.6 4.75-2.6s2.4 2.6 4.75 2.6 2.4-2.6 4.75-2.6 2.4 2.6 4.75 2.6"/><path d="M2.5 16c2.4 0 2.4-2.6 4.75-2.6s2.4 2.6 4.75 2.6 2.4-2.6 4.75-2.6 2.4 2.6 4.75 2.6"/>`,
  wave: `<path d="M2.5 15.5c3 0 4.5-7.5 9.5-7.5 3.2 0 4.2 2.6 2.6 4.2-1.2 1.2-3.2.6-3.2-1"/><path d="M2.5 19.5h19"/>`,
  pin: `<path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>`,
  person: `<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4"/>`,
  search: `<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>`,
  chevron: `<path d="M7 10l5 5 5-5"/>`,
  sunrise: `<path d="M4 18h16"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 5v4M5.6 9.6l1.6 1.6M18.4 9.6l-1.6 1.6"/>`,
  sunset: `<path d="M4 18h16"/><path d="M7.5 18a4.5 4.5 0 0 1 9 0"/><path d="M12 9V5M9.5 7.5L12 10l2.5-2.5"/>`,
  up: `<path d="M12 19V5M6 11l6-6 6 6"/>`,
  down: `<path d="M12 5v14M6 13l6 6 6-6"/>`,
  clock: `<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>`,
} as const;

function icon(name: keyof typeof ICONS, x: number, y: number, size: number, color: string, stroke = 1.9): string {
  return `<g transform="translate(${n(x)} ${n(y)}) scale(${n(size / 24)})" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</g>`;
}

function statusBar(width: number, color: string): string {
  const right = width - 26;
  const bars = [4, 6.5, 9, 11.5].map((h, i) => `<rect x="${right - 74 + i * 4.6}" y="${34 - h}" width="3.1" height="${h}" rx=".9" fill="${color}"/>`).join("");
  const wifi = `<g fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round">
      <path d="M${right - 49} 26.2a10 10 0 0 1 14 0"/><path d="M${right - 46.2} 29.4a5.8 5.8 0 0 1 8.4 0"/></g>
      <circle cx="${right - 42}" cy="32.6" r="1.6" fill="${color}"/>`;
  const battery = `<rect x="${right - 27}" y="23.5" width="24" height="11.5" rx="3.4" fill="none" stroke="${color}" stroke-opacity=".45" stroke-width="1"/>
      <rect x="${right - 25}" y="25.5" width="18" height="7.5" rx="1.9" fill="${color}"/>
      <path d="M${right - 1.6} 27.4v3.8" stroke="${color}" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>`;
  return `<text x="56" y="34" font-size="16" font-family="Inter" font-weight="600" fill="${color}" text-anchor="middle">9:41</text>${bars}${wifi}${battery}`;
}

function logo(x: number, y: number, size: number, dark: boolean): string {
  const fg = dark ? C.deep : "#ffffff";
  const bg = dark ? "#ffffff" : C.ocean;
  return `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${n(size * 0.28)}" fill="${bg}"/>
    <g transform="translate(${n(x + size * 0.17)} ${n(y + size * 0.17)}) scale(${n((size * 0.66) / 24)})" fill="none" stroke="${fg}" stroke-width="2.4" stroke-linecap="round">
      <path d="M2 14c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/><path d="M2 19c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3" stroke-opacity=".55"/>
      <circle cx="16.5" cy="6" r="2.6" fill="${fg}" stroke="none"/></g>`;
}

function pill(x: number, y: number, label: string, o: { fill: string; color: string; dot?: string; size?: number; anchor?: "start" | "end" }): string {
  const size = o.size ?? 13;
  const width = Math.round(label.length * size * 0.56 + (o.dot ? 34 : 24));
  const height = Math.round(size * 2.1);
  const left = o.anchor === "end" ? x - width : x;
  const dot = o.dot ? `<circle cx="${left + 14}" cy="${n(y + height / 2)}" r="4" fill="${o.dot}"/>` : "";
  return `<rect x="${left}" y="${y}" width="${width}" height="${height}" rx="${n(height / 2)}" fill="${o.fill}"/>${dot}
    ${text(left + (o.dot ? 25 : 12), y + height / 2 + size * 0.36, size, label, { w: 600, fill: o.color })}`;
}

function tabBar(width: number, height: number, copy: Copy, active: number, tablet = false): string {
  const top = height - (tablet ? 76 : 80);
  const icons: (keyof typeof ICONS)[] = ["wave", "pin", "tide", "person"];
  const span = tablet ? 420 : width - 40;
  const start = (width - span) / 2;
  const items = copy.tabs.map((label, index) => {
    const cx = start + span * ((index + 0.5) / copy.tabs.length);
    const color = index === active ? C.sea : C.faint;
    return `${icon(icons[index]!, cx - 12, top + 10, 24, color, index === active ? 2.2 : 1.8)}
      ${text(cx, top + 48, 10.5, label, { w: index === active ? 600 : 400, fill: color, anchor: "middle" })}`;
  }).join("");
  return `<rect x="0" y="${top}" width="${width}" height="${height - top}" fill="#fbfcfc"/>
    <rect x="0" y="${top}" width="${width}" height=".7" fill="${C.line}"/>${items}
    <rect x="${width / 2 - 67}" y="${height - 13}" width="134" height="5" rx="2.5" fill="${C.ink}"/>`;
}

/** Sea gradient header with a soft wave edge; `edge` is where the light page starts. */
function oceanHeader(width: number, edge: number): string {
  const wave = `M0 ${edge - 16} C ${width * 0.22} ${edge - 34}, ${width * 0.4} ${edge + 6}, ${width * 0.62} ${edge - 10} S ${width * 0.9} ${edge - 30}, ${width} ${edge - 18} V 0 H 0 Z`;
  const wave2 = `M0 ${edge - 2} C ${width * 0.25} ${edge - 22}, ${width * 0.45} ${edge + 16}, ${width * 0.66} ${edge} S ${width * 0.92} ${edge - 18}, ${width} ${edge - 6} V 0 H 0 Z`;
  return `<path d="${wave2}" fill="${C.sea}" fill-opacity=".35"/><path d="${wave}" fill="url(#ocean)"/>
    <path d="${wave}" fill="url(#glow)"/>`;
}

function defs(): string {
  return `<defs>
    <linearGradient id="ocean" x1="0" y1="0" x2=".35" y2="1">
      <stop offset="0" stop-color="${C.deep}"/><stop offset=".55" stop-color="${C.ocean}"/><stop offset="1" stop-color="${C.sea}"/>
    </linearGradient>
    <radialGradient id="glow" cx=".88" cy=".08" r=".75">
      <stop offset="0" stop-color="#f6c98f" stop-opacity=".42"/><stop offset=".55" stop-color="#f6c98f" stop-opacity=".06"/><stop offset="1" stop-color="#f6c98f" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="tideFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${C.sea}" stop-opacity=".32"/><stop offset="1" stop-color="${C.sea}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="tideFillLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".3"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
}

function frame(width: number, height: number, body: string): string {
  const w = width / HARBOR_SCALE;
  const h = height / HARBOR_SCALE;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${n(w)} ${n(h)}" xmlns="http://www.w3.org/2000/svg">${defs()}
    <rect width="${n(w)}" height="${n(h)}" fill="${C.bg}"/>${body}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Widgets                                                             */
/* ------------------------------------------------------------------ */

function swellBars(x: number, y: number, width: number, height: number, copy: Copy): string {
  const slot = width / HOURS.length;
  const barWidth = Math.min(30, slot * 0.46);
  const max = 1.6;
  const base = y + height - 22;
  return HOURS.map((hour, index) => {
    const value = SWELL[index]!;
    const barHeight = ((height - 50) * value) / max;
    const cx = x + slot * (index + 0.5);
    const active = index === NOW_BAR;
    const fill = active ? C.sun : C.seaSoft;
    const label = active ? text(cx, base - barHeight - 9, 13, copy.bars[index]!, { w: 700, anchor: "middle", fill: C.ink }) : "";
    return `<rect x="${n(cx - barWidth / 2)}" y="${n(base - barHeight)}" width="${n(barWidth)}" height="${n(barHeight)}" rx="${n(barWidth / 3)}" fill="${fill}"/>${label}
      ${text(cx, base + 18, 11.5, hour, { w: active ? 700 : 400, fill: active ? C.ink : C.muted, anchor: "middle" })}`;
  }).join("");
}

/** Tide height through the day from the four extremes, eased with a cosine between them. */
const TIDE_EXTREMES: [number, number][] = [[-5.8, 2.0], [0.43, 0.5], [6.02, 1.9], [12.07, 0.6], [18.2, 2.1], [24.43, 0.5]];

function tideAt(hour: number): number {
  for (let i = 0; i < TIDE_EXTREMES.length - 1; i++) {
    const [h1, v1] = TIDE_EXTREMES[i]!;
    const [h2, v2] = TIDE_EXTREMES[i + 1]!;
    if (hour >= h1 && hour <= h2) return v1 + ((v2 - v1) * (1 - Math.cos((Math.PI * (hour - h1)) / (h2 - h1)))) / 2;
  }
  return 1;
}

function tideChart(x: number, y: number, width: number, height: number, o: { light: boolean; axis: boolean }): string {
  const px = (hour: number) => x + (width * hour) / 24;
  const py = (value: number) => y + height - (height * (value - 0.2)) / 2.1;
  const points: string[] = [];
  for (let hour = 0; hour <= 24.001; hour += 0.25) points.push(`${n(px(hour))} ${n(py(tideAt(hour)))}`);
  const line = `M${points.join(" L")}`;
  const area = `${line} L${n(px(24))} ${n(y + height)} L${n(x)} ${n(y + height)} Z`;
  const stroke = o.light ? "#ffffff" : C.sea;
  const ink = o.light ? "#ffffff" : C.ink;
  const nowX = px(15);
  const nowY = py(tideAt(15));
  const highX = px(18.2);
  const highY = py(2.1);
  const axis = o.axis ? [0, 6, 12, 18, 24].map((hour) => text(px(hour), y + height + 20, 11.5, `${String(hour % 24).padStart(2, "0")}:00`, {
    fill: ink, opacity: o.light ? 0.7 : 0.55, anchor: hour === 0 ? "start" : hour === 24 ? "end" : "middle",
  })).join("") : "";
  return `<path d="${area}" fill="url(#${o.light ? "tideFillLight" : "tideFill"})"/>
    <path d="${line}" fill="none" stroke="${stroke}" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M${n(nowX)} ${n(y)} V${n(y + height)}" stroke="${ink}" stroke-opacity=".35" stroke-width="1" stroke-dasharray="3 4"/>
    <circle cx="${n(nowX)}" cy="${n(nowY)}" r="6.5" fill="${C.sun}" stroke="${o.light ? C.ocean : "#ffffff"}" stroke-width="2.5"/>
    <circle cx="${n(highX)}" cy="${n(highY)}" r="4.5" fill="${stroke}"/>${axis}`;
}

function statTile(x: number, y: number, width: number, height: number, iconName: keyof typeof ICONS, label: string, value: string, sub: string, glass: boolean): string {
  const fg = glass ? "#ffffff" : C.ink;
  const soft = glass ? 0.72 : 1;
  const subColor = glass ? "#ffffff" : C.muted;
  const tile = glass
    ? `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" rx="18" fill="#ffffff" fill-opacity=".12" stroke="#ffffff" stroke-opacity=".22" stroke-width=".8"/>`
    : card(x, y, width, height, { r: 18 });
  return `${tile}${icon(iconName, x + 14, y + 14, 20, glass ? "#ffffff" : C.sea)}
    ${text(x + 40, y + 29, 12.5, label, { w: 600, fill: subColor, opacity: soft })}
    ${text(x + 14, y + height - 31, 21, value, { w: 700, fill: fg, ls: -0.3 })}
    ${text(x + 14, y + height - 13, 12, sub, { fill: subColor, opacity: glass ? 0.72 : 1 })}`;
}

function ratingDot(x: number, y: number, rating: Rating): string {
  return `<circle cx="${n(x)}" cy="${n(y)}" r="4.5" fill="${rating === "good" ? C.good : C.fair}"/>`;
}

function spotList(x: number, y: number, width: number, rowHeight: number, copy: Copy, highlight = -1): string {
  return copy.spotRows.map(([name, height, label, rating, distance], index) => {
    const top = y + index * rowHeight;
    const mid = top + rowHeight / 2;
    const selected = index === highlight;
    const bg = selected ? `<rect x="${n(x - 8)}" y="${n(top + 4)}" width="${n(width + 16)}" height="${n(rowHeight - 8)}" rx="14" fill="${C.seaSoft}" fill-opacity=".7"/>` : "";
    const rule = index > 0 && !selected && index - 1 !== highlight ? `<rect x="${n(x)}" y="${n(top)}" width="${n(width)}" height=".7" fill="${C.line}"/>` : "";
    return `${bg}${rule}
      ${text(x, mid - 2, 15.5, name, { w: 600 })}
      ${ratingDot(x + 4, mid + 15, rating as Rating)}${text(x + 14, mid + 19.5, 12.5, `${label} · ${distance}`, { fill: C.muted })}
      ${text(x + width, mid + 6, 19, height, { w: 700, anchor: "end", ls: -0.3 })}`;
  }).join("");
}

function mapArt(x: number, y: number, width: number, height: number, pins: boolean, copy: Copy, labels: boolean, pinsLow = false): string {
  const X = (r: number) => n(x + width * r);
  const Y = (r: number) => n(y + height * r);
  const land = `M${X(0.52)} ${Y(0)} C${X(0.5)} ${Y(0.14)} ${X(0.62)} ${Y(0.2)} ${X(0.58)} ${Y(0.34)} C${X(0.55)} ${Y(0.45)} ${X(0.42)} ${Y(0.46)} ${X(0.44)} ${Y(0.58)} C${X(0.46)} ${Y(0.7)} ${X(0.6)} ${Y(0.72)} ${X(0.64)} ${Y(0.84)} C${X(0.67)} ${Y(0.93)} ${X(0.62)} ${Y(1)} ${X(0.6)} ${Y(1)} L${X(1)} ${Y(1)} L${X(1)} ${Y(0)} Z`;
  const shoal = (dx: number) => `M${X(0.52 - dx)} ${Y(0)} C${X(0.5 - dx)} ${Y(0.14)} ${X(0.62 - dx)} ${Y(0.2)} ${X(0.58 - dx)} ${Y(0.34)} C${X(0.55 - dx)} ${Y(0.45)} ${X(0.42 - dx)} ${Y(0.46)} ${X(0.44 - dx)} ${Y(0.58)} C${X(0.46 - dx)} ${Y(0.7)} ${X(0.6 - dx)} ${Y(0.72)} ${X(0.64 - dx)} ${Y(0.84)} C${X(0.67 - dx)} ${Y(0.93)} ${X(0.62 - dx)} ${Y(1)} ${X(0.6 - dx)} ${Y(1)}`;
  const roads = `<path d="M${X(0.8)} ${Y(0)} C${X(0.74)} ${Y(0.3)} ${X(0.86)} ${Y(0.55)} ${X(0.78)} ${Y(1)}" fill="none" stroke="#ffffff" stroke-width="3.2"/>
    <path d="M${X(0.66)} ${Y(0.34)} L${X(1)} ${Y(0.4)}" fill="none" stroke="#ffffff" stroke-width="2.2"/>`;
  const pinList: [number, number, number][] = pinsLow
    ? [[0.47, 0.34, 0], [0.5, 0.45, 1], [0.38, 0.62, 2], [0.55, 0.76, 3]]
    : [[0.47, 0.2, 0], [0.5, 0.36, 1], [0.38, 0.62, 2], [0.55, 0.8, 3]];
  const pinSvg = pins ? pinList.map(([px, py, index]) => {
    const [name, h, , rating] = copy.spotRows[index]!;
    const cx = x + width * px;
    const cy = y + height * py;
    const color = rating === "good" ? C.good : C.fair;
    const tag = labels ? (() => {
      const label = `${name} · ${h}`;
      const w = Math.round(label.length * 6.9 + 20);
      return `<rect x="${n(cx - w - 14)}" y="${n(cy - 13)}" width="${w}" height="26" rx="13" fill="#ffffff"/>
        ${text(cx - w - 4, cy + 4.5, 12.5, label, { w: 600 })}`;
    })() : "";
    return `${tag}<circle cx="${n(cx)}" cy="${n(cy)}" r="11" fill="${color}" stroke="#ffffff" stroke-width="3"/>`;
  }).join("") : "";
  return `<rect x="${n(x)}" y="${n(y)}" width="${n(width)}" height="${n(height)}" fill="${C.water}"/>
    <path d="${shoal(0.07)}" fill="none" stroke="${C.waterDeep}" stroke-width="1.4" stroke-dasharray="2 5"/>
    <path d="${shoal(0.16)}" fill="none" stroke="${C.waterDeep}" stroke-width="1.2" stroke-dasharray="2 6"/>
    <path d="${land}" fill="${C.sand}" stroke="${C.sandEdge}" stroke-width="1.2"/>${roads}${pinSvg}`;
}

/* ------------------------------------------------------------------ */
/* Closed screen · 466 × 678 pt                                        */
/* ------------------------------------------------------------------ */

function outerToday(c: Copy): string {
  const W = 466;
  return `${oceanHeader(W, 318)}${statusBar(W, "#ffffff")}
    ${logo(22, 62, 30, true)}${text(62, 83, 17, "Harbor", { w: 700, fill: "#ffffff", ls: -0.2 })}
    ${icon("search", W - 46, 65, 24, "#ffffff")}
    ${text(22, 140, 32, c.beach, { w: 700, fill: "#ffffff", ls: -0.8 })}
    ${text(22, 166, 15, c.now, { fill: "#ffffff", opacity: 0.75 })}
    ${text(18, 252, 92, c.height, { w: 700, fill: "#ffffff", ls: -4 })}
    ${pill(W - 22, 186, c.good, { fill: "#ffffff", color: C.ink, dot: C.good, anchor: "end" })}
    ${text(22, 284, 16, `${c.swell} · ${c.swellMeta}`, { w: 600, fill: "#ffffff", opacity: 0.85 })}
    ${card(16, 326, W - 32, 168)}
    ${text(34, 356, 15, c.byHour, { w: 700 })}${text(W - 34, 356, 12.5, c.byHourHint, { fill: C.muted, anchor: "end" })}
    ${swellBars(28, 366, W - 56, 118, c)}
    ${statTile(16, 506, (W - 52) / 3, 90, "wind", c.wind, c.windVal, c.windSub, false)}
    ${statTile(26 + (W - 52) / 3, 506, (W - 52) / 3, 90, "drop", c.water, c.waterVal, c.waterSub, false)}
    ${statTile(36 + ((W - 52) / 3) * 2, 506, (W - 52) / 3, 90, "tide", c.tide, c.tideVal, c.tideSub, false)}
    ${tabBar(W, 678, c, 0)}`;
}

function outerTide(c: Copy): string {
  const W = 466;
  const rows = c.tideRows.slice(1, 4);
  return `${oceanHeader(W, 372)}${statusBar(W, "#ffffff")}
    ${text(22, 98, 32, c.tides, { w: 700, fill: "#ffffff", ls: -0.8 })}
    ${pill(W - 22, 72, c.beach, { fill: "#ffffff", color: C.ink, anchor: "end", size: 12.5 })}
    ${text(22, 186, 72, c.tideHigh, { w: 700, fill: "#ffffff", ls: -3 })}
    ${text(22, 214, 16, c.tideHighSub, { w: 600, fill: "#ffffff", opacity: 0.88 })}
    ${text(22, 236, 14, c.tideNow, { fill: "#ffffff", opacity: 0.7 })}
    ${tideChart(22, 252, W - 44, 76, { light: true, axis: true })}
    ${card(16, 384, W - 32, 196)}
    ${text(34, 414, 15, c.tidesToday, { w: 700 })}
    ${rows.map(([kind, time, height], index) => {
      const y = 428 + index * 48;
      const rule = index > 0 ? `<rect x="34" y="${y}" width="${W - 68}" height=".7" fill="${C.line}"/>` : "";
      return `${rule}${icon(kind === "high" ? "up" : "down", 34, y + 13, 20, kind === "high" ? C.sea : C.faint)}
        ${text(64, y + 29, 15, kind === "high" ? c.high : c.low, { w: 600 })}
        ${text(W - 130, y + 29, 15, time, { fill: C.muted, anchor: "end" })}
        ${text(W - 34, y + 29, 17, height, { w: 700, anchor: "end" })}`;
    }).join("")}
    ${tabBar(W, 678, c, 2)}`;
}

function outerSpots(c: Copy): string {
  const W = 466;
  return `${statusBar(W, C.ink)}
    ${text(22, 98, 32, c.spots, { w: 700, ls: -0.8 })}
    ${icon("person", W - 48, 76, 26, C.sea)}
    ${card(16, 120, W - 32, 40, { r: 12, shadow: false, stroke: C.line })}
    ${icon("search", 28, 130, 20, C.muted)}${text(56, 145, 15, c.search, { fill: C.muted })}
    <clipPath id="mapClip"><rect x="16" y="172" width="${W - 32}" height="164" rx="20"/></clipPath>
    <g clip-path="url(#mapClip)">${mapArt(16, 172, W - 32, 164, true, c, false)}</g>
    ${text(22, 364, 13, c.nearby.toUpperCase(), { w: 600, fill: C.muted, ls: 0.8 })}
    ${card(16, 374, W - 32, 214)}
    ${spotList(34, 377, W - 68, 52, c, -1)}
    ${tabBar(W, 678, c, 1)}`;
}

/* ------------------------------------------------------------------ */
/* Open screen · 669 × 951 pt, fold band 428 – 523 pt kept clear       */
/* ------------------------------------------------------------------ */

function innerToday(c: Copy): string {
  const W = 669;
  const tileW = 236;
  const tileX = W - 28 - tileW;
  return `${oceanHeader(W, 486)}${statusBar(W, "#ffffff")}
    ${logo(28, 60, 32, true)}${text(70, 82, 18, "Harbor", { w: 700, fill: "#ffffff", ls: -0.2 })}
    <rect x="${W - 230}" y="58" width="202" height="36" rx="18" fill="#ffffff" fill-opacity=".14"/>
    <rect x="${W - 227}" y="61" width="100" height="30" rx="15" fill="#ffffff"/>
    ${text(W - 177, 81, 13, c.today, { w: 600, anchor: "middle" })}${text(W - 78, 81, 13, c.week, { w: 600, fill: "#ffffff", anchor: "middle", opacity: 0.85 })}
    ${text(28, 160, 40, c.beach, { w: 700, fill: "#ffffff", ls: -1 })}
    ${text(28, 190, 16, c.now, { fill: "#ffffff", opacity: 0.75 })}
    ${text(22, 318, 120, c.height, { w: 700, fill: "#ffffff", ls: -5.5 })}
    ${text(28, 356, 18, `${c.swell} · ${c.swellMeta}`, { w: 600, fill: "#ffffff", opacity: 0.88 })}
    ${pill(28, 376, c.goodLong, { fill: "#ffffff", color: C.ink, dot: C.good, size: 13.5 })}
    ${statTile(tileX, 126, tileW, 88, "wind", c.wind, c.windVal, c.windSub, true)}
    ${statTile(tileX, 224, tileW, 88, "drop", c.water, c.waterVal, c.waterSub, true)}
    ${statTile(tileX, 322, tileW, 88, "tide", c.tide, c.tideVal, c.tideSub, true)}
    ${card(20, 536, 318, 314)}
    ${text(40, 570, 16, c.byHour, { w: 700 })}${text(318, 570, 12.5, c.byHourHint, { fill: C.muted, anchor: "end" })}
    ${swellBars(34, 600, 290, 236, c)}
    ${card(350, 536, 299, 314)}
    ${text(370, 570, 16, c.spots, { w: 700 })}${text(629, 570, 12.5, c.nearby, { fill: C.sea, w: 600, anchor: "end" })}
    ${spotList(370, 584, 259, 64, c, 1)}
    ${tabBar(W, 951, c, 0, true)}`;
}

function innerTide(c: Copy): string {
  const W = 669;
  return `${oceanHeader(W, 486)}${statusBar(W, "#ffffff")}
    ${text(28, 104, 36, c.tides, { w: 700, fill: "#ffffff", ls: -1 })}
    ${pill(W - 28, 76, c.beach, { fill: "#ffffff", color: C.ink, anchor: "end", size: 13 })}
    ${text(26, 196, 80, c.tideHigh, { w: 700, fill: "#ffffff", ls: -3.5 })}
    ${text(28, 226, 17, c.tideHighSub, { w: 600, fill: "#ffffff", opacity: 0.9 })}
    ${text(28, 250, 15, c.tideNow, { fill: "#ffffff", opacity: 0.72 })}
    ${pill(W - 28, 176, `${c.sunrise} ${c.sunriseVal} · ${c.sunset} ${c.sunsetVal}`, { fill: "#ffffff", color: C.ink, anchor: "end", size: 12.5 })}
    ${tideChart(28, 278, W - 56, 104, { light: true, axis: true })}
    ${card(20, 536, 318, 314)}
    ${text(40, 570, 16, c.tidesToday, { w: 700 })}
    ${c.tideRows.map(([kind, time, height], index) => {
      const y = 588 + index * 62;
      const rule = index > 0 ? `<rect x="40" y="${y}" width="278" height=".7" fill="${C.line}"/>` : "";
      return `${rule}${icon(kind === "high" ? "up" : "down", 40, y + 20, 20, kind === "high" ? C.sea : C.faint)}
        ${text(70, y + 28, 15, kind === "high" ? c.high : c.low, { w: 600 })}
        ${text(70, y + 47, 13, time, { fill: C.muted })}
        ${text(318, y + 38, 19, height, { w: 700, anchor: "end", ls: -0.3 })}`;
    }).join("")}
    ${card(350, 536, 299, 152)}
    ${icon("clock", 370, 554, 22, C.sun, 2.1)}${text(400, 571, 15, c.best, { w: 700 })}
    ${text(370, 626, 30, c.bestVal, { w: 700, ls: -0.8 })}
    ${text(370, 654, 13.5, c.bestSub, { fill: C.muted })}
    ${card(350, 700, 299, 150)}
    ${icon("sunrise", 370, 722, 24, C.sun)}${text(370, 772, 13, c.sunrise, { fill: C.muted })}${text(370, 800, 24, c.sunriseVal, { w: 700, ls: -0.5 })}
    ${icon("sunset", 510, 722, 24, C.sea)}${text(510, 772, 13, c.sunset, { fill: C.muted })}${text(510, 800, 24, c.sunsetVal, { w: 700, ls: -0.5 })}
    ${tabBar(W, 951, c, 2, true)}`;
}

function innerSpots(c: Copy): string {
  const W = 669;
  return `${mapArt(0, 0, W, 520, true, c, true, true)}
    <rect width="${W}" height="130" fill="#ffffff" fill-opacity=".9"/>${statusBar(W, C.ink)}
    ${text(28, 100, 36, c.spots, { w: 700, ls: -1 })}
    ${card(W - 330, 72, 302, 40, { r: 12, fill: "#ffffff", shadow: false, stroke: C.line })}
    ${icon("search", W - 318, 82, 20, C.muted)}${text(W - 290, 97, 14.5, c.search, { fill: C.muted })}
    ${card(20, 536, 318, 314)}
    ${text(40, 570, 16, c.nearby, { w: 700 })}
    ${spotList(40, 584, 278, 64, c, 3)}
    ${card(350, 536, 299, 314)}
    ${text(370, 572, 13, c.spotRows[3]![4].toUpperCase(), { w: 600, fill: C.muted, ls: 0.8 })}
    ${text(370, 610, 30, c.cove, { w: 700, ls: -0.8 })}
    ${pill(370, 626, c.coveMeta, { fill: C.seaSoft, color: C.ink, dot: C.good, size: 13 })}
    ${statTile(370, 676, 124, 88, "wind", c.wind, c.coveWind, c.windSub, false)}
    ${statTile(505, 676, 124, 88, "drop", c.water, c.waterVal, c.waterSub, false)}
    ${icon("clock", 370, 790, 20, C.sun, 2.1)}${text(398, 805, 15, c.coveBest, { w: 600 })}
    ${tabBar(W, 951, c, 1, true)}`;
}

const OUTER = { today: outerToday, tide: outerTide, spots: outerSpots } as const;
const INNER = { today: innerToday, tide: innerTide, spots: innerSpots } as const;

/** Full-size SVG for one Harbor screen. Width and height are the export pixels (portrait Duo sizes). */
export function harborScreenSvg(index: number, side: HarborSide, locale: HarborLocale, width: number, height: number): string | null {
  const id = HARBOR_SLIDE_IDS[index];
  if (!id) return null;
  const copy = COPY[locale];
  return frame(width, height, side === "outer" ? OUTER[id](copy) : INNER[id](copy));
}
