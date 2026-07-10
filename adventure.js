// adventure.js — adventure mode UI skeleton and player state.
//
// A parallel entry screen to the regular menu mode: the child enters at
// #/adventure, picks a world, and advances along a path of encounters.
// The learning itself runs on the shared world knowledge (worlds.js);
// this file adds player state (XP / levels), world unlocking, encounter
// progression, and two screens. Visual design is intentionally minimal —
// the art/animation pass comes later.
//
// Connections to the existing code are typeof-guarded hooks (see tester.js):
//   - routes are appended via getAdventureRoutes()
//   - updateWeightForKey reports answers via onAdventureAnswer()
//   - BaseGame.reloadProgress asks getAdventureLevelCompleteRoute() where to
//     return when a learning cycle is completed

// --- Player state (XP, level) ---

const ADVENTURE_XP_PER_CORRECT = 2;
const ADVENTURE_XP_PER_LEVEL = 50;
const ADVENTURE_COINS_PER_STAR = 10;

function getAdventurePlayer() {
    return getLocalStorage('adv_player', {xp: 0, coins: 0});
}

function addAdventureXp(amount) {
    const player = getAdventurePlayer();
    player.xp = (player.xp || 0) + amount;
    setLocalStorage('adv_player', player);
    return player;
}

function addAdventureCoins(amount) {
    const player = getAdventurePlayer();
    player.coins = (player.coins || 0) + amount;
    setLocalStorage('adv_player', player);
    return player;
}

function getAdventureLevel(xp) {
    return Math.floor(xp / ADVENTURE_XP_PER_LEVEL) + 1;
}

// XP already earned inside the current level, for the progress bar
function getAdventureXpInLevel(xp) {
    return xp % ADVENTURE_XP_PER_LEVEL;
}

// --- Adventure theme kits (the "which adventure" the child plays) ---
//
// An adventure = a full visual skin over the SAME learning worlds. Each kit
// reuses one of the color themes from themes.js (so the mini-games and the
// regular menu get themed too via setTheme) and adds adventure-flavored
// presentation: a name, an emoji, a subtitle, a hero and a companion set.
// Learning progress is shared across all kits — switching adventure changes
// only the look, never what the child has learned.
//
// To add an adventure: add a color theme to themes.js and an entry here.
// The visual variables per kit live in adventure.css under body.adv-theme-<id>.

const ADVENTURE_THEME_KITS = {
    unicorn: {
        id: 'unicorn', theme: 'unicorn', name: 'ממלכת הקסם', emoji: '🦄',
        subtitle: 'איים מרחפים, קשתות וקסם ורוד',
        hero: '🧚', companions: ['🦄', '🦋', '🐱'],
        // ambient = drifting particles behind the mini-games (see AdventureFrame)
        ambient: ['✨', '🌸', '💖', '⭐'],
    },
    space: {
        id: 'space', theme: 'space', name: 'מסע בין הכוכבים', emoji: '🚀',
        subtitle: 'טסים בין כוכבים, חייזרים וחלליות',
        hero: '🧑‍🚀', companions: ['👽', '🛸', '🪐'],
        ambient: ['⭐', '✨', '🌟', '🪐'],
    },
    code: {
        id: 'code', theme: 'code', name: 'עולם הקוד', emoji: '🖥️',
        subtitle: 'גשם של אותיות ירוקות בתוך המטריקס',
        hero: '🧑‍💻', companions: ['🤖', '👾', '🦾'],
        ambient: ['🟩', '💚', '✳️', '👾'],
    },
    dark: {
        id: 'dark', theme: 'dark', name: 'ממלכת הלילה', emoji: '🌙',
        subtitle: 'הרפתקה שקטה תחת שמי לילה וכוכבים',
        hero: '🦸', companions: ['🦉', '🐺', '🦇'],
        ambient: ['⭐', '✨', '🌙', '💫'],
    },
    soldiers: {
        id: 'soldiers', theme: 'soldiers', name: 'מחנה הגיבורים', emoji: '🎖️',
        subtitle: 'משימות אמיצות במחנה ההרפתקנים',
        hero: '🦸', companions: ['🐕', '🦅', '🐎'],
        ambient: ['🍃', '🌿', '⭐', '✨'],
    },
    base: {
        id: 'base', theme: 'base', name: 'עולם התכלת', emoji: '🌊',
        subtitle: 'מסע רגוע במים טורקיז שקטים',
        hero: '🧒', companions: ['🐬', '🐢', '🐠'],
        ambient: ['🫧', '💧', '✨', '🐚'],
    },
};

// Display order in the picker (unicorn stays first — the original adventure)
const ADVENTURE_THEME_ORDER = ['unicorn', 'space', 'code', 'dark', 'soldiers', 'base'];
const ADVENTURE_DEFAULT_THEME = 'unicorn';

function getAdventureThemeId() {
    const id = getLocalStorage('adv_current_theme', ADVENTURE_DEFAULT_THEME);
    return ADVENTURE_THEME_KITS[id] ? id : ADVENTURE_DEFAULT_THEME;
}

function getAdventureThemeKit(id) {
    return ADVENTURE_THEME_KITS[id || getAdventureThemeId()] || ADVENTURE_THEME_KITS[ADVENTURE_DEFAULT_THEME];
}

// Switch the active adventure: persist the choice, apply the matching color
// theme (so mini-games + menu match the skin), record the play, and reskin.
function setAdventureThemeId(id) {
    if (!ADVENTURE_THEME_KITS[id]) {
        return;
    }
    setLocalStorage('adv_current_theme', id);
    if (typeof setTheme === 'function') {
        setTheme(ADVENTURE_THEME_KITS[id].theme);
    }
    recordAdventurePlay(id);
    applyAdventureSkin(id);
}

// Put the theme-skin class on <body> so the adventure.css variable overrides
// apply to every adventure screen and the in-game frame. Idempotent and safe to
// call on every adventure route enter; harmless on non-adventure screens (the
// classes only feed .adv-* rules).
function applyAdventureSkin(id) {
    if (typeof document === 'undefined' || !document.body) {
        return;
    }
    const themeId = id || getAdventureThemeId();
    Array.from(document.body.classList).forEach(cls => {
        if (cls.indexOf('adv-theme-') === 0) {
            document.body.classList.remove(cls);
        }
    });
    document.body.classList.add('adv-theme-' + themeId);
}

// --- Previous adventures: a per-kit play record for the "history" panel ---

