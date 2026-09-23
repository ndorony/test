# Momentum Factory validation

Validated 2026-09-18. Local preview: http://127.0.0.1:8873/#/play/momentum_factory/grp-ch51-7

## Results
- Pure engine: 62 checks. Complete winning strategy: 245 correct answers, 236 simulated seconds, 42 sales.
- Actual learning-engine browser campaign: 31 checks, including all purchases, hires, upgrades and three completed orders.
- Layout/accessibility/curriculum: 33 checks across four registrations, six themes, desktop, 390x844, 320x568, 844x390 and 667x320.
- Advanced runtime: 13 checks for machine animation, worker movement, relocation, background feedback timing, pause, reduced motion and route teardown.
- Offline: 7 checks, including offline startup, answer persistence, reload and decoding all 68 runtime images. Cache: my-app-cache-v204-momentum-queue.
- Integration: all 357 existing menu nodes preserved; four appended registrations; ordered scripts and complete runtime cache; no shipped debug funding.
- Existing regressions: Adventure 82, Factory Tycoon 66, Hexkeep 82 and Hexkeep campaign 82 passed.

## Economy proof and achievable route
Each of five indispensable stations costs 10 + 15 + 20 learning points to reach level three. Robot orders require the whole grade-three production chain, so the cheapest capable factory costs 225 correct answers. Enumeration of 1,024 station configurations verifies the lower bound. Passive sales cannot generate learning points, and relocation/refunds cannot duplicate them.

The tested practical route purchases all stations, hires four workers (one is supplied initially), assigns all five, fulfills the first order, upgrades all stations to level two using learning points and earned sales money, fulfills the second order, then upgrades all stations to level three and fulfills the robot order. Total: 245 correct answers. No arbitrary answer-count gate is used.

## Integration and art
Factory Tycoon, Hexkeep, existing IDs and shared progress remain intact. The new game appears in 5_1 and 6.1_1 chapter groups in both supported directions, with no homepage or Adventure entry. Gameplay saves are separate from shared learning progress.

Kenney Factory Kit, KayKit Platformer and the existing KayKit character supply the actual geometry and skeletal animations. CC0 notices, source models and provenance are included under assets/momentum-factory. Runtime art is local; model baking is a development-only step. Upgrades visibly add machine details and geometry.

## Reproduce
Run node tests/momentum_factory_test.js and node tests/momentum_factory_integration.js. With the repository served on port 8873 and Playwright available, run tests/momentum_factory_browser.cjs, tests/momentum_factory_layout.cjs, tests/momentum_factory_runtime.cjs and tests/momentum_factory_offline.cjs using Node. Browser tests use isolated contexts and fixtures, never normal user saves.

Screenshots: artifacts/momentum-factory/advanced-1365x900.png, advanced-390x844.png and advanced-844x390.png. Screenshots and download archives are excluded from the scoped commit.

Local preview requires the local server to remain running; it is not a public deployment. No commit or push was performed.

## Customer-market update
Added repeat customers, two optional income outlets, reversible outlet suspension, last-minute/lifetime revenue, workshop development feedback and endless trade after victory. Replaced the flat floor with existing KayKit beveled platform tiles and a continuous customer aisle.

Additional pure market tests verify outlet costs, arrival-before-payment, simultaneous raw/parts sales, unchanged learning currency, exact pause/reload and continued production after victory. Additional real-route browser checks verify outlet purchase/suspension/resumption, five visible customers, receipts, pause and saved-state restoration. Existing full campaign now additionally verifies profitable continued operation after victory before route teardown.

Local debug remains an ignored qa-momentum-debug.html page on isolated origin port 8874, outside the scoped commit and offline cache. Normal factory starts with zero currency.

Shop-access regression: tests/momentum_factory_first_sale.cjs completes the first sale through visible shop controls with 22 learning points and zero stock/money. Verified in the actual in-app debug tab that stale scripts/floor were loading; explicit runtime URL versions and fresh debug entry navigation now expose the tiled floor and shop controls without resetting saves. Debug wrapper sizing follows remaining viewport height.

Logistics update: pure tests now cover FIFO service, four-second arrivals, load reservation and pickup, physical counter delivery before payment, in-transit reload, pause and endless sales. UI checks cover one initial build target with one blueprint, first sale with 22 points, producer piles, shop collection and persisted queue state. Original practical victory remains 245 accepted answers and 42 finished-product sales (236 simulated seconds in the pure fixture). Additional optional outlet purchases do not lower the 225-point machine-chain bound.

## Age-eight guidance QA (2026-09-20)
- Existing appType, four curriculum registrations, positional IDs, saves, learning lifecycle and asset licenses preserved. No Adventure registration change applies.
- Pure guide test follows only recommended actions from zero funds through first sale (22 answers) and all three orders (257 answers including the optional outlet); verifies guidance after save reconstruction.
- New actual-route guide browser test funds purchases with 22 real accepted engine answers, reaches the first customer through guide buttons only, checks unobstructed buttons at 390x844, 320x568, 844x390 and 1365x900 and reloads the next mission.
- Passed 62 core factory assertions, market simulation, registration/cache integration, 82 Adventure assertions, 31 full campaign browser assertions, 33 layout/theme/direction assertions, 13 advanced runtime assertions, market browser, first-sale browser and seven offline assertions.
- Inspected desktop, portrait and short-landscape screenshots. Existing six themes, retry, once-only rewards, new words, shared progress, completion routing, pending-job restoration, reduced motion, hidden-tab pause, keyboard trap and active navigation cleanup pass.
- Cache bumped to v205; JS/CSS entry URLs updated. All 68 existing local factory images decode offline. No new runtime assets. JavaScript syntax and whitespace checks pass.
- Screenshots: artifacts/momentum-factory/guided-start.png and guide-390.png, guide-320.png, guide-844.png, guide-1365.png. No commit, staging, push or deployment performed for this revision.


