---
name: DuoShot
description: A bright product studio for preparing paired iPhone Duo screenshots.
colors:
  studio-canvas: "#f7f9fa"
  studio-ink: "#172126"
  studio-muted: "#536168"
  studio-line: "#d5dcdf"
  studio-surface: "#ffffff"
  studio-mist: "#e9eff1"
  studio-sea: "#245765"
  studio-warning: "#88502f"
  studio-sea-soft: "#e3eef0"
  studio-sea-line: "#8fb0b8"
  studio-line-strong: "#b9c5ca"
  studio-ok: "#4d8b7b"
  studio-review: "#bc9664"
  studio-deep: "#21333b"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontWeight: 640
    lineHeight: 0.98
    letterSpacing: "-0.065em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.55
  data:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.8rem"
    fontWeight: "400 | 500"
rounded:
  control: "0.8rem"
  field: "0.7rem"
  surface: "1.25rem"
spacing:
  page: "clamp(1.25rem, 3.5vw, 3.5rem)"
  target: "2.85rem"
  header: "4.25rem"
components:
  button-primary:
    backgroundColor: "{colors.studio-ink}"
    textColor: "{colors.studio-surface}"
    rounded: "{rounded.control}"
    height: "3rem"
  button-secondary:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.studio-ink}"
    rounded: "{rounded.control}"
    height: "3rem"
  field:
    backgroundColor: "{colors.studio-surface}"
    textColor: "{colors.studio-ink}"
    rounded: "{rounded.field}"
    height: "{spacing.target}"
---

# Design System: DuoShot

## Overview

DuoShot is a bright product studio ("studio clair"). The closed and open Harbor captures are the visual subject; the interface is the quiet frame around them. The landing persuades by showing the result, not by describing it: the real paired device scene above the fold, then raw captures set against the delivered files, then a scroll narrative. The atelier and companion pages use the same materials with a denser, task-focused hierarchy. Harbor is explicitly a fictional demo app.

## Colors

Cool white canvas, graphite ink, mist surfaces and restrained sea tones. All colours are `--studio-*` tokens defined once in `globals.css`; components do not hard-code hex values. Dark ink carries primary actions: primary buttons are always graphite. Sea (`--studio-sea`) is the single accent and is reserved for progress indicators (scroll progress, import bar, report bars), selected states (billing period, active navigation link with `aria-current`, active pair) and the recommended pricing card (border and badge). Never use sea for a primary button fill. Harbor's blue-green and warm light live inside its screenshots. Warnings use warm brown with written explanations. Never use cobalt CTA fills or warm paper backgrounds from the prior identity.

## Typography

Geist is the shared display and body face, including every label, pill and caption. Large headlines are tight but readable and render in full ink from the server; the hero text is never faded in by script. Working headings use a smaller, stronger weight. IBM Plex Mono is reserved for dimensions, filenames and numeric data and is loaded at 400 and 500 only: never set it at 600–700 (that is faux bold). Write "App Store" with a non-breaking space (`App\u00a0Store`) in titles. Display sizes follow the locale (`formatInches`: 5,4″ in French, 5.4" in English). Marketing copy remains short and uses the visitor's language; product controls name concrete actions. French and English have equal layout priority.

## Layout

The landing hero places one claim and two actions (Préparer mes captures → /tool, Voir l'exemple → /tool?demo=harbor) beside the real Harbor closed/open pair, with each screen's export dimensions drawn under it. The pair and its screenshots are fully visible above the fold at 1440×800 and 390×844. The Apple availability notice sits in its own band right below the devices (the waitlist form lives inside that block). The next section is an avant / après proof: raw captures (wrong size, transparency) on the left, the delivered ZIP on the right with final thumbnails and the real file list — names from the export's `zipEntryPath`, Connect dimensions and weights measured on the example ZIP. The scroll sequence then gives each step its own visual: imported pairs, the pixel inspection with score, the report bars, the pre-submission checks. On wide screens a sticky stage cross-fades between them; on phones the steps form a swipeable row so the home stays near 6,000px tall at 390px. The Tool opens on a persistent working canvas. A compact bar holds the set, creation action, orientation and account state. On desktop, a contextual Captures / Adjust / Check panel sits beside the pair. Below 1024px it follows the canvas without an inner scroll area. On phones, Closed / Open / Compare shows one large capture by default; the panels remain below it.

## Elevation & Depth

Device shadows make the captures feel physical. Routine UI stays mostly flat; a soft shadow identifies raised panels such as the inspector, dialog and selected pricing tier. Avoid ambient glow around ordinary cards.

## Shapes

Controls use softly squared 0.7–0.8rem corners; larger contained surfaces use roughly 1.25rem. Duo frames keep their distinct physical geometry. Circles appear only for step markers and status marks.

## Components

Primary buttons are graphite with white text; secondary buttons are white with a cool gray border. Inputs have visible labels and focus rings. In the Tool, empty device slots show their target dimensions and a direct import action; the separate Captures panel accepts multiple files. One pair strip shows all 1–10 positions, the active pair and missing views. Cropping controls live in Adjust; appearance, copy, output format, hinge and 6.9″ are secondary settings. Check leads with actions, then technical checks, visual alerts and human confirmation; the score is supporting information. Export moves from Prepare files to a delivered file list and Download ZIP. On the landing the devices settle with a CSS transform only (no opacity, so screens are visible in server HTML and without script). GSAP is imported lazily by the landing for the scroll stage only; the stage layout is chosen before first paint (`html.duo-motion`), so loading GSAP never shifts the page, and state 0 is always a complete panel, never an empty device. The Tool uses only brief state changes. Transitions.dev patterns inform menus, panels and state feedback. Pricing reads plans from `src/lib/plans.ts`: individual plans (Essai, any pass, Indie) are cards, Indie is the recommended card in sea, and the multi-seat Studio plan is a full-width "équipe" band. A reassurance line (secure Stripe payment, cancel anytime, invoices) follows the cards; /pricing adds the detailed comparison table and a short FAQ (local projects, refunds as stated in the terms, Apple status). A monthly/annual control shows the full yearly charge and the two-month saving. Segmented controls use 0.8rem corners. All content remains visible when motion is reduced or scripting fails.

## Accessibility

The mobile menu is inert when closed, closes with Escape, focuses its first item on open and returns focus to the toggle on close. Footer links, buttons and inline source links keep a tap target of at least 24px. Small print such as the hero footnote uses `--studio-muted` (#536168) at 0.75rem or larger on every breakpoint. Review images carry numbered alt text ("Capture 2 sur 5, écran fermé").

## Themes

Dark mode is intentionally not supported. The studio is a light, photographic surface for judging screenshots, and `color-scheme: light` is set explicitly.

## Do's and Don'ts

- Show the real closed/open demo pair above the fold and identify Harbor as illustrative.
- Prove value with the delivered result (file names, dimensions, weights), derived from the export code so it stays truthful.
- Keep images, dimensions and final file names visible before download.
- Keep the preview available before signup; ask for an account at download.
- Use animation to reveal hierarchy and state, with a reduced-motion path.
- Do not imply that the report predicts Apple's decision or that DuoShot uploads to App Store Connect.
