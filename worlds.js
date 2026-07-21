// worlds.js — the learning core of adventure mode.
//
// A world = a single body of knowledge (a DATA list, optionally filtered).
// All encounters (mini-games) inside a world share the same knowledge key —
// the same weights, attempt history, progress and new items — so whatever
// the child struggles with in one mini-game comes back for practice in the
// others as well.
//
// This system lives alongside the existing menu mode and does not touch it:
// every connection to the existing code is a typeof-guarded hook (see getKey
// in storage.js, getDataList/getItemById in tester.js), activated only for
// adventure-format ids.
//
// Id format:
//   encounter id (currentAppId):  adv-<worldId>-<encounterIndex>   e.g. adv-colors-1
//   world knowledge key:          adv-<worldId>                    e.g. adv-colors
//   worldId must match [a-z0-9]+ only (no dashes/underscores) so that
//   storage-key normalization stays unambiguous.
//
// World fields:
//   id            worldId (see restriction above)
//   name          display name
//   listName      name of a list in DATA
//   itemFilter    optional — {group: 'א'}, {field, value, match: 'equals'|'contains'}
//                 or {range: {from, to}} (inclusive index range in the source list)
//   setItems      how many items unlock at each learning step
//   questionIndex/resultIndex/questionType — defaults for all encounters
//   unlock        unlock condition (for future UI use)
//   encounters    ordered list of encounters:
//     {type: 'learn'}                                — present the newly unlocked items (news screen)
//     {type: 'game', game: '<appType>', ...overrides} — a mini-game; the exact game lineup is TBD
//     {type: 'final', game: '<appType>', ...}         — closing challenge over all world items

// --- The primary goal: a world series teaching the names of ALL the Hebrew
// letters (hebrewAlphabet: 27 items incl. finals, letter + spoken letterName).
// The child hears the letter name and picks the letter. Worlds unlock
// sequentially; the review world inherits everything via seeding, so letters
// the child struggled with come back more often.

const HEBREW_LETTER_GROUPS = [
    {id: 'hebrew1', name: 'אותיות א׳–ה׳', emoji: 'א', range: {from: 0, to: 4}},
    {id: 'hebrew2', name: 'אותיות ו׳–י׳', emoji: 'ו', range: {from: 5, to: 9}},
    {id: 'hebrew3', name: 'אותיות כ׳–מ׳', emoji: 'כ', range: {from: 10, to: 14}},
    {id: 'hebrew4', name: 'אותיות נ׳–ע׳', emoji: 'נ', range: {from: 15, to: 18}},
    {id: 'hebrew5', name: 'אותיות פ׳–ק׳', emoji: 'פ', range: {from: 19, to: 23}},
    {id: 'hebrew6', name: 'אותיות ר׳–ת׳', emoji: 'ר', range: {from: 24, to: 26}},
];

const HEBREW_LETTER_WORLDS = HEBREW_LETTER_GROUPS.map((group, index) => ({
    id: group.id,
    name: group.name,
    emoji: group.emoji,
    listName: 'hebrewAlphabet',
    itemFilter: {range: group.range},
    // The world itself is the learning chunk: ALL its letters open from the start
    setItems: group.range.to - group.range.from + 1,
    questionIndex: 'letterName', // spoken name, auto-played
    resultIndex: 'letter',       // the child picks the letter
    art: {bg: 'world_letters_bg'},
    unlock: index === 0 ? {playerLevel: 1} : {world: HEBREW_LETTER_GROUPS[index - 1].id},
    // Letter worlds are built around the treasure maze (hear the letter name,
    // pick the door with the right letter), with falling answers for variety.
    encounters: [
        {type: 'learn'},
        {type: 'game', game: 'treasure_maze'},
        {type: 'game', game: 'falling_answers'},
        {type: 'game', game: 'treasure_maze'},
        {type: 'final', game: 'treasure_maze'},
    ],
}));

