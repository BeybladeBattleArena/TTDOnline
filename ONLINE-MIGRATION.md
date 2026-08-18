# Time to Die — Firebase Online Foundation

Firebase project: `ttd-online-b8c0f`

GitHub repository: `BeybladeBattleArena/TTDOnline`

## Current phase

The `agent/firebase-foundation` branch keeps the v33 game source untouched while adding:

- Firebase Hosting configuration
- Email/password and Google Authentication client
- Fresh online account creation through callable Functions
- Server-owned Pips/Astras state in Firestore
- Firestore rules that block all client progression writes and private progression reads
- Keyless GitHub Actions deployment through Google Workload Identity Federation
- Firebase Emulator configuration
- A temporary per-account browser profile bridge while the remaining progression operations are serverized

The online preview is served from `/online.html`. The existing v33 build remains at `/random-dice-game-33.html` and is still the root route until the online account/progression layer is proven safe.

## Fresh-account policy

There are no production players yet, so legacy v33/RDS1 migration has been retired rather than preserved as permanent compatibility debt.

- New Firebase accounts begin with a fresh game profile.
- Accounts used during the migration experiment are reset into the current fresh account generation when they next sign in.
- Obsolete legacy migration snapshots are removed during that reset.
- The browser bridge scopes temporary v33 local data by Firebase UID so accounts on one device do not share a save.
- The bridge is transitional only; it is not the final cloud-save architecture.

## Authoritative game-state schema

The first authoritative progression document is:

`users/{uid}/game/state`

Current fields:

- `schemaVersion`
- `accountGeneration`
- `economy.pips`
- `economy.astras`
- `revision`
- server timestamps

Fresh online accounts start with exactly **600 Pips and 0 Astras**, matching v33's starter profile.

`ensureProfile` creates account metadata and the starter game state in one Firestore transaction. `getGameState` is an authenticated callable that returns the safe canonical game state. Web clients cannot write the document directly, and private progression subdocuments are denied by Firestore Security Rules; Cloud Functions use the Admin SDK for authoritative access.

During the bridge phase, `/online.html` reads the canonical state and overwrites only the temporary v33 `gold`/`astras` browser fields before loading the iframe. This prevents edited browser currency from becoming the starting online balance. It does **not** yet make v33's in-session gacha/reward mutations authoritative; those operations are the next migration step.

## Google Cloud deployment identity

The one-time Google Cloud bootstrap has been completed for project `ttd-online-b8c0f`.

The deployment workflow uses Google Workload Identity Federation and creates **no service-account key**. The provider is restricted to the exact repository `BeybladeBattleArena/TTDOnline` and impersonates:

`github-firebase-deployer@ttd-online-b8c0f.iam.gserviceaccount.com`

The Workload Identity provider and service-account identifiers are intentionally stored directly in the workflow because they are public identifiers, not credentials or private keys.

## Current trust boundary

Firebase now owns authentication, account identity, and the canonical Pips/Astras balance. The v33 gameplay code is still running as a transitional iframe and still owns dice, decks, jewels, rewards, and in-session currency mutations in browser memory.

The browser cannot directly write or read private authoritative progression documents. Authenticated callable Functions expose only the state/actions needed by the client.

## Next engineering phase

1. Verify server-owned 600 Pips / 0 Astras on an existing and a newly created account.
2. Move gacha spending + RNG + die grants into one server transaction.
3. Move authoritative die inventory and exact instance IDs into cloud state.
4. Move Class merges and jewel ejection/socketing into Functions while preserving v33 semantics.
5. Move chest/gift/reward acquisition and run rewards server-side.
6. Convert v33 `saveAccount()` from whole-profile local persistence to a cloud-aware cache backed by server-owned progression.
7. Promote the online entrypoint to the main Hosting route after cloud progression is stable.
8. Add Realtime Database presence, friends, rooms, and matchmaking after progression is authoritative.
