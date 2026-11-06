// Firestore rules tests. Run with `npm test` in this folder (needs Java for the emulator).
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { before, after, beforeEach, describe, it } from "node:test";

const HID = "riley-abcdefghjkmnpqrs";           // 22 chars, like the app generates
const DATA = ["events", "health", "weights", "settings", "treatments", "training", "photos", "photoFull", "devices"];   // devices = phones registered for reminders
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-riley",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const google = (uid, email, extra = {}) =>
  env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: "google.com" }, ...extra }).firestore();
const anon = (uid = "anon1") => env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).firestore();
const nobody = () => env.unauthenticatedContext().firestore();
const d = (db, path) => doc(db, `households/${HID}/${path}`);

// Seed as admin (rules bypassed): existing data + an owners list + one claimed owner.
async function seed({ owners = ["keith@example.com", "sam@example.com"], claimed = ["keith"] } = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const c of DATA) await setDoc(d(db, `${c}/x1`), { at: Date.now(), note: "existing " + c });
    if (owners) await setDoc(d(db, "meta/owners"), { emails: owners });
    if (claimed.includes("keith")) await setDoc(d(db, "members/keith"), { role: "owner", name: "Keith", email: "keith@example.com", createdAt: 1 });
    if (claimed.includes("sam")) await setDoc(d(db, "members/sam"), { role: "owner", name: "Sam", email: "sam@example.com", createdAt: 1 });
  });
}

describe("owner", () => {
  it("can read and write every data collection (existing data survives)", async () => {
    await seed();
    const db = google("keith", "keith@example.com");
    for (const c of DATA) {
      await assertSucceeds(getDoc(d(db, `${c}/x1`)));
      await assertSucceeds(getDocs(collection(db, `households/${HID}/${c}`)));
      await assertSucceeds(setDoc(d(db, `${c}/new`), { at: 1 }));
      await assertSucceeds(updateDoc(d(db, `${c}/new`), { at: 2 }));
      await assertSucceeds(deleteDoc(d(db, `${c}/new`)));
    }
  });
  it("can read the owners list and add the partner", async () => {
    await seed({ owners: ["keith@example.com"] });
    const db = google("keith", "keith@example.com");
    await assertSucceeds(getDoc(d(db, "meta/owners")));
    await assertSucceeds(setDoc(d(db, "meta/owners"), { emails: ["keith@example.com", "sam@example.com"] }));
  });
  it("cannot remove themselves from the owners list", async () => {
    await seed();
    await assertFails(setDoc(d(google("keith", "keith@example.com"), "meta/owners"), { emails: ["sam@example.com"] }));
  });
  it("cannot list more than two owners", async () => {
    await seed();
    await assertFails(setDoc(d(google("keith", "keith@example.com"), "meta/owners"),
      { emails: ["keith@example.com", "sam@example.com", "eve@example.com"] }));
  });
  it("cannot touch collections that don't exist in the app", async () => {
    await seed();
    await assertFails(setDoc(d(google("keith", "keith@example.com"), "secrets/a"), { x: 1 }));
  });
  it("cannot read or write the sender's bookkeeping (meta/notified): only the server does", async () => {
    await seed();
    const keith = google("keith", "keith@example.com");
    await assertFails(getDoc(d(keith, "meta/notified")));
    await assertFails(setDoc(d(keith, "meta/notified"), { sent: {} }));
  });
  it("is denied on a household id that is too short", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "households/short/members/keith"), { role: "owner" });
    });
    await assertFails(getDoc(doc(google("keith", "keith@example.com"), "households/short/events/x")));
  });
});

