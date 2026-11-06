import { openStore, DEMO } from "./store.js";
import { defaults } from "./config.js";
import { coach, NAME_LEVELS, SOCIAL_ITEMS } from "./coach.js";
import { compressPhoto } from "./photos.js";

const $ = (s) => document.querySelector(s);
const ls = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
             set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
             del: (k) => { try { localStorage.removeItem(k); } catch {} } };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const MIN = 60000, DAY = 864e5, WEEK = 7 * DAY;
const LABEL = { wee: "Wee outside", poo: "Poo outside", out: "Out – nothing", acc_wee: "Wee indoors", acc_poo: "Poo indoors",
  meal: "Meal", play: "Play / training", excited: "Visitors / excited", sleep: "Fell asleep", wake: "Woke up", walk: "Walk" };
// Optional poo detail (issue #11). General notes for the vet, never a diagnosis.
const SHAPES = { firm: "Firm", soft: "Soft", loose: "Loose", watery: "Watery" };
const COLOURS = { usual: "Usual", dark: "Dark", pale: "Pale", green: "Green or yellow", red: "Red-streaked" };
const isPoo = (t) => t === "poo" || t === "acc_poo";
const pooDetail = (e) => [SHAPES[e.shape], COLOURS[e.colour], e.note].filter(Boolean).join(" · ");
const EMOJI = { wee: "💧", poo: "💩", out: "🚪", acc_wee: "⚠️", acc_poo: "⚠️", meal: "🍽️", play: "🎾", excited: "🎉",
  sleep: "😴", wake: "☀️", walk: "🦮" };
const OUT_TYPES = ["wee", "poo", "out", "walk"];  // anything that counts as a trip outside
const TREAT = { worming: "Worming", flea: "Flea & tick" };

let store, events = [], health = [], weights = [], treatments = [], training = [], photos = [], shared = { ...defaults };
let me = ls.get("riley:me", ""), household = ls.get("riley:hh", "");

// =====================================================================
// Setup
// =====================================================================
const params = new URLSearchParams(location.search);
if (params.get("h")) { household = params.get("h"); ls.set("riley:hh", household); history.replaceState(null, "", location.pathname); }
if (DEMO) { $("#setupDemo").classList.remove("hidden"); $("#demoNote").classList.remove("hidden"); }

