# Hexkeep verification — 2026-09-17

Current implementation is in C:/projects/test. Unrelated KayKit/tower-defense
working-tree files were preserved. No commit or deployment was requested.

## Current validation

- Campaign unit suite: 78 passing checks covering four towers, all upgrade levels,
  armor, splash, guard rally, boss behavior, exact-once learning, automatic next
  questions, cancelled/stale timers, persistence and v2 migration refunds.
- Economy proof: every configuration under 200 points has at most 106 possible
  damage against the 107-health boss, even with optimistic targeting, guard
  movement and all cooldown alignments. A practical 240-answer strategy wins all
  ten raids without extra points, repairs, refunds or injected battle resources.
- Campaign browser suite: 73 checks, including all ten raids with 240 accepted
  learning answers, automatic question progression, real build/upgrade purchases,
  exact retry, pauses, reload/resume, reduced motion, navigation, and stage routing
  plus the final reward for English, legacy and both Adventure encounters.
- Six themes at desktop, phone portrait/landscape and tablet sizes pass overflow
  and interactive target checks.
- Real-time motion browser: 8 checks. Enemy transforms differ between simulation
  ticks, freeze at the exact current position during questions, and automatic
  next-question navigation does not resume combat. All four baked tower models
  load and render at level three.
- Mobile touch: 4 checks; answer-funded purchase of guards and archers, touchable map locations, and automatic combat without free currency.
- Four English routes verify the correct vocabulary/direction, mobile layout and
  shared learning weights/score.
- Offline: 7 checks using an installed controlling service worker with networking
  disabled. Reload, all current sprites, learning-funded construction and a second
  reload retain learning and village state.

Current entry points: tests/hexkeep_test.js, tests/hexkeep_browser.cjs,
tests/hexkeep_motion_browser.cjs, tests/hexkeep_mobile.cjs,
tests/hexkeep_english_browser.cjs and tests/hexkeep_offline.cjs. The historical
slice browser entry point delegates to the current campaign suite.

Screenshots: artifacts/hexkeep/four-combat-towers.png,
hebrew-learning-mobile.png, autonomous-raid.png and campaign-victory.png.
The four-tower art inspection uses seeded money solely to inspect all models;
the campaign win test earns its entire budget through the real answer lifecycle.

The original slice and prior six-support-building screenshots are historical and
no longer describe current gameplay. Cache version: v197-hexkeep.

Walking revision: the original Skeleton_Minion Walking_A animation is rendered as 24 frames at six headings. Browser tests verify changing gait frames, exact position and gait freezing during questions, and mobile per-frame displacement limits across resume and road-cell boundaries. Rendering writes DOM transforms directly without per-frame Vue rerenders. Remaining simulation time is preserved across pauses. The atlas and metadata are precached and verified offline.

Squad revision: tests/hexkeep_melee_browser.cjs verifies three visible soldiers, three unique pairings with a fourth enemy walking past, health bars on both sides, animated melee frames, gradual two-sided damage and frozen combat during questions. Desktop/mobile screenshots are melee-health-desktop.png and melee-health-mobile.png. Tactical unit coverage includes stable reservations, damage cooldowns and release after a soldier dies. Both attack atlases are included in the offline cache.

Impact/context revision: 84 tactical checks include delayed catapult splash and melee contact, plus once-only impacts. `tests/hexkeep_context_browser.cjs` checks direct map purchases and upgrades, absence of numbered sites/permanent construction panel, projectile motion before damage, pause/resume in midflight, and desktop/mobile menu bounds. Screenshots: context-purchase.png, context-upgrade-mobile.png and catapult-flight.png.

Overlay revision (v197): `tests/hexkeep_overlay_browser.cjs` verifies newly unlocked vocabulary stays on the play route, preserves battle state, clears the shared new-items list only after presentation, then opens normal questions. Dialog bounds leave the map visible at 1440×900, 390×844 and 844×390. Real purchases produce three distinct tower asset URLs. New sprites are included in the offline manifest. Screenshots: new-words-overlay.png, question-overlay-390.png and upgraded-battlefield.png.

Production correction (v199): debug UI, state and activation method removed entirely. Browser tests assert absence and zero starting funds before seeding isolated test fixtures. Tactical suite now has 82 checks.

