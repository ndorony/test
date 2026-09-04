// Smoke test for the Ministry of Education grade-6 word list (DATA lists
// GRADE6_MOE_1..5) and the ten shared-progress groups built on it: one group
// per part, per direction (g6p<n>e = English→Hebrew, g6p<n>h = Hebrew→English).
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
    'globalThis.GRADE6_MOE_GAMES=GRADE6_MOE_GAMES;globalThis.GRADE6_MOE_PARTS=GRADE6_MOE_PARTS;');
load('worlds.js');
load('storage.js');
vm.runInContext('var Vue = {component: function(name, def){ return def; }};', ctx);
load('adventure.js');

// tester.js: only the core functions (everything before the first Vue component)
const tester = fs.readFileSync(path.join(ROOT, 'tester.js'), 'utf8');
const cut = tester.indexOf('var ProgressBarComponent');
if (cut === -1) throw new Error('cut marker not found in tester.js');
load('tester.js(core slice)', tester.slice(0, cut) +
    ';globalThis.getDataList=getDataList;globalThis.generateFromList=generateFromList;' +
    'globalThis.getWeightsForKey=getWeightsForKey;globalThis.updateWeightForKey=updateWeightForKey;' +
    'globalThis.getSetItems=getSetItems;globalThis.getItemById=getItemById;' +
    'globalThis.render=render;globalThis.isHebrew=isHebrew;');

// --- tiny assert helpers ---
let passed = 0, failed = 0;
function check(name, cond, extra) {
    if (cond) { passed++; console.log('  PASS', name); }
    else { failed++; console.log('  FAIL', name, extra !== undefined ? '| ' + extra : ''); }
}
function run(code) { return vm.runInContext(code, ctx); }
const keys = () => Array.from(localStorage._map.keys());
const PARTS = [1, 2, 3, 4, 5];
const DIRS = ['e', 'h'];

console.log('--- 1. the word list, split into five parts ---');
const sizes = PARTS.map(p => run(`DATA.GRADE6_MOE_${p} ? DATA.GRADE6_MOE_${p}.length : 0`));
check('all five parts exist and are non-empty', sizes.every(n => n > 0), JSON.stringify(sizes));
check('641 words in total (the MoE elementary list)',
    sizes.reduce((a, b) => a + b, 0) === 641, sizes.reduce((a, b) => a + b, 0));
check('the parts are evenly sized (a fifth each, ±1)',
    Math.max(...sizes) - Math.min(...sizes) <= 5, JSON.stringify(sizes));
check('every entry carries hebrew + english + spoken english_name',
    run(`[1,2,3,4,5].every(p => DATA['GRADE6_MOE_' + p].every(w =>
        w.hebrew && w.hebrew.type === 'text' && w.hebrew.value &&
        w.english && w.english.type === 'text' && w.english.value &&
        w.english_name && w.english_name.type === 'text_to_speech' &&
        w.english_name.value === w.english.value))`));
const allWords = run(`[1,2,3,4,5].flatMap(p => DATA['GRADE6_MOE_' + p])`);
check('no word appears twice across the parts',
    new Set(allWords.map(w => w.english.value)).size === 641,
    new Set(allWords.map(w => w.english.value)).size);
// duplicated answers would make an MCQ distractor identical to the right answer
check('within a part, every English answer is distinct',
    PARTS.every(p => run(`new Set(DATA['GRADE6_MOE_${p}'].map(w => w.english.value)).size === DATA['GRADE6_MOE_${p}'].length`)));
check('within a part, every Hebrew answer is distinct',
    PARTS.every(p => run(`new Set(DATA['GRADE6_MOE_${p}'].map(w => w.hebrew.value)).size === DATA['GRADE6_MOE_${p}'].length`)));
// isHebrew() picks the TTS voice from the text, so a Latin letter in a Hebrew
// answer would have the whole phrase read out by the English voice
check('every Hebrew answer is spoken by the Hebrew voice (no Latin letters)',
    allWords.every(w => run(`isHebrew(${JSON.stringify(w.hebrew.value)})`)),
    JSON.stringify(allWords.filter(w => !run(`isHebrew(${JSON.stringify(w.hebrew.value)})`)).map(w => w.hebrew.value).slice(0, 5)));

console.log('--- 2. ten groups: a part × a direction ---');
check('groups.js registers all ten groups',
    PARTS.every(p => DIRS.every(d => run(`!!SHARED_GROUPS.g6p${p}${d}`))),
    JSON.stringify(run(`Object.keys(SHARED_GROUPS)`)));