const WORLDS = HEBREW_LETTER_WORLDS.concat([
    {
        id: 'hebrewreview',
        name: 'ארץ כל האותיות',
        emoji: '📜',
        listName: 'hebrewAlphabet',
        setItems: 27, // review world — everything open (and seeded from the letter worlds)
        questionIndex: 'letterName',
        resultIndex: 'letter',
        art: {bg: 'world_review_bg'},
        unlock: {world: 'hebrew6'},
        encounters: [
            {type: 'learn'},
            {type: 'game', game: 'mcq'},
            {type: 'game', game: 'falling_answers'},
            {type: 'game', game: 'mcq'},
            {type: 'game', game: 'falling_answers'},
            {type: 'final', game: 'mcq'},
        ],
    },
    {
        id: 'aleph',
        name: 'עולם האות א׳ עם ניקוד',
        emoji: 'אָ',
        listName: 'HEBREW_LETTERS_WITH_NIKUD',
        itemFilter: {group: 'א'},
        setItems: 4, // all nikud variants of א open from the start
        questionIndex: 'letter',
        resultIndex: 'letter',
        questionType: 'speech',
        art: {bg: 'world_nikud_bg'},
        unlock: {world: 'hebrewreview'},
        encounters: [
            {type: 'learn'},
            {type: 'game', game: 'mcq'},
            {type: 'game', game: 'falling_answers'},
            {type: 'final', game: 'mcq'},
        ],
    },
    // Bonus worlds (English vocabulary), gated by player level
    {
        id: 'colors',
        name: 'עולם הצבעים',
        emoji: '🌈',
        listName: 'COLORS',
        setItems: 3,
        questionIndex: 'english_name',
        resultIndex: 'emoji',
        art: {bg: 'world_english_bg'},
        unlock: {playerLevel: 2},
        encounters: [
            {type: 'learn'},
            {type: 'game', game: 'mcq'},
            {type: 'game', game: 'water_pipeline'},
            {type: 'game', game: 'mcq', questionIndex: 'emoji', resultIndex: 'english_name'},
            {type: 'final', game: 'mcq'},
        ],
    },
    {
        id: 'animals',
        name: 'עולם החיות',
        emoji: '🐾',
        listName: 'ANIMALS',
        setItems: 3,
        questionIndex: 'english_name',
        resultIndex: 'emoji',
        art: {bg: 'world_english_bg'},
        unlock: {playerLevel: 3},
        encounters: [
            {type: 'learn'},
            {type: 'game', game: 'mcq'},
            {type: 'game', game: 'falling_answers'},
            {type: 'game', game: 'mcq', questionIndex: 'emoji', resultIndex: 'english_name'},
            {type: 'final', game: 'mcq'},
        ],
    },
    {
        id: 'numbers',
        name: 'עולם המספרים',
        emoji: '🔢',
        listName: 'NUMBERS',
        setItems: 3,
        questionIndex: 'english_name',
        resultIndex: 'hebrew',
        art: {bg: 'world_english_bg'},
        unlock: {playerLevel: 4},
        encounters: [
            {type: 'learn'},
            {type: 'game', game: 'mcq'},
            {type: 'game', game: 'mcq', questionIndex: 'hebrew', resultIndex: 'english_name'},
            {type: 'final', game: 'mcq'},
        ],
    },
    {
        id: 'defense',
        name: 'ממלכת הידע',
        emoji: '🏰',
        listName: 'ANIMALS',
        setItems: 3,
        questionIndex: 'english_name',
        resultIndex: 'hebrew',
        art: {bg: 'world_english_bg'},
        unlock: {playerLevel: 3},
        encounters: [
            {type: 'learn'},
            {type: 'game', game: 'knowledge_defense'},
            {type: 'final', game: 'knowledge_defense', name: 'המצור הגדול'},
        ],
    },
]);

const ADVENTURE_ID_RE = /^adv-([a-z0-9]+)-(\d+)$/;
const ADVENTURE_LIST_PREFIX = 'ADV_WORLD:';

// Dev-time warning for invalid world ids (they would break storage-key normalization)
WORLDS.forEach(world => {
    if (!/^[a-z0-9]+$/.test(world.id)) {
        console.error(`worlds.js: world id "${world.id}" is invalid — must match [a-z0-9]+`);
    }
});

