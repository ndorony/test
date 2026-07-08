# Adventure Screens — Design Brief (for Claude Design)

A design brief for the two adventure screens of the app. The goal is a **fresh,
high-craft visual design** for both screens across **all 5 themes**. Previous
in-house attempts (a Candy-Crush-style medallion ladder, and a floating-islands
overworld) were **rejected as "not to taste"** — do not simply reproduce them.
Explore genuinely different, polished directions.

This is a **reskin**: the data, routing, progress, unlock and reward logic all
already exist (`worlds.js`, `adventure.js`, `storage.js`). Design changes only
the presentation. Do not invent new gameplay/data.

---

## 1. The two screens (define both, distinctly)

The core requirement the user stressed: **the two screens must feel clearly
different from each other** — not the same layout twice. They serve different
jobs, so they should read differently.

### Screen A — Worlds Overview  (`#/adventure`, `AdventureHomeComponent`)
- **Job:** choose which *world* to enter, and see overall journey progress.
- **Nature:** a *place/destination selector* — spatial, exploratory, "where to go."
- **Data per world:** `{ name, emoji, state: done|current|locked, stars: 0..3, progress: "3/5" }`.
  Worlds are an **ordered sequence** with sequential unlock (finishing a world
  unlocks the next). ~7–12 worlds; must scroll gracefully if many.
- **States:** `done` (mastered, show stars/crown), `current` (the active world —
  clearly highlighted, "you are here"), `locked` (needs the previous world).
- **Action:** tapping an unlocked world → opens Screen B for that world.

### Screen B — World Level Path  (`#/adventure/world/:id`, `AdventureWorldComponent`)
- **Job:** play through one world's ordered *encounters* (mini-games) and see
  step-by-step progress.
- **Nature:** a *linear journey / progression track* — sequence, "what's next."
- **Data per step:** `{ index, icon, name, state: done|current|locked, stars: 0..3 }`.
  Encounter types: `learn` (📖 "לומדים משהו חדש"), `game` (a mini-game),
  `final` (👑 "האתגר הגדול"). 4–6 steps typical.
- **States:** same `done|current|locked` semantics as above.
- **Action:** tapping the current/unlocked step → launches that mini-game.
- **Return:** a way back to Screen A ("מפת העולמות").

**How they should differ:** Screen A is about *space and choice* (a world/region
map). Screen B is about *sequence and momentum* (a path/track through one place).
Give them different compositions, silhouettes and rhythm — not the same node-on-
a-line motif recolored.

---

## 2. The type matrix — 2 screens × 5 themes = 10 cells

Every cell must be designed. Each theme is a global skin (chosen in the existing
**settings page `#/user`**, not on these screens). The same screen must feel
native to each theme, and the 5 themes must feel like one cohesive family.

Palette per theme (from `themes.js` → `themeOptions[key].colors`):

| key | name | primary | secondary | tertiary | accent | background | text |
|-----|------|---------|-----------|----------|--------|------------|------|
| `base` | בסיסי | `#006064` | `#78909c` | `#B0E0E6` | `#C0C0C0` | `#F5F5F5` (light) | `#000` |
| `soldiers` | חיילים | `#4B5320` | `#C0C0C0` | `#BDB76B` | `#FFD700` | `#F0F0E0` (light) | `#000` |
| `unicorn` | חד קרן | `#FF69B4` | `#BA55D3` | `#FFB6C1` | `#FFD700` | `#FFF0F5` (light) | `#4B0082` |
| `space` | חלל | `#1E90FF` | `#000080` | `#87CEEB` | `#FFD700` | `#000020` (dark) | `#FFFFFF` |
| `dark` | כהה | `#121212` | `#1E1E1E` | `#2F4F4F` | `#BB86FC` | `#1C1C1C` (dark) | `#E0E0E0` |

Note: `base`/`soldiers`/`unicorn` have **light** backgrounds (dark ink);
`space`/`dark` are **dark** (light ink). Contrast must work in both.

For each of the 10 cells, define: background/scenery, the world-node vs level-node
motif, how the three states read, and the mood. Suggested (not mandatory) theme
worlds — the designer may reinterpret:

| theme | overview mood | path mood |
|-------|---------------|-----------|
| base | clean nautical chart / archipelago | stepping-stones along a shore |
| soldiers | campaign map: territories, banners, a front line | supply route with checkpoints |
| unicorn | candy kingdoms in the clouds | rainbow ribbon between landmarks |
| space | a star system: planets & orbits | a flight corridor between stations |
| dark | a shadowed realm lit by torches | a descent through chambers |

---

## 3. Shared elements (consistent across both screens & all themes)
- **HUD:** coins (🪙) and total stars/level. Reuse the existing player card feel.
- **Settings:** a small link only (to the existing `#/user` page). **No theme
  picker on these screens.** Theme is global and merely reflected here.
- **Hero/avatar:** a player token that marks "you are here" on the current node.
- **Progress feedback:** stars (0–3) per completed node; a clear "current" accent.
- **RTL Hebrew.** All user-facing copy in Hebrew; keep it minimal and playful.
- **Motion:** tasteful idle animation (current-node pulse, waving/floating props),
  and ideally a node entrance animation. Nothing frenetic.

---

## 4. Constraints
- **Self-contained prototype:** inline HTML/CSS/SVG/JS. No network — the target
  app blocks external hosts in some contexts, and the prototype must render
  offline. **No external images/fonts.** Use SVG illustration (preferred) and/or
  emoji. Palette-driven via CSS custom properties so one skin serves all themes.
- **No build system.** Plain static files.
- **Craft bar:** this must look like a polished game, not a menu. Depth, layered
  scenery, considered typography, cohesive color, soft shadows/glow. Avoid flat,
  generic, or clip-arty results.
- The eventual app targets `AdventureHomeComponent` / `AdventureWorldComponent`
  in `adventure.js` (Vue 2) with `adv-`-prefixed CSS — but the deliverable here
  is a **standalone visual prototype**, not the wiring.

---

## 5. Deliverable
1. A single self-contained `tools/adventure_screens_design.html` that renders
   **both screens** and lets one switch **theme** and **screen** for preview.
2. Cover all 10 cells (2 screens × 5 themes) to a high, consistent standard.
3. Because taste has been the sticking point: for the **Worlds Overview**, present
   **2 distinct directions** (clearly different concepts, not variations) in at
   least one theme, so the user can choose a direction before it's applied to all.
4. **Verify visually**: render with headless Chrome/Edge and inspect the PNGs
   (use the `visual-verify` skill / `~/.claude/skills/visual-verify/scripts/shoot.js`).
   Do not claim a look without having viewed the screenshot.

---

## 6. Reference material (in repo)
- `tools/adventure_map_prototype.html` — the **rejected** prior prototype (both
  screens). Useful only to see the data, states, palette mapping and what NOT to
  repeat.
- `worlds.js` / `adventure.js` — real world/encounter data model and current
  (minimal) screens. `ADVENTURE_MAP_SKIN.md` — earlier skin notes.
