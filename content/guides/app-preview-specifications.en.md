---
title: "App Store App Preview Specs 2026"
description: "Accepted App Store app preview video sizes per device (iPhone Duo included), 15–30 s, 500 MB, H.264 or ProRes, 30 fps, and how previews meet screenshots."
lang: en
slug: app-preview-specifications
alternate: /guides/app-preview-specifications
updated: 2026-11-09
published: 2026-11-09
---

# App Store app preview specs (2026)

App previews are the short videos that play at the top of your App Store product page. They're optional, but when you add one it **always appears before your screenshots** on iPhone, iPad, Mac and Apple TV, even if you reorder things in App Store Connect. That makes the preview the first thing people see, so getting the file right matters.

Everything below comes from [Apple's App Store Connect reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications), checked on November 9, 2026.

## The short version

| Requirement | Value |
| --- | --- |
| Previews per device size and language | Up to 3 |
| Length | 15 to 30 seconds |
| Max file size | 500 MB |
| Max frame rate | 30 fps |
| Formats | .mov, .m4v, .mp4 (H.264); .mov (ProRes 422 HQ only) |
| Default poster frame | 5 seconds (you can change it) |
| Processing after upload | Up to 24 hours |
| Orientation | iOS: portrait or landscape. macOS, tvOS, visionOS: landscape only |

## Accepted resolutions by device

The key point: App Store Connect does **not** want your device's native resolution. It accepts a fixed set of video sizes per display class. Use the accepted resolution, not the screen resolution.

### iPhone

| Display class | Example devices | Accepted portrait | Accepted landscape |
| --- | --- | --- | --- |
| iPhone Duo | iPhone Duo | 886 × 1920 | 1920 × 886 |
| Dynamic Island, large | iPhone Air, 18 Pro Max, 17 Pro Max, 16 Pro Max, 16 Plus, 15 Pro Max, 15 Plus, 14 Pro Max | 886 × 1920 | 1920 × 886 |
| Face ID, large | 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, 11, XS Max, XR | 886 × 1920 | 1920 × 886 |
| Dynamic Island, medium | 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro | 886 × 1920 | 1920 × 886 |
| Face ID, medium | 17e, 16e, 14, 13 / 13 Pro / 13 mini, 12 / 12 Pro / 12 mini, 11 Pro, XS, X | 886 × 1920 | 1920 × 886 |
| Home Button, large | 8 Plus, 7 Plus, 6s Plus, 6 Plus | 1080 × 1920 | 1920 × 1080 |
| Home Button, medium | SE (2nd/3rd gen), 8, 7, 6s, 6 | 750 × 1334 | 1334 × 750 |
| Home Button, 4" | SE (1st gen), 5s, 5c, 5 | 1080 × 1920 | 1920 × 1080 |
| Home Button, 3.5" | — | Not supported | Not supported |

If you skip a class, Apple uses a scaled preview from a neighbouring class (for example, Dynamic Island large falls back to Face ID large and vice versa).

### iPad, Mac, Apple TV, Vision Pro

| Display | Accepted resolutions |
| --- | --- |
| iPad 13" (iPad Pro M5/M4 and earlier 12.9" gens, iPad Air M4/M3/M2) | 1200 × 1600 or 1600 × 1200 |
| iPad Pro 12.9" (2nd gen) | 1200 × 1600, 1600 × 1200, 900 × 1200, 1200 × 900 |
| iPad 11" (incl. iPad A16, iPad mini A20 Pro / A17 Pro) | 1200 × 1600 or 1600 × 1200 |
| iPad 10.5" | 1200 × 1600 or 1600 × 1200 |
| iPad 9.7" | 900 × 1200 or 1200 × 900 |
| Mac | 1920 × 1080 |
| Apple TV | 1920 × 1080 |
| Apple Vision Pro | 3840 × 2160 |

## iPhone Duo: previews and screenshots don't share a ratio

This is the trap for 2027 submissions. iPhone Duo **screenshots** use the Duo's own ratio (1398 × 2034 or 2007 × 2853, about 1.45:1, see our [iPhone Duo screenshot size guide](/en/guides/screenshot-size/iphone-duo)). Duo **app previews** use the standard iPhone video size, 886 × 1920 (19.5:9). Apple says the Duo device resolutions on the preview page are "for reference" only.

Apple also says that when a preview's aspect ratio differs from your screenshots, it shows in the **"A Closer Look"** section of the product page instead of first in line. So, reading those two rules together, a Duo preview at 886 × 1920 next to Duo-ratio screenshots should land in "A Closer Look" rather than above your screenshots. Plan your Duo screenshots to carry the main message on their own.

## Video encoding specs

| | H.264 | ProRes 422 (HQ only) |
| --- | --- | --- |
| Target bit rate | 10–12 Mbps | VBR ~220 Mbps |
| Video | Progressive, up to High Profile Level 4.0 | Progressive, no external references |
| Max frame rate | 30 fps | 30 fps |
| Audio | Stereo, 256 kbps AAC, 44.1 or 48 kHz | Stereo, PCM (16/24/32-bit) or 256 kbps AAC, 44.1 or 48 kHz |
| Extensions | .mov, .m4v, .mp4 | .mov |

Audio must be stereo, either one track with two channels (L then R) or two mono tracks (L then R), with all tracks enabled.

## Practical checklist before upload

- Record on device, then export at the **accepted** resolution for each class you target (one 886 × 1920 file covers every Face ID / Dynamic Island iPhone and iPhone Duo).
- Keep it between 15 and 30 seconds and at 30 fps or less. Screen recordings at 60 fps need re-encoding.
- Use H.264 at 10–12 Mbps unless you have a reason for ProRes.
- If the video has audio, export it in the stereo format above (Apple lists stereo AAC or PCM only).
- Pick a poster frame deliberately: it's what people see before the video plays and during install.
- If your UI is the same across sizes and languages, upload only the largest required size; Apple scales it down. Missing localized previews fall back to the next best language.
- Allow up to 24 hours of processing before submitting for review.

## Where DuoShot fits (honestly)

I build [DuoShot](/en), and it doesn't make app preview videos. It makes the **screenshots** that sit next to them: it exports a ZIP at the exact App Store Connect sizes, including the new iPhone Duo formats. If you're preparing a Duo-ready product page, use a video editor for the preview at 886 × 1920 and [DuoShot's tool](/en/tool) for the Duo screenshots.

## Related guides

- [App Store screenshot sizes (all devices)](/en/guides/app-store-screenshot-sizes)
- [App Store creative assets (header and search results)](/en/guides/app-store-creative-assets)
- [iPhone Duo screenshot size](/en/guides/screenshot-size/iphone-duo)
- [iPhone Duo in App Store Connect](/en/guides/iphone-duo-app-store-connect)
- [App Store screenshot guidelines](/en/guides/app-store-screenshot-guidelines)