function getAdventureHistory() {
    return getLocalStorage('adv_theme_history', {});
}

function recordAdventurePlay(id) {
    const history = getAdventureHistory();
    const now = Date.now();
    const entry = history[id] || {plays: 0, firstPlayed: now};
    entry.plays = (entry.plays || 0) + 1;
    entry.lastPlayed = now;
    if (!entry.firstPlayed) {
        entry.firstPlayed = now;
    }
    history[id] = entry;
    setLocalStorage('adv_theme_history', history);
    return entry;
}

// Overall progress, shared across all adventures (worlds completed, stars,
// coins, level) — the meat of the "previous adventures" summary.
function getAdventureOverallProgress() {
    let worldsDone = 0, starsEarned = 0, starsPossible = 0;
    WORLDS.forEach(world => {
        if (isWorldCompleted(world.id)) {
            worldsDone += 1;
        }
        starsPossible += (world.encounters ? world.encounters.length : 0) * 3;
        const map = getWorldStars(world.id) || {};
        Object.keys(map).forEach(key => { starsEarned += map[key]; });
    });
    const player = getAdventurePlayer();
    return {
        worldsDone: worldsDone,
        worldsTotal: WORLDS.length,
        starsEarned: starsEarned,
        starsPossible: starsPossible,
        coins: player.coins || 0,
        level: getAdventureLevel(player.xp || 0),
    };
}

// --- Avatar (character creator) ---
//
// The avatar is layered: base character + aura color + hat + companion.
// Placeholder layers are emoji/colors; the same structure will hold
// AI-generated sprite layers later (value becomes an image path).
// Items unlock by player level, so XP has a visible reward from day one.

const ADVENTURE_AVATAR_OPTIONS = {
    base: [
        {value: '🧒', level: 1}, {value: '👧', level: 1}, {value: '👦', level: 1},
        {value: '🧙', level: 2}, {value: '🧙‍♀️', level: 2},
        {value: '🧚', level: 3}, {value: '🦸', level: 3},
        {value: '🧜‍♀️', level: 4}, {value: '🐉', level: 5}, {value: '🦄', level: 5},
    ],
    color: [
        {value: '#ffe3f0', level: 1}, {value: '#dbeafe', level: 1}, {value: '#dcfce7', level: 1},
        {value: '#fef9c3', level: 2}, {value: '#f3e8ff', level: 2},
        {value: '#ffedd5', level: 3}, {value: 'linear-gradient(135deg, #ffd6e7, #c5b3ff)', level: 4},
    ],
    hat: [
        {value: '', level: 1}, {value: '🎀', level: 1}, {value: '🧢', level: 1},
        {value: '👑', level: 2}, {value: '🎩', level: 3}, {value: '🪄', level: 3}, {value: '⭐', level: 4},
    ],
    companion: [
        {value: '🦄', level: 1}, {value: '🐱', level: 1}, {value: '🐕', level: 1},
        {value: '🐇', level: 2}, {value: '🐢', level: 2}, {value: '🐧', level: 3},
        {value: '🦊', level: 3}, {value: '🦋', level: 4}, {value: '🐼', level: 4},
        {value: '🐉', level: 4}, {value: '🦉', level: 5},
    ],
};

// Real animations for every companion — free Google Noto Animated Emoji
// (Lottie files downloaded to assets, rendered with lottie-web). Any emoji
// without a file simply renders as text, so old saves keep working.
const COMPANION_LOTTIE = {
    '🦄': 'assets/adventure/lottie/unicorn.json',
    '🐱': 'assets/adventure/lottie/cat.json',
    '🐕': 'assets/adventure/lottie/dog.json',
    '🐇': 'assets/adventure/lottie/rabbit.json',
    '🐢': 'assets/adventure/lottie/turtle.json',
    '🐧': 'assets/adventure/lottie/penguin.json',
    '🦊': 'assets/adventure/lottie/fox.json',
    '🦋': 'assets/adventure/lottie/butterfly.json',
    '🐼': 'assets/adventure/lottie/panda.json',
    '🐉': 'assets/adventure/lottie/dragon.json',
    '🦉': 'assets/adventure/lottie/owl.json',
};

const ADVENTURE_AVATAR_DEFAULTS = {base: '🧒', color: '#ffe3f0', hat: '', companion: '🦄'};

function getAdventureAvatar() {
    return Object.assign({}, ADVENTURE_AVATAR_DEFAULTS, getLocalStorage('adv_avatar', {}));
}

function saveAdventureAvatar(avatar) {
    setLocalStorage('adv_avatar', avatar);
}

function isAvatarOptionUnlocked(option) {
    return getAdventureLevel(getAdventurePlayer().xp) >= (option.level || 1);
}

// --- World unlocking and completion ---

function isWorldCompleted(worldId) {
    return getLocalStorage(`adv-${worldId}_completed`, false) === true;
}

// A world unlocks when all its conditions hold: a prerequisite world
// completed (unlock.world) and/or a player level reached (unlock.playerLevel).
function isWorldUnlocked(world) {
    if (isWorldCompleted(world.id)) {
        return true;
    }
    const unlock = world.unlock || {};
    if (unlock.world && !isWorldCompleted(unlock.world)) {
        return false;
    }
    if (unlock.playerLevel && getAdventureLevel(getAdventurePlayer().xp) < unlock.playerLevel) {
        return false;
    }
    return true;
}

// Kid-readable lock description for the world card
function getWorldUnlockText(world) {
    const unlock = world.unlock || {};
    if (unlock.world) {
        const prerequisite = getWorldById(unlock.world);
        return prerequisite ? `קודם מסיימים את ${prerequisite.name}` : '';
    }
    if (unlock.playerLevel) {
        return `נפתח ברמה ${unlock.playerLevel}`;
    }
    return '';
}

// The single "next thing to do": the first unlocked-but-uncompleted world,
// at its current encounter pointer. Returns null when everything is done.
function getNextGuidedStep() {
    for (const world of WORLDS) {
        if (!isWorldUnlocked(world) || isWorldCompleted(world.id)) {
            continue;
        }
        return {worldId: world.id, name: world.name, emoji: world.emoji || '🌍',
                encounterIndex: getEncounterPointer(world.id)};
    }
    return null;
}

// --- Encounter progression along the world path ---
//
// The pointer is the index of the furthest encounter the child may enter.
// Completing a learning cycle inside encounter k moves it to k+1 (capped at
// the last encounter); earlier encounters stay open for replay.