Water revision (v204): two new regions, `river` and `coast`, each with its own
board, ten raids, roster and commander. Every board keeps one shared 8x6 grid
and camera, so `assets/hexkeep/projection.js` still places every sprite; the
bake re-measures the anchors and they match to the digit. Tactical coverage adds
the second route (a boat sails past the guard line, splash never crosses between
road and lane, a wet plot cannot be bought), the raider boat's surge (it gathers
way untouched, caps, and drops to a crawl on any wound; arrows pin it where
magic lets it run) and the ironclad's plating (it plates its escort, never
itself, and sinking it strips the escort at once; arrows floor to one, magic
ignores it). The ladder proofs add both regions and the two negative claims that
mirror the frost-pass shield test: an artillery-only or magic-only line never
clears the river, and in the storm bay a magic-only line loses the answers a
mixed battery line wins with.

Replay revision (v204): journey progress and battle state are separate records
and the save format is version 5. Coverage: a village in progress resumes where
it was left and offers a start-over; winning marks the village and leaves no
battle state, in memory or in storage; play again restarts at wave 1 without
touching `cleared` or the roads; losing or quitting a replay keeps every village
already won; a version 4 save parked on a finished final raid migrates to a
completed village that starts fresh, while a mid-run region keeps its raid.

Screenshots: artifacts/hexkeep/river-battle.png, coast-battle.png,
journey-seven-villages.png, replay-victory-card.png and replay-start-over.png.

Three browser suites were stale against the committed tree before this change
and now pass again: `hexkeep_context_browser.cjs`, `hexkeep_melee_browser.cjs`
and `hexkeep_overlay_browser.cjs` still asserted that the debug method did not
exist (debug returned in fca180c behind a localhost `?debug=1` gate), and the
context suite still expected the pre-rebalance level-two catapult stone.

Cache version: v204-hexkeep-water.

Heading and pace correction (v204): the Pirate Kit hulls already carry their bow
on +Z, which is the axis the walker sheets bake headings against, so the extra
half-turn the first bake applied sailed every boat stern-first; the boats are
re-baked at `yaw: 0` and now face along the lane. The raider boat's speed cap
came down a hex in both regions (two on the river, three in the bay), and towers
now pick the attacker with the fewest steps left to the village instead of the
highest raw step, which is the same order on a one-route region but fair across
a road and a lane. The storm bay was retuned around the slower boats — they stay
inside an ironclad's plating longer, which made the region harder — so its
commander, escorts and toughness came down and the mixed battery line wins it
for the same 520 answers as before.

Harbour revision (v205): an eighth region, `harbour`, and a fifth tower. The
shipyard is a garrison tower like the barracks, but on the water: it berths
2/3/4 patrol boats at the station its plot declares on the lane, and they block
and duel enemy boats exactly as soldiers block walkers. Coverage: an island
offers a shipyard and no barracks and a shore plot the reverse, a dry region
offers no shipyard at all, a patrol boat stops a raider boat and never reaches
a walker on the road, guns fired from the road never reach the patrol boats, and
the black ship rakes every boat beside it before sailing on. Two bugs the new
tower exposed are fixed with it: a garrison tower was also firing as a ranged
tower every beat, and melee damage was reading the tower's level instead of its
damage entry (identical for the barracks, which is why it had never shown).

Balance: the blockade build clears the harbour for 360 answers, the same six
plots with guns alone need 560, a blockade with no guns behind it never clears
it at any price, and arrows alone never clear it either. The journey parchment
is now 2500x1000 and carries all eight villages.

Screenshots: artifacts/hexkeep/harbour-battle.png.

Cache version: v205-hexkeep-harbour.

Patrol gunnery (v205): the boats were only ever a wall, so each one now carries
a cannon and fires it from where it floats — every other beat, at whatever is
closest to the village within two lane hexes, never at the road. Coverage: every
living boat fires on its own beat, the ball leaves the boat rather than the
shipyard, it lands the cannon entry for the shipyard's level, and a walker on
the road is never a target. The black ship's broadside became a volley with its
own damage so a fleet with no towers behind it is still wrecked; the harbour was
rescaled around both changes and the three claims hold at the new weights:
blockade and guns 360 answers, towers alone 560, blockade alone never.
