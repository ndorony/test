// Firebase Cloud Sync Module
// Optional Google Sign-In to sync localStorage data across devices.
// A Google account is a sync container — one Google account can hold multiple local user profiles.
//
// What crosses the wire is only what changed:
//
// * Each synced localStorage key is its own Firestore document,
//   users/{uid}/keys/{key}. A change writes that one document and nothing
//   else, and a burst of changes (one answer touches two or three keys,
//   several answers in a row touch the same ones) goes up as one batch.
// * A pull asks only for documents written since this device's last pull
//   (by server time), so opening the app reads nothing when nothing changed
//   elsewhere.
// * Only the app's own keys are synced (`*_LocalData`, `users`, `*_voice`),
//   never the rest of the origin's localStorage.
//
// Conflicts: a key changed on this device and not yet uploaded ("dirty")
// keeps the local value; any other key takes the cloud's, which is by
// construction newer than this device's last pull. Dirty keys survive a
// reload, so progress made offline is uploaded rather than overwritten.

// ========================
// Firebase Configuration
// ========================
// Replace with your Firebase project config
const firebaseConfig = {
    apiKey: "AIzaSyCp1GhC3LBam94fMnaDkxC3QU3cc6AO_nA",
    authDomain: "test-a049e.firebaseapp.com",
    projectId: "test-a049e",
    storageBucket: "test-a049e.firebasestorage.app",
    messagingSenderId: "400462909267",
    appId: "1:400462909267:web:7e7f8b5f9e5a5fc8991ba6",
    measurementId: "G-J5JZK4L6CQ"
};

// Initialize Firebase
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let _firebaseReady = false;

try {
    firebaseApp = firebase.initializeApp(firebaseConfig);
    // No firebase.analytics() here: its SDK is not loaded, so the call threw
    // and took sign-in down with it. Analytics comes from gtag (vendor/analytics.js).
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    _firebaseReady = true;
    console.log('Firebase initialized successfully');
} catch (e) {
    console.warn('Firebase initialization failed:', e.message);
}

// ========================
// Auth State
// ========================
let _currentGoogleUser = null;

if (_firebaseReady) {
    firebaseAuth.onAuthStateChanged(function(user) {
        _currentGoogleUser = user;
        if (user) {
            console.log('Firebase: signed in as', user.email);
            // Pull cloud data on sign-in
            syncFromCloud().then(function() {
                console.log('Firebase: initial sync from cloud complete');
                // Dispatch event so UI can react
                window.dispatchEvent(new CustomEvent('firebase-auth-changed', { detail: { user: user } }));
            }).catch(function(err) {
                console.warn('Firebase: initial sync failed', err);
                window.dispatchEvent(new CustomEvent('firebase-auth-changed', { detail: { user: user } }));
            });
        } else {
            console.log('Firebase: signed out');
            window.dispatchEvent(new CustomEvent('firebase-auth-changed', { detail: { user: null } }));
        }
    });
}

// ========================
// Auth Functions
// ========================

function firebaseSignIn() {
    if (!_firebaseReady) {
        console.warn('Firebase not initialized');
        return Promise.reject(new Error('Firebase not initialized'));
    }
    var provider = new firebase.auth.GoogleAuthProvider();
    return firebaseAuth.signInWithPopup(provider).then(function(result) {
        _currentGoogleUser = result.user;
        return result.user;
    });
}

function firebaseSignOut() {
    if (!_firebaseReady) return Promise.resolve();
    return firebaseAuth.signOut().then(function() {
        _currentGoogleUser = null;
    });
}

function isFirebaseConnected() {
    return _firebaseReady && _currentGoogleUser !== null;
}

function getFirebaseUser() {
    return _currentGoogleUser;
}

// ========================
// What is synced
// ========================

const _SYNC_META_KEY = '__firebase_sync__';
const _PUSH_DELAY_MS = 1500;
// Firestore allows 500 writes per batch.
const _BATCH_LIMIT = 400;

function isSyncedKey(key) {
    return typeof key === 'string' &&
        (key.endsWith('_LocalData') || key === 'users' || key.endsWith('_voice'));
}

// A localStorage key as a Firestore document id: ids may not contain '/'
// and may not be '.' or '..'; encoding avoids both and stays reversible.
function _docIdForKey(key) {
    return encodeURIComponent(key).replace(/\./g, '%2E');
}

