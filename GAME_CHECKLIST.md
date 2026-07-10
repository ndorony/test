# Game implementation checklist

Copy this checklist into the task notes and keep it current. “Not applicable”
items should include a reason.

## Documentation and scope

- [ ] Read `AGENTS.md` and the approved game specification.
- [ ] Read `GAME_ARCHITECTURE.md`, `GAME_TECH_GUIDE.md`, and
      `GAME_STYLE_GUIDE.md`.
- [ ] Confirm whether this is content-only, an existing-game variant, or a new
      `appType`.
- [ ] Record the stable `appType`, names, list/field mapping, `setItems`, modes,
      registrations, and explicit non-goals.
- [ ] Inspect the working tree and identify unrelated changes to preserve.
- [ ] Select one lifecycle reference and one interaction/rendering reference.

## Design

- [ ] Define opening, full gameplay loop, correct/incorrect retry, progression,
      completion, ending, and replay behavior.
- [ ] Define an explicit state machine and event-driven transitions.
- [ ] Define rendering technology per element and responsive compositions.
- [ ] Define data-driven configuration and extension points.
- [ ] Define accessibility, reduced-motion, RTL/LTR, cleanup, and test behavior.
- [ ] For a long world, define active/prepared/retained content and reconstruction
      state; distant content is not kept fully rendered.

## Learning engine

- [ ] Extend/reuse `BaseGameComponent` unless a documented technical blocker
      requires a compatible adapter.
- [ ] Generate questions with `generateFromList` using the current app definition.
- [ ] Use the returned `question`, `options`, `result`, `action`, and
      `questionIndex`; do not create curriculum selection.
- [ ] Lock each accepted attempt so correct is reported exactly once.
- [ ] Report correct with `updateWeightForKey(currentAppId, questionIndex, -1)`
      exactly once.
- [ ] Update score, call `reloadProgress()`, save score, and continue only if its
      return value permits it, following `MCQComponent`.
- [ ] Report each accepted incorrect attempt with
      `updateWeightForKey(currentAppId, questionIndex, 1)` exactly once.
- [ ] Apply the existing incorrect-score/reload lifecycle and support retry without
      generating an unintended replacement question.
- [ ] Verify new-item display, progressive unlocking, stage/list completion, and
      activity modes remain engine-owned.
- [ ] Use `storage.js` wrappers; no new raw learning-state `localStorage` access.

## Registration and routing

- [ ] Add the legacy `apps.js` registration if scoped.
- [ ] Append without reordering existing legacy entries/storage IDs.
- [ ] Add the Adventure `worlds.js` encounter if scoped.
- [ ] Verify `adv-<world>-<encounter>` resolves to the correct virtual app and
      shared virtual list.
- [ ] Add `/play/<appType>/:currentAppId` to the router.
- [ ] Keep optional/dedicated component integration guarded so unrelated routes
      still initialize.
- [ ] Verify direct legacy and Adventure URLs and both completion destinations.

## Files and delivery

- [ ] Put a substantial game in dedicated `games/<slug>.js` and `.css` files.
- [ ] Load CSS and JavaScript from `index.html` in valid dependency order.
- [ ] Add every new browser-loaded asset to `service-worker.js`.
- [ ] Bump `CACHE_NAME` after browser-delivered JS/CSS/HTML changes.
- [ ] Do not add a framework, bundler, dependency, network asset, or secret.

## Themes and visual quality

- [ ] Read the current keys from `themeOptions`; support all of them.
- [ ] Derive palette values from `themeOptions` through one game theme adapter.
- [ ] Keep theme-specific motifs/materials centralized, not scattered branches.
- [ ] Verify contrast, focus, feedback, and readability in every light/dark theme.
- [ ] Establish a clear focal point, foreground/midground/background depth, strong
      silhouettes, color hierarchy, and intentional typography.
- [ ] Add restrained ambient life so inactive moments do not feel frozen.
- [ ] Polish opening, transitions, correct/incorrect reactions, progression, and
      ending as one visual language.
- [ ] Check animation timing, easing, interruption, and reduced-motion equivalents.
- [ ] Ensure the scene reads as a game rather than a webpage with quiz cards.

## Responsive and accessibility

- [ ] Use semantic interactive elements with visible keyboard focus.
- [ ] Verify keyboard-only operation and logical focus order.
- [ ] Verify touch targets and rapid/multi-touch input guards.
- [ ] Verify Hebrew RTL and English LTR content, including mixed text.
- [ ] Verify long questions/answers, zoom, and readable contrast over motion.
- [ ] Provide non-color and non-audio feedback for outcomes.
- [ ] Respect `prefers-reduced-motion` and avoid essential information in motion.
- [ ] Test mobile portrait, mobile landscape/low height, tablet, and desktop.
- [ ] Handle resize/orientation changes during every important state.

## Lifecycle and performance

- [ ] Every timer, RAF, listener, observer, media object, and async callback has a
      single owner and cleanup path.
- [ ] Repeated clicks cannot double-report, skip states, or start duplicate loops.
- [ ] Delayed callbacks verify instance/route/state validity before mutating.
- [ ] Route navigation during animation stops work and produces no console errors.
- [ ] Off-screen animations stop; distant segments/entities are removed or reduced.
- [ ] Motion uses transforms/opacity where practical and avoids layout thrashing.
- [ ] Rendered node/entity count remains bounded as level content grows.

## Automated validation

- [ ] Run `node --check` on each changed JavaScript file.
- [ ] Add/run the game-specific test file.
- [ ] Test legacy registration and route.
- [ ] Test Adventure registration, virtual app/list compatibility, and completion.
- [ ] Test correct and incorrect reporting exactly once, retry, score, and progress.
- [ ] Test all current theme keys and centralized adapter fallback.
- [ ] Test state transitions, recycling/reconstruction if used, and cleanup.
- [ ] Test route destruction, delayed callbacks, repeated input, and reduced motion.
- [ ] Run `node tests/adventure_core_test.js` with zero failures.
- [ ] Run `git diff --check` and inspect the complete diff.

## Browser QA and handoff

- [ ] Serve with cache disabled and open each real route.
- [ ] Complete at least one correct, incorrect/retry, and full-stage flow.
- [ ] Reload mid-progress and confirm persistence/reconstruction.
- [ ] Check every current theme and representative desktop/mobile viewports.
- [ ] Check RTL/LTR, keyboard, touch, reduced motion, resize, and route-away cleanup.
- [ ] Check console/network output and service-worker freshness.
- [ ] Report exact files, decisions, commands, current test counts, browser QA, and
      genuine remaining limitations without claiming unperformed validation.
