# Crystal Arena — game specification

Filled from [NEW_GAME_TEMPLATE.md](NEW_GAME_TEMPLATE.md).

## 1. Identity and scope

- **Game name (Hebrew / English):** זירת הגבישים / Crystal Arena
- **Internal `appType`:** `crystal_arena`
- **One-sentence fantasy:** The player stands inside a scrying mirror arena, four
  answer crystals hover in the four screen corners, and the player smashes the
  right one by resting a coloured object — a wand — in that corner.
- **Target learners and input methods:** same learners as the rest of the app.
  Primary input is a **saturated coloured object held in front of the camera**;
  click/tap and keyboard are always available and are the guaranteed fallback.
- **Registration:** legacy only (new root menu `תנועה ומצלמה`). Adventure is
  explicitly out of scope — Adventure encounters must run without hardware
  permissions, and a camera prompt inside a world flow is a product decision that
  is not part of this request.
- **Vertical-slice size:** one endless arena, one round type, four corner targets,
  full learning loop. No level list, no segments.
- **Out of scope:** hand or skeleton tracking, gestures other than resting the object in a corner,
  multiplayer, recording or uploading any frame, Adventure registration.
- **Reference component/game:** `games/water-pipeline.js` for the load-order
  bridge, run/question tokens and cleanup; `MCQComponent` for the answer
  lifecycle.

## 2. Learning mechanic

- **Source list(s):** any existing `DATA` list. Registered with `ANIMALS`,
  `MULTIPLICATION`, `hebrewAlphabet`.
- **Question field / result field / optional `questionType`:** taken from the
  `apps.js` entry (`questionIndex`, `resultIndex`, `questionType`) and passed
  through unchanged.
- **`setItems` behavior:** read with `getSetItems(currentApp)`; the engine owns
  unlocking.
- **When each question is generated:** exactly once per round, when the arena
  enters `preparingRound`. Never in bulk, never inside an animation frame.
- **How generated fields are used:** `question` → the arena core plate (`v-html`);
  `options` → shuffled into the four corner crystals; `result` → string compared
  against the chosen option; `action()` → played once after the round mounts;
  `questionIndex` → stored for weight reporting.
- **Correct-answer transaction:** lock input → `successSound` →
  `updateWeightForKey(currentAppId, questionIndex, -1)` once → `score += 1` →
  `saveScore()` → `reloadProgress()`; continue to the next round only when it
  returns `true`.
- **Incorrect-answer transaction:** lock input → `failureSound` →
  `score = max(0, score - 1)` → `saveScore()` →
  `updateWeightForKey(currentAppId, questionIndex, 1)` once → `reloadProgress()`;
  when it returns `true`, mark that crystal spent and re-open the **same**
  question for retry.
- **Stage/list completion behavior:** entirely engine-owned through
  `reloadProgress()` (routes to `/display/news/...` or `/app/...`).
- **Adventure virtual-list behavior:** not applicable (not registered).
- **Legacy behavior that must remain unchanged:** all existing `apps.js` entries
  keep their positions; the new menu is appended to the end of the root `items`
  array, so no existing `currentAppId` changes.

## 3. Player journey

### Opening

The game opens **straight into calibration** — there is no intro click. On mount it
requests the camera immediately and enters the guided opening as soon as the
permission resolves. A permission prompt does not require a user gesture (unlike
autoplay), so this is a legal request on a first visit.

`intro` therefore survives only as the **fallback surface**: it is where a blocked,
denied or missing camera lands, and it still carries the `בלי מצלמה` route and the
privacy note. A player who once chose `בלי מצלמה` is never asked again —
`crystal_arena_input_mode` sends them straight to click/keyboard play.

A returning player is not made to repeat the whole opening: when a colour is saved,
the first calibration step offers `הצבע מהפעם הקודמת`, which applies it and starts
playing in one click. The colour is no longer applied silently, because the object
and the room light change between sessions.

### Core loop

1. The core plate lights up with the question; the four crystals rise into the
   corners carrying the options.
2. The player rests the coloured object in a corner (or clicks/taps/keys it).
3. The crystal reacts, the engine records the attempt, and the arena prepares the
   next round.

### Correct answer

Immediate: the struck crystal flashes white and shatters into capped shards;
the core ring pulses and gains a charge segment. A 3-answer streak triggers a
short arena surge (brighter rim light + a single ring wave). Permanent: the
score charge in the HUD.

