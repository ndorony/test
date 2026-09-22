# מפעל תנופה / Momentum Factory — implementation specification

An original expanding factory: learning buys machines and staff, whose automation
turns raw materials into increasingly valuable products and sales.

## Identity and integration
New appType `momentum_factory`, games/momentum-factory.js/.css. Append to the
existing ch51/ch51s (5_1) and g611/g611h (6.1_1) groups at indices 7/13. Preserve
Factory Tycoon, Hexkeep, all existing IDs, shared learning keys and saved progress.
No homepage or Adventure entry. Hebrew interface; existing chapter/direction data.

## Factory loop
Learning earns one spendable knowledge star and one turbo charge (maximum three charges). Points buy new machines, their
upgrades and workers. Sales generate separate money, used alongside knowledge
for machinery upgrades. No conversion from money to knowledge.

Five useful production stations: receiving/raw material loader → press → assembly
machine → packing station → shipping dock. Each begins at level 1 with a manual
one-batch action; assigning a worker makes it repeat autonomously. Level 2 adds
machine automation even without a worker; level 3 makes advanced products and
increases batch size/speed. Workers accelerate procurement, manufacturing and
shipping and visibly fetch/carry inputs and work at stations. Employees can be
freely reassigned. Machines can be freely relocated to an empty floor position.
Purchases remain owned: no destructive bankruptcy, demolition loss or learning reset.

Three customer orders: simple products, tool kits, then precision robots. Each
order uses a distinct material/product grade; higher-grade inputs require the
upgraded processing/packing/shipping capability of every station. Materials move
along actual conveyor model connections; jobs consume inputs at pickup, output
appears on completed processing, and sales occur only on delivery at the exit.
Expansion milestones pause on completion; the fulfilled robot order is victory. Players can then continue in an endless market with autonomous production and recurring customers.

## Economy
The introductory supply station costs 3 knowledge stars; each subsequent station costs 10. Upgrades cost 15 and 20 stars, giving a 218-star lower bound for the final capable line. Upgrade sales-money costs are
10 and 20; all grades of sold goods earn money. A practical early automation path
hires four additional employees for 5 points each (one starts free): 238 correct
answers. The 218 lower bound follows from producing and delivering grade-three
robots through five permanent upgraded stations, not an answer counter/gate.
Stored intermediate goods, manual clicks, extra waiting and worker speedups cannot
unlock a grade; no learning-point refund or sale-money conversion creates a bypass.
Tests enumerate machine configurations and demonstrate a complete feasible strategy.

## Art inventory and rendering
Kenney Factory Kit 3.0 (CC0): actual machine/press, piston skeletal clips, conveyors,
robot arms, crane, loading hoppers, boxes, floor, structures and screens.
KayKit Platformer Pack 1.0 FREE (CC0): colored modular platforms, pipe segments,
railings, supports, switches and signs. Use the existing CC0 RobotExpressive rig
with Walking, Punch, Idle and Wave clips for workers, products and portraits.
Use consistent camera, lights, foot anchors and material palette in local PNG
sprite/animation bakes. Machine upgrades add visible original model geometry.
Source files, license notices, exact downloaded source paths and SHA-256 hashes
are vendored and recorded. Runtime uses only local baked assets.

## Presentation and lifecycle
Viewport-filling industrial floor. Resources, order and controls float over it.
Unnumbered empty floor positions open construction choices. Machine clicks expose
upgrades, worker assignment, manual batch and relocation. No permanent management
panel. Questions and newly introduced words stay in bounded overlays over the
factory, with Hebrew controls and curriculum-aware direction/audio/images.

Reuse BaseGameComponent, generateFromList, updateWeightForKey, score lifecycle,
reloadProgress and storage wrappers. Lock each submitted attempt once. Explicit
wrong-answer retry retains question/options; correct advances after 700ms.
Only clear new-word acknowledgment at presentation completion. Simulation and all
movement/animation freeze during learning, backgrounding and order/stage endings;
save remaining timings, no offline catch-up. Normal reload requires explicit resume.
Owned RAF/timers/media/listeners clean up on route change. All themeOptions,
keyboard focus, touch, reduced motion, mobile portrait and short landscape tested.

