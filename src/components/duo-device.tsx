import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { HarborCover, HarborInnerMain, HarborInnerSide } from "@/components/harbor-ui";

export function DuoDevice({ locale }: { locale: Locale }) {
  return (
    <div className="duo-stage" aria-hidden="true">
      <div className="duo-cluster">
        <figure className="duo-closed">
          <div className="duo-chassis">
            <div className="duo-screen">
              <HarborCover />
            </div>
          </div>
          <figcaption className="duo-caption">{t(locale, "closed_caption")}</figcaption>
        </figure>
        <figure className="duo-open">
          <div className="duo-book">
            <div className="duo-book-inner">
              <div className="duo-leaf duo-leaf-left">
                <div className="duo-screen harbor-skin harbor-skin-left">
                  <HarborInnerMain />
                </div>
              </div>
              <div className="duo-leaf duo-leaf-right">
                <div className="duo-screen harbor-skin harbor-skin-right">
                  <HarborInnerSide />
                </div>
              </div>
              <span className="duo-crease" />
            </div>
          </div>
          <figcaption className="duo-caption">{t(locale, "open_caption")}</figcaption>
        </figure>
      </div>
    </div>
  );
}
