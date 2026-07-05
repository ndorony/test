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

function getAdventurePlayer() {
    return getLocalStorage('adv_player', {xp: 0});
}

function addAdventureXp(amount) {
    const player = getAdventurePlayer();
    player.xp = (player.xp || 0) + amount;
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

// Hook for BaseGame.reloadProgress in tester.js: when a learning cycle is
// completed inside an adventure encounter, advance the path and return to the
// world screen. Returns null for non-adventure ids (→ legacy behavior).
function getAdventureLevelCompleteRoute(currentAppId) {
    const parsed = parseAdventureId(currentAppId);
    if (!parsed) {
        return null;
    }
    advanceEncounterPointer(parsed.world.id, parsed.encounterIndex);
    // celebrate=1 makes the world screen show a celebration banner on return
    return `/adventure/world/${parsed.world.id}?celebrate=1`;
}

// Hook for updateWeightForKey in tester.js: called on every answer, in every
// game. Awards XP for correct answers in adventure encounters and records
// world completion the moment it is observed.
function onAdventureAnswer(key, isCorrect) {
    const parsed = parseAdventureId(key);
    if (!parsed) {
        return;
    }
    if (isCorrect) {
        addAdventureXp(ADVENTURE_XP_PER_CORRECT);
    }
    const state = getWorldLearningState(parsed.world.id);
    if (state && state.completed && !isWorldCompleted(parsed.world.id)) {
        setLocalStorage(`adv-${parsed.world.id}_completed`, true);
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
        <span style="font-size: 1.15em; font-weight: bold;">רמה {{ level }}</span>
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
    <div class="adv-screen" dir="rtl">
      <adventure-clouds></adventure-clouds>
      <div class="adv-content">
        <div class="adv-title">👗 ארון החפצים</div>
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
              <span v-if="!option.unlocked" class="adv-option-lock">🔒{{ option.level }}</span>
            </span>
          </div>
        </div>
        <router-link to="/adventure" class="adv-back">→ חזרה למפת העולמות</router-link>
      </div>
    </div>`,
    data: function () {
        return {
            avatar: getAdventureAvatar(),
            refreshKey: 0,
            sections: [
                {field: 'base', title: 'הדמות שלי', options: this.buildOptions('base')},
                {field: 'color', title: 'צבע הקסם', options: this.buildOptions('color')},
                {field: 'hat', title: 'כובע', options: this.buildOptions('hat')},
                {field: 'companion', title: 'חבר למסע', options: this.buildOptions('companion')},
            ],
        };
    },
    methods: {
        buildOptions: function (field) {
            return ADVENTURE_AVATAR_OPTIONS[field].map(option => ({
                value: option.value,
                level: option.level,
                unlocked: isAvatarOptionUnlocked(option),
            }));
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

// The parallel entry screen: player card + world selection
var AdventureHomeComponent = Vue.component('adventure-home', {
    template: `
    <div class="adv-screen" dir="rtl">
      <adventure-clouds></adventure-clouds>
      <div class="adv-content">
        <div class="adv-title">🗺️ הרפתקה</div>
        <adventure-player-card></adventure-player-card>
        <adventure-companion message="לאן נצא להרפתקה היום?"></adventure-companion>
        <router-link to="/adventure/avatar" style="color: inherit;">
          <div class="adv-card adv-pop">
            <span class="adv-sprite">👗</span>
            <div class="adv-card-title">ארון החפצים — לעצב את הדמות שלי</div>
          </div>
        </router-link>
        <div v-for="(world, i) in worlds" :key="world.id"
             class="adv-card adv-pop"
             :class="{'adv-locked': world.locked}"
             :style="{animationDelay: (i * 0.08) + 's'}"
             @click="enterWorld(world)">
          <span class="adv-sprite" :class="{'adv-float': !world.locked}">{{ world.emoji }}</span>
          <div style="flex: 1;">
            <div class="adv-card-title">
              {{ world.name }}
              <span v-if="world.completed">🏆</span>
              <span v-if="world.locked">🔒</span>
            </div>
            <div class="adv-card-sub" v-if="world.locked">{{ world.lockText }}</div>
            <div class="adv-card-sub" v-else-if="world.state.started">
              נפתחו {{ world.state.unlocked }} מתוך {{ world.state.total }} · נלמדו {{ world.state.mastered }}
            </div>
            <div class="adv-card-sub" v-else>הרפתקה חדשה!</div>
          </div>
        </div>
        <router-link to="/" class="adv-back">→ חזרה לתפריט הרגיל</router-link>
      </div>
    </div>`,
    data: function () {
        return {
            worlds: WORLDS.map(world => ({
                id: world.id,
                name: world.name,
                emoji: world.emoji || '🌍',
                locked: !isWorldUnlocked(world),
                completed: isWorldCompleted(world.id),
                lockText: getWorldUnlockText(world),
                state: getWorldLearningState(world.id),
            })),
        };
    },
    methods: {
        enterWorld: function (world) {
            if (!world.locked) {
                this.$router.push('/adventure/world/' + world.id);
            }
        },
    },
});

// A world screen: learning summary + the encounter path
var AdventureWorldComponent = Vue.component('adventure-world', {
    template: `
    <div class="adv-screen" dir="rtl" v-if="world">
      <adventure-clouds></adventure-clouds>
      <div class="adv-content">
        <div v-if="celebrate" class="adv-banner">
          כל הכבוד! 🎉
          <span class="adv-bounce" style="animation-delay: 0s;">⭐</span>
          <span class="adv-bounce" style="animation-delay: 0.15s;">⭐</span>
          <span class="adv-bounce" style="animation-delay: 0.3s;">⭐</span>
        </div>
        <div class="adv-title"><span class="adv-float" style="display: inline-block;">{{ world.emoji }}</span> {{ world.name }}</div>
        <adventure-player-card></adventure-player-card>
        <adventure-companion :message="companionMessage"></adventure-companion>
        <div class="adv-card-sub" style="text-align: center; margin-bottom: 12px;">
          נפתחו {{ state.unlocked }} מתוך {{ state.total }} · נלמדו {{ state.mastered }}
          <span v-if="completed">· העולם הושלם 🏆</span>
        </div>
        <div v-for="step in steps" :key="step.index"
             class="adv-card adv-pop"
             :class="{'adv-locked': step.locked, 'adv-current': step.current, 'adv-pulse': step.current}"
             :style="{animationDelay: (step.index * 0.08) + 's'}"
             @click="enter(step)">
          <span class="adv-sprite" :class="{'adv-float': step.current}">{{ step.icon }}</span>
          <div style="flex: 1;">
            <div class="adv-card-title">
              {{ step.index + 1 }}. {{ step.name }}
              <span v-if="step.done">✅</span>
              <span v-if="step.locked">🔒</span>
            </div>
            <div class="adv-card-sub" v-if="step.current">⭐ כאן אנחנו</div>
          </div>
        </div>
        <router-link to="/adventure" class="adv-back">→ חזרה למפת העולמות</router-link>
      </div>
    </div>`,
    data: function () {
        return {
            world: null,
            state: null,
            steps: [],
            completed: false,
            celebrate: false,
        };
    },
    created: function () {
        const world = getWorldById(this.$route.params.worldId);
        if (!world || !isWorldUnlocked(world)) {
            this.$router.push('/adventure');
            return;
        }
        this.world = world;
        ensureWorldWeights(world);
        this.state = getWorldLearningState(world.id);
        this.completed = isWorldCompleted(world.id);
        this.celebrate = this.$route.query.celebrate === '1';
        if (this.celebrate) {
            setTimeout(() => { this.celebrate = false; }, 3500);
        }
        const pointer = getEncounterPointer(world.id);
        this.steps = world.encounters.map((encounter, index) => {
            const display = getEncounterDisplay(world, encounter, index);
            return {
                index: index,
                icon: display.icon,
                name: display.name,
                done: index < pointer,
                current: index === pointer,
                locked: index > pointer,
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
    },
    created: function () {
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

// Hook for the routes list in tester.js
function getAdventureRoutes() {
    return [
        {path: '/adventure', component: AdventureHomeComponent},
        {path: '/adventure/avatar', component: AdventureAvatarComponent},
        {path: '/adventure/world/:worldId', component: AdventureWorldComponent},
    ];
}
