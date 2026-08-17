# Time to Die — Firebase Online Foundation

Firebase project: `ttd-online-b8c0f`

GitHub repository: `BeybladeBattleArena/TTDOnline`

## Current phase

The `agent/firebase-foundation` branch keeps the v33 game source untouched while adding:

- Firebase Hosting configuration
- Email/password and Google Authentication client
- Fresh online account creation through callable Functions
- Firestore rules that block client progression writes
- Keyless GitHub Actions deployment through Google Workload Identity Federation
- Firebase Emulator configuration
- A temporary per-account browser profile bridge while server-authoritative progression is integrated

The online preview is served from `/online.html`. The existing v33 build remains at `/random-dice-game-33.html` and is still the root route until the online account/progression layer is proven safe.

## Fresh-account policy

There are no production players yet, so legacy v33/RDS1 migration has been retired rather than preserved as permanent compatibility debt.

- New Firebase accounts begin with a fresh game profile.
- Accounts used during the migration experiment are reset into the current fresh account generation when they next sign in.
- Obsolete legacy migration snapshots are removed during that reset.
- The browser bridge scopes temporary v33 local data by Firebase UID so accounts on one device do not share a save.
- The bridge is transitional only; it is not the final cloud-save architecture.

## Google Cloud deployment identity

The one-time Google Cloud bootstrap has been completed for project `ttd-online-b8c0f`.

The deployment workflow uses Google Workload Identity Federation and creates **no service-account key**. The provider is restricted to the exact repository `BeybladeBattleArena/TTDOnline` and impersonates:

`github-firebase-deployer@ttd-online-b8c0f.iam.gserviceaccount.com`

The Workload Identity provider and service-account identifiers are intentionally stored directly in the workflow because they are public identifiers, not credentials or private keys.

## Current trust boundary

Authentication and account identity are online. The v33 gameplay code is still running as a transitional iframe and still writes gameplay progression to browser storage.

Client code cannot write authoritative Firestore progression documents directly. The next phase replaces the local gameplay authority with callable server transactions and cloud-owned state.

## Next engineering phase

1. Verify fresh account creation and account switching on desktop/mobile.
2. Define the authoritative cloud game-state schema.
3. Replace local authoritative Pips/Astras with server transactions.
4. Move gacha, Class merge, jewels/enchanting, chests, and run rewards into callable Functions.
5. Convert v33 `saveAccount()` from whole-profile local persistence to a cloud-aware cache backed by server-owned progression.
6. Promote the online entrypoint to the main Hosting route after cloud progression is stable.
7. Add Realtime Database presence, friends, rooms, and matchmaking after progression is authoritative.
