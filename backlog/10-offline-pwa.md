# Service worker: instant load and offline app shell
Labels: chore, P3

## Why
In the garden with weak signal, the app should open instantly. Firestore already caches data, but the HTML, JS and icons still come from the network.

## What
- A service worker that caches the app shell (cache-first, versioned), with an update prompt when a new version is deployed
- This is also needed later for push notifications (#reminders ticket)

## Acceptance criteria
- [ ] The app opens with no network once it has been visited
- [ ] A new deploy shows "Update available – tap to refresh", with no stale-cache traps
