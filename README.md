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

**Testing the rules:** `cd tests/rules && npm install && npm test` (needs Java for the Firebase emulator). Run it after any change to `firestore.rules`.

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
