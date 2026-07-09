// Smoke test for the adventure learning core (worlds.js + hooks).
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

// load real files, exposing top-level consts to the context
load('data.js', fs.readFileSync(path.join(ROOT, 'data.js'), 'utf8') + ';globalThis.DATA=DATA;');
load('apps.js', fs.readFileSync(path.join(ROOT, 'apps.js'), 'utf8') + ';globalThis.apps=typeof apps!=="undefined"?apps:undefined;');
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
    'globalThis.getWeightedRandomIndex=getWeightedRandomIndex;globalThis.getSetItems=getSetItems;');

// --- tiny assert helpers ---
let passed = 0, failed = 0;
function check(name, cond, extra) {
    if (cond) { passed++; console.log('  PASS', name); }
    else { failed++; console.log('  FAIL', name, extra !== undefined ? '| ' + extra : ''); }
}
function run(code) { return vm.runInContext(code, ctx); }
const keys = () => Array.from(localStorage._map.keys());

console.log('--- 1. regression: existing menu system untouched ---');
// find a real mcq leaf in the apps tree
// pick a list no adventure world uses, so section-1 legacy play doesn't become seeding evidence
const leaf = run(`
    (function find(node, route) {
        const worldLists = WORLDS.map(w => w.listName);
        if (node.type === 'app' && node.appType === 'mcq' && node.listName && !worldLists.includes(node.listName)) return {id: route, app: node};
        if (!node.items) return null;
        for (let i = 0; i < node.items.length; i++) {
            const r = find(node.items[i], route === '' ? String(i) : route + '_' + i);
            if (r) return r;
        }
        return null;
    })(apps, '');
`);
check('found a real mcq app in menu tree', !!leaf, JSON.stringify(leaf));
run(`globalThis._leaf = ${JSON.stringify({id: leaf.id})};`);
const item = run(`getItemById(apps, '${leaf.id}')`);
check('getItemById resolves menu id as before', item && item.listName === leaf.app.listName);
const q1 = run(`generateFromList('${leaf.app.listName}', '${leaf.app.questionIndex}', '${leaf.app.resultIndex}', '${leaf.id}', getSetItems(getItemById(apps, '${leaf.id}')))`);
check('generateFromList works for menu app', q1 && q1.options.length >= 2 && typeof q1.questionIndex === 'number');
check('menu weights key format unchanged', keys().some(k => k === `learn_${leaf.id}_Weights_טסט_LocalData`), keys().join(', '));
run(`updateWeightForKey('${leaf.id}', ${q1.questionIndex}, 1)`);
const menuWeights = JSON.parse(localStorage.getItem(`learn_${leaf.id}_Weights_טסט_LocalData`));
check('menu weight updated in place', menuWeights[q1.questionIndex] === 6, menuWeights[q1.questionIndex]);

console.log('--- 2. adventure id resolution ---');
const advApp1 = run(`getItemById(apps, 'adv-colors-1')`);
const advApp3 = run(`getItemById(apps, 'adv-colors-3')`);
check('adv id resolves to virtual app', advApp1 && advApp1.appType === 'mcq' && advApp1.listName === 'ADV_WORLD:colors');
check('encounter override works (reversed direction)', advApp3 && advApp3.questionIndex === 'emoji' && advApp3.resultIndex === 'english_name');
check('unknown world/encounter → null', run(`resolveAdventureApp('adv-nope-1') === null && resolveAdventureApp('adv-colors-99') === null`));
check('virtual list = real COLORS (no filter)', run(`getDataList('ADV_WORLD:colors').length`) === run(`DATA.COLORS.length`));
check('aleph filtered list: only א items', run(`getDataList('ADV_WORLD:aleph').every(i => i.groups.includes('א')) && getDataList('ADV_WORLD:aleph').length === 4`));

