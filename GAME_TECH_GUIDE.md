# Game technical guide

This is the reusable technical architecture for learning games in this
repository. For the engine’s detailed data, weight, score, and progress semantics,
read [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md). Current source and tests are
authoritative when they differ from old plans.

## 1. Runtime boundaries

The application is a static Vue 2 SPA. Scripts share browser globals and load in
the order declared in `index.html`; there are no ES modules, package build, or
runtime server endpoints. The effective dependency direction is:

```text
data/apps/world definitions → themes/storage/helpers → game factories
→ tester.js engine and BaseGameComponent → component instantiation → router
```

Keep new code compatible with direct `<script>` loading and the Node VM-based
tests. Do not add a bundler or dependency to obtain ordinary scene, animation,
state-machine, or testing behavior.

## 2. Choose the smallest architecture

### Reuse an existing game type

Use this when only content, labels, field mapping, or `setItems` changes. Add
`DATA` and registration; do not fork a component. See
[HOW_TO_ADD_GAMES.md](HOW_TO_ADD_GAMES.md).

### Add a compact component to `tester.js`

This remains compatible with older games, but is suitable only for a genuinely
small component that depends heavily on nearby globals and does not bring a
substantial template, configuration model, or style surface.

### Add a dedicated game

This is the default for a substantial new game:

- `games/<slug>.js` exposes a guarded global factory such as
  `create<Game>Component(BaseGameComponent)`;
- `games/<slug>.css` owns selectors under a unique game root prefix;
- `index.html` loads both, with the JavaScript before `tester.js`;
- `tester.js` calls the factory after `BaseGameComponent` is defined and adds the
  route only when the component exists;
- `tests/<slug>_test.js` loads the factory in an isolated VM and tests its public
  contracts.

`games/water-pipeline.js` is the current reference for this load-order bridge.
The pattern—not its game-specific state or visuals—is reusable.

## 3. Component responsibilities

Keep five concerns distinct even if a small game stores them in one file:

1. **Learning adapter:** reads `currentApp`, requests a generated question, and
   performs the accepted-answer transaction.
2. **Game state machine:** decides which input and transition is legal now.
3. **Configuration:** describes levels, rounds, segments, actors, obstacle types,
   timings, and theme-neutral behavior.
4. **Render components/helpers:** turn current state/config into scene, controls,
   and effects without changing learning progress.
5. **Lifecycle owner:** starts and cancels timers, RAF, listeners, observers,
   media, and delayed callbacks.

Avoid hiding progress updates in render helpers or letting animation callbacks
select questions. A render object may request a state-machine event; the state
machine owns the transition.

## 4. Learning-engine contract

### Resolve the app

`BaseGameComponent.created()` reads `currentAppId` from the route and resolves
`currentApp` through `getItemById(apps, id)`. That helper returns either a legacy
menu entry or an Adventure virtual app. Game code must work with both shapes and
must not parse menu indexes itself.

### Generate a round

Call:

```text
generateFromList(listName, questionIndex, resultIndex, currentAppId,
                 getSetItems(currentApp), questionType)
```

The returned object contains rendered `question`, `options`, the rendered correct
`result`, an optional presentation `action`, and the source `questionIndex`.
Generate at the gameplay boundary where a new question is needed, not in bulk,
unless an approved specification explicitly requires otherwise.

Do not choose items, build distractors, maintain independent mastery, or cache a
future curriculum. The engine’s weighted selection must see the latest result.

### Accept an answer exactly once

Follow `MCQComponent` as the lifecycle reference. At the instant an answer is
accepted, lock input and bind the attempt to the current round/token.

For a correct answer:

1. report `updateWeightForKey(currentAppId, questionIndex, -1)` once;
2. update the in-memory score;
3. call `reloadProgress()`;
4. if it returns `true`, save score and schedule/enter the next game beat;
5. if it returns `false`, stop: the engine has routed to new-item display,
   legacy app completion, or Adventure completion.

For an incorrect answer:

1. apply the existing score floor and save behavior;
2. report `updateWeightForKey(currentAppId, questionIndex, 1)` once;
3. show retry feedback;
4. call `reloadProgress()` and obey any navigation;
5. unlock retry only after feedback, without unintentionally replacing the
   question.

Presentation may delay the next visible beat, but it must not defer the accepted
learning transaction so long that navigation or destruction can lose it. Do not
replace or bypass `reloadProgress()` to keep a cinematic alive.

### Persistence ownership

Use `getLocalStorage`/`setLocalStorage` and existing score/progress/weight helpers.
These wrappers namespace by user, normalize Adventure world knowledge, and invoke
optional Firebase sync. Raw `localStorage` is not a game persistence API.

