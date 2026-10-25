/** A publication, directory or launch platform that has featured DuoShot. */
export type FeaturedOn = {
  readonly name: string;
  readonly url: string;
  /** When set, the footer shows this badge image instead of the plain name. */
  readonly badgeUrl?: string;
};

/** Rendered as the footer "Vu sur" / "Featured on" line; empty hides the line entirely. */
export const FEATURED_ON: readonly FeaturedOn[] = [];