describe("strangers", () => {
  it("unauthenticated users are denied everywhere", async () => {
    await seed();
    const db = nobody();
    for (const c of DATA) await assertFails(getDoc(d(db, `${c}/x1`)));
    await assertFails(getDoc(d(db, "meta/owners")));
    await assertFails(setDoc(d(db, "events/new"), { at: 1 }));
  });
  it("an old anonymous device (the previous setup) is denied", async () => {
    await seed();
    const db = anon();
    for (const c of DATA) {
      await assertFails(getDoc(d(db, `${c}/x1`)));
      await assertFails(setDoc(d(db, `${c}/new`), { at: 1 }));
    }
  });
  it("a Google account that isn't an owner is denied data and cannot claim", async () => {
    await seed();
    const db = google("eve", "eve@example.com");
    await assertFails(getDoc(d(db, "events/x1")));
    await assertFails(setDoc(d(db, "members/eve"), { role: "owner", name: "Eve", email: "eve@example.com", createdAt: 1 }));
    await assertFails(getDoc(d(db, "meta/owners")));
  });
  it("cannot take over by editing the owners list", async () => {
    await seed();
    await assertFails(setDoc(d(google("eve", "eve@example.com"), "meta/owners"), { emails: ["eve@example.com"] }));
  });
  it("cannot claim for someone else's uid", async () => {
    await seed();
    await assertFails(setDoc(d(google("eve", "sam@example.com"), "members/sam"), { role: "owner", name: "x", email: "sam@example.com", createdAt: 1 }));
  });
  it("cannot read other people's membership records", async () => {
    await seed();
    await assertFails(getDoc(d(google("eve", "eve@example.com"), "members/keith")));
  });
});

describe("claiming a household", () => {
  it("the first Google account creates the owners list, then claims ownership", async () => {
    await seed({ owners: null, claimed: [] });
    const db = google("keith", "Keith@Example.com");
    await assertSucceeds(setDoc(d(db, "meta/owners"), { emails: ["keith@example.com"] }));
    await assertSucceeds(setDoc(d(db, "members/keith"), { role: "owner", name: "Keith", email: "keith@example.com", createdAt: 1 }));
    await assertSucceeds(getDoc(d(db, "events/x1")));   // existing data now readable
  });
  it("cannot create the owners list without including yourself", async () => {
    await seed({ owners: null, claimed: [] });
    await assertFails(setDoc(d(google("eve", "eve@example.com"), "meta/owners"), { emails: ["keith@example.com"] }));
  });
  it("cannot create the owners list once it exists", async () => {
    await seed({ claimed: [] });
    await assertFails(setDoc(d(google("eve", "eve@example.com"), "meta/owners"), { emails: ["eve@example.com"] }));
  });
  it("an unverified email is refused", async () => {
    await seed({ owners: null, claimed: [] });
    const db = env.authenticatedContext("eve", { email: "eve@example.com", email_verified: false, firebase: { sign_in_provider: "google.com" } }).firestore();
    await assertFails(setDoc(d(db, "meta/owners"), { emails: ["eve@example.com"] }));
  });
  it("a non-Google provider is refused, even with a matching email", async () => {
    await seed({ claimed: [] });
    const db = env.authenticatedContext("keith", { email: "keith@example.com", email_verified: true, firebase: { sign_in_provider: "password" } }).firestore();
    await assertFails(setDoc(d(db, "members/keith"), { role: "owner", name: "Keith", email: "keith@example.com", createdAt: 1 }));
  });
  it("the partner can claim once the first owner has added their email", async () => {
    await seed({ claimed: ["keith"] });
    const db = google("sam", "sam@example.com");
    await assertSucceeds(setDoc(d(db, "members/sam"), { role: "owner", name: "Sam", email: "sam@example.com", createdAt: 1 }));
    await assertSucceeds(getDoc(d(db, "events/x1")));
  });
  it("a membership record can't carry extra fields or another role", async () => {
    await seed({ claimed: [] });
    const db = google("sam", "sam@example.com");
    await assertFails(setDoc(d(db, "members/sam"), { role: "sitter", name: "Sam", email: "sam@example.com", createdAt: 1 }));
    await assertFails(setDoc(d(db, "members/sam"), { role: "owner", name: "Sam", email: "sam@example.com", createdAt: 1, expiresAt: 5 }));
  });
  it("a member can read their own record", async () => {
    await seed();
    await assertSucceeds(getDoc(d(google("keith", "keith@example.com"), "members/keith")));
  });
});