Game-specific reconstruction state may be stored only when it is genuinely
needed and must still use the wrappers. Prefer deriving visual completion from
the engine’s progress/round configuration rather than creating a parallel save.

## 5. Legacy and Adventure integration

Legacy app IDs are positional paths through `apps.js` and double as storage
namespaces. Reordering existing siblings changes IDs and disconnects saved
progress. Append registrations where possible; any reorder requires an explicit
migration decision.

Adventure uses virtual IDs shaped `adv-<worldId>-<encounterIndex>`. `worlds.js`:

- defines encounters and their game `appType`;
- exposes a virtual list name and maps it to world items;
- resolves the ID to an app-shaped object;
- normalizes encounters of a world to shared learning knowledge.

Games should only consume the resolved `currentApp`. They must not create a
separate Adventure component, score, weight store, or route. Completion remains
owned by the guarded Adventure hook called from `reloadProgress()`. Unknown or
legacy IDs must preserve normal legacy behavior.

World IDs have storage/routing constraints defined in `worlds.js`; copy a current
world definition and tests rather than inferring a new ID grammar from display
names.

## 6. State machines and async safety

Use named states for any game with transitions, animation, or asynchronous work.
A useful generic sequence is:

```text
loading → opening → preparing-round → waiting-for-answer
→ answer-feedback → world-reaction → preparing-round
→ ending → completed
```

Games may add travel, camera, restoration, pause, or segment states. For every
state, define its entry event, owned resources, legal input, and single exit
event. Do not infer completion from arbitrary timeout order.

Use three layers of protection:

- an input/attempt lock prevents repeated clicks from accepting twice;
- a monotonically increasing run or transition token makes delayed callbacks
  stale when a new round/state begins;
- a destroyed/route validity guard prevents callbacks from mutating an instance
  after navigation.

Timeouts should dispatch a state event, not directly perform unrelated later
steps. Animation end events need a timeout/reduced-motion fallback. Route changes
and destruction invalidate all tokens before cleanup.

## 7. Rendering technology

Choose per element:

- **DOM:** semantic controls, text, questions, answer options, accessible status,
  HUD, and objects whose state is naturally represented by classes.
- **CSS:** layout, depth layers, transforms, opacity, material treatment, simple
  shapes, ambient loops, transitions, and theme variables.
- **Inline/local SVG:** scalable authored silhouettes, paths, masks, gauges, and
  small illustrations that benefit from vector geometry. Keep interactive text
  and primary controls in semantic DOM where practical.
- **Canvas:** only when many transient particles/sprites or pixel operations make
  DOM/SVG measurably unsuitable. It requires explicit sizing, DPR limits,
  accessibility equivalents, pause, resize, and teardown. It is not the default.

Do not force an entire game into one technology. Avoid one enormous SVG, giant
DOM tree, base64 art dump, or network-fetched runtime art. Prefer procedural
CSS/local SVG and existing licensed assets. New local assets need provenance when
their license requires it.

Animate transforms and opacity where possible. Batch reads before writes; do not
measure layout every frame. Keep visual time derived from one state clock or a
small number of owned loops rather than many unrelated intervals.

## 8. Segment-based worlds

Long or side-scrolling levels should exist fully as lightweight configuration,
not fully rendered nodes. A segment manager normally retains:

- the active segment;
- the next segment prepared before it enters view;
- optionally the previous segment for continuity;
- no detailed distant segments.

Each segment config needs a stable ID/type, dimensions or logical length,
entry/exit anchors, render data, theme motif keys, interactive entities, and
reconstruction keys. Adjacent anchors share a coordinate/visual contract so
paths, pipes, tracks, terrain, or backgrounds join without seams.

Persist logical facts such as `completed`, `collected`, or `restored`, not DOM
nodes or animation frames. Reconstruct a recycled segment from configuration plus
those facts. Pause off-screen ambience and media; cap particles and active entity
count. Resize recomputes projection/framing from logical coordinates rather than
mutating saved state.

## 9. Reusable behavior and data-driven visuals

Separate generic behavior from interchangeable visual types. Examples include an
obstacle protocol, target protocol, actor controller, segment renderer, or
feedback emitter. A visual type supplies geometry/classes/motifs and animation
parameters; it does not duplicate answer reporting or progression.

Configuration should be declarative and serializable where practical. Prefer:

- stable type keys instead of component-name conditionals;
- shared defaults merged with small level overrides;
- explicit entry/exit anchors and event names;
- version-tolerant optional fields with safe fallbacks;
- validation helpers tested in Node.

Do not turn configuration into an embedded programming language or store Vue/DOM
instances inside it.

## 10. Theme adapters