function showSetup() {
  $("#setup").classList.remove("hidden");
  if (household) $("#joinCode").value = household;
  $("#setupName").value = me;
  $("#createHh").onclick = () => {
    const rnd = crypto.getRandomValues(new Uint8Array(12));
    join("riley-" + Array.from(rnd, (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join(""));
  };
  $("#joinHh").onclick = () => { const c = $("#joinCode").value.trim(); if (c.length >= 16) join(c); else alert("That code looks too short."); };
}
function join(code) {
  const n = $("#setupName").value.trim();
  if (!n) { $("#setupName").focus(); return; }
  me = n; household = code; ls.set("riley:me", me); ls.set("riley:hh", household);
  $("#setup").classList.add("hidden"); start();
}

let subscribed = false;

// ---- Google sign-in and owner access (rules are in firestore.rules) ----
function showSignIn(problem) {
  $("#app").classList.add("hidden"); $("#signin").classList.remove("hidden");
  const err = $("#signinErr"), email = store.user()?.email;
  err.classList.toggle("hidden", !problem);
  if (problem === "denied") err.textContent = `${email || "This Google account"} isn't an owner of this household. Ask the other owner to add your email in Settings, or sign in with a different account.`;
  else if (problem && problem !== "denied") err.textContent = problem;
  $("#googleBtn").textContent = email ? "Sign in with a different Google account" : "Sign in with Google";
  $("#googleBtn").onclick = async () => {
    err.classList.add("hidden");
    try { if (email) await store.signOut(); await store.signIn(); start(); }
    catch (e) { if (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request") return; err.textContent = signInMessage(e); err.classList.remove("hidden"); }
  };
  $("#signinLeave").onclick = () => { ls.del("riley:hh"); location.reload(); };
}
function signInMessage(e) {
  if (e.code === "auth/unauthorized-domain") return "This site isn't an authorised domain in Firebase yet (Authentication → Settings → Authorised domains).";
  if (e.code === "auth/operation-not-allowed") return "Google sign-in isn't switched on in Firebase yet (Authentication → Sign-in method → Google).";
  return "Couldn't sign in: " + (e.message || e.code);
}
// Make sure this Google account has a members/<uid> record. The first account to arrive creates the owners
// list (containing itself), so the existing household is claimed by whoever signs in first.
async function claimAccess() {
  const user = store.user(); if (!user) return "ok";  // demo mode
  const email = (user.email || "").toLowerCase();
  const record = () => ({ role: "owner", name: me || user.displayName || email, email, createdAt: Date.now() });
  try { if (await store.get("members", user.uid)) return "ok"; } catch {}
  try { await store.setDoc("members", user.uid, record()); return "ok"; } catch {}
  try { await store.setDoc("meta", "owners", { emails: [email] }); } catch { return "denied"; }
  try { await store.setDoc("members", user.uid, record()); return "ok"; } catch { return "denied"; }
}
let ownerEmails = [];
async function loadOwners() {
  if (!store.user()) return;
  try { ownerEmails = (await store.get("meta", "owners"))?.emails || []; } catch {}
  const mine = (store.user().email || "").toLowerCase(), others = ownerEmails.filter((e) => e !== mine);
  $("#ownersField").classList.remove("hidden"); $("#signOutBtn").classList.remove("hidden");
  $("#sOwn1").value = mine; $("#sOwn1").readOnly = true; $("#sOwn2").value = others[0] || "";
}
$("#signOutBtn").onclick = async () => { if (confirm("Sign out of Google on this device?")) { await store.signOut(); location.reload(); } };

async function start() {
  $("#app").classList.remove("hidden");
  applyView();
  try { store = store || await openStore(household); }
  catch (e) { $("#nudge").textContent = "Couldn't connect: " + e.message; $("#nudge").className = "nudge"; return; }
  if (store.needsSignIn()) return showSignIn();
  $("#signin").classList.add("hidden");
  const access = await claimAccess();
  if (access !== "ok") return showSignIn(access);
  if (subscribed) return; subscribed = true;
  loadOwners();
  const since = Date.now() - 10 * DAY;
  store.subscribe("events", (rows, err) => { if (rows) { events = rows; render(); } else if (err) showSignIn("denied"); }, since);
  store.subscribe("health", (rows) => { if (rows) { health = rows; renderHealth(); } });
  store.subscribe("weights", (rows) => { if (rows) { weights = rows.sort((a, b) => a.at - b.at); renderWeights(); render(); } });
  store.subscribe("treatments", (rows) => { if (rows) { treatments = rows; renderHealth(); render(); } });
  store.subscribe("training", (rows) => { if (rows) { training = rows.sort((a, b) => a.at - b.at); renderTrain(); render(); } });
  store.subscribe("photos", (rows) => { if (rows) { photos = rows.sort((a, b) => a.day.localeCompare(b.day)); renderPhotos(); render(); } });
  store.subscribe("settings", (rows) => {
    const s = rows && rows.find((r) => r.id === "main");
    shared = { ...defaults, ...(s || {}), intervals: { ...defaults.intervals, ...(s?.intervals || {}) } };
    ensureMember();
    fillSettings(); render(); renderHealth(); renderTrain(); renderPhotos();
  });
  setInterval(render, 20000);
  render(); renderHealth(); renderTrain();
}

// Each phone adds its person to the household's two members the first time it connects.
let memberSync = false;
function ensureMember() {
  const m = shared.members || [];
  if (memberSync || !me || m.includes(me) || m.length >= 2 || document.body.classList.contains("console")) return;
  memberSync = true;
  store.setDoc("settings", "main", { members: [...m, me] }).finally(() => (memberSync = false));
}

// =====================================================================
// View: phone vs console, tabs
// =====================================================================
function isConsole() { return document.body.classList.contains("console"); }
function applyView() {
  const pref = ls.get("riley:view", "auto");
  const c = pref === "console" || (pref === "auto" && Math.min(innerWidth, innerHeight) >= 700);
  document.body.classList.toggle("console", c);
  if (c) keepAwake(); else showTab(ls.get("riley:tab", "log"));
}
addEventListener("resize", () => ls.get("riley:view", "auto") === "auto" && applyView());
$("#viewToggle").onclick = () => { ls.set("riley:view", "console"); applyView(); };
// On the console there is no Settings screen, so Settings switches this device to phone view (asks first, since the iPad is shared).
function consoleToSettings() {
  if (!confirm("Open Settings? This switches this device to phone view. Use the Console button to switch back.")) return;
  ls.set("riley:view", "phone"); applyView(); showTab("settings");
}
// Back from console to phone view. On a phone it's immediate; on a tablet or desktop it asks first (the iPad is shared).
$("#phoneView").onclick = () => {
  if (innerWidth >= 700 && !confirm("Switch this device to phone view? Use the monitor button to switch back.")) return;
  ls.set("riley:view", "phone"); applyView();
};
$("#gear").onclick = () => (isConsole() ? consoleToSettings() : showTab("settings"));

let wakeLock;
async function keepAwake() {
  try { if ("wakeLock" in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request("screen"); wakeLock.onrelease = () => (wakeLock = null); } } catch {}
}
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && isConsole() && keepAwake());

const TABS = ["log", "today", "train", "health", "photos", "settings", "guide"];
function showTab(t) {
  if (!TABS.includes(t)) t = "log";
  ls.set("riley:tab", t);
  for (const id of TABS) $("#" + id).classList.toggle("hidden", id !== t);
  document.querySelectorAll("nav.tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  scrollTo(0, 0);
  if (t === "guide") renderGuide();
}
document.querySelectorAll("nav.tabs button").forEach((b) => (b.onclick = () => showTab(b.dataset.tab)));

// =====================================================================
// People
// =====================================================================
const members = () => (shared.members || []).filter(Boolean).slice(0, 2);
function badge(name) {
  const i = members().indexOf(name);
  return `<span class="badge${i >= 0 ? " p" + (i + 1) : ""}" title="${esc(name)}">${esc((name || "?").trim()[0]?.toUpperCase() || "?")}</span>`;
}
const byline = (name) => (name ? `<span class="byline">${badge(name)}${esc(name)}</span>` : "");

// On the shared iPad, ask which of the two people is logging. Phones log as their owner.
function who(title = "Who's logging?") {
  const m = members();
  if (!isConsole() || m.length < 2) return Promise.resolve(me || m[0] || "");
  return new Promise((resolve) => {
    const modal = $("#whoModal"), box = $("#whoPeople");
    $("#whoTitle").textContent = title;
    box.innerHTML = "";
    m.forEach((name, i) => {
      const b = document.createElement("button");
      b.textContent = name; b.style.background = `var(--p${i + 1})`;
      b.onclick = () => done(name); box.append(b);
    });
    const timer = setTimeout(() => done(null), 15000);
    function done(v) { clearTimeout(timer); modal.classList.add("hidden"); resolve(v); }
    $("#whoCancel").onclick = () => done(null);
    modal.classList.remove("hidden");
  });
}

// =====================================================================
// Logging
// =====================================================================
let toastTimer;
function toast(msg, buttons = [], ms = 5000) {
  document.querySelector(".toast")?.remove(); clearTimeout(toastTimer);
  const el = document.createElement("div"); el.className = "toast";
  const span = document.createElement("span"); span.textContent = msg; el.append(span);
  for (const [label, fn] of buttons) {
    const b = document.createElement("button"); b.textContent = label;
    b.onclick = () => { el.remove(); fn(); }; el.append(b);
  }
  document.body.append(el); toastTimer = setTimeout(() => el.remove(), ms);
}
// After a poo: one tap on a shape saves it; skipping costs nothing (it dismisses itself).
function pooPrompt(id, ev, msg) {
  document.querySelector(".toast")?.remove(); clearTimeout(toastTimer);
  const el = document.createElement("div"); el.className = "toast pooq";
  const mk = (label, fn) => { const b = document.createElement("button"); b.type = "button"; b.textContent = label; b.onclick = () => { el.remove(); fn(); }; return b; };
  const top = document.createElement("div"); top.className = "tq-top";
  const span = document.createElement("span"); span.textContent = msg;
  top.append(span, mk("Undo", () => store.remove("events", id)));
  const label = document.createElement("div"); label.className = "tq-label"; label.textContent = "How was it? (optional)";
  const chips = document.createElement("div"); chips.className = "tq-chips";
  for (const [k, v] of Object.entries(SHAPES)) chips.append(mk(v, async () => {
    await store.update("events", id, { shape: k });
    toast(`${LABEL[ev.type]} · ${v}`, [["Add more", () => editEntry({ id, ...ev, shape: k })]], 5000);
  }));
  chips.append(mk("More…", () => editEntry({ id, ...ev })));
  el.append(top, label, chips); document.body.append(el);
  toastTimer = setTimeout(() => el.remove(), 10000);
}
const portion = () => (shared.dailyGrams ? Math.round(shared.dailyGrams / Math.max(1, shared.mealsPerDay || 4)) : 0);

async function log(type, at = Date.now()) {
  const by = await who(`${LABEL[type]} – who's logging?`);
  if (by === null) return;
  const ev = { type, at, by };
  if (type === "meal" && portion()) ev.grams = portion();
  const id = await store.add("events", ev);
  navigator.vibrate?.(30);
  const undo = ["Undo", () => store.remove("events", id)];
  const when = Date.now() - at > MIN ? ` at ${hm(at)}` : "";
  if (type === "acc_poo") pooPrompt(id, ev, `Logged${when} – no telling off. Enzymatic cleaner, no bleach or ammonia`);
  else if (type.startsWith("acc_")) toast(`Logged${when} – no telling off. Enzymatic cleaner, no bleach or ammonia`, [undo], 8000);
  else if (type === "out") toast(`Logged${when} – supervise closely, try again in 10–15 min`, [undo], 8000);
  else if (type === "meal") toast(`Meal${ev.grams ? ` · ${ev.grams} g` : ""} logged${when}`, [undo, ["Edit", () => editEntry({ id, ...ev })]], 6000);
  else if (isPoo(type)) pooPrompt(id, ev, `${LABEL[type]} logged${when}`);
  else toast(`${LABEL[type]} logged${when}`, [undo]);
}

// ---------- log something that happened earlier ----------
// Events older than the 10-day window the app loads would vanish, so stop a little short of it.
const MAX_BACK = 9 * DAY;
const earlierUsed = () => ls.get("riley:usedEarlier", "") === "1";
function showEarlierHint() { $("#earlierHint").classList.toggle("hidden", earlierUsed()); }
showEarlierHint();

// "HH:MM" → today at that time; if that's still ahead of us, it must have been yesterday.
function timeToday(v) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v || ""); if (!m) return null;
  const d = new Date(); d.setHours(+m[1], +m[2], 0, 0);
  if (d.getTime() > Date.now()) d.setDate(d.getDate() - 1);
  return d.getTime();
}
// Resolves to a timestamp, or null if cancelled.
function askWhen(title) {
  return new Promise((resolve) => {
    const modal = $("#whenModal"), pick = $("#whenPick"), time = $("#whenTime");
    $("#whenTitle").textContent = title;
    pick.classList.add("hidden");
    const finish = (v) => { modal.classList.add("hidden"); if (v !== null) { ls.set("riley:usedEarlier", "1"); showEarlierHint(); } resolve(v); };
    $("#whenGrid").onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.min === "pick") { time.value = hm(Date.now()); pick.classList.remove("hidden"); time.focus(); return; }
      finish(Date.now() - +b.dataset.min * MIN);
    };
    $("#whenSet").onclick = () => { const at = timeToday(time.value); if (at !== null) finish(at); };
    $("#whenCancel").onclick = () => finish(null);
    modal.classList.remove("hidden");
  });
}

