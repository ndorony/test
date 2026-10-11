# Scribble Bridge

The 3D layer that carries a run between the top-down dungeon and the side-view
platformer. One room, built once, seen from two angles — not two flat pictures
cross-faded in the same place.

Preview and calibration page: `tools/scribble-bridge-preview.html`, served over
HTTP (the page reads canvas pixels, which `file://` forbids). Authored
transitions use the reusable preview shell in `tools/scribble-transition-preview.js`.

Repeatable transition and model screenshot commands are documented in
[`SCRIBBLE_CAPTURE.md`](SCRIBBLE_CAPTURE.md).

## The three readings

### From above — a dungeon room

![The transition room seen from directly above](screenshots/scribble-bridge-0.png)

A closed wall ring, a floor plan, crates. This is what `scribble-dungeon.js`
draws, and at this angle every piece of side-view art in the room is edge-on and
therefore invisible.

### Exactly mid-flip — a room

![The transition room halfway through the arc](screenshots/scribble-bridge-50.png)

The one frame that shows what the room actually is. The floor plan foreshortens,
the walls are revealed to have been standing all along, and each crate shows its
top face and its sides at once. Nothing appears or disappears across the arc:
the geometry is constant and only the camera moves.

### From the side — a platformer wall

![The transition room seen from the front](screenshots/scribble-bridge-100.png)

Battlements along the top, brick courses below, the ground course at the base,
and the crates standing inside as platforms. The floor plan is now edge-on and
invisible, which is the mirror of the first reading.

## Axes

Everything rests on these three lines:

```
X = the axis both games share (horizontal travel)
Y = height          (only the side view reads it)
Z = depth           (only the top view reads it)

dungeon    (wx, wy) -> (wx/PITCH, 0, wy/PITCH)
platformer (wx, wy) -> (wx/PITCH, (floor - wy)/PITCH, 0)
```

X survives the rotation, so the pawn does not jump: it keeps the axis the two
games agree on and is handed the one it was missing.

## The camera contract

Both games project with `screen = (world - cam) * cam.z + view / 2` and both
measure `PITCH = 64` pixels to a tile — see `worldToScreen` in
`games/scribble-dungeon.js` and `games/scribble-platformer.js`. That is an
orthographic camera written out by hand, so a real one can reproduce either
framing exactly:

```
unit  = cam.z * PITCH        screen pixels per 3D unit
half  = view / (2 * unit)    the frustum, in units
```

The arc is a single rotation about X, from looking straight down to looking
straight ahead, written as an elevation angle so `up` stays exactly
perpendicular. Interpolating two up-vectors instead makes the horizon roll.

Verified against Three.js's own projection matrices at 0.0000px deviation,
including points outside the room; `tests/scribble_bridge_test.js` asserts the
same thing analytically.

## How the room is built

| part | geometry | reads from above as | reads from the side as |
| --- | --- | --- | --- |
| floor | flat plate per tile | the dungeon's floor | the ground line |
| wall ring | courses of an authored brick | the brick's own top | the brick's own faces |
| crates | open-bottom cube | cap wearing `crate.png` | sides wearing `tile_crate.png` |
| ground course | upright strip below the floor plane | edge-on, invisible | the ground under the level |

The floor doing double duty is what makes this a hybrid rather than two pictures
in one place: the dungeon's floor plane, seen edge-on, *is* the platformer's
ground line. One surface, which is why the pawn can stand on it throughout.

The front run is deliberately left flat — the missing fourth wall, so the side
camera can see in. Its cap is still laid with the rest of the ring, so from
above the room is closed on all four sides.

## Walls come from the studio

A wall is not modelled here. It is courses of a recipe authored in the Hybrid
Asset Studio, and the recipe decides how the wall reads from either angle. The
room above uses `Connected + arrow sides virtual 1` for its walls and
`Draft - Castle battlement` for the crown.

`bridgeRecipePlanes(recipe, refs)` converts a recipe to bridge units — 2.5
studio units to a tile. Two details it has to get right:

- **`rect` crops.** Materials are keyed by source *and* rect, because a recipe
  cuts many strips from one PNG: the battlement takes every roof piece from
  `arrow.png` at `[20, 0, 24, 64]`. Keying on the source alone collapses them
  all into whichever crop was built first.
- **Seating.** An asset is not necessarily centred on its own origin — the
  arrow-sides brick puts its front face at `z = 1.25` and its arrows at `0.85`,
  so its body leans forward of the point it is placed at. `bridgeRecipeCentre`
  measures the lean and `bridgeStage` subtracts it, rotated by the course's own
  yaw. Without this the wall walks off the floor plan and exposes the ring's
  floor plates. Pass `wallBrick.anchor` to override the measurement.

A panel's *reading* is its orientation, not its pack: the battlement's roof is
cut from the top-down pack but lies flat, so it reads from above.

## Files

- `games/scribble-bridge.js` — camera contract, arc, room builder, recipe
  adapter, WebGL layer and its disposal.
- `tools/scribble-bridge-preview.html` — calibration page. `#b=0..100` opens at
  a point on the arc; `#bare` strips the page furniture for captures.
- `tests/scribble_bridge_test.js` — the camera maths, the room's structure, and
  the recipe adapter against recipes pasted verbatim from the studio.

## Magic-door cinematic

`tools/scribble-magic-door-preview.html` implements the first authored
top-down-to-side transition. A faceted magic bolt leaves a wand and the original
top-down camera follows it at the game's unchanged scale before any zoom begins.
The outgoing room keeps its complete flat floor grid, painted wall ring, two
unchosen doors, and wand for the whole transition; only its standing walls and
instances are removed from the stage. The selected door uses the closed-door
sprite until the bolt reaches it, then breaks into animated fragments while the
bolt continues without changing speed. The wall tile beneath it is replaced at
that moment by `floor_door_open.png`, leaving a readable passage rather than a
blank tile or a remaining wall.
Every corridor wall has a
horizontal `arrow.png` cap, so its perimeter also reads as a 2D wall row from
overhead without closing the open top. Each cap uses the studio's authored
`Top arrow` rotation and its exact 0.16-unit offset behind the inward-facing wall
plane, placing it on the wall's exterior side. The first three destination-floor
rows remain flat and wall-free, so the walls begin beyond the outgoing room. Its
vertical faces use `tile_brick.png`. The tunnel boundary
opens completely into the flat door row instead of adding a separating wall.
Before any zoom, the projection changes to a
narrow-FOV perspective camera that is exactly overhead and matched to the same
scale, so it still reads as the original 2D floor grid. The destination room,
corridor floor, and all perimeter walls exist from the first frame of the spell;
only the separating wall is absent. The entire flight is parametrized by route
distance, so the door burst cannot add an ease, pause, or speed change. Once the
bolt is inside the destination space, the camera zooms while remaining
exactly overhead. Only after the previous room's walls are outside the frame do
the vertical corridor walls appear and the 90-degree turn begins. The camera
follows the bolt through twelve corridor sections and ten corners before the
spell ends at the impact wall. The first four corridor sections remain seven
tiles wide for the overhead-to-side camera move; beyond that bend the route is a
two-tile corridor with short zigzags, three visible forks, and a 2.4x flight-speed
step so walls pass rapidly beside the chase camera. Its bend radius is capped at
0.42 tiles, preventing the smoothed bolt path from cutting across an inside wall.
The chase camera closes to 1.05 tiles behind the bolt in this section and looks
almost directly at it.

The narrow route has one two-tile opening into a fifteen-by-fourteen destination
room. Its floor and perimeter continue the corridor's `tile_brick.png` wall
language, and four `tile_ladder.png` ladders stand against the far wall. As the
bolt crosses the longer room, the camera rises and pulls backward on a diagonal;
its forward direction locks during a short stationary lead-in before that move,
instead of rotating toward the bolt while moving. The bolt climbs gradually
through the room and reaches the far wall at
the locked frame centre, 3.4 tiles above the floor. It then
shatters against the far brick wall and the camera remains still for the 2D
side-view handoff. The final camera rises to 3.4 tiles and derives its distance
from that height and a 46-degree FOV. This keeps the wall-floor line exactly on
the bottom viewport edge while showing roughly seven wall courses instead of
three. Only then does the red platformer character enter from the left. The
opening flight starts earlier and runs at 1.35x speed; the full move lasts 20
seconds.

