// groups.js — "shared-progress groups" for the ordinary menu.
//
// A shared group lets several mini-games sit in the normal menu while sharing
// ONE body of knowledge: the child freely picks any game, but weights, attempt
// history, progress and "new items" all live under a single key — so whatever
// the child struggles with in one game comes back for practice in the others.
//
// This is the lightweight, menu-native version of the shared-knowledge idea
// (adventure mode does the same thing behind a guided world UI). It reuses the
// exact same storage design: every game gets an id grp-<groupId>-<gameIndex>,
// and all of them normalize to grp-<groupId> for storage — with NONE of the
// adventure UI side-effects (no world map, XP, stars, encounter pointer or
// level-complete redirect). Gradual unlocking works exactly like a normal menu
// game, because a grp- key is not an adventure key.
//
// Note: adventure.js already uses the word "group" for its theme kits, so
// everything here is namespaced "SharedGroup" to stay clear of it.
//
// Wiring — all typeof-guarded, like the adventure hooks:
//   - getItemById (tester.js)   -> resolveSharedGroupApp   : id  -> virtual app def
//   - getKey (storage.js)       -> normalizeSharedGroupKey : key -> shared key
//   - MenuComponent.getLink     -> item.link               : menu button -> play url
//
// Id format:  grp-<groupId>-<gameIndex>   e.g. grp-ch51-0
//   groupId must match [a-z0-9]+ (no dashes/underscores) so key normalization
//   stays unambiguous. The menu buttons live in apps.js and link to these ids;
//   keep their game order in sync with the `games` array below.

const SHARED_GROUPS = {
    // Grade 5, unit 1 vocabulary (DATA list "5_1"), READ: the list's own
    // 'text_to_speech' field shows the English word beside a speaker button.
    // Answer = the Hebrew translation. One shared knowledge key across every game
    // below. The listening twin is a SEPARATE group (ch51s) with its own key —
    // see the note there.
    // Games are append-only: each game's index is its id (grp-ch51-<index>), so
    // adding a game must go at the END — inserting mid-array would remap the ids
    // and orphan saved progress.
    ch51: {
        listName: '5_1',
        questionIndex: 'english_name',
        resultIndex: 'hebrew',
        setItems: 5, // how many new words unlock per batch (shared across games)
        games: [
            {appType: 'mcq',               icon: 'format_shapes',  name: 'בחירה מרובה',  title: 'בחרו את התרגום הנכון'},
            {appType: 'balloon_shooter',   icon: 'sports_esports', name: 'מטווח בלונים', title: 'פגעו בבלון עם התשובה הנכונה'},
            {appType: 'word_link',         icon: 'timeline',       name: 'חבר במילים',   title: 'מתחו קו מהמילה אל התרגום שלה'},
            {appType: 'scribble_dungeon',  icon: 'map',            name: 'מבוך הקלף',    title: 'בחרו את הדלת הנכונה וציירו את המבוך'},
            {appType: 'knowledge_defense', icon: 'security',       name: 'הגנת הידע',    title: 'בנו מערך הגנה והצילו את הממלכה'},
            {appType: 'crystal_arena',     icon: 'back_hand',      name: 'זירת הגבישים', title: 'החזיקו חפץ צבעוני בפינה עם התשובה הנכונה'},
        ],
    },

    // The same word list, HEARD: questionType 'speech' renders the speaker button
    // alone, so the English word is never on screen. Its own group, therefore its
    // own knowledge key (grp-ch51s) — recognising a word by ear is a different
    // skill from recognising it in print, and mastering one must not mark the
    // other as learned. Same games and the same unlock batch size, climbed
    // independently.
    ch51s: {
        listName: '5_1',
        questionIndex: 'english_name',
        resultIndex: 'hebrew',
        questionType: 'speech', // group-wide: every game here hides the word
        setItems: 5,
        games: [
            {appType: 'mcq',               icon: 'hearing',        name: 'בחירה מרובה',  title: 'הקשיבו למילה ובחרו את התרגום'},
            {appType: 'balloon_shooter',   icon: 'sports_esports', name: 'מטווח בלונים', title: 'הקשיבו למילה ופגעו בבלון עם התרגום'},
            {appType: 'word_link',         icon: 'timeline',       name: 'חבר במילים',   title: 'הקישו על הרמקול ומתחו קו אל התרגום'},
            {appType: 'scribble_dungeon',  icon: 'map',            name: 'מבוך הקלף',    title: 'הקשיבו למילה ובחרו את הדלת הנכונה'},
            {appType: 'knowledge_defense', icon: 'security',       name: 'הגנת הידע',    title: 'הקשיבו למילה והגנו על הממלכה'},
            {appType: 'crystal_arena',     icon: 'back_hand',      name: 'זירת הגבישים', title: 'הקשיבו למילה והחזיקו את החפץ על התרגום'},
        ],
    },

    // The Hebrew alphabet (DATA list "hebrewAlphabet", 27 letters). One shared
    // knowledge key, and EVERY generic game in the app as a way to practice it:
    // question = the letter's name (spoken), answer = the letter itself.
    // questionType 'speech' matches how the standalone עברית menu items play it.
    // Same append-only rule as above: a game's index IS its id (grp-otiot-<index>).
    otiot: {
        listName: 'hebrewAlphabet',
        questionIndex: 'letterName',
        resultIndex: 'letter',
        questionType: 'speech',
        setItems: 3, // letters are short — three new ones per batch, shared across games
        games: [
            {appType: 'mcq',               icon: 'format_shapes',  name: 'בחירה מרובה',      title: 'הקשיבו לשם האות ובחרו נכון'},
            {appType: 'balloon_shooter',   icon: 'sports_esports', name: 'מטווח בלונים',     title: 'פגעו בבלון עם האות הנכונה'},
            {appType: 'word_link',         icon: 'timeline',       name: 'חבר במילים',       title: 'הקישו על הרמקול ומתחו קו אל האות הנכונה'},
            {appType: 'treasure_maze',     icon: 'sports_esports', name: 'מבוך האוצר',       title: 'הקשיבו לשם האות ובחרו את הדלת הנכונה'},
            {appType: 'platformer',        icon: 'directions_run', name: 'הרפתקת ריצה',      title: 'רוצו וקפצו אל הבלוק עם האות הנכונה'},
            {appType: 'duel_shooter',      icon: 'sports_kabaddi', name: 'דו-קרב',           title: 'ענו נכון, מלאו את המחסנית ונצחו בדו-קרב!'},
            {appType: 'wizard_duel',       icon: 'auto_fix_high',  name: 'דו-קרב הקוסמים',   title: 'ענו נכון והטילו כדורי אש על המפלצת!'},
            {appType: 'scribble_dungeon',  icon: 'map',            name: 'מבוך הקלף',        title: 'הקשיבו לשם האות ובחרו את הדלת הנכונה'},
            {appType: 'water_pipeline',    icon: 'water_drop',     name: 'מסע המים',         title: 'פתחו את החסימות והחזירו את המים!'},
            {appType: 'knowledge_defense', icon: 'security',       name: 'הגנת הידע',        title: 'בנו מערך הגנה והצילו את הממלכה'},
            {appType: 'falling_answers',   icon: 'arrow_downward', name: 'תשובות נופלות',    title: 'הקשיבו לשם האות ולחצו על האות הנכונה'},
            {appType: 'crystal_arena',     icon: 'back_hand',      name: 'זירת הגבישים',     title: 'הקשיבו לשם האות והחזיקו את החפץ בפינה הנכונה'},
        ],
    },
};