// Edit an existing entry's time (and grams, for meals). Keeps the entry on its original day.
function editEntry(ev) {
  const modal = $("#editModal"), err = $("#editErr"), isMeal = ev.type === "meal";
  $("#editTitle").textContent = `${LABEL[ev.type] || ev.type}`;
  $("#editTime").value = hm(ev.at);
  $("#editGramsWrap").classList.toggle("hidden", !isMeal);
  $("#editGrams").value = ev.grams ?? portion() ?? "";
  const poo = isPoo(ev.type), pick = { shape: ev.shape || "", colour: ev.colour || "" };
  $("#editPoo").classList.toggle("hidden", !poo);
  $("#editNote").value = ev.note || "";
  for (const [field, box] of [["shape", $("#editShape")], ["colour", $("#editColour")]]) {
    box.innerHTML = Object.entries(field === "shape" ? SHAPES : COLOURS)
      .map(([k, v]) => `<button type="button" data-v="${k}" aria-pressed="${pick[field] === k}">${esc(v)}</button>`).join("");
    box.onclick = (e) => {
      const b = e.target.closest("button"); if (!b) return;
      pick[field] = pick[field] === b.dataset.v ? "" : b.dataset.v;   // tap again to clear
      box.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === pick[field])));
    };
  }
  err.classList.add("hidden");
  const close = () => modal.classList.add("hidden");
  const fail = (msg) => { err.textContent = msg; err.classList.remove("hidden"); };
  $("#editCancel").onclick = close;
  $("#editSave").onclick = async () => {
    const m = /^(\d{1,2}):(\d{2})$/.exec($("#editTime").value); if (!m) return fail("Pick a time");
    const d = new Date(ev.at); d.setHours(+m[1], +m[2], 0, 0);
    const at = d.getTime(), patch = {};
    if (at > Date.now()) return fail("That time hasn't happened yet");
    if (Date.now() - at > MAX_BACK) return fail("That's too far back");
    if (at !== ev.at) patch.at = at;
    if (isMeal) {
      const g = Math.round(+$("#editGrams").value);
      if (!(g >= 0 && g < 2000)) return fail("Grams should be between 0 and 1999");
      if (g !== ev.grams) patch.grams = g;
    }
    if (poo) {
      const note = $("#editNote").value.trim().slice(0, 140);
      if (pick.shape !== (ev.shape || "")) patch.shape = pick.shape;
      if (pick.colour !== (ev.colour || "")) patch.colour = pick.colour;
      if (note !== (ev.note || "")) patch.note = note;
    }
    close();
    if (Object.keys(patch).length) await store.update("events", ev.id, patch);
  };
  modal.classList.remove("hidden");
}

// Long-press (≈0.5 s) runs `onHold` instead of the normal tap.
function holdable(root, onHold) {
  let timer, fired = false, x0 = 0, y0 = 0;
  const cancel = () => clearTimeout(timer);
  root.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    fired = false; x0 = e.clientX; y0 = e.clientY; cancel();
    timer = setTimeout(() => { fired = true; navigator.vibrate?.(15); onHold(b); }, 500);
  });
  root.addEventListener("pointermove", (e) => { if (Math.hypot(e.clientX - x0, e.clientY - y0) > 10) cancel(); });
  ["pointerup", "pointercancel", "pointerleave"].forEach((t) => root.addEventListener(t, cancel));
  root.addEventListener("contextmenu", (e) => e.preventDefault());
  // Swallow the click that follows a long press so it doesn't also log "now".
  root.addEventListener("click", (e) => { if (fired) { fired = false; e.stopPropagation(); e.preventDefault(); } }, true);
}

let accAt = null;  // time chosen for an accident via long-press on the main Accident button
$("#actions").onclick = (e) => {
  const b = e.target.closest(".act"); if (!b) return;
  const t = b.dataset.type;
  if (t === "accident") { accAt = null; $("#accSheet").classList.toggle("hidden"); return; }
  if (t === "nap") return log(isAsleep() ? "wake" : "sleep");
  log(t);
};
$("#accSheet").onclick = (e) => {
  const v = e.target.dataset.acc; if (v === undefined) return;
  $("#accSheet").classList.add("hidden");
  const at = accAt ?? Date.now(); accAt = null;
  if (v) log(v, at);
};
holdable($("#actions"), async (b) => {
  const t = b.dataset.type; if (!t) return;
  if (t === "accident") {
    const at = await askWhen("Accident – when?");
    if (at !== null) { accAt = at; $("#accSheet").classList.remove("hidden"); }
    return;
  }
  const type = t === "nap" ? (isAsleep() ? "wake" : "sleep") : t;
  const at = await askWhen(`${LABEL[type]} – when?`);
  if (at !== null) log(type, at);
});
holdable($("#accSheet"), async (b) => {
  const v = b.dataset.acc; if (!v) return;
  const at = await askWhen(`${LABEL[v]} – when?`);
  if (at !== null) { $("#accSheet").classList.add("hidden"); accAt = null; log(v, at); }
});

// =====================================================================
// Derived state
// =====================================================================
const last = (...types) => { for (let i = events.length - 1; i >= 0; i--) if (types.includes(events[i].type)) return events[i]; };
const isAsleep = () => last("sleep", "wake")?.type === "sleep";
const midnight = (ms = Date.now()) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
const today = () => events.filter((e) => e.at >= midnight());
const dayKey = (ms) => new Date(ms).toLocaleDateString("en-CA");
function ago(ms) {
  const m = Math.max(0, Math.floor(ms / MIN));
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h ${String(m % 60).padStart(2, "0")}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
}
const hm = (t) => new Date(t).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const fmtDay = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const dob = () => new Date((shared.birthDate || defaults.birthDate) + "T00:00").getTime();
const arrival = () => (shared.arrivalDate ? new Date(shared.arrivalDate + "T00:00").getTime() : 0);
const weekAt = (ms) => Math.floor((ms - dob()) / WEEK);

function sleepToday() {
  let total = 0, start = null;
  const t0 = midnight();
  const prior = [...events].reverse().find((e) => e.at < t0 && (e.type === "sleep" || e.type === "wake"));
  if (prior?.type === "sleep") start = t0;
  for (const e of today()) {
    if (e.type === "sleep" && start === null) start = e.at;
    if (e.type === "wake" && start !== null) { total += e.at - start; start = null; }
  }
  if (start !== null) total += Date.now() - start;
  return total;
}

// ---------- toilet-trip planner (rules from Riley's puppy plan – see GUIDELINES.md) ----------
const RETRY_AFTER_NOTHING = 15 * MIN;  // "If he doesn't go within 5 min, back inside, supervise, retry after 10–15 min"
const AFTER_MEAL = 15 * MIN;           // out after eating
const AFTER_PLAY = 10 * MIN;           // out after play / training / visitors / excitement
const OUT_WORD = { wee: "wee", poo: "poo", out: "nothing", walk: "walk" };