console.log('--- 3. shared knowledge between different games in a world ---');
const qa = run(`generateFromList(getItemById(apps, 'adv-colors-1').listName, 'english_name', 'emoji', 'adv-colors-1', getItemById(apps, 'adv-colors-1').setItems)`);
check('question generated for encounter 1', qa && typeof qa.questionIndex === 'number');
const advWeightKeys = keys().filter(k => k.includes('adv-'));
check('exactly one weights array for the world', advWeightKeys.filter(k => k.includes('_Weights_')).length === 1
    && advWeightKeys.every(k => !/adv-colors-\d/.test(k)), advWeightKeys.join(', '));
run(`updateWeightForKey('adv-colors-1', ${qa.questionIndex}, 1)`); // mistake in encounter 1 (mcq)
run(`updateWeightForKey('adv-colors-2', ${qa.questionIndex}, -1)`); // success in encounter 2 (falling_answers)
const sharedWeights = run(`getWeightsForKey('adv-colors-3', getItemById(apps, 'adv-colors-3').setItems, getDataList('ADV_WORLD:colors'))`);
check('weight change visible from every encounter (5+1-1=5)', sharedWeights[qa.questionIndex] === 5, sharedWeights[qa.questionIndex]);
const history = run(`getAttemptHistory('adv-colors-3')`);
check('attempt history shared across encounters', history[qa.questionIndex] && history[qa.questionIndex].length === 2
    && history[qa.questionIndex][0] === false && history[qa.questionIndex][1] === true, JSON.stringify(history));
run(`setLocalStorage('scoreadv-colors-1', 7)`);
check('score shared across encounters', run(`getScore('adv-colors-2')`) === 7);

console.log('--- 4. progressive unlock managed per world ---');
// master the 3 initially-unlocked items (weight 5 → 0)
run(`
    for (let item = 0; item < 3; item++) {
        for (let n = 0; n < 5; n++) updateWeightForKey('adv-colors-' + (1 + (n % 3)), item, -1);
    }
`);
let w = JSON.parse(localStorage.getItem('learn_adv-colors_Weights_טסט_LocalData'));
check('initial set mastered (first 3 at 0, rest locked)', w.slice(0, 3).every(x => x === 0) && w.slice(3).every(x => x === -1), JSON.stringify(w));
// replaying a GAME encounter must NOT unlock more items (the reported bug)
w = run(`getWeightsForKey('adv-colors-4', getItemById(apps, 'adv-colors-4').setItems, getDataList('ADV_WORLD:colors'))`);
check('game replay does not unlock new items', w.slice(3).every(x => x === -1), JSON.stringify(w));
// only entering the LEARN encounter unlocks the next set
w = run(`getWeightsForKey('adv-colors-0', getItemById(apps, 'adv-colors-0').setItems, getDataList('ADV_WORLD:colors'))`);
check('learn encounter unlocks the next 3 items at weight 5', w.slice(3, 6).every(x => x === 5), JSON.stringify(w));
check('mastered items moved to review weight 2', w.slice(0, 3).every(x => x === 2), JSON.stringify(w));
// like the legacy flow: news accumulate ([0,1,2] initial + [3,4,5] unlocked) until the news screen clears them
const newItems = run(`getLocalStorage('adv-colors-1_new_items', [])`);
check('new_items accumulated for the world, visible to all encounters', JSON.stringify(newItems) === '[0,1,2,3,4,5]', JSON.stringify(newItems));
run(`setLocalStorage('adv-colors-2_new_items', [])`); // news screen shown via encounter 2
check('news clear is shared across encounters', JSON.stringify(run(`getLocalStorage('adv-colors-4_new_items', [])`)) === '[]');

console.log('--- 5. world learning state API ---');
const state = run(`getWorldLearningState('colors')`);
check('learning state reflects shared weights', state.started && state.unlocked === 6 && state.mastered === 0 && state.total === run(`DATA.COLORS.length`), JSON.stringify(state));
check('unknown world → null', run(`getWorldLearningState('nope')`) === null);
const fresh = run(`getWorldLearningState('aleph')`);
check('untouched world → not started', fresh.started === false && fresh.total === 4, JSON.stringify(fresh));

