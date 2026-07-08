# Adventure Map Skin — themed world/level maps

Turn the adventure screens from vertical **card lists** (which read like a menu)
into **themed game-world maps**: the level/encounter steps sit as medallion
**nodes on a winding path**, and the whole scene re-skins per theme — bases on a
battlefield for `soldiers`, planets in space for `space`, castles in a candy
kingdom for `unicorn`, and so on. "Beautiful game screens, not menus."

**Status:** visual direction approved from a working prototype (see §7). This
doc is the implementation spec. It is a **pure reskin** — no new data, routing,
progress, or reward logic. Everything the map needs already exists.

Companion docs: `ADVENTURE_MASTER_PLAN.md` (execution plan + iron rules),
`ADVENTURE_MODE_PLAN.md` (original design), `GAME_ARCHITECTURE.md` (engine).

---

## 1. Scope — which screens

| Screen | Component (`adventure.js`) | Today | After |
|--------|----------------------------|-------|-------|
| **World path** (`#/adventure/world/:id`) | `AdventureWorldComponent` (`adventure-world`, ~L617) | vertical list of `.adv-card` steps | **winding path of node medallions** (the prototype) |
| **World select / home** (`#/adventure`) | `AdventureHomeComponent` (`adventure-home`, ~L524) | list of world cards | *(phase 2)* worlds as locations on an overworld map |

Phase 1 is the **world path** screen — that is the "levels as bases on a map"
the request is about. The home screen (phase 2) reuses the same skin system and
is optional/follow-up.

The legacy menu (`#/`, `apps.js`, `MenuComponent`) is **not touched**.

---

## 2. What already exists (reuse — do not rebuild)

`AdventureWorldComponent` already computes everything a map node needs. Each
entry of `this.steps` is:

```js
{ index, icon, name, done, current, locked, stars }   // stars: 0..3
```

derived from `getEncounterPointer(worldId)` (progress) and
`getWorldStars(worldId)` (best stars per encounter). Also already present and
reused as-is:

- **States** — `done` / `current` / `locked` per step (pointer-driven).
- **Star ratings** — `step.stars` (0–3), persisted via `storage.js`.
- **Click behaviour** — `enter(step)` (learn-unlock + route). Node click calls
  the *same* method; nothing changes.
- **Per-world background art** — `world.art.bg` → `adv-art-<bg>` classes in
  `adventure.css` (`home_bg`, `world_letters_bg`, …). The map sits on top of it.
- **HUD** — `<adventure-player-card>` (level + 🪙 coins), `<adventure-companion>`.
- **Reward celebration** — `?celebrate=1&stars=&coins=` banner (unchanged).
- **Animation library** — `adventure.css` classes `adv-float`, `adv-pulse`,
  `adv-pop`, `adv-bounce`, `adv-clouds`, etc.
- **Theme palette** — `themes.js` `themeOptions[key].colors`
  `{primary, secondary, tertiary, accent, background, text, disabledText}`,
  read through `getTheme()` (`storage.js`).

So the reskin only changes **layout + styling of `this.steps`**, plus a small
per-theme "world flavor" table. No logic, storage, or data changes.

---

## 3. Per-theme world flavor