// This device's sync state: whose data it holds, how far it has pulled, and
// which keys changed here and still have to go up.
function _readMeta() {
    try {
        var meta = JSON.parse(localStorage.getItem(_SYNC_META_KEY) || '{}');
        return {
            uid: meta.uid || null,
            pulledAt: meta.pulledAt || 0,
            dirty: Array.isArray(meta.dirty) ? meta.dirty : [],
        };
    } catch (e) {
        return { uid: null, pulledAt: 0, dirty: [] };
    }
}

function _writeMeta(meta) {
    localStorage.setItem(_SYNC_META_KEY, JSON.stringify(meta));
}

function _markDirty(key) {
    var meta = _readMeta();
    if (meta.dirty.indexOf(key) === -1) {
        meta.dirty.push(key);
        _writeMeta(meta);
    }
}

// ========================
// Firestore Helpers
// ========================

function _getUserDocRef() {
    if (!isFirebaseConnected()) return null;
    return firebaseDb.collection('users').doc(_currentGoogleUser.uid);
}

function _keysRef() {
    var docRef = _getUserDocRef();
    return docRef ? docRef.collection('keys') : null;
}

function _serverMillis(timestamp) {
    if (!timestamp) return 0;
    if (typeof timestamp.toMillis === 'function') return timestamp.toMillis();
    return Number(timestamp) || 0;
}

// ========================
// Push: only what changed
// ========================

let _pushTimer = null;
let _pushing = null;

function _schedulePush() {
    if (_pushTimer !== null) return;
    _pushTimer = setTimeout(function() {
        _pushTimer = null;
        pushChanges();
    }, _PUSH_DELAY_MS);
}

// Upload every dirty key, one document each, in as few requests as possible.
// A key changed again while its upload is in flight stays dirty and goes up
// on the next round.
function pushChanges() {
    if (!isFirebaseConnected()) return Promise.resolve(0);
    if (_pushing) return _pushing;
    var keysRef = _keysRef();
    var meta = _readMeta();
    var keys = meta.dirty.filter(isSyncedKey);
    if (!keysRef || keys.length === 0) return Promise.resolve(0);

    var sent = {};
    var commits = [];
    for (var start = 0; start < keys.length; start += _BATCH_LIMIT) {
        var batch = firebaseDb.batch();
        keys.slice(start, start + _BATCH_LIMIT).forEach(function(key) {
            var value = localStorage.getItem(key);
            sent[key] = value;
            batch.set(keysRef.doc(_docIdForKey(key)), {
                key: key,
                value: value,
                deleted: value === null,
                at: firebase.firestore.FieldValue.serverTimestamp(),
            });
        });
        commits.push(batch.commit());
    }

    _pushing = Promise.all(commits).then(function() {
        var after = _readMeta();
        after.dirty = after.dirty.filter(function(key) {
            return !(key in sent) || localStorage.getItem(key) !== sent[key];
        });
        _writeMeta(after);
        return keys.length;
    }).catch(function(err) {
        console.warn('Firebase: push failed, will retry', err);
        return 0;
    }).then(function(count) {
        _pushing = null;
        return count;
    });
    return _pushing;
}

// ========================
// Pull: only what changed elsewhere
// ========================

let _pulling = null;

