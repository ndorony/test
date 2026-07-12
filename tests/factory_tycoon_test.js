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
check('purchasing every item reaches the maxed-out factory', everything.sawmillLevel === 4 && everything.workersHired === 3 && everything.packagingBuilt === true);
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

    console.log('--- 5. legacy registration ---');
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
    check('the registered list resolves through the shared data API and passes validation',
        ctx.validateFactoryUpgrades(integration.DATA.FACTORY_UPGRADES).length === 0);

    console.log(`\n${passed} passed, ${failed} failed`);
    if (failed) process.exit(1);
})();
