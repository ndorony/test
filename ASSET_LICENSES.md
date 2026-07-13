# Asset Licenses

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