## ROBO WORKSHOP revision (2026-09-20, current)
- Rebuilt the game presentation and regenerated all local factory/robot art with
  the reproducible bake. Three new robot portraits are in the offline cache. Source
  and licenses are recorded in CREDITS.md and provenance.json.
- First build: three actual answers. First direct sale: six. Guided campaign: 241.
  Original line-only campaign, updated for the introductory price: 238. Existing
  saved points, money, jobs, progress and ownership are retained.
- Added optional answer-charged turbo, actual twice-speed production, persistent
  energy/remaining duration, nine earned collection entries, selectable unlocked
  robots, sound/mute, physical sale feedback and machine progress meters.
- Added momentum_factory_play_test.js for exact turbo timing, duplicate activation,
  real outputs, old-save migration, pauses, ending freeze and robot unlock rules.
- Added momentum_factory_play_browser.cjs: real three-answer build and turbo,
  once-only answer energy, question freeze, mid-boost reload, collection locks,
  actual first-order completion, unlocked robot selection and mute persistence.
  Captures every theme and desktop/phone/short-landscape gameplay.
- Passed all existing factory suites with economy expectations updated, the new
  guide/play suites and 82 Adventure assertions. Offline test decodes 71 images.
  Layout tests cover six themes, both directions, new words, retry, completion,
  touch, keyboard, reduced motion and viewport sizes down to 320x568 / 667x320.
- Inspected opening, learning, collection, milestone, populated factory and mobile
  captures. Fixed badge overlays intercepting station taps and short-landscape
  framing. Runtime has no external model renderer, debug currency or new dependency.
- Cache/versioned entry assets: v207. Screenshots: artifacts/momentum-factory/
  robo-welcome.png, robo-factory-1365.png, robo-factory-390.png,
  robo-factory-844.png, robo-collection.png and robo-milestone.png.
- No commit, staging, push or deployment. Playtesting with a child has not been done.


Neighborhood continuation: added real optional request selection, incoming-stock
reservation, physical pickup/carry/handoff, a cancellation recovery path and the
ninth earned badge. Pure special tests verify stock contention, no negative stock,
single payment, gathering while the normal shop operates, relocation/cancellation,
pause, in-transit restoration and additive migration from the prior play state.
The special browser test starts from zero funds, earns six actual answers, reaches
the first shop sale, selects a request through the shop, pauses it for learning,
reloads while carrying goods and verifies payment/badge after handoff. Choice panels
fit phone portrait, short landscape and desktop. Mobile whole-factory view is
available. Cache bumped to v207; no additional runtime asset dependency.
Screenshots: robo-special-choice.png, robo-special-delivery.png, robo-special-prize.png.

## Factory clarity revision (2026-09-22)
The delivered revision focuses on starting, choosing one useful speed improvement
and reading the concurrent production line. The giant-robot/party experiment has
been removed from runtime, assets, tests, renderer and cache.

New `momentum_factory_flow_test.js` covers automatic guided start using an existing
worker, no free second worker, exact input reservations, one-action hire/assignment,
real overlapping jobs, upgrade affordability and faster processing. Concurrency is
checked across cycle boundaries, including the legitimate idle tick between jobs.
The browser flow starts from zero funds, accepts three actual engine answers,
automatically starts production, reaches the first sale after six and two staffed
machines after 21. Targeted practice returns to its purchase panel once funded.
It also checks five viewport sizes, usable production-strip targets, readable bound
labels, real inventory output and saved restoration. Later five-station setup is an
isolated test fixture, never a shipped funding control.

Regression coverage: 62 factory-core checks, 82 Adventure checks, integration and
pure guide/market/play/special suites; browser campaign, guide, play, special,
layout, runtime, market and first-sale suites; offline startup/reload and decoding
of all 71 runtime images. Current cache: v210-factory-clarity.
Screenshots: factory-simple-start.png, factory-flow-390.png, factory-flow-1365.png,
factory-speed-390.png and factory-upgrade-success.png under artifacts/momentum-factory.
No child playtest, staging, commit, push or deployment is represented by these checks.

Original-character follow-up: restored the existing KayKit Knight model, original
Walking_A/Interact worker clips and textured appearance throughout the game, with
Cheer portraits for the companion/collection. Removed the three unused robot portraits
and switched the offline manifest to the three crew portraits. Saved team identifiers
are unchanged. Rechecked physical gait, original-crew screenshots, the guided speed
flow, collection selection and all 71 offline images. Cache: v211-original-crew.


### Worker-first progression and purchased internal conveyors (v213)

Start with one employee and no conveyors. Employees gather/carry inputs and operate
level-one machines. Each non-supply station offers a 10-coin incoming conveyor;
the speed panel recommends it after staffing. Transport takes 1.2 instead of 2.6
seconds and its operator stays beside the machine. Level-two purchases include
the conveyor, preserving existing upgraded saves. No belts connect the forest or
shop: collection, checkout and customer deliveries use the original Knight people.
Purchasing during transport restores carried input exactly once before restarting.
Finished products sell automatically even before packing/shipping exist. Sales
reserve the next downstream batch and do not award learning stars or boxed orders.
Worker atlases use content-versioned URLs to bypass old cached robot images.
