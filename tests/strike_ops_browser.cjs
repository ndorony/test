/*
 * Strike Ops rev 3.1 browser contract, checks 1–34 (STRIKE_OPS_SPEC.md §12.3).
 * Prerequisites: Node LTS, Python 3, system Chrome (Edge fallback), Playwright 1.48.2.
 * Install tooling OUTSIDE this repository:
 *   npm install --prefix "$env:TEMP\strike-ops-pw" playwright@1.48.2
 * Two PowerShell terminals, both in C:\projects\test3:
 *   1: python -m http.server 8767 --bind 127.0.0.1
 *   2: $env:NODE_PATH = "$env:TEMP\strike-ops-pw\node_modules"
 *      node tests\strike_ops_browser.cjs [--full] [--only=1,8,20]
 * If port 8767 is not serving, this harness spawns that same Python command.
 * Default: all slice checks; learning checks repeat on both slice IDs. --full adds registrations, speech
 * and >=3 distinct zones; --only selects check numbers, retaining their setup.
 * Screenshots: artifacts/strike-ops/ (runtime only, never commit).
 * Error gate: one exact TypeError handler.call error originating in tester.js's
 * root Vue created hook per page load is baseline; all other page errors fail.
 * Strike Ops console errors fail, other console errors are printed for review.
 * Only the exact menu /api/v1/child/me HTTP 404 is a network baseline.
 * The corrected bidi contract is ?apple on the physical left, ? OUTSIDE <bdi>.
 * Fake time is paused; advance in bounded runFor steps. DOM .click() bypasses
 * pointer-lock retargeting for lifecycle controls; input tests use real input.
 * Screenshots still require §12.4 human review; call budgets do not prove FPS.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const {spawn} = require('node:child_process');
const {inflateSync} = require('node:zlib');
const {chromium} = require('playwright');
const REPO = path.resolve(__dirname, '..');
// Keep the seed below the engine clamp so a single +/-1 step is not clamped.
const WEIGHT_SEED = 10;
const weightClamp = fs.readFileSync(path.join(REPO, 'tester.js'), 'utf8')
  .match(/Math\.min\(weights\[index\] \+ change,\s*(\d+)\)/);
assert.ok(weightClamp, 'Cannot find the learning weight clamp in tester.js; update the clamp regex');
assert.ok(WEIGHT_SEED <= Number(weightClamp[1]), 'WEIGHT_SEED exceeds the engine weight clamp');
const ARTIFACTS = path.join(REPO, 'artifacts/strike-ops');
const ORIGIN = 'http://127.0.0.1:8767';
const ROOT = '.so-game';
const SLICE_IDS = ['0_4_8', 'grp-ch51-8'];
const FULL_IDS = ['0_33_0_6', '0_33_1_6', '0_34_0_2', '0_34_1_2', '0_45_9', '1_11',
  'grp-ch51s-8', 'grp-otiot-12', 'grp-g611-14', 'grp-g611h-14',
  ...Array.from({length: 5}, (_, i) => ['e', 'h'].map(d => `grp-g6p${i + 1}${d}-7`)).flat()];
const FULL = process.argv.includes('--full');
const onlyArg = process.argv.slice(2).find(s => s.startsWith('--only='));
const ONLY = onlyArg ? new Set(onlyArg.slice(7).split(',').map(Number)) : null;
const timeoutArg = process.argv.slice(2).find(s => s.startsWith('--timeout='));
const TIMEOUT = timeoutArg ? Number(timeoutArg.slice(10)) : 600;
assert.ok((!timeoutArg || /^\d+$/.test(timeoutArg.slice(10))) && Number.isSafeInteger(TIMEOUT) && TIMEOUT > 0,
  '--timeout requires a positive integer number of seconds');
assert.ok(!ONLY || [...ONLY].every(n => Number.isInteger(n) && n >= 1 && n <= 34), '--only requires numbers 1–34');
assert.ok(process.argv.slice(2).every(s => s === '--full' || s === onlyArg || s === timeoutArg), 'Unknown CLI flag');
const registry = [];
const check = (n, name, fn) => registry.push({n, name, fn});
const ok = (value, label, detail) => assert.ok(value, label + (detail === undefined ? '' : ': ' + JSON.stringify(detail)));
const eq = assert.deepEqual;
let browser, server, overallTimeout, activeCheck = 0, activeCheckName = 'harness setup', passed = 0, failed = 0;
const diagnostics = {baseline: [], review: [], errors: []};
const started = Date.now();
const rootVueLine = fs.readFileSync(path.join(REPO, 'tester.js'), 'utf8').split('\n')
  .findIndex(line => /\bvar app\s*=\s*new Vue\(/.test(line)) + 1;

function precacheURLs() {
  const box = {self: {addEventListener() {}, skipWaiting() {}, clients: {}}, URL};
  vm.createContext(box);
  vm.runInContext(fs.readFileSync(path.join(REPO, 'service-worker.js'), 'utf8') +
    '\n;globalThis.precache = urlsToCache;', box, {timeout: 3000});
  return new Set(Array.from(box.precache, u => new URL(u, ORIGIN).href));
}
function serving() {
  return new Promise(resolve => {
    const req = http.get(ORIGIN + '/index.html', res => { res.resume(); resolve(res.statusCode === 200); });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}
async function ensureServer() {
  if (await serving()) return;
  server = spawn('python', ['-m', 'http.server', '8767', '--bind', '127.0.0.1'],
    {cwd: REPO, windowsHide: true, stdio: 'ignore'});
  let spawnError;
  server.on('error', e => { spawnError = e; });
  for (let i = 0; i < 40; i++) {
    if (spawnError) throw spawnError;
    if (await serving()) return;
    await new Promise(resolve => setTimeout(resolve, 100)); // server startup only
  }
  throw Error('Static server failed to start on 8767');
}

// Runs after clock installation on each document. No persistence shortcuts.
function installObservers({noWebGL}) {
  delete Navigator.prototype.serviceWorker;
  const p = window.__soTest = {raf: new Set(), audio: [], contexts: [], losses: 0,
    calls: [], generated: 0, renderers: [], scenes: [], noWebGL, minimapDraws: 0};
  const raf = requestAnimationFrame.bind(window), cancel = cancelAnimationFrame.bind(window);
  window.requestAnimationFrame = fn => {
    const id = raf(t => { p.raf.delete(id); fn(t); }); p.raf.add(id); return id;
  };
  window.cancelAnimationFrame = id => { p.raf.delete(id); cancel(id); };
  for (const key of ['AudioContext', 'webkitAudioContext']) if (window[key]) {
    window[key] = new Proxy(window[key], {construct(target, args) {
      const a = Reflect.construct(target, args); p.audio.push(a); return a;
    }});
  }
  const get = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, ...args) {
    const gl = /^(webgl2?|experimental-webgl)$/.test(type);
    if (gl && p.noWebGL) return null;
    const result = get.call(this, type, ...args);
    if (gl && result && !p.contexts.some(e => e.context === result)) {
      const entry = {canvas: this, context: result, losses: 0, programs: 0};
      p.contexts.push(entry);
      this.addEventListener('webglcontextlost', () => { entry.losses++; p.losses++; });
      const link = result.linkProgram.bind(result);
      result.linkProgram = program => { entry.programs++; return link(program); };
    }
    if (type === '2d' && result && !result.__soObserved) {
      result.__soObserved = true;
      for (const name of ['clearRect', 'fillRect', 'drawImage', 'fill', 'stroke']) {
        const original = result[name].bind(result), canvas = this;
        result[name] = (...a) => {
          if (canvas.matches('.so-minimap, .so-minimap canvas')) p.minimapDraws++;
          return original(...a);
        };
      }
    }
    return result;
  };
}

async function harness(kind = 'desktop', options = {}) {
  const touch = kind === 'touch';
  const context = await browser.newContext({viewport: touch ? {width: 390, height: 844} : {width: 1440, height: 900},
    hasTouch: touch, isMobile: touch, deviceScaleFactor: 1, serviceWorkers: 'block',
    reducedMotion: options.reduced ? 'reduce' : 'no-preference'});
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  await page.clock.install({time: new Date('2026-01-01T00:00:00Z')});
  await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await context.addInitScript(installObservers, {noWebGL: !!options.noWebGL});
  let id, auditing = false, baselineUsed = false, load = 0;
  const requests = [], responses = [], errors = [], menu404 = new Set();
  const injected404URLs = new Set();
  // Match both message and tester.js origin; a different origin never qualifies.
  function rootHook(text, type, origin) {
    return type === 'TypeError' && /^(?:TypeError: )?handler\.call is not a function$/.test(text) &&
      new RegExp('tester\\.js(?:\\?[^\\s:)]*)?:' + rootVueLine + ':').test(origin) &&
      /new Vue|created.*(?:Root|root)/s.test(origin) && !/games\/strike-ops\.js/.test(origin);
  }
  function baseline(label) {
    if (baselineUsed) { errors.push('second root-hook occurrence in load ' + load + ': ' + label); return; }
    baselineUsed = true; diagnostics.baseline.push(`${kind} load ${load}: ${label}`);
  }
  page.on('pageerror', e => {
    if (rootHook(e.message, e.name, e.stack || '')) baseline(e.stack || e.message);
    else errors.push('pageerror: ' + (e.stack || e.message));
  });
  page.on('console', m => {
    if (m.type() !== 'error') return;
    const location = m.location(), text = m.text(), url = location.url || '';
    const exact = text.match(/^(?:TypeError: )?(handler\.call is not a function)(?:\n|$)/);
    if (exact && rootHook(exact[1], 'TypeError', text + '\n' + url + ':' + (location.lineNumber + 1) + ':')) { baseline(text); return; }
    if (url === ORIGIN + '/api/v1/child/me' && menu404.has(url) && /\b404\b/.test(text) && !page.url().includes('/play/')) {
      diagnostics.baseline.push(`${kind} menu ${url} HTTP 404`); return;
    }
    if (injected404URLs.has(url) && /^Failed to load resource: the server responded with a status of 404 \(Not Found\)$/.test(text)) {
      diagnostics.review.push(`${kind} injected HTTP 404: ${text} (${url})`); return;
    }
    if (/games\/strike-ops\.js|strike-ops|\/assets\/strike-ops\//i.test(text + ' ' + url)) errors.push(`console: ${text} (${url})`);
    else diagnostics.review.push(`${kind}: ${text} (${url})`);
  });
  page.on('request', r => { if (auditing) requests.push(r.url()); });
  page.on('response', r => {
    if (auditing) responses.push(r);
    if (r.url() === ORIGIN + '/api/v1/child/me' && r.status() === 404 && !page.url().includes('/play/')) menu404.add(r.url());
  });
  const state = (fn, arg) => page.locator(ROOT).evaluate((el, data) => {
    if (!el.__vue__) throw Error('.so-game.__vue__ missing');
    return (new Function('g', 'arg', 'return (' + data.source + ')(g,arg)'))(el.__vue__, data.arg);
  }, {source: fn.toString(), arg});
  const tick = async ms => { for (let left = ms; left > 0; left -= Math.min(left, 50)) await page.clock.runFor(Math.min(left, 50)); };
  async function until(predicate, label, max = 10000, step = 25) {
    for (let elapsed = 0; elapsed <= max; elapsed += step) {
      if (await predicate()) return;
      if (elapsed < max) await tick(step);
    }
    throw Error(label + ': timed out; ' + JSON.stringify(await page.locator(ROOT).count() ? await state(g => g.debugSnapshot()) : page.url()));
  }
  const click = selector => page.locator(selector).evaluate(el => el.click());
  const phase = () => state(g => g.phase);
  async function boot(theme = 'base') {
    auditing = false; baselineUsed = false; menu404.clear(); load++;
    await page.goto(ORIGIN + '/', {waitUntil: 'load'});
    await until(() => page.evaluate(() => typeof BaseGameComponent !== 'undefined'), 'engine ready');
    await page.evaluate(theme => {
      setTheme(theme);
      const p = window.__soTest, original = window.recordAttemptResult;
      if (typeof original !== 'function') throw Error('recordAttemptResult unavailable');
      window.recordAttemptResult = function(...a) { p.calls.push([a[0], a[1], a[2] ? -1 : 1]); return original.apply(this, a); };
      const generate = window.generateFromList;
      if (typeof generate !== 'function') throw Error('generateFromList unavailable');
      window.generateFromList = function(...a) { p.generated++; return generate.apply(this, a); };
      p.baselineContexts = new Set(p.contexts);
      if (window.THREE) window.THREE.WebGLRenderer = new Proxy(window.THREE.WebGLRenderer, {construct(target, args) {
        const r = Reflect.construct(target, args), render = r.render.bind(r); p.renderers.push(r);
        r.render = (scene, camera) => {
          if (!p.scenes.includes(scene)) p.scenes.push(scene);
          if (camera.isPerspectiveCamera && !r.__soCamera) {
            r.__soCamera = camera; r.__soScene = scene; p.mainCamera = camera;
          }
          return render(scene, camera);
        };
        return r;
      }});
    }, theme);
  }
  async function enter(nextId = SLICE_IDS[0], fresh = true, settings = {}) {
    if (!settings.booted) await boot(settings.theme);
    id = nextId; requests.length = 0; responses.length = 0;
    await page.evaluate(({id, fresh, settings, weightSeed}) => {
      const app = getItemById(apps, id);
      if (!app || app.appType !== 'strike_ops') throw Error('Missing registration ' + id);
      if (fresh) {
        setLocalStorage(getActivityMode() + '_' + id + '_Weights', getDataList(app.listName).map(() => weightSeed));
        setLocalStorage(id + '_CurrentLevelProgress', settings.progress || {progress: 0, total: 9999});
        setLocalStorage(id + '_new_items', settings.news || []);
        setLocalStorage(id + '_attemptHistory', {}); setLocalStorage('score' + id, 0);
      }
      const p = window.__soTest; p.baselineContexts = new Set(p.contexts);
      // Synchronous MutationObserver captures loading even if assets are cached.
      p.phases = []; p.firstBriefingLayout = null;
      if (p.phaseObserver) p.phaseObserver.disconnect();
      p.phaseObserver = new MutationObserver(() => {
        const root = document.querySelector('.so-game');
        if (root) {
          const phase = root.getAttribute('data-phase'); p.phases.push(phase);
          if (phase === 'briefing' && !p.firstBriefingLayout && root.__vue__) p.firstBriefingLayout = root.__vue__.getLayout();
        }
      });
      p.phaseObserver.observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['data-phase']});
    }, {id, fresh, settings, weightSeed: WEIGHT_SEED});
    auditing = true;
    await page.evaluate(id => { location.hash = '/play/strike_ops/' + id; }, id);
    if (settings.redirect) { await until(() => page.evaluate(hash => location.hash === '#' + hash, settings.redirect), 'startup redirect'); return; }
    await until(() => page.locator(ROOT).count(), 'root mounted');
    if (settings.loading) return;
    await until(() => state(g => g.phase !== 'loading'), 'asset loading/fallback', 20000, 50);
    eq(await phase(), 'briefing');
  }
  async function start(wait = true, requireGL = true) {
    if (requireGL) eq(await state(g => g.renderMode), 'gl', 'GL check may not silently use DOM');
    if (touch) await page.tap('.so-start', {force: true}); else await click('.so-start');
    eq(await phase(), 'deploying');
    if (wait) {
      const ms = await page.evaluate(() => STRIKE_OPS_CONFIG.timing.approachMs);
      await tick(ms - 1); eq(await phase(), 'deploying'); await tick(1); eq(await phase(), 'engaging');
    }
  }
  const correct = () => state(g => g.options.indexOf(g.question.result));
  const wrong = () => state(g => g.options.findIndex(o => o !== g.question.result));
  const identity = () => state(g => [g.question.question, g.options, g.questionIndex, g.questionToken, g.roundKind]);
  const counters = () => state(g => [g.roundNumber, g.roundInZone, g.zoneNumber, g.zoneIndex, g.zoneId, g.stars]);
  const learning = () => state(g => ({score: g.score, saved: getScore(g.currentAppId), index: g.questionIndex,
    weights: getLocalStorage(getActivityMode() + '_' + g.currentAppId + '_Weights'),
    history: getAttemptHistory(g.currentAppId), calls: window.__soTest.calls.slice()}));
  async function transaction(before, success) {
    const after = await learning(), delta = success ? -1 : 1;
    eq(after.calls.slice(before.calls.length), [[id, before.index, delta]], 'exactly one engine report');
    eq(after.weights[before.index], before.weights[before.index] + delta);
    eq(after.history[before.index], [...(before.history[before.index] || []), success].slice(-5));
    eq(after.score, success ? before.score + 1 : Math.max(0, before.score - 1)); eq(after.saved, after.score);
  }
  async function shoot(i, forced = true) {
    if (forced) ok(await state((g, i) => g.forceExpose(i), i), 'force exposed');
    const result = await state((g, i) => g.shootEnemy(i), i);
    ok(result.fired && result.accepted && result.hitIndex === i && !result.blocked, 'real shot accepted', result);
  }
  async function duplicate(i) {
    const before = await learning();
    ok(await state((g, i) => !g.shootEnemy(i).accepted && g.answer(i) === false, i), 'duplicate rejected');
    eq(await learning(), before);
  }
  async function next(skip = false) {
    const n = await state(g => g.roundNumber);
    await until(() => state(g => ['regroup', 'roaming', 'advancing'].includes(g.phase)), 'transition starts', 1000, 10);
    if (await phase() === 'roaming') {
      if (skip) { ok(await state(g => g.skipTransition()), 'skip roaming enters encounter'); }
      else await walk({state, phase, tick, until}, await state(g => g.zoneId));
    }
    if (skip) { ok(await state(g => g.skipTransition()), 'skipTransition'); await tick(1); }
    else await until(() => state(g => g.phase === 'engaging'), 'natural arrival', 3300, 10);
    eq(await state(g => g.roundNumber), n + 1);
  }
  async function boss() {
    while (await state(g => g.roundInZone < 3)) { await shoot(await correct()); await next(); }
    eq(await state(g => g.roundKind), 'boss');
  }
  async function prepare(target) {
    await enter(id || SLICE_IDS[0]);
    if (target === 'deploying') { await start(false); return; }
    await start();
    if (target === 'engaging') return;
    if (target === 'roaming') { await clearPlace({state, shoot, correct, boss, tick, phase}); return; }
    if (target === 'advancing' || target === 'paused') {
      if (target === 'advancing') {
        await clearPlace({state, shoot, correct, boss, tick, phase});
        ok(await state(g => g.skipToZone(4)), 'retarget plaza in roaming');
        ok((await state(g => g.teleport('plaza'))).triggered, 'plaza encounter');
        await tick(1000); await boss();
      }
      await shoot(await correct()); await tick(900);
      if (target === 'paused') await click('.so-pause');
    } else if (target === 'regroup') { await shoot(await correct()); await tick(900); }
    else await shoot(target === 'wrong' ? await wrong() : await correct());
    eq(await phase(), target);
  }
  async function leave(button = true) {
    await state(g => { window.__soTest.retained = g; });
    if (button) await click('.so-exit'); else await page.evaluate(id => { location.hash = '/app/' + id; }, id);
    await until(async () => !(await page.locator(ROOT).count()), 'route destroyed'); await tick(5000);
    eq(new URL(page.url()).hash, '#/app/' + id);
    const result = await page.evaluate(() => {
      const p = window.__soTest;
      return {raf: p.raf.size, audio: p.audio.map(a => a.state), pointer: !!document.pointerLockElement,
        live: p.contexts.filter(e => !p.baselineContexts.has(e) && !e.context.isContextLost()).length,
        phase: p.retained.phase, timers: p.retained.getPhaseTimers(), calls: p.calls.length};
    });
    eq(result.raf, 0); eq(result.live, 0); eq(result.pointer, false); eq(result.phase, 'left');
    ok(result.audio.every(s => s === 'closed') && result.timers.every(t => !t.pending), 'resources released', result);
    await tick(5000); eq(await page.evaluate(() => window.__soTest.calls.length), result.calls);
  }
  const shot = async label => page.screenshot({path: path.join(ARTIFACTS, label.replace(/[^\w.-]/g, '_') + '.png')});
  async function loss() {
    await page.evaluate(() => {
      const p = window.__soTest, e = p.contexts.find(e => !p.baselineContexts.has(e) && !e.context.isContextLost());
      const ext = e && e.context.getExtension('WEBGL_lose_context');
      if (!ext) throw Error('WEBGL_lose_context required'); ext.loseContext();
    });
    await until(() => state(g => g.phase === 'lost'), 'context loss', 10000, 1);
    ok(await page.locator('.so-lost-restart').isVisible(), 'lost panel shown');
    ok(await state(g => g.getPhaseTimers().every(t => !t.pending)), 'lost timers frozen');
    ok(await page.evaluate(() => window.__soTest.losses > 0), 'real context loss event observed');
  }
  return {context, page, touch, state, tick, until, click, phase, boot, enter, start, correct, wrong, identity,
    counters, learning, transaction, shoot, duplicate, next, boss, prepare, leave, shot, loss, errors, requests, responses, injected404URLs};
}
async function withHarness(kind, fn, options) {
  const h = await harness(kind, options);
  try { await fn(h); }
  catch (error) {
    try { await h.shot(`FAIL-${activeCheck}-${kind}-${Date.now()}`); } catch (_) { /* Keep original assertion. */ }
    throw error;
  } finally {
    await h.context.close();
    diagnostics.errors.push(...h.errors);
    if (h.errors.length) console.error('ERROR GATE', h.errors.join('\n'));
  }
}
async function slice(fn, kind = 'desktop', options) {
  for (const id of SLICE_IDS) await withHarness(kind, h => fn(h, id), options);
}