### Incorrect answer and retry

The crystal dims, cracks, and locks (`aria-disabled`, `disabled`); a short shake
is applied to that crystal only, never to the whole UI. The remaining crystals
stay exactly where they were, so a child cannot hit a different answer because
things moved. Input re-opens after ~560 ms with the same question.

### Progression

The core ring shows engine progress (`progress.progress / progress.total`) and
the HUD shows the score. No second progression system exists.

### Ending

The arena is endless by design: the engine ends the stage and routes away, which
is the same contract `MCQComponent` uses. The last correct answer therefore ends
on the shatter + charge beat and then navigates.

## 4. State machine

| State | Entered by | Owns | Accepts input | Exits when / to |
|---|---|---|---|---|
| `loading` | component creation | state reset | no | after `$nextTick` → `intro` |
| `intro` | camera blocked, denied or missing | the fallback panel and the privacy note | mode buttons only | retry granted → `calibrating`; no-camera → `calibrating` in manual mode |
| `requestingCamera` | mount, or 📷 **from the intro only** | pending `getUserMedia` | no | resolve → `calibrating`; reject → `intro` with a notice, mode `manual` |
| `calibrating` | mode chosen, or the 🎨 button | the five-step guided opening (`calibrationStep`, `calibrationDone`) | the marked spot and the card buttons | last step done or skipped → `preparingRound`, or back to the round it interrupted |
| `preparingRound` | round start / previous round resolved | `generateFromList`, crystal assignment | no | question mounted → `waitingForAnswer` |
| `waitingForAnswer` | round mounted | detector hits, clicks, keys | yes | an attempt is accepted → `answerFeedback` |
| `answerFeedback` | accepted attempt | reaction animation | no | correct → `preparingRound`; wrong → `waitingForAnswer` |
| `paused` | tab hidden / camera lost | nothing | resume only | resume → previous state |

**Requesting the camera mid-game is not a state change.** When the 📷 button is
used during `preparingRound` / `waitingForAnswer` / `answerFeedback`, the state is
remembered in `_resumeStateCa` and restored whichever way the browser prompt goes.
The question on screen is never regenerated by a permission decision, and the
outcome is announced in a HUD status strip (with retry and dismiss) because the
intro card is not on screen to carry it.

- **Duplicate-input guard:** `inputLocked` plus a per-crystal `spent` map;
  `chooseAnswer` returns immediately unless the state is `waitingForAnswer`.
- **Stale callback / route-change guard:** `_runToken` (bumped on reset and
  destroy) and `roundToken` (bumped per question); every delayed callback goes
  through `later()`, which re-checks token, destruction and route.
- **Destroyed-instance guard:** `_destroyedCa`, set first in `beforeDestroy`.

## 5. World and configuration model

- **Config entities:** `CRYSTAL_ARENA_SLOTS` (four corner slots: id, screen
  corner, keyboard index, focus order) and `CRYSTAL_ARENA_TRACKER_DEFAULTS`
  (sampling size, hue tolerance, saturation/value floors, dwell, cooldown).
- **Behavior shared across visual types:** one crystal protocol — a slot renders
  an option, reports a strike, and plays one of three reactions (`idle`,
  `shattered`, `spent`). Theme motifs only change the crystal glyph, palette and
  particle colors.
- **Minimal persistent reconstruction state:** only the input-mode preference
  (`crystal_arena_input_mode`) and the calibrated colour
  (`crystal_arena_colour_profile`) through `setLocalStorage`. No learning state is
  written outside the engine helpers.
- **Extension points:** more slots would require only a longer `SLOTS` array and
  a grid change; the detector already derives zones from the slot list.

## 6. Rendering and composition

| Element | Technology | Reason |
|---|---|---|
| Scene/layout | CSS grid + custom properties | responsive corner composition |
| Camera view | `<video>` + CSS filters/overlays | live feed must stay cheap |
| Motion sampling | tiny offscreen `<canvas>` (64×48) | pixel access is required |
| Detection feedback | on-stage `<canvas>` (64×48, CSS-upscaled) + 2 DOM rings | the mask is already per-pixel; the rings are 2 nodes moved by direct style writes |
| Interactive controls | semantic `<button>` | keyboard/touch/screen reader |
| Crystal art | inline SVG | scalable silhouette, theme-tinted |
| Effects/particles | DOM spans, capped at 14 per burst | small counts, transform-only |

