# Master Plan: Completing the Guided Adventure Game

> **Status: historical execution plan.** Many phases are implemented and literal
> file descriptions, theme counts, cache versions, and test counts below are now
> stale. Do not execute this plan sequentially. Start with `AGENTS.md`; current
> source and tests define Adventure behavior.

This document is the **complete execution plan** for turning the app into a
guided learning game built around worlds, replacing the current menu mode as
the default experience. It is written so that an engineer (or coding agent)
with **no prior knowledge of this project** can execute it phase by phase.

Companion docs (read on demand, not required upfront):
- `GAME_ARCHITECTURE.md` — deep dive into the legacy engine (weights, components, storage) — in Hebrew
- `ADVENTURE_MODE_PLAN.md` — the original adventure-mode design doc — in Hebrew
- `HOW_TO_ADD_GAMES.md` — adding content/games to the legacy system

---

## 0. How to work with this plan (READ FIRST)

### 0.1 Iron rules — never violate any of these

1. **Never break the legacy system.** Menu mode (`/menu`, `apps.js`, all the
   existing games) must keep working. Every connection into legacy code goes
   through a **guarded hook**: `if (typeof someAdventureFn === 'function') {...}`
   so that when an adventure file is not loaded, legacy behaves exactly as before.
2. **Code comments in English only.** All user-facing strings (names, buttons,
   speech bubbles) in Hebrew only.
3. **Storage only via `storage.js`** (`setLocalStorage`/`getLocalStorage`) —
   never `localStorage` directly, or Firebase cloud sync silently breaks.
4. **A `worldId` must match `[a-z0-9]+`** — no dashes or underscores. Violating
   this breaks storage-key normalization (see §1.3).
5. **After every change to js/css/html files:**
   - `node --check <each changed js file>` (syntax check)
   - `node tests/adventure_core_test.js` — must print `0 failed` (currently 67 tests)
   - bump the cache version in `service-worker.js` (`my-app-cache-vNN` → NN+1)
6. **Every new browser-loaded file** must be added both to `index.html`
   (script/link tag) and to the cache list in `service-worker.js`.
7. **Secrets** (the OpenAI key) live in `.secrets/` which is gitignored. A key
   must never appear in code, in markdown, or in a commit.
8. **There is no build system.** Everything is static files loaded by
   `index.html` in order. Do not introduce npm/webpack/bundlers. The load
   order that matters: `data.js` → `apps.js` → `worlds.js` → `adventure.js` →
   `themes.js` → `storage.js` → `firebase.js` → `tester.js`.

### 0.2 Running and manual testing

```powershell
# dev server, from the project root
npx -y http-server -p 8080 -c-1
# then open http://localhost:8080  (hard refresh Ctrl+Shift+R after changes)
```

Useful entry points:
- `#/adventure` — adventure home screen
- `#/adventure/world/hebrew1` — first letters world
- `#/adventure/avatar` — dressing room (character creator)
- `#/play/mcq/adv-hebrew1-1` — a mini-game directly (bypasses the path)
- `#/` — the legacy menu (must keep working!)

Note: plain `curl` fails against external https in this dev environment; use
`node -e "fetch(...)"` for network calls in scripts and checks.

### 0.3 Execution order

Phases in §2 are dependency-ordered. Finish a phase, satisfy **all** its
acceptance criteria (including tests), then move on. One commit per phase,
message format: `adventure: <what was done>`.

---

## 1. Minimal system reference (what already exists)

Everything in this section is **already implemented and tested**. Do not
re-implement; extend using the same patterns.

### 1.1 File map

| File | Role |
|------|------|
| `data.js` | All learning content (`DATA`). Key list: `hebrewAlphabet` — 27 items (letters incl. finals), fields `letter` (text) + `letterName` (spoken) |
| `apps.js` | Legacy menu tree — do not modify |
| `worlds.js` | **Adventure learning core**: world definitions, id scheme, shared knowledge, seeding, unlock gating |
| `adventure.js` | **Adventure UI**: home/world/avatar screens, player state (XP), in-game frame, companion |
| `adventure.css` | Adventure skin + reusable CSS animation library (all classes prefixed `adv-`) |
| `storage.js` | Storage + cloud sync; contains the key-normalization hook |
| `tester.js` | Legacy engine + all game components + router; contains the guarded hooks |
| `themes.js` | Theme options; `unicorn` is the adventure's visual theme |
| `service-worker.js` | PWA cache — **bump version on every change** (currently v19) |
| `tests/adventure_core_test.js` | 67 core tests — runs in Node, no browser needed |
| `assets/adventure/lottie/*.json` | 11 animated companions (Google Noto Animated Emoji, free license) |
| `.secrets/openai_key.txt` | OpenAI API key (gitignored); validated; `gpt-image-2` is available |

### 1.2 Systems that already work

- **World = one knowledge namespace.** All mini-games inside a world read and
  write the same weights, attempt history, score and progress.
- **Alphabet worlds:** `hebrew1`..`hebrew6` (4–5 letters each, finals included,
  ALL letters of a world unlocked from the start) → `hebrewreview` (all 27) →
  `aleph` (א with nikud) → English bonus worlds gated by player level.
  Sequential unlock: finishing a world unlocks the next.
- **Seeding:** on a world's first initialization, evidence about each item is
  gathered from *everywhere* (other adventure worlds on the same source list +
  all legacy menu games on it, both activity modes, plus attempt history).
  Known items start unlocked at `2 + round(3 × difficulty)` where
  `difficulty = max(maxWeight/15, failRate)`; unknown items stay locked.
- **Unlock cycles run only in 'learn' encounters** (hook
  `shouldAdventureAutoUnlock`); replaying a game encounter never unlocks items.
- **Player:** XP (+2 per correct answer), level = `floor(xp/50)+1`, levels gate
  worlds and avatar items.
- **Layered avatar** (`adv_avatar`): base + aura color + hat + companion;
  companions render as Lottie animations with plain-emoji fallback.
- **In-game frame** (`adventure-frame`, mounted once in `index.html` next to
  `router-view`): world bar + exit + companion reacting to the
  `adventure-answer` CustomEvent.
- **Unicorn maze skin**: `MAZE_UNICORN_SCENARIOS` + `MAZE_ATMOSPHERES` +
  palette-driven textures in the treasure maze. **This is the approved visual
  reference** for all future skin work.

### 1.3 Id & storage conventions (critical)

- Encounter id (used as `currentAppId` by game components):
  `adv-<worldId>-<encounterIndex>`, e.g. `adv-hebrew1-2`.
- World knowledge key: `adv-<worldId>`. `normalizeAdventureKey` (in
  `worlds.js`, invoked from `getKey` in `storage.js`) rewrites any
  `adv-<world>-<n>` into `adv-<world>` inside **every** storage key — that is
  how all encounters share knowledge. This is why worldIds cannot contain dashes.
