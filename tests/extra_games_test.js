// Games from outside this repository (learnbox-extra.js): menu items found by
// their own id, and game types registered as routes.
// Loads the real production files into a VM context with browser stubs.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const errors = [];
const ctx = {
    console: {log: console.log, error: (...args) => errors.push(args.join(' '))},
    navigator: {},
    Audio: class { play() {} },
    Math, JSON,
};
ctx.window = ctx;
ctx.globalThis = ctx;
vm.createContext(ctx);

function load(file, code) {
    vm.runInContext(code !== undefined ? code : fs.readFileSync(path.join(ROOT, file), 'utf8'), ctx, { filename: file });
}
function run(code) { return vm.runInContext(code, ctx); }

let passed = 0, failed = 0;
function check(name, cond, extra) {
    if (cond) { passed++; console.log('  PASS', name); }
    else { failed++; console.log('  FAIL', name, extra !== undefined ? '| ' + extra : ''); }
}

load('apps.js', fs.readFileSync(path.join(ROOT, 'apps.js'), 'utf8') + ';globalThis.apps=apps;');
const topLevel = run('apps.items.length');

console.log('--- 1. the published learnbox-extra.js is empty ---');
load('learnbox-extra.js');
check('it adds nothing to the menu', run('apps.items.length') === topLevel);
check('it registers no game type', run('typeof EXTRA_GAME_TYPES') === 'undefined');

// tester.js: only the core functions (everything before the first Vue component)
const tester = fs.readFileSync(path.join(ROOT, 'tester.js'), 'utf8');
const cut = tester.indexOf('var ProgressBarComponent');
if (cut === -1) throw new Error('cut marker not found in tester.js');
load('tester.js(core slice)', tester.slice(0, cut) +
    ';globalThis.getItemById=getItemById;globalThis.getExtraGameRoutes=getExtraGameRoutes;');

console.log('--- 2. items found by their own id ---');
run(`apps.items.push({name: 'extra', type: 'menu', id: 'x-menu', items: [
    {name: 'first', type: 'app', appType: 'mcq', listName: 'COLORS', id: 'x-first'},
    {name: 'second', type: 'app', appType: 'mcq', listName: 'COLORS'},
    {name: 'inner', type: 'menu', items: [{name: 'deep', type: 'app', appType: 'mcq', listName: 'COLORS', id: 'x-deep'}]},
]})`);
check('a menu by its id', run(`getItemById(apps, 'x-menu').name`) === 'extra');
check('a game by its id, wherever it sits', run(`getItemById(apps, 'x-first').name`) === 'first');
check('a game two menus down by its id', run(`getItemById(apps, 'x-deep').name`) === 'deep');
check('an id followed by positions (what the menu links to)', run(`getItemById(apps, 'x-menu_1').name`) === 'second');
check('the same item positionally still resolves', run(`getItemById(apps, '${topLevel}_0').name`) === 'first');
check('an existing positional id is unchanged', run(`getItemById(apps, '0').name`) === run('apps.items[0].name'));
check('an unknown id is not found', run(`getItemById(apps, 'x-nowhere')`) === null);
check('an unknown position under an id is not found', run(`getItemById(apps, 'x-menu_9')`) === undefined);

console.log('--- 3. game types registered from outside ---');
const base = {base: true};
ctx.BASE = base;
check('no EXTRA_GAME_TYPES: no routes', run(`getExtraGameRoutes(BASE, []).length`) === 0);
run(`var EXTRA_GAME_TYPES = [
    {appType: 'x_game', create: base => ({name: 'x-game', extends: base})},
    {appType: 'mcq', create: () => ({name: 'impostor'})},
    {appType: 'Bad Type', create: () => ({})},
    {appType: 'x_broken', create: () => { throw new Error('boom'); }},
    {appType: 'x_empty', create: () => null},
    {appType: 'x_nocreate'},
]`);
const taken = run(`var taken = ['/play/mcq/:currentAppId']; taken`);
const routes = run(`getExtraGameRoutes(BASE, taken)`);
check('one route, for the one good game type', routes.length === 1, JSON.stringify(routes.map(r => r.path)));
check('it plays /play/<appType>/:currentAppId', routes[0].path === '/play/x_game/:currentAppId');
check('its component is built on BaseGameComponent', routes[0].component.extends === base);
check('it takes props like every other game route', routes[0].props === true);
check('a built-in type is not replaced', !routes.some(r => r.component.name === 'impostor'));
check('the new route is now taken', run('taken').indexOf('/play/x_game/:currentAppId') !== -1);
check('each refusal is reported', errors.length === 5, errors.join(' / '));

console.log('--- 4. wiring ---');
const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const at = name => indexHtml.indexOf(`src="./${name}`);
check('index.html loads learnbox-extra.js', at('learnbox-extra.js') !== -1);
check('after data.js and apps.js', at('learnbox-extra.js') > at('data.js') && at('learnbox-extra.js') > at('apps.js'));
check('before tester.js', at('learnbox-extra.js') < at('tester.js'));
check('the service worker caches it', fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8').includes("'/learnbox-extra.js'"));
check('tester.js adds the extra routes', /getExtraGameRoutes\(BaseGameComponent,/.test(tester));
check('the menu links an item by its own id', /if \(app\.id\) \{\s*return `\/\$\{app\.type\}\/\$\{app\.id\}`;/.test(tester));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