function getEncounterPointer(worldId) {
    return getLocalStorage(`adv-${worldId}_encounterPointer`, 0);
}

function setEncounterPointer(worldId, value) {
    setLocalStorage(`adv-${worldId}_encounterPointer`, value);
}

function advanceEncounterPointer(worldId, completedIndex) {
    const world = getWorldById(worldId);
    if (!world) {
        return;
    }
    const next = Math.min(completedIndex + 1, world.encounters.length - 1);
    setEncounterPointer(worldId, Math.max(getEncounterPointer(worldId), next));
}

// --- Encounter accuracy → stars & coins ---

// 3 stars: up to 10% mistakes; 2: up to 30%; else 1
function computeSessionStars(session) {
    const total = (session.correct || 0) + (session.wrong || 0);
    if (!total) {
        return 1;
    }
    const failRate = session.wrong / total;
    if (failRate <= 0.10) {
        return 3;
    }
    if (failRate <= 0.30) {
        return 2;
    }
    return 1;
}

// Best stars earned per encounter, kept as {"<encounterIndex>": stars}
function getWorldStars(worldId) {
    return getLocalStorage(`adv-${worldId}_stars`, {});
}

// Hook for BaseGame.reloadProgress in tester.js: when a learning cycle is
// completed inside an adventure encounter, grant rewards, advance the path and
// return to the world screen. Returns null for non-adventure ids (→ legacy).
function getAdventureLevelCompleteRoute(currentAppId) {
    const parsed = parseAdventureId(currentAppId);
    if (!parsed) {
        return null;
    }
    advanceEncounterPointer(parsed.world.id, parsed.encounterIndex);

    // Reward: stars from this encounter's accuracy, coins from stars.
    const session = getLocalStorage('adv_session', {});
    const stars = session.key === currentAppId ? computeSessionStars(session) : 1;
    const starsMap = getWorldStars(parsed.world.id);
    const previousBest = starsMap[parsed.encounterIndex] || 0;
    const isNewBest = stars > previousBest;
    if (isNewBest) {
        starsMap[parsed.encounterIndex] = stars;
        setLocalStorage(`adv-${parsed.world.id}_stars`, starsMap);
    }
    // Coins are only awarded for improving (or first-time) results, so replaying
    // an already-3-star encounter can't farm coins.
    const coins = isNewBest ? (stars - previousBest) * ADVENTURE_COINS_PER_STAR : 0;
    if (coins > 0) {
        addAdventureCoins(coins);
    }
    setLocalStorage('adv_session', {});

    if (typeof gtag === 'function') {
        gtag('event', 'adventure_encounter_completed', {
            world_id: parsed.world.id, encounter_index: parsed.encounterIndex, stars: stars,
        });
    }

    // celebrate=1 shows the banner; stars/coins drive its contents
    return `/adventure/world/${parsed.world.id}?celebrate=1&stars=${stars}&coins=${coins}`;
}

// Hook for updateWeightForKey in tester.js: called on every answer, in every
// game. Tracks per-encounter accuracy, awards XP for correct answers in
// adventure encounters, and records world completion the moment it is observed.
function onAdventureAnswer(key, isCorrect) {
    const parsed = parseAdventureId(key);
    if (!parsed) {
        return;
    }

    // Track accuracy for the CURRENT encounter (used for stars). Reset whenever
    // the child switches to a different encounter id.
    const session = getLocalStorage('adv_session', {});
    if (session.key !== key) {
        session.key = key;
        session.correct = 0;
        session.wrong = 0;
    }
    if (isCorrect) {
        session.correct += 1;
    } else {
        session.wrong += 1;
    }
    setLocalStorage('adv_session', session);

    if (isCorrect) {
        addAdventureXp(ADVENTURE_XP_PER_CORRECT);
    }
    const state = getWorldLearningState(parsed.world.id);
    if (state && state.completed && !isWorldCompleted(parsed.world.id)) {
        setLocalStorage(`adv-${parsed.world.id}_completed`, true);
        if (typeof gtag === 'function') {
            gtag('event', 'adventure_world_completed', {world_id: parsed.world.id});
        }
    }
    // Let the in-game frame (companion) react to the answer
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent === 'function') {
        window.dispatchEvent(new CustomEvent('adventure-answer', {detail: {correct: isCorrect}}));
    }
}

// Make sure the world's shared weights exist (runs seeding on first entry).
// Uses a game-encounter id so that just visiting the world screen never
// triggers an unlock cycle — only 'learn' encounters unlock (see worlds.js).
function ensureWorldWeights(world) {
    let gameIndex = world.encounters.findIndex(encounter => encounter.type !== 'learn');
    if (gameIndex === -1) {
        gameIndex = 0;
    }
    return getWeightsForKey(getAdventureAppId(world.id, gameIndex), world.setItems, getWorldItems(world));
}

// Hebrew display names for the game types used on the path
const ADVENTURE_GAME_NAMES = {
    mcq: 'שאלות ותשובות',
    spell: 'הכתבה',
    common: 'התאמת זוגות',
    falling_answers: 'תשובות נופלות',
    draw_letter: 'ציור אות',
    s2t: 'לומדים לדבר',
    balloon_shooter: 'מטווח בלונים',
    platformer: 'הרפתקת קפיצות',
    treasure_maze: 'מבוך האוצר',
    word_link: 'חיבור מילים',
    water_pipeline: 'מסע המים',
};

function getEncounterDisplay(world, encounter, index) {
    if (encounter.type === 'learn') {
        return {icon: '📖', name: 'לומדים משהו חדש'};
    }
    if (encounter.type === 'final') {
        return {icon: '👑', name: 'האתגר הגדול'};
    }
    return {icon: '🎮', name: ADVENTURE_GAME_NAMES[encounter.game] || encounter.game};
}

// Route for clicking an encounter on the path.
// learn → item presentation that flows into the next game (see _nextGameType);
// it presents the pending new items if there are any, otherwise everything unlocked.
function getEncounterRoute(world, index) {
    const encounter = world.encounters[index];
    const targetIndex = encounter.type === 'learn' && index + 1 < world.encounters.length ? index + 1 : index;
    const appId = getAdventureAppId(world.id, targetIndex);
    if (encounter.type === 'learn') {
        const hasNews = getLocalStorage(`adv-${world.id}_new_items`, []).length > 0;
        return (hasNews ? '/display/news/' : '/display/all/') + appId;
    }
    const app = resolveAdventureApp(appId);
    return `/play/${app.appType}/${appId}`;
}