## Validation and delivery
Pure and actual-route browser tests: full learning/factory/order/victory path,
manual-to-automatic transition, procurement/production/sales speed improvements,
worker transport, completed-event accounting, pause/resume/new words, shared
progress, route completion, save/reload, every theme/direction, mobile layouts,
reduced motion and offline assets. Run factory/Hexkeep/Adventure regressions,
syntax and diff checks. Update offline cache. Remove superseded unshipped snow-game
files from the scoped change; preserve unrelated work. Prepare scoped changes,
no commit/push. Test funding remains in isolated fixtures only.

## Recurring customers and visible prosperity
Five customers walk into the factory shop, wait, receive goods and leave with visible cargo. Finished goods are paid for only on the delivery meeting a waiting buyer. Learning-funded direct raw-material (3 stars) and parts (18 points) outlets provide optional parallel income streams using actual stock. Their service completes at the shop before inventory and money change. Outlets can be suspended and resumed without losing the purchase, protecting manufacturing inputs.

The UI shows customers served, lifetime sales revenue, receipts during the last simulation minute and development from a workshop to a thriving factory. Upgrade actions explain automation and throughput. Contextual next-step guidance offers early raw-material sales, workers, additional machines and faster production. The original 218-point production-chain lower bound remains; optional outlets do not substitute for upgrades.

Customer arrivals, service, departure, revenue history and market settings persist with the existing factory save and freeze with the simulation. Existing saves are migrated additively. The shop is framed on the front aisle. Real KayKit Platformer beveled tiles form a continuous factory floor over the Kenney base floor, with a warmer customer aisle and shared projection.

## Physical logistics and staged building
Only one empty placement target and the next missing machine are shown. The build menu follows supply, press, assembly, packing, shipping. Existing owned machines remain usable; free relocation temporarily reveals empty destinations. Empty floor pads are absent from the floor bake and appear only under purchased machines.

Customers arrive every four simulation seconds (queue capacity five), walk from the entrance to the tail and advance in FIFO order. Only a waiting customer at the front can be served. Payment follows a 1.2-second handoff of a lot actually present on the counter; the served customer walks out before disappearing. Finished-goods shipping now deposits at the counter instead of immediately generating money.

A shop worker walks from the counter to the supply/press pile, reserves a load, removes it only at pickup and carries it back to the counter. The shop worker is part of the purchased sales outlet. Reservations prevent a production worker and shop worker from consuming the same goods. Relocation safely returns a carried load once. Physical stockpiles beside each producer display actual inventory, with capped visual stacks and exact count labels. A lumbermill and grove, using the existing KayKit models, visibly supply the wood collection route.

Market schema 2 migrates old saves additively: points, machines, inventory, purchases, learning and completed sales remain; old decorative visits are replaced by the FIFO queue. Pending loads, queue movement, incoming-customer timer, counter stock and sales service timing persist and freeze with learning/background pauses.

## Guided play for age eight (2026-09-20)
The next mission is derived from the existing factory save: earn points, build, start installation, assign a worker, open the first shop, wait for actual payment, extend the chain and upgrade for each order. A single explicit action performs the suggested transaction through the existing economy functions. The guide is optional; contextual management remains available. Learning shows the next purchase and missing points. There is no tutorial save or reset of existing progress.

Opening uses existing licensed machine art and three brief steps. Mission thumbnails, highlighted machine targets, larger build markers, themed rounded HUD, purchase/order progress and first-sale feedback explain cause and effect. No new runtime assets or dependencies. Currency, prices, scoring, registration and campaign targets are unchanged.


## ROBO WORKSHOP play redesign (current, supersedes earlier presentation notes)
The first build needs three answers and the first direct sale needs six (3 for supply,
3 for the raw-material outlet). No free currency, starter inventory or save reset.
All other purchase prices and the one-answer/one-star learning contract remain.
Existing saved balances and ownership remain intact; the additive play state starts
with zero energy so old answers cannot be redeemed twice.

Robo, an animated CC0 robot, replaces the armored workers and appears in the opening,
missions, learning console and order celebrations. Machines have distinct material
colors, world-space cycle meters, installation feedback and physical stock. A compact
HUD and bottom controls reserve the center for the factory; narrow screens pan.