function bedtimeToday() {
  const [hh, mm] = String(shared.bedtime || "22:00").split(":").map(Number);
  const d = new Date(); d.setHours(hh || 22, mm || 0, 0, 0); return d.getTime();
}
function nextTrip(lo, now) {
  const name = shared.dogName || "Riley";
  const interval = (shared.weeIntervalMin || 60) * MIN;
  const since = (ev) => ev && (!lo || lo.at < ev.at);
  const cands = [];
  const acc = last("acc_wee", "acc_poo"), wk = last("sleep", "wake"), ml = last("meal"), pl = last("play", "excited");
  if (since(acc)) cands.push({ due: acc.at, short: "after accident",
    msg: `Accident – take ${name} out to finish. Clean with enzymatic cleaner, no telling off` });
  if (wk?.type === "wake" && since(wk)) cands.push({ due: wk.at, short: "just woke", msg: `Just woke up – take ${name} out now` });
  if (since(ml)) cands.push({ due: ml.at + AFTER_MEAL, short: "after eating", msg: `Ate at ${hm(ml.at)} – time to go out` });
  if (since(pl)) cands.push({ due: pl.at + AFTER_PLAY, short: pl.type === "play" ? "after play" : "after excitement",
    msg: `${pl.type === "play" ? "Play/training" : "Excitement"} at ${hm(pl.at)} – time to go out` });
  if (lo?.type === "out") cands.push({ due: lo.at + RETRY_AFTER_NOTHING, short: "try again",
    msg: `Nothing at ${hm(lo.at)} – try again now (sooner if sniffing, circling or panting)` });
  else if (lo) cands.push({ due: lo.at + interval, short: "hourly", msg: `Hourly trip – last out ${ago(now - lo.at)} ago` });
  const bed = bedtimeToday();
  if (now >= bed - 30 * MIN && now < bed + 3 * 3600e3 && (!lo || lo.at < bed - 45 * MIN))
    cands.push({ due: bed - 30 * MIN, short: "before bed", msg: `Last trip out before bed` });
  return cands.sort((a, b) => a.due - b.due)[0] || null;
}

// ---------- coach ----------
function suggestions() {
  return coach({
    now: Date.now(), name: shared.dogName, dob: dob(), arrival: arrival(), size: shared.adultSize,
    mealsPerDay: +shared.mealsPerDay || 4, dailyGrams: +shared.dailyGrams || 0, gramsSetWeight: shared.gramsSetWeight,
    weeIntervalMin: +shared.weeIntervalMin || 60, intervals: shared.intervals, train: shared.train,
    events, weights, treatments, training, dismissed: shared.dismissed,
  });
}
function tipCard(s, compact = false) {
  const el = document.createElement("div");
  el.className = "tip " + s.level;
  const src = s.source?.url ? `<a href="${esc(s.source.url)}" target="_blank" rel="noopener">${esc(s.source.name)}</a>` : esc(s.source?.name || "");
  const LEVEL = { do: "To do", soon: "Soon", info: "Good to know" };
  el.innerHTML = `<div class="tiptitle"><h3>${esc(s.title)}</h3><span class="tag ${esc(s.level)}">${LEVEL[s.level] || ""}</span></div><p>${esc(s.body)}</p>` + (compact ? "" :
    `<div class="foot"><span class="src">${src}</span>
      ${s.action ? `<button class="btn small act-btn">${esc(s.action.label)}</button>` : ""}
      <button class="later">${s.level === "info" ? "Got it" : "Not now"}</button></div>`);
  if (!compact) {
    el.querySelector(".later").onclick = () => dismiss(s.id, s.level === "info" ? 3650 : 1);
    const ab = el.querySelector(".act-btn");
    if (ab) ab.onclick = async () => {
      if (s.action.patch) { await store.setDoc("settings", "main", s.action.patch); toast("Updated"); dismiss(s.id, 3650); }
      if (s.action.tab) showTab(s.action.tab);
    };
  }
  return el;
}
const dismiss = (id, days) => store.setDoc("settings", "main", { dismissed: { [id]: Date.now() + days * DAY } });

let coachOpen = false;  // Today shows one suggestion; the rest are one tap away
function renderCoach() {
  const all = suggestions();
  const todayList = all.filter((s) => s.area !== "training"), trainList = all.filter((s) => s.area === "training");
  const ct = $("#coachToday"); ct.innerHTML = "";
  (coachOpen ? todayList : todayList.slice(0, 1)).forEach((s) => ct.append(tipCard(s)));
  if (todayList.length > 1) {
    const more = document.createElement("button"); more.className = "btn ghost more";
    more.textContent = coachOpen ? "Show fewer" : `+${todayList.length - 1} more suggestion${todayList.length > 2 ? "s" : ""}`;
    more.onclick = () => { coachOpen = !coachOpen; renderCoach(); };
    ct.append(more);
  }
  $("#coachTodayWrap").classList.toggle("hidden", !todayList.length);
  const tr = $("#coachTrain"); tr.innerHTML = "";
  if (!trainList.length) tr.innerHTML = `<div class="card muted">Nothing new – keep practising little and often.</div>`;
  trainList.forEach((s) => tr.append(tipCard(s)));
  const dot = (tab, on) => document.querySelector(`nav.tabs [data-tab="${tab}"]`).classList.toggle("dot", on);
  dot("today", todayList.some((s) => s.level === "do"));
  dot("train", trainList.some((s) => s.level === "do"));
  const top = all.find((s) => s.level === "do" && s.area !== "prep") || all.find((s) => s.level === "soon");
  const tip = $("#consoleTip"); tip.innerHTML = "";
  if (top) tip.append(tipCard(top, true));
}

// =====================================================================
// Main render
// =====================================================================
function render() {
  if (!store) return;
  const now = Date.now(), name = shared.dogName || "Riley";
  document.title = name;
  $("#dogName").textContent = name;
  $("#age").textContent = ageText();
  $("#clock").textContent = new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const h = new Date().getHours();
  document.documentElement.classList.toggle("night", isConsole() && (h >= 22 || h < 6));

  const asleep = isAsleep();
  const lp = last("poo", "acc_poo"), lm = last("meal"), ls_ = last("sleep", "wake");
  const lo = last(...OUT_TYPES);
  const trip = asleep ? null : nextTrip(lo, now);

  // Next trip out
  const to = $("#tOut"); to.className = "tile";
  const toBig = to.querySelector(".big"), toSub = to.querySelector(".sub");
  if (asleep) { toBig.textContent = "Paused"; toSub.textContent = "Asleep – out straight after waking"; }
  else if (!trip) { toBig.textContent = "–"; toSub.textContent = "Log a trip out to start"; }
  else {
    const left = trip.due - now;
    if (left > 0) { toBig.textContent = `in ${ago(left + 59999)}`; if (left <= 5 * MIN) to.classList.add("warn"); }
    else { toBig.textContent = -left < 120000 ? "Now" : `${ago(-left)} late`; to.classList.add("alert"); }
    toSub.textContent = lo ? `Last out ${hm(lo.at)} · ${OUT_WORD[lo.type]}${lo.by ? " · " + lo.by : ""}` : trip.short;
  }

  // Since poo
  const tp = $("#tPoo");
  tp.querySelector(".big").textContent = lp ? ago(now - lp.at) : "–";
  tp.querySelector(".sub").textContent = lp ? `${hm(lp.at)} · ${lp.type === "poo" ? "outside" : "indoors"}` : "Nothing logged";

  // Meals + grams
  const n = Math.max(1, +shared.mealsPerDay || 4), meals = today().filter((e) => e.type === "meal");
  const grams = meals.reduce((s, e) => s + (e.grams || 0), 0), target = +shared.dailyGrams || 0;
  $("#tMeal .big").textContent = `${meals.length} of ${n}`;
  $("#tMeal .meals").innerHTML = Array.from({ length: n }, (_, i) => `<span class="${i < meals.length ? "on" : ""}"></span>`).join("");
  $("#tMeal .sub").textContent = target ? `${grams} of ${target} g` : "";
  $("#tMeal").className = "tile" + (meals.length > n || (target && grams > target + 5) ? " warn" : "");

  // Sleep
  const tsl = $("#tSleep");
  tsl.querySelector(".label").textContent = asleep ? "Asleep for" : "Awake for";
  tsl.querySelector(".big").textContent = ls_ ? ago(now - ls_.at) : "–";
  tsl.querySelector(".sub").textContent = `${ago(sleepToday())} sleep today`;
  const nb = $("#napBtn"); nb.querySelector("use").setAttribute("href", asleep ? "#i-sun" : "#i-moon"); nb.lastElementChild.textContent = asleep ? "Woke up" : "Nap";

  // Nudge (toilet first, then feeding)
  const nudge = $("#nudge"); let msg = "", level = "calm", showRoutine = false;
  if (asleep) msg = `Sleeping since ${hm(ls_.at)} – take ${name} out straight after waking`;
  else if (trip && trip.due <= now) { msg = trip.msg; level = "alert"; showRoutine = true; }
  else if (trip && trip.due - now <= 5 * MIN) { msg = `Out in ${ago(trip.due - now + 59999)} – ${trip.short}`; level = "warn"; }
  else if (lo?.type === "out" && trip) { msg = `Nothing last time – supervise closely, try again at ${hm(trip.due)}`; level = "warn"; }
  else if (meals.length > n) { msg = `${meals.length} meals logged today – check nobody's double-fed`; level = "warn"; }
  else if (meals.length < n && h >= 7 && h < 21 && lm && now - lm.at > 4 * 3600e3) { msg = `Last meal ${ago(now - lm.at)} ago – next one due?`; level = "warn"; }
  else msg = trip ? `All good · next trip out ${hm(trip.due)} (${trip.short})` : `Log ${name}'s first trip outside to start the timer`;
  nudge.textContent = msg; nudge.className = "nudge " + level;
  $("#routine").classList.toggle("hidden", !showRoutine);

  // Photo of the day
  const todayPhoto = photos.find((p) => p.day === dayKey(now));
  $("#photoNudge").classList.toggle("hidden", !!todayPhoto || h < 8 || now < arrival());
  const latest = photos[photos.length - 1];
  const av = $("#hdrPhoto");
  if (latest?.thumb) { if (av.src !== latest.thumb) av.src = latest.thumb; av.classList.remove("hidden"); } else av.classList.add("hidden");

  renderToday(); renderCoach(); renderUpcoming(); renderGuide();
}

