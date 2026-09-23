// Focused tests for the Factory City game. The production module exposes pure
// config/state helpers and a Vue component factory, so its contracts can be
// exercised without a browser renderer. Mirrors tests/factory_tycoon_test.js.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const GAME_SOURCE = fs.readFileSync(path.join(ROOT, 'games/factory-city.js'), 'utf8');

let passed = 0;
let failed = 0;
function check(name, condition, extra) {
    if (condition) { passed += 1; console.log('  PASS', name); }
    else { failed += 1; console.log('  FAIL', name, extra === undefined ? '' : '| ' + extra); }
}

function makeGameContext() {
    const context = {
        console, setTimeout, clearTimeout,
        requestAnimationFrame: () => 0, cancelAnimationFrame: () => {},
        Vue: {extend: d => d, component: (name, d) => d},
    };
    context.window = context;
    context.globalThis = context;
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'themes.js'), 'utf8'), context, {filename: 'themes.js'});
    vm.runInContext(GAME_SOURCE, context, {filename: 'games/factory-city.js'});
    return context;
}

const ctx = makeGameContext();
const FACTORY_CITY_UPGRADES = vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + ';DATA.FACTORY_CITY_UPGRADES',
    (() => { const c = {}; vm.createContext(c); return c; })()
);

console.log('--- 1. building/upgrade data ---');
check('DATA.FACTORY_CITY_UPGRADES has content', Array.isArray(FACTORY_CITY_UPGRADES) && FACTORY_CITY_UPGRADES.length > 0, FACTORY_CITY_UPGRADES && FACTORY_CITY_UPGRADES.length);
check('the plan passes validation', ctx.validateFactoryCityUpgrades(FACTORY_CITY_UPGRADES).length === 0, JSON.stringify(ctx.validateFactoryCityUpgrades(FACTORY_CITY_UPGRADES)));
check('validation rejects an unknown building', ctx.validateFactoryCityUpgrades([
    {name: {type: 'text', value: 'x'}, building: 'not-a-building', level: 1, kind: 'build', cost: 10},
]).length === 1);
check('validation rejects a non-positive cost', ctx.validateFactoryCityUpgrades([
    {name: {type: 'text', value: 'x'}, building: 'factory', level: 1, kind: 'build', cost: 0},
]).length === 1);
check('every building reaches a tier that has a matching sprite', FACTORY_CITY_UPGRADES.every(item => {
    if (item.kind === 'hire') return true;
    const cfg = ctx.FC_BUILDINGS[item.building];
    return cfg && item.level <= cfg.tiers.length;
}));
check('worker hires have explicit roles and increasing crew levels', FACTORY_CITY_UPGRADES.filter(item => item.kind === 'hire').every((item, index, hires) =>
    !!item.worker && (index === 0 || item.level > hires[index - 1].level)));

console.log('--- 2. derived city state ---');
const empty = ctx.deriveCityState(FACTORY_CITY_UPGRADES, []);
check('with nothing purchased only the prebuilt HQ (level 1) stands', empty.levels.hq === 1 && empty.levels.factory === 0 && empty.built === 1, JSON.stringify(empty));
const partial = ctx.deriveCityState(FACTORY_CITY_UPGRADES, [0, 7, 12]);
check('buying factory build + its two upgrades raises the factory to level 3', partial.levels.factory === 3, JSON.stringify(partial.levels));
const everything = ctx.deriveCityState(FACTORY_CITY_UPGRADES, FACTORY_CITY_UPGRADES.map((_, i) => i));
check('buying every item builds all 8 configured plots',
    everything.built === 8 && ctx.FC_BUILDING_ORDER.every(id => everything.levels[id] > 0),
    JSON.stringify(everything.levels));
check('city state is derived only from purchases (a weight reset cannot "unbuild" a plot)',
    ctx.deriveCityState(FACTORY_CITY_UPGRADES, [0]).levels.factory === 1);
check('hiring projects grow the crew independently of building levels',
    ctx.deriveCityState(FACTORY_CITY_UPGRADES, [1, 6, 11, 19]).workers === 5);

console.log('--- 3. income scales with the city ---');
const incHqOnly = ctx.computeCityIncome(empty.levels);
const incWithFactory = ctx.computeCityIncome(ctx.deriveCityState(FACTORY_CITY_UPGRADES, [0]).levels);
const incMax = ctx.computeCityIncome(everything.levels, everything.workers);
check('an empty city earns nothing until its first factory is built', incHqOnly === 0);
check('building the factory increases income', incWithFactory > incHqOnly, incHqOnly + ' -> ' + incWithFactory);
check('a fully built city earns far more than the first factory', incMax > incWithFactory * 3, incMax + ' vs ' + incWithFactory);
const economy = ctx.computeCityEconomy(everything.levels, everything.workers);
check('economy exposes production, storage, sales, price and cycle speed',
    economy.production > 0 && economy.storage > 6 && economy.sales > 1 && economy.unitValue > 4 && economy.cycleSeconds < 4);
