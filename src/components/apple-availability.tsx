import type { Locale } from "@/lib/specs";

export function AppleAvailability({ locale }: { locale: Locale }) {
  return <p className="mt-4 max-w-3xl text-sm text-[var(--muted)]">
    {locale === "fr"
      ? "Vérifié le 25 septembre 2026 : Apple annonce l’ouverture du dépôt des captures Duo plus tard dans l’année. DuoShot prépare les fichiers ; leur dépôt sera manuel et ne garantit pas l’approbation de l’app. "
      : "Checked September 25, 2026: Apple says Duo screenshot uploads will open later this year. DuoShot prepares the files; upload will be manual and does not guarantee app approval. "}
    <a className="ds-link" href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/">{locale === "fr" ? "Spécifications Apple" : "Apple specifications"}</a>
  </p>;
}