const near = (actual, expected, tolerance = .05, label = 'position') =>
  ok(Math.abs(actual - expected) <= tolerance, label, {actual, expected, tolerance});
const headingNear = (actual, expected) => near(((actual - expected + 540) % 360) - 180, 0, 1, 'heading');
const poseOf = p => ({x: p.x, z: p.z, headingDeg: p.headingDeg, pitchDeg: p.pitchDeg});
async function atStart(h) {
  const p = await h.state(g => g.getPlayer());
  near(p.x, 0, .01); near(p.z, 1, .01); headingNear(p.headingDeg, 0);
  ok(await h.state(g => g.getMap().gates.every(gate => !gate.open)), 'all gates closed');
}
async function clearPlace(h) {
  await h.boss(); await h.shoot(await h.correct()); await h.tick(900);
  eq(await h.phase(), 'roaming');
}
async function targetPlace(h, n) {
  if (await h.phase() !== 'roaming') await clearPlace(h);
  const before = await h.learning();
  ok(await h.state((g, n) => g.skipToZone(n), n), 'retarget roaming');
  eq(await h.learning(), before, 'retarget is presentation only');
  return h.state(g => g.getMap().places.find(p => p.target));
}
// §12.3's walk(...) is a harness helper, not an additional component API.
async function walk(h, target, {started = false, max, sample} = {}) {
  const route = await h.state(g => g.getMap().route);
  const length = route.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - route[i].x, p.z - route[i].z), 0);
  const budget = max ?? Math.ceil((length / 3 + 3) * 1000);
  if (!started) ok(await h.state((g, target) => g.walkTo(target), target), 'walkTo accepts reachable target');
  let elapsed = 0;
  while (await h.phase() === 'roaming' && elapsed < budget) {
    await h.tick(16); elapsed += 16;
    if (sample) await sample();
  }
  eq(await h.phase(), 'deploying', 'walk enters target before route deadline');
  eq(await h.state(g => g.autopilot), false, 'entry cancels autopilot');
}
async function observeMapEvents(h) {
  await h.page.evaluate(() => {
    const p = window.__soTest, root = document.querySelector('.so-game');
    if (p.mapObserver) p.mapObserver.disconnect();
    p.mapEvents = {phases: [], live: [], toast: []};
    let phase = root.dataset.phase, live = '', toast = '';
    p.mapObserver = new MutationObserver(() => {
      if (root.dataset.phase !== phase) { phase = root.dataset.phase; p.mapEvents.phases.push(phase); }
      for (const key of ['live', 'toast']) {
        const text = root.querySelector('.so-' + key)?.textContent.trim() || '';
        const old = key === 'live' ? live : toast;
        if (text && text !== old) p.mapEvents[key].push(text);
        if (key === 'live') live = text; else toast = text;
      }
    });
    p.mapObserver.observe(root, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['data-phase']});
  });
}
async function visibility(h, hidden) {
  await h.page.evaluate(hidden => {
    if (hidden) {
      Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
      Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'});
    } else { delete document.hidden; delete document.visibilityState; }
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}
async function restart(h) {
  await h.click('.so-lost-restart');
  await h.until(() => h.state(g => !['loading', 'lost'].includes(g.phase)), 'restart', 20000, 1);
}

async function exposure(h) {
  await h.state(g => g.setRendering(false));
  const period = await h.page.evaluate(() => { const s = STRIKE_OPS_CONFIG.squad; return s.exposedMs + s.hiddenMs + 2 * s.slideMs; });
  // Run at least 33 seconds; compare six complete periods (37.2s at defaults).
  const duration = Math.ceil(33000 / period) * period;
  const trace = [], visits = [], dashes = [], previous = [];
  for (let t = 0; t < duration; t += 50) {
    await h.tick(Math.min(50, duration - t));
    const enemies = await h.state(g => g.getEnemies());
    trace.push(enemies.map(e => [e.state, e.hittable]));
    enemies.forEach((e, i) => {
      if (e.hittable && !previous[i]) visits[i] = (visits[i] || 0) + 1;
      previous[i] = e.hittable; if (e.state === 'dash') dashes[i] = true;
    });
  }
  const ledger = await h.state(g => g.getEnemies().map(e => e.exposureMs));
  const mean = ledger.reduce((a, b) => a + b, 0) / ledger.length;
  ok(mean > 0 && ledger.every(v => Math.abs(v - mean) / mean <= .05), 'whole-period ledger ±5%', ledger);
  ok(ledger.every((_, i) => visits[i] >= 5 && dashes[i]), 'five hittable windows and dash per soldier', visits);
  return {trace, ledger};
}
function rect(r) {
  if (!r) return null;
  const x = r.x ?? r.left, y = r.y ?? r.top, w = r.width ?? r.w ?? r.right - x, h = r.height ?? r.h ?? r.bottom - y;
  ok([x, y, w, h].every(Number.isFinite), 'finite layout rect', r);
  return {x, y, w, h, right: x + w, bottom: y + h};
}
const overlaps = (a, b) => a.x < b.right - 1 && b.x < a.right - 1 && a.y < b.bottom - 1 && b.y < a.bottom - 1;
async function layout(h, scale = 1, firstFrame = null) {
  const l = firstFrame || await h.state(g => g.getLayout()), size = h.page.viewportSize();
  const hud = Object.entries({banner: l.banner, counter: l.counter, answers: l.answers, minimap: l.minimap, ...l.controls})
    .filter(([, r]) => r).map(([name, r]) => [name, rect(r)]);
  for (let i = 0; i < hud.length; i++) {
    const [name, r] = hud[i];
    ok(r.w > 0 && r.h > 0 && r.x >= -1 && r.y >= -1 && r.right <= size.width + 1 && r.bottom <= size.height + 1, 'on-screen ' + name, r);
    for (const [other, q] of hud.slice(i + 1)) ok(!overlaps(r, q), `${name}/${other} do not overlap`, [r, q]);
  }
  const safe = rect(l.safeRect);
  for (const p of l.plates.filter(Boolean).map(rect)) ok(p.x >= safe.x - 1 && p.y >= safe.y - 1 && p.right <= safe.right + 1 && p.bottom <= safe.bottom + 1, 'plate in safeRect', p);
  if (l.objective) {
    const r = rect(l.objective);
    ok(r.x >= safe.x - 1 && r.right <= safe.right + 1 && r.y >= safe.y - 1 && r.bottom <= safe.bottom + 1, 'objective in safeRect', r);
  }
  if (l.controls.go) ok(rect(l.controls.go).h >= 56, 'Go target >=56px');
  if (l.toast) for (const r of [l.banner, l.answers, l.controls.go].filter(Boolean)) ok(!overlaps(rect(l.toast), rect(r)), 'toast clear of learning/Go row');
  const min = await h.page.evaluate(() => STRIKE_OPS_CONFIG.framing.minPlateTextPx);
  ok(l.answerTextPx >= min * scale - .1 && l.plateTextPx >= min * scale - .1, 'minimum text size', l);
  const issues = await h.page.locator(ROOT).evaluate(root => {
    const issues = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('horizontal overflow');
    for (const b of root.querySelectorAll('button')) {
      const s = getComputedStyle(b), r = b.getBoundingClientRect();
      if (b.disabled || !r.width || !r.height || s.visibility === 'hidden' || s.display === 'none') continue;
      if (r.width < 43.5 || r.height < 43.5) issues.push('target <44: ' + b.className);
    }
    return issues;
  });
  eq(issues, [], 'responsive targets');
  return l;
}
async function order(h) {
  const l = await h.state(g => g.getLayout()), enemies = await h.state(g => g.getEnemies());
  const visible = enemies.filter(e => e.visible).sort((a, b) => a.screenX - b.screenX);
  eq(visible.map(e => e.index), visible.map(e => e.index).sort((a, b) => a - b), 'world left-to-right order');
  const rows = await h.page.locator(ROOT).evaluate(root => {
    const collect = selector => [...root.querySelectorAll(selector)].map(el => ({index: +el.dataset.index,
      x: el.getBoundingClientRect().left, visible: el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== 'hidden',
      marker: (el.querySelector('[aria-hidden="true"]') || el.querySelector('[class*="marker"]'))?.textContent.trim(), text: el.textContent.trim()}));
    return {chips: collect('.so-answer'), plates: collect('.so-plate')};
  });
  eq(rows.chips.map(e => e.index), enemies.map(e => e.index), 'DOM index order');
  for (const collection of [l.answersLayout === 'row' ? rows.chips : [], rows.plates.filter(e => e.visible)])
    for (let i = 1; i < collection.length; i++) ok(collection[i].x > collection[i - 1].x, 'horizontal order across tiers', collection);
  for (const e of enemies) {
    ok(rows.chips[e.index].text.includes(e.answer), 'chip matches enemy answer');
    for (const selector of ['.so-answer', '.so-plate']) {
      const marker = h.page.locator(`${selector}[data-index="${e.index}"] .so-marker`);
      eq(await marker.getAttribute('data-badge'), String(e.badge.number));
      eq(await marker.getAttribute('data-shape'), e.badge.shape);
    }
    if (l.answersLayout === 'stacked') {
      ok(rows.chips[e.index].marker, 'stacked chip has marker');
      eq(rows.chips[e.index].marker, rows.plates[e.index].marker, 'chip/plate marker identity');
    }
  }
}
async function bossPresentation(h) {
  const enemies = await h.state(g => g.getEnemies());
  ok(enemies.length > 1 && enemies.every(e => e.kind === 'copy' && e.hittable), 'settled copies hittable');
  eq(enemies.filter(e => e.isReal).length, 1);
  const presentation = e => ({scale: e.scale, clip: {role: e.clip.role, name: e.clip.name}, materials:
    e.materials.map(({slot, tint, opacity, emissive, transparent}) => ({slot, tint, opacity, emissive, transparent})).sort((a, b) => a.slot.localeCompare(b.slot))});
  for (const e of enemies) eq(presentation(e), presentation(enemies[0]), 'no visual tell');
  const ids = enemies.flatMap(e => e.materials.map(m => m.id)); eq(new Set(ids).size, ids.length, 'materials cloned');
  ok(await h.page.locator(ROOT).evaluate(el => el.classList.contains('so-boss-round')), 'boss class');
}
async function bossLearning(h, advancing) {
  await bossPresentation(h); const token = await h.identity();
  const w = await h.wrong(), c = await h.correct(), before = await h.learning();
  await h.shoot(w, false); await h.transaction(before, false); await h.duplicate(c);
  await h.tick(460);
  const dissolved = await h.state((g, i) => g.getEnemies()[i], w);
  eq(dissolved.state, 'dissolved'); ok(dissolved.materials.every(m => m.opacity === 0), 'decoy fully dissolved');
  const locked = await h.learning();
  ok(await h.state(g => g.getEnemies().filter(e => e.index !== g.wrongOption).every(e => !g.shootEnemy(e.index).accepted)), 'other decoys and real copy reject input during lock');
  eq(await h.learning(), locked);
  await h.tick(150); eq(await h.phase(), 'engaging'); eq(await h.identity(), token);
  ok(await h.state((g, i) => g.getEnemies()[i].hittable, w), 'hittable during re-form');
  const retry = await h.learning(); await h.shoot(w, false); await h.transaction(retry, false); await h.tick(700);
  const correctBefore = await h.learning(); await h.shoot(c, false); await h.transaction(correctBefore, true);
  const old = await h.counters(); await h.tick(1000); eq(await h.phase(), advancing ? 'roaming' : 'regroup');
  if (advancing) {
    // Natural boss clears a place; GL roaming is untimed until its trigger.
    eq(await h.state(g => g.getPhaseTimers()), []);
    ok(await h.state(g => g.attemptLocked), 'held question locked');
    const held = await h.identity();
    await h.tick(10000); eq(await h.phase(), 'roaming');
    const map = await h.state(g => g.getMap());
    eq(map.places.find(p => p.target).id, 'containers');
    eq(map.gates.find(g => g.id === 'g1').open01, 1);
    ok(await h.page.locator('.so-go').isVisible(), 'Go visible');
    ok(await h.page.locator('.so-objective-line').isVisible(), 'objective replaces question');
    await h.state(g => { const action = g.question.action; window.__soTest.actions = 0;
      g.question.action = function(...args) { window.__soTest.actions++; if (action) return action.apply(this, args); }; });
    ok((await h.state(g => g.teleport('containers'))).triggered, 'teleport triggers');
    eq(await h.phase(), 'deploying'); await h.tick(1000);
    eq(await h.identity(), held); eq(await h.page.evaluate(() => window.__soTest.actions), 1);
    const now = await h.counters(); eq(now[2], old[2] + 1); eq(now[5], old[5] + 1); eq(now[4], 'containers');
  } else await h.tick(1600);
  eq(await h.phase(), 'engaging');
}

// Injected content always goes through generateFromList and the real route.
async function fixtures(h) {
  return h.page.evaluate(() => {
    const icon = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="teal"/></svg>');
    const sentence = 'מה פירוש המילה English 123 (apple) 3+4=? "run", המשיכו לקרוא את המשפט הארוך עד הסוף';
    DATA.SO_QA_MIXED = Array.from({length: 4}, (_, i) => ({question: {type: 'text', value: sentence.repeat(3)},
      answer: {type: 'text', value: i === 3 ? `<img src="${icon}" alt="Training square">` :
        'A long English answer with (apple) 3+4=? "run", abcdefghijklmnopqrstuvwxyzABCD and more than sixty characters ' + i}}));
    DATA.SO_QA_BIDI = Array.from({length: 4}, (_, i) => ({question: {type: 'text', value: 'מה פירוש המילה: apple?'}, answer: {type: 'text', value: 'Choice ' + i}}));
    const menu = apps.items.length;
    const app = (listName, questionIndex, resultIndex) => ({type: 'app', appType: 'strike_ops', name: 'SO QA', listName, questionIndex, resultIndex, setItems: 4});
    apps.items.push({type: 'menu', name: 'Hidden browser fixtures', items: [
      app('ENGLISH_CHAPTER5_ALL', 'hebrew', 'english'), app('SO_QA_MIXED', 'question', 'answer'), app('SO_QA_BIDI', 'question', 'answer')]});
    return [0, 1, 2].map(i => menu + '_' + i);
  });
}
async function content(h, long = false) {
  const result = await h.page.locator(ROOT).evaluate(root => {
    const issues = [], g = root.__vue__, visible = el => el.getBoundingClientRect().width && getComputedStyle(el).visibility !== 'hidden';
    const plain = html => { const el = document.createElement('div'); el.innerHTML = html; return el.textContent.trim(); };
    function exactText(el, text) {
      // Marker/state chrome is separate: locate the smallest element carrying
      // exactly the option text rather than asserting the whole numbered button.
      return [el, ...el.querySelectorAll('*')].reverse().find(e => e.textContent.trim() === text);
    }
    for (const selector of ['.so-answer', '.so-plate']) for (const el of root.querySelectorAll(selector)) {
      if (!visible(el)) continue;
      const option = String(g.options[+el.dataset.index]), text = plain(option);
      const enemy = g.getEnemies()[+el.dataset.index];
      if (selector === '.so-plate' && enemy.plate.collapsed) continue;
      if (!text && /<img/i.test(option)) continue;
      const target = exactText(el, text);
      if (!target) { issues.push('missing full option text ' + selector); continue; }
      const direction = /[\u0590-\u05ff]/.test(text) ? 'rtl' : 'ltr';
      if (getComputedStyle(target).direction !== direction) issues.push('option direction ' + selector);
      for (const node of [el, target]) {
        if (getComputedStyle(node).textOverflow === 'ellipsis') issues.push('ellipsis');
        if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) issues.push('clipped option ' + selector);
      }
    }
    const q = root.querySelector('.so-question'), s = getComputedStyle(q);
    const expected = /[\u0590-\u05ff]/.test(q.textContent) ? 'rtl' : 'ltr';
    if (s.direction !== expected) issues.push('banner direction');
    if (s.textOverflow === 'ellipsis') issues.push('banner ellipsis');
    if (expected === 'rtl' && /[A-Za-z]/.test(q.textContent) && !q.querySelector('bdi[dir="ltr"]')) issues.push('missing Latin isolate');
    if (innerWidth === 390) {
      const line = parseFloat(s.lineHeight), height = q.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom);
      if (!Number.isFinite(line) || height > 3 * line + 2) issues.push('banner >3 lines');
      if (q.scrollHeight > q.clientHeight + 1 && !['auto', 'scroll'].includes(s.overflowY)) issues.push('banner not scrollable');
    }
    if (!root.querySelector('.so-live[aria-live="polite"]')) issues.push('live region');
    for (const img of root.querySelectorAll('.so-answer img')) if (!img.complete || !img.naturalWidth || img.width > 56 || img.height > 56) issues.push('image answer not loaded/capped');
    return issues;
  });
  eq(result, [], 'full text and bidirectional content');
  if (long && h.page.viewportSize().width === 390) eq(await h.state(g => g.getLayout().answersLayout), 'stacked');
  await order(h);
}
async function bidi(h) {
  const glyphs = await h.page.locator('.so-question').evaluate(el => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT), chars = []; let node;
    while ((node = walker.nextNode())) for (let i = 0; i < node.textContent.length; i++) {
      const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
      const r = range.getClientRects()[0];
      if (r) chars.push({char: node.textContent[i], x: r.left, right: r.right, y: r.top,
        bdi: node.parentElement.closest('bdi')?.getAttribute('dir') || null});
    }
    return {chars, em: parseFloat(getComputedStyle(el).fontSize)};
  });
  const text = glyphs.chars.map(c => c.char).join(''), start = text.indexOf('apple');
  ok(start >= 0, 'exact apple fixture');
  const letters = glyphs.chars.slice(start, start + 5), q = glyphs.chars.find(c => c.char === '?'), colon = glyphs.chars.find(c => c.char === ':');
  ok(q && colon, 'fixture punctuation'); eq(q.bdi, null, '? outside isolate');
  ok(letters.every(c => c.bdi === 'ltr'), 'apple in LTR bdi');
  const sequence = [q, ...letters, colon];
  for (let i = 1; i < sequence.length; i++) ok(sequence[i - 1].x < sequence[i].x, 'corrected physical ? a p p l e : order', sequence);
  ok(letters[0].x - q.right >= -1 && letters[0].x - q.right < .5 * glyphs.em, '? immediately left of a');
  const words = ['מה', 'פירוש', 'המילה'].map(word => {
    const at = text.indexOf(word); ok(at >= 0, 'Hebrew word present');
    return glyphs.chars.slice(at, at + word.length);
  });
  const centers = words.map(w => w.reduce((s, c) => s + c.x, 0) / w.length);
  ok(centers[0] > centers[1] && centers[1] > centers[2] && Math.min(...words[2].map(c => c.x)) > colon.x, 'Hebrew words RTL, מה rightmost');
  await h.page.screenshot({clip: await h.page.locator('.so-question').boundingBox(),
    path: path.join(ARTIFACTS, `bidi-${h.touch ? 'touch' : 'desktop'}.png`)});
}

