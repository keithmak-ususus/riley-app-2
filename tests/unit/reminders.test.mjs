import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { dueReminders, routeReminders, withDefaults, DEFAULT_PREFS, TRIP_LEAD, TRIP_EXPIRES } from "../../reminders.js";
import { MIN, DAY } from "../../planner.js";

const iso = (s) => Date.parse(s);
const NOW = iso("2026-12-23T10:00:00Z");           // 10:00 in London (winter)
const settings = { dogName: "Milo", arrivalDate: "2026-12-22", weeIntervalMin: 60, bedtime: "22:00" };
const ev = (type, m) => ({ type, at: NOW + m * MIN });
const due = (o = {}) => dueReminders({ now: NOW, settings, events: [], treatments: [], health: [], hasPhotoToday: true, ...o });
const keys = (r) => r.map((x) => x.kind + ":" + x.key.split(":")[0]);

describe("trip reminders", () => {
  test("nothing is due before a trip is logged", () => assert.deepEqual(due(), []));
  test("a trip due within 5 minutes is announced, with the planner's wording", () => {
    const r = due({ events: [ev("wee", -57)] });            // hourly -> due in 3 minutes
    assert.equal(r.length, 1); assert.equal(r[0].kind, "trip"); assert.match(r[0].title, /Milo/); assert.match(r[0].body, /Hourly trip/);
  });
  test("not yet due: too early", () => assert.deepEqual(due({ events: [ev("wee", -50)] }), []));         // due in 10 min > lead
  test("a trip that has been due too long is not announced (no stale alerts after downtime)", () => {
    assert.deepEqual(due({ events: [ev("wee", -(60 + 46))] }), []);
    assert.equal(due({ events: [ev("wee", -(60 + 44))] }).length, 1);
  });
  test("after a meal: 15 minutes", () => {
    const r = due({ events: [ev("wee", -30), ev("meal", -14)] });
    assert.equal(r[0].kind, "trip"); assert.match(r[0].body, /Ate at 09:46/);                           // London clock
  });
  test("not while he is asleep", () => assert.deepEqual(due({ events: [ev("wee", -80), ev("sleep", -30)] }), []));
  test("the same trip always has the same key (so it is sent once); a new event gives a new key", () => {
    const a = due({ events: [ev("wee", -57)] })[0].key, b = dueReminders({ now: NOW + MIN, settings, events: [ev("wee", -57)], hasPhotoToday: true })[0].key;
    assert.equal(a, b);
    assert.notEqual(a, due({ events: [ev("wee", -57), ev("meal", -14)] })[0].key);   // the meal rule (due in 1 min) now comes first
  });
  test("nothing before he arrives", () => assert.deepEqual(due({ settings: { ...settings, arrivalDate: "2026-12-25" }, events: [ev("wee", -57)] }), []));
  test("the message never scolds", () => {
    for (const e of [[ev("wee", -30), ev("acc_wee", -2)], [ev("out", -17)], [ev("wee", -57)]])
      for (const r of due({ events: e })) assert.doesNotMatch(r.title + " " + r.body, /\b(bad|naughty|no!)\b/i);
  });
});

