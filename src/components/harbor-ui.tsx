import type { Locale } from "@/lib/specs";

/** Harbor is a fictional surf app; its interface follows the page language. */
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

const COPY = HARBOR_COPY;

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

function SwellHours() {
  return (
    <ol className="harbor-hours" aria-hidden="true">
      {HARBOR_HOURS.map(([label, height]) => (
        <li key={label}>
          <i style={{ height }} />
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}

function TideSpark({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 160 48" fill="none" aria-hidden="true">
      <path
        d={HARBOR_TIDE_PATH}
        stroke="rgb(247 243 236 / 0.82)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="80" cy="36" r="3.2" fill="#f7f3ec" />
    </svg>
  );
}

export function HarborCover({ locale = "en" }: { locale?: Locale }) {
  const c = COPY[locale];
  return (
    <div className="harbor-cover">
      <p className="harbor-brand">Harbor</p>
      <p className="harbor-cover-place">{c.north}</p>
      <p className="harbor-cover-time">{c.height}</p>
      <p className="harbor-cover-sub">{c.coverSub}</p>
    </div>
  );
}

export function HarborInnerMain({ locale = "en" }: { locale?: Locale }) {
  const c = COPY[locale];
  return (
    <div className="harbor-inner-main">
      <p className="harbor-kicker">{c.today}</p>
      <p className="harbor-place">{c.north}</p>
      <p className="harbor-metric">{c.metric}</p>
      <SwellHours />
      <TideSpark className="harbor-spark" />
      <div className="harbor-glass">
        <p className="harbor-kicker">{c.incoming}</p>
        <p className="harbor-glass-title">{c.high}</p>
      </div>
    </div>
  );
}

export function HarborInnerSide({ locale = "en" }: { locale?: Locale }) {
  const c = COPY[locale];
  return (
    <div className="harbor-inner-side">
      <p className="harbor-status-solo">{c.spots}</p>
      <ul className="harbor-spots">
        {c.spotList.map(([name, meta]) => (
          <li key={name} className="harbor-spot">
            <span>{name}</span>
            <span>{meta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShelfInnerShot({ index, locale = "en" }: { index: 0 | 1 | 2; locale?: Locale }) {
  const c = COPY[locale];
  if (index === 1) {
    return (
      <div className="shelf-book">
        <div className="shelf-book-pane harbor-skin harbor-skin-left">
          <div className="harbor-inner-main">
            <p className="harbor-kicker">{c.tide}</p>
            <p className="harbor-place">{c.tideHeight}</p>
            <p className="harbor-metric">{c.rising}</p>
            <TideSpark className="harbor-spark" />
          </div>
        </div>
        <div className="shelf-book-pane harbor-skin harbor-skin-right">
          <div className="harbor-inner-side">
            <p className="harbor-status-solo">{c.hours}</p>
            <SwellHours />
            <div className="harbor-glass">
              <p className="harbor-kicker">{c.incoming}</p>
              <p className="harbor-glass-title">{c.high}</p>
            </div>
          </div>
        </div>
        <span className="shelf-book-crease" />
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="shelf-book">
        <div className="shelf-book-pane harbor-skin harbor-skin-left">
          <div className="harbor-inner-main">
            <p className="harbor-kicker">{c.spots}</p>
            <p className="harbor-place">{c.north}</p>
            <p className="harbor-metric">{c.bestWindow}</p>
            <ul className="harbor-spots">
              {c.spotList.slice(0, 3).map(([name, meta]) => (
                <li key={name} className="harbor-spot">
                  <span>{name}</span>
                  <span>{meta}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="shelf-book-pane harbor-skin harbor-skin-right">
          <div className="harbor-inner-side">
            <p className="harbor-status-solo">{c.now}</p>
            <p className="harbor-place">{c.cove}</p>
            <p className="harbor-metric">{c.coveMetric}</p>
            <div className="harbor-glass">
              <p className="harbor-kicker">{c.swell}</p>
              <p className="harbor-glass-title">{c.swellMetric}</p>
            </div>
          </div>
        </div>
        <span className="shelf-book-crease" />
      </div>
    );
  }
  return (
    <div className="shelf-book">
      <div className="shelf-book-pane harbor-skin harbor-skin-left">
        <HarborInnerMain locale={locale} />
      </div>
      <div className="shelf-book-pane harbor-skin harbor-skin-right">
        <HarborInnerSide locale={locale} />
      </div>
      <span className="shelf-book-crease" />
    </div>
  );
}
