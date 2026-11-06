// Paste your Firebase web app config here (Firebase console → Project settings → Your apps).
// While apiKey is left as "PASTE_ME", the app runs in DEMO mode: data stays on this one device.
export const firebaseConfig = {
  apiKey: "AIzaSyDT2VHhEMJjJiReqkJfKesylh3vdTNK51E",
  authDomain: "project-riley-30890.firebaseapp.com",
  projectId: "project-riley-30890",
  storageBucket: "project-riley-30890.firebasestorage.app",
  messagingSenderId: "824451744965",
  appId: "1:824451744965:web:9e70ddd30e69c410701cac",
  measurementId: "G-N5DHL78REP",
};

// Web push key for phone reminders (Firebase console → Project settings → Cloud Messaging → Web Push certificates →
// Generate key pair, then paste the public key here). It is public by design, not a secret. See the README.
export const vapidKey = "PASTE_ME";

// Defaults – all editable later in the app's Settings.
export const defaults = {
  dogName: "Riley",
  birthDate: "2026-10-27",   // 8 weeks old on arrival
  arrivalDate: "2026-12-22",
  adultSize: "medium",       // toy | small | medium | large | giant – tunes the meal advice
  mealsPerDay: 4,
  dailyGrams: 0,             // daily food allowance from the bag's feeding guide (0 = not set yet)
  weeIntervalMin: 60,        // take out every hour while awake (Riley's plan)
  bedtime: "22:00",          // "last thing at night" trip reminder starts 30 min before
  members: [],               // the two people in the household – filled in as each phone joins
  intervals: { worming: 14, flea: 30 },  // days between treatments (follow your vet / product label)
};