const factoryOnlyEconomy = ctx.computeCityEconomy(ctx.deriveCityState(FACTORY_CITY_UPGRADES, [0]).levels, 1);
const firstCycle = ctx.runCityCycle(factoryOnlyEconomy, 0);
const stockedCycle = ctx.runCityCycle(factoryOnlyEconomy, factoryOnlyEconomy.storage);
check('a production cycle turns real goods into a real payout',
    firstCycle.produced > 0 && firstCycle.sold > 0 && firstCycle.payout === firstCycle.sold * factoryOnlyEconomy.unitValue);
check('storage pressure limits production until goods are sold',
    stockedCycle.produced === 0 && stockedCycle.sold > 0 && stockedCycle.goods < factoryOnlyEconomy.storage,
    JSON.stringify(stockedCycle));
const shopEconomy = ctx.computeCityEconomy(ctx.deriveCityState(FACTORY_CITY_UPGRADES, [0, 3]).levels, 1);
check('building commerce removes a sales bottleneck', shopEconomy.sales > factoryOnlyEconomy.sales);
const staffedEconomy = ctx.computeCityEconomy(ctx.deriveCityState(FACTORY_CITY_UPGRADES, [0, 1]).levels, 2);
check('hiring a worker raises throughput and shortens the cycle',
    staffedEconomy.production > factoryOnlyEconomy.production && staffedEconomy.cycleSeconds < factoryOnlyEconomy.cycleSeconds);

console.log('--- 4. quiz config ---');
const quizDefaults = ctx.resolveCityQuiz({});
check('quiz defaults to the Chapter 4 word list in batches of 10',
    quizDefaults.listName === 'ENGLISH_CHAPTER4_ALL' && quizDefaults.questionIndex === 'english_name' &&
    quizDefaults.resultIndex === 'hebrew' && quizDefaults.setItems === 10, JSON.stringify(quizDefaults));
const quizCustom = ctx.resolveCityQuiz({quizListName: 'L', quizQuestionIndex: 'q', quizResultIndex: 'r', quizSetItems: 3});
check('quiz config is overridable per app entry',
    quizCustom.listName === 'L' && quizCustom.questionIndex === 'q' && quizCustom.resultIndex === 'r' && quizCustom.setItems === 3);

console.log('--- 5. themes and game states ---');
const themeKeys = vm.runInContext('Object.keys(themeOptions)', ctx);
check('every current theme resolves through the centralized adapter', themeKeys.every(key => {
    const kit = ctx.resolveFactoryCityTheme(key);
    return kit.key === key && kit.motif && kit.css['--fc-primary'] && kit.scene.skyTop && kit.scene.road &&
        kit.scene.yardAlt && kit.scene.safety;
}), themeKeys.join(','));
check('an unknown theme falls back to base', ctx.resolveFactoryCityTheme('future-theme').key === 'base');
check('state machine accepts the retry path',
    ctx.canFactoryCityTransition('question', 'feedback') && ctx.canFactoryCityTransition('feedback', 'question'));
check('state machine rejects input after destruction', !ctx.canFactoryCityTransition('destroyed', 'ready'));

console.log('--- 6. confirmUpgrade() gates the learning transaction ---');
const definition = ctx.createFactoryCityComponent({});
const methods = definition.methods;
check('the UI has no abstract production progress bar', definition.template.indexOf('fc-production-track') === -1);
const sceneSprites = methods.spriteNames.call({});
check('workers, conveyors, cargo and industrial props are loaded by the renderer',
    ['citizen', 'delivery-vehicle', 'yard-loader', 'conveyor-straight', 'conveyor-corner', 'cargo-box', 'industrial-tank', 'crane-magnet']
        .every(name => sceneSprites.indexOf(name) !== -1), sceneSprites.join(','));
let reports = [];
ctx.updateWeightForKey = (key, index, change) => { reports.push({key, index, change}); return [0]; };
ctx.getWeightsForKey = () => [5];
ctx.getSetItems = () => 4;
ctx.setLocalStorage = () => {};
ctx.successSound = {play() {}};
ctx.failureSound = {play() {}};

