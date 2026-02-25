// Firebase Cloud Sync Module
// Optional Google Sign-In to sync localStorage data across devices.
// A Google account is a sync container — one Google account can hold multiple local user profiles.

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
// Firestore Helpers
// ========================

function _getUserDocRef() {
    if (!isFirebaseConnected()) return null;
    return firebaseDb.collection('users').doc(_currentGoogleUser.uid);
}

// ========================
// Sync: Push to Cloud
// ========================

// Push a single localStorage key-value pair to Firestore
function firebaseSyncKey(key, value) {
    if (!isFirebaseConnected()) return Promise.resolve();
    var docRef = _getUserDocRef();
    if (!docRef) return Promise.resolve();

    var updateData = {};
    updateData[key] = value;
    return docRef.collection('data').doc('localStorage').set(updateData, { merge: true })
        .catch(function(err) {
            console.warn('Firebase: failed to sync key', key, err);
        });
}

// Push all localStorage to Firestore
function syncToCloud() {
    if (!isFirebaseConnected()) return Promise.resolve();
    var docRef = _getUserDocRef();
    if (!docRef) return Promise.resolve();

    // Gather all localStorage data
    var allData = {};
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        allData[key] = localStorage.getItem(key);
    }

    // Firestore documents have a 1MB limit; split into chunks if needed
    // For most apps this will be well within limits
    var keys = Object.keys(allData);
    var chunkSize = 200; // max fields per Firestore set with merge
    var promises = [];

    for (var c = 0; c < keys.length; c += chunkSize) {
        var chunk = {};
        var chunkKeys = keys.slice(c, c + chunkSize);
        for (var j = 0; j < chunkKeys.length; j++) {
            chunk[chunkKeys[j]] = allData[chunkKeys[j]];
        }
        promises.push(
            docRef.collection('data').doc('chunk_' + Math.floor(c / chunkSize))
                .set(chunk, { merge: true })
        );
    }

    // Also save the chunk count for retrieval
    promises.push(
        docRef.set({
            chunkCount: Math.ceil(keys.length / chunkSize),
            lastSync: firebase.firestore.FieldValue.serverTimestamp(),
            email: _currentGoogleUser.email
        }, { merge: true })
    );

    return Promise.all(promises).then(function() {
        console.log('Firebase: synced all localStorage to cloud (' + keys.length + ' keys)');
    }).catch(function(err) {
        console.warn('Firebase: syncToCloud failed', err);
    });
}

// ========================
// Sync: Pull from Cloud
// ========================

// Pull all data from Firestore into localStorage (cloud wins on conflicts)
function syncFromCloud() {
    if (!isFirebaseConnected()) return Promise.resolve();
    var docRef = _getUserDocRef();
    if (!docRef) return Promise.resolve();

    // First get the metadata to know how many chunks
    return docRef.get().then(function(metaDoc) {
        if (!metaDoc.exists) {
            console.log('Firebase: no cloud data found, pushing local data');
            return syncToCloud();
        }

        var meta = metaDoc.data();
        var chunkCount = meta.chunkCount || 1;
        var chunkPromises = [];

        for (var i = 0; i < chunkCount; i++) {
            chunkPromises.push(
                docRef.collection('data').doc('chunk_' + i).get()
            );
        }

        // Also check legacy single-doc format
        chunkPromises.push(
            docRef.collection('data').doc('localStorage').get()
        );

        return Promise.all(chunkPromises).then(function(snapshots) {
            var keysImported = 0;

            snapshots.forEach(function(snap) {
                if (!snap.exists) return;
                var cloudData = snap.data();
                Object.keys(cloudData).forEach(function(key) {
                    localStorage.setItem(key, cloudData[key]);
                    keysImported++;
                });
            });

            console.log('Firebase: imported ' + keysImported + ' keys from cloud');

            // After pulling, push back to ensure cloud has any new local keys
            return syncToCloud();
        });
    }).catch(function(err) {
        console.warn('Firebase: syncFromCloud failed', err);
    });
}

// ========================
// Auto-sync Wrappers
// ========================
// These are called from storage.js after local writes

function firebaseSyncLocalStorageKey(fullKey, value) {
    if (!isFirebaseConnected()) return;
    // Determine which chunk this key would be in — for simplicity,
    // use the single-key approach which merges into the appropriate chunk.
    // We use a dedicated "live" doc for real-time key syncs
    var docRef = _getUserDocRef();
    if (!docRef) return;

    var updateData = {};
    updateData[fullKey] = value;
    docRef.collection('data').doc('chunk_0').set(updateData, { merge: true })
        .catch(function(err) {
            console.warn('Firebase: auto-sync failed for key', fullKey, err);
        });
}

function firebaseSyncUsers() {
    if (!isFirebaseConnected()) return;
    var users = localStorage.getItem('users');
    if (users) {
        firebaseSyncLocalStorageKey('users', users);
    }
}

function firebaseSyncVoice(lang, uri) {
    if (!isFirebaseConnected()) return;
    firebaseSyncLocalStorageKey(lang + '_voice', uri);
}
