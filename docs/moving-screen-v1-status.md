# Moving Screen — Playtest Shipment Status

Updated: 2026-08-29

Protected baseline: `snapshot/pre-moving-screen-2026-08-29` at `6b6e965f7320ece48255f137d9fa5884661b8b98`.
Development branch: `feature/moving-screen-v1`.

Active runtime authorities are exactly `online/moving-screen-neon-rooftops-v2.js` and `online/moving-screen-engine-v3.js`, loaded directly by `online/runtime-bridge-loader-v1.js`. Superseded Moving Screen runtime experiments were removed before shipment. No Moving Screen deployment-time source patching, source-text replacement, eval, generated reconstruction, or asset mutation is used.

The playtest mode has: Arcade Moving Screen entry plus future King of the Hill entry; no normal Dice Tray; random direct world summoning; four-tier neon rooftop world; safe spots and branching bidirectional marching paths; manual player crossroads; stationary-camera safety and risky transition movement; all four camera death planes; 15% transition combat-speed reduction; LOS/range combat; choke points; destructibles; displacement/rail guards; in-surface repositioning; 10 lives with one life per destructive Die loss; 3-second empty-field grace plus animated 5-to-1 emergency countdown; 60 credited enemy defeats plus physical player flag possession required to win; enemy flag pathing/capture/defense; loose flag bounce/pickup/respawn; and normal clear/fail presentation before Moving Screen results.

The repository validators guard the active stage/engine, objective constants, connectivity, runtime compatibility, loader order, numeric range returns, camera-band summoning, and topological AI planning. Full GitHub Verify passed for the candidate immediately prior to release promotion, including `npm run check` and read-only validation.
