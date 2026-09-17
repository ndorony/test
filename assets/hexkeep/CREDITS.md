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
