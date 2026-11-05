# Design system pass with Impeccable
Labels: design, P2

## Why
The UI grew feature by feature. Before adding more, capture a proper design system so new screens stay consistent, calm and readable at 6am.

## What
1. `/impeccable init`: write `PRODUCT.md` (users: two owners plus occasional sitters; contexts: garden, one-handed, night; devices: Pixel phones and an iPad Air wall console)
2. `/impeccable document`: capture the current system in `DESIGN.md` (colour tokens including the per-person colours, type scale, spacing, radius, the tile, button and tip components, and console vs phone layouts)
3. `/impeccable extract`: pull repeated patterns into tokens and components in `index.html`
4. `/impeccable critique` and `/impeccable audit` for the phone Log tab and the iPad console. Turn the findings into issues
5. `/impeccable polish` on the top findings

## Acceptance criteria
- [ ] `PRODUCT.md` and `DESIGN.md` are committed and referenced from `CLAUDE.md`
- [ ] No hard-coded colours outside `:root`, and dark and night modes still work
- [ ] The console still fits 1180×820 without scrolling
- [ ] Before and after screenshots are attached to the PR
