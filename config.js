// Paste your Firebase web app config here (Firebase console → Project settings → Your apps).
// While apiKey is left as "PASTE_ME", the app runs in DEMO mode: data stays on this one device.
export const firebaseConfig = {
  apiKey: "PASTE_ME",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
};

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
