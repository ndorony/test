# Knowledge Defense — approved vertical-slice specification

## 1. Identity and scope

- **Game name:** הגנת הידע / Knowledge Defense
- **Internal `appType`:** `knowledge_defense`
- **Fantasy:** Design a living kingdom defense whose strength grows through knowledge.
- **Audience/input:** Existing platform learners; touch, mouse, and keyboard.
- **Registration:** Legacy and Adventure.
- **Slice:** One handcrafted battlefield, four build sites, three waves, two tower families, one ability, and two research tracks.
- **Non-goals:** Campaign map, procedural levels, drag placement, multiplayer, external assets, independent curriculum/mastery, or a general-purpose engine.
- **References:** `MCQComponent` for learning transactions and `games/water-pipeline.js` for the guarded standalone-component bridge and lifecycle ownership.

## 2. Learning and economy contract

- The legacy registration uses `ANIMALS`: `english_name` question, `hebrew` result, `setItems: 3`. Adventure inherits its virtual list and mappings.
- A question is generated only when the player opens the Knowledge Forge between waves. The engine-returned question, shuffled options, result, action, and source index are used unchanged.
- A correct answer locks the attempt, reports `-1` once, adds score and 3 Knowledge Energy, calls `reloadProgress()`, saves score and game-specific energy through platform wrappers, then closes the forge if routing remains local.
- An incorrect answer locks once, applies the score floor/save behavior, reports `+1` once, calls `reloadProgress()`, gives clear retry feedback, and re-enables the same options without generating another question.
- Learning owns curriculum, weights, progress, unlocking, persistence, and completion routing. Combat never calls learning helpers.
- **Knowledge Energy:** persistent strategic reserve. Builds towers, unlocks Arcane towers, activates Royal Volley, and funds persistent research.
- **Coins:** battle-local tactical currency earned from kills/waves and spent alongside energy on tower upgrades. It resets each run.
- Stored game-specific keys use `getLocalStorage`/`setLocalStorage`; Adventure IDs normalize through existing storage wrappers.

## 3. Player journey and pacing

1. **Opening (about 1.2s):** camera settles on the threatened gate; a banner names the objective. Reduced motion resolves immediately.
2. **Planning:** four sites pulse subtly. The player may open the Knowledge Forge, build, upgrade, unlock Arcane towers, research, or start early.
3. **Wave:** enemies follow a visible curved road. Towers acquire targets automatically. Kills produce coins, hit reactions, projectiles, and bounded particles. Royal Volley is a deliberate emergency decision.
4. **Intermission:** short tactical summary, coins/material reward, a fresh chance to study and redesign.
5. **Ending:** surviving three waves restores the gate and celebrates; losing offers an immediate reversible retry without changing learning state.

Wave rhythm: 5 scouts → 7 mixed scouts/runners → 9 mixed enemies with one armored captain. Towers remain useful but placement, upgrades, and ability timing materially affect survival.

## 4. State machine

`loading → opening → planning → wave → intermission → planning → victory|defeat → completed`

- Forge overlay is legal only during planning/intermission and has `question-ready` / `feedback` substates.
- An attempt lock plus monotonic question token prevents double reporting.
- A run token invalidates wave spawns, projectiles, particles, and delayed transitions.
- Destruction invalidates both tokens before cancelling RAF, timers, media, and listeners.

## 5. Reusable configuration and systems

- Declarative tower, enemy, wave, technology, ability, build-site, and path configuration.
- Small practical helpers: path interpolation, target selection, projectile resolution, economy validation, theme adapter, and bounded effect spawning.
- Maximum active set: 12 enemies, 4 towers, 20 projectiles, 28 particles. Completed/off-screen entities are removed.
- Persistent reconstruction: Knowledge Energy, Arcane blueprint unlock, and two capped research levels. Battle entities are never persisted.

## 6. Rendering and art direction

- **Scene:** bounded DOM/CSS battlefield with a viewBox-like logical coordinate system projected to percentages.
- **Road:** local SVG curve for readability; HTML entities travel along matching sampled points.
- **Controls:** semantic DOM buttons and accessible status regions.
- **Art:** authored CSS silhouettes with warm storybook materials, chunky readable towers, banners, trees, smoke, birds, sparks, impact rings, and directional light.
- **Motion:** one owned RAF advances combat. CSS handles low-cost ambience; reduced motion pauses ambience and makes transitions/effects brief without changing simulation outcomes.
- **Composition:** the road is the focal S-curve, build sites frame it, the gate anchors the end, and the Forge uses a quiet parchment/command-table surface rather than a quiz card.

## 7. Themes

All current keys are supported through one adapter: `base` verdant kingdom, `soldiers` frontier fort, `unicorn` enchanted grove, `space` orbital colony, `dark` moonlit citadel, and `code` neon firewall. Palette values always derive from `themeOptions`; motif metadata changes flags, terrain, tower materials, particles, and lighting. Unknown keys fall back to `base` motifs with the selected palette when possible.

## 8. Accessibility and responsiveness

- Minimum 44px controls, stable option positions, visible `:focus-visible`, numeric answer shortcuts, Enter/Space for focused controls, and logical DOM order.
- Hebrew UI is RTL; generated question direction is detected independently for Hebrew/LTR content. Numbers and combat direction are not blindly mirrored.
- Status changes use a polite live region and non-color icons/text.
- Portrait stacks the command deck below a 4:3 battlefield; landscape/desktop uses a side command rail; low-height mode compresses HUD and decoration, never answers.
- Resize only changes projection. Logical simulation coordinates remain stable.

## 9. Integration files

### Add

- `games/knowledge-defense.js` — factory, configuration, simulation, state machine, learning adapter, theme adapter, cleanup.
- `games/knowledge-defense.css` — scoped scene, responsive layout, themes, motion, focus, reduced motion.
- `tests/knowledge_defense_test.js` — factory/config, economy, exact-once learning, cleanup, registration, routes, themes.

### Modify

- `index.html` — load the dedicated CSS/JS before `tester.js`.
- `tester.js` — guarded factory instantiation and route.
- `apps.js` — append one legacy registration without reordering siblings.
- `worlds.js` — add one Knowledge Defense encounter to the animals world.
- `service-worker.js` — cache both assets and bump the cache name.

## 10. Acceptance and QA

The slice is accepted when correct/incorrect/retry/completion are exact-once and engine-owned; three waves are playable with build/upgrade/unlock/research/ability decisions; both routes resolve; all themes adapt; keyboard/touch, RTL/LTR, reduced motion, resize, rapid input, and route-away cleanup work; focused and Adventure tests pass; and actual browser QA shows no console errors or stale work.