function pullChanges() {
    if (!isFirebaseConnected()) return Promise.resolve(0);
    if (_pulling) return _pulling;
    var keysRef = _keysRef();
    if (!keysRef) return Promise.resolve(0);

    var meta = _readMeta();
    var uid = _currentGoogleUser.uid;
    var firstTimeHere = meta.uid !== uid;
    if (firstTimeHere) {
        // Another account's data, or none: start over for this one, and
        // offer up everything this device already has that the cloud may not.
        meta = { uid: uid, pulledAt: 0, dirty: [] };
        for (var i = 0; i < localStorage.length; i++) {
            var localKey = localStorage.key(i);
            if (isSyncedKey(localKey)) meta.dirty.push(localKey);
        }
        _writeMeta(meta);
    }

    var query = meta.pulledAt > 0
        ? keysRef.where('at', '>', firebase.firestore.Timestamp.fromMillis(meta.pulledAt))
        : keysRef;

    _pulling = query.get().then(function(snapshot) {
        var current = _readMeta();
        var dirty = {};
        current.dirty.forEach(function(key) { dirty[key] = true; });
        var newest = current.pulledAt;
        var applied = 0;
        var inCloud = {};

        snapshot.forEach(function(doc) {
            var data = doc.data();
            inCloud[data.key] = true;
            newest = Math.max(newest, _serverMillis(data.at));
            if (!isSyncedKey(data.key)) return;
            // On a first pull every local key is "dirty" only because it has
            // never been compared; the cloud copy wins those. Afterwards, a
            // dirty key is a real local change and keeps its value.
            if (dirty[data.key] && !firstTimeHere) return;
            if (data.deleted) {
                localStorage.removeItem(data.key);
            } else {
                localStorage.setItem(data.key, data.value);
            }
            applied++;
        });

        if (firstTimeHere) {
            current.dirty = current.dirty.filter(function(key) { return !inCloud[key]; });
        }
        current.pulledAt = newest;
        _writeMeta(current);
        if (!firstTimeHere) return applied;
        return _importLegacy().then(function() { return applied; });
    }).then(function(applied) {
        _pulling = null;
        return applied;
    }, function(err) {
        _pulling = null;
        throw err;
    });
    return _pulling;
}

// Data written by the previous version lives in chunk documents. Read it
// once, the first time this account is seen on this device, and only for
// keys neither this device nor the new layout has; it then goes up as
// ordinary dirty keys. Oldest first, so the live chunk_0 has the last word.
function _importLegacy() {
    var docRef = _getUserDocRef();
    return docRef.get().then(function(metaDoc) {
        if (!metaDoc.exists || metaDoc.data().layout === 2) return null;
        var count = metaDoc.data().chunkCount || 1;
        var names = ['localStorage'];
        for (var c = count - 1; c >= 0; c--) names.push('chunk_' + c);
        return Promise.all(names.map(function(name) {
            return docRef.collection('data').doc(name).get();
        })).then(function(snaps) {
            var legacy = {};
            snaps.forEach(function(snap) {
                if (!snap.exists) return;
                var data = snap.data();
                Object.keys(data).forEach(function(key) { legacy[key] = data[key]; });
            });
            var after = _readMeta();
            Object.keys(legacy).forEach(function(key) {
                if (!isSyncedKey(key) || localStorage.getItem(key) !== null) return;
                localStorage.setItem(key, legacy[key]);
                after.dirty.push(key);
            });
            _writeMeta(after);
            return docRef.set({ layout: 2 }, { merge: true });
        });
    }).catch(function(err) {
        console.warn('Firebase: legacy import skipped', err);
    });
}

// ========================
// Public entry points
// ========================

// Pull what changed elsewhere, then push what changed here. Used on sign-in,
// on every load while signed in, and by the "sync now" button.
function syncFromCloud() {
    if (!isFirebaseConnected()) return Promise.resolve();
    var docRef = _getUserDocRef();
    return pullChanges().then(function(applied) {
        console.log('Firebase: pulled ' + applied + ' changed keys');
        return pushChanges();
    }).then(function(pushed) {
        // The account document is touched only when something went up, so a
        // load that changed nothing writes nothing.
        if (!pushed) return null;
        console.log('Firebase: pushed ' + pushed + ' changed keys');
        return docRef.set({
            email: _currentGoogleUser.email,
            layout: 2,
            lastSync: firebase.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }).catch(function(err) {
        console.warn('Firebase: sync failed', err);
    });
}

// Kept for callers of the old API: it now uploads only what changed.
function syncToCloud() {
    return pushChanges();
}

// Called from storage.js and tester.js after every local write.
function firebaseSyncLocalStorageKey(fullKey, value) {
    if (!isSyncedKey(fullKey)) return;
    _markDirty(fullKey);
    if (isFirebaseConnected()) _schedulePush();
}

function firebaseSyncKey(key, value) {
    firebaseSyncLocalStorageKey(key, value);
    return Promise.resolve();
}

function firebaseSyncUsers() {
    firebaseSyncLocalStorageKey('users', localStorage.getItem('users'));
}

function firebaseSyncVoice(lang, uri) {
    firebaseSyncLocalStorageKey(lang + '_voice', uri);
}
