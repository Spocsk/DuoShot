import { getTranslator } from "@/lib/i18n";
import type { Locale } from "@/lib/specs";
import { FEATURED_ON } from "@/lib/featured-on";

/** Discreet footer line linking to places that featured DuoShot; renders nothing when empty. */
export function FeaturedOn({ locale }: { locale: Locale }) {
  if (FEATURED_ON.length === 0) return null;
  const { t } = getTranslator(locale);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1" data-testid="footer-featured-on">
      <span>{t("footer_featured_on")}</span>
      {FEATURED_ON.map((item) => (
        <a key={item.url} href={item.url} target="_blank" rel="nofollow noopener" className="ds-link inline-flex items-center">
          {item.badgeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.badgeUrl} alt={item.name} className="h-5 w-auto" />
          ) : (
            item.name
          )}
        </a>
      ))}
    </span>
  );
}