// --- Screens ---

// Decorative drifting clouds behind every adventure screen
var AdventureClouds = Vue.component('adventure-clouds', {
    template: `
    <div class="adv-clouds">
      <span class="adv-cloud" style="top: 6%; animation-duration: 55s;">☁️</span>
      <span class="adv-cloud" style="top: 22%; animation-duration: 80s; animation-delay: -30s; font-size: 2.2em;">☁️</span>
      <span class="adv-cloud" style="top: 55%; animation-duration: 65s; animation-delay: -12s; font-size: 4em;">☁️</span>
      <span class="adv-cloud" style="top: 78%; animation-duration: 95s; animation-delay: -50s; font-size: 2.6em;">☁️</span>
    </div>`,
});

// The child's layered avatar (aura color + base + hat)
var AdventureAvatar = Vue.component('adventure-avatar', {
    props: {size: {type: Number, default: 52}},
    template: `
    <span class="adv-avatar adv-float" :style="{width: size + 'px', height: size + 'px', background: avatar.color, fontSize: (size * 0.55) + 'px'}">
      <span class="adv-avatar-base">{{ avatar.base }}</span>
      <span v-if="avatar.hat" class="adv-avatar-hat">{{ avatar.hat }}</span>
    </span>`,
    data: function () {
        return {avatar: getAdventureAvatar()};
    },
});

var AdventurePlayerCard = Vue.component('adventure-player-card', {
    template: `
    <div class="adv-player" dir="rtl" style="display: flex; align-items: center; gap: 12px;">
      <adventure-avatar :size="56"></adventure-avatar>
      <div style="flex: 1;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 1.15em; font-weight: bold;">רמה {{ level }}</span>
          <span style="font-size: 1.05em; font-weight: bold;">🪙 {{ coins }}</span>
        </div>
        <div class="adv-xp-track">
          <div class="adv-xp-fill" :style="{width: xpPercent + '%'}"></div>
        </div>
        <span style="font-size: 0.85em;">{{ xpInLevel }} / {{ xpPerLevel }} נקודות לרמה הבאה</span>
      </div>
    </div>`,
    data: function () {
        const player = getAdventurePlayer();
        return {
            level: getAdventureLevel(player.xp),
            coins: player.coins || 0,
            xpInLevel: getAdventureXpInLevel(player.xp),
            xpPerLevel: ADVENTURE_XP_PER_LEVEL,
        };
    },
    computed: {
        xpPercent: function () {
            return Math.round((this.xpInLevel / this.xpPerLevel) * 100);
        },
    },
});

// One companion sprite: a real Lottie animation when available, emoji otherwise
var CompanionSprite = Vue.component('companion-sprite', {
    props: {emoji: {type: String, required: true}, size: {type: Number, default: 72}},
    template: `
    <span class="adv-lottie adv-float" :style="{width: size + 'px', height: size + 'px'}">
      <span ref="box" class="adv-lottie-box"></span>
      <span v-if="!animated" class="adv-sprite" :style="{fontSize: (size * 0.7) + 'px', lineHeight: size + 'px'}">{{ emoji }}</span>
    </span>`,
    data: function () {
        return {animated: false};
    },
    mounted: function () {
        this.load();
    },
    watch: {
        emoji: function () {
            this.load();
        },
    },
    beforeDestroy: function () {
        this.destroyAnimation();
    },
    methods: {
        destroyAnimation: function () {
            if (this._animation) {
                this._animation.destroy();
                this._animation = null;
            }
            this.animated = false;
        },
        load: function () {
            this.destroyAnimation();
            const file = typeof lottie !== 'undefined' ? COMPANION_LOTTIE[this.emoji] : null;
            if (!file || !this.$refs.box) {
                return;
            }
            this._animation = lottie.loadAnimation({
                container: this.$refs.box,
                renderer: 'svg',
                loop: true,
                autoplay: true,
                path: file,
            });
            this.animated = true;
        },
    },
});

// The chosen companion with an encouraging speech bubble
var AdventureCompanion = Vue.component('adventure-companion', {
    props: {message: {type: String, required: true}},
    template: `
    <div class="adv-companion" dir="rtl">
      <companion-sprite :emoji="companion" :size="64"></companion-sprite>
      <div class="adv-bubble">{{ message }}</div>
    </div>`,
    data: function () {
        return {companion: getAdventureAvatar().companion};
    },
});

// The dressing room: pick base / aura color / hat / companion.
// Every click saves immediately — no "save" button a kid could miss.
var AdventureAvatarComponent = Vue.component('adventure-avatar-editor', {
    template: `
    <div class="adv-screen adv-art-avatar" dir="rtl">
      <adventure-clouds></adventure-clouds>
      <div class="adv-content">
        <div class="adv-title">👗 ארון החפצים</div>
        <adventure-companion v-if="firstRun" message="קודם בונים דמות! בחרו דמות, צבע וחבר למסע 🎨"></adventure-companion>
        <div style="text-align: center; margin-bottom: 18px;">
          <adventure-avatar :size="110" :key="refreshKey"></adventure-avatar>
          <companion-sprite :emoji="avatar.companion" :size="95" style="margin-right: 12px;"></companion-sprite>
        </div>
        <div v-for="section in sections" :key="section.field" class="adv-card" style="display: block; cursor: default;">
          <div class="adv-card-title" style="margin-bottom: 8px;">{{ section.title }}</div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            <span v-for="option in section.options" :key="option.value"
                  class="adv-option"
                  :class="{'adv-option-selected': avatar[section.field] === option.value, 'adv-locked': !option.unlocked}"
                  :style="section.field === 'color' ? {background: option.value} : {}"
                  @click="pick(section.field, option)">
              <template v-if="section.field !== 'color'">{{ option.value || '✖' }}</template>
              <span v-if="!option.unlocked" class="adv-option-lock">🔒{{ option.lockLabel }}</span>
            </span>
          </div>
        </div>
        <div v-if="firstRun" class="adv-card adv-pop adv-pulse adv-cta" @click="startAdventure">
          <span class="adv-sprite adv-float">🚀</span>
          <div class="adv-card-title">יוצאים להרפתקה! ▶</div>
        </div>
        <router-link v-else to="/adventure/map" class="adv-back">→ חזרה למפת העולמות</router-link>
      </div>
    </div>`,
    data: function () {
        return {
            avatar: getAdventureAvatar(),
            refreshKey: 0,
            firstRun: this.$route.query.first === '1',
            sections: [
                {field: 'base', title: 'הדמות שלי', options: this.buildOptions('base')},
                {field: 'color', title: 'צבע הקסם', options: this.buildOptions('color')},
                {field: 'hat', title: 'כובע', options: this.buildOptions('hat')},
                {field: 'companion', title: 'חבר למסע', options: this.buildOptions('companion')},
            ],
        };
    },
    created: function () {
        applyAdventureSkin();
    },
    methods: {
        startAdventure: function () {
            setLocalStorage('adv_onboarded', true);
            if (typeof gtag === 'function') {
                gtag('event', 'adventure_onboarded');
            }
            this.$router.push('/adventure');
        },
        buildOptions: function (field) {
            const base = ADVENTURE_AVATAR_OPTIONS[field].map(option => ({
                value: option.value,
                lockLabel: option.level,   // 🔒 hint = required level
                unlocked: isAvatarOptionUnlocked(option),
            }));
            if (field !== 'companion') {
                return base;
            }
            // Each adventure contributes its own themed companions, unlocked once
            // the child has played (or is currently in) that adventure. The 🔒
            // hint becomes the adventure's emoji instead of a level number.
            const seen = {};
            base.forEach(option => { seen[option.value] = true; });
            const history = getAdventureHistory();
            const currentId = getAdventureThemeId();
            ADVENTURE_THEME_ORDER.forEach(id => {
                const kit = ADVENTURE_THEME_KITS[id];
                const unlocked = id === currentId || !!history[id];
                (kit.companions || []).forEach(value => {
                    if (seen[value]) {
                        return;
                    }
                    seen[value] = true;
                    base.push({value: value, lockLabel: kit.emoji, unlocked: unlocked});
                });
            });
            return base;
        },
        pick: function (field, option) {
            if (!option.unlocked) {
                return;
            }
            this.avatar[field] = option.value;
            saveAdventureAvatar(this.avatar);
            this.refreshKey += 1; // re-render the preview avatar
        },
    },
});