The final impact has its own wall burst in addition to the bolt shatter. Twenty
outlined brick chunks fly radially and toward the camera, two counter-rotating
cyan shock rings expand across the wall, a gold flare and short screen flash mark
the contact frame, and all debris fades before the character enters.

The transition never renders a player during the 3D chase. After the camera has
locked to the final side framing and the bolt has shattered, the platformer pawn
enters from beyond the left screen edge. During the chase the camera remains
inside the corridor's floor and perimeter walls, with the chamber hidden once
the camera completes its turn. `scribbleMagicDoorTransitionState` contains the
testable timeline and `scribbleMagicDoorTransitionStage` builds the open-top
geometry; the preview only supplies textures, timing controls, and the animation
loop.

The preview also has an inspection layer. `Part labels` projects stable IDs onto
the model (`R` room, `D` door, `C` corridor, `T` turn, and dedicated wall/effect
IDs), and selecting one repeats its full name below the stage. `Manual 3D`
pauses playback, reveals the 3D walls, and lets pointer dragging orbit the active
area while the wheel changes camera distance. Labels are ray-tested against the
visible room geometry, so walls hide labels behind them. Bare captures hide
annotations by default; append `&labels` to include them.

## Falling-object cinematic

`tools/scribble-fall-transition-preview.html` is a side-view-to-top-down
geometry and camera calibration: a six-faced crate falls through an open-top,
four-walled shaft. The destination floor is present from the start. The camera
first zooms into the side opening while looking down at the shaft above the
crate; after it crosses the rim, the fourth wall closes behind it and the view
turns down to follow the crate. The brick shaft ends six units above the dungeon
floor, leaving a visible final drop. The crate hits that floor, breaks into
scattered planks, and the camera then locks to the exact orthographic top-down
framing of the complete destination stage. The platformer character is absent
throughout the 3D chase and only walks in from the left after the final 2D frame
has locked. At that lock the shaft walls disappear, leaving a normal dungeon
floor, wall ring, doors and floor props rather than an overlaid slice of the
shaft. The side brick banks and shaft walls keep every intermediate camera pose
contained; no notebook or exterior world is visible.

The fall page and the magic-door page share controls, `#p=…`, `#bare`, capture
readiness, stable occlusion-tested labels, manual 3D orbit, resize behavior and
resource disposal. Only `tools/scribble-fall-transition-adapter.js` owns the
shaft stage, its object path, camera state, labels and capture payload.

## The gateway room is played in 3D (top-down → side)

A visual mode lasts at least ten completed stages; from then on each completed
stage ends it with probability 1/20 (`SCRIBBLE_MODE_CYCLE` in
`games/scribble-transition-cycle.js`). The dungeon's segment ends in a gateway
room. It looks like any other dungeon
room, but it is the magic-door stage:

1. While the pawn picks up the wand, the dungeon builds the stage from
   `transitionLiveFrame()` — the room's size, its three answer doors
   (`doorOffsets`, two tiles apart on the ring) and its entry (`entryOffset`) —
   inked with the theme's own `ink`/`floor`.
2. Once the camera rests on the gateway heading, the 3D room fades in over the
   2D one and the canvas stops drawing that room. The layers are: page canvas
   (paper, grid, other rooms) → 3D room → `.sd-overlay` canvas (pawn, shots,
   effects, sealed-door crosses, signs). The 3D frame is redrawn with
   `run.refresh()` whenever the 2D camera moves, and it hands back to the canvas
   in the whole-map view.
3. The round is an ordinary dungeon round. A correct answer starts the held
   frame: wand sweeps, bolt, door burst, route, side-view handoff. The route
   beyond the doors (`staged3d: false`) appears only as the bolt reaches them.

