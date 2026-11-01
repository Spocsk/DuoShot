---
title: "App Store screenshot sizes 2026 (incl. iPhone Duo)"
description: "Every App Store screenshot size for iPhone Duo, iPhone, iPad, Mac, Apple TV, Vision Pro and Watch, with required slots and a downloadable CSV."
lang: en
slug: app-store-screenshot-sizes
alternate: /guides/app-store-screenshot-sizes
updated: 2026-11-01
---

# App Store screenshot sizes 2026, including iPhone Duo

**Quick answer:** to submit an iPhone app, App Store Connect requires at least one screenshot for **iPhone with Dynamic Island (medium display)**, for example **1206 × 2622** pixels in portrait. iPad apps also need the **iPad 13-inch** size, for example **2064 × 2752**. iPhone Duo (Apple's foldable iPhone) uses **1398 × 2034** for the outer display and **2007 × 2853** for the inner display. Apple accepts up to **10 screenshots per device size**, as opaque PNG or JPEG files without an alpha channel.

All sizes below come from [Apple's screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/), checked on November 1, 2026. Landscape sizes are the same numbers swapped. Download the [full table as CSV](/app-store-screenshot-sizes.csv).

## What is required, and what is optional?

For an iPhone or iPad app, App Store Connect requires only two sizes: iPhone with Dynamic Island (medium display) and, if the app runs on iPad, the iPad 13-inch display. Mac, Apple TV, Apple Vision Pro and Apple Watch apps each have their own required size. Every other iPhone and iPad size is optional, because App Store Connect scales your screenshots down for smaller devices when the interface is the same.

| Slot | Required? | Portrait sizes accepted |
| --- | --- | --- |
| iPhone with Dynamic Island (medium display) | Required for iPhone apps | 1206 × 2622, 1179 × 2556 |
| iPad 13" display | Required if the app runs on iPad | 2064 × 2752, 2048 × 2732 |
| iPhone Duo | Required from April 2027 for apps using the iOS 27.1 SDK or later | 1398 × 2034 (outer), 2007 × 2853 (inner) |
| Mac | Required for Mac apps | 1280 × 800, 1440 × 900, 2560 × 1600, 2880 × 1800 (landscape, 16:10) |
| Apple TV | Required for Apple TV apps | 1920 × 1080, 3840 × 2160 (landscape) |
| Apple Vision Pro | Required for Vision Pro apps | 3840 × 2160 (landscape) |
| Apple Watch | Required for Watch apps | One Watch size, see below |

## iPhone Duo screenshot sizes

iPhone Duo has two displays, so App Store Connect accepts two families of sizes in a single iPhone Duo slot.

| Display | Portrait | Landscape |
| --- | --- | --- |
| Outer display | 1398 × 2034 | 2034 × 1398 |
| Inner display | 2007 × 2853 | 2853 × 2007 |

Apple announced on October 5, 2026 that iPhone Duo would be available to customers from October 23, 2026. In its [iPhone Duo developer news](https://developer.apple.com/news/?id=kkphp5qo), Apple states that, starting April 2027, apps and games submitted will need to include iPhone Duo screenshots. The specifications page words the condition precisely: screenshots will be required for any app using the iOS 27.1 SDK or later. Apps that submit Duo screenshots get a badge on their product page showing they are optimized for iPhone Duo.

The inner display folds in the middle. Keep headlines and important controls away from the fold line so they stay legible. See the [outer display page](/en/1398x2034), the [inner display page](/en/2007x2853) and the [manual upload guide](/en/guides/iphone-duo-app-store-connect).

## iPhone screenshot sizes

| Slot | Example devices | Portrait sizes |
| --- | --- | --- |
| Dynamic Island, large display | iPhone 18 Pro Max, 17 Pro Max, 16 Pro Max, Air, 16 Plus, 15 Pro Max | 1320 × 2868, 1290 × 2796, 1260 × 2736 |
| Dynamic Island, medium display (required) | iPhone 18 Pro, 17 Pro, 17, 16 Pro, 16, 15 Pro, 15, 14 Pro | 1206 × 2622, 1179 × 2556 |
| Face ID, large display | iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max, 11, XS Max, XR | 1284 × 2778, 1242 × 2688 |
| Face ID, medium display | iPhone 17e, 16e, 14, 13, 13 mini, 12, 12 mini, 11 Pro | 1170 × 2532, 1125 × 2436, 1080 × 2340 |
| Home Button, large display | iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus | 1242 × 2208 |
| Home Button, medium display | iPhone SE (2nd and 3rd gen), 8, 7, 6s, 6 | 750 × 1334 |

If you skip the large Dynamic Island slot, App Store Connect falls back to scaled screenshots from the Face ID large display slot, and the reverse also applies. In practice most teams upload the required **1206 × 2622** set and, optionally, a **1320 × 2868** set. See the [1206 × 2622 page](/en/1206x2622) and the [1320 × 2868 page](/en/1320x2868).

## iPad screenshot sizes

| Slot | Example devices | Portrait sizes |
| --- | --- | --- |
| 13" display (required for iPad apps) | iPad Pro (M5, M4), iPad Air (M4, M3, M2) | 2064 × 2752, 2048 × 2732 |
| 12.9" display | iPad Pro (2nd gen) | 2048 × 2732 |
| 11" display | iPad Pro (M5, M4), iPad Air, iPad (A16), iPad mini (A17 Pro) | 1488 × 2266, 1668 × 2420, 1668 × 2388, 1640 × 2360 |
| 10.5" display | iPad Air (3rd gen), iPad (7th to 9th gen) | 1668 × 2224 |
| 9.7" display | Older iPad, iPad Air, iPad mini | 1536 × 2048, 768 × 1024 (and versions without status bar) |

## Mac, Apple TV, Vision Pro and Apple Watch

- **Mac:** one of 1280 × 800, 1440 × 900, 2560 × 1600 or 2880 × 1800, all 16:10.
- **Apple TV:** 1920 × 1080 or 3840 × 2160.
- **Apple Vision Pro:** 3840 × 2160.
- **Apple Watch:** one of 422 × 514 (Ultra 4, Ultra 3), 410 × 502 (Ultra 2, Ultra), 416 × 496 (Series 12, 11, 10), 396 × 484 (Series 9, 8, 7), 368 × 448 (Series 6, 5, 4, SE) or 312 × 390 (Series 3, 2, 1). Use the same Watch size across all localizations.

## Format rules that cause upload errors

- Files must be `.png`, `.jpg` or `.jpeg`.
- Images can't include alpha channels or transparency. A PNG exported with transparency is refused even when the pixels look opaque.
- Dimensions must match one accepted size exactly. A screenshot that is one pixel off is refused.
- Each slot takes between 1 and 10 screenshots.
- Content must follow the App Store Review Guidelines: screenshots should show the app in use, which is why DuoShot starts from your real captures.

Our [free screenshot checker](/en/tools/iphone-duo-screenshot-checker) validates dimensions and transparency in your browser without uploading files. If Apple already rejected your screenshots, read the [rejection decoder](/en/rejection).

## How DuoShot fits in

DuoShot exports frameless screenshots for the iPhone Duo outer and inner displays, the required 6.3" size and the optional 6.9" size, in one ZIP. The free trial includes 2 HD ZIPs with Duo captures and the required 6.3" size. The 6.9" format is available with Pass, Indie and Studio. DuoShot does not cover iPad, Mac, Apple TV, Vision Pro or Watch sizes today. For other tools, see the [screenshot generator comparison](/en/guides/best-app-store-screenshot-generator).

[Prepare your screenshots](/en/tool) or read the [full specifications page](/en/specs).
