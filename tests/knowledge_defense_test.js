const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

let definition = null;
const context = {
    console,
    globalThis: null,
    window: null,
    Vue: {
        extend(value) { return value; },
        component(name, value) { definition = value; return value; },
    },
};
context.globalThis = context;
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('games/knowledge-defense.js', 'utf8'), context, {filename: 'knowledge-defense.js'});

let passed = 0;
function test(name, fn) {
    try { fn(); passed += 1; console.log('✓', name); }
    catch (error) { console.error('✗', name); throw error; }
}

test('configuration is valid and bounded', () => {
    assert.deepStrictEqual(Array.from(context.validateKnowledgeDefenseConfig()), []);
    assert.strictEqual(context.KNOWLEDGE_DEFENSE_CONFIG.sites.length, 5);
    assert.strictEqual(context.KNOWLEDGE_DEFENSE_CONFIG.waves.length, 5);
    assert.ok(context.KNOWLEDGE_DEFENSE_CONFIG.waves.every(wave => wave.units.length <= 12));
});

test('path interpolation is deterministic and clamped', () => {
    // Anchor to the config, not to literals: the coordinates are re-measured
    // whenever tools/kenney-hexmap-render.html regenerates battlefield.png.
    const path = context.KNOWLEDGE_DEFENSE_CONFIG.path;
    const start = context.knowledgeDefensePathPoint(-1);
    const end = context.knowledgeDefensePathPoint(2);
    const castle = path[path.length - 1];
    assert.deepStrictEqual(start, path[0]);  // clamped to the gate
    // progress clamps to .9999, so the tail lands just shy of the castle node
    assert.ok(Math.abs(end.x - castle.x) < 0.05, `end.x ${end.x} != ~${castle.x}`);
    assert.ok(Math.abs(end.y - castle.y) < 0.05, `end.y ${end.y} != ~${castle.y}`);
    assert.ok(Number.isFinite(end.y));
});

test('every current theme has a centralized presentation kit', () => {
    const themes = {
        base: {colors: {primary:'#111111',secondary:'#222222',tertiary:'#333333',accent:'#444444',background:'#555555',text:'#ffffff'}},
        soldiers: {colors: {primary:'#111111',secondary:'#222222',tertiary:'#333333',accent:'#444444',background:'#555555',text:'#ffffff'}},
        unicorn: {colors: {primary:'#111111',secondary:'#222222',tertiary:'#333333',accent:'#444444',background:'#555555',text:'#ffffff'}},
        space: {colors: {primary:'#111111',secondary:'#222222',tertiary:'#333333',accent:'#444444',background:'#555555',text:'#ffffff'}},
        dark: {colors: {primary:'#111111',secondary:'#222222',tertiary:'#333333',accent:'#444444',background:'#555555',text:'#ffffff'}},
        code: {colors: {primary:'#111111',secondary:'#222222',tertiary:'#333333',accent:'#444444',background:'#555555',text:'#ffffff'}},
    };
    Object.keys(themes).forEach(key => {
        const kit = context.resolveKnowledgeDefenseTheme(key, themes);
        assert.strictEqual(kit.key, key);
        assert.ok(kit.motif.realm);
        assert.strictEqual(kit.css['--kd-primary'], '#111111');
    });
    assert.strictEqual(context.resolveKnowledgeDefenseTheme('missing', themes).key, 'base');
});

test('factory exposes lifecycle cleanup and creates a dedicated component', () => {
    const component = context.createKnowledgeDefenseComponent({name: 'base'});
    assert.strictEqual(component, definition);
    assert.strictEqual(component.extends.name, 'base');
    assert.strictEqual(typeof component.beforeDestroy, 'function');
    assert.strictEqual(typeof component.methods.updateBattle, 'function');
});