4. **The route ends in the platformer's landing room.** The platformer has a
   special stage, `handoff` ("חדר הנחיתה"), described once in tiles as
   `SCRIBBLE_HANDOFF_ROOM` (`games/scribble-platformer.js`): a full-width brick
   back wall with a crown, three ladders in the tower's answer columns, and the
   stage's ground. The 3D destination is built from that description — the
   room is the stage's width, the far wall its wall, the ladders stand against
   it, and the floor's cut face under the ground line is the stage's ground and
   soil — so it is a believable room in 3D *and* that stage seen from the side.
   After the burst the camera backs away while its lens narrows, keeping the
   far wall the same size (`flattenPose` in the adapter): the side walls, floor
   and wall tops fold edge-on, the ground cut appears, and at the end the pose
   switches to an orthographic camera equal to the platformer's own framing
   (`scribblePlatformerHandoffFrame`). Geometry nearer than the room is clipped
   by the pose's `near` plane while the camera is outside it. Behind the room
   hangs the platformer's notebook page (`paintScribblePlatformerHandoffPaper`,
   three views each way), so the last 3D frame is the landing stage on its
   paper; the arrival dissolve adds only the pawn and the answer signs. The
   landing stage is then played like the tower: a wrong ladder snaps, the right
   one is climbed to the next ordinary stage above. The landing route runs a
   little past its authored end (`adapter.tail`, `LANDING_TAIL`) so the
   flattening takes about two seconds. The platformer's pawn then walks in from
   beyond the left edge (`enterFromLeft`) past ladders already standing, and the
   round is dealt once it reaches the entrance.
5. **Only the spark leaves the gateway.** When the answer releases the spell,
   the dungeon copies its pawn layer and pins it to the 3D floor where the pawn
   stands (`run.pin` → `setDecal('pinned-layer')`), hiding the flat layer. The
   pawn therefore stays in the room as the camera follows the bolt, and fades
   with the room as the bolt reaches the door.

The dungeon's idle watchdog skips the `transitioning` state, so no new round is
dealt (and no question shown) during the 3D route.

The retired detour through `scribble_question_bridge` is no longer entered.
Without WebGL the gateway stays a 2D room and the page turn still hands over.
Checks: `tests/scribble_gateway_room3d_test.js`.

## The fall stays in the notebook (side → top-down)

The fall never leaves the notebook. When the answer drops the crate, the
platformer paints its own page — paper, ruling and margin exactly as the
current frame shows them, extended a view on every side — and the run stands
it just behind the shaft (`departurePage` → decal `departure-paper`), enlarged
by its extra depth so the first 3D frame is the 2D page exactly. The dungeon
paints the page its fall-arrival room opens on (`paintScribbleDungeonFallPaper`),
which lies just under the destination floor at its final scale (decal
`landing-paper`), so the room is on the page whenever the shaft shows it. The
fall's textures are inked in the theme's own palette.

The fall begins on the platformer's own fall room. That room is described once
in tiles as `SCRIBBLE_FALL_ROOM` (`games/scribble-platformer.js`): the grass
course and soil either side of a three-tile gap, the deeper soil at the cliff
edges, the shaft's back wall seen through the gap (its `shaft` backdrop), and
the answer crates. The 3D ledge is built from the same description — only the
room's own columns, real crate cubes a full tile across — so the first 3D frame
is the 2D room. Once the pawn stands in the fall room, the rest of the map fades
from the page around it (`isolatedRoom`), as the shaft runs down through the
page. The pawn's picture is stood on the ledge where it was (`pinned`), so it
stays behind while the camera dives after the crate. The 3D frame, carrying its
own page, fades in over the canvas rather than crossfading with it.

All three answer crates stand over the pit (layout `pit`: one per gap column),
their signs spread across the page with leader arrows down to them. Any crate
may hold the answer; the 3D fall drops the chosen one down its own column
(`objectX`) and keeps the crates still standing (`standingX`); a wrong crate
drops into the pit in 2D. The fall room is always entered from the side: it
only follows a stage the pawn leaves by walking or hopping right at its own
level (`SIDE_EXIT_KINDS`: jump, bridge, crate). When the transition falls due
on any other stage, one such stage is dealt first and the shaft room after it.

## Not done yet

- The dungeon gateway keeps its correct answer on the middle door, which the
  authored bolt route flies through.
