// Which phone reminders are due right now, and which devices should get them. Pure: no DOM, no network, no clock.
// Used by the scheduled sender (scripts/reminders/send.mjs); the app only needs DEFAULT_PREFS and KINDS.
import { nextTrip, lastOf, isAsleep, OUT_TYPES, makeFmt, clockInZone, dayKeyInZone, inQuietHours, MIN, DAY } from "./planner.js";

export const TZ = "Europe/London";
export const TRIP_LEAD = 5 * MIN;         // tell people when a trip is due within 5 minutes
export const TRIP_EXPIRES = 45 * MIN;     // but never for a trip that has been due longer than this (no stale alerts after downtime)
export const MORNING = "08:00";           // treatments and appointments are announced from here on the day they're due
export const PHOTO_TIME = "18:00";        // the photo-of-the-day nudge
const TREATMENTS = { worming: "Worming", flea: "Flea & tick" };
const DEFAULT_INTERVALS = { worming: 14, flea: 30 };

export { KINDS, DEFAULT_PREFS, withDefaults } from "./prefs.js";
import { withDefaults } from "./prefs.js";

// Reminders that are due at `now`. Each has a stable `key`, so the sender can send it only once.
export function dueReminders({ now, tz = TZ, events = [], settings = {}, treatments = [], health = [], hasPhotoToday = false }) {
  const name = settings.dogName || "Riley", out = [];
  const today = dayKeyInZone(now, tz), morning = clockInZone(now, tz, MORNING);
  if (settings.arrivalDate && today < settings.arrivalDate) return [];   // he isn't home yet

  // A trip outside (the same rules the app shows, from planner.js). Not while he's asleep.
  const sorted = [...events].sort((a, b) => a.at - b.at);
  if (!isAsleep(sorted)) {
    const lo = lastOf(sorted, ...OUT_TYPES);
    const trip = lo && nextTrip(lo, { events: sorted, name, intervalMin: settings.weeIntervalMin,
      bedMs: clockInZone(now, tz, settings.bedtime || "22:00"), now, fmt: makeFmt(tz) });
    if (trip && trip.due <= now + TRIP_LEAD && now - trip.due <= TRIP_EXPIRES)
      out.push({ key: `trip:${trip.due}`, kind: "trip", tag: "trip", title: `${name}: time for a trip out`, body: trip.msg });
  }

  // Worming and flea treatments: once, on the day they fall due.
  if (now >= morning) for (const kind of Object.keys(TREATMENTS)) {
    const last = treatments.filter((t) => t.kind === kind).sort((a, b) => b.at - a.at)[0];
    if (!last) continue;
    const due = last.at + (settings.intervals?.[kind] || DEFAULT_INTERVALS[kind]) * DAY, dueDay = dayKeyInZone(due, tz);
    if (today >= dueDay) out.push({ key: `treat:${kind}:${dueDay}`, kind: "treatment", tag: `treat-${kind}`,
      title: `${name}: ${TREATMENTS[kind].toLowerCase()} is due`, body: "Log it in the app once it's been given, and the next date is worked out for you." });
  }
  // Vet and other reminders added on the Health tab: once, on their due date.
  if (now >= morning) for (const h of health) {
    if (h.done || !h.due || today < h.due) continue;
    out.push({ key: `health:${h.id}:${h.due}`, kind: "treatment", tag: `health-${h.id}`,
      title: `${name}: ${h.title || h.kind || "reminder"} is due`, body: "Open the app to mark it done." });
  }
  // A nudge if today's photo hasn't been taken by early evening.
  if (!hasPhotoToday && now >= clockInZone(now, tz, PHOTO_TIME))
    out.push({ key: `photo:${today}`, kind: "photo", tag: "photo", title: `${name}: photo of the day`, body: `Today's photo of ${name} hasn't been taken yet.` });
  return out;
}

// Which device gets which reminder, honouring each device's choices and quiet hours.
// A message id is `<reminder key>|<device id>`, so each device is told once even if another was in quiet hours.
export function routeReminders({ reminders, devices, now, tz = TZ, sent = new Set() }) {
  const msgs = [];
  for (const d of devices) {
    if (!d.token) continue;
    const prefs = withDefaults(d.prefs);
    if (prefs.quiet.on && inQuietHours(now, tz, prefs.quiet.from, prefs.quiet.to)) continue;
    for (const r of reminders) {
      const id = `${r.key}|${d.id}`;
      if (!prefs[r.kind] || sent.has(id)) continue;
      msgs.push({ id, deviceId: d.id, token: d.token, title: r.title, body: r.body, tag: r.tag });
    }
  }
  return msgs;
}
