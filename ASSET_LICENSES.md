# Asset Licenses

## Knowledge Defense (games/knowledge-defense.js, games/knowledge-defense.css)

- **Files:** `assets/knowledge-defense/*.png` (battlefield board, towers, enemies,
  build pads, projectiles, scenery).
- **Source:** Rendered from **Kenney** GLB asset kits (https://kenney.nl) — Hexagon,
  Castle, Mini Forest, Survival, Platformer, Mini Arena, Mini Dungeon, Graveyard,
  Nature, and Tower Defense (top-down). The kits are **not** committed; they are
  offline generation inputs (see `.gitignore`) rendered to PNGs by
  `tools/kenney-hexmap-render.html` and `tools/kenney-iso-render.html`.
- **License:** Creative Commons Zero (CC0) — free for commercial use, no attribution
  required. Per-asset provenance is recorded in
  `assets/knowledge-defense/LICENSE-KENNEY.txt` (bundled beside the art).
- **Runtime:** The app loads only the flattened PNGs; three.js/GLTFLoader are used at
  build time by the render tools, never at runtime.

## Factory Tycoon (games/factory-tycoon.js, games/factory-tycoon.css)

- **Files:** `assets/factory/*.svg` (44 illustrations: machines, moving machine parts,
  conveyor belt/rail/roller/leg pieces, chute, delivery truck and wheels, worker body
  parts for skeletal animation in three color variants, products, pallets, crates,
  barrels, cones, storage rack, windows, lamps, wall fan, pipes, marquee sign, dock
  door, coin, smoke puff, spark glint, hazard-stripe tile).
- **Source URL:** Not applicable; every asset was created directly for this repository.
- **Author:** Original layered SVG artwork drawn for this project (Claude, for the
  factory-game redesign).
- **License:** Same license as this repository. No third-party art was imported.
- **Notes:** All artwork is hand-authored vector art in a single coherent style
  (consistent `#2b3145` outlines, shared palette, top-left key light). No external
  raster or vector game-art assets were downloaded or hotlinked; no emoji, icon fonts,
  or copyrighted game art are used in the scene. External asset marketplaces (Kenney,
  OpenGameArt, itch.io) were unreachable from the build environment, so the equivalent
  quality was produced as custom SVG, which also keeps the download small.
- **Runtime:** The scene renders these SVGs as textures in Phaser (already vendored via
  CDN in `index.html` for other games). UI icons in the HUD are inline SVG strokes.

## Scribble Dungeon (games/scribble-dungeon.js, games/scribble-dungeon.css)

- **Files:** `assets/scribble-dungeons/*.png` — the full 136-sprite 64px set (walls,
  corners, doors, floors, props, weapons and the four character tokens), plus
  `LICENSE-KENNEY.txt` bundled beside the art.
- **Source:** **Kenney "Scribble Dungeons"** — https://kenney.nl/assets/scribble-dungeons
  (v1.0, 16-02-2022). The `Default (64px)` PNG set is committed as-is, flattened into
  one folder; the pack's tilesheet, Tiled files and SVGs are not used.
- **License:** Creative Commons Zero (CC0 1.0 Universal) — free for personal,
  educational and commercial use. Attribution to Kenney is explicitly **not** required.
- **Notes:** The art is black line work on transparency over an opaque white fill. The
  game never ships recoloured copies: `inked()` re-maps each sprite to the active
  theme's pencil/paper colours at runtime by luminance, which is why one greyscale
  pack works on both the paper themes and the dark ones.
- **Runtime:** Plain `<img>` loads drawn to a 2D canvas. No loader, atlas or 3D
  library is involved.

## Scribble Platformer (games/scribble-platformer.js, games/scribble-platformer.css)

- **Files:** `assets/scribble-platformer/*.png` — the 104-sprite 64px `Default` set
  (side-view terrain and blocks, ladders/grab holds, doors, crates, bridge, flag,
  coin, gem, key, heart, spikes, shield/bow/sword/spear items, the four character
  tokens with matching hands, clouds, trees and bushes), plus `LICENSE-KENNEY.txt`
  bundled beside the art.
- **Source:** **Kenney "Scribble Platformer"** — https://kenney.nl/assets/scribble-platformer
  (v1.0, 2020). The `Default (64px)` PNG set is committed as-is, flattened into one
  folder; the pack's Retina set, tilesheet, vector and Construct files are not used.
- **License:** Creative Commons Zero (CC0 1.0 Universal) — free for personal,
  educational and commercial use. Attribution to Kenney is explicitly **not** required.
- **Notes:** Same hand-drawn black-line-on-transparency style as Scribble Dungeons, so
  the same `inked()` runtime re-inking maps every tile to the active theme's
  pencil/paper colours; the coloured character tokens are drawn as-is (`raw()`), like
  the dungeon pawns. The two scribble packs are intentionally cross-used — identical
  style — so side-view rooms reuse dungeon sprites (doors, shield, bridge, bow/arrow,
  crate, rails) where the platformer pack has no equivalent. Concretely, `cart.png`
  is copied verbatim from the Scribble Dungeons pack (also Kenney CC0) into this folder
  for the rail room; the rails themselves are drawn at runtime, not a sprite.
- **Runtime:** Plain `<img>` loads drawn to a 2D canvas. No loader, atlas or 3D
  library is involved.

## Hexkeep water regions (games/hexkeep.js, games/hexkeep-map.js)

- **Files:** `assets/hexkeep/river.png`, `assets/hexkeep/coast.png`,
  `assets/hexkeep/enemy-skiff-walk.png`, `assets/hexkeep/enemy-warship-walk.png`,
  and the vendored inputs in `assets/hexkeep/source/pirate/`.
- **Source:** **Kenney "Pirate Kit"** — https://kenney.nl/assets/pirate-kit. The
  eleven GLB models the boards actually place (two hulls, palms, shore rocks, a
  dock, a wreck, a barrel and a sand patch) plus the pack's shared
  `Textures/colormap.png` are vendored by `tools/vendor-hexkeep-pirate.py`, which
  pins the download URL and records per-model provenance in
  `assets/hexkeep/source/pirate/provenance.json`. The pack's licence ships beside
  them as `LICENSE.txt`.
- **License:** Creative Commons Zero (CC0 1.0 Universal) — free for personal,
  educational and commercial use; attribution to Kenney is not required.
- **Notes:** The hexes, roads, water tiles and buildings on both boards are still
  the KayKit Medieval Hexagon Pack already vendored for the other five regions,
  rendered with the same camera, lights and tone mapping, so a shore reads as the
  same world as a road. Only the boats and the shore decorations come from the
  Pirate Kit, and they keep their own colormap rather than the per-region palette
  atlas.
- **Runtime:** The app loads only the baked PNGs. three.js and GLTFLoader are used
  at bake time by `tools/hexkeep-board-render.html` and
  `tools/hexkeep-boat-render.html`, never by the game.