- **Viewport strategy:** full-bleed responsive scene inside the route.
- **Depth and layer plan:** background = camera feed + vignette; midground =
  arena rings and ambient motes; foreground = crystals and the core plate.
- **Camera/transitions:** no scene camera. Crystals travel only between their own
  rest and strike positions.
- **Ambient life:** slow drifting motes and a breathing core ring, paused when
  the document is hidden.
- **Foreground/background occlusion rules:** crystals live in the outer corner
  bands, the question plate in the centre band; neither is allowed to overlap the
  other, and particles are emitted inside the crystal's own bounds.
- **External runtime assets:** **none**. Detection is HSV hue matching against a
  colour the player calibrates once, so no CDN model or library is introduced and
  the game keeps working offline.

  **Two earlier detectors failed, and both failed structurally rather than by
  mis-tuning.** Frame differencing only marks pixels that changed between two
  consecutive frames, so an object that arrives and stays reads as almost nothing
  — measured under 2% of a zone even at 60% coverage, and no coverage level ever
  fired. Background subtraction fixed that but fired on anything that was not the
  learned wall: shadows, a shifting shoulder, a chair. Neither had any concept of
  what it was looking for. Matching a hue the player chose does: the tracker knows
  exactly what the target is, so everything else in the room is simply not it.

- **Calibration is a guided opening, not a single reading.** The game marks a
  spot; the player puts the object down and leaves it there. Five steps, driven
  by `CRYSTAL_ARENA_CALIBRATION_STEPS`:

  1. **Centre spot — read the colour.** `crystalArenaDominantHue` takes the
     saturation-weighted peak of a 36-bin circular hue histogram over a box around
     the marked spot, refined against its neighbours so the result is not quantised
     to 10°. It locks after `CRYSTAL_ARENA_CALIBRATION_FRAMES` of readings within
     `CRYSTAL_ARENA_CALIBRATION_DRIFT`, or the player can accept it manually.
  2-5. **One spot per corner — prove the corner works.** With the colour known, the
     tracker must report the object resting in that corner for
     `CRYSTAL_ARENA_CORNER_FRAMES`. A corner that cannot be reached in this room is
     discovered here rather than mid-question.

  The corner steps are a confidence pass, never a gate: once the colour is known
  the game is playable, so `אפשר להתחיל` skips the rest. The colour step itself
  cannot be skipped — without it there is nothing to track, so the only way past it
  is `בלי מצלמה`. After `CRYSTAL_ARENA_STEP_NUDGE_MS` on one step with no reading,
  the card swaps its prompt for concrete help instead of waiting silently.

  The profile is saved under `crystal_arena_colour_profile`. It no longer skips the
  opening — the object and the room light change between sessions, so calibration
  runs every time — but the first step offers it as a one-click shortcut. The HUD
  🎨 button re-runs the opening without disturbing the round.
- **Strike rule:** the object's centroid must *rest* in a corner for
  `dwellFrames` before that answer fires, and the corner re-arms only once the
  object leaves it. The crystal fills with accent light in proportion to the dwell,
  so the answer visibly charges and the player can pull out in time.

- **Refusals:** a pixel below `minSaturation` is washed out and its hue unreliable;
  below `minValue` it is too dark to trust. If matches cover more than
  `floodLimit` of the frame the wall itself is that colour, so the tracker
  reports nothing rather than firing in every corner.

