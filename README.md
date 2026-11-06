# Riley

A shared puppy log for the household. The iPad shows a live console, and the phones log with one tap. It's free to run on GitHub Pages and Firebase.

**Features**
- **One-tap logging** (wee, poo, nothing, accident, meal, nap, play, excited, walk), with who logged it. Each person has a colour badge, the iPad asks "Keith or …?", and there's undo.
- **Next trip out:** follows Riley's puppy plan (`GUIDELINES.md`). Every hour while awake, straight after waking or an accident, after eating, play or excitement, and last thing at night. "Nothing" retries in 15 min. The cue routine shows when a trip is due.
- **Food in grams:** set the daily allowance from the bag. Each meal logs its portion (tap to adjust), with today vs target and a 7-day chart.
- **Ticks, fleas & worms:** last dose (date, product, who), next due, and overdue flags. Back-dating the breeder's last dose is supported.
- **Coach:** suggestions with sources. When to cut meals (Blue Cross / Royal Kennel Club), when to stretch or shorten toilet trips (from your log), weighing and food updates, worming gaps by age, socialisation window countdown, fear period, name-reflex levels and crate progress (Kate's plan).
- **Training:** name reflex scored out of 5 per level, crate sessions (minutes, whined?), and a socialisation checklist with happy/unsure reactions.
- **Photo a day:** taken from the phone camera and compressed. The gallery is labelled with age in weeks and weight, with first-vs-latest compare and a growth timelapse. The latest photo becomes the app's avatar.
- **Health reminders** (jabs, vet) and a weight chart. The iPad console shows "Coming up" and the top coach tip.

## Setup (about 15 minutes)

### 1. Firebase (shared live data)
1. Go to https://console.firebase.google.com → **Add project** → name it `riley` and turn Analytics off.
2. **Build → Authentication → Get started → Sign-in method → Google → Enable** (pick a support email, then Save). Owners sign in with Google. Also add your site under **Authentication → Settings → Authorised domains** (for example `YOUR-USERNAME.github.io`).
3. **Build → Firestore Database → Create database.** Choose location `europe-west2 (London)` and start in **production mode**.
4. In Firestore's **Rules** tab, paste the contents of `firestore.rules` and click **Publish**.
5. **Project settings (⚙️) → Your apps → Web (</>)**: register an app called `riley`, then copy the `firebaseConfig` values into `config.js`.
6. **Owners:** the first Google account to open a household claims it. Then add your partner's Google email in ⚙️ Settings → Owners, and they can sign in. The rules only let verified Google accounts on that list in, so a leaked household code or join link is not enough.

**Upgrading from the anonymous-sign-in version:** publish the new `firestore.rules` **first** (Firebase console → Firestore → Rules → paste the file → Publish), *then* open the app and sign in with Google. The sign-in has to write your owner record, and the old rules don't allow that, so signing in before publishing shows "isn't an owner". Once the rules are published, devices still on the old anonymous sign-in lose access until their owner signs in with Google; the data itself stays where it is. The first Google account to sign in claims the household, so do your own sign-in straight after publishing.

**Sitters (two things to do in Firebase, once):**
1. **Authentication → Sign-in method → Anonymous → Enable.** Sitters have no Google account: the invite link and a PIN are what let them in, and they sign in anonymously behind the scenes.
2. **Publish the updated `firestore.rules`** (Firestore → Rules → paste → Publish). Existing owners are unaffected.

Then in the app: **⚙️ Settings → Sitters**, enter a name and dates, tap **Create invite**, send the link and tell them the PIN another way. They can log, see Today and read the sitter guide until the end of the last day. They can't see health, weights, photos or settings, and they can only edit or delete their own entries. **Revoke** cuts them off straight away. The invite id is a long random string and the PIN is stored separately from it (owners only), so a leaked link alone doesn't work. Firestore has no rate limiting, so keep invites short-lived.

### Reminders (phone notifications)
A GitHub Actions job runs every 15 minutes, works out what is due (a trip outside, a treatment or appointment, the photo-of-the-day nudge) and sends it through Firebase Cloud Messaging. It stays on the free plan: no Cloud Functions. Each person turns reminders on from **Settings → Reminders on this device** and chooses what they get, plus quiet hours (UK time). Reminders can arrive a few minutes late because GitHub delays scheduled runs.

One-off setup (you do this; nothing here is committed):
1. **Web push key.** Firebase console → Project settings (⚙️) → **Cloud Messaging** → **Web Push certificates** → **Generate key pair**. Copy the key into `vapidKey` in `config.js` and commit it. It is a public key, not a secret.
2. **Publish the updated `firestore.rules`** (it adds the `devices` collection, where each phone's choices are stored).
3. **Service account key (a secret).** Firebase console → Project settings → **Service accounts** → **Generate new private key**. In the GitHub repo go to **Settings → Secrets and variables → Actions → New repository secret** and add `FIREBASE_SERVICE_ACCOUNT` with the *entire contents* of the downloaded JSON file. Then delete the downloaded file. Never commit it.
4. **Household secret.** Add a second secret, `RILEY_HOUSEHOLD`, with your household code (Settings → Household code in the app).
5. **Try it.** Actions tab → **Reminders** → **Run workflow** (leave *dry run* ticked to see what would be sent, untick it to really send). On each phone, open the app, then **Settings → Reminders on this device → Turn on**, and tap **Show a test notification**.

On an **iPhone or iPad** the app must first be added to the Home Screen (Share, then Add to Home Screen) and opened from there; iOS needs 16.4 or later. On Android, Chrome works from a normal tab. GitHub pauses scheduled workflows in a repository with no activity for 60 days, so re-run it from the Actions tab if reminders stop.

How it avoids duplicates: the sender records what it has sent to each device (`households/<code>/meta/notified`, which only the service account can touch) and a trip's key is its due time, so the same trip is never sent twice and a new event gives a new trip. Trips more than 45 minutes overdue are not sent, so a gap in the schedule never produces a burst of old alerts.

**Testing:** `node --test "tests/unit/*.test.mjs"` runs the planner and reminder-logic unit tests. `cd tests/rules && npm install && npm test` (needs Java for the Firebase emulator) runs the Firestore rules tests and the reminder-sender tests; run it after any change to `firestore.rules` or `scripts/reminders`. The sender has its own dependencies: `cd scripts/reminders && npm install`.

The free Spark plan needs no card and is far above what a puppy log uses.

### 2. GitHub Pages (hosting)
1. Create a repo, for example `riley`, and upload all these files.
2. **Settings → Pages → Deploy from a branch → `main` / root.**
3. After a minute the app is live at `https://YOUR-USERNAME.github.io/riley/`.

### 3. Devices
1. **Your phone:** open the link, enter your name and tap **Start a new household**.
2. **Settings → Share join link:** send it to the other phone and open it on the iPad too. Each device just enters a name.
3. **Install it so it opens full-screen like an app:**
   - **Pixel / Android (Chrome):** open the link, then ⋮ menu → **Install app** (or **Add to home screen** → Install).
   - **iPad / iPhone (Safari):** Share → **Add to Home Screen**.
4. **iPad:** it switches to console view automatically. For a proper kitchen display:
   - Settings → Display & Brightness → Auto-Lock → **Never** (keep it on charge)
   - Settings → Accessibility → **Guided Access** on, then triple-click the top button in the app to lock it there
   - From 10pm to 6am the console dims to a dark theme
   - Tap the clock to switch the iPad to phone view if you need Settings

## Working on it with Claude Code
Open the folder in VS Code with the Claude Code extension. `CLAUDE.md` (how to work on this repo) and `GUIDELINES.md` (the trainer's rules) give Claude the context it needs. The backlog lives in GitHub Issues: run `scripts/create-issues.sh` once to create them from `backlog/`. Keep the trainer's original PDF out of this public repo.

## Notes
- **Demo mode:** until `config.js` has your Firebase keys, the app runs on one device only. That's handy for trying it out.
- **Privacy:** the household code is a long random string, which acts as the key to your data. Only share the join link with your household.
- **First things to set in ⚙️ Settings:** both people's names, Riley's daily food in grams (from the bag) and his expected adult size. Then log the breeder's last worming and flea dates in Health.
- **Photos are stored in Firestore**, not Firebase Storage, because Storage needs the paid Blaze plan. Each photo is compressed (about 30–300 KB). The free 1 GB holds years of daily photos.
- **Coach advice is general guidance.** For anything medical, such as doses, vaccines or worming products, follow your vet.
- **Offline:** logging still works with no signal and syncs when the phone reconnects.
