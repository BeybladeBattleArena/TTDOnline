# Moving Screen — Playtest Shipment Status

Updated: 2026-08-29

## Protected baseline

- Known-good production snapshot branch: `snapshot/pre-moving-screen-2026-08-29`
- Snapshot commit: `6b6e965f7320ece48255f137d9fa5884661b8b98`
- Development branch: `feature/moving-screen-v1`
- Production/main is not modified until the exact candidate passes repository verification.

## Active shipping authorities

Only these Moving Screen runtime authorities are loaded:

- `online/moving-screen-neon-rooftops-v2.js` — four-tier Neon Rooftops stage data and objective configuration.
- `online/moving-screen-engine-v3.js` — hardened Moving Screen world/combat/objective runtime.

Superseded v1/v2 runtime experiments were removed from the branch before shipment. Moving Screen is loaded as ordinary committed JavaScript from `online/runtime-bridge-loader-v1.js`; it uses no deployment-time code patch, source-text replacement, `eval`, generated reconstruction, or asset mutation.

## Current single-player playtest rules

- Arcade entry: **Moving Screen**.
- **King of the Hill** is reserved directly beneath it as a disabled future entry.
- No normal Dice Tray.
- Random direct summoning from the active five-Die deck into legal world-space summon spots.
- 10 starting lives; every destructive player-Die loss costs one life; merges do not.
- If the map has no surviving player Dice: 3-second grace, then animated purple/blue `5,4,3,2,1`; still empty after `1` means FAIL.
- Victory requires at least 60 credited enemy defeats plus a surviving player Die physically carrying the final-area flag.
- The flag is a world object: player tap pickup, enemy AI pickup/pathing, attached carrier rendering, loose bounce, drop, respawn after off-map loss, and merge transfer.
- Enemy AI prioritizes the flag/player carrier while obeying graph occupancy and live camera-death-plane checks.
- Stationary routes reject obvious screen suicide; player routes during camera travel remain intentionally risky.
- Top, bottom, left, and right camera borders are lethal death planes.
- Same-safe-area combat continues during camera travel at a 15% attack-speed reduction; cross-area fire requires a stationary camera, range, and line of sight.
- Choke surfaces, destructibles, path replacement, knockback/launch, rail guards, in-surface repositioning, and branching crossroads are active.

## Presentation

The first playtest map is a procedural nighttime rooftop district with four major tiers, building facades, fire escapes/stairs, scaffold and billboard connectors, awning/ledge routes, neon signs, rooftop lamps, HVAC/tanks/sheds, foreground structures, skyline parallax, safe-surface outlines, inhabitant spots, branch markers, camera progression display, death-plane glow, flag rendering, and Moving Screen HUD/objective presentation.

Projection uses independent horizontal and vertical scaling so portrait/mobile view still fits rooftop width without revealing the entire vertical battlefield at once. Summoning is restricted to the current camera band so a visible future rooftop cannot become a random free elevator.

## Validation

The repository has dedicated Moving Screen validation in `scripts/check-moving-screen-v1.mjs`, included in both full and Hosting validation. It guards objective constants, stage connectivity, direct-source/no-tray constraints, route/death-plane rules, flag behavior markers, camera-band summoning, correct numeric range returns, and topological AI planning. Runtime compatibility and loader-order checks include only the active v2-stage/v3-engine authorities.

The final candidate must pass the complete GitHub Verify workflow, including `npm run check` and the read-only validation check, before merge/deploy.