describe("expiry", () => {
  it("an owner record with a past expiresAt is denied", async () => {
    await seed({ claimed: [] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(d(ctx.firestore(), "members/keith"), { role: "owner", name: "K", email: "keith@example.com", expiresAt: new Date(Date.now() - 60000) });
    });
    await assertFails(getDoc(d(google("keith", "keith@example.com"), "events/x1")));
  });
  it("an owner record with a future expiresAt is allowed", async () => {
    await seed({ claimed: [] });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(d(ctx.firestore(), "members/keith"), { role: "owner", name: "K", email: "keith@example.com", expiresAt: new Date(Date.now() + 3600e3) });
    });
    await assertSucceeds(getDoc(d(google("keith", "keith@example.com"), "events/x1")));
  });
});

describe("revoking", () => {
  it("deleting a membership cuts off access immediately", async () => {
    await seed({ claimed: ["keith", "sam"] });
    const sam = google("sam", "sam@example.com");
    await assertSucceeds(getDoc(d(sam, "events/x1")));
    await assertSucceeds(deleteDoc(d(google("keith", "keith@example.com"), "members/sam")));
    await assertFails(getDoc(d(sam, "events/x1")));
  });
});

// ---------------------------------------------------------------------------------------------
// Sitters: anonymous sign-in + invite id + PIN. Time-limited, events only.
// ---------------------------------------------------------------------------------------------
const IID = "invabcdefghjkmnpqrstu";                  // 21 chars, like the app generates
const T = (ms) => Timestamp.fromMillis(ms);
const HOUR = 3600e3, NOW = Date.now();
const WIN = { start: NOW - HOUR, end: NOW + 72 * HOUR };
async function seedInvite({ start = WIN.start, end = WIN.end, pin = "123456", name = "Jess", claimed = false, memberExpires = end } = {}) {
  await seed();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(d(db, `invites/${IID}`), { name, startsAt: T(start), expiresAt: T(end), createdAt: T(NOW) });
    await setDoc(d(db, `invitePins/${IID}`), { pin });
    if (claimed) await setDoc(d(db, "members/sit1"), { role: "sitter", name, startsAt: T(start), expiresAt: T(memberExpires), inviteId: IID, pin });
    await setDoc(d(db, "events/mine"), { type: "wee", at: NOW, by: name, byUid: "sit1" });
    await setDoc(d(db, "events/owners"), { type: "poo", at: NOW, by: "Keith", byUid: "keith" });
  });
}
const record = (o = {}) => ({ role: "sitter", name: "Jess", startsAt: T(WIN.start), expiresAt: T(WIN.end), inviteId: IID, pin: "123456", ...o });
const sitter = (uid = "sit1") => anon(uid);

