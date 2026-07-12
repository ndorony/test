(function (global) {
    'use strict';

    const FT_DEFAULT_MACHINES = {sawmill: 1, workshop: 1, packaging: 1, conveyor1: 1, conveyor2: 1, worker1: 1, worker2: 1, worker3: 0, storage: 1, sign: 1};
    const FT_KNOWN_MACHINES = Object.keys(FT_DEFAULT_MACHINES);
    const FT_KINDS = ['upgrade', 'build', 'hire', 'decorate'];
    const FT_WORLD = {width: 1120, height: 700};
    const FT_STATIONS = {
        storage: {x: 106, y: 454}, sawmill: {x: 286, y: 410}, belt1Start: {x: 374, y: 442}, belt1End: {x: 550, y: 442},
        workshop: {x: 616, y: 394}, belt2Start: {x: 696, y: 442}, belt2End: {x: 850, y: 442}, packaging: {x: 892, y: 398},
        table: {x: 956, y: 528}, truck: {x: 178, y: 578}, goods: {x: 730, y: 578}, workerHome1: {x: 1010, y: 600}, workerHome2: {x: 875, y: 610}
    };
    const FT_THEME_MOTIFS = {
        base: {sceneName: 'מפעל הצעצועים', product: 'צעצועי עץ', resource: '#b87936', glow: '#ffd36a'},
        soldiers: {sceneName: 'מפעל האספקה', product: 'ארגזי ציוד', resource: '#87915b', glow: '#ffe173'},
        unicorn: {sceneName: 'מפעל הקסמים', product: 'קופסאות קסם', resource: '#e77ed1', glow: '#fff08a'},
        space: {sceneName: 'תחנת הרכבה', product: 'מודולים חלליים', resource: '#58c7ff', glow: '#ffd86a'},
        dark: {sceneName: 'היציקה האפלה', product: 'אבני כוח', resource: '#9d7bf1', glow: '#88f0cf'},
        code: {sceneName: 'חוות השרתים', product: 'שרתים ארוזים', resource: '#39ff14', glow: '#7dff96'}
    };
    const FT_DARK_KEYS = ['space', 'dark', 'code'];
    const FT_BASE_VALUE = 8;
    const FT_MAX_ITEMS = 9;
    const FT_BASE_CYCLE = 2300;

    function validateFactoryUpgrades(list) {
        const errors = [];
        if (!Array.isArray(list) || !list.length) return ['factory upgrade list must be a non-empty array'];
        list.forEach((item, index) => {
            if (!item || !item.name || typeof item.name.value !== 'string' || !item.name.value.trim()) errors.push(`item ${index} needs a name.value`);
            if (!FT_KNOWN_MACHINES.includes(item && item.machine)) errors.push(`item ${index} has unknown machine "${item && item.machine}"`);
            if (!FT_KINDS.includes(item && item.kind)) errors.push(`item ${index} has unknown kind "${item && item.kind}"`);
            if (!(Number(item && item.level) > 0)) errors.push(`item ${index} needs a positive level`);
            if (!(Number(item && item.cost) > 0)) errors.push(`item ${index} needs a positive cost`);
        });
        return errors;
    }
    function deriveFactoryState(list, purchasedIndices) {
        const machines = Object.assign({}, FT_DEFAULT_MACHINES);
        (purchasedIndices || []).forEach(index => {
            const item = list[index]; if (!item || !item.machine) return;
            machines[item.machine] = Math.max(machines[item.machine] || 0, Number(item.level) || 1);
        });
        const workersHired = (purchasedIndices || []).filter(index => list[index] && /^worker[123]$/.test(list[index].machine)).length;
        return {machines, workersHired, conveyor1: machines.conveyor1 > 0, conveyor2: machines.conveyor2 > 0, storageBuilt: true, signBuilt: true, workshopBuilt: true, packagingBuilt: true, sawmillLevel: machines.sawmill, workshopLevel: machines.workshop, packagingLevel: machines.packaging};
    }
    function ftHexAlpha(hex, alpha) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
        const v = parseInt(hex.slice(1), 16); return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
    }
    function resolveFactoryTheme() {
        const requested = typeof getLocalStorage === 'function' ? getLocalStorage('theme', 'base') : 'base';
        const key = FT_THEME_MOTIFS[requested] && typeof themeOptions !== 'undefined' && themeOptions[requested] ? requested : 'base';
        const palette = typeof themeOptions !== 'undefined' && themeOptions[key] ? themeOptions[key].colors : {primary: '#006064', secondary: '#78909c', tertiary: '#B0E0E6', accent: '#C0C0C0', background: '#F5F5F5', text: '#000000'};
        const dark = FT_DARK_KEYS.indexOf(key) !== -1;
        return {key, motif: FT_THEME_MOTIFS[key], dark, css: {'--ft-primary': palette.primary, '--ft-secondary': palette.secondary, '--ft-tertiary': palette.tertiary, '--ft-accent': palette.accent, '--ft-bg': palette.background, '--ft-ink': palette.text, '--ft-resource': FT_THEME_MOTIFS[key].resource, '--ft-glow': FT_THEME_MOTIFS[key].glow, '--ft-panel': dark ? 'rgba(15,20,34,.94)' : 'rgba(255,255,255,.96)', '--ft-panel-ink': dark ? '#f7fbff' : '#17212b', '--ft-wall-a': dark ? ftHexAlpha(palette.primary, .55) : ftHexAlpha(palette.tertiary, .65), '--ft-wall-b': dark ? '#111827' : '#f4dcc2'}};
    }
    function getUpgradeDefinition(item) {
        const nextLevel = Number(item.level) || 1;
        const currentLevel = Math.max(0, nextLevel - 1);
        const names = {sawmill: 'מסור חומרי גלם', workshop: 'מכונת עיבוד', packaging: 'מכונת אריזה', conveyor1: 'מסוע ראשון', conveyor2: 'מסוע שני', worker1: 'עובד איסוף', worker2: 'עובד משלוח', worker3: 'עובד נוסף', storage: 'אחסון', sign: 'שלט מפעל'};
        const benefit = item.detail && item.detail.value ? item.detail.value : 'משפר את קצב ורווחיות קו הייצור';
        return {upgradeId: item.machine + '-' + nextLevel, title: item.name.value || names[item.machine] || 'שדרוג', description: benefit, currentLevel, nextLevel, cost: item.cost, benefit};
    }
    // Central upgrade approval adapter. Replace requestUpgradeApproval() with the educational
    // question engine later; all upgrade purchases call confirmUpgrade() → this service.
    const UpgradeApprovalService = {requestUpgradeApproval: function (component, definition) { return component.openUpgradeApproval(definition); }};

    function createFactoryTycoonComponent(BaseGameComponent) {
        return Vue.component('factory-tycoon', Vue.extend({
            extends: BaseGameComponent,
            template: `
            <div ref="root" class="ft-game" :class="['ft-theme-'+ftTheme.key, {'ft-dark':ftTheme.dark,'ft-reduced':reducedMotion,'ft-sheet-open':!!selectedMachine}]" :style="ftTheme.css" dir="rtl">
              <header class="ft-hud">
                <button class="ft-icon-btn" type="button" @click="exitGame" aria-label="חזרה"><svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7M9 12h11"/></svg></button>
                <div class="ft-money" aria-label="מטבעות"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M8.8 10.1c.8-2.1 5.6-2 6.4 0 .7 1.9-5.8 1.2-5.8 3.8 0 2.2 5 2.4 6.2.3"/></svg><b :class="{'ft-money-pop':moneyPop}">{{ displayMoney }}</b></div>
                <div class="ft-hud-title"><strong>{{ ftTheme.motif.sceneName }}</strong><span>{{ ftTheme.motif.product }} · {{ ppm }} לדקה</span></div>
                <button class="ft-icon-btn" type="button" @click="fitFactory" aria-label="התאם למסך"><svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg></button>
              </header>
              <main class="ft-viewport" ref="viewport" @pointerdown="startPan" @pointermove="movePan" @pointerup="endPan" @pointercancel="endPan" @pointerleave="endPan" @wheel.prevent="wheelZoom">
                <div class="ft-camera" :style="cameraStyle">
                  <section class="ft-world" :style="worldStyle" dir="ltr" @click.self="clearSelection">
                    <div class="ft-back-wall"><i v-for="n in 6" :key="'w'+n"></i></div><div class="ft-floor"></div>
                    <div class="ft-window ft-window-a"></div><div class="ft-window ft-window-b"></div>
                    <div class="ft-storage-zone" :style="posStyle('storage')"><div class="ft-pallet"><i v-for="n in 8" :key="'raw'+n"></i></div><span>RAW</span></div>
                    <button v-for="machine in machineCards" :key="machine.id" type="button" class="ft-scene-machine" :class="['ft-'+machine.id, {'is-selected':selectedMachine===machine.id,'is-working':machineActive[machine.id]}]" :style="pointStyle(machine.position)" @click.stop="selectMachine(machine.id)" :aria-label="machine.name">
                      <svg v-if="machine.id==='sawmill'" viewBox="0 0 170 150"><path class="shadow" d="M18 128h130c18 0 19-18 0-20H24c-24 0-29 20-6 20Z"/><path class="base" d="M22 72h126v52H22z"/><path class="top" d="M36 46h52l18 26H18z"/><path class="hopper" d="M26 30h54l-8 28H34z"/><g class="gear big"><circle cx="112" cy="73" r="24"/><path d="M112 43v60M82 73h60M91 52l42 42M133 52 91 94"/></g><path class="belt-mouth" d="M123 98h33v16h-33z"/><circle class="lamp" cx="143" cy="54" r="7"/></svg>
                      <svg v-else-if="machine.id==='workshop'" viewBox="0 0 170 150"><path class="shadow" d="M16 128h138c20 0 20-19 0-20H22c-24 0-30 20-6 20Z"/><path class="base" d="M26 58h118v66H26z"/><path class="top" d="M38 36h92l14 22H24z"/><path class="press" d="M72 18h30v46H72z"/><path class="press-head" d="M54 66h66v18H54z"/><g class="gear small"><circle cx="132" cy="86" r="16"/><path d="M132 66v40M112 86h40M118 72l28 28M146 72l-28 28"/></g><circle class="lamp" cx="42" cy="82" r="7"/></svg>
                      <svg v-else viewBox="0 0 170 150"><path class="shadow" d="M18 128h132c19 0 20-18 0-20H24c-24 0-29 20-6 20Z"/><path class="base" d="M24 66h122v58H24z"/><path class="top" d="M38 42h80l28 24H24z"/><path class="box" d="M68 76h42v34H68z"/><path class="flap l" d="M68 76l21-20 21 20z"/><path class="door" d="M116 78h22v34h-22z"/><circle class="lamp" cx="44" cy="86" r="7"/></svg>
                      <span class="ft-machine-label">{{ machine.name }} · L{{ levelFor(machine.id) }}</span>
                    </button>
                    <div class="ft-conveyor ft-conveyor-a" :class="{'is-fast':derived.machines.conveyor1>1}" :style="segmentStyle('belt1Start','belt1End')"><i v-for="n in 10" :key="'a'+n"></i></div>
                    <div class="ft-conveyor ft-conveyor-b" :class="{'is-fast':derived.machines.conveyor2>1}" :style="segmentStyle('belt2Start','belt2End')"><i v-for="n in 9" :key="'b'+n"></i></div>
                    <div class="ft-table" :style="posStyle('table')"><i v-for="n in tableCount" :key="'pkg'+n"></i><span>PACK</span></div>
                    <div class="ft-goods" :style="posStyle('goods')"><i v-for="n in goodsCount" :key="'good'+n"></i></div>
                    <div class="ft-truck" :class="{'is-selling':truckActive}" :style="posStyle('truck')"><svg viewBox="0 0 210 110"><path class="truck-shadow" d="M16 100h176c20 0 20-18 0-18H22C-2 82-7 100 16 100Z"/><path class="cargo" d="M18 28h118v55H18z"/><path class="cab" d="M136 42h46l18 23v18h-64z"/><path class="glass" d="M150 49h25l10 14h-35z"/><circle cx="54" cy="87" r="14"/><circle cx="160" cy="87" r="14"/></svg></div>
                    <div v-for="product in products" :key="product.id" class="ft-product" :class="'ft-product-'+product.kind" :style="productStyle(product)"><svg viewBox="0 0 40 34"><path class="p-shadow" d="M6 31h27c6 0 6-6 0-6H8c-8 0-10 6-2 6Z"/><path class="p-body" d="M6 9h25l5 9-5 10H6z"/><path class="p-band" d="M13 9v19"/><path class="p-shine" d="M10 13h12"/></svg></div>
                    <div v-for="worker in workers" :key="worker.id" class="ft-worker" :class="{'is-carrying':worker.carrying,'is-walking':!reducedMotion}" :style="workerStyle(worker)"><svg viewBox="0 0 54 82"><path class="w-shadow" d="M9 78h35c10 0 10-8 0-8H12C0 70-3 78 9 78Z"/><circle class="head" cx="27" cy="14" r="11"/><path class="helmet" d="M15 14C17 2 37 2 39 14Z"/><path class="body" d="M16 28h22l6 25H10z"/><path class="arm a" d="M14 33 4 50"/><path class="arm b" d="M40 33 51 49"/><path class="leg a" d="M21 53 16 76"/><path class="leg b" d="M33 53 39 76"/><path v-if="worker.carrying" class="carry-box" d="M35 35h18v16H35z"/></svg></div>
                    <div v-for="coin in coins" :key="coin.id" class="ft-flying-coin" :style="coinStyle(coin)"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v10"/></svg></div>
                    <div v-for="spark in sparks" :key="spark.id" class="ft-spark" :style="sparkStyle(spark)"></div>
                  </section>
                </div>
              </main>
              <div class="ft-zoom"><button class="ft-icon-btn" type="button" @click="zoomBy(.15)" aria-label="התקרב"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><button class="ft-icon-btn" type="button" @click="zoomBy(-.15)" aria-label="התרחק"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button></div>
              <section v-if="selectedConfig" class="ft-bottom-sheet" role="region" :aria-label="selectedConfig.name"><button type="button" class="ft-sheet-close" @click="clearSelection" aria-label="סגור"></button><h2>{{ selectedConfig.name }}</h2><p>{{ selectedConfig.description }}</p><dl><div><dt>רמה</dt><dd>{{ selectedPanel.level }}</dd></div><div><dt>מהירות</dt><dd>{{ selectedPanel.speed }}</dd></div><div><dt>שווי מוצר</dt><dd>{{ selectedPanel.value }}</dd></div></dl><button type="button" class="ft-upgrade-btn" :disabled="!selectedPanel.next || money < selectedPanel.next.cost" @click="attemptUpgrade(selectedPanel.next.index)">{{ selectedPanel.next ? ('שדרוג: '+selectedPanel.next.cost) : 'מקסימום' }}</button></section>
              <div class="ft-sr-live" aria-live="polite">{{ liveAnnouncement }}</div>
              <div v-if="pendingUpgrade" class="ft-modal-scrim" @click.self="resolveUpgradeChoice(false)"><section class="ft-modal" role="dialog" aria-modal="true" :aria-label="pendingUpgrade.title"><h2>{{ pendingUpgrade.title }}</h2><p>{{ pendingUpgrade.description }}</p><dl><div><dt>רמה נוכחית</dt><dd>{{ pendingUpgrade.currentLevel }}</dd></div><div><dt>הרמה הבאה</dt><dd>{{ pendingUpgrade.nextLevel }}</dd></div><div><dt>תועלת</dt><dd>{{ pendingUpgrade.benefit }}</dd></div><div><dt>מחיר</dt><dd>{{ pendingUpgrade.cost }}</dd></div></dl><div class="ft-modal-actions"><button type="button" @click="resolveUpgradeChoice(false)">ביטול</button><button ref="confirmBtn" type="button" class="confirm" @click="resolveUpgradeChoice(true)">שדרוג</button></div></section></div>
            </div>`,
            data: function () { return {ftTheme: resolveFactoryTheme(), weights: [], purchasedMap: {}, money: 40, products: [], workers: [], coins: [], sparks: [], machineActive: {sawmill: false, workshop: false, packaging: false}, pendingUpgrade: null, selectedMachine: null, liveAnnouncement: '', reducedMotion: false, zoom: 1, pan: {x: 0, y: 0}, dragging: false, dragStart: null, truckActive: false, delivered: 0, _lastFrame: 0, _spawnClock: 0}; },
            computed: {
                list: function () { return getDataList(this.currentApp.listName); },
                derived: function () { return deriveFactoryState(this.list, Object.keys(this.purchasedMap).filter(k => this.purchasedMap[k]).map(Number)); },
                displayMoney: function () { return Math.floor(this.money); },
                ppm: function () { return Math.round(60 / (this.cycleDuration() / 1000) * this.productValue()); },
                worldStyle: function () { return {width: FT_WORLD.width + 'px', height: FT_WORLD.height + 'px'}; },
                cameraStyle: function () { return {transform: `translate3d(${this.pan.x}px, ${this.pan.y}px, 0) scale(${this.zoom})`}; },
                machineCards: function () { return [{id:'sawmill', name:'מסור חומרי גלם', description:'חותך ומכין חומר גלם לייצור.', position: FT_STATIONS.sawmill}, {id:'workshop', name:'מכונת עיבוד', description:'מעבדת את החלקים ומעלה את שווי המוצר.', position: FT_STATIONS.workshop}, {id:'packaging', name:'מכונת אריזה', description:'אורזת מוצרים לקופסאות מוכנות למשלוח.', position: FT_STATIONS.packaging}]; },
                selectedConfig: function () { return this.machineCards.find(m => m.id === this.selectedMachine); },
                selectedPanel: function () { const id = this.selectedMachine; if (!id) return {}; const next = this.nextUpgradeFor(id); return {level: this.levelFor(id), speed: Math.round(1000 / this.cycleDuration() * 10) / 10 + '/שנ׳', value: this.productValue(), next}; },
                tableCount: function () { return Math.min(4, this.products.filter(p => p.stage === 'table').length); },
                goodsCount: function () { return Math.min(8, Math.floor(this.delivered / 2)); }
            },
            methods: {
                storageKey: function (suffix) { return `${this.currentAppId}_ft_${suffix}`; },
                loadMoney: function () { const stored = Number(getLocalStorage(this.storageKey('money'), NaN)); this.money = Number.isFinite(stored) ? stored : 40; },
                saveMoney: function () { setLocalStorage(this.storageKey('money'), this.money); },
                loadPurchased: function () { const stored = getLocalStorage(this.storageKey('purchased'), []); const map = {}; (stored || []).forEach(i => { map[i] = true; }); this.purchasedMap = map; },
                savePurchased: function () { setLocalStorage(this.storageKey('purchased'), Object.keys(this.purchasedMap).filter(k => this.purchasedMap[k]).map(Number)); },
                create: function () { this.ftTheme = resolveFactoryTheme(); this.loadMoney(); this.loadPurchased(); this.weights = getWeightsForKey(this.currentAppId, getSetItems(this.currentApp), this.list); this.products = []; this.coins = []; this.sparks = []; this.$nextTick(() => { this.fitFactory(); this.startLoop(); }); },
                isCurrentRoute: function () { return this.$route && this.$route.params.currentAppId === this.currentAppId && this.$route.path.indexOf('/play/factory_tycoon/') === 0; },
                cycleDuration: function () { return Math.max(850, FT_BASE_CYCLE - (this.derived.sawmillLevel - 1) * 280 - (this.derived.workshopLevel - 1) * 120 - (this.derived.packagingLevel - 1) * 120); },
                productValue: function () { return FT_BASE_VALUE + this.derived.workshopLevel * 5 + this.derived.packagingLevel * 7; },
                levelFor: function (id) { return this.derived.machines[id] || 0; },
                pointStyle: p => ({left: p.x + 'px', top: p.y + 'px'}), posStyle: function (key) { return this.pointStyle(FT_STATIONS[key]); },
                segmentStyle: function (a, b) { const from = FT_STATIONS[a], to = FT_STATIONS[b]; return {left: from.x + 'px', top: from.y + 'px', width: (to.x - from.x) + 'px'}; },
                productStyle: function (p) { return {transform: `translate3d(${p.x}px, ${p.y}px, 0) scale(${p.scale || 1})`, opacity: p.opacity}; },
                workerStyle: function (w) { return {transform: `translate3d(${w.x}px, ${w.y}px, 0) scaleX(${w.dir || 1})`}; },
                coinStyle: function (c) { return {transform: `translate3d(${c.x}px, ${c.y}px,0) scale(${c.scale})`, opacity: c.opacity}; },
                sparkStyle: function (s) { return {left: s.x + 'px', top: s.y + 'px', opacity: s.opacity}; },
                startLoop: function () { if (this._rafFt) cancelAnimationFrame(this._rafFt); this._lastFrame = performance.now(); const step = now => { if (this._destroyedFt || !this.isCurrentRoute()) return; this.tick(Math.min(80, now - this._lastFrame)); this._lastFrame = now; this._rafFt = requestAnimationFrame(step); }; this._rafFt = requestAnimationFrame(step); },
                tick: function (dt) { this._spawnClock += dt; if (this._spawnClock >= this.cycleDuration() && this.products.length < FT_MAX_ITEMS) { this._spawnClock = 0; this.spawnProduct(); } this.updateProducts(dt); this.updateWorkers(dt); this.updateParticles(dt); },
                spawnProduct: function () { this.products.push({id:'p'+(++this._seqFt), stage:'raw', kind:'raw', x:FT_STATIONS.storage.x+38, y:FT_STATIONS.storage.y-20, opacity:1, progress:0, value:this.productValue(), scale:1}); this.pulseMachine('sawmill'); this.addSparks(FT_STATIONS.sawmill.x, FT_STATIONS.sawmill.y-50); },
                moveToward: function (obj, target, speed, dt) { const dx = target.x - obj.x, dy = target.y - obj.y, d = Math.sqrt(dx*dx+dy*dy) || 1, step = speed * dt / 1000; if (d <= step) { obj.x = target.x; obj.y = target.y; return true; } obj.x += dx/d*step; obj.y += dy/d*step; return false; },
                updateProducts: function (dt) { const speed = (95 + this.derived.machines.conveyor1 * 18 + this.derived.machines.conveyor2 * 14) * (this.reducedMotion ? 3 : 1); this.products.forEach(p => { let target = null; if (p.stage === 'raw') target = {x:FT_STATIONS.sawmill.x, y:FT_STATIONS.sawmill.y+18}; if (p.stage === 'cut') target = FT_STATIONS.belt1End; if (p.stage === 'worked') target = FT_STATIONS.belt2End; if (p.stage === 'boxed') target = FT_STATIONS.table; if (!target) return; if (this.moveToward(p, target, speed, dt)) { if (p.stage === 'raw') { p.stage='cut'; p.kind='cut'; p.x=FT_STATIONS.belt1Start.x; p.y=FT_STATIONS.belt1Start.y-28; this.pulseMachine('sawmill'); } else if (p.stage === 'cut') { p.stage='worked'; p.kind='part'; p.x=FT_STATIONS.workshop.x+20; p.y=FT_STATIONS.workshop.y+45; this.pulseMachine('workshop'); } else if (p.stage === 'worked') { p.stage='boxed'; p.kind='box'; p.x=FT_STATIONS.packaging.x+10; p.y=FT_STATIONS.packaging.y+58; this.pulseMachine('packaging'); } else if (p.stage === 'boxed') { p.stage='table'; p.x=FT_STATIONS.table.x; p.y=FT_STATIONS.table.y-44; } } }); },
                updateWorkers: function (dt) { this.workers.forEach(w => { if (!w.targetProduct) w.targetProduct = this.products.find(p => p.stage === 'table' && !p.claimed); if (w.targetProduct) { w.targetProduct.claimed = true; const target = w.carrying ? FT_STATIONS.truck : {x:w.targetProduct.x, y:w.targetProduct.y+44}; w.dir = target.x < w.x ? -1 : 1; if (this.moveToward(w, target, w.speed, dt)) { if (!w.carrying) { w.carrying = true; w.carryValue = w.targetProduct.value; this.products = this.products.filter(p => p !== w.targetProduct); } else { this.completeDelivery(w.carryValue); w.carrying = false; w.targetProduct = null; } } } else { const home = w.home; w.dir = home.x < w.x ? -1 : 1; this.moveToward(w, home, w.speed * .65, dt); } }); },
                updateParticles: function (dt) { this.coins.forEach(c => { c.life += dt; const t = Math.min(1, c.life / 650); c.x = c.sx + (c.tx-c.sx)*t; c.y = c.sy + (c.ty-c.sy)*t - Math.sin(t*Math.PI)*90; c.opacity = 1-t; c.scale = 1 + t*.4; }); this.coins = this.coins.filter(c => c.life < 650); this.sparks.forEach(s => { s.life += dt; s.opacity = 1 - s.life / 420; }); this.sparks = this.sparks.filter(s => s.life < 420); },
                pulseMachine: function (id) { this.$set(this.machineActive, id, true); this.addSparks(FT_STATIONS[id].x+25, FT_STATIONS[id].y-40); clearTimeout(this['_pulse_'+id]); this['_pulse_'+id] = setTimeout(() => this.$set(this.machineActive, id, false), 260); },
                addSparks: function (x, y) { if (this.reducedMotion) return; for (let i=0;i<4;i++) this.sparks.push({id:'s'+(++this._sparkSeqFt), x:x+(Math.random()*28-14), y:y+(Math.random()*22-11), life:0, opacity:1}); },
                completeDelivery: function (value) { this.delivered += 1; this.truckActive = true; clearTimeout(this._truckTimerFt); this._truckTimerFt = setTimeout(() => { this.truckActive = false; }, 520); this.money += value; this.saveMoney(); this.moneyPop = true; clearTimeout(this._moneyTimerFt); this._moneyTimerFt = setTimeout(() => { this.moneyPop = false; }, 240); this.coins.push({id:'c'+(++this._coinSeqFt), sx:FT_STATIONS.truck.x, sy:FT_STATIONS.truck.y-70, x:FT_STATIONS.truck.x, y:FT_STATIONS.truck.y-70, tx:40, ty:22, life:0, opacity:1, scale:1}); },
                selectMachine: function (id) { this.selectedMachine = id; }, clearSelection: function () { this.selectedMachine = null; },
                nextUpgradeFor: function (machineId) { for (let i=0;i<this.list.length;i++) { if (this.list[i] && this.list[i].machine === machineId && this.weights[i] > 0 && !this.purchasedMap[i]) return Object.assign({index:i}, this.list[i]); } return null; },
                openUpgradeApproval: function (definition) { return new Promise(resolve => { this.pendingUpgrade = definition; this._resolveUpgradeFt = resolve; this.$nextTick(() => { if (this.$refs.confirmBtn) this.$refs.confirmBtn.focus(); }); }); },
                confirmUpgrade: function (item) { return UpgradeApprovalService.requestUpgradeApproval(this, getUpgradeDefinition(item)); },
                resolveUpgradeChoice: function (accepted) { if (!this.pendingUpgrade) return; const resolve = this._resolveUpgradeFt; this.pendingUpgrade = null; this._resolveUpgradeFt = null; if (resolve) resolve(accepted); },
                attemptUpgrade: async function (index) { if (this._upgradeBusyFt || this.pendingUpgrade) return; const item = this.list[index]; if (!item || this.weights[index] <= 0 || this.purchasedMap[index] || this.money < item.cost) return; this._upgradeBusyFt = true; let accepted = false; try { accepted = await this.confirmUpgrade(item); } finally { this._upgradeBusyFt = false; } if (this._destroyedFt || !this.isCurrentRoute() || !accepted) return; this.money -= item.cost; this.saveMoney(); this.$set(this.purchasedMap, index, true); this.savePurchased(); this.liveAnnouncement = `שודרג: ${item.name.value}`; try { successSound.play(); } catch(e) {} this.weights = updateWeightForKey(this.currentAppId, index, -15); this.score += 1; if (this.reloadProgress()) this.saveScore(); },
                fitFactory: function () { const vp = this.$refs.viewport; if (!vp) return; const scale = Math.max(.38, Math.min(1.1, Math.min(vp.clientWidth / FT_WORLD.width, vp.clientHeight / FT_WORLD.height) * .98)); this.zoom = scale; this.pan = {x: Math.round((vp.clientWidth - FT_WORLD.width * scale) / 2), y: Math.round((vp.clientHeight - FT_WORLD.height * scale) / 2)}; },
                zoomBy: function (d) { this.zoom = Math.max(.38, Math.min(1.6, this.zoom + d)); }, wheelZoom: function (e) { this.zoomBy(e.deltaY > 0 ? -.08 : .08); },
                startPan: function (e) { if (e.target.closest && (e.target.closest('button') || e.target.closest('.ft-bottom-sheet'))) return; this.dragging = true; this.dragStart = {x:e.clientX-this.pan.x, y:e.clientY-this.pan.y}; if (e.currentTarget.setPointerCapture) e.currentTarget.setPointerCapture(e.pointerId); },
                movePan: function (e) { if (!this.dragging) return; this.pan = {x:e.clientX-this.dragStart.x, y:e.clientY-this.dragStart.y}; }, endPan: function () { this.dragging=false; this.dragStart=null; },
                exitGame: function () { if (typeof parseAdventureId === 'function') { const parsed = parseAdventureId(this.currentAppId); if (parsed) { this.$router.push('/adventure/world/' + parsed.world.id); return; } } this.$router.push('/app/' + this.currentAppId); }
            },
            mounted: function () { this._destroyedFt = false; this._seqFt = 0; this._coinSeqFt = 0; this._sparkSeqFt = 0; this._mediaFt = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null; this.reducedMotion = !!(this._mediaFt && this._mediaFt.matches); this.workers = [{id:'w1', x:FT_STATIONS.workerHome1.x, y:FT_STATIONS.workerHome1.y, home:FT_STATIONS.workerHome1, speed:155, carrying:false, dir:-1}, {id:'w2', x:FT_STATIONS.workerHome2.x, y:FT_STATIONS.workerHome2.y, home:FT_STATIONS.workerHome2, speed:135, carrying:false, dir:-1}]; window.addEventListener('resize', this.fitFactory); },
            beforeDestroy: function () { this._destroyedFt = true; if (this._rafFt) cancelAnimationFrame(this._rafFt); window.removeEventListener('resize', this.fitFactory); ['sawmill','workshop','packaging'].forEach(id => clearTimeout(this['_pulse_'+id])); clearTimeout(this._truckTimerFt); clearTimeout(this._moneyTimerFt); if (this.pendingUpgrade) this.resolveUpgradeChoice(false); }
        }));
    }
    global.FT_DEFAULT_MACHINES = FT_DEFAULT_MACHINES; global.FT_STATIONS = FT_STATIONS; global.validateFactoryUpgrades = validateFactoryUpgrades; global.deriveFactoryState = deriveFactoryState; global.resolveFactoryTheme = resolveFactoryTheme; global.getFactoryUpgradeDefinition = getUpgradeDefinition; global.FactoryUpgradeApprovalService = UpgradeApprovalService; global.createFactoryTycoonComponent = createFactoryTycoonComponent;
})(typeof window !== 'undefined' ? window : globalThis);
