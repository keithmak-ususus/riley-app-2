# CLAUDE.md – Riley app

A household puppy log for Riley. The iPad runs it as a wall console, and two phones log with one tap. It's hosted on GitHub Pages, with live sync through Firebase Firestore (free Spark plan).

## Read first
- **`GUIDELINES.md` is the source of truth for behaviour.** It comes from Riley's trainer. Toilet-trip timing, on-screen cues ("Outside", "Busy busy", "Good") and accident wording must follow it. If a request conflicts with it, say so in the PR description instead of silently changing the behaviour.
- Never add language that scolds the puppy ("bad", "naughty", "no!") anywhere in the UI.
- **Coach suggestions must cite a source** (an entry in `SOURCES` in `coach.js`). Health and feeding advice is general guidance: phrase it as "usually / ask your vet", never as a diagnosis or a dose.

## Files
- `index.html`: markup and CSS only. There's no build step and no framework, so keep it that way.
- `app.js`: all UI logic, in sections (setup, view/tabs, people, logging, trip planner, coach rendering, health, training, photos, settings). The boot call stays at the very bottom.
- `coach.js`: **pure** suggestion engine `coach(ctx) → [{id, area, level, title, body, source, action}]`, with no DOM or storage. `area` is `food | toilet | health | training | prep`, and `level` is `do | soon | info`. `action` is either `{patch}` (merged into settings) or `{tab}`. A stable `id` lets dismissals stick.
- `photos.js`: compresses camera photos into JPEG data URLs (full ≤ 700 KB, thumb ~20 KB). **Photos live in Firestore, not Cloud Storage**, because the Spark plan has no Storage.
- `store.js`: data layer with `subscribe / add / update / remove / setDoc (merge) / get`. Firestore when `config.js` has keys, otherwise a localStorage **demo mode**. Demo mode must keep working.
- `config.js`: Firebase config plus shared defaults.
- `firestore.rules`: if you add a collection, add it to the list there too.

## Data (`households/<code>/…`)
| Collection | Shape |
|---|---|
| `events` | `{type, at, by, grams?}`. Types: `wee poo out acc_wee acc_poo meal play excited sleep wake walk` |
| `treatments` | `{kind: "worming"\|"flea", at, product, by}`. Next due = last + `settings.intervals[kind]` days |
| `training` | `{skill: "name", score 0–5, level}` · `{skill: "crate", minutes, whined}` · `{skill: "social", item, reaction: "happy"\|"unsure"}`, plus `at` and `by` |
| `health` | reminders `{kind, title, due "YYYY-MM-DD", done, doneAt, doneBy}` |
| `weights` | `{kg, at, by}` |
| `photos` / `photoFull` | doc id = `YYYY-MM-DD`. `photos` holds `{thumb, w, h, at, by}` and `photoFull` holds `{full}` (loaded only in the viewer) |
| `settings/main` | `members[2]`, `dogName`, `birthDate`, `arrivalDate`, `adultSize`, `mealsPerDay`, `dailyGrams`, `gramsSetWeight`, `weeIntervalMin`, `bedtime`, `intervals{worming,flea}`, `train{nameLevel}`, `dismissed{id: untilMs}` |

A new event type needs entries in `LABEL` and `EMOJI`, and in `OUT_TYPES` if it counts as a trip outside.

## People
There are exactly two household `members`. Every record stores `by`. Phones log as their owner. On the iPad console, `who()` shows a picker, so any new logging action must go through `await who()`, and must handle `null` (cancelled).

## Two views – always check both
- **Phone** (< 700px or set in Settings): tab bar with Log, Today, Train, Health and Photos. Settings opens from the ⚙️ button.
- **Console** (`body.console`, iPad landscape 1180×820): one screen with Log, Today, Coming up and the top coach tip. It has **no page scroll**, so check that `document.documentElement.scrollHeight <= innerHeight`. It dims from 22:00 to 06:00.
- Touch targets must be at least 44px. Logging must stay one tap on phones.

## Conventions
- British English and en-GB dates. Use the dog's name from settings, never hardcode "Riley" in logic.
- Colours come from the CSS variables (including `--p1` and `--p2` for the two people), and there's a dark theme, so never hardcode colours.
- Escape user text (`esc()`) or set it with `textContent`.
- To test locally, run `python3 -m http.server` and open `localhost:8000` (demo mode).

## How we work
- **Work comes from GitHub Issues.** Before starting, read the issue with `gh issue view <n>`. Restate the acceptance criteria and plan before editing. Keep each change to one issue.
- **Commits** reference the issue (`Fixes #12: …`). Only push to `main` when the user says so, because GitHub Pages deploys from `main`.
- **Check your work before saying it's done:** run `python3 -m http.server 8000` and open `localhost:8000` in demo mode. Check the phone (390×844) and console (1180×820) views, check that the console has no page scroll, and look at the browser console for errors.
- **New ideas** found while working become a new issue (`gh issue create`), not scope creep.

## Design
- Design work uses the **Impeccable** skills (`/impeccable …`). `PRODUCT.md` (who the app is for) and `DESIGN.md` (the visual system) are the design source of truth once they exist. Read them before UI changes, and keep them updated when the system changes.
- The UI is used one-handed, in the garden, at 6am, by tired people. Prefer big targets, high contrast and calm colours, and no clever-but-slow interactions.
- Design tokens live as CSS variables in `:root` in `index.html`. If `DESIGN.md` changes a token, change it there too, and check dark mode and console night mode.