function makeInstance(overrides) {
    return Object.assign(definition.data(), {
        currentAppId: 'fc-test',
        currentApp: {listName: 'FACTORY_CITY_UPGRADES'},
        list: [{name: {value: 'Build factory'}, detail: {value: 'd'}, building: 'factory', level: 1, kind: 'build', cost: 30}],
        weights: [5], purchasedMap: {}, money: 100, score: 0,
        $set: (t, k, v) => { t[k] = v; },
        $nextTick: cb => cb(),
        saveMoney() {}, savePurchased() {}, saveScore() {},
        isCurrentRoute: () => true, reloadProgress: () => true,
        phase: 'ready', setPhase: methods.setPhase,
        triggerFx: methods.triggerFx, nextUpgradeFor: methods.nextUpgradeFor,
    }, overrides);
}

(async function run() {
    reports.length = 0;
    const ok = makeInstance({confirmUpgrade: () => Promise.resolve(true)});
    await methods.attemptUpgrade.call(ok, 0);
    check('a confirmed build deducts the cost, marks it built and scores once',
        ok.money === 70 && ok.purchasedMap[0] === true && ok.score === 1);
    check('a confirmed build reports one -15 mastery on the tech-tree key',
        reports.length === 1 && reports[0].change === -15 && reports[0].key === 'fc-test', JSON.stringify(reports));

    reports.length = 0;
    const hired = makeInstance({
        list: [{name: {value: 'Hire operator'}, detail: {value: 'd'}, worker: 'operator', level: 2, kind: 'hire', cost: 45}],
        confirmUpgrade: () => Promise.resolve(true)
    });
    await methods.attemptUpgrade.call(hired, 0);
    check('a confirmed hire spends coins, persists the project and reports once',
        hired.money === 55 && hired.purchasedMap[0] === true && reports.length === 1 && reports[0].change === -15,
        JSON.stringify({money: hired.money, purchased: hired.purchasedMap, reports}));
    check('a hired worker is announced without trying to animate a missing building plot',
        hired.liveAnnouncement.indexOf('עובד חדש') !== -1 && !!hired._workerFxAt);

    reports.length = 0;
    const cancelled = makeInstance({confirmUpgrade: () => Promise.resolve(false)});
    await methods.attemptUpgrade.call(cancelled, 0);
    check('cancelling leaves money and state untouched, no reports',
        cancelled.money === 100 && !cancelled.purchasedMap[0] && reports.length === 0);

    let dialogOpened = false;
    const poor = makeInstance({money: 10, confirmUpgrade() { dialogOpened = true; return Promise.resolve(true); }});
    await methods.attemptUpgrade.call(poor, 0);
    check('insufficient money never opens the dialog', !dialogOpened && !poor.purchasedMap[0]);

    let opens = 0;
    const busy = makeInstance({confirmUpgrade() { opens += 1; return new Promise(r => { busy._r = r; }); }});
    const a = methods.attemptUpgrade.call(busy, 0);
    const b = methods.attemptUpgrade.call(busy, 0);
    busy._r(true); await a; await b;
    check('a second concurrent attempt does not open a second dialog', opens === 1);

    const locked = makeInstance({weights: [-1]});
    reports.length = 0;
    await methods.attemptUpgrade.call(locked, 0);
    check('a locked item cannot be purchased', reports.length === 0 && !locked.purchasedMap[0]);

    const done = makeInstance({purchasedMap: {0: true}});
    reports.length = 0;
    await methods.attemptUpgrade.call(done, 0);
    check('an already-purchased item cannot be purchased again', reports.length === 0);

    console.log('--- 7. the quiz gate records answers on its own key ---');
    let engineCalls = [];
    ctx.generateFromList = (listName, questionIndex, resultIndex, key, setItems, questionType) => {
        engineCalls.push({listName, key, setItems, questionType});
        return {question: 'Art', result: 'אומנות', options: ['אומנות', 'מוזיקה', 'להקה', 'גיטרה'], action() {}, questionIndex: 7};
    };
    function makeQuiz(overrides) {
        return makeInstance(Object.assign({
            $refs: {}, shuffle: x => x,
            confirmUpgrade: methods.confirmUpgrade, quizKey: methods.quizKey,
            getUpgradeDefinition: methods.getUpgradeDefinition, openUpgradeApproval: methods.openUpgradeApproval,
            setPhase: methods.setPhase, focusQuizControl() {},
            makeUpgradeQuestion: methods.makeUpgradeQuestion, speakQuizPrompt: methods.speakQuizPrompt,
            answerUpgradeQuestion: methods.answerUpgradeQuestion, resolveUpgradeChoice: methods.resolveUpgradeChoice,
            dismissUpgrade: methods.dismissUpgrade,
        }, overrides));
    }
    // zero the reveal delays for the test
    ctx.FC_QUIZ_DELAYS.correct = 0; ctx.FC_QUIZ_DELAYS.wrong = 0;

    reports.length = 0; engineCalls = [];
    const right = makeQuiz({});
    const rightAttempt = methods.attemptUpgrade.call(right, 0);
    check('opening the dialog asks the shared engine under a dedicated quiz key',
        engineCalls.length === 1 && engineCalls[0].listName === 'ENGLISH_CHAPTER4_ALL' &&
        engineCalls[0].key === 'fc-test_quiz' && engineCalls[0].questionType === 'text', JSON.stringify(engineCalls));
    check('the engine question is attached to the dialog',
        !!(right.pendingUpgrade && right.pendingUpgrade.question) && right.pendingUpgrade.question.prompt === 'Art');
    methods.answerUpgradeQuestion.call(right, 'אומנות');
    await rightAttempt;
    check('a correct answer reports -1 on the quiz key AND purchases (-15 tech-tree)',
        right.purchasedMap[0] === true && right.money === 70 &&
        reports.some(r => r.key === 'fc-test_quiz' && r.index === 7 && r.change === -1) &&
        reports.some(r => r.key === 'fc-test' && r.change === -15), JSON.stringify(reports));

    reports.length = 0;
    let wrongReloads = 0;
    const wrong = makeQuiz({reloadProgress() { wrongReloads += 1; return true; }});
    const wrongAttempt = methods.attemptUpgrade.call(wrong, 0);
    const bad = wrong.pendingUpgrade.question.options.find(o => o !== 'אומנות');
    methods.answerUpgradeQuestion.call(wrong, bad);
    methods.answerUpgradeQuestion.call(wrong, bad);
    await new Promise(resolve => setTimeout(resolve, 5));
    check('rapid duplicate wrong input reports exactly once',
        reports.length === 1 && reports[0].key === 'fc-test_quiz' && reports[0].change === 1, JSON.stringify(reports));
    check('a wrong answer keeps the same question open for retry',
        wrong.pendingUpgrade && wrong.pendingUpgrade.question.prompt === 'Art' && wrong.quizChoice === null &&
        !wrong.purchasedMap[0] && wrongReloads === 1 && wrong.phase === 'question');
    methods.answerUpgradeQuestion.call(wrong, 'אומנות');
    await wrongAttempt;
    check('answering the retained question correctly completes the original purchase',
        wrong.purchasedMap[0] === true && reports.filter(r => r.key === 'fc-test_quiz' && r.change === -1).length === 1);

    reports.length = 0;
    ctx.generateFromList = () => { throw new Error('list missing'); };
    const fallback = makeQuiz({});
    const fbAttempt = methods.attemptUpgrade.call(fallback, 0);
    check('an unavailable quiz list falls back to a plain confirm dialog',
        fallback.pendingUpgrade !== null && fallback.pendingUpgrade.question === null);
    methods.resolveUpgradeChoice.call(fallback, true);
    await fbAttempt;
    check('the fallback confirm still purchases through the same gate',
        fallback.purchasedMap[0] === true && reports.some(r => r.key === 'fc-test'));

    console.log('--- 8. visible-object hit testing and menu registration ---');
    let selectedByHit = null;
    methods.handleTap.call({
        pendingUpgrade: null, phase: 'ready',
        _hitRegions: [{id: 'factory', x: 100, y: 50, w: 80, h: 120}],
        selectBuilding(id) { selectedByHit = id; },
        cellFromScreen() { return {c: 0, r: 0}; }, buildingAtCell() { return null; }
    }, 130, 75);
    check('tapping a visible sprite bound selects that building', selectedByHit === 'factory');
    const apps = vm.runInContext(fs.readFileSync(path.join(ROOT, 'apps.js'), 'utf8') + ';apps',
        (() => { const c = {}; vm.createContext(c); return c; })());
    const entry = vm.runInContext(
        `(function find(n){ if(n.type==='app' && n.appType==='factory_city') return n; for(const ch of (n.items||[])){const f=find(ch);if(f)return f;} return null;})(${JSON.stringify(apps)})`,
        (() => { const c = {}; vm.createContext(c); return c; })()
    );
    check('the menu registers a factory_city app on the FACTORY_CITY_UPGRADES list',
        entry && entry.listName === 'FACTORY_CITY_UPGRADES' && entry.setItems === 4, JSON.stringify(entry));
    check('the app entry wires the Chapter 4 quiz',
        entry && entry.quizListName === 'ENGLISH_CHAPTER4_ALL' && entry.quizQuestionIndex === 'english_name' &&
        entry.quizResultIndex === 'hebrew' && entry.quizSetItems === 10, JSON.stringify(entry));

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed) process.exit(1);
})();