function answerHarness(correct) {
    const calls = [];
    const timers = [];
    Object.assign(context, {
        updateWeightForKey(id, index, delta) { calls.push(['weight', id, index, delta]); },
        successSound: {play() { calls.push(['success']); return Promise.resolve(); }},
        failureSound: {play() { calls.push(['failure']); return Promise.resolve(); }},
    });
    const component = context.createKnowledgeDefenseComponent({name: 'base'});
    const vmState = {
        attemptLocked: false, question: {result: 'right'}, options: correct ? ['right', 'wrong'] : ['wrong', 'right'],
        questionIndex: 7, currentAppId: 'game-id', score: 2, energy: 6, questionToken: 1,
        reducedMotion: true, _destroyedKd: false, gameState: 'research-question',
        researchAnswered: 0, researchTarget: 2,
        persistStrategy() { calls.push(['persist']); }, reloadProgress() { calls.push(['reload']); return true; },
        saveScore() { calls.push(['save']); }, ownTimeout(fn) { timers.push(fn); },
    };
    component.methods.answer.call(vmState, 0);
    component.methods.answer.call(vmState, 0);
    return {calls, timers, state: vmState};
}

test('correct learning attempt reports exactly once and grants energy', () => {
    const result = answerHarness(true);
    assert.strictEqual(result.calls.filter(call => call[0] === 'weight').length, 1);
    assert.deepStrictEqual(result.calls.find(call => call[0] === 'weight'), ['weight', 'game-id', 7, -1]);
    assert.strictEqual(result.state.score, 3);
    assert.strictEqual(result.state.energy, 8);
    assert.strictEqual(result.calls.filter(call => call[0] === 'reload').length, 1);
});

test('incorrect learning attempt reports once and keeps the question for retry', () => {
    const result = answerHarness(false);
    assert.strictEqual(result.calls.filter(call => call[0] === 'weight').length, 1);
    assert.deepStrictEqual(result.calls.find(call => call[0] === 'weight'), ['weight', 'game-id', 7, 1]);
    assert.strictEqual(result.state.question.result, 'right');
    assert.strictEqual(result.state.score, 1);
    assert.strictEqual(result.timers.length, 1);
    result.timers[0]();
    assert.strictEqual(result.state.attemptLocked, false);
});

test('a wave can be paused to buy mid-fight, and resumes after building', () => {
    const component = context.createKnowledgeDefenseComponent({name: 'base'});
    const site = context.KNOWLEDGE_DEFENSE_CONFIG.sites[0];
    const state = {
        gameState: 'wave', paused: false, selectedSite: null, placedTowers: [], hint: '',
        energy: 20, coins: 50, research: {power: 0, bounty: 0, crystal: 0},
        _towerEnergy: 0, _entity: 0, canEditSites: true,
        towerAt: component.methods.towerAt,
        towerAvailable: component.methods.towerAvailable,
        spendEnergy: component.methods.spendEnergy,
        closeSite: component.methods.closeSite,
        persistStrategy() {}, burst() {}, tone() {},
    };

    component.methods.selectSite.call(state, site);
    assert.strictEqual(state.selectedSite, site.id);
    assert.strictEqual(state.paused, true, 'picking a site mid-wave pauses the battle');

    component.methods.buildTower.call(state, 'archer');
    assert.strictEqual(state.placedTowers.length, 1);
    assert.strictEqual(state.selectedSite, null);
    assert.strictEqual(state.paused, false, 'building resumes the battle');

    component.methods.togglePause.call(state);
    assert.strictEqual(state.paused, true);
    component.methods.togglePause.call(state);
    assert.strictEqual(state.paused, false);

    // planning keeps working exactly as before
    assert.strictEqual(component.computed.canEditSites.call({gameState: 'planning'}), true);
    assert.strictEqual(component.computed.canEditSites.call({gameState: 'wave'}), true);
    assert.strictEqual(component.computed.canEditSites.call({gameState: 'forge'}), false);
});

