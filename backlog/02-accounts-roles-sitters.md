# Accounts and roles: owner sign-in plus time-limited sitter access
Labels: feature, security, P1

## Why
At the moment anyone with the join link has full access. We want sitters and guests to help without being able to change settings, delete our entries, or see health history.

## What
**Roles** (stored at `households/<hid>/members/<uid>`: `{role, name, expiresAt}`)
- **Owner** (Keith + partner): everything. Sign in with **Google** (Firebase Auth). *Open question: Google vs email and password. The default is Google.*
- **Sitter:** created from Settings → "Invite a sitter" (name, start and end dates). The sitter gets a link containing an unguessable invite id **plus** a 6-digit PIN that the owner tells them separately. No account is needed (anonymous auth). Access expires automatically, and owners can revoke it.
  - Sitters can: log events, see Log and Today, see the Sitter guide (#sitter-guide ticket), and add photos (*default: yes, and they see only their own photos*).
  - Sitters can't: open Settings, delete other people's entries (they can undo their own within 10 minutes), see Health or weight history, or invite anyone.
- **iPad:** signed in as an owner. While a sitter is active, the "Who's logging?" picker shows them as a third option.

**Security must be enforced in `firestore.rules`, not just by hiding UI**
- Every read and write checks `members/<request.auth.uid>`: its role, and that `expiresAt > request.time`
- Invites live at `households/<hid>/invites/<id>`, which only owners can read. A sitter creates their member doc only if the invite exists, isn't expired, and `request.resource.data.pin == invite.pin`
- Migration: the existing household code becomes the household id, and the first owner to sign in claims it

## Acceptance criteria
- [ ] Rules are tested with the Firebase emulator (`firebase emulators:exec`), covering: owner allowed, sitter allowed or denied per collection, expired sitter denied, wrong PIN denied, stranger denied
- [ ] A sitter link plus the correct PIN works on a fresh phone. A wrong PIN fails without revealing anything
- [ ] Revoking a sitter cuts off access immediately
- [ ] Existing data survives the migration
- [ ] The README is updated: the Google sign-in provider must be enabled in Firebase
