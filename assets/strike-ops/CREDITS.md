# Strike Ops (כוח פריצה) — asset credits

Used by `games/strike-ops.js`. Every runtime file below is loaded from this
repository and precached by `service-worker.js` (`STRIKE_OPS_ASSETS`). All
files are **CC0 1.0** (public domain); attribution is optional and given anyway.
Bytes are on-disk sizes; triangles come from the GLB accessors.

## Characters (`characters/`)

| File | Title / creator | Source | Licence | Triangles | Bytes |
|---|---|---|---|---|---|
| `characters/enemy-hazmat.glb` | "Character Hazmat", Quaternius (Toon Shooter Game Kit) | https://poly.pizza/m/z3TSQYx1Kn | CC0 1.0 | 6,584 (3 draws, 43 bones) | 445,924 |
| `characters/enemy-hazmat-lod.glb` | same model, meshopt-simplified to 70% (tiers 0–1) | same | CC0 1.0 | 5,015 | 384,624 |

Modifications: 13 extra weapon meshes removed (one AK kept, parented to the
`Index1.R` bone); the head merged into the body; materials collapsed to `Team`
(suit and helmet, tinted per enemy at runtime) and `Trim` (vertex colours for
visor, gloves, boots and gun); the `CharacterArmature|` clip-name prefix
stripped. Clips: `Idle, Idle_Shoot, Walk, Walk_Shoot, Run_Gun, Run_Shoot,
HitReact, Death, Duck, Wave`.

## Environment (`env/`)

| File | Creator / kit | Source | Licence | Triangles | Bytes |
|---|---|---|---|---|---|
| `env/kenney-industrial/water-tower.glb` | Kenney, City Kit (Industrial) 2.0 | https://kenney.nl/assets/city-kit-industrial | CC0 1.0 | 968 | 93,836 |
| `env/kenney-industrial/shipping-container-a.glb`, `shipping-container-b.glb`, `shipping-container-c.glb` | Kenney, City Kit (Industrial) 2.0 | same | CC0 1.0 | 402 each | 36,624 / 37,052 / 36,620 |
| `env/kenney-industrial/Textures/colormap.png` | Kenney kit palette | same | CC0 1.0 | — | 11,986 |
| `env/kenney-survival/barrel.glb` | Kenney, Survival Kit | https://kenney.nl/assets/survival-kit | CC0 1.0 | 412 | 34,256 |
| `env/kenney-survival/rock-a.glb`, `rock-b.glb` | Kenney, Survival Kit | same | CC0 1.0 | 104 / 156 | 10,812 / 15,184 |
| `env/kenney-survival/tree.glb`, `tree-tall.glb` | Kenney, Survival Kit | same | CC0 1.0 | 226 / 254 | 22,184 / 24,672 |
| `env/kenney-survival/grass-large.glb` | Kenney, Survival Kit | same | CC0 1.0 | 144 | 18,848 |
| `env/kenney-survival/Textures/colormap.png` | Kenney kit palette | same | CC0 1.0 | — | 7,440 |
| `env/kenney-fantasy/wall-wood.glb`, `wall-wood-detail-cross.glb`, `wall-wood-doorway-square-wide.glb` | Kenney, Fantasy Town Kit 2.0 (shed walls) | https://kenney.nl/assets/fantasy-town-kit | CC0 1.0 | 32 / 80 / 46 | 4,808 / 8,480 / 5,876 |
| `env/kenney-fantasy/roof-flat.glb`, `roof.glb` | Kenney, Fantasy Town Kit 2.0 | same | CC0 1.0 | 20 / 64 | 3,448 / 9,324 |
| `env/kenney-fantasy/planks.glb` (deck) | Kenney, Fantasy Town Kit 2.0 | same | CC0 1.0 | 96 | 11,148 |
| `env/kenney-fantasy/wall-block-half.glb` (low stone cover wall) | Kenney, Fantasy Town Kit 2.0 | same | CC0 1.0 | 76 | 8,564 |
| `env/kenney-fantasy/fence.glb` | Kenney, Fantasy Town Kit 2.0 | same | CC0 1.0 | 84 | 7,672 |
| `env/kenney-fantasy/tree.glb`, `tree-high-round.glb`, `hedge-large.glb` | Kenney, Fantasy Town Kit 2.0 | same | CC0 1.0 | 168 / 126 / 90 | 18,188 / 13,176 / 9,568 |
| `env/kenney-fantasy/Textures/colormap.png` | Kenney kit palette | same | CC0 1.0 | — | 11,143 |
| `env/kenney-fantasy/Textures/colormap-shed.png` | Derived from the Kenney palette: wood recoloured yellow, trim off-white, roof grey | derivative of the CC0 palette | CC0 1.0 | — | 12,347 |
| `env/kaykit-barricade.glb` (sandbag stand-in, tinted beige at runtime) | Kay Lousberg, KayKit Medieval Hexagon Pack, `fence_stone_straight` (the repo's `assets/hexkeep/source/barricade.gltf`, packed to GLB) | https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0 | CC0 1.0 | 284 | 30,972 |
| `env/ground/ground-grass.png`, `env/ground/ground-dirt.png` | Generated in-house for this project (canvas noise) | this project | CC0 1.0 | — | 67,236 / 58,563 |
| `env/kenney-industrial/License.txt`, `env/kenney-survival/License.txt`, `env/kenney-fantasy/License.txt` | Kenney licence files, copied unmodified (not loaded by the game, not precached) | Kenney | CC0 1.0 | — | ≈ 0.7 KB each |

## Referenced in place (not copied)

| File | What | Source | Licence |
|---|---|---|---|
| `assets/models/shooter/shooter_models.js` → `SHOOTER_MODEL_DATA.assaultRifle` | First-person view model (embedded copy of `assets/models/shooter/assault-rifle.glb`, 1,930 triangles) | Quaternius, Ultimate Guns Pack | CC0 1.0 |
| `assets/models/shooter/shooter_models.js` → `SHOOTER_MODEL_DATA.crate` | Wooden crate cover (embedded copy of `assets/models/shooter/crate.glb`, 784 triangles) | Quaternius, "Crate" | CC0 1.0 |

The sky gradient, distant hills, cloud sprites, blob shadows and particle
textures are generated at runtime. All sounds are synthesized with WebAudio;
no audio files are added.
