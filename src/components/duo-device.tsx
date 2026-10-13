import { DeviceCamera } from "@/components/device-camera";
import { getTranslator } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { HarborShot } from "@/components/harbor-ui";

/** The Harbor pair as exported: closed screen, and open screen turned to portrait. */
export function DuoDevice({ locale }: { locale: Locale }) {
  const { t } = getTranslator(locale);
  return (
    <div className="duo-stage">
      <p className="ds-label">{t("example_listing")}</p>
      <p className="mt-1 mb-4 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-[var(--muted)]">
        {t("hero_kicker")}
      </p>
      <div className="duo-cluster" aria-hidden="true">
        <figure className="duo-closed">
          <div className="duo-chassis">
            <div className="duo-screen">
              <HarborShot locale={locale} side="outer" eager />
              <DeviceCamera />
            </div>
          </div>
          <figcaption className="duo-caption">{t("closed_caption")}</figcaption>
        </figure>
        <figure className="duo-open">
          <div className="duo-book">
            <div className="duo-screen">
              <HarborShot locale={locale} side="inner" eager />
            </div>
          </div>
          <figcaption className="duo-caption">{t("open_caption")}</figcaption>
        </figure>
      </div>
    </div>
  );
}