function ageText() {
  const days = Math.floor((Date.now() - dob()) / DAY);
  if (isNaN(days) || days < 0) return "";
  const w = Math.floor(days / 7), d = days % 7, pl = (n, s) => `${n} ${s}${n === 1 ? "" : "s"}`;
  let t = days < 7 ? `${pl(days, "day")} old` : days < 7 * 26 ? `${pl(w, "week")}${d ? " " + pl(d, "day") : ""} old` : `${Math.floor(days / 30.44)} months old`;
  const arr = arrival();
  if (arr && Date.now() < arr) t += ` · home in ${Math.ceil((arr - Date.now()) / DAY)} days`;
  return t;
}

function renderToday() {
  const t = today();
  const c = (ty, list = t) => list.filter((e) => ty.includes(e.type)).length;
  const outside = c(["wee", "poo"]), acc = c(["acc_wee", "acc_poo"]);
  $("#counts").innerHTML = [
    ["Trips out", c(OUT_TYPES)], ["Wees outside", c(["wee"])], ["Poos outside", c(["poo"])],
    ["Accidents", acc], ["Went outside", outside + acc ? `${Math.round((100 * outside) / (outside + acc))}%` : "–"],
  ].map(([l, v]) => `<span class="chip">${l} <b>${v}</b></span>`).join("");

  // who did what today
  $("#byPerson").innerHTML = members().map((m) => {
    const mine = t.filter((e) => e.by === m);
    return `<span class="chip">${badge(m)} ${esc(m)} · <b>${c(OUT_TYPES, mine)}</b> trips · <b>${c(["meal"], mine)}</b> meals · <b>${mine.length}</b> logs</span>`;
  }).join("");

  renderFood();

  const tl = $("#timeline"); tl.innerHTML = "";
  if (!t.length) { tl.innerHTML = `<div class="empty">Nothing logged yet today</div>`; return; }
  [...t].reverse().forEach((e, i) => {
    const row = document.createElement("div"); row.className = "row";
    const isMeal = e.type === "meal";
    const detail = isPoo(e.type) ? pooDetail(e) : "";
    const hint = isMeal ? "Tap to edit time or grams" : detail ? esc(detail) : isPoo(e.type) && i === 0 ? "Tap to add detail" : i === 0 ? "Tap to edit time" : "";
    row.innerHTML = `<span class="t">${hm(e.at)}</span>
      <button class="what">${esc(LABEL[e.type] || e.type)}${isMeal && e.grams ? ` · ${e.grams} g` : ""}${hint ? `<small>${hint}</small>` : ""}</button>
      ${byline(e.by)}<button class="x" aria-label="Delete">×</button>`;
    row.querySelector(".what").onclick = () => editEntry(e);
    row.querySelector(".x").onclick = () => confirm(`Delete "${LABEL[e.type]}" at ${hm(e.at)}?`) && store.remove("events", e.id);
    tl.append(row);
  });
}

function renderFood() {
  const target = +shared.dailyGrams || 0;
  const g = (k) => events.filter((e) => e.type === "meal" && dayKey(e.at) === k).reduce((s, e) => s + (e.grams || 0), 0);
  const todayG = g(dayKey(Date.now()));
  $("#foodToday").textContent = target ? `${todayG} of ${target} g today` : `${todayG} g today`;
  $("#foodPortion").textContent = target ? `${portion()} g × ${shared.mealsPerDay}` : "Set daily grams in Settings";
  const bar = $("#foodBar"); bar.classList.toggle("over", target && todayG > target + 5);
  bar.firstElementChild.style.width = target ? `${Math.min(100, (100 * todayG) / target)}%` : "0";
  const days = Array.from({ length: 8 }, (_, i) => { const t = Date.now() - (7 - i) * DAY; return g(dayKey(t)); });
  const max = Math.max(target, ...days, 1), bw = 300 / 8;
  $("#foodChart").innerHTML = days.map((v, i) => {
    const hgt = (88 * v) / max;
    return `<rect x="${i * bw + 4}" y="${96 - hgt}" width="${bw - 8}" height="${hgt}" rx="4" fill="${target && v > target + 5 ? "var(--alert)" : "var(--ok)"}" opacity="${i === 7 ? 1 : .65}"/>`;
  }).join("") + (target ? `<line x1="0" x2="300" y1="${96 - (88 * target) / max}" y2="${96 - (88 * target) / max}" stroke="var(--muted)" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>` : "");
}

