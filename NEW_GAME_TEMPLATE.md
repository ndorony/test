# New game specification template

Delete guidance in parentheses and fill every applicable field. Write concrete
decisions; use “not applicable” instead of leaving ambiguity.

## 1. Identity and scope

- **Game name (Hebrew / English):**
- **Internal `appType`:**
- **One-sentence fantasy:**
- **Target learners and input methods:**
- **Registration:** legacy / Adventure / both
- **Vertical-slice size:**
- **Out of scope:**
- **Reference component/game:**

## 2. Learning mechanic

- **Source list(s):**
- **Question field / result field / optional `questionType`:**
- **`setItems` behavior:**
- **When each question is generated:**
- **How generated `question`, `options`, `result`, `action`, and
  `questionIndex` are presented/used:**
- **Correct-answer transaction:** (input lock, weight update, score, progress
  reload, feedback, next round)
- **Incorrect-answer transaction:** (input lock/idempotency, weight update,
  score, progress reload, feedback, retry)
- **Stage/list completion behavior:**
- **Adventure virtual-list behavior:**
- **Legacy behavior that must remain unchanged:**

The game must delegate selection, weights, score persistence, progress,
unlocking, and completion routing to the existing learning engine.

## 3. Player journey

### Opening

(First frame, purpose, input availability, duration, skip/replay behavior.)

### Core loop

1. 
2. 
3. 

### Correct answer

(Immediate, transitional, and permanent visual/audio reactions.)

### Incorrect answer and retry

(Feedback that is clear but not punitive; when input becomes available again.)

### Progression

(How progress is communicated without duplicating engine state.)

### Ending

(Completion beat, reward, exit/return route, repeated-play behavior.)

## 4. State machine

| State | Entered by | Owns | Accepts input | Exits when / to |
|---|---|---|---|---|
| loading | component creation | setup | no | ready → opening |
| opening |  |  |  |  |
| playing |  |  |  |  |
| answer-feedback |  |  |  |  |
| ending |  |  |  |  |
| completed |  |  |  |  |

- **Duplicate-input guard:**
- **Stale callback / route-change guard:**
- **Destroyed-instance guard:**

## 5. World and configuration model

- **Config entities:** (levels, rounds, segments, obstacles, actors, etc.)
- **Behavior shared across visual types:**
- **Minimal persistent reconstruction state:**
- **Extension points for later content:**

Include one small illustrative configuration object if it resolves ambiguity;
do not turn the specification into production code.

## 6. Rendering and composition

| Element | Technology | Reason |
|---|---|---|
| Scene/layout | DOM/CSS/SVG/canvas |  |
| Interactive controls |  |  |
| Decorative art |  |  |
| Effects/particles |  |  |

- **Viewport strategy:** embedded / full-screen route / responsive scene
- **Depth and layer plan:**
- **Camera/transitions:**
- **Ambient life:**
- **Foreground/background occlusion rules:**
- **External runtime assets:** none, unless explicitly justified

## 7. Themes

Derive palette values from `themeOptions`. List every key currently defined in
`themes.js`; do not assume an old fixed count.

| Theme key | Setting/motifs | Materials | Particles/light | Feedback/ending |
|---|---|---|---|---|
| `base` |  |  |  |  |
| `soldiers` |  |  |  |  |
| `unicorn` |  |  |  |  |
| `space` |  |  |  |  |
| `dark` |  |  |  |  |
| `code` |  |  |  |  |

- **Central adapter shape:**
- **Contrast/readability rule:**

## 8. Interaction and accessibility

- **Touch and minimum target sizing:**
- **Keyboard controls and focus order:**
- **Visible focus / hover distinction:**
- **Hebrew RTL behavior:**
- **English LTR behavior:**
- **Long question/answer behavior:**
- **Screen-reader semantics/live feedback:**
- **Reduced-motion behavior:**
- **Audio-independent cues and audio cancellation:**

## 9. Responsive behavior

| Viewport | Composition and controls |
|---|---|
| Mobile portrait |  |
| Mobile landscape / low height |  |
| Tablet |  |
| Desktop |  |
| Resize during play |  |

## 10. Performance and lifecycle

- **Maximum active scene/entities/segments:**
- **Off-screen rendering and animation policy:**
- **Animation primitives:**
- **Resize measurement policy:**
- **Timers / RAF / listeners / observers / media owned:**
- **Cleanup method and cancellation token:**
- **Fallback for unavailable browser features:**

## 11. File and integration plan

### Add

- `games/<slug>.js` —
- `games/<slug>.css` —
- `tests/<slug>_test.js` —

### Modify

- `index.html` —
- `tester.js` —
- `apps.js` —
- `worlds.js` —
- `service-worker.js` —

Remove non-applicable entries and add exact responsibilities. Avoid placing a
substantial standalone game wholesale in `tester.js`.

## 12. Test and QA plan

- **Pure/configuration tests:**
- **Learning-lifecycle and exact-once tests:**
- **Legacy registration/route tests:**
- **Adventure virtual-app/list/completion tests:**
- **Theme tests:**
- **Cleanup/navigation/rapid-input tests:**
- **Responsive, RTL/LTR, reduced-motion tests:**
- **Browser routes and viewport matrix:**
- **Regression suites:**

## 13. Risks, assumptions, and acceptance

- **Main technical risks:**
- **Main visual risks:**
- **Safe assumptions chosen:**
- **Known repository issues explicitly not in scope:**
- **Acceptance criteria:**