async function pauseRoundTrip(h, phase, elapsed = 200, mechanism = 'visibility') {
  await h.tick(elapsed);
  if (mechanism === 'visibility') await h.page.evaluate(() => {
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => true});
    Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => 'hidden'});
    document.dispatchEvent(new Event('visibilitychange'));
  });
  else if (mechanism === 'escape') await h.page.keyboard.press('Escape');
  else await h.click('.so-pause');
  eq(await h.phase(), 'paused'); ok(await h.state(g => g.attemptLocked), 'paused lock held');
  const timers = await h.state(g => g.getPhaseTimers()), timer = timers.find(t => t.expectPhase === phase);
  ok(timer && !timer.pending && timer.remaining > 0, 'frozen phase timer', timers);
  if (phase === 'wrong') ok(Math.abs(timer.remaining - 400) <= 1, '200ms wrong leaves 400ms');
  const transition = await h.state(g => g.getTransition()), counts = await h.counters(), identity = await h.identity();
  const draws = await h.page.evaluate(() => window.__soTest.minimapDraws);
  await h.tick(phase === 'wrong' ? 5000 : 10000);
  eq(await h.phase(), 'paused'); eq(await h.state(g => g.getPhaseTimers()), timers);
  eq(await h.state(g => g.getTransition()), transition); eq(await h.counters(), counts);
  eq(await h.page.evaluate(() => window.__soTest.raf.size), 0);
  eq(await h.page.evaluate(() => window.__soTest.minimapDraws), draws, 'minimap frozen');
  if (mechanism === 'visibility') await h.page.evaluate(() => {
    delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange'));
  });
  await h.click('.so-resume'); eq(await h.phase(), phase);
  await h.tick(timer.remaining - 1); eq(await h.phase(), phase); await h.tick(2);
  eq(await h.phase(), phase === 'correct' ? 'regroup' : 'engaging');
  if (phase !== 'correct') eq(await h.counters(), counts, 'arrival does not advance counters again');
  if (phase === 'wrong') eq(await h.identity(), identity);
}

