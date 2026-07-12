(function (global) {
    'use strict';

    // ---------------------------------------------------------------------
    // Configuration: the tech tree lives in DATA.FACTORY_UPGRADES (data.js).
    // Each purchased item bumps one "machine" key to a level; the factory's
    // entire visual state is derived from that, not stored separately, so it
    // always matches what the learning engine actually unlocked.
    // ---------------------------------------------------------------------

    const FT_DEFAULT_MACHINES = {
        sawmill: 1, workshop: 0, packaging: 0,
        conveyor1: 0, conveyor2: 0,
        worker1: 0, worker2: 0, worker3: 0,
        storage: 0, sign: 0,
    };
    const FT_KNOWN_MACHINES = Object.keys(FT_DEFAULT_MACHINES);
    const FT_KINDS = ['upgrade', 'build', 'hire', 'decorate'];

    const FT_ANCHORS = {
        sawmill: {x: 86, y: 58},
        workshop: {x: 58, y: 58},
        packaging: {x: 30, y: 58},
        ship: {x: 9, y: 62},
        conveyor1: {x: 72, y: 68},
        conveyor2: {x: 44, y: 68},
        worker1: {x: 95, y: 88},
        worker2: {x: 95, y: 88},
        worker3: {x: 95, y: 88},
        storage: {x: 17, y: 24},
        sign: {x: 70, y: 10},
    };

    const FT_THEME_MOTIFS = {
        base: {sceneName: 'מפעל הצעצועים', resource: '#c9843f', glow: '#ffcf7a'},
        soldiers: {sceneName: 'מפעל האספקה', resource: '#8f9a5e', glow: '#ffd700'},
        unicorn: {sceneName: 'מפעל הקסמים', resource: '#ef7fce', glow: '#ffe37a'},
        space: {sceneName: 'תחנת ההרכבה החללית', resource: '#4fb8ff', glow: '#ffd700'},
        dark: {sceneName: 'היציקה האפלה', resource: '#b58cf0', glow: '#7ee0c4'},
        code: {sceneName: 'חוות השרתים', resource: '#39ff14', glow: '#00ff41'},
    };

    const FT_DARK_KEYS = ['space', 'dark', 'code'];

    function validateFactoryUpgrades(list) {
        const errors = [];
        if (!Array.isArray(list) || !list.length) {
            return ['factory upgrade list must be a non-empty array'];
        }
        list.forEach((item, index) => {
            if (!item || !item.name || typeof item.name.value !== 'string' || !item.name.value.trim()) {
                errors.push(`item ${index} needs a name.value`);
            }
            if (!FT_KNOWN_MACHINES.includes(item && item.machine)) {
                errors.push(`item ${index} has unknown machine "${item && item.machine}"`);
            }
            if (!FT_KINDS.includes(item && item.kind)) {
                errors.push(`item ${index} has unknown kind "${item && item.kind}"`);
            }
            if (!(Number(item && item.level) > 0)) {
                errors.push(`item ${index} needs a positive level`);
            }
            if (!(Number(item && item.cost) > 0)) {
                errors.push(`item ${index} needs a positive cost`);
            }
        });
        return errors;
    }

    // Pure: visual/economic state is always rebuilt from the permanent
    // "purchased" record, never from the learning engine's weights — weights
    // get reset to 5 for spaced-repetition replay once a batch is mastered,
    // which must not un-build machines the player already earned.
    function deriveFactoryState(list, purchasedIndices) {
        const machines = Object.assign({}, FT_DEFAULT_MACHINES);
        (purchasedIndices || []).forEach(index => {
            const item = list[index];
            if (!item || !item.machine) return;
            machines[item.machine] = Math.max(machines[item.machine] || 0, Number(item.level) || 1);
        });
        const workersHired = ['worker1', 'worker2', 'worker3'].filter(key => machines[key] > 0).length;
        return {
            machines: machines,
            workersHired: workersHired,
            conveyor1: machines.conveyor1 > 0,
            conveyor2: machines.conveyor2 > 0,
            storageBuilt: machines.storage > 0,
            signBuilt: machines.sign > 0,
            workshopBuilt: machines.workshop > 0,
            packagingBuilt: machines.packaging > 0,
            sawmillLevel: machines.sawmill,
            workshopLevel: machines.workshop,
            packagingLevel: machines.packaging,
        };
    }

    function ftHexAlpha(hex, alpha) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
        const value = parseInt(hex.slice(1), 16);
        return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
    }

    function resolveFactoryTheme() {
        const requested = typeof getLocalStorage === 'function' ? getLocalStorage('theme', 'base') : 'base';
        const key = FT_THEME_MOTIFS[requested] && typeof themeOptions !== 'undefined' && themeOptions[requested]
            ? requested : 'base';
        const palette = typeof themeOptions !== 'undefined' && themeOptions[key]
            ? themeOptions[key].colors
            : {primary: '#006064', secondary: '#78909c', tertiary: '#B0E0E6', accent: '#C0C0C0', background: '#F5F5F5', text: '#000000'};
        const motif = FT_THEME_MOTIFS[key];
        const dark = FT_DARK_KEYS.indexOf(key) !== -1;
        return {
            key: key,
            motif: motif,
            dark: dark,
            css: {
                '--ft-primary': palette.primary,
                '--ft-secondary': palette.secondary,
                '--ft-tertiary': palette.tertiary,
                '--ft-accent': palette.accent,
                '--ft-bg': palette.background,
                '--ft-ink': palette.text,
                '--ft-resource': motif.resource,
                '--ft-glow': motif.glow,
                '--ft-panel': dark ? 'rgba(12, 16, 26, 0.93)' : 'rgba(255, 255, 255, 0.95)',
                '--ft-panel-ink': dark ? '#f3f3f3' : '#1c1c1c',
                '--ft-sky-a': dark ? ftHexAlpha(palette.primary, 0.9) : ftHexAlpha(palette.tertiary, 0.55),
                '--ft-sky-b': dark ? '#05070c' : palette.background,
            },
        };
    }

    // Economy tuning (kept as named constants for easy rebalancing).
    const FT_BASE_VALUE = 6;
    const FT_WORKSHOP_BONUS = level => 3 + level * 2;
    const FT_PACKAGING_BONUS = level => 5 + level * 3;
    const FT_SAWMILL_INTERVAL = level => Math.max(650, 2400 - (level - 1) * 500);
    const FT_LEG_DURATION = 1050;
    const FT_PROCESS_PAUSE = 420;
    const FT_MAX_ITEMS = 7;

    function createFactoryTycoonComponent(BaseGameComponent) {
        return Vue.component('factory-tycoon', Vue.extend({
            extends: BaseGameComponent,

            template: `
            <div ref="root" class="ft-game" :class="['ft-theme-' + ftTheme.key, {'ft-reduced': reducedMotion, 'ft-dark': ftTheme.dark}]" :style="ftTheme.css" dir="rtl">
              <div class="ft-sky" aria-hidden="true"></div>
              <div class="ft-vignette" aria-hidden="true"></div>

              <header class="ft-hud">
                <button class="ft-round-btn" type="button" @click="exitGame" aria-label="יציאה">←</button>
                <div class="ft-hud-center">
                  <div class="ft-scene-name">{{ ftTheme.motif.sceneName }}</div>
                  <div class="ft-learning-gauge" v-if="progress">
                    <i :style="{width: learningPercent + '%'}"></i>
                    <b>{{ progress.progress }} / {{ progress.total }}</b>
                  </div>
                </div>
                <div class="ft-money" aria-live="off">
                  <svg class="ft-coin-icon" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" class="ft-coin-body"></circle>
                    <circle cx="12" cy="12" r="6.4" class="ft-coin-core"></circle>
                  </svg>
                  <span class="ft-money-value" :class="{'ft-money-pop': moneyPop}">{{ displayMoney }}</span>
                </div>
                <button class="ft-round-btn" type="button" @click="toggleFullscreen" aria-label="מסך מלא">⛶</button>
              </header>

              <div class="ft-viewport" ref="viewport"
                   @pointerdown="startPan" @pointermove="movePan" @pointerup="endPan" @pointerleave="endPan" @pointercancel="endPan">
                <div class="ft-camera" :style="cameraStyle">
                  <div class="ft-track">

                    <div class="ft-ground" aria-hidden="true"></div>

                    <div v-if="derived.signBuilt" class="ft-sign" :style="anchorStyle('sign')" aria-hidden="true">
                      <svg viewBox="0 0 140 44">
                        <rect x="2" y="2" width="136" height="36" rx="8" class="ft-sign-plate"></rect>
                        <text x="70" y="26" text-anchor="middle" class="ft-sign-text">{{ ftTheme.motif.sceneName }}</text>
                      </svg>
                    </div>

                    <div v-if="derived.storageBuilt" class="ft-storage" :style="anchorStyle('storage')" aria-hidden="true">
                      <svg viewBox="0 0 80 100">
                        <rect x="10" y="20" width="60" height="70" rx="10" class="ft-storage-body"></rect>
                        <ellipse cx="40" cy="20" rx="30" ry="10" class="ft-storage-cap"></ellipse>
                        <rect x="18" y="55" width="44" height="8" rx="3" class="ft-storage-band"></rect>
                      </svg>
                    </div>

                    <div class="ft-belt" v-if="derived.conveyor1" :style="beltStyle('conveyor1')" aria-hidden="true"></div>
                    <div class="ft-belt" v-if="derived.conveyor2" :style="beltStyle('conveyor2')" aria-hidden="true"></div>
                    <div class="ft-path-line" :style="pathLineStyle()" aria-hidden="true"></div>

                    <div class="ft-machine ft-machine-sawmill" :class="'ft-lvl-' + derived.sawmillLevel" :style="anchorStyle('sawmill')" aria-hidden="true">
                      <svg viewBox="0 0 120 120">
                        <rect x="8" y="52" width="104" height="56" rx="12" class="ft-body"></rect>
                        <rect x="26" y="30" width="26" height="26" rx="4" class="ft-hopper"></rect>
                        <g class="ft-blade-group" :class="{'ft-spin': ftActive.sawmill}">
                          <circle cx="76" cy="54" r="24" class="ft-blade-ring"></circle>
                          <g class="ft-blade-teeth">
                            <polygon v-for="n in 8" :key="n" :points="bladeTooth(n)" class="ft-blade-tooth"></polygon>
                          </g>
                          <circle cx="76" cy="54" r="7" class="ft-blade-hub"></circle>
                        </g>
                        <rect v-if="derived.sawmillLevel > 2" x="14" y="16" width="10" height="20" rx="3" class="ft-chimney"></rect>
                        <circle v-for="n in derived.sawmillLevel" :key="'lp'+n" :cx="20 + (n-1)*10" cy="100" r="3" class="ft-level-pip"></circle>
                      </svg>
                      <div class="ft-smoke-wrap" v-if="derived.sawmillLevel > 2">
                        <i v-for="n in 3" :key="n" class="ft-smoke" :class="'ft-smoke-' + n"></i>
                      </div>
                    </div>

                    <div class="ft-machine ft-machine-workshop" v-if="derived.workshopBuilt" :class="'ft-lvl-' + derived.workshopLevel" :style="anchorStyle('workshop')" aria-hidden="true">
                      <svg viewBox="0 0 120 120">
                        <rect x="8" y="46" width="104" height="62" rx="12" class="ft-body"></rect>
                        <rect x="40" y="70" width="40" height="24" rx="4" class="ft-slot"></rect>
                        <g class="ft-arm-group" :class="{'ft-swing': ftActive.workshop}">
                          <rect x="56" y="14" width="8" height="34" rx="4" class="ft-arm-post"></rect>
                          <circle cx="60" cy="14" r="9" class="ft-arm-hand"></circle>
                        </g>
                        <circle v-for="n in derived.workshopLevel" :key="'wp'+n" :cx="20 + (n-1)*10" cy="102" r="3" class="ft-level-pip"></circle>
                      </svg>
                    </div>

                    <div class="ft-machine ft-machine-packaging" v-if="derived.packagingBuilt" :class="'ft-lvl-' + derived.packagingLevel" :style="anchorStyle('packaging')" aria-hidden="true">
                      <svg viewBox="0 0 120 120">
                        <rect x="8" y="54" width="104" height="52" rx="12" class="ft-body"></rect>
                        <rect x="42" y="58" width="36" height="26" rx="3" class="ft-box"></rect>
                        <polygon class="ft-flap ft-flap-l" :class="{'ft-flap-open': ftActive.packaging}" points="42,58 60,58 42,40"></polygon>
                        <polygon class="ft-flap ft-flap-r" :class="{'ft-flap-open': ftActive.packaging}" points="78,58 60,58 78,40"></polygon>
                        <circle v-for="n in derived.packagingLevel" :key="'pp'+n" :cx="20 + (n-1)*10" cy="100" r="3" class="ft-level-pip"></circle>
                      </svg>
                    </div>

                    <div class="ft-ship" :style="anchorStyle('ship')" aria-hidden="true">
                      <svg viewBox="0 0 100 80">
                        <rect x="8" y="30" width="70" height="40" rx="8" class="ft-truck-body"></rect>
                        <rect x="78" y="42" width="16" height="24" rx="4" class="ft-truck-cab"></rect>
                        <circle cx="26" cy="72" r="7" class="ft-wheel"></circle>
                        <circle cx="66" cy="72" r="7" class="ft-wheel"></circle>
                        <circle cx="86" cy="72" r="7" class="ft-wheel"></circle>
                      </svg>
                    </div>

                    <div class="ft-worker" v-for="n in derived.workersHired" :key="'worker'+n"
                         :class="['ft-worker-' + n, {'ft-worker-walk': !reducedMotion}]" aria-hidden="true">
                      <svg viewBox="0 0 30 46">
                        <circle cx="15" cy="8" r="7" class="ft-worker-head"></circle>
                        <rect x="7" y="16" width="16" height="18" rx="6" class="ft-worker-body"></rect>
                        <rect class="ft-worker-leg ft-worker-leg-a" x="8" y="33" width="6" height="12" rx="3"></rect>
                        <rect class="ft-worker-leg ft-worker-leg-b" x="16" y="33" width="6" height="12" rx="3"></rect>
                      </svg>
                    </div>

                    <div class="ft-resource" v-for="item in items" :key="item.id"
                         :class="'ft-resource-' + item.stageKind"
                         :style="resourceStyle(item)" aria-hidden="true">
                      <svg viewBox="0 0 26 26">
                        <rect x="3" y="3" width="20" height="20" rx="5" class="ft-resource-shape"></rect>
                      </svg>
                    </div>

                    <div class="ft-coin-particle" v-for="coin in coins" :key="coin.id" :style="coinStyle(coin)" aria-hidden="true">
                      <svg viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" class="ft-coin-body"></circle></svg>
                    </div>

                    <button v-for="badge in badges" :key="'badge'+badge.index" type="button"
                            class="ft-badge" :class="{'ft-badge-ready': badge.affordable, 'ft-badge-saving': !badge.affordable}"
                            :style="anchorStyle(badge.item.machine)"
                            :disabled="!badge.affordable"
                            @click="attemptUpgrade(badge.index)"
                            :aria-label="badge.affordable ? ('שדרוג זמין: ' + badge.item.name.value) : ('חוסכים למשדרג: ' + badge.item.name.value)">
                      <svg viewBox="0 0 24 24" class="ft-badge-icon" aria-hidden="true">
                        <path d="M12 2 L14.5 8.5 L21 9.3 L16 13.8 L17.5 20.3 L12 16.8 L6.5 20.3 L8 13.8 L3 9.3 L9.5 8.5 Z"></path>
                      </svg>
                      <span v-if="!badge.affordable" class="ft-badge-cost">{{ badge.item.cost }}</span>
                    </button>

                  </div>
                </div>
              </div>

              <div class="ft-zoom">
                <button type="button" class="ft-round-btn ft-zoom-btn" @click="zoomBy(-0.2)" aria-label="התרחק">－</button>
                <button type="button" class="ft-round-btn ft-zoom-btn" @click="zoomBy(0.2)" aria-label="התקרב">＋</button>
              </div>

              <div class="ft-score-row"><span class="ft-score">{{ score }}</span></div>
              <progress-bar :title="'שלב נוכחי'" :progress="progress" :theme="theme"></progress-bar>

              <div class="ft-sr-live" aria-live="polite">{{ liveAnnouncement }}</div>

              <div v-if="pendingUpgrade" class="ft-modal-scrim" @click.self="resolveUpgradeChoice(false)">
                <section class="ft-modal" role="dialog" aria-modal="true" :aria-label="pendingUpgrade.name.value">
                  <div class="ft-modal-icon">
                    <svg viewBox="0 0 24 24"><path d="M12 2 L14.5 8.5 L21 9.3 L16 13.8 L17.5 20.3 L12 16.8 L6.5 20.3 L8 13.8 L3 9.3 L9.5 8.5 Z"></path></svg>
                  </div>
                  <h2 class="ft-modal-title">{{ pendingUpgrade.name.value }}?</h2>
                  <p class="ft-modal-detail">{{ pendingUpgrade.detail && pendingUpgrade.detail.value }}</p>
                  <div class="ft-modal-cost">
                    <svg viewBox="0 0 24 24" class="ft-coin-icon-sm"><circle cx="12" cy="12" r="10" class="ft-coin-body"></circle></svg>
                    <span>{{ pendingUpgrade.cost }}</span>
                  </div>
                  <div class="ft-modal-actions">
                    <button type="button" class="ft-modal-btn ft-modal-cancel" @click="resolveUpgradeChoice(false)">ביטול</button>
                    <button ref="confirmBtn" type="button" class="ft-modal-btn ft-modal-confirm" @click="resolveUpgradeChoice(true)">שדרג</button>
                  </div>
                </section>
              </div>
            </div>`,

            data: function () {
                return {
                    ftTheme: resolveFactoryTheme(),
                    weights: [],
                    purchasedMap: {},
                    money: 0,
                    moneyPop: false,
                    items: [],
                    coins: [],
                    ftActive: {sawmill: false, workshop: false, packaging: false},
                    pendingUpgrade: null,
                    liveAnnouncement: '',
                    reducedMotion: false,
                    zoom: 1,
                    pan: {x: 0, y: 0},
                    dragging: false,
                    dragStart: null,
                };
            },

            computed: {
                list: function () {
                    return getDataList(this.currentApp.listName);
                },
                derived: function () {
                    const purchased = Object.keys(this.purchasedMap).filter(key => this.purchasedMap[key]).map(Number);
                    return deriveFactoryState(this.list, purchased);
                },
                badges: function () {
                    const result = [];
                    for (let index = 0; index < this.weights.length; index += 1) {
                        if (this.weights[index] > 0 && !this.purchasedMap[index]) {
                            const item = this.list[index];
                            if (item) result.push({index: index, item: item, affordable: this.money >= item.cost});
                        }
                    }
                    return result;
                },
                learningPercent: function () {
                    if (!this.progress || !this.progress.total) return 0;
                    return Math.max(0, Math.min(100, Math.round((this.progress.progress / this.progress.total) * 100)));
                },
                displayMoney: function () {
                    return Math.floor(this.money);
                },
                cameraStyle: function () {
                    return {transform: `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`};
                },
            },

            methods: {
                storageKey: function (suffix) {
                    return `${this.currentAppId}_ft_${suffix}`;
                },
                anchorStyle: function (machineKey) {
                    const anchor = FT_ANCHORS[machineKey] || {x: 50, y: 50};
                    return {left: anchor.x + '%', top: anchor.y + '%'};
                },
                beltStyle: function (key) {
                    const from = key === 'conveyor1' ? FT_ANCHORS.sawmill.x : FT_ANCHORS.workshop.x;
                    const to = key === 'conveyor1' ? FT_ANCHORS.workshop.x : FT_ANCHORS.packaging.x;
                    return {left: to + '%', width: (from - to) + '%', top: FT_ANCHORS[key].y + '%'};
                },
                pathLineStyle: function () {
                    return {left: FT_ANCHORS.ship.x + '%', width: (FT_ANCHORS.sawmill.x - FT_ANCHORS.ship.x) + '%'};
                },
                bladeTooth: function (n) {
                    const angle = (n / 8) * Math.PI * 2;
                    const cx = 76, cy = 54, rInner = 20, rOuter = 27;
                    const x1 = cx + Math.cos(angle) * rInner, y1 = cy + Math.sin(angle) * rInner;
                    const x2 = cx + Math.cos(angle + 0.18) * rOuter, y2 = cy + Math.sin(angle + 0.18) * rOuter;
                    const x3 = cx + Math.cos(angle - 0.18) * rOuter, y3 = cy + Math.sin(angle - 0.18) * rOuter;
                    return `${x1},${y1} ${x2},${y2} ${x3},${y3}`;
                },
                resourceStyle: function (item) {
                    return {left: item.x + '%', top: item.y + '%', opacity: item.visible ? 1 : 0};
                },
                coinStyle: function (coin) {
                    return {left: coin.x + '%', top: coin.y + '%', opacity: coin.opacity};
                },

                loadMoney: function () {
                    this.money = Number(getLocalStorage(this.storageKey('money'), 0)) || 0;
                },
                saveMoney: function () {
                    setLocalStorage(this.storageKey('money'), this.money);
                },
                loadPurchased: function () {
                    const stored = getLocalStorage(this.storageKey('purchased'), []);
                    const map = {};
                    (stored || []).forEach(index => { map[index] = true; });
                    this.purchasedMap = map;
                },
                savePurchased: function () {
                    setLocalStorage(this.storageKey('purchased'), Object.keys(this.purchasedMap).filter(key => this.purchasedMap[key]).map(Number));
                },

                later: function (callback, delay) {
                    const token = this._runTokenFt;
                    const timer = setTimeout(() => {
                        this._timersFt.delete(timer);
                        if (!this._destroyedFt && token === this._runTokenFt && this.isCurrentRoute()) callback();
                    }, this.reducedMotion ? Math.min(delay, 140) : delay);
                    this._timersFt.add(timer);
                    return timer;
                },
                isCurrentRoute: function () {
                    return this.$route && this.$route.params.currentAppId === this.currentAppId
                        && this.$route.path.indexOf('/play/factory_tycoon/') === 0;
                },
                clearTimersFt: function () {
                    this._timersFt.forEach(timer => clearTimeout(timer));
                    this._timersFt.clear();
                },

                create: function () {
                    this.ftTheme = resolveFactoryTheme();
                    this.loadMoney();
                    this.loadPurchased();
                    this.weights = getWeightsForKey(this.currentAppId, getSetItems(this.currentApp), this.list);
                    this.items = [];
                    this.coins = [];
                    this._runTokenFt = (this._runTokenFt || 0) + 1;
                    // create() runs before mount (BaseGameComponent.created()), but the
                    // timer/RAF registries are only set up in mounted() — defer the loop
                    // kick-off past that point, same as games/water-pipeline.js.
                    this.$nextTick(() => {
                        if (this._destroyedFt || !this.isCurrentRoute()) return;
                        this.startSawmillLoop();
                    });
                },

                startSawmillLoop: function () {
                    // Self-invalidating timeout chain (not setInterval): each cycle reads
                    // the current sawmill level, so an upgrade speeds up the very next
                    // tick without ever creating a second parallel loop.
                    this.scheduleSawmillTick();
                },
                scheduleSawmillTick: function () {
                    const token = this._runTokenFt;
                    const delay = FT_SAWMILL_INTERVAL(this.derived.sawmillLevel);
                    const timer = setTimeout(() => {
                        this._timersFt.delete(timer);
                        if (this._destroyedFt || token !== this._runTokenFt || !this.isCurrentRoute()) return;
                        this.spawnResource();
                        this.scheduleSawmillTick();
                    }, delay);
                    this._timersFt.add(timer);
                },

                pulse: function (key) {
                    this.$set(this.ftActive, key, true);
                    this.later(() => { this.$set(this.ftActive, key, false); }, FT_PROCESS_PAUSE - 40);
                },

                speedFactor: function () {
                    return this.reducedMotion ? 0.2 : Math.max(0.55, 1 - this.derived.workersHired * 0.07);
                },

                spawnResource: function () {
                    if (this.items.length >= FT_MAX_ITEMS) return;
                    const item = {
                        id: 'r' + (this._itemSeqFt = (this._itemSeqFt || 0) + 1),
                        x: FT_ANCHORS.sawmill.x,
                        y: FT_ANCHORS.sawmill.y,
                        visible: true,
                        stageKind: 'raw',
                        value: FT_BASE_VALUE,
                    };
                    this.items.push(item);
                    this.pulse('sawmill');
                    this.runLeg(item, this.derived.workshopBuilt ? 'workshop' : (this.derived.packagingBuilt ? 'packaging' : 'ship'));
                },

                raf: function (callback) {
                    const handle = requestAnimationFrame(() => {
                        this._rafSetFt.delete(handle);
                        callback();
                    });
                    this._rafSetFt.add(handle);
                    return handle;
                },

                runLeg: function (item, targetKey) {
                    const from = FT_ANCHORS[item._at || 'sawmill'] || FT_ANCHORS.sawmill;
                    const to = FT_ANCHORS[targetKey];
                    const duration = FT_LEG_DURATION * this.speedFactor();
                    const start = Date.now();
                    const token = this._runTokenFt;
                    const step = () => {
                        if (this._destroyedFt || token !== this._runTokenFt || !this.isCurrentRoute()) return;
                        const raw = Math.min(1, (Date.now() - start) / duration);
                        const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
                        item.x = from.x + (to.x - from.x) * eased;
                        item.y = from.y + (to.y - from.y) * eased;
                        if (raw < 1) {
                            this.raf(step);
                        } else {
                            item._at = targetKey;
                            this.arriveAtStation(item, targetKey);
                        }
                    };
                    this.raf(step);
                },

                arriveAtStation: function (item, key) {
                    if (key === 'workshop') {
                        item.stageKind = 'processed-a';
                        item.value += FT_WORKSHOP_BONUS(this.derived.workshopLevel);
                        this.pulse('workshop');
                        this.later(() => this.runLeg(item, this.derived.packagingBuilt ? 'packaging' : 'ship'), FT_PROCESS_PAUSE);
                    } else if (key === 'packaging') {
                        item.stageKind = 'processed-b';
                        item.value += FT_PACKAGING_BONUS(this.derived.packagingLevel);
                        this.pulse('packaging');
                        this.later(() => this.runLeg(item, 'ship'), FT_PROCESS_PAUSE);
                    } else {
                        this.shipItem(item);
                    }
                },

                shipItem: function (item) {
                    item.visible = false;
                    this.items = this.items.filter(candidate => candidate.id !== item.id);
                    this.money += item.value;
                    this.moneyPop = true;
                    this.later(() => { this.moneyPop = false; }, 260);
                    this.saveMoney();
                    this.spawnCoin();
                },

                spawnCoin: function () {
                    const coin = {id: 'c' + (this._coinSeqFt = (this._coinSeqFt || 0) + 1), x: FT_ANCHORS.ship.x, y: FT_ANCHORS.ship.y, opacity: 1};
                    this.coins.push(coin);
                    const duration = this.reducedMotion ? 160 : 620;
                    const start = Date.now();
                    const token = this._runTokenFt;
                    const step = () => {
                        if (this._destroyedFt || token !== this._runTokenFt) return;
                        const raw = Math.min(1, (Date.now() - start) / duration);
                        coin.x = FT_ANCHORS.ship.x + (2 - FT_ANCHORS.ship.x) * raw;
                        coin.y = FT_ANCHORS.ship.y - raw * 40;
                        coin.opacity = 1 - raw;
                        if (raw < 1) {
                            this.raf(step);
                        } else {
                            this.coins = this.coins.filter(candidate => candidate.id !== coin.id);
                        }
                    };
                    this.raf(step);
                },

                confirmUpgrade: function (item) {
                    // Sole gate for every upgrade in the game. Swap this method's body
                    // for a real question/quiz gate later; every caller stays the same.
                    return new Promise(resolve => {
                        this.pendingUpgrade = item;
                        this._resolveUpgradeFt = resolve;
                        this.$nextTick(() => {
                            if (this.$refs.confirmBtn) this.$refs.confirmBtn.focus();
                        });
                    });
                },
                resolveUpgradeChoice: function (accepted) {
                    if (!this.pendingUpgrade) return;
                    const resolve = this._resolveUpgradeFt;
                    this.pendingUpgrade = null;
                    this._resolveUpgradeFt = null;
                    if (resolve) resolve(accepted);
                },

                attemptUpgrade: async function (index) {
                    if (this._upgradeBusyFt || this.pendingUpgrade) return;
                    const item = this.list[index];
                    if (!item || this.weights[index] <= 0 || this.purchasedMap[index]) return;
                    if (this.money < item.cost) return;
                    this._upgradeBusyFt = true;
                    let accepted = false;
                    try {
                        accepted = await this.confirmUpgrade(item);
                    } finally {
                        this._upgradeBusyFt = false;
                    }
                    if (this._destroyedFt || !this.isCurrentRoute() || !accepted) return;

                    this.money -= item.cost;
                    this.saveMoney();
                    this.$set(this.purchasedMap, index, true);
                    this.savePurchased();
                    this.liveAnnouncement = `שודרג: ${item.name.value}`;
                    try { successSound.play(); } catch (e) {}

                    this.weights = updateWeightForKey(this.currentAppId, index, -15);
                    this.score += 1;
                    if (this.reloadProgress()) {
                        this.saveScore();
                    }
                },

                zoomBy: function (delta) {
                    this.zoom = Math.max(0.75, Math.min(1.6, this.zoom + delta));
                },
                startPan: function (event) {
                    this.dragging = true;
                    this.dragStart = {x: event.clientX - this.pan.x, y: event.clientY - this.pan.y};
                },
                movePan: function (event) {
                    if (!this.dragging || !this.dragStart) return;
                    const maxPan = 140 * this.zoom;
                    this.pan = {
                        x: Math.max(-maxPan, Math.min(maxPan, event.clientX - this.dragStart.x)),
                        y: Math.max(-60, Math.min(60, event.clientY - this.dragStart.y)),
                    };
                },
                endPan: function () {
                    this.dragging = false;
                    this.dragStart = null;
                },

                toggleFullscreen: function () {
                    const root = this.$refs.root;
                    if (!root) return;
                    if (document.fullscreenElement || document.webkitFullscreenElement) {
                        const exit = document.exitFullscreen || document.webkitExitFullscreen;
                        if (exit) exit.call(document);
                    } else {
                        const request = root.requestFullscreen || root.webkitRequestFullscreen;
                        if (request) {
                            const result = request.call(root);
                            if (result && result.catch) result.catch(() => {});
                        }
                    }
                },
                exitGame: function () {
                    if (typeof parseAdventureId === 'function') {
                        const parsed = parseAdventureId(this.currentAppId);
                        if (parsed) {
                            this.$router.push('/adventure/world/' + parsed.world.id);
                            return;
                        }
                    }
                    this.$router.push('/app/' + this.currentAppId);
                },
            },

            mounted: function () {
                this._destroyedFt = false;
                this._timersFt = new Set();
                this._rafSetFt = new Set();
                this._runTokenFt = (this._runTokenFt || 0) + 1;
                this._mediaFt = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
                this.reducedMotion = !!(this._mediaFt && this._mediaFt.matches);
            },

            beforeDestroy: function () {
                this._destroyedFt = true;
                this._runTokenFt = (this._runTokenFt || 0) + 1;
                this.clearTimersFt();
                if (this._rafSetFt) {
                    this._rafSetFt.forEach(handle => cancelAnimationFrame(handle));
                    this._rafSetFt.clear();
                }
                if (this.pendingUpgrade) this.resolveUpgradeChoice(false);
                if (document.fullscreenElement === this.$refs.root && document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
            },
        }));
    }

    global.FT_DEFAULT_MACHINES = FT_DEFAULT_MACHINES;
    global.FT_ANCHORS = FT_ANCHORS;
    global.validateFactoryUpgrades = validateFactoryUpgrades;
    global.deriveFactoryState = deriveFactoryState;
    global.resolveFactoryTheme = resolveFactoryTheme;
    global.createFactoryTycoonComponent = createFactoryTycoonComponent;
})(typeof window !== 'undefined' ? window : globalThis);