check('the English→Hebrew groups ask english_name and answer hebrew',
    PARTS.every(p => run(`SHARED_GROUPS.g6p${p}e.questionIndex === 'english_name'
        && SHARED_GROUPS.g6p${p}e.resultIndex === 'hebrew'
        && SHARED_GROUPS.g6p${p}e.listName === 'GRADE6_MOE_${p}'`)));
check('the Hebrew→English groups ask hebrew and answer english',
    PARTS.every(p => run(`SHARED_GROUPS.g6p${p}h.questionIndex === 'hebrew'
        && SHARED_GROUPS.g6p${p}h.resultIndex === 'english'
        && SHARED_GROUPS.g6p${p}h.listName === 'GRADE6_MOE_${p}'`)));
// the whole point of the request: show the word AND read it aloud, both ways
check('both directions show the word AND speak it (questionType text_to_speech)',
    PARTS.every(p => DIRS.every(d => run(`SHARED_GROUPS.g6p${p}${d}.questionType === 'text_to_speech'`))),
    JSON.stringify(PARTS.map(p => DIRS.map(d => run(`SHARED_GROUPS.g6p${p}${d}.questionType`)))));
check('the question field always resolves to a renderable value',
    PARTS.every(p => DIRS.every(d => {
        const q = run(`SHARED_GROUPS.g6p${p}${d}.questionIndex`);
        return run(`DATA['GRADE6_MOE_${p}'].every(w => w[${JSON.stringify(q)}] && w[${JSON.stringify(q)}].value)`);
    })));
const gameCount = run(`GRADE6_MOE_GAMES.length`);
check('every group offers the same games, from one shared array',
    PARTS.every(p => DIRS.every(d => run(`SHARED_GROUPS.g6p${p}${d}.games === GRADE6_MOE_GAMES`))), gameCount);
check('every game has an appType, an icon, a name and a title',
    run(`GRADE6_MOE_GAMES.every(g => g.appType && g.icon && g.name && g.title)`));
const missingRoutes = run(`GRADE6_MOE_GAMES.map(g => g.appType)`)
    .filter(t => !tester.includes(`/play/${t}/:currentAppId`));
check('every appType has a router route in tester.js', missingRoutes.length === 0, missingRoutes.join(', '));

console.log('--- 3. id resolution ---');
const resolved = run(`[1,2,3,4,5].flatMap(p => ['e','h'].map(d =>
    GRADE6_MOE_GAMES.map((g, i) => resolveSharedGroupApp('grp-g6p' + p + d + '-' + i))))`);
check('every grp-g6p<part><dir>-<n> resolves',
    resolved.every(list => list.every(a => a !== null)));
check('each id resolves to its own appType, list and direction',
    resolved.every((list, idx) => {
        const part = Math.floor(idx / 2) + 1;
        const dir = idx % 2 === 0 ? 'e' : 'h';
        return list.every((a, i) =>
            a.appType === run(`GRADE6_MOE_GAMES[${i}].appType`)
            && a.listName === `GRADE6_MOE_${part}`
            && a.questionType === 'text_to_speech'
            && a.questionIndex === (dir === 'e' ? 'english_name' : 'hebrew')
            && a.resultIndex === (dir === 'e' ? 'hebrew' : 'english')
            && a.setItems === 8);
    }));
check('one past the last game does not resolve',
    PARTS.every(p => DIRS.every(d => run(`resolveSharedGroupApp('grp-g6p${p}${d}-' + GRADE6_MOE_GAMES.length) === null`))));
check('every group has its own knowledge key',
    new Set(PARTS.flatMap(p => DIRS.map(d => run(`normalizeSharedGroupKey('grp-g6p${p}${d}-3')`)))).size === 10);

console.log('--- 4. the old grade-6 menu, retained at the end of אנגלית ---');
const english = run(`apps.items.find(i => i.name === 'אנגלית')`);
const six = run(`apps.items.find(i => i.name === 'אנגלית').items[apps.items.find(i => i.name === 'אנגלית').items.length - 2]`);
check('the former grade-6 menu is named "old"', six && six.name === 'old', six && six.name);
// appending is the only safe edit: menu ids are position-based (route_index)
check('it was appended, so no existing item changed position',
    run(`(function(){ const e = apps.items.find(i => i.name === 'אנגלית');
        return e.items[e.items.length - 3].name; })()`) === '5_1 שמיעה (התקדמות משותפת)');
check('"6" holds exactly five parts', six.items.length === 5, six.items.map(i => i.name).join(', '));
check('the parts are named חלק 1..5',
    six.items.every((it, i) => it.name === `חלק ${i + 1}`), six.items.map(i => i.name).join(', '));
