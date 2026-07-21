// Focused tests for the Factory Tycoon game. The production module exposes
// pure configuration/state helpers and a Vue component factory, so its
// contracts can be exercised without a browser renderer.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const GAME_SOURCE = fs.readFileSync(path.join(ROOT, 'games/factory-tycoon.js'), 'utf8');

let passed = 0;
let failed = 0;
function check(name, condition, extra) {
    if (condition) {
        passed += 1;
        console.log('  PASS', name);
    } else {
        failed += 1;
        console.log('  FAIL', name, extra === undefined ? '' : '| ' + extra);
    }
}

function makeThemeOptions() {
    const palette = (primary, secondary, tertiary, accent, background, text) => ({
        colors: {primary, secondary, tertiary, accent, background, text},
    });
    return {
        base: palette('#006064', '#78909c', '#B0E0E6', '#C0C0C0', '#F5F5F5', '#000000'),
        soldiers: palette('#4B5320', '#C0C0C0', '#BDB76B', '#FFD700', '#F0F0E0', '#000000'),
        unicorn: palette('#FF69B4', '#BA55D3', '#FFB6C1', '#FFD700', '#FFF0F5', '#4B0082'),
        space: palette('#1E90FF', '#000080', '#87CEEB', '#FFD700', '#000020', '#FFFFFF'),
        dark: palette('#121212', '#1E1E1E', '#2F4F4F', '#BB86FC', '#1C1C1C', '#E0E0E0'),
        code: palette('#00FF41', '#008F11', '#0D2818', '#39FF14', '#050A05', '#00FF41'),
    };
}

function makeGameContext() {
    let selectedTheme = 'base';
    const context = {
        console,
        setTimeout,
        clearTimeout,
        requestAnimationFrame: () => 0,
        cancelAnimationFrame: () => {},
        themeOptions: makeThemeOptions(),
        getLocalStorage: key => key === 'theme' ? selectedTheme : null,
        Vue: {
            extend: definition => definition,
            component: (name, definition) => definition,
        },
    };
    context.window = context;
    context.globalThis = context;
    context.setThemeForTest = key => { selectedTheme = key; };
    vm.createContext(context);
    vm.runInContext(GAME_SOURCE, context, {filename: 'games/factory-tycoon.js'});
    return context;
}

console.log('--- 1. tech tree configuration ---');
const ctx = makeGameContext();
const FACTORY_UPGRADES = vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + ';DATA.FACTORY_UPGRADES',
    (() => { const c = {}; vm.createContext(c); return c; })()
);
check('DATA.FACTORY_UPGRADES has content', Array.isArray(FACTORY_UPGRADES) && FACTORY_UPGRADES.length > 0, FACTORY_UPGRADES && FACTORY_UPGRADES.length);
check('tech tree passes validation', ctx.validateFactoryUpgrades(FACTORY_UPGRADES).length === 0, JSON.stringify(ctx.validateFactoryUpgrades(FACTORY_UPGRADES)));
check('tech tree length divides evenly into batches of 4 (setItems)', FACTORY_UPGRADES.length % 4 === 0, FACTORY_UPGRADES.length);
check('validation rejects an unknown machine key', ctx.validateFactoryUpgrades([
    {name: {type: 'text', value: 'x'}, machine: 'not-a-machine', level: 1, kind: 'upgrade', cost: 10},
]).length === 1);
check('validation rejects a non-positive cost', ctx.validateFactoryUpgrades([
    {name: {type: 'text', value: 'x'}, machine: 'sawmill', level: 1, kind: 'upgrade', cost: 0},
]).length === 1);

console.log('--- 2. derived factory state is independent of engine weight resets ---');
check('with nothing purchased, only the starting sawmill (level 1) exists',
    JSON.stringify(ctx.deriveFactoryState(FACTORY_UPGRADES, []).machines) ===
    JSON.stringify(ctx.FT_DEFAULT_MACHINES || {sawmill: 1, workshop: 0, packaging: 0, conveyor1: 0, conveyor2: 0, worker1: 0, worker2: 0, worker3: 0, storage: 0, sign: 0}));
const partial = ctx.deriveFactoryState(FACTORY_UPGRADES, [0, 2, 3]);
check('purchasing indices 0,2,3 upgrades sawmill, hires worker1, builds workshop',
    partial.machines.sawmill === 2 && partial.machines.worker1 === 1 && partial.workshopBuilt === true, JSON.stringify(partial));
