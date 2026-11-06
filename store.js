// Tiny data layer: Firebase Firestore when configured, otherwise a local demo store.
// Collections live under households/<code>/<collection>.
import { firebaseConfig } from "./config.js?v=7b28de81";

export const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey === "PASTE_ME";

export async function openStore(household) {
  return DEMO ? demoStore(household) : firebaseStore(household);
}

async function firebaseStore(household) {
  const V = "10.12.2";
  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-app.js`);
  const A = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-auth.js`);
  const fs = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-firestore.js`);

  const app = initializeApp(firebaseConfig);
  const auth = A.getAuth(app);
  try { await A.getRedirectResult(auth); } catch (e) { console.error(e); }  // returning from a Google redirect
  await auth.authStateReady();
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
  });
  const col = (name) => fs.collection(db, "households", household, name);
  // Firestore Timestamps become plain milliseconds, so the app never sees Firebase types.
  const plain = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, v && typeof v.toMillis === "function" ? v.toMillis() : v]));

  const messaging = async () => { const M = await import(`https://www.gstatic.com/firebasejs/${V}/firebase-messaging.js`); return { M, m: M.getMessaging(app) }; };
  const push = {
    supported: async () => {
      if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) return false;
      try { return await (await messaging()).M.isSupported(); } catch { return false; }
    },
    permission: () => Notification.permission,
    // Ask for permission (must follow a tap), register the service worker, and return this phone's FCM token.
    async enable(vapidKey) {
      if ((await Notification.requestPermission()) !== "granted") throw Object.assign(new Error("Notifications are blocked"), { code: "denied" });
      return this.token(vapidKey);
    },
    async token(vapidKey) {
      const reg = await navigator.serviceWorker.register("sw.js"); await navigator.serviceWorker.ready;
      const { M, m } = await messaging(); return M.getToken(m, { vapidKey, serviceWorkerRegistration: reg });
    },
    async disable() { try { const { M, m } = await messaging(); await M.deleteToken(m); } catch (e) { console.error(e); } },
    async test(title, body) { const reg = await navigator.serviceWorker.ready; return reg.showNotification(title, { body, tag: "test", icon: "icon-192.png" }); },
  };

  return {
    push,
    // Owners sign in with Google. A leftover anonymous session from the old setup doesn't count.
    needsSignIn: () => !(auth.currentUser && !auth.currentUser.isAnonymous),
    user: () => auth.currentUser,
    async signIn() {
      const provider = new A.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      try { await A.signInWithPopup(auth, provider); }
      catch (e) {  // popups can be blocked in home-screen apps: fall back to a full-page redirect
        if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment"].includes(e.code)) return A.signInWithRedirect(auth, provider);
        throw e;
      }
    },
    signOut: () => A.signOut(auth),
    signInSitter: () => A.signInAnonymously(auth),   // a sitter has no account: the invite link and PIN are what let them in
    ts: (ms) => fs.Timestamp.fromMillis(ms),
    subscribe(name, cb, sinceMs) {
      const q = sinceMs
        ? fs.query(col(name), fs.where("at", ">=", sinceMs), fs.orderBy("at"))
        : fs.query(col(name));
      return fs.onSnapshot(q, (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...plain(d.data()) }))),
        (err) => { console.error(err); cb(null, err); });
    },
    add: async (name, obj) => (await fs.addDoc(col(name), obj)).id,
    update: (name, id, patch) => fs.updateDoc(fs.doc(col(name), id), patch),
    remove: (name, id) => fs.deleteDoc(fs.doc(col(name), id)),
    get: async (name, id) => { const s = await fs.getDoc(fs.doc(col(name), id)); return s.exists() ? { id: s.id, ...plain(s.data()) } : null; },
    setDoc: (name, id, obj) => fs.setDoc(fs.doc(col(name), id), obj, { merge: true }),
  };
}

