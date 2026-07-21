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
