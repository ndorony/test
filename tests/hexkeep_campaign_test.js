'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;};
let reports=[],generated=0,saved=0,keep=true,scheduled=new Map(),serial=0;const records=new Map();
const ctx={console,Vue:{component:(n,o)=>o,extend:o=>o},getLocalStorage:(k,d)=>records.has(k)?JSON.parse(records.get(k)):d,setLocalStorage:(k,v)=>records.set(k,JSON.stringify(v)),generateFromList:()=>{generated++;return {question:'word',options:['1','2','3','4'],result:'2',questionIndex:7,action(){}};},getSetItems:()=>10,updateWeightForKey:(...args)=>reports.push(args),setTimeout:fn=>{scheduled.set(++serial,fn);return serial;},clearTimeout:id=>scheduled.delete(id),document:{hidden:false,addEventListener(){},removeEventListener(){}},matchMedia:()=>({matches:false})};
vm.createContext(ctx);for(const file of ['games/hexkeep-map.js','games/hexkeep.js','themes.js','apps.js','worlds.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const H=ctx.HEXKEEP,M=ctx.HEXKEEP_MAP;
check(M.tiles.length===48,'full tiled battlefield');for(let i=1;i<M.path.length;i++)check(M.distance(M.path[i-1],M.path[i])===1,'continuous winding road');
check(Object.keys(H.types).join()==='guard,archer,mage,catapult','four combat towers');
let b=H.freshBattle();check(b.supplies===0&&H.canStartRaid(b),'no free money or answer-count raid gate');check(!H.build(b,0,'guard'),'cannot buy without learning');
for(let i=0;i<12;i++)H.rewardAnswer(b);check(H.build(b,0,'guard')&&b.supplies===0,'answers buy a real guard');check(!H.build(b,0,'guard'),'occupied plot protected');
b.supplies=100;check(H.upgrade(b,0)&&H.upgrade(b,0)&&!H.upgrade(b,0),'three tower levels');check(b.guards.length===5,'guard upgrades add units');check(H.rally(b,0,11)&&!H.rally(b,0,0),'guard rally range');
for(const type of ['archer','mage','catapult']){b=H.freshBattle();b.supplies=100;H.build(b,2,type);b.spawned=H.targetCount(b);b.turn=5;b.enemies=[{id:100,step:8,hp:20,maxHp:20,armor:1}];const n=H.resolveTurn(b);check(n.enemies[0].hp<20&&n.shots[0].type===type,type+' fires damaging projectile');check(n.supplies===b.supplies,'combat never awards points');if(type==='mage')check(n.enemies[0].hp===17,'magic ignores armor');}
b=H.freshBattle();b.supplies=100;H.build(b,2,'catapult');b.spawned=H.targetCount(b);b.turn=5;b.enemies=[{id:100,step:8,hp:20},{id:101,step:9,hp:20}];check(H.resolveTurn(b).enemies.every(e=>e.hp<20),'catapult splash damages group');
b=H.freshBattle(10);b.supplies=100;H.build(b,0,'guard');b.spawned=H.targetCount(b);b.enemies=[{id:99,step:10,hp:107,maxHp:107,boss:true,armor:1}];check(H.resolveTurn(b).enemies[0].step===11,'boss cannot be blocked');b.enemies[0].step=12;check(H.resolveTurn(b).outcome==='defeat','boss reaching village loses raid regardless of remaining hearts');
// Squad capacity, stable pairings, gradual exchanges and bypassing enemies.
b=H.freshBattle();b.supplies=12;H.build(b,0,'guard');check(b.guards.length===3,'base barracks deploys three soldiers');b.spawned=H.targetCount(b);b.enemies=Array.from({length:4},(_,i)=>({id:100+i,step:10,hp:12,maxHp:12}));b=H.resolveTurn(b);const pairs=b.enemies.slice(0,3).map(e=>e.guardId);check(new Set(pairs).size===3&&pairs.every(Boolean),'three enemies each engage a different soldier');check(b.enemies.every(e=>e.hp===12)&&b.guards.every(g=>g.hp===5),'making contact does not instantly remove health');b=H.resolveTurn(b);check(b.enemies.slice(0,3).every((e,i)=>e.step===11&&e.guardId===pairs[i])&&b.enemies[3].step===12,'pairs stay in place while unblocked enemy passes');check(b.enemies[0].hp===11&&b.guards[0].hp===4,'both opponents take gradual melee damage');const hp=b.enemies[0].hp;b=H.resolveTurn(b);check(b.enemies[0].hp===hp,'melee cooldown between exchanges');b.guards[0].hp=0;b=H.resolveTurn(b);check(!b.enemies.find(e=>e.id===100).guardId,'defeated soldier releases opponent');
// Production keeps HP intact until the projectile/motion clock reaches contact.
b=H.freshBattle();b.supplies=100;H.build(b,2,'catapult');b.turn=5;b.spawned=H.targetCount(b);b.enemies=[{id:90,step:8,hp:20,maxHp:20},{id:91,step:9,hp:20,maxHp:20}];b=H.resolveTurn(b,true);check(b.enemies.every(e=>e.hp===20)&&b.shots.length===1,'catapult launch does not deal damage');H.applyImpacts(b,849);check(b.enemies.every(e=>e.hp===20),'stone in flight cannot hurt enemies');H.applyImpacts(b,850);check(b.enemies.every(e=>e.hp===18),'stone impact deals area damage');H.applyImpacts(b,1000);check(b.enemies.every(e=>e.hp===18),'impact cannot apply twice');
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
    if(!nearby||(start+step)%(type==='archer'?1:type==='mage'?2:3))continue;
    const power=type==='archer'?level:type==='mage'?2+level:1+level;candidate+=type==='mage'?power:Math.max(1,power-1);
   }damage=Math.max(damage,candidate);}
   choices.push({cost,damage});
  }
 }
 const next=Array(200).fill(-Infinity);for(let cost=0;cost<200;cost++)for(const c of choices)if(cost+c.cost<200)next[cost+c.cost]=Math.max(next[cost+c.cost],dp[cost]+c.damage);dp=next;
}
check(Math.max(...dp)===106,'all six-slot loadouts below 200 points cannot deal 107 boss damage, even with optimistic guard behavior');
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
records.set('6_0_HexkeepCampaign_v3','null');records.set('6_0_HexkeepCampaign_v2',JSON.stringify({version:2,active:false,battle:{...H.freshBattle(),supplies:3,buildings:[{type:'windmill',level:2},null,null,null,null,null]}}));g=game();g.restoreCampaign();check(g.battle.supplies===33&&!g.battle.buildings[0],'old noncombat tower purchases refunded in migration');
check(!('debugMode' in component.data())&&!component.methods.toggleDebug,'production component has no debug mode');
vm.runInContext('globalThis.themes=themeOptions;globalThis.legacyApps=apps',ctx);for(const [key,p]of Object.entries(ctx.themes))check(H.themeKit(p)['--hk-primary'],key+' theme');check(ctx.legacyApps.items.at(-1).items[0].appType==='hexkeep','legacy registration stable');check(ctx.resolveAdventureApp('adv-hexkeep-1').appType==='hexkeep','Adventure registration stable');
const source=fs.readFileSync('games/hexkeep.js','utf8');check(!/localStorage|kaykit-defense/.test(source),'storage wrappers only');check(!source.includes('max="200"')&&!source.includes('answersPerWave'),'no answer-count progress bar or launch gate');console.log(checks+' Hexkeep campaign checks passed');
