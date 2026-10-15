# Strike Ops (כוח פריצה) — game specification

Status: **revision 3.1** of the vertical-slice specification, written from
[NEW_GAME_TEMPLATE.md](NEW_GAME_TEMPLATE.md). It follows
[AGENTS.md](AGENTS.md), [GAME_ARCHITECTURE.md](GAME_ARCHITECTURE.md),
[GAME_TECH_GUIDE.md](GAME_TECH_GUIDE.md), [GAME_STYLE_GUIDE.md](GAME_STYLE_GUIDE.md)
and [GAME_CHECKLIST.md](GAME_CHECKLIST.md). Current source and tests outrank this
document where they differ, **except** where §16 or §17 names slice code as
superseded by this revision.

**Why revision 3 (user request, 2026-10-12).** The user rejected the
revision-2.1 movement model (a fixed firing pad per zone with a yaw clamp and
an automatic camera glide between zones): *"אני רוצה שזה יהיה מסלול, שיהיה
אפשר ללכת, להתקדם לעבור בין מקומות... מפה אמיתית."* Revision 3 replaces it
with **one connected outdoor compound map** that the player walks freely:

- four places joined by gates and dirt paths — **החצר הצהובה** (gate & yard)
  → **חצר המכולות** (container yard) → **הצריפים והמרפסת** (sheds & deck)
  → **כיכר מגדל המים** (water-tower plaza); 46 × 68 m, an 85 m route,
  ≈ 28 s of walking, 60–90 s to explore everything (§5.1, map plan image
  `map-plan.png`);
- free movement (left joystick / WASD, mouse or drag look, no yaw clamp,
  capsule-vs-AABB/circle collision, no jumping, optional sprint, no head
  bob) (§3 Movement model, §5.1);
- **encounters by trigger:** walking into a place's **fight box** starts its
  encounter; the squad of 4 deploys at authored spots in front of it; the
  player may strafe and step around inside the fight box, which is also the
  encounter boundary; 3 squad rounds then the commander's boss round per
  place (every 4th question, as before); clearing a place opens the next
  gate (§3, §4 `roaming`, §5.1);
- kids never get lost: an on-screen objective marker with an edge arrow,
  ground chevrons along the route, a real top-down minimap with the route
  line, place-name toasts, an objective line in the banner and a **קדימה**
  (go) autopilot button that also serves keyboard-only and switch users
  (§3, §6.6, §8);
- answer pairing: chips keep a fixed index order and carry the same
  number + shape + tint **badge** as their soldier's nameplate and armour;
  the left-to-right order still holds from anywhere in the fight box
  (validated, gap ≥ 4°), so either cue works (§2, §5, §8);
- performance: the map is built once and merged per place into a
  *structure* chunk (always drawn when in view) and a *detail* chunk (drawn
  only for the current and adjacent places) (§6.2, §10);
- a new debug API (`teleport`, `getPlayer`, `getMap`, `walkTo`,
  `setMoveInput`, `setView`) and tests that stay deterministic through
  teleport + the fake clock (§12).

The learning contract (§2), the locks, phase timers, render modes,
context-loss handling, the squad/boss schedulers, the boss decoy round, the
Hazmat enemies, the HUD, themes, quality tiers and the debug plumbing built
for revision 2.1 are kept. Every pad, yaw-clamp, `advancePath` and
camera-glide statement of revision 2.1 is either rewritten below or marked
**removed (rev 3)**; §17 maps the built code onto this design.

**Why revision 3.1.** An independent review of revision 3 found one
blocker and twelve further gaps; revision 3.1 resolves all of them without
changing a design decision. It separates geometry bounds from playable
bounds (the perimeter walls had made the shipped map fail its own
validation, §5.1); routes the autopilot over the whole unlocked graph with
a grid fallback and an explicit no-route result (§5.1); **stages** counter
changes and **commits** map effects (gates, chimes, guidance, the
unclamped walk) only after `create()` passed `checkProgress()` (§2); makes
the lap-wrap pose an idempotent simulation step (§4); lists the full
coordinate migration for shooting and lock-on (§17.2); resets every held
input on suspension (§4); closes the map overlay on encounter entry
(§6.6); fixes browser checks 24 and 29; makes `teleport` a deterministic
placement contract (§12.1); adds the **centre-view assist** so every
encounter starts from the validated anchor view (§3); re-evaluates
distance culling with hysteresis and measures CPU separately (§6.2); adds
cheap per-place variety (§5.1); and moves the plain **קדימה** button,
route recovery and encounter-entry tests into the grey-box checkpoint
(§17.4). **Manager decisions (rev 3.1):** 4 questions per place (3 squad
rounds + 1 boss round) is confirmed; `LINE4` stays the arena of every
place in the slice, with the per-place variety above.

**Why revision 2.** Revision 1 ("Breach & Clear": indoor rooms, Kenney cartoon
robots) was built as a vertical slice and the user rejected its look. The
target look is a daylight, outdoor *Call of Duty Mobile*-style compound
(yellow sheds, wooden deck, grass, water tower, rifle bottom-right, left
joystick, fire/action buttons on the right, minimap top-right). The approved
mockups are `mockupA_squad.png` (squad round) and `mockupB2_split_subtle.png`
(boss split round). The chosen mechanic is **"A with bonus B"**:

- **A — Squad round (default):** each answer option is a separate armored
  soldier with an answer nameplate above it. Soldiers move between cover,
  hide and peek out; the player shoots the soldier carrying the right answer.
- **B — Boss split round (bonus):** one boss soldier splits into holographic
  copies, each carrying an answer. Only the copy with the right answer is
  real; a shot wrong copy flickers and dissolves gently.

Fixed decisions are not reopened here: the appType, the file layout, the
learning contract (§2, unchanged from revision 1), Three.js r128 with a
hand-written skeleton rebind, the theme adapter shape, no player health or
fail state, and leaving Adventure out of v1. **Replaced by revision 2:** rooms
and breaching (now outdoor zones and a guided advance), RobotExpressive robots
(now a model-agnostic armored-soldier config), the HUD layout (now COD
Mobile-style), and the answer-order rule (now strictly left-to-right world
order in both directions). §16 maps the existing slice code onto this design.

**Why revision 2.1.** An independent review of revision 2 found one blocker
and fourteen further gaps, and the assets have since been sourced and
measured. Revision 2.1 changes no fixed decision above. It:

- separates the **render mode** (`renderMode: 'gl' | 'dom'`) from the
  learning `phase`, so a DOM-only continuation can never reopen an accepted
  answer (§4);
- defines when the round/zone counters advance relative to `create()` (§2,
  §4);
- adds a **graphics generation** (`_so.gfx`) that context loss bumps
  immediately, and a retained **transition snapshot** for rebuilding an
  interrupted transition (§4, §10);
- replaces the "procedural props, soldier GLB only" asset plan with the
  sourced CC0 files (Quaternius *Character Hazmat*, Kenney kits, two
  generated ground textures) and their measured budgets, with mandatory
  static merging (§6, §6.2, §6.4, §11);
- clones every per-enemy-varying material, fixes the clip role map
  (including a cartoon knockdown in place of the seated tag-out), fits the
  boss split and decoy dissolve inside their timers, derives portrait
  framing from the canvas aspect, guarantees full answer text, drives
  reduced-motion hitboxes from the rendered pose, isolates embedded
  opposite-direction runs, and narrows the baseline page-error exception
  (§5–§8, §12, §13).

---

## 1. Identity and scope

- **Game name (Hebrew / English):** **כוח פריצה** / **Strike Ops**.
  In-game goal line: `פגעו בחייל שמחזיק את התשובה הנכונה`. Material icon:
  `gps_fixed`. **Manager decision (rev 2.1):** the menu entries in
  `apps.js`/`groups.js` stay exactly as the slice wrote them (`name`
  `כוח פריצה`, and the existing `title` string); no menu string is edited.
- **Internal `appType`:** `strike_ops` (route `/play/strike_ops/:currentAppId`).
- **One-sentence fantasy:** On a sunny training-compound exercise, you walk
  the compound place by place — the yard, the container yard, the sheds and
  their deck, the water-tower plaza — and in each place a squad of
  foam-gear "opposing force" soldiers peeks from cover, each wearing an
  answer nameplate. Tag the soldier with the right answer, the squad
  regroups, and every fourth question their commander splits into
  holographic decoys that only the right answer can break; beat him and the
  gate to the next place opens.
- **Tone:** a game of laser-tag/paintball style tag, not war. Soldiers are
  stylised and helmeted (no faces hurt, no blood); a tagged soldier does a
  cartoon **knockdown** (falls over, a small puff of stars/sparkles above
  it, then fades out; §6.1, §6.5). Enemy "shots" are harmless foam puffs
  that never touch the player (§3).
- **Target learners and input methods:** the platform's existing learners
  (children, Hebrew UI). Inputs: desktop mouse with pointer lock and keyboard,
  keyboard only, touch (phone and tablet, portrait and landscape), and screen
  reader or switch users through the semantic answer list (chips).
- **Registration:** legacy only. This covers legacy `apps.js` entries and
  `groups.js` shared-progress groups, which are legacy menu features.
  **Adventure: not applicable in v1.** There is no `worlds.js` registration.
  The docs do not require Adventure for a new appType: the template lists
  "legacy / Adventure / both". The component still reads only the resolved
  `currentApp` and uses an Adventure-aware `exitGame()` copied from
  `knowledge-defense`, so adding an encounter later needs no component change.
- **Vertical-slice size (rev 3):** see §14. In short: the **whole small
  map** (four places, three opening gates, the route, collision, guidance
  aids, the real minimap) with a squad of up to 4 soldiers in each place,
  a boss split round as each place's 4th round (every 4th question, and on
  demand through `forceBossRound()`), the lap wrap back to the yard after
  the plaza, the full COD-style HUD (banner, counter and stars, minimap,
  ammo, fire/ADS/reload, weapon slot, joystick, objective marker, **קדימה**
  button), the full learning loop, the `base` theme plus one contrasting
  theme (`dark`) fully polished (all other `themeOptions` keys must resolve
  and stay readable), and the two existing menu registrations.
- **Manager/user decisions (closed):**
  - weapon: one **assault rifle** (single active slot);
  - mechanic: squad round by default, boss split round as a periodic bonus;
  - characters: a CC0 animated armored-soldier model, configured through a
    model-agnostic `enemyModel` config (§5, §6.1) so the exact model can be
    swapped. **Sourced (rev 2.1):** Quaternius *Character Hazmat* (§6.1);
  - a tagged soldier plays the model's `Death` clip as a friendly cartoon
    knockdown with stars, then fades (no seated tag-out fallback);
  - the menu titles in `apps.js`/`groups.js` stay unchanged (§11.2);
  - the revision-1 indoor Kenney Factory Kit files under
    `assets/strike-ops/` are replaced by the sourced outdoor files (§6.4);
  - no player health, no fail state (§3 "Incorrect answer");
  - **no settings are persisted in v1;**
  - **(rev 3, user request)** a free-roam compound map with four places
    joined by gates, entered encounters and guidance aids (§3, §5.1);
  - **(rev 3.1, manager)** 4 questions per place — 3 squad rounds + 1 boss
    round, 16 per lap — and the `LINE4` arena in every slice place with
    per-place announcement, gate sound, signage and squad style (§5.1).
- **Out of scope:** Adventure registration; killfeed; scoreboard; slide;
  crouch/prone buttons (shown in the mockups but not functional — omitted);
  jumping, climbing, ladders and any height change (the ground is flat);
  open-world size beyond the four places; headshots or damage zones;
  strong screen shake; slow motion; player health, damage, fail or game-over
  states; grenades and weapon switching (a second slot is full scope and
  cosmetic only); multiplayer; voice/chat buttons from the mockup; persisted
  run state; new vendor libraries (no SkeletonUtils, no physics engine, no
  GLTF extensions beyond what the vendored r128 `GLTFLoader` supports); new
  audio files; changes to `BalloonShooterComponent` (`tester.js`
  ~1787–3289), which is a code reference only and must stay byte-identical.
- **Reference component/game:**
  - Learning lifecycle: `MCQComponent` (`tester.js` ~656).
  - Standalone factory, theme adapter, `ownTimeout`, run token, attempt lock and
    question token: `games/knowledge-defense.js`.
  - Three.js renderer setup, quality tiers, FPS downgrade, pointer lock,
    fullscreen and touch look: `BalloonShooterComponent` (read only).
  - Browser test harness: `tests/hexkeep_campaign_browser.cjs`.
  - Revision-2.1 slice (`games/strike-ops.js`, built from the revision-1
    slice): learning loop, locks, timers, render modes, lifecycle, the
    `yard` arena, enemies, HUD, themes and debug plumbing to keep (§16,
    §17).

---

## 2. Learning mechanic

- **Source list(s):** whatever the resolved `currentApp` names. The slice
  registrations use `QUESTION` (`english_name` → `question_word_hebrew`,
  `setItems: 3`) and shared group `ch51` (`5_1`, `english_name` → `hebrew`,
  `setItems: 5`). §11.3 lists them all.
- **Question field / result field / optional `questionType`:**
  `currentApp.questionIndex`, `currentApp.resultIndex` and
  `currentApp.questionType`, passed through unchanged. Speech-type groups
  (`ch51s`, `otiot`) render the question as a speaker button. That is fully
  supported through the replay control (§8).
- **`setItems` behavior:** `getSetItems(this.currentApp)`. The engine owns it.
- **When each question is generated:** exactly once per **round**. A round
  is one question answered by one squad (or one boss split). The first
  question is generated by `create()` (called by
  `BaseGameComponent.created()` before mount). Each later question is
  generated by `create()` at the **start** of the transition that follows a
  correct answer — `regroup` inside a place, `roaming` (rev 3: the walk to
  the next place) or `advancing` (rev 3: the lap wrap from the plaza back to
  the yard) (§3, §4) — so the incoming enemies are labelled before they
  appear and `reloadProgress()` runs right after the correct answer,
  wherever the player then walks. During `roaming` the generated question is
  held, not shown: the banner shows the objective line until the next
  encounter starts (§3). Retries never generate.
- **Round counters and their timing (rev 2.1).** The visual counters
  `roundNumber` (1-based, this visit), `roundInZone` (0-based), `zoneNumber`
  (1-based, this visit) and `zoneIndex` (0-based index into
  `zonePlan.zones`) always describe the round **being presented or about to
  be presented**. They live in `data()` with the initial values
  `{roundNumber: 1, roundInZone: 0, zoneNumber: 1, zoneIndex: 0}`, so they
  already exist when `BaseGameComponent.created()` calls the first
  `create()`. They change in exactly one place: `beginTransition()` computes
  `next = strikeOpsNextRound(counters, cfg)` (pure; `regroup` while
  `roundInZone < roundsPerZone − 1`, which increments `roundNumber` and
  `roundInZone`; otherwise the place is cleared, which increments
  `roundNumber` and `zoneNumber`, sets `roundInZone = 0` and `zoneIndex =
  (zoneIndex + 1) mod zones.length`, with kind **`roaming`** when the new
  `zoneIndex` is > 0 and **`advancing`** (the lap wrap) when it wrapped to
  0), assigns `next` to the counters, and **only then** calls `create()`.
  Stars increment in the same step when the outgoing round was the place's
  boss round (rev 3: and reset to 0 on the lap wrap, when `lap` increments).
  Gate and blocker state is **derived** from the committed
  `_so.mapZoneIndex` (§5.1; rev 3.1: committed after `create()` passed
  `checkProgress()`, see "Staged counters" below), so opening the next gate
  needs no other state. `create()` never changes a counter;
  `arriveRound` and `enterEncounter` never change a counter; a retry never
  changes a counter. (In code, "zone" names a place: `zones[]`,
  `zoneIndex`, `zoneNumber`, `zonePlan` keep their names.)
- **Round kind (presentation only):** `create()` sets
  `roundKind = strikeOpsRoundKind(this.roundInZone, cfg, so.forceBoss)`
  (and clears `so.forceBoss`) **after** the counters were advanced, so the
  4th round's question is classified with the 4th round's counter.
  `roundKind` is `'boss'` when `roundInZone === cfg.zonePlan.bossRoundIndex`
  (the 4th round of every zone, i.e. every 4th question) or when
  `forceBossRound()` armed it; otherwise `'squad'`. It is decided from the
  visual round counter, never from the question content, weights or
  correctness. It changes **only** how the options are embodied (separate
  soldiers vs. holographic copies of one boss). It never changes the
  learning transaction, timings of the learning phases, scoring or the
  option set.
- **No indoor dependency in `create()` (rev 2.1).** The slice's
  `so.stripOnly = this.options.length > C.rooms[0].posts.length` is replaced
  by `so.domAnswerOnly = this.options.length > STRIKE_OPS_MAX_LANES` (the
  constant `4`, which validation also requires of every zone's `lanes`).
  `create()` reads no zone, lane or scene object.
- **How the generated object is used:**

  ```text
  q = generateFromList(currentApp.listName, currentApp.questionIndex,
                       currentApp.resultIndex, currentAppId,
                       getSetItems(currentApp), currentApp.questionType)
  this.question      = q                       // q.result is the rendered correct answer
  this.options       = this.shuffle(q.options.slice())   // enemy i <-> options[i] <-> lane i
  this.questionIndex = q.questionIndex
  this.exercise      = q.question              // base-component compatibility
  this.result        = q.result
  this.questionToken++ ; this.attemptLocked = true        // unlocked on entering 'engaging'
  if (!this.reloadProgress()) return           // engine navigated: stop
  ```

  **Option ↔ enemy ↔ badge ↔ list order (rev 3; one rule for RTL and
  LTR).** Enemy `i` (squad soldier or boss copy) carries `options[i]` and
  lives only in lane `laneSets[n][i]` for the whole round. Two cues pair a
  chip with its enemy, and both always agree:

  1. **Badge (primary, works from any position or view direction).** Enemy
     `i`, its nameplate, its minimap dot and answer chip `i` share one
     badge: the number `i + 1`, the shape `SHAPES[i]` (circle, triangle,
     square, diamond) and the tint `squadTints[i]`, which is also the
     soldier's armour (`Team`) tint. Badges are bound to the **index**, not
     to the lane (rev 3; revision 2.1 bound tint and shape to the lane, so
     a 3-option round showed markers 1, 2, 4). The number is always shown
     with the shape, so the pairing never relies on colour alone. Boss
     copies keep the identical hologram look (no tell) and carry the badge
     only on their nameplate and chip.
  2. **Left-to-right order (kept).** Lanes are sorted strictly left to
     right as seen from the place's fight box: validation checks the angular
     gap between neighbouring lanes from **every** fight-box sample (0.5 m
     grid) with gap ≥ 4° (the 6° gate of revision 2.1 still holds from the
     smaller core; §5). Because the player is confined to the fight box
     during an encounter (§3) and screen order depends on position, not on
     yaw, for every enemy in front of the camera, the k-th enemy from the
     left on screen is enemy k whenever both are in view.

  The answer list renders in index order inside a row forced to
  `direction: ltr` (each item's text keeps its own `dir`), so chip 1 is the
  leftmost chip in Hebrew (RTL) and English (LTR) pages. The DOM order is
  **never** recomputed from screen positions: reordering buttons under a
  child's finger, or under keyboard focus, would cause mis-taps and focus
  jumps, and the badge already gives a position-independent pairing.
  (Revision-1 slice bug: the strip ran in RTL order, so chip 1 sat on the
  right while robot 0 stood on the left.) Nameplate de-overlap preserves
  the plates' **current screen order** (§6), which equals index order
  whenever all enemies are in front of the camera.

  **Startup and navigation guard.** `BaseGameComponent.created()`
  (`tester.js` ~650) calls `reloadProgress()`, **ignores its result**, then
  calls `create()`. The `LearnBox` `beforeEach` guard can make the route
  change asynchronous, so `$route` may still point at this game after a
  redirect has been requested. The game therefore never trusts `$route` alone:

  - Every learning call goes through `checkProgress()`, which runs
    `ok = this.reloadProgress()` (the inherited method, not overridden),
    sets `_so.navigated = true` when `ok` is `false`, and returns `ok`.
  - `create()` starts with
    `if (_so.destroyed || _so.navigated) return; if (!this.checkProgress()) return;`
    **before** `generateFromList`. This honours the initial redirect that
    `created()` discarded. It then generates the question and calls
    `checkProgress()` again (MCQ order).
  - `mounted()` returns before allocating **any** THREE or WebGL resource,
    listener or RAF if `_so.navigated || !isCurrentRoute()`.
  - After any `checkProgress() === false`, no timer, RAF or loader callback
    does further work: they all check `_so.navigated` as well as `run`.

  **DOM-only learning path.** Learning transitions never depend on RAF,
  THREE, animation-end events or rendering. They are driven by owned
  **pausable phase timers** (§4, §10):

  - Start → opening approach (`deploying`) → `engaging`;
  - wrong → retry unlock;
  - correct → transition start (`regroup`, `roaming` or `advancing`);
  - transition start → counters advance → `create()`;
  - transition end → `engaging` (`regroup`, `advancing`: their timers;
    `roaming`: the next place's trigger starts `deploying`, whose timer ends
    in `engaging`).

  **The one non-timer step (rev 3).** In the GL render mode `roaming` ends
  when the player walks into the next place's fight box (or presses
  **קדימה** and the autopilot walks there, or a test calls `teleport` /
  `skipTransition`). That is a presentation step, not a learning step: the
  question for the next round was already generated, checked
  (`reloadProgress()`) and locked at transition start, and the attempt lock
  opens only at `arriveRound` after the encounter's own `deploying` timer.
  In the DOM render mode, and whenever rendering or the simulation cannot
  move the player (`renderMode === 'dom'`), `roaming` is driven by
  `phaseTimer('roaming', advanceMs, enterEncounter)` instead, so the loop
  still completes on timers alone.

  The RAF loop only interpolates visuals from those timers' progress (and,
  in `roaming`, integrates the player's own movement). The loop therefore
  completes with RAF stopped (in GL `roaming`, `teleport()` into the target
  fight box and `skipTransition()` run the trigger check synchronously),
  with rendering disabled (`setRendering(false)`: the simulation, movement
  and `walkTo` still run under the fake clock) and in the DOM render mode (`renderMode === 'dom'`: no THREE or
  WebGL, or "continue without 3D" after a context loss). The render mode
  never changes the learning phase or the attempt lock (§4). In DOM mode the
  answer list calls `answer(i)` directly, and a 300 ms question-banner
  cross-fade replaces the regroup/roam/advance visuals.

  `q.action()` (auto-read) runs on entering `engaging` for that round, not
  during loading or briefing. It runs again from the replay control.
  Correctness is decided **only** in `answer(i)` by
  `this.options[i] === this.question.result`. Aim, hit, magnetism, movement,
  boss-copy visuals and nameplate code never read `question.result`; enemies
  carry only their option `index`. The real/decoy distinction of a boss copy
  exists **only after** `answer(i)` returns (and in the debug read-out,
  §12.1); before a hit every copy looks and behaves identically, so there is
  no visual tell.
- **Correct-answer transaction (`answer(i, token?)`, MCQ order):**
  1. Guard: `phase === 'engaging'` (in either render mode), `!attemptLocked`,
     `question` set, and, when the caller passes a `token`,
     `token === questionToken`. Otherwise return `false` with no side
     effect. Every input path captures the token when the player acts (shot
     fired, lock-on armed, chip pressed) and passes it, so a stale event can
     never answer a newer question (§12.1).
  2. `attemptLocked = true` synchronously; capture `token = questionToken`.
  3. `successSound.play()` (guarded `typeof`, promise `.catch`).
  4. `updateWeightForKey(currentAppId, questionIndex, -1)` exactly once.
  5. `this.score += 1`.
  6. `if (this.checkProgress()) { this.saveScore(); enter 'correct' }`.
     Otherwise stop: the engine has routed to `/display/news/…` or `/app/…`.
     Same as MCQ: score is not saved when routing away on completion.
  7. `'correct'` plays feedback (squad: soldier knocked down; boss: the real
     copy solidifies and is knocked down while the decoys dissolve), then
     `phaseTimer('correct', 900, beginTransition)`. The same 900 ms applies
     under reduced motion (§8).
- **Incorrect-answer transaction (`answer(i)`):**
  1. Same guard; `attemptLocked = true`; capture token; `wrongOption = i`.
  2. `failureSound.play()` (guarded).
  3. `this.score = Math.max(0, this.score - 1); this.saveScore();`
  4. `updateWeightForKey(currentAppId, questionIndex, 1)` exactly once.
  5. Enter `'wrong'`: amber marker. Squad: soldier i plays its `hit` role
     clip (`HitReact`, 0.42 s), shakes it off and ducks into cover. Boss:
     copy i flickers and dissolves, finishing by 450 ms (§5 `boss` timing).
     Live text `לא החייל הזה — נסו שוב` (boss:
     `זה היה העתק — נסו שוב`).
  6. `if (this.checkProgress()) phaseTimer('wrong', 600, unlockRetry)`. The
     same 600 ms applies under reduced motion. `unlockRetry` sets
     `attemptLocked = false` and the phase to `'engaging'`. It only runs if
     the timer's guard passes: run, question token and expected phase
     `'wrong'`, not navigated, not destroyed (§4). Question, options,
     enemy-to-option mapping, lanes, nameplates and round kind stay
     **identical**. A dissolved boss copy **re-forms** in its lane at
     `unlockRetry` (marked ✗ like `wrongOption`) and remains answerable,
     exactly as a wrong MCQ option stays clickable (manager decision, kept).
     `unlockRetry` first **cancels any remaining dissolve/flicker work** on
     that copy (snaps its effect state to "dissolved"), then starts the
     re-form, so a late dissolve frame can never hide a copy that is already
     answerable; the copy is hittable from the unlock instant (§5).

  **Exactly-once per attempt (squad and boss).** One accepted shot = one
  `answer(i)` call = one attempt. `attemptLocked` is set synchronously before
  any feedback, so in the same attempt a second bullet, a ricochet, a
  dissolve animation, a second copy under the crosshair or a lock-on that
  completes late cannot report again. Hit resolution picks **one** enemy per
  shot (the nearest hittable hitbox along the ray, else the magnet pick), so a
  shot can never hit two copies. A decoy hit is therefore exactly one wrong
  answer: one `updateWeightForKey(+1)`, one `score − 1` (floor 0), one save.

  `beginTransition` is, in this order: compute `next =
  strikeOpsNextRound(counters, cfg)` (`regroup` while the place has rounds
  left, otherwise `roaming`, or `advancing` on the lap wrap); write the
  **transition snapshot** (§4) from the outgoing counters and `next`;
  assign `next` to the counters (and award the star after a boss round);
  enter the phase; call `create()` (stop if it navigated); **commit** the
  map effects (rev 3.1, below); then:

  - `regroup`: `phaseTimer('regroup', regroupMs, arriveRound)` (1600 ms);
  - `advancing` (lap wrap): `phaseTimer('advancing', advanceMs,
    arriveRound)` (3200 ms; a fade, a teleport to the yard anchor and the
    yard squad's approach in the last `approachMs`);
  - `roaming`: in GL, no learning timer (the next gate opens and the
    objective moves on; the trigger calls `enterEncounter()`); in DOM mode,
    `phaseTimer('roaming', advanceMs, enterEncounter)`.

  **Staged counters, committed map effects (rev 3.1).** The counters
  assigned before `create()` are *staged*: they label the incoming round.
  Everything the player can see or do on the map derives instead from
  `_so.mapZoneIndex` (plain data, initially 0), which `beginTransition`
  sets to the new `zoneIndex` **only after** `create()` returned with
  `checkProgress()` true (`!_so.navigated`). Only then do the gate open
  (collider removal, animation, chime), the place-cleared announcement,
  the objective/guidance switch, the fight-box clamp release and the
  `roaming` trigger arming happen. If `create()` navigated, none of them
  happens: the phase name may already read `roaming`, but the RAF loop,
  every input handler and every debug method that moves or acts
  (`teleport`, `walkTo`, `setMoveInput`, `setView`, `skipTransition`,
  `skipToZone`, `forceBossRound`, `lockOn`, `shootEnemy`, `answer`) return
  at once (`false` or `{ok: false, reason: 'navigated'}`) when
  `_so.navigated` is set. An answer whose own `checkProgress()` fails
  (answer-time completion, §2 step 6) never enters `correct`, so no
  transition, staging or commit happens at all.

  `enterEncounter()` (rev 3) runs only in `roaming` for the target place:
  it closes the full-map overlay synchronously (rev 3.1; focus moves to
  the root if it was inside the overlay), cancels the autopilot, starts
  the centre-view assist (§3), writes a `deploying` snapshot, spawns the
  round's enemies at the place's approach points, enters `deploying` and
  starts
  `phaseTimer('deploying', approachMs, arriveRound)` — exactly the opening
  approach of the first place. `arriveRound` sets `engaging`, sets
  `attemptLocked = false`, runs `question.action()`, clears the transition
  snapshot and retires what the previous round owned. These timers are the
  authority; the enemies' approach and the lap-wrap fade read
  `timer.progress01` each frame.

  Only two timer callbacks ever set `attemptLocked = false`: `arriveRound`
  (also used by the opening `deploying` timer) and `unlockRetry`.
  Render-mode changes, pause/resume,
  context-loss handling, `restartInPlace()` and the DOM continuation never
  write `attemptLocked`.
- **Stage/list completion behavior:** engine-owned. When `reloadProgress()`
  returns `false`, the game stops scheduling work; teardown runs on route
  change. There is no in-game ending cinematic: the tech guide forbids
  deferring `reloadProgress()` to keep a cinematic alive. The completion beat
  is the success chime plus the engine's `/app/:id` screen.
- **New-item display:** v1 defines no `presentNewItems` override. The engine
  routes to `/display/news/:id` as it does for MCQ. On return the run restarts
  in the yard, round 1, with every gate closed (rev 3: the map position is
  not persisted either). That is acceptable because no run state is
  persisted.
- **Adventure virtual-list behavior:** not applicable (no registration). The
  component makes no assumption about the id shape.
- **Legacy behavior that must remain unchanged:** every existing `apps.js`
  entry, positional id and `groups.js` game index; `BalloonShooterComponent`
  and all other routes; shared-group knowledge keys; `speakAnswerOnCorrect`
  (handled inside `updateWeightForKey`, so nothing extra is needed);
  `storage.js` semantics.

The game delegates selection, weights, score persistence, progress, unlocking
and completion routing to the existing engine. It writes **no** game-specific
storage keys in v1. Quality and settings are in-memory only. Raw `localStorage`
is never used.

---

## 3. Player journey

### Opening

- **First frame (loading, then briefing):** daylight. The player stands at
  the map start — the yard's anchor on the wooden deck, inside the yard's
  fight box (as in the mockup) — looking north across grass toward yellow
  sheds, crates and a low wall, with the water tower (the plaza landmark,
  16° left of straight ahead) and hills behind. The squad is still out of
  sight behind cover; one dimmed nameplate marker per lane hovers over its
  cover. The question
  banner is fixed top-centre, the counter/stars top-left, the minimap
  top-right, and the touch controls in their COD positions (§6.6). A
  briefing card sits over the lower middle: **כוח פריצה**, the goal line
  `פגעו בחייל שמחזיק את התשובה הנכונה`, input hints (desktop or touch
  variant) and a **התחילו** button.
- **Loading:** the same card shows `טוען ציוד…` while the soldier model,
  kit GLBs and textures load (§6.4). On a 15 s timeout or a load error, the
  game switches to the documented stand-ins and carries on.
- **Input availability:** only Start, Exit and the replay control. Answer
  chips are rendered but disabled.
- **Start:** desktop requests pointer lock on the canvas. Touch requests
  fullscreen on the root and does **not** lock orientation, because portrait
  is supported. The yard encounter starts at once (the player is already in
  its fight box). The first round's **approach** plays as the phase
  `deploying` (soldiers jog from the back of the place into their cover, or
  the boss walks in and splits): an owned, pausable
  `phaseTimer('deploying', approachMs, arriveRound)` (1000 ms), so the
  opening approach freezes on pause, survives context loss and runs
  identically in DOM mode. `arriveRound` then enters `engaging`, the first
  peek happens within 0.4 s, and `question.action()` runs.
- **Skip/replay:** Enter or Space activates Start. There is no intro
  cinematic to skip.

### Movement model (decision, rev 3)

**Free roam on one small compound map, with encounter boundaries.**
*Removed (rev 3):* revision 2.1's "guided zones with a small free-move pad"
(a 3 × 2 m pad, a ±100° yaw clamp and an automatic camera glide along an
authored `advancePath` between zones). The user asked for a real map to
walk.

- **Moving.** The player walks anywhere inside the compound that is open
  to them: left virtual
  joystick (touch) or WASD (desktop/keyboard), looking with the mouse
  (pointer lock, cursor edge-pan fallback), a right-side drag (touch) or
  the ←/→ keys (keyboard-only turning). There is **no yaw clamp** in any
  phase; pitch stays clamped. Speeds (§5 `movement`): walk 3.0 m/s,
  optional sprint 4.2 m/s while roaming (hold Shift, or push the joystick
  to its rim), 2.4 m/s inside a fight box, ×0.55 while aiming down sights;
  gentle acceleration (10 m/s²) and braking (14 m/s²); **no head bob** in
  any motion mode, no camera roll, constant eye height (the ground is flat;
  the 0.12 m decks are walked over without a step).
- **Colliding.** The player is a vertical capsule of radius 0.3 m.
  Collision is 2D (x/z) against axis-aligned boxes (walls, sheds,
  containers, cover, closed gates, pre-clear blockers) and circles
  (barrels, trees, rocks, the water-tower legs), sliding along surfaces; the
  map border is an invisible wall dressed with fences, hedges and container
  rows. There is nothing to fall off and no jumping.
- **Places and gates.** The compound has four places in a fixed order
  (§5.1). Each place's far side (its *enemy side*: lanes, approach points,
  boss stage, exit gate) is blocked until the place is cleared; the gate
  to the next place is closed until then. So, before clearing, the only
  thing a child can reach in a place is its **fight box**, and after
  clearing the only new thing they can reach is the next place.
- **Encounters.** Walking into the target place's fight box (a 6 × 3.5 m
  area in front of the squad, outlined on the ground by a faint tape line
  and shown on the minimap) starts its encounter. **Centre-view assist
  (rev 3.1, manager decision):** the player glides from the entry point to
  the place's **anchor** while the view turns to the place's heading and
  levels its pitch, over `centreAssistMs` (400 ms, eased) at the start of
  the 1 s `deploying` approach, so every encounter starts from the
  validated anchor view (all four lanes within ±28°, full occlusion from
  the core, full nameplates). Under reduced motion the glide is skipped:
  the pose is set at once. Movement and look input are ignored during
  those 400 ms (they resume afterwards; held keys and the joystick then
  act normally). The squad deploys (`deploying`, 1 s) and the rounds
  run. *Replaces* revision 3's yaw-only auto-turn.
  During the encounter the fight box is the **encounter boundary**: the
  player may strafe, step forward/back and step around inside it, but
  movement is clamped to it; pushing against the edge shows the
  tape line brighter and, once per encounter, the toast
  `הישארו בקו האש עד שהמקום נקי`. Enemies never follow the player and never
  leave their lanes, so every distance, sightline and order guarantee is
  validated over the fight box (§5).
- **Between encounters (`roaming`).** After a place's boss round the next
  gate opens (a boom barrier lifts or a gate swings, 600 ms, with a chime
  and a green light), the objective moves to the next place, and the
  player walks there freely (or may go back to cleared places; nothing
  happens there).

Why this option, for children:

- it is the real map the user asked for — walking, advancing, passing
  between places — while the learning moments stay in places a child
  cannot wander out of;
- the joystick stays **optional during encounters** (fully playable with
  look + fire, or lock-on via 1–4 / chips), and the **קדימה** button walks
  the player to the next place, so keyboard-only, switch and lock-on-only
  players are never stuck between places (§8);
- the line-of-sight invariant from revision 1 (every exposed enemy is
  hittable from every point the player may stand on during an encounter)
  is validated from every fight-box sample, so lock-on and touch players are
  never disadvantaged;
- enemies following the player was rejected: it would make cover, exposure
  fairness and the order guarantee depend on where the child walks; a
  boundary keeps them all validated by construction.

### Guidance: a child never gets lost (rev 3)

All aids read one **objective**: during an encounter, the place's fight
box (already reached); during `roaming`, the target place's fight-box
anchor; on the lap wrap, the yard. The route to it comes from the authored
route graph (§5.1), never from a runtime path search over the scene.

1. **Objective marker** (`.so-objective`, DOM, `aria-hidden`): a diamond
   with a flag icon, the place name and the distance (`12 מ׳`), projected
   at the objective's position 1.8 m above the ground. When the objective
   is off-screen or behind the camera, the marker is pinned to the edge of
   the nameplate safe rectangle on the side of its bearing, with an arrow
   pointing toward it. Hidden during encounters (the squad is the
   objective then).
2. **Ground chevrons:** during `roaming`, up to 24 chevron decals spaced
   1.5 m along the remaining route from the player's projection on the
   route to the objective (one `InstancedMesh`, one draw); a slow brightness
   pulse in normal motion, static under reduced motion. They brighten after
   15 s without movement input.
3. **Minimap with the route:** a pre-rendered top-down map of the whole
   compound (§6.6), the remaining route as a dotted line, the objective as a
   star (an arrow on the minimap rim when it lies beyond the minimap range),
   gates as red bars (closed) or green gaps (open).
4. **Place toast:** entering a place's region (and the lap wrap) shows its
   name for 1.6 s below the banner (`.so-toast`, e.g. `חצר המכולות`) and
   announces it once through `.so-live`; re-entries are throttled to once
   per 4 s.
5. **Objective line:** during `roaming` the banner shows
   `התקדמו אל: <place name>` with a direction arrow (the question for the
   next round is held until the encounter starts; §2). The replay control
   is disabled there.
6. **קדימה (go) autopilot:** a `.so-go` button (≥ 56 px, above the joystick
   on touch, beside the weapon slot on desktop) and the `KeyG` key, shown
   only in `roaming`. It walks the player along the route graph to the
   target fight box at walking speed, turning the view smoothly toward the
   walking direction (instant under reduced motion). Any movement or look
   input cancels it; pressing it again resumes. After 15 s in `roaming`
   without movement input the button pulses (static outline under reduced
   motion). The autopilot is the same code as the debug `walkTo` (§12.1).
7. **Gate feedback:** a closed gate shows a red light and the next place's
   name on its sign; when it opens, the light turns green, a chime plays
   and `.so-live` announces `השער ל<place name> נפתח`.

### Rhythm: calm → (roam) → approach → peek

Each round has three beats; only the third is a learning phase. After a
place's boss round a free **roam** beat sits between calm and approach.

1. **Calm** (transition after a correct answer: `regroup` 1.6 s inside a
   place; after a boss round the gate opens and `roaming` begins; after the
   plaza's boss round, the lap-wrap `advancing` 3.2 s). The banner
   cross-fades to the new question (`regroup`) or to the objective line
   (`roaming`, `advancing`); no enemy is hittable; ambient life only.
2. **Roam** (`roaming`, rev 3, untimed in GL): the player walks to the next
   place; the guidance aids above are active.
3. **Approach** (the last ≈1 s of `regroup` or of the lap wrap, or the
   `deploying` beat after a place's trigger): the incoming squad jogs from
   the back of the place into its lanes' cover (boss round: the boss walks
   to centre stage and splits). Nameplates fade in over their cover.
4. **Peek** (`engaging`): enemies peek on the deterministic schedule (§5)
   until the right one is tagged.

### Core loop

1. **Engaging (squad round):** the player looks around from anywhere in the
   fight box (optionally strafing or stepping around) and watches soldiers
   take predictable turns peeking from cover or dashing between their
   lane's two cover spots (≈4 s exposed, 1.5 s hidden, staggered). Every
   soldier wears a nameplate with one answer and a badge; the same answer
   and badge appear on the matching chip of the accessible answer list,
   which is also in left-to-right order (§2).
2. **Shoot:** a semi-auto shot raycasts from the crosshair (or from the
   cursor or touch aim point). Cover blocks shots. Only an *exposed* enemy's
   enlarged torso hitbox counts. A hit calls `answer(enemy.index)`. Chip
   taps and keys 1–4 instead **lock on** (§8) and fire through the same
   `fire()` path.
3. **Feedback:** correct → the soldier is tagged and the round transitions
   (§3 Correct). Wrong → amber marker, the soldier flinches and ducks, the
   same question is retried after 600 ms.
4. **Boss round (every 4th round of a place, i.e. every 4th question):**
   inside the 1000 ms approach beat the boss appears at centre stage
   (0–250 ms), splits into `options.length` holographic copies that glide
   into their lanes (250–850 ms) and settles (850–1000 ms), so every copy
   is in place before `engaging` starts (§5 `boss` timing). Copies stand in
   the open (no cover), patrol slowly within their lane (all copies in the
   same patrol phase, so their clips match: no tell) and are always
   hittable once `engaging` starts. Every copy looks identical and carries
   one answer. The shot copy decides the outcome through the same
   `answer(i)`.
5. **Transition:** the next question is generated at transition start; after
   a squad round the place `regroup`s; after the boss round the next gate
   opens and the player **walks** to the next place (`roaming`, rev 3);
   after the plaza's boss round the lap wraps (`advancing`: a fade back to
   the yard with every gate closed, `סבב 2`).

### Correct answer

- **Immediate (0–150 ms):** teal **check** hitmarker (✓ shape) on the
  crosshair; hit tick synth plus `successSound`; the enemy's nameplate and
  answer chip switch to the "correct" state (✓ icon and text `פגיעה!`); live
  region `פגיעה!` (boss: `פגעתם במפקד האמיתי!`).
- **Transitional (0.9 s phase timer):**
  - squad: the soldier plays its `down` role (`Death`, 0.75 s) as a cartoon
    **knockdown**: it falls over, a small puff of stars/sparkles pops above
    its head at 450 ms, then it fades out over 600 ms starting at 750 ms
    (the fade ends 450 ms into the transition, before any incoming approach
    starts; no ragdoll, debris, blood or gore). The other soldiers play
    `cheer` (`Wave`) once and duck back into cover;
  - boss: the real copy **solidifies** (hologram shimmer drops, full colour),
    plays `hit` then the same knockdown; every other copy dissolves into
    soft particles (tier ≥ 1) or fades (tier 0 / reduced motion) within
    450 ms.
- **Transition (`regroup` 1.6 s, `roaming` untimed in GL, or the lap-wrap
  `advancing` 3.2 s):** the counters advance, then `create()` runs. The
  counter/stars update in the same frame; the banner cross-fades to the new
  question (`regroup`) or to the objective line (`roaming`, `advancing`).
  - `regroup`: the player keeps moving freely inside the fight box; the
    untagged soldiers are retired at transition start and the knocked-down
    one when its fade ends; the next squad approaches (calm → approach).
  - `roaming` (rev 3): the outgoing round is retired as for `regroup`; the
    next gate opens (600 ms animation; instant under reduced motion); the
    fight-box clamp is released; the guidance aids switch on (§3 Guidance)
    and `.so-live` announces `האזור נוקה! השער ל<place> נפתח`. When the
    player enters the target place's fight box, `enterEncounter()` starts
    the approach (`deploying`). In the DOM render mode a 3.2 s
    `phaseTimer('roaming', …)` replaces the walk.
  - `advancing` (rev 3: only the lap wrap after the plaza): a 300 ms fade
    to the theme's haze colour, a teleport to the map start with every gate
    closed and the stars reset, the toast `סבב 2` (or the current lap), then
    the yard squad approaches in the last second. *Removed (rev 3):* the
    camera glide along a zone's `advancePath`.
  - **Reduced motion:** `regroup` and `advancing` show a static frame with
    a `החוליה מתארגנת…` / `סבב חדש…` progress line until the same timer
    ends; enemies appear in cover without the jog; gates open without the
    swing; the centre-view assist is an instant cut.
  - **DOM render mode, or rendering off:** the banner cross-fade, with the
    same timers (DOM: `roaming` is the 3.2 s timer).
- **Permanent:** the question counter `שאלה N/M`, the place stars, and the
  engine progress bar (§6.6).

### Incorrect answer and retry

- Amber **ring** hitmarker (no check; a different shape from correct). A
  soft low "bonk" synth plays, then `failureSound`. The chip and nameplate
  get an amber outline and a `✗` glyph for the rest of this question (like
  `wrongOption` in knowledge-defense). Live region: `לא החייל הזה — נסו שוב`
  (boss: `זה היה העתק — נסו שוב`).
  - squad: the soldier plays `hit` (`HitReact`, a 0.42 s flinch), then
    ducks into cover and rejoins its own unchanged schedule;
  - boss: the copy flickers (2 quick opacity dips, 200 ms) and dissolves
    (250 ms), so it is fully dissolved at 450 ms, 150 ms before the 600 ms
    unlock; at `unlockRetry` any leftover effect is cancelled and it
    re-forms in its lane (hittable at once, still marked ✗).
- **No player health, no fail state (decision).** There is no HP bar, no
  damage, no "you were hit", no game over, no lives and no timer pressure.
  Enemies in `exposed` sometimes play their `shoot` role clip toward the
  fight box; it emits a harmless foam puff from the muzzle that pops in mid-air
  well short of the camera (never a screen splat, never on the HUD). Why:
  - the engine already owns the only consequence of a wrong answer (score −1
    and weight +1); a second penalty system would punish twice and
    duplicate engine state, which AGENTS.md forbids;
  - fail screens and "you died" moments are stressful for young learners and
    turn a learning miss into a loss; the target audience is children;
  - foam puffs keep the scene alive and "COD-like" without a threat.
  The mockup's HP bar position is reused for the **engine progress bar**.
- No camera shake, screen flash or hit-direction indicator.
- Input: look and move stay live. Fire and lock-on are disabled for 600 ms
  (in every motion mode), then `engaging` resumes with the identical question.
  If the game is paused during this time, the remaining delay is frozen and
  resumes after Resume (§4).

### Progression

- Top-left HUD pocket (physical position, as in the mockup): an emblem,
  `שאלה N/M` and up to 4 stars (rev 3: one slot per place).
  - `N` is the visual round counter of this lap (starting at 1, not
    persisted). `M` is `zonePlan.zones × roundsPerZone` = 4 × 4 = 16; after
    round `M` the lap wraps and the counter shows `סבב 2 · שאלה 1/16` and
    continues — the engine, not this counter, decides when the list is
    complete.
  - Stars: one per place **cleared in this lap** (boss round won), 0–4,
    reset at the lap wrap. They are a journey indicator, not a grade, and
    are never persisted or derived from weights.
  - The minimap shows cleared places with a small check on their region
    (presentation only).
- Bottom-centre bar (where the mockup has HP): `progress.progress /
  progress.total` from the engine-owned `progress`, with `this.score` beside
  it. There is no second progression system and no XP.

### Ending

- Completion is engine-routed (see §2). Exiting at any time uses the **יציאה**
  button (top-left, beside the counter pocket), which goes to `/app/:id`, or
  to the Adventure world if a future encounter resolves. Replaying restarts
  in the yard, round 1, every gate closed, with engine-selected questions.
  The list may complete anywhere on the map (in an encounter or while
  roaming right after a correct answer); the game then stops wherever the
  player is and the engine routes.

---

## 4. State machine

`phase` (reactive, a debug contract) takes one of the values below. The
**playing phases** are `deploying`, `engaging`, `wrong`, `correct`,
`regroup`, `roaming` and `advancing` (`PLAY_PHASES`); `regroup` and
`advancing` replaced revision 1's single `breaching` phase, `deploying` is
the approach that opens every encounter (the first one at Start, the
others at a place's trigger), **`roaming` (rev 3)** is the free walk to the
next place, and `advancing` is now only the lap wrap. `paused` and `lost`
are **suspensions**: they freeze a playing phase (kept in `resumePhase`)
and never accept an answer.

**Encounter vs. roam (rev 3).** The *encounter phases* are `deploying`,
`engaging`, `wrong`, `correct` and `regroup`: the player's movement is
clamped to the current place's fight box and enemies exist. `roaming` and
`advancing` have no enemies and no fight-box clamp (`advancing` holds the
player still during its fade). The phase alone decides which applies.

**Render mode is not a phase (rev 2.1 blocker fix).** A separate reactive
`renderMode` is `'gl'` (Three.js scene) or `'dom'` (no THREE/WebGL at
mount, a failed restart, or "continue without 3D"). Revision 2's
`fallback` phase is removed: in DOM mode the **same** learning phases run
(`engaging`, `wrong`, `correct`, `regroup`, `roaming`, `advancing`,
`deploying`) with the same timers — `roaming` gains its `advanceMs` timer
there (§2) — and the answer list calls `answer(i, token)` directly.
Switching the render mode never writes `phase` to anything except the
frozen playing phase, and never writes `attemptLocked`, `questionToken` or
the counters. (Revision-1 slice bug: `enterFallback()` unconditionally set
`attemptLocked = false` and `phase = 'fallback'`; after a context loss
during `correct` that reopened answering while the saved `correct` timer,
expecting `correct`, could never run.)

| State | Entered by | Owns | Accepts input | Exits when / to |
|---|---|---|---|---|
| `loading` | `mounted()`, only if not navigated and still on the route (§2 guard); or `restartInPlace()` from `lost` | renderer init, soldier/prop loads, the **whole map** built once (§5.1, §10; on restart: the map rebuilt with gate/blocker state derived from `zoneIndex`, the player at `_so.player`, and the enemies from the transition snapshot or the current round) | Exit | assets ready or procedural fallback → `briefing` (restart: → the frozen `resumePhase`); no THREE/WebGL → `renderMode = 'dom'`, then `briefing` (restart failure: → `renderMode = 'dom'`, then the frozen `resumePhase`) |
| `briefing` | ready | squad idling in the yard's cover, ambient life; player at the map start | Start, Exit, replay | Start (pointer lock granted, cursor or touch mode) → `deploying` |
| `deploying` | Start (the yard), or **`enterEncounter()`** from `roaming` when the player enters the target place's fight box (rev 3) | `phaseTimer('deploying', approachMs, arriveRound)`; the squad's approach (or boss split) reads the timer's progress; the fight-box clamp | look, move (clamped), pause, exit | timer → `arriveRound` → `engaging` and `question.action()` |
| `engaging` | `unlockRetry`, `arriveRound` | squad/boss scheduler clock, aim and move (clamped to the fight box), nameplates, minimap | look, move, fire, lock-on (1–4 or chip), ADS, reload, replay, pause, exit | `answer()` → `correct` / `wrong`; pause → `paused` |
| `wrong` | `answer()` wrong | `phaseTimer('wrong', 600, unlockRetry)`; squad `hit` clip + duck, or boss-copy dissolve | look, move, ADS, reload, pause, exit (no fire or lock-on) | timer → `engaging` (same token; a dissolved copy re-forms) |
| `correct` | `answer()` correct and `checkProgress()` true | knockdown / solidify-and-dissolve feedback, `phaseTimer('correct', 900, beginTransition)` | look, move, pause, exit | timer → `beginTransition()` → `regroup`, `roaming` or `advancing` (or stop if `create()` navigated) |
| `regroup` | `beginTransition()` while the place has rounds left | `phaseTimer('regroup', 1600, arriveRound)`; retire the old squad (the knocked-down soldier at its fade end); next squad (or boss) approach reads the timer's progress | look, move (clamped), pause, exit | timer end (or `skipTransition()`) → `arriveRound` → `engaging` and `question.action()` |
| `roaming` (rev 3) | `beginTransition()` after a place's boss round, when the next place is not the lap wrap | the opened gate (derived from `zoneIndex`), the guidance aids (objective marker, chevrons, route line, **קדימה** autopilot), the trigger check against the target fight box each simulation step; **no learning timer in GL**; in DOM mode `phaseTimer('roaming', advanceMs, enterEncounter)` | look, move (free, sprint allowed), go/autopilot, map, pause, exit | player inside the target fight box (walk, autopilot, `teleport()`), `skipTransition()`, or the DOM timer → `enterEncounter()` → `deploying` |
| `advancing` (rev 3: lap wrap only) | `beginTransition()` after the plaza's boss round | `phaseTimer('advancing', 3200, arriveRound)`; the fade, the idempotent `applyLapPose()` (§ transition snapshot: from the step at progress ≥ 0.5, from `arriveRound`, or from the rebuild), all gates closed, the yard squad's approach in the last `approachMs` | pause, exit | timer end (or `skipTransition()`) → `arriveRound` → `engaging` and `question.action()` |
| `paused` | Esc / pointer-lock loss (desktop), `visibilitychange` hidden, pause button, from `briefing` or any playing phase (in either render mode) | frozen scheduler clock; **frozen phase timers** (remaining delay kept); stopped RAF loop; suspended `AudioContext` | Resume, Exit | Resume (re-lock, cursor or touch mode) → the resume target (§ below: the pending timer's `expectPhase`, else `resumePhase`), then the frozen timers restart with their remaining delay |
| `lost` | `webglcontextlost` (only while `renderMode === 'gl'`) | `_so.gfx++` first; cosmetic timers cancelled; the scene torn down (§10); the frozen playing phase in `resumePhase` (from `paused`: its `resumePhase`); the transition snapshot if one exists; the panel offers **התחלה מחדש** (`restartInPlace()`), **המשך בלי תלת-ממד** (`continueInDom()`) and **חזרה** (`exitGame()`) | the panel buttons only | a panel choice (no automatic resume; `webglcontextrestored` is ignored) |
| `left` | `beforeDestroy` | nothing | none | terminal |

The DOM render mode has no row: it is orthogonal. In DOM mode the root
gets `.so-dom` and `data-render="dom"`, the canvas, minimap, nameplates,
joystick and fire cluster are hidden, and the answer list, banner, counter,
progress and pause/exit remain. The playing phases accept the same inputs
except those that need the scene (look, move, fire, ADS, go/autopilot);
the chips call `answer(i, token)` in `engaging` and are disabled otherwise.
In DOM mode `roaming` shows the objective line with a `מתקדמים אל <place>…`
progress line until its 3.2 s timer ends.

- **`roaming` and the resume rules (rev 3).** In GL `roaming` no learning
  timer is pending, so every resume path (Resume, `restartInPlace()`,
  `continueInDom()`) returns to `resumePhase === 'roaming'`.
  `continueInDom()` from GL `roaming` then starts the DOM
  `phaseTimer('roaming', advanceMs, enterEncounter)` (the walk cannot
  continue without a scene); `restartInPlace()` returns the player to the
  same pose. While paused or `lost`, the autopilot, the movement
  integration and the trigger check are stopped with the RAF loop, so a
  frozen player can never trigger an encounter. The trigger check also runs
  once synchronously inside `teleport()` and `skipTransition()`.
- **Held input on suspension (rev 3.1).** Entering `paused` (any cause:
  Esc, pointer-lock loss, `visibilitychange`, the pause button, window
  `blur`) or `lost` runs `releaseInputs()`: every captured pointer is
  released (`releasePointerCapture` where held) and **forgotten** — the
  joystick knob is centred and its vector zeroed, look drags and the fire
  pointer are dropped —, held keys are cleared, the virtual input of
  `setMoveInput` is cleared, velocity is set to 0, sprint is off, ADS is
  released and lock-on is cancelled. After resume, `pointermove`/`pointerup`
  events of a forgotten pointer id are ignored, so lifting a finger that
  went down before the suspension does nothing; a new touch is needed to
  move or look. **Autopilot policy:** `paused` keeps the autopilot's
  target and route and resumes walking after Resume (it was an explicit
  request); `lost`, `continueInDom()` and `restartInPlace()` cancel it (the
  player presses **קדימה** again; DOM mode uses its timer). The
  centre-view assist, if interrupted, completes at once on resume.

- **Resume target rule (used by Resume, `restartInPlace()` and
  `continueInDom()`).** `resumeTarget()` returns the `expectPhase` of the
  pending learning timer when one exists (at most one learning timer is
  pending at any time, asserted in tests), otherwise the frozen
  `resumePhase`. If they ever disagree, the timer's `expectPhase` wins and a
  warning is logged once. `briefing` (or `loading`) resumes as `briefing` in
  DOM mode and as `deploying` via the same Start path after a restart click
  (the click is the start gesture). The function sets
  `phase = resumeTarget()` **before** `resumeTimers()`, so the pending
  timer's guard passes exactly once. The lock is never touched: after a loss
  during `correct`, the DOM continuation resumes `correct` with the lock
  still held, the `correct` timer fires `beginTransition`, and the next
  question opens only at `arriveRound`.
- **`continueInDom()`** (**המשך בלי תלת-ממד**, and the restart-failure path):
  sets `renderMode = 'dom'`, shows the DOM layout, applies the resume target
  rule and calls `resumeTimers()`. It runs `question.action()` only when it
  resumes into `engaging` without a pending timer **and** the action has not
  yet run for this `questionToken` (`so.actionToken`).

- **Context-loss restart in place (replaces revision 1's route
  re-entry).** `restartInPlace()` runs from the **התחלה מחדש** click on the
  same component instance and never touches the router. (Revision-1 slice
  bug: `restartFromLost()` did `router.replace('/app/…')` then polled an
  unowned `setTimeout` to `push('/play/…')`; under the LearnBox guard and a
  fake clock it raced teardown and could end on `/app` or in `briefing`
  instead of play.) It:
  1. increments the graphics generation `_so.gfx` (it was already bumped on
     loss; bumping again invalidates anything scheduled while `lost`). It
     does **not** touch `_so.run`, so the frozen learning timers keep their
     stamp, `token`, `expectPhase` and `remaining` and need no re-stamping;
  2. creates a new canvas and renderer and reloads the shared assets
     (`phase = 'loading'`, `resumePhase` kept), then rebuilds the scene for
     the frozen state — the whole map (gates and blockers derived from
     `zoneIndex`, rev 3), the player at the plain-data `_so.player` pose,
     and the enemies from the **transition snapshot** when one exists
     (below), otherwise the current round's enemies for the current
     question (none in `roaming`) — with no `generateFromList`, no
     `reloadProgress`, no learning call, and the same `questionToken`,
     `attemptLocked`, counters and `wrongOption`;
  3. when ready, applies the resume target rule (above) and calls
     `resumeTimers()`; it requests pointer lock synchronously inside the
     click handler;
  4. if WebGL creation fails again, calls `continueInDom()` (same timers,
     same lock, same resume target).

  The browser test asserts that the hash and `history.length` are unchanged
  and that the phase ends in the frozen playing phase (§12.3 check 20).
- **Graphics generation (rev 2.1).** `_so.gfx` is a counter separate from
  `_so.run`. `onContextLost()` does, in this order: `_so.gfx++`;
  `pauseTimers()` (learning timers frozen, not cleared); cancel **every**
  cosmetic timer in `_so.timers` (hitmarker clear, reload finish, lock-on
  settle, foam-puff spawn, resize debounce, fullscreen re-measure, minimap
  throttle, chip-collapse hysteresis, knockdown/dissolve effect steps);
  `stopLoop()`; `cancelLock()`; suspend the owned `AudioContext`; record
  `resumePhase`; `phase = 'lost'`; release the scene (§10). Every GLB/texture
  load callback and every graphics callback captures `gfx` when scheduled
  and, if `gfx !== _so.gfx` when it runs, disposes what it received and
  returns. Learning timers check `run` (instance life), never `gfx`.
  Teardown bumps both.
- **Transition snapshot (rev 2.1; rev 3 kinds).** `beginTransition()`,
  Start and `enterEncounter()` write a plain-data `_so.transition` (no
  THREE objects) that is cleared by `arriveRound`:
  `{kind: 'deploying'|'regroup'|'roaming'|'advancing', from: {zoneIndex,
  zoneNumber, roundNumber, roundInZone, roundKind, taggedIndex}, to:
  {zoneIndex, zoneNumber, roundNumber, roundInZone, roundKind},
  questionToken, durationMs (null for GL roaming), lap, schedulerMs,
  outgoingRetired: {untagged: bool, tagged: bool}, resumePhase}`.
  *Removed (rev 3):* `pathZoneIndex` and the `advancePath` camera pose. A
  `roaming` snapshot is replaced by a `deploying` one in
  `enterEncounter()`. Elapsed progress is not stored separately: it is
  `1 − timer.remaining / durationMs` from the frozen learning timer, so it
  is exact across pause and loss. A rebuild after loss or failed restart
  uses it to place the incoming enemies at their approach pose for the
  current progress (`deploying`, `regroup`, the last second of
  `advancing`) or none (`roaming`); the map itself and the player pose come
  from `_so.mapZoneIndex` and `_so.player`, which a loss never changes.
  **Lap-wrap pose (rev 3.1).** `applyLapPose()` is an idempotent
  simulation operation: if `transition.lapPoseApplied` is false it puts
  the player at the start pose, zeroes velocity and inputs, commits
  `_so.mapZoneIndex = 0` (all gates closed, blockers up), resets the
  stars' display and sets `lapPoseApplied = true` in the snapshot;
  otherwise it does nothing. It is called from three places, each of which
  may run first: the simulation step once the advancing timer's progress
  reaches 0.5 (the fade midpoint), `arriveRound` for an `advancing`
  transition (so `skipTransition()` with RAF stopped still lands the
  player in the yard), and the context-loss rebuild when the frozen
  progress is ≥ 0.5. The visual fade only *reads* the timer. The rebuild never generates a question, never
  advances a counter and never creates a second timer, so arrival happens
  exactly once. Loss in `paused` freezes the paused phase's `resumePhase`
  (and snapshot) unchanged; loss in `deploying` rebuilds the approach from
  the same snapshot. Outside a transition (`engaging`, `wrong`, `correct`)
  the rebuild uses the current round plus `wrongOption`/`correctIndex` and
  the frozen timer's progress to restore each enemy's effect state (a
  dissolved decoy stays dissolved until `unlockRetry`; a knocked-down
  soldier resumes at its knockdown progress). The DOM continuation needs no
  rebuild: it reads the same snapshot only to show the banner/counter (or
  the objective line) for the incoming round.
- **Pausable phase timers (pause-race fix).**
  `phaseTimer(expectPhase, ms, fn)` stores
  `{expectPhase, token: questionToken, run: _so.run, remaining: ms, startedAt, id}`
  in `_so.phaseTimers`. `pauseTimers()` clears each pending `setTimeout` and
  keeps `remaining -= now − startedAt`. `resumeTimers()` reschedules them
  with `remaining`. When the timer fires, `fn` runs **only if** all of these
  hold:
  - `run === _so.run`;
  - `token === questionToken`;
  - `phase === expectPhase`;
  - `!_so.navigated && !_so.destroyed`.

  Because `phase === 'paused'` fails the check, a retry or transition
  callback can **never** overwrite `paused` with `engaging`. Entering
  `paused` always calls `pauseTimers()` first. Resume restores
  `phase = resumePhase` **before** `resumeTimers()`.
  `timer.progress01 = 1 − remaining/ms` drives visuals. `skipTransition()`
  sets the `deploying`/`regroup`/`advancing` timer's (and the DOM
  `roaming` timer's) `remaining` to 0 and reschedules it, which runs the
  same guarded callback; in GL `roaming` it instead teleports the player to
  the target fight box's anchor and runs the trigger check, which calls
  `enterEncounter()` (rev 3).
- **Duplicate-input guard:** `attemptLocked` is set synchronously in
  `answer()`, which is the only function calling `updateWeightForKey`.
  `fire()` refuses unless `phase === 'engaging'`, and enforces a 150 ms
  semi-auto cooldown and an ammo check (auto-reload makes the check
  forgiving, §6.5). Hit resolution returns at most **one** enemy per shot.
  Key auto-repeat is ignored (`event.repeat`). Touch fire uses `pointerdown`
  with that pointer captured, so a ghost `click` cannot double-fire.
- **Stale callback / route-change guard:**
  - `questionToken` (incremented per question);
  - `_so.run` (incremented only on teardown: the instance's life);
  - `_so.gfx` (incremented on context loss, on `restartInPlace()` and on
    teardown: the scene's life);
  - `_so.navigated` (set on any `checkProgress() === false`).

  Learning transitions use `phaseTimer`. Cosmetic delays (hitmarker clear,
  reload finish, resize debounce, fullscreen re-measure, lock-on settle,
  foam-puff spawn, minimap redraw throttle, effect steps) use
  `ownTimeout(fn, ms)`, which checks `run`, `gfx`, `destroyed` and
  `navigated`; context loss also clears them outright. The lock-on settle
  also checks the token and `phase === 'engaging'`. GLB and texture promise
  callbacks check `gfx`, `run` and `navigated`; if stale, they dispose what
  they loaded.
- **Destroyed-instance guard:** `_so.destroyed = true` and `_so.run++` are the
  first two statements of teardown, so the RAF frame callback, listeners and
  loader callbacks all return early afterwards.

Implementation notes that are easy to get wrong:

- `BaseGameComponent.created()` calls `this.create()` **before** the child's
  `created` hook and before mount. Initialize all non-reactive runtime state
  (`this._so = {timers:new Set(), listeners:[], run:0, …}`) in
  **`beforeCreate`**, never in `created`. `create()` must not touch the DOM or
  THREE. If the scene is not ready, it only records the question (and the
  round kind), and `mounted` builds the map and the yard's squad for it.
- Keep every THREE object on the non-reactive `this._so` namespace. Never put
  scenes, meshes, mixers or vectors in `data`: Vue 2 would deep-observe the
  scene graph. Do not use `this._g` or other `_x` names that collide with Vue
  render helpers (see the `duel_shooter` note in GAME_ARCHITECTURE.md §9).

---

## 5. World and configuration model

All configuration is declarative and exported (frozen) as
`STRIKE_OPS_CONFIG`, validated by `validateStrikeOpsConfig()` in Node.

- **Coordinates (rev 3).** Two frames, both in metres with `y` up:
  - **Map frame:** `x` east, `z` north (north is up on the plan image and
    on the minimap's north-up overlay). It **equals the yard's arena-local
    frame** (yard origin (0, 0), heading 0), so every number of the built
    `YARD` zone stays valid unchanged. A THREE world position is
    `(−x, y, z)` — the mirror the built zone groups already apply.
  - **Arena-local frame** of each place: `x` lateral (positive = the
    player's right when facing the place's squad), `z` depth away from the
    anchor. `map = origin + right·x + forward·z` with `forward = (sin h,
    cos h)` and `right = (cos h, −sin h)` for the place's compass heading
    `h = headingDeg` (0 north, 90 east, clockwise). Headings are multiples
    of 90°, so arena AABBs stay AABBs in the map frame and collision stays
    axis-aligned. The pure, exported `strikeOpsArenaToMap(zone, x, z)`
    implements it; the built `zoneToWorld(zone, x, z)` (THREE frame) is
    equivalent with `facingDeg = −headingDeg` and a THREE origin of
    `(−origin.x, origin.z)`.

  Lane order "left to right" always means increasing arena-local `x`
  **as projected from the fight box**, which validation checks with angles,
  not just coordinates.
- **Config entities:**
  - `zonePlan`: `{zones: ['yard', 'containers', 'sheds', 'plaza'],
    roundsPerZone: 4, bossRoundIndex: 3}`. Rounds 0–2 of a place are squad
    rounds, round 3 is the boss round (every 4th question). After the last
    place the plan wraps to the yard (the lap wrap, `סבב 2`). *Removed
    (rev 3):* the slice's single-zone loop through a short `advancePath`.
  - `map` (rev 3, map frame, §5.1): `{bounds, playBounds, start, walls[], gates[],
    structures[], paths[], nodes{}, legs[], gateOpenMs: 600, toastMs: 1600,
    chevrons: {max: 24, spacingM: 1.5}, idleHintMs: 15000}`.
  - `zones[]` (the four **places**): `{id, name, region, origin, headingDeg,
    entryGate, exitGate, enemyZone, coverKinds[8], props[], grassSpots[]}`
    plus the **arena** fields, which every slice place takes from the shared
    template `LINE4` (exactly the built `YARD` gameplay data, arena-local):
    `{core, anchor, fightBox, cover[8], lanes[4], laneSets, boss: {stage,
    points[4]}, approach[4]}`:
    - `region` (map AABB): the place's floor, used for the current-place
      lookup, the place toast and chunk visibility;
    - `core` (*was* `pad`): `{minX: −1.5, maxX: 1.5, minZ: 0, maxZ: 2}`, the
      3 × 2 m rectangle around the anchor from which **hide occlusion** is
      validated;
    - `anchor` (*was* `spawn`): `{x: 0, z: 1}`, the point the objective
      marker and the autopilot aim at and the eye point of the framing
      check; the map start is the yard's anchor;
    - `fightBox`: `{minX: −3, maxX: 3, minZ: −0.5, maxZ: 3}` (6 × 3.5 m):
      the **trigger** and, during an encounter, the **movement clamp**;
    - `enemyZone` (map AABB): the place's enemy side, wall to wall,
      including its exit gate; a collider until the place is cleared
      (pre-clear blocker, §5.1);
    - `cover[]`: AABBs with a `kind` used for LOS, occlusion and collision;
      per place, `coverKinds[k]` picks the kit piece drawn for template box
      `k` (crates, barrels, sandbags, stoneWall), so places look different
      with identical, validated geometry;
    - `lanes[]`: exactly 4, ordered left → right. Each lane has two cover
      **spots** `{hide:{x,z}, peek:{x,z}, via?:[{x,z}]}` and a `dash` path
      between the two spots (soldiers relocate between them). A round with
      `n < 4` options uses the `n` lanes chosen by `laneSets[n]` (e.g.
      `n = 3 → [0, 1, 3]`), still in ascending order;
    - `boss`: `{stage:{x,z}, points:[{x,z} × 4]}`: where the boss stands
      before the split and where copy `k` settles in lane `k` (its patrol
      runs `±boss.patrol.legM / 2` laterally around that point);
    - `approach[]`: one entry point per lane at the back of the place, from
      which soldiers jog into cover during the approach beat;
    - `props[]`: `{kind, x, z, ry, w, d, h}` arena-local dressing placed
      from the sourced kit pieces (§6.4) and **statically merged** per
      material (§6.2), always outside every fight-box→enemy sightline (the
      yard keeps its built list; map-wide structures live in `map`);
    - *Removed (rev 3):* `pad`, `spawn`, `yawLimitDeg`, `bounds` (replaced
      by `region`) and `advancePath[]`.
  - `squad` (exposure): `{exposedMs: 4000, hiddenMs: 1500, slideMs: 350,
    firstPeekMs: 400, relocateEvery: 2, dashMs: 900}`, within the agreed
    bounds (exposed 3–5 s, hidden 1–2 s). The **same values apply under
    reduced motion**; reduced motion changes only how motion is drawn (§8).
  - `boss` (rev 2.1 timeline, fitted to the authoritative timers):
    `{appearMs: 250, splitMs: 600, settleMs: 150, scale: 1.2,
    splitSpreadM: 1.0, patrol: {legM: 0.8, walkMs: 450, pauseMs: 1550},
    flickerMs: 200, dissolveMs: 250, reformMs: 150}` (the built values: the
    450/1550 ms legs keep the 4 s cycle while fitting the `Walk` clip's
    speed band, and copies separate from the boss body by up to
    `splitSpreadM` before gliding at run speed; §15). Inside the approach window
    (`approachMs` = 1000): appear 0–250 ms, split and glide to the lane
    points 250–850 ms, settle 850–1000 ms. Validation enforces
    `appearMs + splitMs + settleMs ≤ approachMs` and
    `flickerMs + dissolveMs ≤ retryLockMs − 100`. Copies are therefore
    settled and hittable when `engaging` starts, and a decoy is fully
    dissolved before `unlockRetry`. The re-form (`reformMs`) is drawn
    **after** the unlock; the copy is hittable from the unlock instant.
  - `timing` (learning-phase timers, identical in every motion mode):
    `{retryLockMs: 600, correctToTransitionMs: 900, regroupMs: 1600,
    advanceMs: 3200, approachMs: 1000, domCrossFadeMs: 300}`. The approach
    occupies the last `approachMs` of `regroupMs`/`advanceMs`, and all of
    every `deploying` phase (whose timer is `approachMs`). Rev 3:
    `advanceMs` times the lap wrap and the DOM-mode `roaming` timer; GL
    `roaming` is untimed (§2).
  - `knockdown`: `{starsAtMs: 450, fadeStartMs: 750, fadeMs: 600}` measured
    from the correct hit; validation enforces that the fade ends before the
    incoming approach starts (`fadeStartMs + fadeMs ≤
    correctToTransitionMs + regroupMs − approachMs`).
  - `weapon`: `{model: 'assaultRifle', magazine: 30, reserve: 120,
    cooldownMs: 150, reloadMs: 1000, autoReload: true, adsMs: 120,
    recoil: {pitchKickDeg: 0.6, recoverMs: 150, springK: 220,
    damping: 26}}`. The field of view comes from `framing` (below), not from
    fixed `hipFov`/`adsFov` values. Ammo is **cosmetic and forgiving**: an
    empty magazine auto-reloads; the reserve refills to 120 at every round
    start and never blocks firing (if it would reach 0, the reload still
    fills the magazine). Spread stays visual only (full scope).
  - `movement` (rev 3): `{walk: 3.0, sprint: 4.2, fight: 2.4, adsFactor:
    0.55, accel: 10, decel: 14, radius: 0.3, eye: 1.6, turnKeysDegPerS: 120,
    stickDeadZone: 0.12, sprintStickRim: 0.9, maxStepM: 0.1, slideIters: 3,
    centreAssistMs: 400, pitchMin: -0.5, pitchMax: 0.4}` (rev 3.1:
    `centreAssistMs` replaces `autoTurnMs`/`autoTurnMinDeg`).
    Sprint only in `roaming`; `fight` caps the speed in encounter phases.
    There is **no yaw clamp** and **no head bob** (*removed (rev 3):*
    `yawLimitDeg`, `bobAmp`, `bobHz`). `maxStepM` sub-steps every move so a
    4.2 m/s × 50 ms frame cannot tunnel through a 0.3 m wall.
  - `aim`: `{magnetRadiusPx: {mouse: 28, touch: 44, cursor: 32},
    lookFriction: 0.65, hitbox: {w: 0.9, h: 1.3, d: 0.7, centerY: 1.0},
    body: {w: 0.7, d: 0.5, h: 1.7}, crouchBody: {w: 0.7, d: 0.5, h: 0.6}}`,
    scaled by the enemy model's normalised height (boss copies by
    `boss.scale`); `crouchBody` is the visible body used for the hide
    occlusion check behind low cover (built, §15).
  - `framing` (rev 2.1; replaces revision 2's fixed `hipFov: 75` and the
    slice's `minHalfHFovDeg: 42, maxFov: 112`): `{hipHalfHFovDeg: 36,
    minVFovDeg: 40, maxVFovDeg: 110, adsZoom: 1.35, laneMaxAngleDeg: 28,
    laneMaxDistM: 9, minEnemyPx: 56, minHitboxPx: 28, minPlateTextPx: 14,
    fightMaxDistM: 12, minEnemyPxFar: 40}` (the last two rev 3).
    The hip vertical FOV is **derived from the canvas aspect**
    `a = canvasWidth / canvasHeight` (CSS px, measured after layout):
    `vfov = clamp(2·atan(tan(hipHalfHFovDeg)/a), minVFovDeg, maxVFovDeg)`.
    The achieved horizontal half-angle is
    `hHalf = atan(tan(vfov/2)·a)`. Worked values: 390×844 (`a` = 0.462)
    gives `vfov` = 110° (cap) and `hHalf` ≈ 33.4°; 360×780 the same;
    844×390 (`a` = 2.16) gives `vfov` ≈ 37.1° → clamped to 40°,
    `hHalf` ≈ 38.2°; 1440×900 gives `vfov` ≈ 48.8°, `hHalf` = 36°;
    768×1024 gives `vfov` ≈ 88.2°, `hHalf` = 36°. (Revision 2's claim of a
    ≥ 42° half-angle at 390×844 was wrong: 112° vertical gives ≈ 34°.)
    ADS divides `tan` of both half-angles by `adsZoom`.
    Validation, from the place's `anchor` facing its heading (*was* the
    zone's `spawn` facing `facingDeg`): every lane
    point (spots, dash path, boss points ± patrol, nameplate anchors) lies
    within `±laneMaxAngleDeg` horizontally, so with a 4° margin all lanes
    are on screen at hip in every tested viewport (`28° + 4° ≤ 33.4°`), and
    no lane point is farther than `laneMaxDistM`. Target-size gates (browser
    check 15): at hip, the farthest standing enemy projects
    ≥ `minEnemyPx` tall and its hitbox ≥ `minHitboxPx` wide in every tested
    viewport (at 390×844 a 1.7 m soldier at 9 m projects ≈ 56 px); in ADS
    the same enemy projects ≥ 1.3× its hip height; nameplate and chip text
    never renders below `minPlateTextPx` (it wraps or collapses instead,
    §6). Places are authored to these numbers (lanes 6–9 m from the anchor,
    not revision 2's 13–17 m); the 844×390 band is the tightest vertically
    and is checked explicitly. **Rev 3, the whole fight box:** from every
    fight-box sample no lane point is farther than `fightMaxDistM` (12 m;
    the `LINE4` template measures 11.75 m at the far corner), so at hip a
    standing enemy projects ≥ `minEnemyPxFar` (≈ 43 px at 390×844, 40 px
    gate) and ≥ 1.3× that in ADS from anywhere the player may stand. The
    ±28° angle gate applies at the anchor only: from a fight-box corner, or
    after turning, an enemy may leave the screen; its nameplate is then
    pinned to the screen edge with a `‹`/`›` pointer (§6), and lock-on
    turns the view to it.
  - `enemyModel` (model-agnostic shape; §6.1 gives the sourced values):
    `{url, lodUrl, targetHeight: 1.7, forward: '+z', clips: {idle, aim,
    crouch, move, run, shoot, hit, down, cheer}, clipSpeeds: {move, run},
    nameplateAnchorY: 2.05, crouchAnchorY: 1.45, tintMaterials: [...],
    perEnemyMaterials: 'all', weaponBone, maxPrimitives: 6,
    castShadowMinTier: 2}`. `clips` maps **roles** to the model's clip
    names; a missing role falls back to `idle` (and `aim`/`crouch`/`cheer`
    to `idle`, `run` to `move`, `down` to a transform-only fall-and-fade).
    `clipSpeeds` are the in-place locomotion clips' native ground speeds in
    m/s at `targetHeight`, measured once offline from the foot plants
    (§6.1).
  - `nameplate`: `{maxWidthPx: 180, maxWidthWidePx: 240, maxLines: 3,
    minGapPx: 6, edgeMarginPx: 8, tierOffsetPx: 34}` (§6; rev 2.1 removes
    the width-based `chipCollapseWidthPx` in favour of a fit test).
  - `minimap` (rev 3): `{sizePx: 128, sizePortraitPx: 96, rangeM: 24,
    redrawHz: 10, layerPxPerM: 6, overlayPxPerM: 9}`: the static compound
    layer is pre-rendered once at `layerPxPerM` (46 × 68 m → 276 × 408 px)
    and again only on a theme change; `overlayPxPerM` sizes the north-up
    full-map overlay (§6.6).
  - `quality`: `{maxPixelRatio: [1, 1.5, 2], shadowMap: [0, 1024, 2048],
    enemyCastShadow: [false, false, true], antialias: [false, false, true],
    maxAnimated: {mobile: 4, desktop: 6}, grassClumps: [0, 8, 18],
    useLod: [true, true, false], fpsFloor: 32, fpsWindowMs: 2000,
    downgradeCooldownMs: 4000, particleCap: [8, 12, 24]}`.
  - `motifs`: per-theme scene motifs (§7).
- **Behavior shared across visual types:** lanes, the squad and boss
  schedulers, hitboxes, LOS, magnetism, the fight-box clamp and lane order
  are identical for every place, round kind and theme (every slice place
  uses the `LINE4` arena). Places differ only in position, heading, cover
  kinds, dressing and their surroundings. Themes change only presentation.
- **Map build and visibility (rev 3; replaces "zone chaining and segment
  window"):** the whole map is built **once** at load (§10: map lifetime)
  — the backdrop (sky dome, distant hills ring, clouds, the water-tower
  landmark, outer trees), one ground, and per place a merged **structure**
  chunk and a merged **detail** chunk (§6.2). Nothing is built or retired
  when the player moves between places; only visibility changes. *Removed
  (rev 3):* building the next zone at `advancing` start and retiring the
  previous one in `arriveRound`.
- **Enemies per round:** `options.length` (2–4; `generateFromList` yields at
  most 1 + 3 distractors). Squad: soldier i in lane `laneSets[n][i]`. Boss:
  one boss that becomes `n` copies, copy i in the same lane. If a list ever
  yields a single option, one enemy is used. More than 4 cannot occur today;
  if it did, `create()` sets `so.domAnswerOnly` and that question is
  answered through the DOM answer list only (no enemies spawned; the
  phases and timers are unchanged), logged once.
- **Squad scheduler (pure, deterministic):**
  `strikeOpsSquadAt(i, n, tMs, cfg, shiftMs)` returns
  `{state: 'hidden'|'peek-out'|'exposed'|'peek-in'|'dash', spot: 0|1,
  move01, exposure01}`, where `period = exposedMs + hiddenMs + 2·slideMs`,
  `offset_i = firstPeekMs + i·period/n` and `t' = (tMs − offset_i) mod
  period`. On every `relocateEvery`-th cycle of soldier i, the first
  `dashMs` of its exposed window is a `dash` along its lane's `dash` path to
  the other spot (hittable, it is part of the exposed window), and the rest
  is `exposed` at the new spot's peek. Every soldier therefore gets
  identical exposure per period with a predictable rotation. `tMs` advances
  only in `engaging`/`wrong`, not while paused. A soldier is **hittable only
  in `exposed` or `dash`**. A wrong-hit soldier plays `hit` (not hittable),
  ducks, then rejoins its own unchanged schedule. The exposure ledger
  (`exposureMs` per enemy) is kept for fairness tests. `forceExpose(i)`
  (debug) shifts only soldier i's offset.
- **Boss scheduler (pure):** `strikeOpsBossAt(i, n, tMs, cfg)` returns
  `{state: 'split'|'exposed'|'dissolved', x, moving}`: after the split,
  every copy is `exposed` and **patrols** its lane: walk `legM` at constant
  speed over `walkMs` facing its travel direction, pause `pauseMs` turned
  toward the fight box, walk back (cycle 4 s). All copies patrol **in the
  same phase** (built; revision 2.1's per-copy phase made the copies' clips
  differ, a visual tell flagged by browser check 8). Constant-speed legs avoid the near-zero speeds of a sine strafe,
  which would slide the feet. A copy hit wrong is `dissolved` (not
  hittable) until `unlockRetry` re-forms it. All copies are hittable for the
  same total time.
- **One pose source (rev 2.1).** `strikeOpsPoseAt(enemy, tMs, cfg,
  reducedMotion)` (pure) turns the scheduler output into the **drawn** pose
  `{x, z, yaw, stance: 'crouch'|'stand', opacity, hittable}`. Rendering,
  the hitbox, LOS, lock-on aim, magnetism, the nameplate anchor, the
  minimap dot and `getEnemies()` all read this one pose; nothing reads the
  normal-motion trajectory separately. Under reduced motion the pose jumps
  instead of gliding (§8), and the hitbox jumps with it. `hittable` is the
  scheduler's flag and is identical in both motion modes, so exposure
  windows and learning timers are unchanged.
- **Minimal persistent reconstruction state:** none. A reload restarts in
  the yard, round 1, every gate closed; learning state is engine-owned.
  In-memory, the map state is fully derived from `_so.mapZoneIndex`, `lap`,
  the transition snapshot's `lapPoseApplied` and the
  plain-data player pose `_so.player = {x, z, yaw, pitch}` (map frame),
  which is all a context-loss rebuild needs.
- **Extension points for later content:** more places (a fifth place is a
  new `zones[]` entry, a gate, walls and two route legs), per-place arena
  layouts other than `LINE4` (validated the same way), per-theme
  prop sets in `motifs`; a second cosmetic weapon slot; alternative
  `enemyModel` entries (per theme or per round kind); an optional
  `presentNewItems` overlay (like hexkeep) to keep the run alive across
  new-item unlocks; Adventure encounters through `worlds.js` with no
  component change.

The arena template `LINE4` (rev 3) is the built `YARD` gameplay data,
verbatim, arena-local (the yard is placed at origin (0, 0), heading 0, so
for the yard arena-local equals map). Every slice place uses it:

```js
const LINE4 = {
  core: {minX: -1.5, maxX: 1.5, minZ: 0, maxZ: 2},        // was pad
  anchor: {x: 0, z: 1.0},                                  // was spawn
  fightBox: {minX: -3, maxX: 3, minZ: -0.5, maxZ: 3.0},    // trigger + encounter clamp (rev 3)
  cover: [ // h 0.85 low cover; per place drawn as coverKinds[k]
    {x: -3.3, z: 7.23, w: 1.8, d: 0.6}, {x: -4.21, z: 8.09, w: 0.8, d: 0.6},
    {x: -0.9, z: 7.13, w: 1.5, d: 0.6}, {x: -2.16, z: 7.89, w: 0.9, d: 0.6},
    {x: 0.9, z: 7.13, w: 1.5, d: 0.6},  {x: 2.16, z: 7.89, w: 0.9, d: 0.6},
    {x: 3.3, z: 7.23, w: 1.8, d: 0.6},  {x: 4.21, z: 8.09, w: 0.8, d: 0.6}],
  lanes: [ // hide == peek (in-place crouch/stand behind low cover); spot 1 is the rear spot
    {spots: [{x: -3.25, z: 8.05}, {x: -4.01, z: 8.91}], dash: [{x: -3.25, z: 8.91}]},
    {spots: [{x: -1.15, z: 7.95}, {x: -1.96, z: 8.71}], dash: [{x: -1.15, z: 8.71}]},
    {spots: [{x: 1.15, z: 7.95},  {x: 1.96, z: 8.71}],  dash: [{x: 1.15, z: 8.71}]},
    {spots: [{x: 3.25, z: 8.05},  {x: 4.01, z: 8.91}],  dash: [{x: 3.25, z: 8.91}]}],
  laneSets: {1: [1], 2: [1, 2], 3: [0, 1, 3], 4: [0, 1, 2, 3]},
  boss: {stage: {x: 0, z: 9.76}, points: [{x: -3.63, z: 8.91}, {x: -1.555, z: 8.71}, {x: 1.555, z: 8.71}, {x: 3.63, z: 8.91}]},
  approach: [{x: -5.2, z: 11.6}, {x: -2.0, z: 12.6}, {x: 2.0, z: 12.6}, {x: 5.2, z: 11.6}],
};
```

Measured with the built validator and `strikeOpsLaneOrderOk` (rev 3
planning run): from the **core** every current check passes (lane-order
gap 6.4°); from the **fight box** (0.5 m grid) LOS to every peek, dash and
boss point (± patrol) is clear, no enemy position intersects cover, the
lane-order gap is **5.2°** (≥ the 4° fight-box gate) and the farthest lane
point is **11.75 m** (≤ 12 m). Full hide occlusion does **not** hold from
the fight-box edges for the narrow rear covers (spots `k.1`), which is why
occlusion is validated from the core only (below and §5.1 "Seen while
hidden").

`validateStrikeOpsConfig()` must enforce:

- every fight box, cover and lane point lies inside the place's `region`;
  no cover intersects the fight box (inflated by `movement.radius`); the
  fight box lies outside the `enemyZone` by at least `movement.radius`;
  the core and the anchor lie inside the fight box;
- every `hide` point is fully occluded (visible body `aim.crouchBody`, not
  the hitbox) by its cover from every sampled **core** eye point (grid step
  0.5 m; *was* the pad);
- every `peek` point, every `dash` waypoint and every boss point (± patrol)
  has clear **LOS** to the torso centre from every sampled **fight-box**
  eye point (rev 3; *was* the pad) through `strikeOpsSegmentBlocked`;
- **lane order:** from every sampled fight-box point, the horizontal view
  angles of all of lane k's points (spots, dash path, boss point ± patrol,
  nameplate anchors) are strictly left of all of lane k+1's points with a
  gap ≥ 4° (`strikeOpsLaneOrderOk(zone, cfg, 4, 'fightBox')`), and with a
  gap ≥ 6° from every core point. Screen order then equals index order for
  every enemy in front of the camera, whatever the yaw (*removed (rev 3):*
  "every yaw inside the clamp" — there is no clamp, and yaw cannot reorder
  points that are in front of the camera);
- **framing (rev 2.1, rev 3 anchor):** from the anchor facing the place's
  heading, every lane point is within `±framing.laneMaxAngleDeg`
  horizontally and within `framing.laneMaxDistM`; from every fight-box
  sample, within `framing.fightMaxDistM` (§5 `framing`);
- nameplate anchors of adjacent lanes are ≥ 2.0 m apart laterally;
- no prop or map structure crosses any fight-box→enemy sightline, and no
  enemy position (spot, dash path, boss point ± patrol, approach point,
  boss stage) lies within 0.45 m of a prop, structure or wall (*removed
  (rev 3):* the `advancePath` clearance check);
- the map checks of §5.1 (regions, walls, gates, pre-clear flood fill,
  route legs);
- `laneSets[n]` is ascending and has `n` lanes for n = 1..4, and every zone
  has exactly `STRIKE_OPS_MAX_LANES` (4) lanes;
- squad and boss timings are within bounds; `regroupMs` and `advanceMs` are
  ≥ `approachMs` + 300 ms; the boss split fits the approach window and the
  flicker + dissolve fit the retry lock (§5 `boss`); the knockdown fade
  ends before the incoming approach (§5 `knockdown`);
- **foot-slide bound (rev 2.1):** every authored lateral move (peek slide,
  dash path over `dashMs`, approach jog over `approachMs`, boss split glide,
  boss patrol leg) has a ground speed `v` whose chosen locomotion clip
  (`move` up to 1.8 m/s, `run` above) plays at
  `timeScale = v / clipSpeeds[role]` within `[0.75, 1.35]` (§6.1);
- `enemyModel.clips` names the required roles `idle`, `move`, `shoot`,
  `hit`, `down` (values may be `null` where a fallback is defined) and the
  optional roles `aim`, `crouch`, `run`, `cheer`;
- `zonePlan.zones` names existing places, in map order (exactly the four
  places of §5.1 in the slice).

The LOS and lane-order invariants are what guarantee that lock-on and touch
players can always hit any exposed enemy from anywhere they may stand
during an encounter, and that answer chip k matches the k-th enemy from the
left as well as carrying its badge.

### 5.1 Compound map (rev 3)

The plan image for the user is
`map-plan.png` (rendered by `map-plan.html` from `map-config.js` in the
planning scratchpad `scratchpad/map-plan/`, which holds exactly the numbers
below; `check.js` there re-measures the route, clearances and flood fills).
All coordinates are map frame (x east, z north, metres). The `map` and
place entries go into `STRIKE_OPS_CONFIG` verbatim.

**Per-place variety (rev 3.1, manager decision).** Every place keeps the
`LINE4` arena and identical timings, exposure windows and option
treatment; four cheap cues make the places feel different. Each place
entry gains `flavor: {deployLine, gateVoice, sign, squadStyle}`:

| Place | `deployLine` (live region + 1.6 s banner sub-line at `deploying`) | `gateVoice` (its exit gate's synth) | `sign` at its entry (procedural board, `CanvasTexture` with the place name + icon) | `squadStyle` (cosmetic, same for every enemy of a round) |
|---|---|---|---|---|
| yard | `חוליית החצר בעמדות!` | `g1`: boom lift — rising whoosh, 220→440 Hz | the main gate's arch sign `מתחם האימונים` + star | `exposedIdle: 'aim'`, volley chance 0.3 |
| containers | `חוליית המכולות מגיחה מבין הארגזים!` | `g2`: boom lift, lower — 165→330 Hz + metallic click | container stencil `חצר המכולות` + box icon | `exposedIdle: 'shoot'` (more foam volleys), volley chance 0.5 |
| sheds | `חוליית הצריפים על המרפסת!` | `g3`: swing gate — wooden creak (filtered noise sweep) | painted shed board `הצריפים` + house icon | `exposedIdle: 'aim'`, `firstPeekGesture: 'cheer'` (one `Wave` on each soldier's first peek, inside the exposed window) |
| plaza | `המפקד מחכה למרגלות מגדל המים!` | — (lap wrap: a fanfare of three rising notes) | tower plaque `כיכר מגדל המים` + tower icon | `exposedIdle: 'aim'`, volley chance 0.4, boss stage lit by a soft spotlight decal |

Rules: a `squadStyle` changes only clips and foam frequency, applied to
**every** enemy of the round alike (no tell; browser check 8's
identical-copies assertion includes it), never a pose, hitbox, timing or
exposure window; a `Wave` gesture is drawn from the same pose source and
is skipped under reduced motion (the soldier simply stands). Signs are one
mesh per place in its detail chunk (+1 call when visible); gate voices
and the fanfare are synth voices (no audio files). Unit test 12 checks
that every place has a complete `flavor`.

**Bounds and start (rev 3.1: two bounds).** `playBounds: {minX: −22,
maxX: 24, minZ: −10, maxZ: 58}` (46 × 68 m) is the walkable clamp (the
perimeter walls' centrelines) and contains every region; `bounds: {minX:
−23, maxX: 25, minZ: −11, maxZ: 59}` is the **geometry** bound that every
wall, structure and gate must lie inside (the perimeter walls are 0.6 m
thick, so they reach 0.3 m beyond `playBounds`; revision 3 used one bound
for both, and its own walls failed validation). `start: {x: 0, z: 1,
headingDeg: 0}` = the yard's anchor.
Everything outside the four regions is dressing behind walls (container
stacks, trees), never walkable.

**Places** (arena fields from `LINE4`; fight box, anchor and boss stage
converted to the map frame):

| # | `id` | Name (toast) | `region` x / z | `origin`, heading | Fight box (map) | Anchor | Boss stage | `enemyZone` (pre-clear blocker) | Entry → exit gate | `coverKinds` (8) |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `yard` | החצר הצהובה | −16..16 / −10..18 | (0, 0), 0° N | x −3..3, z −0.5..3 | (0, 1) | (0, 9.76) | x −16..16, z 3.4..18 | start → `g1` | crates, barrels, sandbags, crates, stoneWall, barrels, crates, barrels (built) |
| 2 | `containers` | חצר המכולות | −4..24 / 18..34 | (2, 25), 90° E | x 1.5..5, z 22..28 | (3, 25) | (11.76, 25) | x 5.4..24, z 18..34 | `g1` → `g2` | crates, barrels ×4 alternating |
| 3 | `sheds` | הצריפים והמרפסת | 8..24 / 34..58 | (17.5, 37), 0° N | x 14.5..20.5, z 36.5..40 | (17.5, 38) | (17.5, 46.76) | x 8..24, z 40.4..58 | `g2` → `g3` | crates, sandbags, sandbags, crates, sandbags, crates, crates, sandbags |
| 4 | `plaza` | כיכר מגדל המים | −22..8 / 36..58 | (2, 50), 270° W | x −1..2.5, z 47..53 | (1, 50) | (−7.76, 50) | x −22..−1.4, z 36..58 | `g3` → lap wrap | sandbags, barrels, sandbags, barrels, stoneWall, barrels, sandbags, barrels |

Approach points (map): containers (13.6, 30.2) (14.6, 27) (14.6, 23)
(13.6, 19.8); sheds (12.3, 48.6) (15.5, 49.6) (19.5, 49.6) (22.7, 48.6);
plaza (−9.6, 44.8) (−10.6, 48) (−10.6, 52) (−9.6, 55.2); the yard's are
the built ones. Each squad stands between its fight box and its exit
gate, facing the way the player arrives, so "relative to the player's
entry direction" is fixed by construction: every place has exactly one
entry, and its arena faces it.

**Gates** (a gap in a wall; `axis: 'x'` spans x at a fixed z):

| `id` | Kind | Between | Position | Opens |
|---|---|---|---|---|
| `g0` | main gate (decorative, always closed) | outside → yard | z = −10, x −2..2 | never |
| `g1` | boom barrier | yard → containers | z = 18, x −1.1..1.9 | yard cleared (committed `mapZoneIndex ≥ 1`) |
| `g2` | boom barrier | containers → sheds | z = 34, x 16..19 | containers cleared (`mapZoneIndex ≥ 2`) |
| `g3` | swing gate | sheds → plaza | x = 8, z 50..53 | sheds cleared (`mapZoneIndex ≥ 3`) |

A closed gate is a 0.6 m-deep collider across its gap; an open one is not.
The lap wrap (`applyLapPose()` commits `mapZoneIndex = 0`) closes them all. Opening animates over
`gateOpenMs` (600 ms; instant under reduced motion and on a rebuild); the
collider is removed at the **start** of the animation.

**Walls** (AABBs; 0.6 m thick; dressed as the named kind; gaps = gates):
yard — fence z −10.3..−9.7 for x −16..−2 and 2..16; hedge x −16.3..−15.7,
z −10..18; fence x 15.7..16.3, z −10..18; fence z 17.7..18.3 for
x −16..−1.1 and 1.9..24. Containers — container row x −4.3..−3.7,
z 18..34; fence x 23.7..24.3, z 18..58; container row z 33.7..34.3 for
x −4..16, fence for x 19..24. Sheds/plaza — fence x 7.7..8.3 for
z 34..50 and 53..58; hedge z 57.7..58.3, x −22..24; container row
z 35.7..36.3, x −22..8; hedge x −22.3..−21.7, z 36..58. The map bounds are
also an invisible wall.

**Structures** (solid unless `walk`; boxes `x, z, w × d` or circles
`x, z, r`): yard — the built dressing (deck (−1.8, 1.25) 7.2 × 5.5 walk;
sheds (−9.2, 12.5) 6 × 15 and (6.6, 13.6) 3 × 3; stone wall (9.2, 14.6)
4.8 × 0.9; hedge (10.5, 6.5) 1.2 × 2.4; sandbags (6.4, 4.8) 1.6 × 0.7;
barrels and rocks as circles; trees (−13, −6), (13, −5), (13.5, 3)).
Containers — containers (−1.6, 24) 2.4 × 6; (20.5, 21.5) 6 × 2.4 ×2
high; (21.6, 28.5) 2.4 × 6; north-row stacks (4, 35) ×2 high and
(11, 35); barrels (−2.6, 32.4), (−1.9, 32.9); crate (19.5, 32.6).
Sheds — deck (17.5, 38.2) 8 × 4.6 walk (under the fight box); yellow
sheds (14, 55) 8 × 4 and (21.2, 54) 4 × 6 behind the squad (the mockup
view); crate (12.6, 35.4); barrel (22.8, 35.6); tree (9.4, 56.3). Plaza —
**water tower (−14, 50), r 2.6** (the landmark: 16° left of straight ahead
from the start, visible over every wall); containers (−18, 39.4) 6 × 2.4
×2 high; trees (−20, 55.5), (−4, 56), (5.5, 38.5); hedge (5, 56.5) 4 × 1.2;
paved circle r 6.5 around (−8, 50) (walk). Dirt paths (walk): (0.4, 9)
2.6 × 18; (0.4, 22) 2.6 × 8; (11, 31.5) 14 × 2.4; (17.5, 33) 3 × 4;
(10.5, 45.5) 2.4 × 13; (5.5, 51.5) 7 × 2.6. *Moved (rev 3):* the built
backdrop's containers at (−3.5, 21.5) and (13, 19.5) become the
containers-place dressing above (the old (13, 19.5) stack sat on an
approach point), the back fence moves from z 17.2 to the z 18 wall, and
the water tower moves from (2.5, 44) to (−14, 50).

**Route graph** (nodes; legs are the objective routes):

```js
nodes: {n0: {x: 0, z: 1}, n0a: {x: 5.2, z: 4.2}, n0b: {x: 5.2, z: 9.8}, n1: {x: 0.4, z: 15}, g1: {x: 0.4, z: 18},
        n3: {x: 0.4, z: 21.5}, a2: {x: 3, z: 25}, n5: {x: 4.5, z: 31.5}, n6: {x: 17.5, z: 31.5}, g2: {x: 17.5, z: 34},
        a3: {x: 17.5, z: 38}, n9: {x: 10.5, z: 39.5}, n10: {x: 10.5, z: 51.5}, g3: {x: 8, z: 51.5}, a4: {x: 1, z: 50}},
legs: [['n0', 'n0a', 'n0b', 'n1', 'g1', 'n3', 'a2'],     // yard → containers: 29.6 m
       ['a2', 'n5', 'n6', 'g2', 'a3'],                   // containers → sheds: 26.2 m
       ['a3', 'n9', 'n10', 'g3', 'a4']],                 // sheds → plaza: 28.8 m
```

The route is **84.6 m ≈ 28 s** at 3.0 m/s (≈ 10 s per leg); exploring every
place takes ≈ 60–90 s. Leg 1 passes the yard's cover line around its east
end (the 0.3 m gap between the sandbags and the stone wall is narrower than
the 0.6 m capsule).

**Derived state (pure `strikeOpsMapState(k, phase, cfg)`, called with the
committed `k = _so.mapZoneIndex`, rev 3.1 §2).**
Gate `g_j` (j = 1..3) is open iff `k ≥ j`. Place `i`'s
`enemyZone` blocks iff `i ≥ k` (not yet cleared; the current
place's blocker stays up during its own encounter, harmlessly, since the
fight-box clamp is stricter). The **target** place is `zones[k]`.
Its trigger (its fight box) is **armed** only in `roaming`. The objective
is the target's anchor. The **current place** is the region containing the
player (ties on a shared wall go to the target place).

**The tape line.** Each `enemyZone`'s edge facing the place's entry is
dressed, while the place is not cleared, with a low striped tape on
small posts and a few training cones (procedural, merged into the place's
detail chunk as one extra mesh; hidden when the place is cleared). It is
what a child sees where the invisible blocker stands; the closed gates
behind it are never reachable before clearing (both are kept: the
blocker is the rule, the gate is the story).

**Encounter boundary and triggers.** The trigger test is "the capsule's
centre is inside the target's fight box". In encounter phases the
movement clamp is the fight box (the capsule's centre may reach its
edges; covers are ≥ `movement.radius` away by validation). `roaming`
clamps only to `playBounds`; colliders do the rest.

**Entry poses (rev 3.1).** A walk can trigger at any fight-box edge
point, where neither the ±28° framing nor full hide occlusion is
guaranteed. The centre-view assist (§3) therefore moves every encounter's
start to the anchor, where both are validated; browser check 33 verifies
the actual entry from each place's route at 390×844 with the longest
labels. During the encounter the player may still step to the edges.

**Seen while hidden (accepted, documented, child-tested §12.4).** From the fight-box edges a
crouched (`hidden`) soldier behind a narrow rear cover can be partly
visible. It stays **not hittable** (hittability is the scheduler's flag,
§5): the crosshair does not highlight it, a shot at it hits cover or
misses (a grey dust puff, no learning call) and its nameplate is dimmed
with the `בחיפוי` state. This keeps exposure fairness exact; validation
keeps full occlusion from the core, where the player stands by default.

**Map validation** (`validateStrikeOpsConfig`, in addition to §5):

- the four regions lie inside `playBounds` and do not overlap; every
  structure, wall and gate lies inside `bounds`; `playBounds` lies inside
  `bounds`; headings are multiples of 90°;
- each gate lies on the shared boundary of its two regions and in a gap of
  the wall list; each place's entry gate is outside its `enemyZone` and its
  exit gate inside it;
- **pre-clear flood fill:** for each `zoneIndex` k = 0..3, a 0.25 m grid
  flood fill of the walkable space (`playBounds` shrunk by the radius; walls,
  structures, cover, closed gates and active `enemyZone`s inflated by the
  radius), seeded at place k−1's anchor (the start for k = 0), reaches
  place k's anchor, reaches **no** lane spot or approach point of place k
  and **not** its exit gate, and never leaves the union of the regions;
  with all places cleared it reaches every place's anchor;
- **route legs:** every leg segment keeps the capsule ≥ 0.05 m clear of
  every collider active while that leg is the objective (its gates open,
  later blockers up), and the legs join start → a2 → a3 → a4;
- **routing from anywhere (rev 3.1):** for each `zoneIndex` k, from every
  cell of the k flood fill (0.5 m sample), `strikeOpsRoute` returns a
  route to place k's anchor (never `no-route`);
- the autopilot reaches each leg's end from its start in ≤ length /
  `movement.walk` + 2 s in a fixed-step simulation (unit test 14).

**Routing (rev 3.1).** `strikeOpsRoute(from, target, state, cfg)` returns
`{ok: true, points: [{x, z}…], via: 'graph'|'grid'}` or `{ok: false,
reason: 'no-route'}`:

1. **Graph.** The route graph is the union of all legs as undirected
   edges (node ids as in §5.1). An edge is usable in the current map state
   iff its segment keeps the capsule ≥ 0.05 m clear of every collider
   active in that state (closed gates and active blockers included);
   usable edges are precomputed once per map state.
2. **Entry connector.** Candidate entry nodes are sorted by straight-line
   distance from `from`, ties broken by node id in declaration order; the
   first whose straight segment from `from` is capsule-clear **and** that
   lies in the usable component containing the target node is chosen.
3. **Path.** Dijkstra over usable edges (lengths in metres; ties broken by
   the lower node id at each relaxation) to the target node — the place's
   anchor node (`a2`, `a3`, `a4`; the start `n0` for the yard) — or, for a
   point target (`walkTo({x, z})`), to the node with a capsule-clear exit
   segment to the point chosen by the same distance/id rule, followed by
   that exit segment.
4. **Grid fallback.** If no entry or exit connector is clear, A* on the
   0.25 m walkable grid of the current state (8-neighbour, octile cost,
   neighbours expanded in the fixed order E, NE, N, NW, W, SW, S, SE, ties
   by insertion order), then string-pulled with the capsule-clear segment
   test from the start point; `via: 'grid'`.
5. **No route.** If the grid search also fails (a target that is not
   reachable in this state: a locked place, a point inside a collider),
   the result is `no-route`: `walkTo` returns `false`, **קדימה** stays
   enabled but shows the toast `אין דרך מכאן — נסו לחזור לשביל` and logs
   once; this cannot happen for the objective from any legal position
   (validated above).

The route is recomputed when the player has moved ≥ 1 m from the route,
when the map state changes, or every 500 ms while the minimap or chevrons
show it (never per frame).

Planning run of these checks on the numbers above (`check.js`): every leg
clear; no enemy point within 0.45 m of a structure or wall; no structure on
a fight-box→enemy sightline; flood fills reach each anchor, never a lane
or approach point or the exit gate, never outside the regions (pre-clear
walkable area: yard 376 m², +containers 788 m², +sheds 1 072 m²,
+plaza 1 407 m² cumulative).

---

## 6. Rendering and composition

| Element | Technology | Reason |
|---|---|---|
| Scene/layout | One Three.js r128 `WebGLRenderer` canvas inside the root `<main class="so-game">` | Free 3D look and aim; existing vendored engine |
| Sky and backdrop | Gradient sky dome (vertex colours, 1 draw), distant low-poly hills (procedural, one merged mesh), a few cloud sprites, the Kenney water-tower landmark (rev 3: at the plaza, (−14, 50)) and the outer trees beyond the walls statically merged into the backdrop group; theme-tinted | Daylight outdoor read in a handful of draws; always drawn |
| Ground | **One** map-wide ground (rev 3) with the generated `ground-grass.png` texture (repeat-wrapped) plus all dirt paths and the plaza paving merged into one `ground-dirt.png` mesh (`polygonOffset`); the decks from Kenney `planks.glb` pieces, merged into their place's detail chunk | Real texture files from §6.4; themable through material colour; 2 draws for the whole map |
| Sheds, walls, crates, fences, barrels, trees, hedges, rocks, containers, sandbags | Sourced CC0 kit GLBs (§6.4) placed per place `props[]`, `cover` × `coverKinds` and the `map` walls/structures, then **statically merged by material per place and per chunk** (structure / detail) at map build with the manual de-index (§6.2); one shared material per kit (plus the yellow `colormap-shed.png` shed material, the deck tint, the crate and the beige-tinted barricade) | Measured 49 calls with merging vs. 123–126 without (§6.2) |
| Gates (rev 3) | Per gate: a static post/frame merged into the structure chunk plus one moving part (boom arm or gate leaf) as its own small mesh (a procedural box with the kit material; red/green light as a 2-colour emissive quad) | 3 animated meshes for the whole map |
| Guidance (rev 3) | Ground chevrons: one `InstancedMesh` (≤ 24 instances, `CanvasTexture` chevron, `depthWrite: false`); fight-box outline: one thin ground line loop per place (`LineSegments`, shown for the target or current place only); the enemy-side tape and cones of each uncleared place (§5.1, merged into its detail chunk); objective marker: DOM | 2–3 draws |
| Grass clumps (tier ≥ 1) | Kenney `grass-large.glb` clumps, count per tier (`grassClumps: [0, 8, 18]`), merged with the survival-kit group | Mockup's foreground grass; off at tier 0 |
| Enemy soldiers and boss copies | `enemyModel` = Quaternius *Character Hazmat* GLB (LOD file on tier 0/mobile), cloned with skeleton rebind; per-enemy material clones; one `AnimationMixer` each (§6.1) | Animated armored soldiers, swappable model |
| Weapon view model | `SHOOTER_MODEL_DATA.assaultRifle` (the embedded copy of the repo's `assets/models/shooter/assault-rifle.glb`, Quaternius Ultimate Guns, 1,930 triangles, already precached) bottom-right, on an overlay pass drawn after the scene with depth cleared | No new asset or request; matches the mockup's rifle placement |
| Question banner, counter/stars, minimap frame, ammo, weapon slot, buttons, joystick, nameplates, answer list, crosshair, hitmarker, overlays | Semantic DOM and CSS (`games/strike-ops.css`); nameplates positioned by `transform` written directly each frame | Accessibility, readable text, RTL/LTR |
| Minimap contents | One small 2D `<canvas>` (`aria-hidden`); the static **compound layer** pre-rendered once (and on theme change) from the map config to one offscreen canvas (§5 `minimap`); dynamic layer (gates, route line, objective, enemy dots, player arrow) redrawn at 10 Hz | No WebGL pass; cheap; no answer text (§6.6) |
| Effects (slice) | Muzzle sprite (additive), blob shadows as one `InstancedMesh`, foam puffs and tag/dissolve particles as one pooled `Points`, DOM hitmarker | Bounded, allocation-free |
| Effects (full scope) | Muzzle point-light pulse, one reusable tracer `Line`, hologram scanline shader via `onBeforeCompile`, dust motes, flag-pole cloth sway | Extended feel, after the slice gate |

- **Viewport strategy:** full-bleed route. The root is a fixed full-viewport
  layer over the app bar (`position: fixed; inset: 0`, the knowledge-defense /
  hexkeep pattern), so no app-bar measurement is needed. Touch Start may
  enter fullscreen on the root.
- **Lighting (daylight):** one `HemisphereLight` (sky/ground from the theme)
  plus one `DirectionalLight` sun, low-ish and from the side (≈35° elevation)
  so sheds cast readable shadows. Exactly **one** shadow-casting light at
  tier ≥ 1, its orthographic shadow camera (rev 3) a 36 × 36 m box
  centred 6 m ahead of the player, its centre snapped to a 4 m grid in
  light space (no shimmering while walking) and re-fitted only when the
  snapped centre changes; during an encounter it is fixed on the place's
  fight box and lanes. Blob shadows (one `InstancedMesh` of soft
  radial quads) under every enemy at all tiers; enemies cast real shadows
  only at tier 2. Linear fog in the theme's haze colour hides the backdrop
  edge. No other lights in the slice.
- **Depth and layer plan:** foreground is the view model (bottom-right),
  muzzle flash, crosshair and foreground grass. Midground is cover, enemies,
  nameplates and props. Background is sheds, fences, the water tower, hills,
  sky and haze. At least two depth cues (haze plus overlap) remain at 390 px
  wide.
- **Camera/transitions (rev 3):** first person, `rotation.order = 'YXZ'`,
  always at the player's eye (map position, `movement.eye`, no bob, no
  roll). There are only three automatic camera changes, none of which
  moves the player along a path: (1) the encounter **centre-view assist**
  (rev 3.1: position eased to the anchor and yaw to the heading, pitch to
  0, over `centreAssistMs` = 400 ms; a cut under reduced motion; input
  ignored meanwhile; *replaces* revision 3's yaw-only auto-turn);
  (2) **lock-on** turning (§8); (3) the **lap-wrap** `advancing`: a 300 ms
  fade to the haze colour, the idempotent `applyLapPose()` at the fade's
  midpoint (rev 3.1: also from `arriveRound` and the rebuild, §4), then a
  hold until the timer ends, identical in every motion mode. The autopilot turns
  the view toward its walking direction (max 180°/s; instant under reduced
  motion). *Removed (rev 3):* the `advancePath` Catmull-Rom glide and its
  `advancePose()`.
- **Ambient life:**
  - Slice: enemies in `exposed` play `aim` (`Idle`) at a random phase and
    sometimes `shoot` (`Idle_Shoot`) with a harmless foam puff (§3); clouds
    drift slowly on the sky dome (static under reduced motion).
  - Full scope: flag cloth sway, swaying bushes (vertex shader offset),
    birds crossing the sky, dust motes on tier ≥ 1 (all off under reduced
    motion).
- **Nameplates (above enemies, COD style):**
  - each enemy has one DOM nameplate (dark plate, answer text, a lane
    number + shape marker, a small pointer triangle toward the head),
    anchored at `nameplateAnchorY` above the enemy's feet and following the
    enemy as it dashes or patrols. While the enemy is `hidden`, the plate
    stays at its cover spot's anchor, dimmed, so text never jumps while a
    soldier ducks;
  - **clamped** to the play-safe rectangle measured on resize: below the
    question banner, above the bottom control band, inside 8 px side margins,
    and outside the minimap and right-thumb control rects. An enemy beyond
    the left/right screen edge, or behind the camera (rev 3: possible now
    that there is no yaw clamp), pins its plate to the edge on the side of
    its bearing with a `‹`/`›` pointer;
  - **full text or marker, never truncated (rev 2.1).** A plate shows its
    whole answer, wrapping to at most `maxLines` (3) lines inside
    `maxWidthPx` (180; `maxWidthWidePx` 240 when the safe rectangle is
    ≥ 900 px wide), at a font size that never goes below `minPlateTextPx`
    (14 CSS px at the default root size; it scales up with the root font
    size, so 200% text gives 28 px). Text is never shrunk below that size,
    never ellipsised and never clipped (`overflow-wrap: anywhere` for long
    words; no `text-overflow`). Plate sizes are measured off-screen once per
    question, theme or text-size change (not per frame);
  - **de-overlapped** each frame by `strikeOpsLayoutPlates`, an
    order-preserving layout in the plates' **current screen order** (rev 3:
    plates are sorted by their anchor's screen x, pinned plates at their
    pinned edge, ties by index, before the sweep; inside the fight box with
    all enemies in front this equals index order, §2), trying in turn:
    1. one tier: a 1D sweep (left to right: push each plate right of its
       left neighbour plus `minGapPx`; then right to left to pull plates
       back inside the safe rectangle);
    2. two staggered tiers: even indices on the upper tier, odd indices
       `tierOffsetPx` plus the taller plate's height lower, each tier swept
       as in step 1 (plates may then overlap horizontally across tiers but
       never in area). Horizontal order still equals index order;
    3. markers: if the full-text plates still cannot fit, **all** plates
       collapse to number + shape + tint markers (300 ms hysteresis against
       flicker), and the answer list below is the authoritative full text.

    No step ever reorders plates relative to that screen order, so a plate
    always stays on its enemy's side of its neighbours;
  - **answer list layout (authoritative text):** the `.so-answers` list
    always shows every option's full text at ≥ `minPlateTextPx` with its
    badge (number + shape + tint, rev 3: bound to the index). It uses the
    **row** layout (one row of chips in index order, `direction: ltr`,
    chip k = enemy k = the k-th enemy from the left in the fight box) when
    every
    chip's text fits in 3 lines at that size; otherwise it switches to the
    **stacked** layout: a vertical list in index order (1 at the top), each
    item a full-width button of variable height starting with the same
    number + shape + tint marker as its plate. The stacked list sits in the
    same grid row (§6.6); the row grows to at most 45% of the root height
    and scrolls inside beyond that, so text is never cut. In both layouts
    DOM order is index order and is never recomputed from screen positions;
    the stacked layout maps to the scene through the shared badges instead
    of horizontal position. `getLayout()`
    reports `answersLayout: 'row' | 'stacked'`;
  - plates are DOM, so they never sit behind geometry; the view model
    renders last with depth cleared so it never clips into cover.
- **External runtime assets:** none from the network. All are local (§6.4).

### 6.1 Enemy model (model-agnostic) and cloning (no SkeletonUtils)

**Sourced model (rev 2.1, staged and measured).** Quaternius *Character
Hazmat* (Toon Shooter Game Kit, CC0), processed offline: 13 extra weapon
meshes removed so it holds **one AK parented to the `Index1.R` bone**; the
head merged into the body; materials collapsed to **`Team`** (suit and
helmet, tinted per enemy) and **`Trim`** (vertex colours for visor, gloves,
boots and gun); the `CharacterArmature|` clip prefix stripped.

| File | Triangles | Draw calls | Bones | Bytes |
|---|---|---|---|---|
| `enemy-hazmat.glb` (LOD0) | 6,584 | 3 | 43 | 445,924 (≈ 446 KB) |
| `enemy-hazmat-lod.glb` (meshopt-simplified to 70%, same skeleton and clips) | 5,015 | 3 | 43 | 384,624 (≈ 385 KB) |

Most of each file is animation data (10 clips × 43 joints). The
skeleton-rebind clone below (`strikeOpsCloneSkinned`) was verified on this
model in the r128 composite scene (four independently posed clones, each
with its own 43-bone skeleton). The game must still not hard-code its
names outside the config. Everything model-specific lives in
`STRIKE_OPS_CONFIG.enemyModel`:

| Field | Meaning |
|---|---|
| `url` | `assets/strike-ops/characters/enemy-hazmat.glb` (precached) |
| `lodUrl` | `assets/strike-ops/characters/enemy-hazmat-lod.glb`, used where `quality.useLod[tier]` is true (tiers 0–1) |
| `targetHeight` | Normalised height in metres (bounding box at bind pose; 1.7) |
| `forward` | Model's facing axis, so the game can turn it toward the fight box |
| `clips` | Role → clip name (table below); `null` means "use the documented fallback" |
| `clipSpeeds` | Native ground speed (m/s at `targetHeight`) of the in-place `move` and `run` clips, measured once offline from the foot plants with the staged pose tools and recorded in the config |
| `nameplateAnchorY` / `crouchAnchorY` | Anchor height above the feet when standing (2.05) / crouched (1.45) |
| `tintMaterials` | `['Team']`: recoloured with the lane/theme tint |
| `perEnemyMaterials` | `'all'`: **every** material of the model is cloned per enemy (rev 2.1, below) |
| `weaponBone` | `'Index1.R'`: the gun's parent bone (muzzle position for the foam puff); the gun is coloured by `Trim` vertex colours, so it has no separate material |
| `maxPrimitives` | Draw-call cap per enemy (default 6; Hazmat has 3); more primitives fails validation of the loaded model |
| `castShadowMinTier` | Lowest tier at which enemies cast real shadows (default 2) |

**Clip role map (Hazmat, rev 2.1).** Durations are the clips' native
lengths.

| Role | Clip | Length | Used for |
|---|---|---|---|
| `idle` | `Idle` | 1.67 s | briefing, the boss on stage before the split, regroup bystanders |
| `aim` | `Idle` (weapon raised in the rest pose) | 1.67 s | standing `exposed` at a peek spot; distinct from `crouch` |
| `crouch` | `Duck` | 1.67 s | `hidden` behind low cover and the start/end of `peek-out`/`peek-in` (crouch → stand cross-fade 200 ms) |
| `move` | `Walk` | 1.0 s | slow lateral moves (≤ 1.8 m/s): short peek slides, boss patrol legs, boss split glide |
| `run` | `Run_Gun` | measured at load | dash relocation and the approach jog |
| `shoot` | `Idle_Shoot` | 0.33 s | the occasional harmless foam-puff volley while `exposed` (2–3 loops) |
| `hit` | `HitReact` | 0.42 s | wrong-answer flinch (fits the 600 ms retry lock) |
| `down` | `Death` | 0.75 s | the correct-answer **cartoon knockdown** (manager decision) |
| `cheer` | `Wave` | 1.67 s | bystanders after a correct tag (once) |

`Walk_Shoot` (1.0 s) and `Run_Shoot` (0.71 s) are kept in the file for
full-scope variety but are not mapped in the slice. There is **no strafe
clip**, so lateral motion follows one rule that avoids foot sliding:

- **Facing travel.** During any lateral move the body yaw turns toward the
  travel direction (100 ms), the locomotion clip plays, and on arrival the
  yaw turns back toward the fight box (150 ms). Nameplates and hitboxes follow the
  pose (§5 one pose source), so turning changes nothing in aim or order.
- **Speed matching.** The clip is `move` up to 1.8 m/s, `run` above, with
  `timeScale = v / clipSpeeds[role]`. Validation keeps every authored move
  inside `[0.75, 1.35]` (§5), so the feet never visibly skate.
- **In-place changes are not moves.** A displacement under 0.25 m (the
  usual low-cover peek: crouch behind a crate, stand up beside it) is drawn
  as the `crouch` → `aim` cross-fade with no locomotion clip.
- Boss copies patrol with constant-speed `move` legs and pauses (§5), never
  a sinusoidal strafe whose speed passes through zero.

**Knockdown (manager decision).** `down` plays `Death` once as a friendly
cartoon fall: at 450 ms a small puff of stars/sparkles (pooled `Points`,
tier 0: one sprite) pops above the head, and from 750 ms the enemy's
cloned materials fade to 0 over 600 ms (§5 `knockdown`). No blood, no
debris, no ragdoll, no "death" sound (the `tagout` "boop" plays). The
seated tag-out fallback of revision 2 is dropped; reduced motion is handled
in §8 without it. If `Death` is missing (another model), `down` falls back
to a transform-only tip-over and the same fade.

On load, `registerEnemyTemplate(gltf)` checks the roles against
`gltf.animations` (missing → fallback, logged once), measures primitives and
triangles (exposed in `getRenderStats().enemyModel`) and normalises scale.
Swapping the model is a config change plus a `STRIKE_OPS_ASSETS` update.

In r128 `root.clone(true)` **shares the original skeleton** (verified in a
Node VM), so `strikeOpsCloneSkinned(source)` (kept from the slice) must:

1. `clone = source.clone(true)`;
2. walk `source` and `clone` in parallel (identical child order) to build
   `Map<sourceNode, cloneNode>`;
3. for each cloned `SkinnedMesh` `m` with source `s`:
   `m.bind(new THREE.Skeleton(s.skeleton.bones.map(b => map.get(b)),
   s.skeleton.boneInverses.map(x => x.clone())), s.bindMatrix.clone())`;
4. leave geometry shared, and clone **every material whose colour,
   opacity, emissive or transparency can differ between enemies** — for
   Hazmat that is every material (`Team` and `Trim`, `perEnemyMaterials:
   'all'`), one copy per source material **instance** (GLTFLoader may
   create per-primitive variants). Rev 2.1 reason: the hologram, the decoy
   flicker/dissolve, the knockdown fade and the solidify all change opacity
   on the **whole** enemy including its gun; a shared `Trim` would fade
   every other enemy too, and an unfaded one would leave an opaque gun and
   gloves floating in a dissolved hologram. Each clone is created with its
   final `transparent`/`depthWrite` setup (copies: `transparent: true` from
   spawn; squad soldiers flip `transparent` at the start of their fade).
   Opacity changes must never compile a new program: browser check 17
   asserts that `renderer.info.programs.length` is unchanged across a
   knockdown and a decoy dissolve;
5. create `new THREE.AnimationMixer(clone)` and reuse the template's
   `AnimationClip`s via `mixer.clipAction(clip)`.

Set `frustumCulled = false` only on skinned meshes whose bind-pose bounds
are stale (detected at load by comparing animated and bind bounds once). An
enemy fully `hidden` (inside cover) gets `visible = false` and its mixer is
not updated: zero draw calls.

**Squad look:** each lane has a theme-derived armor tint on `Team`
(`squadTints[k]`, e.g. red, blue, green, yellow in `base`, as in mockup A)
plus the lane's number + shape marker on its nameplate and chip. Tints
identify **lanes, never correctness**. `Trim` keeps its vertex colours,
multiplied by the theme's `trimTint` (white in daylight themes, a lifted
grey-blue in `dark`/`space`/`code` so visors and guns stay readable).
**Boss look:** the boss uses `bossTint` and `boss.scale`; its copies use a
hologram variant of **both** cloned materials (transparent, opacity 0.85,
`hologramTint` emissive, rim/scanline pulse at tier ≥ 1, plain 0.85 opacity
at tier 0) that is **identical for every copy**, including the real one,
until `answer()` resolves (browser check 8 compares each copy's
`materials` read-out).

**Theme changes reach live clones (rev 2.1).** `applySceneTheme()` re-tints
the shared kit materials **and** walks `_so.enemies` to re-apply each live
clone's `Team` tint (`squadTints[lane]` or `bossTint`), `Trim` multiplier
and, for copies, the hologram tint/emissive, preserving each clone's
current opacity/effect state. This runs for every key in
`Object.keys(themeOptions)` — today `base`, `soldiers`, `unicorn`, `space`,
`dark` and `code`, all six present in §7 — and is covered by unit test 7
(adapter fields) and browser check 16 (a mid-round theme switch re-tints
the visible enemies).

**Ownership:**

- The template scene (the LOD0 or LOD file chosen at load), its geometries, the
  shared materials and the `AnimationClip`s belong to the **shared**
  lifetime: loaded once per component instance and disposed only in teardown
  (or `lost`).
- Each clone's cloned materials, its **new `Skeleton`s** and its mixer belong
  to the **round** lifetime (they live in the active zone's
  `round.disposables`).
- Retiring an enemy does all of the following: `mixer.stopAllAction();
  mixer.uncacheRoot(clone)`; `skeleton.dispose()` for each rebound skeleton;
  dispose the cloned materials; remove the clone from the scene. It must
  **never** dispose the shared geometry.

### 6.2 Performance budget

**Measured baselines (rev 2.1).** The sourced assets were assembled into a
reference scene in Three.js r128 (`scripts/composite.html` in the sourcing
scratchpad: one zone in the mockup layout, the backdrop, four posed Hazmat
clones, the view model; one static frame, no effects):

| Configuration | Main pass + view model | Shadow pass | Verdict |
|---|---|---|---|
| Desktop, LOD0 enemies, static props **merged** by material | 49 calls, 44.1k triangles | +33 calls, ≈ 41k triangles | passes (82 calls total) |
| Mobile, LOD enemies, no shadows, merged | 49 calls, 36.4k triangles | — | passes |
| Same scene, static props **not** merged | 123–126 calls | — | **fails** the < 120 gate |

Per enemy: 3 calls; 6,584 (LOD0) or 5,015 (LOD) triangles. The view model
is 1,930 triangles. The merged scene had 21 merge groups because each
Kenney GLB file loads with its own material instance.

**Static merging is mandatory (rev 2.1).** `buildZone()` (and
`buildBackdrop()`) place the kit pieces, then call
`strikeOpsMergeStatic(group)`, which groups every static mesh by material
and emits one merged `BufferGeometry` + `Mesh` per material, disposing the
placed clones. Two rules:

- **Share one material per kit before merging.** On load, every mesh of a
  kit (industrial, survival, fantasy) is reassigned to that kit's single
  shared material (same `colormap.png`), and the duplicate per-file
  materials and textures are disposed. Only deliberate variants stay
  separate: the yellow shed material (`colormap-shed.png`), the tinted deck,
  the lightened crate, the beige barricade, and the two ground materials.
  This cuts the merge groups from 21 to about 9; the gate is still
  measured, not assumed.
- **Manual de-index, de-interleave and de-normalise.** The Kenney and
  KayKit GLBs use **interleaved** and **normalised (quantised)**
  attributes. In r128, `BufferGeometry.toNonIndexed()` mis-reads
  interleaved attributes and corrupts these meshes, and reading the raw
  arrays skips de-normalisation. `strikeOpsMergeStatic` therefore copies
  `position`, `normal` and `uv` through the attribute accessors
  (`getX/getY/getZ`, which handle interleaving), divides normalised
  integer data by its type's maximum, expands the index by hand, applies
  each mesh's world matrix, and concatenates. **`toNonIndexed()` and any
  vendored merge utility are prohibited** for these meshes (none is
  vendored anyway). Unit test 11 covers it with a synthetic indexed,
  interleaved, normalised geometry.

**Map chunks and visibility (rev 3).** The whole map is merged once at
load into these groups (each merged per material, so each is ≤ 6 draws
with per-kit material sharing):

| Chunk | Contents | Drawn when |
|---|---|---|
| backdrop | sky dome, hills, clouds, the water tower, the outer trees beyond the walls | always |
| ground | the map-wide grass plane (1 draw) and every dirt path / paving (1 draw) | always |
| `structure[place]` | the place's walls (a shared wall belongs to the lower-index place), sheds, containers, trees, hedges, stone walls, gate posts | always (frustum-culled per merged mesh; the merge must compute each mesh's bounding sphere) |
| `detail[place]` | the place's cover (`cover` × `coverKinds`), crates, barrels, rocks, sandbags, decks, grass clumps (tier-capped) | only for the **current** place and the places sharing a gate with it (worst case: the containers place → 3 detail chunks); at tier 0 additionally only within 30 m of the player |
| gates | 3 moving gate parts and their lights | always |

Visibility (rev 3.1) is re-evaluated when the current place changes, when
the quality tier changes, and whenever the player has moved ≥ 2 m since
the last evaluation (a region lookup per simulation step, no allocation).
The tier-0 distance rule uses hysteresis: a detail chunk becomes visible
when its nearest point is < 30 m from the player and hidden only when
> 34 m, so walking along the boundary never flickers. Enemies exist only in the
current encounter (≤ 4). Estimated worst main pass (to be measured, not
assumed): backdrop ≈ 6 + ground 2 + structure ≤ 24 (usually 2–3 places in
the frustum) + detail ≤ 18 + gates 6 + enemies 12 + view model ≈ 3 +
effects/guidance ≈ 6 ≈ **77 calls**; triangles: all map statics ≈ 60k if
everything were drawn (≈ 19 containers × 402, ≈ 128 fence/hedge pieces ×
≈ 85, sheds ≈ 7.5k, trees ≈ 4.4k, cover ≈ 14k, decks ≈ 3k, grass ≤ 10k),
≈ 35–45k with the detail rule and frustum culling, plus enemies 20k and
the view model 2k.

The merged map geometries belong to the **map** lifetime (§10: built once
per load or restart, disposed in teardown or `lost`); the kit templates
and kit materials to the **shared** lifetime. *Removed (rev 3):* the
per-zone lifetime and the build/retire of zones.

The budget is enforced by **measurement**, counting every pass of a
frame:

- **Main scene:** draws.
- **Shadow pass (tier ≥ 1):** the casters' draws. At tier 1 only the
  merged sheds, walls and cover groups cast; at tier 2 enemies add 12
  (4 × 3). The desktop baseline above (all merged groups casting) measured
  +33 calls.
- **View-model overlay pass:** a second `renderer.render` call, which would
  reset `renderer.info` under the default `autoReset`.

The renderer is created with `renderer.info.autoReset = false`. The frame loop
calls `renderer.info.reset()` once at the start of each frame, before the
shadow, scene and overlay passes, and reads the totals after the last pass.
`getRenderStats()` reports those per-frame sums and tracks `peak` values
(including transitions) since the last `resetRenderPeak()`.

**Mobile gates** (390×844 and 844×390, measured in the browser test,
§12.3):

- tier 0 steady state (squad and boss rounds) at **every** place's anchor
  facing its heading: < 120 calls and < 80k triangles (baseline 49 calls /
  36.4k for the single-zone composite);
- tier 1 steady state with the sun shadow, same positions: < 120 calls
  (measured separately; the baseline has no tier-1 configuration);
- boss round with effects (hologram copies, split, dissolve particles):
  measured separately, < 120 calls;
- **roaming views (rev 3)** at tier 0 and tier 1: standing in each open
  gate facing the next place, at the containers anchor facing west (three
  detail chunks) and at the plaza anchor facing east back over the map:
  < 120 calls and < 100k triangles; plus the peak over a full `walkTo`
  of each leg and over the lap wrap (*replaces* the revision-2.1
  `advancing` two-zone peak);
- animated enemies ≤ 4 on mobile / ≤ 6 on desktop at every sampled frame;
- `getRenderStats().detailChunks` never lists a place that is neither the
  current place nor adjacent to it.

If tier 1 fails the call gate, it drops shadow casters beyond 25 m (and,
rev 3, casters outside the current and adjacent places) before dropping
the tier. On tier 2 desktop the numbers are recorded, not gated
(baseline 49 + 33 shadow calls).

**CPU, measured separately (rev 3.1).** `getRenderStats().cpu` reports
per-frame averages and maxima since `resetRenderPeak()` of `collisionMs`
(movement + resolution), `routeMs` (route recomputation), `minimapMs`
(dynamic layer redraw) and `cullMs` (visibility evaluation); browser check
17 logs them over each leg walk and the lap wrap, and flags any average
> 1 ms or maximum > 4 ms on desktop for review (recorded, not gated, under
SwiftShader).

**Limits of these gates.** Calls and triangles in a headless browser with
viewport emulation are a **necessary** condition only. They do not show
that a phone holds the frame rate: SwiftShader timing and device emulation
say nothing about mobile GPU fill rate or thermal throttling. Frame-rate
feasibility is checked in manual QA (§12.4) on at least one real mid-range
phone (or, failing that, desktop Chrome with 4× CPU throttling as a weaker
proxy, recorded as such), with the FPS monitor's tier read-out recorded.

### 6.3 Quality tiers (mirrors balloon shooter, implemented independently)

- **Initial tier:** `lowMemory` (`deviceMemory ≤ 2` or `hardwareConcurrency ≤ 3`)
  gives 0; touch (`!matchMedia('(hover: hover) and (pointer: fine)')`) gives 1;
  otherwise 2.
- **Tier 2:** AA, pixel ratio ≤ 2, sun shadow 2048 cast by enemies, sheds
  and cover, 18 grass clumps, LOD0 enemies (`enemy-hazmat.glb`). Particle
  cap 24.
- **Tier 1:** no AA, pixel ratio ≤ 1.5, sun shadow 1024 cast **only by
  sheds, walls and cover**, blob shadows under enemies, 8 grass clumps, LOD
  enemies (`enemy-hazmat-lod.glb`). Particle cap 12.
- **Tier 0:** pixel ratio 1, no shadow map, blob shadows only, no grass
  clumps, shorter fog, LOD enemies, hologram drawn as plain opacity.
  Particle cap 8. In full scope the muzzle light exists at intensity 0 so
  shader programs do not recompile.
- The enemy file is chosen once at load from the initial tier; a later FPS
  downgrade from tier 2 keeps LOD0 (no second enemy download mid-run).
- **FPS monitor:** average over 2 s windows; below 32 fps the tier steps down
  by one (minimum 0) with a 4 s cooldown. It never steps up automatically.
  `setQuality()` pins the tier and disables the monitor.
- **Animated mixers:** at most 4 at once on touch/tier ≤ 1 and 6 on
  desktop. Squad and boss rounds use ≤ 4. The knocked-down soldier finishes
  its `Death` clip (0.75 s) inside the 900 ms `correct` phase, its mixer
  stops when the clip ends, and the soldier is retired when its fade ends
  (450 ms into the transition); the untagged soldiers are retired at
  transition start; the next squad only becomes visible in the approach
  beat (≥ 600 ms into the transition), so rounds never overlap on mobile.
  Desktop's extra two cover the optional `cheer` clips. When the cap would
  be exceeded, the oldest non-essential mixer (cheer, then idle of a hidden
  enemy) is stopped. In `roaming` no enemy exists once the knocked-down
  soldier's fade ends (rev 3), so walking costs no mixer.

### 6.4 Assets

**Rev 3 adds no asset file.** The compound map reuses the 22 sourced kit
GLBs (more instances of the same pieces, merged per chunk); gate arms,
gate lights, the chevron texture and the fight-box tape line are
procedural (no file). `STRIKE_OPS_ASSETS` and the offline rule below are
unchanged.

Runtime assets live under `assets/strike-ops/` and are precached. All
sourced files are **CC0 1.0**; they are staged (with a `CREDITS.md` and the
processing scripts) in the sourcing scratchpad and are copied into the repo
with the layout below.

**Obsolete revision-1 files (delete in the same change).** The slice copied
five Kenney **Factory Kit** GLBs for its indoor rooms:
`assets/strike-ops/models/kenney-box-large.glb`, `kenney-box-long.glb`,
`kenney-box-small.glb`, `kenney-structure-doorway-wide.glb`,
`kenney-structure-short.glb`, plus `assets/strike-ops/models/Textures/colormap.png`
and `assets/strike-ops/LICENSE-Kenney.txt`. They are untracked slice files
with no other user; the whole `assets/strike-ops/models/` folder goes, and
`STRIKE_OPS_ASSETS` loses those paths and `RobotExpressive.glb` (the shared
`assets/models/duel/RobotExpressive.glb` stays where it is for other games).
The newly selected outdoor Kenney kits below are **different** kits
(City Kit Industrial, Survival Kit, Fantasy Town Kit 2.0) and live under
`assets/strike-ops/env/`; the obsolete files are recognised by their path
(`assets/strike-ops/models/`), never by a `kenney-` prefix.

**New files (manager decision: they replace the indoor files):**

| Path under `assets/strike-ops/` | Source (all CC0 1.0) | Triangles | Bytes |
|---|---|---|---|
| `characters/enemy-hazmat.glb` | Quaternius, "Character Hazmat" (Toon Shooter Game Kit), poly.pizza `z3TSQYx1Kn`, processed (§6.1) | 6,584 | 445,924 |
| `characters/enemy-hazmat-lod.glb` | same, meshopt-simplified to 70% | 5,015 | 384,624 |
| `env/kenney-industrial/water-tower.glb` | Kenney, City Kit (Industrial) 2.0 | 968 | 93,836 |
| `env/kenney-industrial/shipping-container-a.glb`, `-b.glb`, `-c.glb` | same kit | 402 each | 36,624 / 37,052 / 36,620 |
| `env/kenney-industrial/Textures/colormap.png` | same kit (palette) | — | 11,986 |
| `env/kenney-survival/barrel.glb` | Kenney, Survival Kit | 412 | 34,256 |
| `env/kenney-survival/rock-a.glb`, `rock-b.glb` | same kit | 104 / 156 | 10,812 / 15,184 |
| `env/kenney-survival/tree.glb`, `tree-tall.glb` | same kit | 226 / 254 | 22,184 / 24,672 |
| `env/kenney-survival/grass-large.glb` | same kit | 144 | 18,848 |
| `env/kenney-survival/Textures/colormap.png` | same kit (palette) | — | 7,440 |
| `env/kenney-fantasy/wall-wood.glb`, `wall-wood-detail-cross.glb`, `wall-wood-doorway-square-wide.glb` (shed walls) | Kenney, Fantasy Town Kit 2.0 | 32 / 80 / 46 | 4,808 / 8,480 / 5,876 |
| `env/kenney-fantasy/roof-flat.glb`, `roof.glb` | same kit | 20 / 64 | 3,448 / 9,324 |
| `env/kenney-fantasy/planks.glb` (deck) | same kit | 96 | 11,148 |
| `env/kenney-fantasy/wall-block-half.glb` (low stone cover wall) | same kit | 76 | 8,564 |
| `env/kenney-fantasy/fence.glb` | same kit | 84 | 7,672 |
| `env/kenney-fantasy/tree.glb`, `tree-high-round.glb`, `hedge-large.glb` | same kit | 168 / 126 / 90 | 18,188 / 13,176 / 9,568 |
| `env/kenney-fantasy/Textures/colormap.png` | same kit (palette) | — | 11,143 |
| `env/kenney-fantasy/Textures/colormap-shed.png` | derived from the Kenney palette: wood recoloured yellow, trim off-white, roof grey (staged script `shedmap.mjs`) | — | 12,347 |
| `env/kaykit-barricade.glb` (sandbag stand-in, tinted beige at runtime) | Kay Lousberg, KayKit Medieval Hexagon Pack `fence_stone_straight` (the repo's `assets/hexkeep/source/barricade.gltf`, packed to GLB) | 284 | 30,972 |
| `env/ground/ground-grass.png`, `env/ground/ground-dirt.png` | generated in-house for this project (canvas noise) | — | 67,236 / 58,563 |
| `env/kenney-industrial/License.txt`, `env/kenney-survival/License.txt`, `env/kenney-fantasy/License.txt` | Kenney licence files, copied unmodified (not fetched by the game, not precached) | — | ≈ 0.7 KB each |
| `CREDITS.md` | rewritten from the staged `CREDITS.md`: every file above with title, creator, source URL, licence, triangles, bytes and the modifications (weapon strip, head merge, material collapse, clip-prefix strip, LOD simplification, shed palette recolour, barricade packing) | — | — |

Referenced in place (shared library assets, already tracked and precached):

- `assets/models/shooter/shooter_models.js` (already loaded by `index.html`),
  which provides `SHOOTER_MODEL_DATA.assaultRifle` — the embedded copy of
  the repo's `assets/models/shooter/assault-rifle.glb` (Quaternius Ultimate
  Guns, 1,930 triangles, 133,980 bytes as a GLB), the view model used in the
  measured scene — and `.crate` — the embedded copy of
  `assets/models/shooter/crate.glb` (Quaternius "Crate", 784 triangles; the
  staged `quaternius/crate.glb` is the same file and is **not** copied).
  The game never requests `assault-rifle.glb` or `crate.glb` by URL.

Procedural (no file): the sky dome, the distant hills, cloud sprites (a
small generated `CanvasTexture`), blob-shadow and particle textures.

**Payload.** New runtime files: 22 environment GLBs + 6 PNGs = 630,027
bytes, plus one enemy file (445,924 LOD0 or 384,624 LOD) ≈ **1.08 MB**
(1.01 MB with the LOD) per visit; with the rifle and crate (already
shipped inside `shooter_models.js`) the measured scene's runtime is
≈ **1.25 MB**. The precache adds both enemy files: ≈ 1.46 MB of new
bytes. The 4 MB target is met.

**Offline rule:** the complete set of URLs the game may fetch is
`STRIKE_OPS_ASSETS` (§11.2): the 2 enemy GLBs, the 22 environment GLBs and
the 6 PNGs above (30 URLs). The Kenney GLBs are **not** self-contained:
each references `Textures/colormap.png` relative to its own URL, which is
why the kit folders keep their `Textures/` subfolder and why every
referenced image is in the list. Unit test 10 parses each listed GLB's JSON
chunk and asserts that every external `images[].uri` and `buffers[].uri`
resolves to a listed path. There are **no** fallback URLs; every fallback
is procedural. A browser check (§12.3 check 25) records every same-origin
request after entering the route and asserts that each one is in the
precache list.

**Fallbacks (game stays playable; 15 s load timeout):**

- If the enemy GLB fails to load: a procedural armored soldier (capsule
  torso, sphere helmet with a visor band, box pack, cylinder limbs, a box
  rifle) with the same hitbox, nameplate anchor and states animated by
  transforms; lane tints and the hologram variant still apply.
- If a kit GLB or texture fails: that prop kind is drawn as a plain box or
  cylinder of its configured footprint in the kit's palette colour. Cover
  AABBs, LOS and lane order come from the config, never from the meshes, so
  gameplay is unchanged.
- If a clip role is missing: the documented role fallback (§5).
- If the gun's embedded data is missing: a simple box rifle.

Credits: replace `assets/strike-ops/CREDITS.md` as above, and replace the
Strike Ops section of `ASSET_LICENSES.md` (drop the Factory Kit and
RobotExpressive lines; list Quaternius *Character Hazmat*, Kenney City Kit
Industrial / Survival Kit / Fantasy Town Kit 2.0, the KayKit barricade, the
in-house ground textures and derived shed palette, and keep Quaternius
Ultimate Guns for the view model and crate via `shooter_models.js`).

### 6.5 Feel

**Slice (basic feel only):**

- **Shot:** layered WebAudio synthesis, no audio files (kept from the slice).
  - crack: white-noise burst → bandpass ≈1.2 kHz, 60 ms decay;
  - body: sine 90→40 Hz, 120 ms;
  - mechanism: 3 kHz click, 10 ms;
  - pitch jitter ±4%.
- **Other sounds:** hit tick 2.2 kHz for 25 ms; wrong "bonk" triangle wave
  220→180 Hz for 150 ms; foam-puff "pff" (short filtered noise, very
  quiet, panned by enemy lane); knockdown "boop" (two rising sine notes);
  hologram dissolve shimmer (high filtered noise sweep). The master gain is
  0.5. `successSound` and `failureSound` are the existing global `Audio`
  objects (not owned, never stopped).
- **Muzzle flash:** additive star sprite with random roll, 50 ms.
- **Recoil:** a critically damped spring on view-model z and pitch, plus a
  camera pitch kick of 0.6° that recovers in 150 ms.
- **ADS:** lerps the FOV from the hip framing to the ADS framing
  (`tan` of the half-angles ÷ `framing.adsZoom`, §5) in 120 ms and moves
  the view model to a sight pose (the mockup B2 red-dot pose).
- **Hitmarker:** correct is a ✓ glyph in teal, scaled from 0.8 to 1 over
  120 ms; wrong is an amber ring with no check. A cover hit gives a small
  grey dust puff and no marker.
- **Crosshair:** a static 4-tick DOM crosshair plus a dot. It tightens in ADS
  and turns to the theme accent while over a hittable enemy (presentation
  only; never correctness).
- **Knockdown:** `Death` clip (0.75 s) as a cartoon fall, a stars/sparkle
  puff at 450 ms, fade to 0 from 750 ms over 600 ms (§5 `knockdown`, §6.1).
- **Hologram dissolve (decoy hit):** flicker (2 opacity dips in
  `flickerMs` = 200 ms), then fade with a few rising particles over
  `dissolveMs` = 250 ms, done at 450 ms, inside the 600 ms retry lock. At
  `unlockRetry` any unfinished flicker/dissolve is cancelled and the
  re-form (the reverse fade, `reformMs` = 150 ms) starts; the copy is
  hittable from the first re-form frame. Decoys dissolving after a
  **correct** real-copy hit use the same 450 ms within the 900 ms
  `correct` phase.
- **Movement (rev 3):** free walking with gentle acceleration (10 m/s²)
  and braking (14 m/s²); **no head bob** in any motion mode (comfort for
  children in a free-roam first-person view); soft footstep ticks while
  moving (very quiet synth, every 0.45 s walking / 0.33 s sprinting, off
  when the AudioContext is suspended); a soft "thud" and no camera jolt
  when sliding along a wall. Gate opening: a rising two-note chime and the
  light turning green.

**Full scope (extended effects, after the slice gate):**

- muzzle point-light pulse on tier ≥ 1;
- tracer line;
- dynamic crosshair spread (`--so-spread` = base + move + bloom, visual
  only);
- hologram scanline shader;
- reload click sounds and a magazine-swap view-model animation;
- flag cloth sway, swaying bushes, birds, dust motes;
- a second, cosmetic weapon slot (pistol) with identical hit logic.

### 6.6 HUD layout (COD Mobile style)

Positions are **physical** (not mirrored by `dir`), matching the mockups and
thumb ergonomics; only text inside each element follows its own direction.

| Region | Element (class) | Notes |
|---|---|---|
| Top-centre | Question banner `.so-question` (`<h2>`) with the replay control `.so-replay` (speaker icon) at its physical left end; in `roaming`/`advancing` the banner shows the objective line `.so-objective-line` (`התקדמו אל: <place>` + a direction arrow) instead (rev 3) | Opaque plate, gold-edged frame in `base`; `dir` from content, embedded opposite-direction runs isolated (§8); ≤ 3 lines at 390 px, then scrolls inside |
| Below the banner | Place toast `.so-toast` (rev 3; 1.6 s, `role="status"` via `.so-live`, never covers the answer row) | Inside the scene band; fades only (no slide) |
| Top-left | Counter pocket `.so-counter`: emblem, `שאלה N/M`, 4 stars `.so-stars` (rev 3: one per place) | Visual only (§3 Progression) |
| Top-right | Minimap `.so-minimap` (canvas inside a framed box), with a small icon column to its left: pause `.so-pause`, exit `.so-exit` | Column buttons ≥ 44 px |
| Centre | Crosshair `.so-crosshair`, hitmarker `.so-hitmarker`, lock ring | — |
| Over the scene | Nameplates `.so-plate[data-index]`; objective marker `.so-objective` (rev 3: in `roaming`, clamped to the safe rectangle with an edge arrow, §3 Guidance) | §6 rules; marker `aria-hidden` |
| Bottom band, centre | Answer list `.so-answers` (`.so-answer[data-index]` in index order: a `direction: ltr` row of chips, or the stacked full-text list when a chip would need more than 3 lines, §6) — in `roaming` the same grid row holds the **קדימה** button `.so-go` instead (rev 3; ≥ 56 px tall, icon + text `קדימה אל <place>`); then the weapon slot `.so-weapon` (rifle silhouette + ammo `.so-ammo` `30/120`), then the engine progress bar `.so-progress` with score | Answer row (or go button) always above the weapon slot |
| Bottom-left | Virtual joystick `.so-stick` (touch only) | Optional; hidden on non-touch |
| Bottom-right | Fire `.so-fire` (≥ 76 px, bullet icon), ADS `.so-ads` (crosshair icon) above it, reload `.so-reload` (magazine icon) to its left | Not mirrored in RTL |

- **Minimap content (rev 3: a real map of the compound).** The static
  compound layer is drawn **once** from the map config (and again only on
  a theme change) into one offscreen canvas at `layerPxPerM` (6 px/m):
  each place's region in a theme-derived ground tint, paths and paving,
  walls, sheds, containers, decks and cover as simple shapes, the water
  tower as a ringed circle. Each redraw (≤ `redrawHz`) blits it rotated
  around the player — player arrow fixed at the centre pointing up (map
  rotates with yaw: easier for children), `rangeM` 24 m radius — then
  draws the dynamic layer: gates (red bar closed / green gap open), cleared
  places' check marks, the remaining route to the objective as a dotted
  line, the objective star (or a rim arrow when beyond the range), the
  current fight box's outline, and enemy dots in their badge tints —
  filled when exposed/dashing, hollow and faint when hidden at cover, boss
  copies as identical dots. No answer text, no badge numbers, no
  correctness. No layout reads; not drawn while paused or `lost`; hidden
  in the DOM render mode.
- **Full map overlay (rev 3).** Tapping the minimap, or `KeyM`, opens a
  north-up overlay of the whole compound (`.so-mapview`, the same layer at
  `overlayPxPerM`, Hebrew place names, "אתם כאן" arrow, the route) — only in
  `briefing`, `roaming` and `paused` (the pause panel always shows it).
  During an encounter the minimap tap does nothing (it never covers the
  question). **Rev 3.1:** because walking (held keys, the joystick or the
  autopilot) continues while the overlay is open, `enterEncounter()`
  closes it **synchronously**, in the same step as the phase change to
  `deploying`, and moves focus to the root if focus was inside it; so do
  entering `advancing`, `lost` and the DOM render mode. `KeyM` or a tap closes it; it does not pause (Esc still
  pauses, and the pause panel shows the same map). It is `aria-hidden`
  except for its place list, which is a plain `<ol>` of the four places
  with their state (`נוקה` / `היעד` / `סגור`).
- **Ammo:** `magazine/reserve` (`30/120`); the reload button and `KeyR`
  start a 1000 ms reload; an empty magazine auto-reloads; the reserve never
  blocks firing (§5). A reload never blocks lock-on: a pending lock-on fires
  when the reload ends if its enemy is still hittable.
- **Layout mechanism (portrait no-overlap fix):** the root is a CSS grid:
  `auto` (top HUD row) / `1fr` (scene, nameplates, crosshair) / `auto`
  (answer row) / `auto` (control band). The canvas fills the root behind
  the grid; the controls occupy grid areas in normal flow, so the answer row
  and the control band can never overlap by construction. Orientation
  styling comes from CSS `@media (orientation: portrait)` and
  `(max-height: 500px)` queries, not from a JS-set class, so the first paint
  is already in the correct layout. JS `measure()` only **reads** rects
  (banner bottom, answer-row top, control rects, minimap rect) to derive the
  nameplate safe rectangle and the camera's horizon band, and it runs after
  layout: on `ResizeObserver` callbacks, after `$nextTick` + one RAF when
  options or the round kind change, and after fullscreen changes. (Revision-1
  slice bug, reported as reading `--so-strip-h` before the portrait layout
  applied; in the current source `measure()` sets the reactive `portrait`
  flag and then reads the plate/dock rects in the same tick, before the
  `so-portrait` class has re-rendered, so the portrait band used landscape
  geometry and controls overlapped the learning plate.)
  The camera FOV is derived from the measured canvas aspect (§5
  `framing`), not from a portrait flag; the JS `portrait`/`lowHeight`
  flags remain only as debug read-outs.

---

## 7. Themes

Keys come from `Object.keys(themeOptions)`. Today these are `base`, `soldiers`,
`unicorn`, `space`, `dark` and `code`. The adapter must enumerate the registry,
not this table. The world **stays an outdoor training compound** in every
theme (same geometry, same map and places); a theme changes sky, haze,
light, material tints, the squad tint palette (= the badge tints) and UI
accents. Rev 3: the adapter also yields the minimap layer colours
(`scene.mapGround`, `mapPath`, `mapWall`, `mapStructure`, derived from
`ground`, `deck`, `shedSiding` and `coverTint`), the gate light colours
(fixed red `#e53935` / green `#43a047`, each with a dark outline) and the
objective-marker colours (`--so-objective` from the accent, forced to
≥ 3:1 against the plate); a theme change re-renders the minimap layer
once. `dark` and `space` are dusk /
night variants of the same compound, never a different place.

| Theme key | Setting/motifs | Materials | Particles/light | Feedback/ending |
|---|---|---|---|---|
| `base` | "מתחם האימונים": sunny noon, blue sky with clouds (mockup A) | yellow sheds, warm wood deck, green grass; squad tints red / blue / green / yellow; boss white-and-blue with gold visor | warm-white sun ≈35°, light haze `#cfe4f5` | teal ✓; amber ring; gold-edged banner |
| `soldiers` | "בסיס השדה": late-afternoon field base, khaki tarps | olive/khaki sheds, sand ground with dry grass; squad tints olive / sand / rust / slate; boss khaki with gold visor | low warm sun, dusty haze `#d8d3b8`, dust motes (full scope) | gold-tinted ✓ (accent `#FFD700`); amber ring |
| `unicorn` | "מחנה הקשת": pastel morning, rainbow bunting | pink/lilac sheds, mint grass; squad tints pink / lilac / mint / peach; boss pearl-white with violet visor | soft pink hemisphere, sparkle particles on the knockdown | pink-violet ✓ with sparkle; amber ring |
| `space` | "בסיס אוריון": dusk under a starry violet-blue sky, a moon in place of the sun | steel-blue sheds, blue-grey ground; squad tints cyan / blue / teal / white; boss silver with blue emissive visor | cool moonlight key, deep-blue haze `#1a2348`, star specks on the sky dome | sky-blue ✓; amber ring |
| `dark` | "מבצע לילה": night exercise, floodlights on poles (emissive cones, not real lights) | charcoal sheds, dark grass; squad tints purple / teal / orange / white with emissive visors; boss black with lavender visor | dim moon key + strong hemisphere fill so soldiers stay readable, haze `#16161c` | lavender ✓ (accent `#BB86FC`); amber ring |
| `code` | "שרת המטריקס": dusk with a green grid overlay on the ground texture | near-black sheds with green edge lines, dark ground grid; squad tints green / lime / cyan / white; boss black with green visor | green emissive accents, haze `#020802` | neon-green ✓; amber ring (kept amber, never green) |

- **Central adapter shape:**
  `resolveStrikeOpsTheme(requested, themes = themeOptions)` returns
  `{key, motif, css, scene}`:
  - `key`: the requested key if it exists in **both** the registry and
    `THEME_MOTIFS`; otherwise `'base'`.
  - `css`: `--so-primary, --so-secondary, --so-accent, --so-text, --so-panel`
    (background at 0.9 alpha), `--so-edge` (tertiary at 0.7), `--so-plate`,
    `--so-plate-text`, `--so-banner-edge`, `--so-correct`, `--so-wrong`,
    `--so-focus`, `--so-enemy-dot`, `--so-lane-0..3` (chip/plate markers =
    the squad tints).
  - `scene`: `{skyTop, skyHorizon, haze, hazeNear, hazeFar, hemiSky,
    hemiGround, sunColor, sunIntensity, sunElevationDeg, ground, deck,
    shedSiding, shedTrim, coverTint, squadTints[4], bossTint, trimTint,
    visorEmissive, hologramTint, nightLights: boolean}` (`shedSiding`/
    `shedTrim` multiply the yellow shed material, `coverTint` the crate and
    barricade, `trimTint` each enemy's `Trim` clone). `visorEmissive` is
    kept for swappable models with a separate visor material; Hazmat's
    visor is a `Trim` vertex colour, so in `dark`/`space`/`code` its
    readability comes from `trimTint` and the hemisphere fill floor, and
    the table's "emissive visors" become a lifted `Trim` tint.

  Palette values derive from `themeOptions[key].colors`. Scene-only motif
  values (time of day, haze distance, setting name, `nightLights`) live in
  `THEME_MOTIFS`. The adapter is applied once on create and again if `theme`
  changes. It writes the root `:style`, re-tints the shared kit materials,
  re-tints **every live per-enemy material clone** (§6.1, preserving each
  clone's opacity/effect state), and updates sky, haze and lights. Zones
  and behavior contain no
  `theme === …` branches. Theme never affects hitboxes, lanes, timings,
  magnetism, round kind or the question.
- **Contrast/readability rule:** nameplates, answer chips and the question
  banner sit on their own opaque plate (`--so-plate`). `--so-plate-text` is
  picked from `#ffffff` / `#111111` by relative luminance so the contrast
  ratio is ≥ 4.5:1, which is verified for every key in Node. `--so-wrong` is
  a fixed amber `#ffb020` with a dark outline. `--so-correct` comes from the
  theme accent but is forced to ≥ 3:1 against the plate. Each squad tint is
  forced to ≥ 3:1 against the theme's `ground` colour (so soldiers read
  against the grass) and the four tints are pairwise distinct (ΔE ≥ 20);
  lane markers always pair tint **with** a number and shape. In `dark`,
  `space` and `code` the hemisphere fill keeps enemy-vs-background luminance
  contrast ≥ 3:1 (measured in the browser test from a screenshot sample).
  Correct and wrong always differ in **shape and text**, not only colour.
  The focus ring is a 3 px outline in `--so-focus` plus a 2 px contrasting
  halo, visible on light and dark themes.

---

## 8. Interaction and accessibility

- **Touch and minimum target sizing:**
  - every control is at least 48×48 CSS px, the fire button ≥ 76 px;
  - a drag that starts anywhere on the scene outside a control looks
    around; the pointer id is tracked, so joystick, look and fire work
    simultaneously (three thumbs/fingers);
  - buttons: fire (bottom-right, large), ADS, reload; pause and exit beside
    the minimap;
  - the left virtual joystick is shown on touch and walks the player
    through the compound (rev 3; dead zone 0.12, pushing to the rim
    sprints while roaming); during an encounter it only strafes/steps
    inside the fight box and is optional there: encounters are fully
    playable without it. Between places the **קדימה** button (≥ 56 px)
    walks the player for them, so no child needs the joystick to finish
    the map;
  - `touch-action: none` on the scene host;
  - answer chips are ≥ 48 px tall and grow with their text. In the row
    layout (index order, §6.6) each chip at 390 px is ≈ 85 px wide and wraps
    to at most 3 lines at ≥ `minPlateTextPx` (14 CSS px at default text
    size; the font never shrinks below it). If any option needs more, the
    list switches to the stacked full-width layout (§6), so long answers
    and 200% text always show in full; never ellipsis, never clipping.
- **Keyboard controls and focus order** (via `event.code`, so a Hebrew
  keyboard layout works):
  - (rev 3) `KeyW`/`KeyS` and `ArrowUp`/`ArrowDown` walk forward/back;
    `KeyA`/`KeyD` strafe; `ArrowLeft`/`ArrowRight` **turn** (120°/s, so
    keyboard-only players can steer without a mouse; revision 2.1 used the
    arrows to strafe); `ShiftLeft`/`ShiftRight` held sprints while
    roaming; `KeyG` starts/stops the **קדימה** autopilot (roaming only);
    `KeyM` toggles the full-map overlay (not during encounters);
  - right mouse hold is ADS (`KeyE` toggles ADS for keyboard users);
  - `KeyR` reloads; `Escape` pauses (the browser also releases pointer lock);
  - `Digit1–4` / `Numpad1–4` lock on to the enemy with **badge N** (= chip
    N; inside the fight box also the N-th enemy from the left); `Enter` /
    `Space` fire at the crosshair (subject to the precedence rules below);
  - `KeyQ` replays the question audio/action.

  Tab order: replay → answer chips 1..n (index order) — or, in `roaming`,
  the **קדימה** button — → reload → pause → exit. The canvas and minimap
  are not focusable. The root `<main>` has `tabindex="-1"` and is the
  "scene focus" target. Entering `roaming` does not move focus; if focus
  was on a chip that disappears, it moves to the root.

  **Focus precedence (Enter/Space never do two things):**
  1. If `document.activeElement` is a `button`, `a`, `input` or
     `[role=button]` **inside `.so-game`**, Enter and Space belong to that
     control's native activation. The game's `keydown` handler returns
     immediately without `preventDefault` and never fires. On an answer chip,
     native activation calls `lockOn(i)`, which fires exactly once through
     `fire()` when enemy i is hittable. On Start, Resume, Exit, replay or
     reload, it performs that control's action.
  2. Otherwise (focus on the root, on `body`, or pointer-locked with no
     focused control), Enter and Space call `fire()` at the crosshair (with
     `preventDefault`, to stop page scroll).
  3. Clicking or tapping the canvas, Start and Resume move focus to the root,
     so a previously focused chip does not swallow later Enter presses.
     Pressing Tab while pointer-locked releases the lock and the game
     continues in cursor-aim mode **without pausing**, and focus moves
     normally, so the Tab-to-chip path works whether or not the browser
     granted pointer lock.
  4. Digit keys, WASD/arrows, Shift, `KeyR`, `KeyE`, `KeyQ`, `KeyG` and
     `KeyM` are game keys in every focus state except when an `input` is
     focused (none exist in v1). Arrow keys never move focus between chips;
     chips use Tab. Enter/Space on a focused **קדימה** button starts the
     autopilot through its native activation (rule 1).

  Unit test 9 (focus precedence) and browser checks 10–11 cover these rules (§12).
- **Lock-on (keyboard, chip tap/click, switch access):** `lockOn(i)` is
  legal in `engaging`.
  1. `lockOn(i)` captures `token = questionToken`. The camera turns smoothly
     to enemy i's torso centre **as given by the one pose source** (§5;
     350 ms; instant under reduced motion; rev 3: by the shortest turn,
     even if the enemy is behind the player) and keeps tracking it while it
     dashes or patrols. A lock ring and the matching badge appear.
  2. When enemy i is (or next becomes) hittable (`exposed`/`dash`; boss
     copies are always hittable unless dissolved), `fire({token})` runs once
     after a 150 ms settle; the hit then calls `answer(i, token)`, so a
     settle that completes after the question changed is rejected. The wait
     is at most `hiddenMs + 2·slideMs`.
  3. Status text `ממתין שהחייל יצוץ…` shows while waiting.

  The lock cancels on mouse or touch look beyond 8 px, joystick or key
  movement beyond its dead zone, a new lock-on, or leaving `engaging`. The shot goes
  through the real `fire()` → hit resolution → `answer(i)` path, so it
  consumes ammo and respects the lock.
- **Visible focus / hover distinction:** `:focus-visible` ring (§7). Hover only
  brightens; it carries no meaning.
- **Hebrew RTL behavior:** root `dir="rtl"` for UI chrome (briefing, HUD
  text, live messages). **HUD positions and gameplay controls are not
  mirrored** (§6.6): minimap top-right, counter top-left, joystick
  bottom-left, fire bottom-right. The answer row is forced to
  `direction: ltr` so chip 1 is the leftmost chip and matches enemy 1 by
  badge and, inside the fight box, by position (§2); each chip's text keeps
  its own `dir`. Nameplates keep their current screen order (§6).
- **English LTR behavior:** the question banner, each chip and each
  nameplate use `dir` computed from content with `isHebrew()` (like
  knowledge-defense's `questionDirection`). Chip order is identical to RTL.
- **Embedded opposite-direction runs (rev 2.1; rev 3 records the built
  manager override for the sentence-final `?`).** Isolating a whole element
  is not enough: inside a Hebrew banner an English word still reorders
  against the Hebrew around it. Plain-text content (banner, chips, plates,
  live text) is therefore split by a pure helper
  `strikeOpsBidiRuns(text, baseDir)` into runs; every run whose strong
  direction differs from the base (Latin words, numbers with their
  operators, e.g. `3+4`) is rendered inside `<bdi dir="ltr">` (or
  `dir="rtl"` inside an LTR base). **An isolate spans from the first to the
  last opposite-direction strong character**: neutrals *inside* it (spaces
  between English words, the `+` in `3+4`) stay in it, while the
  sentence's own punctuation around it — the `?` or `.` ending a Hebrew
  sentence, quotes, brackets, a `:` before it — stays **outside** and
  follows the base direction. Content that contains HTML (`<img>` options
  from `render`) is not split; the element keeps `unicode-bidi: isolate`
  with `dir` from its text.

  **Fixture (exact string):** `מה פירוש המילה: apple?` in an RTL banner.
  Runs: `מה פירוש המילה: ` (base), `apple` (`<bdi dir="ltr">`), `?`
  (base). Expected rendering, physically from left to right: the `?`, then
  `apple` (letters a-p-p-l-e in LTR order, the `?` immediately left of the
  `a`), a space, the `:`, then the Hebrew words, which read right to left
  as `מה פירוש המילה` (`מה` rightmost) — i.e. on screen
  `?apple :המילה פירוש מה`. The `?` is the Hebrew sentence's final
  question mark, so it sits where every Hebrew question ends: at the far
  left. **Manager decision (overrides revision 2.1's fixture, which kept
  the `?` inside the isolate as `apple?`):** the line is a Hebrew question
  and Hebrew readers expect its `?` at the far left; the `?` belongs to
  the Hebrew sentence, not to the English word. What stays forbidden is the word itself
  reordering (e.g. `elppa`) or the `?` landing *between* the Hebrew words
  and the English word. Browser check 14 asserts this with glyph
  rectangles, not just `dir`.
- **Long question/answer behavior:** the banner wraps, takes at most 3 lines
  at 390 px (then scrolls inside the banner) and never uses ellipsis. Chips
  show their full text (3 lines in the row layout, unlimited in the stacked
  layout, §6). Nameplates show the **full text** when the one- or two-tier
  layout fits and collapse to number + shape markers otherwise (§6); the
  answer list always shows the full text. Image options (`<img>` from
  `render`) are capped at 40 px in nameplates and 48 px in chips.
- **Screen-reader semantics/live feedback:**
  - the canvas and minimap are `aria-hidden`; nameplates are `aria-hidden`
    (the answer list is their accessible mirror);
  - the question is an `<h2>`;
  - the answer list is `role="group"`, `aria-label="חיילים ותשובות"`, with
    each chip a `<button>` labelled `חייל N (<shape>): <option text>` (rev 3:
    the badge, e.g. `חייל 2 (משולש)`; *was* `חייל N משמאל`) plus a state
    (`בחיפוי` / `חשוף` / `נוסה` / `נכון`); in a boss round the group label
    is `העתקים של המפקד ותשובות`;
  - the **קדימה** button is labelled `קדימה אל <place>` and exposes
    `aria-pressed` while the autopilot walks;
  - `.so-live` (`aria-live="polite"`) announces outcome, boss-round start
    (`סבב בונוס: המפקד התפצל!`), and (rev 3) once each: place cleared and
    gate opened (`האזור נוקה! השער ל<place> נפתח`), place entered (its
    name), encounter start (`חוליה ב<place>!`), the first boundary push of
    an encounter (`הישארו בקו האש עד שהמקום נקי`) and the lap wrap
    (`סבב 2`); never ambient changes, distances or footsteps.
- **Reduced-motion behavior** (`matchMedia('(prefers-reduced-motion: reduce)')`,
  with a change listener). **Rule: reduced motion changes visual
  interpolation only.** The squad and boss schedulers (`exposedMs`,
  `hiddenMs`, `slideMs`, `dashMs`, offsets, hittable windows) and every
  learning-phase timer (`retryLockMs`, `correctToTransitionMs`, `regroupMs`,
  `advanceMs`) use identical values in both modes, and the scheduler clock
  advances identically. Rev 3: walking speeds, collision, triggers, gate
  state and the autopilot's path are identical too; only their drawing
  changes. What changes is only how frames between states are
  drawn:
  - a peek is drawn as a 120 ms opacity/position step at the **start** of
    the unchanged 350 ms `peek-out` window; a dash is drawn as a 120 ms
    cross-fade at the start of the unchanged dash window, after which the
    soldier stands at the destination spot. The enemy becomes hittable at
    exactly the same time as in normal motion;
  - boss copies do not patrol (they stand at their lane point); flicker is
    replaced by a single dim step; the split is a cross-fade;
  - **one pose source (rev 2.1):** these jumps happen in
    `strikeOpsPoseAt(…, reducedMotion = true)` (§5), so the hitbox, LOS
    test, lock-on aim point, magnetism, nameplate anchor, minimap dot and
    `getEnemies()` jump together with the drawn body. During a
    reduced-motion dash the hitbox is at the destination spot from the
    dash's first frame (the fading ghost at the origin is drawn only and
    has no hitbox); a boss copy's hitbox stays at its lane point. A shot at
    the visible body therefore always hits, and a shot where the
    normal-motion trajectory would be never does;
  - no camera recoil kick (view-model kick at 30%); the ADS FOV change is an
    instant cut, but the ADS state timing is unchanged;
  - the knockdown snaps to the last `Death` frame (lying down), shows a
    static star icon instead of the particle puff, and keeps the same
    600 ms fade;
  - `advancing` (the lap wrap) is the same 300 ms fade cut then a static
    hold until the unchanged 3.2 s timer ends (in every mode); the approach
    jog is replaced by enemies appearing in cover;
  - (rev 3) the centre-view assist (rev 3.1), lock-on and autopilot turns
    are instant cuts; gates appear open at once (the collider timing is
    unchanged); chevrons are static (no pulse); the place toast and the
    objective marker fade without sliding; the go-button pulse becomes a
    static outline;
  - static hitmarkers; no cloud drift, ambient sway or particles (there is
    no head bob in any mode, rev 3).
- **Browser zoom and text scaling:** the layout uses CSS px and `rem`, with
  no fixed-pixel text containers. At 200% browser zoom (equivalent to a
  720×450 CSS viewport from 1440×900) and at 200% root font size, the
  following must hold:
  - the question banner, answer row (or the **קדימה** button), the
    objective marker and touch/keyboard controls stay fully visible;
  - nothing overlaps;
  - no horizontal page scroll;
  - targets stay ≥ 44 CSS px.

  The minimap shrinks to `sizePortraitPx` and then hides below 480 px of
  height before anything overlaps; nameplates go to two tiers, then collapse
  to markers, before they overlap; the answer list switches to the stacked
  layout rather than shrinking text below `minPlateTextPx` (which itself
  scales with the root font size).
- **Audio-independent cues and audio cancellation:** every outcome has a
  shape, a text and a live-region cue. On teardown the game closes its own
  `AudioContext`. It does not stop the shared `successSound` /
  `failureSound` and does not call `speechSynthesis.cancel()`, because the
  next route (news display) may already be speaking. The `AudioContext` is
  created lazily on the Start gesture, suspended in `paused`, and resumed on
  Resume.
- **Pointer lock:** desktop Start calls `canvas.requestPointerLock()`.
  - On `pointerlockchange` with no lock during a playing phase, enter
    `paused` (except the Tab case above). This freezes the phase timers
    (§4).
  - On `pointerlockerror`, or when unsupported (iframes, headless test
    browsers), use **cursor-aim mode**: the camera turns only when the
    cursor nears the left/right edge (edge-pan, 15% bands), the crosshair
    follows the cursor, and shots ray-cast from the cursor with the cursor
    magnet radius. Arrow/WASD and lock-on still work. Rev 3: in `roaming`
    the cursor-mode edge-pan also turns while the cursor rests in a band,
    so walking with WASD and steering with the mouse works without a
    lock; ←/→ turn as well.
  - `aimMode` is one of `'locked' | 'cursor' | 'touch'`. It is `'touch'`
    when Start is activated by a `pointerdown` with `pointerType ===
    'touch'` (or, for keyboard activation, when `matchMedia('(pointer:
    coarse)')` matches and no fine pointer is present); otherwise
    `'locked'` if pointer lock is granted, else `'cursor'`.
  - Re-lock after Esc needs a new click (browser cooldown), so Resume is a
    button.

---

## 9. Responsive behavior

| Viewport | Composition and controls |
|---|---|
| Mobile portrait (≈390×844) | Grid rows (§6.6): top row = counter pocket (left), minimap 96 px + pause/exit column (right); question banner below it, full width, max 3 lines. Scene in the middle; the hip FOV is derived from the canvas aspect (§5 `framing`): at 390×844 the vertical FOV hits its 110° cap and the horizontal half-angle is ≈ 33.4°, which covers the validated ±28° lanes plus a 4° margin, and the farthest soldier (≤ 9 m from the anchor) projects ≈ 56 px tall (≈ 43 px from the far fight-box corner, §5). Answer list (row of 4 chips, or the stacked full-text list for long answers) above the control band; in `roaming` the same row holds the **קדימה** button. Control band: joystick (bottom-left), weapon slot + ammo + progress (centre), fire/ADS/reload cluster (bottom-right). Nameplates show full text when the one- or two-tier layout fits, otherwise markers (§6). **No overlap** between the banner, answer row, control band and minimap (browser-checked). |
| Mobile landscape / low height (≈844×390) | The tightest scene band vertically: the FOV floor (40° vertical, ≈ 38° horizontal half-angle) keeps the farthest soldier ≈ 100 px tall; browser check 15 verifies the size gates here explicitly. Mockup layout: counter top-left, banner top-centre (single line, wraps to 2), minimap top-right (96 px when height < 420). Joystick bottom-left, fire cluster bottom-right, answer row bottom-centre directly above the weapon slot/ammo; the progress bar is a thin line at the very bottom. Briefing card becomes a side sheet (≤ 50% width). |
| Tablet (≈768×1024 / 1024×768) | Like the mobile layouts with larger plates and a 128 px minimap; nameplates with full text. |
| Desktop (≥1280 wide) | Mockup layout at full size: banner top-centre (max 60 ch), counter top-left, minimap top-right, answer row and weapon slot bottom-centre. No joystick or touch buttons unless a touch pointer is detected (then shown); a one-line key hint (`עכבר: כיוון · לחיצה: ירי · R: טעינה · 1–4: נעילה`) sits under the weapon slot until the first correct answer, then (rev 3) `WASD: הליכה · ←→: סיבוב · G: קדימה · M: מפה` until the first place is reached. |
| Resize during play | `ResizeObserver` on the root (fallback `window.resize`), debounced 100 ms, sets renderer size, camera aspect and the derived hip/ADS FOV (§5 `framing`), then re-measures **after layout** (the CSS media queries have already applied, §6.6) the nameplate safe rectangle (also the objective marker's clamp rectangle) and horizon band. No layout reads inside the RAF loop. The state machine, schedulers, lanes, question, player pose and map state are untouched. Fullscreen changes re-measure after 100 ms (owned timer). |

---

## 10. Performance and lifecycle

- **Maximum active scene/entities/segments:**
  - map (rev 3): built once; all four places' structure chunks exist,
    detail chunks are visible for the current place and its gate
    neighbours only (§6.2); plus the backdrop and the ground;
  - enemies: ≤ 4 per round (squad soldiers or boss copies); the boss itself
    exists only until the split completes (then it is copy 0's source pose,
    not an extra mixer);
  - animated mixers: ≤ 4 mobile / 6 desktop (§6.3);
  - one muzzle sprite, one pooled `Points` for puffs/particles up to the
    tier cap (plus, in full scope, one tracer and one point light);
  - nameplates: ≤ 4 DOM nodes, reused; answer chips: ≤ 4; one objective
    marker; one toast;
  - colliders (rev 3): a static uniform grid (4 m cells) of the map's AABBs
    and circles, built once with the map, plus ≤ 3 gate colliders and ≤ 4
    `enemyZone` blockers checked directly; the move integration allocates
    nothing per frame;
  - minimap: one canvas plus **one** offscreen compound layer (rev 3; *was*
    one per live zone).
- **Off-screen rendering and animation policy:**
  - when `document.hidden` (which enters `paused`) or `paused`, the RAF loop
    stops entirely, the phase timers freeze, and both restart on resume;
  - hidden enemies are invisible and their mixers are skipped;
  - enemies outside the camera frustum keep their scheduler state but skip
    mixer updates (pose snaps when they re-enter view);
  - the minimap redraws at ≤ 10 Hz and not at all while paused;
  - detail chunks of places that are neither current nor adjacent are not
    drawn (`visible = false`); the chevrons, the tape line and the objective
    marker are hidden outside `roaming`/encounters as specified (§3);
  - the previous round's untagged enemies are retired at transition start
    and the knocked-down one when its fade ends (before the incoming
    approach; §3, §6.3). *Removed (rev 3):* retiring the previous zone after
    an advance.
- **Animation primitives:** a single owned RAF loop with one clamped `dt`
  (≤ 50 ms) from the RAF timestamp. It drives the scheduler clock, mixers,
  springs, the player's movement integration and the autopilot (rev 3;
  sub-stepped at `movement.maxStepM`), the `roaming` trigger check, gate
  animations, nameplate and objective-marker transforms, the minimap
  throttle and the lap-wrap fade. The fade is **read from** the advancing
  phase timer's `progress01`; it never ends a transition. The trigger
  check may end `roaming` (a presentation step, §2). DOM writes are limited to
  `style.transform` / CSS variables on refs and the minimap canvas. Vue
  re-renders happen only on phase, option, round-kind or counter changes.
- **Three resource lifetimes:**
  - **Shared (component lifetime)**, loaded once and disposed only in
    teardown or `lost`, registered in `_so.shared: Set`:
    - the enemy template (scene, geometries, template materials,
      `AnimationClip`s; the one file chosen at load, §6.3);
    - the kit GLB templates (geometries used as merge sources), the shared
      per-kit materials and their textures (`colormap.png` ×3,
      `colormap-shed.png`, the two ground textures), the deck/crate/
      barricade variant materials;
    - the backdrop group (sky dome, hills, cloud sprites, and the merged
      water tower and outer trees);
    - the view-model geometry and materials;
    - the blob, cloud and particle textures; the pooled `Points`.
  - **Map (rev 3; replaces the per-zone lifetime)**, built once per load
    (or per `restartInPlace()`), registered in `_so.map.disposables: Set`
    and released only by `releaseMap()` in teardown or `lost`:
    - the ground meshes and their geometries;
    - every place's **merged static geometries** (structure and detail
      chunks, from `strikeOpsMergeStatic`, one per material per chunk) and
      their meshes; the per-piece clones used as merge input are disposed
      right after merging and never registered;
    - the gate meshes, the chevron `InstancedMesh` and its `CanvasTexture`,
      the tape-line geometries;
    - the minimap compound layer (an offscreen canvas; dropped, re-drawn on
      a theme change) and the collider grid (plain data).
  - **Round (per-round lifetime)**, registered in `round.disposables: Set`
    and released by `retireRound(round)` at transition start (or by
    `releaseMap()` for a round still live at teardown/loss):
    - per-enemy cloned materials (**every** material of each enemy: `Team`
      and `Trim` for Hazmat, in their tint/hologram/fade states);
    - the rebound `Skeleton`s (`skeleton.dispose()`);
    - mixers (`stopAllAction`, `uncacheRoot`);
    - per-enemy blob-shadow instances (instance slots released).

    `releaseMap`/`retireRound` dispose each item, **delete it from the
    set**, remove the group from the scene and drop it from `_so.map` /
    `_so.rounds`. Retired objects are never kept in any registry. Shared
    resources are never disposed by either. The unit test asserts that the
    three sets (shared, map, round) are pairwise disjoint.
- **Resize measurement policy:** measure on observer events only, after
  layout (§6.6, §9).
- **Timers / RAF / listeners / observers / media owned:** see the table below.
- **Cleanup method and cancellation token:** `teardown()`, called from
  `beforeDestroy`. It is idempotent: `if (_so.destroyed) return`.
- **Fallback for unavailable browser features:**
  - no `THREE` or WebGL → `renderMode = 'dom'` (DOM answer list, banner,
    counter and progress; no minimap) with the normal phases (§4);
  - no pointer lock → cursor-aim with edge-pan;
  - no `ResizeObserver` → `window.resize`;
  - no `AudioContext` → silent synth (sounds are optional);
  - no fullscreen → ignored;
  - no 2D canvas context for the minimap → minimap hidden;
  - enemy GLB failure → procedural soldier; kit GLB/texture failure →
    plain stand-in shapes (§6.4);
  - `webglcontextlost` → `preventDefault()` is **not** called (we do not ask
    for restoration). `onContextLost()` runs the §4 sequence: `_so.gfx++`
    first (late load callbacks and graphics callbacks become no-ops that
    dispose what they receive), `pauseTimers()` (learning timers frozen),
    every cosmetic `ownTimeout` cleared, the RAF stopped, the lock-on
    cancelled, the owned `AudioContext` suspended, `resumePhase` recorded,
    and the phase becomes **`lost`**, which never resumes by itself.
    - All map and round resources are released through `releaseMap` /
      `retireRound`, and the shared set is disposed (the plain-data player
      pose, `zoneIndex` and `lap` are kept for the rebuild). Disposal calls on a lost
      context are safe no-ops.
    - The renderer is disposed and its canvas removed.
    - The panel `התצוגה נעצרה` offers:
      - **התחלה מחדש**: `restartInPlace()` (§4) on the same instance and
        route, ending in the frozen playing phase;
      - **המשך בלי תלת-ממד**: `continueInDom()` (§4): DOM render mode,
        the resume target rule (the pending timer's `expectPhase`), the
        lock untouched, then `resumeTimers()`;
      - **חזרה**: `exitGame()`.
    - `webglcontextrestored` is ignored.

### Lifecycle and cleanup ownership

| Resource | Created in / by | Owner field | Stopped/paused | Released in `teardown()` |
|---|---|---|---|---|
| Run token, graphics generation, destroyed flag | `beforeCreate` | `_so.run`, `_so.gfx`, `_so.destroyed` | `gfx++` on context loss and on `restartInPlace()` | **first**: `destroyed = true; run++; gfx++` |
| Learning phase timers (opening approach, retry unlock, correct → transition, transition → arrival) | `phaseTimer(expectPhase, ms, fn)` (guard: run + question token + expected phase + not navigated/destroyed) | `_so.phaseTimers: Set` | `pauseTimers()` on `paused`/`lost` freezes `remaining`; `resumeTimers()` after the resume target phase is restored (§4); never re-stamped, since `run` changes only in teardown | `clearTimeout` each, clear the set |
| Transition snapshot | `beginTransition()` / Start / `enterEncounter()` | `_so.transition` (plain data) | kept through `paused`/`lost`; read by the rebuild | cleared by `arriveRound`; nulled in teardown |
| Player pose and autopilot (rev 3) | `beforeCreate` (`_so.player = {x, z, yaw, pitch}` at the start), `walkTo()` / **קדימה** (`_so.autopilot = {path, index}` or null) | `_so.player`, `_so.autopilot`, `_so.moveInput` (plain data) | integrated only by the RAF loop; frozen with it in `paused`/`lost` | nulled (no resources) |
| Cosmetic timeouts (lock-on settle, fullscreen re-measure, resize debounce, hitmarker clear, reload finish, foam-puff spawn, chip-collapse hysteresis, effect steps; rev 3: place-toast hide, boundary-toast throttle, go-button idle hint) | `ownTimeout(fn, ms)` (checks run, gfx, destroyed and navigated; self-removes) | `_so.timers: Set` | reload/lock-on use phase-guarded callbacks; **all cleared on context loss** | `timers.forEach(clearTimeout); timers.clear()` |
| RAF main loop | `startLoop()` in `mounted` / resume / restart | `_so.frame` | `stopLoop()` on pause, hidden and `lost` | `cancelAnimationFrame(_so.frame)` |
| Window/document listeners: `keydown`, `keyup`, `blur` (clear held keys), `mousemove` (locked mode), `mouseup`, `pointerlockchange`, `pointerlockerror`, `visibilitychange`, `fullscreenchange`, `webkitfullscreenchange` | `listen(target, type, fn, opts)` | `_so.listeners: Array<[t,type,fn,opts]>` | — | `removeEventListener` for each, then clear |
| Canvas/root listeners: `pointerdown/move/up/cancel` (look, joystick, fire), `contextmenu`, `webglcontextlost/restored`, `mousedown` | `listen(...)`; re-registered on the new canvas by `restartInPlace()` after removing the old canvas's entries | same registry | — | same |
| `matchMedia` reduced-motion change | `listen(mql, 'change', …)` (falls back to `addListener`) | same registry | — | same (`removeListener` fallback) |
| `ResizeObserver` | `mounted` | `_so.resizeObserver` | — | `disconnect()` |
| Pointer lock | Start / Resume / restart gesture | — | Esc / loss → `paused` | `if (document.pointerLockElement === canvas) document.exitPointerLock()` |
| Fullscreen | touch Start (only if the game requested it) | `_so.enteredFullscreen` | — | exit only if `enteredFullscreen` and `fullscreenElement === root` |
| `AudioContext` and synth nodes | lazily on the Start gesture | `_so.audio` | `suspend()` in `paused` and `lost`; `resume()` on Resume/restart/DOM continuation | `close().catch(()=>{})`; null it. Nodes are one-shot and auto-stop. |
| Shared `successSound` / `failureSound`, `speechSynthesis` | global (tester.js) | **not owned** | — | not touched |
| GLTF and texture loads (promises) | `loadAssets()`, only after the §2 startup guard; again in `restartInPlace()` | `_so.loading` (stamped with `run` and `gfx`) | context loss bumps `gfx`, so in-flight loads become stale | not cancellable: callbacks check `gfx`, `run` and `navigated`; stale results (scenes, geometries, materials, textures) are disposed immediately |
| Three renderer and canvas | `initScene()`, only after the §2 startup guard; again in `restartInPlace()` | `_so.renderer` | — | `renderer.dispose(); renderer.forceContextLoss(); canvas.remove()` (prevents WebGL context exhaustion across replays) |
| Minimap canvas 2D context and the compound layer (rev 3) | `initHud()` / `buildMap()` (re-drawn on theme change) | `_so.minimap`, `_so.map.disposables` | not drawn while paused | release references; the offscreen canvas is dropped with the map |
| Shared GPU resources (templates, clips, shared materials and textures, backdrop) | `loadAssets()` / `initScene()` | `_so.shared: Set` | — | `dispose()` each, then clear (teardown or `lost` only) |
| Map GPU resources (rev 3: ground, every place's merged structure/detail chunks, gates, chevrons, tape lines) | `buildMap()` → `strikeOpsMergeStatic()` | `_so.map.disposables: Set` | visibility toggles only; never retired during play | `releaseMap()` (also on `lost`) |
| Per-round GPU resources (all per-enemy material clones, rebound skeletons, mixers) | `spawnSquad()` / `spawnBoss()` | `round.disposables: Set` | `retireRound(round)` at transition start (the knocked-down enemy at its fade end) | `retireRound` for every remaining round |
| Scenes/arrays referencing THREE objects | — | `_so.scene`, `_so.map`, `_so.rounds`, `_so.enemies` | — | null out after disposal |
| DOM nameplate/chip refs | Vue template | refs | — | Vue-owned |

---

## 11. File and integration plan

**Status of integration.** The revision-1 slice already applied (uncommitted)
every integration hunk below: the `index.html` link and script, the
`service-worker.js` `CORE_ASSETS` entries, `STRIKE_OPS_ASSETS` and
`CACHE_NAME` `my-app-cache-v228-strike-ops`, the two `tester.js` hunks, the
`0_4_8` `apps.js` entry, the `ch51` `groups.js` push with its `0_48` link,
and the `tests/shared_group_test.js` identity lookup. Revision 2 keeps them
and changes only what is marked **(rev 2)**. The revision-2.1 slice then
copied the sourced assets, replaced `STRIKE_OPS_ASSETS`, bumped
`CACHE_NAME` to the v229 outdoor name and updated the credits (§15).
**Revision 3 changes only `games/strike-ops.js`, `games/strike-ops.css`,
`tests/strike_ops_test.js`, `tests/strike_ops_browser.cjs` and the
`service-worker.js` `CACHE_NAME`** (one more bump, e.g. `…-v230-…`, for
the JS/CSS change); no new asset, no `index.html`, `tester.js`, menu or
group change (unless the optional world split below is made). Menu
placement (§11.3) is unchanged.

### 11.1 Add

- `games/strike-ops.js` (exists; rewritten per §16): an IIFE over
  `window || globalThis` exporting:
  - `STRIKE_OPS_CONFIG`, `validateStrikeOpsConfig`, `resolveStrikeOpsTheme`;
  - **(rev 2)** `strikeOpsSquadAt` (replaces `strikeOpsExposureAt`),
    `strikeOpsBossAt`, `strikeOpsRoundKind(roundInZone, cfg, forced)`,
    `strikeOpsLaneOrderOk(zone, cfg)` (the lane-order invariant, reused by
    validation and tests), `strikeOpsLayoutPlates(plates, safeRect, cfg)`
    (pure, order-preserving clamp + de-overlap with the one-tier, two-tier
    and marker steps; returns positions, `tiers` and a `collapsed` flag);
  - **(rev 2.1)** `strikeOpsNextRound(counters, cfg)` (counter advance, §2),
    `strikeOpsPoseAt(enemy, tMs, cfg, reducedMotion)` (the one pose source,
    §5), `strikeOpsHipFov(width, height, cfg)` (§5 `framing`; returns
    `{vfov, hHalf, adsVfov}`), `strikeOpsBidiRuns(text, baseDir)` (§8),
    `strikeOpsMergeStatic(group, THREE)` (§6.2; manual de-index), and the
    constant `STRIKE_OPS_MAX_LANES = 4`;
  - kept: `strikeOpsSegmentBlocked` (LOS vs AABBs),
    `strikeOpsPickMagnetTarget`, `strikeOpsContrast`,
    `strikeOpsCloneSkinned`;
  - **(rev 3)** `strikeOpsResolveMove(pos, delta, colliders, clampRect,
    radius, maxStepM)` (*extended*: AABBs **and** circles, sub-stepped,
    sliding, then the clamp — the fight box in encounter phases,
    `playBounds` otherwise; *was* circle-vs-AABB plus the pad clamp);
    `strikeOpsArenaToMap(zone, x, z)` (§5); `strikeOpsMapState(k, phase,
    cfg)` (gates, blockers, target, armed trigger from the committed map
    index; §5.1);
    `strikeOpsCollidersFor(state, cfg)` and `strikeOpsColliderGrid(cfg)`
    (static grid + dynamic list); `strikeOpsCurrentPlace(x, z, cfg)`;
    `strikeOpsRoute(from, target, state, cfg)` (rev 3.1: graph routing
    with entry/exit connectors, a deterministic grid fallback and an
    explicit `no-route` result, §5.1 "Routing"; used by the minimap line,
    the chevrons and the autopilot); `strikeOpsAutopilotStep
    (state, dtMs, cfg, colliders)` (pure, one fixed step of the walk along
    a route; the component and unit test 14 share it); and
    `strikeOpsLaneOrderOk(zone, cfg, minGapDeg, region)` gains the
    `'core' | 'fightBox'` sample region;
  - `createStrikeOpsComponent(BaseGameComponent)`.

  The factory throws if config validation fails (like knowledge-defense) and
  returns `Vue.component('strike-ops', Vue.extend({extends: BaseGameComponent,
  …}))`. The pure helpers must not need a DOM. `strikeOpsCloneSkinned` needs
  only `THREE` core. The file is already ≈ 4 350 lines (≈ 280 KB): the map
  config, the map helpers above and the map/zone/prop builders **may** move
  to `games/strike-ops-world.js` (loaded before `games/strike-ops.js`,
  added to `index.html`, `CORE_ASSETS` and both test harnesses, with a
  `CACHE_NAME` bump); this is an allowed, not required, split, recommended
  once the file passes ≈ 5 000 lines.
- `games/strike-ops.css` (exists; rev 3 adds `.so-objective`, `.so-toast`,
  `.so-go`, `.so-objective-line`, `.so-mapview` and the 4-star counter):
  every selector is under `.so-game`; CSS variables come from the adapter;
  the §6.6 grid layout;
  `@media (orientation: portrait)`, `(max-height: 500px)` and
  `(prefers-reduced-motion: reduce)` rules.
- **(rev 2.1)** copy the staged sourced files into
  `assets/strike-ops/characters/` (2 GLBs) and `assets/strike-ops/env/`
  (22 GLBs, 6 PNGs, 3 Kenney `License.txt`), keeping each kit's
  `Textures/` subfolder, and rewrite `assets/strike-ops/CREDITS.md` (§6.4
  lists every path, size and modification). **Delete** the obsolete
  revision-1 indoor files: the whole `assets/strike-ops/models/` folder
  (five Factory Kit `kenney-*.glb` and `Textures/colormap.png`) and
  `assets/strike-ops/LICENSE-Kenney.txt` (untracked slice files, no other
  user). The staged `quaternius/crate.glb` and `weapon/assault-rifle.glb`
  are **not** copied (the game uses the embedded `SHOOTER_MODEL_DATA`
  copies).
- `tests/strike_ops_test.js` (exists; updated per §12.2).
- `tests/strike_ops_browser.cjs` (exists; updated per §12.3).

### 11.2 Modify

The working tree already has **unrelated uncommitted edits** in `tester.js`
(router `beforeEach` → `guardRoute` LearnBox wait), `service-worker.js`,
`learnbox-bridge.js` and `tests/learnbox_bridge_test.js`. There are also
untracked `assets/scribble/` and `assets/word-quest/` folders. Edit with
targeted hunks only. Never `git checkout`, `restore` or `stash` these files,
and do not stage the unrelated files.

- `index.html` (already done by the slice):
  - `<link rel="stylesheet" href="./games/strike-ops.css">` after the
    `crystal-arena.css` link;
  - `<script src="./games/strike-ops.js"></script>` after
    `./games/crystal-arena.js` and **before** `./tester.js`;
  - **(rev 2)** no change unless `tester.js` itself changes (then bump
    `./tester.js?v=` in lockstep with the service-worker entry) or the
    optional `strike-ops-world.js` split is made.
- `service-worker.js`:
  - **(rev 2)** bump `CACHE_NAME` from whatever is current then (now
    `my-app-cache-v228-strike-ops`) to the next version, e.g.
    `my-app-cache-v229-strike-ops-outdoor`, because `games/strike-ops.js`
    and `.css` change (done by the 2.1 slice); **(rev 3)** bump it once
    more from whatever is current (e.g. to `…-v230-strike-ops-map`) in the
    same change as the free-roam code;
  - `'/games/strike-ops.js'` and `'/games/strike-ops.css'` stay in
    `CORE_ASSETS`, spelled exactly as `index.html` requests them
    (`service_worker_test.js` checks exact URLs);
  - **(rev 2)** replace the `STRIKE_OPS_ASSETS` contents (the array stays,
    concatenated into `urlsToCache` the same way as
    `KNOWLEDGE_DEFENSE_ART`):

    ```js
    const STRIKE_OPS_ASSETS = [
      '/assets/strike-ops/characters/enemy-hazmat.glb',
      '/assets/strike-ops/characters/enemy-hazmat-lod.glb',
      '/assets/strike-ops/env/kenney-industrial/water-tower.glb',
      '/assets/strike-ops/env/kenney-industrial/shipping-container-a.glb',
      '/assets/strike-ops/env/kenney-industrial/shipping-container-b.glb',
      '/assets/strike-ops/env/kenney-industrial/shipping-container-c.glb',
      '/assets/strike-ops/env/kenney-industrial/Textures/colormap.png',
      '/assets/strike-ops/env/kenney-survival/barrel.glb',
      '/assets/strike-ops/env/kenney-survival/rock-a.glb',
      '/assets/strike-ops/env/kenney-survival/rock-b.glb',
      '/assets/strike-ops/env/kenney-survival/tree.glb',
      '/assets/strike-ops/env/kenney-survival/tree-tall.glb',
      '/assets/strike-ops/env/kenney-survival/grass-large.glb',
      '/assets/strike-ops/env/kenney-survival/Textures/colormap.png',
      '/assets/strike-ops/env/kenney-fantasy/wall-wood.glb',
      '/assets/strike-ops/env/kenney-fantasy/wall-wood-detail-cross.glb',
      '/assets/strike-ops/env/kenney-fantasy/wall-wood-doorway-square-wide.glb',
      '/assets/strike-ops/env/kenney-fantasy/roof-flat.glb',
      '/assets/strike-ops/env/kenney-fantasy/roof.glb',
      '/assets/strike-ops/env/kenney-fantasy/planks.glb',
      '/assets/strike-ops/env/kenney-fantasy/wall-block-half.glb',
      '/assets/strike-ops/env/kenney-fantasy/fence.glb',
      '/assets/strike-ops/env/kenney-fantasy/tree.glb',
      '/assets/strike-ops/env/kenney-fantasy/tree-high-round.glb',
      '/assets/strike-ops/env/kenney-fantasy/hedge-large.glb',
      '/assets/strike-ops/env/kenney-fantasy/Textures/colormap.png',
      '/assets/strike-ops/env/kenney-fantasy/Textures/colormap-shed.png',
      '/assets/strike-ops/env/kaykit-barricade.glb',
      '/assets/strike-ops/env/ground/ground-grass.png',
      '/assets/strike-ops/env/ground/ground-dirt.png',
    ];
    ```

    (30 URLs; both enemy files are precached because the tier decides
    which one loads.) The game builds its load list from
    `STRIKE_OPS_CONFIG` (`enemyModel`, `kitPieces`, `textures`), and unit
    test 10 asserts that set equals this array exactly.
    `tests/offline_assets_test.js` verifies the files exist.
    `RobotExpressive.glb` and every `assets/strike-ops/models/` path leave
    the list.
- `tester.js` (already done by the slice; two additive hunks only):
  1. after the `CrystalArenaComponent` factory block:
     `var StrikeOpsComponent = null; if (typeof createStrikeOpsComponent ===
     'function') { StrikeOpsComponent = createStrikeOpsComponent(BaseGameComponent); }`;
  2. after the `crystal_arena` `routes.push` block, before the Adventure
     routes: `if (StrikeOpsComponent) { routes.push({path:
     '/play/strike_ops/:currentAppId', component: StrikeOpsComponent, props:
     true}); }`.

  **(rev 2)** no `tester.js` change. The `BalloonShooterComponent` region
  (~1787–3289) and its route stay untouched.
- `apps.js` and `groups.js`: append only (§11.3). **(rev 2.1, manager
  decision)** the existing entries' `name` (`כוח פריצה`) and `title`
  strings stay unchanged; revision 2's optional title update is withdrawn.
- `ASSET_LICENSES.md`: **(rev 2.1)** replace the Strike Ops section's
  Kenney Factory Kit and RobotExpressive lines with the sourced set (§6.4
  credits: Quaternius *Character Hazmat*; Kenney City Kit Industrial,
  Survival Kit and Fantasy Town Kit 2.0; KayKit Medieval Hexagon Pack
  barricade; in-house ground textures and the derived shed palette), all
  CC0, and keep Quaternius Ultimate Guns for the view model and crate.
- Optional docs: the `strike_ops` row in the appType table in
  `GAME_ARCHITECTURE.md` §9 — **(rev 2)** update its description to the
  outdoor squad/boss design.
- `worlds.js`: **not modified** (Adventure is out of scope).
- `tests/shared_group_test.js`, **slice** (already done by the slice),
  required by the `0_48` append (§11.3). This is the only edit to an existing test in the slice:
  - locate the reverse (`ch51h`) submenu **by identity**, not as
    `items[items.length - 1]`:
    `node.items.find(i => i.type === 'menu' && i.name === 'עברית לאנגלית')`,
    searched only inside the `5_1 (התקדמות משותפת)` menu, as today;
  - replace the "last entry is the submenu" condition
    (`readingLinks[readingLinks.length - 1] === undefined`) with "exactly one
    non-link entry, and it is that submenu"
    (`readingLinks.filter(l => l === undefined).length === 1`);
  - keep every other assertion, including "reading links equal
    `getSharedGroupMenuItems('ch51')` exactly";
  - "the same games are offered in both halves, in the same order" compares
    the reading half against `ch51s`, which does not get Strike Ops in the
    slice. The check now excludes an explicit `READING_ONLY_TYPES =
    ['strike_ops']` list (drop the entry when `ch51s` gains the game). This
    second edit was not foreseen above; it is required by the `ch51`-only
    append (§15).
- Test-count updates are required **only** if the full-scope group appends land
  (§11.3): `tests/shared_group_test.js` (`otiot lists 12 games` → 13) and
  `tests/grade6_1_1_shared_group_test.js` (`14` → `15`, plus an index-14
  assertion).

### 11.3 Menu placement (append-only)

Ids were computed by loading `apps.js` in a VM. Every placement **appends at the
end** of an existing `items` / `games` array, written as a literal last line
(matching how `hexkeep` and `momentum_factory` links were added). No existing
entry is edited or moved.

**Own-key entries in `apps.js`** (storage namespace = new positional id). Each
uses the template below with that menu's list fields copied from its
`balloon_shooter` sibling:
`{icon: 'gps_fixed', name: 'כוח פריצה', type: 'app', appType: 'strike_ops',
listName, questionIndex, resultIndex, setItems, title: <the same title string as the slice's 0_4_8 entry>}`
(rev 2.1: menu strings stay exactly as the slice wrote them, so full-scope
entries copy the existing `0_4_8` title; see §11.2)

| Menu path | Menu | Current length | New id | listName / q → r / setItems | Scope |
|---|---|---|---|---|---|
| `0_4` | אנגלית › מילות שאלה | 8 | **`0_4_8`** | `QUESTION` / `english_name` → `question_word_hebrew` / 3 | **slice** |
| `0_33_0` | אנגלית › משחק חדש - Chapter 4 › אנגלית לעברית | 6 | `0_33_0_6` | `ENGLISH_NEW_CHAPTER4_ALL` / `english_name` → `hebrew` / 10 | full |
| `0_33_1` | … › עברית לאנגלית | 6 | `0_33_1_6` | `ENGLISH_NEW_CHAPTER4_ALL` / `hebrew` → `english` / 10 | full |
| `0_34_0` | אנגלית › פרק 5 › אנגלית לעברית | 2 | `0_34_0_2` | `ENGLISH_CHAPTER5_ALL` / `english_name` → `hebrew` / 10 | full |
| `0_34_1` | … › עברית לאנגלית | 2 | `0_34_1_2` | `ENGLISH_CHAPTER5_ALL` / `hebrew` → `english` / 10 | full |
| `0_45` | אנגלית › מילות מפתח בפייתון | 9 | `0_45_9` | `PYTHON_KEYWORDS` / `keyword` → `hebrew` / 3 | full |
| `1` | חשבון (root) | 11 | `1_11` | `ADDITION` / `question` → `answer` / 10, name `כוח פריצה - חיבור` | full |
| `0` | אנגלית (root; holds `מטווח בלונים - חיות`) | 52 | ~~`0_52`~~ | **excluded** | — |

The `אנגלית` root is excluded because `tests/grade6_1_1_shared_group_test.js`
and `tests/grade6_moe_test.js` locate the `6` / `old` / `5_1 שמיעה` submenus
by position from the end (`length-1`, `-2`, `-3`). Appending there would break
those tests and the documented "group menu stays last" convention.

**Shared-group entries** (storage normalizes to `grp-<group>`, so the game joins
the group's existing shared knowledge). Each needs a `groups.js` push **and**
a matching `apps.js` link `{icon: 'gps_fixed', name: 'כוח פריצה', type: 'app',
link: '/play/strike_ops/<id>'}`.

| Group (`groups.js`) | Current games | New game id(s) | `apps.js` link menu → new index | Scope |
|---|---|---|---|---|
| `ch51` | 8 | **`grp-ch51-8`** | `0_48` (5_1 התקדמות משותפת) → index 9, appended after the `עברית לאנגלית` (ch51h) submenu, which **keeps its id `0_48_8`**; `shared_group_test.js` then finds the submenu by identity (§11.2) | **slice** |
| `ch51s` | 8 | `grp-ch51s-8` | `0_49` → index 8 | full |
| `otiot` | 12 | `grp-otiot-12` | `3_7` (עברית › אותיות) → index 12 | full |
| `g611` (array shared by `g611h`) | 14 | `grp-g611-14` **and** `grp-g611h-14` | `0_51_0_1` → 14 and `0_51_0_0` → 14 | full |
| `GRADE6_MOE_GAMES` (one array shared by the 10 groups `g6p{1..5}{e,h}`) | 7 | `grp-g6p{1..5}{e,h}-7` | `0_50_{0..4}_{0,1}` → index 7 each (10 links) | full |

`groups.js` code, appended after the existing momentum push, using the existing
idiom:

```js
// Strike Ops is appended; existing positional IDs and shared knowledge stay stable.
const STRIKE_OPS_GROUP_GAME = {appType: 'strike_ops', icon: 'gps_fixed', name: 'כוח פריצה', title: 'פרצו לחדרים ופגעו ברובוט עם התשובה הנכונה'};
['ch51'].forEach(groupId => SHARED_GROUPS[groupId].games.push(STRIKE_OPS_GROUP_GAME));   // slice
// full scope: ['ch51', 'ch51s', 'otiot', 'g611'] … plus GRADE6_MOE_GAMES.push(STRIKE_OPS_GROUP_GAME) after its declaration
```

**groups.js risks**, and why the slice registers only `ch51`:

1. Ids are `grp-<group>-<index>`, so the only safe edit is appending to the
   end. Any insertion orphans saved progress.
2. `g611h.games === g611.games` and all 10 `g6p*` groups share
   `GRADE6_MOE_GAMES`. Push **once** per array. Pushing to `g611h` as well
   would add the game twice. One `GRADE6_MOE_GAMES` push adds the game to 10
   groups and requires 10 `apps.js` links that must equal
   `getSharedGroupMenuItems()` exactly (`grade6_moe_test.js`).
3. Hard-coded counts in tests (`otiot` = 12, `g611` = 14 plus position checks)
   must be updated in the same change.
4. In `0_48`, `tests/shared_group_test.js` (~133–149) currently asserts that
   the `ch51h` reverse submenu is the **last** item
   (`items[items.length - 1]`, and `readingLinks` ending in `undefined`).
   That conflicts with append-only:
   - appending the link breaks the test;
   - inserting the link before the submenu would renumber the submenu
     `0_48_8 → 0_48_9`, which is a forbidden id change.

   Resolution: append the link at index 9 (no existing id changes) and update
   the test to find the submenu by identity, as specified in §11.2. The
   semantic checks are unchanged: reading links still equal the `ch51` group
   order exactly, and the reverse submenu still equals `ch51h`. The visual
   order in that menu becomes "8 games → reverse submenu → כוח פריצה", which
   is cosmetic.
5. A new game in a group immediately sees children's existing shared
   progress. This is intended.
6. Speech-only groups (`ch51s`, `otiot`) depend on the replay control. Verify
   it before adding them.

**Safe subset (vertical slice):** `apps.js` `0_4` → `0_4_8`, plus `groups.js`
`ch51` → `grp-ch51-8` with the `0_48` link. Together they exercise an own-key
id and a shared-group id. They need no count edits; the one required test edit
is the identity lookup above. Everything else is full scope (§14).

---

## 12. Test and QA plan

### 12.1 Debug API (automated-test contract)

The API lives on the component, reachable as
`document.querySelector('.so-game').__vue__`, consistent with hexkeep
(`.hk-game`). No `window.__strikeOpsDebug` global is created, so nothing leaks
and there is nothing to clean up. Every method below is an ordinary component
method that runs the **same code paths** as player input. None of them sets
`attemptLocked`, `phase`, `score` or weights directly, and every learning
effect still goes through `answer(i)`. Only `getEnemies()` and
`debugSnapshot()` may read `question.result` (to report `isCorrect` /
`isReal`); no gameplay path calls them.

Stable DOM hooks:

- root `<main class="so-game">` with `data-phase="<phase>"`,
  `data-render="gl|dom"`, `data-round-kind="squad|boss"`, `dir="rtl"`, plus
  classes `so-phase-<phase>`, `so-theme-<key>`, `so-reduced`, `so-touch`,
  `so-dom`, `so-boss-round`, and (rev 3) `data-place="<zone id>"` (the
  current place) and `so-roaming`;
- `.so-canvas-host`, `.so-question`, `.so-replay`;
- `.so-counter`, `.so-stars`, `.so-minimap`;
- `.so-answers` with `.so-answer[data-index]` (DOM order = index order =
  left-to-right in the fight box); `.so-plate[data-index]`; each chip's and
  plate's badge `.so-marker[data-badge="<n>"][data-shape="<shape>"]`;
- (rev 3) `.so-objective`, `.so-objective-line`, `.so-toast`, `.so-go`,
  `.so-mapview`;
- `.so-start`, `.so-resume`, `.so-exit`, `.so-pause`;
- `.so-fire`, `.so-ads`, `.so-reload`, `.so-stick`, `.so-weapon`;
- `.so-hitmarker`, `.so-ammo`, `.so-progress`, `.so-live`;
- `.so-lost-restart`, `.so-lost-dom`, `.so-lost-back` (context-loss panel).

Reactive data (read):

- `phase` (§4), `renderMode` (`'gl'|'dom'`), `resumePhase`;
- `question` (the `generateFromList` object; `question.result` is the correct
  rendered option);
- `options` (enemy i ↔ `options[i]` ↔ badge i + 1 ↔ the i-th enemy from
  the left in the fight box);
- `score`, `questionIndex`, `questionToken`, `attemptLocked`, `wrongOption`;
- `roundKind` (`'squad'|'boss'`), `roundNumber` (visual, 1-based),
  `roundInZone` (0-based), `zoneNumber` (visual, 1-based), `zoneIndex`,
  `zoneId`, `stars`, `lap` (rev 3, 1-based) (all describe the round being
  presented; they advance only in `beginTransition`, §2);
- (rev 3) `placeId` (the current place, from the player's position;
  presentation only), `autopilot` (boolean), `objectiveText`;
- `ammo`, `reserve`, `quality` (0–2), `reducedMotion`;
- `aimMode` (`'locked'|'cursor'|'touch'`).

Methods:

| Signature | Contract |
|---|---|
| `answer(i: number, token?: number): boolean` | The single learning transaction (§2). It returns `true` only when it accepts the attempt. It is legal only in `engaging` (either render mode) with the lock open. If `token` is given and differs from `questionToken`, it returns `false` with **no** side effect (no sound, weight, score, save, phase or lock change). Every real input path passes the token it captured when the player acted (shot fired, lock-on armed, chip pressed); tests may call it without a token exactly as hexkeep tests do, or with a captured token to exercise the stale-event boundary. |
| `getEnemies(): Array<{id, index, lane, answer, isCorrect, isDecoy, isReal, kind, state, hittable, exposureMs, screenX, screenY, visible, pose: {x, z, yaw, stance}, scale, clip: {role, name, time}, materials: Array<{slot, id, tint, opacity, emissive, transparent}>, plate: {x, y, collapsed, tier, lines, pinned}, badge: {number, shape, tint}, distanceM, bearingDeg}>` | Plain JSON, sorted by `index` (= badge order = left-to-right inside the fight box). **Rev 3:** `pose` is in **map** coordinates; `badge` is `{number: index + 1, shape: SHAPES[index], tint: squadTints[index]}`; `distanceM` and `bearingDeg` (relative to the view, negative = left) are measured from the player's eye; `plate.pinned` is `'left'\|'right'\|null`. `id` is stable for the round (`'r<round>-e<index>'`). `answer` is the option as plain text. `kind` is `'soldier'` or `'copy'`. `isCorrect` = `options[index] === question.result`; for copies `isReal === isCorrect` and `isDecoy === !isCorrect`; for soldiers `isDecoy === false` and `isReal === true`. `state` is one of `hidden`, `peek-out`, `exposed`, `peek-in`, `dash`, `hit`, `down`, `cheer`, `split`, `dissolved`. `pose`, `screenX/screenY` (torso centre in root-relative CSS px) and the hitbox all come from the one pose source (§5); `visible` is "inside the viewport and not hidden by cover". **Rev 2.1 presentation fields:** `scale` (root world scale), `clip` (current role, clip name and normalised time), and `materials` — one entry per **cloned** material (`slot` = source material name such as `Team`/`Trim`, `id` = the clone's uuid, `tint`/`emissive` as hex, `opacity`, `transparent`). Material ids are per enemy and must all differ between enemies (proves per-enemy cloning); every other field is what browser check 8 compares between boss copies. |
| `forceExpose(i: number): boolean` | Shifts only enemy i's scheduler offset so it is `exposed` from now (no slide). Boss copies are already exposed (returns `true` if not dissolved). Returns `false` outside `engaging`/`wrong` or for an invalid i. Presentation timing only. |
| `shootEnemy(id: string \| number): {fired: boolean, hitIndex: number\|null, blocked: boolean, accepted: boolean, reason?: string}` | Accepts an `id` from `getEnemies()` or an index. Aims at the enemy's torso centre (locked/touch: set yaw and pitch from the current eye; cursor: set the cursor to its projected point), then calls **`fire()`**: cooldown, ammo/auto-reload, recoil, raycast against cover and hitboxes, magnetism, hitmarker, then `answer()`. A hidden or dissolved enemy returns `blocked: true` and makes no learning call. During a reload returns `fired: false, reason: 'reload'`. `accepted` is `answer()`'s return value. (Replaces `shootRobot`.) |
| `lockOn(i: number): boolean` | The real keyboard and chip path (§8); not debug-only. Captures `questionToken` when armed and passes it through `fire({token})` to `answer(i, token)`. |
| `forceBossRound(): boolean` | Arms the **next** round to be a boss round (consumed by the next `create()`), or, if called in `briefing`, in `roaming` (rev 3: the held question of the next place's first round) or in `engaging` before any attempt on the current question, re-embodies the **current** question as a boss round (same question, options, token and lock state; only presentation changes). Never generates a question or touches learning state. |
| `skipTransition(): boolean` | Only in `deploying`/`regroup`/`roaming`/`advancing` (not while paused or lost). Timed phases (and DOM `roaming`): sets that phase timer's `remaining` to 0 and reschedules it, so the same guarded callback runs (`arriveRound` → `engaging`, then `action()`; DOM `roaming` → `enterEncounter()`). **GL `roaming` (rev 3):** teleports the player to the target place's anchor facing its heading and runs the trigger check synchronously, which calls `enterEncounter()` (→ `deploying`). Works with RAF stopped and in the DOM render mode. (Replaces `skipBreach`.) |
| `skipToZone(n: number): boolean` | Presentation only (counters and the derived map state; never learning state). `n` is a 1-based place number. In `engaging`: arms — the current place's next round becomes its boss round (`roundInZone = bossRoundIndex − 1` semantics as built) and the following clear targets place `n`. In `regroup`: converts the transition to `roaming` toward place `n` (or `advancing` when `n = 1`, the lap wrap) with the same remaining-time rule. In `roaming`: retargets to place `n` (gates and blockers re-derive: every place before `n` counts as cleared in this lap; stars unchanged). The player does not move; use `teleport`. |
| `teleport(target: string \| {x, z, headingDeg?}): {ok: boolean, x, z, placeId, triggered: boolean, reason?: 'phase'\|'locked'\|'blocked'\|'encounter'}` | **Rev 3, presentation only.** A place id puts the player at that place's anchor facing its heading; `'start'` at the map start; `{x, z}` at that map point (`headingDeg` optional). Legal in `roaming` for the target place, cleared places and the start, or any free point inside their regions (`reason: 'locked'` otherwise — a test cannot skip a closed gate's place); in encounter phases only to points inside the current fight box (`'encounter'`); refused in `loading`/`briefing`/`advancing`/`paused`/`lost` (`'phase'`). **Placement contract (rev 3.1):** the destination must be **capsule-clear** (centre ≥ `movement.radius` + 0.01 m from every collider active in the committed map state) and inside the legal area (the allowed regions ∩ `playBounds`; in encounter phases the fight box). A blocked destination snaps deterministically: candidates on rings of radius 0.05, 0.10, … 1.00 m, 32 per ring starting at compass 0° (north) and going clockwise; the first capsule-clear candidate inside the same legal area wins (smaller ring first, then angle order), else `'blocked'` and nothing changes. On success it sets the pose (`headingDeg` or the place's heading for a place id; pitch 0), zeroes velocity, cancels the autopilot, lock-on, ADS and the centre-view assist, clears the virtual input of `setMoveInput` (physically held keys and touches are untouched), then runs the trigger check **once** synchronously (`triggered: true` when it called `enterEncounter()`; a second call or a second trigger check in the same step is a no-op because `enterEncounter` requires `roaming`). Never touches counters, gates, timers, `questionToken`, `attemptLocked` or learning state. |
| `getPlayer(): {x, z, yawDeg, headingDeg, pitchDeg, placeId, inFightBox: boolean, clamp: 'fightBox'\|'bounds', speed, sprinting: boolean, autopilot: boolean, moveInput: {x, z, turn}\|null}` | **Rev 3.** Map-frame pose (plain JSON). `headingDeg` is the compass heading (0 north, clockwise), `yawDeg` the internal yaw. |
| `getMap(): {bounds, lap, targetZoneIndex, places: Array<{id, name, region, fightBox, anchor, headingDeg, cleared, current, target}>, gates: Array<{id, from, to, open: boolean, open01}>, blockers: Array<{placeId, rect, active}>, trigger: {placeId, rect, armed}\|null, objective: {placeId, x, z, distanceM, onScreen: boolean, screen: {x, y}\|null, edge: 'left'\|'right'\|'top'\|'bottom'\|null}\|null, route: Array<{x, z}>, chunks: {detail: string[], structureInFrustum: string[]}}` | **Rev 3.** Everything in map coordinates (rects as `{minX, maxX, minZ, maxZ}`); `screen` is root-relative CSS px of the objective marker (clamped position when `edge` is set); `route` is the remaining route polyline from `strikeOpsRoute`. Read-only, cheap (no layout reads). |
| `walkTo(target: string \| {x, z} \| null, opts?: {sprint?: boolean}): boolean` | **Rev 3.** Starts the autopilot (the same code as **קדימה**) along `strikeOpsRoute` (rev 3.1: graph with entry/exit connectors, grid fallback; `false` on `no-route`, §5.1). `null` stops it. Legal in `roaming` (reachable targets only; `false` for a locked place) and in encounter phases for points inside the current fight box. Movement uses the normal integration (speed, acceleration, collision, clamp, trigger), driven by the RAF loop, so under the fake clock `runFor(ms)` walks deterministically. Any player movement/look input cancels it. |
| `setMoveInput(v: {x: number, z: number, sprint?: boolean, turn?: number} \| null): boolean` | **Rev 3.** A persistent virtual joystick (`x` strafe right, `z` forward, each −1..1; `turn` −1..1 = holding ←/→) fed through the joystick path until `null`; cancels the autopilot. For boundary, collision and gate tests. |
| `setView(v: {headingDeg?: number, yawDeg?: number, pitchDeg?: number}): boolean` | **Rev 3.** Sets the look direction through the same path as a mouse look (cancels lock-on; ignored during the centre-view assist). |
| `getPhaseTimers(): Array<{expectPhase, remaining, token, pending: boolean}>` | A read-only view of `_so.phaseTimers`, for pause-freeze assertions. |
| `setQuality(tier: 0\|1\|2): number` | Applies the tier through the same `applyQuality()` as the FPS monitor, pins it (disabling the auto-downgrade) and returns the applied tier. |
| `getRenderStats(): {last: {calls, triangles, passes}, peak: {calls, triangles}, geometries, textures, quality, pixelRatio, mixersActive, enemiesVisible, enemyModel: {primitives, triangles, lod: boolean}, placeId, detailChunks: string[], mergedMeshes: {[chunk]: number}}` | Per-frame **sums over every pass** (shadow, scene, view-model overlay). Rev 3 adds the current place, the visible detail chunks and the merged-mesh count per chunk (for the "merging is active" assertion). Needs `renderer.info.autoReset = false` plus one `info.reset()` per frame (§6.2). `peak` is the maximum per-frame sum since the last `resetRenderPeak()`. |
| `resetRenderPeak(): void` | Clears `peak`. |
| `setRendering(on: boolean): void` | Skips only `renderer.render` (the simulation, schedulers, timers, nameplates and minimap keep running), to keep long fake-clock runs fast under SwiftShader. Default `true`. |
| `getLayout(): {banner, counter, answers, answerItems: Array<rect>, answersLayout: 'row'\|'stacked', controls: {stick, fire, ads, reload, pause, exit, go}, minimap, plates: Array<rect>, objective, toast, mapview, plateTextPx, answerTextPx, safeRect, canvas: {w, h}, fov: {vfov, hHalf, ads}}` | Root-relative rects (CSS px) of the HUD regions, for overlap assertions. **Rev 2.1** adds the counter pocket (`counter`, needed by check 15), each answer item's rect, the answer layout mode, the smallest computed font size of plate and answer text, the canvas size and the derived FOV (§5 `framing`); **rev 3** adds `controls.go`, the objective marker, the toast and the map overlay. Hidden elements report `null`. Read-only, uses `getBoundingClientRect` on demand (never in the RAF loop). |
| `getTransition(): object\|null` | A JSON copy of the transition snapshot (§4), for checks 13 and 20. |
| `probeShot(x: number, y: number): {hitIndex: number\|null, blocked: boolean}` | Read-only: casts the same ray and hit resolution as `fire()` through the root-relative point, against the current poses and cover, without firing, consuming ammo or calling `answer()`. For check 19. |
| `debugSnapshot(): object` | A JSON-safe combination of the reactive data, `getEnemies()`, `getPhaseTimers()`, `getTransition()`, `renderMode`, `_so.gfx`, the scheduler clock, `getRenderStats().last` and (rev 3) `getPlayer()`, `getMap()` and `camera` (`{x, y, z, yawDeg, pitchDeg, fov}` in map coordinates). |

**Stale-event testing boundary.** A stale event is tested where the guard
actually lives, not by calling internal timers: (1) `answer(i, staleToken)`
directly; (2) `lockOn(i)` armed on question N, then question N advanced to
N+1 through `skipTransition()` while the fake clock runs past the settle:
the lock must be cancelled, or, if its settle still fires, reach `answer`
with the stale token and be rejected. Both must leave attempt history,
weights, score and `attemptLocked` unchanged. The browser test drives
these through `page.evaluate` in the **same** contexts as the real input
(desktop or touch, §12.3 harness).

**Deterministic map tests (rev 3).** Movement is integrated only by the
RAF loop with a clamped `dt` (≤ 50 ms) and sub-steps of `maxStepM`, and
Playwright's installed clock drives `requestAnimationFrame` in 16 ms frames,
so `walkTo`/`setMoveInput` followed by `page.clock.runFor(ms)` reproduces
the same path on every run (`setRendering(false)` keeps the simulation and
skips only `renderer.render`). Tests place the player with `teleport()`
(synchronous, trigger checked at once) instead of walking whenever the
walk itself is not under test, assert positions with a 5 cm tolerance and
headings with 1°, and never depend on real time. The Node harness uses
the pure `strikeOpsResolveMove`, `strikeOpsAutopilotStep` and
`strikeOpsMapState` with a fixed 16 ms step.

### 12.2 Node tests: `tests/strike_ops_test.js`

These load `games/strike-ops.js` in a VM with a Vue stub (the
`knowledge_defense_test.js` pattern). The suites that need it also load
`vendor/three-0.128.0.min.js` into the VM (verified to work). Suites marked
*kept* exist in the slice and need only renames; the others are new.

1. **Config:** `validateStrikeOpsConfig()` returns `[]`. Every place
   satisfies (rev 3 sample regions): LOS from every **fight-box** sample to
   every peek, dash waypoint and boss point (± patrol); full occlusion at
   `hide` from every **core** sample; no cover in the fight box; **lane
   order** (`strikeOpsLaneOrderOk`) with the 4° gap from every fight-box
   sample and the 6° gap from every core sample; the `framing` angle and
   distance limits from the anchor and `fightMaxDistM` from the fight box;
   nameplate-anchor spacing; props and map structures outside sightlines
   and ≥ 0.45 m from enemy positions; ascending `laneSets`; timing bounds
   including the boss split and dissolve fits and the knockdown fade; the
   foot-slide `timeScale` bound for every authored move; `enemyModel.clips`
   has the required roles. Negative fixtures (a swapped lane, a prop on a
   sightline, a missing role, a lane at 35°, `splitMs: 1200`,
   `dissolveMs: 400` with `flickerMs: 300`, a dash too fast for `run`, and
   rev 3: a fight box widened to x −5..5 (lane-order gap < 4°), a structure
   on an approach point, a heading of 45°) each produce exactly the
   expected error. *Removed (rev 3):* the pad, yaw-clamp and `advancePath`
   assertions.
   **Framing math:** `strikeOpsHipFov` returns `vfov` = 110° and
   `hHalf` ≈ 33.4° (±0.1°) for 390×844 and 360×780, `vfov` = 40° and
   `hHalf` ≈ 38.2° for 844×390, `hHalf` = 36° for 1440×900 and 768×1024;
   for every place the farthest lane point from the anchor projects
   ≥ `minEnemyPx`, and from the far fight-box corner ≥ `minEnemyPxFar`, at
   every one of those sizes.
2. **Squad fairness:** for n = 1..4, over 10 periods each soldier's hittable
   time (`exposed` + `dash`) is equal (±1 frame); the longest continuous
   hidden span is ≤ `hiddenMs + 2·slideMs`; soldier 0's first peek happens by
   `firstPeekMs + slideMs`; every `relocateEvery`-th cycle contains exactly
   one `dash` of `dashMs` and the `spot` alternates; the schedule is
   deterministic. **Boss fairness:** `strikeOpsBossAt` gives every copy
   equal hittable time, the patrol stays within `±legM/2` of its lane point
   with constant speed on each leg (no near-zero-speed walking), and a
   `dissolved` copy is never hittable. **One pose source:** for normal and
   reduced motion, `strikeOpsPoseAt` gives identical `hittable` flags at
   every 16 ms sample over 10 periods; under reduced motion every hittable
   pose lies exactly on a spot point (squad) or lane point (boss), never
   between.
3. **Round kind and counters:** `strikeOpsRoundKind` returns `'boss'`
   exactly for `roundInZone === bossRoundIndex` and when forced; it takes
   no question, option or weight input (signature check).
   `strikeOpsNextRound` from `{roundNumber: 3, roundInZone: 2, …}` returns
   `regroup` with `roundInZone: 3`; from `roundInZone: 3` with
   `zoneIndex` 0, 1 or 2 returns **`roaming`** (rev 3) with `roundInZone:
   0`, `zoneIndex + 1` and `zoneNumber + 1`; from `roundInZone: 3` with
   `zoneIndex: 3` returns `advancing` (the lap wrap) with `zoneIndex: 0` and
   `lap + 1`. In the
   lifecycle harness, the question generated by the `create()` inside
   `beginTransition` after round 3 is classified `'boss'` (the counter
   advanced **before** `create()`), so rounds 4, 8, 12 … are boss rounds.
4. **Collision** (*extended*, rev 3): `strikeOpsResolveMove` slides along
   AABBs **and circles**, never ends inside any collider (10 000 seeded
   random moves around the real map colliders, speeds up to 4.2 m/s,
   `dt` up to 50 ms), never tunnels through a 0.3 m wall, slides along a
   wall at a 30° approach keeping ≥ 80% of the tangential speed, does not
   stick in a concave corner (two AABBs forming an L: a diagonal push
   ends still in contact but the opposite input frees it at once), and
   clamps to the given rect (the fight box) exactly at its edge.
5. **LOS and magnetism** (*kept*): `strikeOpsSegmentBlocked` is correct for
   crossing/grazing/clear segments. `strikeOpsPickMagnetTarget` returns the
   nearest *hittable, LOS-clear* candidate within the radius, `null` when
   only blocked/hidden/dissolved candidates are near, has an identical
   radius for every index, takes no correctness input, and returns **one**
   candidate when two copies overlap on screen.
6. **Nameplate layout:** `strikeOpsLayoutPlates` keeps input order for
   every random fixture (1 000 seeded cases: random anchors, widths,
   heights of 1–3 lines, safe rects, including anchors outside the screen);
   outputs never overlap in area (`minGapPx`), stay inside the safe rect,
   keep horizontal order equal to input order in one- and two-tier
   results, use two tiers only when one tier cannot fit, and set
   `collapsed` exactly when neither fits. Rev 3: the component sorts plates
   by anchor screen x (pinned plates at their edge, ties by index) before
   calling it; a fixture with enemies behind the camera (bearings ±150°)
   pins them to the side of their bearing and keeps every plate on its
   enemy's side of its neighbours. **Bidi runs (rev 3, the built
   override):** `strikeOpsBidiRuns('מה פירוש המילה: apple?', 'rtl')`
   returns `[{text: 'מה פירוש המילה: ', isolate: null}, {text: 'apple',
   isolate: 'ltr'}, {text: '?', isolate: null}]`; `'כמה זה 3+4?'`
   isolates `3+4` with the `?` outside; `'מה זה "run",'` isolates `run`
   with the quotes and comma outside; `'the big dog'` inside an RTL base is
   one isolate including its inner spaces; an all-Hebrew or all-English
   string returns one run; a string with HTML is returned unsplit.
7. **Theme adapter** (*kept*, extended): for every
   `Object.keys(themeOptions)` (loading `themes.js`): `key` round-trips, all
   css/scene fields are defined, plate-text contrast ≥ 4.5:1,
   correct-vs-plate ≥ 3:1, wrong is amber, each `squadTints[k]` ≥ 3:1
   against `ground` and pairwise ΔE ≥ 20, and `hologramTint` is the same for
   every copy. An unknown key falls back to `base`.
8. **Skeleton rebind** (*kept*): with a synthetic bone hierarchy plus a
   `SkinnedMesh`, the clone's `skeleton.bones` are all descendants of the
   clone root and none is a source bone; geometry is shared; `boneInverses`
   are equal but not the same objects; animating the clone's bone leaves the
   source untouched. **Enemy model config:** with a synthetic GLTF whose clip
   names differ from the defaults, the role map resolves each role, missing
   roles fall back as documented, and with `perEnemyMaterials: 'all'`
   **every** material is cloned per enemy (two enemies share no material
   object; fading enemy A's `Trim` leaves enemy B's opacity at 1);
   `retireRound` disposes all clones and never a template material. A
   theme change re-tints live clones' `Team`/`Trim` and keeps a dissolving
   copy's current opacity.
9. **Learning lifecycle** (*kept*, renamed; methods called on a harness
   `this` with stubbed `generateFromList`, `updateWeightForKey`,
   `reloadProgress`, `saveScore`, and a fake `setTimeout`/clock for
   `phaseTimer`/`ownTimeout`):
   - correct reports `-1` once, `score + 1`, then `reloadProgress`, then
     `saveScore`, then a `correct` phase timer is scheduled;
   - an immediate second `answer()` is rejected;
   - wrong reports `+1` once, applies the floor at 0, saves, keeps the same
     question/options/token/round kind, and unlocks only via the timer;
   - **boss round:** with `roundKind === 'boss'`, a decoy hit reports `+1`
     exactly once; a second decoy hit and a real-copy hit in the same
     attempt are both rejected; after `unlockRetry` the dissolved copy is
     re-formed and answerable; the real-copy hit then reports `-1` once;
     `unlockRetry` cancels a still-running dissolve effect on that copy
     (inject one with a long remaining time) before re-forming it;
   - `beginTransition` chooses `regroup` for rounds 1–3 of a place,
     `roaming` after the boss round of places 1–3 (GL: **no** learning
     timer pending; DOM: one `roaming` timer of `advanceMs`) and
     `advancing` (`advanceMs`) after the plaza's boss round, and advances
     the counters before `create()` (test 3); in `roaming`, the question
     for the next round already exists (`generateFromList` called once)
     and `attemptLocked` stays `true`;
   - **(rev 3) encounter entry:** in `roaming`, `enterEncounter()` is
     called exactly once when the trigger fires (twice-called trigger,
     e.g. a teleport during the same step, is a no-op the second time);
     it starts one `deploying` timer, never calls `generateFromList` or
     `reloadProgress`, and only `arriveRound` opens the lock; the trigger
     of a non-target place, or any trigger outside `roaming`, does
     nothing;
   - **(rev 3) completion while roaming:** when the `create()` inside the
     place-clearing `beginTransition` gets `reloadProgress() === false`,
     `_so.navigated` is set, `_so.mapZoneIndex` is **not** committed (rev
     3.1), no gate opens, no chime/announcement/guidance switch happens,
     no timer is scheduled, and synchronous `teleport`/`walkTo`/
     `skipTransition`/`answer` calls afterwards return `false` with no
     effect (the engine routes wherever the player stands); with
     answer-time completion (`checkProgress()` false inside `answer`) no
     transition starts at all;
   - **(rev 3.1) lap pose:** `applyLapPose()` called from the step at
     progress 0.5, from `arriveRound` and from a rebuild, in every order,
     moves the player and closes the gates exactly once;
   - **(rev 3.1) suspension:** `pause()` and `onContextLost()` zero the
     joystick vector, velocity and virtual input, forget captured pointer
     ids (a later `pointerup` with an old id is ignored), keep the
     autopilot on pause and cancel it on loss;
   - when `reloadProgress()` returns `false`, `_so.navigated` is set and no
     phase timer is scheduled;
   - `answer()` outside `engaging`, or with a stale `token` argument, is
     rejected with no side effect (no sound, weight, score, save or lock
     change);
   - `attemptLocked` is written `false` only by `arriveRound` and
     `unlockRetry` (spy on the setter across every test in this suite).

   **Startup guard** (*kept*):
   - with `reloadProgress` stubbed to return `false` on the **first** call
     (simulating `created()`'s discarded redirect), `create()` does not call
     `generateFromList`;
   - `mounted()` with `_so.navigated` set allocates no renderer, listener or
     RAF (stub counters);
   - `create()` before mount does not touch DOM/THREE.

   **Pause race** (*kept*): pausing in `wrong` at 200 ms of 600 freezes
   `remaining = 400`; advancing the fake clock 5 s while paused changes
   nothing; resume restores `wrong` and unlock happens exactly 400 ms later;
   the same in `correct`, `regroup` and `advancing`; a timer whose expected
   phase no longer matches is a no-op; a stale token is a no-op. **Rev 3:**
   pausing in GL `roaming` keeps no timer, resumes into `roaming`, and a
   trigger check while paused (a forced call) does nothing.

   **DOM-only path:** with no THREE (`renderMode === 'dom'` from mount) and
   with rendering disabled, Start → `deploying` → `engaging`, correct →
   regroup → next question → `engaging`, and a boss round → `roaming`
   (its DOM timer) → `deploying` → `engaging`, and the plaza's boss round →
   `advancing` → `engaging`, complete using timers alone, with RAF never
   called and the same phase names as the GL mode.

   **DOM continuation and restart failure (rev 2.1 blocker):** for a
   context loss entered in each of `deploying`, `engaging`, `wrong`,
   `correct`, `regroup`, `roaming`, `advancing` and `paused` (from each of
   those),
   both `continueInDom()` and `restartInPlace()` with WebGL creation forced
   to fail:
   - `attemptLocked`, `questionToken`, the counters and `wrongOption` are
     unchanged by the switch;
   - the phase becomes the frozen timer's `expectPhase` (or the frozen
     `resumePhase` with no timer) — never an answerable phase while a
     `wrong`/`correct`/transition timer is pending;
   - `answer(i)` immediately after the switch from `wrong`, `correct`,
     `regroup`, `roaming`, `advancing` or `deploying` returns `false` with
     no report; from GL `roaming`, `continueInDom()` starts exactly one DOM
     `roaming` timer;
   - the pending timer then fires exactly once (`unlockRetry`,
     `beginTransition` or `arriveRound`), and from `correct` the next
     question opens only at `arriveRound`;
   - `question.action()` runs once per `questionToken` in total.

   **Restart in place:** from `lost` entered during `wrong`, `regroup`,
   `roaming` (rev 3), `advancing` (at 40% progress) and `deploying`,
   `restartInPlace()` calls
   no router method, no `generateFromList`, no `reloadProgress`, keeps
   `questionToken`, `_so.run` and the frozen timers' stamps (no
   re-stamping), and the phase ends in the frozen playing phase; the retry
   unlocks, or arrival happens, exactly once. From `roaming`, the player
   pose (`_so.player`), the open gates and the target are unchanged after
   the rebuild. From `advancing` at 40%, the player is at the start (the
   teleport happened at the fade midpoint), the snapshot's `from`/`to`
   counters are unchanged, and `generateFromList` is not called again.
   *Removed (rev 3):* the `advancePath(0.4)` camera-pose assertion.

   **Graphics generation (rev 2.1):** with a GLB load promise pending, a
   context loss bumps `_so.gfx`; resolving the promise afterwards disposes
   the loaded scene (dispose spies) and attaches nothing; the same for a
   load pending when `restartInPlace()` begins a second load. Entering
   `lost` clears every `_so.timers` entry (hitmarker, reload, lock-on
   settle, puff spawn, resize debounce) while leaving the learning timers
   frozen, and suspends the stub `AudioContext`.

   **Focus precedence** (*kept*): with `activeElement` a chip button,
   Enter/Space `keydown` does not call `fire`; with `activeElement` the root,
   it calls `fire` once.

   **Lifetimes:** `retireRound` and `releaseMap` dispose and **remove**
   every item, dispose each rebound skeleton (spy on
   `Skeleton.prototype.dispose`) and never dispose a `_so.shared` item; the
   shared, map and round sets are pairwise disjoint; walking between places
   disposes nothing and builds nothing (dispose/constructor spies);
   entering `lost` disposes all three and leaves no pending timers except
   the frozen ones.

   **Teardown** (*kept*): after `teardown()`, pending `phaseTimer` /
   `ownTimeout` callbacks do nothing; `teardown()` is idempotent and removes
   every registered listener (fake `addEventListener` counters).
10. **Integration** (*kept*): load `data.js`, `apps.js`, `groups.js`,
    `themes.js` and the engine helpers (the `shared_group_test.js` style):
    - find registrations by `appType === 'strike_ops'` (not by position) and
      assert the slice ids `0_4_8` and `grp-ch51-8` resolve with the expected
      fields;
    - check `generateFromList` works for each;
    - check `tester.js` contains `'/play/strike_ops/:currentAppId'`;
    - check `index.html` loads `games/strike-ops.js` before `tester.js`, plus
      the CSS;
    - check `service-worker.js` lists both files and every
      `STRIKE_OPS_ASSETS` path exists, and that no
      `/assets/strike-ops/models/` (obsolete Factory Kit) or
      `RobotExpressive` path remains in `STRIKE_OPS_ASSETS` (the new
      `env/kenney-*` folders are expected; do not match on `kenney-`);
    - check that the set of URLs the config can load (`enemyModel.url`,
      `lodUrl`, every kit piece, every texture) equals `STRIKE_OPS_ASSETS`
      exactly, and that every external `images[].uri` / `buffers[].uri` in
      each listed GLB's JSON chunk resolves to a listed path;
    - check `assets/strike-ops/models/` and
      `assets/strike-ops/LICENSE-Kenney.txt` no longer exist, and
      `assets/strike-ops/CREDITS.md` names every listed file;
    - **migration search:** in `games/strike-ops.js` and
      `games/strike-ops.css`, outside comments, there is no identifier or
      string matching `/\b(rooms?|posts?|robots?|breach\w*|Robot\w*)\b/i`
      (e.g. `C.rooms`, `posts.length`, `getRobots`, `breaching`), and
      (rev 3) none matching
      `/\b(advancePath|advancePose|yawLimitDeg|bobAmp|bobHz|catmull|retireZone|buildIncomingZone|retireOutgoingZone)\b/`
      or the property access `/\.pad\b/` (the pad, yaw clamp, head bob
      and camera glide are gone; `padStart` is unaffected);
    - check the balloon registrations are unchanged: the count of
      `appType: 'balloon_shooter'` and `/balloon_shooter/` links equals the
      pre-change count (23 in `apps.js`, 5 in `groups.js`), and every
      existing id `0_4_0..7` still resolves to the same `appType`.
11. **Static merge (rev 2.1):** with THREE r128 in the VM, build two
    meshes whose geometries are **indexed**, use an
    `InterleavedBufferAttribute` for `position`/`normal`/`uv`, and store
    `uv` as normalised `Uint16`/`Uint8` and `normal` as normalised `Int8`
    (the Kenney/KayKit layout), with different world matrices and one
    shared material. `strikeOpsMergeStatic` returns one mesh whose
    non-indexed float positions equal the world-transformed source
    positions (±1e-5), whose UVs equal the de-normalised source UVs
    (±1/65535), whose normals are de-normalised, and whose vertex count is
    the sum of the index counts. A control assertion documents that r128
    `toNonIndexed()` on the same interleaved input does **not** reproduce
    the positions (guarding against a future "simplification" back to
    it); if a THREE upgrade fixes that, the control is updated, not the
    merge. Meshes with different materials produce one merged mesh each.
    Rev 3: merged meshes carry a bounding sphere that contains every
    merged vertex (frustum culling of whole chunks depends on it).
12. **Map config (rev 3; rev 3.1 shipped-config gate):** first,
    `validateStrikeOpsConfig(STRIKE_OPS_CONFIG)` returns `[]` and
    `createStrikeOpsComponent(stubBase)` does not throw (the revision-3
    walls would have failed here); a perimeter wall moved 0.5 m outside
    `bounds` produces exactly the expected error. Then, with the shipped
    `STRIKE_OPS_CONFIG.map` and places: the four regions lie inside
    `playBounds` and do not overlap, every wall/structure/gate inside
    `bounds`;
    headings are multiples of 90°; `strikeOpsArenaToMap` maps the yard
    identically (local == map) and reproduces the §5.1 table (fight boxes,
    anchors, boss stages, approach points, ±1e-9); every gate lies on its
    two regions' shared boundary inside a wall gap; entry gates are outside
    and exit gates inside each place's `enemyZone`; the **pre-clear flood
    fill** for `zoneIndex` 0..3 reaches the target anchor, reaches no lane
    spot, approach point or exit gate of the target, and never leaves the
    union of the regions; every route leg is collider-clear for its state
    (capsule + 0.05 m); the legs join start → each anchor; the total route
    length is 84.6 m (±0.5) and each leg ≤ 35 m; the water tower lies
    within ±20° of straight ahead from the start. Negative fixtures: a gate
    moved off its wall, an `enemyZone` shrunk so the flood fill reaches a
    lane spot, a leg cutting through a container, and overlapping regions
    each produce exactly the expected error.
13. **Map state (rev 3):** `strikeOpsMapState(k, phase)` for k = 0..3 and
    every phase: gate `g_j` open iff `k ≥ j`; place `i`'s blocker active
    iff `i ≥ k`; target = place k; trigger armed only in `roaming`; the lap
    wrap (k = 0 after the plaza) closes every gate. Pure (no input mutated,
    same output for equal input).
14. **Navigation and autopilot (rev 3; rev 3.1 routing):** for every
    state k, `strikeOpsRoute(from, place k, state)` from each place's
    anchor, from every cleared place's far corners and from 200 seeded
    random free points of the k-reachable area returns `ok` with
    collider-clear segments ending at place k's anchor; the same inputs
    give the same points on every call (deterministic tie-breaks: two
    equidistant entry nodes resolve to the lower id); a start whose
    straight connectors are all blocked (behind a container) returns
    `via: 'grid'`; a locked place or a point inside a collider returns
    `no-route`. A fixed-step (16 ms) simulation of
    `strikeOpsAutopilotStep` + `strikeOpsResolveMove` **from each of the
    200 random starts and each leg start** reaches the target fight box
    within `routeLength / walk + 2 s`, never stalls for more than 0.5 s
    (progress along the route), and turns no faster than 180°/s; a held
    forward input against a closed gate stops the capsule ≥ `radius`
    before it.
15. **Encounter boundary and order (rev 3):** with the player clamped to a
    fight box, 10 000 seeded inputs never leave it; from every fight-box
    sample (0.5 m) of every place and every yaw at which all four lanes'
    torso points are in front of the camera, sorting the projected lane
    points by screen x gives lane order (the 4° invariant seen through a
    real projection with the 390×844 and 1440×900 FOVs).
16. **Aim in the map frame (rev 3.1):** with THREE in the VM and a
    synthetic camera at each place's anchor (headings 0°, 90°, 0°, 270°),
    for every lane spot of every place: `project(torso)` then `rayFor` of
    that pixel intersects that enemy's map-frame hitbox (and no other);
    `aimAngles(torso)` round-trips through the camera to the crosshair
    within 0.1°; a ray to a hide point behind its cover is blocked by the
    map-frame cover box; `strikeOpsPickMagnetTarget` gives identical
    results under a 90° rotation of the whole scene.

Run with the existing suites: `node tests/strike_ops_test.js`,
`node tests/adventure_core_test.js`, `node tests/shared_group_test.js`,
`node tests/grade6_moe_test.js`, `node tests/grade6_1_1_shared_group_test.js`,
`node tests/offline_assets_test.js` and `node tests/service_worker_test.js`.

### 12.3 Browser test: `tests/strike_ops_browser.cjs`

**Harness setup.** Playwright is **not** installed in this repository, and it
must not be added: no `package.json`, lockfile or `node_modules` changes in
the repo. Existing browser tests (`tests/hexkeep_campaign_browser.cjs`) use a
bare `require('playwright')`, which Node resolves through `NODE_PATH`. The new
test does the same.

**Prerequisites:**

- Node (any current LTS);
- **Microsoft Edge** installed: the system channel used by
  `chromium.launch({channel: 'msedge'})`, present at
  `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` on this
  machine, so no `npx playwright install` download is needed;
- Python 3 for the static server (3.12 is present).

**One-time isolated install** (outside the repo; Windows `cmd`), pinned to a
version with `page.clock`:

```bat
npm install --prefix "%TEMP%\strike-ops-pw" playwright@1.48.2
```

(PowerShell: `npm install --prefix "$env:TEMP\strike-ops-pw" playwright@1.48.2`.)

**Run** (two terminals, both from `c:\projects\test3`):

```bat
:: terminal 1 — static server, repo root, port 8767 (the port the test hard-codes)
python -m http.server 8767 --bind 127.0.0.1

:: terminal 2
set NODE_PATH=%TEMP%\strike-ops-pw\node_modules
node tests\strike_ops_browser.cjs
```

PowerShell equivalent for terminal 2:

```powershell
$env:NODE_PATH = "$env:TEMP\strike-ops-pw\node_modules"
node tests\strike_ops_browser.cjs
```

The same `NODE_PATH` runs `tests/hexkeep_campaign_browser.cjs` for the
shared-group smoke. The test exits non-zero on any failed check or on any
**unexpected** page error (error gate below). Screenshots go to
`artifacts/strike-ops/` (create it; do not commit the captures).

The test follows `tests/hexkeep_campaign_browser.cjs`:

- Playwright `chromium.launch({channel: 'msedge', headless: true})`;
- the repository served at `http://127.0.0.1:8767/`;
- **two separate browser contexts (rev 2.1)**, each with
  `delete Navigator.prototype.serviceWorker` in an init script:
  - **desktop context:** `hasTouch: false`, `isMobile: false`, mouse
    input, 1440×900 by default. Expectations: no `.so-touch` class, the
    joystick and touch buttons hidden, `aimMode` after Start is
    `'locked'` or `'cursor'` (headless may refuse the lock), LOD0 enemies
    at the initial tier 2;
  - **touch context:** `hasTouch: true`, `isMobile: true`, 390×844 by
    default, Start activated with `page.tap`. Expectations: `.so-touch`,
    the joystick and fire cluster visible, `aimMode === 'touch'` after
    Start, the LOD enemy file at the initial tier 1, and the touch-only
    checks (11, 12, the touch half of 15–17).

  A check names its context; checks that are not input-specific run in
  the desktop context. Never assert a desktop expectation in the touch
  context or the reverse;
- `page.on('pageerror')` and `page.on('console')` (type `error`)
  collection, `page.clock.install()`;
- a `state(fn)` helper evaluating on `.so-game`'s `__vue__`;
- an `enter(id, fresh)` helper that seeds fixtures through `setLocalStorage`
  (weights for `getActivityMode()+'_'+id+'_Weights'`,
  `_CurrentLevelProgress {progress:0,total:9999}`, `_new_items []`) and sets
  `location.hash = '/play/strike_ops/' + id`. **Seed weights ≤ 15** (rev 3
  note from the 2.1 slice run: the engine clamps weights to 15, so the
  repository test's seed of 50 made checks 6–9 fail; the working copy
  seeded 10);
- (rev 3) a `walk(target, maxMs)` helper: `walkTo(target)` then `runFor`
  in 250 ms steps until `getPlayer().autopilot === false` or `maxMs`,
  failing on timeout; and a `goTo(place)` helper that uses
  `teleport(place)` when the walk itself is not under test.

An init script also wraps `requestAnimationFrame`/`cancelAnimationFrame`
(pending count), `AudioContext` (instance list) and `HTMLCanvasElement.getContext`
(WebGL context count) for leak checks. Screenshots go to `artifacts/strike-ops/`.

**Error gate (rev 2.1).** Exactly one pre-existing error is tolerated, and
only in this narrow form: the message is `handler.call is not a function`
(a `TypeError`, surfaced by Vue's hook error handler as a console error
`Error in created hook` and/or as a page error) **and** its stack or Vue
message points at the **root `new Vue` instance's `created`** in
`tester.js`, which is declared as an object (`created: { username:
function () {…} }`, `tester.js` ≈ line 10234) instead of a function. It is
present on clean `HEAD` since commit `384924d` ("Display user name"), is
unrelated to Strike Ops and is out of scope (§13). The harness classifies
it with a dedicated matcher (message **and** origin; at most one
occurrence per full page load), reports it on a separate "baseline
errors" line, and does not count it as a failure. Every other page error
fails the run — including another `handler.call` error from any other
origin, or a second occurrence within one page load. Console errors fail
the run when they come from `games/strike-ops.js`, mention `strike-ops`,
or name a request under `/assets/strike-ops/`; any other console error is
listed in the report for review. The home page's LearnBox `/api/v1/child/me` 404 (§15 note
10) is a network console message on the menu route; it is matched only by
that exact URL and status, reported as baseline too, and never matched by
a broad pattern.

Checks (for `0_4_8`, then repeated in brief for `grp-ch51-8`):

1. **Boot:** the root has `.so-game`, `dir="rtl"` and a canvas. `phase` goes
   from `loading` to `briefing` (poll with `clock.runFor`). Answer chips are
   disabled in briefing. The counter shows `שאלה 1/16`, 4 empty stars, ammo
   `30/120`, the minimap canvas exists. Rev 3: `getPlayer()` is at the start
   (0, 1) heading 0 inside the yard fight box; `getMap()` has 4 places,
   `g1`–`g3` closed and the yard as target; the minimap compound layer was
   drawn once (2D-context spy).
2. **Start:** desktop context: `.so-start` click leads to `deploying`,
   then `engaging` after `approachMs`; `aimMode` is `'cursor'` or
   `'locked'` (headless may refuse lock). Touch context: `page.tap` on
   `.so-start` gives the same phases and `aimMode === 'touch'`.
   `getEnemies().length === options.length === .so-answer count ===
   .so-plate count`, `roundKind === 'squad'`. Every enemy's `materials`
   ids are unique across enemies (per-enemy clones, §6.1). Rev 3: each
   enemy's `badge.number === index + 1`; chip `i`'s and plate `i`'s
   `.so-marker` carry the same `data-badge`/`data-shape`; enemy `i`'s
   `Team` tint equals `squadTints[i]`.
3. **Fairness:** with `setRendering(false)`, run 33 s: the `exposureMs`
   ledger is equal (±5%) when compared over whole periods (§15 note 10),
   every soldier was hittable at least 5 times, and
   at least one `dash` was observed per soldier.
4. **Badge pairing and left-to-right order (RTL page, then an LTR
   fixture):** rev 3 runs this from **five fight-box positions** (the
   anchor and the four corners, via `teleport({x, z})` + `setView` at the
   place's heading and at ±25°), in the yard and in one other place;
   sampled every 250 ms over 10 s of `engaging` and once per boss round:
   sorting the enemies that are on screen by `screenX` gives ascending
   `index`; every chip's badge equals its enemy's badge; `.so-answer` elements'
   `getBoundingClientRect().left` is ascending in `data-index` order;
   `.so-plate` lefts are ascending in `data-index` order **among plates on
   the same tier and across tiers** (two-tier layouts keep horizontal
   order); in the `row` answer layout chip k and the k-th enemy from the
   left carry the same `answer`; in the `stacked` layout DOM order is index
   order and item k's marker equals plate k's marker. Repeated with the
   English-question / Hebrew-answer route and with the Hebrew-question /
   English-answer fixture (check 14).
5. **Blocked shot:** when soldier j is `hidden`, `shootEnemy(j)` gives
   `blocked: true, accepted: false`. Attempt history, weights and score are
   unchanged.
6. **Wrong (forced):** `forceExpose(w)`, then `shootEnemy(w)`. `accepted`;
   `phase === 'wrong'`; score is `max(0, s−1)` and equals `getScore(id)`;
   `getAttemptHistory(id)[questionIndex]` grew by exactly 1. An immediate
   `shootEnemy(w)` / `answer(w)` is rejected, so history is unchanged.
   `runFor(700)` brings `engaging` back with **identical**
   `question.question`, `options`, `questionToken` and `roundKind`.
7. **Correct (forced) and regroup:** `forceExpose(c)`, then `shootEnemy(c)`.
   Score +1 is persisted, history grows by exactly 1, and a duplicate is
   rejected. `runFor(1000)` brings `regroup` with a new `questionToken`;
   `skipTransition()` leads to `engaging` with `roundNumber === 2` and the
   same `zoneNumber`. A second correct answer **without** skipping
   (`runFor(2600)`) proves the natural regroup (`roundNumber === 3`).
8. **Boss round (natural):** the 4th round of the zone has
   `roundKind === 'boss'`, `.so-game.so-boss-round`, `getEnemies()` all
   `kind === 'copy'`, exactly one `isReal`, all copies `hittable` the
   moment `engaging` starts (the split finished inside the 1000 ms
   approach) and identical in every presentation field except `answer`,
   `lane`, `index`, `pose`/screen position and material `id`s: equal
   `scale`, equal `clip.role`/`clip.name`, and per `slot` equal `tint`,
   `opacity`, `emissive` and `transparent` (no visual tell). Shoot one
   decoy: exactly one wrong report (history +1, score −1 with floor); its
   state becomes `dissolved` with opacity 0 by `runFor(460)` (inside the
   600 ms lock); an immediate `shootEnemy` on another decoy and on the
   real copy are both rejected (history unchanged). `runFor(150)` more
   (610 ms total): the decoy is `hittable` again, `engaging`, same token,
   and a `shootEnemy` on it within the 150 ms re-form is **accepted** as a
   wrong answer (the re-form never hides an answerable copy); `runFor(700)`
   again before the next step.
   Shoot the real copy: exactly one correct report; `runFor(1000)` brings
   **`roaming`** (rev 3; not `regroup`, not `advancing`) with no learning
   timer pending, `attemptLocked === true`, a new `questionToken`, gate
   `g1` open (`open01` reaches 1 within 600 ms), target `containers`,
   `stars === 1`, the banner showing the objective line and `.so-go`
   visible; `runFor(10000)` stays in `roaming`; then
   `teleport('containers')` returns `triggered: true`, the phase is
   `deploying`, and `runFor(1000)` brings `engaging` with
   `zoneNumber === 2`, `zoneId === 'containers'`, the held question shown
   (its `questionToken` unchanged since the transition) and
   `question.action()` run once.
9. **Forced boss round:** in a fresh run, `forceBossRound()` in `briefing`
   makes round 1 a boss round with the same question and token; the
   learning results match check 8 (after it the yard is cleared and
   `roaming` starts). Rev 3: `forceBossRound()` in `roaming` re-embodies
   the held question as a boss round that splits at the next place's
   encounter.
10. **Keyboard path, unforced** (no `forceExpose`, no `shootEnemy`):
    - focus the root (click the canvas);
    - `page.keyboard.press('Digit' + (c + 1))` while soldier c is `hidden`;
    - `runFor(2500)`: the scheduler brings soldier c out, and the lock-on
      fires once through `fire()`. Ammo is decremented, and the correct
      transaction runs exactly once.

    Repeat with a wrong digit: one wrong report, then retry. Then the
    Tab-to-chip path: Tab until `.so-answer[data-index=c]` is focused, press
    Enter, and `runFor(2500)`. The transaction runs exactly once, and Enter
    did **not** also call a crosshair `fire()` (ammo dropped by exactly 1).
    Then Enter with focus on the root fires at the crosshair (ammo −1, no
    lock ring). Repeat the digit path once in a boss round.
    Stale-token boundary (desktop context): the two §12.1 stale-event
    cases leave history, weights, score and `attemptLocked` unchanged.
11. **Chip (touch) path, unforced** (touch context): tap
    `.so-answer[data-index=c]`, with the same result as the Tab-to-chip
    path.
12. **Touch controls** (touch context): `.so-fire` tap decrements ammo; 30 taps empty the
    magazine and it auto-reloads after 1000 ms to `30` with the reserve
    shown (never blocks firing); `.so-reload` starts a reload; a drag on the
    scene changes yaw; a joystick drag moves the player and, in
    `engaging`, the position stays inside the fight box (rev 3; *was* the
    pad AABB); in `roaming` a joystick drag to the rim sprints
    (`getPlayer().sprinting`) and a tap on `.so-go` starts the autopilot;
    joystick + look + fire with three concurrent pointer ids all act.
13. **Pause race:**
    - In `wrong`, after `runFor(200)`, dispatch a hidden `visibilitychange`
      (override `document.hidden` / `visibilityState` in-page) → `paused`;
      `getPhaseTimers()[0].remaining ≈ 400`.
    - `runFor(5000)`: still `paused`, `attemptLocked` still `true`, RAF
      pending count 0, minimap not redrawn (draw-call spy on its 2D context).
    - Visible again plus `.so-resume` → `wrong`; `runFor(399)` is still
      `wrong`; `runFor(2)` gives `engaging` with the same token.
    - Repeat in `deploying`, `correct`, `regroup` and `advancing` (the lap
      wrap, paused mid-fade; `runFor(10000)` stays paused;
      `getTransition()` is unchanged while paused; after resume, arrival
      happens exactly once with the remaining delay;
      `roundNumber`/`zoneNumber` were advanced once, at transition start,
      and not again at arrival).
    - **Rev 3, `roaming`:** pause while the autopilot walks 1 m before the
      containers fight box; `runFor(10000)`: the player has not moved, no
      encounter started, no phase timer exists; after resume the autopilot
      continues and the encounter starts exactly once.
    - Repeat once using `.so-pause` and once using Escape.
14. **RTL/LTR content fixtures.** Test-only, injected in-page after load and
    never written to `apps.js` or `data.js`. Push a hidden menu onto
    `apps.items` with `strike_ops` apps over:
    - `ENGLISH_CHAPTER5_ALL` `hebrew → english` (Hebrew question, English
      answers);
    - a synthetic `DATA.SO_QA_MIXED` list: long Hebrew sentences with
      embedded English and numbers, long English answers (≥ 60
      characters, one unbroken 30-character word), mixed-language
      punctuation (`(apple)`, `3+4=?`, `"run",`), and an `<img>` option;
    - the **exact bidi fixture** question `מה פירוש המילה: apple?`.

    Then enter their positional ids. Assertions: the banner `dir` follows
    the question; each chip's and plate's `dir` follows its own text;
    embedded opposite-direction runs are wrapped in `<bdi>` with the
    expected `dir`; no ellipsis anywhere (`text-overflow` is never
    `ellipsis`; for every chip and visible plate, `scrollWidth ≤
    clientWidth` and `scrollHeight ≤ clientHeight` unless it is the
    scrollable stacked list, and its `textContent` equals the option text);
    the long-answer fixture switches to `answersLayout === 'stacked'` at
    390×844 and every item shows its full text at ≥ `minPlateTextPx`; the
    banner is ≤ 3 lines before it scrolls; **check 4's order assertions
    hold**; at 390×844 and 1440×900.
    **Glyph-order assertion for the exact fixture (rev 3: the built
    override, §8)** (a `Range` over each character, `getClientRects()`):
    `x(?) < x(a) < x(p) < x(l) < x(e)`, the `?` rect is immediately left of
    the `a` (gap < 0.5 em) and is the leftmost glyph of the line, the `:`
    is right of the `e`, and the Hebrew words are ordered right to left
    (`מה` rightmost); the banner contains exactly one `<bdi dir="ltr">`
    whose text is `apple`; a screenshot of the banner is saved as the
    visual regression reference. Checking `dir` or computed CSS alone does
    not pass this check.
    Also assert the slice route `0_4_8` (English question, Hebrew answers).
15. **Portrait and landscape no-overlap** (the revision-1 bug): at 390×844,
    360×780, 540×960, 844×390 and
    768×1024, **on first `briefing` frame and again after 1 s of `engaging`,
    after a rotate (resize portrait ↔ landscape mid-`engaging`), in a boss
    round and (rev 3) in `roaming` with the place toast showing and the
    objective marker pinned to an edge (player turned away)**: using
    `getLayout()`, the banner, the answer list (or `controls.go` in
    `roaming`), every control rect, the minimap and the counter pocket
    (`getLayout().counter`) are pairwise non-overlapping, fully on-screen,
    every plate and the objective marker lie inside `safeRect`, and the
    toast overlaps neither the banner nor the answer row; no horizontal
    overflow; every visible enabled button ≥ 44×44 (`.so-go` ≥ 56 px
    tall). **Target sizes (rev 2.1):** `getLayout().fov` matches
    `strikeOpsHipFov` for the measured canvas; with every enemy forced
    exposed (`forceExpose`), the farthest enemy's projected height
    (head-to-feet `screenY` span) is ≥ `minEnemyPx` at hip and ≥ 1.3× that
    in ADS, its torso centre lies inside `safeRect`, all four lanes'
    enemies are on screen at hip from the anchor (rev 3; *was* the spawn),
    from the far fight-box corner the farthest enemy is ≥ `minEnemyPxFar`
    at hip, and `plateTextPx` /
    `answerTextPx` are ≥ `minPlateTextPx`. 844×390 is asserted explicitly
    as the shortest band. Desktop sizes run in the desktop context and
    phone sizes in the touch context. A screenshot per case.
16. **Theme × viewport matrix:** for every key in `Object.keys(themeOptions)`
    (`setTheme(key)` then re-resolve) × {1440×1000, 390×844, 844×390,
    768×1024}: check 15's layout assertions; computed plate/text contrast
    ≥ 4.5; the sky colour of a top-centre pixel sample matches the theme's
    `skyTop` within tolerance (proves the theme reached the scene); in
    `dark`/`space`/`code` an enemy-vs-background luminance sample ≥ 3:1; a
    screenshot per combination. **Live clones (rev 2.1):** once per key,
    switch the theme mid-`engaging` (squad) and mid-boss-round: every live
    enemy's `materials[slot=Team].tint` equals the new `squadTints[lane]`
    (or `bossTint`/`hologramTint` for copies), copies stay identical to
    each other, and a dissolving decoy keeps its current opacity. Slice
    gate: `base` and `dark` are reviewed
    visually against the mockups; the other keys must pass the automated
    assertions.
17. **Budget** (all passes summed; phone sizes in the touch context):
    - 390×844 and 844×390, `setQuality(0)`: steady `last.calls < 120` and
      `last.triangles < 80000` in a squad round **at each of the four
      places' anchors** (rev 3, reached with `teleport` + `skipToZone`)
      and, **measured separately**, in a boss round with the hologram
      copies and a decoy dissolve in progress; the steady squad numbers are
      logged next to the sourcing baseline (49 calls / 36.4k triangles) and
      the §6.2 estimate (≈ 77 calls), and a deviation of more than +15
      calls over the estimate is reported for review;
    - `setQuality(1)` (sun shadow, sheds/cover casting only): steady
      `last.calls < 120`, recorded separately;
    - **roaming (rev 3)**, both tiers: at the §6.2 roaming views (each open
      gate facing the next place, the containers anchor facing west, the
      plaza anchor facing east) `last.calls < 120` and `last.triangles <
      100000`; then `resetRenderPeak()`, `walk()` each leg and run the lap
      wrap, then `peak.calls < 120` and `peak.triangles < 100000`
      (*replaces* the two-zone `advancing` peak);
    - `getRenderStats().detailChunks` ⊆ {current place, its gate
      neighbours} at every sampled frame of those walks;
    - static merging is active: each chunk's merged mesh count
      (`mergedMeshes`) equals its distinct static material count (≤ 6 with
      per-kit sharing), and no placed per-piece clone remains in the
      scene; walking between places creates no geometry
      (`renderer.info.memory.geometries` unchanged over the walks);
    - `renderer.info.programs.length` is unchanged across a knockdown and
      a decoy dissolve (no shader recompiles from opacity changes, §6.1);
    - `mixersActive ≤ 4` at every sampled frame in the touch context;
    - 1440×900 `setQuality(2)` (desktop context): values recorded next to
      the baseline (49 + 33 shadow calls; no hard limit);
    - `last.passes` reports the shadow, scene and overlay passes;
    - `getRenderStats().enemyModel` is logged (primitives 3, triangles
      6,584 or 5,015, lod).

    These are call/triangle gates under SwiftShader; they do not establish
    mobile frame rate (§6.2, §12.4).
18. **Zoom fixtures (rev 3: also once in `roaming` with the go button
    and the objective marker):** at 720×450 and 960×600 (200% / 150% browser zoom of
    1440×900), and at 1440×900 with
    `document.documentElement.style.fontSize = '200%'`, with `base` and
    `space`: check 15's assertions hold, plus "plates went to two tiers or
    collapsed to markers where they would overlap", "no text below
    `minPlateTextPx` (which doubles with the 200% root size)", "the answer
    list switched to `stacked` rather than truncating" and "the minimap
    shrank or hid before overlapping".
19. **Reduced motion:** `emulateMedia({reducedMotion: 'reduce'})` and reload.
    - `reducedMotion === true`;
    - the exposure ledger and each enemy's hittable windows are **identical**
      to a normal-motion run over 33 s;
    - the retry unlock is still exactly 600 ms; `regroup` still ends at
      1.6 s and `advancing` at 3.2 s (no skipping);
    - the lap-wrap teleport to the start happens within 300 ms of
      `advancing` start (rev 3; *was* "the camera is at the next pad");
    - boss copies do not patrol; no recoil camera offset; (rev 3) no head
      bob in either mode, the centre-view assist and the autopilot's turns
      are instant, a gate's `open01` jumps to 1, chevrons do not pulse, and
      the walk itself (positions at 250 ms samples of a `walkTo`) is
      identical to a normal-motion run;
    - **real shots against the reduced-motion pose (rev 2.1):** during a
      soldier's dash (wait for `state === 'dash'` with `forceExpose` off),
      `shootEnemy(i)` aims at the pose `getEnemies()` reports (the
      destination spot) and is **accepted**; at a sample time when the
      normal-motion pose (`strikeOpsPoseAt(…, false)`) is ≥ 1.0 m from the
      reduced-motion pose, `probeShot()` through the normal-motion torso
      point reports no enemy hit and makes no learning call; in a boss
      round each copy's `pose` stays at its lane point over 20 samples and
      a shot at it is accepted (on a decoy: one wrong report);
      `lockOn(i)` during a dash fires once at the visible body.
20. **Context loss and restart in place** (the revision-1 bug): in
    `engaging`, record `location.hash`, `history.length`, `questionToken`;
    call `getExtension('WEBGL_lose_context').loseContext()` on the game
    canvas.
    - the phase becomes `lost`, the panel is shown, no phase timer is
      pending (frozen only), and `runFor(5000)` keeps `lost`;
    - **התחלה מחדש** (`.so-lost-restart`) → poll `runFor` until the phase is
      the frozen playing phase (`engaging`); the hash and `history.length`
      are unchanged; `questionToken` unchanged; exactly one live
      strike-ops WebGL context; an answer then completes normally;
    - repeat with the loss during `wrong`: after restart the phase is
      `wrong` and the retry unlocks exactly once;
    - repeat with the loss during `correct`: after restart the phase is
      `correct`, `attemptLocked` is still `true`, an immediate `answer(i)`
      returns `false` with no report, and the transition starts exactly
      once;
    - repeat with the loss during `advancing` (the lap wrap) at ≈ 40%
      (transition snapshot): after restart `getTransition()` equals the
      pre-loss snapshot, the player is at the start, every gate is closed,
      the map is built once (one set of chunks), arrival happens exactly
      once, the counters do not advance again, and `generateFromList`
      (spied) is not called again; repeat with the loss during `deploying`
      and during `paused` (from `regroup`);
    - **(rev 3) loss during `roaming`** (the autopilot half-way along a
      leg): after **התחלה מחדש** the phase is `roaming`, `getPlayer()`
      equals the pre-loss pose (1 cm / 1°), the open gates and the target
      are unchanged, no encounter started, and walking on enters the next
      encounter exactly once; **המשך בלי תלת-ממד** from `roaming` starts
      the DOM `roaming` timer and reaches `deploying` → `engaging` of the
      next place exactly once;
    - **loss while loading:** trigger the loss while the GLB requests are
      still pending (route the enemy GLB through a delayed handler); after
      the delayed responses arrive, no enemy is added to a scene, the
      geometry count does not grow, and no cosmetic timer fires;
    - **המשך בלי תלת-ממד** (`.so-lost-dom`) from `engaging`:
      `renderMode === 'dom'`, the phase is `engaging`, and an answer
      completes; from `correct` and from `wrong`: the phase is that frozen
      phase, `attemptLocked` stays `true`, chips are disabled, an immediate
      `answer(i)` is rejected with history unchanged, and the pending timer
      fires exactly once;
    - **restart failure:** with `getContext` forced to return `null` after
      the loss, **התחלה מחדש** from `correct` ends in `renderMode === 'dom'`
      with the same guarantees as the DOM continuation;
    - no unexpected page errors (error gate).
21. **Navigation during animation:** start an `advancing` (the lap wrap),
    click `.so-exit` during it, then `runFor(5000)`.
    - `.so-game` is gone and the hash is `/app/0_4_8`;
    - the pending RAF count is 0;
    - every created `AudioContext` has `state === 'closed'`;
    - `document.pointerLockElement === null`;
    - no live strike-ops WebGL contexts;
    - no unexpected page errors (error gate).

    Repeat with a hash change during the `wrong` timer, during a boss
    dissolve, while `paused`, and (rev 3) while the autopilot walks in
    `roaming` and while a gate is opening.
22. **Startup guard:** seed progress as complete (`{progress: 1, total: 1}`)
    and enter. The hash becomes `/app/<id>`, **no WebGL context was created**
    (`getContext` spy), no GLB was requested, and there are no unexpected errors. Seed
    `_new_items [0]` with progress 0: the route becomes `/display/news/<id>`
    with the same "no allocation" assertions.
23. **Completion routing:** seed weights so one item remains (the hexkeep
    pattern), answer correctly (once in a squad round, once in a forced
    boss round), and the hash becomes `/app/<id>` for both `0_4_8` and
    `grp-ch51-8`. Rev 3: also with the last item answered in a place's
    boss round (completion is decided at the transition start, so no gate
    opens and `roaming` never starts) and in the containers place after a
    walk (the game stops wherever the player stands).
24. **DOM-only render mode:**
    - with an init script making `getContext('webgl'|'webgl2')` return
      `null`, `renderMode` becomes `'dom'` (root `.so-dom`) and the phase
      goes `briefing` → Start → `deploying` → `engaging`. Two places' worth
      of rounds (including a boss round, the DOM `roaming` timer with its
      `מתקדמים אל…` line, and one wrong-retry) complete via `.so-answer`
      clicks, using timers alone, through the normal phases; chips are
      disabled outside `engaging`; the minimap, the objective marker and
      `.so-go` are hidden;
    - with WebGL available, `setRendering(false)` plus the same flow
      completes, with one difference (rev 3.1 fix): GL `roaming` has **no**
      timer, so the test ends each `roaming` explicitly — once with
      `teleport(<target place>)` and once with `walk(<target place>)` —
      and asserts that without them `runFor(10000)` stays in `roaming`.
25. **Offline request audit:** record every same-origin request from the
    moment the route is entered until the end of a run through a boss round
    and the walk into the next place (rev 3; *was* "an advance"), in both
    contexts (desktop loads
    `enemy-hazmat.glb`, touch loads `enemy-hazmat-lod.glb`), plus two
    failure variants done by routing to 404: the enemy GLB (the procedural
    soldier runs) and one kit GLB plus its kit's `colormap.png` (stand-in
    shapes; gameplay unchanged). Every requested path is in the
    service-worker precache list (`STRIKE_OPS_ASSETS` ∪ core assets),
    including each Kenney GLB's relative `Textures/colormap.png`; in
    particular, no `/assets/strike-ops/models/` (obsolete Factory Kit),
    `RobotExpressive`, `assault-rifle.glb` or `crate.glb` request occurs,
    and no request leaves the origin. The bytes transferred for
    `/assets/strike-ops/` in one desktop run are logged (expected
    ≈ 1.08 MB).
26. **Replay:** enter, exit and re-enter 5 times: the WebGL context count
    never exceeds 1 live context, and there are no unexpected errors.
27. **Balloon regression smoke:** open `/play/balloon_shooter/0_4_1`; its
    canvas appears and there are no unexpected page errors. Then return.
28. **Free roam and guidance (rev 3; desktop, then touch for the touch
    items):** after clearing the yard (forced answers):
    - `roaming`: `.so-objective` is visible with `חצר המכולות` and a
      distance that decreases while walking; after `setView` turns the
      player 180°, `getMap().objective.edge` is `'left'` or `'right'` and
      the marker rect touches that side of `safeRect` with its arrow; the
      chevron `InstancedMesh` count is 1..24; the minimap draws the route
      (2D `stroke` with a dash pattern, spy) and the gate `g1` as open;
    - pressing `KeyG` (and, in the touch context, tapping `.so-go`) walks
      the player: `walk('containers')` completes within leg length /
      3.0 m/s + 3 s of fake time; on crossing z = 18 the toast
      `חצר המכולות` appears once and `.so-live` announces it once;
      reaching the fight box starts `deploying` exactly once; any `KeyW`
      press during the walk cancels the autopilot;
    - with no movement input for 15 s in `roaming`, `.so-go` gets its
      idle-hint class and the chevrons brighten;
    - `KeyM` opens `.so-mapview` in `roaming` (its `<ol>` lists the four
      places with `נוקה` / `היעד` / `סגור`), does nothing during
      `engaging`, and the pause panel shows the map.
29. **Collision, gates and the encounter boundary (rev 3):**
    - before the yard is cleared, `setMoveInput({x: 0, z: 1})` for 5 s
      from the anchor stops the player at the fight box's far edge
      (z = 3.0 ± 0.05) and shows the boundary toast once;
      `setMoveInput({x: 1, z: 0})` stops at x = 3.0; the player never
      enters the enemy side;
    - in `roaming` toward the containers (its `enemyZone` still up),
      `teleport({x: 3, z: 30.5})` (inside the containers region but
      **outside** its fight box, z 22..28, so no encounter triggers; rev
      3.1 fix), then `setMoveInput({x: 0, z: 1})` with heading 90° (east)
      for 3 s stops the capsule at x = 5.4 − 0.3 = 5.1 (± 0.05) at the
      tape line, the phase stays `roaming`, and the closed `g2` can never be
      reached; after the containers are cleared the tape is
      hidden and `walk('sheds')` passes through the open `g2`;
    - walking into a container side for 2 s ends with the capsule outside
      the container's AABB inflated by 0.3 m minus 1 cm, and a 30° push
      along it keeps sliding;
    - a 4.2 m/s sprint straight at the 0.6 m yard east fence for 3 s never
      ends beyond it (no tunnelling at 50 ms frames, forced by a slowed
      RAF);
    - `teleport('plaza')` while the target is `containers` returns
      `{ok: false, reason: 'locked'}`.
30. **Full lap (rev 3; desktop, `setRendering(false)`, `setQuality(0)`):**
    answer every round correctly with `shootEnemy` (forced exposure) and
    move between places with `walk()`; after 16 rounds: four boss rounds
    happened (rounds 4, 8, 12, 16), each place's encounter started exactly
    once, the stars went 1, 2, 3, then the lap wrap (`advancing`) reset
    them to 0 with every gate closed, the counter shows `סבב 2 · שאלה
    1/16`, the player is at the start, and `engaging` resumes in the yard;
    history grew by exactly 16 reports; no unexpected errors; the peak
    render stats of the lap are logged. In the touch context, repeat with
    the **קדימה** button only (no joystick) for the first two legs.
31. **Shooting at every heading (rev 3.1):** in each of the four places
    (headings 0°, 90°, 0°, 270°; reached with `skipToZone` + `teleport`),
    from the anchor and from two fight-box corners: `shootEnemy(i)` on an
    exposed enemy is accepted for the right `i`; `probeShot` through each
    exposed enemy's `screenX/screenY` reports that enemy; a shot at a
    hidden enemy behind cover reports `blocked`; `lockOn(i)` turns to
    enemy `i` (its torso projects within 4 px of the crosshair after the
    settle) and fires once; magnet picks never cross cover. Run once at
    1440×900 and once at 390×844.
32. **Suspension with held input (rev 3.1, touch context):** with one
    finger holding the joystick forward and a second dragging look in
    `roaming`, dispatch a hidden `visibilitychange` → `paused`; release
    both pointers while paused; resume: velocity is 0, the joystick knob is
    centred, the player does not move or turn over `runFor(2000)`, and
    late `pointerup`/`pointermove` events of the old pointer ids are
    ignored. Repeat with a context loss (then **התחלה מחדש**) instead of
    the hide, and once with the autopilot walking (paused → resumes
    walking; lost → cancelled).
33. **Entry and overlay (rev 3.1):** at 390×844 with the long-answer
    fixture (check 14), enter each place's fight box by `walk()` from its
    entry: after `runFor(450)` the player is at the anchor (± 1 cm) facing
    the heading (± 1°), all four enemies' torso points are on screen,
    every plate or marker lies inside `safeRect`, and the answer list shows
    every option in full; under reduced motion the pose is at the anchor
    immediately. Open `.so-mapview` with `KeyM` while the autopilot is
    0.5 m before a trigger; in the step where the phase becomes
    `deploying`, `.so-mapview` is gone and focus is on the root.
34. **Teleport, completion and lap-wrap edges (rev 3.1):**
    - `teleport` into a container corner snaps to the same capsule-clear
      point on every run; two equidistant candidates resolve by the
      documented angle order; with `setMoveInput` held, teleport clears it
      (no drift afterwards); a teleport into the trigger while a second
      teleport follows in the same task starts exactly one encounter,
      keeps `questionToken` and leaves `attemptLocked === true` until
      `arriveRound`;
    - **answer-time completion:** with one item left, a correct answer
      whose `checkProgress()` routes away: no `correct` phase, no gate
      animation or chime, no `roaming`;
    - **transition-time completion:** with progress such that the
      `create()` inside the boss round's `beginTransition` routes away:
      `_so.mapZoneIndex` unchanged, the gate stays closed, no chime or
      announcement, and `teleport`, `walkTo`, `skipTransition`,
      `skipToZone` and `answer` called synchronously right after return
      `false`/`navigated` with no effect;
    - **lap wrap with RAF stopped:** stop the RAF (hidden-then-forced
      resume harness or `setRendering(false)` plus a frozen RAF spy),
      reach the plaza's `advancing`, call `skipTransition()`: the player is
      at the start, every gate is closed, `engaging` in the yard; repeat
      with a context loss at progress 0.45 and at 0.55, then
      **התחלה מחדש**: `applyLapPose` ran exactly once in each case.

### 12.4 Manual QA matrix (browser, cache disabled)

Six themes × {Hebrew-question route, English-question route} × {desktop
1440×900, mobile portrait 390×844, mobile landscape 844×390, tablet 768×1024} ×
{motion, reduced motion}. In each cell, run one wrong-and-retry in a squad
round, one boss round with a decoy hit, one correct with regroup and one
walk to the next place (rev 3; *was* one advance), and check that
nameplates, chips, banner, objective marker and minimap are readable, that
chip badges match the soldiers, and that chip order matches the soldiers
left to right from the anchor. Across the matrix
(not per cell), also check:

- side-by-side with `mockupA_squad.png` and `mockupB2_split_subtle.png` in
  `base` (daylight compound, yellow sheds, deck, grass, water tower, rifle
  bottom-right, joystick left, fire cluster right, minimap top-right);
- pointer lock (Start, Esc, Resume) and cursor fallback with edge-pan;
- touch look + fire + joystick multi-touch;
- keyboard-only completion of a place **and the walk to the next one**
  (Tab → chip + Enter, and 1–4; ←/→ + W, or `G`/Tab → **קדימה**), with
  Enter never double-firing;
- **(rev 3) a child-test of the map:** one first-time player aged 7–10 (or
  an adult who has not seen the map, recorded as such) plays the whole lap
  on a phone without help; record every moment they stop to look for the
  way, try to walk into a blocked area, or ask what to do; the aim is zero
  "I'm lost" moments with the objective marker, chevrons and **קדימה**.
  The same session records whether the child shoots at a crouched
  soldier that is partly visible from a fight-box edge but not hittable
  (§5.1 "Seen while hidden") and whether that confuses them; if it does
  more than once, the fight box is narrowed toward the core (a config
  change) before the slice gate;
- (rev 3) comfort: 5 minutes of continuous walking/turning on a phone and
  on desktop with no head bob and no complaints about the centre-view
  assist; sprint and
  autopilot speeds feel neither sluggish nor dizzying;
- 150% and 200% browser zoom (Ctrl +) and 200% OS/browser text size on
  desktop;
- tab switch / app background during `wrong`, `correct`, `regroup`,
  `roaming` (mid-autopilot) and `advancing` (timers and walking freeze and
  resume correctly);
- resize/rotate during `engaging`, `roaming` and `advancing`;
- **frame rate on a real phone (rev 2.1):** one squad round, one boss
  round and one walk between places (rev 3: including the containers
  place, which shows three detail chunks) on at least one real mid-range
  phone in portrait
  and landscape, recording the FPS monitor's tier and any downgrade; if no
  phone is available, desktop Chrome with 4× CPU throttling at 390×844,
  recorded explicitly as a weaker proxy (the automated gates of §12.3
  check 17 are not evidence of frame rate);
- the long-answer and `מה פירוש המילה: apple?` fixtures by eye in `base`
  and `dark`, both text sizes;
- route-away mid-walk and mid-lap-wrap;
- reload mid-run (restarts in the yard with every gate closed; engine
  progress preserved);
- service-worker freshness after the `CACHE_NAME` bump;
- an offline run after the first visit (assets precached).

Record exactly what was run, per AGENTS.md. Per the user's preference, back
visual claims with real screenshots (the `visual-verify` skill or the browser
test artifacts).

### 12.5 Regression suites and gates

- `node --check` on each changed file separately, because `node --check`
  checks only its first argument:
  `for f in games/strike-ops.js tester.js apps.js groups.js service-worker.js tests/strike_ops_test.js tests/strike_ops_browser.cjs tests/shared_group_test.js; do node --check "$f" || exit 1; done`.
- `git status` shows no `package.json`, `package-lock.json` or `node_modules`
  in the repo (Playwright stays under `%TEMP%\strike-ops-pw`).
- All Node suites in §12.2 with zero failures.
- The browser test plus the existing `tests/hexkeep_campaign_browser.cjs` as a
  shared-group smoke.
- `git diff --check`.
- `git diff tester.js` shows only the two additive hunks plus the
  pre-existing LearnBox edit. The balloon region is unchanged
  (`git diff -U0 tester.js | grep '^@@'` shows no hunk inside ~1787–3289).

---

## 13. Risks, assumptions, and acceptance

- **Main technical risks:**
  - **Scene cost.** Measured (§6.2): 49 calls with merged statics, 123–126
    without, against a < 120 gate. Mitigation: mandatory static merging
    with the manual de-index (unit test 11), per-kit material sharing, the
    LOD enemy file on tiers 0–1, hidden enemies invisible, ≤ 4 enemies,
    measured gates (browser check 17). Residual: tier 1, boss effects and
    two-zone transitions have no sourcing baseline yet, and headless
    measurements do not prove phone frame rate (§12.4 real-device check).
  - **r128 geometry pitfalls.** `toNonIndexed()` corrupts the interleaved
    Kenney/KayKit meshes and raw arrays skip de-normalisation. Mitigation:
    the prohibited path is named in §6.2 and pinned by a control assertion
    in unit test 11.
  - **Model swap breaks clips.** Mitigation: the role → clip map with
    documented fallbacks, validated at load (unit test 8); a fully
    procedural soldier if the GLB fails.
  - **Foot sliding without a strafe clip.** Mitigation: facing-travel
    locomotion with speed-matched `timeScale` and a validated bound (§5,
    §6.1). Residual: `clipSpeeds` must be measured once from the Hazmat
    clips before zones are authored.
  - **Render-mode switches reopening answers** (the revision-1 slice's
    `enterFallback()`). Mitigation: `renderMode` separate from `phase`,
    the resume target rule, and only `arriveRound`/`unlockRetry` may open
    the lock (§4; unit test 9 DOM continuation, browser check 20).
  - **Stale graphics work after context loss.** Mitigation: the graphics
    generation, cosmetic-timer cancellation on loss and disposal of late
    load results (§4, §10; unit test 9, browser check 20).
  - **Answer pairing with free movement** (answer chip k not matching
    soldier k once the player moves or turns). Mitigation (rev 3): the
    index-bound badge on soldier, plate, minimap dot and chip; the
    player confined to the fight box during encounters, where the
    lane-order invariant is validated (gap ≥ 4°); plates laid out in their
    current screen order; the answer row forced LTR and never reordered
    (unit tests 1, 6 and 15, browser checks 2, 4 and 14).
  - **Getting lost / stuck between places (rev 3).** Mitigation: one
    linear route with one entry and one exit per place, blocked enemy
    sides and closed gates (validated by flood fills), the objective
    marker with edge arrow, chevrons, the minimap route, place toasts, the
    objective line, and the **קדימה** autopilot; manual child-test
    (§12.4). Residual: children may still explore cleared places; nothing
    happens there, and the marker always points back.
  - **Collision feel** (snagging on corners, tunnelling, invisible walls
    in odd places). Mitigation: axis-aligned colliders only (headings are
    multiples of 90°), sub-stepped sliding resolution with unit and
    browser tests (unit tests 4 and 15, browser check 29), invisible
    blockers only where a tape line or wall is drawn.
  - **Motion comfort** in a free-roam first-person view for children.
    Mitigation: no head bob, no camera roll, capped turn rates, gentle
    acceleration, reduced-motion instant cuts; manual comfort check.
  - **Whole-map cost** (more statics than one zone). Mitigation: chunked
    merging, detail chunks only for the current and adjacent places,
    frustum culling of merged chunks, measured gates at every place and
    roaming view (browser check 17); residual: the containers place shows
    three detail chunks and must be measured on a real phone.
  - **An untimed learning-adjacent phase** (`roaming` waits for the
    player). Mitigation: it opens no lock and generates nothing; the
    question was generated and checked at transition start; DOM mode and
    render-mode switches give it a timer; pause/loss freeze it (unit test
    9, browser checks 13, 20, 24).
  - **Exactly-once in boss rounds** (several copies, dissolve animations,
    one shot near two copies). Mitigation: one enemy per shot, the
    synchronous `attemptLocked`, and `answer()` as the only reporter (unit
    test 9, browser check 8).
  - **Portrait overlap** of controls and the learning plates. Mitigation:
    CSS-grid layout in normal flow with media-query orientation (no JS
    class race) and measurement after layout (§6.6, browser check 15).
  - **Context-loss restart** (revision-1 route-replace bug). Mitigation:
    `restartInPlace()` with no router calls, unchanged frozen timers (only
    the graphics generation changes) and a rebuild from the transition
    snapshot (§4, browser check 20).
  - **WebGL context exhaustion** across replays. Mitigation:
    `forceContextLoss()` and canvas removal, plus browser check 26.
  - **Pause/timer races.** Mitigation: pausable phase timers guarded by run,
    question token and expected phase (unit test 9, browser check 13).
  - **Discarded initial redirect** (`created()` ignores `reloadProgress()`,
    and route changes can be async under the LearnBox guard). Mitigation:
    the `checkProgress()` / `_so.navigated` guard before any allocation
    (browser check 22).
  - **GPU leaks across rounds and zones.** Mitigation: three disjoint
    lifetimes, skeleton disposal, and registries that drop retired items.
  - **Skinned meshes bound to the wrong skeleton** if the rebind is skipped
    (a silent bug: every soldier follows soldier 0). Covered by unit test 8.
  - **Pointer lock in headless and iframe contexts.** Mitigation: cursor-aim
    with edge-pan, and tests that tolerate either mode.
  - **SwiftShader speed** under fake-clock runs. Mitigation:
    `setRendering(false)` and `setQuality(0)` in long loops.
  - **Base `created` ordering** and **Vue reactivity on THREE objects**:
    `beforeCreate` initialization and the `_so` namespace (§4).
  - **The `reloadProgress()` news redirect mid-zone** interrupts the run.
    Acceptable in v1; `presentNewItems` is a later extension.
  - **Fake-clock and GLTF loader interplay.** Loads are not timer-driven, so
    tests poll with `runFor` until `phase !== 'loading'`.
  - **Test tooling outside the repo.** Playwright lives in
    `%TEMP%\strike-ops-pw` with `NODE_PATH`; the msedge channel needs a
    system Edge.
- **Main visual risks:**
  - not matching the mockups' painterly richness. Mitigation: the sourced
    Kenney kits with the yellow shed palette, real ground textures, the
    mockup comparison in §12.4 (the sourcing composite screenshots are the
    first reference), warm daylight with one real sun shadow, foreground
    grass at tier ≥ 1, haze; the user reviews `base` screenshots at the
    slice gate;
  - style mismatch between the Quaternius toon soldier and the Kenney
    kits. Mitigation: shared tint palette and lighting (the composite
    showed them reading together); the model is swappable by config;
  - nameplate clutter and long answers on narrow screens (mitigated by
    two-tier plates, marker collapse, lane spacing and the stacked
    full-text answer list);
  - small soldiers in portrait (mitigated by the derived framing, lanes
    ≤ 9 m and the ≥ 56 px gate);
  - `dark`/`space`/`code` too dim to read soldiers (mitigated by the
    hemisphere fill floor, the lifted `Trim` tint and the measured contrast
    check);
  - a shooter fantasy too martial for children (mitigated by the
    laser-tag/foam framing, a cartoon knockdown with stars instead of a
    death, no blood or gore, no player damage, no fail state).
- **Safe assumptions chosen:**
  - free roam on one small four-place compound map with encounter
    boundaries, enemies that never follow, and gates that open on clearing
    (§3 Movement model, §5.1; user request, rev 3);
  - every slice place uses the validated `LINE4` arena (the built yard
    layout), placed at a different position and heading with different
    cover kinds and surroundings;
  - boss round = the 4th round of every place (every 4th question): 3 squad
    rounds + 1 boss round per place, 16 rounds per lap, then a lap wrap to
    the yard;
  - answer pairing by index-bound badges plus validated left-to-right
    order in the fight box; the DOM answer order never changes;
  - walk 3.0 m/s, sprint 4.2 m/s (roaming only), 2.4 m/s in a fight box; no
    head bob; no jumping; the ground is flat;
  - guidance by objective marker, chevrons, minimap route, toasts and the
    **קדימה** autopilot (which is also the accessibility path between
    places);
  - a dissolved decoy re-forms after the retry lock and stays answerable
    (MCQ parity: options never disappear on retry; manager decision, kept);
  - a correct tag is a cartoon knockdown using the model's `Death` clip
    (manager decision);
  - an isolate spans only the opposite-direction words (and neutrals
    between them); a Hebrew sentence's own final `?` stays outside it and
    renders at the far left (`?apple :המילה פירוש מה`; manager override,
    built, §8; *was* `apple?` inside the isolate);
  - no player HP; enemy fire is cosmetic foam that never reaches the
    player;
  - minimap = 2D canvas, player-up, a pre-rendered compound layer plus
    gates, route, objective and enemy dots, no answer text; a north-up
    full-map overlay outside encounters;
  - cosmetic ammo `30/120` with auto-reload; one weapon slot in the slice;
  - semi-auto fire; visual-only spread (full scope); no yaw clamp (rev 3;
    *was* ±100°);
  - HUD positions physical (not mirrored); the answer row forced LTR;
  - sourced CC0 outdoor props and enemy (§6.4, ≈ 1.25 MB runtime), with
    only the sky, hills and effect textures procedural;
  - the obsolete Factory Kit files under `assets/strike-ops/models/` and
    `RobotExpressive.glb` leave the game (manager decision: replaced);
  - menu `name`/`title` strings unchanged (manager decision);
  - no game-specific persistence, settings included (manager decision);
  - reduced motion never changes learning timings;
  - touch Start enters fullscreen without an orientation lock.
- **Known repository issues explicitly not in scope:**
  - `knowledge-defense` overrides `reloadProgress()`. Strike Ops does **not**
    copy that override.
  - The balloon shooter's `this._g` naming.
  - Pre-existing uncommitted LearnBox edits and untracked
    `assets/scribble/`, `assets/word-quest/`.
  - **The root Vue `created` error (rev 2.1).** `tester.js` (≈ line 10234)
    declares the root `new Vue` instance's `created` as an **object**
    (`created: { username: function () {…} }`) instead of a function, so
    Vue throws `TypeError: handler.call is not a function` when it calls
    the hook on every page load. It is present on clean `HEAD` since
    commit `384924d` ("Display user name"), is unrelated to Strike Ops, and
    is not fixed here (`tester.js` gets no rev-2 change, and the file has
    unrelated uncommitted edits). The browser test tolerates exactly this
    error by message **and** origin, reports it separately, and fails on
    any other page error (§12.3 error gate).
- **Acceptance criteria:**
  1. The full learning loop works on `0_4_8` and `grp-ch51-8` in squad and
     boss rounds: correct and wrong are reported exactly once per accepted
     hit (a decoy hit is exactly one wrong answer), retry keeps the
     identical question, and completion and news routing are engine-owned.
  2. Hidden or dissolved enemies can never be answered. Exposure is equal
     across options; magnetism is equal and never passes through cover.
     Nothing in presentation reveals the real boss copy before the hit.
  3. Answer chip k always carries the same badge as enemy k, and inside the
     fight box chip k matches the k-th enemy from the left, in RTL and LTR
     content, in squad and boss rounds, at every tested viewport and from
     every fight-box position.
  4. Keyboard-only (unforced), touch-only and mouse paths can each clear a
     place and reach the next one. Enter/Space never double-act. The
     joystick is optional in encounters, and **קדימה** replaces it between
     places.
  5. The `base` look matches the approved mockups (daylight compound,
     yellow sheds, deck, grass, water tower, rifle bottom-right, left
     joystick, right fire cluster, minimap top-right, top-centre banner,
     counter + stars top-left), confirmed by the user from screenshots.
  6. All `themeOptions` keys are readable (contrast checks pass) in every
     viewport of the matrix, at 150%/200% zoom, in RTL and LTR content, with
     and without reduced motion. No HUD element overlaps another in
     portrait or landscape. Reduced motion leaves learning timings identical.
  7. Mobile budget (all passes summed): tier 0 and tier 1 steady state at
     every place, every roaming view and the walking/lap-wrap peak < 120
     draw calls; tier 0 steady < 80k and peak < 100k triangles; ≤ 4
     animated enemies on mobile; detail chunks only for the current and
     adjacent places. Navigation mid-animation
     leaves no RAF, `AudioContext`, pointer lock, WebGL context, GPU registry
     entry or listener behind.
  8. Pausing in any feedback or transition phase freezes and later resumes
     the remaining delay exactly once. The loop completes in the DOM render
     mode and with rendering off. A redirect at startup allocates nothing.
     Context loss → **התחלה מחדש** ends in the frozen playing phase on the
     same route, and no render-mode switch (DOM continuation, failed
     restart) ever reopens an accepted answer or skips a pending timer.
  9. Every same-origin request is precached (including the Kenney
     GLBs' relative textures); there are no URL fallbacks; the obsolete
     `assets/strike-ops/models/` files are gone and the credits list every
     sourced file.
  10. All Node suites and the browser test pass with zero failures. The
      balloon shooter and every existing id are unchanged. Assets are
      precached and `CACHE_NAME` is bumped. No Playwright or npm files are
      in the repo.
  11. Answer text is never truncated: plates show full text or a marker,
      and the answer list always shows every option in full at ≥ 14 CSS px
      (scaled with text size). The `מה פירוש המילה: apple?` fixture renders
      as specified in §8 (`?apple :המילה פירוש מה`, the built override).
      Portrait framing meets the §5 size gates.
  12. **(rev 3) The map:** the player can walk the whole lap (yard →
      containers → sheds → plaza → lap wrap) with collision, gates that open
      only when a place is cleared, encounters that start on entering a
      fight box and keep the player inside it, the objective marker,
      chevrons, minimap route, place toasts and **קדימה** working in every
      theme, both directions and reduced motion; the map numbers equal
      §5.1 (unit test 12); the user approves the plan image and `base`
      screenshots of all four places.

---

## 14. Vertical slice vs. full scope

| Area | Vertical slice (ship first) | Full scope (after the slice gate) |
|---|---|---|
| Registrations | `0_4_8` (QUESTION) and `grp-ch51-8` (+ `0_48` link + the `shared_group_test.js` identity lookup) — already in place | **All** remaining §11.3 rows: `0_33_0_6`, `0_33_1_6`, `0_34_0_2`, `0_34_1_2`, `0_45_9`, `1_11`, `grp-ch51s-8`, `grp-otiot-12`, `grp-g611-14`/`grp-g611h-14`, `grp-g6p*-7` (+ test-count updates) |
| World (rev 3) | **The full small map** (§5.1): four places — yard, containers, sheds & deck, water-tower plaza — joined by three opening gates and dirt paths, 46 × 68 m, built once from the sourced kits and merged into structure/detail chunks; each place uses the validated `LINE4` arena with its own heading, cover kinds and surroundings; walls, tape lines, collision, the lap wrap; the backdrop with the water-tower landmark. *Replaces* revision 2.1's single looping zone | A fifth place or alternative arena layouts per place, per-theme prop variations, flag/bush/bird ambient life, an exploration bonus (e.g. hidden badges in cleared places) |
| Movement and guidance (rev 3) | Free walking (joystick/WASD, ←/→ turning, optional sprint), collision, fight-box encounter boundary and triggers, objective marker with edge arrow, chevrons, minimap with route, place toasts, objective line, **קדימה** autopilot (`KeyG`), full-map overlay (`KeyM`, pause panel) | Settings for walk speed and look sensitivity (in-memory only) |
| Enemies | Squad of ≤ 4 Hazmat soldiers (`enemyModel`, LOD file on tiers 0–1; lane tints, states hidden/peek/exposed/dash/hit/down, cartoon knockdown), procedural fallback soldier | `Walk_Shoot`/`Run_Shoot` variety, per-theme or per-zone model variants, LOD tuning |
| Boss round | **One** boss split round per place (its 4th round, every 4th question) plus `forceBossRound()`; identical holographic copies, decoy flicker/dissolve and re-form, real-copy solidify; winning it opens the next gate | Hologram scanline shader, richer split choreography (e.g. a bigger finale at the plaza), boss voice-line chime |
| HUD | **Full COD-style HUD:** banner (question or objective line), counter + 4 stars, minimap (pre-rendered compound map), ammo `30/120`, fire/ADS/reload, one weapon slot, joystick, nameplates with clamp/de-overlap, badge-paired accessible answer row (or **קדימה** while roaming), objective marker, place toast, engine progress bar | Second cosmetic weapon slot (pistol), settings sheet for sensitivity and joystick side (**in-memory only**) |
| Weapon and feel | One assault rifle, **basic feel**: synth shot, muzzle flash, recoil spring, hitmarker, ADS FOV, foam puffs, knockdown with stars, dissolve; static crosshair | Muzzle point light, tracer, dynamic spread, reload animation and clicks, dust motes |
| Controls | Pointer lock + cursor fallback (edge-pan), WASD + ←/→ turning + Shift sprint, ADS/reload, 1–4 lock-on (by badge), `G` go, `M` map, focus-precedence rules, touch look/fire/ADS/reload + joystick (optional in encounters) + **קדימה** | — |
| Themes | `base` and `dark` polished and reviewed against the mockups; every other `themeOptions` key resolves through the adapter and passes the automated readability checks | All six keys polished (motifs: bunting, floodlights, grid, stars) and reviewed by screenshot |
| Learning | Full MCQ-parity contract in squad and boss rounds; startup guard; pausable phase timers; DOM render mode (from mount, "continue without 3D" and failed restart) that never reopens an accepted answer; restart in place from the transition snapshot; engine news/completion routing | Optional `presentNewItems` overlay keeping the run alive (hexkeep pattern) |
| Accessibility and cleanup | **All gates:** keyboard/touch/mouse (including keyboard-only and switch travel between places via **קדימה**), focus precedence, zoom, RTL/LTR fixtures, badge pairing and left-to-right order, portrait no-overlap, reduced motion (visual-only), live regions, the three-lifetime GPU cleanup (shared / map / round), context loss (including during `roaming`), the offline request audit | — |
| Menus | No menu changes beyond the existing slice entries (strings unchanged, manager decision) | The full-scope registrations above |
| Adventure | Not registered | A `worlds.js` encounter if requested (no component change expected) |
| Tests | `strike_ops_test.js` (§12.2, suites 1–16) + `strike_ops_browser.cjs` (all 34 checks; check 16's visual review limited to `base` and `dark`) | A full-registration integration test, a speech-group browser pass (`ch51s` / `otiot`), multi-lap soak |

The slice gate (from NEW_GAME_WORKFLOW §4): do not add places, extended
effects, theme polish beyond `base`/`dark`, or registrations beyond the
slice until every check in §12.3 and every §12.2 suite passes for both slice
ids **and** the user has approved the map plan image (`map-plan.png`) and
`base` screenshots of all four places (and one roaming view with the
guidance aids) against the mockups.

**Order of the rev-3 slice work** is in §17.4; the first user checkpoint
is the plan image, the second is a walkable grey-box map (the map with
stand-in boxes, before dressing), the third the dressed `base` and `dark`
screenshots.

---

## 15. Vertical-slice implementation notes (revision 1 and revision 2.1, with status)

Notes 1–11 were recorded by the revision-1 slice implementation
(`games/strike-ops.js`, `games/strike-ops.css`, `tests/strike_ops_test.js`);
each carries its status under revision 2, and revision-2.1 changes are
marked **(rev 2.1)**. Notes 12–19 (rev 3) record what the revision-2.1
slice implementation built differently from revision 2.1's text, and its
status at the checkpoint where the user's free-roam request stopped it.

1. **Room layout** — *superseded by zones, principle carried over.* Cover
   stacks sat deeper and every exposed robot stood **in front of** all
   cover; posts gained an optional `via` list so a robot slid around its
   stack's edge and never through a box. With the eye (1.6 m) just below
   the stack top, peeks beside stacks could not keep LOS from the whole
   player zone, so peeks in front of cover made the invariant hold by
   construction. Validation checked every slide-path point, and occlusion
   used the visible body (`aim.body`) rather than the enlarged hitbox.
   Revision 2 keeps `via`, the body-vs-hitbox rule and the "peek in front of
   cover" construction for lane spots and dash paths (§5).
2. **Label anchor above the peek point** — *superseded.* Nameplates now
   follow the enemy (COD style) but stay pinned to the cover spot while the
   enemy is hidden, so text still never jumps while a soldier ducks (§6).
3. **Portrait framing** — *kept in revision 2; superseded in revision 2.1.*
   The slice widened the hip FOV on narrow viewports aiming for a
   horizontal half-angle ≥ 42° (`framing: {minHalfHFovDeg: 42,
   maxFov: 112}`); ADS scaled proportionally; desktop and landscape kept
   75°. Plates collapsed to chips below 600 px width or on overlap. That
   target is unreachable at 390×844 (112° vertical gives ≈ 34°). Revision
   2.1 derives the FOV from the canvas aspect with lanes validated within
   ±28° and ≤ 9 m, adds target-size gates, and makes plate collapse
   fit-based (§5 `framing`, §6).
4. **Tab while pointer-locked** — *kept.* Releases the lock and continues in
   cursor-aim mode without pausing, so the Tab-to-chip path works whenever
   the browser grants pointer lock. Escape and other lock loss still pause.
5. **Root sizing** — *kept.* `position: fixed; inset: 0` (existing game
   pattern); the grid layout of §6.6 lives inside it.
6. **Per-enemy materials grouped by name** — *generalised* into §6.1 step 4
   (one clone per source instance). **(rev 2.1)** now **every** per-enemy
   varying material is cloned (`perEnemyMaterials: 'all'`: Hazmat's
   `Team` and `Trim`), not only tint/visor materials.
7. **Crates** — *superseded.* The slice used the Kenney Factory Kit boxes
   for cover and dressing and did not instance `SHOOTER_MODEL_DATA.crate`.
   Revision 2 drops the Factory Kit files and uses
   `SHOOTER_MODEL_DATA.crate` (wooden). **(rev 2.1)** The crate is merged
   with the other static props; a missing crate falls back to a box
   stand-in (§6.4). The new outdoor Kenney kits (§6.4) are different kits
   from the dropped Factory Kit.
8. **`tests/shared_group_test.js`** — *kept.* It needed a second edit (the
   "both halves" check, §11.2).
9. **API details the spec left open** — *kept unless noted:*
   - `getRenderStats().last.passes` is
     `{shadow: {calls, triangles}, scene: {calls, triangles}, overlay: {calls, triangles}}`;
     shadow draws are measured by wrapping `renderer.shadowMap.render`.
   - `getRobots()` items also carried `exposedCount` — *renamed:*
     `getEnemies()` items carry it too.
   - `debugSnapshot()` included `roomTemplate`, `schedulerMs`, `ammo`,
     `reloading`, `ads`, `lockIndex`, `domOnly`, `rendering`, `camera`
     (`{x, y, z, yaw, pitch, fov, kick, bob}`), `player`, `activeOrigin`,
     `nextOrigin`, `rooms`, `phaseTimers` and `robots` — *renamed:*
     `roomTemplate` → `zoneId`, `rooms` → `zones`, `robots` → `enemies`,
     plus `roundKind`, `roundNumber`, `zoneNumber`, `reserve`.
   - `strikeOpsCloneSkinned(source, THREE?)` returns `{root, skeletons, map}`.
   - Theme changes are picked up from the inherited `theme` data (watched),
     every 500 ms in the frame loop, or by calling `refreshTheme()`.
   - Room 1 used `rooms[1 % 2]` (`corridor`) per the `roomNumber %
     rooms.length` rule — *superseded* by `zonePlan` order (§5).
10. **Notes for the browser test (§12.3)** — *kept:*
    - Headless Chrome grants pointer lock on Start; while locked, Chrome routes
      every mouse event to the canvas, so DOM buttons cannot be mouse-clicked
      until Tab (or Escape → Resume) releases it. Use Tab, keyboard
      activation, taps or `element.click()`.
    - Phaser creates one WebGL context at page load (feature probe), so the
      "no WebGL context" and "one live context" counts must start when the
      route is entered.
    - `exposureMs` accumulates from the scheduler clock 0. It is exactly
      equal per enemy over whole periods; over an arbitrary 33 s window the
      partial period can skew the totals by up to ≈ 9 % (n = 4). Compare
      over whole periods, or against `strikeOpsSquadAt` using
      `debugSnapshot().schedulerMs` (this applies to §12.3 checks 3 and 19).
    - `page.clock.install()` keeps time flowing in real time between
      `runFor` calls; tight timer margins need `pauseAt`.
    - The game's own `console.error`-free run still shows pre-existing home
      page console errors (LearnBox `/api/v1/child/me` 404 and a root-hook
      `handler.call` error); they are not from this route. **(rev 2.1)**
      The `handler.call` error is the root `new Vue` `created` declared as
      an object (`tester.js` ≈ 10234, since commit `384924d`); it is listed
      in §13 as out of scope and tolerated only by the narrow matcher of the
      §12.3 error gate.
11. **Known slice bugs** — *fixed by revision 2* (§16.3): answer-strip order
    in RTL, portrait measurement race, context-loss restart via the router.
    **(rev 2.1)** adds the `enterFallback()` lock reopening, the indoor
    `C.rooms[0].posts` dependency in `create()`, the unguarded cosmetic
    work after context loss, and the `?apple` banner reordering (§16.3;
    **rev 3:** reclassified by the manager override of §8 — the
    sentence-final `?` at the far left is the expected rendering).
12. **(rev 2.1 slice) Hide occlusion body.** Hide points are checked with
    `aim.crouchBody` `{w: 0.7, d: 0.5, h: 0.6}` (the crouched visible body
    behind 0.85 m low cover), because the yard's peeks are in place
    (crouch → stand, `hide == peek`). Kept; §5 `aim`.
13. **(rev 2.1 slice) Boss patrol and split.** `patrol: {legM: 0.8,
    walkMs: 450, pauseMs: 1550}` keeps the 4 s cycle while the patrol leg
    fits the `Walk` speed band; `splitSpreadM: 1.0` lets copies separate
    from the boss body by up to 1 m toward their lane before gliding at run
    speed (the outer lanes otherwise exceeded ×1.35). All copies patrol in
    the **same phase** (the per-copy phase was a visual tell in browser
    check 8/16). Kept; §5 `boss`, boss scheduler.
14. **(rev 2.1 slice) Approach timing.** The approach jog and the split
    glide run at clip speed and **start late** so that they arrive exactly
    at the window's end, instead of stretching over the whole window.
    Kept.
15. **(rev 2.1 slice) Clip speeds and bone name.** Measured `clipSpeeds`
    `{move: 2.16, run: 4.43}` m/s. r128 `GLTFLoader` sanitises node names,
    so the `Index1.R` weapon bone loads as `Index1R`; the config keeps
    `Index1.R` and the loader-side lookup sanitises it the same way. Kept.
16. **(rev 2.1 slice) First peek cycle.** Cycle 0 of every soldier never
    dashes (a dash cycle is `cycle mod relocateEvery = relocateEvery − 1`),
    so the first peek is always in place. Kept.
17. **(rev 2.1 slice) Single-zone loop.** The looping `advancing` reused
    the live zone instead of building a duplicate. *Superseded by rev 3:*
    the map is built once and nothing is built or retired at transitions
    (§5, §10).
18. **(rev 2.1 slice, manager override) Bidi.** Trailing sentence
    punctuation stays outside the isolate (`?apple :המילה פירוש מה`).
    Recorded in §8 and unit test 6 / browser check 14 by rev 3.
19. **Checkpoint status (rev 2.1 slice, when stopped for rev 3).**
    `node tests/strike_ops_test.js` 32 passed; `adventure_core_test` 82/0;
    `shared_group_test` 62/0; `offline_assets_test` and
    `service_worker_test` OK; `git diff --check` clean. Browser checks
    1–15 passed with a working copy of the test that seeds weights 10; the
    repository test seeds 50, which the engine clamps to 15, so its checks
    6–9 fail (**test bug**, fix with the harness note in §12.3). Check 16
    failed on the boss visual tell, fixed by the synchronised patrol but
    **not re-run**; checks 17–27 were **not run**. Not browser-verified:
    the synchronised patrol, the non-dash first cycle, the `soldiers`
    theme tints. CSS, `STRIKE_OPS_ASSETS`, `CACHE_NAME` v229, credits,
    `ASSET_LICENSES.md` and the `GAME_ARCHITECTURE.md` row are done.

Notes 20–32 (rev 3.1) record what the free-roam implementation up to the
§17.4 grey-box checkpoint (steps 1–3) built differently from, or in more
detail than, the text above.

20. **(rev 3.1 grey-box checkpoint, §17.4 steps 1–3) Validation split.**
    `createStrikeOpsComponent` runs `validateStrikeOpsConfig(C, {quick:
    true})` (≈ 40 ms): every arena, timing, map-bounds, gate, wall-gap,
    sightline, clearance and route-leg check, but not the pre-clear flood
    fills and the routing-from-anywhere sweep (≈ 1 s), which the Node
    suite runs (`validateStrikeOpsConfig()` with no options; `{routing:
    false}` skips only the sweep). Arena-local checks run once per distinct
    arena (every slice place shares `LINE4`).
21. **(checkpoint) Grid fallback.** The §5.1 step-4 search is a Dijkstra
    field from the goal cell, cached per map state and goal (an A* with an
    exact heuristic): same 0.25 m grid, octile costs, no corner cutting,
    neighbour order E, NE, N, NW, W, SW, S, SE with ties by that order, then
    the same string-pull. Deterministic, and a whole-map sweep costs
    ≈ 0.4 s instead of ≈ 17 s.
22. **(checkpoint) Capsule-clear segments** use the exact (rounded-corner)
    distance to boxes, not `check.js`'s inflated AABB, so grid cells hugging
    a corner connect; route legs still keep ≥ 0.05 m and pass validation.
    Route connectors use `radius − 0.02 m` so a player resting against a
    wall can always join the graph.
23. **(checkpoint) One dressing list.** The yard's built dressing moved
    into `map.structures` (map frame; `h`, `ry` and shed tiling kept as
    dressing hints) and `yard.props` is empty, so nothing is listed or drawn
    twice. Backdrop outer trees that stood inside the new regions moved
    outside the walls; the backdrop draws the water-tower landmark at
    (−14, 50) (its map structure, `landmark: true`, is a collider only).
24. **(checkpoint) Grey box.** Walls, structures, decks, gates and the
    tape line are stand-in boxes/cylinders with theme-derived colours (one
    adapter, `greyColor`); cover keeps the `coverKinds` kit pieces (stand-ins
    on kit failure). Each place is merged into a structure chunk and a
    detail chunk (+ one tape mesh, hidden once cleared); detail chunks are
    shown for the current place and its neighbours. Kit dressing, signs and
    chevrons are step 4/5 work. The tape sits 0.4 m high on 0.47 m posts so
    it stays under the anchor view at desktop aspects.
25. **(checkpoint) Movement feel.** The velocity follows the wanted
    direction at once and only its speed ramps (accel 10, brake 14 m/s²),
    so sliding along a wall keeps the tangential speed. The autopilot moves
    to the next route point within 0.2 m (or once past it within 0.6 m),
    eases out over the last 0.6 m and turns ≤ 180°/s; it re-routes after a
    1 m push off the route or a map-state change. Measured: Go from the
    yard / containers / sheds reaches the next fight box in ≈ 6–9 s.
26. **(checkpoint) `skipToZone` in `engaging`** sets `roundInZone =
    bossRoundIndex − 1` (the next round is the boss round, as §12.1's text
    and browser check 8 expect; the 2.1 code had used `roundsPerZone − 1`).
    A roaming retarget to place 1 keeps roaming toward the yard (no lap
    wrap); a regroup retarget re-embodies the held question as round 1.
27. **(checkpoint) Window `blur`** releases held keys, sprint and ADS but
    does not pause (it fired spuriously in embedded and test browsers);
    `visibilitychange`, Esc, pointer-lock loss and the pause button pause
    and run the full `releaseInputs()`.
28. **(checkpoint) API details.** `getMap()` also reports `playBounds`;
    its `objective` is `null` and `route` is `[]` outside `roaming`;
    `getPlayer().inFightBox` refers to the current (or target) place's fight
    box. During the lap wrap the objective line reads `סבב N — חוזרים אל
    החצר הצהובה`. The minimap compound layer and route, the objective
    marker with its edge arrow, the place toast, the full-map overlay and
    the plain **קדימה** button are built in a basic form now because the
    checkpoint needs them; their polish (and chevrons, signs, squad styles,
    gate voices, footsteps) stays in step 5.
29. **(checkpoint) Status.** `node tests/strike_ops_test.js` (suites
    1–16, 42 tests) passes; `adventure_core_test` and `shared_group_test`
    pass. Browser checks 1, 2, 8, 13, 28, 31, 32, 33 and 34 pass (check 2
    once timed out on `root mounted` in a multi-check run and passed alone);
    check 29 fails only on its slide assertion (note 32); checks 3–7, 9–12,
    14–27 and 30 were not run at this checkpoint. The home page shows a
    pre-existing, unrelated page error
    (`Cannot read properties of undefined (reading 'scope')`, `tester.js`
    line 5) besides the §12.3 baseline.
30. **(checkpoint) Stars and the lap wrap.** The stars reset to 0 in the
    `beginTransition` step that increments `lap` (staged with the
    counters, §2); `applyLapPose()` only refreshes their display, so the
    counters seen during the wrap's first half already read 0.
31. **(checkpoint) `getEnemies()` samples the present.** It redraws the
    enemies' effect state at the current time (`updateEnemies(0)`, no
    animation advance) before reporting, so a fade or dissolve that ends
    between two RAF frames is reported as ended (browser check 8's 460 ms
    read-out was otherwise frame-alignment dependent).
32. **(checkpoint) Browser check 29, test geometry.** Its 30° push starts
    at the middle of the west container's 2.4 m north face; with the §3
    speeds (walk 3.0 m/s) and the unit-4 slide rule (≥ 80 % of the
    tangential speed kept) the capsule slides ≈ 1.4 m/s and rounds the
    corner within the asserted 1 s (simulated: +1.58 m, ending at z 26.94 <
    27.29). The movement is as specified; the check needs a longer face
    (e.g. the 6 m east face) or a shorter tick.
33. **(§17.4 steps 4–6) Dressing.** `buildMap()` now draws the kit art:
    fence walls are tiled with `fence.glb` (1.15 m), perimeter hedges with
    `hedge-large.glb` (1.6 m, grown outward so the walkable face is the
    wall's), and the container-row walls with Kenney containers from an
    authored cosmetic list `STRIKE_OPS_CONFIG.dressing` (row slots whose
    inner face is the wall's walkable face, plus a few stacks outside the
    yard; never colliders; unit test 17 checks that no slot stands in
    walkable space). Sheds are fitted to their structure boxes (door side
    south), decks are `planks.glb` tiles, stone walls `wall-block-half.glb`
    tiles. A piece wholly inside another solid structure (the sheds' crate
    inside the (11, 35) container) is not drawn. Gate poles, gate frames,
    the arch signs, the striped tape and the cones are procedural boxes
    sampling one 512 px canvas atlas (four sign rows + a swatch palette),
    so they share **one** material and merge.
34. **(steps 4–5) Signs and chunks.** Each place's sign (§5.1 flavour) is
    the arch board over its **entry gate** (the main gate g0 carries
    `מתחם האימונים`), facing the approaching player; it lives in the gate's
    structure chunk, merged with the poles (0 extra calls instead of the
    spec's +1 in the detail chunk). Per place: structure ≤ 5 merged meshes
    (fantasy, shed, industrial, survival, procedural), detail ≤ 6 (crate ×2
    materials, survival, barricade, fantasy, deck), tape 1, and grass 1 — a
    separate merged group so the detail chunk stays ≤ 6; the tier cap
    (0/8/18 clumps) is a draw range on it. Floodlight cones (night themes
    only) are one additive mesh for the map.
35. **(step 4) Visibility.** `updateCulling()` runs on a place change, a
    tier change or ≥ 2 m of movement (not per frame): detail chunks of the
    current place and its chain neighbours; at tier 0 also by the distance
    to the place's region (shown < 30 m, hidden > 34 m). Tier 1 casts sun
    shadows only from the current and adjacent structure chunks (tier 2:
    all). `getRenderStats().cpu` reports `collisionMs`, `routeMs`,
    `minimapMs`, `cullMs` ({avg, max, samples}) since `resetRenderPeak()`.
36. **(step 5) Framing.** `framing.hipHalfHFovDeg` is **32°** (was 36°):
    exactly `laneMaxAngleDeg` + the 4° margin, so every lane stays on screen
    while soldiers grow ≈ 12–16 % in portrait (390×844: vfov 107.0°, under
    the 110° cap, farthest standing soldier ≈ 67 px; 540×960: vfov 96.0°,
    ≈ 93 px; 1440×900: hHalf 32°; 844×390 unchanged at the 40° floor,
    hHalf 38.2°, ≈ 115 px). Unit test 1's worked numbers were updated; the
    browser check derives them from the config. The small look in the
    stage-A portrait shots was the part above cover (≈ 40 px); head-to-feet
    already passed the 56 px gate.
37. **(step 5) HUD.** The banner is a compact plate (2 px gold frame, gold
    top notch, ≥ 240 px, centred in portrait instead of stretched). Content
    questions that contain the app's `audio-prompt` buttons rendered them
    as a nested bordered panel; inside `.so-question` they are now a
    highlighted word (no border/background, still ≥ 44 px targets). The
    deploy line shows 1.6 s as `.so-subline` under the question
    (`.so-banner-main` wraps both). The full-map overlay is one column (map
    + a row of place pills; a row layout at low height), removing the empty
    side panel.
38. **(step 5) Flavour.** `strikeOpsSquadStyle(zone)` /
    `strikeOpsVolley(style, cycle, index)` (pure, unit test 17): the volley
    draw is deterministic per cycle × soldier against the place's chance;
    `exposedIdle: 'shoot'` widens the volley window to 0.8–3.0 s of the
    exposed time (else 1.3–2.3 s); the sheds' `Wave` plays on cycle 0 at
    0.3–1.9 s of the exposed window (skipped under reduced motion); the
    plaza's boss stage gets an additive spotlight decal during its boss
    round. Gate voices `boomHigh` / `boomLow` / `swing` play on the exit
    gate, then the chime 0.35 s later; the plaza's `fanfare` stays the lap
    wrap. Footsteps (0.45 s walking / 0.33 s sprinting) and one soft thud
    per wall contact play only while the AudioContext is running.
39. **(step 6) Themes (one adapter).** `scene.kitTint` multiplies the shared
    kit materials (white by day; darker in `space`/`dark`/`code`, so the
    soldiers stand out); the sheds are recoloured per theme on a canvas copy
    of the shed palette (siding → `shedSiding`, trim → `shedTrim`; `base`
    keeps the original texture) instead of multiplying yellow; clouds dim,
    a moon sprite appears and the floodlight towers (outside the walls, in
    every theme) show their light cones only when `nightLights`; the
    minimap layer uses `scene.mapGround/mapPath/mapWall/mapStructure`;
    `--so-objective` is the theme focus colour. All six keys re-tint live
    (browser check 16).
40. **(step 5) Horizon band.** When the scene band between the banner and
    the answer row no longer holds the canvas centre (the stacked answer
    list in a short portrait such as 360×780 with long labels), `measure()`
    sets `horizonDy` and the camera gets a vertical view offset that puts
    the projection centre at the band's centre; the crosshair, `aimPoint()`
    and `shootEnemy()` use the same point, so rays and lock-on stay exact.
    Otherwise no offset (every other layout is unchanged).
41. **(step 5) Go button size.** `.so-go`'s 56 px minimum lost to the
    generic `.so-game button` rule (48 px); the rule is now
    `.so-game .so-go`. In `roaming` `getLayout().answerTextPx` reports the
    Go label (the control that holds the answer row) instead of 0. A touch
    on **קדימה** acts on `pointerup` (a tap while another finger is down may
    never become a click; the following click is swallowed), the joystick
    releases its pointer capture on `pointerup`, and a root text-size change
    (inline style or the counter's ResizeObserver) re-measures plates and the
    answer layout.
42. **(step 4) GPU warm-up.** `prewarmMap()` renders the map once at load
    with every chunk visible and frustum culling off, so revealing a chunk
    while walking uploads no buffer (browser check 17's "walking builds no
    geometry"). Tier 1 casts sun shadows only from sheds, container walls
    and cover materials (`userData.casterTier`); fences, hedges, trees,
    rocks and poles cast from tier 2 — this keeps the tier-1 roaming peak
    under 100k triangles.
43. **(review) Learning markup is sanitized.** The engine's other games bind
    `render()` output straight into `v-html`; Strike Ops instead passes every
    markup string through `strikeOpsSafeHtml()`: text is escaped, only the
    `render()` vocabulary plus simple inline formatting survives (`img`
    with relative/http(s)/blob/`data:image` sources, `b i em strong u s sub
    sup small mark span bdi br`, class/dir/lang), and an audio or speech
    prompt's inline `onclick` becomes `data-so-audio` / `data-so-say`,
    played from a Vue-bound click on the banner (answers keep the prompt as
    an inert span, as before). Plain text still renders through bidi runs.
44. **(review) Lifecycle hardening.** Loaded kit, crate and gun scenes join
    `so.shared` at load time (`ownTree`), so a context loss or teardown
    before `finalizeKits()` still disposes them; duplicates disposed by the
    finalization leave the set. A restart-in-place that finishes while the
    tab is hidden stays paused (timers frozen) until an explicit resume.
    The root text scale is read at measure time and cached for frames.
45. **(review) Solid night soldiers (§7).** In the night themes (`dark`,
    `space`, `code`) a soldier's Team tint is applied as its linear value
    (reported back in sRGB by `getEnemies()`) and glows faintly in its own
    hue (`squadGlow` 0.3, which keeps the rendered ≥ 3:1 body/background
    contrast of browser check 16 against lit night walls), the visor glow is
    a faint `visorGlow` 0.2 instead of full intensity, and the near-white/pastel lane
    tints were replaced by saturated ones that still meet the 3:1
    ground-contrast and ΔE ≥ 20 rules. Soldiers now read as solid, saturated
    figures, while the boss's copies keep the pale, translucent, pulsing
    hologram look. Day themes are unchanged.
46. **(visual QA) HUD direction and pause map (§6.6).** The desktop key
    hint inherits nothing from the LTR HUD grid: it is an explicit RTL line
    whose keys (`R`, `1–4`) are `<kbd dir="ltr">` isolates, so each key sits
    right before its own action. The pause panel's map is drawn once when
    the phase becomes `paused` (the loop still does not redraw maps while
    paused). In landscape it sits left of the centred pause card, clear of
    the top-right pause/exit column; in portrait it sits under the card;
    in a landscape under 860 px wide or 500 px tall it is hidden (the
    section, and the place list in the full-map overlay, are unchanged).
47. **(visual QA) Night stars (§7).** Stars are one `THREE.Points` dome
    (160 fixed-pixel points, no fog, one draw call, night themes only)
    instead of pixels on the 4 px sky-gradient background texture, which
    is stretched across the view and turned each dot into a streak.
48. **(visual QA) Narrow portrait and long answers (§6.6).** Below 460 px
    wide in portrait the weapon and progress pills take their own row
    above the joystick/fire row (side by side), so the reload button no
    longer covers them; `getLayout().controls` now also reports `ammo` and
    `score`, so the overlap check covers them. When the answer row
    overflows in a short landscape (< 500 px tall, text scale < 1.5) the
    answers use a two-column `grid` layout (chips 1 2 / 3 4) instead of
    the stacked list; enlarged text and portrait still stack. A pinned ▼
    cue marks a scrollable answer list or question while more content
    (for the question: text or an image) remains below. A spoken-word
    button inside the question is word-sized (min 44 px) instead of the
    engine's 72 px `.audio-prompt` disc, which made a one-word question
    72 px tall and clipped it in the 48 px short-landscape banner.
49. **(visual QA) Regroup re-centres; edge-pan needs a moving cursor
    (§4).** A regroup starts the centre-view assist (a cut under reduced
    motion), so the next squad starts on-screen. Cursor edge-pan runs only
    while `engaging` or `roaming`, and after each transition (correct →
    next round, encounter entry) only once the mouse has moved again, so a
    cursor left resting in the edge band after a shot no longer drags the
    view away.
50. **(visual QA) Theme polish (§7).** The `soldiers` lane tints are
    saturated gold, pink, sky and lime (still ≥ 3:1 on the olive ground,
    ΔE ≥ 20; badges use the same values); the roaming banner's top notch
    follows its green border. The portrait framing (soldiers in a
    comparatively narrow band above a large foreground) is unchanged: it
    follows from the lane-fit horizontal FOV contract.
51. **(visual QA) Narrow-portrait answer grid; words never break (§6,
    §8).** On a 360 px phone the four-chip row split words mid-word
    (`איפ/ה`). Answer text now wraps only at spaces (`word-break:
    keep-all`; `overflow-wrap: break-word` only rescues a single word wider
    than a whole chip), and `measureAnswers` treats a word wider than its
    row slot like a row overflow. In portrait the answers use the
    two-column `grid` (chips 1 2 / 3 4, same fixed index order and shared
    number/shape/colour badges) when the view is ≤ 400 px wide or the row
    would break a word, provided every chip fits a grid cell whole (≤ 3
    lines at the 14 px grid size, no word wider than the cell); otherwise
    the stacked list as before (enlarged text still stacks). The grid
    keeps its own HUD row above the ammo/score row and the joystick/fire
    row, and `getLayout().answerItems` reports the grid rects. 540 px
    portrait keeps a row that fits; the 844×390 short-landscape grid is
    unchanged.

---

## 16. Migration from the indoor slice

**Status (rev 3).** This section is the revision-1 → revision-2.1
migration, which the revision-2.1 slice has carried out (§15 notes 12–19).
Its "Revision-2 note" column still describes that step. Wherever it
mentions the pad, the `advancePath` glide, `skipToZone` as a zone loop,
`retireZone` or building the next zone at `advancing`, §17 supersedes it.

The revision-1 slice (`games/strike-ops.js` ≈ 2 400 lines,
`games/strike-ops.css`, `tests/strike_ops_test.js`,
`tests/strike_ops_browser.cjs`) is the starting point. **Edit it in place;
do not start a new file.** Its learning, timing, lifecycle and debug
plumbing largely satisfy §2, §4 and §10 and must survive unchanged in
behaviour, **except** the render-mode, context-loss and counter changes
that revision 2.1 names in §16.2–§16.3; the visual layer is replaced. The
file is large (≈ 166 KB): navigate it with search and small ranges. Function names below are the
slice's current names (found by grep; line numbers drift, so search by
name). `artifacts/strike-ops/` holds `FAIL-*` screenshots from the last
slice browser run, so treat the slice browser test as **not** green and
re-baseline it against §12.3.

### 16.1 Keep (behaviour unchanged; rename only where noted)

| Area | Slice functions / data | Revision-2 note |
|---|---|---|
| Learning loop | `create`, `answer`, `unlockRetry`, `checkProgress`, `isCurrentRoute`, `alive`, `runQuestionAction`, `replayQuestion`, `announce`, `exitGame`; data `question/options/score/questionIndex/questionToken/attemptLocked/wrongOption` | **(rev 2.1)** `create()`: replace `so.stripOnly = this.options.length > C.rooms[0].posts.length` with `so.domAnswerOnly = this.options.length > STRIKE_OPS_MAX_LANES`, and set `roundKind = strikeOpsRoundKind(this.roundInZone, cfg, so.forceBoss)` from counters that `beginTransition` already advanced (§2); nothing else in `create()` changes. `answer(i, token?)` gains the optional token check and its phase guard drops `'fallback'` (DOM mode uses `engaging`). `unlockRetry` cancels leftover dissolve work. Re-verify MCQ order with unit test 9 |
| Locks and timers | `phaseTimer`, `scheduleTimer`, `fireTimer`, `pauseTimers`, `resumeTimers`, `timerRemaining`, `timerProgress`, `getPhaseTimers`, `ownTimeout`, `listen` | Add `deploying`/`regroup`/`advancing` as expected phases; **(rev 2.1)** `restartInPlace()` does **not** change `run` or re-stamp timers (it bumps `gfx`); `ownTimeout` also checks `gfx` |
| Lifecycle and ownership | `beforeCreate` (`_so` init), `mounted` guard, `beforeDestroy` → `teardown`, `releaseGraphics`, `disposeTree`, `onVisibility`, `pause`, `resume`, `focusRoot` | Registries gain `zone.disposables` and `round.disposables` (§10); `_so.gfx` and `_so.transition` added to `beforeCreate`; `resume` uses the resume target rule (§4) |
| Input and aim | `start`, `requestLock`, `onPointerLockChange`, `onPointerLockError`, `enterFullscreen`, `onFullscreenChange`, `fire`, `resolveShot`, `reload`, `toggleAds`, `lockOn`, `cancelLock`, `aimAngles`, `clampLook`, `updateLock`, `isControl`, `onKeyDown`, `onKeyUp`, `lookBy`, mouse/pointer/stick/fire handlers, `onBadge` | `onBadge` → `onChip`; `aimOverRobot` → `aimOverEnemy`; `robotIsHittable` → `enemyIsHittable` (adds `dash` and boss `exposed`); `resolveShot` must return at most one enemy; cursor mode gains edge-pan; ammo becomes 30/120 with auto-reload |
| Pure helpers | `deepFreeze`, colour helpers (`parseHex`, `toHex`, `mix`, `alpha`, `luminance`, `strikeOpsContrast`, `ensureContrast`), `boxAt`, `overlap2d`, `strikeOpsSegmentBlocked`, `rayBox`, `strikeOpsResolveMove`, `strikeOpsPickMagnetTarget`, `zoneSamples`, `postPath`/`postPathPoint` (reused for lane spot and dash paths), `nowMs`, `clamp`, `ease`, `stripTags`, `textDirection`, `base64ToArrayBuffer` | `strikeOpsExposureAt` → `strikeOpsSquadAt` (adds `dash`/`spot`); new `strikeOpsBossAt`, `strikeOpsRoundKind`, `strikeOpsLaneOrderOk`, `strikeOpsLayoutPlates` |
| Skeleton-rebind cloning | `strikeOpsCloneSkinned` (returns `{root, skeletons, map}`) | Unchanged (verified on the Hazmat model in the r128 composite); **(rev 2.1)** material cloning covers every per-enemy varying material (`perEnemyMaterials: 'all'`), tint driven by `enemyModel.tintMaterials` |
| Quality tiers and stats | `applyQuality`, `setQuality`, `monitorFps`, `getRenderStats`, `resetRenderPeak`, `setRendering`, the `info.autoReset = false` per-frame summing and the `shadowMap.render` wrapper | New per-tier fields (`grassClumps`, `useLod`, `enemyCastShadow`); `getRenderStats` adds `enemiesVisible`, `enemyModel` |
| Frame loop and camera | `startLoop`, `stopLoop`, `tick`, `step`, `renderFrame`, `hipFov` (portrait framing; **rev 2.1** reimplemented on `strikeOpsHipFov`, §5 `framing`), `capturePose`, `camBasis`, `project`, `rayFor`, `aimPoint`, `updateWeaponFeel`, `fitShadowCamera` | `updateCamera` keeps recoil/ADS/bob and swaps the breach dolly for the `advancePath` glide; `fitShadowCamera` fits the zone |
| WebAudio | `ensureAudio`, `synth` (shot, tick, bonk) | Add `puff`, `tagout`, `shimmer` voices |
| View model | `loadGun`, `registerGun`, `buildProceduralGun` | Pose moved bottom-right per the mockup; ADS pose to the red-dot sight |
| Theme adapter | `resolveStrikeOpsTheme`, `refreshTheme`, the `THEME_MOTIFS` shape, CSS-variable plumbing, contrast enforcement | Scene fields replaced per §7 (`skyTop`, `squadTints`, `bossTint`, `hologramTint`, …); `applySceneTheme` rewritten for sky/sun/haze |
| Debug plumbing | Methods on `.so-game.__vue__`, `forceExpose`, `lockOn`, `setQuality`, `getRenderStats`, `setRendering`, `debugSnapshot` | `getRobots` → `getEnemies`, `shootRobot` → `shootEnemy`, `skipBreach` → `skipTransition`; add `forceBossRound`, `skipToZone`, `getLayout`, and **(rev 2.1)** `getTransition`, `probeShot` and the extra `getEnemies`/`getLayout` fields (§12.1) |
| Tests | `tests/strike_ops_test.js` VM harness, fake clock, stubs; `tests/strike_ops_browser.cjs` harness (`state`, `enter`, init-script spies, Edge channel, port 8767) | Suites renamed and extended per §12.2; checks rewritten per §12.3 |

### 16.2 Replace

| Slice part | Replaced by |
|---|---|
| Room model: `STRIKE_OPS_CONFIG.rooms`, `roomOrigin`, `toWorld`, `boxToWorld`, `postAnchor`, `roomNumber` | `zones` / `zonePlan` / `lanes` with zone transforms (§5); `zoneNumber`, `roundNumber`, `roundInZone` |
| Room builder: `buildRoom`, `mergeBoxes` (walls/ceiling), `drawFloorTexture`, `setupEnvironment` (indoor strip lights), `updateDoor` | `buildZone` (ground textures, kit pieces from `props[]`, `strikeOpsMergeStatic`), `buildBackdrop` (sky dome, hills, clouds, merged water tower/fence/containers/trees), daylight hemisphere + sun; doors removed. `mergeBoxes` is not reused for kit meshes (it calls `toNonIndexed()` and reads raw arrays, which break on the interleaved, normalised kit attributes, §6.2) |
| Breach: `beginBreach`, `arriveInRoom`, `skipBreach`, phase `breaching`, `retireRoom` | `beginTransition`, `arriveRound`, `skipTransition`, `skipToZone`, phases `regroup` / `advancing`, `retireRound` + `retireZone` |
| Robot visuals: `registerRobotTemplate`, `tintRobotTemplate`, `registerPiece` (Kenney), `onAssetsReady`, `makeRobot`, `spawnRobots`, `tintRobot`, `playClip`, `setRobotMode`, `robotState`, `placeRobot`, `robotHitbox`, `updateRobots`, `animateProcedural`, `updateBlobs` | Config-driven `registerEnemyTemplate`, `makeEnemy`, `spawnSquad`, `spawnBoss` (split, hologram, dissolve/re-form), role-based `playRole`, `updateEnemies`, the procedural soldier fallback; blob shadows kept |
| Feedback visuals: `onCorrectFeedback`, `onWrongFeedback`, `flashFade` (`showHitmarker` shapes kept) | Tag-out, decoy flicker/dissolve, real-copy solidify, foam puffs |
| HUD and labels: the component template, `updateOverlay` (labels), `measureLabels`, `measure`, `badgeAria`, `statusText`, `badgesDisabled`, the whole `games/strike-ops.css` | COD layout (§6.6): banner, counter + stars, minimap canvas, weapon slot + ammo, fire/ADS/reload, joystick, nameplates via `strikeOpsLayoutPlates`, LTR answer row, progress bar where the mockup has HP; grid layout with media-query orientation |
| Assets: the Factory Kit files under `assets/strike-ops/models/` (`kenney-box-*.glb`, `kenney-structure-*.glb`, `Textures/colormap.png`), `assets/strike-ops/LICENSE-Kenney.txt`, `RobotExpressive.glb` in `STRIKE_OPS_ASSETS` | **(rev 2.1)** the sourced set under `assets/strike-ops/characters/` and `assets/strike-ops/env/` (Hazmat ×2, 22 kit GLBs, 6 PNGs, 3 kit `License.txt`), the 30-URL `STRIKE_OPS_ASSETS`, a rewritten `CREDITS.md` and `ASSET_LICENSES.md` section (§6.4, §11) |
| Prop building: procedural shed/fence/tower builders and `CanvasTexture` siding/plank/grass patterns planned by revision 2 (not yet written) | **(rev 2.1)** kit placement from `props[]` + `strikeOpsMergeStatic` (manual de-index, per-kit shared materials) + the two ground textures (§6, §6.2) |
| Context-loss restart: `restartFromLost` | `restartInPlace` (§4; transition snapshot, `gfx`, no re-stamp) |
| **(rev 2.1)** Render-mode switching: `enterFallback`, `continueWithoutGL`, the `fallback` phase, `domOnly` used as a phase substitute | `renderMode` + `continueInDom()` with the resume target rule; no function but `arriveRound`/`unlockRetry` writes `attemptLocked = false` (§4) |
| **(rev 2.1)** `onContextLost` | The §4 sequence: `gfx++` first, `pauseTimers`, clear every cosmetic timer, stop loop, cancel lock-on, suspend audio, record `resumePhase`, `phase = 'lost'`, release the scene |

### 16.3 Known slice bugs to fix (each with a regression test)

1. **Answer order vs. world order (RTL).** The answer strip followed the
   page's RTL direction, so badge 1 sat on the right while robot 0 stood on
   the left. Fix: lane `i` is the i-th from the left, the answer row is
   `direction: ltr`, plates are laid out order-preserving (§2, §6, §8).
   Tests: unit tests 1 and 6, browser checks 4 and 14.
2. **Portrait overlap.** `measure()` flipped the reactive `portrait` flag
   and read layout (reported as `--so-strip-h`; in the current source, the
   plate/dock rects) in the same tick, before the portrait class
   re-rendered, so controls overlapped the learning plate. Fix: CSS-grid
   layout in normal flow, orientation from media queries, measurement only
   after layout (§6.6). Test: browser check 15.
3. **Context-loss restart.** `restartFromLost()` called
   `router.replace('/app/…')` and then pushed `/play/…` from an unowned
   polling `setTimeout`, which raced teardown and the LearnBox guard and did
   not reliably end in play. Fix: `restartInPlace()` on the same instance,
   no router calls, frozen timers kept (rev 2.1: only `gfx` changes),
   ending in the frozen playing phase (§4). Tests: unit test 9 (restart in
   place), browser check 20.
4. **(rev 2.1, blocker) DOM continuation reopens an accepted answer.**
   `enterFallback()` sets `attemptLocked = false` and `phase = 'fallback'`
   unconditionally, and the restart-failure path calls it. After a context
   loss during `correct`, the player could answer again while the saved
   `correct` timer (expecting `correct`) never ran. `continueWithoutGL()`
   had a similar unlock when no timer was pending. Fix: `renderMode`
   separate from `phase`, `continueInDom()` with the resume target rule,
   the lock never touched (§4). Tests: unit test 9 (DOM continuation and
   restart failure), browser check 20.
5. **(rev 2.1) Indoor dependency in `create()`.** `create()` reads
   `C.rooms[0].posts.length`. Fix: `STRIKE_OPS_MAX_LANES`, counters advanced
   before `create()` (§2). Tests: unit tests 3 and 10 (migration search).
6. **(rev 2.1) Graphics work after context loss.** `onContextLost()` does
   not clear cosmetic timers, and load callbacks are only invalidated on
   restart. Fix: `_so.gfx` bumped on loss, cosmetic timers cleared, late
   loads disposed (§4). Tests: unit test 9 (graphics generation), browser
   check 20 (loss while loading).
7. **(rev 2.1) Mixed-direction banner.** An English word with trailing
   `?` inside a Hebrew banner rendered as `?apple`. **Rev 3:** reclassified
   by the manager override (§8): for a Hebrew question the `?` belongs at
   the far left, so `?apple :המילה פירוש מה` is correct; the helper still
   isolates the English run so multi-word English and `3+4` keep their
   internal order. Original fix:
   `strikeOpsBidiRuns` + `<bdi>` (§8). Tests: unit test 6, browser check 14.

### 16.4 Suggested order of work

1. Config and pure helpers (`zones`, lanes, `strikeOpsSquadAt`,
   `strikeOpsBossAt`, `strikeOpsPoseAt`, `strikeOpsRoundKind`,
   `strikeOpsNextRound`, `strikeOpsLaneOrderOk`, `strikeOpsLayoutPlates`,
   `strikeOpsHipFov`, `strikeOpsBidiRuns`, validation) with unit tests 1–7
   green. Measure the Hazmat `Walk`/`Run_Gun` `clipSpeeds` first (§6.1),
   because the foot-slide bound constrains the zone authoring.
2. Learning/phase renames and the rev-2.1 state fixes (`deploying`,
   `beginTransition` with counters before `create()`, `arriveRound`,
   `regroup`, `advancing`, `renderMode`/`continueInDom`, `_so.gfx`, the
   transition snapshot, `restartInPlace`) with unit test 9 green, DOM
   render mode first (no THREE). Run the §12.2 test 10 migration search.
3. HUD template and CSS grid (§6.6), including the stacked answer layout,
   in the DOM render mode, passing browser check 15's layout half before
   any 3D work.
4. Copy the sourced assets (§6.4, §11.1), delete
   `assets/strike-ops/models/`, update `STRIKE_OPS_ASSETS`; build the zone,
   backdrop and lighting from the kits with `strikeOpsMergeStatic` (unit
   test 11), then the Hazmat enemies with per-enemy materials; measure the
   §6.2 budgets against the sourcing baseline.
5. Boss-round visuals (fitted timeline), knockdown, nameplates, minimap,
   feel.
6. Themes (`base` and `dark` polished, live clones re-tinted for all six
   keys), service worker, credits, the full browser test, the real-phone
   frame-rate check, and screenshots for the user against the mockups.

---

## 17. Migration from the pad slice to the free-roam map (rev 3)

The revision-2.1 slice (`games/strike-ops.js` ≈ 4 350 lines / 280 KB,
`games/strike-ops.css`, `tests/strike_ops_test.js` with 32 passing tests,
`tests/strike_ops_browser.cjs`) is the starting point. **Edit it in place;
do not start a new file**, and navigate it with search and small ranges
(function names below were found by grep; line numbers drift). The
learning loop, locks, timers, render modes, context loss, enemies, HUD,
themes, quality tiers and debug plumbing stay; what changes is where the
player is and how they get between places. Before starting, re-run the
§15 note 19 status: fix the browser test's weight seed (≤ 15) and run
checks 16–27 once against the 2.1 build, so regressions introduced by the
map work are distinguishable from pre-existing ones.

### 17.1 Keep (behaviour unchanged)

| Area | Built functions / data | Rev 3 note |
|---|---|---|
| Learning transaction and locks | `create`, `answer`, `unlockRetry`, `checkProgress`, `phaseTimer` and friends, `resumeTarget`, `ownTimeout`, `listen`, `teardown` | Unchanged. Only `arriveRound` and `unlockRetry` write `attemptLocked = false`; `enterEncounter` must not |
| Schedulers and pose | `strikeOpsSquadAt`, `strikeOpsBossAt` (synchronised patrol), `strikeOpsPoseAt`, `strikeOpsApproachPose`, `strikeOpsSplitStart`, `strikeOpsRoundKind`, `forceExpose`, the exposure ledger | Unchanged; poses stay arena-local and are converted to the map frame for `getEnemies().pose` |
| The yard arena | `YARD` cover, lanes, laneSets, boss, approach, props, grassSpots | Becomes `LINE4` + the yard's place entry (§5); its numbers are unchanged (`pad` → `core`, `spawn` → `anchor`) |
| Validation core | `validateStrikeOpsConfig` timing/role/foot-slide/LOS/occlusion checks, `strikeOpsLaneOrderOk`, `laneHorizontalPoints`, `strikeOpsMoveSpeeds`, `zoneSamples` | Sample regions change (core vs fight box, §5); map checks are added (§5.1) |
| Rendering core | `initScene`, `loadAssets`, `registerEnemyTemplate`, `finalizeKits`, `place`, `placeCover`, `buildShed`, `strikeOpsMergeStatic`, `strikeOpsCloneSkinned`, `spawnRoundVisuals`, `makeEnemyVisual`, `tintEnemy`, `retireRound`, `applyQuality`, `monitorFps`, `renderFrame`, `getRenderStats` | `placeCover` takes the kind from `coverKinds`; merged meshes need a correct bounding sphere; round visuals are placed with the place's map transform |
| Feedback and feel | knockdown, dissolve/re-form, hitmarker, synth voices, recoil, ADS, foam puffs | Add footstep and gate-chime voices (§6.5) |
| HUD and themes | template regions, `measure`, `strikeOpsLayoutPlates`, answer row/stacked layout, `resolveStrikeOpsTheme`, `applySceneTheme`, `THEME_MOTIFS` | Add the rev-3 HUD parts (§6.6) and the map colours (§7) |
| Input core | `fire`, `resolveShot`, `lockOn`, `updateLock`, `shootEnemy`, `probeShot`, pointer lock, cursor mode, `edgePan`, touch look/fire, joystick pointer tracking | **Behaviour** kept, but their coordinates migrate (see the §17.2 "Aim and shooting" row: they are *not* drop-in); `lockOn` turns by the shortest way (no clamp) |

### 17.2 Replace

| Built part | Replaced by (rev 3) |
|---|---|
| `STRIKE_OPS_CONFIG.zones: [YARD]`, `zonePlan.zones: ['yard']`, `BACKDROP` (props/fence in the yard's frame) | `LINE4` + four place entries + `map` (§5, §5.1); the backdrop keeps sky, hills, clouds, the water tower at (−14, 50) and the outer trees; the old backdrop containers and fence become map structures and walls |
| `zoneToWorld` / `worldToZone` with zone-local player coordinates | Player state in the **map** frame (`_so.player.x/z`); `strikeOpsArenaToMap` for arena data; THREE = (−x, y, z) |
| `updateMovement` (zone-local move, `zone.pad` clamp, `zone.cover` colliders) | Map-frame movement with acceleration, sprint, ←/→ turning, the collider grid + gates + blockers, the fight-box clamp in encounter phases, the autopilot step and the trigger check (§3, §5.1) |
| `clampLook` (yaw clamp ±`yawLimitDeg`) | Pitch clamp only |
| `updateCamera` (head bob, the `advancePose` branch) | Eye at the map pose, no bob, centre-view assist/lock-on/autopilot turns, the lap-wrap fade (§6) |
| `beginTransition` (`regroup` / `advancing` into the next zone, `buildIncomingZone`, stars capped at 3, `so.skipZone`) | `regroup` / `roaming` / `advancing` (lap wrap) per `strikeOpsNextRound`; gates derived from `zoneIndex`; stars 0–4 per lap, reset on the wrap; no zone build (§2, §4) |
| `arriveRound` (resets the player to the zone spawn after an advance, `retireOutgoingZone`) | Player untouched except through the idempotent `applyLapPose()` for an `advancing` transition (rev 3.1); no zone retirement; runs after every `deploying` (encounter start) and after the timed phases |
| `skipToZone` (zone-loop counters) | §12.1 `skipToZone` semantics (arms, converts `regroup` → `roaming`, retargets `roaming`) |
| `buildZone` / `buildIncomingZone` / `retireOutgoingZone` / `retireZone` / `activeZone` (per-zone lifetime) | `buildMap()` once (ground, per-place structure/detail chunks, gates, tape lines, chevrons), `releaseMap()`, `currentPlace()` and chunk visibility (§6.2, §10) |
| `drawMinimapLayer(cfg)` per zone (zone-local, 4 px/m, pad rectangle) and `drawMinimap` | One compound layer from the map config (6 px/m), dynamic gates/route/objective/badge-tinted dots; the full-map overlay (§6.6) |
| `fitShadowCamera` (fitted to the zone at `arriveRound`) | The snapped follow box while roaming, the fight-box/lanes box during encounters (§6) |
| `laneOf` / `shapeOf` / `laneStyle` (marker by lane) and `chipAria` (`… משמאל`) | Badge by index (`SHAPES[i]`, `--so-lane-i`, `data-badge`), chip label `חייל N (<shape>)` (§2, §8); enemy `Team` tint `squadTints[index]` |
| `onKeyDown` arrows = strafe | ↑/↓ walk, ←/→ turn; Shift, `G`, `M` added (§8) |
| **Aim and shooting (rev 3.1: migrate together, not piecemeal):** `rayFor` (zone-local ray built with `facingDeg`), `camBasis`, `project`, `aimAngles` (subtracts zone-local targets from the player), `aimPoint`, `hitboxOf`, `torsoWorld`, `enemyWorld`, `placeEnemy`, `resolveShot` (cover boxes in zone-local units), `strikeOpsPickMagnetTarget` inputs, `updateLock`, `shootEnemy`/`probeShot` aiming, nameplate anchors, blob-shadow positions and the minimap `toMap` | One rule: arena data is converted to the **map** frame once, when a round is spawned (enemy poses via `strikeOpsArenaToMap` each frame from the one pose source; cover boxes once per place); rays, hitboxes, LOS boxes, aim angles, magnet projections, plates and minimap dots all work in map coordinates; the conversion to THREE (`(−x, y, z)`) happens only where an `Object3D` or the camera is written and where `project`/`rayFor` call THREE. Browser check 31 and unit test 16 cover all four headings |
| `strikeOpsResolveMove(pos, delta, boxes, pad, radius)` | `strikeOpsResolveMove(pos, delta, colliders, clampRect, radius, maxStepM)` with circles and sub-steps (§11.1) |
| `PLAY_PHASES` / `TRANSITION_PHASES` / `PAUSABLE` | Add `roaming` (pausable; a transition phase for `skipTransition`) |
| Transition snapshot fields `pathZoneIndex`, `fromPose` | `lap` and kind `roaming`; the player pose lives in `_so.player` (§4) |
| `debugSnapshot().zones` and the camera in zone-local units | `getPlayer()`, `getMap()`, the camera in map units (§12.1) |

### 17.3 Remove

- `YARD.advancePath`, `advancePose()`, `catmull()`, the `advancing`
  camera glide and its reduced-motion variant (the lap wrap is a fade in
  every mode);
- `movement.yawLimitDeg`, `zone.yawLimitDeg`, `movement.bobAmp`,
  `movement.bobHz` and the head-bob code;
- the single-zone loop (`advancing` into the same zone, the duplicate-zone
  hiding in `buildZone`);
- the `advancePath` checks in `validateStrikeOpsConfig` and unit test 1;
- unit-test and browser-test assertions about the pad AABB, the yaw clamp,
  `advancePath(0.4)` and "the camera is at the next pad".

Unit test 10's migration search (§12.2) enforces the removals.

### 17.4 Order of work (rev 3 slice)

1. **Pure map layer, Node only.** Add `LINE4`, the four places and `map`
   from §5.1 verbatim; `strikeOpsArenaToMap`, `strikeOpsMapState`,
   `strikeOpsCurrentPlace`, the collider grid, the extended
   `strikeOpsResolveMove`, `strikeOpsRoute`, `strikeOpsAutopilotStep`, the
   fight-box/core sample regions and the map validation, with unit tests
   1, 4 and 12–15 green (16 with step 3). The §5.1 numbers passed the planning run; if a
   check fails, adjust dressing, never the `LINE4` gameplay numbers.
2. **Phases.** `strikeOpsNextRound` kinds, `roaming` in `beginTransition`,
   `enterEncounter`, the DOM `roaming` timer, the lap wrap, stars 0–4,
   pause/loss/continue rules for `roaming`, with unit tests 3 and 9 green
   in the DOM render mode first (no THREE); then the migration search.
3. **Movement in the scene, grey box — including navigation (rev 3.1,
   manager decision).** Map-frame player, movement, collision, the
   fight-box clamp, triggers with the centre-view assist, gates as plain
   boxes, the map drawn with stand-in boxes from the config (the existing
   kit-failure fallback path), the full coordinate migration for shooting
   and lock-on (§17.2), input reset on suspension,
   `teleport`/`getPlayer`/`getMap`/`walkTo`/`setMoveInput`/`setView`, and
   **navigation correctness**: `strikeOpsRoute` with recovery from any
   position, a **plain** **קדימה** button and `KeyG` (no styling polish),
   encounter entry from every route. Unit test 14 (walks simulated from
   the 200 random starts) and browser checks 1, 2, 8, 13, 29, 31, 32, 34
   and the autopilot/entry parts of 28 and 33 green. **User checkpoint:** a
   walkable grey-box map that a child can finish with **קדימה** alone
   (screenshots of each place and a short description of the walk).
4. **Dressing and budget.** `buildMap()` with kit pieces, structure/detail
   chunks, tape lines, the backdrop move, chunk visibility, the shadow
   follow box; browser check 17 at every place and roaming view, logged
   against the §6.2 estimate.
5. **Guidance polish and HUD.** Objective marker, chevrons, minimap
   compound layer + route, toasts, objective line, the styled **קדימה**
   (navigation itself landed in step 3), the map overlay (`M`), badges by
   index, arrow-key turning, per-place flavour (§5.1); browser checks 4,
   14, 15, 18 and the remaining parts of 28 and 33 green.
6. **Everything else.** Reduced motion, context loss in `roaming`,
   navigation mid-walk, the full lap (check 30), themes (`base`/`dark`
   polished, all keys automated), the `CACHE_NAME` bump, the real-phone
   check, the child map test, and `base`/`dark` screenshots of all four
   places for the user.
