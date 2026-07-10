# Developer entry point

This is a build-free Vue 2 learning SPA. Browser files are loaded directly by
`index.html`; there is no module loader, compile step, or server API. `data.js`
contains learning content, `apps.js` the legacy menu, `worlds.js` Adventure
content and virtual apps, `tester.js` the learning engine/components/router,
`storage.js` persistence, and `themes.js` the authoritative theme registry.

## Read before changing a game

1. Read this file.
2. Read the approved game specification. If none exists, fill in
   [NEW_GAME_TEMPLATE.md](NEW_GAME_TEMPLATE.md).
3. Follow [NEW_GAME_WORKFLOW.md](NEW_GAME_WORKFLOW.md).
4. Read [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md) for the learning-engine
   contract, then [GAME_TECH_GUIDE.md](GAME_TECH_GUIDE.md) and
   [GAME_STYLE_GUIDE.md](GAME_STYLE_GUIDE.md).
5. Use [GAME_CHECKLIST.md](GAME_CHECKLIST.md) throughout implementation.
6. Read [HOW_TO_ADD_GAMES.md](HOW_TO_ADD_GAMES.md) only when adding content to
   an existing game type.

Current source and tests outrank documentation. `ADVENTURE_*` documents are
product/design history, not the current implementation contract; consult them
only for the context named in each document.

## Non-negotiable architecture

- Preserve the static, ordered script-loading architecture. Do not introduce a
  bundler, framework, runtime dependency, or external asset service without a
  demonstrated blocker.
- Reuse an existing `appType` when only content changes. A substantial new game
  should use dedicated `games/<slug>.js` and `games/<slug>.css` files, loaded in
  `index.html` before `tester.js`, instantiated after `BaseGameComponent` exists,
  and registered in the router.
- Treat `BaseGameComponent`, `generateFromList`, weight/progress helpers, score
  helpers, `reloadProgress()`, and `storage.js` as the learning engine. Games
  present questions and feedback; they do not select curriculum, score,
  unlock, persist, or complete stages independently.
- Accept one answer once. Report it once with `updateWeightForKey`; update and
  save score using the existing lifecycle; call `reloadProgress()` in the same
  places as `MCQComponent`; stop when it returns `false`.
- Never access learning persistence with raw `localStorage`. Use the wrappers in
  `storage.js` so user namespacing, Adventure normalization, and cloud sync work.
- Legacy IDs are menu-index paths and storage namespaces. Do not reorder existing
  `apps.js` entries. Append safely unless migration is explicitly in scope.
- Adventure encounters are virtual apps (`adv-<world>-<encounter>`). Resolve them
  through existing helpers and keep legacy behavior unchanged. Register a game
  in `worlds.js` only when Adventure support is required.
- `themes.js` is the sole theme registry. Support every key currently present in
  `themeOptions`; derive a centralized game adapter from its palette. Do not
  create a parallel global theme system or scatter theme-name branches.

## Lifecycle, quality, and safety

- Every timer, animation frame, listener, observer, media object, and async
  callback must have an owner and be cancelled or invalidated on destruction.
  Guard delayed work against duplicate input, route changes, and stale instances.
- Render only what can affect the current view. Pause off-screen animation;
  segment or recycle long worlds. Prefer CSS transforms/opacity for motion.
- Games must work with keyboard and touch, visible focus, semantic controls,
  RTL Hebrew and LTR English, reduced motion, mobile portrait/landscape, desktop,
  and resize/orientation changes. Preserve readable contrast in every theme.
- Make autonomous, reversible decisions that match existing patterns. Prefer the
  simplest maintainable option and preserve behavior. Ask only when a choice is
  irreversible or risks data loss, no safe default exists, and a wrong choice
  would require major rework.
- Preserve unrelated working-tree changes and secrets. Never place credentials
  in source, Markdown, tests, or commits.

## Validation and definition of done

Before handoff, complete [GAME_CHECKLIST.md](GAME_CHECKLIST.md). At minimum:

- syntax-check every changed JavaScript file;
- run `node tests/adventure_core_test.js` and all game-specific tests;
- verify legacy and Adventure routes/registrations as applicable;
- browser-QA the actual route in all current themes, both directions, reduced
  motion, representative desktop/mobile sizes, retry, completion, and navigation
  during animation;
- add every new browser asset to `index.html` and `service-worker.js`, then bump
  `CACHE_NAME` for any browser-delivered JS/CSS/HTML change;
- run `git diff --check` and review the final diff for unrelated changes.

A game is done only when its full learning loop, completion routing, persistence,
cleanup, accessibility, responsive layout, theme coverage, automated tests, and
browser polish all pass without regressing legacy mode or Adventure mode.
