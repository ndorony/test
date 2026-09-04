// Contract test for the 6.1_1 vocabulary list and its shared-progress menu.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function makeStorage() {
    const map = new Map();
    return {
        getItem: key => map.has(key) ? map.get(key) : null,
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: key => map.delete(key),
        _map: map,
    };
}

const localStorage = makeStorage();
const sessionStorage = makeStorage();
sessionStorage.setItem('username', 'טסט-6.1_1');
const ctx = {
    console,
    localStorage,
    sessionStorage,
    navigator: {},
    Audio: class { play() {} },
    he: {decode: value => value},
    Math,
    JSON,
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file, code) {
    vm.runInContext(code !== undefined ? code : fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, {filename: file});
}

load('data.js', fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + ';globalThis.DATA = DATA;');
load('apps.js', fs.readFileSync(path.join(ROOT, 'apps.js'), 'utf8') + ';globalThis.apps = apps;');
load('groups.js', fs.readFileSync(path.join(ROOT, 'groups.js'), 'utf8') +
    ';globalThis.SHARED_GROUPS = SHARED_GROUPS;'
    + 'globalThis.getSharedGroupMenuItems = getSharedGroupMenuItems;'
    + 'globalThis.resolveSharedGroupApp = resolveSharedGroupApp;'
    + 'globalThis.getSharedGroupKnowledgeKey = getSharedGroupKnowledgeKey;');
load('storage.js');
const testerSource = fs.readFileSync(path.join(ROOT, 'tester.js'), 'utf8');
const coreEnd = testerSource.indexOf('var ProgressBarComponent');
load('tester.js(core slice)', testerSource.slice(0, coreEnd) +
    ';globalThis.getDataList = getDataList;'
    + 'globalThis.generateFromList = generateFromList;'
    + 'globalThis.getWeightsForKey = getWeightsForKey;'
    + 'globalThis.updateWeightForKey = updateWeightForKey;'
    + 'globalThis.getItemById = getItemById;'
    + 'globalThis.getAttemptHistory = getAttemptHistory;');

let passed = 0;
let failed = 0;
function check(name, condition, detail) {
    if (condition) {
        passed++;
        console.log('  PASS', name);
    } else {
        failed++;
        console.log('  FAIL', name, detail === undefined ? '' : '| ' + detail);
    }
}
function run(code) {
    return vm.runInContext(code, ctx);
}

const expectedWords = [
    'across', 'amazing', 'bath', 'bowl', 'come home', 'comfortable', 'dining room',
    'dishes', 'downstairs', 'drawer', 'floor', 'fork', 'front', 'glass', 'glasses',
    'hang', 'hill', 'hole', 'inside', 'jeans', 'knife', 'little', 'mug', 'narrow',
    'normal', 'on the left/right', 'on your left/right', 'only', 'over', 'pair',
    'plate', 'pocket', 'pretty', 'put away (sth)', 'put (sth) away', 'raincoat',
    'really', 'refrigerator/fridge', 'road', 'roof', 'shower', 'side', 'soap',
    'spoon', 'stairs', 'stove', 'suit', 'swimming pool', 'the ground floor', 'throw',
    'tidy', 'toilet', 'toothbrush', 'top', 'towel', 'upstairs', 'village', 'watch',
    'whenever', 'whole', 'wide',
];

console.log('--- 1. extracted word list ---');
const words = run('DATA["6.1_1"]');
check('DATA["6.1_1"] contains all 61 extracted words', words.length === 61, words.length);
check('word order matches the four columns in the image',
    JSON.stringify(words.map(word => word.english.value)) === JSON.stringify(expectedWords));
check('every word has a spoken English question and Hebrew answer',
    words.every(word => word.english_name.type === 'text_to_speech' && word.hebrew.type === 'text' && word.hebrew.value));
check('Hebrew answers are unique for unambiguous distractors',
    run('new Set(DATA["6.1_1"].map(word => word.hebrew.value)).size') === 61);