check(1, 'Boot / HUD / slice registrations [desktop]', async () => {
  await slice(async (h, id) => {
    await h.enter(id);
    eq(await h.page.locator(ROOT).getAttribute('dir'), 'rtl');
    ok(await h.page.locator('.so-canvas-host canvas').count(), 'scene canvas');
    ok(await h.page.evaluate(() => window.__soTest.phases.includes('loading')), 'loading observed');
    eq(await h.phase(), 'briefing');
    ok(await h.page.locator('.so-answer').evaluateAll(nodes => nodes.length > 1 && nodes.every(n => n.disabled)), 'briefing chips disabled');
    ok(/שאלה\s*1\s*\//.test(await h.page.locator('.so-counter').innerText()), 'question 1/M');
    eq(await h.state(g => [g.stars, g.ammo, g.reserve]), [0, 30, 120]);
    const player = await h.state(g => g.getPlayer()), map = await h.state(g => g.getMap());
    near(player.x, 0); near(player.z, 1); headingNear(player.headingDeg, 0); ok(player.inFightBox, 'start in yard fight box');
    eq(map.places.map(p => p.id), ['yard', 'containers', 'sheds', 'plaza']);
    eq(map.places.find(p => p.target).id, 'yard');
    for (const id of ['g1', 'g2', 'g3']) eq(map.gates.find(g => g.id === id).open, false);
    eq(await h.page.locator('.so-stars i').count(), 4);
    ok(/30\s*\/\s*120/.test(await h.page.locator('.so-ammo').innerText()), 'ammo HUD');
    ok(await h.page.locator('canvas.so-minimap,.so-minimap canvas').count(), 'minimap canvas');
    ok(await h.page.locator('.so-stars').isVisible(), 'stars HUD');
    if (id === SLICE_IDS[1]) ok(await h.page.evaluate(() => getItemById(apps, '0_48_9').link === '/play/strike_ops/grp-ch51-8' && getItemById(apps, '0_48_8').name === 'עברית לאנגלית'), 'append-only shared menu');
    await h.shot('01-briefing-' + id);
  });
  if (FULL) for (const id of FULL_IDS) await withHarness('desktop', async h => {
    await h.enter(id); await h.start();
    if (['grp-ch51s-8', 'grp-otiot-12'].includes(id)) {
      ok(await h.page.locator('.so-replay').isVisible(), 'speech replay');
      await h.state(g => { const original = g.question.action; window.__soTest.replayed = 0; g.question.action = function(...a) { window.__soTest.replayed++; return original.apply(this, a); }; });
      await h.click('.so-replay'); eq(await h.page.evaluate(() => window.__soTest.replayed), 1);
    }
    await h.shoot(await h.correct()); await h.next();
  });
});
check(2, 'Start / context-specific controls / material clones [desktop,touch]', async () => {
  for (const kind of ['desktop', 'touch']) await slice(async (h, id) => {
    await h.enter(id); eq(await h.state(g => g.quality), h.touch ? 1 : 2);
    await h.start();
    const aim = await h.state(g => g.aimMode);
    ok(h.touch ? aim === 'touch' : ['locked', 'cursor'].includes(aim), 'correct input mode', aim);
    eq(await h.page.locator(ROOT).evaluate(el => el.classList.contains('so-touch')), h.touch);
    for (const selector of ['.so-stick', '.so-fire', '.so-ads']) eq(await h.page.locator(selector).isVisible(), h.touch);
    const n = await h.state(g => g.options.length), enemies = await h.state(g => g.getEnemies());
    eq(enemies.length, n); eq(await h.page.locator('.so-answer').count(), n); eq(await h.page.locator('.so-plate').count(), n);
    eq(await h.state(g => g.roundKind), 'squad');
    const ids = enemies.flatMap(e => e.materials.map(m => m.id)); ok(ids.length >= n, 'material records'); eq(new Set(ids).size, ids.length);
    const model = await h.state(g => g.getRenderStats().enemyModel); eq(model.lod, h.touch);
    for (const e of enemies) {
      eq(e.badge.number, e.index + 1);
      for (const selector of ['.so-answer', '.so-plate']) {
        const marker = h.page.locator(`${selector}[data-index="${e.index}"] .so-marker`);
        eq(await marker.getAttribute('data-badge'), String(e.badge.number));
        eq(await marker.getAttribute('data-shape'), e.badge.shape);
      }
      const tint = await h.state((g, i) => resolveStrikeOpsTheme(g.theme).scene.squadTints[i], e.index);
      eq(e.materials.find(m => m.slot === 'Team').tint.replace('#', '').toLowerCase(), tint.replace('#', '').toLowerCase());
    }
  }, kind);
});
check(3, 'Whole-period exposure fairness and dashes [desktop]', () => slice(async (h, id) => {
  await h.enter(id); await h.start(); await exposure(h);
}));
check(4, 'World, chip and plate left-to-right order [desktop]', () => slice(async (h, id) => {
  // Rotate the three headings over time at each of five samples (not a Cartesian
  // timing matrix); all badge/ordering checks run for each heading and position.
  await h.boot(); const reverse = (await fixtures(h))[0];
  for (const route of [id, reverse]) {
    if (await h.page.locator(ROOT).count()) await h.leave();
    await h.enter(route, true, {booted: true}); await h.start();
    for (const n of [1, 2]) {
      if (n === 2) { const p = await targetPlace(h, n); await h.state((g, id) => g.teleport(id), p.id); await h.tick(1000); }
      const p = await h.state(g => g.getMap().places.find(p => p.id === g.zoneId)), b = p.fightBox;
      for (const pos of [p.anchor, {x: b.minX, z: b.minZ}, {x: b.minX, z: b.maxZ}, {x: b.maxX, z: b.minZ}, {x: b.maxX, z: b.maxZ}]) {
        ok((await h.state((g, pos) => g.teleport(pos), pos)).ok, 'order sample');
        for (let t = 0; t <= 10000; t += 250) {
          await h.state((g, headingDeg) => g.setView({headingDeg}), p.headingDeg + [0, -25, 25][(t / 250) % 3]);
          await h.tick(250); await order(h);
        }
      }
      ok(await h.state(g => g.forceBossRound()), 'force boss before any attempt'); await h.tick(1000);
      await h.state((g, id) => g.teleport(id), p.id); await h.tick(16); await order(h);
    }
  }
}));
check(5, 'Cover blocks hidden targets without learning [desktop]', () => slice(async (h, id) => {
  await h.enter(id); await h.start(); const i = await h.wrong();
  await h.until(() => h.state((g, i) => g.getEnemies()[i].state === 'hidden', i), 'hidden soldier');
  const before = await h.learning(), result = await h.state((g, i) => g.shootEnemy(i), i);
  ok(result.blocked && !result.accepted, 'blocked shot', result); eq(await h.learning(), before);
}));
check(6, 'Wrong attempt, duplicate rejection, identical retry [desktop]', () => slice(async (h, id) => {
  await h.enter(id); await h.start(); const identity = await h.identity(), before = await h.learning(), i = await h.wrong();
  await h.shoot(i); eq(await h.phase(), 'wrong'); await h.transaction(before, false); await h.duplicate(i);
  await h.tick(599); eq(await h.phase(), 'wrong'); await h.tick(101); eq(await h.phase(), 'engaging'); eq(await h.identity(), identity);
}));
check(7, 'Correct once, skipped and natural regroup [desktop]', () => slice(async (h, id) => {
  await h.enter(id); await h.start(); const before = await h.learning(), i = await h.correct(), identity = await h.identity();
  await h.shoot(i); await h.transaction(before, true); await h.duplicate(i); await h.tick(1000);
  eq(await h.phase(), 'regroup'); ok((await h.identity())[3] !== identity[3], 'new question token at transition start');
  ok(await h.state(g => g.skipTransition()), 'skip regroup'); await h.tick(1);
  eq(await h.state(g => [g.phase, g.roundNumber, g.zoneNumber]), ['engaging', 2, 1]);
  await h.shoot(await h.correct()); await h.tick(2600); eq(await h.state(g => [g.phase, g.roundNumber]), ['engaging', 3]);
}));
check(8, 'Natural fourth-round boss, dissolve/re-form and advance [desktop]', () => slice(async (h, id) => {
  await h.enter(id); await h.start(); await h.boss(); eq(await h.state(g => g.roundNumber), 4); await order(h); await bossLearning(h, true);
  if (FULL) {
    const ids = new Set([await h.state(g => g.zoneId)]);
    for (let z = 0; z < 3; z++) { await h.boss(); await h.shoot(await h.correct()); await h.next(); ids.add(await h.state(g => g.zoneId)); }
    ok(ids.size >= 3, '--full has at least three distinct zones');
    const learning = await h.learning();
    ok(await h.state(g => g.skipToZone(1)), '--full presentation-only zone skip');
    eq(await h.learning(), learning, 'skipToZone does not alter learning');
    await h.shoot(await h.correct()); await h.next();
    eq(await h.state(g => g.roundKind), 'boss');
    await h.shoot(await h.correct()); await h.next(); eq(await h.state(g => g.zoneIndex), 0);
  }
}));
check(9, 'Forced boss preserves the current question and token [desktop]', () => slice(async (h, id) => {
  await h.enter(id); const old = await h.identity(), learning = await h.learning();
  ok(await h.state(g => g.forceBossRound()), 'forced in briefing'); eq((await h.identity()).slice(0, 4), old.slice(0, 4)); eq(await h.learning(), learning);
  await h.start(); eq(await h.state(g => g.roundNumber), 1);
  // §2 counters take precedence: an early forced boss still regroups because
  // roundInZone < roundsPerZone-1; §12.3 check 9's early clear conflicts
  // with §2. Follow §2: forcing presentation alone does not clear a place.
  await bossLearning(h, false);
  await clearPlace(h);
  const held = await h.identity(), saved = await h.learning();
  ok(await h.state(g => g.forceBossRound()), 'force held roaming question');
  eq((await h.identity()).slice(0, 4), held.slice(0, 4)); eq(await h.learning(), saved);
  ok((await h.state(g => g.teleport('containers'))).triggered, 'held boss enters');
  await h.tick(1000); await bossPresentation(h);
}));

async function keyboardAttempt(h, correct, mode) {
  const i = correct ? await h.correct() : await h.wrong();
  if (await h.state(g => g.roundKind === 'squad')) await h.until(() => h.state((g, i) => g.getEnemies()[i].state === 'hidden', i), 'naturally hidden key target');
  await h.page.locator(ROOT).focus();
  if (mode === 'tab') {
    let focused = false;
    for (let iTab = 0; iTab < 30; iTab++) {
      await h.page.keyboard.press('Tab');
      focused = await h.page.locator(`.so-answer[data-index="${i}"]`).evaluate(el => el === document.activeElement);
      if (focused) break;
    }
    ok(focused, 'Tab reaches target chip');
    ok(await h.page.locator(`.so-answer[data-index="${i}"]`).evaluate(el => { const s = getComputedStyle(el); return parseFloat(s.outlineWidth) > 0 || s.boxShadow !== 'none'; }), 'visible focus');
  }
  const before = await h.learning(), ammo = await h.state(g => g.ammo);
  if (mode === 'touch') await h.page.tap(`.so-answer[data-index="${i}"]`, {force: true});
  else await h.page.keyboard.press(mode === 'tab' ? 'Enter' : 'Digit' + (i + 1));
  await h.until(async () => (await h.learning()).calls.length > before.calls.length, 'unforced lock-on fires within 2500ms', 2500, 10);
  await h.transaction(before, correct); eq(await h.state(g => g.ammo), ammo - 1, 'exactly one shot, no crosshair double-fire');
}
check(10, 'Unforced keyboard, focus precedence and stale tokens [desktop]', () => slice(async (h, id) => {
  await h.enter(id); await h.start();
  await keyboardAttempt(h, true, 'digit'); await h.next();
  await keyboardAttempt(h, false, 'digit'); await h.tick(700);
  await keyboardAttempt(h, true, 'tab'); await h.next();
  await h.page.locator(ROOT).focus(); const ammo = await h.state(g => g.ammo);
  await h.page.keyboard.press('Enter'); eq(await h.state(g => g.ammo), ammo - 1);
  eq(await h.state(g => g.debugSnapshot().lockIndex), -1, 'root Enter creates no lock ring');
  await h.enter(id); await h.state(g => g.forceBossRound()); await h.start(); await keyboardAttempt(h, true, 'digit');
  await h.next();
  const token = await h.state(g => g.questionToken), c = await h.correct();
  const before = await h.learning(), lock = await h.state(g => g.attemptLocked);
  eq(await h.state((g, a) => g.answer(a.i, a.token), {i: c, token: token - 1}), false);
  eq(await h.learning(), before); eq(await h.state(g => g.attemptLocked), lock);
  // Arm N's lock, then synchronously accept N before its settle callback.
  await h.state((g, i) => { g.lockOn(i); g.answer(g.options.indexOf(g.question.result)); }, c);
  await h.tick(900); await h.state(g => g.skipTransition()); await h.tick(1);
  const newBefore = await h.learning(), newLock = await h.state(g => g.attemptLocked);
  await h.tick(2500); eq(await h.learning(), newBefore); eq(await h.state(g => g.attemptLocked), newLock);
}));
check(11, 'Unforced chip tap consumes exactly one shot [touch]', () => slice(async (h, id) => {
  await h.enter(id); await h.start(); await keyboardAttempt(h, true, 'touch');
}, 'touch'));

async function pointer(h, selector, type, pointerId, x, y) {
  // Browser-generated PointerEvents have live pointer IDs, so setPointerCapture
  // works. Synthetic dispatchEvent IDs would throw NotFoundError in real input.
  ok(await h.page.locator(selector).count(), 'touch target exists: ' + selector);
  if (!h.touchSession) {
    h.touchSession = await h.context.newCDPSession(h.page);
    h.touchPoints = new Map();
  }
  if (type === 'pointerup') h.touchPoints.delete(pointerId);
  else h.touchPoints.set(pointerId, {id: pointerId, x, y, radiusX: 1, radiusY: 1, force: 1});
  await h.touchSession.send('Input.dispatchTouchEvent', {
    type: {pointerdown: 'touchStart', pointermove: 'touchMove', pointerup: 'touchEnd'}[type],
    touchPoints: [...h.touchPoints.values()]
  });
}
async function aimAway(h) {
  // Turn toward the sky with actual look input, then all magazine taps miss.
  const box = await h.page.locator('.so-canvas-host').boundingBox();
  await pointer(h, '.so-canvas-host', 'pointerdown', 2, box.x + box.width / 2, box.y + box.height / 2);
  await pointer(h, '.so-canvas-host', 'pointermove', 2, box.x + box.width / 2, box.y + box.height / 2 + 1000);
  await pointer(h, '.so-canvas-host', 'pointerup', 2, box.x + box.width / 2, box.y + box.height / 2 + 1000);
}
check(12, 'Magazine, reload, look, fight-box movement, simultaneous pointers [touch]', () => slice(async (h, id) => {
  await h.enter(id); await h.start(); const beforeLook = await h.state(g => g.getPlayer().yawDeg);
  const box = await h.page.locator('.so-canvas-host').boundingBox(), x = box.x + box.width / 2, y = box.y + box.height / 2;
  await pointer(h, '.so-canvas-host', 'pointerdown', 2, x, y); await pointer(h, '.so-canvas-host', 'pointermove', 2, x + 80, y);
  await pointer(h, '.so-canvas-host', 'pointerup', 2, x + 80, y);
  ok(await h.state((g, yaw) => g.getPlayer().yawDeg !== yaw, beforeLook), 'look changes yaw');
  await aimAway(h);
  const before = await h.learning();
  for (let i = 0; i < 30; i++) {
    await h.page.tap('.so-fire', {force: true}); eq(await h.state(g => g.ammo), 29 - i);
    if (i < 29) await h.tick(151);
  }
  eq(await h.learning(), before, 'sky fire is not an answer');
  await h.tick(999); eq(await h.state(g => g.ammo), 0); await h.tick(1); eq(await h.state(g => g.ammo), 30);
  ok((await h.page.locator('.so-ammo').innerText()).includes(String(await h.state(g => g.reserve))), 'reserve displayed');
  await h.page.tap('.so-fire', {force: true}); await h.page.tap('.so-reload', {force: true});
  ok(await h.state(g => g.debugSnapshot().reloading), 'manual reload started'); await h.tick(1000); eq(await h.state(g => g.ammo), 30);
  const stick = await h.page.locator('.so-stick').boundingBox(), sx = stick.x + stick.width / 2, sy = stick.y + stick.height / 2;
  const start = await h.state(g => g.debugSnapshot());
  await pointer(h, '.so-stick', 'pointerdown', 1, sx, sy); await pointer(h, '.so-stick', 'pointermove', 1, sx + 80, sy - 30);
  await pointer(h, '.so-canvas-host', 'pointerdown', 2, x, y); await pointer(h, '.so-canvas-host', 'pointermove', 2, x - 60, y);
  const fire = await h.page.locator('.so-fire').boundingBox();
  await pointer(h, '.so-fire', 'pointerdown', 3, fire.x + 20, fire.y + 20); await h.tick(300);
  const simultaneous = await h.state(g => g.debugSnapshot());
  ok(simultaneous.ammo < start.ammo, 'third pointer fires'); ok(simultaneous.camera.yawDeg !== start.camera.yawDeg, 'second pointer looks');
  ok(simultaneous.player.x !== start.player.x || simultaneous.player.z !== start.player.z, 'first pointer moves');
  for (let t = 0; t < 20; t++) {
    await h.tick(250);
    ok(await h.state(g => { const p = g.getPlayer(), b = g.getMap().places.find(z => z.id === g.zoneId).fightBox; return p.inFightBox && p.x >= b.minX && p.x <= b.maxX && p.z >= b.minZ && p.z <= b.maxZ; }), 'player remains inside fight box');
  }
  await pointer(h, '.so-stick', 'pointerup', 1, sx + 80, sy - 30);
  await pointer(h, '.so-canvas-host', 'pointerup', 2, x - 60, y);
  await pointer(h, '.so-fire', 'pointerup', 3, fire.x + 20, fire.y + 20);
  await h.state(g => g.teleport('yard')); await clearPlace(h);
  await pointer(h, '.so-stick', 'pointerdown', 4, sx, sy);
  await pointer(h, '.so-stick', 'pointermove', 4, sx, sy - stick.height / 2); await h.tick(250);
  ok(await h.state(g => g.getPlayer().sprinting), 'joystick rim sprints in roaming');
  await pointer(h, '.so-stick', 'pointerup', 4, sx, sy);
  await h.page.tap('.so-go', {force: true}); ok(await h.state(g => g.autopilot), 'touch Go starts walking');
}, 'touch'));
check(13, 'Pause races freeze timers, transition, RAF and minimap [desktop]', () => slice(async (h, id) => {
  await h.enter(id);
  for (const phase of ['wrong', 'deploying', 'correct', 'regroup', 'advancing']) { await h.prepare(phase); await pauseRoundTrip(h, phase); }
  for (const mechanism of ['button', 'escape']) { await h.prepare('wrong'); await pauseRoundTrip(h, 'wrong', 200, mechanism); }
  await h.prepare('roaming'); await observeMapEvents(h);
  await h.state(g => { g.teleport({x: 3, z: 21, headingDeg: 0}); g.walkTo('containers'); });
  await h.tick(100); await h.click('.so-pause');
  const p = poseOf(await h.state(g => g.getPlayer()));
  eq(await h.state(g => g.getPhaseTimers()), []); await h.tick(10000);
  eq(poseOf(await h.state(g => g.getPlayer())), p); eq(await h.phase(), 'paused');
  await h.click('.so-resume'); await walk(h, 'containers', {started: true});
  eq(await h.page.evaluate(() => window.__soTest.mapEvents.phases.filter(p => p === 'deploying').length), 1);
}));
check(14, 'Real content fixtures, full text and corrected bidi glyph order [desktop,touch]', async () => {
  for (const kind of ['desktop', 'touch']) await withHarness(kind, async h => {
    await h.boot(); const ids = await fixtures(h);
    for (const id of [SLICE_IDS[0], ...ids]) {
      if (await h.page.locator(ROOT).count()) await h.leave();
      await h.enter(id, true, {booted: true}); await h.start(); await h.tick(250);
      await content(h, id === ids[1]);
      if (id === ids[1]) ok(await h.page.locator('.so-answer img').count(), 'fixture image generated');
      if (id === ids[2]) await bidi(h);
      await h.shot(`14-content-${kind}-${id}`);
    }
  });
});

// Use captured public THREE renderer/camera APIs for projection and GPU details;
// no component _so access or writes to gameplay state are needed.
async function projected(h) {
  return h.state(g => {
    const p = window.__soTest, camera = p.renderers[p.renderers.length - 1].__soCamera || p.mainCamera;
    if (!camera) throw Error('No rendered perspective camera captured');
    const cfg = STRIKE_OPS_CONFIG, layout = g.getLayout(), root = document.querySelector('.so-game');
    const cr = p.renderers[p.renderers.length - 1].domElement.getBoundingClientRect(), rr = root.getBoundingClientRect();
    const project = (x, y, z) => {
      const v = new THREE.Vector3(x, y, z).project(camera);
      return {x: (v.x + 1) * cr.width / 2 + cr.left - rr.left, y: (1 - v.y) * cr.height / 2 + cr.top - rr.top};
    };
    return {layout, enemies: g.getEnemies().map(e => {
      // §12.1 poses are map-frame; THREE mirrors map x exactly once.
      const x = -e.pose.x, z = e.pose.z;
      const height = cfg.enemyModel.targetHeight * (e.kind === 'copy' ? cfg.boss.scale : 1);
      const head = project(x, height, z), feet = project(x, 0, z);
      return {index: e.index, head, feet, height: Math.abs(feet.y - head.y), torso: {x: e.screenX, y: e.screenY},
        distance: Math.hypot(camera.position.x - x, camera.position.z - z)};
    })};
  });
}
async function framing(h) {
  await h.state(g => g.getEnemies().forEach(e => g.forceExpose(e.index))); await h.tick(50);
  const hip = await projected(h), l = hip.layout, safe = rect(l.safeRect), size = h.page.viewportSize();
  const cfg = await h.page.evaluate(() => STRIKE_OPS_CONFIG.framing);
  const aspect = l.canvas.w / l.canvas.h;
  const vfov = Math.max(cfg.minVFovDeg, Math.min(cfg.maxVFovDeg, 2 * Math.atan(Math.tan(cfg.hipHalfHFovDeg * Math.PI / 180) / aspect) * 180 / Math.PI));
  ok(Math.abs(l.fov.vfov - vfov) < .1, 'derived hip vertical FOV', l.fov);
  const half = Math.atan(Math.tan(vfov * Math.PI / 360) * aspect) * 180 / Math.PI;
  ok(Math.abs(l.fov.hHalf - half) < .1, 'derived hip horizontal half FOV');
  for (const e of hip.enemies) {
    ok(e.torso.x >= safe.x && e.torso.x <= safe.right && e.torso.y >= safe.y && e.torso.y <= safe.bottom, 'torso in safeRect', e);
    ok(e.head.x >= 0 && e.head.x <= size.width && e.head.y >= 0 && e.feet.y <= size.height, 'all lanes on-screen', e);
  }
  const farthest = hip.enemies.slice().sort((a, b) => b.distance - a.distance)[0];
  ok(farthest.height >= cfg.minEnemyPx, 'farthest enemy head-to-feet size', farthest);
  if (h.touch) await h.page.tap('.so-ads', {force: true}); else await h.page.keyboard.press('KeyE');
  await h.tick(150);
  const ads = await projected(h), enlarged = ads.enemies.find(e => e.index === farthest.index);
  ok(enlarged.height >= 1.3 * farthest.height, 'ADS magnifies target >=1.3x', {hip: farthest.height, ads: enlarged.height});
  if (h.touch) await h.page.tap('.so-ads', {force: true}); else await h.page.keyboard.press('KeyE');
  await h.tick(150);
}
check(15, 'First-frame layout, rotate, boss and target-size gates [desktop,touch]', async () => {
  for (const [kind, sizes] of [['desktop', [[1440, 900]]], ['touch', [[390, 844], [360, 780], [540, 960], [844, 390], [768, 1024]]]])
    await slice(async (h, id) => {
      for (const [width, height] of sizes) {
        await h.page.setViewportSize({width, height}); await h.enter(id);
        const firstFrame = await h.page.evaluate(() => window.__soTest.firstBriefingLayout);
        ok(firstFrame, 'captured first briefing DOM frame');
        await layout(h, 1, firstFrame); await h.shot(`15-${id}-${width}x${height}-briefing`);
        await h.start(); await h.tick(1000); await layout(h); await framing(h); await order(h);
        await h.shot(`15-${id}-${width}x${height}-squad`);
        if (h.touch) {
          await h.page.setViewportSize({width: height, height: width}); await h.tick(150); await layout(h);
          await h.page.setViewportSize({width, height}); await h.tick(150); await layout(h);
        }
        ok(await h.state(g => g.forceBossRound()), 'force boss'); await h.tick(1000);
        await layout(h); await framing(h); await order(h); await h.shot(`15-${id}-${width}x${height}-boss`);
        // Far-corner size is a separate gate from anchor framing.
        await h.state(g => { const b = g.getMap().places.find(p => p.id === g.zoneId).fightBox;
          g.teleport({x: b.minX, z: b.minZ, headingDeg: 0}); g.getEnemies().forEach(e => g.forceExpose(e.index)); });
        await h.tick(50);
        const far = (await projected(h)).enemies.sort((a, b) => b.distance - a.distance)[0];
        ok(far.height >= await h.page.evaluate(() => STRIKE_OPS_CONFIG.framing.minEnemyPxFar), 'far fight-box target size', far);
        await h.state(g => g.teleport('yard')); await clearPlace(h);
        await h.state(g => g.teleport({x: 3, z: 30.5, headingDeg: 270})); await h.tick(50);
        await layout(h); await h.shot(`15-${id}-${width}x${height}-roaming`);
      }
    }, kind);
});

// Minimal PNG reader for Chromium screenshots; only Node built-ins, no image npm.
function png(buffer) {
  eq(buffer.subarray(1, 4).toString(), 'PNG');
  let width, height, channels; const chunks = [];
  for (let offset = 8; offset < buffer.length;) {
    const length = buffer.readUInt32BE(offset), kind = buffer.toString('ascii', offset + 4, offset + 8), data = buffer.subarray(offset + 8, offset + 8 + length);
    if (kind === 'IHDR') {
      width = data.readUInt32BE(0); height = data.readUInt32BE(4); eq(data[8], 8); ok([2, 6].includes(data[9]), 'RGB/RGBA PNG'); eq(data[12], 0);
      channels = data[9] === 6 ? 4 : 3;
    }
    if (kind === 'IDAT') chunks.push(data);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(chunks)), stride = width * channels, pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => { const p = a + b - c, da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c); return da <= db && da <= dc ? a : db <= dc ? b : c; };
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? pixels[y * stride + x - channels] : 0, b = y ? pixels[(y - 1) * stride + x] : 0,
        c = y && x >= channels ? pixels[(y - 1) * stride + x - channels] : 0;
      const delta = [0, a, b, Math.floor((a + b) / 2), paeth(a, b, c)][filter];
      ok(delta !== undefined, 'PNG filter'); pixels[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + delta) & 255;
    }
  }
  return {width, height, at(x, y) { x = Math.round(x); y = Math.round(y); ok(x >= 0 && x < width && y >= 0 && y < height, 'pixel inside screenshot'); return [...pixels.subarray((y * width + x) * channels, (y * width + x) * channels + 3)]; }};
}
function rgb(hex) { const s = String(hex).replace('#', ''); return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16)); }
function luminance(c) { return c.map(x => { x /= 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }).reduce((a, x, i) => a + x * [.2126, .7152, .0722][i], 0); }
function ratio(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
async function contrast(h) {
  const rows = await h.page.locator(ROOT).evaluate(root => {
    const parse = c => c.match(/[\d.]+/g).map(Number), blend = (a, b) => a.slice(0, 3).map((c, i) => c * (a[3] ?? 1) + b[i] * (1 - (a[3] ?? 1)));
    return [...root.querySelectorAll('.so-question,.so-answer,.so-plate')].filter(el => el.getBoundingClientRect().width && getComputedStyle(el).visibility !== 'hidden').map(el => {
      let bg = [0, 0, 0]; const ancestors = []; for (let n = el; n; n = n.parentElement) ancestors.push(n);
      for (const n of ancestors.reverse()) bg = blend(parse(getComputedStyle(n).backgroundColor), bg);
      return {name: el.className, fg: blend(parse(getComputedStyle(el).color), bg), bg};
    });
  });
  for (const r of rows) ok(ratio(r.fg, r.bg) >= 4.5 - .01, 'computed text contrast >=4.5', r);
}
async function theme(h, key) {
  await h.page.evaluate(key => { setTheme(key); document.querySelector('.so-game').__vue__.theme = getTheme(); }, key);
  await h.tick(550);
  ok(await h.page.locator(ROOT).evaluate((el, key) => el.classList.contains('so-theme-' + key), key), 'theme class');
}
async function cloneTints(h, key) {
  const data = await h.state((g, key) => {
    const scene = resolveStrikeOpsTheme(key, themeOptions).scene, hex = c => new THREE.Color(c).getHexString();
    return {enemies: g.getEnemies(), scene: {squadTints: scene.squadTints.map(hex), hologramTint: hex(scene.hologramTint), bossTint: hex(scene.bossTint)}, kind: g.roundKind};
  }, key);
  for (const e of data.enemies) {
    const team = e.materials.find(m => m.slot === 'Team'); ok(team, 'Team material');
    const colors = data.kind === 'boss' ? [data.scene.hologramTint, data.scene.bossTint] : [data.scene.squadTints[e.lane]];
    ok(colors.some(c => String(c).toLowerCase().replace('#', '') === String(team.tint).toLowerCase().replace('#', '')), 'live clone retinted', {team, colors});
  }
  if (data.kind === 'boss') eq(data.enemies.map(e => e.materials.find(m => m.slot === 'Team').tint), data.enemies.map(() => data.enemies[0].materials.find(m => m.slot === 'Team').tint));
}
async function scenePixels(h, key, label) {
  await h.state(g => g.getEnemies().forEach(e => g.forceExpose(e.index))); await h.tick(50);
  // Locator screenshots include composited siblings. Hide HUD visibility only
  // during this pixel sample (no layout change), then restore before the saved
  // visual-regression screenshot. Never sample the opaque banner as sky.
  const canvas = h.page.locator('.so-canvas-host canvas').first();
  const hide = await h.page.addStyleTag({content: '.so-game :is(.so-question,.so-replay,.so-counter,.so-stars,.so-minimap,.so-answers,.so-plate,.so-weapon,.so-ammo,.so-progress,.so-crosshair,.so-hitmarker,.so-live,.so-stick,.so-fire,.so-ads,.so-reload,.so-pause,.so-exit) { visibility:hidden !important; }'});
  let image;
  try { image = png(await h.page.screenshot({clip: await canvas.boundingBox()})); }
  finally { await hide.evaluate(el => el.remove()); }
  const skyTop = await h.page.evaluate(key => new THREE.Color(resolveStrikeOpsTheme(key, themeOptions).scene.skyTop).getHexString(), key);
  const target = rgb(skyTop), samples = [];
  for (const dx of [-3, 0, 3]) samples.push(image.at(image.width / 2 + dx, 3));
  ok(samples.some(c => c.every((v, i) => Math.abs(v - target[i]) <= 35)), 'rendered top-centre sky matches theme (35/255 tolerance)', {samples, target});
  if (['dark', 'space', 'code'].includes(key)) {
    const enemies = await h.state(g => g.getEnemies()), projection = await projected(h);
    const box = await canvas.boundingBox(), root = await h.page.locator(ROOT).boundingBox();
    const boxes = projection.enemies.map(e => {
      // A conservative soldier envelope: width 70% of projected head-to-feet
      // height includes the armour/arms, unlike a fixed desktop pixel offset.
      const halfWidth = e.height * .35, x = e.torso.x + root.x - box.x;
      return {index: e.index, x, y: e.torso.y + root.y - box.y, halfWidth,
        top: Math.min(e.head.y, e.feet.y) + root.y - box.y,
        bottom: Math.max(e.head.y, e.feet.y) + root.y - box.y, height: e.height};
    });
    for (const e of boxes.filter(b => enemies.some(e => e.index === b.index && e.visible))) {
      const body = image.at(e.x, e.y), backgrounds = [];
      for (const dy of [0, -e.height * .15, e.height * .15]) {
        for (const side of [-1, 1]) {
          const x = Math.round(e.x + side * (e.halfWidth + 8)), y = Math.round(e.y + dy);
          if (x < 0 || x >= image.width || y < 0 || y >= image.height) continue;
          if (boxes.some(b => b.index !== e.index && x >= b.x - b.halfWidth && x <= b.x + b.halfWidth && y >= b.top && y <= b.bottom)) continue;
          backgrounds.push(image.at(x, y));
        }
        if (backgrounds.some(bg => ratio(body, bg) >= 3)) break;
      }
      ok(backgrounds.length > 0, 'unobstructed background sample exists', {index: e.index});
      ok(backgrounds.some(bg => ratio(body, bg) >= 3), 'rendered enemy/background contrast >=3', {index: e.index, body, backgrounds});
    }
  }
  await h.shot(label);
}
check(16, 'Every theme: layout, contrast, scene pixels and live clones [desktop,touch]', async () => {
  for (const [kind, sizes] of [['desktop', [[1440, 1000]]], ['touch', [[390, 844], [844, 390], [768, 1024]]]])
    await withHarness(kind, async h => {
      await h.boot(); const keys = await h.page.evaluate(() => Object.keys(themeOptions));
      for (const key of keys) for (const [width, height] of sizes) {
        await h.page.setViewportSize({width, height}); await h.enter(); await h.start();
        await theme(h, key); await cloneTints(h, key); await layout(h); await contrast(h); await framing(h);
        await scenePixels(h, key, `16-${key}-${width}x${height}`);
        await h.state(g => g.forceBossRound()); await h.tick(1000);
        const alternative = keys.find(k => k !== key); await theme(h, alternative); await theme(h, key); await cloneTints(h, key);
        await bossPresentation(h);
        await h.shoot(await h.wrong(), false); await h.tick(250);
        const before = await h.state(g => g.getEnemies()[g.wrongOption].materials.map(m => m.opacity));
        // Keep time stopped during Vue's watch flush: retint may not reset fade.
        await h.page.evaluate(async alternate => { setTheme(alternate); const g = document.querySelector('.so-game').__vue__; g.theme = getTheme(); await g.$nextTick(); }, alternative);
        eq(await h.state(g => g.getEnemies()[g.wrongOption].materials.map(m => m.opacity)), before, 'retint preserves dissolve opacity');
      }
    });
});

async function budgetSample(h, tier, label) {
  const s = await h.state(g => g.getRenderStats());
  ok(s.last.calls > 0 && s.last.calls < 120, label + ' <120 calls', s);
  if (tier === 0) ok(s.last.triangles > 0 && s.last.triangles < 80000, label + ' <80k triangles', s);
  ok(s.mixersActive <= 4, label + ' <=4 active mixers');
  for (const pass of ['shadow', 'scene', 'overlay']) ok(s.last.passes[pass], 'pass reported: ' + pass);
  eq(s.last.calls, Object.values(s.last.passes).reduce((sum, p) => sum + p.calls, 0), 'all pass calls summed');
  eq(s.last.triangles, Object.values(s.last.passes).reduce((sum, p) => sum + p.triangles, 0), 'all pass triangles summed');
  return s;
}
async function programs(h) { return h.page.evaluate(() => window.__soTest.renderers.at(-1).info.programs.length); }
async function staticMerging(h) {
  const groups = await h.page.evaluate(() => {
    const p = window.__soTest, scene = p.renderers.at(-1).__soScene || p.scenes[0], groups = new Map();
    scene.traverse(mesh => {
      if (!mesh.isMesh || mesh.isSkinnedMesh) return;
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of materials) {
        const url = m.map?.image?.currentSrc || m.map?.image?.src || '';
        // Sourced kit colormaps identify static props without depending on scene
        // node names or component-private zone registries. Group by parent so
        // the separately merged backdrop and live zones remain separate.
        if (!/colormap(?:-shed)?\.png/.test(url)) continue;
        const key = mesh.parent.uuid; if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({mesh: mesh.uuid, material: m.uuid});
      }
    });
    return [...groups.values()];
  });
  ok(groups.length > 0, 'sourced static kit meshes present');
  for (const group of groups) eq(new Set(group.map(m => m.mesh)).size, new Set(group.map(m => m.material)).size, 'one merged mesh per distinct static material; no per-piece clones');
  const all = groups.flat(), materialCount = new Set(all.map(m => m.material)).size;
  // Four places each own structure/detail chunks, plus the backdrop.
  ok(new Set(all.map(m => m.mesh)).size <= materialCount * 9, 'static mesh total bounded by map chunks');
  const merged = await h.state(g => g.getRenderStats().mergedMeshes);
  ok(Object.keys(merged).length >= 8 && Object.values(merged).every(n => n <= 6), 'per-place chunk merge budget', merged);
}
check(17, 'All-pass render budgets, merging and shader stability [touch,desktop]', async () => {
  // A target anchor triggers immediately. The plaza's east-facing budget is
  // sampled in its encounter; open-gate and cleared-container views use roaming.
  for (const [width, height] of [[390, 844], [844, 390]]) for (const tier of [0, 1]) await withHarness('touch', async h => {
    await h.page.setViewportSize({width, height}); await h.enter(); await h.start(); await h.state((g, tier) => g.setQuality(tier), tier);
    for (let placeNumber = 1; placeNumber <= 4; placeNumber++) {
      if (placeNumber > 1) {
        await h.enter(); await h.start(); await h.state((g, tier) => g.setQuality(tier), tier);
        const place = await targetPlace(h, placeNumber);
        await h.state((g, id) => g.teleport(id), place.id); await h.tick(1000);
      }
      if (placeNumber === 4) {
        await h.state(g => g.setView({headingDeg: 90})); await h.tick(50);
        const east = await h.state(g => g.getRenderStats().last); ok(east.calls < 120 && east.triangles < 100000, 'plaza east view');
        await h.state(g => g.setView({headingDeg: 270}));
      }
      await h.tick(1000); const squad = await budgetSample(h, tier, 'squad');
      console.log(`  place ${placeNumber}, tier ${tier} ${width}x${height}: ${squad.last.calls} calls / ${squad.last.triangles} triangles; baseline 49 / 36400, map estimate 77 calls; enemyModel ${JSON.stringify(squad.enemyModel)}`);
      if (squad.last.calls > 92) diagnostics.review.push(`tier ${tier} ${width} squad exceeds map estimate by >15 calls`);
      await staticMerging(h); const compiled = await programs(h);
      await h.shoot(await h.correct());
      for (let ms = 0; ms < 900; ms += 50) { await h.tick(50); ok(await h.state(g => g.getRenderStats().mixersActive <= 4), 'knockdown mixer cap'); }
      eq(await programs(h), compiled, 'knockdown does not recompile shaders');
      await h.until(() => h.state(g => g.phase === 'engaging'), 'regroup end'); await h.boss(); await h.tick(50);
      await budgetSample(h, tier, 'boss'); const bossPrograms = await programs(h);
      await h.shoot(await h.wrong(), false);
      for (let ms = 0; ms < 450; ms += 50) { await h.tick(50); await budgetSample(h, tier, 'boss dissolve'); }
      eq(await programs(h), bossPrograms, 'dissolve does not recompile shaders'); await h.tick(250);
      await h.state(g => g.resetRenderPeak()); await h.shoot(await h.correct(), false);
      await h.tick(900);
      if (placeNumber < 4) {
        eq(await h.phase(), 'roaming');
        const gates = [{x: .4, z: 18, headingDeg: 0}, {x: 17.5, z: 34, headingDeg: 0}, {x: 8, z: 51.5, headingDeg: 270}];
        ok((await h.state((g, p) => g.teleport(p), gates[placeNumber - 1])).ok, 'open gate budget view');
        await h.tick(50);
        const view = await h.state(g => g.getRenderStats());
        ok(view.last.calls > 0 && view.last.calls < 120 && view.last.triangles < 100000, 'roaming gate budget', view.last);
        if (placeNumber >= 2) {
          await h.state(g => g.teleport({x: 3, z: 25, headingDeg: 270})); await h.tick(50);
          const west = await h.state(g => g.getRenderStats().last); ok(west.calls < 120 && west.triangles < 100000, 'cleared containers west view');
        }
        const outgoing = ['yard', 'containers', 'sheds'][placeNumber - 1];
        await h.state((g, id) => g.teleport(id), outgoing); await h.tick(650);
        // The outgoing knockdown has retired; an untimed walk must allocate no geometry.
        const geometries = await h.page.evaluate(() => window.__soTest.renderers.at(-1).info.memory.geometries);
        await walk(h, await h.state(g => g.zoneId), {sample: async () => {
          const stats = await h.state(g => g.getRenderStats()), map = await h.state(g => g.getMap());
          ok(stats.mixersActive <= 4, 'walk mixer cap');
          const current = map.places.findIndex(p => p.id === stats.placeId);
          const allowed = map.places.filter((p, i) => Math.abs(i - current) <= 1).map(p => p.id);
          ok(stats.detailChunks.every(id => allowed.includes(id)), 'only current/adjacent details', stats.detailChunks);
          if (await h.phase() === 'roaming') eq(await h.page.evaluate(() => window.__soTest.renderers.at(-1).info.memory.geometries), geometries, 'walking builds no geometry');
        }});
        await h.tick(1000);
      } else { eq(await h.phase(), 'advancing'); await h.tick(3200); await atStart(h); }
      const peak = await h.state(g => g.getRenderStats().peak);
      ok(peak.calls > 0 && peak.calls < 120 && peak.triangles > 0 && peak.triangles < 100000, 'roaming peak budget', peak);
    }
  });
  await withHarness('desktop', async h => {
    await h.enter(); await h.start(); await h.state(g => g.setQuality(2)); await h.tick(1000);
    console.log('  desktop tier 2 (baseline 49 + 33 shadow calls):', await h.state(g => g.getRenderStats()));
  });
});
async function settleLayout(h) {
  await h.page.evaluate(() => document.fonts.ready.then(() => true));
  let previous, current;
  for (let frame = 0; frame < 60; frame++) {
    await h.tick(Math.ceil(1000 / 60));
    previous = current;
    current = JSON.stringify((await h.state(g => g.getLayout().plates)).map(rect));
    if (current === previous) return;
  }
  throw new Error(`zoom layout did not settle after 60 frames: ${previous} -> ${current}`);
}
check(18, 'Browser zoom and doubled root text size [desktop]', async () => {
  for (const key of ['base', 'space']) await withHarness('desktop', async h => {
    for (const [width, height, scale] of [[720, 450, 1], [960, 600, 1], [1440, 900, 2]]) {
      await h.page.setViewportSize({width, height}); await h.enter(SLICE_IDS[0], true, {theme: key}); await h.start();
      if (scale === 2) await h.page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      await settleLayout(h); const l = await layout(h, scale); await content(h); await order(h);
      const plates = await h.state(g => g.getEnemies().map(e => e.plate));
      const rects = l.plates.filter(Boolean).map(rect);
      for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) ok(!overlaps(rects[i], rects[j]), 'plates tier/collapse before overlap');
      if (scale === 2) { eq(l.answersLayout, 'stacked'); ok(plates.some(p => p.collapsed || p.tier > 0), 'text scaling triggers tiers or markers'); }
      if (height < 480) ok(!l.minimap || rect(l.minimap).w <= 96, 'minimap shrinks/hides first');
      await h.shot(`18-${key}-${width}-${scale}`);
      await clearPlace(h); await h.state(g => g.setView({headingDeg: 180})); await h.tick(50);
      await layout(h, scale); await h.shot(`18-${key}-${width}-${scale}-roaming`);
    }
  });
});
check(19, 'Reduced motion preserves windows, timers and visible-pose hits [desktop]', async () => {
  for (const id of SLICE_IDS) {
    let normal;
    await withHarness('desktop', async h => { await h.enter(id); await h.start(); normal = await exposure(h); });
    await withHarness('desktop', async h => {
      await h.page.emulateMedia({reducedMotion: 'reduce'}); await h.enter(id); await h.start();
      eq(await h.state(g => g.reducedMotion), true); ok(await h.page.locator(ROOT).evaluate(el => el.classList.contains('so-reduced')), 'reduced class');
      eq(await exposure(h), normal, 'identical exposure ledger and hittable windows');
      await h.shoot(await h.wrong()); await h.tick(599); eq(await h.phase(), 'wrong'); await h.tick(1); eq(await h.phase(), 'engaging');
      await h.shoot(await h.correct()); await h.tick(900); eq(await h.phase(), 'regroup'); await h.tick(1599); eq(await h.phase(), 'regroup'); await h.tick(1); eq(await h.phase(), 'engaging');
      await h.boss(); const poses = await h.state(g => g.getEnemies().map(e => e.pose));
      for (let i = 0; i < 20; i++) { await h.tick(100); eq(await h.state(g => g.getEnemies().map(e => e.pose)), poses, 'reduced boss does not patrol'); }
      const before = await h.learning(); await h.shoot(await h.wrong(), false); await h.transaction(before, false); await h.tick(600);
      await h.shoot(await h.correct(), false); await h.tick(900); eq(await h.phase(), 'roaming');
      eq(await h.state(g => g.getMap().gates.find(x => x.id === 'g1').open01), 1);
      await h.prepare('advancing');
      // §4's rev-3.1 simulation midpoint (0.5) overrides check 19's old 300ms pose claim.
      // The first simulation frame at/after 1600ms applies the pose (60Hz clock).
      const frameMs = Math.ceil(1000 / 60);
      await h.tick(1600 + frameMs); await atStart(h);
      await h.tick(1599 - frameMs); eq(await h.phase(), 'advancing'); await h.tick(1); eq(await h.phase(), 'engaging');
      const eye = await h.state(g => g.debugSnapshot().camera.y);
      await h.state(g => g.setMoveInput({x: 1, z: 0})); await h.tick(250);
      eq(await h.state(g => g.debugSnapshot().camera.y), eye, 'no head bob');
      await h.state(g => g.setMoveInput(null));
      // A fresh normal/reduced pair below gives the normal rendered torso point
      // without inventing a signature for strikeOpsPoseAt's enemy input record.
    }, {reduced: true});
    await withHarness('desktop', async reduced => {
      await withHarness('desktop', async normalH => {
        for (const h of [normalH, reduced]) { await h.enter(id); await h.start(); await h.state(g => g.setRendering(false)); }
        let target = null;
        for (let ms = 0; ms < 33000 && !target; ms += 50) {
          await normalH.tick(50); await reduced.tick(50);
          const n = await normalH.state(g => g.getEnemies()), r = await reduced.state(g => g.getEnemies());
          for (const e of r) {
            const a = n[e.index];
            if (e.state === 'dash' && Math.hypot(e.pose.x - a.pose.x, e.pose.z - a.pose.z) >= 1) { target = {reduced: e, normal: a}; break; }
          }
        }
        ok(target, 'dash sample with >=1m normal/reduced pose separation');
        const before = await reduced.learning();
        // A metre of world separation can still project inside the enlarged
        // torso/assist envelope. Project the spec hitboxes from getEnemies()
        // poses, then extend toward the normal pose until outside every envelope.
        const miss = await reduced.state((g, target) => {
          const camera = window.__soTest.mainCamera;
          const {width, height} = g.$el.getBoundingClientRect();
          const hb = STRIKE_OPS_CONFIG.aim.hitbox;
          const assist = Math.max(...Object.values(STRIKE_OPS_CONFIG.aim.magnetRadiusPx));
          const envelopes = g.getEnemies().map(e => {
            const points = [];
            // This fresh pair is in the yard (heading 0); map x is THREE -x.
            for (const dx of [-hb.w / 2, hb.w / 2])
              for (const dy of [-hb.h / 2, hb.h / 2])
                for (const dz of [-hb.d / 2, hb.d / 2]) {
                  const v = new THREE.Vector3(-(e.pose.x + dx * e.scale),
                    (hb.centerY + dy) * e.scale, e.pose.z + dz * e.scale).project(camera);
                  points.push({x: (v.x + 1) * width / 2, y: (1 - v.y) * height / 2});
                }
            return {left: Math.min(e.screenX, ...points.map(p => p.x)) - assist,
              right: Math.max(e.screenX, ...points.map(p => p.x)) + assist,
              top: Math.min(e.screenY, ...points.map(p => p.y)) - assist,
              bottom: Math.max(e.screenY, ...points.map(p => p.y)) + assist};
          });
          const a = target.reduced, b = target.normal;
          const length = Math.hypot(b.screenX - a.screenX, b.screenY - a.screenY);
          if (!length) return null;
          for (let distance = length; distance < Math.hypot(width, height); distance += 8) {
            const x = a.screenX + (b.screenX - a.screenX) * distance / length;
            const y = a.screenY + (b.screenY - a.screenY) * distance / length;
            if (x < 0 || x >= width || y < 0 || y >= height) break;
            if (envelopes.every(e => x < e.left - 2 || x > e.right + 2 || y < e.top - 2 || y > e.bottom + 2))
              return {x, y};
          }
          return null;
        }, target);
        ok(miss, 'on-screen probe outside all reduced-pose hitbox/assist envelopes');
        const probe = await reduced.state((g, p) => g.probeShot(p.x, p.y), miss);
        eq(probe.hitIndex, null, 'ray outside reduced-pose envelopes misses'); eq(await reduced.learning(), before);
        await reduced.shoot(target.reduced.index, false); await reduced.transaction(before, target.reduced.isCorrect);
        if (target.reduced.isCorrect) await reduced.next(); else await reduced.tick(600);
        await reduced.until(() => reduced.state(g => g.getEnemies().some(e => e.state === 'dash')), 'next reduced dash', 15000);
        const i = await reduced.state(g => g.getEnemies().find(e => e.state === 'dash').index), beforeLock = await reduced.learning();
        ok(await reduced.state((g, i) => g.lockOn(i), i), 'lock on during dash');
        await reduced.until(async () => (await reduced.learning()).calls.length > beforeLock.calls.length, 'dash lock fires once', 2500, 10);
        const success = await reduced.state((g, i) => g.options[i] === g.question.result, i); await reduced.transaction(beforeLock, success);
        ok(Number.isFinite(await reduced.state(g => g.getPlayer().pitchDeg)), 'finite reduced aim');
      });
    }, {reduced: true});
  }
});