describe("sitters: claiming a record", () => {
  it("the right PIN creates the sitter's own record", async () => {
    await seedInvite();
    await assertSucceeds(setDoc(d(sitter(), "members/sit1"), record()));
  });
  it("a wrong PIN is refused", async () => {
    await seedInvite();
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ pin: "654321" })));
  });
  it("the sitter can fetch the invite by id (name and dates) but never the PIN", async () => {
    await seedInvite();
    await assertSucceeds(getDoc(d(sitter(), `invites/${IID}`)));
    await assertFails(getDoc(d(sitter(), `invitePins/${IID}`)));
  });
  it("nobody can list the invites or pins", async () => {
    await seedInvite();
    await assertFails(getDocs(collection(sitter(), `households/${HID}/invites`)));
    await assertFails(getDocs(collection(sitter(), `households/${HID}/invitePins`)));
  });
  it("an unauthenticated visitor can't fetch an invite", async () => {
    await seedInvite();
    await assertFails(getDoc(d(nobody(), `invites/${IID}`)));
  });
  it("an expired invite is refused", async () => {
    await seedInvite({ start: NOW - 5 * HOUR, end: NOW - HOUR });
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ startsAt: T(NOW - 5 * HOUR), expiresAt: T(NOW - HOUR) })));
  });
  it("an invite that hasn't started yet is refused", async () => {
    await seedInvite({ start: NOW + 5 * HOUR, end: NOW + 9 * HOUR });
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ startsAt: T(NOW + 5 * HOUR), expiresAt: T(NOW + 9 * HOUR) })));
  });
  it("a missing or short invite id is refused", async () => {
    await seedInvite();
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ inviteId: "does-not-exist-at-all" })));
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ inviteId: "short" })));
  });
  it("the record can't give the sitter a longer stay, another name, extra fields or another role", async () => {
    await seedInvite();
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ expiresAt: T(WIN.end + 30 * 24 * HOUR) })));
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ name: "Keith" })));
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ startsAt: T(WIN.start - 24 * HOUR) })));
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ extra: 1 })));
    await assertFails(setDoc(d(sitter(), "members/sit1"), record({ role: "owner" })));
  });
  it("can't claim for someone else's uid", async () => {
    await seedInvite();
    await assertFails(setDoc(d(sitter("mallory"), "members/sit1"), record()));
  });
  it("a Google (non-anonymous) account can't use the sitter route", async () => {
    await seedInvite();
    await assertFails(setDoc(d(google("eve", "eve@example.com"), "members/eve"), record()));
  });
  it("a sitter can't edit their own record to extend it", async () => {
    await seedInvite({ claimed: true });
    await assertFails(updateDoc(d(sitter(), "members/sit1"), { expiresAt: T(WIN.end + 99 * HOUR) }));
    await assertFails(deleteDoc(d(sitter(), "members/sit1")));
  });
});

describe("sitters: what an active sitter can do", () => {
  it("can read events and settings, and their own record", async () => {
    await seedInvite({ claimed: true });
    const db = sitter();
    await assertSucceeds(getDoc(d(db, "events/owners")));
    await assertSucceeds(getDocs(collection(db, `households/${HID}/events`)));
    await assertSucceeds(getDoc(d(db, "settings/x1")));
    await assertSucceeds(getDoc(d(db, "members/sit1")));
  });
  it("can't read health, weights, treatments, training, photos, the owners list or others' records", async () => {
    await seedInvite({ claimed: true });
    const db = sitter();
    for (const c of ["health", "weights", "treatments", "training", "photos", "photoFull", "devices"]) await assertFails(getDoc(d(db, `${c}/x1`)));
    await assertFails(getDoc(d(db, "meta/owners")));
    await assertFails(getDoc(d(db, "members/keith")));
  });
  it("can add events as themselves, with only the known fields", async () => {
    await seedInvite({ claimed: true });
    const db = sitter();
    await assertSucceeds(setDoc(d(db, "events/new1"), { type: "wee", at: NOW, by: "Jess", byUid: "sit1" }));
    await assertSucceeds(setDoc(d(db, "events/new2"), { type: "meal", at: NOW, by: "Jess", byUid: "sit1", grams: 55 }));
    await assertFails(setDoc(d(db, "events/bad1"), { type: "wee", at: NOW, by: "Jess", byUid: "keith" }));
    await assertFails(setDoc(d(db, "events/bad2"), { type: "wee", at: NOW, by: "Jess" }));
    await assertFails(setDoc(d(db, "events/bad3"), { type: "wee", at: NOW, by: "Jess", byUid: "sit1", admin: true }));
  });
  it("can't write anywhere else", async () => {
    await seedInvite({ claimed: true });
    const db = sitter();
    for (const c of ["health", "weights", "treatments", "training", "photos", "photoFull", "settings", "devices"]) await assertFails(setDoc(d(db, `${c}/new`), { at: 1 }));
    await assertFails(setDoc(d(db, "meta/owners"), { emails: ["jess@example.com"] }));
    await assertFails(setDoc(d(db, `invites/${IID}`), { name: "x", startsAt: T(NOW), expiresAt: T(NOW + HOUR), createdAt: T(NOW) }));
    await assertFails(setDoc(d(db, `invitePins/${IID}`), { pin: "000000" }));
    await assertFails(setDoc(d(db, "members/sit2"), record()));
  });
  it("can edit and delete only their own events", async () => {
    await seedInvite({ claimed: true });
    const db = sitter();
    await assertSucceeds(updateDoc(d(db, "events/mine"), { at: NOW - 60000 }));
    await assertFails(updateDoc(d(db, "events/mine"), { byUid: "keith" }));        // can't hand it to someone else
    await assertFails(updateDoc(d(db, "events/owners"), { at: NOW - 60000 }));
    await assertFails(deleteDoc(d(db, "events/owners")));
    await assertFails(deleteDoc(d(db, "events/x1")));                              // an event with no owner stamp
    await assertSucceeds(deleteDoc(d(db, "events/mine")));
  });
  it("is cut off when the record has expired", async () => {
    await seedInvite({ claimed: true, memberExpires: NOW - 1000 });
    await assertFails(getDoc(d(sitter(), "events/owners")));
    await assertFails(setDoc(d(sitter(), "events/late"), { type: "wee", at: NOW, by: "Jess", byUid: "sit1" }));
  });
  it("is cut off immediately when an owner revokes them", async () => {
    await seedInvite({ claimed: true });
    await assertSucceeds(getDoc(d(sitter(), "events/owners")));
    const keith = google("keith", "keith@example.com");
    await assertSucceeds(deleteDoc(d(keith, "members/sit1")));
    await assertSucceeds(deleteDoc(d(keith, `invites/${IID}`)));
    await assertSucceeds(deleteDoc(d(keith, `invitePins/${IID}`)));
    await assertFails(getDoc(d(sitter(), "events/owners")));
    await assertFails(setDoc(d(sitter(), "members/sit1"), record()));              // and can't claim again: the invite is gone
  });
});

