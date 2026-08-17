# Time to Die — Firebase Migration

Firebase project: `ttd-online-b8c0f`

GitHub repository: `BeybladeBattleArena/TTDOnline`

## Current phase

The `agent/firebase-foundation` branch keeps the v33 game untouched while adding:

- Firebase Hosting configuration
- Email/password and Google Authentication client
- Cloud profile creation through callable Functions
- One-time v33/RDS1 legacy profile import
- Firestore rules that block client progression writes
- Keyless GitHub Actions deployment through Google Workload Identity Federation
- Firebase Emulator configuration

The online migration preview is served from `/online.html`. The existing v33 build remains at `/random-dice-game-33.html` and is still the root route until the account/progression migration is proven safe.

## Google Cloud deployment identity

The one-time Google Cloud bootstrap has been completed for project `ttd-online-b8c0f`.

The deployment workflow uses Google Workload Identity Federation and creates **no service-account key**. The provider is restricted to the exact repository `BeybladeBattleArena/TTDOnline` and impersonates:

`github-firebase-deployer@ttd-online-b8c0f.iam.gserviceaccount.com`

The Workload Identity provider and service-account identifiers are intentionally stored directly in the workflow because they are public identifiers, not credentials or private keys.

## Firestore location

If the default Firestore database has not been provisioned yet, select its location deliberately before first deployment. Firestore database location is not changeable after provisioning.

For the current U.S.-hosted design, `nam5` is the recommended default here; the callable Functions are explicitly located in `us-central1`, which is the closest Functions region Firebase documents for `nam5`.

Do not create a Realtime Database instance yet solely for this phase. RTDB will be introduced for presence/rooms in the social/matchmaking phase.

## Legacy import trust boundary

The old RDS1 save codec uses an XOR obfuscation plus checksum. That can catch corruption but is not cryptographic anti-cheat protection. Accordingly:

- each online account gets at most one automatic legacy import;
- the imported baseline is marked `trusted: false`;
- client code cannot write progression documents directly;
- imported data should not become authoritative leaderboard/economy data until the server-side progression migration is complete.

## Next engineering phase

1. Provision/test Firestore and deploy this branch to the development Firebase project.
2. Exercise email/password and Google sign-in on desktop and mobile.
3. Import a real v33 profile and verify account summary/storage.
4. Replace local authoritative Pips/Astras with server transactions.
5. Move gacha, Class merge, jewels/enchanting, chests, and run rewards into callable Functions.
6. Convert v33 `saveAccount()` from whole-profile local persistence to a cloud-aware client cache backed by server-owned progression.
7. Add Realtime Database presence, friends, rooms, and matchmaking only after progression is authoritative.