async function recoverCase(h, id, phase, action, failRestart = false) {
  await h.enter(id); await h.prepare(phase);
  if (phase === 'advancing') await h.tick(1280); // 40% of the lap-wrap timer
  if (phase === 'roaming') { await h.state(g => g.walkTo('containers')); await h.tick(4000); }
  const frozenPhase = phase === 'paused' ? 'regroup' : phase;
  const historyLength = await h.page.evaluate(() => history.length);
  const hash = new URL(h.page.url()).hash, before = await h.learning(), identity = await h.identity(), counts = await h.counters();
  await h.state(g => { window.__soTest.retained = g; });
  // Capture the pre-loss pose; loss() polls in tiny steps so the browser can
  // dispatch the native loss event without appreciably advancing the lap timer.
  const camera = await h.state(g => g.debugSnapshot().camera), transition = await h.state(g => g.getTransition());
  const mapBefore = await h.state(g => g.getMap()), playerBefore = await h.state(g => g.getPlayer());
  const generated = await h.page.evaluate(() => window.__soTest.generated);
  await h.loss();
  const timers = await h.state(g => g.getPhaseTimers());
  await h.tick(5000); eq(await h.phase(), 'lost'); eq(await h.state(g => g.getPhaseTimers()), timers);
  if (failRestart) await h.page.evaluate(() => { window.__soTest.noWebGL = true; });
  await h.click(action === 'dom' ? '.so-lost-dom' : '.so-lost-restart');
  // Poll in 1ms steps, preserving the remaining timer margin after async loads.
  await h.until(() => h.state(g => g.phase !== 'loading' && g.phase !== 'lost'), 'restart frozen phase', 20000, 1);
  eq(await h.phase(), frozenPhase); eq(new URL(h.page.url()).hash, hash);
  eq(await h.page.evaluate(() => history.length), historyLength);
  ok(await h.state(g => g === window.__soTest.retained), 'restart keeps same component instance');
  eq(await h.learning(), before); eq(await h.identity(), identity); eq(await h.counters(), counts);
  eq(await h.page.evaluate(() => window.__soTest.generated), generated, 'restart never calls generateFromList');
  if (action === 'dom' || failRestart) eq(await h.state(g => g.renderMode), 'dom');
  else {
    eq(await h.state(g => g.renderMode), 'gl');
    eq(await h.page.evaluate(() => { const p = window.__soTest; return p.contexts.filter(e => !p.baselineContexts.has(e) && !e.context.isContextLost()).length; }), 1);
  }
  if (phase === 'advancing') {
    // §4 applies the pose at >=0.5, including on rebuild; check 20's claim
    // that a 0.4 restart is already at start conflicts with that contract.
    eq(await h.state(g => g.getTransition()), transition, 'transition snapshot retained before midpoint');
    const rebuilt = await h.state(g => g.debugSnapshot().camera);
    near(rebuilt.x, camera.x, .01); near(rebuilt.z, camera.z, .01);
    headingNear(rebuilt.yawDeg, camera.yawDeg); near(rebuilt.pitchDeg, camera.pitchDeg, 1);
    eq((await h.state(g => g.getMap())).places.length, 4, 'whole map rebuilt');
  }
  if (['correct', 'wrong'].includes(frozenPhase)) {
    ok(await h.state(g => g.attemptLocked), 'recovered accepted attempt stays locked');
    ok(await h.page.locator('.so-answer').evaluateAll(nodes => nodes.every(n => n.disabled)), 'feedback chips disabled');
    const frozen = await h.learning(); eq(await h.state(g => g.answer(g.options.indexOf(g.question.result))), false); eq(await h.learning(), frozen);
  }
  if (frozenPhase === 'engaging') {
    const b = await h.learning();
    if (action === 'dom') await h.click(`.so-answer[data-index="${await h.correct()}"]`); else await h.shoot(await h.correct());
    await h.transaction(b, true); await h.next();
  } else if (frozenPhase === 'roaming') {
    const map = await h.state(g => g.getMap());
    eq(map.targetZoneIndex, mapBefore.targetZoneIndex);
    eq(map.gates.map(g => [g.id, g.open]), mapBefore.gates.map(g => [g.id, g.open]));
    const p = await h.state(g => g.getPlayer()); near(p.x, playerBefore.x, .01); near(p.z, playerBefore.z, .01); headingNear(p.headingDeg, playerBefore.headingDeg);
    eq(p.autopilot, false, 'loss cancels Go');
    if (action === 'dom' || failRestart) {
      const timer = (await h.state(g => g.getPhaseTimers())).find(t => t.expectPhase === 'roaming');
      ok(timer && timer.pending, 'DOM continuation starts roaming timer'); await h.tick(timer.remaining);
      eq(await h.phase(), 'deploying');
    } else { eq(await h.state(g => g.getPhaseTimers()), []); await walk(h, await h.state(g => g.zoneId)); }
    await h.tick(1000); eq(await h.phase(), 'engaging'); eq(await h.identity(), identity);
  } else {
    const timer = (await h.state(g => g.getPhaseTimers())).find(t => t.expectPhase === frozenPhase);
    ok(timer && timer.remaining > 0, 'recovered timer pending');
    await h.tick(Math.max(0, timer.remaining - 1)); eq(await h.phase(), frozenPhase); await h.tick(1);
    eq(await h.phase(), frozenPhase === 'correct' ? 'regroup' : 'engaging');
    if (frozenPhase === 'correct') { eq((await h.counters())[0], counts[0] + 1); eq(await h.page.evaluate(() => window.__soTest.generated), generated + 1); }
    else { eq(await h.counters(), counts); eq(await h.page.evaluate(() => window.__soTest.generated), generated); }
  }
}
check(20, 'Context loss: restart in place, frozen phases and DOM continuation [desktop]', async () => {
  await slice(async (h, id) => {
    for (const phase of ['engaging', 'wrong', 'correct', 'advancing', 'deploying', 'paused', 'roaming']) await recoverCase(h, id, phase, 'restart');
    for (const phase of ['engaging', 'correct', 'wrong', 'roaming']) await recoverCase(h, id, phase, 'dom');
    await recoverCase(h, id, 'correct', 'restart', true);
    // The third lost-panel action follows the same owned cleanup path.
    await h.enter(id); await h.start(); await h.loss();
    await h.click('.so-lost-back'); await h.until(async () => !(await h.page.locator(ROOT).count()), 'lost Back exits');
    eq(new URL(h.page.url()).hash, '#/app/' + id);
  });
  await withHarness('desktop', async h => {
    await h.boot(); const pending = []; let hold = true;
    await h.page.route('**/*enemy-hazmat*.glb', async route => {
      if (!hold) return route.continue();
      await new Promise(resolve => pending.push({route, resolve}));
    });
    try {
      await h.enter(SLICE_IDS[0], true, {booted: true, loading: true});
      await h.until(() => Promise.resolve(pending.length > 0), 'enemy GLB pending');
      eq(await h.phase(), 'loading'); await h.loss();
      const before = await h.state(g => ({enemies: g.getEnemies().length, stats: g.getRenderStats(), snapshot: g.debugSnapshot()}));
      const generated = await h.page.evaluate(() => window.__soTest.generated);
      hold = false;
      for (const item of pending.splice(0)) {
        const responsePromise = h.page.waitForResponse(r => r.url() === item.route.request().url());
        await item.route.continue(); item.resolve();
        const response = await responsePromise; await response.finished();
      }
      await h.tick(16000); eq(await h.phase(), 'lost');
      const after = await h.state(g => ({enemies: g.getEnemies().length, stats: g.getRenderStats(), snapshot: g.debugSnapshot()}));
      eq(after.enemies, before.enemies, 'late GLB cannot add enemies');
      ok(after.stats.geometries <= before.stats.geometries, 'late GLB cannot grow GPU geometries');
      eq(after.snapshot, before.snapshot, 'no late cosmetic work after loss');
      eq(await h.page.evaluate(() => window.__soTest.generated), generated);
    } finally {
      hold = false;
      for (const item of pending.splice(0)) { await item.route.abort(); item.resolve(); }
      await h.page.unroute('**/*enemy-hazmat*.glb');
    }
  });
});
check(21, 'Navigation during advance, wrong, dissolve and pause cleans resources [desktop]', () => slice(async (h, id) => {
  await h.enter(id);
  for (const phase of ['advancing', 'wrong', 'dissolve', 'paused', 'roaming', 'gate']) {
    if (phase === 'dissolve') {
      await h.enter(id); await h.state(g => g.forceBossRound()); await h.start(); await h.shoot(await h.wrong(), false); await h.tick(250);
    } else { await h.prepare(phase === 'gate' ? 'roaming' : phase);
      if (phase === 'advancing') await h.tick(1000);
      if (phase === 'roaming') { await h.state(g => g.walkTo('containers')); await h.tick(1000); }
    }
    await h.leave(phase === 'advancing');
  }
}));
check(22, 'Startup completion/news guards allocate no game GPU or GLB [desktop]', () => slice(async (h, id) => {
  for (const kind of ['complete', 'news']) {
    await h.enter(id, true, {progress: {progress: kind === 'complete' ? 1 : 0, total: kind === 'complete' ? 1 : 9999},
      news: kind === 'news' ? [0] : [], redirect: (kind === 'complete' ? '/app/' : '/display/news/') + id});
    await h.tick(1000);
    eq(await h.page.evaluate(() => { const p = window.__soTest; return p.contexts.filter(e => !p.baselineContexts.has(e)).length; }), 0, 'no route context allocation (Phaser baseline excluded)');
    ok(!h.requests.some(url => /\.glb(?:\?|$)/i.test(url)), 'no GLB requested');
  }
}));
check(23, 'Engine completion routing in squad and boss on both slice IDs [desktop]', () => slice(async (h, id) => {
  // §2 makes answer-time completion immediate even on a natural boss; the
  // separate transition-time checkProgress boundary is exercised in check 34.
  for (const mode of ['squad', 'forced', 'natural', 'containers']) {
    await h.enter(id); if (mode === 'forced') await h.state(g => g.forceBossRound()); await h.start();
    if (mode === 'natural') await h.boss();
    if (mode === 'containers') { await clearPlace(h); await walk(h, 'containers'); await h.tick(1000); }
    const score = await h.state(g => g.score);
    await h.state(g => {
      const w = getDataList(g.currentApp.listName).map(() => 0); w[g.questionIndex] = 1;
      setLocalStorage(getActivityMode() + '_' + g.currentAppId + '_Weights', w);
      setLocalStorage(g.currentAppId + '_CurrentLevelProgress', {progress: 0, total: 1});
    });
    const before = await h.learning();
    ok(await h.state(g => g.answer(g.options.indexOf(g.question.result))), 'final answer accepted');
    await h.until(() => h.page.evaluate(id => location.hash === '#/app/' + id && !document.querySelector('.so-game'), id), 'engine completion');
    eq(await h.page.evaluate(id => getScore(id), id), score, 'MCQ does not save final score after redirect');
    eq(await h.page.evaluate(() => window.__soTest.calls.slice(-1)), [[id, before.index, -1]]);
    eq(await h.page.evaluate(() => window.__soTest.calls.length), before.calls.length + 1);
  }
}));
async function chipRounds(h, dom) {
  const initial = await h.counters();
  // Spec sections 5/8: maximum non-hittable span is hiddenMs + two peek slides.
  // Add 350ms turn + 150ms settle and 500ms scheduling margin.
  const exposureTimeout = await h.page.evaluate(() => {
    const s = STRIKE_OPS_CONFIG.squad;
    return s.hiddenMs + 2 * s.slideMs + 350 + 150 + 500;
  });
  const waitForExposure = async index => {
    if (!dom) await h.until(() => h.state((g, i) => {
      const e = g.getEnemies().find(e => e.index === i);
      return e && e.hittable && ['exposed', 'dash'].includes(e.state);
    }, index), 'render-off target becomes exposed', exposureTimeout, 10);
  };
  if (dom) {
    eq(await h.state(g => g.renderMode), 'dom');
    ok(await h.page.locator(ROOT).evaluate(el => el.classList.contains('so-dom')), 'DOM class');
    for (const selector of ['.so-minimap', '.so-objective', '.so-go']) eq(await h.page.locator(selector).isVisible(), false);
  } else await h.state(g => g.setRendering(false));
  const wrong = await h.wrong(), same = await h.identity(), before = await h.learning();
  await waitForExposure(wrong);
  await h.click(`.so-answer[data-index="${wrong}"]`);
  if (!dom) await h.until(() => h.state(g => g.phase === 'wrong'), 'render-off lock fires', exposureTimeout, 10);
  await h.transaction(before, false); await h.tick(600); eq(await h.identity(), same);
  for (let n = 0; n < 8; n++) {
    const b = await h.learning(), round = await h.state(g => g.roundNumber);
    eq(await h.state(g => g.roundKind), n % 4 === 3 ? 'boss' : 'squad');
    const correct = await h.correct();
    await waitForExposure(correct);
    await h.click(`.so-answer[data-index="${correct}"]`);
    if (!dom) await h.until(() => h.state(g => g.phase === 'correct'), 'render-off chip shot', exposureTimeout, 10);
    await h.transaction(b, true); eq(await h.phase(), 'correct');
    ok(await h.page.locator('.so-answer').evaluateAll(nodes => nodes.every(n => n.disabled)), 'correct chips disabled');
    await h.tick(900); eq(await h.phase(), n % 4 === 3 ? 'roaming' : 'regroup');
    ok(await h.page.locator('.so-answer').evaluateAll(nodes => nodes.every(n => n.disabled)), 'transition chips disabled');
    if (n % 4 === 3) {
      if (dom) {
        ok((await h.page.locator(ROOT).innerText()).includes('מתקדמים אל'), 'DOM roaming progress line');
        await h.tick(3199); eq(await h.phase(), 'roaming'); await h.tick(1);
      } else {
        eq(await h.state(g => g.getPhaseTimers()), []);
        await h.tick(10000); eq(await h.phase(), 'roaming');
        if (n === 3) ok((await h.state(g => g.teleport(g.zoneId))).triggered, 'explicit GL teleport');
        else await walk(h, await h.state(g => g.zoneId));
      }
      eq(await h.phase(), 'deploying'); await h.tick(1000);
    } else await h.tick(1600);
    eq(await h.phase(), 'engaging'); eq(await h.state(g => g.roundNumber), round + 1);
  }
  eq((await h.counters())[2], initial[2] + 2);
  if (dom) eq(await h.page.evaluate(() => window.__soTest.raf.size), 0, 'DOM learning needs no RAF');
}
check(24, 'Two places through DOM-only and rendering-disabled learning [desktop]', async () => {
  for (const noWebGL of [true, false]) await slice(async (h, id) => {
    await h.enter(id); await h.start(true, !noWebGL); await chipRounds(h, noWebGL);
  }, 'desktop', {noWebGL});
});
check(25, 'Precache/origin audit, LOD loads and asset failure stand-ins [desktop,touch]', async () => {
  const cache = precacheURLs();
  for (const kind of ['desktop', 'touch']) for (const failure of ['none', 'enemy', 'kit']) await withHarness(kind, async h => {
    await h.boot();
    const assets = [...cache].filter(u => u.includes('/assets/strike-ops/'));
    const enemy = assets.find(u => u.endsWith(kind === 'touch' ? '/enemy-hazmat-lod.glb' : '/enemy-hazmat.glb'));
    ok(enemy, 'precache contains context enemy asset');
    const kit = assets.find(u => /\.glb$/.test(u) && !/enemy-hazmat/.test(u));
    ok(kit, 'precache contains outdoor kit GLB');
    const texture = new URL('Textures/colormap.png', kit).href;
    const forced = failure === 'enemy' ? [enemy] : failure === 'kit' ? [kit, texture] : [];
    for (const url of forced) {
      await h.page.route(url, route => route.fulfill({status: 404, body: 'Intentional asset fixture', contentType: 'text/plain'}));
      h.injected404URLs.add(url);
    }
    await h.enter(SLICE_IDS[0], true, {booted: true}); await h.start(); await h.boss(); await h.shoot(await h.correct(), false); await h.next();
    const urls = h.requests.filter(u => /^https?:/.test(u));
    ok(urls.length > 0 && urls.includes(enemy), 'observed expected LOD asset request');
    // vendor/analytics.js loads this tag; its existing GA4 events use /g/collect.
    // Restrict the exception to HTTPS analytics hosts, that path and this ID.
    const analyticsURL = 'https://www.googletagmanager.com/gtag/js?id=G-2T1G2WVRMD';
    const isBaselineAnalytics = value => {
      if (value === analyticsURL) return true;
      const u = new URL(value);
      return u.protocol === 'https:' && !u.port && !u.username && !u.password &&
        (u.hostname === 'google-analytics.com' || u.hostname.endsWith('.google-analytics.com')) &&
        u.pathname === '/g/collect' && u.searchParams.get('tid') === 'G-2T1G2WVRMD';
    };
    eq(urls.filter(u => new URL(u).origin !== ORIGIN && !isBaselineAnalytics(u)), [], 'no unexpected request leaves origin during run');
    eq(urls.filter(u => !isBaselineAnalytics(u) && !cache.has(u)), [], 'every non-analytics requested exact URL is precached');
    eq(urls.filter(u => /\/assets\/strike-ops\/models\/|RobotExpressive|\/(?:assault-rifle|crate)\.glb(?:\?|$)/i.test(u)), [], 'no obsolete/fallback model URLs');
    for (const url of forced) ok(urls.includes(url), 'failure fixture actually requested: ' + url);
    for (const url of urls.filter(u => /\/Textures\/colormap\.png$/.test(u))) ok(cache.has(url), 'relative texture precached');
    if (failure === 'none') {
      const kitTextures = assets.filter(u => /\/Textures\/colormap\.png$/.test(u));
      ok(kitTextures.length >= 3 && kitTextures.every(u => urls.includes(u)), 'all three kit relative textures loaded');
    }
    const assetResponses = h.responses.filter(r => r.url().includes('/assets/strike-ops/'));
    let bytes = 0;
    for (const r of assetResponses) { const sizes = await r.request().sizes(); bytes += sizes.responseBodySize; }
    console.log(`  ${kind}/${failure}: Strike Ops transferred ${bytes} bytes (desktop baseline ~1.08 MB)`);
    // Only exact injected URLs with the browser's resource-404 message are tolerated;
    // all other Strike Ops console errors still fail the harness.
  });
});
check(26, 'Five replay lifetimes, at most one live game context [desktop]', () => slice(async (h, id) => {
  await h.boot();
  for (let i = 0; i < 5; i++) {
    await h.enter(id, true, {booted: true}); await h.start();
    eq(await h.page.evaluate(() => { const p = window.__soTest; return p.contexts.filter(e => !p.baselineContexts.has(e) && !e.context.isContextLost()).length; }), 1);
    await h.leave();
  }
}));
check(27, 'Balloon route regression smoke [desktop]', async () => {
  await withHarness('desktop', async h => {
    await h.boot();
    await h.page.evaluate(weightSeed => {
      const id = '0_4_1', app = getItemById(apps, id);
      setLocalStorage(getActivityMode() + '_' + id + '_Weights', getDataList(app.listName).map(() => weightSeed));
      setLocalStorage(id + '_CurrentLevelProgress', {progress: 0, total: 9999}); setLocalStorage(id + '_new_items', []);
      location.hash = '/play/balloon_shooter/' + id;
    }, WEIGHT_SEED);
    await h.until(() => h.page.locator('canvas').count(), 'balloon canvas'); await h.tick(1000);
    ok(await h.page.locator('canvas').first().isVisible(), 'balloon renders'); await h.shot('27-balloon');
    await h.page.evaluate(() => { location.hash = '/app/0_4_1'; });
    await h.until(() => h.page.evaluate(() => location.hash === '#/app/0_4_1'), 'return from balloon');
  });
});

