// Scheduled sender for phone reminders (issue #4). Run by .github/workflows/reminders.yml every 15 minutes.
// Reads Firestore with a service account, works out what is due (reminders.js, planner.js), and sends it through
// Firebase Cloud Messaging. Each message goes to each device once (tracked in households/<hid>/meta/notified).
// No Cloud Functions are needed, so this stays on the free plan.
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { pathToFileURL } from "node:url";
import { dueReminders, routeReminders, TZ } from "../../reminders.js";
import { dayKeyInZone, DAY } from "../../planner.js";

const DEAD_TOKEN = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];

// Connect with a service account (production) or just a project id (the emulator in tests).
export function connect({ serviceAccount, projectId } = {}) {
  const app = initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : { projectId }, "reminders-" + Math.random().toString(36).slice(2));
  return { db: getFirestore(app), messaging: serviceAccount ? getMessaging(app) : null };
}

export async function run({ db, messaging, hid, now = Date.now(), dryRun = false, log = () => {} }) {
  const base = db.collection("households").doc(hid);
  const rows = (s) => s.docs.map((d) => ({ id: d.id, ...d.data() }));
  const [events, settings, treatments, health, devices, notified, photo] = await Promise.all([
    base.collection("events").where("at", ">=", now - 10 * DAY).get().then(rows),
    base.collection("settings").doc("main").get().then((d) => d.data() || {}),
    base.collection("treatments").get().then(rows),
    base.collection("health").get().then(rows),
    base.collection("devices").get().then(rows),
    base.collection("meta").doc("notified").get().then((d) => d.data() || {}),
    base.collection("photos").doc(dayKeyInZone(now, TZ)).get(),
  ]);
  const sent = Object.fromEntries(Object.entries(notified.sent || {}).filter(([, t]) => now - t < 3 * DAY));   // forget old ones
  const reminders = dueReminders({ now, events, settings, treatments, health, hasPhotoToday: photo.exists });
  const msgs = routeReminders({ reminders, devices, now, sent: new Set(Object.keys(sent)) });
  const summary = { devices: devices.length, due: reminders.length, toSend: msgs.length, sent: 0, failed: 0, removed: 0, dryRun };
  if (dryRun) { for (const m of msgs) log(`would send to ${m.deviceId}: ${m.title} – ${m.body}`); return summary; }

  for (const m of msgs) {
    try {
      await messaging.send({ token: m.token, data: { title: m.title, body: m.body, tag: m.tag, url: "./" },
        webpush: { headers: { Urgency: "high", TTL: "1800" } } });
      sent[m.id] = now; summary.sent++;
    } catch (e) {
      if (DEAD_TOKEN.includes(e.code)) { await base.collection("devices").doc(m.deviceId).delete(); summary.removed++; }   // phone uninstalled or re-registered
      else { summary.failed++; log(`send failed for ${m.deviceId}: ${e.code || e.message}`); }                          // retried on the next run
    }
  }
  if (summary.sent || Object.keys(sent).length !== Object.keys(notified.sent || {}).length) await base.collection("meta").doc("notified").set({ sent });
  return summary;
}

async function main() {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT, hid = process.env.RILEY_HOUSEHOLD;
  if (!svc || !hid) { console.log("Reminders aren't set up yet (the FIREBASE_SERVICE_ACCOUNT and RILEY_HOUSEHOLD secrets are missing). Nothing to do."); return; }
  const { db, messaging } = connect({ serviceAccount: JSON.parse(svc) });
  const summary = await run({ db, messaging, hid, dryRun: process.argv.includes("--dry-run"), log: console.log });
  console.log(JSON.stringify(summary));
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
