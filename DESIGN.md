---
name: DuoShot
description: The first-pass docket — cream paper, reviewer ink, unframed Duo fold.
colors:
  proof-cream: "#f4f1ea"
  reviewer-ink: "#141414"
  warm-caption: "#6b645c"
  lifted-sheet: "color-mix(in srgb, #ffffff 78%, var(--background))"
  hairline: "color-mix(in srgb, var(--foreground) 12%, transparent)"
  fold-burn: "color-mix(in srgb, var(--foreground) 78%, #9a5a28)"
  chassis-void: "#16181d"
typography:
  display:
    fontFamily: "Instrument Serif, ui-serif, Georgia, serif"
    fontWeight: 400
    letterSpacing: "-0.02em"
    lineHeight: 0.96
  headline:
    fontFamily: "Instrument Serif, ui-serif, Georgia, serif"
    fontWeight: 400
    fontSize: "2.25rem"
    lineHeight: 1.1
  body:
    fontFamily: "Figtree, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.68rem"
    fontWeight: 500
    letterSpacing: "0.16em"
rounded:
  control: "0.5rem"
  field: "0.85rem"
  menu: "0.95rem"
  drop: "28px"
  pill: "999px"
spacing:
  xs: "0.2rem"
  sm: "0.5rem"
  md: "0.75rem"
  field: "1.15rem"
  page: "1.25rem"
  target: "2.75rem"
  header: "3.75rem"
  container: "72rem"
components:
  button-primary:
    backgroundColor: "{colors.reviewer-ink}"
    textColor: "{colors.proof-cream}"
    rounded: "{rounded.pill}"
    padding: "0.8rem 1.35rem"
    height: "{spacing.target}"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.reviewer-ink}"
    textColor: "{colors.proof-cream}"
    rounded: "{rounded.pill}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.reviewer-ink}"
    rounded: "{rounded.pill}"
    padding: "0.8rem 1.35rem"
    height: "{spacing.target}"
  button-ghost-hover:
    backgroundColor: "color-mix(in srgb, var(--foreground) 5%, transparent)"
    textColor: "{colors.reviewer-ink}"
    rounded: "{rounded.pill}"
  input:
    backgroundColor: "{colors.lifted-sheet}"
    textColor: "{colors.reviewer-ink}"
    rounded: "{rounded.field}"
    padding: "0.7rem 0.85rem"
    height: "{spacing.target}"
    typography: "{typography.body}"
  pill:
    backgroundColor: "{colors.reviewer-ink}"
    textColor: "{colors.proof-cream}"
    rounded: "{rounded.pill}"
    padding: "0.32rem 0.72rem"
    typography: "{typography.label}"
  pill-mute:
    backgroundColor: "color-mix(in srgb, var(--foreground) 8%, transparent)"
    textColor: "{colors.warm-caption}"
    rounded: "{rounded.pill}"
    padding: "0.32rem 0.72rem"
    typography: "{typography.label}"
  drop:
    backgroundColor: "color-mix(in srgb, var(--surface) 70%, transparent)"
    textColor: "{colors.reviewer-ink}"
    rounded: "{rounded.drop}"
    padding: "1.5rem"
  label:
    textColor: "{colors.warm-caption}"
    typography: "{typography.label}"
---

# Design System: DuoShot

## Overview

**Creative North Star: "The First-Pass Docket"**

DuoShot looks like the dossier that lands on the App Store reviewer's desk and holds on the first pass: warm proof cream, near-black ink, captions in uppercase mono. It is a paper instrument, not a SaaS console. Density is operate-mode on `/tool` (scan, act) and persuade-mode on the landing (one claim, then the fold). Personality is impatient with decoration and exact about the fold.

The system has one voice of ink. Action, text, selection, and focus are the same black. Rarity is unused: there is no second brand hue to spend. Warm Proof Cream is the sheet; Lifted Sheet is the slightly brighter field; Warm Caption is the clerk's hand. Harbor gradients exist only inside the demo app screens, never as the product chrome.

Rejected on sight: indigo dashboards, hero metrics, kicker eyebrows, gradient text, glass as decoration, and 3D phone chassis. The Duo silhouette is unframed geometry from real millimetres (outer 84.1×117.8, inner 164.6×117.8), not a generic device mock.