- Existing adventure keys: `adv_player` (xp), `adv_avatar`,
  `adv-<world>_completed`, `adv-<world>_encounterPointer`, plus the legacy
  engine's keys on the world namespace: `learn_adv-<world>_Weights`,
  `adv-<world>_Progress`, `adv-<world>_CurrentLevelProgress`,
  `adv-<world>_new_items`, `adv-<world>_attemptHistory`, `scoreadv-<world>`.
- Item weight semantics: `-1` locked, `0` mastered, `1..15` practicing
  (higher = struggling = sampled more often by the weighted random picker).

### 1.4 The guarded hooks (the contract between the two systems)

All are `typeof`-guarded. Locate them by searching for the function name:

| Hook (defined in worlds.js/adventure.js) | Call site in legacy code | Purpose |
|------------------------------------------|--------------------------|---------|
| `normalizeAdventureKey` | `getKey` in `storage.js` | shared knowledge per world |
| `getAdventureList` | `getDataList` in `tester.js` | virtual filtered lists (`ADV_WORLD:<id>`) |
| `resolveAdventureApp` | `getItemById` in `tester.js` | virtual app config from an encounter id |
| `getAdventureSeededWeights` | init branch of `getWeightsForKey` | seeding |
| `shouldAdventureAutoUnlock` | update branch of `getWeightsForKey` | unlock only in 'learn' |
| `getAdventureLevelCompleteRoute` | `reloadProgress` in `BaseGameComponent` | return to path + advance pointer |
| `onAdventureAnswer` | `updateWeightForKey` in `tester.js` | XP, completion flag, companion event |
| `getAdventureRoutes` | end of the `routes` array in `tester.js` | adventure route registration |

**Every future extension uses the same pattern**: a function in
worlds.js/adventure.js + one guarded call site in legacy code.

---

## 2. THE PLAN — remaining phases, in execution order

> Each phase: goal → tasks (with code-level detail) → acceptance criteria.
> Do not skip criteria. Add tests to `tests/adventure_core_test.js` in the
> style already used there (the `check(name, cond, extra)` helper).

---

### Phase A — Make the guided game the default experience

**Goal:** a child opening the app lands inside the adventure, never sees menus.
Parents can still reach the legacy mode.

#### Tasks

1. **Route swap.** In `tester.js`:
   - Add `{path: '/free', component: MenuComponent}` to the `routes` array
     (next to the existing `{path: '/', component: MenuComponent}` line —
     keep both; `MenuComponent.init` already handles a missing
     `currentMenu` param by showing the root menu).
   - In `router.beforeEach`, add a guarded redirect **before** the existing
     conditions:
     ```javascript
     // Adventure mode is the default experience; legacy menus live at /free
     if (to.path === '/' && typeof getAdventureRoutes === 'function') {
         sendMetric('/adventure');
         return next('/adventure');
     }
     ```
     Keep the login redirects working: the `!username` branch must still run
     for `/adventure` targets (verify by clearing `sessionStorage`).
2. **Cross links.**
   - In `AdventureHomeComponent` (adventure.js), change the bottom link text
     to `→ מצב חופשי (להורים)` and target `/free`.
   - The `🗺️ הרפתקה` button already added to `MenuComponent` stays (it will
     now show inside `/free`).
3. **First-run onboarding.**
   - In `AdventureHomeComponent.created`: if
     `!getLocalStorage('adv_onboarded', false)`, push
     `/adventure/avatar?first=1` and return.
   - In `AdventureAvatarComponent`: when `this.$route.query.first === '1'`,
     show a companion bubble `בנו את הדמות שלכם!` at the top and a large
     pulsing button (`class="adv-card adv-pulse"`) labeled `יוצאים להרפתקה! ▶`
     that runs `setLocalStorage('adv_onboarded', true)` and pushes `/adventure`.
   - The normal back link should also set `adv_onboarded` (a child may leave
     via back).
4. **Guided "continue" button.** In `adventure.js` add:
   ```javascript
   // The single "next thing to do": first unlocked-but-uncompleted world,
   // at its current encounter pointer. Returns null when everything is done.
   function getNextGuidedStep() {
       for (const world of WORLDS) {
           if (!isWorldUnlocked(world) || isWorldCompleted(world.id)) {
               continue;
           }
           return {worldId: world.id, encounterIndex: getEncounterPointer(world.id)};
       }
       return null;
   }
   ```
   In the home screen template, render ABOVE the world list a large card:
   `▶ ממשיכים בהרפתקה — <world name>` with classes `adv-card adv-pulse`,
   clicking navigates to `/adventure/world/<worldId>`. When
   `getNextGuidedStep()` returns null show `כל הכבוד! סיימתם הכול 🏆` instead.

#### Acceptance criteria

- Opening `http://localhost:8080` lands on the adventure home. `#/free` shows
  the legacy menu and legacy games work there, including their old progress.
- Clearing `adv_onboarded` (or a fresh browser profile) triggers the
  first-run flow: avatar → big button → adventure home.
- The continue button targets: fresh user → hebrew1; mid-world → that world;
  after completing hebrew1 → hebrew2.
- New tests: `getNextGuidedStep` for the three cases above (manipulate
  `adv-<world>_completed` and `adv_player` via `setLocalStorage` in the test
  context, mirroring existing test style).
- Full suite passes; service-worker version bumped.

---

### Phase B — Encounter reward screen (stars & coins)

**Goal:** finishing an encounter feels like a victory and feeds the coin economy.

#### Tasks

1. **Session stats.** In `onAdventureAnswer` (adventure.js), before the XP
   logic, accumulate per-encounter stats under `adv_session`:
   ```javascript
   // Track accuracy for the CURRENT encounter (used for stars).
   // Reset whenever the child switches to a different encounter id.
   const session = getLocalStorage('adv_session', {});
   if (session.key !== key) {
       session.key = key;
       session.correct = 0;
       session.wrong = 0;
   }
   if (isCorrect) { session.correct += 1; } else { session.wrong += 1; }
   setLocalStorage('adv_session', session);
   ```
2. **Star math.** Add to adventure.js:
   ```javascript
   // 3 stars: up to 10% mistakes; 2: up to 30%; else 1
   function computeSessionStars(session) {
       const total = (session.correct || 0) + (session.wrong || 0);
       if (!total) { return 1; }
       const failRate = session.wrong / total;
       if (failRate <= 0.10) { return 3; }
       if (failRate <= 0.30) { return 2; }
       return 1;
   }
   ```
3. **Reward on completion.** Extend `getAdventureLevelCompleteRoute`:
   - Read `adv_session`; if `session.key !== currentAppId`, treat as 1 star
     (defensive default).
   - `const stars = computeSessionStars(session);`
   - Persist the best result per encounter:
     `adv-<worldId>_stars` is an object `{ "<encounterIndex>": stars }`;
     write `Math.max(existing || 0, stars)`.
   - Coins: `const coins = stars * 10;` add to `adv_player.coins`
     (initialize `coins: 0` in `getAdventurePlayer` defaults).
   - Reset `adv_session` (`setLocalStorage('adv_session', {})`).
   - Return `/adventure/world/<worldId>?celebrate=1&stars=<n>&coins=<n>`.
