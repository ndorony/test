# Transition timing polish

Scope: the existing `scribble_dungeon` and `scribble_platformer` visual handoff.
Keep the current app IDs, content mappings, score cycle, engine-owned questions,
answer transactions, persistence, routes, and authored travel paths. This is an
existing-game presentation adjustment, not a new game type.

The transition has three explicit playback stages:

1. **Entry (360 ms):** hold the first camera pose while the platformer exchanges
   its painted layer for the bridge. The dungeon keeps its existing wand reveal.
2. **Travel:** run the existing authored cinematic. The fall starts with a
   near-orthographic perspective camera matched to the ledge's pixel scale;
   there is no second-frame projection switch. In-game entry uses the live
   platformer camera and centre crate. The final lens uses the dungeon's
   exported camera padding and zoom limits, with the pawn ending on its entry tile.
3. **Exit (320 ms):** hold the completed destination and character before the
   existing retained-frame route handoff and arrival dissolve.

Reduced motion skips travel and the added holds. All stages use the existing
owned animation frame and cancellation path. No new browser assets or runtime
dependencies are introduced. Service-worker cache advances to v183.

Validation checklist (2026-09-09):

- [x] Read architecture, workflow, technical/style guides, checklist and existing
  transition design/lessons; preserve the pre-existing working tree.
- [x] Syntax checks for changed JavaScript; `git diff --check`.
- [x] Seven focused timing/camera checks, including entry scale at desktop,
  portrait and landscape sizes, reduced motion, and cancellation in all stages.
- [x] Adventure core: 82 passed, zero failed.
- [x] Character animation checks passed.
- [x] Browser: inspected fall entry, shaft turn and final frame; exercised the
  real platformer route through wrong answer, retry, correct answer, gateway
  question, fall handoff and a playable dungeon arrival. The last camera-alignment
  adjustments were verified with focused math tests and the preview endpoint.
- [ ] Full existing Scribble suites are green. Existing failures: bridge phase
  expectation (`camera-zoom` versus `rapid-corridors`); capture suite's obsolete
  literal chamber-visibility assertion; dungeon gateway missing `decor`;
  platformer answer test harness missing `queueModeTransitionIfDue`.
- [ ] Complete browser matrix across themes, directions, input methods,
  completion, persistence, and both live transition routes. Do not infer this
  coverage from the mathematical camera tests.

The fresh local app also reports an existing Vue root `handler.call` error;
the tested gameplay still initializes. The first browser address served a stale
cached `tester.js`; a fresh localhost port was used for live gameplay checks.

Registration, content, theme palettes, scoring and question controls are unchanged.
