---
title: "App Store creative assets specs (iOS 27)"
description: "App Store creative assets specs: product page header 3840 × 1646, search results 3:2 image, video 5–30 s, and Apple's content rules."
lang: en
slug: app-store-creative-assets
alternate: /guides/app-store-creative-assets
updated: 2026-11-11
published: 2026-11-11
---

# App Store creative assets (iOS 27): product page header and search results specs

Since iOS 27 and iPadOS 27, the App Store shows two new visuals on top of your screenshots and app previews: a **product page header** and a **search results asset**. Apple calls them creative assets. Unlike screenshots, they don't have to show the app in use: Apple says you can use them to highlight your brand, seasonal offerings or new content.

They don't replace anything. Your screenshots and app previews stay required and still appear below the header.

Everything below comes from [Apple's Creative assets specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/creative-assets-specifications) (App Store Connect Help), checked on November 11, 2026.

## Quick answer

| Placement | Aspect ratio | Image size | Formats |
| --- | --- | --- | --- |
| Product page header | 21:9 | 3840 × 1646 px | .jpeg, .jpg, .png |
| Search results | 3:2 | min 1920 × 1280, max 3840 × 2560 px | .jpeg, .jpg, .png |
| Universal asset (header + search) | 16:9 | 5244 × 2950 px | .png |

Images can't include alpha channels or transparency.

## Video specs

| Placement | Aspect ratio | Resolution | Frame rate | Length | Formats |
| --- | --- | --- | --- | --- | --- |
| Product page header | 21:9 | 3840 × 1646 px | 30 or 60 fps | 5–30 s | .mov, .m4v, .mp4 |
| Search results | 3:2 | 1920 × 1280 to 3840 × 2560 px | 30 or 60 fps | 5–30 s | .mov, .m4v, .mp4 |

Videos loop. They are muted by default in both placements. On the product page people can unmute them; in search results they can't.

## In-App Event cards (same family)

| Placement | Aspect ratio | Size | Max file size | Video length |
| --- | --- | --- | --- | --- |
| Event card | 16:9 | 1920 × 1080 to 3840 × 2160 px | 500 MB | 15–30 s |
| Event details page | 9:16 | 1080 × 1920 to 2160 × 3840 px | 500 MB | 15–30 s |

## Header vs search results vs universal asset

- **Header**: the first thing a visitor sees on your product page. Apple's advice: "focus on a single, clear idea" and design for a first-time visitor.
- **Search results**: the first thing people see in the Search tab, before they reach your page. Apple's advice: "state the obvious" and show the interface, content or gameplay. If you don't provide one, your in-app events, app previews and screenshots appear in search, as before.
- **Universal asset (16:9, 5244 × 2950 PNG)**: one file usable for both header and search results. In App Store Connect, the option "Use header asset in search results" is only available for universal assets.

Apple publishes templates for Figma, Sketch, Photoshop and Pixelmator with a **safe area**. Keep text and your focal point inside it: the asset is cropped differently across devices and orientations.

## Content rules Apple lists

From Apple's App Store Asset Best Practices page:

- No specific pricing, discounts, website URLs or copyright symbols.
- No Apple recognitions (Editor's Choice, App of the Day, Game of the Day, Apple Design Award).
- No claims you can't verify, such as awards you didn't receive.
- No logos or references to other platforms or marketplaces.
- Content must meet a **4+ age rating**, even if your app is rated higher.
- If you use text, keep it to a short phrase and localize it for every language your app supports.

## Where to upload them in App Store Connect

- Open your app, then the app version under the platform.
- In **Product Page Information**, open the **Header and Search Results** tab.
- Choose **Header** or **Search Results**, drag your image or video into the well, or click **Browse Assets** to reuse an approved one from **Asset Library**.
- Use **Preview** to check the result on iPhone and iPad, in both orientations and each language.
- Submit the version for review. The assets go live when that version is released.

Two useful details from Apple's help:

- You can submit creative assets **on their own** from Asset Library, without a new app version. They are reviewed against your latest version.
- If your current version is already live, you can swap in an **approved** creative asset and click **Publish** without submitting a new version.

Creative assets also work on custom product pages and can be A/B tested with product page optimization.

## Checklist before you submit

- Header exactly 3840 × 1646 (or universal 5244 × 2950 PNG)
- Search asset between 1920 × 1280 and 3840 × 2560, 3:2
- No alpha channel (on a Mac, check with sips -g hasAlpha)
- Key text and subject inside the template safe area
- No price, URL, ©, Apple award, competitor logo
- Text localized for each App Store language
- Video 5–30 s, 30 or 60 fps, readable with the sound off

## Where DuoShot fits (honestly)

DuoShot doesn't make creative assets today. It exports the **screenshots** App Store Connect still requires, including the iPhone Duo display groups (1398 × 2034 outer display, 2007 × 2853 inner display), frameless and at Apple's exact sizes. A header can't stand in for those: your screenshots sit right below it on the product page.

## Related guides

- [App Store screenshot sizes](/en/guides/app-store-screenshot-sizes)
- [App preview specifications](/en/guides/app-preview-specifications)
- [App Store screenshot guidelines](/en/guides/app-store-screenshot-guidelines)
- [iPhone Duo screenshot size](/en/guides/screenshot-size/iphone-duo)
