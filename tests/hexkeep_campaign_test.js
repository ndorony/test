'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;};
let reports=[],generated=0,saved=0,keep=true,scheduled=new Map(),serial=0;const records=new Map();
const ctx={console,Vue:{component:(n,o)=>o,extend:o=>o},getLocalStorage:(k,d)=>records.has(k)?JSON.parse(records.get(k)):d,setLocalStorage:(k,v)=>records.set(k,JSON.stringify(v)),generateFromList:()=>{generated++;return {question:'word',options:['1','2','3','4'],result:'2',questionIndex:7,action(){}};},getSetItems:()=>10,updateWeightForKey:(...args)=>reports.push(args),setTimeout:fn=>{scheduled.set(++serial,fn);return serial;},clearTimeout:id=>scheduled.delete(id),document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:false})};
vm.createContext(ctx);for(const file of ['games/hexkeep-map.js','games/hexkeep.js','themes.js','apps.js','worlds.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const H=ctx.HEXKEEP,M=ctx.HEXKEEP_MAP;
check(M.tiles.length===48,'full tiled battlefield');for(let i=1;i<M.path.length;i++)check(M.distance(M.path[i-1],M.path[i])===1,'continuous winding road');
check(Object.keys(H.types).join()==='guard,archer,mage,catapult','four combat towers');
// A pricier ranged tower always hits harder per second than a cheaper one at the same level.
for(let level=1;level<=3;level++){const ranged=['archer','mage','catapult'].sort((x,y)=>H.types[x].cost-H.types[y].cost),rate=t=>H.types[t].damage[level-1]/H.types[t].every;for(let i=1;i<ranged.length;i++)check(rate(ranged[i])>rate(ranged[i-1]),ranged[i]+' outdamages '+ranged[i-1]+' at level '+level);}
for(const t of Object.keys(H.types))check(H.types[t].damage.every((d,i)=>!i||d>H.types[t].damage[i-1]),t+' upgrades raise damage');
const MAPS=ctx.HEXKEEP_MAPS,LEVELS=ctx.HEXKEEP_LEVELS;
check(LEVELS.map(l=>l.id).join()==='valley,marsh,ridge,frost,ash','five regions, played in order');
check(LEVELS[0].map===M&&H.freshBattle().level==='valley','the first region is still the legacy battlefield');
check(LEVELS.every(l=>l.board===l.map.board)&&new Set(LEVELS.map(l=>l.board)).size===LEVELS.length,'each region paints its own board');
for(const level of LEVELS){const map=level.map,tag=level.id;
 check(map.tiles.length===48&&map.tiles.every((t,i)=>t.c===M.tiles[i].c&&t.r===M.tiles[i].r),tag+' reuses the shared hex grid, so one projection table places every sprite');
 for(let i=1;i<map.path.length;i++)check(map.distance(map.path[i-1],map.path[i])===1,tag+' road is continuous');
 check(new Set(map.path).size===map.path.length,tag+' road never revisits a hex');
 check(!map.path.includes(map.village)&&map.distance(map.path[map.path.length-1],map.village)===1,tag+' village sits beside the road end');
 check(map.sites.length===6&&new Set(map.sites.map(s=>s.tile)).size===6,tag+' offers six distinct plots');
 map.sites.forEach(s=>{check(!map.path.includes(s.tile)&&map.path.some(id=>map.distance(id,s.tile)<=1),tag+' plot '+s.tile+' borders the road');
  check(map.path[s.rally]!==undefined&&map.distance(s.tile,map.path[s.rally])<=2,tag+' plot '+s.tile+' rallies onto its own stretch of road');});
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
 const choices=[{cost:0,damage:0}];for(const type of Object.keys(H.types)){let cost=H.types[type].cost;
  for(let level=1;level<=3;level++){if(level>1)cost+=level===2?H.types[type].upgrade:H.types[type].master;let damage=0;
   // A boss always enters on an odd tick. Cover every alignment of the
   // two-tick magic and three-tick artillery cooldowns conservatively.
   for(const start of [1,3,5]){let candidate=0;for(let step=0;step<M.path.length;step++){
    const nearby=M.distance(M.sites[site].tile,M.path[step])<=H.range({type,level});
    if(type==='guard'){if(nearby||step>0&&M.distance(M.sites[site].tile,M.path[step-1])<=H.range({type,level}))candidate+=level;continue;}
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
const component=ctx.createHexkeepComponent({});function game(){let g=Object.assign({currentApp:{listName:'ADDITION',questionIndex:'question',resultIndex:'answer'},currentAppId:'6_0',score:0,theme:{colors:{}},$refs:{},$nextTick:fn=>fn(),shuffle:a=>a,reloadProgress:()=>keep,saveScore:()=>saved++},component.data());for(const [k,fn]of Object.entries(component.methods))g[k]=fn.bind(g);for(const [k,fn]of Object.entries(component.computed))Object.defineProperty(g,k,{get:()=>fn.call(g)});return g;}
let g=game();g.startGame();check(g.phase==='planning'&&generated===0,'village first, questions optional');g.openLearning();const q=g.question,options=g.options;g.answer(0);g.answer(0);check(reports.length===1&&g.phase==='retry'&&g.battle.supplies===0,'wrong input accepted once');g.retry();check(q===g.question&&options===g.options,'retry preserves exact question and options');g.answer(1);g.answer(1);check(reports.length===2&&g.battle.supplies===1&&g.battle.turn===0,'correct once pays without advancing time');check(g.answerTimer!==null,'correct schedules automatic next question');const nextQuestion=scheduled.get(g.answerTimer);scheduled.delete(g.answerTimer);nextQuestion();check(g.phase==='ready'&&generated===2,'short delay automatically generates next question');
g.returnToVillage();g.startRaid();check(scheduled.size===1,'autonomous raid owns one timer');const tick=scheduled.get(g.turnTimer);g.openLearning();tick();check(g.battle.turn===0&&scheduled.size===0,'question cancels and invalidates raid timer');g.returnToVillage();const live=scheduled.get(g.turnTimer);scheduled.delete(g.turnTimer);live();check(g.battle.turn===1&&g.battle.supplies===1,'automatic movement without free currency');g.openLearning();g.answer(1);const pending=scheduled.get(g.answerTimer);g.returnToVillage();pending();check(g.phase==='combat','leaving feedback cancels automatic next question');component.beforeDestroy.call(g);check(!scheduled.size,'destruction cancels both timers');
g=game();g.restoreCampaign();check(g.phase==='paused'&&g.battle.turn===1,'saved combat waits for explicit resume');g=game();g.startGame();g.openLearning();keep=false;g.answer(1);check(g.phase==='completed'&&g.battle.earned===1&&scheduled.size===0,'engine completion persists reward without next question timer');keep=true;
records.set('6_0_HexkeepCampaign_v4','null');records.set('6_0_HexkeepCampaign_v3','null');records.set('6_0_HexkeepCampaign_v2',JSON.stringify({version:2,active:false,battle:{...H.freshBattle(),supplies:3,buildings:[{type:'windmill',level:2},null,null,null,null,null]}}));g=game();g.restoreCampaign();check(g.battle.supplies===33&&!g.battle.buildings[0],'old noncombat tower purchases refunded in migration');check(g.battle.level==='valley'&&g.saves.valley,'a single-region save migrates into the first region slot');
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
function ladderOf(types){const steps=types.map((type,site)=>[site,type]);for(let round=0;round<2;round++)types.forEach((type,site)=>steps.push([site,'upgrade']));return steps;}
const allMagic=ladderOf(Array(6).fill('mage')),mixed=ladderOf(['archer','mage','archer','mage','archer','mage']);
function ladderWins(id,perWave,ladder=allMagic){let run=H.freshBattle(1,id),bought=0;const waves=H.levelOf({level:id}).waves;
 for(let wave=1;wave<=waves;wave++){for(let i=0;i<perWave;i++)H.rewardAnswer(run);
  while(bought<ladder.length){const [site,move]=ladder[bought];if(!(move==='upgrade'?H.upgrade(run,site):H.build(run,site,move)))break;bought++;}
  for(let tick=0;tick<300&&!run.outcome;tick++)run=H.resolveTurn(run);
  if(!['cleared','victory'].includes(run.outcome))return false;if(wave<waves)H.prepareRaid(run,true);}
 return run.outcome==='victory';}
for(const [id,perWave,ladder,plan] of [['valley',24,allMagic,'magic'],['marsh',32,allMagic,'magic'],['ridge',40,allMagic,'magic'],['frost',32,mixed,'archer-and-magic'],['ash',40,allMagic,'magic']]){
 check(ladderWins(id,perWave,ladder),id+' is winnable for '+perWave*10+' correct answers with a '+plan+' defence');
 check(!ladderWins(id,perWave-4,ladder),id+' still resists '+(perWave-4)*10+' correct answers');
}
check(!ladderWins('frost',32,allMagic),'on the frost pass shields punish an all-magic defence that mixed towers beat for the same answers');
// --- travelling between regions ---
for(const key of ['_v4','_v3','_v2'])records.delete('6_0_HexkeepCampaign'+key);
g=game();g.restoreCampaign();g.startGame();
check(g.battle.level==='valley'&&!g.cleared.length,'a new campaign starts in the first region');
check(g.regionOpen(0)&&!g.regionOpen(1)&&!g.regionOpen(2),'later regions start locked');
g.openRegions();check(g.phase==='levels','the region list opens from the village');
g.chooseRegion('marsh');check(g.battle.level==='valley'&&g.phase==='levels','a locked region cannot be entered');
g.closeRegions();check(g.phase==='planning','the region list closes back to the village');
g.battle.wave=LEVELS[0].waves;g.battle.outcome='victory';g.phase='victory';g.nextWatch();
check(g.cleared.join()==='valley'&&g.phase==='levels','clearing a region opens the next choice');
check(!g.battle.outcome&&g.battle.wave===LEVELS[0].waves,'a cleared region keeps its final raid ready to replay');
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
for(const key of ['_v4','_v3','_v2'])records.delete('6_0_HexkeepCampaign'+key);
g=game();g.restoreCampaign();g.startGame();g.openRegions();
check(g.phase==='levels'&&g.atlasPick==='valley'&&!g.atlasFresh,'the map opens on the current village');
g.pickRegion('marsh');check(g.atlasPick==='valley','a locked village cannot be picked');
g.travel();check(g.phase==='planning'&&g.battle.level==='valley','travelling to the current village returns to it');
g.battle.wave=LEVELS[0].waves;g.battle.outcome='victory';g.phase='victory';g.nextWatch();
check(g.phase==='levels'&&g.atlasFresh==='marsh'&&g.atlasPick==='marsh','winning shows the map with the road to the next village');
let onMap=game();onMap.restoreCampaign();
check(onMap.phase==='levels'&&onMap.atlasFresh==='marsh'&&onMap.battle.level==='valley','closing on the map reopens on the map');
onMap.travel();check(onMap.phase==='planning'&&onMap.battle.level==='marsh','the map card walks into the next village');
onMap=game();onMap.restoreCampaign();check(onMap.phase==='planning'&&onMap.battle.level==='marsh','reopening mid-village lands straight in the village');
// --- debug mode: its own save, unlimited points, every village open ---
const realSave=records.get('6_0_HexkeepCampaign_v4');
g=game();g.debugAvailable=true;g.debugMode=true;g.restoreCampaign();
check(g.phase==='planning'&&g.battle.supplies>=9999&&LEVELS.every((l,i)=>g.regionOpen(i)),'debug starts in a village with many points and every village open');
g.debugAtlas();check(g.phase==='levels','the debug button opens the map');
g.pickRegion('ash');g.travel();check(g.battle.level==='ash'&&g.battle.supplies>=9999,'debug travels straight to any village, stocked with points');
g.debugWin();check(g.phase==='victory'&&g.battle.outcome==='victory','debug wins the current region on demand');
g.nextWatch();check(g.phase==='levels'&&g.cleared.includes('ash'),'the last region also returns to the map in debug');
check(records.get('6_0_HexkeepCampaign_v4')===realSave&&records.has('6_0_HexkeepDebug_v4'),'debug never writes the real campaign');
g.closeRegions();g.toggleDebug();check(!g.debugMode&&g.battle.level==='marsh'&&g.battle.supplies<9999,'turning debug off restores the real campaign');
g=game();g.toggleDebug();check(!g.debugMode,'debug cannot be switched on without the URL flag');

const walkFile=fs.readFileSync('assets/hexkeep/walk.js','utf8'),walkMeta=JSON.parse(walkFile.slice(walkFile.indexOf('{'),walkFile.lastIndexOf('}')+1)),skin=fs.readFileSync('games/hexkeep.css','utf8');
const kinds=new Set();for(const level of LEVELS){for(let w=1;w<=level.waves;w++)for(let i=0;i<level.count(w);i++)kinds.add(level.enemy(w,i).kind);kinds.add(level.boss.kind);}
check(kinds.has('raider')&&kinds.has('runner')&&kinds.has('brute')&&kinds.has('shaman'),'the regions field four different attackers');
for(const kind of kinds){if(kind==='raider')continue;
 check(walkMeta.variants[kind]&&walkMeta.variants[kind].frames===walkMeta.frames&&walkMeta.variants[kind].directions===walkMeta.directions,kind+' walk atlas matches the shared sheet layout');
 for(const sheet of ['walk','fight']){check(fs.existsSync('assets/hexkeep/enemy-'+kind+'-'+sheet+'.png'),kind+' has a baked '+sheet+' atlas');
  check(skin.includes('enemy-'+kind+'-'+sheet+'.png'),kind+' '+sheet+' atlas is wired up in the stylesheet');}
 // The melee rule has to come after the walk rule, or a duelling attacker keeps walking.
 check(skin.indexOf('.hk-fight-'+kind)>skin.indexOf('.hk-walk-'+kind),kind+' melee sheet overrides its walk sheet');}
const source=fs.readFileSync('games/hexkeep.js','utf8');check(!/localStorage|kaykit-defense/.test(source),'storage wrappers only');check(!source.includes('max="200"')&&!source.includes('answersPerWave'),'no answer-count progress bar or launch gate');console.log(checks+' Hexkeep campaign checks passed');