**Key Characteristics:**
- Cream sheet + single ink; no second accent
- Instrument Serif for display, Figtree for body, IBM Plex Mono for clerk labels
- Pill CTAs; dashed drops; segmented radios
- Flat at rest; shadow only when a menu is a layer
- Device radii from Duo mm, never a stock phone frame

## Colors

A warm paper sheet with one ink. Color encodes action and status, not category decoration.

### Primary
- **Reviewer Ink**: the only action color and the body text. Buttons, focus rings, selection, nav emphasis. Same token as `--foreground` / `--accent`.

### Neutral
- **Warm Proof Cream**: page canvas (`--background`). Every product surface sits on this sheet.
- **Lifted Sheet**: fields, menus, drop hover (`--surface`). A cream mixed with white, not a cool grey panel.
- **Warm Caption**: secondary text, labels, pills-mute (`--muted`).
- **Hairline**: 12% ink, borders and rules (`--line`).
- **Chassis Void**: landing device chrome only (`--device`), never a product panel fill.

### Semantic
- **Fold Burn**: warnings (`--warn`). Umber mixed from ink, not Tailwind amber.

### Named Rules
**The One Ink Rule.** There is no brand blue, no second accent. If it needs to shout, it is Reviewer Ink on cream, or cream on Reviewer Ink.

**The Sheet Is Not Grey Rule.** Neutral surfaces stay warm (cream / lifted sheet). Cool grey panels are off-brand.

## Typography

**Display Font:** Instrument Serif (Georgia)
**Body Font:** Figtree (system sans)
**Label/Mono Font:** IBM Plex Mono

**Character:** A clerk's serif for the claim, a quiet sans for the work, a mono stamp for measurements. Display is tight and a little ink-wet; labels are uppercase, tracked, small.

### Hierarchy
- **Display** (400, landing `text-5xl`/`text-6xl` ~3–3.75rem, line-height 0.96, tracking tight): hero and page titles. Max about 6rem. Never fluid-shrink a tool h1 in a sidebar.
- **Headline** (400, ~2.25rem / `text-4xl`): tool title, section titles on read pages.
- **Title** (serif 1.05rem on listbox trigger; sans `text-xl` for the landing pitch).
- **Body** (400, 1rem, Figtree): UI copy, leads. Muted color for supporting prose. Measure ~65ch on long read pages (`max-w-3xl`).
- **Label** (500, 0.62–0.68rem, 0.16em, uppercase, Plex Mono): field labels, duo captions, pills.

### Named Rules
**The Clerk Stamp Rule.** Pixels, counts, and shelf names wear mono uppercase. Marketing claims wear serif. Do not swap them.

**The Specs Stay Off Stage Rule.** Exact pixel strings belong on `/specs` and in tool checks, not in the hero or tool lead.

## Layout

Container `max-w-6xl` (72rem), horizontal `px-5` (1.25rem). Sticky header `3.75rem`. Touch floor `--target` `2.75rem`.

Landing: one column until `lg`, then `minmax(0,32rem)` copy + fold stage. Tool: one column until `lg`, then `1fr` + `18.5rem` options rail. Preview duo: CSS subgrid, columns `84.1fr 164.6fr` (closed/open mm), shared caption / glass / checks rows. Below `640px`, the duo stacks to one column.

Rhythm: tight inside a field (`0.45rem` under labels, `0.2rem` inside a segment), generous between groups (`1.15rem` field stack, `2.5rem` tool section gaps). More space above a heading than below it.

Breakpoints observed: `640px` (duo stack), `768px` (header nav vs burger), `1024px`/`lg` (two-column shells), `1280px` (landing compare).

## Elevation & Depth

Flat by default. Depth is tonal (cream vs lifted sheet) and a 1px hairline. Shadows are a state, not furniture.

### Shadow Vocabulary
- **Listbox rest** (`box-shadow: 0 10px 24px rgb(20 20 20 / 0.05)`): the closed set trigger only.
- **Menu layer** (`box-shadow: 0 18px 40px rgb(20 20 20 / 0.12)`): open listbox menu.
- **Accepted compare** (`box-shadow: 0 16px 36px rgb(20 20 20 / 0.12)`): landing “ok” shot, not product chrome.
- **Focus CTA** (`box-shadow: 0 0 0 2px var(--foreground)` plus inner cream outline): because the primary button clips overflow.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. A shadow means a layer opened or a control is focused — never a card trying to look expensive.