const SHARED_GROUP_ID_RE = /^grp-([a-z0-9]+)-(\d+)$/;

// Dev-time warning for invalid group ids (they would break key normalization)
Object.keys(SHARED_GROUPS).forEach(groupId => {
    if (!/^[a-z0-9]+$/.test(groupId)) {
        console.error(`groups.js: shared-group id "${groupId}" is invalid — must match [a-z0-9]+`);
    }
});

function getSharedGroupById(groupId) {
    return Object.prototype.hasOwnProperty.call(SHARED_GROUPS, groupId) ? SHARED_GROUPS[groupId] : null;
}

// The group's shared knowledge key — the namespace for weights, history and progress
function getSharedGroupKnowledgeKey(groupId) {
    return `grp-${groupId}`;
}

function getSharedGroupAppId(groupId, gameIndex) {
    return `grp-${groupId}-${gameIndex}`;
}

function parseSharedGroupId(id) {
    if (typeof id !== 'string') {
        return null;
    }
    const match = SHARED_GROUP_ID_RE.exec(id);
    if (!match) {
        return null;
    }
    const group = getSharedGroupById(match[1]);
    if (!group) {
        return null;
    }
    const gameIndex = Number(match[2]);
    if (!group.games || gameIndex >= group.games.length) {
        return null;
    }
    return {groupId: match[1], group: group, gameIndex: gameIndex, game: group.games[gameIndex]};
}

// Storage-key normalization (hook for getKey in storage.js): every game
// (grp-<group>-<n>) writes to the group's key (grp-<group>). Covers every
// storage key composed from currentAppId — weights, Progress,
// CurrentLevelProgress, new_items, attemptHistory and score. Mirrors
// normalizeAdventureKey. Non-group keys pass through unchanged.
function normalizeSharedGroupKey(key) {
    if (typeof key !== 'string' || key.indexOf('grp-') === -1) {
        return key;
    }
    return key.replace(/grp-([a-z0-9]+)-\d+/g, 'grp-$1');
}

// Virtual app (hook for getItemById in tester.js): a group game id resolves to
// a plain app definition, so every existing game component runs on it without
// any change. Returns null for non-group ids.
function resolveSharedGroupApp(id) {
    const parsed = parseSharedGroupId(id);
    if (!parsed) {
        return null;
    }
    const group = parsed.group;
    const game = parsed.game;
    const app = {
        type: 'app',
        appType: game.appType,
        name: game.name || `${group.listName} — ${parsed.gameIndex + 1}`,
        icon: game.icon || 'sports_esports',
        listName: group.listName,
        setItems: game.setItems !== undefined ? game.setItems : group.setItems,
    };
    const inherited = ['questionIndex', 'resultIndex', 'questionType', 'title', 'a', 'b'];
    inherited.forEach(field => {
        const value = game[field] !== undefined ? game[field] : group[field];
        if (value !== undefined) {
            app[field] = value;
        }
    });
    return app;
}

// Menu buttons for a group — one per game, each launching its game on its
// shared id. apps.js can spread this into a submenu's items (single source of
// truth), or the same links can be written by hand.
function getSharedGroupMenuItems(groupId) {
    const group = getSharedGroupById(groupId);
    if (!group || !group.games) {
        return [];
    }
    return group.games.map((game, index) => ({
        icon: game.icon || 'sports_esports',
        name: game.name,
        type: 'app',
        link: `/play/${game.appType}/${getSharedGroupAppId(groupId, index)}`,
    }));
}
