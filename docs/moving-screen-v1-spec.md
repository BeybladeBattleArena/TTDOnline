# Time To Die — Moving Screen v1 Contract

Captured: 2026-08-29

This document is the gameplay and implementation authority for the first Moving Screen Arcade-mode build. It is intentionally separate from Adventure Mode even where Adventure traversal concepts are reused.

## Development safety

- Protected source snapshot: `snapshot/pre-moving-screen-2026-08-29`.
- Snapshot commit: `6b6e965f7320ece48255f137d9fa5884661b8b98`.
- Development branch: `feature/moving-screen-v1`.
- Do not alter or deploy `main` while the mode is under construction.
- Moving Screen must be committed game source. Do not use deployment-time mutation, source-text replacement, generated patches, or asset reconstruction.
- Reuse established Adventure pseudo-3D concepts where useful, but give Moving Screen its own explicit runtime authority and stage data.

## Arcade placement

- Moving Screen is an Arcade Mode.
- Add **Moving Screen** to the Arcade selection.
- Add **King of the Hill** as an Arcade entry immediately after/under Moving Screen. King of the Hill can remain a clearly marked future/disabled entry until its rules are designed.

## No dice tray

Moving Screen does not use the normal 15-tile dice tray.

- The active five-die deck remains the summon pool.
- Summoning creates a random die from that pool directly on a random available inhabitant spot belonging to a currently valid large summon/safe surface.
- A summon fails cleanly if no legal summon spot exists.
- Dice remain world entities for the duration of the mode.
- Merge, movement, combat, damage, displacement, death and future PvP all operate on these world entities rather than tray tiles.

## World and camera

- First map: a nighttime neon rooftop district with four major vertical tiers.
- Use pseudo-3D world coordinates `(x, z, y)`:
  - `x`: horizontal position across the rooftop.
  - `z`: depth toward/away from the camera.
  - `y`: vertical/elevation position.
- The stage is one continuous world. Major roofs, fire escapes, lower roofs, scaffolds, billboards, street lamps, awnings and neighboring-building structures bridge the vertical gaps.
- Camera progression is vertical and data-driven through multiple pauses/stops across the four tiers.
- Background and foreground scenery remain separate from collision/gameplay geometry.
- Attack-range scaling must account for horizontal and vertical separation. Use a world-space equivalent of the major-boss approach rather than treating vertical separation as cosmetic.

## Safe surfaces

A **safe surface** is a world-space area in which a stationary die or enemy is allowed to inhabit a spot and fight.

Rendering:

- Outline safe surfaces with a white rounded-rectangle line at approximately 25% opacity.
- Each safe surface owns explicit inhabitant spots.
- Large safe surfaces contain multiple spots and can become contested battle areas.
- Small safe surfaces/perches may contain one or only a few spots.
- Choke-point surfaces intentionally have constrained spots and/or constrained entrances.

Rules:

- Entities may stand and attack only while occupying a legal spot in a safe surface.
- Player Dice and hostile entities may occupy the same safe surface and fight there.
- Safe surfaces should be spaced so combat appears physically convincing; do not create important combat relationships across visually absurd distances.
- Some surfaces should naturally concentrate both factions around valuable choke points.

## Marching-path graph

Safe surfaces are connected by explicit bidirectional marching paths.

Rendering:

- Draw available marching paths with the same approximately 25%-opacity white line used by safe-surface outlines.
- At a divergence/crossroads, visibly split the line.
- Mark the split with small white path dots/circles so the branch is readable before an entity reaches it.

Rules:

- Paths can be traversed in either direction unless their current state says otherwise.
- A moving entity cannot attack.
- An entity may finish movement only in a legal inhabitant spot in a safe surface.
- A die reaching a crossroads must receive a manual player branch choice; it does not auto-pick a branch.
- While awaiting a branch choice, the die is still considered in transit and cannot attack.
- Enemy AI makes its own branch decisions.
- If a route/edge is currently non-traversable, it cannot be selected.
- Path occupancy/capacity should support bottlenecks; entities do not pass through one another as though they were intangible.

## Stationary-camera movement safety

When the camera is paused/stationary:

- Player Dice and enemies may voluntarily move between reachable safe surfaces.
- A moving entity cannot attack.
- The player must not be allowed to issue an obviously suicidal route that crosses a screen death plane before reaching its legal destination.
- Enemy AI likewise treats obviously lethal stationary-camera routes as invalid.
- This safety validation considers the entire proposed path, not merely the destination.

## Transition movement and player risk

When the camera is actively transitioning:

- Player route choice is not protected by the stationary-camera safety gate.
- If the player commands a route that travels beyond a screen death plane, the die follows the order and dies when its entity anchor crosses that plane.
- This intentionally enables high-skill timing. A player can push a die almost beyond the top boundary — even with the upper half of its body visibly off-screen — and survive if its entity anchor reaches a valid safe spot before crossing the death plane.
- Enemy AI also makes real transition-time risk judgments rather than receiving perfect protection.
- Transition routing should therefore reward knowledge of path length, camera velocity and entity movement speed.

## Screen death planes

Every camera border is an unconditional death plane for world entities.

