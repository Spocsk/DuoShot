---
title: "iPhone Duo screenshots in App Store Connect"
description: "Prepare iPhone Duo (Apple's foldable iPhone) screenshots for manual upload to App Store Connect. DuoShot uploads remain untested."
lang: en
slug: iphone-duo-app-store-connect
alternate: /guides/iphone-duo-app-store-connect
updated: 2026-10-16
---

# iPhone Duo (Apple's foldable iPhone) screenshots in App Store Connect

Prepare real captures of your app, export opaque PNG or JPEG files, then upload them manually from your app’s listing in App Store Connect. **DuoShot (duoshot.site) has not yet tested Duo uploads, including its experimental automatic connector.** File preparation does not guarantee Apple approval.

## Which display slots should you use?

Apple allows **up to 10 screenshots per device size** in App Store Connect. Use outer only, inner only, or a selected mix. The ZIP’s screen folders describe dimensions. See [all screenshot specifications](/en/specs).

| Display | Portrait pixels | App Store Connect slot | DuoShot access |
| --- | --- | --- | --- |
| iPhone Duo outer display | 1398 × 2034 | iPhone Duo | Free trial included |
| iPhone Duo inner display | 2007 × 2853 | iPhone Duo | Free trial included |
| iPhone 6.3″ | 1206 × 2622 | iPhone with Dynamic Island (medium display, 6.3") required | Free trial included |
| iPhone 6.9″ | 1320 × 2868 | Optional 6.9″ iPhone slot | Pass, Indie and Studio |

If the optional 6.9″ screenshots are not provided, App Store Connect uses scaled versions of screenshots from another size: iPhone with Face ID (large display), as specified in [Apple’s screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications).

Apple also accepts Duo landscape screenshots: **2034 × 1398** for the outer display and **2853 × 2007** for the inner display. In App Store Connect, choose the iPhone Duo display for Duo files, 6.3″ for the required 6.3" screenshots, and 6.9″ for optional 6.9″ files. The free trial includes **2 HD ZIPs** after signup, with selected Duo captures and the required 6.3″ size.

## When are Duo screenshots required?

Apple says Duo screenshots will be **required from April 2027 for apps built with the iOS 27.1 SDK or later**. The SDK condition is part of the requirement. Apple’s [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) list this deadline, both Duo display sizes and their landscape variants, and the PNG/JPEG format requirements without alpha channels or transparency.

## Before manual upload

Start from real app captures and check every composition against App Store Review Guideline 2.3.3: screenshots must represent your app accurately. Check that important text and controls stay legible near the fold in inner-screen captures. DuoShot’s fold guide is a simulated composition aid, not an Apple safe-area specification.

Review the [outer-screen dimensions](/en/1398x2034), [inner-screen dimensions](/en/2007x2853), [required 6.3″ format](/en/1206x2622) and [optional 6.9″ format](/en/1320x2868). [Prepare your screenshots](/en/tool), or read the [screenshot generator comparison](/en/guides/best-app-store-screenshot-generator).

The manual workflow below follows Apple’s [App Store asset management instructions](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-your-app-store-assets). DuoShot’s upload path remains untested.
