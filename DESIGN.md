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

DuoShot is a bright product studio. The closed and open Harbor captures are the visual subject; the interface is the quiet frame around them. The landing persuades through a large paired device scene and a scroll narrative. The atelier and companion pages use the same materials with a denser, task-focused hierarchy. Harbor is explicitly a fictional demo app.

## Colors

Cool white canvas, graphite ink, mist surfaces and restrained sea tones. Dark ink carries primary actions; sea tones mark focus and selected states. Harbor's blue-green and warm light live inside its screenshots. Warnings use warm brown with written explanations. Never use cobalt CTA fills or warm paper backgrounds from the prior identity.

## Typography

Geist is the shared display and body face. Large headlines are tight but readable; working headings use a smaller, stronger weight. IBM Plex Mono is reserved for dimensions, filenames and numeric data. Marketing copy remains short and uses the visitor's language; product controls name concrete actions. French and English have equal layout priority.

## Layout

The landing hero fills the opening viewport with the paired Duo objects beneath a single claim and CTA. The following scroll sequence keeps the pair visible while the import, inspection and report ideas pass alongside it. At narrow widths it becomes a linear story. The Tool opens on a persistent working canvas. A compact bar holds the set, creation action, orientation and account state. On desktop, a contextual Captures / Adjust / Check panel sits beside the pair. Below 1024px it follows the canvas without an inner scroll area. On phones, Closed / Open / Compare shows one large capture by default; the panels remain below it.

## Elevation & Depth

Device shadows make the captures feel physical. Routine UI stays mostly flat; a soft shadow identifies raised panels such as the inspector, dialog and selected pricing tier. Avoid ambient glow around ordinary cards.

## Shapes

Controls use softly squared 0.7–0.8rem corners; larger contained surfaces use roughly 1.25rem. Duo frames keep their distinct physical geometry. Circles appear only for step markers and status marks.

## Components

Primary buttons are graphite with white text; secondary buttons are white with a cool gray border. Inputs have visible labels and focus rings. In the Tool, empty device slots show their target dimensions and a direct import action; the separate Captures panel accepts multiple files. One pair strip shows all 1–10 positions, the active pair and missing views. Cropping controls live in Adjust; appearance, copy, output format, hinge and 6.9″ are secondary settings. Check leads with actions, then technical checks, visual alerts and human confirmation; the score is supporting information. Export moves from Prepare files to a delivered file list and Download ZIP. GSAP pairs the equally tall Harbor devices, traces an inspection frame, then reveals a compact report in the landing scroll narrative; the Tool uses only brief state changes. Transitions.dev patterns inform menus, panels and state feedback. Pricing has a monthly/annual segmented control; annual prices show the full yearly charge and the two-month saving. All content remains visible when motion is reduced or scripting fails.

## Do's and Don'ts

- Show the real closed/open demo pair and identify Harbor as illustrative.
- Keep images, dimensions and final file names visible before download.
- Keep the preview available before signup; ask for an account at download.
- Use animation to reveal hierarchy and state, with a reduced-motion path.
- Do not imply that the report predicts Apple's decision or that DuoShot uploads to App Store Connect.
