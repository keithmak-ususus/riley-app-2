// Run with: node --test tests/unit
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { nextTrip, lastOf, isAsleep, makeFmt, clockInZone, dayKeyInZone, inQuietHours, MIN, AFTER_MEAL, AFTER_PLAY, RETRY_AFTER_NOTHING, OUT_TYPES } from "../../planner.js";

const T0 = Date.parse("2026-12-23T10:00:00Z");           // winter: London = UTC
const at = (m) => T0 + m * MIN;                            // minutes after 10:00
const ev = (type, m) => ({ type, at: at(m) });
const plan = (events, now, extra = {}) => {
  const lo = lastOf(events, ...OUT_TYPES);
  return nextTrip(lo, { events, now, bedMs: clockInZone(now, "Europe/London", "22:00"), fmt: makeFmt("Europe/London"), ...extra });
};

describe("toilet-trip rules (GUIDELINES.md)", () => {
  test("nothing logged: no trip yet", () => assert.equal(plan([], at(0)), null));
  test("after a wee the next trip is an hour on (the Settings interval)", () => {
    const t = plan([ev("wee", 0)], at(5)); assert.equal(t.due, at(60)); assert.equal(t.short, "hourly");
  });
  test("the interval follows Settings", () => assert.equal(plan([ev("poo", 0)], at(5), { intervalMin: 45 }).due, at(45)));
  test("15 minutes after a meal", () => {
    const t = plan([ev("wee", 0), ev("meal", 10)], at(12)); assert.equal(t.due, at(10) + AFTER_MEAL); assert.equal(t.short, "after eating");
  });
  test("10 minutes after play or training", () => {
    const t = plan([ev("wee", 0), ev("play", 20)], at(22)); assert.equal(t.due, at(20) + AFTER_PLAY); assert.equal(t.short, "after play");
  });
  test("10 minutes after visitors / excitement", () => {
    const t = plan([ev("wee", 0), ev("excited", 20)], at(22)); assert.equal(t.due, at(20) + AFTER_PLAY); assert.equal(t.short, "after excitement");
  });
  test("a trip where nothing happened: try again after 15 minutes", () => {
    const t = plan([ev("out", 0)], at(2)); assert.equal(t.due, at(0) + RETRY_AFTER_NOTHING); assert.equal(t.short, "try again");
  });
  test("straight out after waking up", () => {
    const t = plan([ev("wee", 0), ev("sleep", 10), ev("wake", 40)], at(41)); assert.equal(t.due, at(40)); assert.equal(t.short, "just woke");
  });
  test("a sleeping puppy has no wake rule", () => {
    assert.equal(isAsleep([ev("wee", 0), ev("sleep", 10)]), true);
    assert.equal(isAsleep([ev("sleep", 10), ev("wake", 40)]), false);
  });
  test("straight out after an accident, to finish outside", () => {
    const t = plan([ev("wee", 0), ev("acc_wee", 20)], at(21)); assert.equal(t.due, at(20)); assert.equal(t.short, "after accident");
    assert.match(t.msg, /no telling off/); assert.doesNotMatch(t.msg, /\b(bad|naughty)\b/i);
  });
  test("poo accidents count too", () => assert.equal(plan([ev("wee", 0), ev("acc_poo", 20)], at(21)).short, "after accident"));
  test("events older than the last trip outside are ignored", () => {
    const t = plan([ev("meal", 0), ev("play", 5), ev("wee", 30)], at(31)); assert.equal(t.short, "hourly"); assert.equal(t.due, at(90));
  });
  test("the earliest rule wins", () => {
    const t = plan([ev("wee", 0), ev("meal", 30), ev("play", 31)], at(32));
    assert.equal(t.due, at(41)); assert.equal(t.short, "after play");   // 10 min after play beats 15 min after the meal
  });
  test("a walk counts as a trip outside", () => assert.equal(plan([ev("walk", 0)], at(1)).short, "hourly"));
  test("before bed: a reminder from 30 minutes before bedtime", () => {
    const now = Date.parse("2026-12-23T21:40:00Z"), lo = { type: "wee", at: Date.parse("2026-12-23T21:00:00Z") };   // hourly would be 22:00
    const t = nextTrip(lo, { events: [lo], now, bedMs: Date.parse("2026-12-23T22:00:00Z"), fmt: makeFmt("Europe/London") });
    assert.equal(t.short, "before bed"); assert.equal(t.due, Date.parse("2026-12-23T21:30:00Z"));
  });
  test("no bedtime reminder if he went out recently", () => {
    const now = Date.parse("2026-12-23T21:40:00Z"), lo = { type: "wee", at: Date.parse("2026-12-23T21:20:00Z") };
    const t = nextTrip(lo, { events: [lo], now, bedMs: Date.parse("2026-12-23T22:00:00Z"), fmt: makeFmt("Europe/London") });
    assert.notEqual(t.short, "before bed");
  });
  test("the dog's name comes from settings, never hard-coded", () => {
    const t = plan([ev("wee", 0), ev("sleep", 5), ev("wake", 6)], at(7), { name: "Milo" }); assert.match(t.msg, /Milo/);
  });
  test("clock times in the message use the household's zone", () => {
    const summer = Date.parse("2026-07-01T10:00:00Z");   // London = UTC+1
    const lo = { type: "wee", at: summer - 5 * MIN }, ml = { type: "meal", at: summer };
    const t = nextTrip(lo, { events: [lo, ml], now: summer + MIN, fmt: makeFmt("Europe/London") });
    assert.match(t.msg, /Ate at 11:00/);
  });
});

describe("time zones (the sender runs in UTC; the household is in the UK)", () => {
  test("22:00 in London is 21:00 UTC in summer and 22:00 UTC in winter", () => {
    assert.equal(clockInZone(Date.parse("2026-07-01T12:00:00Z"), "Europe/London", "22:00"), Date.parse("2026-07-01T21:00:00Z"));
    assert.equal(clockInZone(Date.parse("2026-12-22T12:00:00Z"), "Europe/London", "22:00"), Date.parse("2026-12-22T22:00:00Z"));
  });
  test("the calendar day is the London day, not the UTC day", () => {
    assert.equal(dayKeyInZone(Date.parse("2026-07-01T23:30:00Z"), "Europe/London"), "2026-07-02");   // 00:30 BST
    assert.equal(dayKeyInZone(Date.parse("2026-12-22T23:30:00Z"), "Europe/London"), "2026-12-22");
  });
  test("quiet hours wrap midnight and follow the household's clock", () => {
    const q = (iso) => inQuietHours(Date.parse(iso), "Europe/London", "22:00", "06:00");
    assert.equal(q("2026-07-01T21:30:00Z"), true);     // 22:30 BST
    assert.equal(q("2026-12-22T21:30:00Z"), false);    // 21:30 GMT
    assert.equal(q("2026-12-22T23:59:00Z"), true);
    assert.equal(q("2026-12-23T05:59:00Z"), true);
    assert.equal(q("2026-12-23T06:00:00Z"), false);
    assert.equal(q("2026-12-23T12:00:00Z"), false);
  });
  test("a window that doesn't wrap, and an empty window", () => {
    assert.equal(inQuietHours(Date.parse("2026-12-22T13:30:00Z"), "Europe/London", "13:00", "14:00"), true);
    assert.equal(inQuietHours(Date.parse("2026-12-22T14:00:00Z"), "Europe/London", "13:00", "14:00"), false);
    assert.equal(inQuietHours(Date.parse("2026-12-22T03:00:00Z"), "Europe/London", "06:00", "06:00"), false);
  });
});
