// Contract test for firebase.js cloud sync.
//
// The promise under test is economy: a change uploads that key and nothing
// else, opening the app downloads only what changed elsewhere, and nothing
// outside the app's own keys ever leaves the device. Alongside it, the two
// ways a sync loses progress: a stale cloud value overwriting a newer local
// one, and offline work never making it up.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const assert = require('assert');
const ROOT = path.join(__dirname, '..');

const SOURCE = fs.readFileSync(path.join(ROOT, 'firebase.js'), 'utf8');
const SERVER_TS = { serverTimestamp: true };

function timestamp(ms) {
    return { toMillis: () => ms };
}

// An in-memory Firestore holding documents by path, with a server clock that
// moves on every write and a ledger of every document read and written.
function makeCloud() {
    const docs = new Map();
    let clock = 1000;
    const ledger = { reads: [], writes: [] };

    function materialise(data) {
        const out = {};
        Object.keys(data).forEach(key => {
            out[key] = data[key] === SERVER_TS ? timestamp(++clock) : data[key];
        });
        return out;
    }

    function write(docPath, data, options) {
        const value = materialise(data);
        const merged = options && options.merge ? Object.assign({}, docs.get(docPath), value) : value;
        docs.set(docPath, merged);
        ledger.writes.push(docPath);
    }

    function snapshot(docPath) {
        const data = docs.get(docPath);
        return { exists: data !== undefined, data: () => Object.assign({}, data) };
    }

    function children(colPath) {
        const prefix = colPath + '/';
        return [...docs.keys()].filter(p => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'));
    }

    function query(colPath, after) {
        const hits = children(colPath).filter(p => {
            if (!after) return true;
            const at = docs.get(p).at;
            return at && at.toMillis() > after.toMillis();
        });
        hits.forEach(p => ledger.reads.push(p));
        const results = hits.map(p => ({ id: p.split('/').pop(), data: () => Object.assign({}, docs.get(p)) }));
        return Promise.resolve({ forEach: cb => results.forEach(cb), size: results.length });
    }

    function docRef(docPath) {
        return {
            path: docPath,
            collection: name => colRef(docPath + '/' + name),
            set: (data, options) => { write(docPath, data, options); return Promise.resolve(); },
            get: () => { ledger.reads.push(docPath); return Promise.resolve(snapshot(docPath)); },
        };
    }

    function colRef(colPath) {
        return {
            doc: id => docRef(colPath + '/' + id),
            get: () => query(colPath, null),
            where: (field, op, value) => {
                assert.strictEqual(field, 'at');
                assert.strictEqual(op, '>');
                return { get: () => query(colPath, value) };
            },
        };
    }

    const db = {
        collection: name => colRef(name),
        batch: () => {
            const ops = [];
            return {
                set: (ref, data) => ops.push([ref.path, data]),
                commit: () => { ops.forEach(([p, d]) => write(p, d)); return Promise.resolve(); },
            };
        },
    };
    return { db, docs, ledger, reset: () => { ledger.reads.length = 0; ledger.writes.length = 0; } };
}

function makeStorage(initial) {
    const map = new Map(Object.entries(initial || {}));
    return {
        get length() { return map.size; },
        key: i => [...map.keys()][i] ?? null,
        getItem: key => (map.has(key) ? map.get(key) : null),
        setItem: (key, value) => map.set(key, String(value)),
        removeItem: key => map.delete(key),
        _map: map,
    };
}

// One page load of the app on one device: a fresh script run over that
// device's storage, talking to the shared cloud.
function load(cloud, storage) {
    let authCallback = null;
    const timers = [];
    const firebase = {
        initializeApp: () => ({}),
        auth: () => ({
            onAuthStateChanged: cb => { authCallback = cb; },
            signInWithPopup: () => Promise.resolve({ user: null }),
            signOut: () => Promise.resolve(),
        }),
        firestore: Object.assign(() => cloud.db, {
            FieldValue: { serverTimestamp: () => SERVER_TS },
            Timestamp: { fromMillis: timestamp },
        }),
    };
    firebase.auth.GoogleAuthProvider = function() {};
    const ctx = {
        firebase,
        localStorage: storage,
        console: { log() {}, warn: console.warn },
        setTimeout: fn => { timers.push(fn); return timers.length; },
        window: { dispatchEvent() {} },
        CustomEvent: function(type, init) { this.type = type; this.detail = init && init.detail; },
    };
    vm.createContext(ctx);
    vm.runInContext(SOURCE, ctx);
    return {
        ctx,
        signIn: uid => authCallback({ uid, email: uid + '@example.com' }),
        change: (key, value) => {
            storage.setItem(key, value);
            ctx.firebaseSyncLocalStorageKey(key, value);
        },
        flushPushes: () => timers.splice(0).forEach(fn => fn()),
    };
}

async function settle() {
    for (let i = 0; i < 30; i++) await new Promise(resolve => setImmediate(resolve));
}

const KEY_A = 'grp-1_דנה_LocalData';
const KEY_B = 'practicing_grp-1_דנה_Weights_LocalData';
const keyDocs = cloud => [...cloud.docs.keys()].filter(p => p.includes('/keys/'));

const tests = [];
function test(name, fn) { tests.push([name, fn]); }

test('a change uploads that one key, once, however often it changed', async () => {
    const cloud = makeCloud();
    const storage = makeStorage({ [KEY_A]: '1', [KEY_B]: '[5,5]', unrelated: 'secret' });
    const page = load(cloud, storage);
    page.signIn('u1');
    await settle();
    cloud.reset();

    page.change(KEY_B, '[4,5]');
    page.change(KEY_B, '[3,5]');
    page.change(KEY_B, '[3,4]');
    page.flushPushes();
    await settle();

    assert.deepStrictEqual(
        cloud.ledger.writes.filter(p => p.includes('/keys/')).length, 1,
        'three changes to one key are one write');
    assert.strictEqual(cloud.docs.get(cloud.ledger.writes[0]).value, '[3,4]');
});

test('nothing but the app\'s own keys ever leaves the device', async () => {
    const cloud = makeCloud();
    const storage = makeStorage({ [KEY_A]: '1', unrelated: 'secret', learnbox_queue: '[]' });
    const page = load(cloud, storage);
    page.signIn('u1');
    await settle();
    page.change('unrelated', 'still secret');
    page.flushPushes();
    await settle();

    const uploaded = keyDocs(cloud).map(p => cloud.docs.get(p).key);
    assert.deepStrictEqual(uploaded, [KEY_A]);
});

test('opening the app again reads and writes nothing when nothing changed', async () => {
    const cloud = makeCloud();
    const storage = makeStorage({ [KEY_A]: '1', [KEY_B]: '[5]' });
    load(cloud, storage).signIn('u1');
    await settle();
    // The first reload reads back this device's own upload once.
    load(cloud, storage).signIn('u1');
    await settle();
    cloud.reset();

    load(cloud, storage).signIn('u1');
    await settle();

    assert.deepStrictEqual(cloud.ledger.reads, []);
    assert.deepStrictEqual(cloud.ledger.writes, []);
});

test('another device receives only what changed, and keeps its own unsent change', async () => {
    const cloud = makeCloud();
    const tablet = makeStorage({ [KEY_A]: '1', [KEY_B]: '[5,5]' });
    const phone = makeStorage();
    load(cloud, tablet).signIn('u1');
    await settle();
    load(cloud, phone).signIn('u1');
    await settle();
    assert.strictEqual(phone.getItem(KEY_B), '[5,5]');

    // The phone answers offline: a local change the cloud has not seen.
    const offline = load(cloud, phone);
    offline.change(KEY_A, '2');

    const tabletPage = load(cloud, tablet);
    tabletPage.signIn('u1');
    tabletPage.change(KEY_B, '[4,5]');
    tabletPage.flushPushes();
    await settle();
    cloud.reset();

    load(cloud, phone).signIn('u1');
    await settle();

    assert.strictEqual(phone.getItem(KEY_B), '[4,5]', 'the tablet\'s change arrived');
    assert.strictEqual(phone.getItem(KEY_A), '2', 'the offline change was not overwritten');
    const readKeys = cloud.ledger.reads.filter(p => p.includes('/keys/'));
    assert.ok(readKeys.every(p => p.endsWith(encodeURIComponent(KEY_B)) || p.endsWith(encodeURIComponent(KEY_A))),
        'only changed documents were read: ' + readKeys);
    assert.ok(cloud.ledger.writes.some(p => p.endsWith(encodeURIComponent(KEY_A))),
        'the offline change went up');
});

test('the first sign-in on a device takes the cloud\'s copy and uploads only what is new', async () => {
    const cloud = makeCloud();
    load(cloud, makeStorage({ [KEY_A]: 'from the cloud' })).signIn('u1');
    await settle();
    cloud.reset();

    const fresh = makeStorage({ [KEY_A]: 'never synced', [KEY_B]: 'only here' });
    load(cloud, fresh).signIn('u1');
    await settle();

    assert.strictEqual(fresh.getItem(KEY_A), 'from the cloud');
    const uploaded = cloud.ledger.writes.filter(p => p.includes('/keys/'));
    assert.deepStrictEqual(uploaded.map(p => decodeURIComponent(p.split('/').pop())), [KEY_B]);
});

test('data in the old chunk layout is brought across once, newest chunk last', async () => {
    const cloud = makeCloud();
    cloud.docs.set('users/u1', { chunkCount: 2 });
    cloud.docs.set('users/u1/data/chunk_1', { [KEY_A]: 'stale', unrelated: 'x' });
    cloud.docs.set('users/u1/data/chunk_0', { [KEY_A]: 'live', [KEY_B]: '[1]' });

    const device = makeStorage();
    load(cloud, device).signIn('u1');
    await settle();

    assert.strictEqual(device.getItem(KEY_A), 'live');
    assert.strictEqual(device.getItem(KEY_B), '[1]');
    assert.strictEqual(device.getItem('unrelated'), null);
    assert.strictEqual(cloud.docs.get('users/u1').layout, 2);
    assert.deepStrictEqual(keyDocs(cloud).length, 2);

    cloud.reset();
    load(cloud, makeStorage()).signIn('u1');
    await settle();
    assert.ok(!cloud.ledger.reads.some(p => p.includes('/data/')),
        'a second device reads the new layout, not the old chunks');
});

(async () => {
    let failed = 0;
    for (const [name, fn] of tests) {
        try {
            await fn();
            console.log('ok - ' + name);
        } catch (err) {
            failed++;
            console.log('not ok - ' + name);
            console.log(err.stack || err);
        }
    }
    process.exitCode = failed ? 1 : 0;
})();