4. **Display.**
   - World screen: when `$route.query.stars` present, the existing celebrate
     banner also renders that many ⭐ (staggered `adv-bounce`) and `+<coins> 🪙`.
   - Each path step card shows its saved stars (e.g. `⭐⭐☆` for 2) read from
     `adv-<worldId>_stars`.
   - `AdventurePlayerCard` shows coins: `🪙 {{ coins }}` next to the level.
5. **Legacy safety:** all of this lives inside adventure-only code paths
   (`getAdventureLevelCompleteRoute` already returns null for legacy ids).

#### Acceptance criteria

- Finish an encounter with 0 mistakes → banner shows ⭐⭐⭐ and `+30 🪙`;
  with many mistakes → 1 star, `+10 🪙`.
- Replaying an encounter never lowers its saved stars (max is kept).
- Coins accumulate in the player card and survive reload.
- New tests: star math boundaries (0%, 10%, 30%, 50% fail rates), coin
  accumulation, star max-keeping, session reset after completion.

---

### Phase C — Shop: paid avatar items

**Goal:** coins have value; correct answers have visible purchasing power.

#### Tasks

1. **Prices.** In `ADVENTURE_AVATAR_OPTIONS` (adventure.js) add `price` to
   selected items. Rule of thumb: level-1 items free; level 2–3 → 30–80;
   level 4–5 → 120–200. An item may require level AND purchase.
2. **Ownership.** `adv_owned` is an array of strings `"<field>:<value>"`
   (e.g. `"hat:👑"`). Helpers:
   ```javascript
   function isAvatarOptionOwned(field, option) {
       if (!option.price) { return true; }
       return getLocalStorage('adv_owned', []).includes(field + ':' + option.value);
   }
   function purchaseAvatarOption(field, option) {
       const player = getAdventurePlayer();
       if ((player.coins || 0) < option.price) { return false; }
       player.coins -= option.price;
       setLocalStorage('adv_player', player);
       const owned = getLocalStorage('adv_owned', []);
       owned.push(field + ':' + option.value);
       setLocalStorage('adv_owned', owned);
       return true;
   }
   ```
3. **Unlock logic.** `isAvatarOptionUnlocked(option)` keeps gating by level;
   the dressing room `pick()` flow becomes:
   - locked by level → shake, do nothing (current behavior).
   - unlocked but not owned → companion bubble `לקנות ב-<price> 🪙?` with
     buy/cancel buttons; on buy call `purchaseAvatarOption`; not enough coins →
     `adv-shake` + bubble `צריך עוד X מטבעות!`.
   - owned/free → select as today.
4. **UI:** price tag chip on unowned items (`🪙 50`), replacing the lock badge
   when the level requirement is already met. Coins visible in the dressing
   room (reuse `adventure-player-card`).

#### Acceptance criteria

- Buying deducts coins, persists across reload, and the item stays usable.
- Cannot buy without enough coins or below required level; free items never
  prompt.
- New tests: successful purchase, failed purchase (insufficient coins),
  ownership persistence, free item bypass.

---

### Phase D — Final mini-game lineup + pastel skins

**Goal:** real variety along the path; every mini-game feels native to the
unicorn style (matching the approved treasure-maze skin).

**Lineup (approved direction; if the user requests changes, only `worlds.js`
changes):**

| World | Encounters |
|-------|-----------|
| letter worlds (hebrew1–6) | learn → mcq → falling_answers → draw_letter → treasure_maze (final) |
| hebrewreview | learn → mcq → falling_answers → treasure_maze → mcq → balloon_shooter (final) |
| aleph (nikud) | learn → mcq → falling_answers → treasure_maze (final) |
| English worlds | learn → mcq → falling_answers → spell → platformer (final) |

#### Tasks

1. **Update `encounters`** in `worlds.js` per the table. For `draw_letter`
   check how an existing `draw_letter` app is configured in `apps.js`
   (search `draw_letter`) and mirror its `questionIndex`/`resultIndex`
   convention as encounter overrides. `spell` uses `questionIndex` only.
2. **Manual compatibility pass** — for each game type on an adventure id
   (e.g. `#/play/draw_letter/adv-hebrew1-3`): question renders, correct/wrong
   answers update shared weights (verify by repetition bias), cycle completion
   returns to the path. If a game needs a field the world lacks, add an
   encounter override rather than changing the game.
3. **Skins, one game at a time, using the maze pattern** (an "atmosphere"
   object selected by `getLocalStorage('theme', 'base') === 'unicorn'`,
   zero logic changes):
   - `falling_answers`: pastel gradient background; answers inside rounded
     pastel balloon chips.
   - `mcq`: already wrapped by the frame; soften buttons via `adventure.css`
     (rounded, pastel) scoped to adventure routes — add a route-driven class
     on the frame root (the frame component knows it's an adventure route;
     have it add a `adv-active` class to `document.body` on activate and
     remove on deactivate, then scope CSS as `body.adv-active .result {...}`).
   - `balloon_shooter` / `platformer`: find their hardcoded sky/ground colors
     and replace with theme-conditional constants (same approach as
     `MAZE_ATMOSPHERES`; define `SHOOTER_ATMOSPHERES` / `PLATFORMER_ATMOSPHERES`
     next to the component).
4. Update `ADVENTURE_GAME_NAMES` in adventure.js if any appType missing.
5. **Test updates:** encounter-index-sensitive tests (e.g. ones referencing
   `adv-colors-4`) must be updated to the new encounter lists.

#### Acceptance criteria

- Every game in the table opens from its path step, is playable, and returns
  to the path on completion.
- With the unicorn theme every game is pastel; other themes unchanged.
- Full suite passes after test updates.

---

### Phase E — Content: remaining worlds

**Goal:** a long journey after the alphabet. Everything in this phase touches
`worlds.js` only, following the existing world templates.

#### Tasks

1. **Nikud series** after `aleph`: worlds `nikud1..nikudN` over
   `HEBREW_LETTERS_WITH_NIKUD` filtered by vowel group:
   `itemFilter: {group: '<vowel>'}`. **First verify actual group names** in
   `data.js` (items have `groups: ["א", "קמץ"]` — letter + vowel). One world
   per vowel (קמץ, פתח, חיריק, ...), sequential unlock chained from `aleph`.
   `questionType: 'speech'`, `questionIndex`/`resultIndex`: `letter`.
2. **English ABC world:** `listName: 'ABC'`, hear the letter → pick it:
   `questionIndex: 'audio', resultIndex: 'englishUpperCase'`. Verify the
   `audio` field renders a play button and auto-plays (field type `audio`).
