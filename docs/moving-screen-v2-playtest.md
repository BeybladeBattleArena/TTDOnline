# Time To Die — Moving Screen Playtest Rules v2

Captured: 2026-08-29

This is the shipping single-player playtest contract for Moving Screen. It extends the original v1 movement/combat contract without replacing its world-space, safe-surface, path-graph, destructible, displacement, or camera-death-plane rules.

## Loss stock

- The player begins each Moving Screen run with **10 lives**.
- Every player Die destroyed by a destructive event costs exactly **1 life**, regardless of pip count, Class, rarity, or value.
- Destructive events include combat death, falling/void death, and crossing any camera death plane.
- A merge consuming one Die is not a destructive death and does not cost a life.
- Reaching 0 lives immediately triggers the normal FAIL presentation and then the Moving Screen results screen.

## Empty-field emergency loss

- If there are no surviving player Dice on the map, an invisible **3-second grace period** begins.
- If the field is still empty after that grace period, display `Get some Dice on the map!` above a large countdown.
- The warning text gently moves left/right and expands/contracts while visible.
- The countdown is a purple-to-blue gradient and displays one digit at a time: **5, 4, 3, 2, 1**.
- Each digit replaces the previous digit once per second.
- Summoning any player Die immediately cancels and hides the empty-field countdown.
- After the full second displaying `1`, there is no `0`; trigger the normal FAIL presentation and then results.

## Single-player victory objective

Victory requires both conditions at the same time:

1. The player has been credited with at least **60 enemy defeats**.
2. A surviving player Die is physically carrying the objective flag.

Reaching the final rooftop by itself is not a victory. Reaching 60 defeats without possessing the flag is not a victory. Capturing the flag early without reaching 60 defeats is not a victory.

Enemy deaths caused by a player attack or by a player-caused recent displacement count toward the 60-defeat objective. Pure enemy AI suicide into a screen boundary does not grant defeat credit.

## Objective flag

- The flag begins on the final safe surface (`Sign Crown`) at the top of the upward Neon Rooftops stage.
- In a future downward stage, the same objective belongs at the bottom/final area.
- The flag is a physical world object, not a HUD-only state.
- A loose/home flag can be tapped by the player when at least one stationary player Die is close enough in the same safe surface.
- When captured, the flag physically attaches to the carrier Die.
- Enemy AI understands the flag objective, can path toward it, and automatically captures it when close enough in the same safe surface.
- An enemy flag carrier prioritizes holding/defending possession rather than wandering away unnecessarily.
- Enemy AI prioritizes a player flag carrier as a high-value target.

### Flag drop and recovery

- If the carrier is destroyed on a legal safe surface, the flag becomes loose at that location and bounces/bobs slightly.
- A loose flag can be tapped by the player and can be automatically collected by a proximal enemy in the same safe area.
- If a flag carrier is destroyed outside a legal safe area or crosses a camera death plane, the flag begins a short respawn and returns to its final-area home position.
- If a loose flag itself leaves the camera/world, it respawns at its home position.
- Merging a flag-carrying Die into a compatible Die transfers the flag to the surviving merged Die and does not drop it.

## HUD and result flow

The Moving Screen HUD must show:

- remaining lives;
- enemy defeats out of 60;
- flag possession state;
- SP and camera phase where space permits.

Failure and victory must use the game's normal presentation layer (`TTDGamePresentation`) before revealing the Moving Screen result card. The result card reports objective progress, lives remaining, and flag state.

## Existing Moving Screen rules retained

- No normal 15-tile dice tray.
- Direct random summoning into legal world-space safe-surface spots.
- Approximately 25%-opacity white rounded safe-surface outlines and matching marching-path lines.
- Bidirectional marching paths and manual player decisions at crossroads.
- Moving entities cannot attack.
- Stationary-camera route safety rejects obvious screen-boundary suicide.
- During camera movement, player route orders are intentionally not protected by the stationary-camera safety check.
- Enemy transition routing evaluates projected death-plane risk.
- All four camera borders remain lethal death planes for player Dice and enemies.
- Same-safe-area combat continues during camera travel at a 15% attack-speed penalty.
- Cross-safe-area attacks occur only while the camera is stationary and require range plus line of sight.
- Destructibles can open, close, replace, or protect routes and surfaces.
- Knockback/launch can remove entities from safe surfaces and cause falls/screen-outs.
- King of the Hill remains reserved directly under Moving Screen in Arcade Mode for future implementation.