Three accepted correct answers charge an optional eight-second turbo. Activating it
consumes the charges once and advances the entire production/transport/customer
simulation at twice speed. It does not create stock, money or knowledge. Energy,
remaining turbo time, selected robot and sound preference persist. Questions, new
words, explicit pause, hidden tabs and stage endings freeze all remaining timings.

Nine earned collection entries reflect actual construction, sale, hiring, complete
line, turbo use and the three orders. The first two completed orders unlock mint and
berry robots, selectable as the visible workshop crew and companion. No duplicate
reward currency is attached to badges. Newly earned badges and physical payments
produce small, nonblocking world feedback. Synthesized optional sound effects have
a visible mute button and an owned AudioContext closed on destruction.

The guided complete campaign costs 241 accepted answers including the introductory
outlet and a full crew. A 238-answer line-only route also wins. Pure tests prove both
paths; active turbo only changes elapsed time, never progression funding.


## Optional neighborhood requests
After the first shop sale, a visiting robot offers a choice: three raw materials
for 12 coins, or two parts for 16 coins. The parts request requires a press.
The player may keep materials in the main line, or reserve them for one request.
When stock is short the selected request reserves incoming materials automatically;
it does not wait forever while the ordinary shop consumes the same goods.
Already reserved production/porter loads keep priority. Gathering may follow a new
production grade if machines are upgraded while waiting.

A separate robot walks from the visitor to the real source pile, removes inventory
only at pickup, carries the goods back and completes a one-second handoff. Coins
arrive only at handoff. No learning stars or main-order delivery credit are created.
All request phases, reservations, visitor state and payment count persist and freeze
with the same simulation. Canceling or relocating the source returns a carried load
exactly once. A completed request unlocks the ninth collection badge.

Mobile users can switch between close-up and whole-factory framing without changing
the world state. The special visitor sits inside the useful portrait framing.

## Clear start and visibly parallel production (2026-09-22)
The opening shows the actual first machine and an explicit three-answer objective.
The guided build action purchases it, assigns an already available worker and starts
installation in one action. No worker or currency is created. Subsequent guided
builds use a spare worker only when one exists; guided hiring assigns the purchased
worker to the waiting machine. Advanced contextual controls remain available.

The speed button becomes available after the first sale. Its single recommendation
first addresses an unstaffed level-one machine, then upgrades a lowest-level installed
machine. The child sees the existing and improved art, extra units per cycle, star
cost and sales-coin cost. It does not claim to measure a dynamic throughput bottleneck.
Choosing to earn missing stars binds that practice session to the selected improvement.
After the final needed answer's readable feedback, the game returns to the purchase
panel. Cash requirements and explicit purchase remain enforced. Repeated callbacks
after the panel closes cannot purchase a second improvement. Insufficient cash while
paused offers a direct resume action. Actual installation completion shows feedback.

From two machines onward, an interactive production strip shows real jobs running
concurrently. World labels distinguish installation, gathering, transport, processing,
shipping, no worker, reserved/missing inputs and full storage. A waiting machine can
link directly to the upstream producer. Displayed progress derives from the real job;
there is no decorative production or added inventory. Existing scene animation,
transport, pause and persistence remain authoritative. New play state is initialized
before Vue observes the factory so derived controls stay reactive.

The optional giant-robot project and party experiment are absent from the delivered
game, assets and offline manifest. Cache v210-factory-clarity contains the existing
71 local factory images. Curriculum, registrations, saved funds and the learning
economy are unchanged by this clarity revision.

## Original characters restored (2026-09-22, current art)
At the user's request, the original KayKit Knight characters again supply workers,
shop customers, companion, visitors and collection portraits. Walking_A and Interact
drive the original six-direction atlases; Cheer supplies the companion pose. Original
texture and helmet are retained, sword/shield hidden. Team skins remain compatible
with existing gold/mint/berry saved values. The RobotExpressive character portraits
are removed from runtime and cache; product art again uses the original Kenney arm.
Factory colors, guided start, speed improvements and concurrent production remain.
The updated cache is v211-original-crew, with 71 runtime images and no new dependency.


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