3. **Hebrew numbers world:** `HEBREW_NUMBERS` (fields: `number`,
   `numberName` (speech)): hear the number name → pick the digit.
4. Keep `WORLDS` array order = map display order: alphabet → review → nikud →
   bonus worlds.

#### Acceptance criteria

- Each new world: opens, learn shows its items, mini-games practice them,
  completion unlocks the next.
- One content test per new world (item count + question direction), in the
  style of the existing `hebrew1 = letters א–ה` test.

---

### Phase F — Art system: generated backgrounds & transitions (OpenAI)

**Goal:** replace gradients with painted backgrounds at the reference-game
level, fully consistent, generated via the OpenAI Images API.

#### F.1 Layout

```
assets/adventure/art/           ← generated PNGs (committed to git)
tools/art_manifest.json         ← every asset + its prompt
tools/generate_art.mjs          ← generation script (Node, zero deps)
```

#### F.2 `tools/art_manifest.json` schema

```json
{
  "style_base": "<the shared style prompt — §F.3>",
  "assets": [
    {
      "id": "home_bg",
      "file": "home_bg.png",
      "size": "1536x1024",
      "purpose": "background",
      "prompt": "<asset-specific description>"
    }
  ]
}
```

#### F.3 The shared style prompt (`style_base`) — identical for ALL assets

```
Children's educational game background art, soft pastel fairy-tale style.
Dreamy palette of light pink (#ffd9ec), lavender (#d0bfff), baby blue
(#a5d8ff), mint (#c0f0c8) and warm cream. Rounded, friendly shapes, gentle
gradients, soft painterly lighting like a sunrise. Magical sparkles, small
clouds and rainbows. Absolutely no text, no letters, no numbers, no
characters, no people, no animals. Wide empty area in the center for UI
overlay. Flat illustration with soft depth, high detail, consistent with a
unicorn fantasy kingdom for ages 4-7.
```

Critical notes:
- **No text and no characters** in images — generated text renders broken, and
  characters would clash with the avatar/companion overlays. The prompt
  forbids both; never remove those clauses.
- "Wide empty area in the center" — the UI (cards, questions) sits there.

#### F.4 Initial asset list (manifest contents)

| id | used for | asset-specific prompt (appended after style_base) |
|----|----------|---------------------------------------------------|
| `home_bg` | home screen | "A magical floating-islands kingdom seen from above the clouds, a path of glowing stepping stones between islands, a distant rainbow" |
| `world_letters_bg` | letter worlds 1–6 | "A cozy magical garden with stone archways and flower-covered paths on a floating island" |
| `world_review_bg` | hebrewreview | "A grand pastel library-castle with floating books and glowing scrolls, celebration banners" |
| `world_nikud_bg` | nikud worlds | "A starry pastel-night observatory garden with glowing crystal flowers" |
| `world_english_bg` | English worlds | "A cheerful seaside meadow with hot air balloons and sailing clouds" |
| `avatar_bg` | dressing room | "A cute dressing room inside a cloud castle, an open wardrobe and a round mirror, sparkles" |
| `frame_bg` | mini-game frame backdrop | "A soft blurred pastel meadow with bokeh sparkles, very calm, extra empty space in the middle" |
| `transition_clouds` | screen transitions | "Fluffy white-and-pink clouds filling the whole frame edge to edge, dense enough to fully hide anything behind them" |
| `reward_burst` | reward banner backdrop | "A radial burst of pastel confetti, stars and ribbons around an empty center" |

#### F.5 `tools/generate_art.mjs` — implementation spec

```javascript
// Generates missing adventure art via the OpenAI Images API.
// Usage:
//   node tools/generate_art.mjs                 # generate everything missing
//   node tools/generate_art.mjs --only home_bg  # a single asset (style approval)
//   node tools/generate_art.mjs --force home_bg # regenerate an existing one
import fs from 'fs';
import path from 'path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
// On Windows the pathname starts with a slash — normalize:
// use path.resolve(process.cwd()) if the script is always run from the root.

const key = process.env.OPENAI_API_KEY
    || fs.readFileSync(path.join(ROOT, '.secrets/openai_key.txt'), 'utf8').trim();
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/art_manifest.json'), 'utf8'));
const outDir = path.join(ROOT, 'assets/adventure/art');
fs.mkdirSync(outDir, {recursive: true});

const only = /* parse --only / --force from process.argv */;

for (const asset of manifest.assets) {
    const outFile = path.join(outDir, asset.file);
    // skip existing unless forced; skip non-matching when --only is used
    const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({
            model: 'gpt-image-2',
            prompt: manifest.style_base + '\n\n' + asset.prompt,
            size: asset.size,
            quality: 'high',
        }),
    });
    const json = await res.json();
    if (json.error) { console.log('FAIL', asset.id, json.error.message); continue; }
    fs.writeFileSync(outFile, Buffer.from(json.data[0].b64_json, 'base64'));
    console.log('OK', asset.id, '->', asset.file);
}
```

Requirements: clear per-asset logging (created / skipped / failed), a failure
must not abort the loop, and the script must be safely re-runnable
(idempotent — existing files are skipped).

**Workflow:** generate ONE asset first (`--only home_bg`), show it to the user
for style approval, only then generate the rest. Images cost real money.

#### F.6 Wiring into the app

1. `adventure.css` — backgrounds with graceful fallback (gradient stays if the
   file is missing):
   ```css
   .adv-screen.adv-art-home  { background-image: url('assets/adventure/art/home_bg.png'); background-size: cover; background-position: center; }
   .adv-screen.adv-art-world-letters { background-image: url('assets/adventure/art/world_letters_bg.png'); /* etc. */ }
   ```
2. `worlds.js` — each world gets `art: {bg: 'world_letters_bg'}`; the world
   screen maps it to the CSS class (`adv-art-` + kebab id). Home and avatar
   screens use fixed classes.
3. **Cloud transition component** (`adventure.js`): a fixed full-screen layer
   using `transition_clouds.png`, sliding in (450ms), then navigation, then
   sliding out. Trigger from a `router.beforeEach` guard **only when both**
   `from` and `to` are adventure routes (`/adventure...` or adventure-id play
   routes). Respect `prefers-reduced-motion` (skip the animation entirely).
   Implementation sketch: a Vue component mounted next to `adventure-frame`,
   listening to a `adventure-transition` CustomEvent fired from the guard;
   the guard delays `next()` by ~450ms while clouds cover the screen.
4. `service-worker.js`: add all art files to the cache list + bump version.

#### Acceptance criteria

- All adventure screens show generated backgrounds; deleting an art file
  degrades gracefully to the gradient.
- Cloud transition plays between home↔world↔avatar; never in `/free`.
- `node tools/generate_art.mjs` twice in a row: second run generates nothing.
- Manifest + script committed; no key material anywhere in git.

---

### Phase G — Sound & music

**Goal:** the world is alive to the ears, without being annoying.

#### Tasks

