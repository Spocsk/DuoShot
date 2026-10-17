import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { ImageResponse } from "next/og";
import type { Locale } from "@/lib/specs";
import { OgCard, ogAlt, type OgPage } from "./cards";
import { ogFonts } from "./fonts";
import { OG_CONTENT_TYPE, OG_SIZE } from "./theme";

export type { OgPage };

/** The single id each opengraph-image file publishes; it shows in the image URL. */
export const OG_IMAGE_ID = "card";

/**
 * For `generateImageMetadata` in an opengraph-image file: the alt text follows the route's
 * locale, which a plain `export const alt` cannot do.
 */
export function ogImageMetadata(page: OgPage, { locale }: { locale: string }) {
  return [{ id: OG_IMAGE_ID, alt: ogAlt(page, locale === "en" ? "en" : "fr"), size: OG_SIZE, contentType: OG_CONTENT_TYPE }];
}

/**
 * Satori widens the space after some Geist glyphs ("Informations  légales"); a no-break space
 * keeps the font's own spacing. Text that must wrap is split into words by OgFrame instead.
 */
function tightSpaces(node: ReactNode): ReactNode {
  if (typeof node === "string") return node.replace(/ /g, "\u00a0");
  if (Array.isArray(node)) return node.map(tightSpaces);
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (typeof element.type === "function") {
    return tightSpaces((element.type as (props: unknown) => ReactNode)(element.props));
  }
  if (element.type === "svg" || element.props.children === undefined) return element;
  return cloneElement(element, undefined, ...Children.toArray(element.props.children).map(tightSpaces));
}

export async function ogImage(page: OgPage, locale: Locale) {
  return new ImageResponse(tightSpaces(<OgCard page={page} locale={locale} />) as ReactElement, { ...OG_SIZE, fonts: await ogFonts() });
}
