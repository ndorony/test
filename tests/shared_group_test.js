// Smoke test for shared-progress groups (groups.js + hooks).
// A group lets several menu games share ONE knowledge key: pick any game, and
// weights / history / progress / new-items all carry across the games.
// Loads the real production files into a VM context with browser stubs.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

// --- browser stubs ---
function makeStorage() {
    const map = new Map();
    return {
        getItem: k => (map.has(k) ? map.get(k) : null),
        setItem: (k, v) => map.set(k, String(v)),
        removeItem: k => map.delete(k),
        _map: map,
    };
}
const localStorage = makeStorage();
const sessionStorage = makeStorage();
sessionStorage.setItem('username', 'טסט');

const ctx = {
    console,
    localStorage,
    sessionStorage,
    navigator: {},
    Audio: class { play() {} },
    he: { decode: s => s },
    Math, JSON,
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file, code) {
    vm.runInContext(code !== undefined ? code : fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}

// load real files, exposing what the test drives onto the context (mirrors index.html order)
load('data.js', fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + ';globalThis.DATA=DATA;');
load('apps.js', fs.readFileSync(path.join(ROOT, 'apps.js'), 'utf8') + ';globalThis.apps=typeof apps!=="undefined"?apps:undefined;');
load('groups.js', fs.readFileSync(path.join(ROOT, 'groups.js'), 'utf8') +
    ';globalThis.SHARED_GROUPS=SHARED_GROUPS;globalThis.resolveSharedGroupApp=resolveSharedGroupApp;' +
    'globalThis.normalizeSharedGroupKey=normalizeSharedGroupKey;globalThis.getSharedGroupMenuItems=getSharedGroupMenuItems;' +
    'globalThis.getSharedGroupAppId=getSharedGroupAppId;globalThis.getSharedGroupKnowledgeKey=getSharedGroupKnowledgeKey;');
load('worlds.js');
load('storage.js');
// adventure.js defines Vue components at load time — a minimal stub is enough here
vm.runInContext('var Vue = {component: function(name, def){ return def; }};', ctx);
load('adventure.js');

// tester.js: only the core functions (everything before the first Vue component)
const tester = fs.readFileSync(path.join(ROOT, 'tester.js'), 'utf8');
const cut = tester.indexOf('var ProgressBarComponent');
if (cut === -1) throw new Error('cut marker not found in tester.js');
load('tester.js(core slice)', tester.slice(0, cut) +
    ';globalThis.getDataList=getDataList;globalThis.generateFromList=generateFromList;' +
    'globalThis.getWeightsForKey=getWeightsForKey;globalThis.updateWeightForKey=updateWeightForKey;' +
    'globalThis.getWeightedRandomIndex=getWeightedRandomIndex;globalThis.getSetItems=getSetItems;' +
    'globalThis.getItemById=getItemById;');

// --- tiny assert helpers ---
let passed = 0, failed = 0;
function check(name, cond, extra) {
    if (cond) { passed++; console.log('  PASS', name); }
    else { failed++; console.log('  FAIL', name, extra !== undefined ? '| ' + extra : ''); }
}
function run(code) { return vm.runInContext(code, ctx); }
const keys = () => Array.from(localStorage._map.keys());

console.log('--- 1. the 5_1 word list ---');
check('DATA["5_1"] exists with all 45 words', run(`DATA["5_1"] && DATA["5_1"].length`) === 45, run(`DATA["5_1"] && DATA["5_1"].length`));
check('first word: aunt → דודה', run(`DATA["5_1"][0].english.value`) === 'aunt' && run(`DATA["5_1"][0].hebrew.value`) === 'דודה');
check('last word: together → ביחד', run(`DATA["5_1"][44].english.value`) === 'together' && run(`DATA["5_1"][44].hebrew.value`) === 'ביחד');
check('every word has english_name spoken + hebrew answer',
    run(`DATA["5_1"].every(w => w.english_name && w.english_name.type === 'text_to_speech' && w.hebrew && w.hebrew.value)`));
check('all hebrew answers are distinct (no ambiguous distractors)',
    run(`new Set(DATA["5_1"].map(w => w.hebrew.value)).size`) === 45);

console.log('--- 2. group id resolution ---');
const g0 = run(`getItemById(apps, 'grp-ch51-0')`);
const g1 = run(`getItemById(apps, 'grp-ch51-1')`);
const g2 = run(`getItemById(apps, 'grp-ch51-2')`);
const g3 = run(`getItemById(apps, 'grp-ch51-3')`);
check('grp-ch51-0 → mcq on list 5_1', g0 && g0.appType === 'mcq' && g0.listName === '5_1', JSON.stringify(g0));
check('grp-ch51-1 → balloon_shooter', g1 && g1.appType === 'balloon_shooter', JSON.stringify(g1));
check('grp-ch51-2 → word_link', g2 && g2.appType === 'word_link');
check('grp-ch51-3 → scribble_dungeon', g3 && g3.appType === 'scribble_dungeon');
check('shared config carried onto every game (english_name → hebrew, setItems 5)',
    [g0, g1, g2, g3].every(g => g.questionIndex === 'english_name' && g.resultIndex === 'hebrew' && g.setItems === 5));
check('unknown group / out-of-range id → null',
    run(`resolveSharedGroupApp('grp-nope-0') === null && resolveSharedGroupApp('grp-ch51-9') === null && resolveSharedGroupApp('grp-ch51') === null`));
check('resolveSharedGroupApp ignores non-group ids (menu ids untouched)', run(`resolveSharedGroupApp('0_2_1') === null`));

console.log('--- 3. the menu wiring matches the group (no drift) ---');
const menuLinks = run(`
    (function find(node) {
        if (node.type === 'menu' && node.name === '5_1 (התקדמות משותפת)') return node.items.map(i => i.link);
        if (!node.items) return null;
        for (const child of node.items) { const r = find(child); if (r) return r; }
        return null;
    })(apps);
`);
check('the "5_1" submenu exists with 4 linked buttons', Array.isArray(menuLinks) && menuLinks.length === 4, JSON.stringify(menuLinks));
const generatedLinks = run(`getSharedGroupMenuItems('ch51').map(i => i.link)`);
check('apps.js menu links match groups.js game order exactly',
    JSON.stringify(menuLinks) === JSON.stringify(generatedLinks), JSON.stringify(menuLinks) + ' vs ' + JSON.stringify(generatedLinks));
check('every menu link resolves to the appType named in its own URL',
    run(`getSharedGroupMenuItems('ch51').every(i => { const parts = i.link.split('/'); return resolveSharedGroupApp(parts[3]).appType === parts[2]; })`));

console.log('--- 4. shared knowledge across the four games ---');
const qa = run(`generateFromList(getItemById(apps, 'grp-ch51-0').listName, 'english_name', 'hebrew', 'grp-ch51-0', getItemById(apps, 'grp-ch51-0').setItems)`);
check('question generated for the mcq game', qa && typeof qa.questionIndex === 'number');
const grpWeightKeys = keys().filter(k => k.includes('grp-'));
check('exactly one shared weights array for the group (no grp-ch51-N keys)',
    grpWeightKeys.filter(k => k.includes('_Weights_')).length === 1 && grpWeightKeys.every(k => !/grp-ch51-\d/.test(k)), grpWeightKeys.join(', '));
run(`updateWeightForKey('grp-ch51-0', ${qa.questionIndex}, 1)`);   // mistake in mcq
run(`updateWeightForKey('grp-ch51-1', ${qa.questionIndex}, -1)`);  // success in balloon shooter
const sharedWeights = run(`getWeightsForKey('grp-ch51-2', getItemById(apps, 'grp-ch51-2').setItems, getDataList('5_1'))`);
check('weight change from mcq + balloon visible in word_link (5+1-1=5)', sharedWeights[qa.questionIndex] === 5, sharedWeights[qa.questionIndex]);
const history = run(`getAttemptHistory('grp-ch51-3')`);
check('attempt history shared across all games', history[qa.questionIndex] && history[qa.questionIndex].length === 2
    && history[qa.questionIndex][0] === false && history[qa.questionIndex][1] === true, JSON.stringify(history));
run(`setLocalStorage('scoregrp-ch51-0', 9)`);
check('score shared across games', run(`getScore('grp-ch51-2')`) === 9);
check('progress is one shared record', run(`getProgress('grp-ch51-1', 45).total`) === 45 && run(`getProgress('grp-ch51-1', 45).progress`) === 5,
    JSON.stringify(run(`getProgress('grp-ch51-1', 45)`)));

console.log('--- 5. gradual unlock works from ANY game (unlike adventure) ---');
// master the 5 initially-unlocked items (weight 5 → 0) by answering across different games
run(`
    for (let item = 0; item < 5; item++) {
        for (let n = 0; n < 5; n++) updateWeightForKey('grp-ch51-' + (n % 4), item, -1);
    }
`);
let w = JSON.parse(localStorage.getItem('learn_grp-ch51_Weights_טסט_LocalData'));
check('initial set mastered (first 5 at 0, rest locked)', w.slice(0, 5).every(x => x === 0) && w.slice(5).every(x => x === -1), JSON.stringify(w.slice(0, 10)));
// entering ANY game runs the unlock cycle (group keys auto-unlock — the whole point)
w = run(`getWeightsForKey('grp-ch51-1', getItemById(apps, 'grp-ch51-1').setItems, getDataList('5_1'))`);
check('playing the balloon game unlocks the next 5 words at weight 5', w.slice(5, 10).every(x => x === 5), JSON.stringify(w.slice(0, 12)));
check('mastered words moved to review weight 2', w.slice(0, 5).every(x => x === 2), JSON.stringify(w.slice(0, 5)));
const newItems = run(`getLocalStorage('grp-ch51-3_new_items', [])`);
check('new_items accumulate for the group, visible to every game', JSON.stringify(newItems) === '[0,1,2,3,4,5,6,7,8,9]', JSON.stringify(newItems));
run(`setLocalStorage('grp-ch51-0_new_items', [])`); // news screen shown from the mcq game
check('news clear is shared across games', JSON.stringify(run(`getLocalStorage('grp-ch51-2_new_items', [])`)) === '[]');

console.log('--- 6. no leakage, no adventure side-effects ---');
check('normalizeSharedGroupKey leaves normal & adventure keys alone',
    run(`normalizeSharedGroupKey('learn_0_2_1_Weights')`) === 'learn_0_2_1_Weights'
    && run(`normalizeSharedGroupKey('score0_12')`) === 'score0_12'
    && run(`normalizeSharedGroupKey('learn_adv-colors-1_Weights')`) === 'learn_adv-colors-1_Weights');
check('normalizeSharedGroupKey collapses every group storage key to the shared key',
    run(`normalizeSharedGroupKey('learn_grp-ch51-3_Weights')`) === 'learn_grp-ch51_Weights'
    && run(`normalizeSharedGroupKey('grp-ch51-2_attemptHistory')`) === 'grp-ch51_attemptHistory'
    && run(`normalizeSharedGroupKey('scoregrp-ch51-0')`) === 'scoregrp-ch51');
check('a group id is NOT an adventure id (no XP / stars / world-map redirect)',
    run(`typeof getAdventureLevelCompleteRoute === 'function' ? getAdventureLevelCompleteRoute('grp-ch51-0') === null : true`)
    && run(`typeof parseAdventureId === 'function' ? parseAdventureId('grp-ch51-0') === null : true`));
check('group activity created no adventure (adv-) storage keys', keys().every(k => !k.includes('adv-') && !k.includes('adv_')), keys().filter(k => k.includes('adv')).join(', '));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
