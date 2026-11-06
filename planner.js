// Toilet-trip rules from Riley's puppy plan (see GUIDELINES.md). Pure: no DOM, no storage, no clock.
// The caller passes `now`, so the app and the scheduled reminder sender (scripts/reminders) share the same rules.

export const MIN = 60000, DAY = 864e5;
export const OUT_TYPES = ["wee", "poo", "out", "walk"];           // anything that counts as a trip outside
export const RETRY_AFTER_NOTHING = 15 * MIN;  // "If he doesn't go within 5 min, back inside, supervise, retry after 10–15 min"
export const AFTER_MEAL = 15 * MIN;           // out after eating
export const AFTER_PLAY = 10 * MIN;           // out after play / training / visitors / excitement

// Newest event of the given types. `events` must be sorted oldest to newest.
export const lastOf = (events, ...types) => {
  for (let i = events.length - 1; i >= 0; i--) if (types.includes(events[i].type)) return events[i];
};
export const isAsleep = (events) => lastOf(events, "sleep", "wake")?.type === "sleep";

// Display helpers. `tz` is optional: the browser uses the device's own zone, the sender passes "Europe/London".
export function ago(ms) {
  const m = Math.max(0, Math.floor(ms / MIN));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}
export const makeFmt = (tz) => ({
  ago,
  hm: (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", ...(tz ? { timeZone: tz } : {}) }),
});

// The next toilet trip. `lo` is the last trip outside. ctx = { events, name, intervalMin, bedMs, now, fmt }.
//   bedMs  – today's bedtime as a timestamp (the caller works it out in its own time zone)
// Returns { due, short, msg } for the earliest rule that applies, or null.
export function nextTrip(lo, { events, name = "Riley", intervalMin = 60, bedMs, now, fmt = makeFmt() }) {
  const { hm, ago: agoFmt } = fmt;
  const interval = (intervalMin || 60) * MIN;
  const since = (ev) => ev && (!lo || lo.at < ev.at);
  const cands = [];
  const acc = lastOf(events, "acc_wee", "acc_poo"), wk = lastOf(events, "sleep", "wake"), ml = lastOf(events, "meal"), pl = lastOf(events, "play", "excited");
  if (since(acc)) cands.push({ due: acc.at, short: "after accident",
    msg: `Accident – take ${name} out to finish. Clean with enzymatic cleaner, no telling off` });
  if (wk?.type === "wake" && since(wk)) cands.push({ due: wk.at, short: "just woke", msg: `Just woke up – take ${name} out now` });
  if (since(ml)) cands.push({ due: ml.at + AFTER_MEAL, short: "after eating", msg: `Ate at ${hm(ml.at)} – time to go out` });
  if (since(pl)) cands.push({ due: pl.at + AFTER_PLAY, short: pl.type === "play" ? "after play" : "after excitement",
    msg: `${pl.type === "play" ? "Play/training" : "Excitement"} at ${hm(pl.at)} – time to go out` });
  if (lo?.type === "out") cands.push({ due: lo.at + RETRY_AFTER_NOTHING, short: "try again",
    msg: `Nothing at ${hm(lo.at)} – try again now (sooner if sniffing, circling or panting)` });
  else if (lo) cands.push({ due: lo.at + interval, short: "hourly", msg: `Hourly trip – last out ${agoFmt(now - lo.at)} ago` });
  if (bedMs != null && now >= bedMs - 30 * MIN && now < bedMs + 3 * 3600e3 && (!lo || lo.at < bedMs - 45 * MIN))
    cands.push({ due: bedMs - 30 * MIN, short: "before bed", msg: `Last trip out before bed` });
  return cands.sort((a, b) => a.due - b.due)[0] || null;
}

// ---- time-zone helpers (the sender runs in UTC but the household is in the UK) ----
// Parts of `ms` as wall-clock time in `tz`.
function zoned(ms, tz) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(ms);
  const g = (t) => +p.find((x) => x.type === t).value;
  return { y: g("year"), mo: g("month"), d: g("day"), h: g("hour"), mi: g("minute"), s: g("second") };
}
// The timestamp of "HH:MM" on the current calendar day in `tz`.
export function clockInZone(now, tz, hhmm) {
  const [hh, mm] = String(hhmm || "00:00").split(":").map(Number), z = zoned(now, tz);
  const offset = Date.UTC(z.y, z.mo - 1, z.d, z.h, z.mi, z.s) - Math.floor(now / 1000) * 1000;   // local minus UTC
  return Date.UTC(z.y, z.mo - 1, z.d, hh || 0, mm || 0) - offset;
}
export const dayKeyInZone = (now, tz) => { const z = zoned(now, tz); return `${z.y}-${String(z.mo).padStart(2, "0")}-${String(z.d).padStart(2, "0")}`; };
// Is `now` inside the quiet window [from, to) in `tz`? The window may wrap midnight (22:00 to 06:00).
export function inQuietHours(now, tz, from, to) {
  const z = zoned(now, tz), cur = z.h * 60 + z.mi;
  const [fh, fm] = String(from || "22:00").split(":").map(Number), [th, tm] = String(to || "06:00").split(":").map(Number);
  const a = (fh || 0) * 60 + (fm || 0), b = (th || 0) * 60 + (tm || 0);
  if (a === b) return false;
  return a < b ? cur >= a && cur < b : cur >= a || cur < b;
}
