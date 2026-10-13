/**
 * Harbor copy and shapes for the social cards (Satori draws them as HTML). The site and the tool show the
 * rendered screens from src/lib/pipeline/harbor-screens.ts instead.
 */
export const HARBOR_COPY = {
  en: {
    today: "Today", spots: "Spots", incoming: "Incoming", high: "High 18:12", tide: "Tide", hours: "Hours",
    rising: "High 18:12 · Rising", bestWindow: "Best window · 16:00", now: "Now", swell: "Swell",
    north: "North", cove: "Cove", height: "1.4 m", metric: "1.4 m · 12 s · WNW", coverSub: "Swell · 12 s · WNW",
    tideHeight: "2.1 m", coveMetric: "Glassy · 14 °C", swellMetric: "1.1 m · 14 s",
    spotList: [["West reef", "Clean"], ["North", "1.4 m"], ["East break", "14 °C"], ["Cove", "Glassy"]],
  },
  fr: {
    today: "Aujourd’hui", spots: "Spots", incoming: "À venir", high: "Pleine mer 18:12", tide: "Marée", hours: "Heures",
    rising: "Pleine mer 18:12 · Montante", bestWindow: "Meilleur créneau · 16:00", now: "Maintenant", swell: "Houle",
    north: "Nord", cove: "Crique", height: "1,4 m", metric: "1,4 m · 12 s · ONO", coverSub: "Houle · 12 s · ONO",
    tideHeight: "2,1 m", coveMetric: "Lisse · 14 °C", swellMetric: "1,1 m · 14 s",
    spotList: [["Récif ouest", "Propre"], ["Nord", "1,4 m"], ["Pic est", "14 °C"], ["Crique", "Lisse"]],
  },
} as const;

export const HARBOR_HOURS = [
  ["06", "38%"],
  ["09", "58%"],
  ["12", "92%"],
  ["15", "74%"],
  ["18", "50%"],
  ["21", "32%"],
] as const;

/** The tide curve, drawn in a 160×48 box; its low point sits at (80, 36). */
export const HARBOR_TIDE_PATH = "M0 30 C 18 30 22 10 40 12 C 58 14 62 38 80 36 C 98 34 104 8 122 10 C 140 12 146 28 160 26";
