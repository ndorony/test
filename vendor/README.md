# vendor/ — third-party libraries served from the box

The learning app used to pull thirteen scripts and two stylesheets from public
CDNs. With the house uplink down the box, the LearnBox server and the downloaded
shorts were all fine and the app still would not start: `Vue` never defined, and
the children got a permanent "טוען...". These files are those dependencies,
copied into the repository so the app boots on a dead internet connection.

Every file is the **exact build the CDN URL resolved to** on 2026-09-14. Nothing
was upgraded while vendoring — an offline change and a version bump failing
together would be untangleable — so `vue@2` is frozen here at the 2.7.16 that
unpkg was serving, and the rest were already pinned in `index.html`.

| file | fetched from |
| --- | --- |
| `vue-2.7.16.js` | `https://unpkg.com/vue@2` → `unpkg.com/vue@2.7.16/dist/vue.js` |
| `vue-router-2.0.0.js` | `https://unpkg.com/vue-router@2.0.0/dist/vue-router.js` |
| `he-1.2.0.min.js` | `https://cdnjs.cloudflare.com/ajax/libs/he/1.2.0/he.min.js` |
| `materialize-1.0.0.min.js` | `https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/js/materialize.min.js` |
| `materialize-1.0.0.min.css` | `https://cdnjs.cloudflare.com/ajax/libs/materialize/1.0.0/css/materialize.min.css` |
| `three-0.128.0.min.js` | `https://unpkg.com/three@0.128.0/build/three.min.js` |
| `three-0.128.0-GLTFLoader.js` | `https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js` |
| `phaser-3.85.2.min.js` | `https://cdn.jsdelivr.net/npm/phaser@3.85.2/dist/phaser.min.js` |
| `lottie-5.12.2.min.js` | `https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js` |
| `tesseract-2.1.0.min.js` | `https://unpkg.com/tesseract.js@v2.1.0/dist/tesseract.min.js` |
| `firebase-9.23.0-*-compat.js` | `https://www.gstatic.com/firebasejs/9.23.0/…` |
| `material-icons.css`, `material-icons-v145.woff2` | `https://fonts.googleapis.com/icon?family=Material+Icons` and the woff2 it points at |

`vue.js` is the development build, with its warnings, because that is what
`https://unpkg.com/vue@2` served and what the app has always run. Swapping it
for `vue.min.js` is a real change in behaviour and belongs in its own commit.

All are MIT except the Material Icons font (Apache 2.0) and the Firebase SDK
(Apache 2.0). Licence headers are intact in each file; see `ASSET_LICENSES.md`.

## What is deliberately still remote

- **`googletagmanager.com/gtag/js`** — analytics, not a dependency. Vendoring a
  reporting beacon would be pointless: it has nothing to report to offline.
  `analytics.js` here defines the `gtag()` shim the app calls at five sites and
  appends the remote tag itself, so its absence is an ignored load error.
- **Firebase's network traffic** — the SDK is local so `firebase.js` can run,
  but Google sign-in and Firestore sync are cloud features and stay broken
  offline by nature. `firebase.js` already wraps init in try/catch.
- **Tesseract's worker, WASM core and language data** — `tesseract.min.js`
  fetches those from the CDN the first time OCR runs. Vendoring them is ~15 MB
  for the handwriting recogniser in one game; the script loads and the app boots
  either way.
- **Two of the five treasure-maze avatars** (`RobotExpressive.glb`, `Soldier.glb`
  on jsdelivr, referenced from `tester.js`). The other three are local, so the
  game is playable offline; those two entries simply fail to load, as they did
  before.

## Re-fetching

Do not edit these files. To refresh one, download the same pinned URL again,
keep the filename, and run `node tests/offline_assets_test.js`, which fails if
`index.html` grows a cross-origin `<script>`/`<link>` back or if the service
worker's precache manifest and the tree drift apart.