function demoStore(household) {
  const key = (n) => `riley-demo:${household}:${n}`;
  const read = (n) => { try { return JSON.parse(localStorage.getItem(key(n)) || "[]"); } catch { return []; } };
  const subs = [];
  const emit = (n) => subs.filter((s) => s.n === n).forEach((s) => s.fire());
  const write = (n, rows) => {
    try { localStorage.setItem(key(n), JSON.stringify(rows)); }
    catch (e) { emit(n); throw new Error("Demo storage is full – connect Firebase to keep more photos"); }
    emit(n);
  };
  addEventListener("storage", (e) => subs.forEach((s) => e.key === key(s.n) && s.fire()));

  // Demo mode has no real accounts. A sitter session is simulated (with the same PIN, date and invite checks the
  // Firestore rules make) so the whole sitter flow can be tried and tested without Firebase.
  const uidKey = `riley-demo:${household}:uid`;
  const denied = () => Object.assign(new Error("Missing or insufficient permissions."), { code: "permission-denied" });
  const push = {   // no real notifications in demo mode: this only lets the Settings screen work
    supported: async () => "Notification" in window,
    permission: () => Notification.permission,
    enable: async () => { if ((await Notification.requestPermission()) !== "granted") throw Object.assign(new Error("Notifications are blocked"), { code: "denied" }); return "demo-token-" + household; },
    token: async () => "demo-token-" + household,
    disable: async () => {},
    test: async (title, body) => { new Notification(title, { body }); },
  };
  return {
    push,
    needsSignIn: () => false, signIn: async () => {}, signOut: async () => { localStorage.removeItem(uidKey); },
    user: () => { const uid = localStorage.getItem(uidKey); return uid ? { uid, isAnonymous: true } : null; },
    signInSitter: async () => { if (!localStorage.getItem(uidKey)) localStorage.setItem(uidKey, "sitter-" + Math.random().toString(36).slice(2, 10)); },
    ts: (ms) => ms,
    subscribe(n, cb, sinceMs) {
      const s = { n, fire: () => cb(read(n).filter((r) => !sinceMs || r.at >= sinceMs).sort((a, b) => (a.at || 0) - (b.at || 0))) };
      subs.push(s); setTimeout(s.fire);
      return () => subs.splice(subs.indexOf(s), 1);
    },
    async add(n, obj) { const id = Math.random().toString(36).slice(2); write(n, [...read(n), { id, ...obj }]); return id; },
    async update(n, id, patch) { write(n, read(n).map((r) => (r.id === id ? { ...r, ...patch } : r))); },
    async remove(n, id) { write(n, read(n).filter((r) => r.id !== id)); },
    async get(n, id) { return read(n).find((r) => r.id === id) || null; },
    async setDoc(n, id, obj) {
      const uid = localStorage.getItem(uidKey);
      if (uid && n === "members") {  // a sitter claiming their record: mirror firestore.rules
        const inv = read("invites").find((r) => r.id === obj.inviteId), pin = read("invitePins").find((r) => r.id === obj.inviteId);
        const ok = id === uid && inv && pin && pin.pin === obj.pin && obj.role === "sitter" && obj.name === inv.name
          && obj.startsAt === inv.startsAt && obj.expiresAt === inv.expiresAt && inv.startsAt <= Date.now() && inv.expiresAt > Date.now();
        if (!ok) throw denied();
      } else if (uid && !(n === "events")) throw denied();
      return this._set(n, id, obj);
    },
    async _set(n, id, obj) {  // merge like Firestore's { merge: true }: nested objects merge, arrays replace
      const merge = (a, b) => {
        const o = { ...a };
        for (const [k, v] of Object.entries(b)) o[k] = v && typeof v === "object" && !Array.isArray(v) && a?.[k] && typeof a[k] === "object" ? merge(a[k], v) : v;
        return o;
      };
      const rows = read(n), i = rows.findIndex((r) => r.id === id);
      i >= 0 ? (rows[i] = merge(rows[i], obj)) : rows.push({ id, ...obj });
      write(n, rows);
    },
  };
}
