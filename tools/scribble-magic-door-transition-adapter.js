/* Magic-door-specific content for the shared Scribble transition preview. */
(function (global) {
  'use strict';

  const ROOM = {x: -4, y: -3, w: 9, h: 7, height: 4};
  const TOP_ASSET = '../assets/scribble-dungeons/';
  const SIDE_ASSET = '../assets/scribble-platformer/';

  function midpoint(from, to, y) {
    return [(from[0] + to[0]) / 2, y == null ? (from[1] + to[1]) / 2 : y, (from[2] + to[2]) / 2];
  }

  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // The arrival pawn is the platformer's own token, so its skin name and pack
  // path mirror scribble-platformer.js exactly. Defaults to red for the preview.
  function characterFor(color) {
    const body = 'character_round' + cap(color || 'red');
    const hand = 'character_hand' + cap(color || 'red');
    const packs = {};
    packs[body] = SIDE_ASSET;
    packs[hand] = SIDE_ASSET;
    return {packs: packs, body: body, hand: hand};
  }

  // The final camera looks square-on at the far wall from the impact point,
  // at HANDOFF_EYE height with a HANDOFF_FOV lens.
  const HANDOFF_EYE = 3.4;
  const HANDOFF_FOV = 46;
  // After the burst, the camera backs away while its lens narrows, keeping
  // the far wall the same size: the room's depth collapses until the view is
  // orthographic and level, which is the platformer's own camera on its
  // landing room. Floor, side walls and wall tops are then edge-on.
  const FLATTEN_START = 0.875;
  const FLATTEN_END = 1.05;
  // The landing route runs this far past its authored end, so the
  // flattening has time to read and the result holds briefly.
  const LANDING_TAIL = 0.07;
  const FLAT_FOV = 0.8;
  // Everything nearer than this to the far wall is clipped while the camera
  // is outside the room: the front wall and the corridors behind it.
  const ROOM_CLEARANCE = 13.5;

  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** The platformer's camera on its landing room, in the stage's own units. */
  function landingCamera(blueprint, view) {
    const landing = blueprint.magic.landing;
    const frame = landing && typeof global.scribblePlatformerHandoffFrame === 'function'
      ? global.scribblePlatformerHandoffFrame(view) : null;
    if (!frame) return null;
    return {target: [landing.left + frame.centre[0], frame.centre[1], landing.wallZ], unit: frame.unit};
  }

  function flattenPose(base, progress, view, landed) {
    const f = smooth((progress - FLATTEN_START) / (FLATTEN_END - FLATTEN_START));
    const away = [base.position[0] - base.target[0], 0, base.position[2] - base.target[2]];
    const length = Math.hypot(away[0], away[2]) || 1;
    const normal = [away[0] / length, 0, away[2] / length];
    if (f >= 1) {
      return {target: landed.target.slice(), up: [0, 1, 0], unit: landed.unit, perspective: false,
        position: [landed.target[0] + normal[0] * 6, landed.target[1], landed.target[2] + normal[2] * 6]};
    }
    const startDistance = Math.hypot(base.position[0] - base.target[0], base.position[2] - base.target[2]);
    const startUnit = view.h / (2 * startDistance * Math.tan(base.fov * Math.PI / 360));
    const unit = startUnit * Math.pow(landed.unit / startUnit, f);
    const fov = lerp(base.fov, FLAT_FOV, f);
    const target = [lerp(base.target[0], landed.target[0], f), lerp(base.target[1], landed.target[1], f),
      lerp(base.target[2], landed.target[2], f)];
    const distance = view.h / (2 * unit * Math.tan(fov * Math.PI / 360));
    return {target: target, up: [0, 1, 0], unit: unit, perspective: true, fov: fov,
      position: [target[0] + normal[0] * distance, target[1], target[2] + normal[2] * distance],
      near: Math.max(0.05, distance - ROOM_CLEARANCE)};
  }

  /** The notebook page behind the landing room: three views each way. */
  function paperFrame(landed, view, visible) {
    return {
      visible: visible,
      centre: [landed.target[0], landed.target[1], landed.target[2] - 0.06],
      facing: [0, 0, 1],
      width: 3 * view.w / landed.unit,
      height: 3 * view.h / landed.unit,
    };
  }

  global.createScribbleMagicDoorPreviewAdapter = function () {
    // The dimensions the stage was actually built at. The preview keeps the
    // authored room; the game replaces it with the room being played.
    let built = {origin: [ROOM.x, ROOM.y], width: ROOM.w, depth: ROOM.h};
    return {
      duration: 20,
      captureKey: '__magicDoorPreviewState',
      packs: {
        tiles: TOP_ASSET, floor_wall: TOP_ASSET, floor_wall_corner: TOP_ASSET,
        floor_door_closed: TOP_ASSET, floor_door_open: TOP_ASSET, weapon_staff: TOP_ASSET,
        arrow: TOP_ASSET, tile_castle: SIDE_ASSET, tile_brick: SIDE_ASSET,
        tile_ladder: SIDE_ASSET, character_roundRed: SIDE_ASSET,
        character_handRed: SIDE_ASSET, tile_grass: SIDE_ASSET,
        tile_stone: SIDE_ASSET, tile: SIDE_ASSET,
      },
      palette: {ink: '#2e3a55', paper: '#fdfdf9'},
      character: function (color) { return characterFor(color); },
      tail: function (blueprint) { return blueprint && blueprint.magic.landing ? LANDING_TAIL : 0; },
      stage: function (character, live) {
        character = character || characterFor('red');
        // The live game reports its room already turned so the gateway doors face
        // north, which is the heading this stage is authored in. Building on those
        // dimensions puts the 3D chamber exactly where the painted one is.
        const width = live && live.width ? live.width : ROOM.w;
        const depth = live && live.depth ? live.depth : ROOM.h;
        const origin = live ? [-(width - 1) / 2, -(depth - 1) / 2] : [ROOM.x, ROOM.y];
        built = {origin: origin, width: width, depth: depth};
        return scribbleMagicDoorTransitionStage({
          origin: origin, width: width, depth: depth, height: ROOM.height,
          top: {floor: 'tiles', wall: 'floor_wall', corner: 'floor_wall_corner',
            door: 'floor_door_closed', openDoor: 'floor_door_open', wand: 'weapon_staff'},
          side: {wall: 'tile_brick', cap: 'arrow', ladder: 'tile_ladder', ground: 'tile_grass',
            end: 'tile_castle',
            characterBody: character.body, characterHand: character.hand},
          props: [], tunnelWidth: 7, narrowTunnelWidth: 2, narrowAfterSegment: 4,
          handoffEyeHeight: HANDOFF_EYE,
          // The platformer's landing room, when the game reports it: the
          // destination is built as that stage.
          landingRoom: live && live.landingRoom ? live.landingRoom : null,
          // A played gateway room reports where its doors really are.
          doorOffsets: live && live.doorOffsets ? live.doorOffsets : null,
          entryOffset: live && live.entryOffset != null ? live.entryOffset : null,
        });
      },
      labels: function (blueprint) {
        const magic = blueprint.magic;
        const route = magic.route;
        const centreZ = ROOM.y + (ROOM.h - 1) / 2;
        const labels = [
          {id: 'R1', name: 'Original room floor', kind: 'room', position: [-2, 0.18, centreZ + 1]},
          {id: 'D1', name: 'Left magic door', kind: 'door', position: [magic.centreX - 2.4, 0.22, ROOM.y + 0.14]},
          {id: 'D2', name: 'Selected centre door', kind: 'door', position: [magic.centreX, 0.22, ROOM.y + 0.14],
            hiddenWhen: function (state) { return state.doorBurst.broken; }},
          {id: 'D3', name: 'Right magic door', kind: 'door', position: [magic.centreX + 2.4, 0.22, ROOM.y + 0.14]},
          {id: 'M1', name: 'Magic wand', kind: 'magic', position: [magic.centreX, 0.32, ROOM.y + ROOM.h - 2]},
          {id: 'N1', name: 'Next room entry floor', kind: 'route', position: [route[0][0], 0.18, route[0][2]]},
          {id: 'A1', name: 'Arrow top surfaces', kind: 'wall', position: [route[0][0] + magic.tunnelWidth / 2 + 0.5, magic.tunnelHeight + 0.15, route[0][2] - 1]},
          {id: 'B1', name: '3D brick wall faces', kind: 'wall', position: [route[0][0] - magic.tunnelWidth / 2 - 0.5, magic.tunnelHeight / 2, route[0][2] - 2], minProgress: 0.66},
          {id: 'X1', name: 'Final impact wall', kind: 'wall', position: magic.impact.slice()},
          {id: 'E1', name: 'Final side-view room', kind: 'room', position: [magic.centreX + 4, 0.3, (magic.destinationRoom.minZ + magic.destinationRoom.maxZ) / 2]},
        ];
        for (let i = 0; i < route.length - 2; i++) {
          labels.push({id: 'C' + (i + 1), name: 'Corridor segment ' + (i + 1), kind: 'route', position: midpoint(route[i], route[i + 1], 0.22)});
          if (i < route.length - 3) labels.push({id: 'T' + (i + 1), name: 'Corridor turn ' + (i + 1), kind: 'route', position: [route[i + 1][0], 0.3, route[i + 1][2]]});
        }
        (magic.branches || []).forEach(function (branch, index) {
          labels.push({id: 'F' + (index + 1), name: 'Narrow corridor fork ' + (index + 1), kind: 'route', position: midpoint(branch[0], branch[1], 0.3)});
        });
        magic.destinationLadders.forEach(function (x, index) {
          labels.push({id: 'L' + (index + 1), name: 'Destination ladder ' + (index + 1), kind: 'wall', position: [x, 2.6, magic.destinationRoom.minZ - 0.42]});
        });
        return labels;
      },
      state: function (progress, view, blueprint, live) {
        const magic = blueprint.magic;
        const oz = built.origin[1];
        // With a live room underneath, the spell leaves the wand the player is
        // actually holding, aims at the door they actually chose, and is framed
        // at the canvas's own scale — otherwise the bolt starts beside the wand.
        const state = scribbleMagicDoorTransitionState(Math.min(1, progress), {
          view: view, tunnelWidth: magic.tunnelWidth, narrowTunnelWidth: magic.narrowTunnelWidth,
          tunnelHeight: magic.tunnelHeight,
          start: live && live.wand ? live.wand : [magic.centreX, 0.22, oz + built.depth - 2],
          roomTarget: live && live.target ? live.target
            : [magic.centreX, 0, oz + (built.depth - 1) / 2],
          door: live && live.door ? live.door : magic.door,
          startUnit: live && live.unit ? live.unit : undefined,
          holdRoomFrame: !!live,
          entry: magic.entry, impact: magic.impact, route: magic.route, fastStart: magic.fastStart,
          initialMultiplier: 1.35, fastMultiplier: 2.4, destinationEntry: magic.destinationEntry,
          rapidChaseRadius: 1.05, handoffFov: HANDOFF_FOV, handoffEyeHeight: HANDOFF_EYE,
        });
        const landed = landingCamera(blueprint, view);
        if (landed) {
          state.landing = landed;
          if (progress > FLATTEN_START) state.pose = flattenPose(state.pose, progress, view, landed);
        }
        return state;
      },
      apply: function (bridge, state, blueprint, context) {
        // The live dungeon canvas remains the outgoing chamber and pawn. Once the
        // wand is held, the complete authored 3D route can already stand beyond
        // its doors; accepting the answer only starts the camera and spell.
        // A room played in 3D draws its own floor, ring and doors. The live page
        // around it still hides the route until the bolt reaches the door.
        const liveCanvas = !!context.liveRoom;
        const liveRoom = liveCanvas && !context.roomIn3d;
        const staged3d = !!context.staged3d;
        const tunnelStart = state.timing.doorHit - 0.025;
        bridge.setGroupVisibility('chamber-floor', !liveRoom);
        bridge.setGroupVisibility('chamber-wand', !liveRoom && !context.wandHeld);
        bridge.setGroupVisibility('selected-door', !liveRoom && !state.doorBurst.broken);
        bridge.setGroupVisibility('selected-door-base', !liveRoom && !state.doorBurst.broken);
        bridge.setGroupVisibility('selected-door-open', !liveRoom && state.doorBurst.broken);
        bridge.setGroupVisibility('tunnel-floor', staged3d || !liveCanvas || context.progress >= tunnelStart);
        bridge.setGroupVisibility('tunnel-wall-tops', staged3d || !liveCanvas || context.progress >= tunnelStart);
        bridge.setGroupVisibility('tunnel-walls', staged3d || context.manual || context.progress >= state.timing.turnStart);
        const routeShown = staged3d || context.manual || context.progress >= state.timing.turnStart;
        // The pawn the 2D game drew stays on the floor it stood on and fades
        // with that game's page as the bolt reaches the door.
        if (context.pinned && typeof bridge.placeDecal === 'function') {
          const fadeStart = state.timing.doorHit - 0.025;
          const fadeEnd = state.timing.doorHit + 0.09;
          const fade = 1 - Math.max(0, Math.min(1, (context.progress - fadeStart) / (fadeEnd - fadeStart)));
          bridge.placeDecal('pinned-layer', Object.assign({}, context.pinned, {visible: true, opacity: fade}));
        }
        bridge.setGroupVisibility('destination-details', routeShown);
        bridge.setMagicBolt(state.bolt);
        bridge.setDoorBurst(state.doorBurst);
        bridge.setWallBurst(state.wallBurst);
        // A landing room is entered by the platformer's own pawn, after the
        // camera has become its camera.
        const landing = blueprint.magic.landing;
        bridge.setObjectState(blueprint.magic.arrivalCharacter, landing ? {visible: false} : state.character);
        if (landing) {
          bridge.setGroupVisibility('destination-soil', routeShown);
          if (typeof bridge.setGroupOpacity === 'function') bridge.setGroupOpacity('destination-soil', landing.soilAlpha);
          if (state.landing && context.page && typeof bridge.placeDecal === 'function') {
            bridge.placeDecal('landing-paper', paperFrame(state.landing, context.view,
              context.progress >= state.timing.destinationStart));
          }
        }
      },
      readout: function (state, pose, view) {
        return [
          'phase: ' + state.phase,
          'camera: [' + pose.position.map(function (value) { return value.toFixed(2); }).join(', ') + ']',
          'bolt: [' + state.bolt.position.map(function (value) { return value.toFixed(2); }).join(', ') + ']',
          'visible frustum: ' + (view.w / state.pose.unit).toFixed(2) + ' x ' + (view.h / state.pose.unit).toFixed(2) + ' units',
          'open-top tunnel: ' + state.tunnel.width + ' -> ' + state.tunnel.narrowWidth + ' x ' + state.tunnel.height + ' units',
          'destination room: 15 x 14 tiles',
        ].join('\n');
      },
      capture: function (progress, state, pose, view) {
        return {
          progress: progress, phase: state.phase, flash: state.flash, camera: pose.position.slice(),
          bolt: state.bolt.position.slice(), frustum: [view.w / state.pose.unit, view.h / state.pose.unit],
          tunnel: [state.tunnel.width, state.tunnel.height], route: state.tunnel.route.map(function (point) { return point.slice(); }),
          rapid: progress >= state.timing.fastStart, duration: 20, doorHit: state.timing.doorHit,
          doorBroken: state.doorBurst.broken, wallBurst: state.wallBurst.amount,
          destinationReady: true, playerVisible: state.character.visible,
        };
      },
    };
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);
