/* Magic-door-specific content for the shared Scribble transition preview. */
(function (global) {
  'use strict';

  const ROOM = {x: -4, y: -3, w: 9, h: 7, height: 4};
  const TOP_ASSET = '../assets/scribble-dungeons/';
  const SIDE_ASSET = '../assets/scribble-platformer/';

  function midpoint(from, to, y) {
    return [(from[0] + to[0]) / 2, y == null ? (from[1] + to[1]) / 2 : y, (from[2] + to[2]) / 2];
  }

  global.createScribbleMagicDoorPreviewAdapter = function () {
    return {
      duration: 20,
      captureKey: '__magicDoorPreviewState',
      packs: {
        tiles: TOP_ASSET, floor_wall: TOP_ASSET, floor_wall_corner: TOP_ASSET,
        floor_door_closed: TOP_ASSET, floor_door_open: TOP_ASSET, weapon_staff: TOP_ASSET,
        arrow: TOP_ASSET, tile_castle: SIDE_ASSET, tile_brick: SIDE_ASSET,
        tile_ladder: SIDE_ASSET, character_roundRed: SIDE_ASSET,
        character_handRed: SIDE_ASSET, tile_grass: SIDE_ASSET,
      },
      palette: {ink: '#2e3a55', paper: '#fdfdf9'},
      stage: function () {
        return scribbleMagicDoorTransitionStage({
          origin: [ROOM.x, ROOM.y], width: ROOM.w, depth: ROOM.h, height: ROOM.height,
          top: {floor: 'tiles', wall: 'floor_wall', corner: 'floor_wall_corner',
            door: 'floor_door_closed', openDoor: 'floor_door_open', wand: 'weapon_staff'},
          side: {wall: 'tile_brick', cap: 'arrow', ladder: 'tile_ladder', ground: 'tile_grass',
            characterBody: 'character_roundRed', characterHand: 'character_handRed'},
          props: [], tunnelWidth: 7, narrowTunnelWidth: 2, narrowAfterSegment: 4,
          handoffEyeHeight: 3.4,
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
      state: function (progress, view, blueprint) {
        const magic = blueprint.magic;
        return scribbleMagicDoorTransitionState(progress, {
          view: view, tunnelWidth: magic.tunnelWidth, narrowTunnelWidth: magic.narrowTunnelWidth,
          tunnelHeight: magic.tunnelHeight, start: [magic.centreX, 0.22, ROOM.y + ROOM.h - 2],
          roomTarget: [magic.centreX, 0, ROOM.y + (ROOM.h - 1) / 2], door: magic.door,
          entry: magic.entry, impact: magic.impact, route: magic.route, fastStart: magic.fastStart,
          initialMultiplier: 1.35, fastMultiplier: 2.4, destinationEntry: magic.destinationEntry,
          rapidChaseRadius: 1.05, handoffFov: 46, handoffEyeHeight: 3.4,
        });
      },
      apply: function (bridge, state, blueprint, context) {
        bridge.setGroupVisibility('chamber-floor', true);
        bridge.setGroupVisibility('selected-door', !state.doorBurst.broken);
        bridge.setGroupVisibility('selected-door-base', !state.doorBurst.broken);
        bridge.setGroupVisibility('selected-door-open', state.doorBurst.broken);
        bridge.setGroupVisibility('tunnel-floor', true);
        bridge.setGroupVisibility('tunnel-wall-tops', true);
        bridge.setGroupVisibility('tunnel-walls', context.manual || context.progress >= state.timing.turnStart);
        bridge.setGroupVisibility('destination-details', context.manual || context.progress >= state.timing.turnStart);
        bridge.setMagicBolt(state.bolt);
        bridge.setDoorBurst(state.doorBurst);
        bridge.setWallBurst(state.wallBurst);
        bridge.setObjectState(blueprint.magic.arrivalCharacter, state.character);
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
