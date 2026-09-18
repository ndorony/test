# Hexkeep art provenance

All battlefield geometry and characters are by **Kay Lousberg**, CC0.
No generated illustrations, CSS terrain, SVG roads, or old defense tower art.

## Environment and structures

Source: https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0

Pinned commit: `84fa4e91af6a88989be7c99e0891cede11f2ca38`.
`provenance.json` maps every source alias to its exact upstream path.
`source/` contains the glTF models, binary buffers and original shared texture.
`LICENSE.txt` is the unmodified upstream CC0 notice.

- Guard Post: `building_barracks_blue`
- Windmill: `building_windmill_blue`
- Blacksmith: `building_blacksmith_blue`
- Healer's Well: `building_well_blue`
- Lumber Mill: `building_lumbermill_blue`
- Stone Barricade: `fence_stone_straight`
- Build plots: `building_dirt`
- Road: actual `hex_road_A/B/C` meshes, rotated by their connection directions
- River: `hex_river_A`, `hex_river_crossing_A`, `hex_water`
- Bridge: `building_bridge_B`
- Ground/height: `hex_grass`, `hex_grass_sloped_low`
- Village and scenery: home A, trees A/B, rock A, wood fence, crates, blue flag

The final scene contains 48 playable tiles and a 480-tile decorative continuation
that reaches beyond every side of the camera. Every continuation tile has an
explicit grass, forest, road or river role. Forest props and the river continue
through the cropped frame: there are no exposed outer island edges.

## Characters

`knight.png` and `enemy.png` are fresh orthographic renders of the existing local
`assets/models/duel/Knight.glb` and `Skeleton_Minion.glb`. Sources, local SHA-256
hashes and upstream references are in `unit-provenance.json`; the original notices
are `LICENSE-Knight.txt` and `LICENSE-Skeleton_Minion.txt`.

Knight is from KayKit Character Pack Adventures; Skeleton Minion is from KayKit
Character Pack Skeletons. Their bundled idle animations are posed at bake time.
No `kaykit-defense` PNG, tower model, or combat implementation is an input.

## Reproduction

Run `tools/vendor-hexkeep.py` to retrieve the pinned environment sources. Run a
local server on port 8767, then `node tools/render-hexkeep.cjs` with Playwright on
NODE_PATH. Three.js r128 is used only by the development renderer, matching the
version already used by the app. The game itself loads only local PNGs and the
generated `projection.js` anchors; it does not need Three.js to render its world.

The board and all sprites use the same orthographic camera/light rig. Terrain has
a green material tint; tile thickness is compressed to 48%. No texture is painted
over the road. `games/hexkeep-map.js` is the shared logical/rendering map source.

Combat tower revision: archer uses building_tower_A_blue, mage uses building_tower_B_red, and artillery uses building_tower_catapult_blue from the same pinned CC0 KayKit Medieval Hexagon Pack. Exact sources and commit are in provenance.json.

Walking atlas: Skeleton_Minion.glb (existing vendored CC0 KayKit character) Walking_A skeletal animation, sampled at 24 frames in six headings using tools/render-hexkeep-walk.cjs. Uniform frame bounds preserve the foot anchor.

Melee atlases: original Knight and Skeleton_Minion 1H_Melee_Attack_Slice_Horizontal skeletal clips, rendered in 24 frames and six directions with tools/render-hexkeep-combat.cjs. Source models remain the existing vendored CC0 characters.

Upgrade variants: tools/render-hexkeep-upgrades.cjs renders the original tower meshes with taller silhouettes, original geometric buttresses, gold caps and level-three banners. Eight local PNGs and projection bounds are generated; the runtime remains dependency-free.

## Regions

Hexkeep is played across five regions. All five are baked from the same pinned
CC0 KayKit hexagon pack with the same camera and light rig, so one anchor table
(`projection.js`) places every sprite on all of them:

- `village.png` — Arava Valley, the original board (unchanged).
- `marsh.png` — Fog Marsh: a serpentine road between still `hex_water` pools, no
  crossing, deeper green ground tint.
- `ridge.png` — Stone Ridge: a climbing zigzag over `hex_grass_sloped_low` hills
  with `rock_single_A` outcrops, one `hex_river_crossing_A` gorge crossing, dry
  ochre ground tint.
- `frost.png` — Frost Pass: snow ground, a frozen stream crossed at the gate and
  an iced-over lake.
- `ash.png` — Ash Wastes: ash-grey ground around a glowing lava lake.

Snow and lava cannot be reached by tinting, because a material colour only
darkens the shared palette atlas (`source/hexagons_medieval.png`, 8x4 gradient
swatches). Those two regions repaint their own in-memory copy of the atlas: the
grass swatch (column 0, row 2) and the water swatch (column 1, row 1), measured
from the tile UVs. The road swatch is untouched, and lava adds an emissive glow.

A straight `hex_river_A` piece only tiles along one heading, so each region's
water chain keeps a single direction; `riverRot` in `games/hexkeep-map.js` records
which one.

## Region attackers

Fresh orthographic renders of models already vendored under `assets/models/duel/`,
all CC0 by Kay Lousberg. Hashes and upstream links are in `unit-provenance.json`.

- `enemy-brute-*.png` — `Skeleton_Warrior.glb`, `Walking_C` and `2H_Melee_Attack_Chop`.
- `enemy-runner-*.png` — `Rogue.glb`, `Running_A` and `1H_Melee_Attack_Stab`.
- `enemy-shaman-*.png` — `Skeleton_Mage.glb`, `Walking_B` and `Spellcast_Shoot`.
- `enemy-knight-*.png` — `Knight.glb`, `Walking_A` and `1H_Melee_Attack_Chop`,
  re-inked to dark iron because the defenders are Knights too.
- `enemy-warlock-*.png` — `Mage.glb`, `Walking_B` and `Spellcast_Shoot`.

Each sheet is 24 frames across and six headings down at 192px, cropped through the
same window as the original skeleton atlas, so it drops straight into `.hk-walker`.
Clip lengths differ per model and are recorded under `variants` in `walk.js`.

## Reproducing the regions and attackers

Put the r128 `three.min.js` and `GLTFLoader.js` (examples/js build) in
`tools/vendor/` — they are development-only and untracked — then:

    node tools/hexkeep-bake.cjs boards
    node tools/hexkeep-bake.cjs units
    node tools/hexkeep-bake.cjs 'boards?only=frost,ash'           # a subset
    node tools/hexkeep-bake.cjs 'units?only=knight,warlock'

The driver serves the repository, opens the bake page in headless Chrome and waits
for the finished PNGs to be posted back. It replaces the Playwright scripts for
these two bakes; a GLB load never settles inside a `--virtual-time-budget`, so the
driver polls for the artefacts instead. The board page also re-measures the anchor
table and posts it as `anchors-check.json` so a camera drift is visible rather than
silent. The game itself still ships only PNGs and `projection.js`.

## Journey map

The map between regions (`atlas/`) uses **Kenney's Cartography Pack** (CC0),
https://kenney.nl/assets/cartography-pack, 2020-06-16 release.
`atlas/*.png` are the pack's unmodified `PNG/Retina` icons; `atlas/parchment.jpg`
is `Textures/parchmentFolded.png` re-encoded as JPEG (quality 82).
`atlas/LICENSE-KENNEY-CARTOGRAPHY.txt` is the unmodified upstream notice.
Node positions, roads and scenery placement live in `HEXKEEP_ATLAS` in
`games/hexkeep-map.js`.
