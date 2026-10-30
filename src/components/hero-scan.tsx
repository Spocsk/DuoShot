import type { CSSProperties } from "react";
import { DeviceCamera } from "@/components/device-camera";
import { HarborShot } from "@/components/harbor-ui";
import { HeroScanMotion } from "@/components/hero-scan-motion";
import { getTranslator } from "@/lib/i18n";
import { screenshotDimensions } from "@/lib/screenshot-copy";
import { duoSpec, type Locale } from "@/lib/specs";

const OUTER = duoSpec("duo-outer", "portrait");
const INNER = duoSpec("duo-inner", "portrait");

/*
 * Text boxes the scan finds on the open screen, in % of the screen. The raw capture is shifted
 * down 9% (studio.css), which brings "Houle" and "Bonnes conditions" onto the hinge band (47–53%).
 */
const WORDS = [
  { left: 4.2, top: 22.1, width: 30.5, height: 4.5 },
  { left: 4, top: 32.7, width: 42, height: 9.8 },
  { left: 60.6, top: 22.3, width: 35, height: 9.2 },
  { left: 4.2, top: 44.6, width: 23, height: 2.6, hit: true },
  { left: 4.2, top: 48.6, width: 24.3, height: 2.9, hit: true },
];

/** The hero visual: a simplified DuoShot window that imports the Harbor pair and lists what would block it. */
export function HeroScan({ locale }: { locale: Locale }) {
  const { t, tf } = getTranslator(locale);
  const issues = [
    { title: t("home_scan_issue_fold_title"), detail: t("home_scan_issue_fold_detail"), tag: t("home_scan_tag_review"), tone: "review" },
    { title: t("home_scan_issue_size_title"), detail: tf("home_scan_issue_size_detail", { expected: screenshotDimensions(OUTER) }), tag: t("home_scan_tag_upload"), tone: "upload" },
    { title: t("home_scan_issue_alpha_title"), detail: t("home_scan_issue_alpha_detail"), tag: t("home_scan_tag_upload"), tone: "upload" },
  ];
  return <HeroScanMotion>
    <div className="hero-scan-window" aria-hidden="true">
      <div className="hero-scan-bar">
        <i /><i /><i />
        <span>DuoShot · Harbor</span>
        <span className="hero-scan-count"><b className="is-empty">0</b><b className="is-full">2</b> / 2</span>
      </div>
      <div className="hero-scan-canvas duo-cluster">
        <div className="hero-scan-slot is-outer">
          <div className="duo-chassis">
            <div className="duo-screen">
              <HarborShot locale={locale} side="outer" eager />
              <DeviceCamera />
              <span className="hero-scan-line" />
              <span className="hero-scan-empty">{screenshotDimensions(OUTER)}</span>
            </div>
          </div>
          <span className="hero-scan-file"><i />Simulator Screenshot 09.14.12.png</span>
          <p className="hero-scan-meta">
            <span className="hero-scan-progress"><i /></span>
            <code>1206 × 2622</code>
            <b className="hero-scan-marker is-size">2</b>
          </p>
        </div>
        <div className="hero-scan-slot is-inner">
          <div className="duo-book">
            <div className="duo-screen">
              <HarborShot locale={locale} side="inner" eager />
              <span className="hero-scan-hinge" />
              <span className="hero-scan-words">
                {WORDS.map((word, index) => <i key={index} className={word.hit ? "is-hit" : undefined} style={{
                  left: `${word.left}%`, top: `${word.top}%`, width: `${word.width}%`, height: `${word.height}%`, "--i": index,
                } as CSSProperties} />)}
              </span>
              <span className="hero-scan-line" />
              <b className="hero-scan-marker is-fold">1</b>
              <b className="hero-scan-marker is-alpha">3</b>
              <span className="hero-scan-empty">{screenshotDimensions(INNER)}</span>
            </div>
          </div>
          <span className="hero-scan-file"><i />IMG_0418.PNG</span>
          <p className="hero-scan-meta">
            <span className="hero-scan-progress"><i /></span>
            <code>{screenshotDimensions(INNER)}</code>
          </p>
        </div>
      </div>
      <div className="hero-scan-report">
        <div className="hero-scan-report-head">
          <span>{t("home_scan_report_title")}</span>
          <strong className="hero-scan-status">
            <span data-status="wait">{t("home_scan_status_waiting")}</span>
            <span data-status="load">{t("home_scan_status_loading")}</span>
            <span data-status="scan">{t("home_scan_status_scanning")}</span>
            <span data-status="done">{tf("home_scan_status_done", { count: issues.length })}</span>
          </strong>
        </div>
        <ol>
          {issues.map((issue, index) => <li key={issue.title}>
            <b>{index + 1}</b>
            <div><strong>{issue.title}</strong><small>{issue.detail}</small></div>
            <em className={`is-${issue.tone}`}>{issue.tag}</em>
          </li>)}
        </ol>
      </div>
    </div>
    <p className="sr-only">{t("home_scan_summary")}</p>
  </HeroScanMotion>;
}