// --- Art-map skin: hand-tuned marker positions over the background art ---
// These coordinates are art-specific and NOT part of the data model. They are
// deliberately kept as trivially-swappable arrays so the final placement can be
// pasted straight from the prototype.
// positions finalized in tools/adventure_map_art.html
//
// Home overview: world index (0-based, matching WORLDS order) -> {x, y} in %
// over home_bg.jpg (the floating-islands illustration).
var HOME_MARKER_POS = [
    {x: 48, y: 84},  // 1  hebrew1 (journey starts low, climbs the stepping stones)
    {x: 39, y: 79},  // 2  hebrew2
    {x: 31, y: 72},  // 3  hebrew3
    {x: 22, y: 64},  // 4  hebrew4
    {x: 13, y: 54},  // 5  hebrew5  (mid-left gazebo island)
    {x: 10, y: 43},  // 6  hebrew6  (upper stepping stone)
    {x: 17, y: 33},  // 7  hebrewreview
    {x: 21, y: 17},  // 8  aleph    (top-left castle island)
    {x: 82, y: 20},  // 9  colors   (top-right gazebo island)
    {x: 83, y: 62},  // 10 animals  (bottom-right castle island)
    {x: 68, y: 42},  // 11 numbers  (mid-right cloud)
];
// Level path: encounter/step index (0-based) -> {x, y} in % over the world bg,
// climbing bottom -> top so the final (crown) step sits near the top.
var PATH_MARKER_POS = [
    {x: 50, y: 88},
    {x: 39, y: 76},
    {x: 60, y: 64},
    {x: 44, y: 52},
    {x: 57, y: 40},
    {x: 50, y: 26},
];

// Resolve a marker position. Falls back to a default winding path (bottom ->
// top, gentle zig-zag) when there are more markers than seeded coordinates.
function advMarkerPos(posList, index, total) {
    if (posList[index]) {
        return posList[index];
    }
    var denom = Math.max(total - 1, 1);
    var t = index / denom;
    var y = 90 - t * 78;                        // climb from ~90% up to ~12%
    var x = 50 + Math.sin(index * 1.1) * 30;    // gentle zig-zag around centre
    return {x: Math.round(x), y: Math.round(y)};
}

// Build the dashed SVG route connecting markers in order. The route <svg> uses
// viewBox 0 0 100 150 (preserveAspectRatio="none"), so y is scaled by 1.5.
function advRoutePath(markers) {
    if (!markers.length) {
        return '';
    }
    var d = 'M ' + markers[0].x + ' ' + (markers[0].y * 1.5);
    for (var i = 1; i < markers.length; i++) {
        d += ' L ' + markers[i].x + ' ' + (markers[i].y * 1.5);
    }
    return d;
}

// Aggregate a world's per-encounter star map into a 0..3 medal rating.
function advWorldStarRating(worldId) {
    var map = getWorldStars(worldId) || {};
    var vals = Object.keys(map).map(function (k) { return map[k]; }).filter(function (v) { return v > 0; });
    if (!vals.length) {
        return 0;
    }
    var avg = vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    return Math.max(0, Math.min(3, Math.round(avg)));
}

