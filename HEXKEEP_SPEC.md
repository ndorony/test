# Hexkeep: The Living Village — current approved design

User revisions supersede the original answer-per-turn slice and its six support buildings.

## Learning and battle loop

All instructions are Hebrew, with content direction handled per question/answer.
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

| Tower | Build | Level 2 | Level 3 | Role |
|---|---:|---:|---:|---|
| Guards | 12 | 16 | 20 | Block normal enemies, melee, rally, respawn |
| Archers | 14 | 18 | 20 | Fast long-range arrows; affected by armor |
| Mages | 18 | 22 | 26 | Slower magic that ignores armor |
| Catapults | 20 | 24 | 28 | Area damage against groups |

All six plots are buildable; the sixth moved off the road to tile 35. Range tiles
show the selected tower's actual hex-distance footprint. Every upgrade increases
combat power, with three levels per tower. No free points are awarded by combat.

There is no 200-answer target bar or answer-count launch gate. The learning cost
comes from required defenses: the final raid ends with an armored 107-health boss
that cannot be blocked and defeats the village if it reaches the entrance.
A conservative dynamic-programming bound enumerates every six-site configuration
costing less than 200 and grants ideal targeting, all cooldown alignments and
optimistic mobile guards. Even that upper bound deals at most 106 boss damage.
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
asset service, framework or bundler was added. Cache version: v197-hexkeep.


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
clock. Debug mode starts an unsaved tactical session with 100 spendable points;
returning to normal mode restores the regular village.

## Contextual construction and impact timing

Empty map locations show a plus, never a number. Selecting one opens four direct purchase options; selecting an existing tower opens its upgrade menu. Successful purchases close the menu. There is no permanent construction panel. On phones, the map pans horizontally and the menu is a bottom sheet.

Damage is resolved once at contact on the shared paused battle clock: melee at 440 ms into its attack tick, arrows at 420 ms, magic at 550 ms, and catapult stones at 850 ms. Catapults visibly launch an arcing stone followed by a splash impact. Pending impacts are saved with normal campaigns, and freeze during questions or backgrounding.

## Battlefield overlays

The game fills the viewport. HUD, raid counter, exit/debug controls and learning/launch actions float over the terrain. Questions and newly unlocked vocabulary use a compact centered dialog, leaving terrain visible around it. The optional BaseGameComponent.presentNewItems hook preserves the shared engine unlock/persistence lifecycle while Hexkeep presents new words without routing away. The new-items list is cleared only after its last word. Other games retain their existing news route. Upgrades replace all four tower types with distinct level-two and level-three models, including reinforced corner towers and level-three banners.