// =====================================================================
// Health: reminders, treatments, weight
// =====================================================================
const fmtDate = (d) => new Date(d + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const daysUntil = (ms) => Math.round((midnight(ms) - midnight()) / DAY);
const dueTag = (days) => days < 0 ? `<span class="tag over">${-days}d overdue</span>` : days === 0 ? `<span class="tag over">Today</span>`
  : days <= 7 ? `<span class="tag soon">in ${days}d</span>` : "";

function lastTreatment(kind) { return treatments.filter((t) => t.kind === kind).sort((a, b) => b.at - a.at)[0]; }
function nextTreatmentDue(kind) {
  const l = lastTreatment(kind); if (!l) return null;
  return l.at + (shared.intervals?.[kind] || defaults.intervals[kind]) * DAY;
}
async function logTreatment(kind, atMs, product) {
  const by = await who(`${TREAT[kind]} given – by who?`);
  if (by === null) return;
  await store.add("treatments", { kind, at: atMs, product: product || "", by });
  toast(`${TREAT[kind]} logged`);
}

function renderUpcoming() {
  const items = [];
  for (const kind of ["worming", "flea"]) {
    const due = nextTreatmentDue(kind), l = lastTreatment(kind);
    if (due) items.push({ sort: due, title: TREAT[kind] + (l.product ? ` – ${l.product}` : ""), sub: fmtDay(due), days: daysUntil(due),
      action: ["Given", () => logTreatment(kind, Date.now(), l.product)] });
  }
  for (const h of health.filter((x) => !x.done)) {
    const t = new Date(h.due + "T00:00").getTime();
    items.push({ sort: t, title: h.kind + (h.title ? ` – ${h.title}` : ""), sub: fmtDate(h.due), days: daysUntil(t),
      action: ["Done", async () => { const by = await who("Marked done by?"); if (by !== null) store.update("health", h.id, { done: true, doneAt: Date.now(), doneBy: by }); }] });
  }
  items.sort((a, b) => a.sort - b.sort);
  const up = $("#upcoming"); up.innerHTML = "";
  if (!items.length) up.innerHTML = `<div class="empty">Nothing scheduled yet – log treatments and add jabs from your vet</div>`;
  for (const it of items) {
    const row = document.createElement("div"); row.className = "row";
    row.innerHTML = `<span class="what">${esc(it.title)}<small>${esc(it.sub)}</small></span>${dueTag(it.days)}<button class="done-btn">${it.action[0]}</button>`;
    row.querySelector(".done-btn").onclick = it.action[1];
    up.append(row);
  }
}

function renderHealth() {
  if (!store) return;
  renderUpcoming();
  // treatments card
  const tc = $("#treatments"); tc.innerHTML = "";
  for (const kind of ["worming", "flea"]) {
    const l = lastTreatment(kind), due = nextTreatmentDue(kind), gap = shared.intervals?.[kind] || defaults.intervals[kind];
    const card = document.createElement("div"); card.className = "card";
    const history = treatments.filter((t) => t.kind === kind).sort((a, b) => b.at - a.at).slice(0, 4);
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <h3>${TREAT[kind]}</h3>${due ? dueTag(daysUntil(due)) || `<span class="tag ok">Next ${fmtDay(due)}</span>` : `<span class="tag soon">Not logged</span>`}
      </div>
      <div class="muted" style="font-size:14px">${l ? `Last: ${fmtDay(l.at)}${l.product ? " · " + esc(l.product) : ""} · ${esc(l.by || "")}` : "Ask the breeder when he was last treated, and log it here."} · every ${gap} days</div>
      <div class="form"><div class="three">
        <input type="date" class="t-date" aria-label="Date given" value="${dayKey(Date.now())}">
        <input class="t-prod" placeholder="Product" value="${esc(l?.product || "")}">
        <button class="btn small t-log">Log</button>
      </div></div>
      <div class="hist">${history.map((t) => `<span>${fmtDay(t.at)}${t.product ? " · " + esc(t.product) : ""} ${t.by ? "· " + esc(t.by) : ""}</span>`).join("")}</div>`;
    card.querySelector(".t-log").onclick = () => {
      const d = card.querySelector(".t-date").value; if (!d) return;
      const at = d === dayKey(Date.now()) ? Date.now() : new Date(d + "T12:00").getTime();
      logTreatment(kind, at, card.querySelector(".t-prod").value.trim());
    };
    tc.append(card);
  }
  // done reminders
  const done = health.filter((h) => h.done).sort((a, b) => b.doneAt - a.doneAt).slice(0, 8);
  const dl = $("#doneList"); dl.innerHTML = done.length ? "" : `<div class="empty">Nothing yet</div>`;
  for (const h of done) {
    const row = document.createElement("div"); row.className = "row";
    row.innerHTML = `<span class="what">${esc(h.kind + (h.title ? ` – ${h.title}` : ""))}<small>${fmtDay(h.doneAt)}</small></span>${byline(h.doneBy)}<button class="x" aria-label="Undo">↺</button>`;
    row.querySelector(".x").onclick = () => store.update("health", h.id, { done: false });
    dl.append(row);
  }
}
$("#hDate").value = dayKey(Date.now());
$("#hAdd").onclick = async () => {
  const due = $("#hDate").value; if (!due) return;
  await store.add("health", { kind: $("#hKind").value, title: $("#hTitle").value.trim(), due, done: false, by: me, at: Date.now() });
  $("#hTitle").value = ""; toast("Reminder added");
};

function renderWeights() {
  const svg = $("#wChart"), pts = weights.slice(-20);
  if (!pts.length) { svg.innerHTML = ""; $("#wLatest").textContent = "No weights logged yet"; return; }
  const l = pts[pts.length - 1];
  $("#wLatest").innerHTML = `Latest <b>${l.kg} kg</b> · ${fmtDay(l.at)}${l.by ? " · " + esc(l.by) : ""}`;
  if (pts.length < 2) { svg.innerHTML = ""; return; }
  const ks = pts.map((p) => p.kg), lo = Math.min(...ks), hi = Math.max(...ks), span = hi - lo || 1;
  const t0 = pts[0].at, ts = (pts[pts.length - 1].at - t0) || 1;
  const xy = pts.map((p) => [8 + (284 * (p.at - t0)) / ts, 108 - (96 * (p.kg - lo)) / span]);
  svg.innerHTML = `<polyline fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" points="${xy.map((p) => p.join(",")).join(" ")}"/>` +
    xy.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--accent)"/>`).join("");
}
$("#wAdd").onclick = async () => {
  const kg = parseFloat($("#wKg").value); if (!(kg > 0 && kg < 120)) return;
  const by = await who("Weighed by?"); if (by === null) return;
  await store.add("weights", { kg, at: Date.now(), by }); $("#wKg").value = ""; toast("Weight logged");
};

// =====================================================================
// Training
// =====================================================================
function renderTrain() {
  if (!store) return;
  const lvl = shared.train?.nameLevel || 0;
  $("#nameLevels").innerHTML = NAME_LEVELS.map((l, i) => `<span class="${i === lvl ? "on" : i < lvl ? "done" : ""}">${esc(l)}</span>`).join("");
  const sess = (skill) => training.filter((t) => t.skill === skill);
  const hist = (list, f) => list.slice(-5).reverse().map((s) => `<span>${fmtDay(s.at)} ${hm(s.at)} · ${f(s)} · ${esc(s.by || "")}</span>`).join("") || "<span>No sessions yet</span>";
  $("#nameHist").innerHTML = hist(sess("name"), (s) => `<b>${s.score}/5</b> in ${esc(NAME_LEVELS[s.level] || "")}`);
  const crate = sess("crate");
  $("#crateHist").innerHTML = hist(crate, (s) => `<b>${s.minutes} min</b>${s.whined ? " · whined" : " · calm"}`);
  if (!$("#crateMin").value && crate.length) $("#crateMin").value = crate[crate.length - 1].minutes;

  const social = sess("social");
  const grid = $("#socialGrid"); grid.innerHTML = "";
  for (const item of SOCIAL_ITEMS) {
    const n = social.filter((s) => s.item === item).length;
    const b = document.createElement("button");
    b.className = n ? "seen" : "";
    b.innerHTML = `<span>${esc(item)}</span><b>${n}</b>`;
    b.onclick = () => openSocial(item);
    grid.append(b);
  }
}
let socialItem = null;
function openSocial(item) { socialItem = item; const s = $("#socialSheet"); s.classList.remove("hidden"); s.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
$("#socialSheet").onclick = async (e) => {
  const r = e.target.closest("button")?.dataset.r; if (r === undefined) return;
  $("#socialSheet").classList.add("hidden");
  if (!r || !socialItem) return;
  await store.add("training", { skill: "social", item: socialItem, reaction: r, at: Date.now(), by: me });
  toast(r === "happy" ? `😊 ${socialItem} – logged` : `😟 Logged – go slower next time: more distance, pair with food`, [], r === "happy" ? 4000 : 7000);
};
$("#nameScores").onclick = async (e) => {
  const s = e.target.closest("button")?.dataset.s; if (s === undefined) return;
  await store.add("training", { skill: "name", score: +s, level: shared.train?.nameLevel || 0, at: Date.now(), by: me });
  toast(+s === 5 ? "5/5 – brilliant! Check the suggestion to level up" : `${s}/5 logged`);
};
$("#crateLog").onclick = async () => {
  const m = Math.round(+$("#crateMin").value); if (!(m > 0)) return;
  await store.add("training", { skill: "crate", minutes: m, whined: $("#crateWhined").checked, at: Date.now(), by: me });
  $("#crateWhined").checked = false; toast("Crate session logged");
};

// =====================================================================
// Photos
// =====================================================================
function renderPhotos() {
  if (!store) return;
  const grid = $("#photoGrid"); grid.innerHTML = "";
  const list = [...photos].reverse();
  if (!list.length) grid.innerHTML = `<div class="empty" style="grid-column:1/-1">No photos yet – one a day makes a lovely growth timelapse.</div>`;
  list.forEach((p) => {
    const b = document.createElement("button");
    b.innerHTML = `<img alt="" loading="lazy"><span>${photoLabel(p)}</span>`;
    b.querySelector("img").src = p.thumb;
    b.onclick = () => openViewer(photos.indexOf(p));
    grid.append(b);
  });
  $("#photoTools").classList.toggle("hidden", photos.length < 2);
  $("#takePhoto").textContent = photos.some((p) => p.day === dayKey(Date.now())) ? "Retake today's photo" : "Take today's photo";
}
function weightNear(ms) {
  let best = null;
  for (const w of weights) if (Math.abs(w.at - ms) <= 3 * DAY && (!best || Math.abs(w.at - ms) < Math.abs(best.at - ms))) best = w;
  return best;
}
function photoLabel(p) {
  const at = new Date(p.day + "T12:00").getTime(), w = weightNear(at);
  return `Wk ${weekAt(at)} · ${fmtDay(at)}${w ? ` · ${w.kg} kg` : ""}`;
}
$("#takePhoto").onclick = () => $("#photoInput").click();
$("#photoNudge").onclick = () => { showTab("photos"); $("#photoInput").click(); };
$("#photoInput").onchange = async (e) => {
  const file = e.target.files?.[0]; e.target.value = "";
  if (!file) return;
  const day = dayKey(Date.now());
  if (photos.some((p) => p.day === day) && !confirm("Replace today's photo?")) return;
  toast("Saving photo…", [], 15000);
  try {
    const { full, thumb, w, h } = await compressPhoto(file);
    await store.setDoc("photoFull", day, { day, full });
    await store.setDoc("photos", day, { day, thumb, w, h, at: Date.now(), by: me });
    toast("Today's photo saved");
  } catch (err) { toast("Couldn't save photo: " + err.message, [], 8000); }
};

let vIndex = 0, vCompare = false, lapseTimer = null;
const fullCache = new Map();
async function fullOf(p) {
  if (fullCache.has(p.day)) return fullCache.get(p.day);
  const d = await store.get("photoFull", p.day);
  const src = d?.full || p.thumb; fullCache.set(p.day, src); return src;
}
function figure(p, tag) {
  const f = document.createElement("figure");
  f.innerHTML = `<img alt=""><figcaption>${tag ? tag + " · " : ""}${photoLabel(p)}</figcaption>`;
  const img = f.querySelector("img"); img.src = p.thumb;
  fullOf(p).then((src) => { img.src = src; });
  return f;
}
function showViewerFrame() {
  const p = photos[vIndex]; if (!p) return;
  const box = $("#vImgs"); box.innerHTML = ""; box.classList.toggle("compare", vCompare);
  if (vCompare && photos[0] && vIndex !== 0) box.append(figure(photos[0], "First"));
  box.append(figure(p, vCompare ? "This" : ""));
  $("#vTitle").textContent = `${vIndex + 1} of ${photos.length}${p.by ? " · by " + p.by : ""}`;
  $("#vPrev").disabled = vIndex === 0; $("#vNext").disabled = vIndex === photos.length - 1;
  $("#vCompare").textContent = vCompare ? "Single view" : "Compare with first";
}
function openViewer(i, compare = false) { stopLapse(); vIndex = i; vCompare = compare; $("#viewer").classList.remove("hidden"); showViewerFrame(); }
function stopLapse() { clearInterval(lapseTimer); lapseTimer = null; }
$("#vClose").onclick = () => { stopLapse(); $("#viewer").classList.add("hidden"); };
$("#vPrev").onclick = () => { stopLapse(); if (vIndex > 0) { vIndex--; showViewerFrame(); } };
$("#vNext").onclick = () => { stopLapse(); if (vIndex < photos.length - 1) { vIndex++; showViewerFrame(); } };
$("#vCompare").onclick = () => { stopLapse(); vCompare = !vCompare; showViewerFrame(); };
$("#compareFirst").onclick = () => openViewer(photos.length - 1, true);
$("#playLapse").onclick = () => {
  openViewer(0);
  const box = $("#vImgs");
  lapseTimer = setInterval(() => {
    if (vIndex >= photos.length - 1) return stopLapse();
    vIndex++;
    const p = photos[vIndex];  // thumbs only for a smooth timelapse
    box.innerHTML = `<figure><img alt="" src="${p.thumb}"><figcaption>${photoLabel(p)}</figcaption></figure>`;
    $("#vTitle").textContent = `${vIndex + 1} of ${photos.length}`;
  }, 350);
};


// =====================================================================
// Sitter guide (read-only; every figure comes from settings and GUIDELINES.md)
// =====================================================================
const phoneHref = (p) => "tel:" + String(p || "").replace(/[^\d+]/g, "");
function renderGuide() {
  const body = $("#guideBody"); if (!body || $("#guide").classList.contains("hidden")) return;
  const name = esc(shared.dogName || "Riley"), n = Math.max(1, +shared.mealsPerDay || 4), per = portion();
  const interval = shared.weeIntervalMin || 60, bed = esc(shared.bedtime || "22:00");
  const mins = (ms) => Math.round(ms / MIN);
  const card = (title, inner) => inner ? `<div class="card"><h3>${title}</h3>${inner}</div>` : "";
  const contact = (label, who, phone, addr) => (who || phone || addr) ? `<div class="contact"><div><b>${esc(label)}</b>${who ? `<br>${esc(who)}` : ""}${addr ? `<br><span class="muted">${esc(addr)}</span>` : ""}</div>${phone ? `<a class="call" href="${esc(phoneHref(phone))}">📞 ${esc(phone)}</a>` : ""}</div>` : "";

  const meals = `<p class="big">${n} meal${n === 1 ? "" : "s"} a day${per ? ` · ${per} g each` : ""}</p>
    ${per ? `<p class="muted">${esc(shared.dailyGrams)} g in total for the day.</p>` : `<p class="muted">Portion not set yet – follow the feeding guide on the bag.</p>`}
    ${shared.foodBrand ? `<p>Food: <b>${esc(shared.foodBrand)}</b></p>` : ""}
    ${shared.mealTimes ? `<p>Meal times: <b>${esc(shared.mealTimes)}</b></p>` : ""}`;

  const toilet = `<p class="big">Out every ${interval} min while awake</p>
    <p>Also take ${name} out:</p>
    <ul>
      <li>straight after waking up</li>
      <li>${mins(AFTER_MEAL)} min after a meal</li>
      <li>${mins(AFTER_PLAY)} min after play or training</li>
      <li>${mins(AFTER_PLAY)} min after visitors arrive or any excitement</li>
      <li>last thing at night – from 30 min before bedtime (${bed})</li>
      <li>straight after an accident, to finish outside</li>
      <li>${mins(RETRY_AFTER_NOTHING)} min after a trip where nothing happened</li>
    </ul>
    <p><b>Signs he needs to go:</b> panting, intense sniffing at the floor, circling, or looking at you and then at the door.</p>`;

  const routine = `<ol>
      <li>Say <b>“Outside”</b>, then go to his toilet spot. Keep it calm and boring.</li>
      <li>At the spot, say <b>“Busy busy”</b>, then ignore him until he has gone.</li>
      <li>As he finishes, say <b>“Good”</b> and give a treat. Play comes <i>after</i> he has gone.</li>
      <li>Nothing in 5 minutes? Go back inside, supervise closely and try again in 10–15 minutes.</li>
    </ol>`;

  const accidents = `<p>An accident is just an accident. Please don’t tell ${name} off or raise your voice – he’ll only learn to go in hidden places.</p>
    <ul><li>If you catch him in the act, calmly say “Outside” and take him to his spot. Reward him if he finishes there.</li>
      <li>Clean up while he’s busy with something else, using an <b>enzymatic cleaner</b> (or biological laundry liquid and water). No bleach or ammonia – they leave a toilet smell.</li></ul>`;

  const night = `<p>Bedtime is around <b>${bed}</b>. Take ${name} out last thing, then settle him.</p>
    <ul><li>Only crate him when he’s tired and satisfied, after play.</li>
      <li>Load a Lickimat, Kong or snuffle mat first.</li>
      <li>If he’s fallen asleep elsewhere, move him to his bed.</li>
      <li>If he whines, ignore it and let him out when he’s quiet.</li></ul>
    ${shared.crateNotes ? `<p class="notes">${esc(shared.crateNotes)}</p>` : ""}`;

  const m = members(), ph = shared.ownerPhones || [];
  const contacts = [
    contact("Vet", shared.vetName, shared.vetPhone, shared.vetAddress),
    contact("Emergency vet", shared.emergencyVetName, shared.emergencyVetPhone, ""),
    ...m.map((who, i) => contact("Owner", who, ph[i], "")),
  ].join("");

  body.innerHTML = `<h1>${name}’s guide</h1><p class="sub">${esc(ageText())}</p>
    ${card("Food", meals)}
    ${card("Toilet trips", toilet)}
    ${card("The toilet routine", routine)}
    ${card("Accidents", accidents)}
    ${card("Bedtime and crate", night)}
    ${card("Who to call", contacts || `<p class="muted">Add the vet and owners’ phone numbers in Settings → Sitter guide details.</p>`)}
    ${shared.quirks ? card("Quirks &amp; notes", `<p class="notes">${esc(shared.quirks)}</p>`) : ""}`;
}
$("#openGuide").onclick = () => { showTab("guide"); renderGuide(); };
$("#guideBack").onclick = () => showTab("settings");
$("#guidePrint").onclick = () => print();

// =====================================================================
// Settings
// =====================================================================
function fillSettings() {
  const m = members();
  const sel = $("#sMe");
  sel.innerHTML = [...new Set([...m, me].filter(Boolean))].map((n) => `<option>${esc(n)}</option>`).join("");
  sel.value = me;
  $("#sM1").value = m[0] || ""; $("#sM2").value = m[1] || "";
  $("#sCode").textContent = household; $("#sView").value = ls.get("riley:view", "auto");
  $("#sDog").value = shared.dogName; $("#sDob").value = shared.birthDate; $("#sArr").value = shared.arrivalDate || "";
  $("#sSize").value = shared.adultSize || "medium";
  $("#sMeals").value = shared.mealsPerDay; $("#sGrams").value = shared.dailyGrams || "";
  $("#sInt").value = shared.weeIntervalMin; $("#sBed").value = shared.bedtime || "22:00";
  $("#sWorm").value = shared.intervals.worming; $("#sFlea").value = shared.intervals.flea;
  const ph = shared.ownerPhones || [];
  $("#sFood").value = shared.foodBrand || ""; $("#sMealTimes").value = shared.mealTimes || "";
  $("#sVet").value = shared.vetName || ""; $("#sVetPh").value = shared.vetPhone || ""; $("#sVetAddr").value = shared.vetAddress || "";
  $("#sEmName").value = shared.emergencyVetName || ""; $("#sEmPh").value = shared.emergencyVetPhone || "";
  $("#sPh1").value = ph[0] || ""; $("#sPh2").value = ph[1] || "";
  $("#sPh1L").textContent = `${m[0] || "Person 1"} – phone`; $("#sPh2L").textContent = `${m[1] || "Person 2"} – phone`;
  $("#sCrate").value = shared.crateNotes || ""; $("#sQuirks").value = shared.quirks || "";
}
$("#sSave").onclick = async () => {
  const clamp = (v, lo, hi, d) => Math.min(hi, Math.max(lo, Math.round(+v) || d));
  const m1 = $("#sM1").value.trim(), m2 = $("#sM2").value.trim();
  const newMembers = [m1, m2].filter(Boolean);
  me = $("#sMe").value || me;
  if (!newMembers.includes(me) && newMembers.length) me = newMembers[0];
  ls.set("riley:me", me);
  ls.set("riley:view", $("#sView").value);
  const grams = clamp($("#sGrams").value, 0, 2000, 0);
  const patch = {
    members: newMembers, dogName: $("#sDog").value.trim() || "Riley", birthDate: $("#sDob").value, arrivalDate: $("#sArr").value,
    adultSize: $("#sSize").value, mealsPerDay: clamp($("#sMeals").value, 1, 6, 4), dailyGrams: grams,
    weeIntervalMin: clamp($("#sInt").value, 15, 480, 60), bedtime: $("#sBed").value || "22:00",
    intervals: { worming: clamp($("#sWorm").value, 7, 180, 14), flea: clamp($("#sFlea").value, 7, 180, 30) },
    foodBrand: $("#sFood").value.trim(), mealTimes: $("#sMealTimes").value.trim(),
    vetName: $("#sVet").value.trim(), vetPhone: $("#sVetPh").value.trim(), vetAddress: $("#sVetAddr").value.trim(),
    emergencyVetName: $("#sEmName").value.trim(), emergencyVetPhone: $("#sEmPh").value.trim(),
    ownerPhones: [$("#sPh1").value.trim(), $("#sPh2").value.trim()],
    crateNotes: $("#sCrate").value.trim(), quirks: $("#sQuirks").value.trim(),
  };
  if (grams !== (+shared.dailyGrams || 0)) { patch.gramsSetWeight = weights.length ? weights[weights.length - 1].kg : null; patch.gramsSetAt = Date.now(); }
  await store.setDoc("settings", "main", patch);
  if (store.user()) {  // owners list: you plus (optionally) your partner
    const mine = (store.user().email || "").toLowerCase(), partner = $("#sOwn2").value.trim().toLowerCase();
    const emails = [mine, ...(partner && partner !== mine ? [partner] : [])];
    if (partner && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(partner)) { toast("That partner email doesn't look right"); return; }
    if (emails.join() !== ownerEmails.join()) { await store.setDoc("meta", "owners", { emails }); ownerEmails = emails; }
  }
  toast("Saved"); applyView();
};
$("#shareLink").onclick = async () => {
  const url = `${location.origin}${location.pathname}?h=${encodeURIComponent(household)}`;
  try { if (navigator.share) await navigator.share({ title: `Join ${shared.dogName}'s app`, url }); else { await navigator.clipboard.writeText(url); toast("Link copied"); } }
  catch {}
};
$("#leave").onclick = () => { if (confirm("Leave this household on this device? The data stays for everyone else.")) { ls.del("riley:hh"); location.reload(); } };
// Tap the clock on the console to get back to phone view (for settings)
$("#clock").onclick = consoleToSettings;

// =====================================================================
// Boot (last, so everything above is defined)
// =====================================================================
if (household && me) start(); else showSetup();