- Top, bottom, left and right borders are lethal.
- The rule applies to player Dice, enemies and future opponent Dice equally.
- The rule applies while the camera is stationary and while it is moving.
- Death is evaluated at the entity's anchor/center, allowing part of a sprite to extend beyond the visible frame without immediate death.
- A camera moving upward does not make the upper plane safe. A die sent too far upward can still die by crossing the top border.
- A camera moving upward also kills entities left behind once their anchors cross the bottom border.
- No faction receives immunity from a death plane because of AI control, boss status or PvP ownership unless a future rule explicitly grants it.

## Combat

- Stationary entities may attack legal hostile targets while occupying safe areas.
- If player Dice and enemies/future opponent Dice occupy the same safe area, they fight even during a screen transition.
- During camera movement, attack speed is reduced by 15% for fighting entities.
- When the camera is stationary, entities in different safe areas may attack one another if:
  1. the target is within the attacker's effective world-space range, and
  2. no large line-of-sight obstacle blocks the attack.
- Moving entities do not attack.
- Combat targeting should preferentially produce visually believable encounters and should not routinely select remote targets simply because a mathematical range test barely passes.
- The world-entity model must be faction-neutral enough to support future player-vs-player Dice without replacing the movement/combat architecture.

## Displacement

- Knockback can push an entity out of its safe surface.
- Launch effects can send an entity upward and over railings/barriers that would otherwise prevent a fall.
- Once displaced from a safe surface, an entity is physically vulnerable to void/death-plane loss until it lands/re-enters a legal area.
- Barriers and safe-area geometry must therefore matter to displacement, not only to marching-path routing.

## Destructible terrain and barriers

Moving Screen supports breakable world objects using the same interaction philosophy as Adventure breakables.

Player interaction:

- A player may tap/click a breakable section or barrier to attack/break it when a legal player interaction source is available.
- Breaking a barrier can open new marching edges, new platforming routes or new lines of fire.
- Breaking terrain may also destroy an old route/surface, creating a risk/reward decision rather than always being beneficial.

AI interaction:

- Enemy AI understands barrier state.
- AI can attack a destructible if opening/destroying it materially improves its route, reaches a target, resolves a blockage, or creates a useful tactical option.
- AI should not mindlessly attack every destructible in sight.

Data requirements:

- Destructibles can enable paths on break.
- Destructibles can disable paths on break.
- Destructibles can enable/disable safe surfaces or traversal structures on break.
- Destructibles can act as line-of-sight blockers while intact.
- Some barriers can also act as physical displacement guards while intact.

## Enemy AI

Enemy AI must reason over the same graph and hazards as the player.

At minimum it evaluates:

- reachable safe surfaces;
- path availability and direction;
- path occupancy/bottlenecks;
- current and projected camera death planes;
- transition-time route risk;
- nearby player Dice / contested choke points;
- attack range and line of sight;
- destructibles that block or improve a route;
- available inhabitant spots at the destination;
- whether remaining stationary is tactically better than moving.

Stationary-camera AI should reject obvious death-plane routes. Transition AI may intentionally take a risky route if its estimated arrival margin is acceptable.

## First rooftop map design goals

The first map is a four-tier nighttime rooftop climb/descent testbed, built from game geometry first.

Use:

- large primary rooftops as major safe surfaces;
- smaller neighboring roofs as alternate staging areas;
- fire escapes as vertical connectors;
- construction scaffolding as narrow/contested routes;
- billboard catwalks and sign supports as risky shortcuts/perches;
- awnings as small intermediate safe surfaces or traversal catches;
- street lamps, HVAC units, water tanks, rooftop sheds and large billboards as line-of-sight blockers;
- breakable railings, boarded passages, scaffold braces and weak roof sections as destructibles;
- background skyscrapers and neon signs for parallax;
- foreground fire escapes, cables, pipes, signs and scaffold pieces for depth/occlusion.

At least several route branches should converge on constrained choke surfaces so player Dice and enemies naturally fight at close visual distance.

## Recommended first-playable pass

The first playable pass is intentionally geometry-first and may use procedural/simple art. It should prove the actual rules before final environment assets are introduced.

Required in pass 1:

1. Arcade entry for Moving Screen.
2. King of the Hill placeholder directly under it.
3. Dedicated Moving Screen canvas/screen with no normal dice tray.
4. Four-tier rooftop world and vertical camera.
5. Safe-surface outlines + explicit inhabitant spots.
6. Bidirectional marching paths + branch visualization.
7. Manual player branch/path selection.
8. Random direct summoning into available spots.
9. Basic merging of compatible stationary Dice.
10. Enemy spawning and graph-based AI.
11. Same-surface and ranged cross-surface combat.
12. 15% attack-speed penalty during camera motion.
13. All four screen-edge death planes.
14. Stationary-camera suicide-route rejection.
15. Transition-time risky pathing with no player safety override.
16. At least two meaningful choke points.
17. At least two destructibles: one that opens a route, one that changes/removes a route or protection.
18. Player tap interaction for destructibles.
19. Enemy AI that can choose to break a useful blocking destructible.
20. Debug overlays/toggles for safe surfaces, graph nodes, route validity, death planes and camera state during development.

## Explicitly future, not forgotten

- Full special-ability parity for every Die in Moving Screen.
- Full knockback/launch physics across every existing special.
- Networked PvP player-Dice factions.
- King of the Hill rules and scoring.
- Finished rooftop art/assets and final animation polish.
- Additional Moving Screen maps and descending-stage variants.

Those features must extend the same world-entity, safe-surface, path-graph and death-plane contracts rather than replacing them.