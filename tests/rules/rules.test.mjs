// Firestore rules tests. Run with `npm test` in this folder (needs Java for the emulator).
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, serverTimestamp } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { before, after, beforeEach, describe, it } from "node:test";

const HID = "riley-abcdefghjkmnpqrs";           // 22 chars, like the app generates
const DATA = ["events", "health", "weights", "settings", "treatments", "training", "photos", "photoFull"];
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
