---
name: Riley
description: A warm, big-target household noticeboard for a new puppy, glanceable at 6am.
colors:
  cream: "#FBF7F1"
  card-white: "#FFFFFF"
  ink: "#2A2420"
  muted: "#7A6F66"
  line: "#E9E1D7"
  terracotta: "#C2603C"
  terracotta-ink: "#FFFFFF"
  ok: "#3C7D5A"
  ok-bg: "#E7F2EB"
  warn: "#9A6412"
  warn-bg: "#FBEFD9"
  alert: "#B83A2E"
  alert-bg: "#FBE4E1"
  person-one: "#2F6DB5"
  person-two: "#A8457A"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "30px"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'Segoe UI', Roboto, sans-serif"
    fontSize: "30px"
    fontWeight: 700
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
  mono:
    fontFamily: "ui-monospace, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 400
rounded:
  chip: "999px"
  sheet: "22px"
  card: "18px"
  button-sm: "12px"
  tag: "10px"
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

**Creative North Star: "The Kitchen Noticeboard"**

The app is a warm, well-lit household noticeboard. It is pinned to the kitchen wall on the iPad and sits in a pocket on two phones. One clear next action, plain big figures, and everything attributed to a person so nobody has to ask "when did he last go out?". It is practical before it is cute, and calm before it is clever. It is used one-handed, in the garden, at 6am, by tired people, so nothing is small, quiet or slow.

Density is low and the hit targets are large. Colour is warm cream and a single terracotta accent, with soft green, amber and red reserved for status. Depth is a gentle ambient lift, not a drop-shadow showpiece. The type is the platform's own rounded system font, large where it carries a number.

**Key Characteristics:**
- One next action is always the loudest thing on the screen.
- Big, tactile targets (92px on the main log buttons); one tap to log.
- Warm cream and one accent; status colours are soft tinted backgrounds, not alarms.
- The two household members are always identifiable by their fixed colours and initials.
- Three environments, one system: light, dark, and the iPad console's night mode (22:00–06:00).

## Colors

A warm cream and white base with one terracotta accent. Green, amber and red mean status only. Blue and magenta mean *people* only.

### Primary
- **Terracotta** (#C2603C, night #A8512F): the primary log buttons, the active tab, links and the "do" coach tips. It is the only accent. The primary log buttons carry white text on it.

### Neutral
- **Cream** (#FBF7F1; dark #1A1714; night #0F0D0B): the page background.
- **Card White** (#FFFFFF; dark #26211D; night #1A1714): tiles, cards, list rows, inputs, ghost buttons.
- **Ink** (#2A2420; dark #F2EBE3; night #D9CFC4): body text and figures.
- **Muted** (#7A6F66; dark #A99D92; night #8C8076): labels, sub-text and timestamps.
- **Line** (#E9E1D7; dark #3A332D; night #2C2621): row dividers, input borders, empty meal pips.

### Status (each is a text colour on its own tinted background)
- **OK green** (#3C7D5A on #E7F2EB): on track, done, accident-free.
- **Warn amber** (#9A6412 on #FBEFD9): a trip is nearly due, a meal count is off.
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

Spacing rhythm is tight and consistent: 6px between pips, 10px between tiles and buttons, 14–16px card padding, 16px page gutter (28px on the console).

## Elevation & Depth

A single, soft ambient shadow: white cards lift slightly off the cream page. Shadow is ambient, never structural, and never coloured. Toasts and modals sit higher with a deeper shadow. Pressed buttons shrink to 96% and are not given extra shadow.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 1px 2px rgba(42,36,32,.06), 0 4px 14px rgba(42,36,32,.05)`): tiles, cards, list containers, ghost buttons, chips, the avatar.
- **Toast** (`box-shadow: 0 6px 24px rgba(0,0,0,.2)`): the confirmation toast.
- **Modal** (`box-shadow: 0 10px 40px rgba(0,0,0,.25)`): who-is-logging and when-did-it-happen sheets.

### Named Rules
**The Ambient-Only Rule.** Shadow is a gentle lift, never a border substitute or a colour. Nothing glows.

## Shapes

Rounded and friendly, with one dominant radius. Tokens: `--radius` 18px, `--r-ctl-lg` 14px, `--r-ctl` 12px, `--r-sm` 10px, `--r-sheet` 22px, `--r-pill` 999px. **18px** (`--radius`) is the house corner for tiles, cards, nudges and the big log buttons. Controls inside cards step down to **12–14px** (inputs, small buttons, sheet buttons), tags and small buttons to **10px**, status pips to 5px, chips and tags to a full pill, and avatars, badges and icon buttons to circles. Modals are **22px**.

## Components

### Primary log button
- **Shape:** 18px corners, at least 92px tall on phones (80px for the indoor row, 72px on the console).
- **Colour:** terracotta with white text for the Outside actions; the "Nothing" action is a soft terracotta tint with ink text; the Indoors actions are white cards.
- **Behaviour:** emoji above a bold 14–15px label; pressed state scales to 96%. Long-press (about 0.5s) opens the "When?" sheet; a tap logs "now".

### Tile
- **Style:** white card, 18px corners, card lift, 14×16px padding. A quiet 13px label, a Display figure, a muted sub-line.
- **States:** `warn` and `alert` swap to the tinted status background and colour the figure.

### Nudge (the next-action banner)
- **Style:** a full-width tinted banner, 17px bold. Calm = green, warn = amber, alert = red. On the console it grows to 20px.

### Coach tip
- **Style:** white card with a 5px left edge: terracotta = do, amber = soon, green = info. A title, a short body, and a muted source credit.

### Chip and tag
- **Style:** pill, white with card lift for counts; tags are small tinted status pills (over, soon, ok).

### Tab bar
- **Style:** fixed bottom bar with five equal buttons (emoji over a 12px label); the active tab is terracotta; a small dot marks something waiting.

### Toast
- **Style:** inverted pill (ink background, cream text), 14px corners, with an Undo or Edit action; floats above the tab bar.

### Modal / sheet
- **Style:** dimmed backdrop; a 22px-cornered card; large buttons (min 48–56px); the person picker uses the person colours.

### Inputs
- **Style:** card-coloured field, 1px line border, 12px corners, 12px padding; labels are 13px muted above.

## Do's and Don'ts

### Do
- **Do** keep every touch target at least 44px, and the main log buttons far larger.
- **Do** make the next action the largest thing on the screen, using Display figures with tabular numerals.
- **Do** show status with a tinted background *and* words or an icon.
- **Do** use the CSS variables for every colour, and check the dark and the console night modes after any change.
- **Do** keep the console to one screen, with no page scroll, at 1180×820.
- **Do** write neutral, kind copy. An accident is just an accident.

### Don't
- **Don't** add a second accent colour, or use the person colours for status.
- **Don't** put raw colour values outside `:root`.
- **Don't** use shadows as borders or add glow.
- **Don't** use "bad", "naughty" or "no!" anywhere, or any language that scolds the puppy.
- **Don't** hide the primary action behind a menu or a multi-step flow. Logging stays one tap.

### Known gaps (measured contrast, to fix in the design pass)
- White text on terracotta is **4.17:1** (light and dark): below AA for 15px bold text. In the night palette it passes (5.41:1).
- The active tab label and links (terracotta on cream) are **3.91:1** at 12px: below AA.
- OK green on its tint is **4.28:1** and warn amber on its tint is **4.39:1**: just below AA in light mode.
- In dark mode, terracotta *text* on dark surfaces (the active tab, links, "Later" actions) is only **3.8–4.3:1**, because the accent isn't brightened for dark. The detector flags it.
