# Phone reminders (push notifications)
Labels: feature, P2

## Why
The countdown only helps if someone is looking at it. A buzz on the Pixels when Riley's due out, or when a treatment is due, would catch missed trips.

## What
- Web push to Android Chrome (and iOS 16.4 or later from the home screen) using Firebase Cloud Messaging and a service worker
- Each person chooses what to receive: trip due, treatment due, photo-of-the-day nudge, and quiet hours
- **Sending needs a server.** Cloud Functions require the paid Blaze plan, so use a **GitHub Actions cron job** (every 15 minutes) that reads Firestore with a service account and sends through the FCM HTTP v1 API. This stays free.
- Only one notification per trip, sent to whoever is "on duty" (or both)

## Acceptance criteria
- [ ] Notifications arrive on a Pixel with the app closed
- [ ] Quiet hours are respected
- [ ] No duplicate notifications for the same trip
- [ ] The service account key is stored as a GitHub secret, never committed
