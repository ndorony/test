/* Falling-object side-to-top scenario for the shared Scribble transition preview. */
(function (global) {
  'use strict';

  const TOP_ASSET = '../assets/scribble-dungeons/';
  const SIDE_ASSET = '../assets/scribble-platformer/';
  const SHAFT_END_Y = -44;
  const FLOOR_Y = SHAFT_END_Y - 6;
  const SHAFT_HALF = 1.25;
  const DESTINATION = {minX: -5, maxX: 5, minZ: -3, maxZ: 3};
  // Stop just below the shaft mouth, looking straight down. This keeps the
  // final beat spatially inside the transition rather than teleporting the
  // camera to an orthographic view above the entire next room.
  const CAMERA_LOCK = .84;
  const IMPACT = .88;
  const FINAL_CAMERA_Y = SHAFT_END_Y - 1;
  const CAMERA_LEAD = 2.2;

  function clamp(value) { return Math.max(0, Math.min(1, value)); }
  function ease(value) { const p = clamp(value); return p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
  function lerp(from, to, amount) { return from + (to - from) * amount; }
  function point(from, to, amount) { return from.map(function (value, index) { return lerp(value, to[index], amount); }); }

  function flat(planes, name, sprite, position, size, repeat, group, yaw) {
    planes.push({name: name, sprite: sprite, reading: 'top', position: position,
      rotation: [-90, 0, yaw || 0], size: size, repeat: repeat, group: group});
  }
  function upright(planes, name, sprite, position, size, repeat, group, yaw) {
    planes.push({name: name, sprite: sprite, reading: 'side', position: position,
      rotation: [0, yaw || 0, 0], size: size, repeat: repeat, group: group});
  }

  function fallStage() {
    const planes = [];
    const roomWidth = DESTINATION.maxX - DESTINATION.minX + 1;
    const roomDepth = DESTINATION.maxZ - DESTINATION.minZ + 1;
    // The starting platform is two solid banks with a real gap between them.
    // Each brick face begins exactly at the underside of its grass tile and
    // continues down beside the shaft. There is deliberately no full-width
    // brick backdrop behind the opening.
    upright(planes, 'side-bricks-left', 'tile_brick', [-9.125, (SHAFT_END_Y - 1) / 2, .38], [15.75, 1 - SHAFT_END_Y], [16, 1 - SHAFT_END_Y], 'side-shell', 0);
    upright(planes, 'side-bricks-right', 'tile_brick', [9.125, (SHAFT_END_Y - 1) / 2, .38], [15.75, 1 - SHAFT_END_Y], [16, 1 - SHAFT_END_Y], 'side-shell', 0);
    upright(planes, 'side-ground-left', 'tile_grass', [-9.125, -.5, .4], [15.75, 1], [16, 1], 'side-shell', 0);
    upright(planes, 'side-ground-right', 'tile_grass', [9.125, -.5, .4], [15.75, 1], [16, 1], 'side-shell', 0);

    // Four continuous walls turn the gap into an open-top shaft. The front
    // face is withheld until the camera is inside, then closes its view of the
    // exterior without adding a ceiling.
    // The shaft ends before the next game: the token has a visible six-unit
    // free fall after the brick walls stop, then reaches the flat 2D floor.
    upright(planes, 'shaft-west', 'tile_brick', [-SHAFT_HALF, SHAFT_END_Y / 2, 0], [2.5, -SHAFT_END_Y], [3, -SHAFT_END_Y], 'shaft-walls', -90);
    upright(planes, 'shaft-east', 'tile_brick', [SHAFT_HALF, SHAFT_END_Y / 2, 0], [2.5, -SHAFT_END_Y], [3, -SHAFT_END_Y], 'shaft-walls', 90);
    upright(planes, 'shaft-back', 'tile_brick', [0, SHAFT_END_Y / 2, -SHAFT_HALF], [2.5, -SHAFT_END_Y], [3, -SHAFT_END_Y], 'shaft-walls', 180);
    upright(planes, 'shaft-front', 'tile_brick', [0, SHAFT_END_Y / 2, SHAFT_HALF], [2.5, -SHAFT_END_Y], [3, -SHAFT_END_Y], 'shaft-front', 0);

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
      flat(planes, 'dungeon-wall-north-' + x, 'floor_wall', [x, FLOOR_Y + .02, DESTINATION.minZ], [1, 1], [1, 1], 'dungeon-ring');
      flat(planes, 'dungeon-wall-south-' + x, 'floor_wall', [x, FLOOR_Y + .02, DESTINATION.maxZ], [1, 1], [1, 1], 'dungeon-ring', 180);
    }
    for (let z = DESTINATION.minZ + 1; z < DESTINATION.maxZ; z++) {
      flat(planes, 'dungeon-wall-west-' + z, 'floor_wall', [DESTINATION.minX, FLOOR_Y + .02, z], [1, 1], [1, 1], 'dungeon-ring', 270);
      flat(planes, 'dungeon-wall-east-' + z, 'floor_wall', [DESTINATION.maxX, FLOOR_Y + .02, z], [1, 1], [1, 1], 'dungeon-ring', 90);
    }
    [
      [DESTINATION.minX, DESTINATION.minZ, 0], [DESTINATION.maxX, DESTINATION.minZ, -90],
      [DESTINATION.minX, DESTINATION.maxZ, 90], [DESTINATION.maxX, DESTINATION.maxZ, 180],
    ].forEach(function (corner, index) {
      flat(planes, 'dungeon-corner-' + index, 'floor_wall_corner',
        [corner[0], FLOOR_Y + .04, corner[1]], [1, 1], [1, 1], 'dungeon-ring', corner[2]);
    });
    // These flat pieces make the endpoint read as a playable dungeon stage,
    // not an empty calibration floor. They stay entirely in the 2D reading.
    flat(planes, 'dungeon-entry-gate', 'floor_door_open', [DESTINATION.minX, FLOOR_Y + .05, 0], [1, 1], [1, 1], 'dungeon-props', 90);
    flat(planes, 'dungeon-exit-gate', 'floor_door_closed', [4, FLOOR_Y + .05, DESTINATION.minZ], [1, 1], [1, 1], 'dungeon-props');
    flat(planes, 'dungeon-crate', 'floor_crate_small', [4.3, FLOOR_Y + .05, -2.2], [1, 1], [1, 1], 'dungeon-props');
    flat(planes, 'dungeon-barrel', 'floor_barrel', [3.3, FLOOR_Y + .05, 2.1], [1, 1], [1, 1], 'dungeon-props');
    flat(planes, 'dungeon-plants-a', 'floor_plants', [-3, FLOOR_Y + .05, 1.8], [1.2, 1.2], [1, 1], 'dungeon-props');
    flat(planes, 'dungeon-plants-b', 'floor_plants', [2.3, FLOOR_Y + .05, 1.8], [1.2, 1.2], [1, 1], 'dungeon-props');

    return {
      planes: planes,
      instances: [{name: 'falling-stone', group: 'falling-object', position: [0, 1.55, 0], yaw: 0,
        planes: [
          // A complete crate cube: a top, a bottom and the four visible sides.
          {sprite: 'crate', reading: 'top', position: [0, .36, 0], rotation: [-90, 0, 0], size: [.72, .72]},
          {sprite: 'crate', reading: 'top', position: [0, -.36, 0], rotation: [90, 0, 0], size: [.72, .72]},
          {sprite: 'tile_crate', reading: 'side', position: [0, 0, .36], rotation: [0, 0, 0], size: [.72, .72]},
          {sprite: 'tile_crate', reading: 'side', position: [0, 0, -.36], rotation: [0, 180, 0], size: [.72, .72]},
          {sprite: 'tile_crate', reading: 'side', position: [-.36, 0, 0], rotation: [0, -90, 0], size: [.72, .72]},
          {sprite: 'tile_crate', reading: 'side', position: [.36, 0, 0], rotation: [0, 90, 0], size: [.72, .72]},
        ]}, {
        name: 'arrival-player', group: 'arrival-player', position: [0, -100, 0], yaw: 0,
        planes: [
          {sprite: 'red_character', reading: 'top', position: [0, .035, 0], rotation: [-90, 0, 0], size: [.85, .85]},
          {sprite: 'red_hand', reading: 'top', position: [.34, .045, 0], rotation: [-90, 0, 0], size: [.28, .28]},
        ]}].concat([
        [-1.25, -.85, -16], [1.15, -.65, 19], [-.55, 1.2, 47], [.7, 1.15, -38],
        [-1.45, .35, 74], [1.45, .42, -68],
      ].map(function (piece, index) {
        return {name: 'crate-plank-' + index, group: 'crate-debris', position: [0, -100, 0], yaw: piece[2],
          planes: [{sprite: 'planks', reading: 'top', position: [0, .035, 0], rotation: [-90, 0, 0], size: [.62, .62]}]};
      })),
      fall: {floorY: FLOOR_Y, shaftEndY: SHAFT_END_Y, shaftHalf: SHAFT_HALF, destination: DESTINATION},
    };
  }

  function fallState(progress, view) {
    const p = clamp(progress);
    const shaftDrop = clamp(p / IMPACT);
    const object = [0, lerp(1.55, FLOOR_Y + .38, shaftDrop), 0];
    // First move straight into the side-view opening. The camera looks at a
    // slice of shaft above the falling token, so the ledge walls close around
    // the frame before the viewpoint begins to turn down toward the token.
    const zoom = ease(p / .25);
    const turn = ease((p - .25) / .45);
    // Follow the crate at one steady pace through almost the whole shaft.
    // The only settling happens at the physical outlet, where the lens clears
    // the last brick course and can finally see the destination floor.
    const settle = ease((p - .74) / (CAMERA_LOCK - .74));
    // Match a playable platformer frame: the ground is in the lower third,
    // the falling object begins just above it, and roughly sixteen tiles span
    // the viewport rather than showing the whole stage from far away.
    const startTarget = [0, 2.2, 0];
    const startUnit = Math.max(64, Math.min(view.w / 16, view.h / 10));
    const sidePosition = [0, 2.2, 24];
    const shaftAboveToken = [0, object[1] + 3.4, 0];
    const target = point(point(startTarget, shaftAboveToken, zoom), object, turn);
    // Keep the eye above the shaft slice while closing in. That makes the
    // opening move a downward look into the pit, never an upward tilt.
    const sideEntry = [0, lerp(sidePosition[1], object[1] + 4.8, zoom),
      lerp(sidePosition[2], 1.15, zoom)];
    // Once the lens is inside the opening, it rises around the token while its
    // target drops from the upper shaft to the token itself. The down-facing
    // rotation therefore starts on entry instead of after a pass underneath.
    const topEntry = [0, object[1] + 3.4, 0];
    const position = point(sideEntry, topEntry, turn);
    const angle = lerp(0, Math.PI / 2, turn);
    const finalTarget = [0, FLOOR_Y, 0];
    const finalPosition = [0, FINAL_CAMERA_Y, 0];
    const framedTarget = point(target, finalTarget, settle);
    const framedPosition = point(position, finalPosition, settle);
    // World Y decreases while falling. Clamp the eye to the side above the
    // crate so the settling move can never pass through or overtake it.
    const followPosition = [framedPosition[0], Math.max(framedPosition[1], object[1] + CAMERA_LEAD), framedPosition[2]];
    const framedUp = point([0, Math.cos(angle), -Math.sin(angle)], [0, 0, -1], settle);
    const framedFov = lerp(lerp(24, 68, zoom), 75, settle);
    let phase = 'side-2d-follow';
    if (p > 0) phase = 'pit-zoom';
    if (p >= .25) phase = 'shaft-entry-turn';
    if (p >= CAMERA_LOCK) phase = 'dungeon-frame';
    if (p >= CAMERA_LOCK) phase = 'dungeon-2d';
    if (p >= IMPACT) phase = 'crate-impact';
    if (p >= .93) phase = 'character-entry';
    const topFrame = p >= CAMERA_LOCK;
    // This is used only for the diagnostic frustum readout; the locked view
    // itself remains perspective so it still reads as the shaft's exit.
    const topUnit = Math.min(view.w / 19, view.h / 14);
    const impact = ease((p - IMPACT) / .06);
    const arrival = ease((p - .93) / .07);
    const debris = [
      [-1.25, -.85], [1.15, -.65], [-.55, 1.2], [.7, 1.15], [-1.45, .35], [1.45, .42],
    ].map(function (offset) {
      return {visible: p >= IMPACT, position: [offset[0] * impact, FLOOR_Y + .05, offset[1] * impact]};
    });
    const pose = p <= .001 ? {
      target: startTarget, position: sidePosition, up: [0, 1, 0], unit: startUnit,
    } : {
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
        perspective: true, fov: 75, unit: topUnit} : pose,
      timing: {dropStart: 0, zoomEnd: .25, rotateStart: .25, shaftExit: CAMERA_LOCK, impact: IMPACT, dungeonFrame: CAMERA_LOCK, topLock: CAMERA_LOCK, characterStart: .93},
      route: [[0, 1.55, 0], [0, FLOOR_Y + .38, 0]],
      character: {visible: p >= .93, position: [lerp(DESTINATION.minX - .85, DESTINATION.minX + 1.4, arrival), FLOOR_Y + .05, 0]},
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
        tile_brick: SIDE_ASSET, tile_grass: SIDE_ASSET, tile_crate: SIDE_ASSET},
      palette: {ink: '#2e3a55', paper: '#fdfdf9'},
      manualView: {yaw: .72, pitch: .72, radius: 25},
      stage: fallStage,
      labels: function () {
        return [
          {id: 'S1', name: 'Side-view ledge and pit opening', kind: 'room', position: [-4, 0, .2], maxProgress: .34},
          {id: 'O1', name: 'Falling transition object', kind: 'route', position: [0, -22, 0]},
          {id: 'P1', name: 'Open-top shaft route', kind: 'route', position: [0, -22, 0]},
          {id: 'W1', name: 'Shaft containment walls', kind: 'wall', position: [-1.15, -22, 0]},
          {id: 'R1', name: '2D dungeon stage floor', kind: 'room', position: [5, FLOOR_Y + .08, 2], minProgress: .73},
          {id: 'D1', name: '2D dungeon wall ring', kind: 'wall', position: [0, FLOOR_Y + .1, DESTINATION.minZ], minProgress: CAMERA_LOCK},
          {id: 'A1', name: 'Arriving dungeon character', kind: 'route', position: [DESTINATION.minX + 1, FLOOR_Y + .08, 0], minProgress: .93},
        ];
      },
      state: fallState,
      apply: function (bridge, state, blueprint, context) {
        // As the eye clears the physical lip of the shaft, dissolve its last
        // brick course over the same beat. The room floor is therefore revealed
        // through the outlet instead of replacing a full shaft frame in one cut.
        const exitReveal = ease((context.progress - .70) / .14);
        const roomReveal = ease((context.progress - .72) / .12);
        const propsReveal = ease((context.progress - .76) / .08);
        bridge.setGroupVisibility('side-shell', context.manual || context.progress < .34);
        bridge.setGroupVisibility('shaft-walls', context.manual ||
          context.progress < .86);
        // The fourth wall only appears after the camera has crossed the rim
        // and is looking directly at the falling object from inside the shaft.
        bridge.setGroupVisibility('shaft-front', context.manual ||
          (context.progress >= .28 && context.progress < .86));
        bridge.setGroupOpacity('shaft-walls', context.manual ? 1 : 1 - exitReveal);
        bridge.setGroupOpacity('shaft-front', context.manual ? 1 : 1 - exitReveal);
        // The floor is visible across the short drop after the shaft ends;
        // only its wall ring waits for the final 2D framing.
        bridge.setGroupVisibility('dungeon-floor', true);
        bridge.setGroupVisibility('dungeon-ring', context.manual || context.progress >= .72);
        bridge.setGroupVisibility('dungeon-props', context.manual || context.progress >= .76);
        bridge.setGroupOpacity('dungeon-ring', context.manual ? 1 : roomReveal);
        bridge.setGroupOpacity('dungeon-props', context.manual ? 1 : propsReveal);
        bridge.setObjectState('arrival-player', state.character);
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
          'shaft: 2.5 x 2.5 x 44.0 units; target gap: 6.0 units',
          'destination: 11 x 7 tiles',
        ].join('\n');
      },
      capture: function (progress, state, pose, view) {
        return {progress: progress, phase: state.phase, camera: pose.position.slice(),
          object: state.object.position.slice(), frustum: [view.w / pose.unit, view.h / pose.unit],
          route: state.route.map(function (item) { return item.slice(); }), duration: 14,
          shaft: [2.5, 2.5, 44], targetGap: 6, destinationReady: progress >= state.timing.topLock,
          playerVisible: state.character.visible};
      },
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