function getWorldById(worldId) {
    return WORLDS.find(world => world.id === worldId) || null;
}

function getAdventureAppId(worldId, encounterIndex) {
    return `adv-${worldId}-${encounterIndex}`;
}

// The world's shared knowledge key — the namespace for weights, history and progress
function getWorldKnowledgeKey(worldId) {
    return `adv-${worldId}`;
}

function parseAdventureId(id) {
    if (typeof id !== 'string') {
        return null;
    }
    const match = ADVENTURE_ID_RE.exec(id);
    if (!match) {
        return null;
    }
    const world = getWorldById(match[1]);
    if (!world) {
        return null;
    }
    const encounterIndex = Number(match[2]);
    if (encounterIndex >= world.encounters.length) {
        return null;
    }
    return {world: world, encounterIndex: encounterIndex, encounter: world.encounters[encounterIndex]};
}

// Storage-key normalization: every encounter (adv-<world>-<n>) writes to the
// world's key (adv-<world>). Invoked from getKey in storage.js, so it covers
// every storage key composed from the currentAppId: weights, Progress,
// CurrentLevelProgress, new_items, attemptHistory and score. Non-adventure
// keys pass through unchanged.
function normalizeAdventureKey(key) {
    if (typeof key !== 'string' || key.indexOf('adv-') === -1) {
        return key;
    }
    return key.replace(/adv-([a-z0-9]+)-\d+/g, 'adv-$1');
}

// --- Virtual lists: a filtered subset of a DATA list, per world ---

const _worldItemsCache = {};

function getWorldListName(world) {
    return ADVENTURE_LIST_PREFIX + world.id;
}

function _matchesWorldFilter(item, filter, index) {
    if (!filter) {
        return true;
    }
    if (filter.range) {
        return index >= filter.range.from && index <= filter.range.to;
    }
    if (filter.group !== undefined) {
        return !!(item.groups && item.groups.includes(filter.group));
    }
    if (filter.field) {
        const field = item[filter.field];
        if (!field || field.value === undefined) {
            return false;
        }
        const value = String(field.value);
        return filter.match === 'contains' ? value.includes(filter.value) : value === filter.value;
    }
    return true;
}

function _buildWorldItems(world) {
    if (_worldItemsCache[world.id]) {
        return _worldItemsCache[world.id];
    }
    if (!DATA[world.listName]) {
        throw new Error(`worlds.js: list "${world.listName}" of world "${world.id}" does not exist in DATA`);
    }
    const items = [];
    // originalIndexes[i] = the index of the world's i-th item in the full
    // source list — used to cross-reference knowledge with other worlds and
    // with the legacy menu games (seeding)
    const originalIndexes = [];
    DATA[world.listName].forEach((item, index) => {
        if (_matchesWorldFilter(item, world.itemFilter, index)) {
            items.push(item);
            originalIndexes.push(index);
        }
    });
    _worldItemsCache[world.id] = {items: items, originalIndexes: originalIndexes};
    return _worldItemsCache[world.id];
}

function getWorldItems(world) {
    return _buildWorldItems(world).items;
}

function getWorldOriginalIndexes(world) {
    return _buildWorldItems(world).originalIndexes;
}

// Hook for getDataList in tester.js — returns a world list, or null for a regular list
function getAdventureList(listName) {
    if (typeof listName !== 'string' || !listName.startsWith(ADVENTURE_LIST_PREFIX)) {
        return null;
    }
    const world = getWorldById(listName.slice(ADVENTURE_LIST_PREFIX.length));
    return world ? getWorldItems(world) : null;
}

// The game type a 'learn' encounter flows into: the next game on the path
// (so finishing the item presentation continues straight into that game).
function _nextGameType(world, fromIndex) {
    for (let i = fromIndex + 1; i < world.encounters.length; i++) {
        if (world.encounters[i].game) {
            return world.encounters[i].game;
        }
    }
    for (let i = fromIndex - 1; i >= 0; i--) {
        if (world.encounters[i].game) {
            return world.encounters[i].game;
        }
    }
    return 'mcq';
}

