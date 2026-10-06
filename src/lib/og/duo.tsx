import { HARBOR_COPY, HARBOR_HOURS, HARBOR_TIDE_PATH } from "@/components/harbor-ui";
import type { Locale } from "@/lib/specs";
import { CHASSIS, HARBOR_SCREEN, OG } from "./theme";

/*
 * The landing hero's iPhone Duo pair (components/duo-device.tsx + harbor-ui.tsx), redrawn with the
 * flexbox subset Satori understands. Every length derives from the device height `h`, so the pair
 * keeps the real proportions (closed 84.1 × 117.8 mm, open 164.6 × 117.8 mm) at any size.
 */

const CLOSED_RATIO = 84.1 / 117.8;
const OPEN_RATIO = 164.6 / 117.8;

const SHADOW = "0 35px 60px rgba(20, 39, 46, 0.24), 0 5px 12px rgba(20, 39, 46, 0.16)";

export function duoWidth(h: number, gap: number): number {
  return Math.round(h * CLOSED_RATIO + gap + h * OPEN_RATIO);
}

export function DuoPair({ locale, h, gap = Math.round(h * 0.07) }: { locale: Locale; h: number; gap?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap }}>
      <DuoClosed locale={locale} h={h} />
      <DuoOpen locale={locale} h={h} />
    </div>
  );
}

export function DuoClosed({ locale, h }: { locale: Locale; h: number }) {
  const c = HARBOR_COPY[locale];
  const w = Math.round(h * CLOSED_RATIO);
  const pad = Math.max(3, Math.round(w * 0.024));
  const outerL = Math.round(h * 0.035);
  const outerR = Math.round(h * 0.113);
  return (
    <div
      style={{
        display: "flex",
        width: w,
        height: h,
        padding: pad,
        background: CHASSIS,
        borderRadius: `${outerL}px ${outerR}px ${outerR}px ${outerL}px`,
        boxShadow: SHADOW,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundImage: HARBOR_SCREEN,
          borderRadius: `${outerL - pad / 2}px ${outerR - pad}px ${outerR - pad}px ${outerL - pad / 2}px`,
          padding: `${Math.round(w * 0.1)}px ${Math.round(w * 0.11)}px`,
          color: OG.harborText,
        }}
      >
        {/* The swell: a tilted half-ellipse rising from the bottom of the cover screen. */}
        <div
          style={{
            position: "absolute",
            left: -Math.round(w * 0.15),
            bottom: -Math.round(h * 0.17),
            width: Math.round(w * 1.3),
            height: Math.round(h * 0.55),
            borderRadius: `${Math.round(w * 0.65)}px ${Math.round(w * 0.65)}px 0 0`,
            background: "linear-gradient(160deg, #193a4b 5%, #2c6571 65%, #77aeb5 100%)",
            transform: "rotate(-11deg)",
            opacity: 0.8,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: Math.round(h * 0.045),
            right: Math.round(w * 0.1),
            width: Math.round(h * 0.034),
            height: Math.round(h * 0.034),
            borderRadius: 999,
            background: "#07090b",
            boxShadow: "0 0 0 1.5px rgba(255, 255, 255, 0.1)",
          }}
        />
        <div style={{ display: "flex", fontSize: Math.round(h * 0.05), fontWeight: 600, letterSpacing: "-0.035em" }}>Harbor</div>
        <div
          style={{
            display: "flex",
            marginTop: Math.round(w * 0.16),
            fontSize: Math.round(h * 0.135),
            fontWeight: 600,
            letterSpacing: "-0.055em",
            lineHeight: 0.92,
          }}
        >
          {c.north}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: Math.round(h * 0.01),
            fontSize: Math.round(h * 0.235),
            fontWeight: 600,
            letterSpacing: "-0.07em",
            lineHeight: 0.88,
          }}
        >
          {c.height}
        </div>
        <div style={{ display: "flex", marginTop: Math.round(h * 0.03), fontSize: Math.round(h * 0.042), opacity: 0.88 }}>{c.coverSub}</div>
      </div>
    </div>
  );
}