console.log('--- 6. no adventure leakage into menu storage ---');
check('menu weights untouched by adventure activity', JSON.parse(localStorage.getItem(`learn_${leaf.id}_Weights_טסט_LocalData`))[q1.questionIndex] === 6);
check('normalize leaves normal keys alone', run(`normalizeAdventureKey('learn_0_2_1_Weights')`) === 'learn_0_2_1_Weights'
    && run(`normalizeAdventureKey('score0_12')`) === 'score0_12');

console.log('--- 7. seeding: new world inherits knowledge from ALL games, hardest first ---');
// state so far in world colors: weights [2,2,2,5,5,5,-1,-1,-1,-1] (0-2 mastered, 3-5 unlocked, rest locked)
// add legacy menu-game evidence on the same COLORS list: struggling on items 7 and 8
const legacyColorsId = run(`
    (function find(node, route) {
        if (node.type === 'app' && node.listName === 'COLORS') return route;
        if (!node.items) return null;
        for (let i = 0; i < node.items.length; i++) {
            const r = find(node.items[i], route === '' ? String(i) : route + '_' + i);
            if (r) return r;
        }
        return null;
    })(apps, '');
`);
check('a legacy menu game on COLORS exists', !!legacyColorsId, legacyColorsId);
run(`localStorage.setItem(getKey('learn_${legacyColorsId}_Weights'), JSON.stringify([-1,-1,-1,-1,-1,-1,-1,12,15,-1]))`);
run(`recordAttemptResult('${legacyColorsId}', 7, false); recordAttemptResult('${legacyColorsId}', 7, false);
     recordAttemptResult('${legacyColorsId}', 7, false); recordAttemptResult('${legacyColorsId}', 7, true);
     recordAttemptResult('${legacyColorsId}', 7, true);`);

// a brand-new review world on the same list (test-only world)
run(`WORLDS.push({id: 'colorsreview', name: 'חזרה צבעים', listName: 'COLORS', setItems: 2,
                  questionIndex: 'english_name', resultIndex: 'emoji',
                  encounters: [{type: 'learn'}, {type: 'game', game: 'mcq'}]});`);
const seeded = run(`getWeightsForKey('adv-colorsreview-1', 2, getDataList('ADV_WORLD:colorsreview'))`);
check('mastered items (in adventure world) seeded low = light review', seeded.slice(0, 3).every(x => x === 2), JSON.stringify(seeded));
check('partially-practiced items seeded mid', seeded.slice(3, 6).every(x => x === 3), JSON.stringify(seeded));
check('struggled item from LEGACY menu game seeded high (w12 + 3/5 fails → 4)', seeded[7] === 4, seeded[7]);
check('hardest legacy item seeded highest (w15 → 5)', seeded[8] === 5, seeded[8]);
check('items with no evidence anywhere → treated as new (setItems unlocked at 5)', seeded[6] === 5 && seeded[9] === 5, JSON.stringify(seeded));
check('struggling items prioritized over mastered ones', seeded[8] > seeded[7] && seeded[7] > seeded[0]);
const reviewNews = run(`getLocalStorage('adv-colorsreview-1_new_items', [])`);
check('only truly-unknown items marked as new', JSON.stringify(reviewNews) === '[6,9]', JSON.stringify(reviewNews));
const reviewProgress = run(`getProgress('adv-colorsreview-1', 10)`);
check('world progress initialized: everything unlocked', reviewProgress.progress === 10 && reviewProgress.total === 10, JSON.stringify(reviewProgress));

