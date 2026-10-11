const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const bridgePreview = read('tools/scribble-bridge-preview.html');
const magicDoorPreview = read('tools/scribble-magic-door-preview.html');
const fallPreview = read('tools/scribble-fall-transition-preview.html');
const sharedTransitionPreview = read('tools/scribble-transition-preview.js');
const magicDoorAdapter = read('tools/scribble-magic-door-transition-adapter.js');
const fallAdapter = read('tools/scribble-fall-transition-adapter.js');
const transitionScript = read('tools/capture-scribble-transition.ps1');
const commonScript = read('tools/scribble-capture-common.ps1');
const transitionLauncher = read('tools/capture-scribble-transition.cmd');
const worker = read('service-worker.js');
const bridgeSource = read('games/scribble-bridge.js');

function inlineScripts(html) {
    return Array.from(html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi))
        .map(match => match[1])
        .filter(source => source.trim());
}

inlineScripts(bridgePreview).concat(inlineScripts(magicDoorPreview), inlineScripts(fallPreview),
    [sharedTransitionPreview, magicDoorAdapter, fallAdapter]).forEach(source => {
    new vm.Script(source);
});

assert.ok(bridgePreview.includes("dataset.captureReady = 'true'"));
assert.ok(bridgePreview.includes("detail: {type: 'bridge', progress: blend, zoom: zoom}"));
assert.ok(magicDoorPreview.includes('scribble-magic-door-transition-adapter.js'));
assert.ok(magicDoorPreview.includes('createScribbleMagicDoorPreviewAdapter'));
assert.ok(magicDoorAdapter.includes('scribbleMagicDoorTransitionStage'));
assert.ok(magicDoorAdapter.includes("bridge.setGroupVisibility('chamber-floor', !liveRoom)"));
assert.ok(magicDoorAdapter.includes("bridge.setGroupVisibility('tunnel-floor', staged3d || !liveCanvas"));
assert.ok(magicDoorAdapter.includes("bridge.setGroupVisibility('tunnel-wall-tops', staged3d || !liveCanvas"));
assert.ok(magicDoorAdapter.includes('context.manual || context.progress >= state.timing.turnStart'));
assert.ok(magicDoorAdapter.includes("bridge.setGroupVisibility('selected-door', !liveRoom && !state.doorBurst.broken)"));
assert.ok(magicDoorAdapter.includes("bridge.setGroupVisibility('selected-door-base', !liveRoom && !state.doorBurst.broken)"));
assert.ok(magicDoorAdapter.includes("bridge.setGroupVisibility('selected-door-open', !liveRoom && state.doorBurst.broken)"));
assert.ok(magicDoorAdapter.includes('bridge.setDoorBurst(state.doorBurst)'));
assert.ok(magicDoorAdapter.includes('bridge.setWallBurst(state.wallBurst)'));
assert.ok(magicDoorAdapter.includes('destinationReady: true'));
assert.ok(magicDoorAdapter.includes('duration: 20'));
assert.ok(sharedTransitionPreview.includes('progress += delta / adapter.duration'));
assert.ok(magicDoorAdapter.includes('route: magic.route'));
assert.ok(magicDoorAdapter.includes('playerVisible: state.character.visible'));
assert.ok(magicDoorAdapter.includes("{id: 'R1', name: 'Original room floor'"));
assert.ok(!magicDoorAdapter.includes("{id: 'R2'"));
assert.ok(!magicDoorAdapter.includes("{id: 'R3'"));
assert.ok(!magicDoorAdapter.includes("{id: 'R4'"));
assert.ok(magicDoorAdapter.includes("{id: 'D1', name: 'Left magic door'"));
assert.ok(magicDoorAdapter.includes("{id: 'N1', name: 'Next room entry floor'"));
assert.ok(magicDoorAdapter.includes("{id: 'A1', name: 'Arrow top surfaces'"));
assert.ok(magicDoorAdapter.includes("{id: 'B1', name: '3D brick wall faces'"));
assert.ok(magicDoorAdapter.includes("{id: 'X1', name: 'Final impact wall'"));
assert.ok(sharedTransitionPreview.includes('bridge.project(label.position)'));
assert.ok(sharedTransitionPreview.includes('bridge.isPointVisible(label.position)'));
assert.ok(sharedTransitionPreview.includes("bare && !/(?:^|[#&])labels/.test(hash)"));
assert.ok(sharedTransitionPreview.includes('manual3dToggle.checked ? manualPoseFor(state) : state.pose'));
assert.ok(sharedTransitionPreview.includes("stageElement.addEventListener('pointermove', onInspectPointerMove)"));
assert.ok(sharedTransitionPreview.includes("stageElement.addEventListener('wheel', onInspectWheel, {passive: false})"));
assert.ok(sharedTransitionPreview.includes("stageElement.removeEventListener('pointermove', onInspectPointerMove)"));
assert.ok(sharedTransitionPreview.includes("global.addEventListener('beforeunload', dispose"));
assert.ok(sharedTransitionPreview.includes('if (bridge) bridge.dispose()'));
assert.ok(fallPreview.includes('createScribbleFallTransitionPreviewAdapter'));
assert.ok(fallAdapter.includes("name: 'falling-stone'"));
assert.ok(fallAdapter.includes('playerVisible: state.character.visible'));
assert.ok(fallAdapter.includes("'shaft-walls'"));
assert.ok(bridgeSource.includes('new global.THREE.PerspectiveCamera'));
assert.ok(bridgeSource.includes('this.activeCamera = camera'));
assert.ok(bridgeSource.includes('this.labelRaycaster.intersectObject(this.roomRoot, true)'));
assert.ok(bridgeSource.includes('this.effectRoot.children.length'));
assert.ok(transitionScript.includes("scribble-magic-door-preview.html#bare&p=$urlValue"));
assert.ok(transitionScript.includes('[ValidateRange(0, 100)][double[]]$Progress'));
assert.ok(!transitionScript.includes('$Zoom'));
assert.ok(commonScript.includes("'--headless=new'"));
assert.ok(commonScript.includes('Start-Process -FilePath $BrowserPath -ArgumentList $arguments'));
assert.ok(commonScript.includes('Test-ScribbleCaptureImage -Path $absoluteOutput'));
assert.ok(commonScript.includes('Refusing to remove capture profile outside the temp directory'));
assert.ok(transitionLauncher.includes('-ExecutionPolicy Bypass'));
assert.ok(transitionLauncher.includes('capture-scribble-transition.ps1'));
assert.ok(worker.includes("'/tools/scribble-bridge-preview.html'"));
assert.ok(worker.includes("'/tools/scribble-magic-door-preview.html'"));
const cacheVersion = /my-app-cache-v(\d+)/.exec(worker);
assert.ok(cacheVersion && Number(cacheVersion[1]) >= 95);
// The worker caches the bridge at the version the app loads.
const page = read('index.html');
const bridgeVersion = /scribble-bridge\.js\?v=(\d+)/.exec(page);
assert.ok(bridgeVersion && worker.includes("'/games/scribble-bridge.js?v=" + bridgeVersion[1] + "'"));

console.log('scribble_capture_tools_test: all checks passed');