One layout, palette + motif swap per theme. This table is the single source of
truth for the skin (mirror of the prototype's `WORLD` map). Node emojis are the
default graphic; if generated art exists (§8) it overrides them.

| theme | title / subtitle | trail | node metaphor (cycled emojis) | background feel |
|-------|------------------|-------|-------------------------------|-----------------|
| `soldiers` | מבצע ההרפתקה · כבוש בסיס אחר בסיס | dashed supply line | ⛺ 🏕️ 🛡️ 🎯 🏰 🚩 🎖️ 🏅 | olive battlefield gradient |
| `space` | מסע בחלל · טוס מכוכב לכוכב | solid glowing flight-path | 🌍 🪐 ☄️ 🛸 🌟 👾 🌑 🚀 | deep starfield |
| `unicorn` | ממלכת הקסם · עברי בין הטירות | rainbow ribbon | 🏰 🌈 🦄 🍭 💎 🧁 ⭐ 👑 | pink candy kingdom |
| `base` | מפת ההרפתקאות · בחר שלב | dashed dotted trail | 🏝️ ⛵ 🧭 🗿 🌋 🏴 💰 🏆 | turquoise isles |
| `dark` | מבוך הצללים · צלול אל תוך האפלה | dashed dim trail | 🕯️ 🗝️ 🚪 💀 🕸️ 🔮 ⚰️ 🏆 | dungeon dusk |

Notes:
- The **encounter's own icon** still wins for semantic steps — `learn` = 📖,
  `final` = 👑 (from `getEncounterDisplay`). Theme emojis fill the generic
  `game` steps so each world reads as a themed journey. (Decision point in §9.)
- `unicorn` remains the adventure's canonical theme (per master plan §1.2); the
  other themes are additive skins, all driven by the same table.

---

## 4. Node state → visual

| state | medallion | extras |
|-------|-----------|--------|
| `done` | full-color, colored drop-shadow | `⭐`×stars + `☆`×(3−stars) under node |
| `current` | pulsing (`adv-pulse`), accent ring + glow, ▶ hint above | label "כאן אנחנו" |
| `locked` | greyscaled + dimmed, 🔒 glyph over emoji | no stars, not clickable |

Number badge (`index+1`) sits on every node. Node label is `step.name` on a
themed pill. All copy stays Hebrew.

---

## 5. Layout spec

- **Path** — a single smooth SVG cubic-Bézier through node points; nodes placed
  down the screen, x oscillating left/right so it snakes. Two stroked paths: a
  wide soft "edge" under a narrower themed "trail" (dashed for some themes).
  Must be **one continuous path** — avoid the sine amplitude that made the
  prototype look like it forks (use a gentler amplitude / clamped x, or fixed
  zig-zag offsets).
- **Node** — round medallion, 4px light rim, colored drop-shadow (theme
  `primary`), emoji at ~50% size; number badge top-inline-end; stars below.
- **HUD** — reuse `<adventure-player-card>` (coins/level) pinned; world title +
  subtitle as a banner; keep `<adventure-companion>`.
- **Responsive / RTL** — screen is `dir="rtl"`; path is horizontally symmetric
  so it works both directions. Node medallions scale down on narrow widths;
  the map area scrolls vertically if a world has many encounters.

---

## 6. Implementation

Two files change; both already load in `index.html` and are cached.

### 6.1 `adventure.css` — add a map block (all classes `adv-` prefixed)

New classes (skin only, no new files): `adv-map`, `adv-map-sky`, `adv-trail`,
`adv-trail-edge`, `adv-node`, `adv-medallion`, `adv-node-badge`,
`adv-node-label`, `adv-node-stars`, plus state modifiers reusing existing
`adv-locked` / `adv-current` / `adv-pulse`. Drive colors from CSS custom
properties (`--adv-*`) set per theme in JS (§6.3), so one stylesheet serves all
themes.

### 6.2 `adventure.js` — reskin `AdventureWorldComponent` template

Replace the `v-for` **card list** (L635–651) with the map markup: an SVG
`<path>` layer plus absolutely-positioned `.adv-node`s generated from the
existing `steps`. Node `@click="enter(step)"` is unchanged. Add computed
helpers:

- `nodePoints` — compute `{x,y}` per step (winding layout).
- `trailPath` — build the SVG `d` from `nodePoints`.
- `nodeEmoji(step)` — theme metaphor emoji for generic `game` steps, else
  `step.icon`.

`created()`, `enter()`, rewards, routing, companion — **untouched**.

### 6.3 `adventure.js` — the skin table + theme vars

Add near the top (English comments):

```js
// Per-theme world flavor for the map skin (see ADVENTURE_MAP_SKIN.md §3).
const ADVENTURE_MAP_SKINS = { soldiers: {...}, space: {...}, unicorn: {...}, base: {...}, dark: {...} };

// Map the active theme's palette + flavor onto --adv-* CSS vars on the map root.
function applyAdventureMapSkin(rootEl, themeKey) { /* set --adv-bg, --adv-trail, --adv-node-bg, --adv-glow, --adv-ink, ... */ }
```

Palette comes from `getTheme().colors`; helpers convert hex→rgba for glows and
choose ink/panel contrast for **light** backgrounds (`base`, `soldiers`,
`unicorn` have light bg — use `colors.text`; dark themes use white). This is the
same mapping proven in the prototype.

---

## 7. Prototype (approved reference)

`tools/adventure_map_prototype.html` — standalone, self-contained (inline CSS/JS,
emoji graphics, embedded `themeOptions` mirror). Open it and use the theme bar to
switch skins:

```powershell
npx -y http-server -p 8091 -c-1        # then open http://localhost:8091/tools/adventure_map_prototype.html
```

Rendered references (soldiers / space / unicorn) were captured with the
`visual-verify` workflow (headless screenshot). The prototype's `WORLD` table and
`hexA` / `--var` mapping are the intended source for §3 and §6.3.

---

## 8. Optional: generated background art

The master plan (§ art generation) already defines per-world backgrounds
(`world.art.bg` → `assets/adventure/art/*.jpg`) via `tools/generate_art.mjs`.
The map renders **on top** of that art (semi-transparent sky overlay), so richer
per-world illustrations drop in with zero map changes. Emoji nodes are the
zero-dependency baseline; swapping a node to an `<img>` sprite is a later polish.

---

## 9. Decisions to confirm

1. **Scope** — phase 1 (world path) only, or also phase 2 (home overworld) now?
2. **Node graphics** — keep emoji + CSS (zero assets), or invest in SVG/generated
   sprites per theme?
3. **Generic-step emojis** — theme metaphor emojis on `game` steps (themed
   journey) vs. keeping the neutral 🎮 for every game step (clearer "this is a
   game"). Prototype uses the themed metaphor.

---

## 10. Iron-rule compliance (from ADVENTURE_MASTER_PLAN §0.1)

- [ ] Legacy menu mode untouched; all map code lives in adventure-only files.
- [ ] Comments English; every user-facing string Hebrew.
- [ ] No direct `localStorage` — reuse existing `storage.js`-backed helpers
      (`getEncounterPointer`, `getWorldStars`); the skin reads no storage itself.
- [ ] No new browser-loaded files (edits to existing `adventure.js` /
      `adventure.css` only). If a helper/asset file is later added, register it
      in **both** `index.html` and `service-worker.js`.
- [ ] `node --check adventure.js` passes.
- [ ] `node tests/adventure_core_test.js` prints `0 failed` (skin is presentation
      only — must not change any tested behaviour).
- [ ] Bump `service-worker.js` cache version (currently `my-app-cache-v30` → v31).
- [ ] One commit: `adventure: themed world-path map skin`.

## 11. Acceptance criteria

- `#/adventure/world/hebrew1` shows the encounter steps as node medallions on a
  winding themed path (not a card list), with correct done/current/locked states
  and star counts identical to today's data.
- Switching theme (user screen) re-skins the map (soldiers/space/unicorn/base/
  dark) with no reload logic changes.
- Clicking a node behaves exactly like clicking the old card (`enter(step)`).
- Reward banner, companion, player card, back-to-worlds link all still work.
- Tests green; cache bumped; legacy menu unaffected.