test('the frame loop freezes the battle while paused', () => {
    const component = context.createKnowledgeDefenseComponent({name: 'base'});
    let tick = null;
    context.requestAnimationFrame = fn => { tick = fn; return 1; };
    const steps = [];
    const state = {
        gameState: 'wave', paused: true, speed: 1, _last: 0, _frame: null, _destroyedKd: false,
        updateBattle(dt) { steps.push(dt); }, updateEffects() {},
    };
    component.methods.startFrame.call(state);
    tick(16);
    assert.strictEqual(steps.length, 0, 'a paused wave does not advance');
    state.paused = false;
    tick(32);
    assert.strictEqual(steps.length, 1, 'resuming advances the battle again');
});

test('the forge returns to the paused wave it was opened from', () => {
    const component = context.createKnowledgeDefenseComponent({name: 'base'});
    const state = {
        gameState: 'wave', paused: true, selectedSite: null, hint: '', energy: 9,
        _forgeReturn: null, hasTower: true, minTowerCost: 3,
        prepareQuestion() {}, tone() {},
    };
    component.methods.openForge.call(state);
    assert.strictEqual(state.gameState, 'forge');
    component.methods.closeForge.call(state);
    assert.strictEqual(state.gameState, 'wave', 'closing the forge goes back to the wave');
    assert.strictEqual(state.paused, true, 'and the wave is still paused');
});

test('the run continues when there is no research left to pick', () => {
    const component = context.createKnowledgeDefenseComponent({name: 'base'});
    const pick = state => {
        state.availableResearch = component.computed.availableResearch.call(state);
        state.canPickResearch = component.computed.canPickResearch.call(state);
        return state;
    };
    const advance = state => {
        component.methods.finishResearch.call(state);
        return state.gameState;
    };

    // research is persisted across runs, so the tree saturates and the choice list empties
    const maxed = pick({
        research: {power: 3, bounty: 2, crystal: 1}, energy: 20, researchCost: 3,
        researchChosen: false, gameState: 'research-choice', waveIndex: 1, coins: 0, hint: '',
    });
    assert.deepStrictEqual(Object.keys(maxed.availableResearch), []);
    assert.strictEqual(maxed.canPickResearch, false);
    assert.strictEqual(advance(maxed), 'planning', 'a maxed tree must not trap the run');
    assert.strictEqual(maxed.waveIndex, 2);

    // and the same when every remaining option is unaffordable
    const broke = pick({
        research: {power: 0, bounty: 0, crystal: 0}, energy: 1, researchCost: 3,
        researchChosen: false, gameState: 'research-choice', waveIndex: 1, coins: 0, hint: '',
    });
    assert.strictEqual(broke.canPickResearch, false);
    assert.strictEqual(advance(broke), 'planning', 'unaffordable research must not trap the run');

    // but a real choice still has to be made
    const choosable = pick({
        research: {power: 0, bounty: 0, crystal: 0}, energy: 20, researchCost: 3,
        researchChosen: false, gameState: 'research-choice', waveIndex: 1, coins: 0, hint: '',
    });
    assert.strictEqual(choosable.canPickResearch, true);
    assert.strictEqual(advance(choosable), 'research-choice', 'still must pick when a pick exists');
    assert.strictEqual(choosable.waveIndex, 1);
});

test('legacy, Adventure, route, asset, and cache registrations exist', () => {
    const apps = fs.readFileSync('apps.js', 'utf8');
    const worlds = fs.readFileSync('worlds.js', 'utf8');
    const tester = fs.readFileSync('tester.js', 'utf8');
    const index = fs.readFileSync('index.html', 'utf8');
    const worker = fs.readFileSync('service-worker.js', 'utf8');
    assert.match(apps, /appType:\s*'knowledge_defense'/);
    assert.match(worlds, /id:\s*'defense'[\s\S]*game:\s*'knowledge_defense'/);
    assert.match(tester, /\/play\/knowledge_defense\/:currentAppId/);
    assert.match(index, /games\/knowledge-defense\.js/);
    assert.match(index, /games\/knowledge-defense\.css/);
    assert.match(worker, /my-app-cache-v\d+/);
});

console.log(`\n${passed} Knowledge Defense tests passed`);
