---
name: Riley
description: A minimal, flat, big-target household log for a new puppy, glanceable at 6am.
colors:
  cream: "#FFFFFF"
  card-white: "#FFFFFF"
  cream-dark: "#1A1714"
  card-dark: "#26211D"
  ink-dark: "#F2EBE3"
  night-bg: "#0F0D0B"
  ink: "#2A2420"
  muted: "#7A6F66"
  line: "#E8E4DF"
  terracotta: "#B5532F"
  terracotta-on-dark: "#D9774F"
  terracotta-ink: "#FFFFFF"
  ok: "#36714F"
  ok-bg: "#E7F2EB"
  warn: "#8F5C10"
  warn-bg: "#FBEFD9"
  alert: "#B83A2E"
  alert-bg: "#FBE4E1"
  person-one: "#2F6DB5"
  person-two: "#A8457A"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "26px"
    fontWeight: 650
    letterSpacing: "-0.02em"
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "17px"
    fontWeight: 650
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  figure:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "42px"
    fontWeight: 750
    letterSpacing: "-0.02em"
  clock:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "40px"
    fontWeight: 700
  title-lg:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "20px"
    fontWeight: 700
  body-md:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 600
  body-sm:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
  caption:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 600
  micro:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 600
  mono:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 400
rounded:
  chip: "999px"
  sheet: "16px"
  card: "12px"
  button-sm: "10px"
  tag: "8px"
  level: "8px"
  bar: "6px"
  pip: "2px"
spacing:
  tight: "6px"
  gap: "10px"
  pad: "14px"
  gutter: "16px"
  console-gutter: "28px"
components:
  button-primary:
    backgroundColor: "{colors.terracotta}"
    textColor: "{colors.terracotta-ink}"
    rounded: "{rounded.card}"
    height: "92px"
  button-ghost:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.button-sm}"
    padding: "13px"
  tile:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  tile-warn:
    backgroundColor: "{colors.warn-bg}"
    textColor: "{colors.warn}"
  tile-alert:
    backgroundColor: "{colors.alert-bg}"
    textColor: "{colors.alert}"
  nudge-calm:
    backgroundColor: "{colors.ok-bg}"
    textColor: "{colors.ok}"
    rounded: "{rounded.card}"
    padding: "14px 16px"
  chip:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "8px 14px"
---

# Design System: Riley

## Overview

**Creative North Star: "The Kitchen Noticeboard"** (minimal pass: flat, white, one accent)**

The app is a warm, well-lit household noticeboard. It is pinned to the kitchen wall on the iPad and sits in a pocket on two phones. One clear next action, plain big figures, and everything attributed to a person so nobody has to ask "when did he last go out?". It is practical before it is cute, and calm before it is clever. It is used one-handed, in the garden, at 6am, by tired people, so nothing is small, quiet or slow.

**Minimal means subtraction.** There are no shadows, no card fills, no emoji and no tinted panels except when something needs attention. Structure comes from white space, hairline dividers (`--line`) and type size. The only filled shapes are the two Outside log buttons (terracotta), a warn or alert banner, and the primary button. Everything else is outlined or plain text. Tabs and log buttons carry a small line icon above the word; tiles, counts and everything else are words only.

**Key Characteristics:**
- One next action is always the loudest thing on the screen.
- Big, tactile targets (92px on the main log buttons); one tap to log.
- Warm cream and one accent; status colours are soft tinted backgrounds, not alarms.
- The two household members are always identifiable by their fixed colours and initials.
- Three environments, one system: light, dark, and the iPad console's night mode (22:00–06:00).

## Colors

A warm cream and white base with one terracotta accent. Green, amber and red mean status only. Blue and magenta mean *people* only.

