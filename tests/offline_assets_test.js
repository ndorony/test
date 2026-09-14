// Guards the property feature #11 bought: the learning app must boot with the
// house uplink down. Two ways that regresses silently, both checked here.
//
// 1. Somebody adds a <script src="https://…"> back into index.html. It works on
//    the author's machine and the app is blank on a tablet the next morning.
// 2. A file named in the service worker manifest is deleted. cache.addAll() is
//    all-or-nothing, so one dead path used to cost the entire offline cache;
//    the worker now tolerates that, which means only a test can notice it.
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..');

const INDEX = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const WORKER = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

let failures = 0;
function test(name, fn) {
    try {
        fn();
        console.log('ok - ' + name);
    } catch (error) {
        failures += 1;
        console.error('not ok - ' + name + '\n    ' + error.message);
    }
}

// Analytics is the documented exception: it is appended from
// vendor/analytics.js at runtime, never parsed out of the markup, so its host
// never appears here either.
test('index.html loads no script or stylesheet from another origin', () => {
    const remote = [];
    const pattern = /<(script|link)\b[^>]*\b(?:src|href)=["'](https?:)?\/\/[^"']+["'][^>]*>/gi;
    let match;
    while ((match = pattern.exec(INDEX)) !== null) {
        remote.push(match[0]);
    }
    assert.deepStrictEqual(remote, [], 'remote assets in index.html:\n' + remote.join('\n'));
});

test('index.html carries no inline <script> block', () => {
    // An inline block is what stops the origin from adopting the portal's
    // script-src 'self' policy, which is the end state #11 is working toward.
    const inline = INDEX.match(/<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?<\/script>/gi) || [];
    assert.deepStrictEqual(inline, [], 'inline scripts:\n' + inline.join('\n'));
});

test('every library index.html needs is served from the box', () => {
    for (const global of ['vue-', 'vue-router-', 'he-', 'materialize-', 'three-',
        'phaser-', 'lottie-', 'tesseract-', 'firebase-']) {
        assert.ok(INDEX.indexOf('./vendor/' + global) !== -1,
            'index.html no longer loads ./vendor/' + global + '*');
    }
});

// The manifest is a flat list of quoted, root-relative paths. Query strings are
// cache-busting on the request, not part of the filename.
test('every path in the service worker manifest exists on disk', () => {
    // Only the declarations count: the fetch handler further down the file
    // matches on '/api/', which is a route prefix and not a file.
    const declarations = WORKER.slice(0, WORKER.indexOf('const urlsToCache'));
    const listed = new Set();
    const pattern = /'(\/[^']*)'/g;
    let match;
    while ((match = pattern.exec(declarations)) !== null) {
        listed.add(match[1].split('?')[0]);
    }
    // Template-built lists (`/sounds/letters/${letter}.mp3`) are not literals
    // and are covered by their own game tests; only the literals land here.
    const missing = [...listed]
        .filter(url => url !== '/' && url.indexOf('${') === -1)
        .filter(url => !fs.existsSync(path.join(ROOT, url.slice(1))));
    assert.deepStrictEqual(missing, [], 'precached but absent:\n' + missing.join('\n'));
});

test('the vendored libraries are all precached', () => {
    // README.md documents the directory; it is not something the app loads.
    const shipped = fs.readdirSync(path.join(ROOT, 'vendor'))
        .filter(file => file !== 'README.md');
    for (const file of shipped) {
        assert.ok(WORKER.indexOf("'/vendor/" + file + "'") !== -1,
            'vendor/' + file + ' is not in the service worker manifest');
    }
});

process.exit(failures === 0 ? 0 : 1);