console.log('--- 8. seeding does not touch non-adventure init / practicing mode ---');
const leaf2 = run(`
    (function find(node, route) {
        if (node.type === 'app' && node.appType === 'mcq' && node.listName && node.listName !== 'COLORS'
            && !localStorage.getItem(getKey('learn_' + route + '_Weights'))) return {id: route, app: node};
        if (!node.items) return null;
        for (let i = 0; i < node.items.length; i++) {
            const r = find(node.items[i], route === '' ? String(i) : route + '_' + i);
            if (r) return r;
        }
        return null;
    })(apps, '');
`);
const freshLegacy = run(`getWeightsForKey('${leaf2.id}', 3, getDataList('${leaf2.app.listName}'))`);
check('legacy app init pattern unchanged (5,5,5,-1,...)', freshLegacy.slice(0, 3).every(x => x === 5) && freshLegacy.slice(3).every(x => x === -1), JSON.stringify(freshLegacy));
run(`setActivityMode('practicing')`);
const practicing = run(`getWeightsForKey('adv-colorsreview-1', 2, getDataList('ADV_WORLD:colorsreview'))`);
check('practicing mode: no seeding, all items at 5', practicing.every(x => x === 5), JSON.stringify(practicing));
run(`setActivityMode('learn')`);

console.log('--- 9. adventure player state, unlocking and path progression ---');
// XP: correct adventure answers award XP; wrong/legacy answers do not
const xpBefore = run(`getAdventurePlayer().xp`);
run(`updateWeightForKey('adv-colors-1', 0, -1)`);
check('correct adventure answer awards XP', run(`getAdventurePlayer().xp`) === xpBefore + 2, run(`getAdventurePlayer().xp`));
run(`updateWeightForKey('adv-colors-1', 0, 1)`);
check('wrong answer awards no XP', run(`getAdventurePlayer().xp`) === xpBefore + 2);
run(`updateWeightForKey('${legacyColorsId}', 7, -1)`);
check('legacy menu game awards no XP', run(`getAdventurePlayer().xp`) === xpBefore + 2);

// levels and world unlocking
run(`setLocalStorage('adv_player', {xp: 0})`);
check('level math: 0 xp → level 1, 55 xp → level 2', run(`getAdventureLevel(0)`) === 1 && run(`getAdventureLevel(55)`) === 2);
check('first alphabet world open, second locked, colors (level 2) locked',
    run(`isWorldUnlocked(getWorldById('hebrew1')) && !isWorldUnlocked(getWorldById('hebrew2')) && !isWorldUnlocked(getWorldById('colors'))`));
run(`setLocalStorage('adv-hebrew1_completed', true)`);
check('completing hebrew1 unlocks hebrew2 (sequential chain)', run(`isWorldUnlocked(getWorldById('hebrew2'))`));
check('lock text for prerequisite world is kid-readable', run(`getWorldUnlockText(getWorldById('hebrew3'))`).includes('אותיות ו׳'), run(`getWorldUnlockText(getWorldById('hebrew3'))`));
run(`setLocalStorage('adv_player', {xp: 55})`);
check('reaching level 2 unlocks colors', run(`isWorldUnlocked(getWorldById('colors'))`));
run(`setLocalStorage('adv-numbers_completed', true)`);
check('a completed world stays unlocked regardless of level', run(`isWorldUnlocked(getWorldById('numbers'))`));
run(`
    Array.from(localStorage._map.keys()).filter(k => k.includes('adv-') || k.includes('adv_')).forEach(k => localStorage.removeItem(k));
    const completionWeights = getDataList('ADV_WORLD:hebrew1').map((_, i, arr) => i === arr.length - 1 ? 1 : 0);
    localStorage.setItem(getWeightsKey('adv-hebrew1'), JSON.stringify(completionWeights));
    updateWeightForKey('adv-hebrew1-1', completionWeights.length - 1, -1);
`);
check('final correct answer marks the adventure world completed', run(`isWorldCompleted('hebrew1')`));
run(`Array.from(localStorage._map.keys()).filter(k => k.includes('adv-') || k.includes('adv_')).forEach(k => localStorage.removeItem(k))`);

// alphabet world content
check('hebrew1 = letters א–ה (range filter)',
    run(`getDataList('ADV_WORLD:hebrew1').map(i => i.letter.value).join('')`) === 'אבגדה', run(`getDataList('ADV_WORLD:hebrew1').map(i => i.letter.value).join('')`));