console.log('--- 2. shared group and menu ---');
const group = run('SHARED_GROUPS.g611');
const reverseGroup = run('SHARED_GROUPS.g611h');
check('g611 uses the 6.1_1 list in English-to-Hebrew mode',
    group.listName === '6.1_1' && group.questionIndex === 'english_name'
    && group.resultIndex === 'hebrew' && group.questionType === 'text_to_speech'
    && group.setItems === 8);
check('g611h uses the 6.1_1 list in Hebrew-to-English mode',
    reverseGroup.listName === '6.1_1' && reverseGroup.questionIndex === 'hebrew'
    && reverseGroup.resultIndex === 'english' && reverseGroup.questionType === 'text_to_speech'
    && reverseGroup.setItems === 8);
check('the group exposes all 12 compatible games', group.games.length === 12, group.games.length);
check('both directions expose the same 12 games in the same order',
    JSON.stringify(group.games) === JSON.stringify(reverseGroup.games));
check('every game type has a registered route',
    group.games.every(game => testerSource.includes('/play/' + game.appType + '/:currentAppId')),
    group.games.map(game => game.appType).join(', '));

const groupMenu = run('(function () { const menu = apps.items.find(item => item.name === "אנגלית"); return menu.items[menu.items.length - 1]; })()');
const expectedLinks = run('getSharedGroupMenuItems("g611").map(item => item.link)');
check('the former grade-6 menu is renamed old without moving it',
    run('(function () { const menu = apps.items.find(item => item.name === "אנגלית"); return menu.items[menu.items.length - 2].name; })()') === 'old');
check('the 6.1_1 chapter container is now named 6 and stays last',
    groupMenu.name === '6');
check('6.1_1 contains both translation directions',
    groupMenu.items.length === 1 && groupMenu.items[0].name === 'פרק 1'
    && groupMenu.items[0].items.length === 2
    && groupMenu.items[0].items[0].name === 'עברית לאנגלית'
    && groupMenu.items[0].items[1].name === 'אנגלית לעברית');
check('English-to-Hebrew links match the shared group order exactly',
    JSON.stringify(groupMenu.items[0].items[1].items.map(item => item.link)) === JSON.stringify(expectedLinks));
check('Hebrew-to-English links match the reverse group order exactly',
    JSON.stringify(groupMenu.items[0].items[0].items.map(item => item.link))
    === JSON.stringify(run('getSharedGroupMenuItems("g611h").map(item => item.link)')));
check('every virtual app resolves to its own game configuration',
    run('SHARED_GROUPS.g611.games.every((game, index) => { const app = resolveSharedGroupApp("grp-g611-" + index); return app && app.appType === game.appType && app.listName === "6.1_1" && app.resultIndex === "hebrew"; })'));
check('reverse virtual apps resolve to Hebrew-to-English configuration',
    run('SHARED_GROUPS.g611h.games.every((game, index) => { const app = resolveSharedGroupApp("grp-g611h-" + index); return app && app.appType === game.appType && app.listName === "6.1_1" && app.questionIndex === "hebrew" && app.resultIndex === "english"; })'));

console.log('--- 3. shared learning state ---');
const question = run('generateFromList("6.1_1", "english_name", "hebrew", "grp-g611-0", 8)');
check('the shared list generates a question', question && Number.isInteger(question.questionIndex));
run('updateWeightForKey("grp-g611-0", ' + question.questionIndex + ', 1)');
run('updateWeightForKey("grp-g611-11", ' + question.questionIndex + ', -1)');
const weights = run('getWeightsForKey("grp-g611-3", 8, getDataList("6.1_1"))');
check('weight changes are visible from another game', weights[question.questionIndex] === 5, weights[question.questionIndex]);
check('attempt history is shared by every game', run('getAttemptHistory("grp-g611-5")[ ' + question.questionIndex + ' ].length') === 2);
check('storage namespace uses one group key',
    run('getSharedGroupKnowledgeKey("g611")') === 'grp-g611'
    && Array.from(localStorage._map.keys()).filter(key => key.includes('grp-g611') && key.includes('_Weights_')).length === 1);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
