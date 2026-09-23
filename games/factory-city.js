// Factory City — an original isometric production-and-expansion game.
//
// Architecture:
//  - Pure helpers (validation, derived building levels, income, iso math) stay
//    framework-free so tests/factory_city_test.js can exercise them in a bare VM.
//  - The scene is drawn on a plain 2D <canvas> (no Phaser): a chunky isometric
//    land with building plots. Each plot shows a Kenney-rendered PNG that swaps
//    to a bigger model as the building is upgraded; unbuilt plots show a build marker.
//  - The Vue component owns the semantic HUD, project sheet and learning dialog.
//    The canvas is presentation only: a living delivery loop, paved service grid,
//    smoke and citizens make production legible without inventing a second
//    progression system. Upgrades still funnel through the shared learning engine.
(function (global) {
    'use strict';

    var FC_ASSET = 'assets/factory-city/';
    var FC_KINDS = ['build', 'upgrade', 'hire'];

    // Building plots. cell = [col,row] on an unbounded iso plane; tiers = sprite per
    // level (index 0 = level 1), role = the real production bottleneck it improves,
    // and start = the level present before any project (the HQ starts at level 1).
    // Projects radiate away from the HQ so each unlocked batch visibly extends the
    // serviced area instead of filling a pre-framed island.
    var FC_BUILDINGS = {
        hq:        {name: 'מרכז הבקרה',   desc: 'לב המתחם. משפר את הערך של כל משלוח.',                cell: [3, 1], tiers: ['warehouse-2', 'warehouse-1', 'factory-1'], role: 'value', start: 1},
        factory:   {name: 'המפעל',         desc: 'מייצר ארגזי סחורה בכל מחזור עבודה.',                 cell: [5, 3], tiers: ['hq-1', 'hq-2', 'hq-3'], role: 'production'},
        warehouse: {name: 'המחסן',         desc: 'מגדיל את כמות הסחורה שאפשר לשמור בין משלוחים.',      cell: [3, 3], tiers: ['warehouse-1', 'warehouse-2', 'warehouse-3'], role: 'storage'},
        shop:      {name: 'המרכז המסחרי',  desc: 'מוכר יותר ארגזים בכל משלוח.',                         cell: [1, 3], tiers: ['shop-2', 'shop-3', 'shop-3'], role: 'sales'},
        house:     {name: 'שכונת המגורים', desc: 'מביאה לקוחות חדשים ומגדילה את הביקוש.',              cell: [1, 1], tiers: ['house-3', 'house-2', 'house-1'], role: 'sales'},
        power:     {name: 'תחנת הכוח',     desc: 'מקצרת את הזמן בין מחזורי הייצור.',                    cell: [7, 3], tiers: ['power-1', 'power-2', 'power-3'], role: 'speed'},
        office:    {name: 'מגדל המשרדים',  desc: 'משיג חוזים טובים יותר ומעלה את מחיר הסחורה.',         cell: [-1, 3], tiers: ['office-1', 'office-2', 'office-3'], role: 'value'},
        park:      {name: 'פארק השעשועים', desc: 'מושך קהל נוסף אל אזור המסחר.',                        cell: [6, 7], tiers: ['park-1', 'park-2', 'park-3'], role: 'sales'}
    };
    // Draw order = plot draw priority; the array is depth-sorted at draw time anyway.
    var FC_BUILDING_ORDER = ['hq', 'office', 'factory', 'power', 'warehouse', 'park', 'house', 'shop'];
    var FC_BASE_WORKERS = 1;

    // Sparse edge scenery keeps the production yard readable. Industrial props are
    // placed by drawDrawables only when the building tier that owns them exists.
    var FC_DECOR = [
        {sprite: 'tree-large', c: -0.6, r: -0.2, s: 0.48},
        {sprite: 'tree-small', c: 7.1, r: -0.4, s: 0.40},
        {sprite: 'tree-round', c: -0.5, r: 7.0, s: 0.46},
        {sprite: 'tree-small', c: 7.2, r: 7.1, s: 0.40}
    ];

    // Iso grid geometry (world px, before zoom). TH is a bit taller than a strict 2:1
    // diamond so rows are further apart on screen -> buildings occlude each other less.
    var FC_TW = 132, FC_TH = 82;
    var FC_GRID_MIN = -1.5, FC_GRID_MAX = 7.5;   // initial camera framing; terrain itself is unbounded
    var FC_GRID_CELLS = 6;                        // 0..6 inclusive
    var FC_BUILD_SCALE = 0.88;                    // compact stations leave the animated factory floor visible
    var FC_DELIVERY_SECONDS = 4;
    var FC_ROAD_CELLS = (function () {
        var cells = [];
        for (var c = 0; c <= FC_GRID_CELLS; c++) {
            for (var r = 0; r <= FC_GRID_CELLS; r++) {
                if (c % 2 === 0 || r % 2 === 0) cells.push([c, r]);
            }
        }
        return cells;
    })();
    var FC_QUIZ_DEFAULTS = {listName: 'ENGLISH_CHAPTER4_ALL', questionIndex: 'english_name', resultIndex: 'hebrew', setItems: 10};
    var FC_QUIZ_DELAYS = {correct: 700, wrong: 1050};

    var FC_THEME_MOTIFS = {
        base: {district: 'עיר המפעל', status: 'מחוז ייצור נקי', night: false},
        soldiers: {district: 'מחוז האספקה', status: 'בסיס לוגיסטי פעיל', night: false},
        unicorn: {district: 'עיר הפלאים', status: 'סדנת יצירה צבעונית', night: false},
        space: {district: 'מושבת הייצור', status: 'משלוחים בין־כוכביים', night: true},
        dark: {district: 'משמרת הלילה', status: 'התעשייה לא עוצרת', night: true},
        code: {district: 'עיר המערכות', status: 'רשת ייצור מקוונת', night: true}
    };

    // ------------------------------------------------------------------ pure helpers
    function validateFactoryCityUpgrades(list) {
        var errors = [];
        if (!Array.isArray(list) || !list.length) return ['factory-city upgrade list must be a non-empty array'];
        list.forEach(function (item, index) {
            if (!item || !item.name || typeof item.name.value !== 'string' || !item.name.value.trim()) errors.push('item ' + index + ' needs a name.value');
            if (FC_KINDS.indexOf(item && item.kind) === -1) errors.push('item ' + index + ' has unknown kind "' + (item && item.kind) + '"');
            if (item && item.kind === 'hire') {
                if (typeof item.worker !== 'string' || !item.worker) errors.push('item ' + index + ' needs a worker role');
            } else if (!FC_BUILDINGS[item && item.building]) {
                errors.push('item ' + index + ' has unknown building "' + (item && item.building) + '"');
            }
            if (!(Number(item && item.level) > 0)) errors.push('item ' + index + ' needs a positive level');
            if (!(Number(item && item.cost) > 0)) errors.push('item ' + index + ' needs a positive cost');
        });
        return errors;
    }

    function startingLevels() {
        var levels = {};
        FC_BUILDING_ORDER.forEach(function (id) { levels[id] = FC_BUILDINGS[id].start || 0; });
        return levels;
    }

    function deriveCityState(list, purchasedIndices) {
        var levels = startingLevels();
        var workers = FC_BASE_WORKERS;
        (purchasedIndices || []).forEach(function (index) {
            var item = list[index];
            if (!item) return;
            if (item.kind === 'hire') {
                workers = Math.max(workers, Number(item.level) || workers + 1);
                return;
            }
            if (!FC_BUILDINGS[item.building]) return;
            levels[item.building] = Math.max(levels[item.building] || 0, Number(item.level) || 1);
        });
        var built = 0;
        FC_BUILDING_ORDER.forEach(function (id) { if (levels[id] > 0) built++; });
        return {levels: levels, built: built, workers: workers};
    }

    function computeCityEconomy(levels, workers) {
        levels = levels || {};
        workers = Math.max(FC_BASE_WORKERS, Number(workers) || FC_BASE_WORKERS);
        var factory = levels.factory || 0;
        var production = factory > 0 ? factory * 2.2 + workers * 0.8 : 0;
        var storage = 6 + (levels.warehouse || 0) * 10;
        var sales = 1 + (levels.shop || 0) * 3.5 + (levels.house || 0) * 1.2 + (levels.park || 0) * 2;
        var unitValue = 4 * (1 + (levels.office || 0) * 0.22 + (levels.hq || 0) * 0.1);
        var cycleSeconds = Math.max(2.2, FC_DELIVERY_SECONDS - (levels.power || 0) * 0.38 - Math.max(0, workers - 1) * 0.06);
        var soldPerCycle = Math.min(production, sales);
        return {
            production: production,
            storage: storage,
            sales: sales,
            unitValue: unitValue,
            cycleSeconds: cycleSeconds,
            projectedIncome: soldPerCycle * unitValue / cycleSeconds
        };
    }

    // Compatibility helper used by the HUD and older focused tests.
    function computeCityIncome(levels, workers) {
        return computeCityEconomy(levels, workers).projectedIncome;
    }

    function runCityCycle(economy, goods) {
        goods = Math.max(0, Number(goods) || 0);
        var produced = Math.min(economy.production, Math.max(0, economy.storage - goods));
        var available = goods + produced;
        var sold = Math.min(available, economy.sales);
        return {
            produced: produced,
            sold: sold,
            goods: Math.max(0, available - sold),
            payout: sold * economy.unitValue
        };
    }

    function isoToWorld(c, r) { return {x: (c - r) * FC_TW / 2, y: (c + r) * FC_TH / 2}; }

    function fcHexAlpha(hex, alpha) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
        var n = parseInt(hex.slice(1), 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }

    function fcMixColor(a, b, amount) {
        if (!/^#[0-9a-f]{6}$/i.test(a || '') || !/^#[0-9a-f]{6}$/i.test(b || '')) return a || b;
        var av = parseInt(a.slice(1), 16), bv = parseInt(b.slice(1), 16);
        function channel(shift) { return Math.round(((av >> shift) & 255) * (1 - amount) + ((bv >> shift) & 255) * amount); }
        return '#' + [channel(16), channel(8), channel(0)].map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
    }

    function resolveFactoryCityTheme(requested) {
        if (!requested && typeof getLocalStorage === 'function') requested = getLocalStorage('theme', 'base');
        var key = FC_THEME_MOTIFS[requested] && typeof themeOptions !== 'undefined' && themeOptions[requested] ? requested : 'base';
        var fallback = {primary: '#006064', secondary: '#78909c', tertiary: '#B0E0E6', accent: '#C0C0C0', background: '#F5F5F5', text: '#000000', disabledText: '#B0BEC5'};
        var palette = typeof themeOptions !== 'undefined' && themeOptions[key] ? themeOptions[key].colors : fallback;
        var motif = FC_THEME_MOTIFS[key];
        var night = motif.night;
        var panel = night ? fcMixColor(palette.background, '#ffffff', 0.08) : fcMixColor(palette.background, '#ffffff', 0.78);
        var panelInk = night ? '#f5f7fb' : fcMixColor(palette.text, '#16202b', 0.18);
        var terrain = night ? fcMixColor(palette.tertiary, '#183d2b', 0.7) : fcMixColor(palette.tertiary, '#70bd58', 0.64);
        var terrainAlt = fcMixColor(terrain, night ? '#ffffff' : '#000000', 0.025);
        return {
            key: key,
            motif: motif,
            night: night,
            css: {
                '--fc-primary': palette.primary,
                '--fc-secondary': palette.secondary,
                '--fc-tertiary': palette.tertiary,
                '--fc-accent': palette.accent,
                '--fc-bg': palette.background,
                '--fc-text': panelInk,
                '--fc-disabled': palette.disabledText,
                '--fc-panel': fcHexAlpha(panel, night ? 0.96 : 0.94),
                '--fc-panel-soft': fcHexAlpha(night ? fcMixColor(palette.background, '#ffffff', 0.16) : fcMixColor(palette.background, palette.primary, 0.08), 0.96),
                '--fc-focus': palette.accent,
                '--fc-action': night ? fcMixColor(palette.accent, '#ffffff', 0.12) : fcMixColor(palette.accent, '#ffd45b', 0.34),
                '--fc-action-ink': night ? '#10151f' : '#332500'
            },
            scene: {
                skyTop: night ? fcMixColor(palette.background, palette.primary, 0.18) : fcMixColor(palette.tertiary, '#ffffff', 0.58),
                skyBottom: night ? fcMixColor(palette.background, '#000000', 0.2) : fcMixColor(palette.tertiary, palette.primary, 0.15),
                grassA: terrain,
                grassB: terrainAlt,
                yard: night ? fcMixColor(palette.secondary, '#343940', 0.72) : fcMixColor('#85898d', palette.secondary, 0.10),
                yardAlt: night ? fcMixColor(palette.secondary, '#41474f', 0.68) : fcMixColor('#909499', palette.secondary, 0.08),
                yardGrid: night ? 'rgba(255,255,255,.10)' : 'rgba(255,255,255,.25)',
                safety: night ? fcMixColor(palette.accent, '#ffd43b', 0.55) : '#ffd33d',
                road: night ? fcMixColor(palette.secondary, '#20252b', 0.76) : '#6f7479',
                roadEdge: night ? fcHexAlpha(palette.accent, 0.48) : 'rgba(255,211,61,.8)',
                dirtLeft: night ? '#302a34' : '#74573c',
                dirtRight: night ? '#413644' : '#8b6946',
                selection: palette.accent,
                smoke: night ? fcHexAlpha(palette.tertiary, 0.48) : 'rgba(240,246,250,.65)'
            }
        };
    }

    function canFactoryCityTransition(from, to) {
        var allowed = {
            ready: ['selected', 'question', 'destroyed'],
            selected: ['ready', 'question', 'destroyed'],
            question: ['selected', 'feedback', 'destroyed'],
            feedback: ['question', 'building', 'selected', 'destroyed'],
            building: ['selected', 'ready', 'destroyed'],
            destroyed: []
        };
        return !!(allowed[from] && allowed[from].indexOf(to) !== -1);
    }

    function resolveCityQuiz(app) {
        app = app || {};
        return {
            listName: app.quizListName || FC_QUIZ_DEFAULTS.listName,
            questionIndex: app.quizQuestionIndex || FC_QUIZ_DEFAULTS.questionIndex,
            resultIndex: app.quizResultIndex || FC_QUIZ_DEFAULTS.resultIndex,
            setItems: typeof app.quizSetItems === 'number' ? app.quizSetItems : FC_QUIZ_DEFAULTS.setItems
        };
    }

    // ------------------------------------------------------------------ Vue component
    function createFactoryCityComponent(BaseGameComponent) {
        if (typeof Vue === 'undefined') return null;
        return Vue.component('factory-city', Vue.extend({
            extends: BaseGameComponent,
            template: `
            <div ref="root" class="fc-game" :class="[themeKitClass,{'fc-reduced':reducedMotion,'fc-sheet-open':!!selectedBuilding,'fc-delivery':deliveryPulse}]" :style="themeKit.css" dir="rtl" @keydown.esc="dismissUpgrade">
              <canvas class="fc-stage" ref="stage" dir="ltr" aria-hidden="true"></canvas>
              <header class="fc-hud">
                <button class="fc-icon-btn" type="button" @click="exitGame" aria-label="חזרה"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7M9 12h11"/></svg></button>
                <div class="fc-money" aria-label="מטבעות"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M8.8 10.1c.8-2.1 5.6-2 6.4 0 .7 1.9-5.8 1.2-5.8 3.8 0 2.2 5 2.4 6.2.3"/></svg><b :class="{'fc-money-pop':moneyPop}">{{ displayMoney }}</b></div>
                <div class="fc-hud-title"><strong>{{ themeKit.motif.district }}</strong><span>{{ ppm }} מטבעות בדקה · {{ derived.workers }} עובדים · {{ displayGoods }} ארגזים</span></div>
                <button class="fc-icon-btn" type="button" @click="fit" aria-label="התאמה למסך"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
              </header>
              <button v-if="nextProject" type="button" class="fc-objective" @click="activateProject(nextProject)">
                <span class="fc-objective-kicker">הפרויקט הבא · {{ projectProgress.done }}/{{ projectProgress.total }}</span>
                <strong>{{ nextProject.item.name.value }}</strong>
                <span class="fc-objective-cost" :class="{ready:money >= nextProject.item.cost}">{{ money >= nextProject.item.cost ? 'מוכן לבנייה' : 'חסרים ' + Math.max(0, nextProject.item.cost - displayMoney) + ' מטבעות' }}</span>
              </button>
              <div class="fc-zoom">
                <button class="fc-icon-btn" type="button" @click="zoomIn" aria-label="התקרבות"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
                <button class="fc-icon-btn" type="button" @click="zoomOut" aria-label="התרחקות"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>
              </div>
              <section v-if="selectedPanel" class="fc-bottom-sheet" role="region" :aria-label="selectedPanel.name">
                <button type="button" class="fc-sheet-close" @click="clearSelection" aria-label="סגירה"></button>
                <h2>{{ selectedPanel.name }}</h2>
                <p>{{ selectedPanel.desc }}</p>
                <dl>
                  <div><dt>רמה</dt><dd>{{ selectedPanel.built ? selectedPanel.level : '—' }}</dd></div>
                  <div><dt>תרומה</dt><dd>{{ selectedPanel.effect }}</dd></div>
                  <div><dt>סטטוס</dt><dd>{{ selectedPanel.built ? 'פעיל' : 'מגרש פנוי' }}</dd></div>
                </dl>
                <button type="button" class="fc-upgrade-btn" :disabled="!selectedPanel.next || money < selectedPanel.next.cost" @click="attemptUpgrade(selectedPanel.next.index)">
                  <template v-if="selectedPanel.next">{{ selectedPanel.next.kind === 'build' ? 'בנייה' : 'שדרוג' }} · {{ selectedPanel.next.cost }}</template>
                  <template v-else-if="selectedPanel.completed">הושלם במלואו</template>
                  <template v-else>הפרויקט הבא ייפתח בהמשך</template>
                </button>
              </section>
              <nav class="fc-a11y-buildings" aria-label="מבני העיר">
                <button v-for="building in buildingCards" :key="building.id" type="button" @click="selectBuilding(building.id)">{{ building.name }} · {{ building.status }}</button>
              </nav>
              <div class="fc-sr-live" aria-live="polite">{{ liveAnnouncement }}</div>
              <div v-if="pendingUpgrade" class="fc-modal-scrim" @click.self="dismissUpgrade">
                <section class="fc-modal" role="dialog" aria-modal="true" :aria-label="pendingUpgrade.title">
                  <h2>{{ pendingUpgrade.title }}</h2>
                  <p>{{ pendingUpgrade.description }}</p>
                  <dl>
                    <div><dt>{{ pendingUpgrade.kind === 'hire' ? 'עובדים כעת' : 'רמה נוכחית' }}</dt><dd>{{ pendingUpgrade.currentLevel }}</dd></div>
                    <div><dt>{{ pendingUpgrade.kind === 'hire' ? 'אחרי ההעסקה' : 'רמה חדשה' }}</dt><dd>{{ pendingUpgrade.nextLevel }}</dd></div>
                    <div><dt>מחיר</dt><dd>{{ pendingUpgrade.cost }}</dd></div>
                  </dl>
                  <template v-if="pendingUpgrade.question">
                    <p class="fc-quiz-callout">ענו נכון על השאלה כדי לאשר:</p>
                    <button type="button" class="fc-quiz-prompt" @click="speakQuizPrompt">{{ pendingUpgrade.question.prompt }}</button>
                    <div class="fc-quiz-options">
                      <button v-for="option in pendingUpgrade.question.options" :key="option" ref="quizOptions" type="button"
                        :class="quizOptionClass(option)" :disabled="quizChoice !== null"
                        @click="answerUpgradeQuestion(option)">{{ option }}</button>
                    </div>
                    <p class="fc-quiz-feedback" :class="{ok: quizCorrect, bad: quizChoice !== null && !quizCorrect}">
                      <template v-if="quizChoice === null">&nbsp;</template>
                      <template v-else-if="quizCorrect">תשובה נכונה! יוצאים לדרך</template>
                      <template v-else>כמעט! התשובה הנכונה: {{ pendingUpgrade.question.answer }} · מיד מנסים שוב</template>
                    </p>
                    <div class="fc-modal-actions">
                      <button type="button" :disabled="quizChoice !== null" @click="resolveUpgradeChoice(false)">ביטול</button>
                    </div>
                  </template>
                  <template v-else>
                    <div class="fc-modal-actions">
                      <button type="button" @click="resolveUpgradeChoice(false)">ביטול</button>
                      <button ref="confirmBtn" type="button" class="confirm" @click="resolveUpgradeChoice(true)">אישור</button>
                    </div>
                  </template>
                </section>
              </div>
            </div>`,
            data: function () {
                return {
                    money: 70,
                    goods: 0,
                    lastSale: 0,
                    moneyPop: false,
                    purchasedMap: {},
                    weights: [],
                    selectedBuilding: null,
                    pendingUpgrade: null,
                    quizChoice: null,
                    quizCorrect: false,
                    phase: 'ready',
                    productionProgress: 0,
                    deliveryPulse: false,
                    liveAnnouncement: '',
                    reducedMotion: false,
                    themeKit: resolveFactoryCityTheme()
                };
            },
            computed: {
                themeKitClass: function () { return 'fc-theme-' + this.themeKit.key; },
                list: function () { return typeof getDataList === 'function' ? getDataList(this.currentApp.listName) : []; },
                derived: function () {
                    var idx = Object.keys(this.purchasedMap).filter(function (k) { return this.purchasedMap[k]; }, this).map(Number);
                    return deriveCityState(this.list, idx);
                },
                displayMoney: function () { return Math.floor(this.money); },
                displayGoods: function () { return Math.round(this.goods * 10) / 10; },
                economy: function () { return computeCityEconomy(this.derived.levels, this.derived.workers); },
                productionLabel: function () {
                    if ((this.derived.levels.factory || 0) <= 0) return 'הקימו מפעל כדי להתחיל';
                    if (this.deliveryPulse) return 'נמכרו ' + this.lastSale + ' ארגזים!';
                    if (this.goods >= this.economy.storage * 0.9) return 'המחסן כמעט מלא';
                    return 'מייצרים ומוכרים בלי הפסקה';
                },
                incomePerSec: function () { return this.economy.projectedIncome; },
                ppm: function () { return Math.round(this.incomePerSec * 60); },
                projectProgress: function () {
                    var self = this;
                    return {done: Object.keys(this.purchasedMap).filter(function (k) { return self.purchasedMap[k]; }).length, total: this.list.length};
                },
                nextProject: function () {
                    for (var i = 0; i < this.list.length; i++) {
                        if (this.weights[i] > 0 && !this.purchasedMap[i]) return {index: i, item: this.list[i]};
                    }
                    return null;
                },
                buildingCards: function () {
                    var self = this;
                    return FC_BUILDING_ORDER.map(function (id) {
                        var cfg = FC_BUILDINGS[id], level = self.derived.levels[id] || 0, next = self.nextUpgradeFor(id);
                        return {id: id, name: cfg.name, status: next ? (next.kind === 'build' ? 'זמין לבנייה' : 'שדרוג זמין') : (level >= cfg.tiers.length ? 'הושלם' : (level ? 'רמה ' + level + ' · הבא נעול' : 'נעול'))};
                    });
                },
                selectedPanel: function () {
                    var id = this.selectedBuilding;
                    if (!id || !FC_BUILDINGS[id]) return null;
                    var cfg = FC_BUILDINGS[id];
                    var level = this.derived.levels[id] || 0;
                    var next = this.nextUpgradeFor(id);
                    var effect = this.buildingEffect(id, level);
                    return {name: cfg.name, desc: cfg.desc, built: level > 0, level: level, effect: effect, next: next, completed: level >= cfg.tiers.length};
                }
            },
            methods: {
                // ---- storage ----
                storageKey: function (suffix) { return this.currentAppId + '_fc_' + suffix; },
                loadMoney: function () { var s = Number(getLocalStorage(this.storageKey('money'), NaN)); this.money = Number.isFinite(s) ? s : 70; },
                saveMoney: function () { setLocalStorage(this.storageKey('money'), Math.floor(this.money)); },
                loadGoods: function () { var s = Number(getLocalStorage(this.storageKey('goods'), 0)); this.goods = Number.isFinite(s) ? Math.max(0, s) : 0; },
                saveGoods: function () { setLocalStorage(this.storageKey('goods'), Math.round(this.goods * 10) / 10); },
                loadPurchased: function () {
                    var stored = getLocalStorage(this.storageKey('purchased'), []);
                    var map = {};
                    (stored || []).forEach(function (i) { map[i] = true; });
                    this.purchasedMap = map;
                },
                savePurchased: function () {
                    setLocalStorage(this.storageKey('purchased'), Object.keys(this.purchasedMap).filter(function (k) { return this.purchasedMap[k]; }, this).map(Number));
                },
                create: function () {
                    this.loadMoney();
                    this.loadGoods();
                    this.loadPurchased();
                    this.weights = getWeightsForKey(this.currentAppId, getSetItems(this.currentApp), this.list);
                    // Upgrades unlock inside the scene; suppress the shared "news" interstitial.
                    if (typeof setLocalStorage === 'function') setLocalStorage(this.currentAppId + '_new_items', []);
                },
                setPhase: function (next) {
                    if (this.phase === next) return true;
                    if (!canFactoryCityTransition(this.phase, next)) return false;
                    this.phase = next;
                    return true;
                },
                isCurrentRoute: function () {
                    return this.$route && this.$route.params.currentAppId === this.currentAppId && this.$route.path.indexOf('/play/factory_city/') === 0;
                },
                // ---- upgrade tree ----
                nextUpgradeFor: function (id) {
                    for (var i = 0; i < this.list.length; i++) {
                        var item = this.list[i];
                        if (item && item.building === id && this.weights[i] > 0 && !this.purchasedMap[i]) {
                            return Object.assign({index: i}, item);
                        }
                    }
                    return null;
                },
                buildingEffect: function (id, level) {
                    if (level <= 0) return 'טרם פעיל';
                    if (id === 'factory') return (Math.round(this.economy.production * 10) / 10) + ' ארגזים';
                    if (id === 'warehouse') return Math.round(this.economy.storage) + ' מקומות';
                    if (id === 'shop' || id === 'house' || id === 'park') return (Math.round(this.economy.sales * 10) / 10) + ' מכירות';
                    if (id === 'power') return (Math.round(this.economy.cycleSeconds * 10) / 10) + ' שניות';
                    return (Math.round(this.economy.unitValue * 10) / 10) + ' למוצר';
                },
                activateProject: function (project) {
                    if (!project || !project.item) return;
                    if (project.item.kind === 'hire') {
                        if (this.money < project.item.cost) {
                            this.liveAnnouncement = 'צריך עוד ' + Math.ceil(project.item.cost - this.money) + ' מטבעות כדי להעסיק עובד';
                            return;
                        }
                        this.attemptUpgrade(project.index);
                        return;
                    }
                    this.selectBuilding(project.item.building);
                },
                selectBuilding: function (id) {
                    if (this.pendingUpgrade || this.phase === 'feedback' || this.phase === 'building') return;
                    this.selectedBuilding = (id && FC_BUILDINGS[id]) ? id : null;
                    if (this.selectedBuilding) this.setPhase('selected');
                },
                clearSelection: function () {
                    if (this.pendingUpgrade) return;
                    this.selectedBuilding = null;
                    this.setPhase('ready');
                },
                // ---- income loop ----
                startIncome: function () {
                    var self = this;
                    this._incomeTimer = setInterval(function () {
                        if (self._destroyed) return;
                        self.productionProgress += 0.1 / self.economy.cycleSeconds;
                        if (self.productionProgress < 1) return;
                        self.productionProgress -= 1;
                        var cycle = runCityCycle(self.economy, self.goods);
                        self.goods = cycle.goods;
                        self.lastSale = Math.round(cycle.sold * 10) / 10;
                        self.money += cycle.payout;
                        self.deliveryPulse = cycle.sold > 0;
                        self._deliveryFxAt = Date.now();
                        clearTimeout(self._deliveryTimer);
                        self._deliveryTimer = setTimeout(function () { if (!self._destroyed) self.deliveryPulse = false; }, 650);
                        self._deliveriesSinceSave = (self._deliveriesSinceSave || 0) + 1;
                        if (self._deliveriesSinceSave >= 2) { self._deliveriesSinceSave = 0; self.saveMoney(); self.saveGoods(); }
                    }, 100);
                },
                // ---- upgrade + educational gate ----
                getUpgradeDefinition: function (item) {
                    var cfg = FC_BUILDINGS[item.building] || {};
                    var current = item.kind === 'build' ? 0 : (item.kind === 'hire' ? this.derived.workers : item.level - 1);
                    return {title: item.name.value, description: (item.detail && item.detail.value) || cfg.desc || '', currentLevel: current, nextLevel: item.level, cost: item.cost, kind: item.kind};
                },
                quizKey: function () { return this.currentAppId + '_quiz'; },
                makeUpgradeQuestion: function () {
                    var quiz = resolveCityQuiz(this.currentApp);
                    var generated = null;
                    try { generated = generateFromList(quiz.listName, quiz.questionIndex, quiz.resultIndex, this.quizKey(), quiz.setItems, 'text'); } catch (e) {}
                    if (!generated || !Array.isArray(generated.options) || generated.options.length < 2) return null;
                    return {prompt: generated.question, answer: generated.result, options: this.shuffle(generated.options.slice()), action: generated.action, index: generated.questionIndex};
                },
                openUpgradeApproval: function (definition) {
                    var self = this;
                    definition.question = this.makeUpgradeQuestion();
                    this.quizChoice = null;
                    this.quizCorrect = false;
                    this._questionToken = (this._questionToken || 0) + 1;
                    this.setPhase('question');
                    return new Promise(function (resolve) {
                        self.pendingUpgrade = definition;
                        self._resolveUpgrade = resolve;
                        self.$nextTick(function () { self.focusQuizControl(); });
                        if (definition.question) self.speakQuizPrompt();
                    });
                },
                focusQuizControl: function () {
                    var controls = this.$refs.quizOptions;
                    var first = Array.isArray(controls) ? controls[0] : controls;
                    if (first && typeof first.focus === 'function') first.focus();
                    else if (this.$refs.confirmBtn && typeof this.$refs.confirmBtn.focus === 'function') this.$refs.confirmBtn.focus();
                },
                speakQuizPrompt: function () {
                    var q = this.pendingUpgrade && this.pendingUpgrade.question;
                    if (q && typeof q.action === 'function') { try { q.action(); } catch (e) {} }
                },
                quizOptionClass: function (option) {
                    var q = this.pendingUpgrade && this.pendingUpgrade.question;
                    if (!q || this.quizChoice === null) return '';
                    if (option === q.answer) return 'correct';
                    if (option === this.quizChoice) return 'wrong';
                    return '';
                },
                answerUpgradeQuestion: function (option) {
                    var q = this.pendingUpgrade && this.pendingUpgrade.question;
                    if (!q || this.quizChoice !== null || this.phase !== 'question') return;
                    this.quizChoice = option;
                    this.quizCorrect = option === q.answer;
                    this.setPhase('feedback');
                    try { (this.quizCorrect ? successSound : failureSound).play(); } catch (e) {}
                    if (typeof q.index === 'number') updateWeightForKey(this.quizKey(), q.index, this.quizCorrect ? -1 : 1);
                    var self = this, accepted = this.quizCorrect, token = this._questionToken;
                    if (!accepted) {
                        this.score = Math.max(0, this.score - 1);
                        this.saveScore();
                        if (!this.reloadProgress()) { this.resolveUpgradeChoice(false); return; }
                    }
                    this._quizTimer = setTimeout(function () {
                        if (self._destroyed || token !== self._questionToken || !self.isCurrentRoute()) return;
                        if (accepted) {
                            self.setPhase('building');
                            self.resolveUpgradeChoice(true);
                            return;
                        }
                        self.quizChoice = null;
                        self.quizCorrect = false;
                        self.liveAnnouncement = 'לא נורא, נסו שוב את אותה השאלה';
                        self.setPhase('question');
                        self.$nextTick(function () { self.focusQuizControl(); });
                    }, accepted ? FC_QUIZ_DELAYS.correct : FC_QUIZ_DELAYS.wrong);
                },
                confirmUpgrade: function (item) { return this.openUpgradeApproval(this.getUpgradeDefinition(item)); },
                dismissUpgrade: function () { if (this.quizChoice !== null) return; this.resolveUpgradeChoice(false); },
                resolveUpgradeChoice: function (accepted) {
                    if (!this.pendingUpgrade) return;
                    clearTimeout(this._quizTimer);
                    this._quizTimer = null;
                    var resolve = this._resolveUpgrade;
                    this.pendingUpgrade = null;
                    this._resolveUpgrade = null;
                    this.quizChoice = null;
                    this.quizCorrect = false;
                    if (accepted && this.phase === 'question') this.setPhase('feedback');
                    if (accepted) this.setPhase('building');
                    else this.setPhase(this.selectedBuilding ? 'selected' : 'ready');
                    if (resolve) resolve(accepted);
                },
                attemptUpgrade: async function (index) {
                    if (this._upgradeBusy || this.pendingUpgrade || (this.phase !== 'ready' && this.phase !== 'selected')) return;
                    var item = this.list[index];
                    if (!item || this.weights[index] <= 0 || this.purchasedMap[index] || this.money < item.cost) return;
                    this._upgradeBusy = true;
                    var accepted = false;
                    try { accepted = await this.confirmUpgrade(item); }
                    finally { this._upgradeBusy = false; }
                    if (this._destroyed || !this.isCurrentRoute() || !accepted) return;
                    this.money -= item.cost;
                    this.saveMoney();
                    this.$set(this.purchasedMap, index, true);
                    this.savePurchased();
                    this.liveAnnouncement = (item.kind === 'build' ? 'נבנה: ' : 'שודרג: ') + item.name.value;
                    try { successSound.play(); } catch (e) {}
                    var updated = updateWeightForKey(this.currentAppId, index, -15);
                    this.weights = Array.isArray(updated) ? updated : getWeightsForKey(this.currentAppId, getSetItems(this.currentApp), this.list);
                    this.score += 1;
                    if (item.kind === 'hire') {
                        this.liveAnnouncement = 'עובד חדש הצטרף לצוות: ' + item.name.value;
                        this._workerFxAt = Date.now();
                    } else {
                        this.selectedBuilding = item.building;
                        this.triggerFx(item.building);
                    }
                    if (typeof setLocalStorage === 'function') setLocalStorage(this.currentAppId + '_new_items', []);
                    if (this.reloadProgress()) {
                        this.saveScore();
                        this.setPhase(this.selectedBuilding ? 'selected' : 'ready');
                    }
                },
                triggerFx: function (id) {
                    var cfg = FC_BUILDINGS[id];
                    if (!cfg) return;
                    this._fx = {cell: cfg.cell, t: 0};
                },
                exitGame: function () {
                    if (typeof parseAdventureId === 'function') {
                        var parsed = parseAdventureId(this.currentAppId);
                        if (parsed) { this.$router.push('/adventure/world/' + parsed.world.id); return; }
                    }
                    this.$router.push('/app/' + this.currentAppId);
                },

                // ========================================================= renderer
                initRenderer: function () {
                    var canvas = this.$refs.stage;
                    if (!canvas) return;
                    this._ctx = canvas.getContext('2d');
                    this._img = {};
                    this._ptrs = {};
                    this._zoom = 1;
                    this._panX = 0;
                    this._panY = 0;
                    this._originX = 0;
                    this._originY = 0;
                    this.loadImages();
                    this.bindPointer();
                    this.resize();
                    this.fit();
                    var self = this;
                    this._onResize = function () { self.resize(); self.fit(); };
                    window.addEventListener('resize', this._onResize);
                    this._renderLoop = function (ts) {
                        if (self._destroyed || document.hidden) return;
                        self.draw(ts || 0);
                        self._raf = requestAnimationFrame(self._renderLoop);
                    };
                    this._onVisibility = function () {
                        if (document.hidden) {
                            if (self._raf) cancelAnimationFrame(self._raf);
                            self._raf = null;
                        } else if (!self._destroyed && !self._raf) {
                            self._raf = requestAnimationFrame(self._renderLoop);
                        }
                    };
                    document.addEventListener('visibilitychange', this._onVisibility);
                    this._raf = requestAnimationFrame(this._renderLoop);
                },
                spriteNames: function () {
                    var names = ['citizen', 'cart', 'delivery-vehicle', 'yard-loader', 'conveyor-straight', 'conveyor-corner', 'conveyor-junction',
                        'cargo-box', 'cargo-box-wide', 'crane-magnet', 'catwalk-stairs', 'industrial-tank', 'industrial-chimney'];
                    FC_BUILDING_ORDER.forEach(function (id) { FC_BUILDINGS[id].tiers.forEach(function (n) { if (names.indexOf(n) === -1) names.push(n); }); });
                    FC_DECOR.forEach(function (d) { if (names.indexOf(d.sprite) === -1) names.push(d.sprite); });
                    return names;
                },
                loadImages: function () {
                    var self = this;
                    this.spriteNames().forEach(function (name) {
                        var im = new Image();
                        var rec = {img: im, ready: false};
                        im.onload = function () { rec.ready = true; };
                        im.src = FC_ASSET + name + '.png';
                        self._img[name] = rec;
                    });
                },
                resize: function () {
                    var canvas = this.$refs.stage;
                    if (!canvas) return;
                    var dpr = Math.min(window.devicePixelRatio || 1, 2);
                    var w = canvas.clientWidth || window.innerWidth;
                    var h = canvas.clientHeight || window.innerHeight;
                    canvas.width = Math.round(w * dpr);
                    canvas.height = Math.round(h * dpr);
                    this._cssW = w;
                    this._cssH = h;
                    this._dpr = dpr;
                    this._originX = w / 2;
                    this._originY = h * 0.30;
                },
                fit: function () {
                    var w = this._cssW || 360;
                    var spanW = (FC_GRID_MAX - FC_GRID_MIN) * FC_TW; // platform width in world px
                    var z = (w * 1.12) / spanW;
                    this._zoom = Math.max(0.72, Math.min(1.5, z));
                    // vertically centre the platform (its centre sits at ~0.52 of the canvas,
                    // leaving headroom above for tall buildings and the HUD).
                    var cWorldY = (FC_GRID_MIN + FC_GRID_MAX) * FC_TH / 2;
                    this._panX = 0;
                    this._panY = this._cssH * 0.54 - this._originY - this._zoom * cWorldY;
                },
                clampZoom: function (z) { return Math.max(0.5, Math.min(1.9, z)); },
                zoomIn: function () { this.zoomAt(this._cssW / 2, this._cssH / 2, 1.2); },
                zoomOut: function () { this.zoomAt(this._cssW / 2, this._cssH / 2, 1 / 1.2); },
                zoomAt: function (sx, sy, factor) {
                    var z0 = this._zoom, z1 = this.clampZoom(z0 * factor);
                    if (z1 === z0) return;
                    // keep the point under (sx,sy) fixed
                    var wx = (sx - this._originX - this._panX) / z0;
                    var wy = (sy - this._originY - this._panY) / z0;
                    this._panX = sx - this._originX - wx * z1;
                    this._panY = sy - this._originY - wy * z1;
                    this._zoom = z1;
                },
                screenForCell: function (c, r) {
                    var w = isoToWorld(c, r);
                    return {x: this._originX + this._panX + this._zoom * w.x, y: this._originY + this._panY + this._zoom * w.y};
                },
                cellFromScreen: function (sx, sy) {
                    var X = (sx - this._originX - this._panX) / this._zoom;
                    var Y = (sy - this._originY - this._panY) / this._zoom;
                    var a = X / (FC_TW / 2), b = Y / (FC_TH / 2);
                    return {c: Math.round((a + b) / 2), r: Math.round((b - a) / 2)};
                },
                buildingAtCell: function (c, r) {
                    var found = null, self = this;
                    FC_BUILDING_ORDER.forEach(function (id) {
                        var cell = FC_BUILDINGS[id].cell;
                        if (cell[0] === c && cell[1] === r && ((self.derived.levels[id] || 0) > 0 || self.nextUpgradeFor(id))) found = id;
                    });
                    return found;
                },
                bindPointer: function () {
                    var canvas = this.$refs.stage, self = this;
                    var down = function (e) {
                        canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
                        self._ptrs[e.pointerId] = {x: e.offsetX, y: e.offsetY, x0: e.offsetX, y0: e.offsetY};
                        var ids = Object.keys(self._ptrs);
                        if (ids.length === 1) { self._dragMoved = false; self._panStart = {x: self._panX, y: self._panY}; }
                        else if (ids.length === 2) { self._pinch = self.pinchState(); }
                    };
                    var move = function (e) {
                        var p = self._ptrs[e.pointerId];
                        if (!p) return;
                        p.x = e.offsetX; p.y = e.offsetY;
                        var ids = Object.keys(self._ptrs);
                        if (ids.length >= 2 && self._pinch) {
                            var now = self.pinchState();
                            var f = now.dist / (self._pinch.dist || 1);
                            self.zoomAt(now.mx, now.my, f);
                            self._pinch = now;
                            self._dragMoved = true;
                        } else if (ids.length === 1) {
                            var dx = p.x - p.x0, dy = p.y - p.y0;
                            if (Math.abs(dx) + Math.abs(dy) > 7) self._dragMoved = true;
                            if (self._dragMoved && self._panStart) { self._panX = self._panStart.x + dx; self._panY = self._panStart.y + dy; }
                        }
                    };
                    var up = function (e) {
                        var p = self._ptrs[e.pointerId];
                        delete self._ptrs[e.pointerId];
                        self._pinch = null;
                        if (p && !self._dragMoved && Object.keys(self._ptrs).length === 0) self.handleTap(p.x0, p.y0);
                    };
                    canvas.addEventListener('pointerdown', down);
                    canvas.addEventListener('pointermove', move);
                    canvas.addEventListener('pointerup', up);
                    canvas.addEventListener('pointercancel', up);
                    var wheel = function (e) { e.preventDefault(); self.zoomAt(e.offsetX, e.offsetY, e.deltaY < 0 ? 1.12 : 1 / 1.12); };
                    canvas.addEventListener('wheel', wheel, {passive: false});
                    this._pointerHandlers = {down: down, move: move, up: up, wheel: wheel};
                },
                pinchState: function () {
                    var ids = Object.keys(this._ptrs), a = this._ptrs[ids[0]], b = this._ptrs[ids[1]];
                    var dx = a.x - b.x, dy = a.y - b.y;
                    return {dist: Math.hypot(dx, dy), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2};
                },
                handleTap: function (sx, sy) {
                    if (this.pendingUpgrade || this.phase === 'feedback' || this.phase === 'building') return;
                    var regions = this._hitRegions || [];
                    for (var i = regions.length - 1; i >= 0; i--) {
                        var hit = regions[i];
                        if (sx >= hit.x && sx <= hit.x + hit.w && sy >= hit.y && sy <= hit.y + hit.h) {
                            this.selectBuilding(hit.id);
                            return;
                        }
                    }
                    var cell = this.cellFromScreen(sx, sy);
                    var id = this.buildingAtCell(cell.c, cell.r);
                    this.selectBuilding(id);
                },
                // ---- draw ----
                draw: function (ts) {
                    var ctx = this._ctx;
                    if (!ctx) return;
                    var dpr = this._dpr, W = this._cssW, H = this._cssH;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    ctx.clearRect(0, 0, W, H);
                    this._hitRegions = [];
                    var scene = this.themeKit.scene;
                    var g = ctx.createLinearGradient(0, 0, 0, H);
                    g.addColorStop(0, scene.skyTop); g.addColorStop(1, scene.skyBottom);
                    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
                    if (this.themeKit.night) this.drawNightLights(ctx, ts);
                    this.drawPlatform(ctx);
                    this.drawCargoFlow(ctx, ts);
                    this.drawYardLoader(ctx, ts);
                    this.drawDeliveryCart(ctx, ts);
                    this.drawDrawables(ctx, ts);
                    this.drawSmoke(ctx, ts);
                },
                drawNightLights: function (ctx, ts) {
                    ctx.save();
                    for (var i = 0; i < 18; i++) {
                        var x = ((i * 197) % 997) / 997 * this._cssW;
                        var y = ((i * 83) % 311) / 311 * this._cssH * 0.62;
                        var alpha = this.reducedMotion ? 0.45 : 0.28 + 0.18 * Math.sin((ts || 0) / 700 + i);
                        ctx.fillStyle = fcHexAlpha(this.themeKit.css['--fc-accent'], Math.max(0.12, alpha));
                        ctx.beginPath(); ctx.arc(x, y, 1.2 + (i % 3) * 0.45, 0, Math.PI * 2); ctx.fill();
                    }
                    ctx.restore();
                },
                drawPlatform: function (ctx) {
                    var self = this;
                    var scene = this.themeKit.scene;
                    var corners = [this.cellFromScreen(0, 0), this.cellFromScreen(this._cssW, 0), this.cellFromScreen(0, this._cssH), this.cellFromScreen(this._cssW, this._cssH)];
                    var minC = Math.min.apply(Math, corners.map(function (p) { return p.c; })) - 2;
                    var maxC = Math.max.apply(Math, corners.map(function (p) { return p.c; })) + 2;
                    var minR = Math.min.apply(Math, corners.map(function (p) { return p.r; })) - 2;
                    var maxR = Math.max.apply(Math, corners.map(function (p) { return p.r; })) + 2;
                    // The terrain is procedural and bounded to the visible camera window.
                    for (var c = minC; c <= maxC; c++) {
                        for (var r = minR; r <= maxR; r++) {
                            var a = self.screenForCell(c - 0.5, r - 0.5), b = self.screenForCell(c + 0.5, r - 0.5),
                                d = self.screenForCell(c + 0.5, r + 0.5), e = self.screenForCell(c - 0.5, r + 0.5);
                            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
                            ctx.fillStyle = (c + r) % 2 ? scene.grassA : scene.grassB; ctx.fill();
                            ctx.lineWidth = Math.max(0.45, self._zoom * 0.7); ctx.strokeStyle = 'rgba(255,255,255,.055)'; ctx.stroke();
                        }
                    }
                    // A modular concrete factory floor grows with the production line.
                    this.drawFactoryFloor(ctx, this.yardCells());
                    // The outbound service lane is part of the same industrial yard.
                    this.drawGroundCells(ctx, this.deliveryRoadCells(), scene.road, scene.roadEdge);
                    if (this.deliveryRoadCells().length) this.drawRouteLine(ctx, [[3, 3.72], [3, 9.35]], scene.safety);
                    this.drawWorkZones(ctx);
                    // selected cell highlight
                    if (this.selectedBuilding && FC_BUILDINGS[this.selectedBuilding]) {
                        var sc = FC_BUILDINGS[this.selectedBuilding].cell;
                        var p1 = self.screenForCell(sc[0] - 0.5, sc[1] - 0.5), p2 = self.screenForCell(sc[0] + 0.5, sc[1] - 0.5),
                            p3 = self.screenForCell(sc[0] + 0.5, sc[1] + 0.5), p4 = self.screenForCell(sc[0] - 0.5, sc[1] + 0.5);
                        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y); ctx.closePath();
                        ctx.fillStyle = fcHexAlpha(scene.selection, 0.25); ctx.fill();
                        ctx.lineWidth = 3; ctx.strokeStyle = scene.selection; ctx.stroke();
                    }
                },
                drawGroundCells: function (ctx, cells, fill, edge) {
                    var self = this;
                    cells.forEach(function (cell) {
                        var a = self.screenForCell(cell[0] - 0.505, cell[1] - 0.505), b = self.screenForCell(cell[0] + 0.505, cell[1] - 0.505),
                            d = self.screenForCell(cell[0] + 0.505, cell[1] + 0.505), e = self.screenForCell(cell[0] - 0.505, cell[1] + 0.505);
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
                        ctx.fillStyle = fill; ctx.fill();
                        ctx.lineWidth = Math.max(0.65, self._zoom * 0.8); ctx.strokeStyle = edge; ctx.stroke();
                    });
                },
                drawFactoryFloor: function (ctx, cells) {
                    var self = this, scene = this.themeKit.scene;
                    cells.forEach(function (cell) {
                        var a = self.screenForCell(cell[0] - 0.505, cell[1] - 0.505), b = self.screenForCell(cell[0] + 0.505, cell[1] - 0.505),
                            d = self.screenForCell(cell[0] + 0.505, cell[1] + 0.505), e = self.screenForCell(cell[0] - 0.505, cell[1] + 0.505);
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
                        ctx.fillStyle = (Math.abs(cell[0] + cell[1]) % 2) ? scene.yard : scene.yardAlt; ctx.fill();
                        ctx.lineWidth = Math.max(0.7, self._zoom); ctx.strokeStyle = scene.yardGrid; ctx.stroke();
                    });
                },
                drawWorkZones: function (ctx) {
                    var self = this, scene = this.themeKit.scene;
                    FC_BUILDING_ORDER.forEach(function (id) {
                        var level = self.derived.levels[id] || 0;
                        if (!level && !self.nextUpgradeFor(id)) return;
                        var cell = FC_BUILDINGS[id].cell;
                        var a = self.screenForCell(cell[0] - 0.39, cell[1] - 0.39), b = self.screenForCell(cell[0] + 0.39, cell[1] - 0.39),
                            d = self.screenForCell(cell[0] + 0.39, cell[1] + 0.39), e = self.screenForCell(cell[0] - 0.39, cell[1] + 0.39);
                        ctx.save();
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
                        ctx.setLineDash([9 * self._zoom, 6 * self._zoom]);
                        ctx.lineWidth = Math.max(1.5, 2.2 * self._zoom);
                        ctx.strokeStyle = level ? scene.safety : fcHexAlpha(scene.safety, 0.48); ctx.stroke();
                        ctx.restore();
                    });
                },
                yardCells: function () {
                    var cells = {}, self = this, active = [];
                    FC_BUILDING_ORDER.forEach(function (id) {
                        if ((self.derived.levels[id] || 0) > 0) active.push(FC_BUILDINGS[id].cell);
                    });
                    if (this.nextProject && this.nextProject.item && this.nextProject.item.building) {
                        active.push(FC_BUILDINGS[this.nextProject.item.building].cell);
                    }
                    var minC = Math.min.apply(Math, active.map(function (p) { return p[0]; }));
                    var maxC = Math.max.apply(Math, active.map(function (p) { return p[0]; }));
                    var minR = Math.min.apply(Math, active.map(function (p) { return p[1]; }));
                    var maxR = Math.max.apply(Math, active.map(function (p) { return p[1]; }));
                    minC -= 2; maxC += 2; minR -= 2; maxR += 2;
                    for (var c = minC; c <= maxC; c++) {
                        for (var r = minR; r <= maxR; r++) cells[c + ',' + r] = [c, r];
                    }
                    return Object.keys(cells).map(function (key) { return cells[key]; });
                },
                deliveryRoadCells: function () {
                    if ((this.derived.levels.factory || 0) <= 0) return [];
                    return [[3, 4], [3, 5], [3, 6], [3, 7], [3, 8], [3, 9]];
                },
                pointOnRoute: function (route, progress) {
                    if (!route || route.length < 2) return {c: 3, r: 3};
                    var scaled = Math.max(0, Math.min(0.9999, progress)) * (route.length - 1);
                    var index = Math.floor(scaled), amount = scaled - index;
                    var a = route[index], b = route[index + 1];
                    return {c: a[0] + (b[0] - a[0]) * amount, r: a[1] + (b[1] - a[1]) * amount};
                },
                loopPointOnRoute: function (route, progress) {
                    return this.pointOnRoute(route.concat([route[0]]), ((progress % 1) + 1) % 1);
                },
                drawRouteLine: function (ctx, route, color) {
                    if (!route || route.length < 2) return;
                    ctx.save();
                    ctx.beginPath();
                    route.forEach(function (cell, index) {
                        var p = this.screenForCell(cell[0], cell[1]);
                        if (index) ctx.lineTo(p.x, p.y + 16 * this._zoom);
                        else ctx.moveTo(p.x, p.y + 16 * this._zoom);
                    }, this);
                    ctx.lineWidth = Math.max(2, 5 * this._zoom);
                    ctx.strokeStyle = color;
                    ctx.setLineDash([7 * this._zoom, 9 * this._zoom]);
                    ctx.stroke();
                    ctx.restore();
                },
                drawCargoBox: function (ctx, p, scale) {
                    var z = this._zoom * (scale || 1), w = 18 * z, h = 14 * z;
                    if (this.drawSprite(ctx, 'cargo-box', p.x, p.y + 10 * z, FC_TW * 0.14 * (scale || 1), 0)) return;
                    ctx.save();
                    ctx.translate(p.x, p.y + 10 * z);
                    ctx.fillStyle = '#b86f32'; ctx.fillRect(-w / 2, -h, w, h);
                    ctx.fillStyle = '#e7a95c';
                    ctx.beginPath(); ctx.moveTo(-w / 2, -h); ctx.lineTo(0, -h - 5 * z); ctx.lineTo(w / 2, -h); ctx.lineTo(0, -h + 5 * z); ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = '#7b441e'; ctx.lineWidth = Math.max(1, z); ctx.strokeRect(-w / 2, -h, w, h);
                    ctx.restore();
                },
                drawCargoFlow: function (ctx, ts) {
                    if ((this.derived.levels.factory || 0) <= 0) return;
                    var hasWarehouse = (this.derived.levels.warehouse || 0) > 0;
                    var route = hasWarehouse
                        ? [[5, 3.28], [4.5, 3.28], [4, 3.28], [3.35, 3.28]]
                        : [[5, 3.25], [5.45, 3.55], [5.2, 4.05], [4.75, 3.75], [5, 3.25]];
                    var beltPieces = hasWarehouse
                        ? [
                            {sprite: 'conveyor-straight', c: 4.58, r: 3.3, s: 0.54},
                            {sprite: 'conveyor-straight', c: 3.82, r: 3.3, s: 0.54}
                        ]
                        : [
                            {sprite: 'conveyor-corner', c: 5.28, r: 3.55, s: 0.34},
                            {sprite: 'conveyor-straight', c: 5.05, r: 3.92, s: 0.42}
                        ];
                    beltPieces.forEach(function (piece) {
                        var bp = this.screenForCell(piece.c, piece.r);
                        this.drawSprite(ctx, piece.sprite, bp.x, bp.y + 24 * this._zoom, FC_TW * piece.s, 0);
                    }, this);
                    var phase = this.reducedMotion ? 0.28 : ((ts || 0) / Math.max(2400, this.economy.cycleSeconds * 1000)) % 1;
                    if (!this.reducedMotion) this.drawConveyorTicks(ctx, route, phase);
                    var count = Math.max(2, Math.min(5, Math.ceil(this.economy.production)));
                    for (var i = 0; i < count; i++) {
                        var progress = (phase + i / count) % 1;
                        var cell = this.pointOnRoute(route, progress);
                        this.drawCargoBox(ctx, this.screenForCell(cell.c, cell.r), 0.9);
                    }
                    if (hasWarehouse && this.goods > 0) {
                        var stacks = Math.min(5, Math.max(1, Math.ceil(this.goods / Math.max(1, this.economy.storage) * 5)));
                        for (var s = 0; s < stacks; s++) {
                            this.drawCargoBox(ctx, this.screenForCell(3.18 + (s % 3) * 0.15, 3.58 + Math.floor(s / 3) * 0.12), 0.78);
                        }
                    }
                    this.drawMaterialStack(ctx, this.screenForCell(4.72, 2.32), 3 + Math.min(3, this.derived.levels.factory || 0));
                    if (hasWarehouse) this.drawMaterialStack(ctx, this.screenForCell(2.54, 3.62), 2 + Math.min(4, Math.ceil(this.goods / 2)));
                },
                drawMaterialStack: function (ctx, p, count) {
                    var z = this._zoom, rows = Math.max(2, Math.min(7, count || 2));
                    ctx.save();
                    ctx.fillStyle = 'rgba(25,30,34,.22)';
                    ctx.beginPath(); ctx.ellipse(p.x, p.y + 17 * z, 34 * z, 9 * z, 0, 0, Math.PI * 2); ctx.fill();
                    for (var i = 0; i < rows; i++) {
                        var y = p.y + 10 * z - i * 7 * z, off = (i % 2) * 3 * z;
                        ctx.fillStyle = '#b96c2e'; ctx.fillRect(p.x - 31 * z + off, y, 61 * z, 7 * z);
                        ctx.fillStyle = '#e99a4b'; ctx.fillRect(p.x - 31 * z + off, y - 3 * z, 61 * z, 3 * z);
                        ctx.fillStyle = '#70401f'; ctx.fillRect(p.x + 26 * z + off, y, 4 * z, 7 * z);
                    }
                    ctx.restore();
                },
                drawConveyorTicks: function (ctx, route, phase) {
                    ctx.save();
                    for (var i = 0; i < 9; i++) {
                        var progress = (phase * 1.8 + i / 9) % 1;
                        var cell = this.pointOnRoute(route, progress);
                        var ahead = this.pointOnRoute(route, Math.min(0.999, progress + 0.01));
                        var p = this.screenForCell(cell.c, cell.r), p2 = this.screenForCell(ahead.c, ahead.r);
                        ctx.save(); ctx.translate(p.x, p.y + 22 * this._zoom); ctx.rotate(Math.atan2(p2.y - p.y, p2.x - p.x));
                        ctx.fillStyle = '#ffd34f'; ctx.fillRect(-5 * this._zoom, -2 * this._zoom, 10 * this._zoom, 4 * this._zoom);
                        ctx.restore();
                    }
                    ctx.restore();
                },
                drawDeliveryCart: function (ctx, ts) {
                    if ((this.derived.levels.factory || 0) <= 0) return;
                    var origin = (this.derived.levels.warehouse || 0) > 0 ? [3.2, 3.5] : [5.2, 3.5];
                    var route = (this.derived.levels.warehouse || 0) > 0
                        ? [origin, [3.2, 4.4], [3.2, 5.4], [3.2, 6.4], [3.2, 7.5], [3.2, 8.8]]
                        : [origin, [5.2, 4.4], [5.2, 5.4], [5.2, 6.4], [5.2, 7.5], [5.2, 8.8]];
                    var phase = this.reducedMotion ? 0.52 : ((ts || 0) / Math.max(4300, this.economy.cycleSeconds * 1350)) % 1;
                    var here = this.pointOnRoute(route, phase);
                    var next = this.pointOnRoute(route, Math.min(0.999, phase + 0.01));
                    var p = this.screenForCell(here.c, here.r), p2 = this.screenForCell(next.c, next.r);
                    this.drawTruck(ctx, p.x, p.y + 18 * this._zoom, p2.x >= p.x ? 1 : -1);
                },
                drawYardLoader: function (ctx, ts) {
                    if ((this.derived.levels.factory || 0) <= 0) return;
                    var route = [[2.05, 4.35], [3.25, 4.55], [4.7, 4.25], [3.25, 4.55], [2.05, 4.35]];
                    var phase = this.reducedMotion ? 0.38 : ((ts || 0) / 9200) % 1;
                    var here = this.pointOnRoute(route, phase);
                    var p = this.screenForCell(here.c, here.r);
                    this.drawSprite(ctx, 'yard-loader', p.x, p.y + 23 * this._zoom, FC_TW * 0.46, 0);
                },
                drawTruck: function (ctx, x, y, direction) {
                    this.drawSprite(ctx, 'delivery-vehicle', x, y, FC_TW * 0.62, 0);
                },
                drawDrawables: function (ctx, ts) {
                    var self = this;
                    var items = [];
                    FC_BUILDING_ORDER.forEach(function (id) {
                        var cell = FC_BUILDINGS[id].cell;
                        items.push({kind: 'building', id: id, c: cell[0], r: cell[1]});
                    });
                    FC_DECOR.forEach(function (d) { items.push({kind: 'decor', d: d, c: d.c, r: d.r}); });
                    for (var workerIndex = 0; workerIndex < this.derived.workers; workerIndex++) {
                        var worker = this.workerPosition(workerIndex, ts);
                        items.push({kind: 'worker', worker: worker, c: worker.c, r: worker.r});
                    }
                    if ((this.derived.levels.shop || 0) > 0) {
                        var buyerCount = Math.min(5, 1 + (this.derived.levels.shop || 0) + Math.floor((this.derived.levels.house || 0) / 2));
                        for (var buyerIndex = 0; buyerIndex < buyerCount; buyerIndex++) {
                            var buyer = this.buyerPosition(buyerIndex, buyerCount, ts);
                            items.push({kind: 'buyer', buyer: buyer, c: buyer.c, r: buyer.r});
                        }
                    }
                    if ((this.derived.levels.factory || 0) >= 2) {
                        items.push({kind: 'production-prop', sprite: 'industrial-tank', c: 5.78, r: 2.72, s: 0.34});
                    }
                    if ((this.derived.levels.factory || 0) >= 3) {
                        items.push({kind: 'production-prop', sprite: 'crane-magnet', c: 4.75, r: 3.58, s: 0.23});
                    }
                    if ((this.derived.levels.warehouse || 0) >= 2) {
                        items.push({kind: 'production-prop', sprite: 'catwalk-stairs', c: 3.48, r: 3.62, s: 0.34});
                    }
                    if ((this.derived.levels.power || 0) > 0) {
                        items.push({kind: 'production-prop', sprite: 'industrial-chimney', c: 7.55, r: 2.65, s: 0.18});
                    }
                    items.sort(function (a, b) { return (a.c + a.r) - (b.c + b.r) || a.r - b.r; });
                    items.forEach(function (it) {
                        if (it.kind === 'decor') self.drawDecor(ctx, it.d);
                        else if (it.kind === 'worker') self.drawWorker(ctx, it.worker, ts);
                        else if (it.kind === 'buyer') self.drawBuyer(ctx, it.buyer, ts);
                        else if (it.kind === 'production-prop') {
                            var pp = self.screenForCell(it.c, it.r);
                            self.drawSprite(ctx, it.sprite, pp.x, pp.y + FC_TH * self._zoom * 0.34, FC_TW * it.s, 0);
                        }
                        else {
                            var bounds = self.drawBuilding(ctx, it.id, ts);
                            if (bounds) self._hitRegions.push({id: it.id, x: bounds.x - 5, y: bounds.y - 5, w: bounds.w + 10, h: bounds.h + 10});
                        }
                    });
                },
                workerPosition: function (index, ts) {
                    var route = [[2.05, 2.05], [4.15, 1.95], [5.72, 2.72], [5.35, 4.15], [3.45, 4.5], [1.72, 3.72], [1.78, 2.45]];
                    if (this.reducedMotion) return {c: 3.45 + index * 0.24, r: 4.05 - (index % 2) * 0.16, index: index};
                    var movement = ((ts || 0) / 6200 + index / Math.max(1, this.derived.workers)) % 1;
                    var scaled = movement * route.length;
                    var at = Math.floor(scaled), amount = scaled - at, a = route[at], b = route[(at + 1) % route.length];
                    return {c: a[0] + (b[0] - a[0]) * amount + 0.4 + (index % 2) * 0.18, r: a[1] + (b[1] - a[1]) * amount + 0.55 - (index % 2) * 0.2, index: index};
                },
                drawWorker: function (ctx, worker, ts) {
                    var p = this.screenForCell(worker.c, worker.r);
                    var bob = this.reducedMotion ? 0 : Math.sin((ts || 0) / 120 + worker.index) * 1.5 * this._zoom;
                    var cy = p.y + FC_TH * this._zoom * 0.28 + bob;
                    var drawn = this.drawSprite(ctx, 'citizen', p.x, cy, FC_TW * 0.3, 0);
                    if (!drawn) this.drawFallbackPerson(ctx, p.x, cy, '#f39c3d');
                    if (worker.index % 3 === 0) this.drawCargoBox(ctx, {x: p.x + 13 * this._zoom, y: cy - 17 * this._zoom}, 0.55);
                },
                buyerPosition: function (index, count, ts) {
                    var route = [[-1.25, 1.8], [-0.35, 2.15], [0.35, 2.55], [0.9, 2.9], [1.25, 3.15]];
                    var movement = this.reducedMotion ? (0.62 + index * 0.07) : (((ts || 0) / 7600 + index / Math.max(1, count)) % 1);
                    var p = this.pointOnRoute(route, movement);
                    return {c: p.c, r: p.r, index: index};
                },
                drawBuyer: function (ctx, buyer, ts) {
                    var p = this.screenForCell(buyer.c, buyer.r);
                    var bob = this.reducedMotion ? 0 : Math.sin((ts || 0) / 145 + buyer.index * 1.7) * 1.2 * this._zoom;
                    var cy = p.y + FC_TH * this._zoom * 0.28 + bob;
                    var drawn = this.drawSprite(ctx, 'citizen', p.x, cy, FC_TW * 0.27, 0);
                    if (!drawn) this.drawFallbackPerson(ctx, p.x, cy, '#4e9bd6');
                    var z = this._zoom;
                    ctx.save();
                    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#58707d'; ctx.lineWidth = Math.max(1, z);
                    ctx.beginPath(); ctx.arc(p.x + 14 * z, cy - 44 * z, 9 * z, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
                    ctx.fillStyle = '#2e9d55'; ctx.font = 'bold ' + Math.max(8, Math.round(10 * z)) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('₪', p.x + 14 * z, cy - 44 * z);
                    ctx.restore();
                },
                drawFallbackPerson: function (ctx, x, y, color) {
                    var z = this._zoom;
                    ctx.save();
                    ctx.fillStyle = 'rgba(20,35,45,.18)'; ctx.beginPath(); ctx.ellipse(x, y, 11 * z, 4 * z, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.fillStyle = color; ctx.fillRect(x - 7 * z, y - 25 * z, 14 * z, 18 * z);
                    ctx.fillStyle = '#ffd2a8'; ctx.beginPath(); ctx.arc(x, y - 31 * z, 7 * z, 0, Math.PI * 2); ctx.fill();
                    ctx.strokeStyle = '#263238'; ctx.lineWidth = Math.max(2, 2.5 * z); ctx.beginPath(); ctx.moveTo(x - 4 * z, y - 7 * z); ctx.lineTo(x - 6 * z, y); ctx.moveTo(x + 4 * z, y - 7 * z); ctx.lineTo(x + 6 * z, y); ctx.stroke();
                    ctx.restore();
                },
                drawSprite: function (ctx, name, cx, cy, worldWidth, liftY) {
                    var rec = this._img[name];
                    if (!rec || !rec.ready) return null;
                    var im = rec.img;
                    var wpx = worldWidth * this._zoom;
                    var scale = wpx / im.naturalWidth;
                    var hpx = im.naturalHeight * scale;
                    var x = cx - wpx / 2;
                    var y = cy - hpx + (liftY || 0);
                    // soft contact shadow
                    ctx.save();
                    ctx.globalAlpha = 0.18;
                    ctx.fillStyle = '#123018';
                    ctx.beginPath();
                    ctx.ellipse(cx, cy - 2, wpx * 0.32, wpx * 0.32 * (FC_TH / FC_TW), 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                    ctx.drawImage(im, x, y, wpx, hpx);
                    return {x: x, y: y, w: wpx, h: hpx};
                },
                drawDecor: function (ctx, d) {
                    var p = this.screenForCell(d.c, d.r);
                    this.drawSprite(ctx, d.sprite, p.x, p.y + FC_TH * this._zoom * 0.15, FC_TW * d.s, 0);
                },
                drawBuilding: function (ctx, id, ts) {
                    var cfg = FC_BUILDINGS[id];
                    var level = this.derived.levels[id] || 0;
                    var p = this.screenForCell(cfg.cell[0], cfg.cell[1]);
                    // Seat the sprite's bottom edge on the tile's front vertex (half a
                    // tile-height below the tile centre) so the base rests on the ground
                    // instead of floating above it.
                    var baseY = p.y + FC_TH * this._zoom * 0.5;
                    if (level <= 0) {
                        if (!this.nextUpgradeFor(id)) return null;
                        return this.drawPlot(ctx, id, p, ts);
                    }
                    var sprite = cfg.tiers[Math.min(level, cfg.tiers.length) - 1];
                    var lift = 0;
                    if (this._fx && this._fx.cell[0] === cfg.cell[0] && this._fx.cell[1] === cfg.cell[1]) {
                        this._fx.t += 1;
                        lift = -Math.max(0, 10 - this._fx.t) * (this.reducedMotion ? 0 : 1);
                        if (this._fx.t > 40) this._fx = null;
                    }
                    var bounds = this.drawSprite(ctx, sprite, p.x, baseY, FC_TW * FC_BUILD_SCALE, lift);
                    this.drawBadge(ctx, id, p, ts);
                    return bounds;
                },
                drawPlot: function (ctx, id, p, ts) {
                    // empty buildable plot: dashed diamond + "+" marker
                    var z = this._zoom;
                    var a = this.screenForCell(FC_BUILDINGS[id].cell[0] - 0.42, FC_BUILDINGS[id].cell[1] - 0.42);
                    var b = this.screenForCell(FC_BUILDINGS[id].cell[0] + 0.42, FC_BUILDINGS[id].cell[1] - 0.42);
                    var d = this.screenForCell(FC_BUILDINGS[id].cell[0] + 0.42, FC_BUILDINGS[id].cell[1] + 0.42);
                    var e = this.screenForCell(FC_BUILDINGS[id].cell[0] - 0.42, FC_BUILDINGS[id].cell[1] + 0.42);
                    ctx.save();
                    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(d.x, d.y); ctx.lineTo(e.x, e.y); ctx.closePath();
                    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
                    ctx.setLineDash([6 * z, 5 * z]); ctx.lineWidth = 2 * z; ctx.strokeStyle = 'rgba(30,50,30,0.5)'; ctx.stroke();
                    ctx.setLineDash([]);
                    var next = this.nextUpgradeFor(id);
                    if (next) {
                        var pulse = this.reducedMotion ? 1 : (0.75 + 0.25 * Math.sin((ts || 0) / 300));
                        var rad = 15 * z * pulse;
                        var cy = p.y - 6 * z;
                        ctx.beginPath(); ctx.arc(p.x, cy, rad, 0, Math.PI * 2);
                        ctx.fillStyle = this.money >= next.cost ? '#f5b02c' : '#9fb0c0';
                        ctx.fill();
                        ctx.fillStyle = '#3d2800'; ctx.font = 'bold ' + Math.round(20 * z) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                        ctx.fillText('+', p.x, cy + 1);
                        ctx.font = '800 ' + Math.max(9, Math.round(11 * z)) + 'px system-ui';
                        ctx.fillStyle = this.themeKit.night ? '#f7fbff' : '#263322';
                        ctx.fillText(String(next.cost), p.x, cy + 23 * z);
                    }
                    ctx.restore();
                    var xs = [a.x, b.x, d.x, e.x], ys = [a.y, b.y, d.y, e.y];
                    var minX = Math.min.apply(Math, xs), maxX = Math.max.apply(Math, xs), minY = Math.min.apply(Math, ys), maxY = Math.max.apply(Math, ys);
                    return {x: minX, y: minY - 20 * z, w: maxX - minX, h: maxY - minY + 40 * z};
                },
                drawSmoke: function (ctx, ts) {
                    var self = this;
                    ['power'].forEach(function (id, group) {
                        if ((self.derived.levels[id] || 0) <= 0) return;
                        var cfg = FC_BUILDINGS[id], p = self.screenForCell(cfg.cell[0], cfg.cell[1]);
                        var z = self._zoom, baseX = p.x + (group ? 22 : -18) * z, baseY = p.y - 108 * z;
                        ctx.save();
                        for (var i = 0; i < 3; i++) {
                            var travel = self.reducedMotion ? i * 9 : (((ts || 0) / 34 + i * 18) % 54);
                            ctx.fillStyle = self.themeKit.scene.smoke;
                            ctx.beginPath();
                            ctx.arc(baseX + Math.sin(i * 2.4 + (ts || 0) / 900) * 5 * z, baseY - travel * z, (5 + i * 2 + travel * 0.07) * z, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.restore();
                    });
                },
                drawBadge: function (ctx, id, p, ts) {
                    var next = this.nextUpgradeFor(id);
                    if (!next) return;
                    var z = this._zoom;
                    var affordable = this.money >= next.cost;
                    var pulse = (this.reducedMotion || !affordable) ? 1 : (0.8 + 0.2 * Math.sin((ts || 0) / 260));
                    var rad = 13 * z * pulse;
                    var cy = p.y - FC_TW * FC_BUILD_SCALE * this._zoom * 0.62;
                    ctx.save();
                    ctx.beginPath(); ctx.arc(p.x, cy, rad, 0, Math.PI * 2);
                    ctx.fillStyle = affordable ? '#f5b02c' : 'rgba(150,165,180,0.9)';
                    ctx.fill();
                    ctx.lineWidth = 2 * z; ctx.strokeStyle = '#fff'; ctx.stroke();
                    ctx.fillStyle = affordable ? '#3d2800' : '#eef3f7'; ctx.font = 'bold ' + Math.round(17 * z) + 'px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText('↑', p.x, cy + 1);
                    ctx.restore();
                }
            },
            watch: {
                displayMoney: function (nv, ov) {
                    if (nv > ov) {
                        this.moneyPop = true;
                        var self = this;
                        clearTimeout(this._moneyTimer);
                        this._moneyTimer = setTimeout(function () { self.moneyPop = false; }, 240);
                    }
                }
            },
            mounted: function () {
                this._destroyed = false;
                this._media = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
                this.reducedMotion = !!(this._media && this._media.matches);
                var self = this;
                this._onMotionChange = function (event) { self.reducedMotion = !!event.matches; };
                if (this._media) {
                    if (typeof this._media.addEventListener === 'function') this._media.addEventListener('change', this._onMotionChange);
                    else if (typeof this._media.addListener === 'function') this._media.addListener(this._onMotionChange);
                }
                this.$nextTick(function () { self.initRenderer(); self.startIncome(); });
            },
            beforeDestroy: function () {
                this._questionToken = (this._questionToken || 0) + 1;
                this._destroyed = true;
                this.phase = 'destroyed';
                if (this._raf) cancelAnimationFrame(this._raf);
                clearInterval(this._incomeTimer);
                clearTimeout(this._quizTimer);
                clearTimeout(this._moneyTimer);
                clearTimeout(this._deliveryTimer);
                if (this._onResize) window.removeEventListener('resize', this._onResize);
                if (this._onVisibility) document.removeEventListener('visibilitychange', this._onVisibility);
                if (this._media && this._onMotionChange) {
                    if (typeof this._media.removeEventListener === 'function') this._media.removeEventListener('change', this._onMotionChange);
                    else if (typeof this._media.removeListener === 'function') this._media.removeListener(this._onMotionChange);
                }
                var canvas = this.$refs.stage;
                if (canvas && this._pointerHandlers) {
                    canvas.removeEventListener('pointerdown', this._pointerHandlers.down);
                    canvas.removeEventListener('pointermove', this._pointerHandlers.move);
                    canvas.removeEventListener('pointerup', this._pointerHandlers.up);
                    canvas.removeEventListener('pointercancel', this._pointerHandlers.up);
                    canvas.removeEventListener('wheel', this._pointerHandlers.wheel);
                }
                this.saveMoney();
                this.saveGoods();
                if (this.pendingUpgrade) this.resolveUpgradeChoice(false);
            }
        }));
    }

    global.FC_BUILDINGS = FC_BUILDINGS;
    global.FC_BUILDING_ORDER = FC_BUILDING_ORDER;
    global.validateFactoryCityUpgrades = validateFactoryCityUpgrades;
    global.deriveCityState = deriveCityState;
    global.computeCityIncome = computeCityIncome;
    global.computeCityEconomy = computeCityEconomy;
    global.runCityCycle = runCityCycle;
    global.resolveCityQuiz = resolveCityQuiz;
    global.resolveFactoryCityTheme = resolveFactoryCityTheme;
    global.canFactoryCityTransition = canFactoryCityTransition;
    global.FC_QUIZ_DELAYS = FC_QUIZ_DELAYS;
    global.createFactoryCityComponent = createFactoryCityComponent;
})(typeof window !== 'undefined' ? window : globalThis);
