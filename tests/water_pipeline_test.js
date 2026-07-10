// Focused tests for the segment-based Water Pipeline game.
// The production module exposes pure configuration helpers and a Vue component
// factory, so its lifecycle can be exercised without a browser renderer.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const GAME_SOURCE = fs.readFileSync(path.join(ROOT, 'games/water-pipeline.js'), 'utf8');

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
    };
}

function makeGameContext() {
    let selectedTheme = 'base';
    const context = {
        console,
        setTimeout,
        clearTimeout,
        performance: {now: () => 0},
        globalThis: null,
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
    vm.runInContext(GAME_SOURCE, context, {filename: 'games/water-pipeline.js'});
    return context;
}

console.log('--- 1. level configuration and segment recycling ---');
const ctx = makeGameContext();
check('vertical slice configuration is valid', ctx.validateWaterPipelineLevel(ctx.WATER_PIPELINE_LEVEL).length === 0);
check('vertical slice has three interchangeable blockage visuals',
    JSON.stringify(ctx.WATER_PIPELINE_LEVEL.segments.filter(s => s.type === 'blockage').map(s => s.visual)) ===
    JSON.stringify(['root-knot', 'rotary-valve', 'mineral-plug']));
check('all blockage behavior is generic question-gate',
    ctx.WATER_PIPELINE_LEVEL.segments.filter(s => s.type === 'blockage').every(s => s.behavior === 'question-gate'));
check('middle segment window is previous/current/next', JSON.stringify(ctx.waterPipelineSegmentWindow(5, 12)) === '[4,5,6]');
check('edge segment window never creates distant segments',
    JSON.stringify(ctx.waterPipelineSegmentWindow(0, 12)) === '[0,1]' &&
    JSON.stringify(ctx.waterPipelineSegmentWindow(11, 12)) === '[10,11]');
check('segment window never exceeds three segments',
    Array.from({length: 12}, (_, index) => ctx.waterPipelineSegmentWindow(index, 12).length).every(count => count <= 3));

console.log('--- 2. all real themes resolve through one adapter ---');
['base', 'soldiers', 'unicorn', 'space', 'dark'].forEach(key => {
    ctx.setThemeForTest(key);
    const resolved = ctx.resolveWaterPipelineTheme();
    check(`${key} theme resolves`, resolved.key === key);
    check(`${key} exposes semantic water/panel tokens`,
        !!resolved.css['--wp-water'] && !!resolved.css['--wp-panel'] && !!resolved.motif.life);
});
ctx.setThemeForTest('unknown');
check('unknown theme safely falls back to base', ctx.resolveWaterPipelineTheme().key === 'base');

console.log('--- 3. questions are generated only on blockage arrival ---');
let generated = 0;
let actionPlayed = 0;
ctx.generateFromList = () => {
    generated += 1;
    return {question: 'Q', result: 'A', options: ['A', 'B'], action: () => { actionPlayed += 1; }, questionIndex: 2};
};
ctx.getSetItems = () => 3;
const definition = ctx.createWaterPipelineComponent({});
const methods = definition.methods;
const arrival = Object.assign(definition.data(), {
    gameState: 'arrivingAtBlockage',
    currentCheckpoint: 0,
    currentApp: {listName: 'LIST', questionIndex: 'q', resultIndex: 'a'},
    currentAppId: '0_0',
    _destroyedWp: false,
    shuffle: values => values,
    $nextTick: callback => callback(),
    later: callback => callback(),
    focusFirstAnswer: () => {},
});
methods.generateQuestionAtBlockage.call(arrival);
check('arrival generates exactly one question', generated === 1, generated);
check('question action plays once when console enters', actionPlayed === 1, actionPlayed);
methods.generateQuestionAtBlockage.call(arrival);
check('second call outside arrival state does not regenerate', generated === 1, generated);

console.log('--- 4. accepted answers report exactly once and keep reloadProgress ---');
const reports = [];
ctx.updateWeightForKey = (key, index, change) => reports.push({key, index, change});
ctx.getCurrentLevelProgress = () => ({progress: 1, total: 4});
ctx.successSound = {play() {}};
ctx.failureSound = {play() {}};

function answerHarness(result, option) {
    let pending = null;
    let reloads = 0;
    const instance = Object.assign(definition.data(), {
        gameState: 'waitingForAnswer',
        inputLocked: false,
        attemptedWrong: {},
        currentQuestion: {result},
        currentOptions: [option, result],
        currentCheckpoint: 0,
        currentAppId: '0_0',
        questionIndex: 3,
        score: 4,
        obstacleStates: {},
        checkpointStatus: ['pending', 'pending', 'pending'],
        currentApp: {},
        $set(target, key, value) { target[key] = value; },
        saveScore() {},
        getSuccessMsg() { return 'ok'; },
        later(callback) { pending = callback; },
        reloadProgress() { reloads += 1; return true; },
        focusFirstAnswer() {},
        travelToBlockage() {},
        blockageSegmentFor: methods.blockageSegmentFor,
        finishWrongAnswer: methods.finishWrongAnswer,
        finishCorrectAnswer: methods.finishCorrectAnswer,
    });
    return {instance, runPending: () => pending && pending(), reloads: () => reloads};
}

reports.length = 0;
const correct = answerHarness('A', 'A');
methods.chooseAnswer.call(correct.instance, 0);
methods.chooseAnswer.call(correct.instance, 0);
check('double correct click reports one success', reports.length === 1 && reports[0].change === -1, JSON.stringify(reports));
correct.runPending();
check('correct lifecycle calls reloadProgress once before continuing', correct.reloads() === 1, correct.reloads());

reports.length = 0;
const wrong = answerHarness('A', 'B');
methods.chooseAnswer.call(wrong.instance, 0);
methods.chooseAnswer.call(wrong.instance, 0);
check('double wrong click reports one failure', reports.length === 1 && reports[0].change === 1, JSON.stringify(reports));
wrong.runPending();
check('wrong lifecycle calls reloadProgress once before retry', wrong.reloads() === 1, wrong.reloads());
check('wrong lifecycle returns to same question', wrong.instance.gameState === 'waitingForAnswer' && wrong.instance.currentQuestion.result === 'A');

console.log('--- 5. production registration and Adventure virtual app ---');
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
integration.sessionStorage.setItem('username', 'water-test');
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
const legacyWater = vm.runInContext(`(function find(node){ if(node.type==='app' && node.appType==='water_pipeline') return node; for(const child of (node.items||[])){const found=find(child);if(found)return found;} return null;})(apps)`, integration);
check('legacy menu registers water_pipeline', legacyWater && legacyWater.listName === 'QUESTION');
const adventureWater = vm.runInContext(`resolveAdventureApp('adv-colors-2')`, integration);
check('colors Adventure encounter registers water_pipeline', adventureWater && adventureWater.appType === 'water_pipeline');
check('Adventure encounter uses a virtual filtered list', adventureWater && adventureWater.listName === 'ADV_WORLD:colors');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
