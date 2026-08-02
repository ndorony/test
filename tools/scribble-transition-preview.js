/* Shared preview shell. Adapters own their stage, timeline state, labels and capture payload. */
(function (global) {
  'use strict';

  function hexToRgb(hex) {
    const value = parseInt(hex.replace('#', ''), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function createTextureLoader(packs, palette) {
    const sprites = {};
    const textureCache = {};
    const ink = hexToRgb(palette.ink);
    const paper = hexToRgb(palette.paper);

    function duotone(source) {
      const output = document.createElement('canvas');
      output.width = source.naturalWidth;
      output.height = source.naturalHeight;
      const ctx = output.getContext('2d');
      ctx.drawImage(source, 0, 0);
      const frame = ctx.getImageData(0, 0, output.width, output.height);
      for (let i = 0; i < frame.data.length; i += 4) {
        if (!frame.data[i + 3]) continue;
        const light = (frame.data[i] * .299 + frame.data[i + 1] * .587 + frame.data[i + 2] * .114) / 255;
        frame.data[i] = ink[0] + (paper[0] - ink[0]) * light;
        frame.data[i + 1] = ink[1] + (paper[1] - ink[1]) * light;
        frame.data[i + 2] = ink[2] + (paper[2] - ink[2]) * light;
      }
      ctx.putImageData(frame, 0, 0);
      return output;
    }

    return {
      load: function () {
        return Promise.all(Object.keys(packs).map(function (name) {
          return new Promise(function (resolve) {
            const image = new Image();
            image.onload = function () { sprites[name] = image; resolve(); };
            image.onerror = resolve;
            image.src = packs[name] + name + '.png';
          });
        }));
      },
      textureFor: function (name) {
        if (!sprites[name]) return null;
        if (!textureCache[name]) textureCache[name] = duotone(sprites[name]);
        return textureCache[name];
      },
    };
  }

  function start(adapter) {
    const stageElement = document.getElementById('stage');
    const canvas = document.getElementById('bridge');
    const flash = document.getElementById('flash');
    const status = document.getElementById('status');
    const readout = document.getElementById('readout');
    const progressInput = document.getElementById('progress');
    const progressOut = document.getElementById('progressOut');
    const playButton = document.getElementById('play');
    const resetButton = document.getElementById('reset');
    const loopInput = document.getElementById('loop');
    const partLabelsToggle = document.getElementById('partLabelsToggle');
    const manual3dToggle = document.getElementById('manual3dToggle');
    const resetViewButton = document.getElementById('resetView');
    const partLabelsElement = document.getElementById('partLabels');
    const selectedPart = document.getElementById('selectedPart');
    const selectedPartName = document.getElementById('selectedPartName');
    const loader = createTextureLoader(adapter.packs, adapter.palette || {ink: '#2e3a55', paper: '#fdfdf9'});
    let bridge = null;
    let blueprint = null;
    let partLabels = [];
    let progress = 0;
    let playing = false;
    let lastTime = performance.now();
    let disposed = false;
    let inspectPointer = null;
    let frame = 0;
    const manualView = Object.assign({yaw: 0.7, pitch: 0.58, radius: 18}, adapter.manualView);

    function buildPartLabels() {
      partLabels = adapter.labels(blueprint).map(function (label) { return Object.assign({}, label); });
      partLabels.forEach(function (label) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'part-label';
        button.dataset.kind = label.kind;
        button.textContent = label.id;
        button.title = label.id + ': ' + label.name;
        button.setAttribute('aria-label', button.title);
        button.addEventListener('click', function () { selectPart(label, button); });
        label.element = button;
        partLabelsElement.appendChild(button);
      });
    }

    function selectPart(label, button) {
      partLabelsElement.querySelectorAll('.selected').forEach(function (element) { element.classList.remove('selected'); });
      button.classList.add('selected');
      selectedPart.textContent = label.id;
      selectedPartName.textContent = label.name;
    }

    function updatePartLabels(view, state) {
      partLabels.forEach(function (label) {
        const projected = bridge.project(label.position);
        const inTimeline = (label.minProgress == null || progress >= label.minProgress) &&
          (label.maxProgress == null || progress <= label.maxProgress);
        const onScreen = projected.visible && projected.x >= 17 && projected.x <= view.w - 17 &&
          projected.y >= 13 && projected.y <= view.h - 13;
        const unobstructed = onScreen && bridge.isPointVisible(label.position);
        const stillExists = !label.hiddenWhen || !label.hiddenWhen(state);
        label.element.hidden = !stillExists || !inTimeline || !onScreen || !unobstructed;
        if (!label.element.hidden) {
          label.element.style.left = projected.x + 'px';
          label.element.style.top = projected.y + 'px';
        }
      });
    }

    function resetManualView() {
      const defaults = Object.assign({yaw: 0.7, pitch: 0.58, radius: 18}, adapter.manualView);
      manualView.yaw = defaults.yaw;
      manualView.pitch = defaults.pitch;
      manualView.radius = defaults.radius;
    }

    function manualPoseFor(state) {
      const target = state.pose.target.slice();
      const horizontal = Math.cos(manualView.pitch) * manualView.radius;
      return {
        target: target,
        position: [target[0] + Math.sin(manualView.yaw) * horizontal,
          target[1] + Math.sin(manualView.pitch) * manualView.radius,
          target[2] + Math.cos(manualView.yaw) * horizontal],
        up: [0, 1, 0], unit: state.pose.unit, perspective: true, fov: 50,
      };
    }

    function onInspectPointerDown(event) {
      if (!manual3dToggle.checked || event.button !== 0 || event.target.closest('.part-label')) return;
      inspectPointer = {id: event.pointerId, x: event.clientX, y: event.clientY};
      stageElement.setPointerCapture(event.pointerId);
      stageElement.classList.add('dragging');
      event.preventDefault();
    }
    function onInspectPointerMove(event) {
      if (!inspectPointer || inspectPointer.id !== event.pointerId) return;
      const dx = event.clientX - inspectPointer.x;
      const dy = event.clientY - inspectPointer.y;
      inspectPointer.x = event.clientX;
      inspectPointer.y = event.clientY;
      manualView.yaw -= dx * 0.008;
      manualView.pitch = Math.max(0.08, Math.min(1.35, manualView.pitch + dy * 0.006));
      event.preventDefault();
    }
    function onInspectPointerUp(event) {
      if (!inspectPointer || inspectPointer.id !== event.pointerId) return;
      inspectPointer = null;
      stageElement.classList.remove('dragging');
      if (stageElement.hasPointerCapture(event.pointerId)) stageElement.releasePointerCapture(event.pointerId);
    }
    function onInspectWheel(event) {
      if (!manual3dToggle.checked) return;
      manualView.radius = Math.max(3, Math.min(48, manualView.radius * Math.exp(event.deltaY * 0.0015)));
      event.preventDefault();
    }

    function render(now) {
      if (disposed) return;
      const delta = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;
      if (playing) {
        progress += delta / adapter.duration;
        if (progress >= 1) { progress = loopInput.checked ? 0 : 1; if (!loopInput.checked) playing = false; }
        progressInput.value = String(progress);
      }
      if (bridge && blueprint) {
        const view = {w: Math.max(1, stageElement.clientWidth), h: Math.max(1, stageElement.clientHeight)};
        const state = adapter.state(progress, view, blueprint);
        bridge.resize(view, Math.min(window.devicePixelRatio || 1, 2));
        const activePose = manual3dToggle.checked ? manualPoseFor(state) : state.pose;
        bridge.setPose(activePose);
        adapter.apply(bridge, state, blueprint, {manual: manual3dToggle.checked, progress: progress});
        bridge.render();
        updatePartLabels(view, state);
        flash.style.opacity = String(state.flash || 0);
        status.textContent = state.phase;
        progressOut.textContent = Math.round(progress * 100) + '%';
        playButton.textContent = playing ? 'Pause' : 'Play';
        readout.textContent = adapter.readout(state, activePose, view, blueprint);
        const capture = adapter.capture(progress, state, activePose, view, blueprint);
        global[adapter.captureKey] = capture;
        if (!global.__scribbleCaptureReady) {
          global.__scribbleCaptureReady = true;
          document.body.dataset.captureReady = 'true';
          global.dispatchEvent(new CustomEvent('scribble-capture-ready', {detail: capture}));
        }
      }
      frame = requestAnimationFrame(render);
    }

    playButton.addEventListener('click', function () { playing = !playing; });
    resetButton.addEventListener('click', function () { playing = false; progress = 0; progressInput.value = '0'; });
    progressInput.addEventListener('input', function () { playing = false; progress = Number(progressInput.value); });
    partLabelsToggle.addEventListener('change', function () { document.body.classList.toggle('labels-off', !partLabelsToggle.checked); });
    manual3dToggle.addEventListener('change', function () {
      playing = false; resetManualView(); resetViewButton.disabled = !manual3dToggle.checked;
      stageElement.classList.toggle('inspecting', manual3dToggle.checked);
    });
    resetViewButton.addEventListener('click', resetManualView);
    stageElement.addEventListener('pointerdown', onInspectPointerDown);
    stageElement.addEventListener('pointermove', onInspectPointerMove);
    stageElement.addEventListener('pointerup', onInspectPointerUp);
    stageElement.addEventListener('pointercancel', onInspectPointerUp);
    stageElement.addEventListener('wheel', onInspectWheel, {passive: false});

    const hash = location.hash || '';
    const point = /(?:^|[#&])p=(\d+(?:\.\d+)?)/.exec(hash);
    if (point) { progress = Math.min(1, Math.max(0, Number(point[1]) / 100)); progressInput.value = String(progress); }
    const bare = /(?:^|[#&])bare/.test(hash);
    if (bare) document.body.classList.add('bare');
    if (bare && !/(?:^|[#&])labels/.test(hash)) { partLabelsToggle.checked = false; document.body.classList.add('labels-off'); }
    if (!point && !global.matchMedia('(prefers-reduced-motion: reduce)').matches) playing = true;

    function dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      stageElement.removeEventListener('pointerdown', onInspectPointerDown);
      stageElement.removeEventListener('pointermove', onInspectPointerMove);
      stageElement.removeEventListener('pointerup', onInspectPointerUp);
      stageElement.removeEventListener('pointercancel', onInspectPointerUp);
      stageElement.removeEventListener('wheel', onInspectWheel);
      if (bridge) bridge.dispose();
    }
    global.addEventListener('beforeunload', dispose, {once: true});

    loader.load().then(function () {
      if (disposed) return;
      bridge = createScribbleBridge({canvas: canvas, pitch: adapter.pitch || 64, textureFor: loader.textureFor});
      if (!bridge) { status.textContent = 'WebGL unavailable'; document.body.dataset.captureError = 'webgl-unavailable'; return; }
      blueprint = adapter.stage();
      bridge.setRoom(blueprint);
      buildPartLabels();
      frame = requestAnimationFrame(render);
    });
  }

  global.createScribbleTransitionPreview = start;
})(typeof globalThis !== 'undefined' ? globalThis : window);
