'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;};
let reports=[],generated=0,saved=0,keep=true,scheduled=new Map(),serial=0;const records=new Map();
const ctx={console,Vue:{component:(n,o)=>o,extend:o=>o},getLocalStorage:(k,d)=>records.has(k)?JSON.parse(records.get(k)):d,setLocalStorage:(k,v)=>records.set(k,JSON.stringify(v)),generateFromList:()=>{generated++;return {question:'word',options:['1','2','3','4'],result:'2',questionIndex:7,action(){}};},getSetItems:()=>10,updateWeightForKey:(...args)=>reports.push(args),setTimeout:fn=>{scheduled.set(++serial,fn);return serial;},clearTimeout:id=>scheduled.delete(id),document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:false})};
vm.createContext(ctx);for(const file of ['games/hexkeep-map.js','games/hexkeep.js','themes.js','apps.js','worlds.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const H=ctx.HEXKEEP,M=ctx.HEXKEEP_MAP;
check(M.tiles.length===48,'full tiled battlefield');for(let i=1;i<M.path.length;i++)check(M.distance(M.path[i-1],M.path[i])===1,'continuous winding road');
check(Object.keys(H.types).join()==='guard,archer,mage,catapult,shipyard','five towers, two of which garrison a route instead of shooting it');
check(Object.keys(H.crew).join()==='guard,shipyard'&&H.crew.guard.route==='land'&&H.crew.shipyard.route==='water','the barracks garrisons the road and the shipyard the water lane');
// A pricier ranged tower always hits harder per second than a cheaper one at the same level.
for(let level=1;level<=3;level++){const ranged=['archer','mage','catapult'].sort((x,y)=>H.types[x].cost-H.types[y].cost),rate=t=>H.types[t].damage[level-1]/H.types[t].every;for(let i=1;i<ranged.length;i++)check(rate(ranged[i])>rate(ranged[i-1]),ranged[i]+' outdamages '+ranged[i-1]+' at level '+level);}
for(const t of Object.keys(H.types))check(H.types[t].damage.every((d,i)=>!i||d>H.types[t].damage[i-1]),t+' upgrades raise damage');
const MAPS=ctx.HEXKEEP_MAPS,LEVELS=ctx.HEXKEEP_LEVELS;
check(LEVELS.map(l=>l.id).join()==='valley,marsh,ridge,frost,ash,river,coast,harbour','eight regions, played in order');
check(LEVELS[0].map===M&&H.freshBattle().level==='valley','the first region is still the legacy battlefield');
check(LEVELS.every(l=>l.board===l.map.board)&&new Set(LEVELS.map(l=>l.board)).size===LEVELS.length,'each region paints its own board');
for(const level of LEVELS){const map=level.map,tag=level.id;
 check(map.tiles.length===48&&map.tiles.every((t,i)=>t.c===M.tiles[i].c&&t.r===M.tiles[i].r),tag+' reuses the shared hex grid, so one projection table places every sprite');
 for(let i=1;i<map.path.length;i++)check(map.distance(map.path[i-1],map.path[i])===1,tag+' road is continuous');
 check(new Set(map.path).size===map.path.length,tag+' road never revisits a hex');
 check(!map.path.includes(map.village)&&map.distance(map.path[map.path.length-1],map.village)===1,tag+' village sits beside the road end');
 check(map.sites.length===6&&new Set(map.sites.map(s=>s.tile)).size===6,tag+' offers six distinct plots');
 const routes=Object.keys(map.routes).map(key=>map.routes[key]);
 check(map.routes.land===map.path,tag+' the road is the land route');
 map.sites.forEach(s=>{check(!routes.some(route=>route.includes(s.tile))&&routes.some(route=>route.some(id=>map.distance(id,s.tile)<=1)),tag+' plot '+s.tile+' borders a route it can defend');
  // A garrison stands where its plot says: `rally` is a step on the road and
  // `lane` a step on the water. A plot declares one for every route it can
  // hold, and an island simply has no road to declare.
  const garrisons=[['rally','land'],['lane','water']].filter(([key])=>s[key]!==undefined);
  check(garrisons.length>0,tag+' plot '+s.tile+' declares at least one garrison station');
  garrisons.forEach(([key,name])=>{const line=map.routes[name];
   check(line&&line[s[key]]!==undefined&&map.distance(s.tile,line[s[key]])<=2,tag+' plot '+s.tile+' stations its '+name+' garrison on its own stretch');
   check(line.some(id=>map.distance(id,s.tile)<=1),tag+' plot '+s.tile+' touches the '+name+' route it garrisons');});});
 // Water is terrain, not decoration: the road stays dry, no plot is ever wet,
 // and a boat lane is continuous open water that also reaches the village.
 check([...map.water].every(id=>map.tiles[id].role==='water'),tag+' every wet hex is painted as water');
 check(!map.path.some(id=>map.water.has(id)),tag+' the road never enters the water');
 check(!map.sites.some(s=>map.water.has(s.tile)),tag+' no plot is built on water');
 if(map.lane){
  for(let i=1;i<map.lane.length;i++)check(map.distance(map.lane[i-1],map.lane[i])===1,tag+' boat lane is continuous');
  check(new Set(map.lane).size===map.lane.length,tag+' boat lane never revisits a hex');
  check(map.lane.every(id=>map.water.has(id)),tag+' the whole boat lane is open water');
  check(!map.lane.some(id=>map.path.includes(id)),tag+' road and lane never share a hex');
  check(!map.lane.includes(map.village)&&map.distance(map.lane[map.lane.length-1],map.village)===1,tag+' the lane lands beside the village');
  check(map.routes.water===map.lane,tag+' the lane is the water route');
 }else check(!map.routes.water,tag+' a dry region has no water route');
 // A straight river piece only tiles along one heading, so a bend in the chain would bake as broken water.
 const stream=map.tiles.filter(t=>['river','bridge'].includes(t.role)).map(t=>t.id).sort((a,c)=>a-c),headings=new Set();
 for(let i=1;i<stream.length;i++){const a=map.tiles[stream[i-1]],c=map.tiles[stream[i]];check(map.distance(a.id,c.id)===1,tag+' river is continuous');headings.add((c.c-a.c+(a.r%2?0:1))+'/'+(c.r-a.r));}
 check(headings.size<=1,tag+' river keeps a single heading');
 check(map.tiles.filter(t=>t.role==='bridge').length<=1&&map.path.filter(id=>map.tiles[id].role==='bridge').length===map.tiles.filter(t=>t.role==='bridge').length,tag+' crosses its water at most once, on the road');
 // The spawn point is extrapolated backwards from the first two hexes; the baked road stub has to meet it.
 const a=map.world(map.path[0]),c=map.world(map.path[1]),sz=2*a.z-c.z,sx=2*a.x-c.x;
 const r=Math.round((sz+4.33)/Math.sqrt(3)),col=Math.round((sx+7.5-(Math.abs(r)%2))/2);
 const stub=map.apron.find(t=>t.c===col&&t.r===r);
 check(stub&&stub.role==='road',tag+' attackers walk in on a painted road');
}
let b=H.freshBattle();check(b.supplies===0&&H.canStartRaid(b),'no free money or answer-count raid gate');check(!H.build(b,0,'guard'),'cannot buy without learning');
for(let i=0;i<12;i++)H.rewardAnswer(b);check(H.build(b,0,'guard')&&b.supplies===0,'answers buy a real guard');check(!H.build(b,0,'guard'),'occupied plot protected');
b.supplies=100;check(H.upgrade(b,0)&&H.upgrade(b,0)&&!H.upgrade(b,0),'three tower levels');check(b.guards.length===5,'guard upgrades add units');check(H.rally(b,0,11)&&!H.rally(b,0,0),'guard rally range');
for(const type of ['archer','mage','catapult']){b=H.freshBattle();b.supplies=100;H.build(b,2,type);b.spawned=H.targetCount(b);b.turn=5;b.enemies=[{id:100,step:8,hp:20,maxHp:20,armor:1}];const n=H.resolveTurn(b);check(n.enemies[0].hp<20&&n.shots[0].type===type,type+' fires damaging projectile');check(n.supplies===b.supplies,'combat never awards points');if(type==='mage')check(n.enemies[0].hp===17,'magic ignores armor');}
b=H.freshBattle();b.supplies=100;H.build(b,2,'catapult');b.spawned=H.targetCount(b);b.turn=5;b.enemies=[{id:100,step:8,hp:20},{id:101,step:9,hp:20}];check(H.resolveTurn(b).enemies.every(e=>e.hp<20),'catapult splash damages group');
b=H.freshBattle(10);b.supplies=100;H.build(b,0,'guard');b.spawned=H.targetCount(b);b.enemies=[{id:99,step:10,hp:107,maxHp:107,boss:true,armor:1}];check(H.resolveTurn(b).enemies[0].step===11,'boss cannot be blocked');b.enemies[0].step=12;check(H.resolveTurn(b).outcome==='defeat','boss reaching village loses raid regardless of remaining hearts');
// Squad capacity, stable pairings, gradual exchanges and bypassing enemies.
b=H.freshBattle();b.supplies=12;H.build(b,0,'guard');check(b.guards.length===3,'base barracks deploys three soldiers');b.spawned=H.targetCount(b);b.enemies=Array.from({length:4},(_,i)=>({id:100+i,step:10,hp:12,maxHp:12}));b=H.resolveTurn(b);const pairs=b.enemies.slice(0,3).map(e=>e.guardId);check(new Set(pairs).size===3&&pairs.every(Boolean),'three enemies each engage a different soldier');check(b.enemies.every(e=>e.hp===12)&&b.guards.every(g=>g.hp===5),'making contact does not instantly remove health');b=H.resolveTurn(b);check(b.enemies.slice(0,3).every((e,i)=>e.step===11&&e.guardId===pairs[i])&&b.enemies[3].step===12,'pairs stay in place while unblocked enemy passes');check(b.enemies[0].hp===11&&b.guards[0].hp===4,'both opponents take gradual melee damage');const hp=b.enemies[0].hp;b=H.resolveTurn(b);check(b.enemies[0].hp===hp,'melee cooldown between exchanges');b.guards[0].hp=0;b=H.resolveTurn(b);check(!b.enemies.find(e=>e.id===100).guardId,'defeated soldier releases opponent');
// Production keeps HP intact until the projectile/motion clock reaches contact.
b=H.freshBattle();b.supplies=100;H.build(b,2,'catapult');b.turn=5;b.spawned=H.targetCount(b);b.enemies=[{id:90,step:8,hp:20,maxHp:20},{id:91,step:9,hp:20,maxHp:20}];b=H.resolveTurn(b,true);check(b.enemies.every(e=>e.hp===20)&&b.shots.length===1,'catapult launch does not deal damage');H.applyImpacts(b,849);check(b.enemies.every(e=>e.hp===20),'stone in flight cannot hurt enemies');H.applyImpacts(b,850);check(b.enemies.every(e=>e.hp===20-H.types.catapult.damage[0]),'stone impact deals area damage');H.applyImpacts(b,1000);check(b.enemies.every(e=>e.hp===20-H.types.catapult.damage[0]),'impact cannot apply twice');
b=H.freshBattle();b.supplies=12;H.build(b,0,'guard');b.spawned=H.targetCount(b);b.enemies=[{id:90,step:10,hp:12,maxHp:12}];b=H.resolveTurn(b,true);H.applyImpacts(b,1100);b=H.resolveTurn(b,true);H.applyImpacts(b,439);check(b.enemies[0].hp===12&&b.guards[0].hp===5,'melee wind-up does no damage');H.applyImpacts(b,440);check(b.enemies[0].hp===11&&b.guards[0].hp===4,'melee contact applies damage to both opponents');
// A conservative upper bound: every tower may hit on every in-range cadence,
// guards may follow the boss without taking damage, and no projectiles are wasted.
// Multiple guards cannot actually hit simultaneously, making this an overestimate.
let dp=Array(200).fill(-Infinity);dp[0]=0;
for(let site=0;site<M.sites.length;site++){
 const choices=[{cost:0,damage:0}];for(const type of Object.keys(H.types)){
  // The valley is dry, so it can never take a shipyard; the bound only counts
  // what this plot could actually be sold.
  if(!H.placement(H.freshBattle(),site,type))continue;
  let cost=H.types[type].cost;
  for(let level=1;level<=3;level++){if(level>1)cost+=level===2?H.types[type].upgrade:H.types[type].master;let damage=0;
   // A boss always enters on an odd tick. Cover every alignment of the
   // two-tick magic and three-tick artillery cooldowns conservatively.
   for(const start of [1,3,5]){let candidate=0;for(let step=0;step<M.path.length;step++){
    const nearby=M.distance(M.sites[site].tile,M.path[step])<=H.range({type,level});
    if(H.crew[type]){if(nearby||step>0&&M.distance(M.sites[site].tile,M.path[step-1])<=H.range({type,level}))candidate+=level;continue;}
    if(!nearby||(start+step)%H.types[type].every)continue;
    const power=H.types[type].damage[level-1];candidate+=type==='mage'?power:Math.max(1,power-1);
   }damage=Math.max(damage,candidate);}
   choices.push({cost,damage});
  }
 }
 const next=Array(200).fill(-Infinity);for(let cost=0;cost<200;cost++)for(const c of choices)if(cost+c.cost<200)next[cost+c.cost]=Math.max(next[cost+c.cost],dp[cost]+c.damage);dp=next;
}
check(Math.max(...dp)===LEVELS[0].boss.hp-1,'all six-slot loadouts below 200 points cannot deal '+LEVELS[0].boss.hp+' boss damage, even with optimistic guard behavior');
// A practical complete campaign is possible for 240 correct answers.
b=H.freshBattle();const plan=[[0,'mage'],[0,'upgrade'],[2,'mage'],[2,'upgrade'],[2,'upgrade'],[5,'mage'],[5,'upgrade'],[3,'mage'],[3,'upgrade'],[1,'mage'],[1,'upgrade'],[4,'archer']];let purchase=0;
for(let wave=1;wave<=10;wave++){
 for(let i=0;i<24;i++)H.rewardAnswer(b);while(purchase<plan.length){const [i,t]=plan[purchase];if(!(t==='upgrade'?H.upgrade(b,i):H.build(b,i,t)))break;purchase++;}
 for(let tick=0;tick<120&&!b.outcome;tick++)b=H.resolveTurn(b);check(b.outcome===(wave===10?'victory':'cleared'),'earned defense wins wave '+wave);if(wave<10)H.prepareRaid(b,true);
}
check(b.earned===240&&b.supplies===0&&purchase===plan.length,'240 answers buy a winning defense without free funds');
const component=ctx.createHexkeepComponent({});
// The last raid of a region ending in victory is what marks the village and
// drops its battle state, exactly as the combat loop does it.
function win(g){g.battle.wave=g.level.waves;g.battle.enemies=[];g.battle.outcome='victory';g.phase='victory';g.winRegion();g.saveCampaign();}
function game(){let g=Object.assign({currentApp:{listName:'ADDITION',questionIndex:'question',resultIndex:'answer'},currentAppId:'6_0',score:0,theme:{colors:{}},$refs:{},$nextTick:fn=>fn(),shuffle:a=>a,reloadProgress:()=>keep,saveScore:()=>saved++},component.data());for(const [k,fn]of Object.entries(component.methods))g[k]=fn.bind(g);for(const [k,fn]of Object.entries(component.computed))Object.defineProperty(g,k,{get:()=>fn.call(g)});return g;}
let g=game();g.startGame();check(g.phase==='planning'&&generated===0,'village first, questions optional');g.openLearning();const q=g.question,options=g.options;g.answer(0);g.answer(0);check(reports.length===1&&g.phase==='retry'&&g.battle.supplies===0,'wrong input accepted once');g.retry();check(q===g.question&&options===g.options,'retry preserves exact question and options');g.answer(1);g.answer(1);check(reports.length===2&&g.battle.supplies===1&&g.battle.turn===0,'correct once pays without advancing time');check(g.answerTimer!==null,'correct schedules automatic next question');const nextQuestion=scheduled.get(g.answerTimer);scheduled.delete(g.answerTimer);nextQuestion();check(g.phase==='ready'&&generated===2,'short delay automatically generates next question');
g.returnToVillage();g.startRaid();check(scheduled.size===1,'autonomous raid owns one timer');const tick=scheduled.get(g.turnTimer);g.openLearning();tick();check(g.battle.turn===0&&scheduled.size===0,'question cancels and invalidates raid timer');g.returnToVillage();const live=scheduled.get(g.turnTimer);scheduled.delete(g.turnTimer);live();check(g.battle.turn===1&&g.battle.supplies===1,'automatic movement without free currency');g.openLearning();g.answer(1);const pending=scheduled.get(g.answerTimer);g.returnToVillage();pending();check(g.phase==='combat','leaving feedback cancels automatic next question');component.beforeDestroy.call(g);check(!scheduled.size,'destruction cancels both timers');
g=game();g.restoreCampaign();check(g.phase==='paused'&&g.battle.turn===1,'saved combat waits for explicit resume');g=game();g.startGame();g.openLearning();keep=false;g.answer(1);check(g.phase==='completed'&&g.battle.earned===1&&scheduled.size===0,'engine completion persists reward without next question timer');keep=true;
records.set('6_0_HexkeepCampaign_v5','null');records.set('6_0_HexkeepCampaign_v4','null');records.set('6_0_HexkeepCampaign_v3','null');records.set('6_0_HexkeepCampaign_v2',JSON.stringify({version:2,active:false,battle:{...H.freshBattle(),supplies:3,buildings:[{type:'windmill',level:2},null,null,null,null,null]}}));g=game();g.restoreCampaign();check(g.battle.supplies===33&&!g.battle.buildings[0],'old noncombat tower purchases refunded in migration');check(g.battle.level==='valley'&&g.saves.valley,'a single-region save migrates into the first region slot');
check(component.data().debugAvailable===false&&component.data().debugMode===false,'debug mode stays off unless the page URL asks for it');
vm.runInContext('globalThis.themes=themeOptions;globalThis.legacyApps=apps',ctx);for(const [key,p]of Object.entries(ctx.themes))check(H.themeKit(p)['--hk-primary'],key+' theme');check(ctx.legacyApps.items.at(-1).items[0].appType==='hexkeep','legacy registration stable');check(ctx.resolveAdventureApp('adv-hexkeep-1').appType==='hexkeep','Adventure registration stable');
// --- the newer regions: their own attackers, their own price ---
// Fast attackers cover two hexes a tick, so towers get fewer shots at them,
// but a soldier standing anywhere inside that stride still catches them.
b=H.freshBattle(1,'marsh');b.spawned=H.targetCount(b);
const runner=()=>[{id:200,step:2,hp:9,maxHp:9,armor:0,speed:2,kind:'runner'}];
b.enemies=runner();check(H.resolveTurn(b).enemies[0].step===4,'a runner covers two hexes per tick');
b.supplies=12;check(H.build(b,0,'guard'),'marsh plot accepts a barracks');
b.guards.forEach(g=>g.step=4);b.enemies=runner();let fast=H.resolveTurn(b);
check(fast.enemies[0].step===4&&!!fast.enemies[0].guardId,'a soldier inside the stride still stops a runner');
b.guards.forEach(g=>g.step=5);b.enemies=runner();
check(H.resolveTurn(b).enemies[0].step===4&&!H.resolveTurn(b).enemies[0].guardId,'a soldier beyond the stride is outrun');
// Heavy armour blunts arrows and stone down to the one-damage floor; magic still lands in full.
b=H.freshBattle(5,'marsh');b.supplies=100;H.build(b,0,'archer');H.upgrade(b,0);H.upgrade(b,0);b.spawned=H.targetCount(b);b.turn=5;
b.enemies=[{id:210,step:2,hp:20,maxHp:20,armor:2,kind:'brute'}];
check(H.resolveTurn(b).enemies[0].hp===19,'heavy armour soaks a mastered arrow down to one');
b=H.freshBattle(5,'marsh');b.supplies=100;H.build(b,0,'mage');b.spawned=H.targetCount(b);b.turn=5;
b.enemies=[{id:210,step:2,hp:20,maxHp:20,armor:2,kind:'brute'}];
check(H.resolveTurn(b).enemies[0].hp===17,'magic ignores heavy armour');
// The ridge caster mends its escort but never itself, so killing it first still pays.
b=H.freshBattle(3,'ridge');b.spawned=H.targetCount(b);b.turn=2;
b.enemies=[{id:220,step:5,hp:4,maxHp:9,armor:0,heal:1,kind:'shaman'},{id:221,step:5,hp:6,maxHp:12,armor:2,kind:'brute'},{id:222,step:0,hp:6,maxHp:12,armor:2,kind:'brute'}];
const mended=H.resolveTurn(b).enemies;
check(mended.find(e=>e.id===221).hp===7,'the caster mends a neighbour');
check(mended.find(e=>e.id===220).hp===4,'the caster never mends itself');
check(mended.find(e=>e.id===222).hp===6,'an attacker further down the road gets nothing');
// Shields spend one charge per landed projectile, whatever its power, and never
// stop a soldier's blade.
b=H.freshBattle(3,'frost');b.supplies=100;H.build(b,0,'mage');b.spawned=H.targetCount(b);b.turn=5;
b.enemies=[{id:230,step:2,hp:9,maxHp:9,armor:1,shield:2,kind:'knight'}];
let shielded=H.resolveTurn(b).enemies[0];check(shielded.shield===1&&shielded.hp===9,'a shield swallows a whole bolt of magic');
b=H.freshBattle(3,'frost');b.supplies=100;H.build(b,0,'archer');b.spawned=H.targetCount(b);b.turn=5;
b.enemies=[{id:230,step:2,hp:9,maxHp:9,armor:1,shield:1,kind:'knight'}];
b=H.resolveTurn(b);check(b.enemies[0].shield===0&&b.enemies[0].hp===9,'an arrow breaks the last charge');
check(H.resolveTurn(b).enemies[0].hp===8,'once broken, arrows wound again');
b=H.freshBattle(3,'frost');b.supplies=12;H.build(b,0,'guard');b.spawned=H.targetCount(b);
b.guards.forEach(g=>g.step=3);b.enemies=[{id:231,step:3,hp:9,maxHp:9,armor:1,shield:3,kind:'knight'}];
for(let i=0;i<3;i++)b=H.resolveTurn(b);
check(b.enemies[0].hp<9&&b.enemies[0].shield===3,'soldiers cut through without touching the shield');
// Summoners raise extra skeletons on their beat, capped per caster; the raised
// dead must fall before the raid ends but never count toward the raid tally.
b=H.freshBattle(4,'ash');b.spawned=H.targetCount(b);b.turn=2;
b.enemies=[{id:240,step:3,hp:40,maxHp:40,armor:0,kind:'warlock',summon:{every:3,max:2},summoned:0}];
let raised=H.resolveTurn(b);check(raised.enemies.length===2&&raised.enemies[1].raised&&raised.enemies[1].step===raised.enemies[0].step,'a summoner raises a skeleton at its side');
for(let i=0;i<6;i++)raised=H.resolveTurn(raised);
check(raised.enemies.filter(e=>e.raised).length===2,'a summoner stops at its cap');
raised.enemies.forEach(e=>e.hp=0);raised=H.resolveTurn(raised);
check(raised.kills===1&&raised.outcome==='cleared','the raised dead are not counted as raid kills');
// --- the water regions: two routes over one board ---
// A region with boats has a second route. Nothing ever crosses between them:
// walkers keep to the road, boats keep to the lane.
check(H.routeOf({kind:'skiff'})==='water'&&H.routeOf({kind:'warship'})==='water','both new attackers are boats');
check(['raider','runner','brute','shaman','knight','warlock'].every(kind=>H.routeOf({kind})==='land'),'every attacker the player already knows still walks');
check(H.pathOf(MAPS.river,{kind:'skiff'})===MAPS.river.lane&&H.pathOf(MAPS.river,{kind:'brute'})===MAPS.river.path,'each attacker is placed along its own route');
check(H.pathOf(MAPS.valley,{kind:'skiff'})===MAPS.valley.path,'a dry region has nowhere to sail, so there is only the road');
// Towers are land structures: a wet plot cannot be built on at any price.
b=H.freshBattle(1,'coast');b.supplies=200;
check(H.placement(b,0,'archer'),'a shore battery that watches the lane is buildable');
MAPS.coast.water.add(MAPS.coast.sites[0].tile);
check(!H.placement(b,0,'archer')&&!H.available(b,0,'archer')&&!H.build(b,0,'archer'),'a plot under water cannot be built on');
MAPS.coast.water.delete(MAPS.coast.sites[0].tile);
check(H.build(b,0,'archer'),'the same plot builds again once it is dry');
// Soldiers hold the road; the lane is simply out of their reach.
b=H.freshBattle(1,'river');b.supplies=12;H.build(b,0,'guard');b.spawned=H.targetCount(b);
b.guards.forEach(g=>g.step=4);
b.enemies=[{id:300,step:3,hp:20,maxHp:20,armor:0,speed:1,route:'water',kind:'skiff'}];
let afloat=H.resolveTurn(b);
check(afloat.enemies[0].step===4&&!afloat.enemies[0].guardId&&afloat.guards.every(g=>g.hp===5),'a boat sails straight past the guard line without a fight');
b.enemies=[{id:301,step:3,hp:20,maxHp:20,armor:0,speed:1,kind:'brute'}];
check(H.resolveTurn(b).enemies[0].guardId,'a walker standing on the same step is still blocked');
// A stone dropped in the lane never scatters onto the road beside it.
b=H.freshBattle(1,'river');b.supplies=100;H.build(b,2,'catapult');b.turn=2;b.spawned=H.targetCount(b);
b.enemies=[{id:310,step:6,hp:40,maxHp:40,armor:0,route:'water',kind:'skiff'},{id:311,step:5,hp:40,maxHp:40,armor:0,kind:'brute'}];
let split=H.resolveTurn(b);
check(split.shots.length===1&&split.shots[0].route==='water','the battery fires along the lane at the leading boat');
check(split.enemies.find(e=>e.id===310).hp<40&&split.enemies.find(e=>e.id===311).hp===40,'the splash stays on the lane and never reaches the road');
// A raiding boat gathers way while nothing touches it, and any wound that
// lands drops it back to a crawl. That is what makes rate of fire matter.
b=H.freshBattle(1,'river');b.spawned=H.targetCount(b);
b.enemies=[{id:320,step:0,hp:60,maxHp:60,armor:0,speed:1,surge:3,route:'water',kind:'skiff',hurt:false}];
let loose=H.resolveTurn(b);check(loose.enemies[0].speed===2&&loose.enemies[0].step===2,'an untouched raider boat gathers way');
loose=H.resolveTurn(loose);check(loose.enemies[0].speed===3&&loose.enemies[0].step===5,'it keeps gathering up to its own limit');
loose=H.resolveTurn(loose);check(loose.enemies[0].speed===3,'and never past it');
loose.enemies[0].hurt=true;loose=H.resolveTurn(loose);
check(loose.enemies[0].speed===1&&!loose.enemies[0].hurt,'a wound that lands drops it back to a crawl');
// The counter is a rate of fire, not a damage number: arrows land on every
// beat and pin the boat, magic fires every other beat and lets it run.
function boatRun(type){let run=H.freshBattle(6,'river');run.supplies=200;H.build(run,2,type);H.upgrade(run,2);H.upgrade(run,2);run.spawned=H.targetCount(run);
 run.enemies=[{id:330,step:0,hp:400,maxHp:400,armor:0,speed:1,surge:3,route:'water',kind:'skiff',hurt:false}];
 for(let i=0;i<5;i++)run=H.resolveTurn(run);return run.enemies[0].step;}
check(boatRun('archer')<boatRun('mage'),'steady arrows pin a raider boat that slower magic lets run');
// An ironclad plates every boat beside it, never itself, and sinking it strips
// the escort at once. Magic ignores the plate; arrows are floored by it.
const escort=()=>[{id:340,step:4,hp:30,maxHp:30,armor:3,plate:2,route:'water',kind:'warship'},{id:341,step:4,hp:30,maxHp:30,armor:0,route:'water',kind:'skiff'}];
b=H.freshBattle(3,'coast');b.spawned=H.targetCount(b);b.enemies=escort();
check(H.armorOf(b,b.enemies[1])===2&&H.armorOf(b,b.enemies[0])===3,'the ironclad plates its escort but never itself');
b.enemies[0].hp=0;check(H.armorOf(b,b.enemies[1])===0,'sinking the ironclad strips the plating at once');
b.enemies=escort();b.enemies[1].step=6;
check(H.armorOf(b,b.enemies[1])===0,'a boat further down the lane sails outside the plating');
function seaHit(type,plated){let run=H.freshBattle(3,'coast');run.supplies=200;H.build(run,4,type);H.upgrade(run,4);H.upgrade(run,4);run.turn=7;run.spawned=H.targetCount(run);
 run.enemies=[{id:350,step:7,hp:90,maxHp:90,armor:0,route:'water',kind:'skiff'}];
 if(plated)run.enemies.push({id:351,step:7,hp:90,maxHp:90,armor:3,plate:2,route:'water',kind:'warship'});
 return 90-H.resolveTurn(run).enemies.find(e=>e.id===350).hp;}
check(seaHit('archer',false)===3&&seaHit('archer',true)===1,'an escorted boat floors a mastered arrow to one');
check(seaHit('mage',false)===8&&seaHit('mage',true)===8,'magic ignores the plate entirely, which is what makes the pair of towers the answer');
// Every region closes with its own commander, and none of them can be held in melee.
for(const level of LEVELS){
 b=H.freshBattle(level.waves,level.id);b.supplies=12;H.build(b,0,'guard');b.spawned=H.targetCount(b)-1;
 b=H.resolveTurn(b);const chief=b.enemies.find(e=>e.boss);
 check(chief&&chief.hp===level.boss.hp&&chief.kind===level.boss.kind,level.id+' final raid summons its own commander');
 const before=chief.step;b=H.resolveTurn(b);
 check(b.enemies.find(e=>e.boss).step>before,level.id+' commander cannot be blocked');
 check(LEVELS.filter(l=>l.boss.kind===level.boss.kind||l.boss.hp===level.boss.hp).length===1||level.id==='valley','commanders differ between regions');
}
// The same all-magic ladder that clears the valley for 240 answers is not
// enough further out: the marsh asks 320 and the ridge 400.
function ladderOf(types){const steps=types.map((type,site)=>[site,type]).filter(step=>step[1]);
 for(let round=0;round<2;round++)types.forEach((type,site)=>{if(type)steps.push([site,'upgrade']);});return steps;}
// The harbour is the one region where build order matters as much as the mix:
// the shore plots barely see the bay, so a ladder there is written out in the
// order it is meant to be bought rather than by plot number.
function ladderIn(order){const steps=order.slice();for(let round=0;round<2;round++)order.forEach(([site])=>steps.push([site,'upgrade']));return steps;}
const allMagic=ladderOf(Array(6).fill('mage')),mixed=ladderOf(['archer','mage','archer','mage','archer','mage']);
const allArrows=ladderOf(Array(6).fill('archer')),allStones=ladderOf(Array(6).fill('catapult'));
// The coast plots are ordered island battery, cove, square, ridge, bay, breakwater:
// magic goes on the three that actually see the shipping lane.
const seaMix=ladderOf(['mage','archer','mage','archer','mage','mage']);
// Harbour plots are: 0 pier head, 1 warehouses, 2 bay gate (all shore),
// 3/4/5 the three islands, which are the only berths a shipyard can use.
// Plot 4 is Mast Rock, the island the lane bends around twice, so a blockade
// berthed there is the one that holds the bay.
const harbourFleet=ladderIn([[4,'shipyard'],[3,'mage'],[5,'mage'],[2,'mage'],[1,'archer'],[0,'archer']]);
const harbourGuns=ladderIn([[4,'mage'],[3,'mage'],[5,'mage'],[2,'mage'],[1,'archer'],[0,'archer']]);
const harbourBlockade=ladderIn([[4,'shipyard'],[3,'shipyard'],[5,'shipyard'],[2,'mage'],[1,'archer'],[0,'archer']]);
function ladderWins(id,perWave,ladder=allMagic){let run=H.freshBattle(1,id),bought=0;const waves=H.levelOf({level:id}).waves;
 for(let wave=1;wave<=waves;wave++){for(let i=0;i<perWave;i++)H.rewardAnswer(run);
  while(bought<ladder.length){const [site,move]=ladder[bought];if(!(move==='upgrade'?H.upgrade(run,site):H.build(run,site,move)))break;bought++;}
  for(let tick=0;tick<300&&!run.outcome;tick++)run=H.resolveTurn(run);
  if(!['cleared','victory'].includes(run.outcome))return false;if(wave<waves)H.prepareRaid(run,true);}
 return run.outcome==='victory';}
for(const [id,perWave,ladder,plan] of [['valley',24,allMagic,'magic'],['marsh',32,allMagic,'magic'],['ridge',40,allMagic,'magic'],['frost',32,mixed,'archer-and-magic'],['ash',40,allMagic,'magic'],['river',36,mixed,'archer-and-magic'],['coast',52,seaMix,'magic-on-the-batteries'],['harbour',36,harbourFleet,'a-shipyard-and-guns']]){
 check(ladderWins(id,perWave,ladder),id+' is winnable for '+perWave*10+' correct answers with a '+plan+' defence');
 check(!ladderWins(id,perWave-4,ladder),id+' still resists '+(perWave-4)*10+' correct answers');
}
check(!ladderWins('frost',32,allMagic),'on the frost pass shields punish an all-magic defence that mixed towers beat for the same answers');
// The two water regions ask for the same kind of answer as the frost pass, for
// their own reasons: a surging boat needs fire on every beat, and an ironclad
// needs something that ignores armour.
check(!ladderWins('river',36,allStones),'on the river artillery alone never lands enough beats to pin a surging raider boat');
check(!ladderWins('river',36,allMagic),'on the river a magic-only line fires too slowly to keep the raider boats at a crawl');
check(!ladderWins('river',36,allArrows),'on the river arrows alone cannot crack the heavy escorts walking the bank');
check(!ladderWins('coast',52,allMagic),'in the storm bay surging raider boats slip past a magic-only line that the mixed batteries pin for the same answers');
check(!ladderWins('coast',56,allArrows),'in the storm bay ironclad plating floors every arrow, so an arrow-only line never clears it');
// The harbour is the region built around the shipyard: a fleet of our own is
// what holds the bay, and the guns behind it are what sink the black ship.
check(!ladderWins('harbour',36,harbourGuns),'in the harbour the same six plots without a shipyard cannot hold the bay for the answers a blockade holds it with');
check(ladderWins('harbour',56,harbourGuns),'those island guns do hold it once the player pays half as many answers again');
check(!ladderWins('harbour',72,harbourBlockade),'a blockade with no guns behind it never clears the harbour at any price, because the black ship rakes the boats and sails on');
check(!ladderWins('harbour',72,allArrows),'plated warships floor every arrow in the harbour too');
// --- travelling between regions ---
for(const key of ['_v5','_v4','_v3','_v2'])records.delete('6_0_HexkeepCampaign'+key);
g=game();g.restoreCampaign();g.startGame();
check(g.battle.level==='valley'&&!g.cleared.length,'a new campaign starts in the first region');
check(g.regionOpen(0)&&!g.regionOpen(1)&&!g.regionOpen(2),'later regions start locked');
g.openRegions();check(g.phase==='levels','the region list opens from the village');
g.chooseRegion('marsh');check(g.battle.level==='valley'&&g.phase==='levels','a locked region cannot be entered');
g.closeRegions();check(g.phase==='planning','the region list closes back to the village');
win(g);check(g.cleared.join()==='valley'&&g.phase==='victory','winning the last raid marks the village on the journey map at once');
check(!g.saves.valley,'winning drops the region battle state, so nothing finished is left to reopen');
g.continueJourney();check(g.phase==='levels','the victory card walks on to the journey map');
check(g.regionOpen(1)&&!g.regionOpen(2),'only the very next region unlocks');
g.chooseRegion('marsh');
check(g.battle.level==='marsh'&&g.battle.wave===1&&!g.battle.supplies&&g.phase==='planning','entering a region starts its own ten-raid campaign');
check(g.map===MAPS.marsh&&g.level.id==='marsh'&&g.level.board==='marsh.png','the board and the artwork follow the chosen region');
g.battle.supplies=40;H.build(g.battle,0,'archer');g.saveCampaign();
g.openRegions();g.chooseRegion('valley');check(g.battle.level==='valley'&&!g.battle.buildings.some(Boolean),'the first region keeps its own empty board');
g.openRegions();g.chooseRegion('marsh');check(g.battle.buildings[0]&&g.battle.buildings[0].type==='archer','the marsh keeps the tower bought there');
const reloaded=game();reloaded.restoreCampaign();
check(reloaded.battle.level==='marsh'&&reloaded.cleared.join()==='valley'&&reloaded.battle.buildings[0].type==='archer','region, unlocks and towers survive a reload');
check(LEVELS.every(l=>fs.existsSync('assets/hexkeep/'+l.board)),'every region has a baked board image');
// --- the journey map between regions ---
const ATLAS=ctx.HEXKEEP_ATLAS;
check(LEVELS.every(l=>ATLAS.nodes[l.id])&&ATLAS.roads.length===LEVELS.length-1,'every region sits on the journey map, joined by one road each');
check([...LEVELS.map(l=>ATLAS.nodes[l.id].icon),...ATLAS.scenery.map(p=>p.icon),'flag'].every(i=>fs.existsSync('assets/hexkeep/atlas/'+i+'.png'))&&fs.existsSync('assets/hexkeep/atlas/parchment.jpg'),'every map icon ships locally');
for(const key of ['_v5','_v4','_v3','_v2'])records.delete('6_0_HexkeepCampaign'+key);
g=game();g.restoreCampaign();g.startGame();g.openRegions();
check(g.phase==='levels'&&g.atlasPick==='valley'&&!g.atlasFresh,'the map opens on the current village');
g.pickRegion('marsh');check(g.atlasPick==='valley','a locked village cannot be picked');
g.travel();check(g.phase==='planning'&&g.battle.level==='valley','travelling to the current village returns to it');
win(g);g.continueJourney();
check(g.phase==='levels'&&g.atlasFresh==='marsh'&&g.atlasPick==='marsh','winning shows the map with the road to the next village');
let onMap=game();onMap.restoreCampaign();
check(onMap.phase==='levels'&&onMap.atlasFresh==='marsh'&&onMap.battle.level==='valley','closing on the map reopens on the map');
onMap.travel();check(onMap.phase==='planning'&&onMap.battle.level==='marsh','the map card walks into the next village');
onMap=game();onMap.restoreCampaign();check(onMap.phase==='planning'&&onMap.battle.level==='marsh','reopening mid-village lands straight in the village');
// --- debug mode: its own save, unlimited points, every village open ---
const realSave=records.get('6_0_HexkeepCampaign_v5');
g=game();g.debugAvailable=true;g.debugMode=true;g.restoreCampaign();
check(g.phase==='planning'&&g.battle.supplies>=9999&&LEVELS.every((l,i)=>g.regionOpen(i)),'debug starts in a village with many points and every village open');
g.debugAtlas();check(g.phase==='levels','the debug button opens the map');
g.pickRegion('ash');g.travel();check(g.battle.level==='ash'&&g.battle.supplies>=9999,'debug travels straight to any village, stocked with points');
g.debugWin();check(g.phase==='victory'&&g.battle.outcome==='victory'&&g.cleared.includes('ash'),'debug wins the current region on demand');
g.continueJourney();check(g.phase==='levels'&&g.cleared.includes('ash'),'the last region also returns to the map in debug');
check(records.get('6_0_HexkeepCampaign_v5')===realSave&&records.has('6_0_HexkeepDebug_v5'),'debug never writes the real campaign');
g.closeRegions();g.debugJump('river');
check(g.battle.level==='river'&&g.battle.supplies>=9999,'the debug shortcut jumps straight into the river village');
g.debugJump('coast');check(g.battle.level==='coast'&&g.battle.supplies>=9999,'and straight into the storm bay');
g.toggleDebug();check(!g.debugMode&&g.battle.level==='marsh'&&g.battle.supplies<9999,'turning debug off restores the real campaign');
g=game();g.toggleDebug();check(!g.debugMode,'debug cannot be switched on without the URL flag');

// --- the harbour shipyard: a blockade of our own on the water ---
const HM=MAPS.harbour;
const island=HM.sites.findIndex(site=>site.rally===undefined),shore=HM.sites.findIndex(site=>site.lane===undefined);
check(island>=0&&shore>=0,'the harbour has both island berths and shore plots');
b=H.freshBattle(1,'harbour');b.supplies=400;
check(!H.placement(b,island,'guard')&&H.placement(b,island,'shipyard'),'an island has no road to garrison, only a lane to patrol');
check(H.placement(b,shore,'guard')&&!H.placement(b,shore,'shipyard'),'a plot away from the water garrisons the road and nothing else');
check(!H.placement(H.freshBattle(1,'valley'),0,'shipyard'),'a dry region has no lane at all, so it never offers a shipyard');
check(H.build(b,island,'shipyard'),'the island berth takes a shipyard');
check(b.guards.length===2&&b.guards.every(g=>g.route==='water'),'a new shipyard launches two patrol boats onto the lane');
check(b.guards.every(g=>g.step===HM.sites[island].lane),'the patrol boats take the station the plot declares on the lane');
check(H.upgrade(b,island)&&b.guards.length===3,'upgrading the shipyard launches another boat');
check(H.stationStep(HM,island,'shipyard')===HM.sites[island].lane&&H.stationStep(HM,island,'guard')===null,'a plot only ever stations the garrison it can actually hold');
// A patrol boat holds a raider on the water. A crew can only ever stand in the
// way of its own route, which is what keeps the two blockades separate.
b=H.freshBattle(1,'harbour');b.supplies=400;H.build(b,island,'shipyard');b.spawned=H.targetCount(b);
const berth=b.guards[0].step;
b.enemies=[{id:400,step:berth-1,hp:30,maxHp:30,armor:0,speed:1,route:'water',kind:'skiff'}];
let held=H.resolveTurn(b);
check(held.enemies[0].step===berth&&!!held.enemies[0].guardId,'a patrol boat stops a raider boat on the lane');
held=H.resolveTurn(held);
check(held.enemies[0].step===berth&&held.enemies[0].hp<30&&held.guards.some(g=>g.hp<g.maxHp),'the two of them fight where they met, and both take damage');
b.enemies=[{id:401,step:berth-1,hp:30,maxHp:30,armor:0,speed:1,kind:'raider'}];
check(!H.resolveTurn(b).enemies[0].guardId,'a patrol boat can never reach a walker on the road');
// A garrison hits for its own tower's damage entry, so a shipyard is worth
// more in a duel than a barracks even though both block the same way.
check(H.types.shipyard.damage[0]>H.types.guard.damage[0],'a patrol boat hits harder than a single soldier');
b=H.freshBattle(1,'harbour');b.supplies=400;H.build(b,island,'shipyard');b.spawned=H.targetCount(b);
b.enemies=[{id:402,step:b.guards[0].step,hp:40,maxHp:40,armor:0,speed:1,route:'water',kind:'skiff'}];
b=H.resolveTurn(b);const exchange=H.resolveTurn(b,true).impacts.find(hit=>hit.kind==='melee');
check(exchange&&exchange.damage===H.types.shipyard.damage[0],'the exchange lands the shipyard damage entry, not the tower level');
// A blockade is not only a wall: every patrol boat carries a gun and fires it
// from where it floats, at whatever is closest to the village in its reach.
b=H.freshBattle(1,'harbour');b.supplies=400;H.build(b,island,'shipyard');b.spawned=H.targetCount(b);
const gun=H.crew.shipyard.cannon,anchored=b.guards[0].step;
check(gun&&gun.range>1&&!H.crew.guard.cannon,'the patrol boats carry a gun that reaches past their own hex, and the soldiers carry none');
b.enemies=[{id:403,step:anchored-2,hp:40,maxHp:40,armor:0,speed:1,route:'water',kind:'skiff'}];
b.turn=1;let volley=H.resolveTurn(b,true);
check(volley.shots.length===b.guards.length&&volley.shots.every(shot=>shot.type==='cannon'),'every living patrol boat fires on its own beat');
check(volley.shots.every(shot=>shot.fromStep===anchored&&shot.fromRoute==='water'),'the ball leaves the boat that fired it, not the shipyard');
check(volley.impacts.filter(hit=>hit.type==='cannon').every(hit=>hit.damage===gun.damage[0]),'a ball lands the cannon entry for the shipyard level');
const before=volley.enemies[0].hp;H.applyImpacts(volley,520);
check(volley.enemies[0].hp===before-b.guards.length*gun.damage[0],'the balls wound the ship they were aimed at');
// The guns stay on the water: a walker on the road is never a target.
b=H.freshBattle(1,'harbour');b.supplies=400;H.build(b,island,'shipyard');b.spawned=H.targetCount(b);
b.enemies=[{id:404,step:b.guards[0].step,hp:40,maxHp:40,armor:0,speed:1,kind:'raider'}];b.turn=1;
check(H.resolveTurn(b,true).shots.length===0,'a patrol boat never fires at the road');
// The black ship answers a blockade with its guns, so boats alone never hold
// it: it rakes every patrol boat beside it and sails on regardless.
b=H.freshBattle(1,'harbour');b.supplies=400;H.build(b,island,'shipyard');b.spawned=H.targetCount(b);b.turn=1;
b.enemies=[{id:410,step:b.guards[0].step,hp:90,maxHp:90,armor:2,route:'water',kind:'manowar',broadside:{every:2,damage:6},boss:true}];
const crewBefore=b.guards.map(g=>g.hp),shipBefore=b.enemies[0].step;
let raked=H.resolveTurn(b);
check(raked.guards.every((g,i)=>g.hp<crewBefore[i]),'the black ship rakes every patrol boat beside it');
check(raked.enemies[0].step>shipBefore,'and sails straight on, because a commander is never blocked');
b=H.freshBattle(1,'harbour');b.supplies=400;H.build(b,island,'shipyard');b.spawned=H.targetCount(b);b.turn=1;
b.enemies=[{id:411,step:b.guards[0].step,hp:90,maxHp:90,armor:2,kind:'raider',broadside:{every:2,damage:6}}];
check(H.resolveTurn(b).guards.every((g,i)=>g.hp===b.guards[i].hp),'guns fired from the road never reach the patrol boats');

// --- replaying a village without touching the journey ---
for(const key of ['_v5','_v4','_v3','_v2'])records.delete('6_0_HexkeepCampaign'+key);
g=game();g.restoreCampaign();g.startGame();
g.battle.supplies=40;H.build(g.battle,0,'archer');g.battle.wave=4;g.saveCampaign();
check(g.runInProgress&&g.canRestart,'a village with a tower and four raids behind it can be started over');
let resumed=game();resumed.restoreCampaign();
check(resumed.battle.wave===4&&resumed.battle.buildings[0].type==='archer'&&resumed.phase==='planning','re-entering a village in progress resumes exactly where it was left');
check(resumed.regionSaved('valley')&&resumed.regionStatus(0).includes('להמשיך'),'the journey card offers to continue a village that is mid-run');
resumed.restartRegion();
check(resumed.battle.wave===1&&!resumed.battle.buildings.some(Boolean)&&!resumed.battle.supplies,'start over rewinds the village to wave 1 with its own starting board');
check(!resumed.canRestart,'a village back at its start has nothing left to start over');
g=game();g.restoreCampaign();g.startGame();win(g);
check(g.cleared.includes('valley')&&!g.saves.valley,'winning marks the village on the journey map and drops its battle state');
check(!JSON.parse(records.get('6_0_HexkeepCampaign_v5')).levels.valley,'the finished raid is not written back to storage either');
g.playAgain();
check(g.phase==='planning'&&g.battle.level==='valley'&&g.battle.wave===1&&!g.battle.buildings.some(Boolean)&&!g.battle.supplies,'play again starts the same village again from wave 1');
check(g.cleared.includes('valley')&&g.regionOpen(1),'a replay never takes the village or the road it opened back');
let replayed=game();replayed.restoreCampaign();
check(replayed.battle.level==='valley'&&replayed.battle.wave===1&&replayed.cleared.includes('valley'),'the replay is what survives a reload, with the village still won');
// Losing a replay costs the raid, never the village.
replayed.battle.supplies=40;H.build(replayed.battle,0,'archer');replayed.battle.wave=3;
replayed.battle.outcome='defeat';replayed.phase='defeat';replayed.saveCampaign();
check(replayed.cleared.includes('valley')&&replayed.regionOpen(1),'a lost replay leaves the village won and the next one open');
replayed.nextWatch();
check(replayed.phase==='planning'&&replayed.battle.wave===3&&replayed.cleared.includes('valley'),'the same raid is set up again with nothing taken away');
let afterLoss=game();afterLoss.restoreCampaign();
check(afterLoss.cleared.includes('valley')&&afterLoss.regionOpen(1)&&afterLoss.battle.wave===3,'quitting in the middle of a replay keeps every village already won');
afterLoss.openRegions();afterLoss.chooseRegion('marsh');
check(afterLoss.battle.level==='marsh'&&afterLoss.cleared.includes('valley'),'walking out of a replay keeps the village won');
afterLoss.openRegions();afterLoss.chooseRegion('valley');
check(afterLoss.battle.wave===3&&afterLoss.battle.buildings[0].type==='archer','and the replay itself is still waiting where it was left');
// A v4 save parked a won region on its finished final raid. v5 reads that as
// journey progress, so the village is completed and starts over.
for(const key of ['_v5','_v4','_v3','_v2'])records.delete('6_0_HexkeepCampaign'+key);
const finished={...H.freshBattle(LEVELS[0].waves,'valley'),supplies:9,outcome:'victory'};
finished.buildings=finished.buildings.map((v,i)=>i?v:{type:'mage',level:3,rally:0});
records.set('6_0_HexkeepCampaign_v4',JSON.stringify({version:4,current:'valley',cleared:['valley'],opening:false,atlas:null,
 levels:{valley:{battle:finished,active:false,movement:{elapsed:0,walkTime:0}},marsh:{battle:{...H.freshBattle(3,'marsh'),supplies:5},active:false,movement:{elapsed:0,walkTime:0}}}}));
g=game();g.restoreCampaign();
check(g.cleared.join()==='valley'&&!g.saves.valley,'a v4 region saved in its finished state migrates to a completed village with no battle state');
check(g.phase==='levels'&&g.atlasPick==='marsh','and that save reopens on the journey map beside the next village');
g.chooseRegion('valley');
check(g.battle.level==='valley'&&g.battle.wave===1&&!g.battle.buildings.some(Boolean)&&!g.battle.supplies,'entering the migrated village starts a fresh run from wave 1');
g.openRegions();g.chooseRegion('marsh');
check(g.battle.wave===3&&g.battle.supplies===5,'a v4 region still in progress keeps its saved raid through the migration');
check(JSON.parse(records.get('6_0_HexkeepCampaign_v5')).version===5,'the migrated campaign is written back at the new version');

const walkFile=fs.readFileSync('assets/hexkeep/walk.js','utf8'),walkMeta=JSON.parse(walkFile.slice(walkFile.indexOf('{'),walkFile.lastIndexOf('}')+1)),skin=fs.readFileSync('games/hexkeep.css','utf8');
const kinds=new Set();for(const level of LEVELS){for(let w=1;w<=level.waves;w++)for(let i=0;i<level.count(w);i++)kinds.add(level.enemy(w,i).kind);kinds.add(level.boss.kind);}
check(kinds.has('raider')&&kinds.has('runner')&&kinds.has('brute')&&kinds.has('shaman'),'the regions field four different attackers');
check(kinds.has('skiff')&&kinds.has('warship'),'the water regions field two kinds of boat');
const boatKinds=new Set(Object.keys(H.kinds).filter(kind=>H.kinds[kind].route==='water'));
for(const kind of kinds){if(kind==='raider')continue;
 check(walkMeta.variants[kind]&&walkMeta.variants[kind].frames===walkMeta.frames&&walkMeta.variants[kind].directions===walkMeta.directions,kind+' walk atlas matches the shared sheet layout');
 // A boat sails its own lane where no soldier can reach it, so it ships a
 // sailing sheet and no melee sheet at all.
 for(const sheet of boatKinds.has(kind)?['walk']:['walk','fight']){check(fs.existsSync('assets/hexkeep/enemy-'+kind+'-'+sheet+'.png'),kind+' has a baked '+sheet+' atlas');
  check(skin.includes('enemy-'+kind+'-'+sheet+'.png'),kind+' '+sheet+' atlas is wired up in the stylesheet');}
 if(boatKinds.has(kind))check(!skin.includes('.hk-fight-'+kind)&&!fs.existsSync('assets/hexkeep/enemy-'+kind+'-fight.png'),kind+' never duels, so it ships no melee sheet');
 // The melee rule has to come after the walk rule, or a duelling attacker keeps walking.
 else check(skin.indexOf('.hk-fight-'+kind)>skin.indexOf('.hk-walk-'+kind),kind+' melee sheet overrides its walk sheet');}
const source=fs.readFileSync('games/hexkeep.js','utf8');check(!/localStorage|kaykit-defense/.test(source),'storage wrappers only');check(!source.includes('max="200"')&&!source.includes('answersPerWave'),'no answer-count progress bar or launch gate');console.log(checks+' Hexkeep campaign checks passed');