describe("treatment and appointment reminders", () => {
  test("worming falls due 14 days after the last dose, announced from 08:00 that day", () => {
    const t = [{ kind: "worming", at: NOW - 14 * DAY }];
    const r = due({ treatments: t }); assert.equal(r.length, 1); assert.equal(r[0].kind, "treatment"); assert.match(r[0].title, /worming is due/);
  });
  test("not before the due day, and not before 08:00", () => {
    assert.deepEqual(due({ treatments: [{ kind: "worming", at: NOW - 13 * DAY }] }), []);
    assert.deepEqual(dueReminders({ now: iso("2026-12-23T07:30:00Z"), settings, treatments: [{ kind: "worming", at: iso("2026-12-09T09:00:00Z") }], hasPhotoToday: true }), []);
  });
  test("follows the interval in Settings, and the key is per due day (so once)", () => {
    const t = [{ kind: "flea", at: NOW - 30 * DAY }], r = due({ treatments: t });
    assert.equal(r[0].key, "treat:flea:2026-12-23");
    assert.deepEqual(due({ treatments: [{ kind: "flea", at: NOW - 20 * DAY }], settings: { ...settings, intervals: { flea: 28 } } }), []);
  });
  test("no previous dose logged: no reminder (the app's suggestions cover that)", () => assert.deepEqual(due(), []));
  test("health reminders on their due date, unless done", () => {
    assert.equal(due({ health: [{ id: "h1", kind: "Vaccination", title: "2nd jab", due: "2026-12-23" }] })[0].title, "Milo: 2nd jab is due");
    assert.deepEqual(due({ health: [{ id: "h1", due: "2026-12-23", done: true }] }), []);
    assert.deepEqual(due({ health: [{ id: "h1", due: "2026-12-24" }] }), []);
  });
});

describe("photo nudge", () => {
  test("from 18:00 if no photo yet today, once per day", () => {
    const r = dueReminders({ now: iso("2026-12-23T18:05:00Z"), settings, hasPhotoToday: false });
    assert.equal(r.length, 1); assert.equal(r[0].key, "photo:2026-12-23");
    assert.deepEqual(dueReminders({ now: iso("2026-12-23T17:55:00Z"), settings, hasPhotoToday: false }), []);
    assert.deepEqual(dueReminders({ now: iso("2026-12-23T18:05:00Z"), settings, hasPhotoToday: true }), []);
  });
});

describe("routing to devices", () => {
  const trip = { key: "trip:1", kind: "trip", tag: "trip", title: "t", body: "b" };
  const photo = { key: "photo:d", kind: "photo", tag: "photo", title: "p", body: "b" };
  const dev = (id, prefs, token = "tok-" + id) => ({ id, token, prefs });
  const route = (reminders, devices, extra = {}) => routeReminders({ reminders, devices, now: NOW, ...extra });

  test("defaults: trips and treatments on, photo nudge off, quiet hours 22:00 to 06:00", () => {
    assert.deepEqual(DEFAULT_PREFS, { trip: true, treatment: true, photo: false, quiet: { on: true, from: "22:00", to: "06:00" } });
    assert.deepEqual(route([trip, photo], [dev("a")]).map((m) => m.id), ["trip:1|a"]);
  });
  test("each device chooses what it receives", () => {
    const m = route([trip, photo], [dev("a", { trip: false }), dev("b", { photo: true })]);
    assert.deepEqual(m.map((x) => x.id), ["trip:1|b", "photo:d|b"]);
  });
  test("quiet hours are respected per device, in London time", () => {
    const night = iso("2026-12-23T23:00:00Z");
    assert.deepEqual(routeReminders({ reminders: [trip], devices: [dev("a")], now: night }), []);
    assert.equal(routeReminders({ reminders: [trip], devices: [dev("a", { quiet: { on: false } })], now: night }).length, 1);
    assert.deepEqual(routeReminders({ reminders: [trip], devices: [dev("a")], now: iso("2026-07-01T21:30:00Z") }), []);   // 22:30 BST
  });
  test("a message already sent to a device is never sent again, but other devices still get it", () => {
    const m = route([trip], [dev("a"), dev("b")], { sent: new Set(["trip:1|a"]) });
    assert.deepEqual(m.map((x) => x.deviceId), ["b"]);
  });
  test("a device with no token is skipped; missing prefs get the defaults", () => {
    assert.deepEqual(route([trip], [{ id: "x", prefs: {} }]), []);
    assert.deepEqual(withDefaults(undefined), DEFAULT_PREFS);
    assert.deepEqual(withDefaults({ quiet: { from: "21:00" } }).quiet, { on: true, from: "21:00", to: "06:00" });
  });
});
