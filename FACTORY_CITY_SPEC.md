# Factory City specification

## 1. Identity and scope

- **Game name:** עיר המפעל / Factory City
- **Internal `appType`:** `factory_city`
- **Fantasy:** start with one control yard on open land, then continually produce,
  stock, sell, hire, and extend a lively industrial town into the surrounding area.
- **Learners and input:** children using touch, mouse, or keyboard.
- **Registration:** legacy menu only. Adventure registration is not in scope.
- **Vertical slice:** a procedurally tiled isometric plane, eight three-tier
  building locations, four worker hires, one production/storage/sales loop, and
  the existing 23-project engine-owned progression plan.
- **Out of scope:** survival meters, combat, copying another game's map, UI,
  characters, names, progression, or authored art.
- **References:** `MCQComponent` for accepted-answer behavior and
  `games/factory-tycoon.js` for the existing dual tech-tree/quiz convention.

## 2. Learning mechanic

- `FACTORY_CITY_UPGRADES` is the engine-owned project/unlock list. Chapter 4
  English content is requested from the configured `quizListName` fields.
- The next question is generated only when an affordable unlocked project is
  selected. The generated prompt, options, result, action, and source index are
  kept together for that attempt.
- A correct quiz answer is reported once on `<appId>_quiz`; the project is then
  purchased, reported once on the main app key, scored, saved, and followed by
  `reloadProgress()`. Continuation stops if it returns `false`.
- A wrong quiz answer is reported once, applies the existing score floor/save
  behavior, calls `reloadProgress()`, shows contained feedback, and unlocks the
  same question for retry. It never silently generates a replacement question.
- Cancelling a question makes no learning or purchase change.
- Selection, distractors, mastery weights, unlock batches, score persistence,
  and completion routing remain owned by the shared engine and storage wrappers.

## 3. Player journey

The opening frame shows one control yard, open land, and a visible next project.
There is deliberately no production progress bar: the first factory starts a real
visible cycle in the world. Kenney conveyor modules carry moving Kenney crates,
workers move between stations, stock stacks beside the warehouse, industrial
tanks/magnets/service structures accumulate around upgrades, and a delivery truck drives toward the market or beyond the current
edge. Once commerce opens, customers walk in with purchase bubbles. Behind those
animations, workers make
goods, the warehouse caps stock, commercial buildings determine how much is sold,
and each sale funds the next building or hire. Every unlocked batch reveals a new
plot and connecting road farther from the control yard, while moving workers,
smoke, carts, stock, and sale feedback make the chain visible. The player selects
a plot or the current project, answers its question, and sees the building appear,
grow, or a new worker join. Incorrect answers identify the answer and invite a
retry without closing the project. The town remains reconstructable from purchased
project indices and stored goods. On final mastery,
`reloadProgress()` owns the normal application completion route.

## 4. State machine

| State | Input | Exit |
|---|---|---|
| `ready` | pan, zoom, select project | selection → `selected`; approval → `question` |
| `selected` | pan, zoom, change/close selection, approve | approval → `question`; close → `ready` |
| `question` | one answer or cancel | answer → `feedback`; cancel → `selected` |
| `feedback` | none | correct → `building`; wrong → same `question` |
| `building` | none | transaction and progress reload → `selected` or engine route |
| `destroyed` | none | terminal |

An attempt lock, phase check, monotonically changing question token, route check,
and destroyed flag protect against duplicate input and stale callbacks.

## 5. World and rendering

- Lightweight configuration describes eight destinations, upgrade tiers,
  decorations, roles in the economy, and worker routes.
- Canvas generates only the terrain tiles visible through the current camera and
  renders local Kenney CC0 sprites, new roads as projects unlock, shadows, smoke,
  workers, and shipment ambience. Semantic DOM renders all text and controls.
- Sprite bounds are retained each frame so visible buildings, rather than only
  their hidden grid centers, are tappable.
- The plane has no visible island edge; terrain is procedurally extended as the
  camera moves, while the renderer still culls everything outside the viewport.
- The camera supports drag, pinch/wheel zoom, reset-to-fit, and resize.

## 6. Themes

Every current `themeOptions` key is supported through one adapter:
`base`, `soldiers`, `unicorn`, `space`, `dark`, and `code`. Palette values come
from the selected global theme; centralized motif metadata controls the district
name, lighting, panel treatment, pavement, smoke, and ambient accents. Unknown
keys fall back to `base`. Theme choice never changes learning or hitboxes.

## 7. Accessibility and responsive behavior

- Controls are semantic buttons with at least 42px targets and visible focus.
- A screen-reader-only building navigator mirrors every canvas plot.
- Question feedback uses text and shape in addition to color; the live region
  announces purchases, deliveries, and retry state.
- Hebrew UI remains RTL while English prompts retain LTR direction.
- `prefers-reduced-motion` removes pulse, travel, bounce, and sheet animation but
  preserves production timing and static status cues.
- On desktop, details are a floating card. On portrait mobile they become a
  bottom sheet; on low-height screens secondary copy collapses and question
  content scrolls without covering the primary controls.

## 8. Performance and lifecycle

- One capped canvas RAF renders the visible tile window, unlocked plots,
  decorations, and a small worker pool. Motion uses canvas transforms/opacity.
- The component owns the RAF, income interval, feedback timers, resize,
  visibility, pointer, wheel, and media-query listeners.
- Destruction invalidates the question token first, cancels every owned handle,
  removes all listeners, resolves any pending approval safely, and saves money.

## 9. Files and validation

- `games/factory-city.js` — state, learning adapter, renderer, theme adapter.
- `games/factory-city.css` — scoped responsive UI and theme variables.
- `tests/factory_city_test.js` — configuration, economy, themes, state, retry,
  exact-once transaction, cleanup contracts, registration.
- Existing integrations in `data.js`, `apps.js`, `index.html`, `tester.js`,
  `service-worker.js`, `ASSET_LICENSES.md`, and local `assets/factory-city/` remain.
- Validate syntax, focused tests, Adventure core regression, route registration,
  every theme, desktop/mobile, RTL/LTR, reduced motion, retry, reload, resize,
  navigation during feedback, console output, cache assets, and final diff.