## Shapes

Pills for actions and segments (`999px`). Fields and menus are softly squared (`0.85rem` / `0.95rem`). Drops are a larger round-rect (`28px`) with a dashed 2px hairline. Toggles use a small control radius (`0.5rem`) on the hit row and a pill track.

The Duo silhouette is the signature geometry: outer `border-radius: 5% 16% 16% 5% / 3.5% 11% 11% 3.5%` (hinge side tighter); inner `7.3% / 10%` with a vertical crease. These percentages come from the device, not from a UI kit.

### Named Rules
**The Unframed Fold Rule.** Preview glass follows Duo millimetres. Do not drop in a generic iPhone frame, notch, or chassis.

## Components

Refined and restrained: little chrome, ink carries the action, pills and dashed sheets instead of cards-in-cards.

### Buttons
- **Shape:** full pill (`999px`), min-height `2.75rem`, padding `0.8rem 1.35rem`, weight 500, `0.95rem`.
- **Primary (`.ds-cta`):** Reviewer Ink fill, cream type. Hover: 0.9 opacity plus a cream wash that fills from the bottom (`420ms`). Active: `scale(0.98)`. Disabled: 0.45 opacity, no press.
- **Ghost (`.ds-cta-ghost`):** hairline border, transparent fill, 5% ink wash on hover.
- **Text (`.ds-text-btn`):** underline, `2.75rem` hit, no × glyphs as icons.
- **Focus:** 2px ink ring, offset 2px globally; primary uses an inner cream outline so the ring survives `overflow: hidden`.
- **Ease:** `cubic-bezier(0.23, 1, 0.32, 1)` at `150ms` for press; longer only for the CTA fill.

### Chips
- **Pill ink:** mono uppercase, Reviewer Ink fill, cream type — quota / plan.
- **Pill mute:** 8% ink wash, Warm Caption type — exhausted quota.

### Cards / Containers
- Product UI does not use nested cards. Groups are proximity + a hairline (aside border on the tool rail).
- Drops are the large container: dashed, `28px` corners, min-height `11.5rem`.
- Header: sticky, `82%` cream + backdrop blur — the only blur; it is the bar over scrolling paper, not glassmorphism.

### Inputs / Fields
- **Style:** Lifted Sheet, `0.85rem` radius, 1px hairline, `2.75rem` min-height, `1rem` type (no iOS zoom).
- **Focus:** 2px ink at 35% mix, offset 1px.
- **Labels:** `.ds-label` associated with `htmlFor` / `id`. Uppercase mono.
- **Segments:** pill track, `role="radiogroup"`, selected segment is ink fill. Arrow keys move the choice.
- **Toggle:** full-width `2.75rem` row; track `2.75×1.5rem`; thumb cream on ink when on.

### Navigation
- Wordmark: Instrument Serif `text-xl`. Desktop links: `text-sm` Warm Caption, ink on hover. Burger `2.75rem`, clip-path circle menu, `inert` when closed, reduced-motion skips the tween.
- Skip link: pill, ink fill, off-canvas until focus.

### Signature: Duo preview
- `.preview-duo` subgrid; glasses share a baseline. Empty glass is 6% ink wash, em dash, no fake screenshot.
- Hinge overlay is a vertical gradient on inner only; it is a check, not decoration. Burn-into-export is an explicit toggle.

## Do's and Don'ts

### Do:
- **Do** keep action, text, and focus on Reviewer Ink (`#141414`) against Warm Proof Cream (`#f4f1ea`).
- **Do** size interactive rows to `--target` (`2.75rem`).
- **Do** align closed/open previews on a shared baseline (subgrid), and stack them below `640px`.
- **Do** stamp measurements in IBM Plex Mono uppercase.
- **Do** honor `prefers-reduced-motion` on the fold and the burger.

### Don't:
- **Don't** introduce a second brand hue, gradient text, or glass panels.
- **Don't** wrap the product in a phone chassis or a generic device frame.
- **Don't** put 1398×2034-class jargon in the hero or the tool lead.
- **Don't** use emoji or “×” as the icon system; name the action (Supprimer).
- **Don't** lift every card with a shadow. Flat until a layer opens.
- **Don't** rebrand DuoShot as Harbor; Harbor is the demo listing only.