check(28, 'Free roam and guidance [desktop,touch]', async () => {
  // Idle-class spelling and chevron node names are unspecified: compare classes
  // before/after idle, and identify the visible ground-level InstancedMesh.
  for (const kind of ['desktop', 'touch']) await withHarness(kind, async h => {
    await h.enter(); await h.start(); await clearPlace(h);
    await h.state(g => g.setRendering(false));
    await observeMapEvents(h);
    await h.page.evaluate(() => {
      const p = window.__soTest; p.dashedRouteStrokes = 0;
      const canvas = document.querySelector('canvas.so-minimap,.so-minimap canvas');
      const ctx = canvas.getContext('2d'), stroke = ctx.stroke.bind(ctx);
      ctx.stroke = (...args) => { if (ctx.getLineDash().some(n => n > 0)) p.dashedRouteStrokes++; return stroke(...args); };
    });
    await h.tick(650);
    ok(await h.page.locator('.so-objective').isVisible(), 'objective visible');
    ok((await h.page.locator('.so-objective').innerText()).includes('חצר המכולות'), 'target name');
    eq(await h.state(g => g.getMap().gates.find(x => x.id === 'g1').open), true);
    ok(await h.page.evaluate(() => window.__soTest.dashedRouteStrokes > 0), 'minimap strokes dotted route');
    const chevrons = () => h.page.evaluate(() => {
      const scene = window.__soTest.renderers.at(-1).__soScene, found = [];
      scene.traverseVisible(mesh => {
        if (!mesh.isInstancedMesh || mesh.count < 1 || mesh.count > 24) return;
        const matrix = new THREE.Matrix4(), v = new THREE.Vector3();
        let ground = true;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld); v.setFromMatrixPosition(matrix);
          if (Math.abs(v.y) > .2) ground = false;
        }
        if (ground) {
          const m = mesh.material;
          found.push({id: mesh.uuid, count: mesh.count, brightness: m.opacity * (m.color.r + m.color.g + m.color.b) +
            (m.emissive ? (m.emissive.r + m.emissive.g + m.emissive.b) * m.emissiveIntensity : 0)});
        }
      });
      return found;
    });
    const ground = await chevrons(); eq(ground.length, 1, 'one route chevron mesh, 1..24 instances');
    const objective = await h.state(g => g.getMap().objective), p = await h.state(g => g.getPlayer());
    const bearing = Math.atan2(objective.x - p.x, objective.z - p.z) * 180 / Math.PI;
    await h.state((g, headingDeg) => g.setView({headingDeg}), bearing + 180); await h.tick(50);
    headingNear((await h.state(g => g.getPlayer())).headingDeg, bearing + 180);
    const edge = await h.state(g => g.getMap().objective.edge);
    ok(['left', 'right'].includes(edge), 'behind objective has side arrow', edge);
    const l = await h.state(g => g.getLayout()), marker = rect(l.objective), safe = rect(l.safeRect);
    near(edge === 'left' ? marker.x : marker.right, edge === 'left' ? safe.x : safe.right, 1, 'marker touches safe edge');
    ok(/[←→‹›◀▶]/.test(await h.page.locator('.so-objective').innerText()) ||
      await h.page.locator('.so-objective svg,.so-objective [class*="arrow"]').count(), 'edge arrow rendered');
    const classes = await h.page.locator('.so-go').getAttribute('class');
    await h.tick(15000);
    ok(await h.page.locator('.so-go').getAttribute('class') !== classes, 'idle hint adds class');
    ok((await chevrons())[0].brightness > ground[0].brightness, 'idle route brightens');
    await h.page.keyboard.press('KeyM'); ok(await h.page.locator('.so-mapview').isVisible(), 'M opens map');
    eq(await h.page.locator('.so-mapview ol li').count(), 4);
    const list = await h.page.locator('.so-mapview ol').innerText();
    for (const state of ['נוקה', 'היעד', 'סגור']) ok(list.includes(state), 'map status ' + state);
    await h.page.keyboard.press('KeyM'); eq(await h.page.locator('.so-mapview').isVisible(), false);
    await h.click('.so-pause'); ok(await h.page.locator('.so-mapview').isVisible(), 'pause shows map'); await h.click('.so-resume');
    await h.page.locator(ROOT).focus(); await h.page.keyboard.press('KeyG');
    ok(await h.state(g => g.autopilot), 'G starts autopilot');
    await h.tick(300); await h.page.keyboard.press('KeyW'); eq(await h.state(g => g.autopilot), false, 'W cancels');
    // Reset before timing the authored 29.6 m leg, so the deadline is independent of cancellation.
    ok((await h.state(g => g.teleport('start'))).ok, 'return to leg start');
    await observeMapEvents(h);
    const distance = await h.state(g => g.getMap().objective.distanceM);
    if (h.touch) await h.page.tap('.so-go', {force: true}); else await h.page.keyboard.press('KeyG');
    await h.tick(1000);
    ok(await h.state((g, distance) => g.getMap().objective.distanceM < distance, distance), 'distance decreases');
    await walk(h, 'containers', {started: true, max: Math.ceil(29.6 / 3 * 1000 + 3000) - 1000});
    const events = await h.page.evaluate(() => window.__soTest.mapEvents);
    eq(events.toast.filter(t => t === 'חצר המכולות').length, 1, 'one region toast');
    eq(events.live.filter(t => t === 'חצר המכולות').length, 1, 'one region announcement');
    eq(events.phases.filter(p => p === 'deploying').length, 1, 'one trigger');
    await h.tick(1000); await h.page.keyboard.press('KeyM'); eq(await h.page.locator('.so-mapview').isVisible(), false, 'M ignored in encounter');
  });
});