// The parallel entry screen: player card + guided continue + world selection
var AdventureHomeComponent = Vue.component('adventure-home', {
    template: `
    <div class="adv-screen adv-mapscreen adv-art-home" dir="rtl" v-if="ready">
      <div class="adv-mapstage">
        <svg class="adv-route" viewBox="0 0 100 150" preserveAspectRatio="none">
          <path :d="routeD" fill="none" stroke="rgba(255,255,255,.72)"
                stroke-width="1.1" stroke-linecap="round" stroke-dasharray="0.3 3"></path>
        </svg>

        <!-- Markers: every world placed over the floating-islands art -->
        <div v-for="mk in markers" :key="mk.id"
             class="adv-mapmk"
             :class="'adv-' + mk.state"
             :style="{left: mk.x + '%', top: mk.y + '%'}"
             @click="enterWorld(mk)">
          <div class="adv-medal">
            <div v-if="mk.state === 'current'" class="adv-ring"></div>
            <div v-if="mk.state === 'done'" class="adv-crown">👑</div>
            <div v-if="mk.state === 'current'" class="adv-hero">{{ heroEmoji }}</div>
            <div class="adv-gloss"></div>
            <span class="adv-medalicon">{{ mk.state === 'locked' ? '🔒' : mk.emoji }}</span>
            <div class="adv-num">{{ mk.index + 1 }}</div>
          </div>
          <div class="adv-label">{{ mk.name }}</div>
          <div v-if="mk.state === 'current'" class="adv-prog">📍 כאן אנחנו · {{ mk.progress }}</div>
          <div v-else-if="mk.state === 'done'" class="adv-stars">
            <span v-for="n in 3" :key="n">{{ n <= mk.stars ? '⭐' : '☆' }}</span>
          </div>
        </div>
      </div>

      <!-- HUD + navigation chrome floating over the map -->
      <div class="adv-hud adv-coins">🪙 {{ coins }}</div>
      <div class="adv-hud adv-starshud">⭐ {{ starsEarned }}/{{ starsPossible }}</div>
      <router-link to="/adventure/avatar" class="adv-iconbtn adv-wardrobe" title="ארון החפצים">👗</router-link>
      <router-link to="/adventure" class="adv-iconbtn adv-pick" title="בחירת הרפתקה">🗺️</router-link>
      <router-link to="/" class="adv-iconbtn adv-home" title="חזרה לתפריט הרגיל">🏠</router-link>
      <div class="adv-titlecard">
        <h1>ממלכת הקסם</h1>
        <p>{{ subtitle }}</p>
      </div>
    </div>`,
    data: function () {
        return {ready: false, nextStep: null, worlds: [], coins: 0, starsEarned: 0, starsPossible: 0, heroEmoji: '🧚'};
    },
    created: function () {
        // First run: send the child to build a character before anything else
        if (!getLocalStorage('adv_onboarded', false)) {
            this.$router.replace('/adventure/avatar?first=1');
            return;
        }
        applyAdventureSkin();
        this.ready = true;
        this.nextStep = getNextGuidedStep();
        var currentWorldId = this.nextStep ? this.nextStep.worldId : null;
        var player = getAdventurePlayer();
        this.coins = player.coins || 0;
        this.heroEmoji = getAdventureAvatar().base || '🧚';
        // Total stars earned vs. achievable, for the HUD (presentation only)
        var earned = 0, possible = 0;
        WORLDS.forEach(function (world) {
            possible += (world.encounters ? world.encounters.length : 0) * 3;
            var map = getWorldStars(world.id) || {};
            Object.keys(map).forEach(function (k) { earned += map[k]; });
        });
        this.starsEarned = earned;
        this.starsPossible = possible;
        // Build the marker view-model. State logic is unchanged (same helpers);
        // only the visual mapping (done/current/available/locked) is new.
        this.worlds = WORLDS.map(function (world) {
            var completed = isWorldCompleted(world.id);
            var unlocked = isWorldUnlocked(world);
            var state;
            if (completed) {
                state = 'done';
            } else if (!unlocked) {
                state = 'locked';
            } else if (world.id === currentWorldId) {
                state = 'current';
            } else {
                state = 'available';
            }
            var total = world.encounters ? world.encounters.length : 0;
            return {
                id: world.id,
                name: world.name,
                emoji: world.emoji || '🌍',
                locked: !unlocked,
                completed: completed,
                state: state,
                stars: advWorldStarRating(world.id),
                progress: getEncounterPointer(world.id) + '/' + total,
            };
        });
    },
    computed: {
        subtitle: function () {
            return this.nextStep ? 'שוטו בין האיים והמשיכו במסע ✨' : 'סיימתם את כל ההרפתקה! 🏆';
        },
        markers: function () {
            var total = this.worlds.length;
            return this.worlds.map(function (world, i) {
                var pos = advMarkerPos(HOME_MARKER_POS, i, total);
                return Object.assign({}, world, {index: i, x: pos.x, y: pos.y});
            });
        },
        routeD: function () {
            return advRoutePath(this.markers);
        },
    },
    methods: {
        enterWorld: function (world) {
            // Routing unchanged: only unlocked worlds are tappable
            if (world.state !== 'locked') {
                this.$router.push('/adventure/world/' + world.id);
            }
        },
    },
});

