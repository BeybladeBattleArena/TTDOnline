# Moving Screen v1 — Implementation Status

Branch: `feature/moving-screen-v1`
Snapshot: `snapshot/pre-moving-screen-2026-08-29` @ `6b6e965f7320ece48255f137d9fa5884661b8b98`

## Implemented in the first structural pass

- Dedicated Arcade-mode screen/canvas with no normal dice tray.
- Moving Screen Arcade card and future King of the Hill placeholder.
- Four-tier neon-rooftop procedural battlefield.
- Pseudo-3D `(x,z,y)` world projection with vertical `cameraY` progression.
- Multiple camera pauses and animated transitions.
- Four lethal screen-edge death planes evaluated at each entity anchor.
- Random direct summoning from the active five-die deck into available world spots.
- Safe-surface outlines and explicit inhabitant spots.
- Bidirectional marching-path graph.
- Diverging junction/crossroad indicators and manual player branch choice.
- Movement disables attacking.
- Stationary-camera player route safety checks.
- Transition-time player route risk remains manual and can produce Screen Out.
- Enemy graph pathfinding with transition-time risk evaluation.
- Path occupancy and constrained choke zones.
- Same-safe-surface combat during camera movement.
- 15% attack-speed reduction during camera movement.
- Stationary-camera ranged cross-surface combat with world-space range + large-obstacle LOS.
- Player and enemy HP/destruction.
- Basic compatible-die merging on world spots.
- Two topology-changing destructibles and player tap attacks.
- Enemy AI can identify/break a destructible blocking its preferred route.
- Prototype knockback/launch -> airborne displacement -> landing/void vulnerability.
- Procedural background skyline, neon accents, foreground occlusion and rooftop obstacles.
- Moving Screen-specific source validator wired into normal and hosting checks.
- Runtime compatibility audit and loader-order contract include the Moving Screen module.

## Deliberately not represented as complete yet

- Browser/play feel validation on every viewport.
- Full visual/environment art pass.
- Full parity for every existing Die special in world-space combat.
- Detailed per-monster Adventure skill parity.
- Full physical railing/barrier collision for displacement.
- Networked PvP / opponent Dice.
- King of the Hill gameplay/scoring.
- Final rewards/economy/progression integration.

Those follow only after the structural pass survives CI and hands-on play testing.