// --- Virtual app: an adventure encounter disguised as a regular app definition ---

// Hook for getItemById in tester.js — returns null for regular menu ids, and a
// virtual app definition for adventure ids, so the existing game components
// work on it without any change.
function resolveAdventureApp(id) {
    const parsed = parseAdventureId(id);
    if (!parsed) {
        return null;
    }
    const world = parsed.world;
    const encounter = parsed.encounter;
    const app = {
        type: 'app',
        appType: encounter.game || _nextGameType(world, parsed.encounterIndex),
        name: encounter.name || `${world.name} — מפגש ${parsed.encounterIndex + 1}`,
        icon: world.icon || 'auto_awesome',
        listName: getWorldListName(world),
        setItems: encounter.setItems !== undefined ? encounter.setItems : world.setItems,
        adventure: {
            worldId: world.id,
            encounterIndex: parsed.encounterIndex,
            encounterType: encounter.type,
        },
    };
    const inherited = ['questionIndex', 'resultIndex', 'questionType', 'title', 'a', 'b'];
    inherited.forEach(field => {
        const value = encounter[field] !== undefined ? encounter[field] : world[field];
        if (value !== undefined) {
            app[field] = value;
        }
    });
    return app;
}

// --- Seeding: a new world inherits what the child already knows (or struggles with) ---
//
// When a world initializes its weights for the first time, we gather evidence
// about every item from everywhere the child has already met it: other
// adventure worlds on the same list, and all the legacy menu games that use
// the same list (in both activity modes). Items are matched by their index in
// the source list.
//
// An item with evidence unlocks immediately, with a weight that reflects
// difficulty: the more the child struggles (higher weight elsewhere / more
// failures in the attempt history) — the higher the seeded weight, and the
// more often the item comes back. Seeding range: 2 (mastered, light review)
// up to 5 (struggling — same as a brand-new item). Items with no evidence at
// all stay locked and unlock progressively as usual.

// All legacy menu games (tree ids) that use the given list
function _collectLegacyAppIds(listName) {
    const ids = [];
    if (typeof apps === 'undefined' || !apps) {
        return ids;
    }
    (function walk(node, route) {
        if (!node) {
            return;
        }
        if (node.type === 'app') {
            if (node.listName === listName) {
                ids.push(route);
            }
            return;
        }
        if (node.items) {
            node.items.forEach((child, index) => walk(child, route === '' ? String(index) : route + '_' + index));
        }
    })(apps, '');
    return ids;
}

// Evidence per source-list index: {maxWeight, attempts[]} from all sources on the list
function _collectListEvidence(listName, excludeKnowledgeKey) {
    const sources = [];
    _collectLegacyAppIds(listName).forEach(id => sources.push({key: id, originalIndexes: null}));
    WORLDS.forEach(world => {
        if (world.listName !== listName) {
            return;
        }
        const knowledgeKey = getWorldKnowledgeKey(world.id);
        if (knowledgeKey === excludeKnowledgeKey) {
            return;
        }
        sources.push({key: knowledgeKey, originalIndexes: getWorldOriginalIndexes(world)});
    });

    const evidence = {};
    const entryFor = originalIndex => {
        if (!evidence[originalIndex]) {
            evidence[originalIndex] = {maxWeight: -1, attempts: []};
        }
        return evidence[originalIndex];
    };

    sources.forEach(source => {
        const toOriginal = pos => (source.originalIndexes ? source.originalIndexes[pos] : Number(pos));
        // Weights from both activity modes (getWeightsKey depends on the current mode only)
        ['learn', 'practicing'].forEach(mode => {
            const raw = localStorage.getItem(getKey(`${mode}_${source.key}_Weights`));
            if (!raw) {
                return;
            }
            let weights;
            try {
                weights = JSON.parse(raw);
            } catch (e) {
                return;
            }
            weights.forEach((weight, pos) => {
                if (weight >= 0 && toOriginal(pos) !== undefined) {
                    const entry = entryFor(toOriginal(pos));
                    entry.maxWeight = Math.max(entry.maxWeight, weight);
                }
            });
        });
        const history = getAttemptHistory(source.key);
        Object.keys(history).forEach(pos => {
            const originalIndex = toOriginal(pos);
            if (originalIndex !== undefined && Array.isArray(history[pos])) {
                entryFor(originalIndex).attempts.push(...history[pos]);
            }
        });
    });
    return evidence;
}