check(29, 'Collision, gates and encounter boundary [desktop]', () => withHarness('desktop', async h => {
  // Fight-box bounds clamp the centre; solid colliders include the capsule radius.
  await h.enter(); await h.start(); await h.state(g => g.setRendering(false)); await observeMapEvents(h);
  await h.state(g => g.setView({headingDeg: 0})); await h.state(g => g.setMoveInput({x: 0, z: 1}));
  await h.tick(5000); near((await h.state(g => g.getPlayer())).z, 3);
  await h.state(g => g.setMoveInput({x: 1, z: 0})); await h.tick(5000);
  const corner = await h.state(g => g.getPlayer()); near(corner.x, 3); ok(corner.inFightBox, 'cannot enter enemy side');
  eq(await h.page.evaluate(() => window.__soTest.mapEvents.live.filter(s => s === 'הישארו בקו האש עד שהמקום נקי').length), 1);
  await h.state(g => g.setMoveInput(null)); await h.state(g => g.teleport('yard')); await clearPlace(h);
  const placed = await h.state(g => g.teleport({x: 3, z: 30.5, headingDeg: 90}));
  ok(placed.ok && !placed.triggered, 'start outside containers fight box (z 22..28)');
  eq(await h.phase(), 'roaming');
  await h.state(g => g.setMoveInput({x: 0, z: 1})); await h.tick(3000);
  near((await h.state(g => g.getPlayer())).x, 5.1); eq(await h.phase(), 'roaming');
  eq(await h.state(g => g.getMap().gates.find(g => g.id === 'g2').open), false);
  const locked = await h.state(g => g.teleport('plaza')); eq([locked.ok, locked.reason], [false, 'locked']);
  // getMap exposes regions, but not structures: resolve the west container
  // from the runtime config, using the live container place as the selector.
  const face = await h.state(g => {
    const place = g.getMap().places.find(p => p.id === 'containers');
    const c = STRIKE_OPS_CONFIG.map.structures.filter(s => s.area === place.id && s.kind === 'container')
      .sort((a, b) => a.x - b.x)[0];
    const m = STRIKE_OPS_CONFIG.movement;
    return {x: c.x - c.w / 2 - m.radius, z: c.z, minZ: c.z - c.d / 2,
      maxZ: c.z + c.d / 2, walk: m.walk};
  });
  // The 6 m west face leaves room for turn-in plus the entire timed slide.
  const approach = await h.state((g, f) => g.teleport({x: f.x - .1, z: f.z, headingDeg: 90}), face);
  ok(approach.ok && !approach.triggered, 'container approach outside trigger');
  await h.state(g => g.setMoveInput({x: 0, z: 1})); await h.tick(2000);
  const stopped = await h.state(g => g.getPlayer());
  ok(stopped.x <= face.x + .01, 'capsule outside inflated container');
  near(stopped.x, face.x, .01, 'capsule contacts west face');
  // 30 degrees to the face gives a tangential component of cos(30) * walk.
  // Allow 160 ms for the heading change, then require >=80% of full walk speed.
  await h.state(g => g.setView({headingDeg: 30}));
  let previous = stopped, slideStart;
  for (let elapsed = 16; elapsed <= 960; elapsed += 16) {
    await h.tick(16);
    const slid = await h.state(g => g.getPlayer());
    ok(slid.x <= face.x + .01, 'sliding capsule never penetrates container');
    near(slid.x, face.x, .01, 'slide stays in contact with west face');
    ok(slid.z > face.minZ && slid.z < face.maxZ, 'slide stays on face before corner');
    if (elapsed === 160) slideStart = slid;
    if (elapsed > 160) ok(slid.z > previous.z, '30 degree push does not stick');
    previous = slid;
  }
  ok(previous.z - slideStart.z >= .8 * face.walk * .8,
    '30 degree push slides tangentially at >=80% of walk speed over 800ms');
  // Slow only the RAF delivery, not its timestamp, to exercise real 50ms integration steps.
  ok((await h.state(g => g.teleport({x: 12, z: 0, headingDeg: 90}))).ok, 'fence approach');
  await h.page.evaluate(() => {
    const raf = requestAnimationFrame, cancel = cancelAnimationFrame, pending = new Map(); let seq = 0;
    window.__soTest.restoreRaf = () => { window.requestAnimationFrame = raf; window.cancelAnimationFrame = cancel; };
    window.requestAnimationFrame = fn => {
      const id = ++seq, start = performance.now();
      const step = t => { if (t - start < 50) pending.set(id, raf(step)); else { pending.delete(id); fn(t); } };
      pending.set(id, raf(step)); return -id;
    };
    window.cancelAnimationFrame = id => { if (id < 0) { cancel(pending.get(-id)); pending.delete(-id); } else cancel(id); };
  });
  try {
    await h.state(g => g.setMoveInput({x: 0, z: 1, sprint: true})); await h.tick(3000);
    const p = await h.state(g => g.getPlayer()); ok(p.x <= 15.45, 'no tunnelling through 0.6m fence'); near(p.x, 15.4);
  } finally { await h.state(g => g.setMoveInput(null)); await h.page.evaluate(() => window.__soTest.restoreRaf()); }
  ok((await h.state(g => g.teleport('containers'))).triggered, 'enter containers'); await h.tick(1000); await clearPlace(h);
  const map = await h.state(g => g.getMap()); eq(map.gates.find(g => g.id === 'g2').open, true);
  eq(map.blockers.find(b => b.placeId === 'containers').active, false, 'container tape blocker retired');
  await walk(h, 'sheds'); await h.tick(1000); eq(await h.state(g => g.zoneId), 'sheds');
}));

check(30, 'Full lap and Go-only touch progression [desktop,touch]', async () => {
  // §3's counter is lap-local: round 17 is displayed as lap 2, question 1/16.
  for (const kind of ['desktop', 'touch']) await withHarness(kind, async h => {
    await h.enter(); await h.start(); await h.state(g => { g.setQuality(0); g.resetRenderPeak(); g.setRendering(false); });
    await observeMapEvents(h);
    const before = await h.learning(), bosses = [], visits = ['yard'];
    const count = h.touch ? 8 : 16;
    for (let n = 1; n <= count; n++) {
      eq(await h.state(g => g.roundKind), n % 4 === 0 ? 'boss' : 'squad');
      if (n % 4 === 0) bosses.push(n);
      const b = await h.learning(); await h.shoot(await h.correct()); await h.transaction(b, true); await h.tick(900);
      if (n % 4) { eq(await h.phase(), 'regroup'); await h.tick(1600); }
      else if (n === 16) {
        eq(await h.phase(), 'advancing'); eq(await h.state(g => [g.stars, g.lap]), [0, 2]);
        await h.tick(3200); await atStart(h);
        ok(/סבב\s*2[\s\S]*שאלה\s*1\s*\/\s*16/.test(await h.page.locator('.so-counter').innerText()), 'lap counter');
      } else {
        eq(await h.phase(), 'roaming'); eq(await h.state(g => g.stars), n / 4);
        const target = await h.state(g => g.zoneId);
        if (h.touch) await h.page.tap('.so-go', {force: true});
        await walk(h, target, {started: h.touch}); visits.push(target); await h.tick(1000);
      }
      eq(await h.phase(), 'engaging');
    }
    eq(bosses, h.touch ? [4, 8] : [4, 8, 12, 16]);
    eq(visits, h.touch ? ['yard', 'containers', 'sheds'] : ['yard', 'containers', 'sheds', 'plaza']);
    eq(await h.page.evaluate(() => window.__soTest.mapEvents.phases.filter(p => p === 'deploying').length), h.touch ? 2 : 3);
    const after = await h.learning(); eq(after.calls.length - before.calls.length, count, 'exactly one report per round');
    // History is a capped per-item ring; calls count proves all 16 reports even if an item repeats >5 times.
    console.log(`  ${kind} lap peak:`, await h.state(g => g.getRenderStats().peak));
    if (!h.touch) eq(await h.state(g => [g.zoneId, g.roundNumber, g.lap]), ['yard', 17, 2]);
  });
});

check(31, 'Shooting and lock-on at all four headings [desktop,touch]', async () => {
  // Corners may put targets off-screen: turn toward each torso before probing.
  // Hidden targets are sampled at the anchor, where §5 guarantees full occlusion.
  for (const kind of ['desktop', 'touch']) await withHarness(kind, async h => {
    await h.enter(); await h.start(); await h.state(g => g.setRendering(false));
    for (let n = 1; n <= 4; n++) {
      if (n > 1) {
        await h.enter(); await h.start(); await h.state(g => g.setRendering(false));
        const target = await targetPlace(h, n);
        ok((await h.state((g, id) => g.teleport(id), target.id)).triggered, 'heading encounter'); await h.tick(1000);
      }
      const place = await h.state(g => g.getMap().places.find(p => p.id === g.zoneId));
      eq(place.headingDeg, [0, 90, 0, 270][n - 1]);
      const b = place.fightBox;
      const positions = [place.anchor, {x: b.minX, z: b.minZ}, {x: b.maxX, z: b.maxZ}];
      for (const position of positions) {
        ok((await h.state((g, target) => g.teleport(target), {...position, headingDeg: place.headingDeg})).ok, 'fight-box sample');
        const indices = await h.state(g => g.getEnemies().map(e => e.index));
        for (const i of indices) {
          await h.state((g, i) => {
            g.forceExpose(i);
            const e = g.getEnemies()[i], p = g.getPlayer();
            g.setView({headingDeg: Math.atan2(e.pose.x - p.x, e.pose.z - p.z) * 180 / Math.PI});
          }, i);
          await h.tick(16);
          eq(await h.state((g, i) => { g.forceExpose(i); const e = g.getEnemies()[i]; return g.probeShot(e.screenX, e.screenY).hitIndex; }, i), i, 'map-frame torso ray');
        }
        const before = await h.learning(), w = await h.wrong();
        await h.shoot(w); await h.transaction(before, false); await h.tick(600);
        // Observe the documented answer boundary without replacing fire/aim/lock internals.
        await h.state((g, heading) => {
          g.setView({headingDeg: heading + 180});
          const answer = g.answer;
          window.__soTest.lockShots = [];
          g.answer = function(i, token) {
            const e = this.getEnemies()[i], root = document.querySelector('.so-game');
            const rr = root.getBoundingClientRect(), cr = root.querySelector('.so-crosshair').getBoundingClientRect();
            window.__soTest.lockShots.push({i, error: Math.hypot(e.screenX - (cr.left - rr.left + cr.width / 2),
              e.screenY - (cr.top - rr.top + cr.height / 2))});
            return answer.call(this, i, token);
          };
          window.__soTest.restoreAnswer = () => { g.answer = answer; };
        }, place.headingDeg);
        const correct = await h.correct(), lockedBefore = await h.learning(), ammo = await h.state(g => g.ammo);
        try {
          await h.state((g, i) => { g.forceExpose(i); g.lockOn(i); }, correct);
          await h.until(() => h.state(g => g.phase === 'correct'), 'lock-on turns and fires', 2500, 10);
          await h.transaction(lockedBefore, true); eq(await h.state(g => g.ammo), ammo - 1);
          const shots = await h.page.evaluate(() => window.__soTest.lockShots);
          eq(shots.length, 1); eq(shots[0].i, correct); ok(shots[0].error <= 4, 'torso within 4px of crosshair', shots);
        } finally { await h.page.evaluate(() => window.__soTest.restoreAnswer()); }
        await h.next(true);
      }
      // The three correct lock shots have reached the natural boss. Get a new
      // squad in this same place through the documented roaming retarget path.
      await h.shoot(await h.correct()); await h.tick(900);
      if (await h.phase() === 'advancing') { await h.state(g => g.skipTransition()); await h.tick(1); await clearPlace(h); }
      const target = await targetPlace(h, n);
      ok((await h.state((g, id) => g.teleport(id), target.id)).triggered, 'fresh squad at anchor'); await h.tick(1000);
      const hidden = await h.wrong();
      await h.until(() => h.state((g, i) => g.getEnemies()[i].state === 'hidden', hidden), 'hidden target behind cover');
      const before = await h.learning();
      const blocked = await h.state((g, i) => g.shootEnemy(i), hidden);
      ok(blocked.blocked && !blocked.accepted, 'hidden shot blocked'); eq(await h.learning(), before);
      // Nearby magnet rays may hit a different exposed soldier, but never the covered one.
      const picks = await h.state((g, i) => {
        const e = g.getEnemies()[i];
        return [-20, -10, 0, 10, 20].map(dx => g.probeShot(e.screenX + dx, e.screenY));
      }, hidden);
      ok(picks.every(p => p.hitIndex !== hidden), 'magnet never selects covered target', picks);
    }
  });
});

