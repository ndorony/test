(function (global) {
    'use strict';

    const WP_SEGMENT_WIDTH = 900;
    const WP_SCENE_HEIGHT = 600;

    const WATER_PIPELINE_LEVEL = {
        id: 'water-journey-vertical-slice',
        name: 'מסע המים',
        segments: [
            {id: 'source', type: 'opening', region: 'roots', pipe: 'M 0 175 C 250 175 300 390 540 390 S 760 390 900 390'},
            {id: 'root-travel', type: 'travel', region: 'roots', pipe: 'M 0 390 C 180 390 230 325 390 325 S 610 445 900 390'},
            {id: 'root-block', type: 'blockage', region: 'roots', checkpoint: 0, behavior: 'question-gate', visual: 'root-knot', obstacleX: 620, pipe: 'M 0 390 C 220 390 390 355 620 390 S 790 390 900 390'},
            {id: 'garden-restore', type: 'restoration', region: 'roots', restoration: 'irrigation-bloom', trigger: 0, pipe: 'M 0 390 C 190 390 250 440 430 415 S 690 350 900 390'},
            {id: 'stone-transition', type: 'transition', region: 'roots-to-works', pipe: 'M 0 390 C 220 390 270 470 480 445 S 680 335 900 390'},
            {id: 'works-travel', type: 'travel', region: 'works', pipe: 'M 0 390 C 170 390 250 330 400 350 S 680 430 900 390'},
            {id: 'valve-block', type: 'blockage', region: 'works', checkpoint: 1, behavior: 'question-gate', visual: 'rotary-valve', obstacleX: 610, pipe: 'M 0 390 C 220 390 390 390 610 390 S 790 390 900 390'},
            {id: 'pump-restore', type: 'restoration', region: 'works', restoration: 'pump-restart', trigger: 1, pipe: 'M 0 390 C 210 390 280 445 470 420 S 700 345 900 390'},
            {id: 'deep-transition', type: 'transition', region: 'works-to-crystal', pipe: 'M 0 390 C 180 390 250 470 450 455 S 670 335 900 390'},
            {id: 'crystal-travel', type: 'travel', region: 'crystal', pipe: 'M 0 390 C 180 390 250 325 430 340 S 650 455 900 390'},
            {id: 'crystal-block', type: 'blockage', region: 'crystal', checkpoint: 2, behavior: 'question-gate', visual: 'mineral-plug', obstacleX: 610, pipe: 'M 0 390 C 230 390 390 350 610 390 S 790 390 900 390'},
            {id: 'destination', type: 'destination', region: 'crystal', pipe: 'M 0 390 C 260 390 360 360 510 310 S 650 205 900 205'},
        ],
    };

    const WATER_PIPE_THEME_MOTIFS = {
        base: {
            actor: '🧒', source: '🚰', destination: '⛲', life: '🦋', rareLife: '🐦',
            particleColors: ['#B0E0E6', '#78909c', '#ffffff'], incorrect: '#d18b47',
        },
        soldiers: {
            actor: '🧑‍🔧', source: '🪣', destination: '🛰️', life: '🌾', rareLife: '🐦',
            particleColors: ['#BDB76B', '#FFD700', '#e7dfb1'], incorrect: '#b77936',
        },
        unicorn: {
            actor: '🦄', source: '🌈', destination: '⛲', life: '✨', rareLife: '🦋',
            particleColors: ['#FFB6C1', '#FFD700', '#d0bfff', '#ffffff'], incorrect: '#9f75d1',
        },
        space: {
            actor: '🤖', source: '🛰️', destination: '🌌', life: '✨', rareLife: '🛸',
            particleColors: ['#87CEEB', '#1E90FF', '#FFD700', '#ffffff'], incorrect: '#d89a36',
        },
        dark: {
            actor: '🧙', source: '🏺', destination: '⛲', life: '💫', rareLife: '🪲',
            particleColors: ['#BB86FC', '#7dd3c7', '#E0E0E0'], incorrect: '#a775c7',
        },
    };

    const _waterPipelineSession = {seen: {}};

    function waterPipelineHexAlpha(hex, alpha) {
        if (!/^#[0-9a-f]{6}$/i.test(hex || '')) {
            return hex;
        }
        const value = parseInt(hex.slice(1), 16);
        return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
    }

    function resolveWaterPipelineTheme() {
        const requested = typeof getLocalStorage === 'function' ? getLocalStorage('theme', 'base') : 'base';
        const key = WATER_PIPE_THEME_MOTIFS[requested] && typeof themeOptions !== 'undefined' && themeOptions[requested]
            ? requested : 'base';
        const palette = typeof themeOptions !== 'undefined' && themeOptions[key]
            ? themeOptions[key].colors
            : {primary: '#006064', secondary: '#78909c', tertiary: '#B0E0E6', accent: '#C0C0C0', background: '#F5F5F5', text: '#000000'};
        const motif = WATER_PIPE_THEME_MOTIFS[key];
        return {
            key: key,
            palette: palette,
            motif: motif,
            css: {
                '--wp-primary': palette.primary,
                '--wp-secondary': palette.secondary,
                '--wp-tertiary': palette.tertiary,
                '--wp-accent': palette.accent,
                '--wp-bg': palette.background,
                '--wp-ink': palette.text,
                '--wp-panel': waterPipelineHexAlpha(palette.background, key === 'space' || key === 'dark' ? 0.94 : 0.9),
                '--wp-panel-edge': waterPipelineHexAlpha(palette.tertiary, 0.9),
                '--wp-glow': waterPipelineHexAlpha(palette.accent, 0.55),
                '--wp-water': key === 'dark' ? '#43d7c7' : (key === 'unicorn' ? '#62d9ff' : '#32bde8'),
                '--wp-water-hi': key === 'unicorn' ? '#fff1a8' : '#dffaff',
                '--wp-correct': key === 'soldiers' ? '#FFD700' : (key === 'dark' ? '#7ee0c4' : '#51cf66'),
                '--wp-wrong': motif.incorrect,
            },
        };
    }

    function validateWaterPipelineLevel(level) {
        const errors = [];
        if (!level || !Array.isArray(level.segments) || !level.segments.length) {
            return ['level must contain segments'];
        }
        const ids = new Set();
        const checkpoints = [];
        let openings = 0;
        let destinations = 0;
        level.segments.forEach((segment, index) => {
            if (!segment.id || ids.has(segment.id)) errors.push(`invalid or duplicate segment id at ${index}`);
            ids.add(segment.id);
            if (!segment.pipe) errors.push(`segment ${segment.id || index} has no pipe`);
            if (segment.type === 'opening') openings += 1;
            if (segment.type === 'destination') destinations += 1;
            if (segment.type === 'blockage') {
                checkpoints.push(segment.checkpoint);
                if (segment.behavior !== 'question-gate') errors.push(`blockage ${segment.id} must use question-gate`);
                if (!['root-knot', 'rotary-valve', 'mineral-plug'].includes(segment.visual)) errors.push(`unknown obstacle visual ${segment.visual}`);
            }
        });
        if (openings !== 1) errors.push('level must contain exactly one opening');
        if (destinations !== 1) errors.push('level must contain exactly one destination');
        if (checkpoints.join(',') !== '0,1,2') errors.push('vertical slice checkpoints must be 0,1,2');
        return errors;
    }

    function waterPipelineSegmentWindow(activeIndex, count) {
        const indexes = [];
        for (let index = Math.max(0, activeIndex - 1); index <= Math.min(count - 1, activeIndex + 1); index += 1) {
            indexes.push(index);
        }
        return indexes;
    }

    function createWaterPipelineComponent(BaseGameComponent) {
        const errors = validateWaterPipelineLevel(WATER_PIPELINE_LEVEL);
        if (errors.length) {
            throw new Error('water-pipeline: ' + errors.join('; '));
        }

        return Vue.component('water-pipeline', Vue.extend({
            extends: BaseGameComponent,
            template: `
            <div ref="root" class="wp-game" :class="['wp-theme-' + wpTheme.key, 'wp-state-' + gameState, {'wp-reduced': reducedMotion}]" :style="wpTheme.css" dir="rtl">
              <div class="wp-ambient" aria-hidden="true">
                <i v-for="(mote, index) in ambientMotes" :key="index" :style="ambientMoteStyle(mote)"></i>
              </div>
              <div class="wp-vignette" aria-hidden="true"></div>

              <div class="wp-camera" :style="cameraStyle" aria-hidden="true">
                <section v-for="segment in visibleSegments" :key="segment.id"
                         class="wp-segment" :class="segmentClasses(segment)" :style="segmentStyle(segment)">
                  <div class="wp-sky"></div>
                  <div class="wp-ground wp-ground-back"></div>
                  <div class="wp-ground wp-ground-mid"></div>
                  <div class="wp-ground wp-ground-front"></div>
                  <div class="wp-strata wp-strata-a"></div>
                  <div class="wp-strata wp-strata-b"></div>

                  <div class="wp-life wp-life-a">{{ wpTheme.motif.life }}</div>
                  <div class="wp-life wp-life-b">{{ wpTheme.motif.life }}</div>
                  <div class="wp-rare-life">{{ wpTheme.motif.rareLife }}</div>

                  <svg class="wp-pipe-svg" viewBox="0 0 900 600" preserveAspectRatio="none">
                    <path class="wp-pipe-shadow" :d="segment.pipe"></path>
                    <path class="wp-pipe-shell" :d="segment.pipe"></path>
                    <path class="wp-pipe-channel" :d="segment.pipe"></path>
                    <path class="wp-water-body" :d="segment.pipe" pathLength="100" :style="waterStrokeStyle(segment)"></path>
                    <path class="wp-water-shine" :d="segment.pipe" pathLength="100" :style="waterShineStyle(segment)"></path>
                  </svg>

                  <div v-if="segment.type === 'opening'" class="wp-source-scene">
                    <div class="wp-operator">{{ wpTheme.motif.actor }}</div>
                    <div class="wp-source-machine"><span>{{ wpTheme.motif.source }}</span><i></i></div>
                    <div class="wp-dry-drop" :class="{'wp-drop-fall': openingAttempted}">💧</div>
                    <div class="wp-opening-copy" v-if="gameState === 'opening'">{{ openingCopy }}</div>
                  </div>

                  <div v-if="segment.type === 'blockage'" class="wp-obstacle"
                       :class="obstacleClasses(segment)" :style="obstacleStyle(segment)">
                    <div class="wp-pressure-ring"></div>
                    <template v-if="segment.visual === 'root-knot'">
                      <i v-for="n in 7" :key="n" class="wp-root-strand" :class="'wp-root-' + n"></i>
                      <b class="wp-root-heart"></b>
                    </template>
                    <template v-else-if="segment.visual === 'rotary-valve'">
                      <div class="wp-valve-body"><i v-for="n in 6" :key="n"></i><b></b></div>
                      <div class="wp-gauge"><i></i></div>
                    </template>
                    <template v-else>
                      <i v-for="n in 7" :key="n" class="wp-crystal" :class="'wp-crystal-' + n"></i>
                      <b class="wp-crystal-core"></b>
                    </template>
                  </div>

                  <div v-if="segment.type === 'restoration'" class="wp-restoration" :class="{'wp-restored': isRestored(segment.trigger)}">
                    <template v-if="segment.restoration === 'irrigation-bloom'">
                      <div class="wp-irrigation"></div>
                      <span v-for="n in 6" :key="n" class="wp-plant" :class="'wp-plant-' + n">🌼</span>
                    </template>
                    <template v-else>
                      <div class="wp-pump-wheel"><i v-for="n in 6" :key="n"></i></div>
                      <div class="wp-lamp wp-lamp-a"></div><div class="wp-lamp wp-lamp-b"></div>
                    </template>
                  </div>

                  <div v-if="segment.region.indexOf('works') !== -1" class="wp-machinery"><i></i><i></i><i></i></div>
                  <div v-if="segment.region.indexOf('crystal') !== -1" class="wp-cave-crystals"><i></i><i></i><i></i><i></i></div>

                  <div v-if="segment.type === 'destination'" class="wp-destination" :class="{'wp-destination-live': destinationFilled}">
                    <div class="wp-destination-icon">{{ wpTheme.motif.destination }}</div>
                    <div class="wp-destination-water"></div>
                    <div class="wp-destination-actor">{{ wpTheme.motif.actor }}</div>
                  </div>
                </section>
              </div>

              <header class="wp-hud">
                <button class="wp-round-button wp-exit" type="button" @click="exitGame" aria-label="יציאה">←</button>
                <div class="wp-hud-center">
                  <div class="wp-run-pipe" aria-label="התקדמות במסע">
                    <span v-for="n in 3" :key="n" :class="{'wp-check-done': checkpointStatus[n - 1] === 'solved', 'wp-check-now': currentCheckpoint === n - 1}">
                      {{ n === 1 ? '🌿' : (n === 2 ? '⚙️' : '💎') }}
                    </span>
                  </div>
                  <div class="wp-learning-gauge" v-if="progress">
                    <i :style="{width: learningPercent + '%'}"></i>
                    <b>{{ progress.progress }} / {{ progress.total }}</b>
                  </div>
                </div>
                <div class="wp-score">💧 {{ score }}</div>
                <button class="wp-round-button wp-fullscreen" type="button" @click="toggleFullscreen" aria-label="מסך מלא">⛶</button>
              </header>

              <div v-if="currentQuestion" class="wp-question-wrap" :class="{'wp-question-in': gameState === 'waitingForAnswer' || gameState === 'answerFeedback'}">
                <div class="wp-console-link" aria-hidden="true"><i></i><b></b></div>
                <section class="wp-question-console" :dir="questionDirection" aria-live="polite">
                  <div class="wp-console-gauge"><i :class="{'wp-gauge-good': answerWasCorrect, 'wp-gauge-wrong': answerWasCorrect === false}"></i></div>
                  <div class="wp-question-title">פתחו את החסימה</div>
                  <div class="wp-question-prompt" v-html="currentQuestion.question"></div>
                  <div class="wp-answers" :class="{'wp-long-answers': hasLongAnswers}">
                    <button v-for="(option, index) in currentOptions" :key="questionToken + '-' + index"
                            ref="answerButtons" type="button" class="wp-answer"
                            :class="answerClasses(option, index)"
                            :disabled="inputLocked || attemptedWrong[index]"
                            @click="chooseAnswer(index)">
                      <span class="wp-answer-number">{{ index + 1 }}</span>
                      <span v-html="option"></span>
                    </button>
                  </div>
                  <div class="wp-feedback" :class="{'wp-feedback-good': answerWasCorrect, 'wp-feedback-wrong': answerWasCorrect === false}">{{ feedback }}</div>
                </section>
              </div>

              <div v-if="gameState === 'ending' || gameState === 'completedRun'" class="wp-ending" aria-live="polite">
                <div class="wp-ending-card">
                  <div class="wp-ending-burst">💧 ✨ 🎉</div>
                  <h2>המים הגיעו!</h2>
                  <div class="wp-memory-strip"><span>🌼</span><span>⚙️</span><span>💎</span></div>
                  <button v-if="gameState === 'completedRun'" type="button" class="wp-again" @click="restartRun">עוד מסע ▶</button>
                </div>
              </div>

              <button v-if="gameState === 'opening'" class="wp-skip" type="button" @click="skipOpening">דלגו ▶</button>
            </div>`,

            data: function () {
                return {
                    level: WATER_PIPELINE_LEVEL,
                    wpTheme: resolveWaterPipelineTheme(),
                    gameState: 'loading',
                    activeSegmentIndex: 0,
                    camera: {x: 430, y: 250, targetX: 430, targetY: 250},
                    viewport: {width: 1024, height: 640},
                    sceneScale: 1,
                    waterDistance: 80,
                    flowPhase: 0,
                    checkpointStatus: ['pending', 'pending', 'pending'],
                    obstacleStates: {},
                    restored: {},
                    currentCheckpoint: null,
                    currentQuestion: null,
                    currentOptions: [],
                    attemptedWrong: {},
                    inputLocked: true,
                    answerWasCorrect: null,
                    selectedAnswer: null,
                    feedback: '',
                    questionToken: 0,
                    destinationFilled: false,
                    openingAttempted: false,
                    openingCopy: 'מנסים לפתוח את המים…',
                    reducedMotion: false,
                    ambientMotes: [],
                };
            },

            computed: {
                visibleSegments: function () {
                    return waterPipelineSegmentWindow(this.activeSegmentIndex, this.level.segments.length)
                        .map(index => Object.assign({index: index, start: index * WP_SEGMENT_WIDTH}, this.level.segments[index]));
                },
                cameraStyle: function () {
                    const x = this.viewport.width * 0.5 - this.camera.x * this.sceneScale;
                    const y = this.viewport.height * 0.5 - this.camera.y * this.sceneScale;
                    return {transform: `translate3d(${x}px, ${y}px, 0) scale(${this.sceneScale})`};
                },
                learningPercent: function () {
                    if (!this.progress || !this.progress.total) return 0;
                    return Math.max(0, Math.min(100, Math.round((this.progress.progress / this.progress.total) * 100)));
                },
                questionDirection: function () {
                    if (!this.currentQuestion) return 'rtl';
                    const plain = String(this.currentQuestion.question || '').replace(/<[^>]*>/g, '');
                    return typeof isHebrew === 'function' && isHebrew(plain) ? 'rtl' : 'ltr';
                },
                hasLongAnswers: function () {
                    return this.currentOptions.some(option => String(option).replace(/<[^>]*>/g, '').length > 22);
                },
            },

            methods: {
                create: function () {
                    this.wpTheme = resolveWaterPipelineTheme();
                    this.resetRunState();
                    this.$nextTick(() => {
                        if (this._destroyedWp || !this.isCurrentRoute()) return;
                        this.resizeGame();
                        this.startAnimationLoop();
                        this.startOpening();
                    });
                },
                resetRunState: function () {
                    this.gameState = 'loading';
                    this.activeSegmentIndex = 0;
                    this.camera = {x: 430, y: 250, targetX: 430, targetY: 250};
                    this.waterDistance = 80;
                    this.checkpointStatus = ['pending', 'pending', 'pending'];
                    this.obstacleStates = {};
                    this.restored = {};
                    this.currentCheckpoint = null;
                    this.currentQuestion = null;
                    this.currentOptions = [];
                    this.attemptedWrong = {};
                    this.inputLocked = true;
                    this.answerWasCorrect = null;
                    this.selectedAnswer = null;
                    this.feedback = '';
                    this.destinationFilled = false;
                    this.openingAttempted = false;
                    this.openingCopy = 'מנסים לפתוח את המים…';
                    this.questionToken += 1;
                    this._runToken = (this._runToken || 0) + 1;
                },
                isCurrentRoute: function () {
                    return this.$route && this.$route.params.currentAppId === this.currentAppId && this.$route.path.indexOf('/play/water_pipeline/') === 0;
                },
                later: function (callback, delay) {
                    const token = this._runToken;
                    const timer = setTimeout(() => {
                        this._timersWp.delete(timer);
                        if (!this._destroyedWp && token === this._runToken && this.isCurrentRoute()) callback();
                    }, this.reducedMotion ? Math.min(delay, 120) : delay);
                    this._timersWp.add(timer);
                    return timer;
                },
                startOpening: function () {
                    if (this.gameState !== 'loading') return;
                    this.gameState = 'opening';
                    const seen = !!_waterPipelineSession.seen[this.currentAppId];
                    _waterPipelineSession.seen[this.currentAppId] = true;
                    this.later(() => {
                        this.openingAttempted = true;
                        this.openingCopy = 'אין מים! החסימה מתחת לאדמה';
                    }, seen ? 180 : 850);
                    this.later(() => this.finishOpening(), seen ? 850 : 3000);
                },
                skipOpening: function () {
                    if (this.gameState !== 'opening') return;
                    this._runToken += 1;
                    this.clearTimers();
                    this.openingAttempted = true;
                    this.finishOpening();
                },
                finishOpening: function () {
                    if (this.gameState !== 'opening') return;
                    this.openingAttempted = true;
                    this.gameState = 'travelling';
                    this.travelToBlockage(0);
                },
                blockageSegmentFor: function (checkpoint) {
                    return this.level.segments.find(segment => segment.type === 'blockage' && segment.checkpoint === checkpoint);
                },
                segmentIndexById: function (id) {
                    return this.level.segments.findIndex(segment => segment.id === id);
                },
                travelToBlockage: function (checkpoint) {
                    const segment = this.blockageSegmentFor(checkpoint);
                    const index = this.segmentIndexById(segment.id);
                    const target = index * WP_SEGMENT_WIDTH + segment.obstacleX - 65;
                    this.gameState = 'travelling';
                    this.startTravel(target, checkpoint === 0 ? 2400 : 3900, () => this.arriveAtBlockage(checkpoint));
                },
                startTravel: function (targetDistance, duration, done) {
                    if (this._travelWp) this._travelWp = null;
                    this._travelWp = {
                        from: this.waterDistance,
                        to: targetDistance,
                        started: performance.now(),
                        duration: this.reducedMotion ? 220 : duration,
                        done: done,
                        token: this._runToken,
                    };
                },
                arriveAtBlockage: function (checkpoint) {
                    if (this._destroyedWp) return;
                    const segment = this.blockageSegmentFor(checkpoint);
                    const index = this.segmentIndexById(segment.id);
                    this.currentCheckpoint = checkpoint;
                    this.activeSegmentIndex = index;
                    this.$set(this.obstacleStates, segment.id, 'pressurized');
                    this.gameState = 'arrivingAtBlockage';
                    this.camera.targetX = index * WP_SEGMENT_WIDTH + segment.obstacleX - 50;
                    this.camera.targetY = 365;
                    this.later(() => this.generateQuestionAtBlockage(), 650);
                },
                generateQuestionAtBlockage: function () {
                    if (this.gameState !== 'arrivingAtBlockage' || this.currentCheckpoint === null) return;
                    this.gameState = 'generatingQuestion';
                    const token = ++this.questionToken;
                    let question;
                    try {
                        question = generateFromList(
                            this.currentApp.listName,
                            this.currentApp.questionIndex,
                            this.currentApp.resultIndex,
                            this.currentAppId,
                            getSetItems(this.currentApp),
                            this.currentApp.questionType
                        );
                    } catch (error) {
                        console.error('water-pipeline: question generation failed', error);
                        this.feedback = 'לא הצלחנו להכין שאלה';
                        this.gameState = 'completedRun';
                        return;
                    }
                    if (this._destroyedWp || token !== this.questionToken) return;
                    this.currentQuestion = question;
                    this.currentOptions = this.shuffle(question.options.slice());
                    this.questionIndex = question.questionIndex;
                    this.attemptedWrong = {};
                    this.inputLocked = true;
                    this.answerWasCorrect = null;
                    this.selectedAnswer = null;
                    this.feedback = '';
                    this.gameState = 'questionEntering';
                    this.$nextTick(() => {
                        if (this._destroyedWp || token !== this.questionToken) return;
                        question.action();
                        this.later(() => {
                            this.gameState = 'waitingForAnswer';
                            this.inputLocked = false;
                            this.focusFirstAnswer();
                        }, 350);
                    });
                },
                chooseAnswer: function (index) {
                    if (this.gameState !== 'waitingForAnswer' || this.inputLocked || this.attemptedWrong[index]) return;
                    const option = this.currentOptions[index];
                    const correct = option === this.currentQuestion.result;
                    this.inputLocked = true;
                    this.selectedAnswer = index;
                    this.answerWasCorrect = correct;
                    this.gameState = 'answerFeedback';
                    const segment = this.blockageSegmentFor(this.currentCheckpoint);
                    if (correct) {
                        this.feedback = this.getSuccessMsg();
                        try { successSound.play(); } catch (e) {}
                        updateWeightForKey(this.currentAppId, this.questionIndex, -1);
                        this.score += 1;
                        this.saveScore();
                        this.progress = getCurrentLevelProgress(this.currentAppId);
                        this.$set(this.obstacleStates, segment.id, 'opening');
                        this.later(() => this.finishCorrectAnswer(segment), 850);
                    } else {
                        this.feedback = 'כמעט! ננסה שוב';
                        try { failureSound.play(); } catch (e) {}
                        this.score = Math.max(0, this.score - 1);
                        this.saveScore();
                        updateWeightForKey(this.currentAppId, this.questionIndex, 1);
                        this.progress = getCurrentLevelProgress(this.currentAppId);
                        this.$set(this.obstacleStates, segment.id, 'wrong');
                        this.later(() => this.finishWrongAnswer(segment, index), 560);
                    }
                },
                finishWrongAnswer: function (segment, index) {
                    if (!this.reloadProgress()) return;
                    this.$set(this.attemptedWrong, index, true);
                    this.$set(this.obstacleStates, segment.id, 'pressurized');
                    this.answerWasCorrect = null;
                    this.selectedAnswer = null;
                    this.feedback = 'בחרו תשובה אחרת';
                    this.gameState = 'waitingForAnswer';
                    this.inputLocked = false;
                    this.focusFirstAnswer();
                },
                finishCorrectAnswer: function (segment) {
                    const checkpoint = this.currentCheckpoint;
                    this.$set(this.obstacleStates, segment.id, 'open');
                    this.$set(this.checkpointStatus, checkpoint, 'solved');
                    this.currentQuestion = null;
                    this.currentOptions = [];
                    this.answerWasCorrect = null;
                    this.selectedAnswer = null;
                    if (checkpoint === 2) {
                        this.releaseToDestination();
                        return;
                    }
                    if (!this.reloadProgress()) return;
                    this.$set(this.restored, checkpoint, true);
                    this.gameState = 'waterRelease';
                    this.travelToBlockage(checkpoint + 1);
                },
                releaseToDestination: function () {
                    this.$set(this.restored, 2, true);
                    this.gameState = 'waterRelease';
                    const destinationIndex = this.level.segments.findIndex(segment => segment.type === 'destination');
                    const target = destinationIndex * WP_SEGMENT_WIDTH + 700;
                    this.startTravel(target, 3000, () => this.playEnding(destinationIndex));
                },
                playEnding: function (destinationIndex) {
                    this.activeSegmentIndex = destinationIndex;
                    this.destinationFilled = true;
                    this.gameState = 'ending';
                    this.burstParticles();
                    this.later(() => {
                        if (!this.reloadProgress()) return;
                        this.gameState = 'completedRun';
                    }, 2600);
                },
                restartRun: function () {
                    if (this.gameState !== 'completedRun') return;
                    this.clearTimers();
                    this.create();
                },
                startAnimationLoop: function () {
                    if (this._rafWp) return;
                    this._lastFrameWp = performance.now();
                    const tick = now => {
                        if (this._destroyedWp) return;
                        const dt = Math.min(40, now - this._lastFrameWp) / 1000;
                        this._lastFrameWp = now;
                        if (!document.hidden) {
                            this.updateTravel(now);
                            this.updateCamera(dt);
                            this.updateAmbient(dt, now);
                            this.flowPhase = (this.flowPhase + dt * 34) % 100;
                            if (this.$refs.root) this.$refs.root.style.setProperty('--wp-flow-phase', String(-this.flowPhase));
                        }
                        this._rafWp = requestAnimationFrame(tick);
                    };
                    this._rafWp = requestAnimationFrame(tick);
                },
                updateTravel: function (now) {
                    const travel = this._travelWp;
                    if (!travel || travel.token !== this._runToken) return;
                    const raw = Math.min(1, (now - travel.started) / travel.duration);
                    const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
                    this.waterDistance = travel.from + (travel.to - travel.from) * eased;
                    this.camera.targetX = this.waterDistance - Math.min(150, this.viewport.width / this.sceneScale * 0.12);
                    this.camera.targetY = this.waterDistance < WP_SEGMENT_WIDTH * 0.75 ? 300 : 365;
                    const nextActive = Math.max(0, Math.min(this.level.segments.length - 1, Math.floor(this.camera.targetX / WP_SEGMENT_WIDTH)));
                    if (nextActive !== this.activeSegmentIndex) this.activeSegmentIndex = nextActive;
                    if (raw >= 1) {
                        this._travelWp = null;
                        if (travel.done && !this._destroyedWp && travel.token === this._runToken) travel.done();
                    }
                },
                updateCamera: function (dt) {
                    const factor = this.reducedMotion ? 1 : Math.min(1, dt * 4.8);
                    this.camera.x += (this.camera.targetX - this.camera.x) * factor;
                    this.camera.y += (this.camera.targetY - this.camera.y) * Math.min(1, factor * 0.72);
                },
                setupAmbient: function () {
                    this.ambientMotes = Array.from({length: 16}, (_, index) => ({
                        left: (index * 37 + 11) % 100,
                        top: (index * 53 + 17) % 100,
                        size: 3 + (index % 4) * 1.5,
                        duration: 7 + (index % 6) * 1.35,
                        delay: -(index % 9) * 1.1,
                        color: this.wpTheme.motif.particleColors[index % this.wpTheme.motif.particleColors.length],
                    }));
                },
                ambientMoteStyle: function (mote) {
                    return {
                        left: mote.left + '%', top: mote.top + '%',
                        width: mote.size + 'px', height: mote.size + 'px',
                        background: mote.color,
                        animationDuration: mote.duration + 's',
                        animationDelay: mote.delay + 's',
                    };
                },
                updateAmbient: function (dt, now) {
                    if (!this.reducedMotion && now > (this._nextRareWp || 0)) {
                        this._nextRareWp = now + 5000 + Math.random() * 6000;
                        if (this.$refs.root) {
                            this.$refs.root.classList.remove('wp-rare-event');
                            void this.$refs.root.offsetWidth;
                            this.$refs.root.classList.add('wp-rare-event');
                        }
                    }
                },
                burstParticles: function () {
                    if (!this.$refs.root) return;
                    this.$refs.root.classList.remove('wp-celebrate');
                    void this.$refs.root.offsetWidth;
                    this.$refs.root.classList.add('wp-celebrate');
                },
                resizeGame: function () {
                    const root = this.$refs.root;
                    if (!root) return;
                    const rect = root.getBoundingClientRect();
                    this.viewport = {width: rect.width || window.innerWidth, height: rect.height || window.innerHeight};
                    this.sceneScale = Math.max(this.viewport.width / 1120, this.viewport.height / WP_SCENE_HEIGHT);
                },
                waterFill: function (segment) {
                    const start = segment.start;
                    return Math.max(0, Math.min(100, ((this.waterDistance - start) / WP_SEGMENT_WIDTH) * 100));
                },
                waterStrokeStyle: function (segment) {
                    const fill = this.waterFill(segment);
                    return {strokeDasharray: `${fill} ${Math.max(0.01, 100 - fill)}`};
                },
                waterShineStyle: function (segment) {
                    const fill = this.waterFill(segment);
                    return {strokeDasharray: `3 5 ${Math.max(0, fill - 8)} ${Math.max(0.01, 100 - fill)}`};
                },
                segmentStyle: function (segment) {
                    return {left: segment.start + 'px', width: WP_SEGMENT_WIDTH + 'px', height: WP_SCENE_HEIGHT + 'px'};
                },
                segmentClasses: function (segment) {
                    return [
                        'wp-type-' + segment.type,
                        'wp-region-' + segment.region,
                        {'wp-segment-active': segment.index === this.activeSegmentIndex, 'wp-segment-restored': segment.trigger !== undefined && this.isRestored(segment.trigger)},
                    ];
                },
                obstacleStyle: function (segment) {
                    return {left: (segment.obstacleX - 72) + 'px', top: '318px'};
                },
                obstacleClasses: function (segment) {
                    return ['wp-obstacle-' + segment.visual, 'wp-obstacle-state-' + (this.obstacleStates[segment.id] || 'idle')];
                },
                isRestored: function (checkpoint) {
                    return !!this.restored[checkpoint];
                },
                answerClasses: function (option, index) {
                    return {
                        'wp-answer-selected': this.selectedAnswer === index,
                        'wp-answer-correct': this.selectedAnswer === index && this.answerWasCorrect === true,
                        'wp-answer-wrong': this.selectedAnswer === index && this.answerWasCorrect === false,
                        'wp-answer-tried': !!this.attemptedWrong[index],
                    };
                },
                focusFirstAnswer: function () {
                    this.$nextTick(() => {
                        const buttons = this.$refs.answerButtons || [];
                        const first = buttons.find ? buttons.find(button => !button.disabled) : buttons[0];
                        if (first && first.focus) first.focus({preventScroll: true});
                    });
                },
                onKeyDown: function (event) {
                    if (this.gameState !== 'waitingForAnswer' || this.inputLocked) return;
                    const number = Number(event.key);
                    if (number >= 1 && number <= this.currentOptions.length) {
                        event.preventDefault();
                        this.chooseAnswer(number - 1);
                        return;
                    }
                    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight' && event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
                    const buttons = (this.$refs.answerButtons || []).filter(button => !button.disabled);
                    if (!buttons.length) return;
                    event.preventDefault();
                    const current = buttons.indexOf(document.activeElement);
                    const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
                    buttons[(current + delta + buttons.length) % buttons.length].focus();
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
                clearTimers: function () {
                    if (!this._timersWp) return;
                    this._timersWp.forEach(timer => clearTimeout(timer));
                    this._timersWp.clear();
                },
            },

            mounted: function () {
                this._destroyedWp = false;
                this._timersWp = new Set();
                this._mediaWp = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
                this.reducedMotion = !!(this._mediaWp && this._mediaWp.matches);
                this._onResizeWp = () => this.resizeGame();
                this._onKeyWp = event => this.onKeyDown(event);
                window.addEventListener('resize', this._onResizeWp, {passive: true});
                window.addEventListener('keydown', this._onKeyWp);
                this.resizeGame();
                this.setupAmbient();
            },

            beforeDestroy: function () {
                this._destroyedWp = true;
                this._runToken = (this._runToken || 0) + 1;
                this.questionToken += 1;
                this.clearTimers();
                this._travelWp = null;
                if (this._rafWp) cancelAnimationFrame(this._rafWp);
                this._rafWp = null;
                if (this._onResizeWp) window.removeEventListener('resize', this._onResizeWp);
                if (this._onKeyWp) window.removeEventListener('keydown', this._onKeyWp);
                if (document.fullscreenElement === this.$refs.root && document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                }
            },
        }));
    }

    global.WATER_PIPELINE_LEVEL = WATER_PIPELINE_LEVEL;
    global.validateWaterPipelineLevel = validateWaterPipelineLevel;
    global.waterPipelineSegmentWindow = waterPipelineSegmentWindow;
    global.resolveWaterPipelineTheme = resolveWaterPipelineTheme;
    global.createWaterPipelineComponent = createWaterPipelineComponent;
})(typeof window !== 'undefined' ? window : globalThis);