// Hook for getWeightsForKey in tester.js: in adventure worlds, unlock cycles
// (opening the next batch of items / resetting a finished level for replay)
// run only when entering a 'learn' encounter — replaying a game encounter
// practices but never unlocks new items. Non-adventure keys always auto-unlock
// (legacy behavior unchanged).
function shouldAdventureAutoUnlock(key) {
    const parsed = parseAdventureId(key);
    if (!parsed) {
        return true;
    }
    return parsed.encounter.type === 'learn';
}

// Seeded weight by difficulty, or null when there is no evidence for the item
function computeSeedWeight(entry) {
    const hasWeight = entry && entry.maxWeight >= 0;
    const attempts = entry ? entry.attempts : [];
    if (!hasWeight && attempts.length === 0) {
        return null;
    }
    const weightSignal = hasWeight ? entry.maxWeight / 15 : 0;
    const failSignal = attempts.length ? attempts.filter(success => !success).length / attempts.length : 0;
    const difficulty = Math.max(weightSignal, failSignal); // strongest signal wins — prioritize what's hard
    return 2 + Math.round(3 * difficulty);
}

// Hook for getWeightsForKey in tester.js: called only on the first weights
// initialization. Returns a seeded weights array for an adventure encounter,
// or null (→ default initialization).
function getAdventureSeededWeights(key, setItems, elements) {
    const parsed = parseAdventureId(key);
    if (!parsed || !setItems || getActivityMode() === 'practicing') {
        return null;
    }
    const world = parsed.world;
    const evidence = _collectListEvidence(world.listName, getWorldKnowledgeKey(world.id));
    const originalIndexes = getWorldOriginalIndexes(world);
    let seededAny = false;
    const weights = elements.map((_, pos) => {
        const seed = computeSeedWeight(evidence[originalIndexes[pos]]);
        if (seed !== null) {
            seededAny = true;
            return seed;
        }
        return -1;
    });
    if (!seededAny) {
        return null;
    }
    // Items without evidence are the "new" ones — unlock the first setItems of them as usual
    const newItems = [];
    for (let i = 0; i < weights.length && newItems.length < setItems; i++) {
        if (weights[i] === -1) {
            weights[i] = 5;
            newItems.push(i);
        }
    }
    setProgress(key, weights.length, weights.filter(weight => weight > -1).length);
    setLocalStorage(`${key}_new_items`, newItems);
    return weights;
}

// --- A world's learning state: what the child is learning right now ---

// Computed live from the world's shared weights array.
// unlocked = items opened so far ("currently learning"), mastered = weight 0.
function getWorldLearningState(worldId) {
    const world = getWorldById(worldId);
    if (!world) {
        return null;
    }
    const total = getWorldItems(world).length;
    const stored = localStorage.getItem(getWeightsKey(getWorldKnowledgeKey(worldId)));
    if (!stored) {
        return {started: false, total: total, unlocked: 0, mastered: 0, completed: false};
    }
    const weights = JSON.parse(stored);
    const unlocked = weights.filter(weight => weight >= 0).length;
    const mastered = weights.filter(weight => weight === 0).length;
    return {
        started: true,
        total: total,
        unlocked: unlocked,
        mastered: mastered,
        // Note: the existing system resets weights to 5 after everything is
        // mastered (endless repetition by design), so "completed" is only
        // observable in the moment in between; the adventure UI layer will
        // record completion when it sees it.
        completed: unlocked === total && mastered === total,
    };
}