### Primary
- **Terracotta** (#B5532F; night fill #A8512F): the fill of the primary log buttons, the "To do" tag and the unread dot. It is the only accent. White text on it is 4.95:1.
- **Terracotta text** (`--accent-text`: #B5532F on light, #D9774F on dark, #C96A42 at night): the active tab, links and small accent text. Kept separate from the fill so dark mode can lighten text without weakening the buttons.

### Neutral
- **Cream** (#FBF7F1; dark #1A1714; night #0F0D0B): the page background.
- **Card White** (#FFFFFF; dark #26211D; night #1A1714): tiles, cards, list rows, inputs, ghost buttons.
- **Ink** (#2A2420; dark #F2EBE3; night #D9CFC4): body text and figures.
- **Muted** (#7A6F66; dark #A99D92; night #8C8076): labels, sub-text and timestamps.
- **Line** (#E9E1D7; dark #3A332D; night #2C2621): row dividers, input borders, empty meal pips.

### Status (each is a text colour on its own tinted background)
- **OK green** (#36714F on #E7F2EB): on track, done, accident-free.
- **Warn amber** (#8F5C10 on #FBEFD9): a trip is nearly due, a meal count is off.
- **Alert red** (#B83A2E on #FBE4E1): a trip is due or late, an accident, an error.

### People
- **Person one** (#2F6DB5; dark #6FA3E0; night #5B8CC4) and **Person two** (#A8457A; dark #E08AB8; night #C47AA2): the two household members' badges and picker buttons, from `--p1` and `--p2`. Never reused for status.

### Named Rules
**The One Voice Rule.** Terracotta is the only accent. If everything is terracotta, nothing is the next action.
**The Status-Is-Tint Rule.** Status is a soft tinted background with a matching text colour, never a bare saturated block, so a late trip reads clearly without shouting.
**The Token Rule.** Every colour lives in `:root` as a CSS variable, with dark and night overrides. No raw colour values elsewhere. Beyond the palette above, `--on-media` (white text on photos, person colours and dark overlays), `--scrim`, `--scrim-caption`, `--viewer-bg` and `--viewer-btn` (overlays) and `--shadow-pop` and `--shadow-modal` cover the rest.
**The People-Aren't-Status Rule.** The two person colours never carry status meaning, and status never relies on colour alone (it also has text and an icon or tag).

## Typography

**Font:** the platform system font (`-apple-system`, SF Pro Rounded where present, then Segoe UI and Roboto). No webfont is loaded, which keeps it fast and offline-safe.
**Mono:** `ui-monospace, Menlo` for the household code only.

**Character:** friendly and rounded but plain. Big tabular numerals do the heavy lifting.

### Hierarchy
- **Display** (750, 30px phone / 42px console, tracking −0.02em, tabular numerals): the tile figures, such as "in 12m" and "3 of 4".
- **Headline** (700, 30px phone / 34px console, tracking −0.02em): the dog's name. The console clock is 40px bold, tabular.
- **Title** (650, 16–17px): card and tip headings, buttons.
- **Body** (400, 16px default, line-height about 1.45 in text blocks): sentences, the toilet routine, coach text.
- **Label** (600, 13px; 12px for tab labels; section headings 15px uppercase with +0.06em tracking, muted): field labels, sub-lines, group labels, source credits.

### Named Rules
**The Number-First Rule.** A figure someone must read from across the kitchen is Display weight with tabular numerals; its explanation is a quiet Label beneath it.

## Layout

Single column on phones (under 700px) with a fixed five-tab bar (Log, Today, Train, Health, Photos), a 16px side gutter, and 10px gaps between tiles and buttons. Tiles sit two across; the log buttons sit three across. Settings opens from the ⚙️ button, not a tab.

The **console** (iPad landscape, 1180×820) is one screen with **no page scroll**: a two-column grid (1.25fr / 1fr, 28px gap) holding Log, Today, Coming up and the top coach tip. Figures grow (tile figure 42px) and the indoor log buttons become one row of six. Long lists scroll inside their own box (timeline about 27vh, upcoming about 20vh) so the page itself never does. From 22:00 to 06:00 it switches to the night palette.

**Today (phone)** reads in the order people need it: counts, the timeline, then suggestions (one shown, the rest behind a "+n more" row), then food.

Spacing rhythm is tight and consistent: 6px between pips, 10px between tiles and buttons, 14–16px card padding, 16px page gutter (28px on the console).

## Elevation & Depth

Flat. `--shadow` is `none`; separation is a 1px `--line` hairline, never a shadow. Only the toast and modals sit above the page (modals have a hairline border and a scrim; the toast keeps `--shadow-pop`).

### Named Rules
**The Flat Rule.** No card fills, no drop shadows, no glow. If something needs to stand apart, give it space or a hairline.

## Shapes

Quietly rounded, one dominant radius. Tokens: `--radius` 12px (log buttons, banners), `--r-ctl-lg` 12px, `--r-ctl` 10px (inputs, small buttons), `--r-sm` 8px, `--r-sheet` 16px (modals), `--r-pill` 999px (chips, tags). Avatars and badges are circles.

## Components

### Icons
One set of hand-drawn inline SVG line icons (`<symbol id="i-…">` sprite at the top of `<body>`): 24px grid, 1.75 stroke, round caps, `currentColor`, so they follow light, dark, night and the white-on-terracotta buttons. Never emoji (they differ per device and read as childish). Add a new icon as another `<symbol>`; keep the same stroke.

### Primary log button
- **Shape:** 12px corners, at least 88px tall on phones (64px for the indoor row, 72px on the console). A 22–26px line icon above the label.
- **Colour:** terracotta with white text for Wee and Poo; "Nothing" and every Indoors action are outlined (1.5px `--line`) with ink text.
- **Behaviour:** a line icon and a 15–16px label; pressed state scales to 96%. Long-press (about 0.5s) opens the "When?" sheet; a tap logs "now".

### Tile
- **Style:** no card: a hairline above, 14px padding. A quiet 13px label, a 32px Display figure (42px on the console), a muted sub-line.
- **States:** `warn` and `alert` swap to the tinted status background and colour the figure.

### Nudge (the next-action banner)
- **Style:** calm is plain 19px ink text with no background; warn (amber) and alert (red) are tinted banners. On the console it grows to 20px.

### Coach tip
- **Style:** hairline above, a title with a small level tag (solid terracotta "To do", amber "Soon", green "Good to know"), a short body and a muted source credit. Actions and "Not now" are at least 44px.

### Chip and tag
- **Style:** outlined pill (1px `--line`) for counts; tags are small tinted status pills (over, soon, ok).

### Tab bar
- **Style:** fixed bottom bar with five buttons, each a 24px line icon over a 12px label; the active tab is ink and bold with a 2px terracotta bar above it; a small dot marks something waiting.

### Toast
- **Style:** inverted pill (ink background, cream text), 14px corners, with an Undo or Edit action; floats above the tab bar.

### Modal / sheet
- **Style:** dimmed backdrop; a 16px-cornered hairline-bordered card; large buttons (min 48–56px); the person picker uses the person colours.

### Inputs
- **Style:** 1px line border, 10px corners, 12px padding; labels are 13px muted above.

## Do's and Don'ts

### Do
- **Do** keep every touch target at least 44px, and the main log buttons far larger.
- **Do** make the next action the largest thing on the screen, using Display figures with tabular numerals.
- **Do** show status with a tinted background *and* words or an icon.
- **Do** keep it minimal: icons only on the tabs and log buttons, hairlines over boxes, space over decoration.
- **Do** use the CSS variables for every colour, and check the dark and the console night modes after any change.
- **Do** keep the console to one screen, with no page scroll, at 1180×820.
- **Do** write neutral, kind copy. An accident is just an accident.

### Don't
- **Don't** add a second accent colour, or use the person colours for status.
- **Don't** put raw colour values outside `:root`.
- **Don't** add shadows, card fills, glow, emoji or coloured side borders.
- **Don't** use "bad", "naughty" or "no!" anywhere, or any language that scolds the puppy.
- **Don't** hide the primary action behind a menu or a multi-step flow. Logging stays one tap.

### Contrast status
As of the design pass every text pair measures at least 4.5:1 in light, dark and night, and the detector reports no low-contrast findings. Re-measure after any colour change. Keep the accent *fill* (white text) and the accent *text* colour separate.