// A world screen: learning summary + the encounter path
var AdventureWorldComponent = Vue.component('adventure-world', {
    template: `
    <div class="adv-screen adv-mapscreen" :class="artClass || 'adv-art-world_letters_bg'" dir="rtl" v-if="world">
      <div class="adv-mapstage">
        <svg class="adv-route" viewBox="0 0 100 150" preserveAspectRatio="none">
          <path :d="routeD" fill="none" stroke="rgba(255,255,255,.72)"
                stroke-width="1.1" stroke-linecap="round" stroke-dasharray="0.3 3"></path>
        </svg>

        <!-- Markers: every encounter placed over the world background art -->
        <div v-for="mk in markers" :key="mk.index"
             class="adv-mapmk"
             :class="'adv-' + mk.state"
             :style="{left: mk.x + '%', top: mk.y + '%'}"
             @click="enter(mk)">
          <div class="adv-medal">
            <div v-if="mk.state === 'current'" class="adv-ring"></div>
            <div v-if="mk.state === 'current'" class="adv-hero">{{ heroEmoji }}</div>
            <div class="adv-gloss"></div>
            <span class="adv-medalicon">{{ mk.state === 'locked' ? '🔒' : mk.icon }}</span>
            <div class="adv-num">{{ mk.index + 1 }}</div>
          </div>
          <div class="adv-label">{{ mk.name }}</div>
          <div v-if="mk.state === 'current'" class="adv-prog">▶ שחק עכשיו</div>
          <div v-else-if="mk.state === 'done' && mk.stars > 0" class="adv-stars">
            <span v-for="n in 3" :key="n">{{ n <= mk.stars ? '⭐' : '☆' }}</span>
          </div>
        </div>
      </div>

      <!-- Reward banner over the map (unchanged reward logic) -->
      <div v-if="celebrate" class="adv-mapbanner">
        <div class="adv-banner">
          כל הכבוד! 🎉
          <span v-for="n in 3" :key="n" class="adv-bounce"
                :style="{animationDelay: (n * 0.15) + 's', opacity: n <= rewardStars ? 1 : 0.3}">⭐</span>
          <div v-if="rewardCoins > 0" style="font-size: 0.7em; margin-top: 4px;">+{{ rewardCoins }} 🪙</div>
        </div>
      </div>

      <!-- HUD + navigation chrome floating over the map -->
      <div class="adv-titlecard">
        <h1>{{ world.name }}</h1>
        <p>נפתחו {{ state.unlocked }} מתוך {{ state.total }} · נלמדו {{ state.mastered }}<span v-if="completed"> · הושלם 🏆</span></p>
      </div>
      <div class="adv-mapside">
        <adventure-player-card></adventure-player-card>
      </div>
      <div class="adv-mapfoot">
        <adventure-companion :message="companionMessage"></adventure-companion>
      </div>
      <router-link to="/adventure/map" class="adv-mapback">🗺️ למפת העולמות</router-link>
    </div>`,
    data: function () {
        return {
            world: null,
            state: null,
            steps: [],
            completed: false,
            celebrate: false,
            rewardStars: 0,
            rewardCoins: 0,
            artClass: '',
            heroEmoji: getAdventureAvatar().base || '🧚',
        };
    },
    created: function () {
        const world = getWorldById(this.$route.params.worldId);
        if (!world || !isWorldUnlocked(world)) {
            this.$router.push('/adventure/map');
            return;
        }
        applyAdventureSkin();
        this.world = world;
        this.artClass = world.art && world.art.bg ? 'adv-art-' + world.art.bg : '';
        ensureWorldWeights(world);
        this.state = getWorldLearningState(world.id);
        this.completed = isWorldCompleted(world.id);
        this.celebrate = this.$route.query.celebrate === '1';
        this.rewardStars = Number(this.$route.query.stars) || 0;
        this.rewardCoins = Number(this.$route.query.coins) || 0;
        if (this.celebrate) {
            setTimeout(() => { this.celebrate = false; }, 3500);
        }
        const pointer = getEncounterPointer(world.id);
        const starsMap = getWorldStars(world.id);
        this.steps = world.encounters.map((encounter, index) => {
            const display = getEncounterDisplay(world, encounter, index);
            return {
                index: index,
                icon: display.icon,
                name: display.name,
                done: index < pointer,
                current: index === pointer,
                locked: index > pointer,
                stars: starsMap[index] || 0,
            };
        });
    },
    computed: {
        companionMessage: function () {
            if (this.completed) {
                return 'סיימנו את כל העולם! אפשר לשחק שוב או לצאת להרפתקה חדשה';
            }
            if (this.celebrate) {
                return 'איזה יופי! מתקדמים בשביל ⭐';
            }
            return 'בוא נמשיך מהכוכב הזוהר!';
        },
        // Decorate the existing steps with a marker position + visual state.
        // The underlying step data (done/current/locked/stars) is untouched.
        markers: function () {
            var total = this.steps.length;
            return this.steps.map(function (step, i) {
                var pos = advMarkerPos(PATH_MARKER_POS, i, total);
                var state = step.current ? 'current' : (step.locked ? 'locked' : 'done');
                return Object.assign({}, step, {state: state, x: pos.x, y: pos.y});
            });
        },
        routeD: function () {
            return advRoutePath(this.markers);
        },
    },
    methods: {
        enter: function (step) {
            if (step.locked) {
                return;
            }
            const encounter = this.world.encounters[step.index];
            if (encounter.type === 'learn') {
                // The learn encounter is the only place unlock cycles run:
                // opens the next batch (or resets a finished world for replay)
                getWeightsForKey(getAdventureAppId(this.world.id, step.index), this.world.setItems, getWorldItems(this.world));
                // Viewing a learn encounter opens the next step on the path
                advanceEncounterPointer(this.world.id, step.index);
            }
            this.$router.push(getEncounterRoute(this.world, step.index));
        },
    },
});

// The in-game adventure frame: mounted once at the app root (index.html) and
// shown only when the current route belongs to an adventure encounter. Adds a
// world bar (name + back-to-path) and a companion that reacts to answers —
// without touching any game component.
var AdventureFrame = Vue.component('adventure-frame', {
    template: `
    <div v-if="parsed" class="adv-frame" dir="rtl">
      <!-- Themed ambient particles drifting behind the mini-game. Purely
           decorative (pointer-events: none) and driven by the active adventure
           theme, so every game adapts to the chosen kit without any change to
           the game components themselves. -->
      <div class="adv-ambient" aria-hidden="true">
        <span v-for="p in particles" :key="p.id" class="adv-particle" :style="p.style">{{ p.emoji }}</span>
      </div>
      <div class="adv-frame-bar">
        <span class="adv-frame-title">{{ parsed.world.emoji }} {{ parsed.world.name }}</span>
        <a class="adv-frame-exit" @click="exit">🗺️ חזרה לשביל</a>
      </div>
      <div class="adv-frame-companion" :class="{'adv-bounce': reaction === 'happy', 'adv-shake': reaction === 'oops'}">
        <div v-if="bubble" class="adv-bubble">{{ bubble }}</div>
        <companion-sprite :emoji="companion" :size="68"></companion-sprite>
      </div>
    </div>`,
    data: function () {
        return {bubble: '', reaction: ''};
    },
    computed: {
        parsed: function () {
            return parseAdventureId(this.$route.params.currentAppId || '');
        },
        companion: function () {
            this.$route.path; // re-read the avatar when navigating
            return getAdventureAvatar().companion;
        },
        // A gentle field of falling, theme-specific particles. Regenerated on
        // navigation (reads $route.path); positions/speeds are randomized once
        // per screen so it never reshuffles mid-game.
        particles: function () {
            this.$route.path;
            const set = getAdventureThemeKit().ambient || ['✨'];
            const list = [];
            for (let i = 0; i < 12; i++) {
                list.push({
                    id: i,
                    emoji: set[i % set.length],
                    style: {
                        left: Math.round(Math.random() * 96) + '%',
                        fontSize: (12 + Math.round(Math.random() * 16)) + 'px',
                        animationDuration: (7 + Math.random() * 9).toFixed(1) + 's',
                        animationDelay: (-Math.random() * 12).toFixed(1) + 's',
                        opacity: (0.15 + Math.random() * 0.25).toFixed(2),
                    },
                });
            }
            return list;
        },
    },
    created: function () {
        applyAdventureSkin();
        this._onAnswer = event => this.react(event.detail.correct);
        window.addEventListener('adventure-answer', this._onAnswer);
    },
    beforeDestroy: function () {
        window.removeEventListener('adventure-answer', this._onAnswer);
    },
    methods: {
        react: function (correct) {
            const happy = ['יש! 🎉', 'מעולה!', 'איזה אלוף! ⭐', 'עוד אחת!'];
            const oops = ['ננסה שוב 💪', 'כמעט!', 'אני איתך!'];
            const pool = correct ? happy : oops;
            this.reaction = correct ? 'happy' : 'oops';
            this.bubble = pool[Math.floor(Math.random() * pool.length)];
            clearTimeout(this._reactTimer);
            this._reactTimer = setTimeout(() => {
                this.bubble = '';
                this.reaction = '';
            }, 1800);
        },
        exit: function () {
            this.$router.push('/adventure/world/' + this.parsed.world.id);
        },
    },
});

