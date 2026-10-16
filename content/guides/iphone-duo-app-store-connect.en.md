---
title: "iPhone Duo screenshots in App Store Connect"
description: "Prepare iPhone Duo screenshots, choose the Duo, 6.3-inch and optional 6.9-inch slots, and upload manually. DuoShot uploads remain untested."
lang: en
slug: iphone-duo-app-store-connect
alternate: /guides/iphone-duo-app-store-connect
updated: 2026-10-16
---

# iPhone Duo screenshots in App Store Connect

Prepare real captures of your app, export opaque PNG or JPEG files, then upload them manually from your app’s listing in App Store Connect. **DuoShot has not yet tested Duo uploads, including its experimental automatic connector.** File preparation does not guarantee Apple approval.

## Which display slots should you use?

App Store Connect has **one dedicated iPhone Duo slot (APP_IPHONE_DUO) per localization**, shared by the outer and inner screens, accepting **1 to 10 screenshots**. Use outer only, inner only, or a selected mix. The ZIP’s screen folders describe dimensions; they are not separate App Store Connect slots. See [all screenshot specifications](/en/specs).

| Display | Portrait pixels | App Store Connect slot | DuoShot access |
| --- | --- | --- | --- |
| iPhone Duo outer 5.4″ | 1398 × 2034 | iPhone Duo (APP_IPHONE_DUO), shared with inner | Free trial included |
| iPhone Duo inner 7.6″ | 2007 × 2853 | iPhone Duo (APP_IPHONE_DUO), shared with outer | Free trial included |
| iPhone 6.3″ | 1206 × 2622 | Required 6.3″ iPhone slot | Free trial included |
| iPhone 6.9″ | 1320 × 2868 | Optional 6.9″ iPhone slot | Pass, Indie and Studio |

Apple also accepts Duo landscape screenshots: **2034 × 1398** for the outer display and **2853 × 2007** for the inner display. Keep Duo files in the Duo slot, the required 6.3″ set in its own slot, and optional 6.9″ files in theirs. The free trial includes **2 HD ZIPs** after signup, with selected Duo captures and the required 6.3″ size.

## When are Duo screenshots required?

Apple says Duo screenshots will be **required from April 2027 for apps built with the iOS 27.1 SDK or later**. The SDK condition is part of the requirement. Apple’s [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) list this deadline, both Duo display sizes and their landscape variants, and the PNG/JPEG format requirements without alpha channels or transparency.

## Before manual upload

Start from real app captures and check every composition against App Store Review Guideline 2.3.3: screenshots must represent your app accurately. Keep important text and controls clear of the fold in inner-screen captures. DuoShot’s fold guide is a simulated composition aid, not an Apple safe-area specification.

Review the [outer-screen dimensions](/en/1398x2034), [inner-screen dimensions](/en/2007x2853), [required 6.3″ format](/en/1206x2622) and [optional 6.9″ format](/en/1320x2868). [Prepare your screenshots](/en/tool), or read the [screenshot generator comparison](/en/guides/best-app-store-screenshot-generator).

The manual workflow below follows Apple’s [App Store asset management instructions](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets). DuoShot’s upload path remains untested.
