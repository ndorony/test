/* Shared room from scribble-bridge-preview: authored recipes remain unchanged. */
(function(global) {
'use strict';
const TOP_ASSET = './assets/scribble-dungeons/';
const SIDE_ASSET = './assets/scribble-platformer/';
const ROOM = { x: -5, y: -3, w: 11, h: 7, height: 4 };

// The room's two halves, in the studio's own vocabulary. `top` is what lies
// flat — the dungeon's floor plan. `side` is what stands up — the platformer's
// walls. A wall tile gets both, which is what makes it read either way.
const ART = { floor: 'tiles', wall: 'floor_wall', corner: 'floor_wall_corner' };
const LEVEL = { wall: 'tile', ground: 'tile_grass' };

// Crates: each an open-bottom cube. From above the dungeon's crate.png; from
// the side a stack to jump on. Two of them are doubled up into a step.
const PROPS = [
  { c: 2, r: 4, top: 'crate', side: 'tile_crate' },
  { c: 3, r: 4, top: 'crate', side: 'tile_crate', height: 2 },
  { c: 6, r: 2, top: 'crate', side: 'tile_crate' },
  { c: 8, r: 3, top: 'crate', side: 'tile_crate', height: 2 },
];

// Pasted from the studio's "Copy values for Codex" for Draft - Castle
// battlement, unedited. The roof is a profile, not a lid: merlons at 2.45,
// crenels recessed to 2.04, and the four cross-strips at 2.25 — every piece
// cut from arrow.png at rect [20,0,24,64].
const BATTLEMENT = {
  asset: 'Draft - Castle battlement',
  dimensions: [2.5, 2.5, 2.5],
  panels: [
    {id: 'castle-front', role: 'front', reference: 'side', position: [0, 1.25, 1.2], rotation: [0, 0, 0], size: [2.5, 2.5]},
    {id: 'castle-back', role: 'back', reference: 'side', position: [0, 1.25, -1.2], rotation: [0, 180, 0], size: [2.5, 2.5]},
    {id: 'roof-left-high', role: 'top', reference: 'top', position: [-0.977, 2.45, 0], rotation: [-90, 0, 0], size: [0.469, 2.5], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
    {id: 'roof-centre-high', role: 'top', reference: 'top', position: [0, 2.45, 0], rotation: [-90, 0, 0], size: [0.859, 2.5], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
    {id: 'roof-right-high', role: 'top', reference: 'top', position: [0.977, 2.45, 0], rotation: [-90, 0, 0], size: [0.469, 2.5], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
    {id: 'roof-left-low', role: 'top', reference: 'top', position: [-0.586, 2.04, 0], rotation: [-90, 0, 0], size: [1.3, 2.45], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
    {id: 'roof-right-low', role: 'top', reference: 'top', position: [0.586, 2.04, 0], rotation: [-90, 0, 0], size: [1.4, 2.5], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
    {id: 'c1', role: 'top', reference: 'top', position: [-0.8, 2.25, 0], rotation: [-90, 90, 0], size: [0.469, 2.5], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
    {id: 'c2', role: 'top', reference: 'top', position: [-0.4, 2.25, 0], rotation: [-90, 90, 0], size: [0.469, 2.5], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
    {id: 'c3', role: 'top', reference: 'top', position: [0.4, 2.25, 0], rotation: [-90, 90, 0], size: [0.469, 2.5], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
    {id: 'c4', role: 'top', reference: 'top', position: [0.8, 2.25, 0], rotation: [-90, 90, 0], size: [0.469, 2.5], sourceReference: {source: './assets/scribble-dungeons/arrow.png', rect: [20, 0, 24, 64]}},
  ],
};
const REFS = {
  top: './assets/scribble-dungeons/floor_wall.png',
  side: './assets/scribble-platformer/tile_castle.png',
};

// "Connected + arrow sides virtual 1" — the studio's approved reusable brick.
// A tile.png front, and arrow.png on the top, left and right. This is what the
// two side runs are laid from.
const ARROW_SIDES = {
  asset: 'Connected + arrow sides virtual 1',
  dimensions: [2.5, 2.5, 2.5],
  panels: [
    {id: 'front', role: 'front', reference: 'side', position: [0, 1.25, 1.25], rotation: [0, 0, 0], size: [2.5, 2.5]},
    {id: 'top', role: 'top', reference: 'top', position: [0, 2.45, 0.85], rotation: [-90, 0, 90], size: [2.5, 2.5]},
    {id: 'left', role: 'left', reference: 'top', position: [-1.22, 1.27, 0.87], rotation: [0, -90, 0], size: [2.5, 2.5]},
    {id: 'right', role: 'right', reference: 'top', position: [1.23, 1.28, 0.87], rotation: [0, 90, 0], size: [2.5, 2.5]},
  ],
};
const ARROW_REFS = {
  top: './assets/scribble-dungeons/arrow.png',
  side: './assets/scribble-platformer/tile.png',
};

const RECIPE_SOURCES = [REFS.top, REFS.side, ARROW_REFS.top, ARROW_REFS.side,
  './assets/scribble-dungeons/arrow.png'];

// Which pack each sprite comes from. The room borrows from both.
const PACK = {};
Object.values(ART).forEach(n => { PACK[n] = TOP_ASSET; });
Object.values(LEVEL).forEach(n => { PACK[n] = SIDE_ASSET; });
PROPS.forEach(p => { PACK[p.top] = TOP_ASSET; PACK[p.side] = SIDE_ASSET; });


global.SCRIBBLE_AUTHORED_ROOM = {ROOM, ART, LEVEL, PROPS, BATTLEMENT, REFS, ARROW_SIDES, ARROW_REFS, RECIPE_SOURCES, PACK};
global.createScribbleAuthoredRoom = function() {
const stage = scribbleBridgeStage({origin:[ROOM.x,ROOM.y],width:ROOM.w,depth:ROOM.h,height:ROOM.height,top:ART,side:LEVEL,props:PROPS,wallBrick:{recipe:ARROW_SIDES,refs:ARROW_REFS}});
for(let c=0;c<ROOM.w;c++) stage.instances.push(scribbleBridgeInstance(BATTLEMENT,REFS,[ROOM.x+c,ROOM.height,ROOM.y],0));
return stage;
};
})(window);
