/* Falling-object side-to-top scenario for the shared Scribble transition preview. */
(function (global) {
  'use strict';

  const TOP_ASSET = '../assets/scribble-dungeons/';
  const SIDE_ASSET = '../assets/scribble-platformer/';
  const SHAFT_END_Y = -44;
  // The next stage is intentionally well below the brickwork. Leaving a
  // genuine drop here makes the shaft end read as an opening into space.
  const FLOOR_Y = SHAFT_END_Y - 16;
  const SHAFT_HALF = 1.5; // The live entry room omits exactly three ground tiles.
  const DESTINATION = {minX: -5, maxX: 5, minZ: -3, maxZ: 3};
  const IMPACT = .88;
  // The crate crosses the last brick course at this point. Keep following it
  // for one short beat after the exit, then let it fall away from the outlet.
  const SHAFT_EXIT_PROGRESS = IMPACT * (SHAFT_END_Y - 1.55) / (FLOOR_Y + .38 - 1.55);
  // Stop just below the shaft mouth, looking straight down. This keeps the
  // final beat spatially inside the transition rather than teleporting the
  // camera to an orthographic view above the entire next room.
  const CAMERA_LOCK = SHAFT_EXIT_PROGRESS + .065;
  const FINAL_CAMERA_Y = SHAFT_END_Y + .35;
  const CAMERA_LEAD = 2.2;

  // The arrival pawn is the dungeon's own token, so its skin name and pack path
  // mirror scribble-dungeon.js exactly. Defaults to red for the preview.
  function characterFor(color) {
    const key = color || 'red';
    const body = key + '_character';
    const hand = key + '_hand';
    const packs = {};
    packs[body] = TOP_ASSET;
    packs[hand] = TOP_ASSET;
    return {packs: packs, body: body, hand: hand};
  }

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function ease(value) { const p = clamp(value); return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function lerp(from, to, amount) { return from + (to - from) * amount; }
  function point(from, to, amount) { return from.map(function (value, index) { return lerp(value, to[index], amount); }); }

  function flat(planes, name, sprite, position, size, repeat, group, yaw) {
    planes.push({name: name, sprite: sprite, reading: 'top', position: position,
      // Canvas angles are clockwise; a floor plane's local Z rotation is
      // counterclockwise from above. Keep the game's compass convention.
      rotation: [-90, 0, -(yaw || 0)], size: size, repeat: repeat, group: group});
  }
  function upright(planes, name, sprite, position, size, repeat, group, yaw) {
    planes.push({name: name, sprite: sprite, reading: 'side', position: position,
      rotation: [0, yaw || 0, 0], size: size, repeat: repeat, group: group});
  }

  // A crate cube: a top, a bottom and the four sides, `size` units across.
  function crateCube(size) {
    const h = size / 2;
    return [
      {sprite: 'crate', reading: 'top', position: [0, h, 0], rotation: [-90, 0, 0], size: [size, size]},
      {sprite: 'crate', reading: 'top', position: [0, -h, 0], rotation: [90, 0, 0], size: [size, size]},
      {sprite: 'tile_crate', reading: 'side', position: [0, 0, h], rotation: [0, 0, 0], size: [size, size]},
      {sprite: 'tile_crate', reading: 'side', position: [0, 0, -h], rotation: [0, 180, 0], size: [size, size]},
      {sprite: 'tile_crate', reading: 'side', position: [-h, 0, 0], rotation: [0, -90, 0], size: [size, size]},
      {sprite: 'tile_crate', reading: 'side', position: [h, 0, 0], rotation: [0, 90, 0], size: [size, size]},
    ];
  }

  function fallStage(character, room, chosenX, standingX) {
    character = character || characterFor('red');
    const planes = [];
    const instances = [];
    const roomWidth = DESTINATION.maxX - DESTINATION.minX + 1;
    const roomDepth = DESTINATION.maxZ - DESTINATION.minZ + 1;
    if (room) {
      // The platformer's own fall room, column for column: its grass course
      // and soil either side of the gap, the deeper soil of the cliff edges,
      // and its answer crates as real crates. The room is centred on the
      // shaft, so a column's centre is its index less half the room.
      const half = (room.columns - 1) / 2;
      for (let c = 0; c < room.columns; c++) {
        if (c >= room.gap[0] && c <= room.gap[1]) continue;
        const x = c - half;
        upright(planes, 'side-ground-' + c, room.ground, [x, -.5, .4], [1, 1], [1, 1], 'side-shell', 0);
        upright(planes, 'side-soil-' + c, room.dirt, [x, -1.5, .4], [1, 1], [1, 1], 'side-soil', 0);
        if (c === room.gap[0] - 1 || c === room.gap[1] + 1) {
          upright(planes, 'side-cliff-' + c, room.dirt, [x, -2.5, .4], [1, 1], [1, 1], 'side-cliff', 0);
        }
      }
      // The crates still standing; the chosen one is the one that falls.
      const standing = standingX || room.crateColumns.map(function (c) { return c - half; });
      standing.forEach(function (x, index) {
        if (Math.abs(x - (chosenX || 0)) < .01) return;
        instances.push({name: 'side-crate-' + index, group: 'side-crates', position: [x, .5, 0], yaw: 0,
          planes: crateCube(1)});
      });
    } else {
      // The starting platform is two grass banks with a real gap between them.
      // Their undersides are open notebook paper: only the pit itself carries
      // stone walls, so no long brick facade hangs below the grass.
      upright(planes, 'side-ground-left', 'tile_grass', [-9.25, -.5, .4], [15.5, 1], [15.5, 1], 'side-shell', 0);
      upright(planes, 'side-ground-right', 'tile_grass', [9.25, -.5, .4], [15.5, 1], [15.5, 1], 'side-shell', 0);
    }

    // Four continuous walls turn the gap into an open-top shaft. The front
    // face is withheld until the camera is inside, then closes its view of the
    // exterior without adding a ceiling.
    // The shaft ends before the next game: the token has a visible six-unit
    // free fall after the brick walls stop, then reaches the flat 2D floor.
    upright(planes, 'shaft-west', 'tile_brick', [-SHAFT_HALF, SHAFT_END_Y / 2, 0], [3, -SHAFT_END_Y], [3, -SHAFT_END_Y], 'shaft-walls', 90);
    upright(planes, 'shaft-east', 'tile_brick', [SHAFT_HALF, SHAFT_END_Y / 2, 0], [3, -SHAFT_END_Y], [3, -SHAFT_END_Y], 'shaft-walls', -90);
    upright(planes, 'shaft-back', 'tile_brick', [0, SHAFT_END_Y / 2, -SHAFT_HALF], [3, -SHAFT_END_Y], [3, -SHAFT_END_Y], 'shaft-walls', 0);
    upright(planes, 'shaft-front', 'tile_brick', [0, SHAFT_END_Y / 2, SHAFT_HALF], [3, -SHAFT_END_Y], [3, -SHAFT_END_Y], 'shaft-front', 180);

    // This is the next game's 2D stage: a flat dungeon floor and wall ring.
    // The exact endpoint unit is derived from these bounds, making the ring
    // touch the viewport rather than leaving a detached room in empty paper.
    for (let z = DESTINATION.minZ; z <= DESTINATION.maxZ; z++) {
      flat(planes, 'dungeon-floor-' + z, 'tiles', [0, FLOOR_Y, z], [roomWidth, 1], [roomWidth, 1], 'dungeon-floor');
    }
    // Draw the ring one authored dungeon tile at a time, exactly as the game
    // does. Stretched wall sheets rotate incorrectly when viewed from above
    // and can look like a wall crossing the centre of the room.
    for (let x = DESTINATION.minX + 1; x < DESTINATION.maxX; x++) {
      if (x === 0) continue; // North and south answer doors replace wall tiles.
      flat(planes, 'dungeon-wall-north-' + x, 'floor_wall', [x, FLOOR_Y + .02, DESTINATION.minZ], [1, 1], [1, 1], 'dungeon-ring');
      flat(planes, 'dungeon-wall-south-' + x, 'floor_wall', [x, FLOOR_Y + .02, DESTINATION.maxZ], [1, 1], [1, 1], 'dungeon-ring', 180);
    }
    for (let z = DESTINATION.minZ + 1; z < DESTINATION.maxZ; z++) {
      if (z === 0) continue; // West entry and east answer door.
      flat(planes, 'dungeon-wall-west-' + z, 'floor_wall', [DESTINATION.minX, FLOOR_Y + .02, z], [1, 1], [1, 1], 'dungeon-ring', 270);
      flat(planes, 'dungeon-wall-east-' + z, 'floor_wall', [DESTINATION.maxX, FLOOR_Y + .02, z], [1, 1], [1, 1], 'dungeon-ring', 90);
    }
    [
      [DESTINATION.minX, DESTINATION.minZ, 0], [DESTINATION.maxX, DESTINATION.minZ, 90],
      [DESTINATION.minX, DESTINATION.maxZ, 270], [DESTINATION.maxX, DESTINATION.maxZ, 180],
    ].forEach(function (corner, index) {
      flat(planes, 'dungeon-corner-' + index, 'floor_wall_corner',
        [corner[0], FLOOR_Y + .04, corner[1]], [1, 1], [1, 1], 'dungeon-ring', corner[2]);
    });
    // These flat pieces make the endpoint read as a playable dungeon stage,
    // not an empty calibration floor. They stay entirely in the 2D reading.
    flat(planes, 'dungeon-entry-gate', 'floor_door_open', [DESTINATION.minX, FLOOR_Y + .05, 0], [1, 1], [1, 1], 'dungeon-props', 270);
    flat(planes, 'dungeon-exit-north', 'floor_door_closed', [0, FLOOR_Y + .05, DESTINATION.minZ], [1, 1], [1, 1], 'dungeon-props');
    flat(planes, 'dungeon-exit-east', 'floor_door_closed', [DESTINATION.maxX, FLOOR_Y + .05, 0], [1, 1], [1, 1], 'dungeon-props', 90);
    flat(planes, 'dungeon-exit-south', 'floor_door_closed', [0, FLOOR_Y + .05, DESTINATION.maxZ], [1, 1], [1, 1], 'dungeon-props', 180);
    flat(planes, 'dungeon-crate', 'floor_crate_small', [4.3, FLOOR_Y + .05, -2.2], [1, 1], [1, 1], 'dungeon-props');
    flat(planes, 'dungeon-barrel', 'floor_barrel', [3.3, FLOOR_Y + .05, 2.1], [1, 1], [1, 1], 'dungeon-props');
    flat(planes, 'dungeon-plants-a', 'floor_plants', [-3, FLOOR_Y + .05, 1.8], [1.2, 1.2], [1, 1], 'dungeon-props');
    flat(planes, 'dungeon-plants-b', 'floor_plants', [2.3, FLOOR_Y + .05, 1.8], [1.2, 1.2], [1, 1], 'dungeon-props');

    return {
      planes: planes,
      // The falling crate is the platformer's answer crate, a full tile
      // across, when the game reports its room.
      instances: instances.concat([{name: 'falling-stone', group: 'falling-object', position: [0, 1.55, 0], yaw: 0,
        planes: crateCube(room ? 1 : .72)}, {
        name: 'arrival-player', group: 'arrival-player', position: [0, -100, 0], yaw: 0,
        planes: [
          {sprite: character.body, reading: 'top', position: [0, .035, 0], rotation: [-90, 0, 0], size: [.85, .85]},
          {sprite: character.hand, reading: 'top', position: [.34, .045, 0], rotation: [-90, 0, 0], size: [.28, .28]},
        ]}].concat([
        [-1.25, -.85, -16], [1.15, -.65, 19], [-.55, 1.2, 47], [.7, 1.15, -38],
        [-1.45, .35, 74], [1.45, .42, -68],
      ].map(function (piece, index) {
        return {name: 'crate-plank-' + index, group: 'crate-debris', position: [0, -100, 0], yaw: piece[2],
          planes: [{sprite: 'planks', reading: 'top', position: [0, .035, 0], rotation: [-90, 0, 0], size: [.62, .62]}]};
      }))),
      fall: {floorY: FLOOR_Y, shaftEndY: SHAFT_END_Y, shaftHalf: SHAFT_HALF, destination: DESTINATION},
    };
  }

  function fallState(progress, view, blueprint, live) {
    const p = clamp(progress);
    const shaftDrop = clamp(p / IMPACT);
    const objectStartY = live && Number.isFinite(live.objectY) ? live.objectY : 1.55;
    const objectX = live && Number.isFinite(live.objectX) ? live.objectX : 0;
    const object = [objectX, lerp(objectStartY, FLOOR_Y + .38, shaftDrop), 0];
    // First move straight into the side-view opening. The camera looks at a
    // slice of shaft above the falling token, so the ledge walls close around
    // the frame before the viewpoint begins to turn down toward the token.
    const zoom = ease(p / .25);
    const turn = ease((p - .25) / .45);
    // Follow the crate at one steady pace through almost the whole shaft.
    // The short settle ends at the physical outlet, looking through the open
    // end instead of flattening the destination room in front of the lens.
    const settle = ease((p - (CAMERA_LOCK - .10)) / .10);
    // Match a playable platformer frame: the ground is in the lower third,
    // the falling object begins just above it, and roughly sixteen tiles span
    // the viewport rather than showing the whole stage from far away.
    const startTarget = live && live.target ? live.target : [0, 2.2, 0];
    const startUnit = live && live.unit ? live.unit : Math.max(64, Math.min(view.w / 16, view.h / 10));
    // Start almost orthographic at the exact 2D scale. A fixed camera distance
    // followed by a perspective switch enlarged the ledge on the second frame.
    const entryFov = lerp(2, 68, zoom);
    const entryDistance = view.h / (2 * startUnit * Math.tan(entryFov * Math.PI / 360));
    const sidePosition = [startTarget[0], startTarget[1], entryDistance + .4];
    const shaftAboveToken = [0, object[1] + 3.4, 0];
    const target = point(point(startTarget, shaftAboveToken, zoom), object, turn);
    // Keep the eye above the shaft slice while closing in. That makes the
    // opening move a downward look into the pit, never an upward tilt.
    const sideEntry = [lerp(sidePosition[0], 0, zoom), lerp(sidePosition[1], object[1] + 4.8, zoom),
      lerp(sidePosition[2], 1.15, zoom)];
    // Once the lens is inside the opening, it rises around the token while its
    // target drops from the upper shaft to the token itself. The down-facing
    // rotation therefore starts on entry instead of after a pass underneath.
    const topEntry = [0, object[1] + 3.4, 0];
    const position = point(sideEntry, topEntry, turn);
    const angle = lerp(0, Math.PI / 2, turn);
    const finalTarget = [0, FLOOR_Y, 0];
    const finalPosition = [0, FINAL_CAMERA_Y, 0];
    // Frame the destination using the receiving game's room padding and zoom
    // limits. Keep the eye at the shaft outlet; only the lens needs to settle.
    const dungeonConfig = global.SCRIBBLE_DUNGEON_CONFIG;
    const framing = dungeonConfig && dungeonConfig.camera || {padding: 3.2, minZoom: .14, maxZoom: 1};
    const pitch = dungeonConfig ? dungeonConfig.tile.pitch : 64;
    const topUnit = Math.max(pitch * framing.minZoom, Math.min(pitch * framing.maxZoom,
      view.w / (11 + framing.padding * 2), view.h / (7 + framing.padding * 2)));
    const finalFov = 2 * Math.atan(view.h / (2 * topUnit * (FINAL_CAMERA_Y - FLOOR_Y))) * 180 / Math.PI;
    const framedTarget = point(target, finalTarget, settle);
    const framedPosition = point(position, finalPosition, settle);
    // World Y decreases while falling. The eye stays above the crate until it
    // reaches the mouth; the remaining small lead is the outlet itself, not an
    // overtake. Afterwards the crate falls away through the empty gap.
    const exitLead = lerp(CAMERA_LEAD * zoom, .35, settle);
    const followPosition = [framedPosition[0], Math.max(framedPosition[1], object[1] + exitLead), framedPosition[2]];
    const framedUp = point([0, Math.cos(angle), -Math.sin(angle)], [0, 0, -1], settle);
    const framedFov = lerp(entryFov, finalFov, settle);
    let phase = 'side-2d-follow';
    if (p > 0) phase = 'pit-zoom';
    if (p >= .25) phase = 'shaft-entry-turn';
    if (p >= CAMERA_LOCK) phase = 'dungeon-2d';
    if (p >= IMPACT) phase = 'crate-impact';
    if (p >= .93) phase = 'character-entry';
    const topFrame = p >= CAMERA_LOCK;
    const impact = ease((p - IMPACT) / .06);
    const arrival = ease((p - .93) / .07);
    const debris = [
      [-1.25, -.85], [1.15, -.65], [-.55, 1.2], [.7, 1.15], [-1.45, .35], [1.45, .42],
    ].map(function (offset) {
      return {visible: p >= IMPACT, position: [objectX + offset[0] * impact, FLOOR_Y + .05, offset[1] * impact]};
    });
    const pose = {
      target: framedTarget, position: followPosition, up: framedUp,
      perspective: true,
      fov: framedFov,
      unit: startUnit,
    };
    return {
      phase: phase,
      flash: 0,
      // The destination is already framed when the crate lands. It remains
      // visible for the first beat of the collision, then its planks take
      // over without moving the camera again.
      object: {visible: p < IMPACT + .02, position: object},
      debris: debris,
      pose: topFrame ? {target: finalTarget, position: finalPosition, up: [0, 0, -1],
        perspective: true, fov: finalFov, unit: topUnit} : pose,
      topUnit: topUnit,
      // The first frame's camera: what the departure page must match.
      departure: {target: startTarget, unit: startUnit,
        distance: view.h / (2 * startUnit * Math.tan(Math.PI / 180)) + .4},
      timing: {dropStart: 0, zoomEnd: .25, rotateStart: .25, shaftExit: CAMERA_LOCK, impact: IMPACT, dungeonFrame: CAMERA_LOCK, topLock: CAMERA_LOCK, characterStart: .93},
      route: [[objectX, objectStartY, 0], [objectX, FLOOR_Y + .38, 0]],
      character: {visible: p >= .93, position: [lerp(DESTINATION.minX - .85, DESTINATION.minX + 1, arrival), FLOOR_Y + .05, 0]},
    };
  }

  global.createScribbleFallTransitionPreviewAdapter = function () {
    return {
      duration: 14,
      captureKey: '__fallTransitionPreviewState',
      packs: {tiles: TOP_ASSET, floor_wall: TOP_ASSET, floor_wall_corner: TOP_ASSET,
        floor_door_open: TOP_ASSET, floor_door_closed: TOP_ASSET, floor_crate_small: TOP_ASSET,
        floor_barrel: TOP_ASSET, floor_plants: TOP_ASSET, crate: TOP_ASSET, planks: TOP_ASSET,
        red_character: TOP_ASSET,
        red_hand: TOP_ASSET,
        tile_brick: SIDE_ASSET, tile_grass: SIDE_ASSET, tile_crate: SIDE_ASSET, tile: SIDE_ASSET},
      palette: {ink: '#2e3a55', paper: '#fdfdf9'},
      manualView: {yaw: .72, pitch: .72, radius: 25},
      character: function (color) { return characterFor(color); },
      stage: function (character, live) {
        return fallStage(character, live && live.fallRoom, live && Number.isFinite(live.objectX) ? live.objectX : 0,
          live && Array.isArray(live.standingX) ? live.standingX : null);
      },
      labels: function () {
        return [
          {id: 'S1', name: 'Side-view ledge and pit opening', kind: 'room', position: [-4, 0, .2], maxProgress: .34},
          {id: 'O1', name: 'Falling transition object', kind: 'route', position: [0, -22, 0]},
          {id: 'P1', name: 'Open-top shaft route', kind: 'route', position: [0, -22, 0]},
          {id: 'W1', name: 'Shaft containment walls', kind: 'wall', position: [-1.15, -22, 0]},
          {id: 'R1', name: '2D dungeon stage floor', kind: 'room', position: [5, FLOOR_Y + .08, 2], minProgress: CAMERA_LOCK},
          {id: 'D1', name: '2D dungeon wall ring', kind: 'wall', position: [0, FLOOR_Y + .1, DESTINATION.minZ], minProgress: CAMERA_LOCK},
          {id: 'A1', name: 'Arriving dungeon character', kind: 'route', position: [DESTINATION.minX + 1, FLOOR_Y + .08, 0], minProgress: .93},
        ];
      },
      state: fallState,
      apply: function (bridge, state, blueprint, context) {
        const ledge = context.manual || context.progress < .34;
        bridge.setGroupVisibility('side-shell', ledge);
        bridge.setGroupVisibility('side-soil', ledge);
        bridge.setGroupVisibility('side-cliff', ledge);
        bridge.setGroupVisibility('side-crates', ledge);
        bridge.setGroupOpacity('side-soil', .9);
        bridge.setGroupOpacity('side-cliff', .8);
        // The pawn stays standing on the ledge it answered from.
        if (context.pinned && typeof bridge.placeDecal === 'function') {
          bridge.placeDecal('pinned-layer', Object.assign({}, context.pinned, {visible: ledge}));
        }
        bridge.setGroupVisibility('shaft-walls', context.manual ||
          context.progress < CAMERA_LOCK + .06);
        // The fourth wall only appears after the camera has crossed the rim
        // and is looking directly at the falling object from inside the shaft.
        bridge.setGroupVisibility('shaft-front', context.manual ||
          (context.progress >= .28 && context.progress < CAMERA_LOCK + .06));
        // The entire destination already exists below the shaft. The solid
        // brick tunnel, rather than a timed reveal, is what keeps its walls
        // outside the view until the eye has reached the outlet.
        bridge.setGroupOpacity('shaft-walls', 1);
        bridge.setGroupOpacity('shaft-front', 1);
        bridge.setGroupVisibility('dungeon-floor', true);
        bridge.setGroupVisibility('dungeon-ring', true);
        bridge.setGroupVisibility('dungeon-props', true);
        bridge.setGroupOpacity('dungeon-ring', 1);
        bridge.setGroupOpacity('dungeon-props', 1);
        bridge.setObjectState('arrival-player', state.character);
        // The platformer's page stands just behind the shaft. It is enlarged by
        // its extra depth, so from the first camera it is that game's page
        // exactly; as the camera moves in, it stays behind like a real wall.
        if (context.departure && context.view && typeof bridge.placeDecal === 'function') {
          const from = state.departure;
          const depth = SHAFT_HALF + .1;
          const scale = (from.distance + depth) / from.distance;
          bridge.placeDecal('departure-paper', {visible: true, facing: [0, 0, 1],
            centre: [from.target[0], from.target[1], -depth],
            width: 3 * context.view.w / from.unit * scale, height: 3 * context.view.h / from.unit * scale});
        }
        // The dungeon's own notebook page lies just under the destination
        // floor, sized to its final framing, so the room sits on the page
        // whenever it is in view — not only once the dungeon takes over.
        if (context.page && context.view && typeof bridge.placeDecal === 'function') {
          bridge.placeDecal('landing-paper', {visible: true, flat: true,
            centre: [0, FLOOR_Y - .01, 0],
            width: 3 * context.view.w / state.topUnit, height: 3 * context.view.h / state.topUnit});
        }
        bridge.setObjectState('falling-stone', state.object);
        state.debris.forEach(function (piece, index) {
          bridge.setObjectState('crate-plank-' + index, piece);
        });
      },
      readout: function (state, pose, view) {
        return [
          'phase: ' + state.phase,
          'camera: [' + pose.position.map(function (value) { return value.toFixed(2); }).join(', ') + ']',
          'object: [' + state.object.position.map(function (value) { return value.toFixed(2); }).join(', ') + ']',
          'visible frustum: ' + (view.w / pose.unit).toFixed(2) + ' x ' + (view.h / pose.unit).toFixed(2) + ' units',
          'shaft: 3 x 3 x 44.0 units; target gap: ' + (SHAFT_END_Y - FLOOR_Y).toFixed(1) + ' units',
          'destination: 11 x 7 tiles',
        ].join('\n');
      },
      capture: function (progress, state, pose, view) {
        return {progress: progress, phase: state.phase, camera: pose.position.slice(),
          object: state.object.position.slice(), frustum: [view.w / pose.unit, view.h / pose.unit],
          route: state.route.map(function (item) { return item.slice(); }), duration: 14,
          shaft: [3, 3, 44], targetGap: SHAFT_END_Y - FLOOR_Y, destinationReady: progress >= state.timing.topLock,
          playerVisible: state.character.visible};
      },
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