check('hebrew3 includes final khaf/mem', run(`getDataList('ADV_WORLD:hebrew3').map(i => i.letter.value).join('')`) === 'כךלמם');
check('all 6 alphabet worlds cover the full alphabet exactly once',
    run(`['hebrew1','hebrew2','hebrew3','hebrew4','hebrew5','hebrew6'].map(id => getDataList('ADV_WORLD:' + id).length).reduce((a, b) => a + b, 0)`) === 27);
check('question = spoken letter name, answer = the letter',
    run(`resolveAdventureApp('adv-hebrew1-1').questionIndex`) === 'letterName' && run(`resolveAdventureApp('adv-hebrew1-1').resultIndex`) === 'letter');

// a letter world opens ALL its letters from the start (the world is the chunk)
const hebrew1Weights = run(`getWeightsForKey('adv-hebrew1-1', getItemById(apps, 'adv-hebrew1-1').setItems, getDataList('ADV_WORLD:hebrew1'))`);
check('letter world: all 5 letters unlocked at weight 5 from the start', hebrew1Weights.length === 5 && hebrew1Weights.every(x => x === 5), JSON.stringify(hebrew1Weights));
check('legacy keys still auto-unlock (hook returns true)', run(`shouldAdventureAutoUnlock('0_2_1') && shouldAdventureAutoUnlock('adv-colors-0') && !shouldAdventureAutoUnlock('adv-colors-1')`));

// cross-world inheritance: struggle with א in hebrew1 → review world seeds it high
run(`for (let n = 0; n < 9; n++) updateWeightForKey('adv-hebrew1-1', 0, 1);`); // struggling with א (weight 5→14)
const reviewSeeded = run(`getWeightsForKey('adv-hebrewreview-1', 3, getDataList('ADV_WORLD:hebrewreview'))`);
check('review world seeds struggled א high (difficulty 14/15 → 5)', reviewSeeded[0] === 5, reviewSeeded[0]);
check('review world seeds untouched-but-unlocked ב lower', reviewSeeded[1] < reviewSeeded[0], reviewSeeded[1]);
check('letters never seen stay locked in review until unlocked progressively', reviewSeeded.slice(5).filter(x => x === -1).length > 0);

// encounter path progression
check('pointer starts at 0', run(`getEncounterPointer('animals')`) === 0);
const route = run(`getAdventureLevelCompleteRoute('adv-colors-2')`);
check('level complete inside encounter 2 → back to world (with celebration), pointer at 3', route.startsWith('/adventure/world/colors?celebrate=1') && run(`getEncounterPointer('colors')`) === 3, route);
run(`getAdventureLevelCompleteRoute('adv-colors-1')`);
check('replaying an earlier encounter does not move the pointer back', run(`getEncounterPointer('colors')`) === 3);
check('legacy id → null (legacy navigation unchanged)', run(`getAdventureLevelCompleteRoute('0_2_1')`) === null);

// encounter routes
check('learn encounter flows into the next step (display of same knowledge)',
    run(`getEncounterRoute(getWorldById('colors'), 0)`) === '/display/all/adv-colors-1', run(`getEncounterRoute(getWorldById('colors'), 0)`));
check('game encounter routes to its game with its encounter id',
    run(`getEncounterRoute(getWorldById('colors'), 2)`) === '/play/falling_answers/adv-colors-2', run(`getEncounterRoute(getWorldById('colors'), 2)`));
check('learn encounter resolves to a playable appType (next game on path)',
    run(`resolveAdventureApp('adv-colors-0').appType`) === 'mcq');
check('adventure routes registered', run(`getAdventureRoutes().length`) === 3 && run(`getAdventureRoutes()[0].path`) === '/adventure');

console.log('--- 10. avatar (character creator) ---');
const defaultAvatar = run(`getAdventureAvatar()`);
check('avatar defaults', defaultAvatar.base === '🧒' && defaultAvatar.companion === '🦄' && defaultAvatar.hat === '', JSON.stringify(defaultAvatar));
run(`const av = getAdventureAvatar(); av.base = '🧙'; av.hat = '👑'; saveAdventureAvatar(av);`);
const savedAvatar = run(`getAdventureAvatar()`);
check('avatar saved and reloaded', savedAvatar.base === '🧙' && savedAvatar.hat === '👑' && savedAvatar.companion === '🦄');
run(`setLocalStorage('adv_player', {xp: 0})`);
check('level-1 player: basic items open, level-3 items locked',
    run(`isAvatarOptionUnlocked({value: '🎀', level: 1}) && !isAvatarOptionUnlocked({value: '🎩', level: 3})`));