check(32, 'Suspension clears held input and preserves only paused autopilot [touch]', () => withHarness('touch', async h => {
  // Late events use the browser-assigned old pointer IDs, with no new pointerdown.
  for (const loss of [false, true]) {
    await h.enter(); await h.start(); await clearPlace(h); await h.state(g => g.setRendering(false));
    await h.page.evaluate(() => {
      window.__soTest.oldPointers = [];
      document.querySelector('.so-game').addEventListener('pointerdown', e => window.__soTest.oldPointers.push(e.pointerId), {capture: true});
    });
    const stick = await h.page.locator('.so-stick').boundingBox(), host = await h.page.locator('.so-canvas-host').boundingBox();
    const sx = stick.x + stick.width / 2, sy = stick.y + stick.height / 2, x = host.x + host.width / 2, y = host.y + host.height / 2;
    await pointer(h, '.so-stick', 'pointerdown', 41, sx, sy);
    await pointer(h, '.so-stick', 'pointermove', 41, sx, sy - stick.height / 2);
    await pointer(h, '.so-canvas-host', 'pointerdown', 42, x, y);
    await pointer(h, '.so-canvas-host', 'pointermove', 42, x + 30, y + 10);
    await h.page.keyboard.down('KeyW'); await h.page.keyboard.down('ShiftLeft');
    await h.state(g => g.setMoveInput({x: 0, z: 1, turn: .2, sprint: true})); await h.tick(250);
    ok(await h.state(g => g.getPlayer().speed > 0 && g.getPlayer().sprinting), 'held input really moves');
    if (loss) await h.loss(); else await visibility(h, true);
    eq(await h.phase(), loss ? 'lost' : 'paused');
    const frozen = poseOf(await h.state(g => g.getPlayer()));
    await pointer(h, '.so-stick', 'pointerup', 41, sx, sy);
    await pointer(h, '.so-canvas-host', 'pointerup', 42, x, y);
    await h.page.keyboard.up('KeyW'); await h.page.keyboard.up('ShiftLeft');
    await h.tick(2000); eq(poseOf(await h.state(g => g.getPlayer())), frozen, 'suspension freezes pose');
    if (loss) await restart(h); else { await visibility(h, false); await h.click('.so-resume'); }
    eq(await h.phase(), 'roaming');
    const resumed = await h.state(g => g.getPlayer());
    near(resumed.speed, 0, .001); eq(resumed.moveInput, null); eq(resumed.sprinting, false); eq(resumed.autopilot, false);
    ok(await h.page.locator('.so-stick i').evaluate(el => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return Math.abs(m.m41) < .1 && Math.abs(m.m42) < .1;
    }), 'joystick knob centred');
    await h.page.evaluate(() => {
      const root = document.querySelector('.so-game'), ids = window.__soTest.oldPointers;
      ids.forEach((pointerId, i) => {
        const el = root.querySelector(i ? '.so-canvas-host' : '.so-stick');
        for (const type of ['pointermove', 'pointerup']) el.dispatchEvent(new PointerEvent(type,
          {pointerId, pointerType: 'touch', bubbles: true, clientX: 300, clientY: 100, buttons: type === 'pointermove' ? 1 : 0}));
      });
    });
    await h.tick(2000); eq(poseOf(await h.state(g => g.getPlayer())), poseOf(resumed), 'old fingers and keys cannot drift or turn');
  }
  for (const loss of [false, true]) {
    await h.enter(); await h.start(); await clearPlace(h); await observeMapEvents(h);
    ok((await h.state(g => g.teleport({x: 3, z: 21, headingDeg: 0}))).ok, 'one metre before trigger');
    ok(await h.state(g => g.walkTo('containers')), 'autopilot armed'); await h.tick(100);
    if (loss) await h.loss(); else await visibility(h, true);
    const frozen = poseOf(await h.state(g => g.getPlayer()));
    eq(await h.state(g => g.getPhaseTimers()), []); await h.tick(10000);
    eq(poseOf(await h.state(g => g.getPlayer())), frozen);
    eq(await h.page.evaluate(() => window.__soTest.mapEvents.phases.filter(p => p === 'deploying').length), 0);
    if (loss) {
      await restart(h); eq(await h.state(g => g.autopilot), false);
      await h.tick(2000); eq(poseOf(await h.state(g => g.getPlayer())), frozen);
      await walk(h, 'containers');
    } else { await visibility(h, false); await h.click('.so-resume'); await walk(h, 'containers', {started: true}); }
    eq(await h.page.evaluate(() => window.__soTest.mapEvents.phases.filter(p => p === 'deploying').length), 1);
  }
}));

check(33, 'Centre assist and full-map closure on encounter entry [touch]', async () => {
  // The yard normally starts inside its trigger; retarget it in roaming to test
  // the same entry contract. Each entry point is 0.5m outside the fight box.
  const entries = [{x: 0, z: -1}, {x: 3, z: 21.5}, {x: 17.5, z: 36}, {x: 3, z: 50}];
  for (const reduced of [false, true]) await withHarness('touch', async h => {
    await h.boot(); const id = (await fixtures(h))[1]; await h.enter(id, true, {booted: true}); await h.start();
    await h.state(g => g.setRendering(false));
    for (let n = 1; n <= 4; n++) {
      const place = await targetPlace(h, n);
      const placed = await h.state((g, p) => g.teleport(p), {...entries[n - 1], headingDeg: place.headingDeg + 180});
      ok(placed.ok && !placed.triggered, 'outside entry trigger');
      await observeMapEvents(h);
      ok(await h.state((g, id) => g.walkTo(id), place.id), 'entry walk');
      await h.page.keyboard.press('KeyM'); ok(await h.page.locator('.so-mapview').isVisible(), 'map open before trigger');
      // The list has no specified focusable child; give its existing ol programmatic focus.
      await h.page.locator('.so-mapview ol').evaluate(el => { el.tabIndex = -1; el.focus(); });
      await walk(h, place.id, {started: true});
      eq(await h.page.locator('.so-mapview').isVisible(), false, 'map closed in entry step');
      ok(await h.page.locator(ROOT).evaluate(el => document.activeElement === el), 'focus restored to root');
      if (!reduced) await h.tick(450);
      const p = await h.state(g => g.getPlayer()); near(p.x, place.anchor.x, .01); near(p.z, place.anchor.z, .01); headingNear(p.headingDeg, place.headingDeg);
      near(p.pitchDeg, 0, 1);
      if (reduced) await h.tick(450);
      const l = await h.state(g => g.getLayout()), safe = rect(l.safeRect);
      const enemies = await h.state(g => g.getEnemies()); eq(enemies.length, 4);
      for (const e of enemies) ok(e.screenX >= 0 && e.screenX <= 390 && e.screenY >= 0 && e.screenY <= 844, 'entry torso on screen', e);
      for (const r of l.plates.filter(Boolean).map(rect)) ok(r.x >= safe.x - 1 && r.right <= safe.right + 1 && r.y >= safe.y - 1 && r.bottom <= safe.bottom + 1, 'entry plate/marker in safeRect', r);
      eq(l.answersLayout, 'stacked'); await content(h, true);
      eq(await h.page.evaluate(() => window.__soTest.mapEvents.phases.filter(p => p === 'deploying').length), 1);
      await h.until(() => h.state(g => g.phase === 'engaging'), 'entry approach finishes', 1000, 10);
    }
  }, {reduced});
});

check(34, 'Teleport determinism, completion commit and lap-wrap edges [desktop]', async () => {
  // §12.1 exposes committed map state through getMap().targetZoneIndex, not a
  // private _so read. Idempotence is checked by lapPoseApplied and stable pose/
  // gates/counters across rebuild and arrival; applyLapPose is not a debug API.
  // §4 wins over check 20's conflicting pre-midpoint reset: at 0.45 the pose
  // stays at the plaza; at 0.55 it is at start. Arrival applies it if still due.
  // Completion fixtures seed engine storage between answer and transition to
  // isolate the two checkProgress boundaries without replacing engine methods.
  await withHarness('desktop', async h => {
    await h.enter(); await h.start(); await clearPlace(h); await h.state(g => g.setRendering(false));
    const snaps = [];
    for (let repeat = 0; repeat < 3; repeat++) {
      await h.state(g => g.teleport('start'));
      await h.state(g => g.setMoveInput({x: 1, z: 1, turn: 1}));
      const snap = await h.state(g => g.teleport({x: -.4, z: 27})); ok(snap.ok, 'corner placement snaps'); snaps.push([snap.x, snap.z]);
      // The north/east faces are equidistant: radius .35, angle 0 (north) wins.
      near(snap.x, -.4, .00001); near(snap.z, 27.35, .00001);
      const p = await h.state(g => g.getPlayer()); eq(p.moveInput, null); near(p.speed, 0, .001);
      await h.tick(2000); eq(poseOf(await h.state(g => g.getPlayer())), poseOf(p), 'teleport clears virtual input');
    }
    eq(snaps[0], snaps[1]); eq(snaps[1], snaps[2]);
    await observeMapEvents(h);
    const token = await h.state(g => g.questionToken), counters = await h.counters();
    const twice = await h.state(g => [g.teleport('containers'), g.teleport('containers')]);
    ok(twice[0].triggered && !twice[1].triggered, 'two synchronous teleports trigger once');
    eq(await h.state(g => [g.phase, g.questionToken, g.attemptLocked]), ['deploying', token, true]); eq(await h.counters(), counters);
    await h.tick(999); ok(await h.state(g => g.attemptLocked), 'locked throughout approach'); await h.tick(1);
    eq(await h.state(g => [g.phase, g.questionToken, g.attemptLocked]), ['engaging', token, false]);
    eq(await h.page.evaluate(() => window.__soTest.mapEvents.phases.filter(p => p === 'deploying').length), 1);
  });
  for (const transitionTime of [false, true]) await withHarness('desktop', async h => {
    await h.enter(); await h.start(); await h.boss(); await observeMapEvents(h);
    await h.state((g, transitionTime) => {
      window.__soTest.retained = g;
      window.__soTest.commitBefore = g.getMap();
      window.__soTest.oscillators = 0;
      for (const ac of window.__soTest.audio) {
        const create = ac.createOscillator.bind(ac);
        ac.createOscillator = (...args) => { window.__soTest.oscillators++; return create(...args); };
      }
      if (transitionTime) {
        const p = window.__soTest, schedule = window.setTimeout;
        p.restoreTimeout = () => { window.setTimeout = schedule; };
        // Observe the real correct timer's return in the same task, before Vue's
        // queued route teardown. No private timer/transition method is invoked.
        window.setTimeout = (fn, ms, ...args) => schedule(function(...values) {
          const wasCorrect = g.phase === 'correct', soundsBefore = p.oscillators;
          const result = fn.apply(this, values);
          if (wasCorrect && g.phase === 'roaming' && !p.commitAfter) {
            const before = {map: g.getMap(), player: g.getPlayer(), token: g.questionToken, score: g.score};
            const results = [g.teleport('containers'), g.walkTo('containers'), g.skipTransition(), g.skipToZone(3), g.answer(0)];
            p.commitAfter = {before, results, after: {map: g.getMap(), player: g.getPlayer(), token: g.questionToken, score: g.score}, oscillators: p.oscillators - soundsBefore};
          }
          return result;
        }, ms, ...args);
      }
    }, transitionTime);
    if (!transitionTime) await h.state(g => {
      const weights = getDataList(g.currentApp.listName).map(() => 0); weights[g.questionIndex] = 1;
      setLocalStorage(getActivityMode() + '_' + g.currentAppId + '_Weights', weights);
      setLocalStorage(g.currentAppId + '_CurrentLevelProgress', {progress: 0, total: 1});
    });
    const before = await h.learning();
    ok(await h.state(g => {
      const accepted = g.answer(g.options.indexOf(g.question.result));
      window.__soTest.completionAnswer = {phase: g.phase, map: g.getMap(), sounds: window.__soTest.oscillators};
      return accepted;
    }), 'completion answer accepted');
    if (transitionTime) {
      eq(await h.phase(), 'correct');
      await h.state(g => {
        setLocalStorage(g.currentAppId + '_CurrentLevelProgress', {progress: 1, total: 1});
        window.__soTest.oscillators = 0;
      });
      await h.tick(900);
      await h.page.evaluate(() => window.__soTest.restoreTimeout());
      const commit = await h.page.evaluate(() => window.__soTest.commitAfter); ok(commit, 'transition boundary observed');
      eq(commit.before.map.targetZoneIndex, 0, 'staged counters do not commit map state');
      ok(commit.before.map.gates.every(g => !g.open && g.open01 === 0), 'gate never opened');
      eq(commit.after, commit.before, 'post-navigation APIs cannot mutate');
      ok(commit.results.every(r => r === false || r && r.ok === false && r.reason === 'navigated'), 'post-navigation calls rejected', commit.results);
      eq(commit.oscillators, 0, 'no gate chime');
    } else {
      const snapshot = await h.page.evaluate(() => window.__soTest.completionAnswer);
      ok(!['correct', 'roaming'].includes(snapshot.phase), 'answer-time completion never starts feedback/roaming');
      ok(snapshot.map.gates.every(g => !g.open && g.open01 === 0), 'no gate animation'); eq(snapshot.sounds, 0, 'no gate synth');
    }
    await h.until(() => h.page.evaluate(() => !document.querySelector('.so-game')), 'completion routes away');
    eq(new URL(h.page.url()).hash, '#/app/' + SLICE_IDS[0]);
    eq(await h.page.evaluate(() => window.__soTest.calls.length), before.calls.length + 1);
    const events = await h.page.evaluate(() => window.__soTest.mapEvents);
    ok(!events.live.some(s => /השער.*נפתח|האזור נוקה/.test(s)), 'no committed gate announcement');
    if (!transitionTime) ok(!events.phases.some(p => ['correct', 'roaming'].includes(p)), 'no completion transition');
  });
  for (const fraction of [null, .45, .55]) await withHarness('desktop', async h => {
    await h.enter(); await h.prepare('advancing'); await h.state(g => g.setRendering(false));
    if (fraction !== null) {
      await h.tick(3200 * fraction);
      const frozenPose = poseOf(await h.state(g => g.getPlayer()));
      await h.loss(); await restart(h); eq(await h.phase(), 'advancing');
      eq(poseOf(await h.state(g => g.getPlayer())), frozenPose, 'rebuild preserves simulation pose');
      eq(await h.state(g => !!g.getTransition().lapPoseApplied), fraction >= .5, 'lap pose applied only after midpoint');
      if (fraction >= .5) await atStart(h);
    }
    const counts = await h.counters(), token = await h.state(g => g.questionToken);
    // Freeze actual RAF callbacks (setRendering alone deliberately does not).
    await h.page.evaluate(() => {
      const p = window.__soTest, raf = requestAnimationFrame, cancel = cancelAnimationFrame;
      p.raf.forEach(id => cancel(id)); p.raf.clear();
      let id = -100000; window.requestAnimationFrame = () => --id;
      window.cancelAnimationFrame = n => { if (n >= 0) cancel(n); };
      p.unfreezeRaf = () => { window.requestAnimationFrame = raf; window.cancelAnimationFrame = cancel; };
    });
    try {
      ok(await h.state(g => g.skipTransition()), 'skip with RAF stopped'); await h.tick(1);
      eq(await h.phase(), 'engaging'); await atStart(h); eq(await h.counters(), counts); eq(await h.state(g => g.questionToken), token);
      eq(await h.state(g => g.skipTransition()), false); await h.tick(2000); await atStart(h);
      eq(await h.counters(), counts); eq(await h.state(g => g.getTransition()), null);
    } finally { await h.page.evaluate(() => window.__soTest.unfreezeRaf()); }
  });
});

async function main() {
  overallTimeout = setTimeout(() => {
    console.error(`FAIL timeout: exceeded ${TIMEOUT} s (active check ${activeCheck}: ${activeCheckName})`);
    process.exitCode = 1;
    // Initiate cleanup without letting a stuck close prevent the hard exit.
    try { if (browser) browser.close().catch(() => {}); } catch (_) { /* Best effort. */ }
    try { if (server) server.kill(); } catch (_) { /* Best effort. */ }
    process.exit(1);
  }, TIMEOUT * 1000);
  fs.mkdirSync(ARTIFACTS, {recursive: true});
  await ensureServer();
  try { browser = await chromium.launch({channel: 'chrome', headless: true}); }
  catch (error) {
    console.log('Chrome launch failed; trying Edge:', error.message);
    browser = await chromium.launch({channel: 'msedge', headless: true});
  }
  eq(registry.map(c => c.n), Array.from({length: 34}, (_, i) => i + 1), 'numbered registry is complete and ordered');
  for (const {n, name, fn} of registry) {
    if (ONLY && !ONLY.has(n)) { console.log(`SKIP ${n}: ${name} (--only)`); continue; }
    const previousErrors = diagnostics.errors.length;
    activeCheck = n; activeCheckName = name;
    const checkStarted = Date.now();
    console.log(`START ${n}: ${name}`);
    try {
      await fn();
      eq(diagnostics.errors.length, previousErrors, 'unexpected runtime errors in this check');
      passed++; console.log(`PASS ${n}: ${name} (${((Date.now() - checkStarted) / 1000).toFixed(1)}s)`);
    } catch (e) { failed++; console.error(`FAIL ${n}: ${name} (${((Date.now() - checkStarted) / 1000).toFixed(1)}s)\n${e.stack || e}`); }
  }
  if (!FULL) console.log('Slice scope: additional registrations/speech (check 1) and >=3-zone route (check 8) require --full. All 34 checks otherwise apply.');
  console.log('Visual review: compare base/dark captures to mockups; --full adds all-theme visual review. Manual phone FPS and service-worker-controlled offline reload remain §12.4 tasks.');
}
main().catch(e => { failed++; console.error('FAIL harness setup:', e.stack || e); }).finally(async () => {
  try { if (browser) await browser.close(); } catch (e) { failed++; console.error('Browser cleanup:', e.message); }
  if (server) server.kill();
  console.log('baseline errors:', diagnostics.baseline.length ? diagnostics.baseline.join('\n') : 'none');
  console.log('console errors for review:', diagnostics.review.length ? [...new Set(diagnostics.review)].join('\n') : 'none');
  if (diagnostics.errors.length) console.error('unexpected runtime errors:', diagnostics.errors.join('\n'));
  console.log(`Strike Ops: ${passed} passed, ${failed} failed; ${FULL ? 'full' : 'slice'}; ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (failed || diagnostics.errors.length) process.exitCode = 1;
  clearTimeout(overallTimeout);
});
