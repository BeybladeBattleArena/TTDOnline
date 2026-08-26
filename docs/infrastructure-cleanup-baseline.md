# TTD Lossless Infrastructure Cleanup — Baseline and Authority Map

Captured: 2026-08-25

## Immutable recovery point

- Repository: `BeybladeBattleArena/TTDOnline`
- Known-good source commit: `f62f87ee7c33cc7d999893bc334ebc3e2fb52f9f`
- Recovery branch: `snapshot/pre-cleanup-2026-08-25`
- Cleanup branch starts from the same commit: `cleanup/lossless-infrastructure`
- `main` is intentionally untouched during cleanup work.
- The repository's durable production receipt currently names `f9e75c4dcb956f2978eaeb26c080893d3a79df14` as the last verified Hosting commit. This is a production receipt, not a substitute for the source snapshot above.

## Cleanup invariant

Preserve first, simplify second. No gameplay, UI, progression, account, presentation, or approved asset behavior may be removed merely because its implementation appears redundant.

Target development flow:

`Snapshot -> Change -> Validate -> Deploy -> Test`

Deployment must validate and publish the exact committed candidate. It must not create a different candidate.

## Current authority map

| Area | Current effective authority | Transitional / competing mechanisms | Cleanup direction |
| --- | --- | --- | --- |
| Production branch | `main` | Production workflow writes additional commits to `main` | Deploy exact selected commit; no source-control writes from deploy |
| Core game document | `random-dice-game-33.html` | Deploy-time canonical-results materializer plus runtime textual transformation | Preserve behavior, then make committed source the executable authority |
| Dice catalog | `dicefile.json` | Runtime replaces the monolith's embedded `DICE` block; validator writes `functions/dicefile.generated.json` | Keep one catalog authority; generation must be an explicit build/update operation, never hidden validation |
| Registered game assets | `assets/game-assets.json` + referenced committed files | Drive materializer, transparent-PNG materializer, legacy JPG/WebP variants and redirects | Registered committed PNG/MP3/SVG files are immutable runtime masters; aliases may redirect but may not regenerate |
| Online bootstrap | `online/game-loader.html` | Post-transform dynamic authority injection for Collection/page polish | Keep bootstrap read-only and deterministic |
| Runtime composition | `online/game-loader.js` | Literal source replacements and bridge-source injection into the monolith | Preserve every injected behavior, then migrate safely out of textual surgery |
| Account/cloud shell | `online.html` plus online Firebase/client modules | Historical client generations remain in tree | Determine loaded generation before deleting anything |
| Release validation | `package.json` check graph + `scripts/check-*.mjs` | Some checks generate files; release-integrity validator owns unrelated responsibilities | Make every validator read-only and give each one a bounded contract |
| Hosting deployment | `.github/workflows/firebase-deploy.yml` | Materializes source/assets, edits checks, commits, pushes, deploys, writes receipts/diagnostics back to `main` | Validate clean tree -> stamp build artifact -> deploy exact SHA -> verify live SHA; no repo mutation |
| Designer art import | `.github/workflows/designer-art-import.yml` + `scripts/materialize-highres-art-v33.sh` | Downloads external Drive files over committed PNG masters | Remove as an automatic authority; approved files enter repository explicitly and thereafter remain unchanged |
| Announcer audio | Registered files in `assets/audio/announcer/` | Chunked base64 reconstruction material in `staging/audio/` and deploy hash/materialization logic | Exact committed MP3 files are authoritative; staging chunks are not runtime/release authorities |

## Confirmed deployment-time mutation

`.github/workflows/firebase-deploy.yml` currently performs all of the following before Hosting deployment:

1. Runs `scripts/materialize-canonical-results-v35.mjs` against the main game source when a marker is absent.
2. Uses `sed -i` to change a loader validator.
3. Rewrites `assets/game-assets.json` inline.
4. Installs Pillow and runs `scripts/materialize-transparent-item-art-v2.py`, which rewrites approved item PNGs in place.
5. Stages source, assets, bridges and checks; creates a `[canonical-materialization]` commit; pushes that commit to `main`.
6. Deploys the resulting new `HEAD`, not necessarily the `[release]` commit that triggered the workflow.
7. After deployment, commits `production-verified.json` to `main`.
8. Also commits a hosting diagnostic file to `main`.

This is the first infrastructure defect to remove because it breaks the identity `requested release commit == deployed source commit`.

## Confirmed validation-time mutation

