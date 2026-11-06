// Integration test for the scheduled reminder sender, against the Firestore emulator with a fake FCM.
import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { connect, run } from "../../scripts/reminders/send.mjs";

const HID = "riley-sender-test-household";
const NOW = Date.parse("2026-12-23T10:00:00Z");           // 10:00 in London (winter)
const MIN = 60000, DAY = 864e5;
let db, base;

before(() => { ({ db } = connect({ projectId: "demo-riley" })); base = db.collection("households").doc(HID); });
beforeEach(async () => { await db.recursiveDelete(base); });

const put = (path, data) => db.doc(`households/${HID}/${path}`).set(data);
async function seed({ events = [{ type: "wee", at: NOW - 57 * MIN }], devices = { a: {} }, settings = {}, extra = async () => {} } = {}) {
  await put("settings/main", { dogName: "Milo", arrivalDate: "2026-12-22", weeIntervalMin: 60, bedtime: "22:00", ...settings });
  for (const [i, e] of events.entries()) await put(`events/e${i}`, e);
  for (const [id, d] of Object.entries(devices)) await put(`devices/${id}`, { token: "tok-" + id, prefs: {}, ...d });
  await extra();
}
const fakeFcm = (fail = {}) => { const sent = []; return { sent, send: async (m) => {
  if (fail[m.token]) throw Object.assign(new Error("boom"), { code: fail[m.token] });
  sent.push(m); return "id"; } }; };
const go = (messaging, o = {}) => run({ db, messaging, hid: HID, now: NOW, ...o });

describe("scheduled reminder sender", () => {
  test("sends a due trip to each device, once", async () => {
    await seed({ devices: { a: {}, b: {} } });
    const fcm = fakeFcm(), s1 = await go(fcm);
    assert.equal(s1.sent, 2); assert.deepEqual(fcm.sent.map((m) => m.token).sort(), ["tok-a", "tok-b"]);
    assert.match(fcm.sent[0].data.title, /Milo/); assert.match(fcm.sent[0].data.body, /Hourly trip/);
    assert.equal(fcm.sent[0].data.tag, "trip"); assert.equal(fcm.sent[0].webpush.headers.Urgency, "high");
    const again = fakeFcm(), s2 = await go(again, { now: NOW + 15 * MIN });
    assert.equal(s2.sent, 0); assert.equal(again.sent.length, 0);                       // no duplicate for the same trip
  });
  test("a new event makes a new trip, which is sent", async () => {
    await seed();
    await go(fakeFcm());
    await put("events/meal", { type: "meal", at: NOW - 14 * MIN });                     // meal rule now comes first
    const fcm = fakeFcm(); await go(fcm, { now: NOW + MIN });
    assert.equal(fcm.sent.length, 1); assert.match(fcm.sent[0].data.body, /Ate at 09:46/);
  });
  test("quiet hours are respected, per device, in London time", async () => {
    const night = Date.parse("2026-12-23T23:00:00Z");
    await seed({ events: [{ type: "wee", at: night - 57 * MIN }], devices: { quiet: {}, awake: { prefs: { quiet: { on: false } } } } });
    const fcm = fakeFcm(); await go(fcm, { now: night });
    assert.deepEqual(fcm.sent.map((m) => m.token), ["tok-awake"]);
  });
  test("each device's choices are honoured", async () => {
    await seed({ devices: { off: { prefs: { trip: false } }, on: {} } });
    const fcm = fakeFcm(); await go(fcm);
    assert.deepEqual(fcm.sent.map((m) => m.token), ["tok-on"]);
  });
  test("a dead token is removed, and the other devices still get their message", async () => {
    await seed({ devices: { gone: {}, ok: {} } });
    const fcm = fakeFcm({ "tok-gone": "messaging/registration-token-not-registered" }), s = await go(fcm);
    assert.equal(s.removed, 1); assert.equal(s.sent, 1);
    assert.equal((await base.collection("devices").doc("gone").get()).exists, false);
    assert.equal((await base.collection("devices").doc("ok").get()).exists, true);
  });
  test("a temporary failure is not marked as sent, so the next run retries it", async () => {
    await seed();
    const s1 = await go(fakeFcm({ "tok-a": "messaging/internal-error" }));
    assert.equal(s1.failed, 1); assert.equal(s1.sent, 0);
    const fcm = fakeFcm(); const s2 = await go(fcm, { now: NOW + MIN });
    assert.equal(s2.sent, 1);
  });
  test("a dry run sends nothing and records nothing", async () => {
    await seed(); const fcm = fakeFcm(), logs = [];
    const s = await go(fcm, { dryRun: true, log: (l) => logs.push(l) });
    assert.equal(s.toSend, 1); assert.equal(fcm.sent.length, 0); assert.match(logs[0], /would send/);
    assert.equal((await base.collection("meta").doc("notified").get()).exists, false);
  });
  test("nothing is sent while he is asleep or before a trip has been logged", async () => {
    await seed({ events: [{ type: "wee", at: NOW - 80 * MIN }, { type: "sleep", at: NOW - 30 * MIN }] });
    assert.equal((await go(fakeFcm())).toSend, 0);
    await db.recursiveDelete(base); await seed({ events: [] });
    assert.equal((await go(fakeFcm())).toSend, 0);
  });
  test("treatments and vet reminders on the day, once", async () => {
    await seed({ events: [], extra: async () => {
      await put("treatments/t1", { kind: "worming", at: NOW - 14 * DAY, product: "x" });
      await put("health/h1", { kind: "Vaccination", title: "2nd jab", due: "2026-12-23", done: false });
      await put("health/h2", { kind: "Vet visit", title: "Done already", due: "2026-12-23", done: true });
    } });
    const fcm = fakeFcm(); await go(fcm);
    assert.deepEqual(fcm.sent.map((m) => m.data.title).sort(), ["Milo: 2nd jab is due", "Milo: worming is due"]);
    const again = fakeFcm(); await go(again, { now: NOW + 15 * MIN }); assert.equal(again.sent.length, 0);
  });
  test("the photo nudge only goes to devices that opted in, and not if today's photo exists", async () => {
    const evening = Date.parse("2026-12-23T18:10:00Z");
    await seed({ events: [], devices: { yes: { prefs: { photo: true } }, no: {} } });
    let fcm = fakeFcm(); await go(fcm, { now: evening });
    assert.deepEqual(fcm.sent.map((m) => m.token), ["tok-yes"]);
    await db.recursiveDelete(base); await seed({ events: [], devices: { yes: { prefs: { photo: true } } }, extra: () => put("photos/2026-12-23", { day: "2026-12-23", thumb: "x" }) });
    fcm = fakeFcm(); await go(fcm, { now: evening }); assert.equal(fcm.sent.length, 0);
  });
  test("only the configured household is read, and old sent-records are forgotten", async () => {
    await seed();
    await db.collection("households").doc("riley-other-household").collection("devices").doc("x").set({ token: "tok-other" });
    await put("meta/notified", { sent: { "trip:1|a": NOW - 5 * DAY, "trip:2|a": NOW - DAY } });
    const fcm = fakeFcm(); await go(fcm);
    assert.deepEqual(fcm.sent.map((m) => m.token), ["tok-a"]);
    const kept = (await base.collection("meta").doc("notified").get()).data().sent;
    assert.equal("trip:1|a" in kept, false); assert.equal("trip:2|a" in kept, true);
    await db.recursiveDelete(db.collection("households").doc("riley-other-household"));
  });
});
