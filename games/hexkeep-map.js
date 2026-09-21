(function(g){
 'use strict';
 // Pointy KayKit hexes. Every region shares the same 8x6 grid and the same
 // camera, so one projection table (assets/hexkeep/projection.js) places
 // sprites on all of them; only the terrain painting changes per region.
 function buildMap(spec){
  const tiles=Array.from({length:48},(_,id)=>({id,c:id%8,r:Math.floor(id/8),role:'grass'}));
  spec.path.forEach(id=>tiles[id].role='road');
  (spec.river||[]).forEach(id=>tiles[id].role='river');
  // A region with boats gets a second route: `lane` is the sailing line, and
  // every tile on it is open water, so the two routes never overlap.
  const lane=spec.lane||null,wet=[...(spec.water||[]),...(lane||[])];
  wet.forEach(id=>tiles[id].role='water');
  // An island keeps its own dressing even when a plot is built on it, so the
  // set is kept beside the roles rather than only in them.
  const islands=new Set(spec.island||[]);
  islands.forEach(id=>{tiles[id].role='island';});
  (spec.forest||[]).forEach(id=>tiles[id].role='forest');
  (spec.hill||[]).forEach(id=>tiles[id].role='hill');
  (spec.homes||[]).forEach(id=>tiles[id].role='village');
  if(spec.bridge!==undefined)tiles[spec.bridge].role='bridge';
  tiles[spec.path[spec.path.length-1]].role='entrance';
  spec.sites.forEach(s=>{tiles[s.tile].role='build';});
  // A tiled apron continues the region beyond the camera crop so the baked
  // board never shows a transparent corner.
  const edge=spec.edge,apron=[];
  for(let r=-8;r<14;r++)for(let c=-8;c<16;c++)if(r<0||r>=6||c<0||c>=8){
   let role='grass';
   if((c*17+r*11+400)%7<edge.forest)role='forest';
   if(edge.water&&edge.water(c,r))role='water';
   if(c===edge.river(r))role='river';
   if(edge.road(c,r))role='road';
   apron.push({id:'edge-'+c+'-'+r,c,r,role});
  }
  function cellWorld(t){return {x:t.c*2+(Math.abs(t.r)%2)-7.5,z:t.r*Math.sqrt(3)-4.33};}
  function world(id){return cellWorld(tiles[id]);}
  function distance(a,b){const x=tiles[a],y=tiles[b],aq=x.c-Math.floor(x.r/2),bq=y.c-Math.floor(y.r/2),dq=aq-bq,dr=x.r-y.r;return (Math.abs(dq)+Math.abs(dr)+Math.abs(dq+dr))/2;}
  // `routes.land` is the road every walker follows; `routes.water` is the lane
  // every boat follows. An enemy's own route decides where it can stand, so a
  // walker never enters the water and a boat never leaves it.
  const routes={land:spec.path};if(lane)routes.water=lane;
  const water=new Set(wet);
  return {id:spec.id,board:spec.board,palette:spec.palette,scenery:spec.scenery||{},riverRot:spec.riverRot||Math.PI/3,
   tiles,apron,path:spec.path,lane,routes,water,islands,sites:spec.sites,world,cellWorld,distance,village:spec.village};
 }

 // Region 1 — the original winding route: forest bend, crossing, south loop,
 // north hairpin.
 const valley=buildMap({id:'valley',board:'village.png',
  path:[32,33,25,18,19,20,28,36,37,29,22,23,31,39],
  river:[4,11,26,34],water:[41],bridge:19,
  forest:[0,1,5,6,7,8,9,15,16,17,40,43,44,45],hill:[2,42],homes:[46,47],village:47,
  sites:[{tile:30,name:'תצפית הכפר',rally:11},{tile:10,name:'האחו הגבוה',rally:3},{tile:21,name:'סדנת המעבר',rally:9},{tile:38,name:'כיכר הכפר',rally:12},{tile:24,name:'שולי היער',rally:2},{tile:35,name:'גבעת המעבר',rally:6}],
  palette:{ground:0x729e72,water:0xd1edf1},
  scenery:{flagTile:39,boulderTile:32},
  edge:{forest:3,river:r=>4-Math.ceil(r/2),road:(c,r)=>r===4&&c<0}});

 // Region 2 — the reed marsh: a long serpentine between still pools, no
 // crossing to funnel the attackers, and the hamlet on the far eastern shelf.
 const marsh=buildMap({id:'marsh',board:'marsh.png',
  path:[16,17,25,26,34,35,27,19,20,28,36,37,29,30,38,39],
  water:[0,1,8,9,32,40,41],
  forest:[2,3,10,12,13,18,43,45],hill:[4,5,22,23],homes:[46,47],village:47,
  sites:[{tile:24,name:'מצפה הקנים',rally:2},{tile:42,name:'בקתת הדייגים',rally:4},{tile:11,name:'אי העצים',rally:7},{tile:44,name:'סוללת הבוץ',rally:10},{tile:21,name:'מעבר הקרשים',rally:12},{tile:31,name:'שער הביצה',rally:13}],
  palette:{ground:0x3f8f7a,water:0x86c4c9},
  scenery:{flagTile:39,boulderTile:16},
  edge:{forest:4,river:()=>-99,road:(c,r)=>r===2&&c<0}});

 // Region 3 — the stone ridge: a climbing zigzag over dry hills with almost
 // no cover, one gorge crossing, and the keep on the eastern shoulder.
 // The only crossing tile is straight, so the road runs straight over the
 // bridge (35 -> 27 -> 20).
 const ridge=buildMap({id:'ridge',board:'ridge.png',
  path:[8,9,17,25,26,34,35,27,20,21,29,37,38,30,31,39],
  river:[2,10,19,36,44],water:[43],bridge:27,riverRot:-Math.PI/3,
  forest:[0,1,3,11,45],hill:[4,5,6,7,14,15],homes:[46,47],village:47,
  sites:[{tile:16,name:'שער הרכס',rally:2},{tile:33,name:'מחצבת האבן',rally:3},{tile:42,name:'מדרגות הסלע',rally:5},{tile:12,name:'צריח הפסגה',rally:8},{tile:22,name:'מרפסת הרוח',rally:10},{tile:23,name:'משמר המצודה',rally:13}],
  palette:{ground:0xa3a066,water:0xcfe7ea},
  scenery:{flagTile:39,boulderTile:8,rockyHills:true},
  edge:{forest:2,river:r=>2+Math.floor(r/2),road:(c,r)=>r===1&&c<0}});

 // Region 4 — the frost pass: the road crosses a frozen stream right at the
 // gate, climbs over the saddle and drops to a lodge beside an iced-over lake.
 // The road enters one row low so it crosses the straight bridge head-on
 // (33 -> 25 -> 18).
 const frost=buildMap({id:'frost',board:'frost.png',
  path:[32,33,25,18,10,11,19,27,35,36,28,21,13,14,6],
  river:[0,8,17,34,42],water:[38,39,46,47],bridge:25,riverRot:-Math.PI/3,
  forest:[1,2,9,16,24,40,41,44,45],hill:[4,5,12,23,31],homes:[7,15],village:7,
  sites:[{tile:26,name:'מגדל הקרח',rally:3},{tile:3,name:'צוק השלג',rally:4},{tile:43,name:'בקתת הציידים',rally:8},{tile:20,name:'אוכף המעבר',rally:10},{tile:29,name:'מדרון האורנים',rally:11},{tile:22,name:'שער האכסניה',rally:13}],
  palette:{ground:0xffffff,water:0xffffff,swatches:{grass:['#f6f9fc','#b8c9d6'],water:['#c9e8f6','#6aa6c8']}},
  scenery:{flagTile:6,boulderTile:32,rockyHills:true},
  edge:{forest:4,river:r=>Math.floor(r/2),road:(c,r)=>r===4&&c<0}});

 // Region 5 — the ash wastes: the road rises from the southern crater rim,
 // circles a lake of lava and ends at the last watchtower in the north.
 const ash=buildMap({id:'ash',board:'ash.png',
  path:[40,41,34,25,17,9,10,11,20,28,37,38,30,23,15],
  water:[18,19,26,27,35],
  forest:[0,8,32,44],hill:[3,4,5,13,14,31,39,47],homes:[6,7],village:7,
  sites:[{tile:33,name:'שפת המכתש',rally:2},{tile:16,name:'סלע הגופרית',rally:4},{tile:2,name:'מצפה העשן',rally:6},{tile:12,name:'גשר הבזלת',rally:8},{tile:29,name:'חוף הלבה',rally:10},{tile:22,name:'המגדל האחרון',rally:13}],
  palette:{ground:0xffffff,water:0xffffff,glow:0xc2300a,swatches:{grass:['#a0948a','#4d4440'],water:['#ff8a24','#a8190a']}},
  scenery:{flagTile:15,boulderTile:40,rockyHills:true},
  edge:{forest:1,river:()=>-99,road:(c,r)=>r===5&&c<0}});

 // Region 6 — the river run: the road follows the southern bank while a wide
 // river slides along the north. Raiding boats sail the lane, walkers keep to
 // the road, and the two only meet at the village landing.
 const river=buildMap({id:'river',board:'river.png',
  path:[32,33,25,17,18,19,27,28,36,37,38,30,31],
  lane:[0,1,9,10,2,3,4,5,13,14,6,7,15],
  forest:[8,12,26,34,40,44,46],hill:[35,42,47],homes:[23,22],village:23,
  sites:[{tile:16,name:'שער הנמל',rally:3},{tile:24,name:'מעלה הגדה',rally:2},{tile:11,name:'לשון היבשה',rally:5,lane:6},{tile:20,name:'מחסן הסוחרים',rally:7},{tile:21,name:'סוללת המעגן',rally:11,lane:8},{tile:29,name:'מגדלור הכפר',rally:11}],
  palette:{ground:0xffffff,water:0xffffff,swatches:{grass:['#9ed17f','#3c7a4e'],water:['#3a9fc4','#0e4b73']}},
  scenery:{flagTile:31,boulderTile:32,shore:true,dockTile:15},
  edge:{forest:3,river:()=>-99,road:(c,r)=>r===4&&c<0,water:(c,r)=>r===-1||(c<0||c>=8)&&r>=-1&&r<=1}});

 // Region 7 — the storm bay: open sea across the whole south, a sand island in
 // the strait, and the harbour village on the headland where road and lane meet.
 const coast=buildMap({id:'coast',board:'coast.png',
  path:[8,9,17,18,10,11,3,4,12,13,21,22,23],
  lane:[40,41,42,34,35,43,44,36,37,45,46,38,39],water:[24,25,26,32,47],
  island:[33],forest:[0,1,6,7,14,15,20],hill:[2],homes:[30,31],village:31,
  sites:[{tile:27,name:'סוללת האי',lane:7},{tile:16,name:'מפרץ הדייגים',rally:2},{tile:19,name:'כיכר החוף',rally:4},{tile:5,name:'משמר הרכס',rally:7},{tile:28,name:'סוללת המפרץ',rally:10,lane:8},{tile:29,name:'שובר הגלים',rally:11,lane:11}],
  palette:{ground:0xffffff,water:0xffffff,swatches:{grass:['#b9cc84','#5c7f4a'],water:['#2f93bd','#08415f']}},
  scenery:{flagTile:23,boulderTile:8,shore:true,dockTile:39},
  edge:{forest:2,river:()=>-99,road:(c,r)=>r===1&&c<0,water:(c,r)=>r>=4||c<0&&r>=3||c>=8&&r>=2}});

 // Region 8 — the stone harbour: open sea across almost the whole board, a
 // short causeway along the northern shore, and three rock islands that are the
 // only dry ground out in the bay. The fleet lane is the long way round.
 const harbour=buildMap({id:'harbour',board:'harbour.png',
  path:[0,1,9,10,2,3,4,5,6,7],
  lane:[40,41,42,43,35,34,26,27,28,36,37,38,30,22,14],
  water:[13,16,17,18,19,20,21,24,31,32,33,39,45,46,47],
  island:[25,29,44],homes:[15,23],village:15,
  sites:[{tile:8,name:'ראש המזח',rally:0},{tile:11,name:'מחסני הנמל',rally:3},{tile:12,name:'שער המפרץ',rally:6},
   {tile:25,name:'אי המערב',lane:6},{tile:29,name:'סלע התורן',lane:8},{tile:44,name:'שובר הגלים הדרומי',lane:9}],
  palette:{ground:0xffffff,water:0xffffff,swatches:{grass:['#c6cf8e','#5f7f4e'],water:['#2b8ab5','#06395c']}},
  scenery:{flagTile:7,boulderTile:0,shore:true,dockTile:14},
  edge:{forest:2,river:()=>-99,road:(c,r)=>r===0&&c<0,water:(c,r)=>r>=2||c<0&&r>=1||c>=8&&r>=1}});

 const maps={valley,marsh,ridge,frost,ash,river,coast,harbour};

 // Regions are played in order; each one is its own ten-raid campaign with its
 // own attackers. `enemy(wave,index)` describes a single arrival (its hp is
 // scaled by `tough`), `boss` describes the commander that closes the final
 // raid. Both are tuned against the tower damage table in hexkeep.js.
 const levels=[
  {id:'valley',map:valley,board:valley.board,name:'עמק הערבה',region:'עמק הנהר',waves:10,tough:1.1,
   blurb:'שביל יער מפותל, גשר אבן אחד וכפר שקט בקצה. הפולשים באים בשורה אחת.',
   count:wave=>4+Math.floor((wave-1)*.8),
   enemy:(wave,index)=>({kind:'raider',hp:3+Math.floor((wave-1)/2),armor:wave>=4&&index%3===0?1:0}),
   boss:{kind:'raider',name:'מפקד הפולשים',hp:134,armor:1}},
  {id:'marsh',map:marsh,board:marsh.board,name:'ביצות הערפל',region:'מישור הקנים',waves:10,tough:1.35,
   blurb:'הדרך ארוכה יותר אבל הפולשים מהירים: רצים קלים חומקים בין המגדלים.',
   count:wave=>5+Math.floor((wave-1)*.9),
   enemy:(wave,index)=>index%4===1?{kind:'runner',hp:2+Math.floor((wave-1)/3),armor:0,speed:2}
    :index%4===3&&wave>=3?{kind:'brute',hp:6+wave,armor:2}
    :{kind:'raider',hp:3+Math.floor(wave/2),armor:wave>=5&&index%3===0?1:0},
   boss:{kind:'brute',name:'אדון הביצה',hp:200,armor:2}},
  {id:'ridge',map:ridge,board:ridge.board,name:'רכס האבן',region:'מצודת הסלע',waves:10,tough:1.5,
   blurb:'רכס חשוף בלי מחסה. הפולשים מביאים קוסם שמרפא את מי שלידו — הפילו אותו ראשון.',
   count:wave=>4+(wave-1),
   enemy:(wave,index)=>index%5===2&&wave>=2?{kind:'shaman',hp:4+Math.floor(wave/2),armor:0,heal:1}
    :index%5===4?{kind:'runner',hp:3+Math.floor((wave-1)/3),armor:0,speed:2}
    :{kind:'brute',hp:5+Math.floor(wave*1.2),armor:wave>=3?2:1},
   boss:{kind:'shaman',name:'מכשף הרכס',hp:183,armor:2}},
  {id:'frost',map:frost,board:frost.board,name:'מעבר הכפור',region:'הרי השלג',waves:10,tough:1.1,
   blurb:'אבירי האופל נושאים מגן שבולע קליעים. חצים מהירים שוברים מגנים, והשומרים נלחמים בהם בלי מגן בכלל.',
   count:wave=>4+Math.floor((wave-1)*.9),
   enemy:(wave,index)=>index%3===1&&wave>=2?{kind:'knight',hp:4+Math.floor(wave/2),armor:1,shield:2+Math.floor(wave/3)}
    :index%3===2?{kind:'runner',hp:3+Math.floor((wave-1)/3),armor:0,speed:2}
    :{kind:'raider',hp:4+Math.floor(wave/2),armor:wave>=4?1:0},
   boss:{kind:'knight',name:'אביר הכפור',hp:97,armor:1,shield:16}},
  {id:'ash',map:ash,board:ash.board,name:'שדות האפר',region:'מכתש הלבה',waves:10,tough:1.55,
   blurb:'המזמן מקים שלדים חדשים תוך כדי הליכה. הפילו אותו מהר — כל פעימה שהוא חי מוסיפה אויבים.',
   count:wave=>4+Math.floor((wave-1)*.8),
   enemy:(wave,index)=>index%4===2?{kind:'warlock',hp:5+Math.floor(wave/2),armor:0,summon:{every:3,max:1+Math.floor(wave/4)}}
    :index%4===3&&wave>=2?{kind:'knight',hp:5+Math.floor(wave/2),armor:1,shield:2+Math.floor(wave/4)}
    :{kind:'brute',hp:5+wave,armor:wave>=3?2:1},
   boss:{kind:'warlock',name:'אדון האפר',hp:161,armor:1,summon:{every:3,max:3}}},
  {id:'river',map:river,board:river.board,name:'נהר הסוחרים',region:'מעלה הנהר',waves:10,tough:1.45,
   blurb:'סירות פשיטה מחליקות על הנהר וצוברות מהירות בכל פעימה שאיש לא פוגע בהן. ירי צפוף מרסן אותן — ועל המים אי אפשר לבנות.',
   count:wave=>5+Math.floor((wave-1)*.9),
   enemy:(wave,index)=>index%3===0?{kind:'skiff',hp:4+Math.floor(wave/2),armor:0,speed:1,surge:2}
    :index%3===1?{kind:'runner',hp:3+Math.floor((wave-1)/3),armor:0,speed:2}
    :{kind:'brute',hp:5+wave,armor:wave>=3?2:1},
   boss:{kind:'skiff',name:'רב-החובל של הנהר',hp:118,armor:1,surge:2}},
  {id:'coast',map:coast,board:coast.board,name:'מפרץ הסערה',region:'חוף הים',waves:10,tough:1.6,
   blurb:'הים פתוח והספינות המשוריינות מצפות גם את הסירות שלידן. חצים מחליקים מהשריון וקסם חודר אותו — צריך את שניהם יחד.',
   count:wave=>6+wave,
   enemy:(wave,index)=>index%5===0?{kind:'warship',hp:7+wave,armor:3,plate:2}
    :index%5===2?{kind:'knight',hp:5+Math.floor(wave/2),armor:1,shield:2+Math.floor(wave/4)}
    :index%5===4?{kind:'brute',hp:6+wave,armor:2}
    :{kind:'skiff',hp:7+wave,armor:0,speed:1,surge:3},
   boss:{kind:'warship',name:'ספינת הדגל',hp:124,armor:3,plate:2}},
  {id:'harbour',map:harbour,board:harbour.board,name:'נמל האבן',region:'המפרץ הגדול',waves:10,tough:2.4,
   blurb:'כמעט הכול ים, והצי שלהם בא מכל כיוון. במספנה אפשר לשלוח סירות משלנו — הן חוסמות ספינות, נלחמות מקרוב ויורות בתותח. אבל הספינה השחורה פותחת מטח שמרסק כל סירה שנעמדת מולה, אז צריך גם מגדלי ירי מאחוריהן.',
   count:wave=>8+wave,
   enemy:(wave,index)=>index%4===0?{kind:'warship',hp:6+Math.floor(wave/2),armor:3,plate:2}
    :index%4===2?{kind:'raider',hp:4+Math.floor(wave/2),armor:wave>=4?1:0}
    :{kind:'skiff',hp:5+Math.floor(wave/2),armor:0,speed:1,surge:3},
   boss:{kind:'manowar',name:'הספינה השחורה',hp:150,armor:2,plate:2,broadside:{every:2,damage:6}}}
 ];

 // The journey map between regions, drawn with Kenney's Cartography Pack on a
 // 2200x1000 parchment. The road reads right to left, like the Hebrew UI, and
 // the two water villages continue it into the western sea.
 // roads[i] leads from levels[i] to levels[i+1].
 const atlas={
  width:2500,
  nodes:{valley:{x:2260,y:740,icon:'mill'},marsh:{x:1970,y:470,icon:'houseViking'},ridge:{x:1690,y:720,icon:'castleTall'},frost:{x:1420,y:330,icon:'towerWatch'},ash:{x:1160,y:620,icon:'castleWide'},river:{x:850,y:300,icon:'dock'},coast:{x:500,y:640,icon:'ship'},harbour:{x:150,y:300,icon:'dock'}},
  start:'M 2540 900 Q 2380 900 2260 740',
  roads:['M 2260 740 Q 2230 500 1970 470','M 1970 470 Q 1930 760 1690 720','M 1690 720 Q 1450 700 1420 330','M 1420 330 Q 1130 330 1160 620','M 1160 620 Q 1030 300 850 300','M 850 300 Q 620 350 500 640','M 500 640 Q 250 640 150 300'],
  scenery:[
   {icon:'compass',x:2430,y:130,w:170},
   {icon:'treePines',x:2410,y:600,w:120},{icon:'treePine',x:2120,y:640,w:80},{icon:'treePinesSmall',x:2110,y:900,w:100},{icon:'bush',x:2420,y:790,w:70},{icon:'houses',x:2330,y:880,w:80},
   {icon:'lake',x:2140,y:330,w:230},{icon:'lakeRound',x:1800,y:420,w:120},{icon:'textureWater',x:2260,y:200,w:120},{icon:'bush',x:1860,y:600,w:70},{icon:'dock',x:2040,y:250,w:80},
   {icon:'rocksMountain',x:1550,y:880,w:130},{icon:'rocksTall',x:1830,y:890,w:110},{icon:'rocks',x:1530,y:590,w:100},{icon:'bridge',x:1840,y:710,w:80},
   {icon:'rocksMountain',x:1290,y:170,w:160},{icon:'rocksA',x:1490,y:140,w:130},{icon:'rocksB',x:1640,y:240,w:120},{icon:'rocksTall',x:1750,y:130,w:110},{icon:'treePineTall',x:1250,y:390,w:80},{icon:'treePineLarge',x:1590,y:420,w:100},
   {icon:'vulcano',x:1060,y:400,w:160},{icon:'skull',x:1290,y:830,w:80},{icon:'cactus',x:1050,y:800,w:80},{icon:'campfire',x:1320,y:560,w:70},{icon:'graveyard',x:1180,y:880,w:110},{icon:'rocksA',x:1010,y:600,w:90},
   // The western half of the parchment is open water: the river mouth and the bay.
   {icon:'lake',x:580,y:180,w:200},{icon:'textureWater',x:710,y:120,w:200},{icon:'textureWater',x:450,y:300,w:180},{icon:'textureWater',x:630,y:850,w:220},{icon:'textureWater',x:390,y:560,w:160},
   {icon:'lakeRound',x:730,y:520,w:140},{icon:'ship',x:950,y:180,w:90},{icon:'ship',x:630,y:720,w:110},{icon:'ship',x:420,y:430,w:80},
   {icon:'dock',x:890,y:380,w:70},{icon:'bridge',x:990,y:450,w:80},{icon:'bush',x:800,y:660,w:60},{icon:'rocks',x:450,y:830,w:90},{icon:'rocksTall',x:760,y:240,w:90},{icon:'treePine',x:920,y:560,w:70},{icon:'houses',x:630,y:530,w:70},
   // The far west is the great bay: the stone harbour and its approaches.
   {icon:'textureWater',x:300,y:520,w:190},{icon:'textureWater',x:120,y:820,w:170},{icon:'textureWater',x:260,y:140,w:150},
   {icon:'ship',x:330,y:420,w:100},{icon:'ship',x:120,y:560,w:80},{icon:'dock',x:300,y:250,w:70},
   {icon:'lakeRound',x:170,y:900,w:130},{icon:'rocks',x:60,y:420,w:80},{icon:'rocksTall',x:400,y:760,w:90},{icon:'bush',x:230,y:640,w:60}
  ]};

 g.HEXKEEP_MAPS=maps;g.HEXKEEP_LEVELS=levels;g.HEXKEEP_ATLAS=atlas;
 // Legacy alias: the first region is still the default battlefield.
 g.HEXKEEP_MAP=valley;
})(typeof window!=='undefined'?window:globalThis);
