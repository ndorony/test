# Hexkeep: The Living Village — current approved design

User revisions supersede the original answer-per-turn slice and its six support buildings.

## Learning and battle loop

All instructions are Hebrew, with content direction handled per question/answer.
Eight regions are played in order: valley, marsh, ridge, frost, ash, river,
coast, harbour.
The existing English registrations remain: ch51/ch51s and g611/g611h. Legacy
6_0 and Adventure encounters remain compatible; no positional IDs are reordered.

A correct answer awards one spendable point, reports through the shared learning
engine exactly once, and automatically opens the next question after 700ms.
An incorrect answer preserves the question and option order for explicit retry.
Neither answer advances combat. The village is paused throughout the question
screen, including feedback and automatic transitions. Returning resumes the raid
only if it was already running. Launching each new raid is explicit.

Ten raids use an owned 1100ms simulation timer. A requestAnimationFrame renderer interpolates foot positions continuously between
ticks, using a non-reactive clock and a fixed 24-frame, six-heading skeletal walk
atlas baked from the original Walking_A clip. Position, gait and the remaining
tick duration freeze together during questions; resume preserves that duration.
Scaling is applied only to the child sprite, never the world-position transform. Reduced motion retains timing without travel.
Both battle and question timers are invalidated on exit, route reuse or destruction.
Hidden tabs stop simulation. Completed raids stay stopped.

## Economy and defenses

Four original KayKit combat towers replace the former support roster:

| Tower | Build | Level 2 | Level 3 | Hit (L1/L2/L3), every | Role |
|---|---:|---:|---:|---|---|
| Guards | 12 | 16 | 20 | 1/2/3, 2 beats | Garrison the road: block, melee, rally, respawn |
| Archers | 14 | 18 | 20 | 1/2/3, 1 beat | Fast long-range arrows; affected by armor |
| Mages | 18 | 22 | 26 | 3/5/8, 2 beats | Slower magic that ignores armor |
| Catapults | 20 | 24 | 28 | 5/8/13, 3 beats | Area damage against groups |
| Shipyard | 16 | 20 | 24 | 2/3/5, 2 beats | Garrison the water lane with 2/3/4 patrol boats, each with a 1/2/3 cannon |

Guards and the shipyard are garrison towers: they put units on a route instead
of shooting at it, and the tower itself never also fires. A unit may carry a
weapon of its own, and a patrol boat does: every other beat each living boat
fires a cannon from where it floats at whatever is closest to the village within
two lane hexes, so a blockade is a gun line as well as a wall. Soldiers carry no
such weapon. Both hit for their own damage entry,
and a plot is only offered the towers it can hold — a garrison needs a station
its plot declares on its own route (`rally` on the road, `lane` on the water)
plus a tile of that route within range, so an island never takes a barracks and
a dry region never offers a shipyard.

All six plots are buildable; the sixth moved off the road to tile 35. Range tiles
show the selected tower's actual hex-distance footprint. Every upgrade increases
combat power, with three levels per tower. A pricier ranged tower always deals more
damage per beat than a cheaper one at the same level; the build menu shows it as
"power" (damage over six beats: 6/9/10 at level 1). No free points are awarded by combat.

There is no 200-answer target bar or answer-count launch gate. The learning cost
comes from required defenses: the final raid ends with an armored 134-health boss
that cannot be blocked and defeats the village if it reaches the entrance.
A conservative dynamic-programming bound enumerates every six-site configuration
costing less than 200 and grants ideal targeting, all cooldown alignments and
optimistic mobile guards. Even that upper bound deals at most 133 boss damage.
A real ten-raid simulation and browser run win using 240 correct answers, with
all purchases funded exclusively by those answers.

## Persistence and engine contract

Currency, purchased towers, upgrades, enemies and raid progress persist through
storage.js wrappers in a versioned campaign record. Correct-answer rewards are
saved before engine-owned stage completion/new-item navigation. Reloaded active
raids wait for explicit resume. Defeat restores the same raid and retains the
purchased defense and earned balance. Existing v2 support buildings are refunded
at their paid build/upgrade cost; guards and learning state are preserved.
Learning selection, shared weights, scores, stage routing and Adventure remain
owned by BaseGameComponent and its helpers.

## Art and integration

The full tiled 48-hex world and 480 decorative continuation hexes remain. The
four tower models are vendored CC0 KayKit models, rendered with the same camera as
the terrain. Three new models and baked sprites are recorded in provenance.json.
Projectiles and range overlays are lightweight UI effects. No external runtime
asset service, framework or bundler was added. Cache version: v199-hexkeep.


## Squad combat and health

A guard tower deploys three soldiers, then four/five at upgrade levels two/three.
Existing saved towers receive their missing soldiers on restore. Ongoing pairings
are reserved before newcomers: each living soldier blocks exactly one ordinary
enemy, while excess enemies advance. Contact does no immediate damage; the first
exchange lands 440 ms into the following combat tick and later exchanges occur every 2.2 seconds.
An enemy is released when its opponent dies or leaves the rally position. The
previous unstoppable boss rule remains unchanged, preserving the economic bound.

Both sides have individually labeled health bars with current/max accessibility
values and animated fill changes. Soldiers occupy separate formation slots, and
engaged enemies stand opposite their paired soldier. Original skeletal melee
clips are baked into enemy/guard attack atlases and advance on the paused battle
clock. Production has no debug UI or free starting funds; debug mode exists only on a local dev server whose
page URL carries `?debug=1` (see Journey map). Automated tests seed isolated browser fixtures only.