`npm run check` currently includes `check:catalog`, which executes `scripts/sync-dice-catalog.mjs`. That script validates `dicefile.json` and then writes `functions/dicefile.generated.json`.

A validator that changes the workspace is not a validator-only authority. Generation must become an explicit operation, while validation compares the checked-in generated output to the canonical catalog without modifying it.

## Confirmed asset mutation / reconstruction paths

- `scripts/materialize-transparent-item-art-v2.py` converts item PNGs to RGB, derives alpha algorithmically from black backing, and writes the PNGs back in place. This is asset mutation and is incompatible with authoritative approved PNG masters.
- `scripts/materialize-highres-art-v33.sh` can download external Drive objects over committed PNG paths and writes a lock marker. Even when the download is byte-preserving, the external handoff becomes a competing authority. The committed approved assets must instead be the release authority.
- `staging/audio/*.b64.*` contains chunked reconstruction material for authoritative announcer MP3s. It is staging residue, not an allowed source for runtime or deployment reconstruction.
- Legacy JPG/WebP files and Firebase redirects may remain temporarily for URL compatibility, but they are not sources from which registered PNGs may be reconstructed.

## Runtime transformation map

`online/game-loader.js` currently fetches `random-dice-game-33.html`, `dicefile.json`, and the active bridge sources as text. Before the game executes it performs literal replacements in the core source, including:

- replacing the embedded `DICE` object with the JSON catalog;
- injecting Magma Force, Soul Scimitar and Slither Vine dispatch/update/draw hooks;
- modifying Adventure and Endless Horde enemy-skill gates;
- changing target-label behavior;
- replacing mobile deck CSS, gesture timings and the collection pointer handler;
- injecting bridge source immediately before the monolith's closing IIFE;
- writing the fully transformed document with `document.write()`.

Active bridge-source order at the baseline:

1. `online/dice-catalog-bridge-v8.js`
2. `online/soul-scimitar-svg-v14.js`
3. `online/slither-vine-bridge-v8.js`
4. `online/game-bridge-inner.js`
5. `online/progression-bridge-v5.js`
6. `online/singleplayer-bridge-v6.js`
7. `online/merge-bridge-v6.js`
8. `online/run-ui-bridge-v21.js`
9. `online/refresh-bridge-v6.js`
10. `online/mobile-input-bridge-v9.js`
11. `online/interaction-effects-v10.js`
12. `online/collection-portrait-fit-v16.js`
13. `online/deck-editor-v18.js`
14. `online/avatar-inventory-v22.js`

`online/game-loader.html` separately attempts to inject `collection-portrait-fit-v16.js` and `page-polish-v32.js` after the transformed document appears. That relationship must be tested before any deduplication.

## Versioned files present but not automatically obsolete

The tree contains multiple generations of several modules, including catalog bridges, result-summary clients, typography clients, startup polish, interaction fixes, run clients, run UI bridges, Firebase clients, and platforming selectors. Presence alone is not evidence that an older version is dead. Deletion requires proof that it is neither loaded nor imported nor required as a compatibility target.

## Pass boundaries

### Pass 1 — Snapshot and authority mapping

Status: mapped. No gameplay/runtime behavior changed.

### Pass 2 — Immutable asset enforcement

- make committed registered assets the only release authority;
- remove automatic reconstruction/mutation from release paths;
- convert asset checks to read-only verification;
- retire staging reconstruction residue only after confirming no runtime dependency.

### Pass 3 — Deployment pipeline cleanup

- remove source/asset materialization from Hosting deployment;
- remove deploy-time commits/pushes;
- validate that the working tree remains clean;
- stamp and deploy the triggering SHA exactly;
- verify production serves that exact SHA.

### Pass 4 — Validator consolidation

- split validation from generation;
- remove duplicate/contradictory checks;
- define one responsibility per validator;
- ensure `npm run check` exits with an unchanged working tree.

### Pass 5 — Runtime authority / bridge consolidation

- inventory each active source transformation and bridge contract;
- move behavior into committed source/modules without semantic change;
- remove textual surgery only after equivalence checks exist;
- remove dead historical generations only after load/import proof.

### Pass 6 — Production verification and cleanup

- compare candidate and deployed build identity;
- run release checks and smoke checks;
- verify gameplay/presentation regression surfaces;
- only then merge/deploy and remove temporary cleanup scaffolding.

## Lossless rule for every later pass

A simplification is accepted only if the old behavior is first identified and the new authority demonstrably preserves it. When evidence is incomplete, retain the existing mechanism and mark it for a later pass rather than guessing.
