const HOURS = [
  ["06", "38%"],
  ["09", "58%"],
  ["12", "92%"],
  ["15", "74%"],
  ["18", "50%"],
  ["21", "32%"],
] as const;

const SPOTS = [
  ["West reef", "Clean"],
  ["North", "1.4 m"],
  ["East break", "14 °C"],
  ["Cove", "Glassy"],
] as const;

function SwellHours() {
  return (
    <ol className="harbor-hours" aria-hidden="true">
      {HOURS.map(([label, height]) => (
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
        d="M0 30 C 18 30 22 10 40 12 C 58 14 62 38 80 36 C 98 34 104 8 122 10 C 140 12 146 28 160 26"
        stroke="rgb(247 243 236 / 0.82)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <circle cx="80" cy="36" r="3.2" fill="#f7f3ec" />
    </svg>
  );
}

export function HarborCover() {
  return (
    <div className="harbor-cover">
      <p className="harbor-brand">Harbor</p>
      <p className="harbor-cover-place">North</p>
      <p className="harbor-cover-time">1.4 m</p>
      <p className="harbor-cover-sub">Swell · 12 s · WNW</p>
    </div>
  );
}

export function HarborInnerMain() {
  return (
    <div className="harbor-inner-main">
      <p className="harbor-kicker">Today</p>
      <p className="harbor-place">North</p>
      <p className="harbor-metric">1.4 m · 12 s · WNW</p>
      <SwellHours />
      <TideSpark className="harbor-spark" />
      <div className="harbor-glass">
        <p className="harbor-kicker">Incoming</p>
        <p className="harbor-glass-title">High 18:12</p>
      </div>
    </div>
  );
}

export function HarborInnerSide() {
  return (
    <div className="harbor-inner-side">
      <p className="harbor-status-solo">Spots</p>
      <ul className="harbor-spots">
        {SPOTS.map(([name, meta]) => (
          <li key={name} className="harbor-spot">
            <span>{name}</span>
            <span>{meta}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ShelfInnerShot({ index }: { index: 0 | 1 | 2 }) {
  if (index === 1) {
    return (
      <div className="shelf-book">
        <div className="shelf-book-pane harbor-skin harbor-skin-left">
          <div className="harbor-inner-main">
            <p className="harbor-kicker">Tide</p>
            <p className="harbor-place">2.1 m</p>
            <p className="harbor-metric">High 18:12 · Rising</p>
            <TideSpark className="harbor-spark" />
          </div>
        </div>
        <div className="shelf-book-pane harbor-skin harbor-skin-right">
          <div className="harbor-inner-side">
            <p className="harbor-status-solo">Hours</p>
            <SwellHours />
            <div className="harbor-glass">
              <p className="harbor-kicker">Incoming</p>
              <p className="harbor-glass-title">High 18:12</p>
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
            <p className="harbor-kicker">Spots</p>
            <p className="harbor-place">North</p>
            <p className="harbor-metric">Best window · 16:00</p>
            <ul className="harbor-spots">
              {SPOTS.slice(0, 3).map(([name, meta]) => (
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
            <p className="harbor-status-solo">Now</p>
            <p className="harbor-place">Cove</p>
            <p className="harbor-metric">Glassy · 14 °C</p>
            <div className="harbor-glass">
              <p className="harbor-kicker">Swell</p>
              <p className="harbor-glass-title">1.1 m · 14 s</p>
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
        <HarborInnerMain />
      </div>
      <div className="shelf-book-pane harbor-skin harbor-skin-right">
        <HarborInnerSide />
      </div>
      <span className="shelf-book-crease" />
    </div>
  );
}

export function ShelfShot({ index }: { index: 0 | 1 | 2 }) {
  if (index === 1) {
    return (
      <div className="shelf-shot shelf-shot-tide">
        <p className="shelf-shot-kicker">Tide</p>
        <p className="shelf-shot-hero">2.1 m</p>
        <p className="shelf-shot-metric">High 18:12 · Rising</p>
        <TideSpark className="shelf-shot-spark" />
        <p className="shelf-shot-title">Harbor</p>
      </div>
    );
  }
  if (index === 2) {
    return (
      <div className="shelf-shot shelf-shot-spots">
        <p className="shelf-shot-kicker">Spots</p>
        <ul className="shelf-shot-list">
          {SPOTS.map(([name, meta]) => (
            <li key={name}>
              <span>{name}</span>
              <span>{meta}</span>
            </li>
          ))}
        </ul>
        <p className="shelf-shot-title">Harbor</p>
      </div>
    );
  }
  return (
    <div className="shelf-shot shelf-shot-today">
      <p className="shelf-shot-kicker">Today</p>
      <p className="shelf-shot-place">North</p>
      <p className="shelf-shot-metric">1.4 m · 12 s · WNW</p>
      <ol className="shelf-shot-hours" aria-hidden="true">
        {HOURS.map(([label, height]) => (
          <li key={label}>
            <i style={{ height }} />
            <span>{label}</span>
          </li>
        ))}
      </ol>
      <p className="shelf-shot-title">Harbor</p>
    </div>
  );
}