export function DuoOpen({ locale, h }: { locale: Locale; h: number }) {
  const c = HARBOR_COPY[locale];
  const w = Math.round(h * OPEN_RATIO);
  const pad = Math.max(3, Math.round(w * 0.017));
  const outer = Math.round(h * 0.1);
  const half = (w - pad * 2) / 2;
  const padX = Math.round(half * 0.08);
  const padY = Math.round(half * 0.07);
  const kicker = { display: "flex", fontSize: Math.round(h * 0.033), fontWeight: 600, letterSpacing: "0.04em", opacity: 0.75 } as const;
  return (
    <div
      style={{
        display: "flex",
        width: w,
        height: h,
        padding: pad,
        background: CHASSIS,
        borderRadius: outer,
        boxShadow: SHADOW,
      }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          borderRadius: outer - pad,
          backgroundImage: HARBOR_SCREEN,
          color: OG.harborText,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: half, height: "100%", padding: `${padY}px ${padX}px` }}>
          <div style={kicker}>{c.today.toUpperCase()}</div>
          <div
            style={{
              display: "flex",
              marginTop: Math.round(h * 0.02),
              fontSize: Math.round(h * 0.13),
              fontWeight: 600,
              letterSpacing: "-0.055em",
              lineHeight: 0.92,
            }}
          >
            {c.north}
          </div>
          <div style={{ display: "flex", marginTop: Math.round(h * 0.02), fontSize: Math.round(h * 0.04), opacity: 0.88 }}>{c.metric}</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: Math.round(half * 0.045), height: Math.round(h * 0.13), marginTop: Math.round(h * 0.05) }}>
            {HARBOR_HOURS.map(([label, height]) => (
              <div key={label} style={{ display: "flex", flex: 1, height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "flex-end" }}>
                <div
                  style={{
                    width: Math.round(half * 0.05),
                    height: Math.round((h * 0.09 * Number.parseFloat(height)) / 100),
                    borderRadius: 999,
                    background: "rgba(247, 243, 236, 0.58)",
                  }}
                />
                <div style={{ display: "flex", marginTop: Math.round(h * 0.012), fontSize: Math.round(h * 0.024), opacity: 0.68 }}>{label}</div>
              </div>
            ))}
          </div>
          <svg width={half - padX * 2} height={Math.round(h * 0.13)} viewBox="0 0 160 48" style={{ marginTop: Math.round(h * 0.035) }}>
            <path d={HARBOR_TIDE_PATH} stroke="rgba(247, 243, 236, 0.82)" strokeWidth="2.2" strokeLinecap="round" fill="none" />
            <circle cx="80" cy="36" r="3.2" fill="#f7f3ec" />
          </svg>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: "auto",
              borderRadius: Math.round(h * 0.035),
              background: "rgba(20, 20, 20, 0.38)",
              padding: `${Math.round(h * 0.035)}px ${Math.round(half * 0.08)}px`,
            }}
          >
            <div style={kicker}>{c.incoming.toUpperCase()}</div>
            <div style={{ display: "flex", marginTop: Math.round(h * 0.01), fontSize: Math.round(h * 0.054), fontWeight: 600, letterSpacing: "-0.02em" }}>
              {c.high}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", width: half, height: "100%", padding: `${padY}px ${padX}px` }}>
          <div style={kicker}>{c.spots.toUpperCase()}</div>
          <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: Math.round(h * 0.03), marginTop: Math.round(h * 0.05) }}>
            {c.spotList.map(([name, meta]) => (
              <div
                key={name}
                style={{
                  display: "flex",
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: Math.round(h * 0.03),
                  background: "rgba(14, 44, 55, 0.34)",
                  padding: `0 ${Math.round(half * 0.08)}px`,
                  fontSize: Math.round(h * 0.04),
                }}
              >
                <div style={{ display: "flex" }}>{name}</div>
                <div style={{ display: "flex", opacity: 0.78 }}>{meta}</div>
              </div>
            ))}
          </div>
        </div>
        {/* The hinge crease between the two halves of the inner display. */}
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: half - 4,
            width: 8,
            opacity: 0.5,
            background: "linear-gradient(90deg, rgba(0, 0, 0, 0.22), rgba(255, 255, 255, 0.1) 45%, rgba(0, 0, 0, 0.32))",
          }}
        />
      </div>
    </div>
  );
}