- **The tracker follows an object, not a colour.** A calibrated hue is one object
  under one lamp at one angle. Turn the prop over, carry it through the shadow of
  your own body, let the webcam re-balance when a cloud passes, and the same
  object reads several degrees off and much duller — so the envelope that was
  tight enough to reject the room was also tight enough to drop the prop, and the
  marker died mid-reach. Measured over the drift scenarios in the test suite, the
  marker survived 12 of 28 frames while being carried into different light, and
  the corner it was carried to never answered at all.

  Three pieces fix that, and only the third is new information:

  | Piece | What it is |
  | --- | --- |
  | **Core envelope** | The strict envelope calibration produced. Only core pixels prove an object is the prop, and only a blob with at least `minCorePixels` of them can charge a corner. No relaxation below reaches this rule. |
  | **Halo envelope** | `haloHue` degrees wider, `haloSaturation`/`haloValue` dimmer: "this could be the same thing in another light". Halo blobs are followed, measured and drawn faintly, so the marker stays on the prop through a shadow — but a halo blob alone can never answer, which is why widening it cannot produce a wrong answer. |
  | **Track** | Identity carried between frames by position, velocity and blob size. The candidate blob is chosen by `crystalArenaBlobScore` — continuation of the motion at the right size — rather than by being the biggest. This is what still recognises the prop while its colour is moving. |

  **Learning is gated on continuity, not on colour.** Every frame the object shows
  a part the core envelope rejects, that reading is set aside as *provisional*.
  It is folded into the core envelope only once the same unbroken track has been
  the prop beyond doubt at least once (`chainSolid`), has run for `confirmFrames`,
  is still the only thing that could be the prop (`dominance` over every other
  blob, halo ones included), and is still within `learnSizeRatio` of the size it
  had when it was proven. Having moved there continuously *is* the evidence of
  identity, so the shaded, angled and re-balanced appearances come along with it.
  A chain that breaks — a leap past `maxJump`, or more than `graceFrames` with
  nothing found — discards everything provisional and teaches nothing.

  **Three brakes keep this off the wall.** Learned bounds are hard clamped
  (`maxHueTolerance`, `minSaturationFloor`, `minValueFloor`) whatever the camera
  reports, so the washed-out and too-dark refusals above hold even after
  adapting. They unwind toward the calibrated envelope at `relaxPerFrame` while
  nothing is tracked, so a lesson cannot outlive its light or accumulate across a
  session. And a widening that makes the core flood the frame is reverted on the
  spot, with learning blocked for a cooldown. The learned envelope is deliberately
  session-only and survives `reset()` between rounds: it describes this object in
  this room right now, which the next question does not change, but it is never
  persisted, because the next session's light is not this one.

  The same scenarios after the change: the marker survives 28 of 28 frames and the
  intended corner answers, while a differently-coloured object still never fires.

- **Nothing is focused when a round opens.** Answering destroys the element that
  had focus, so a keyboard player needs it put back or the next round is
  unreachable by arrow keys. Everyone else must be left alone: focusing the first
  crystal draws a focus ring on it, which reads as "the top-right answer is
  already selected". `focusFirstCrystal` therefore fires only when the last answer
  came from the keyboard — not merely when it did not come from the camera, which
  still caught the very first round of every game. Keyboard play survives round
  one without it: 1-4 are handled on the document, and the arrow keys fall back to
  the first slot when nothing is focused.

- **Sample space is screen space.** The `<video>` is `object-fit: cover`, so it
  shows a *crop* of the camera frame. The sampler used to stretch the whole frame
  into its 96×72 buffer, which tracked a picture the player could not see: on a
  portrait phone a 4:3 feed in a 1:2 box puts the entire visible picture inside
  sample x ∈ [0.31, 0.69], leaving most of every corner zone off screen — the
  object had to be pushed far past the crystal before it counted, and standing
  back made it unreachable. `crystalArenaCoverCrop` reproduces the element's own
  crop and the sampler draws that source rectangle, so the corner a player sees
  their object in is the corner the tracker reads. It also aligns the `.ca-vision`
  mask overlay, which was stretched over a differently-cropped video.

- **The hit zone is the crystal, measured from the page.** The four zones started
  as fixed quadrants — 44% of the frame each, while a crystal occupies roughly
  x ∈ [0.79, 0.99], y ∈ [0.11, 0.30]. So an object crossing into the top-right
  quadrant answered that question a fifth of a screen before it reached the
  crystal being aimed at. `measureSlotZones` reads the four buttons'
  `getBoundingClientRect` against the root box and hands them to
  `tracker.setSlots(zones, 0)`; the drawn shape is the target, so no inset is
  applied. Re-read on a 500 ms beat (rotation, fullscreen, answer length change)
  and only applied when it actually changed, since applying resets the dwell.
  Overlapping or zero-sized measurements are refused, and the quadrants remain the
  pre-layout fallback. The guided calibration spot follows the measured crystal
  too, so the opening trains the player on the zone that will really be used.