describe("sitters: owners manage invites", () => {
  it("an owner can create, read, list and delete invites and pins", async () => {
    await seed();
    const keith = google("keith", "keith@example.com");
    await assertSucceeds(setDoc(d(keith, `invites/${IID}`), { name: "Jess", startsAt: T(WIN.start), expiresAt: T(WIN.end), createdAt: T(NOW) }));
    await assertSucceeds(setDoc(d(keith, `invitePins/${IID}`), { pin: "482913" }));
    await assertSucceeds(getDoc(d(keith, `invitePins/${IID}`)));
    await assertSucceeds(getDocs(collection(keith, `households/${HID}/invites`)));
    await assertSucceeds(getDocs(collection(keith, `households/${HID}/members`)));
    await assertSucceeds(deleteDoc(d(keith, `invites/${IID}`)));
  });
  it("rejects a bad PIN format, a backwards date range, a short id and extra fields", async () => {
    await seed();
    const keith = google("keith", "keith@example.com");
    const inv = { name: "Jess", startsAt: T(WIN.start), expiresAt: T(WIN.end), createdAt: T(NOW) };
    await assertFails(setDoc(d(keith, `invitePins/${IID}`), { pin: "12345" }));
    await assertFails(setDoc(d(keith, `invitePins/${IID}`), { pin: "12345a" }));
    await assertFails(setDoc(d(keith, `invites/${IID}`), { ...inv, expiresAt: T(WIN.start - HOUR) }));
    await assertFails(setDoc(d(keith, "invites/short"), inv));
    await assertFails(setDoc(d(keith, `invites/${IID}`), { ...inv, role: "owner" }));
  });
  it("a stranger can't create invites", async () => {
    await seed();
    await assertFails(setDoc(d(google("eve", "eve@example.com"), `invites/${IID}`), { name: "Eve", startsAt: T(WIN.start), expiresAt: T(WIN.end), createdAt: T(NOW) }));
  });
});