check('every part offers both directions',
    six.items.every(part => part.items.length === 2
        && part.items[0].name === 'אנגלית לעברית'
        && part.items[1].name === 'עברית לאנגלית'));
check('every direction submenu matches groups.js game order exactly',
    six.items.every((part, p) => part.items.every((dirMenu, d) =>
        JSON.stringify(dirMenu.items.map(i => i.link))
        === JSON.stringify(run(`getSharedGroupMenuItems('g6p${p + 1}${DIRS[d]}').map(i => i.link)`)))),
    JSON.stringify(six.items[0].items[0].items.map(i => i.link)));
check('every menu link resolves to the appType named in its own URL',
    six.items.every(part => part.items.every(dirMenu => dirMenu.items.every(item => {
        const parts = item.link.split('/');
        return run(`resolveSharedGroupApp('${parts[3]}').appType`) === parts[2];
    }))));
check(`each direction submenu lists all ${gameCount} games`,
    six.items.every(part => part.items.every(dirMenu => dirMenu.items.length === gameCount)));
check('every menu button carries an icon and a name',
    six.items.every(part => part.items.every(dirMenu => dirMenu.items.every(i => i.icon && i.name))));

console.log('--- 5. progress is shared inside a submenu, and only there ---');
const q = run(`generateFromList('GRADE6_MOE_1', 'english_name', 'hebrew', 'grp-g6p1e-0', 8, 'text_to_speech')`);
check('a question is generated for the first game', q && typeof q.questionIndex === 'number');
check('the question is rendered as a speaking button showing the word',
    /audio-prompt-text/.test(q.question) && /text_to_speech\(/.test(q.question), q.question);
run(`updateWeightForKey('grp-g6p1e-0', ${q.questionIndex}, 1)`);   // mistake in mcq
run(`updateWeightForKey('grp-g6p1e-4', ${q.questionIndex}, -1)`);  // success in the platformer
const shared = run(`getWeightsForKey('grp-g6p1e-6', 8, getDataList('GRADE6_MOE_1'))`);
check('a weight change in mcq is visible in הגנת הידע (5+1-1=5)',
    shared[q.questionIndex] === 5, shared[q.questionIndex]);
check('attempt history is shared across the submenu\'s games',
    run(`getAttemptHistory('grp-g6p1e-2')[${q.questionIndex}].length`) === 2,
    JSON.stringify(run(`getAttemptHistory('grp-g6p1e-2')[${q.questionIndex}]`)));
check('exactly one weights array for the group, none per game',
    keys().filter(k => k.includes('grp-g6p1e') && k.includes('_Weights_')).length === 1
    && keys().every(k => !/grp-g6p1e-\d/.test(k)),
    keys().filter(k => k.includes('g6p1e')).join(', '));
// producing a word is a different skill from recognising it — separate ladders
const other = run(`getWeightsForKey('grp-g6p1h-0', 8, getDataList('GRADE6_MOE_1'))`);
check('the reverse direction is untouched (its own ladder)',
    other[q.questionIndex] === 5 && run(`getAttemptHistory('grp-g6p1h-0')[${q.questionIndex}] === undefined`),
    other[q.questionIndex]);
const otherPart = run(`getWeightsForKey('grp-g6p2e-0', 8, getDataList('GRADE6_MOE_2'))`);
check('part 2 is untouched by part 1',
    otherPart[q.questionIndex] === 5 && run(`getAttemptHistory('grp-g6p2e-0')[${q.questionIndex}] === undefined`));
check('no grade-6 progress leaked into the 5_1 groups',
    keys().filter(k => k.includes('g6p')).every(k => !k.includes('ch51')));

console.log('--- 6. words with an apostrophe still speak ---');
// "don't", "let's", "I'm ready" … would close the onclick string and break the
// handler unless render() escapes them
const tricky = allWords.filter(w => w.english.value.includes("'"));
check('the list really does contain apostrophe words', tricky.length > 0, tricky.length);
check('render() escapes them instead of breaking out of the onclick',
    tricky.every(w => {
        const html = run(`render({type: 'text_to_speech', value: ${JSON.stringify(w.english.value)}})`);
        const onclick = html.match(/onclick="text_to_speech\('(.*)'\)"/);
        return onclick !== null && onclick[1] === w.english.value.replace(/'/g, "\\'");
    }),
    run(`render({type: 'text_to_speech', value: "don't"})`));
check('a plain word is left exactly as it was',
    run(`render({type: 'text_to_speech', value: 'dog'})`).includes("text_to_speech('dog')"));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
