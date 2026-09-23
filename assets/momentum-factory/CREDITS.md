# Momentum Factory — licensed art

All runtime art is locally baked from original licensed geometry, using one
orthographic camera, one light rig and shared foot anchors. No emoji, hand-drawn
replacement machines or externally hosted runtime assets are used.

## Kenney Factory Kit 3.0 — CC0
- Creator: Kenney, https://kenney.nl
- Source: https://kenney.nl/assets/factory-kit
- License: LICENSE-Kenney.txt (original archive notice)
- Used: machines, conveyors, hoppers, cranes, robot arms, pistons, boxes, gears,
  factory floor, screens, windows, structures and safety props.
- Original piston `toggle` animation is sampled into machine working atlases.
  Original articulated robot-arm joints are posed and animated for handling tasks.

## KayKit Platformer Pack 1.0 FREE — CC0
- Creator: Kay Lousberg
- Source: https://kaylousberg.itch.io/kaykit-platformer
- License: LICENSE-KayKit-Platformer.txt (original archive notice)
- Used: platforms, rails, bracing, pipes, directional sign and safety cones.
- No paid-tier assets are included. Kenney's conveyors supply the conveyor geometry.

## KayKit Adventurers Knight — CC0 (restored original crew)
- Creator: Kay Lousberg. Original record: ../hexkeep/unit-provenance.json.
- Existing vendored model: ../models/duel/Knight.glb.
- License: LICENSE-Knight.txt.
- Original Walking_A and Interact clips drive the worker atlases.
- Original sword and shield meshes are hidden, retaining the protective helmet
  and original textured character. Cheer supplies three companion portraits.
- Team portraits preserve the texture and use light mint/purple material tints.
- The finished product again uses the original Kenney articulated robot arm.

`provenance.json` records archive hashes, exact source member paths, original model
hashes, local files and any dependency-URI changes. The source model subset and
texture dependencies are vendored in source/. Runtime needs only PNGs/projection.js.

Reproduce: serve this repository on 127.0.0.1:8873 and run
`node tools/render-momentum-factory.cjs` with Playwright on NODE_PATH. Three.js r128
is a development bake dependency only, matching the existing renderer workflow.
Upgrades assemble more original meshes; animation samples preserve fixed bounds.

Factory floor: KayKit Platformer platform_2x2x1_yellow bevel geometry, flattened and recolored into continuous industrial tiles over the Kenney floor mesh; original projection and lighting retained. Customer aisle uses a warmer material tint.

Supply origin: original KayKit Medieval Hexagon tree and lumbermill models reused from assets/hexkeep/source (see assets/hexkeep/provenance.json and CREDITS.md), rendered with the factory camera. The shop counter is an assembly of the existing Kenney machine-bed and screen geometry. Stockpiles reuse the local licensed cargo sprites.

ROBO WORKSHOP art direction: station-specific teal, yellow, coral, violet and blue materials; planted factory perimeter; matching overscan scenery and ground; correctly linearized material colors. All remain original licensed meshes, baked by the same reproducible tool.