check('workersHired counts only hired worker slots', partial.workersHired === 1);
const everything = ctx.deriveFactoryState(FACTORY_UPGRADES, FACTORY_UPGRADES.map((_, index) => index));
check('purchasing every item reaches the maxed-out factory',
    everything.sawmillLevel === 10 && everything.workshopLevel === 9 && everything.packagingLevel === 9 &&
    everything.storageLevel === 6 && everything.workersHired === 6 && everything.packagingBuilt === true,
    JSON.stringify({saw: everything.sawmillLevel, work: everything.workshopLevel, pack: everything.packagingLevel, store: everything.storageLevel, hired: everything.workersHired}));
check('the expanded tree is a long progression (44 quiz-gated stages)', FACTORY_UPGRADES.length === 44, FACTORY_UPGRADES.length);
check('every hireable worker slot (1-6) is reachable and counted',
    ctx.deriveFactoryState(FACTORY_UPGRADES, FACTORY_UPGRADES.map((_, i) => i)).workersHired === 6);
check('a later weight reset (site-wide practice-mode loop) cannot be represented as "unbuilt" because state is derived only from purchases, not from weights',
    ctx.deriveFactoryState(FACTORY_UPGRADES, [0]).machines.sawmill === 2);

console.log('--- 3. all six themes resolve through one adapter ---');
['base', 'soldiers', 'unicorn', 'space', 'dark', 'code'].forEach(key => {
    ctx.setThemeForTest(key);
    const resolved = ctx.resolveFactoryTheme();
    check(`${key} theme resolves`, resolved.key === key);
    check(`${key} exposes semantic tokens and a scene name`,
        !!resolved.css['--ft-primary'] && !!resolved.css['--ft-panel'] && !!resolved.motif.sceneName, JSON.stringify(resolved));
});
ctx.setThemeForTest('unknown-theme');
check('unknown theme safely falls back to base', ctx.resolveFactoryTheme().key === 'base');

console.log('--- 4. confirmUpgrade() is the sole gate for the learning transaction ---');
function makeUpgradeInstance(definition, overrides) {
    return Object.assign(definition.data(), {
        currentAppId: 'ft-test',
        currentApp: {listName: 'FACTORY_UPGRADES'},
        list: [{name: {value: 'Upgrade A'}, detail: {value: 'd'}, machine: 'sawmill', level: 2, kind: 'upgrade', cost: 50}],
        weights: [5],
        purchasedMap: {},
        money: 100,
        score: 0,
        $set: (target, key, value) => { target[key] = value; },
        $nextTick: callback => callback(),
        saveMoney: function () {},
        savePurchased: function () {},
        saveScore: function () {},
        isCurrentRoute: () => true,
        reloadProgress: () => true,
    }, overrides);
}

const definition = ctx.createFactoryTycoonComponent({});
const methods = definition.methods;
let reports = [];
ctx.updateWeightForKey = (key, index, change) => { reports.push({key, index, change}); return [0]; };
ctx.successSound = {play() {}};

