# New game workflow

Use this workflow for a new `appType`. For a new list or another registration of
an existing game, use [HOW_TO_ADD_GAMES.md](HOW_TO_ADD_GAMES.md) instead.

## 1. Read and frame the work

- Read [AGENTS.md](AGENTS.md), the game specification,
  [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md),
  [GAME_TECH_GUIDE.md](GAME_TECH_GUIDE.md), and
  [GAME_STYLE_GUIDE.md](GAME_STYLE_GUIDE.md).
- Decide whether the request is content-only, a skin/variant of an existing
  component, or a genuinely new game type.
- Record the immutable identifiers: `appType`, display name, data list and field
  mapping, legacy location, Adventure worlds, and supported modes.
- Inspect the current working tree before editing. Do not absorb unrelated work.

**Output:** a completed [NEW_GAME_TEMPLATE.md](NEW_GAME_TEMPLATE.md), or an
equivalent approved specification, with unresolved blockers made explicit.

## 2. Review the smallest useful set of references

Start from `MCQComponent` for question creation and answer lifecycle. Then inspect
one game that matches the new interaction, not every game:

- content-only: the same `appType` in `apps.js`;
- conventional round-based game: the nearest component in `tester.js`;
- substantial standalone DOM/CSS game: `games/water-pipeline.js` and its CSS;
- Adventure integration: one current `worlds.js` encounter plus
  `resolveAdventureApp` and the Adventure tests.

Trace the reference from registration to route, question creation, correct and
incorrect reporting, `reloadProgress()`, destruction, and tests. Verify current
theme keys directly in `themes.js`.

**Output:** named reference component/files and a short list of contracts to
reuse. Do not copy its visual premise or incidental bugs.

## 3. Design before implementation

Define:

- a beat-by-beat opening, repeatable gameplay loop, retries, progression, stage
  completion, and ending;
- explicit game states and the event allowed to leave each state;
- the question boundary: when `generateFromList` runs and when input is accepted;
- exact once-only correct/incorrect effects and cleanup rules;
- rendering technology per element, responsive framing, RTL/LTR behavior,
  reduced motion, and all-theme adaptation;
- data-driven level/entity configuration and, for long scenes, the active
  rendering window and reconstruction state;
- automated tests and browser-QA cases.

Prefer one complete, polished loop over broad incomplete content. Resolve routine
choices using the policy in `AGENTS.md`; do not turn equivalent options into user
questions.

**Output:** an implementation-ready design with file responsibilities and risks.

## 4. Build a vertical slice

Implement the narrowest end-to-end path that proves the architecture:

1. add the dedicated component/style files when warranted;
2. load them in dependency order;
3. register one legacy app and/or one Adventure encounter as scoped;
4. add the route;
5. generate one question through the shared engine;
6. exercise correct, incorrect, retry, progress, and completion paths;
7. destroy the component during active animation and verify cleanup.

Use existing storage and theme APIs. Keep visual state separate from learning
state, and keep content/configuration separate from behavior. Add contract tests
as the slice is built rather than after it stabilizes.

**Gate:** do not expand content until the full learning lifecycle works in both
registration modes that the game promises to support.

## 5. Expand and polish

- Add the remaining small amount of content through configuration.
- Establish composition, depth, silhouettes, ambience, transitions, feedback,
  and a satisfying ending using [GAME_STYLE_GUIDE.md](GAME_STYLE_GUIDE.md).
- Test every current `themeOptions` key; centralize motif differences in one
  adapter and keep palette values derived from the global theme.
- Tune portrait, landscape, desktop, resize, keyboard, touch, focus, RTL/LTR,
  long content, low-height screens, and `prefers-reduced-motion`.
- Profile rendered node count and active animation. Pause or recycle off-screen
  work and avoid layout-driven animation loops.

**Gate:** the game should read as a coherent game scene at rest and in motion,
not as a decorated quiz page.

## 6. Test and harden

- Syntax-check changed JavaScript.
- Add a focused `tests/<game>_test.js` for factories/configuration, answer
  idempotency, lifecycle, registrations, routing, themes, cleanup, and any
  segment/recycling logic.
- Run the focused test and `node tests/adventure_core_test.js`. Treat test counts
  in older plans as historical; success is the current suite reporting zero
  failures.
- Test stale callbacks, rapid repeated input, route navigation mid-animation,
  stage/list completion, virtual lists, missing optional browser APIs, and resize.
- Browser-QA the exact legacy and Adventure URLs, checking console errors and
  persisted progress after reload.

Fix issues found; do not merely list avoidable polish defects as limitations.

## 7. Final integration and handoff

- Ensure all browser-loaded files are in `index.html` and the service-worker
  asset list, and bump `CACHE_NAME` after browser-delivered JS/CSS/HTML changes.
- Confirm existing `apps.js` entries were not reordered and legacy routes still
  work. Confirm Adventure completion returns to the correct world path.
- Complete [GAME_CHECKLIST.md](GAME_CHECKLIST.md), run `git diff --check`, and
  review the diff for secrets and unrelated files.
- Report decisions, files changed, exact commands and test counts, browser QA,
  and only genuine remaining limitations. Do not claim QA that was not run.

**Output:** a reviewable working tree whose game is complete by the definition in
`AGENTS.md`.
