---
title: "App Store screenshot guidelines"
description: "App Review rules for screenshots (Guidelines 2.3.3, 2.3.7–2.3.10) and Apple's file rules: up to 10 per size, JPEG or PNG, no transparency."
lang: en
slug: app-store-screenshot-guidelines
alternate: /guides/app-store-screenshot-guidelines
updated: 2026-11-04
published: 2026-11-04
---

# App Store screenshot guidelines: why screenshots get rejected

Screenshots are metadata, so App Review checks them against the same rules as your app name and description. Most rejections come from five lines of Apple's App Review Guidelines (section 2.3, "Accurate Metadata") and from one file rule in App Store Connect. Here they are, quoted from Apple, with what each one means in practice.

## The file rules (App Store Connect)

From Apple's [screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/):

- You must include **at least one screenshot** and can upload **up to 10 per device size**.
- Formats: **.jpeg, .jpg or .png**.
- **"Images can't include alpha channels or transparencies."** A PNG exported with transparency is refused at upload. Flatten it onto an opaque background.
- Required sizes: at least one screenshot for **iPhone with Dynamic Island (medium display)**, and for **iPad 13-inch** if your app supports iPadOS. See our [App Store screenshot sizes guide](/en/guides/app-store-screenshot-sizes) for every pixel size.
- If your UI is the same across sizes and localizations, you only need the highest required resolution; App Store Connect scales it down.
- **iPhone Duo**: 1398 × 2034 (outer display) and 2007 × 2853 (inner display), portrait or landscape. Apple says they'll be required starting in April 2027 for any app using the iOS 27.1 SDK or later. Details in our [iPhone Duo size guide](/en/guides/screenshot-size/iphone-duo).

## The review rules that apply to screenshots

### 2.3.3: show the app in use

"Screenshots should show the app in use, and not merely the title art, login page, or splash screen."

This is the most common screenshot rejection. A set made only of a logo, a marketing slogan on a gradient, or the sign-in screen fails. Apple explicitly allows **text and image overlays**, so captions and backgrounds are fine, as long as the real interface is visible in each shot.

**Fix:** put an actual screen of your app inside every image. Keep captions short and on top of, or around, the UI, not instead of it.

### 2.3.7: no prices or irrelevant terms

"Metadata such as app names, subtitles, screenshots, and previews should not include prices, terms, or descriptions that are not specific to the metadata type."

The same rule bans packing metadata with "trademarked terms, popular app names, pricing information, or other irrelevant phrases just to game the system."

**Fix:** remove "Free", "50% off", "$4.99" and competitor names from your captions. Describe what the screen does.

### 2.3.8: 4+ appropriate, even if your app isn't

"make sure your app and in-app purchase icons, screenshots, and previews adhere to a 4+ age rating even if your app is rated higher."

Apple's example: a violent game should pick images that "don't depict a gruesome death or a gun pointed at a specific character." The terms "For Kids" and "For Children" are reserved for the Kids Category.

### 2.3.9: rights and fake data

"You are responsible for securing the rights to use all materials in your app icons, screenshots, and previews, and you should display fictional account information instead of data from a real person."

**Fix:** use demo accounts with made-up names, emails and photos you have the rights to. No real customer data, no copyrighted artwork you didn't license.

### 2.3.10: no other platforms

"don't include names, icons, or imagery of other mobile platforms or alternative app marketplaces in your app or metadata, unless there is specific, approved interactive functionality."

**Fix:** don't show an Android phone, a Play Store badge or a "Also on Android" line in your App Store screenshots. Use Apple device frames or no frame at all.

### 2.3.1: don't advertise what the app doesn't do

Guideline 2.3.1(a) warns that "marketing your app in a misleading way, such as by promoting content or services that it does not actually offer … or promoting a false price" can lead to removal. A screenshot of a feature that isn't in the build under review counts.

## Pre-submission checklist

- Every screenshot shows a real screen of the app (2.3.3).
- No price, discount or competitor name in captions (2.3.7).
- Imagery is fine for a 4+ audience (2.3.8).
- Demo data only, all assets licensed (2.3.9).
- No Android devices or other store badges (2.3.10).
- Every feature shown exists in the submitted build (2.3.1).
- Files are JPEG or PNG, opaque, at an accepted pixel size, 10 max per size.
- You have the required iPhone size (and iPad 13-inch if you support iPad).

## How DuoShot helps

[DuoShot](/en) exports opaque PNG or JPEG files at Apple's exact sizes, including the iPhone Duo outer and inner displays and the required iPhone size, so the file-level checks pass at upload. The review rules above are about content: DuoShot can't decide that for you, so run the checklist before you submit. You can try it free with 2 HD exports, no card.

Rules quoted from Apple's App Review Guidelines (last updated October 16, 2026) and the App Store Connect screenshot specifications, checked November 4, 2026.