run(`setLocalStorage('adv_player', {xp: 120})`);
check('level-3 player: level-3 items unlocked', run(`isAvatarOptionUnlocked({value: '🎩', level: 3})`));

console.log('--- 11. guided step (Phase A) ---');
// fresh clear of adventure progress for a clean guided-step check
run(`Array.from(localStorage._map.keys()).filter(k => k.includes('adv-') || k.includes('adv_')).forEach(k => localStorage.removeItem(k))`);
const firstStep = run(`getNextGuidedStep()`);
check('fresh player → first alphabet world', firstStep && firstStep.worldId === 'hebrew1' && firstStep.encounterIndex === 0, JSON.stringify(firstStep));
run(`setLocalStorage('adv-hebrew1_completed', true)`);
check('after completing hebrew1 → next is hebrew2', run(`getNextGuidedStep().worldId`) === 'hebrew2');
run(`setLocalStorage('adv-hebrew2_encounterPointer', 2)`);
check('guided step respects the encounter pointer', run(`getNextGuidedStep().encounterIndex`) === 2);

console.log('--- 12. stars & coins (Phase B) ---');
check('0% mistakes → 3 stars', run(`computeSessionStars({correct: 10, wrong: 0})`) === 3);
check('10% mistakes → 3 stars', run(`computeSessionStars({correct: 9, wrong: 1})`) === 3);
check('25% mistakes → 2 stars', run(`computeSessionStars({correct: 6, wrong: 2})`) === 2);
check('50% mistakes → 1 star', run(`computeSessionStars({correct: 5, wrong: 5})`) === 1);
check('empty session → 1 star (defensive)', run(`computeSessionStars({})`) === 1);
// full reward flow: answers build a session, completion grants stars+coins
run(`Array.from(localStorage._map.keys()).filter(k => k.includes('adv-') || k.includes('adv_')).forEach(k => localStorage.removeItem(k))`);
run(`getWeightsForKey('adv-animals-1', getItemById(apps, 'adv-animals-1').setItems, getDataList('ADV_WORLD:animals'))`);
run(`updateWeightForKey('adv-animals-1', 0, -1); updateWeightForKey('adv-animals-1', 1, -1);`); // 2 correct, 0 wrong
const sess = run(`getLocalStorage('adv_session', {})`);
check('session tracks the current encounter accuracy', sess.key === 'adv-animals-1' && sess.correct === 2 && sess.wrong === 0, JSON.stringify(sess));
const coinsBefore = run(`getAdventurePlayer().coins || 0`);
const rewardRoute = run(`getAdventureLevelCompleteRoute('adv-animals-1')`);
check('completion route carries stars=3 & coins=30', rewardRoute.includes('stars=3') && rewardRoute.includes('coins=30'), rewardRoute);
check('coins credited to the player', (run(`getAdventurePlayer().coins`) - coinsBefore) === 30, run(`getAdventurePlayer().coins`));
check('best stars saved for the encounter', run(`getWorldStars('animals')['1']`) === 3);
check('session reset after completion', Object.keys(run(`getLocalStorage('adv_session', {})`)).length === 0);
// replaying at same/lower quality grants no extra coins
run(`updateWeightForKey('adv-animals-1', 0, 1); updateWeightForKey('adv-animals-1', 0, -1);`); // 1 correct 1 wrong = 1 star
const coinsAfterReplay = run(`getAdventurePlayer().coins`);
run(`getAdventureLevelCompleteRoute('adv-animals-1')`);
check('replay with worse result grants no coins and keeps best stars', run(`getAdventurePlayer().coins`) === coinsAfterReplay && run(`getWorldStars('animals')['1']`) === 3);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