- **Answering is stricter than tracking.** The first shipped thresholds let
  occasional wrong answers through, so four gates now sit between "the marker is
  in a corner" and "that corner is the answer". The marker itself still follows
  the object as loosely as before, which keeps the feedback lively:

  | Gate | Rejects |
  | --- | --- |
  | `hitMargin` | An object grazing a corner on its way elsewhere. Applies to the quadrant fallback only — measured crystal zones need no trimming. Only the edges facing the middle move inward, so the outer edges stay usable. |
  | `dominance` | Frames with two same-coloured islands of similar size: the tracker cannot tell which one the player is holding, so it earns no dwell. |
  | `maxJump` | A reading that leaps across the frame — a different object, not the same one moving. Its dwell starts over instead of inheriting credit. |
  | `minHueStrength` | Calibrating on a box holding several colours, which is what produces a profile that later matches half the room. |

  The plain sensitivity floors — `minSaturation`, `minBlobPixels` — are a
  different thing: they decide whether the object is seen *at all*. Raising them
  along with the gates above cost range (a player standing back shows a smaller,
  blurrier prop and stopped registering even on the right corner), so they stay
  near their original values and strictness lives in the four gates.

- **Showing that tracking works:** the match mask is drawn to an on-stage canvas,
  and one ring marks the tracked object. Marker colour is the contrast-picked
  `--ca-edge`, because the theme accent is silver on the light palettes. The two
  match levels are drawn at different strengths — solid where the colour is
  certain, faint where the tracker is holding on to the object through a shadow
  or an angle — so "it is still following me" stays visible during exactly the
  moments the model is catching up.

- **Known cost:** the game needs a physical prop. Without one there is no camera
  mode — which is why the manual path is not a fallback but a first-class input.

## 7. Themes

| Theme key | Setting/motifs | Materials | Particles/light | Feedback/ending |
|---|---|---|---|---|
| `base` | turquoise scrying pool | polished glass | pale-turquoise motes | white flash, cyan shards |
| `soldiers` | field signal range | brass/khaki plating | dust and gold sparks | gold flash, khaki shards |
| `unicorn` | rainbow dream arena | candy glass | pink/gold sparkles | pink flash, star shards |
| `space` | orbital observation deck | cold hologram | star motes | blue-white flash |
| `dark` | night vault | obsidian | violet embers | violet flash |
| `code` | terminal grid | neon wireframe | green scanline motes | green flash, glyph shards |

- **Central adapter shape:** `resolveCrystalArenaTheme()` returns
  `{key, palette, motif, css}` where `css` is the full `--ca-*` custom-property
  set; templates and CSS read only those properties.
- **Contrast/readability rule:** the camera feed is always composited under a
  themed scrim whose opacity is raised for light palettes, and answer/question
  text sits on an opaque themed plate — never directly on video.

## 8. Interaction and accessibility

- **Touch and minimum target sizing:** each crystal is at least 128×112 px and
  grows with the viewport; the whole corner cell is the hit area.
- **Keyboard controls and focus order:** `Tab` follows top-right → top-left →
  bottom-right → bottom-left in RTL (reading order), arrows move between
  crystals, `1`–`4` select directly, `Enter`/`Space` activate.
- **Visible focus / hover distinction:** focus draws a solid themed outline plus
  a scale-free glow; hover only brightens. Hover is never required.
- **Hebrew RTL behavior:** root is `dir="rtl"`; the question plate switches to
  `ltr` when its text is not Hebrew (`isHebrew`).
- **English LTR behavior:** answers set their own direction per option text.
- **Long question/answer behavior:** answers wrap to three lines and reduce font
  size through a `ca-long` class; no ellipsis.
- **Screen-reader semantics/live feedback:** feedback line is `aria-live="polite"`;
  the camera status is announced once per change, not per frame.
- **Reduced-motion behavior:** motes, shake, travel and surge are removed;
  reactions become short opacity/colour changes and delays are clamped to 120 ms.
- **Audio-independent cues:** every outcome also changes crystal shape, an icon
  (`✦` / `✕`) and the feedback text; sounds are best-effort in `try/catch`.

## 9. Responsive behavior

| Viewport | Composition and controls |
|---|---|
| Mobile portrait | crystals in the four corners with a narrower body; core plate occupies the middle band; HUD collapses to icons |
| Mobile landscape / low height | crystal height clamps, core plate loses its subtitle, ring shrinks |
| Tablet | full composition at medium scale |
| Desktop | full composition, wider question plate, larger camera view |
| Resize during play | one debounced `resize` handler recomputes the sample rect and zone geometry; no learning state touched |

## 10. Performance and lifecycle