## Contextual construction and impact timing

Empty map locations show a plus, never a number. Selecting one opens four direct purchase options; selecting an existing tower opens its upgrade menu. Successful purchases close the menu. There is no permanent construction panel. On phones, the map pans horizontally and the menu is a bottom sheet.

Damage is resolved once at contact on the shared paused battle clock: melee at 440 ms into its attack tick, arrows at 420 ms, magic at 550 ms, and catapult stones at 850 ms. Catapults visibly launch an arcing stone followed by a splash impact. Pending impacts are saved with normal campaigns, and freeze during questions or backgrounding.

## Battlefield overlays

The game fills the viewport. HUD, raid counter, exit controls and learning/launch actions float over the terrain. Questions and newly unlocked vocabulary use a compact centered dialog, leaving terrain visible around it. The optional BaseGameComponent.presentNewItems hook preserves the shared engine unlock/persistence lifecycle while Hexkeep presents new words without routing away. The new-items list is cleared only after its last word. Other games retain their existing news route. Upgrades replace all four tower types with distinct level-two and level-three models, including reinforced corner towers and level-three banners.

## Journey map

Every move between regions goes through the journey map (phase `levels`): a
Kenney Cartography Pack parchment with one inked village per region, joined by a
dashed road that reads right to left. A new campaign starts inside the first
village; winning a region's final raid opens the map, draws the road to the next
village and picks it in the detail card. Reopening the game mid-region lands
directly in that region; closing on the map reopens on the map. Locked villages
are greyed and cannot be picked. Layout data lives in `HEXKEEP_ATLAS`, on a
2200x1000 parchment that carries all seven villages.

Debug mode (local dev server only — localhost/127.0.0.1 with `?debug=1`; off in production): a separate save slot (`_HexkeepDebug_v5`), every
region loads with 9999 points, every village is open, header buttons open the
map or win the current region at once, and a numbered village list jumps
straight into any region, the two water ones included. Turning it off restores
the real campaign.

## Water regions

Regions six, seven and eight are fought over water. A region with boats carries a
second route: `routes.land` is the road every walker follows and `routes.water`
is the lane every boat follows. Nothing changes route mid-raid, so a walker
never enters the water and a boat never lands. Both routes end beside the same
village, and a boat that reaches its landing costs a heart exactly as a walker
does. Towers are land structures: a plot on a water hex cannot be bought at any
price, and a plot qualifies by seeing either route, so a shore battery may
defend only the lane. Soldiers hold the road, so a boat is never blocked, never
duels and ships no melee atlas. Catapult splash stays on its target's own route, and every tower shoots
whichever attacker has the fewest steps left to the village, so two routes of
different lengths are compared fairly.

| Attacker | Behaviour | Counter |
|---|---|---|
| Raider boat (`skiff`) | Gathers a hex of speed every beat nothing touches it, up to its own limit — two hexes on the river, three in the bay; any wound that lands drops it back to a crawl | Arrows, which land on every beat and pin it; slow artillery lets it run between stones |
| Ironclad (`warship`) | Heavy armour, and it plates every boat within one lane hex — itself excluded, so sinking it strips the whole escort at once | Magic, which ignores armour and plate alike |

| Ship of the line (`manowar`) | Every other beat it fires a volley that wrecks every patrol boat within one lane hex, and like every commander it cannot be blocked | Guns behind the blockade: the boats buy the time and wound it, the towers do the sinking |

The three are mixed with attackers the player already knows, so neither a
magic-only nor an arrow-only line clears any of the regions. `river` closes with
a raiding captain, `coast` with the ironclad flagship, `harbour` with the black
ship.

`harbour` is the region built around the shipyard: almost the whole board is
open sea, the causeway along the northern shore is short, and the only dry
ground out in the bay is three rock islands. A blockade berthed on the middle
island holds the bay for 360 answers; the same six plots with towers alone need
560; a blockade with no towers behind it never clears the region at all, because
the black ship's volley wrecks the boats faster than the shipyards replace them
and it sails on regardless. Boat sprites come from the
CC0 Kenney Pirate Kit, baked with the same rig, camera and lighting as the
walkers but in 256px cells, since a long hull ran off a walker's 192px one. Each
hull sinks to the ledge where its lower body meets the upper hull — the kit's
painted waterline — and everything under the water is clipped away, so a boat
floats in the board's sea instead of standing on it. The Pirate Kit has no
animation clips, so the sailing atlas is one heave-and-roll swell per two battle
beats. The harbour's own patrol boat is the same rig with the shared colormap
repainted blue, so a blockade never reads as a raid. A hull is nearly a hex
long, so a shipyard's boats are drawn strung out along the lane, one to a lane
hex, the free one nearest the station, and set a little off their island.
Berths are handed out slot by slot across every shipyard, so each yard's first
boat holds its own station. The blockade itself still holds at the station
step, and a ship it stops is drawn beside that station, never beside a berth
further down the lane.

## Journey progress and replay

Journey progress (`cleared`) and battle state (`levels`) are separate records.
Winning a region's final raid marks the village on the journey map at once and
drops that region's battle state, so entering a completed village starts a fresh
run from wave 1 with its own starting board. A region still in progress resumes
exactly where it was left, and offers a start-over control beside the launch
button. The victory card offers both "play again" and "continue to the next
village". A replay never re-locks a village or changes any other region's
progress, however it ends. Saves are version 5; a version 4 record parked on a
finished final raid migrates to a completed village with no battle state, while
a region still mid-run keeps its saved raid.