1. One quiet looping background track for adventure screens. Source it from a
   free library (e.g. Pixabay Music); save as
   `assets/adventure/music/adventure_loop.mp3` and document attribution in
   `assets/adventure/CREDITS.md` (also add the Noto Animated Emoji credit
   there).
2. Player logic in `adventure.js`:
   - A singleton `Audio` object, `loop = true`, volume ~0.35.
   - Start on the first user interaction inside an adventure screen (browsers
     block autoplay — hook the first `click` listener once).
   - Stop when navigating out of adventure routes (watch in the frame
     component or a `router.afterEach` guarded hook).
   - Mute toggle 🔇/🔊 on the home screen; persist as `adv_music`
     (`getLocalStorage('adv_music', true)`).
3. Existing success/failure sounds stay untouched.

#### Acceptance criteria

- Music starts after first tap in adventure, stops in `/free`, toggle persists
  across reloads, and repeated navigation never stacks two players.

---

### Phase H — Mobile polish & final QA

#### Tasks

1. **Tablet/phone pass** (the child's real device): all touch targets ≥ 44px;
   the top world bar doesn't cover game content; the companion never blocks
   game buttons (its wrapper has `pointer-events: none` — verify it stayed
   that way); test at 360px width.
2. **Performance:** home screen with 10+ worlds and Lottie companions — if
   sluggish, pause off-screen Lottie players (IntersectionObserver, or simply
   render the animated companion only in the first visible card).
3. **Cloud sync:** sign in with Google, play, reload — progress returns.
   Verify the `adv_*` keys sync (they go through storage.js, so they should).
4. Walk the full QA checklist (§3) and fix every failure.

---

## 3. Final QA checklist (run before declaring "done")

- [ ] Clean start (empty localStorage): onboarding → avatar → first world, no dead ends
- [ ] "Continue" always leads to the right step (fresh / mid-world / after completion)
- [ ] Letter world: all its letters open immediately; replaying a step unlocks nothing
- [ ] Mistake on a letter → that letter repeats more, in EVERY mini-game of the world
- [ ] Finishing a world → 🏆 + next world unlocks; review world inherits strengths/weaknesses (seeding)
- [ ] Stars/coins/XP accrue and persist; shop purchase works and persists
- [ ] Companion animated everywhere and reacts to answers; switching companions works
- [ ] Every mini-game on the path: opens, playable, returns to path, pastel under the unicorn theme
- [ ] Generated backgrounds on all screens + cloud transitions; graceful fallback without files
- [ ] Music: plays, persists, never doubles
- [ ] `#/free`: the legacy system fully intact — menus, games, old progress
- [ ] `node tests/adventure_core_test.js` — 0 failed
- [ ] Tablet: touch sizes, performance, no UI blockers
- [ ] Google sync: progress moves between devices
- [ ] `service-worker.js` version current; a normal (non-hard) refresh picks up the new version

---

## 4. Known pitfalls (things that already broke once — don't repeat)

1. **Forgetting the service-worker cache bump** → users see stale code. Check every time.
2. **`new_items` accumulates** until the news screen displays and clears it —
   intentional legacy behavior; do not "fix".
3. After all items of a world are mastered, entering a learn encounter
   **resets** weights to 5 (intentional replay). `getWorldLearningState().completed`
   is only true momentarily — that's why the persistent `adv-<world>_completed`
   flag exists (written in `onAdventureAnswer`).
4. **In tests:** legacy play on a list that any world uses becomes seeding
   evidence and changes initializations. For regression tests pick lists no
   world uses (see the leaf-finder at the top of `tests/adventure_core_test.js`).
5. `getWeightsKey` depends on activity mode (learn/practicing) — two modes =
   two weight arrays. The adventure runs in learn mode; seeding scans both.
6. A companion emoji without a Lottie file (old saves) falls back to plain
   text — desired behavior, not a bug.
7. Legacy game components navigate to `/app/:id` and `/display/news/:id` —
   these legacy screens work on adventure ids too (via the virtual app).
   Don't break them.
8. `curl` fails against external https in this environment — use
   `node -e "fetch(...)"` instead.
9. Windows + ESM: `new URL(import.meta.url).pathname` yields a leading slash
   (`/C:/...`). In Node scripts prefer `process.cwd()` with a documented
   "run from project root" requirement, or strip the slash.

---

## 5. Appendices

### 5.1 Available appTypes (for world lineups)

| appType | kind | best for |
|---------|------|----------|
| `mcq` | question + 4 answers | everything (default) |
| `falling_answers` | click the falling answer | fast recognition |
| `spell` | type the word | English/spelling |
| `common` | match two columns | letter↔name, word↔picture |
| `draw_letter` | draw on canvas (OCR check) | letter writing |
| `treasure_maze` | 3D maze (unicorn skin ready!) | final challenge |
| `balloon_shooter` | 3D balloon range | final challenge |
| `platformer` | 2D platformer | final challenge |
| `s2t` | say the answer (speech recognition) | pronunciation (browser support varies) |
| `word_link` | word linking | vocabulary |

### 5.2 Command reference

```powershell
# core tests (mandatory after every change)
node tests/adventure_core_test.js

# syntax checks
node --check worlds.js; node --check adventure.js; node --check tester.js

# dev server
npx -y http-server -p 8080 -c-1

# art generation (after Phase F)
node tools/generate_art.mjs --only home_bg   # single asset for style approval
node tools/generate_art.mjs                  # everything missing
```

### 5.3 Product decision status

- ✅ Visual direction: pastel unicorn (reference: the treasure maze under the unicorn theme)
- ✅ Companions: Google Noto Animated Emoji (free, 11 characters, more available at fonts.gstatic.com `/s/e/notoemoji/latest/<codepoint>/lottie.json`)
- ✅ Primary content goal: names of ALL Hebrew letters — sequential worlds + review world
- ⏳ Awaiting user approval: final mini-game lineup (table in Phase D)
- ⏳ Awaiting user approval: first generated background before full art generation (Phase F workflow)

---

## 6. Cookbooks — recipes for recurring tasks

### 6.1 Adding a new world (5 minutes, `worlds.js` only)

1. Pick a `worldId` matching `[a-z0-9]+` (e.g. `nikud2`). Never reuse an old
   id — storage keys of a deleted world would leak into the new one.
2. Append an object to `WORLDS` (order in the array = order on the map):
   ```javascript
   {
       id: 'nikud2',
       name: 'עולם הפתח',            // Hebrew display name
       emoji: 'פַ',                   // shown on the world card
       listName: 'HEBREW_LETTERS_WITH_NIKUD',
       itemFilter: {group: 'פתח'},    // omit for the whole list
       setItems: 0,                   // 0 is NOT allowed here — see note below
       questionIndex: 'letter',
       resultIndex: 'letter',
       questionType: 'speech',
       unlock: {world: 'nikud1'},     // or {playerLevel: N}, or both
       encounters: [ {type: 'learn'}, {type: 'game', game: 'mcq'}, /* ... */ {type: 'final', game: 'mcq'} ],
   }
   ```
   `setItems` note: use the number of items that should open per learn step.
   For "everything open from the start" set it to the item count of the world
   (this is what the letter worlds do). Never 0 — the legacy engine treats 0
   as practice-mode init and skips progression bookkeeping.
3. If the world should have a generated background: add `art: {bg: '<asset id>'}`
   and make sure the asset exists in the manifest (§F.4) and CSS (§F.6).
4. Verify: `node tests/adventure_core_test.js` (add a content test), then in
   the browser check the world card, the learn encounter, and one game.

### 6.2 Adding a new mini-game type that works in adventure worlds

1. Build the game as a regular legacy component (follow `GAME_ARCHITECTURE.md`
   §6: extend `BaseGameComponent`, implement `template` + `create()` + a
   checker that calls `updateWeightForKey(this.currentAppId, index, ±1)` and
   wraps continuation in `if (this.reloadProgress())`).
2. Register its route: `{path: '/play/<appType>/:currentAppId', component: X, props: true}`.
3. That's it — adventure compatibility is automatic: an encounter
   `{type: 'game', game: '<appType>'}` resolves to a virtual app, weights are
   world-shared via key normalization, `reloadProgress` returns to the path,
   and `onAdventureAnswer` grants XP. Test it on `#/play/<appType>/adv-colors-1`.
4. Add a Hebrew label to `ADVENTURE_GAME_NAMES` in `adventure.js`.

### 6.3 Adding a new animated companion

1. Find the emoji's codepoint (lowercase hex, no `U+`): 🦄 → `1f984`.
2. Probe availability:
   `node -e "fetch('https://fonts.gstatic.com/s/e/notoemoji/latest/1f984/lottie.json').then(r=>console.log(r.status))"`
   (404 = that emoji has no animation; try a related emoji).
3. Download to `assets/adventure/lottie/<name>.json`, add the mapping in
   `COMPANION_LOTTIE`, add an option (with `level`/`price`) in
   `ADVENTURE_AVATAR_OPTIONS.companion`, add the file to `service-worker.js`.

The same Noto library also has stars, hearts, fireworks, party poppers, food —
usable for reward/celebration effects with the exact same `companion-sprite`
approach (it is not limited to companions).

### 6.4 Generating a sprite (not a background) with transparency

For future item/character art via the same API: request a transparent PNG —
add to the request body:
```json
{ "background": "transparent", "output_format": "png" }
```
and use a subject-focused prompt (single object, centered, no scene) while
KEEPING the style_base palette description so sprites match the backgrounds.

### 6.5 Changing the XP / coin / star tuning

All the knobs live in `adventure.js` as top-level constants:
`ADVENTURE_XP_PER_CORRECT`, `ADVENTURE_XP_PER_LEVEL`, the star thresholds in
`computeSessionStars`, and the coin multiplier in
`getAdventureLevelCompleteRoute`. Change constants only; never inline numbers
at call sites.

---

## 7. Troubleshooting — symptom → cause → fix

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Code changes don't show in the browser | service-worker serving stale cache | bump `CACHE_NAME` version; hard refresh (Ctrl+Shift+R); as a last resort DevTools → Application → Service Workers → Unregister |
| Weights NOT shared between two encounters of a world | id doesn't match `adv-<world>-<n>`, or worldId contains a dash/underscore | check `parseAdventureId(id)` returns non-null in console; fix the id format |
| A world never unlocks | prerequisite world's `completed` flag never written | flag is written in `onAdventureAnswer` only at the all-mastered moment; verify with `getWorldLearningState('<id>')`; set manually to unblock: `setLocalStorage('adv-<id>_completed', true)` |
| "List does not exist" error | `listName` typo, or a virtual list name used without the world existing | virtual lists are `ADV_WORLD:<worldId>` and require the world in `WORLDS` |
| Companion shows as static emoji | lottie lib not loaded (CDN), no mapping in `COMPANION_LOTTIE`, or 404 on the json | check DevTools console/network; the text fallback is by design |
| Login redirect loop / can't reach adventure | `router.beforeEach` order — the `/` → `/adventure` redirect must not bypass the `!username` branch | ensure the username check still runs for adventure targets |
| Question audio doesn't play | browser autoplay policy before first interaction | expected on first load; the action replays on click; don't "fix" with hacks |
| Progress lost after login | Firebase `syncFromCloud`: on conflict THE CLOUD WINS | expected behavior; local unsynced changes made while logged out are overwritten |
| Old progress from before a schema change misbehaves | stale keys in localStorage | per-user reset (see §8); never rename existing keys without a migration |
| Tests fail only in `tests/` but app looks fine | test context stubs (no real browser); or seeding evidence leakage between test sections | read the failing `check` name; respect pitfall §4.4 |

**Multi-profile note:** every storage key is namespaced per local user by
`getKey` (`<key>_<username>_LocalData`). Adventure progress is therefore
per-child automatically — a clean profile for testing is just a new username
on the user screen.

---

## 8. Dev console toolbox (paste into the browser console)

All app functions are globals, so these work as-is on any adventure screen:

```javascript
// where am I, learning-wise
getWorldLearningState('hebrew1');

// inspect the shared weights of a world (learn mode)
JSON.parse(localStorage.getItem(getWeightsKey('adv-hebrew1')));

// grant XP / coins (test the shop & unlock gates)
const p = getAdventurePlayer(); p.xp += 200; p.coins = 500; setLocalStorage('adv_player', p);

// complete a world instantly (unlock the next one)
setLocalStorage('adv-hebrew1_completed', true);

// jump the path pointer
setLocalStorage('adv-hebrew1_encounterPointer', 3);

// full adventure reset for the CURRENT user (legacy data untouched)
Object.keys(localStorage)
  .filter(k => k.includes('adv-') || k.includes('adv_'))
  .forEach(k => localStorage.removeItem(k));
location.reload();

// simulate answers without playing (updates weights, XP, session)
updateWeightForKey('adv-hebrew1-1', 0, -1);  // correct on item 0
updateWeightForKey('adv-hebrew1-1', 0, 1);   // wrong on item 0
```

(The reset snippet bypasses cloud sync on purpose — sign out first, or the
cloud copy will restore the keys on next sync.)

---

## 9. Analytics events (extend when touching these flows)

`gtag` is already wired: `page_view` on navigation, `question_answered` in
`updateWeightForKey`. When implementing phases B/C, fire (guarded by
`typeof gtag === 'function'`, same style as existing code):

| Event | When | Params |
|-------|------|--------|
| `adventure_encounter_completed` | in `getAdventureLevelCompleteRoute` | `world_id`, `encounter_index`, `stars` |
| `adventure_world_completed` | when writing the `_completed` flag | `world_id` |
| `adventure_purchase` | successful shop purchase | `item`, `price` |
| `adventure_onboarded` | end of first-run flow | — |

These four answer the product questions that matter: where children drop off,
which worlds are hard, and whether the coin economy motivates.

---

## 10. Post-launch backlog (do NOT build now; recorded so ideas aren't lost)

Ordered by expected value:

1. **Parent dashboard** — a `/parents` screen: per-world mastery table
   (from `getWorldLearningState` + attempt history), weekly summary.
   Gate it behind a simple adult check (e.g. "type the year you were born").
2. **Per-child difficulty tuning** — expose `setItems`, star thresholds and
   distractor count as a per-user setting (stored via storage.js).
3. **Daily streak & gentle reminders** — a streak counter on the home screen
   (no push notifications; PWA notifications are flaky on iOS).
4. **Letter-writing world upgrade** — `draw_letter` with stroke guidance
   overlays (generated arrow images per letter).
5. **Parent-recorded audio** — let a parent record letter names in their own
   voice (MediaRecorder → base64 in storage) and prefer it over TTS.
6. **More review mechanics** — spaced repetition across days: a "daily
   review" encounter seeded from the weakest items across ALL worlds
   (the evidence-collection code in `worlds.js` §seeding already knows how
   to gather this).
7. **Sound effects variety** — per-world success jingles from the Noto/Lottie
   sound-alike free packs or Pixabay.
8. **Accessibility pass** — font scaling option, high-contrast theme variant,
   full keyboard navigation on desktop.
9. **i18n of UI strings** — extract adventure UI strings to a table if a
   second interface language is ever needed (content is already bilingual).

---

## 11. Glossary

| Term | Meaning |
|------|---------|
| **World** | One body of knowledge (a filtered DATA list) + its encounter path. Defined in `WORLDS`. |
| **Encounter** | One stop on a world's path: `learn` (item presentation), `game` (a mini-game), or `final`. |
| **Encounter id** | `adv-<worldId>-<index>` — what game components receive as `currentAppId`. |
| **Knowledge key** | `adv-<worldId>` — the shared storage namespace all encounters of a world write to. |
| **Weights** | Per-item difficulty array: `-1` locked, `0` mastered, `1..15` practicing (higher = repeats more). |
| **Unlock cycle** | The legacy mechanism that opens the next `setItems` items (or resets a finished level) — in adventure it runs only from `learn` encounters. |
| **Seeding** | First-time world initialization from evidence gathered across all games the child ever played on the same source list. |
| **Pointer** | `adv-<world>_encounterPointer` — index of the furthest encounter the child may enter. |
| **Virtual app** | The app-config object `resolveAdventureApp` fabricates from an encounter id so legacy game components run unmodified. |
| **Guarded hook** | A `typeof`-checked call from legacy code into adventure code; the only allowed coupling pattern. |
| **Atmosphere** | A per-theme visual constants object (colors/lights/textures) used to reskin a game without touching its logic — see `MAZE_ATMOSPHERES`. |
| **Legacy / free mode** | The original menu-driven system, kept fully working at `/free`. |

---

## 12. Design system — tokens and motion rules

Use these values everywhere; never invent new colors or durations inline.
(They match `adventure.css` and the approved unicorn maze skin.)

### 12.1 Color tokens

| Token | Value | Use |
|-------|-------|-----|
| pink | `#ffd9ec` / darker `#ff9ecd` | primary accents, hearts |
| lavender | `#d0bfff` / darker `#b69df5` | secondary accents, magic |
| baby blue | `#a5d8ff` / darker `#8ec9ff` | sky, water |
| mint | `#c0f0c8` / darker `#93dba1` | success, nature |
| cream/gold | `#fff3b0` / `#ffd43b` | rewards, stars, XP fill |
| text | `#3b2d5c` (on light), `#4c3585` (titles) | all adventure text |
| card bg | `rgba(255,255,255,0.92)` | cards over painted backgrounds |
| player gradient | `#845ef7 → #b388ff` | player card |
| screen gradient | `#a5d8ff → #d0bfff → #ffd6e7` (top→bottom) | fallback background |

### 12.2 Shape & spacing

- Corner radius: cards 18px, chips/options 14px, bars 10px. Nothing square.
- Touch targets ≥ 44×44px; option chips are 52×52.
- Content column: `max-width: 620px`, centered — never full-bleed text.
- Shadows: `0 4px 14px rgba(80, 50, 140, 0.18)` (rest), `.28` on hover.

### 12.3 Motion rules

| Animation | Duration | Curve | Class |
|-----------|----------|-------|-------|
| idle bob | 3s loop | ease-in-out | `adv-float` |
| attention pulse | 1.6s loop | ease-in-out | `adv-pulse` |
| entrance pop | 0.45s, stagger 0.08s/item | `cubic-bezier(0.34,1.56,0.64,1)` | `adv-pop` |
| joy bounce | 0.9s loop | ease-in-out | `adv-bounce` |
| oops shake | 0.5s once | ease-in-out | `adv-shake` |
| screen transition | 450ms in/out | ease | (Phase F clouds) |

Rules: exactly ONE pulsing element per screen (the current step / main CTA);
every looping animation must be listed in the `prefers-reduced-motion` block
in `adventure.css`; reactions (bounce/shake) auto-clear within ~1.8s.

---

## 13. Copy & voice guide (Hebrew UI text)

Audience: ages 4–7, reads little or nothing. Every string a child sees must
follow these rules:

1. **Short.** Max ~5 words per bubble/button. One idea per sentence.
2. **Positive, never punishing.** Wrong answer → `כמעט!`, `ננסה שוב 💪`,
   `אני איתך!`. Forbidden: `טעות`, `נכשלת`, `לא נכון` as standalone feedback.
3. **"We" voice from the companion** (`בוא נמשיך`, `יוצאים להרפתקה`) —
   the companion is a friend, not a teacher.
4. **Emoji as icons**: one emoji per string max, at a consistent position.
5. **No niqqud in UI strings** (only content items carry niqqud).
6. Address forms: prefer plural/neutral (`ממשיכים`, `בונים`) over gendered
   singular where natural.

Phrase bank (reuse, don't invent): success — `יש! 🎉`, `מעולה!`,
`איזה אלוף! ⭐`, `עוד אחת!`; encouragement — `כמעט!`, `ננסה שוב 💪`,
`אני איתך!`; navigation — `ממשיכים בהרפתקה ▶`, `חזרה לשביל 🗺️`,
`כאן אנחנו ⭐`; celebration — `כל הכבוד! 🎉`, `העולם הושלם 🏆`.

---

## 14. Pedagogy principles (constraints on future features)

These are product laws, derived from how young children learn:

1. **Audio-first.** A pre-reader must be able to play every encounter by ear.
   Any new question type needs an auto-played audio cue (the `action` in
   `generateFromList` provides this — keep using it).
2. **Small chunks.** 4–5 new items per world; a learn step never introduces
   more than `setItems` items at once.
3. **Errors teach, never punish.** A mistake raises the item's weight (it
   returns more) and triggers a hint — no lives, no time pressure, no lockouts.
4. **Repetition with variety.** The same knowledge across different mini-games
   (that's the whole point of the shared knowledge key). Never test an item
   in only one format.
5. **Visible progress every session.** XP bar, stars, coins — something must
   move within the first 2 minutes of play.
6. **Session length target: 10–15 min.** Don't add mechanics that require
   longer sittings (e.g. unskippable long cutscenes).
7. **Review beats new content.** When in doubt, bias toward review worlds and
   seeding-driven repetition rather than pushing new letters faster.

---

## 15. Complete storage schema (single source of truth)

All keys go through `getKey` → per-user namespacing `<key>_<user>_LocalData`
and cloud sync. `<w>` = worldId.

| Key | Type | Written by | Meaning |
|-----|------|-----------|---------|
| `adv_player` | `{xp, coins}` | `addAdventureXp`, rewards, shop | player economy |
| `adv_avatar` | `{base, color, hat, companion}` | dressing room | avatar layers |
| `adv_owned` | `["hat:👑", ...]` | shop (Phase C) | purchased items |
| `adv_onboarded` | bool | onboarding (Phase A) | first-run done |
| `adv_session` | `{key, correct, wrong}` | `onAdventureAnswer` (Phase B) | current-encounter accuracy |
| `adv_music` | bool | music toggle (Phase G) | music on/off |
| `adv-<w>_completed` | bool | `onAdventureAnswer` | world finished at least once |
| `adv-<w>_encounterPointer` | int | `advanceEncounterPointer` | furthest open encounter |
| `adv-<w>_stars` | `{"<idx>": 1..3}` | reward flow (Phase B) | best stars per encounter |
| `learn_adv-<w>_Weights` | `int[]` | legacy engine | shared item weights (learn mode) |
| `adv-<w>_Progress` | `{progress,total}` | legacy engine | unlocked/total items |
| `adv-<w>_CurrentLevelProgress` | `{progress,total}` | legacy engine | current cycle progress |
| `adv-<w>_new_items` | `int[]` | legacy engine | pending new items for the news screen |
| `adv-<w>_attemptHistory` | `{"<idx>": bool[≤5]}` | `recordAttemptResult` | recent attempts per item |
| `scoreadv-<w>` | int | game components | legacy cumulative score |

Schema-change rule: never rename or repurpose an existing key. Add a new key
and, if needed, one-time-migrate in the reading function (read old → write
new → keep old untouched for legacy).

---

## 16. Extending the test suite

`tests/adventure_core_test.js` loads the REAL production files into a Node
`vm` context with browser stubs. To add tests:

1. Append a numbered section at the end (before the final summary lines):
   ```javascript
   console.log('--- 11. my new feature ---');
   check('describes expected behavior', run(`someGlobalFn('arg')`) === expected, run(`someGlobalFn('arg')`));
   ```
2. `run(code)` evaluates inside the app context; every top-level `function`
   from worlds.js/adventure.js/storage.js is available. Functions from
   tester.js are available only if exported in the "core slice" glue near the
   top of the test file — add `globalThis.myFn=myFn;` there when needed.
3. State manipulation: always via `run("setLocalStorage(...)")` so
   normalization applies. Inspect raw keys via `localStorage._map`.
4. **Isolation rule:** tests share one storage. If your section needs a clean
   world, use a test-only world (`WORLDS.push({...})` with a unique id) —
   see section 7 of the file for the pattern.
5. Components are NOT rendered (Vue is stubbed) — test logic functions, not
   templates. Template behavior is covered by the manual QA checklist.
6. A section that changes activity mode or the signed-in user must restore it
   (see the end of section 8 there).

---

## 17. Device support & performance budgets

| Target | Priority | Known quirks |
|--------|----------|--------------|
| Android tablet, Chrome | P0 (the child's device) | TTS Hebrew voice varies by device — always test audio there |
| Desktop Chrome/Edge | P0 (development, parents) | — |
| iPad/iPhone Safari | P1 | Web Speech Hebrew voices limited; PWA install quirks; test WebGL (maze) pixel ratio |
| Firefox | P2 | SpeechRecognition (`s2t`) unsupported — that game already feature-detects |

Budgets (check when adding assets):
- Generated art: ≤ 400KB per background (re-export/resize if larger);
  total art payload ≤ 5MB.
- Lottie: ≤ 300KB per file; max 2 simultaneously animating players per screen.
- 3D games already cap `devicePixelRatio` at 1.5 on touch — keep that pattern.
- First-load (no cache) on fast-3G should reach the home screen in < 8s;
  everything repeat-visit comes from the service-worker cache.

---

## 18. Decision log (why things are the way they are — don't relitigate)

| Decision | Rationale |
|----------|-----------|
| Knowledge is per-world, not global-per-item | keeps the legacy weights engine untouched; cross-world transfer handled by seeding at init, which proved sufficient |
| Seeding difficulty = `max(weight/15, failRate)` | the strongest struggle signal should win; conservative toward more practice |
| All letters of a letter-world open at once | user playtest feedback: partial unlocks inside a 5-letter world felt confusing; the world IS the chunk |
| Unlock cycles only in `learn` encounters | user-reported bug: replaying a step kept unlocking new letters |
| Guided worlds replace menus as default (menus at `/free`) | product goal: a child navigates alone; menus are a parent tool |
| Companions = Noto Animated Emoji, not hand-built SVG | user decision: professional free animations over custom-built |
| Unicorn styling keyed off the THEME picker (not the adventure) | user request: the style system already exists; adventure defaults to it but themes stay user-choosable |
| No build system, plain script files | matches the existing codebase; enables the guarded-hook coexistence strategy |
| Images via OpenAI `gpt-image-2`, committed to git | reproducible via manifest prompts; no runtime API dependency for players |

---

## 19. Suggested milestones & effort estimates

Rough sizes for one competent agent-session each (a session ≈ a few hours of
focused work). Order matches §2.

| Milestone | Phases | Size | Demo at the end |
|-----------|--------|------|-----------------|
| M1 "ילד נכנס ומשחק" | A | S | fresh profile → onboarding → playing hebrew1, menus at `/free` |
| M2 "מרגיש כמו משחק" | B + C | M | stars/coins after an encounter, first shop purchase |
| M3 "מגוון אמיתי" | D | M–L | full path variety, all games pastel under unicorn |
| M4 "מסע ארוך" | E | S | nikud + ABC + numbers worlds playable |
| M5 "יפהפה" | F | M | generated backgrounds + cloud transitions (needs user approval of first image) |
| M6 "חי ונושם" | G + H | S–M | music + tablet-ready + full QA checklist green |

After every milestone: run the QA checklist relevant rows, commit, and show
the user a 3-line summary + what to test in the browser.
