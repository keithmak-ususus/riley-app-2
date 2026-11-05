# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Two owners** (the household's two members). They log with one tap on Pixel phones, often one-handed, in the garden, at 6am or late at night, tired. Each has a colour and a `by` stamp on every entry.
- **A wall-mounted iPad Air console** in the kitchen, shared by both owners, read at a glance from across the room. It asks "who's logging?" because it has no single owner. It dims from 22:00 to 06:00.
- **Occasional sitters** (planned, issue #2): they need Riley's routine on one screen and must be able to log, but must not change settings or see health history.
- **Family or visitors** (confirmed, details not yet known): may glance at the iPad or log occasionally. How much access they get is undecided.

## Product Purpose
A household log for a new puppy (Riley, a male puppy arriving 22 December 2026 at 8 weeks old). It makes the trainer's toilet-training plan easy to follow consistently across two people and a sitter: when the next trip outside is due, what to say, what he ate, how he slept, and what is coming up. Success is fewer accidents, no double-feeding, and nobody having to ask "when did he last go out?".

## Positioning
Built around one trainer's specific puppy plan (`GUIDELINES.md`) and one household, not a generic pet tracker. The trip planner, the cues ("Outside", "Busy busy", "Good") and the neutral accident wording come straight from that plan. Logging attributes every action to a person, and a wall console and two phones stay live in sync.

## Operating Context
- Hosted on GitHub Pages as an installable web app; live sync through Firebase Firestore on the free Spark plan; a localStorage demo mode must keep working.
- Two views: phone (under 700px, tab bar) and console (iPad landscape 1180×820, one screen, **no page scroll**). There is a dark theme and a console night mode.
- Logging must stay one tap on phones. Used one-handed, outdoors, in poor light, with little attention to spare.
- Photos are stored in Firestore (no Cloud Storage on the Spark plan).

## Capabilities and Constraints
- Behaviour comes from `GUIDELINES.md`. Toilet-trip timing, on-screen cues and accident wording must follow it. Conflicts are flagged, never silently changed.
- Never scold the puppy in any copy ("bad", "naughty", "no!").
- Coach suggestions must cite a source. Health and feeding advice is general guidance ("usually / ask your vet"), never a diagnosis or a dose.
- British English and en-GB dates. The dog's name comes from settings, never hard-coded in logic.
- No build step and no framework: `index.html` (markup and CSS only), `app.js`, `coach.js`, `photos.js`, `store.js`, `config.js`.
- Colours come from CSS variables in `:root` (including `--p1` and `--p2` for the two people); nothing is hard-coded elsewhere.
- Touch targets are at least 44px.
- Open: how much access family and visitors get.

## Brand Commitments
- The app is called by the dog's name (from settings).
- The paw app icon (`icon-192.png`, `icon-512.png`) is kept. The colour palette and type are open to change if the design pass finds better.

## Evidence on Hand
- `GUIDELINES.md`: a summary of the trainer's puppy plan (the original PDF is kept privately and is not in the repo).
- The coach's cited sources in `coach.js` (`SOURCES`).
- No user research, testimonials or usage data exist yet, because the puppy hasn't arrived. Do not invent any.

## Product Principles
1. **One tap, no thinking.** The common action takes one tap, with big targets and no clever-but-slow interactions.
2. **Calm, never scolding.** The tone is neutral and kind, and every message is about the plan, never about blame.
3. **Readable at a glance, at 6am.** High contrast, calm colours, a clear single next action, and numbers large enough for across the kitchen.
4. **Two people, one truth.** Everything is attributed and in sync, so nobody has to ask the other.
5. **The trainer's plan is the source of truth.** The app follows `GUIDELINES.md`; it doesn't improvise training advice.

## Accessibility & Inclusion
No person-specific accessibility need was reported. The project standard is high contrast, touch targets of at least 44px, readable at arm's length and across the room on the console, and status never conveyed by colour alone.