(async function runLifecycleTests() {
    reports.length = 0;
    const confirmed = makeUpgradeInstance(definition, {confirmUpgrade: () => Promise.resolve(true)});
    await methods.attemptUpgrade.call(confirmed, 0);
    check('confirmed upgrade reports exactly one weight update of -15 (fully masters that tech-tree item)',
        reports.length === 1 && reports[0].change === -15, JSON.stringify(reports));
    check('confirmed upgrade deducts the cost from money', confirmed.money === 50, confirmed.money);
    check('confirmed upgrade marks the item permanently purchased', confirmed.purchasedMap[0] === true);
    check('confirmed upgrade increments score once', confirmed.score === 1);

    reports.length = 0;
    const cancelled = makeUpgradeInstance(definition, {confirmUpgrade: () => Promise.resolve(false)});
    await methods.attemptUpgrade.call(cancelled, 0);
    check('cancelling reports no weight update', reports.length === 0);
    check('cancelling leaves money untouched', cancelled.money === 100);
    check('cancelling does not mark the item purchased', !cancelled.purchasedMap[0]);

    let confirmOpenCount = 0;
    const busy = makeUpgradeInstance(definition, {
        confirmUpgrade: function () { confirmOpenCount += 1; return new Promise(resolve => { busy._resolveTest = resolve; }); },
    });
    const first = methods.attemptUpgrade.call(busy, 0);
    const second = methods.attemptUpgrade.call(busy, 0);
    busy._resolveTest(true);
    await first; await second;
    check('a second concurrent attempt while a dialog is open does not open a second dialog', confirmOpenCount === 1);

    reports.length = 0;
    const destroyed = makeUpgradeInstance(definition, {
        confirmUpgrade: function () { destroyed._destroyedFt = true; return Promise.resolve(true); },
    });
    await methods.attemptUpgrade.call(destroyed, 0);
    check('a component destroyed while the dialog was open applies no state after resolution',
        reports.length === 0 && destroyed.money === 100);

    reports.length = 0;
    const locked = makeUpgradeInstance(definition, {weights: [-1]});
    await methods.attemptUpgrade.call(locked, 0);
    check('a locked (not-yet-open) item cannot be upgraded', reports.length === 0);

    reports.length = 0;
    const alreadyDone = makeUpgradeInstance(definition, {weights: [0], purchasedMap: {0: true}});
    await methods.attemptUpgrade.call(alreadyDone, 0);
    check('an already-purchased item cannot be purchased again', reports.length === 0);

    let dialogOpened = false;
    const poor = makeUpgradeInstance(definition, {
        money: 10,
        confirmUpgrade: function () { dialogOpened = true; return Promise.resolve(true); },
    });
    await methods.attemptUpgrade.call(poor, 0);
    check('insufficient money never opens the confirmation dialog', !dialogOpened);

    let saveScoreCalls = 0;
    const stageComplete = makeUpgradeInstance(definition, {
        confirmUpgrade: () => Promise.resolve(true),
        saveScore: function () { saveScoreCalls += 1; },
        reloadProgress: () => false,
    });
    await methods.attemptUpgrade.call(stageComplete, 0);
    check('reloadProgress() === false (engine navigated away) skips saveScore, following MCQComponent', saveScoreCalls === 0);

    saveScoreCalls = 0;
    const stageContinues = makeUpgradeInstance(definition, {
        confirmUpgrade: () => Promise.resolve(true),
        saveScore: function () { saveScoreCalls += 1; },
        reloadProgress: () => true,
    });
    await methods.attemptUpgrade.call(stageContinues, 0);
    check('reloadProgress() === true saves score and continues', saveScoreCalls === 1);

    console.log('--- 5. quiz config + engine-served questions ---');
    const quizDefaults = ctx.resolveFactoryQuiz({});
    check('quiz defaults to the Chapter 4 word list in batches of 10',
        quizDefaults.listName === 'ENGLISH_CHAPTER4_ALL' && quizDefaults.questionIndex === 'english_name' &&
        quizDefaults.resultIndex === 'hebrew' && quizDefaults.setItems === 10,
        JSON.stringify(quizDefaults));
    const quizCustom = ctx.resolveFactoryQuiz({quizListName: 'L', quizQuestionIndex: 'q', quizResultIndex: 'r', quizSetItems: 3});
    check('quiz config is overridable per app entry',
        quizCustom.listName === 'L' && quizCustom.questionIndex === 'q' && quizCustom.resultIndex === 'r' && quizCustom.setItems === 3);

    console.log('--- 6. quiz gate: the shared engine selects and records answers ---');
    ctx.FT_QUIZ_DELAYS.correct = 0;
    ctx.FT_QUIZ_DELAYS.wrong = 0;
    ctx.failureSound = {play() {}};
    let engineCalls = [];
    let quizSpoken = 0;
    ctx.generateFromList = (listName, questionIndex, resultIndex, key, setItems, questionType) => {
        engineCalls.push({listName, questionIndex, resultIndex, key, setItems, questionType});
        return {
            question: 'Art',
            result: 'אומנות',
            options: ['אומנות', 'מוזיקה', 'להקה', 'גיטרה'],
            action: () => { quizSpoken += 1; },
            questionIndex: 7,
        };
    };
    function makeQuizInstance(overrides) {
        return makeUpgradeInstance(definition, Object.assign({
            $refs: {},
            shuffle: a => a,
            confirmUpgrade: methods.confirmUpgrade,
            nextUpgradeFor: methods.nextUpgradeFor,
            quizKey: methods.quizKey,
            openUpgradeApproval: methods.openUpgradeApproval,
            makeUpgradeQuestion: methods.makeUpgradeQuestion,
            speakQuizPrompt: methods.speakQuizPrompt,
            answerUpgradeQuestion: methods.answerUpgradeQuestion,
            resolveUpgradeChoice: methods.resolveUpgradeChoice,
            dismissUpgrade: methods.dismissUpgrade,
            quizOptionClass: methods.quizOptionClass,
        }, overrides));
    }

    reports.length = 0;
    engineCalls = [];
    const quizRight = makeQuizInstance({});
    const rightAttempt = methods.attemptUpgrade.call(quizRight, 0);
    check('opening the upgrade dialog asks the shared engine for a question',
        engineCalls.length === 1 && engineCalls[0].listName === 'ENGLISH_CHAPTER4_ALL' && engineCalls[0].questionIndex === 'english_name' &&
        engineCalls[0].resultIndex === 'hebrew' && engineCalls[0].setItems === 10 && engineCalls[0].questionType === 'text',
        JSON.stringify(engineCalls));
    check('the quiz uses its own knowledge key, separate from the tech tree',
        engineCalls[0].key === 'ft-test_quiz');
    check('the engine question is attached to the dialog',
        !!(quizRight.pendingUpgrade && quizRight.pendingUpgrade.question) && quizRight.pendingUpgrade.question.prompt === 'Art' &&
        quizRight.pendingUpgrade.question.options.length === 4, JSON.stringify(quizRight.pendingUpgrade));
    check('opening the dialog speaks the prompt via the engine action', quizSpoken === 1);
    methods.answerUpgradeQuestion.call(quizRight, quizRight.pendingUpgrade.question.answer);
    check('a correct choice is recorded as correct', quizRight.quizCorrect === true);
    await rightAttempt;
    check('a correct answer reports -1 on the quiz key, like MCQComponent',
        reports.some(r => r.key === 'ft-test_quiz' && r.index === 7 && r.change === -1), JSON.stringify(reports));
    check('a correct answer still purchases the upgrade and reports the tech-tree item',
        quizRight.purchasedMap[0] === true && quizRight.money === 50 &&
        reports.some(r => r.key === 'ft-test' && r.index === 0 && r.change === -15) && reports.length === 2,
        JSON.stringify(reports));

    reports.length = 0;
    const quizWrong = makeQuizInstance({});
    const wrongAttempt = methods.attemptUpgrade.call(quizWrong, 0);
    const wrongOption = quizWrong.pendingUpgrade.question.options.find(option => option !== quizWrong.pendingUpgrade.question.answer);
    methods.answerUpgradeQuestion.call(quizWrong, wrongOption);
    methods.answerUpgradeQuestion.call(quizWrong, quizWrong.pendingUpgrade.question.answer);
    check('the first answer locks in; a second click is ignored',
        quizWrong.quizChoice === wrongOption && quizWrong.quizCorrect === false);
    methods.dismissUpgrade.call(quizWrong);
    check('a scrim tap after answering does not close the reveal early', quizWrong.pendingUpgrade !== null);
    await wrongAttempt;
    check('a wrong answer reports +1 on the quiz key and cancels the purchase',
        quizWrong.money === 100 && !quizWrong.purchasedMap[0] &&
        reports.length === 1 && reports[0].key === 'ft-test_quiz' && reports[0].change === 1,
        JSON.stringify(reports));

    reports.length = 0;
    const quizCancel = makeQuizInstance({});
    const cancelAttempt = methods.attemptUpgrade.call(quizCancel, 0);
    methods.dismissUpgrade.call(quizCancel);
    await cancelAttempt;
    check('a scrim tap before answering cancels cleanly with no reports',
        quizCancel.money === 100 && reports.length === 0 && quizCancel.pendingUpgrade === null);

    reports.length = 0;
    ctx.generateFromList = () => { throw new Error('List does not exist'); };
    const quizFallback = makeQuizInstance({confirmUpgrade: methods.confirmUpgrade});
    const fallbackAttempt = methods.attemptUpgrade.call(quizFallback, 0);
    check('an unavailable quiz list falls back to the plain confirm dialog',
        quizFallback.pendingUpgrade !== null && quizFallback.pendingUpgrade.question === null);
    methods.resolveUpgradeChoice.call(quizFallback, true);
    await fallbackAttempt;
    check('the fallback confirm still purchases through the same gate',
        quizFallback.purchasedMap[0] === true && reports.length === 1 && reports[0].key === 'ft-test');
    ctx.generateFromList = (listName, questionIndex, resultIndex, key, setItems, questionType) => {
        engineCalls.push({listName, questionIndex, resultIndex, key, setItems, questionType});
        return {question: 'Art', result: 'אומנות', options: ['אומנות', 'מוזיקה', 'להקה', 'גיטרה'], action: () => { quizSpoken += 1; }, questionIndex: 7};
    };

    console.log('--- 7. upgrade hints drive the scene "+" badges ---');
    const hintsRich = makeQuizInstance({money: 100});
    const richHints = methods.upgradeHints.call(hintsRich);
    check('a station with a pending upgrade is marked available and affordable',
        richHints.sawmill && richHints.sawmill.available === true && richHints.sawmill.affordable === true && richHints.sawmill.cost === 50,
        JSON.stringify(richHints.sawmill));
    check('a station with no pending upgrade is marked unavailable',
        richHints.packaging && richHints.packaging.available === false, JSON.stringify(richHints.packaging));
    const hintsPoor = makeQuizInstance({money: 10});
    const poorHints = methods.upgradeHints.call(hintsPoor);
    check('an unaffordable upgrade stays visible but not affordable',
        poorHints.sawmill.available === true && poorHints.sawmill.affordable === false);
    const hintsDone = makeQuizInstance({purchasedMap: {0: true}});
    const doneHints = methods.upgradeHints.call(hintsDone);
    check('a purchased upgrade no longer advertises a badge', doneHints.sawmill.available === false);

    console.log('--- 8. legacy registration ---');
    function makeStorage() {
        const map = new Map();
        return {
            getItem: key => map.has(key) ? map.get(key) : null,
            setItem: (key, value) => map.set(key, String(value)),
            _map: map,
        };
    }
    const integration = {
        console,
        localStorage: makeStorage(),
        sessionStorage: makeStorage(),
        navigator: {},
        Audio: class { play() {} },
        he: {decode: value => value},
    };
    integration.window = integration;
    integration.globalThis = integration;
    integration.sessionStorage.setItem('username', 'factory-test');
    vm.createContext(integration);
    function load(file, suffix = '') {
        vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8') + suffix, integration, {filename: file});
    }
    load('data.js', ';globalThis.DATA=DATA;');
    load('apps.js', ';globalThis.apps=apps;');
    load('worlds.js');
    load('storage.js');
    const tester = fs.readFileSync(path.join(ROOT, 'tester.js'), 'utf8');
    const cut = tester.indexOf('var ProgressBarComponent');
    vm.runInContext(tester.slice(0, cut), integration, {filename: 'tester.js(core)'});
    const legacyFactory = vm.runInContext(
        `(function find(node){ if(node.type==='app' && node.appType==='factory_tycoon') return node; for(const child of (node.items||[])){const found=find(child);if(found)return found;} return null;})(apps)`,
        integration
    );
    check('legacy menu registers a complete factory_tycoon app',
        legacyFactory && legacyFactory.listName === 'FACTORY_UPGRADES' && legacyFactory.setItems === 4, JSON.stringify(legacyFactory));
    check('the app entry wires the Chapter 4 quiz (list + fields + batch size)',
        legacyFactory && legacyFactory.quizListName === 'ENGLISH_CHAPTER4_ALL' &&
        legacyFactory.quizQuestionIndex === 'english_name' && legacyFactory.quizResultIndex === 'hebrew' &&
        legacyFactory.quizSetItems === 10,
        JSON.stringify(legacyFactory));
    check('the registered list resolves through the shared data API and passes validation',
        ctx.validateFactoryUpgrades(integration.DATA.FACTORY_UPGRADES).length === 0);

    // The quiz rides the real learning engine: weighted selection under its own
    // knowledge key, seeded and updated exactly like a regular MCQ app.
    const quizGenerated = vm.runInContext(
        `generateFromList('ENGLISH_CHAPTER4_ALL', 'english_name', 'hebrew', '5_0_quiz', 10, 'text')`,
        integration
    );
    check('the real engine serves a Chapter 4 question under the quiz key',
        quizGenerated && typeof quizGenerated.question === 'string' && quizGenerated.options.length === 4 &&
        quizGenerated.options.includes(quizGenerated.result), JSON.stringify(quizGenerated));
    check('questionType "text" renders the prompt as plain text for the modal',
        quizGenerated && !/^</.test(quizGenerated.question));
    const chapter4Length = integration.DATA.ENGLISH_CHAPTER4_ALL.length;
    const quizWeights = vm.runInContext(`JSON.parse(localStorage.getItem(getWeightsKey('5_0_quiz')))`, integration);
    check('quiz weights seed like a regular app: first batch of 10 unlocked, the rest locked',
        Array.isArray(quizWeights) && quizWeights.length === chapter4Length &&
        quizWeights.slice(0, 10).every(w => w === 5) && quizWeights.slice(10).every(w => w === -1),
        JSON.stringify(quizWeights));
    check('the engine picked the question from the unlocked batch', quizGenerated.questionIndex < 10);
    vm.runInContext(`updateWeightForKey('5_0_quiz', ${quizGenerated.questionIndex}, -1)`, integration);
    const afterAnswer = vm.runInContext(`JSON.parse(localStorage.getItem(getWeightsKey('5_0_quiz')))`, integration);
    check('a reported correct answer lowers that word\'s weight from 5 to 4',
        afterAnswer[quizGenerated.questionIndex] === 4);

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed) process.exit(1);
})();