// A themed preview gradient for an adventure card, derived from the kit's
// color theme in themes.js so each card carries its own vibe.
function getAdventureKitPreview(kit) {
    const colors = (typeof themeOptions !== 'undefined' && themeOptions[kit.theme])
        ? themeOptions[kit.theme].colors : null;
    if (!colors) {
        return 'linear-gradient(135deg, #ffd6e7, #c5b3ff)';
    }
    return `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`;
}

// Kid-readable relative time in Hebrew for the "previous adventures" list.
function adventureRelativeTime(timestamp) {
    if (!timestamp) {
        return '';
    }
    const days = Math.floor((Date.now() - timestamp) / 86400000);
    if (days <= 0) {
        return 'היום';
    }
    if (days === 1) {
        return 'אתמול';
    }
    if (days < 7) {
        return `לפני ${days} ימים`;
    }
    if (days < 30) {
        const weeks = Math.floor(days / 7);
        return weeks === 1 ? 'לפני שבוע' : `לפני ${weeks} שבועות`;
    }
    const months = Math.floor(days / 30);
    return months === 1 ? 'לפני חודש' : `לפני ${months} חודשים`;
}

// The adventure picker: the top-level "which adventure" menu. Lets the child
// choose a themed adventure (skin over the shared learning worlds) and shows a
// summary of the adventures they've already played.
var AdventurePickerComponent = Vue.component('adventure-picker', {
    template: `
    <div class="adv-screen adv-pickscreen" dir="rtl" v-if="ready">
      <adventure-clouds></adventure-clouds>
      <div class="adv-content">
        <div class="adv-title">🗺️ בוחרים הרפתקה</div>
        <adventure-player-card></adventure-player-card>

        <div class="adv-pickgrid">
          <div v-for="kit in kits" :key="kit.id"
               class="adv-pickcard" :class="{'adv-pickcard-current': kit.id === currentId}"
               :style="{background: kit.preview}"
               @click="choose(kit)">
            <div class="adv-pickcard-emoji adv-float">{{ kit.emoji }}</div>
            <div class="adv-pickcard-body">
              <div class="adv-pickcard-name">{{ kit.name }}</div>
              <div class="adv-pickcard-sub">{{ kit.subtitle }}</div>
              <div class="adv-pickcard-meta">
                <span v-if="kit.id === currentId" class="adv-chip adv-chip-current">✔ ההרפתקה שלי</span>
                <span v-else-if="kit.lastPlayedText" class="adv-chip">🕘 {{ kit.lastPlayedText }}</span>
                <span v-else class="adv-chip adv-chip-new">✨ חדש</span>
              </div>
            </div>
            <div class="adv-pickcard-companions">
              <span v-for="c in kit.companions" :key="c">{{ c }}</span>
            </div>
          </div>
        </div>

        <div class="adv-section-label">📜 ההרפתקאות שלי עד עכשיו</div>
        <div class="adv-histstats">
          <div class="adv-histstat"><b>{{ overall.level }}</b><span>רמה</span></div>
          <div class="adv-histstat"><b>🪙 {{ overall.coins }}</b><span>מטבעות</span></div>
          <div class="adv-histstat"><b>⭐ {{ overall.starsEarned }}</b><span>כוכבים</span></div>
          <div class="adv-histstat"><b>{{ overall.worldsDone }}/{{ overall.worldsTotal }}</b><span>עולמות</span></div>
        </div>
        <div v-if="played.length" class="adv-histlist">
          <div v-for="h in played" :key="h.id" class="adv-histrow" @click="choose(h)">
            <span class="adv-histemoji">{{ h.emoji }}</span>
            <span class="adv-histname">{{ h.name }}</span>
            <span class="adv-histwhen">{{ h.lastPlayedText }} · שוחק {{ h.plays }} פעמים</span>
          </div>
        </div>
        <div v-else class="adv-histempty">עוד לא יצאתם להרפתקה — בחרו אחת למעלה ותתחילו! 🚀</div>

        <router-link to="/" class="adv-back">🏠 חזרה לתפריט הרגיל</router-link>
      </div>
    </div>`,
    data: function () {
        return {ready: false, kits: [], played: [], overall: {}, currentId: ADVENTURE_DEFAULT_THEME};
    },
    created: function () {
        // First run: build a character before choosing an adventure
        if (!getLocalStorage('adv_onboarded', false)) {
            this.$router.replace('/adventure/avatar?first=1');
            return;
        }
        applyAdventureSkin();
        this.ready = true;
        this.currentId = getAdventureThemeId();
        this.overall = getAdventureOverallProgress();
        const history = getAdventureHistory();
        this.kits = ADVENTURE_THEME_ORDER.map(id => {
            const kit = ADVENTURE_THEME_KITS[id];
            const record = history[id];
            return Object.assign({}, kit, {
                preview: getAdventureKitPreview(kit),
                plays: record ? record.plays : 0,
                lastPlayedText: record ? adventureRelativeTime(record.lastPlayed) : '',
            });
        });
        this.played = Object.keys(history)
            .filter(id => ADVENTURE_THEME_KITS[id])
            .map(id => Object.assign({}, ADVENTURE_THEME_KITS[id], {
                plays: history[id].plays,
                lastPlayed: history[id].lastPlayed,
                lastPlayedText: adventureRelativeTime(history[id].lastPlayed),
            }))
            .sort((a, b) => (b.lastPlayed || 0) - (a.lastPlayed || 0));
    },
    methods: {
        choose: function (kit) {
            setAdventureThemeId(kit.id);
            // Keep the global app chrome (body background) in sync with the new
            // color theme, not just the adventure screens.
            if (this.$root && typeof this.$root.updateTheme === 'function') {
                this.$root.updateTheme();
            }
            this.$router.push('/adventure/map');
        },
    },
});

// Hook for the routes list in tester.js
function getAdventureRoutes() {
    return [
        {path: '/adventure', component: AdventurePickerComponent},
        {path: '/adventure/map', component: AdventureHomeComponent},
        {path: '/adventure/avatar', component: AdventureAvatarComponent},
        {path: '/adventure/world/:worldId', component: AdventureWorldComponent},
    ];
}
