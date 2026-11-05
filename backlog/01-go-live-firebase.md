# Go live: connect Firebase and test on all three devices
Labels: chore, P1

## Why
The app currently runs in demo mode (one device only). Nothing else matters until the two Pixels and the iPad share live data.

## What
Follow the README: create the Firebase project, turn on anonymous auth, create Firestore (europe-west2), publish `firestore.rules`, and paste the web config into `config.js`. Deploy with GitHub Pages, then install on both Pixels (Chrome → Install app) and the iPad (Safari → Add to Home Screen).

## Acceptance criteria
- [ ] A wee logged on Pixel A appears on the iPad and Pixel B within a few seconds
- [ ] The iPad "Who's logging?" picker shows both names
- [ ] A photo taken on a Pixel shows in the gallery on the other Pixel
- [ ] Logging works with the phone in airplane mode and syncs when it reconnects
- [ ] Settings filled in: both names, breed size, daily grams, the breeder's last worming and flea dates