`themes.js` and `themeOptions` are authoritative. At the time of writing the keys
are `base`, `soldiers`, `unicorn`, `space`, `dark`, and `code`; code must enumerate
the object rather than rely on that sentence staying current.

A game adapter should accept the selected theme/palette and return one normalized
game kit: CSS custom properties plus motif/material/particle/lighting identifiers.
Keep fallback behavior for an unknown key, normally using `base` or the current
palette. Palette values come from `themeOptions`; motif metadata belongs to the
game. Templates and state logic consume the normalized kit and should not contain
repeated `if (theme === ...)` checks.

Theme changes affect presentation only. They must not alter question selection,
answer equality, progress, hitboxes, timing required for success, or stored keys.

## 11. Lifecycle and cleanup

Create one resource registry or equally explicit ownership convention. Track:

- `setTimeout`/`setInterval` handles;
- `requestAnimationFrame` handles;
- window/document/element listeners;
- resize/intersection/mutation observers;
- Web Animations, audio, speech, and optional browser APIs;
- promises/callbacks that cannot be cancelled but can be invalidated.

Cleanup is idempotent and runs from the Vue destruction hook. It invalidates the
run token first, then cancels work, removes listeners/observers, stops media and
speech owned by the game, releases references, and prevents new work from being
scheduled. Do not remove global/shared listeners or stop media the game does not
own.

`BaseGameComponent.created()` calls the game’s `create()` before its DOM is
mounted. Components that need element measurements must make `create()` safe
before mount and defer DOM initialization to `mounted`/`$nextTick`.

## 12. Performance expectations

- Keep rendered complexity bounded by the visible scene, not total level length.
- Stop off-screen animation and background timers when the route is inactive.
- Cap particles and reuse short-lived objects only when it simplifies allocation.
- Avoid layout reads inside animation frames and large reactive objects changing
  every frame; visual transforms may be updated directly under one owned loop.
- Recalculate viewport-dependent constants on resize/orientation change and
  debounce expensive work.
- Test representative low-height mobile layouts, not just device width.
- Prefer graceful simplification over dropping input responsiveness.

Performance optimizations must preserve reduced-motion, completion callbacks,
and reconstruction correctness.

## 13. Accessibility architecture

The visual scene does not replace accessible interaction. Questions and answers
remain semantic, focusable DOM controls with a stable order and visible focus.
Expose outcome/status text appropriately without repeatedly announcing ambient
decoration. Do not make hover, color, sound, drag precision, or motion the only
way to understand or operate the game.

Direction is content-aware: support RTL Hebrew and LTR English without mirroring
meaningful symbols or numerical content blindly. Reduced-motion is a state-machine
mode: transitions resolve quickly and deterministically with equivalent cues.

## 14. Testing strategy

Tests should protect contracts, not source formatting or accidental array
positions.

### Pure and factory tests

Load the dedicated file in a VM with minimal stubs. Test configuration validation,
theme adapter output/fallback, state transitions, reconstruction, bounded segment
windows, and cleanup registries independently from a browser.

### Learning lifecycle tests

Stub `generateFromList`, `updateWeightForKey`, score helpers, and
`reloadProgress`. Assert each accepted correct/incorrect attempt reports once,
retry keeps the intended question, `false` completion stops continuation, and
destroyed/stale callbacks do nothing.

### Integration tests

Load current `data.js`, `apps.js`, `worlds.js`, and relevant engine helpers. Find
registration by semantic fields (`appType`, name/list, world/encounter), not a
fragile numeric location. Assert the route exists, virtual Adventure app resolves,
virtual list generates questions, legacy resolution still works, and all current
theme keys produce usable presentation.

### Browser QA

Automated VM tests cannot validate layout, focus, audio policies, compositor
performance, or visual timing. Exercise real legacy and Adventure URLs through
correct, incorrect/retry, completion, reload, route-away, resize, every theme,
RTL/LTR, keyboard/touch, mobile/desktop, and reduced motion. Record what was
actually tested.

Always run the current Adventure core suite and focused game suite with zero
failures. Counts printed in planning documents become stale and are not an
acceptance criterion.

## 15. Delivery integration

Every browser-delivered file must appear in `index.html` and, when needed offline,
the `CORE_ASSETS` list in `service-worker.js`. Because the service worker is
cache-first, bump `CACHE_NAME` after any delivered JS/CSS/HTML change or clients
may keep old behavior.

Before handoff, syntax-check changed JS, run all relevant tests, complete browser
QA, run `git diff --check`, and inspect the final diff for unrelated files,
credentials, debug artifacts, and undocumented limitations. Use
[GAME_CHECKLIST.md](GAME_CHECKLIST.md) as the release gate.
