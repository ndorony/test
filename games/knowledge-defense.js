(function (global) {
    'use strict';

    const ASSET = './assets/knowledge-defense/';
    // Path & sites are measured from the Kenney hex-tile battlefield (assets/battlefield.png);
    // the enemy route follows the dirt-path hexes, sites sit on grass hexes beside it.
    const PATH = [
        {x:20.4,y:17.7},{x:21.9,y:23.3},{x:23.5,y:29},{x:25,y:34.6},{x:26.5,y:40.3},{x:28,y:45.9},
        {x:33.7,y:47.4},{x:35.2,y:53.1},{x:40.9,y:54.6},{x:46.6,y:56.1},{x:52.3,y:57.6},{x:58,y:59.1},
        {x:63.6,y:60.6},{x:69.3,y:62.1},{x:75,y:63.7},{x:80.7,y:65.2},{x:86.4,y:66.7},{x:87.9,y:72.3},
    ];
    const SITES = [
        {id:'west',x:29.1,y:30.5},{id:'grove',x:29.6,y:51.6},{id:'ridge',x:42.4,y:60.2},
        {id:'bend',x:59.5,y:64.8},{id:'keep',x:76.5,y:69.3},
    ];
    const CASTLE = {x:87.9, y:72.3};
    const TOWERS = {
        archer: {name: 'קשתי השומרים', icon: 'tower-archer.png', shot: 'spark.png', cost: 3, range: 21, damage: 4, cooldown: .58, upgradeCoins: 35, upgradeEnergy: 1, role: 'מהיר · מטרה יחידה'},
        rocket: {name: 'קטפולטת המצודה', icon: 'tower-rocket.png', shot: 'shell.png', cost: 6, range: 28, damage: 11, cooldown: 1.45, splash: 9, upgradeCoins: 50, upgradeEnergy: 2, role: 'איטי · נזק אזורי'},
        crystal: {name: 'מנסרת הכפור', icon: 'tower-crystal.png', shot: 'spark.png', cost: 5, range: 24, damage: 2, cooldown: .8, slow: .28, upgradeCoins: 44, upgradeEnergy: 2, role: 'האטה · שליטה בדרך', research: 'crystal'},
    };
    const ENEMIES = {
        scout: {name: 'לוחם האויב', icon: 'enemy-scout.png', hp: 11, speed: .052, reward: 2, armor: 0, scale: 1},
        runner: {name: 'שלד זריז', icon: 'enemy-runner.png', hp: 8, speed: .078, reward: 3, armor: 0, scale: .95},
        guard: {name: 'אורק משוריין', icon: 'enemy-guard.png', hp: 25, speed: .035, reward: 5, armor: 1, scale: 1.14},
        captain: {name: 'לורד הערפדים', icon: 'enemy-captain.png', hp: 68, speed: .027, reward: 12, armor: 2, scale: 1.5, lives: 3},
    };
    const WAVES = [
        {name: 'סיירי העמק', reward: 8, units: ['scout','scout','runner','scout']},
        {name: 'הסתערות מהירה', reward: 10, units: ['runner','scout','runner','guard','runner','scout']},
        {name: 'פלוגת הברזל', reward: 14, units: ['guard','scout','guard','runner','guard','runner','scout']},
        {name: 'גדוד השדים', reward: 18, units: ['runner','guard','runner','guard','scout','guard','runner','guard']},
        {name: 'המצור הגדול', reward: 26, units: ['guard','runner','guard','scout','guard','runner','guard','runner','guard','captain']},
    ];
    const RESEARCH = {
        power: {name: 'פלדה מלומדת', icon: '⚔', description: 'כל המגדלים גורמים 15% יותר נזק', max: 3},
        bounty: {name: 'לוגיסטיקה חכמה', icon: '🪙', description: 'כל חיסול מעניק 2 מטבעות נוספים', max: 2},
        crystal: {name: 'מנסרת הכפור', icon: '❄', description: 'פתיחת מגדל שמאט את האויב', max: 1},
    };
    const THEME_MOTIFS = {
        base: {realm: 'עמק הטל', filter: 'saturate(1)', sky: '#8bc4d7', grass: '#62a95a', danger: '#c94343'},
        soldiers: {realm: 'חזית הצפון', filter: 'sepia(.18) saturate(.8)', sky: '#aeb995', grass: '#6f7e4c', danger: '#a83d2f'},
        unicorn: {realm: 'ממלכת הכוכבים', filter: 'hue-rotate(45deg) saturate(1.25)', sky: '#d6a7dc', grass: '#73b46f', danger: '#b0478b'},
        space: {realm: 'מוצב אוריון', filter: 'hue-rotate(155deg) saturate(1.2)', sky: '#172c55', grass: '#243e62', danger: '#df506e'},
        dark: {realm: 'מצודת הירח', filter: 'brightness(.72) saturate(.8)', sky: '#27394a', grass: '#344b3f', danger: '#c55362'},
        code: {realm: 'חומת המערכת', filter: 'hue-rotate(65deg) saturate(1.8) contrast(1.15)', sky: '#06140c', grass: '#0c3519', danger: '#ff3159'},
    };
    // Kingdom-Rush-style dense dressing: foreground framing, clustered groves,
    // rock piles, and flower/mushroom patches — all kept clear of the road & sites.
    const ENVIRONMENT = [];  // decoration is baked into the hex battlefield image

    function alpha(hex, opacity) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return hex;
        const n = parseInt(hex.slice(1), 16);
        return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${opacity})`;
    }
    function resolveKnowledgeDefenseTheme(requested, themes) {
        const registry = themes || (typeof themeOptions !== 'undefined' ? themeOptions : {});
        const key = registry[requested] && THEME_MOTIFS[requested] ? requested : 'base';
        const colors = (registry[key] || registry.base || {colors:{}}).colors || {};
        const motif = THEME_MOTIFS[key] || THEME_MOTIFS.base;
        return {key, motif, css:{
            '--kd-primary': colors.primary || '#335e52', '--kd-secondary': colors.secondary || '#71867c',
            '--kd-accent': colors.accent || '#ffd166', '--kd-text': colors.text || '#fff',
            '--kd-panel': alpha(colors.background || '#17241f', .92), '--kd-edge': alpha(colors.tertiary || '#a9d7ca', .7),
            '--kd-sky': motif.sky, '--kd-grass': motif.grass, '--kd-danger': motif.danger, '--kd-art-filter': motif.filter,
        }};
    }
    function pathPoint(progress) {
        const p = Math.max(0, Math.min(.9999, progress));
        const scaled = p * (PATH.length - 1), index = Math.floor(scaled), t = scaled - index;
        return {x: PATH[index].x + (PATH[index + 1].x - PATH[index].x) * t, y: PATH[index].y + (PATH[index + 1].y - PATH[index].y) * t};
    }
    function distance(a, b) { const x = a.x - b.x, y = a.y - b.y; return Math.sqrt(x*x + y*y); }
    function validateKnowledgeDefenseConfig() {
        const errors = [];
        if (SITES.length < 5) errors.push('battlefield requires at least five sites');
        if (WAVES.length < 4) errors.push('vertical slice requires at least four waves');
        WAVES.forEach((wave, wi) => wave.units.forEach(type => { if (!ENEMIES[type]) errors.push(`wave ${wi} has unknown enemy ${type}`); }));
        Object.keys(TOWERS).forEach(key => { const t=TOWERS[key]; if (!t.icon || t.cost < 1 || t.range < 1 || t.cooldown <= 0) errors.push(`invalid tower ${key}`); });
        return errors;
    }

    function createKnowledgeDefenseComponent(BaseGameComponent) {
        const errors = validateKnowledgeDefenseConfig();
        if (errors.length) throw new Error('knowledge-defense: ' + errors.join('; '));
        return Vue.component('knowledge-defense', Vue.extend({
            extends: BaseGameComponent,
            template: `
            <main ref="root" class="kd-game" :class="['kd-theme-'+kdTheme.key,'kd-state-'+gameState,{'kd-reduced':reducedMotion,'kd-shake':cameraShake}]" :style="kdTheme.css" dir="rtl">
              <section class="kd-battlefield" aria-label="שדה הקרב של הגנת הידע">
                <div class="kd-field">
                  <img class="kd-terrain" :src="asset('battlefield.png')" alt="" aria-hidden="true">
                  <div class="kd-castle-hp" :class="{'kd-keep-hit':keepHit}" :style="{left:castle.x+'%',top:(castle.y-9)+'%'}" aria-label="שער הממלכה"><span><em :style="{width:lives/12*100+'%'}"></em></span></div>

                  <button v-for="site in sites" :key="site.id" type="button" class="kd-site" :class="{'kd-site-active':selectedSite===site.id,'kd-site-occupied':towerAt(site.id)}" :style="pointStyle(site)" @click="selectSite(site)" :disabled="!canEditSites" :aria-label="siteLabel(site)">
                    <img class="kd-pad" :src="asset('build-pad.png')" alt="">
                    <span v-if="!towerAt(site.id)" class="kd-plus">+</span>
                    <span v-else class="kd-tower" :class="['kd-tower-'+towerAt(site.id).type,'kd-level-'+towerAt(site.id).level,{'kd-firing':towerAt(site.id).firing}]">
                      <i v-if="selectedSite===site.id" class="kd-range" :style="rangeStyle(towerAt(site.id))"></i>
                      <img :src="asset(towers[towerAt(site.id).type].icon)" :style="engineStyle(towerAt(site.id))" alt=""><b>{{ towerAt(site.id).level }}</b><em></em>
                    </span>
                  </button>

                  <div v-for="enemy in enemies" :key="enemy.id" class="kd-enemy" :class="['kd-enemy-'+enemy.type,{'kd-hit':enemy.hit,'kd-slowed':enemy.slow>0}]" :style="enemyStyle(enemy)" aria-hidden="true">
                    <i class="kd-enemy-shadow"></i>
                    <span class="kd-enemy-body" :style="spriteStyle(enemy)"><img :src="asset(enemy.icon)" alt=""></span>
                    <span class="kd-enemy-hp"><em :style="{width:enemy.hpPercent+'%'}"></em></span>
                    <b v-if="enemy.type==='captain'">BOSS</b>
                  </div>
                  <div v-for="corpse in dying" :key="corpse.id" class="kd-corpse" :class="'kd-enemy-'+corpse.type" :style="corpseStyle(corpse)" aria-hidden="true">
                    <span class="kd-corpse-body" :style="spriteStyle(corpse)"><img :src="asset(corpse.icon)" alt=""></span>
                  </div>
                  <img v-for="shot in projectiles" :key="shot.id" class="kd-projectile" :class="'kd-shot-'+shot.towerType" :src="asset(shot.icon)" :style="projectileStyle(shot)" alt="" aria-hidden="true">
                  <i v-for="fx in effects" :key="fx.id" class="kd-fx" :class="'kd-fx-'+fx.kind" :style="effectStyle(fx)" aria-hidden="true"></i>
                  <span v-for="reward in rewardTexts" :key="reward.id" class="kd-reward-float" :style="pointStyle(reward)">{{reward.text}}</span>
                </div>
                <div class="kd-motes" aria-hidden="true"><i v-for="n in 7" :key="'m'+n" :style="moteStyle(n)"></i></div>
                <div class="kd-light-layer" aria-hidden="true"></div>

                <header class="kd-hud">
                  <button class="kd-hud-button" type="button" @click="exitGame" aria-label="יציאה">←</button>
                  <div class="kd-wave"><small>{{kdTheme.motif.realm}}</small><strong>גל {{Math.min(waveIndex+1,waves.length)}} / {{waves.length}}</strong><i><em :style="{width:wavePercent+'%'}"></em></i></div>
                  <div class="kd-resources"><span><i>🪙</i><b>{{coins}}</b></span><span><i>✦</i><b>{{energy}}</b></span><span><i>♥</i><b>{{lives}}</b></span></div>
                  <button v-if="gameState==='wave'" class="kd-hud-button" type="button" @click="togglePause" :aria-label="paused?'המשך קרב':'השהיית קרב'">{{paused?'▶':'⏸'}}</button>
                  <button class="kd-hud-button kd-speed" type="button" @click="toggleSpeed" :aria-label="'מהירות '+speed+' כפול'">×{{speed}}</button>
                  <button class="kd-hud-button" type="button" @click="objectivesOpen=!objectivesOpen" aria-label="מטרות">?</button>
                </header>
                <aside v-if="objectivesOpen" class="kd-objectives"><button type="button" @click="objectivesOpen=false">×</button><strong>מטרות הקרב</strong><span>◆ הגנו על השער במשך 4 גלים</span><span>◆ חקרו בין הגלים ושפרו את המערך</span></aside>

                <div v-if="hint" class="kd-hint" role="status" aria-live="polite">{{hint}}</div>
                <div v-if="waveBanner" class="kd-wave-banner" aria-hidden="true"><i>⚔</i><span>{{waveBanner}}</span></div>
                <div v-if="paused" class="kd-paused-badge" aria-live="polite">⏸ הקרב מושהה</div>
                <div v-if="actionsOpen" class="kd-actions">
                  <button class="kd-study" :class="{'kd-study-urgent':energy<minTowerCost && !hasTower}" type="button" @click="openForge"><span>📖</span><b>אולם הלימוד</b><small>ענו נכון · +2 ✦</small></button>
                  <button v-if="gameState==='planning' && hasTower" class="kd-start-wave" type="button" @click="startWave"><span>⚔</span><b>התחילו גל {{waveIndex+1}}</b><small>{{waves[waveIndex].name}}</small></button>
                  <button v-if="paused" class="kd-start-wave" type="button" @click="resumeWave"><span>▶</span><b>המשיכו בקרב</b><small>גל {{waveIndex+1}} · {{waves[waveIndex].name}}</small></button>
                </div>

                <section v-if="selectedSite && canEditSites" class="kd-build-dock" aria-label="בחירת מגדל">
                  <template v-if="!selectedTower">
                    <button v-for="(tower,key) in towers" :key="key" type="button" @click="buildTower(key)" :disabled="!towerAvailable(key)||energy<tower.cost"><img :src="asset(tower.icon)" alt=""><span><b>{{tower.name}}</b><small>{{tower.role}}</small></span><em>✦ {{tower.cost}}</em><i v-if="!towerAvailable(key)">🔒</i></button>
                  </template>
                  <template v-else>
                    <div class="kd-tower-card"><img :src="asset(towers[selectedTower.type].icon)" alt=""><span><b>{{towers[selectedTower.type].name}} · דרגה {{selectedTower.level}}</b><small>נזק {{towerDamage(selectedTower)}} · טווח {{towers[selectedTower.type].range}}</small></span></div>
                    <button class="kd-upgrade" type="button" @click="upgradeTower" :disabled="selectedTower.level>=3||coins<upgradeCoins||energy<towers[selectedTower.type].upgradeEnergy"><b>⬆ שדרוג</b><small>🪙 {{upgradeCoins}} · ✦ {{towers[selectedTower.type].upgradeEnergy}}</small></button>
                  </template>
                  <button class="kd-dock-close" type="button" @click="closeSite" aria-label="סגירה">×</button>
                </section>

                <section v-if="gameState==='briefing'" class="kd-briefing" aria-live="polite"><div><span>⚔</span><h1>הגנת הידע</h1><p>האויב בדרך. הקימו מגדלים, החזיקו מעמד, וחקרו שדרוגים בין הגלים.</p><button type="button" @click="finishBriefing">הציבו הגנות</button></div></section>

                <section v-if="gameState==='forge'" class="kd-research kd-forge-panel" aria-live="polite">
                  <button class="kd-forge-close" type="button" @click="closeForge" aria-label="חזרה למערך">×</button>
                  <div class="kd-research-head"><span>📖</span><div><small>אולם הלימוד</small><h2>צברו אנרגיית ידע</h2></div><b>✦ {{energy}}</b></div>
                  <p class="kd-research-caption">כל תשובה נכונה מוסיפה 2 אנרגיה לבניית מגדלים</p>
                  <div class="kd-question" :dir="questionDirection" v-html="question ? question.question : ''"></div>
                  <div class="kd-answers" :dir="questionDirection"><button v-for="(option,index) in options" :key="questionToken+'-'+index" type="button" @click="answer(index)" :disabled="attemptLocked" :class="{'kd-answer-wrong':wrongOption===index}"><kbd>{{index+1}}</kbd><span v-html="option"></span></button></div>
                  <div class="kd-research-feedback" :class="{'good':answerCorrect===true,'bad':answerCorrect===false}">{{researchFeedback}}</div>
                  <button class="kd-next-wave kd-forge-done" type="button" @click="closeForge">חזרה למערך <span>◀</span></button>
                </section>

                <section v-if="isResearch" class="kd-research" aria-live="polite">
                  <div class="kd-research-head"><span>✦</span><div><small>הגל נהדף</small><h2>מחקר שדה</h2></div><b>{{researchAnswered}} / {{researchTarget}}</b></div>
                  <template v-if="gameState==='research-question'">
                    <p class="kd-research-caption">פתרו במהירות כדי לטעון את מעבדת הממלכה</p>
                    <div class="kd-question" :dir="questionDirection" v-html="question ? question.question : ''"></div>
                    <div class="kd-answers" :dir="questionDirection"><button v-for="(option,index) in options" :key="questionToken+'-'+index" type="button" @click="answer(index)" :disabled="attemptLocked" :class="{'kd-answer-wrong':wrongOption===index}"><kbd>{{index+1}}</kbd><span v-html="option"></span></button></div>
                    <div class="kd-research-feedback" :class="{'good':answerCorrect===true,'bad':answerCorrect===false}">{{researchFeedback}}</div>
                  </template>
                  <template v-else>
                    <p class="kd-research-caption">{{researchCaption}}</p>
                    <div class="kd-research-choices"><button v-for="(item,key) in availableResearch" :key="key" type="button" @click="chooseResearch(key)" :disabled="energy<researchCost"><i>{{item.icon}}</i><span><b>{{item.name}}</b><small>{{item.description}}</small></span><em>✦ {{researchCost}}</em></button></div>
                    <button v-if="researchChosen || !canPickResearch" class="kd-next-wave" type="button" @click="finishResearch">לגל הבא <span>▶</span></button>
                  </template>
                </section>

                <section v-if="gameState==='victory'||gameState==='defeat'" class="kd-ending" aria-live="assertive"><div><span>{{gameState==='victory'?'🏰':'🛡'}}</span><h2>{{gameState==='victory'?'העמק ניצל!':'השער נפל'}}</h2><p>{{gameState==='victory'? waves.length+' גלים נהדפו והממלכה בטוחה!':'המחקר נשמר. שנו את המערך ונסו שוב.'}}</p><div class="kd-end-stats"><b>♛ {{reputation}}</b><b>✦ {{energy}}</b><b>🪙 {{coins}}</b></div><button v-if="gameState==='victory'" type="button" @click="finishGame">המשך ▶</button><button v-else type="button" @click="restartBattle">תכנון מחדש</button></div></section>
              </section>
            </main>`,
            data: function () { return {
                kdTheme: resolveKnowledgeDefenseTheme('base'), towers:TOWERS, waves:WAVES, sites:SITES, castle:CASTLE,
                gameState:'loading', selectedSite:null, placedTowers:[], enemies:[], dying:[], projectiles:[], effects:[], rewardTexts:[], waveBanner:'',
                waveIndex:0, spawnIndex:0, spawnClock:0, waveElapsed:0, lives:12, coins:28, energy:5, reputation:0,
                research:{power:0,bounty:0,crystal:0}, researchTarget:2, researchAnswered:0, researchChosen:false,
                question:null, options:[], questionToken:0, attemptLocked:true, answerCorrect:null, wrongOption:null, researchFeedback:'',
                hint:'', objectivesOpen:false, speed:1, keepHit:false, cameraShake:false, reducedMotion:false, paused:false,
            };},
            computed: {
                selectedTower: function(){return this.towerAt(this.selectedSite);}, hasTower:function(){return this.placedTowers.length>0;},
                // Sites stay live during a wave: picking one pauses the battle so the
                // player can buy or upgrade mid-fight, then resume.
                canEditSites:function(){return this.gameState==='planning'||this.gameState==='wave';},
                actionsOpen:function(){return !this.selectedSite&&(this.gameState==='planning'||this.paused);},
                isResearch:function(){return this.gameState==='research-question'||this.gameState==='research-choice';},
                wavePercent:function(){const wave=WAVES[this.waveIndex];if(!wave)return 100;const resolved=this.spawnIndex-this.enemies.length;return Math.max(0,Math.min(100,resolved/wave.units.length*100));},
                upgradeCoins:function(){return this.selectedTower?TOWERS[this.selectedTower.type].upgradeCoins*this.selectedTower.level:0;},
                minTowerCost:function(){return Math.min.apply(null,Object.keys(TOWERS).map(k=>TOWERS[k].cost));},
                researchCost:function(){return 3;},
                availableResearch:function(){const out={};Object.keys(RESEARCH).forEach(key=>{if(this.research[key]<RESEARCH[key].max)out[key]=RESEARCH[key];});return out;},
                // Research carries over between runs, so the tree can be fully maxed —
                // and every option is unaffordable below the cost. In both cases there is
                // nothing to pick, and the wave must still be able to continue.
                canPickResearch:function(){return Object.keys(this.availableResearch).length>0&&this.energy>=this.researchCost;},
                researchCaption:function(){
                    if(this.researchChosen)return 'המחקר נבחר · המשיכו לגל הבא';
                    if(!Object.keys(this.availableResearch).length)return 'כל הטכנולוגיות כבר נחקרו · המשיכו לגל הבא';
                    if(this.energy<this.researchCost)return 'אין מספיק אנרגיה למחקר · המשיכו לגל הבא';
                    return 'בחרו טכנולוגיה אחת לפני הגל הבא';
                },
                questionDirection:function(){const text=this.question?String(this.question.question).replace(/<[^>]+>/g,''):'';return typeof isHebrew==='function'&&isHebrew(text)?'rtl':'ltr';},
            },
            methods: {
                asset:function(name){return ASSET+name;}, pointStyle:function(p){return{left:p.x+'%',top:p.y+'%'};},
                tileStyle:function(t){return{left:t.x+'%',top:t.y+'%'};},
                propStyle:function(p){return{left:p.x+'%',top:p.y+'%',transform:`translate(-50%,-50%) scale(${p.s})`,animationDelay:p.d+'s'};},
                rangeStyle:function(t){return{width:(TOWERS[t.type].range*2.35)+'vmin',height:(TOWERS[t.type].range*2.35)+'vmin'};},
                // stagger the siege engines' idle sway so they do not move in lockstep
                engineStyle:function(t){return{animationDelay:(t.phase||0)+'s'};},
                enemyStyle:function(e){return{left:e.x+'%',top:e.y+'%',transform:`translate(-50%,-72%) scale(${e.scale})`,zIndex:6+Math.round(e.y/10)};},
                corpseStyle:function(c){return{left:c.x+'%',top:c.y+'%',transform:`translate(-50%,-72%) scale(${c.scale})`};},
                spriteStyle:function(e){return{transform:'scaleX('+(e.dirX>0?1:-1)+')',animationDelay:(e.phase||0)+'s'};},
                projectileStyle:function(p){return{left:p.x+'%',top:p.y+'%',transform:`translate(-50%,-50%) translateY(${p.arc||0}vmin) rotate(${p.rot||0}deg)`};},
                moteStyle:function(n){return{left:(7+n*12)%97+'%',top:(48+(n*53)%46)+'%',animationDelay:(-n*1.7)+'s',animationDuration:(7+(n%4)*2)+'s'};},
                effectStyle:function(f){const life=Math.max(0,1-f.age/f.life);return{left:f.x+'%',top:f.y+'%',opacity:life,transform:`translate(${f.dx*f.age}px,${f.dy*f.age}px) scale(${.4+(1-life)*1.4})`};},
                towerAt:function(id){return this.placedTowers.find(t=>t.siteId===id)||null;},
                siteLabel:function(site){const t=this.towerAt(site.id);return t?`${TOWERS[t.type].name}, דרגה ${t.level}`:'אתר בנייה פנוי';},
                towerAvailable:function(type){return !TOWERS[type].research||this.research[TOWERS[type].research]>0;},
                create:function(){
                    const requested=typeof getLocalStorage==='function'?getLocalStorage('theme','base'):'base';this.kdTheme=resolveKnowledgeDefenseTheme(requested);
                    this.energy=typeof getLocalStorage==='function'?getLocalStorage(this.currentAppId+'_kd_energy',5):5;
                    this.reputation=typeof getLocalStorage==='function'?getLocalStorage(this.currentAppId+'_kd_reputation',0):0;
                    this.research=typeof getLocalStorage==='function'?getLocalStorage(this.currentAppId+'_kd_research',{power:0,bounty:0,crystal:0}):{power:0,bounty:0,crystal:0};
                    this._run=(this._run||0)+1;this._destroyedKd=false;this.$nextTick(()=>{if(this._destroyedKd||!this.isCurrentRoute())return;this.setupRuntime();this.gameState='briefing';this.hint='בחרו אתר בנייה כדי להתחיל';});
                },
                setupRuntime:function(){this.reducedMotion=!!(global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches);this._last=performance.now();this.startFrame();global.addEventListener('keydown',this.onKeydown);},
                finishBriefing:function(){if(this.gameState!=='briefing')return;this.gameState='planning';this.hint=this.energy<this.minTowerCost?'אין מספיק אנרגיה — היכנסו לאולם הלימוד וצברו ✦':'בחרו עיגול ירוק והקימו מגדל';this.tone('open');},
                // The forge can also be entered mid-wave (while paused); remember where to go back to.
                openForge:function(){if(this.gameState!=='planning'&&!(this.gameState==='wave'&&this.paused))return;this._forgeReturn=this.gameState;this.selectedSite=null;this.gameState='forge';this.hint='';this.prepareQuestion();this.tone('research');},
                closeForge:function(){if(this.gameState!=='forge')return;this.gameState=this._forgeReturn||'planning';this._forgeReturn=null;if(this.gameState==='wave'){this.paused=true;this.hint='הקרב מושהה · בנו או שדרגו';return;}this.hint=this.hasTower?'מוכנים? התחילו את הגל':(this.energy<this.minTowerCost?'עוד קצת לימוד ותוכלו לבנות מגדל':'בחרו עיגול ירוק והקימו מגדל');},
                selectSite:function(site){if(!this.canEditSites)return;this.selectedSite=this.selectedSite===site.id?null:site.id;if(this.gameState==='wave')this.paused=!!this.selectedSite;this.hint=this.towerAt(site.id)?'שדרגו את המגדל':'בחרו מגדל להצבה';},
                closeSite:function(){this.selectedSite=null;if(this.gameState==='wave')this.paused=false;},
                togglePause:function(){if(this.gameState!=='wave')return;this.paused=!this.paused;if(!this.paused)this.selectedSite=null;this.hint=this.paused?'הקרב מושהה · בנו או שדרגו':'';this.tone('tap');},
                resumeWave:function(){if(this.gameState!=='wave')return;this.paused=false;this.selectedSite=null;this.hint='';this.tone('tap');},
                persistStrategy:function(){if(typeof setLocalStorage!=='function')return;setLocalStorage(this.currentAppId+'_kd_energy',this.energy);setLocalStorage(this.currentAppId+'_kd_reputation',this.reputation);setLocalStorage(this.currentAppId+'_kd_research',this.research);},
                spendEnergy:function(amount){if(this.energy<amount)return false;this.energy-=amount;this.persistStrategy();return true;},
                // The level is driven by the WAVES, not by exhausting the question list.
                // Override the platform's reloadProgress so answering every question never
                // routes away mid-run; it only refreshes the progress readout. Completion is
                // handled on victory (finishGame).
                reloadProgress:function(){if(typeof getCurrentLevelProgress==='function')this.progress=getCurrentLevelProgress(this.currentAppId);return true;},
                finishGame:function(){if(typeof getAdventureLevelCompleteRoute==='function'&&this.currentApp&&this.currentApp.adventure){const r=getAdventureLevelCompleteRoute(this.currentAppId);if(r){this.$router.push(r);return;}}this.exitGame();},
                buildTower:function(type){const cfg=TOWERS[type],site=SITES.find(s=>s.id===this.selectedSite);if(!cfg||!site||this.towerAt(site.id)||!this.towerAvailable(type)||!this.spendEnergy(cfg.cost))return;this._towerEnergy+=cfg.cost;this.placedTowers.push({id:'t'+(++this._entity),siteId:site.id,type,level:1,x:site.x,y:site.y,cooldown:Math.random()*.3,firing:false,phase:-Math.random()*2.4});this.burst(site.x,site.y,'build',12);this.tone('build');this.hint=cfg.name+' מוכן לקרב';this.closeSite();},
                towerDamage:function(t){return Math.round((TOWERS[t.type].damage+(t.level-1)*2)*(1+this.research.power*.15));},
                upgradeTower:function(){const t=this.selectedTower,cfg=t&&TOWERS[t.type];if(!t||t.level>=3||this.coins<this.upgradeCoins||this.energy<cfg.upgradeEnergy)return;this.coins-=this.upgradeCoins;this.spendEnergy(cfg.upgradeEnergy);this._towerEnergy+=cfg.upgradeEnergy;t.level++;this.burst(t.x,t.y,'upgrade',18);this.tone('upgrade');this.hint=cfg.name+' שודרג לדרגה '+t.level;},
                startWave:function(){if(this.gameState!=='planning'||!this.hasTower)return;this.selectedSite=null;this.paused=false;this.gameState='wave';this.spawnIndex=0;this.spawnClock=-.3;this.waveElapsed=0;this.hint='';this.waveBanner='גל '+(this.waveIndex+1)+' · '+WAVES[this.waveIndex].name;this.tone('wave');this.ownTimeout(()=>{this.waveBanner='';},this.reducedMotion?400:1900);},
                startFrame:function(){if(this._destroyedKd||this._frame)return;const frame=now=>{this._frame=null;if(this._destroyedKd)return;const dt=Math.min(.05,Math.max(0,(now-this._last)/1000))*this.speed;this._last=now;if(this.gameState==='wave'&&!this.paused)this.updateBattle(dt);this.updateEffects(dt);this._frame=requestAnimationFrame(frame);};this._frame=requestAnimationFrame(frame);},
                spawnEnemy:function(type){const c=ENEMIES[type],hp=Math.round(c.hp*(1+this.waveIndex*.18)),p=pathPoint(0);this.enemies.push({id:'e'+(++this._entity),type,name:c.name,icon:c.icon,hp,maxHp:hp,hpPercent:100,speed:c.speed,reward:c.reward,armor:c.armor,scale:c.scale,lives:c.lives||1,progress:0,x:p.x,y:p.y,dirX:1,hit:false,slow:0,phase:-Math.random()*.6});},
                updateBattle:function(dt){const wave=WAVES[this.waveIndex];this.waveElapsed+=dt;this.spawnClock+=dt;if(this.spawnIndex<wave.units.length&&this.spawnClock>=.72){this.spawnClock=0;this.spawnEnemy(wave.units[this.spawnIndex++]);}
                    this.enemies.slice().forEach(e=>{e.slow=Math.max(0,e.slow-dt);const old={x:e.x,y:e.y};e.progress+=e.speed*dt*(e.slow>0?.64:1);const p=pathPoint(e.progress);e.x=p.x;e.y=p.y;if(p.x>old.x+.01)e.dirX=1;else if(p.x<old.x-.01)e.dirX=-1;if(e.progress>=.995)this.enemyEscaped(e);});
                    this.placedTowers.forEach(t=>{t.cooldown-=dt;if(t.cooldown>0)return;const cfg=TOWERS[t.type],target=this.enemies.filter(e=>distance(t,e)<=cfg.range).sort((a,b)=>b.progress-a.progress)[0];if(target)this.fire(t,target);});
                    this.projectiles.slice().forEach(p=>{p.age+=dt;const target=this.enemies.find(e=>e.id===p.targetId);if(!target){this.removeProjectile(p);return;}const ox=p.x,oy=p.y,k=Math.min(1,dt*14);p.x+=(target.x-p.x)*k;p.y+=(target.y-p.y)*k;const prog=Math.min(1,p.age/p.duration);p.arc=-(p.arcH||0)*Math.sin(Math.PI*prog);if(p.towerType!=='crystal')p.rot=Math.atan2((p.y-oy)-(p.arcH?Math.cos(Math.PI*prog)*p.arcH*.5:0),(p.x-ox)||.001)*180/Math.PI;if(p.age>=p.duration){this.resolveShot(p,target);this.removeProjectile(p);}});
                    if(this.lives<=0){this.gameState='defeat';this.clearBattle();this.tone('defeat');}else if(this.spawnIndex>=wave.units.length&&!this.enemies.length&&!this.projectiles.length)this.completeWave();
                },
                fire:function(t,target){const cfg=TOWERS[t.type];t.cooldown=Math.max(.25,cfg.cooldown-(t.level-1)*.08);t.firing=true;this.ownTimeout(()=>{t.firing=false;},130);this.burst(t.x,t.y-3,'flash',1);this.projectiles.push({id:'p'+(++this._entity),towerType:t.type,icon:cfg.shot,targetId:target.id,x:t.x,y:t.y-3,age:0,duration:t.type==='rocket'?.5:.24,arcH:t.type==='rocket'?9:t.type==='archer'?2:0,arc:0,rot:0,damage:this.towerDamage(t),splash:cfg.splash||0,slow:cfg.slow||0});if(this.projectiles.length>24)this.projectiles.shift();},
                resolveShot:function(shot,target){this.damageEnemy(target,shot.damage,shot.slow);if(shot.splash)this.enemies.filter(e=>e.id!==target.id&&distance(e,target)<shot.splash).slice(0,3).forEach(e=>this.damageEnemy(e,Math.ceil(shot.damage*.48),0));this.burst(target.x,target.y,shot.towerType==='rocket'?'explosion':'impact',shot.towerType==='rocket'?14:5);this.toneThrottled(shot.towerType==='rocket'?'boom':'hit');},
                damageEnemy:function(enemy,amount,slow){if(!this.enemies.includes(enemy))return;enemy.hp-=Math.max(1,amount-enemy.armor);enemy.hpPercent=Math.max(0,enemy.hp/enemy.maxHp*100);enemy.hit=true;if(slow)enemy.slow=Math.max(enemy.slow,1.4+slow);this.ownTimeout(()=>{enemy.hit=false;},90);if(enemy.hp<=0){this.coins+=enemy.reward+this.research.bounty*2;this.reputation+=enemy.type==='captain'?4:1;this.reward(enemy.x,enemy.y,'+'+(enemy.reward+this.research.bounty*2)+' 🪙');this.burst(enemy.x,enemy.y,'destroy',enemy.type==='captain'?22:11);this.spawnCorpse(enemy);this.removeEnemy(enemy);}},
                spawnCorpse:function(e){const corpse={id:'c'+(++this._entity),type:e.type,icon:e.icon,x:e.x,y:e.y,scale:e.scale,dirX:e.dirX,phase:0};this.dying.push(corpse);if(this.dying.length>8)this.dying.shift();this.ownTimeout(()=>{const i=this.dying.indexOf(corpse);if(i>=0)this.dying.splice(i,1);},this.reducedMotion?60:560);},
                enemyEscaped:function(enemy){this.removeEnemy(enemy);this.lives-=enemy.lives;this.keepHit=true;this.cameraShake=!this.reducedMotion;this.burst(CASTLE.x,CASTLE.y-6,'danger',18);this.tone('damage');this.ownTimeout(()=>{this.keepHit=false;this.cameraShake=false;},220);},
                completeWave:function(){this.paused=false;this.selectedSite=null;const reward=WAVES[this.waveIndex].reward;this.coins+=reward;this.reputation+=2+this.waveIndex;this.persistStrategy();if(this.waveIndex===WAVES.length-1){this.gameState='victory';this.burst(90,55,'victory',30);this.tone('victory');return;}this.reward(50,20,'גל נהדף · +'+reward+' 🪙');this.beginResearch();},
                beginResearch:function(){this.gameState='research-question';this.researchAnswered=0;this.researchChosen=false;this.hint='';this.prepareQuestion();this.tone('research');},
                prepareQuestion:function(){const q=generateFromList(this.currentApp.listName,this.currentApp.questionIndex,this.currentApp.resultIndex,this.currentAppId,getSetItems(this.currentApp),this.currentApp.questionType);this.question=q;this.options=this.shuffle(q.options.slice());this.questionIndex=q.questionIndex;this.questionToken++;this.attemptLocked=false;this.answerCorrect=null;this.wrongOption=null;this.researchFeedback='';if(this.reloadProgress())q.action();},
                answer:function(index){if((this.gameState!=='research-question'&&this.gameState!=='forge')||this.attemptLocked||!this.question)return;this.attemptLocked=true;const correct=this.options[index]===this.question.result;if(correct){this.answerCorrect=true;this.researchFeedback='+2 אנרגיית ידע';if(typeof successSound!=='undefined'){const p=successSound.play();if(p&&p.catch)p.catch(()=>{});}updateWeightForKey(this.currentAppId,this.questionIndex,-1);this.score++;this.energy+=2;if(this.gameState==='research-question')this.researchAnswered++;this.persistStrategy();if(this.reloadProgress()){this.saveScore();const token=this.questionToken;this.ownTimeout(()=>{if(token!==this.questionToken||this._destroyedKd)return;if(this.gameState==='forge'){this.prepareQuestion();return;}if(this.researchAnswered>=this.researchTarget){this.gameState='research-choice';this.answerCorrect=null;}else this.prepareQuestion();},this.reducedMotion?120:650);}}else{this.answerCorrect=false;this.wrongOption=index;this.researchFeedback='כמעט — נסו שוב';if(typeof failureSound!=='undefined'){const p=failureSound.play();if(p&&p.catch)p.catch(()=>{});}this.score=Math.max(0,this.score-1);this.saveScore();updateWeightForKey(this.currentAppId,this.questionIndex,1);if(this.reloadProgress())this.ownTimeout(()=>{if(!this._destroyedKd)this.attemptLocked=false;},this.reducedMotion?100:450);}},
                chooseResearch:function(key){const item=RESEARCH[key];if(this.gameState!=='research-choice'||this.researchChosen||!item||this.research[key]>=item.max||!this.spendEnergy(this.researchCost))return;this.research=Object.assign({},this.research,{[key]:this.research[key]+1});this.researchChosen=true;this.persistStrategy();this.burst(50,50,key==='crystal'?'frost':'research',20);this.tone('upgrade');},
                finishResearch:function(){if(!this.researchChosen&&this.canPickResearch)return;this.waveIndex++;this.gameState='planning';this.coins+=this.research.bounty*6;this.hint='המחקר הושלם · שפרו את המערך';},
                toggleSpeed:function(){this.speed=this.speed===1?2:1;this.tone('tap');},
                removeEnemy:function(e){const i=this.enemies.indexOf(e);if(i>=0)this.enemies.splice(i,1);},removeProjectile:function(p){const i=this.projectiles.indexOf(p);if(i>=0)this.projectiles.splice(i,1);},
                updateEffects:function(dt){this.effects.slice().forEach(f=>{f.age+=dt;if(f.age>=f.life)this.effects.splice(this.effects.indexOf(f),1);});},
                burst:function(x,y,kind,count){const cap=Math.min(count,36-this.effects.length);for(let i=0;i<cap;i++)this.effects.push({id:'f'+(++this._entity),x,y,kind,dx:(Math.random()-.5)*34,dy:-8-Math.random()*24,age:0,life:this.reducedMotion?.18:.45+Math.random()*.5});},
                reward:function(x,y,text){const item={id:'r'+(++this._entity),x,y,text};this.rewardTexts.push(item);this.ownTimeout(()=>{const i=this.rewardTexts.indexOf(item);if(i>=0)this.rewardTexts.splice(i,1);},1100);},
                clearBattle:function(){this.enemies=[];this.projectiles=[];this.dying=[];this.paused=false;},restartBattle:function(){this._run++;this.clearBattle();this.effects=[];this.rewardTexts=[];this.placedTowers=[];this.waveBanner='';this.selectedSite=null;this.waveIndex=0;this.lives=12;this.coins=28;if(this._towerEnergy>0){this.energy+=this._towerEnergy;this._towerEnergy=0;this.persistStrategy();}this.gameState='planning';this.hint=this.energy<this.minTowerCost?'היכנסו לאולם הלימוד וצברו אנרגיה':'בחרו אתר ובנו מערך חדש';},
                onKeydown:function(event){if((this.gameState!=='research-question'&&this.gameState!=='forge')||this.attemptLocked)return;const i=Number(event.key)-1;if(i>=0&&i<this.options.length){event.preventDefault();this.answer(i);}},
                tone:function(kind){if(this.reducedMotion)return;try{const Ctx=global.AudioContext||global.webkitAudioContext;if(!Ctx)return;if(!this._audio)this._audio=new Ctx();const now=this._audio.currentTime,o=this._audio.createOscillator(),g=this._audio.createGain();const map={tap:[360,.025],open:[420,.08],build:[260,.1],upgrade:[620,.12],wave:[180,.16],research:[520,.13],hit:[120,.02],boom:[75,.1],damage:[90,.16],victory:[720,.25],defeat:[85,.3]};const v=map[kind]||map.tap;o.frequency.setValueAtTime(v[0],now);if(kind==='victory')o.frequency.exponentialRampToValueAtTime(980,now+v[1]);g.gain.setValueAtTime(.025,now);g.gain.exponentialRampToValueAtTime(.001,now+v[1]);o.connect(g);g.connect(this._audio.destination);o.start(now);o.stop(now+v[1]);}catch(e){}},
                toneThrottled:function(kind){const now=Date.now();if(now-(this._lastTone||0)<90)return;this._lastTone=now;this.tone(kind);},
                ownTimeout:function(fn,delay){const run=this._run,id=setTimeout(()=>{this._timers.delete(id);if(!this._destroyedKd&&run===this._run)fn();},delay);this._timers.add(id);return id;},
                isCurrentRoute:function(){return !!(this.$route&&this.$route.params.currentAppId===this.currentAppId&&this.$route.path.indexOf('/play/knowledge_defense/')===0);},
                exitGame:function(){this.$router.push(this.currentApp&&this.currentApp.adventure?'/adventure/world/'+this.currentApp.adventure.worldId:'/app/'+this.currentAppId);},
            },
            created:function(){this._timers=new Set();this._entity=0;this._lastTone=0;this._towerEnergy=0;this._forgeReturn=null;},
            beforeDestroy:function(){this._destroyedKd=true;this._run=(this._run||0)+1;if(this._frame)cancelAnimationFrame(this._frame);this._frame=null;this._timers.forEach(clearTimeout);this._timers.clear();global.removeEventListener('keydown',this.onKeydown);this.clearBattle();this.effects=[];if(this._audio&&this._audio.close)this._audio.close().catch(()=>{});this._audio=null;},
        }));
    }

    global.KNOWLEDGE_DEFENSE_CONFIG={path:PATH,sites:SITES,towers:TOWERS,enemies:ENEMIES,waves:WAVES,research:RESEARCH,motifs:THEME_MOTIFS};
    global.validateKnowledgeDefenseConfig=validateKnowledgeDefenseConfig;
    global.resolveKnowledgeDefenseTheme=resolveKnowledgeDefenseTheme;
    global.knowledgeDefensePathPoint=pathPoint;
    global.createKnowledgeDefenseComponent=createKnowledgeDefenseComponent;
})(typeof window!=='undefined'?window:globalThis);