- **Maximum active scene/entities:** 4 crystals, 14 ambient motes, ≤14 shards per
  burst, 1 video element, 1 64×48 canvas.
- **Off-screen rendering and animation policy:** the RAF loop skips all work when
  `document.hidden`; motion sampling additionally stops while not in
  `waitingForAnswer`.
- **Animation primitives:** `transform`/`opacity` only.
- **Resize measurement policy:** measured in the resize handler and on mount,
  never inside the frame loop.
- **Timers / RAF / listeners / observers / media owned:** `setTimeout` set,
  one RAF handle, `resize`, `keydown`, `visibilitychange`, the `MediaStream` and
  its tracks, the `<video>` element.
- **Cleanup method and cancellation token:** `beforeDestroy` sets `_destroyedCa`,
  bumps `_runToken` and `roundToken`, clears timers, cancels the RAF, removes
  listeners, stops every media track and clears `video.srcObject`.
- **Fallback for unavailable browser features:** every camera failure downgrades
  to manual mode with a visible, cause-specific notice; the learning loop is
  unaffected. `getUserMedia` exists only in a secure context, so a page opened
  over plain http (a LAN IP, for example) has no `mediaDevices` at all — that case
  is reported as an HTTPS/localhost requirement rather than as an unsupported
  browser. Denied permission, no camera device, a camera held by another
  application and a lost track each get their own message and a retry affordance.

## 11. File and integration plan

### Add

- `games/crystal-arena.js` — detector, theme adapter, slot config, component
  factory `createCrystalArenaComponent(BaseGameComponent)`.
- `games/crystal-arena.css` — all selectors under the `.ca-` prefix.
- `tests/crystal_arena_test.js` — detector, theme adapter, lifecycle,
  registration, cleanup.

### Modify

- `index.html` — load the CSS with the other game styles and the JS before
  `tester.js`.
- `tester.js` — instantiate the factory after `BaseGameComponent`, push the
  `/play/crystal_arena/:currentAppId` route when the component exists.
- `apps.js` — append one new root menu with three registrations.
- `service-worker.js` — add both files to `CORE_ASSETS` and bump `CACHE_NAME`.

## 12. Test and QA plan

- **Pure/configuration tests:** slot config validity, zone geometry, detector
  warm-up, per-zone hit, dominance rejection, global-motion rejection, cooldown.
- **Learning-lifecycle and exact-once tests:** double strike reports once for
  correct and for wrong; wrong keeps the same question; `reloadProgress()` false
  stops continuation.
- **Legacy registration/route tests:** the `crystal_arena` app exists with a
  complete field mapping and the route is registered.
- **Adventure tests:** not applicable (not registered); `adventure_core_test.js`
  must still pass unchanged.
- **Theme tests:** every key in `themeOptions` resolves and exposes the semantic
  tokens; unknown key falls back to `base`.
- **Cleanup tests:** `beforeDestroy` stops tracks, clears timers and cancels RAF.
- **Browser routes and viewport matrix:** `/play/crystal_arena/<id>` on desktop
  and mobile portrait/landscape, all six themes, reduced motion, camera granted /
  denied / unsupported.
- **Regression suites:** `node tests/adventure_core_test.js` and every existing
  `tests/*_test.js`.

## 13. Risks, assumptions, and acceptance

- **Main technical risks:** background subtraction is sensitive to lighting
  changes and to a moving camera, and at `hitCoverage: 0.10` it will also see a
  sibling walking into a corner of frame. Mitigated by per-zone dominance, a
  `maxHotZones` limit, a whole-frame veto that relearns the room, a re-arm rule
  that stops a parked hand from firing repeatedly, a warm-up period and an
  always-available manual fallback. `hitCoverage` is the knob to raise if a real
  room proves too twitchy.
- **Main visual risks:** a raw webcam feed looks like a video call, not a game.
  Mitigated by the themed scrim, arena rings, vignette and crystal foreground.
- **Safe assumptions chosen:** camera is an enhancement, never a requirement;
  no frame ever leaves the device; Adventure stays out of scope.
- **Known repository issues explicitly not in scope:** the untracked
  `knowledge-factory` work in the tree is left untouched.
- **Acceptance criteria:** the full learning loop works in manual mode with zero
  hardware, works by hand strikes when a camera is granted, passes the focused
  test file and the Adventure core suite, and supports all six themes, RTL,
  reduced motion and mobile layouts.
