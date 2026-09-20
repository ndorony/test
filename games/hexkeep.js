(function(global){
 'use strict';
 const LEVELS=global.HEXKEEP_LEVELS;
 const CAMPAIGN={waves:10,reward:1,tickMs:1100};
 const ATLAS=global.HEXKEEP_ATLAS;
 // Debug mode is off in production: it exists only on a local dev server
 // (localhost / 127.0.0.1) whose URL carries ?debug=1. It plays on its own save
 // slot, so it never touches the real campaign.
 const DEBUG_POINTS=9999;
 function debugRequested(){const loc=global.location;if(!loc||!/^(localhost|127\.0\.0\.1)$/.test(loc.hostname||''))return false;return /[?&]debug(=(1|true|on))?(?=&|#|$)/.test(String(loc.href||''));}
 const TYPES={
  guard:{name:'מגדל שומרים',subtitle:'חוסם אויבים בקרב קרוב',cost:12,upgrade:16,master:20,range:1,every:2,damage:[1,2,3],detail:'מוציא 3 חיילים לשביל. כל חייל עוצר אויב אחד ונלחם בו. אויבים נוספים ממשיכים ללכת. כל שדרוג מוסיף חייל ומגדיל את הנזק. השדרוג הראשון גם מרחיב את אזור ההצבה.'},
  archer:{name:'מגדל קשתים',subtitle:'ירי מהיר לטווח רחוק',cost:14,upgrade:18,master:20,range:3,every:1,damage:[1,2,3],detail:'יורה חץ בכל פעימת קרב לעבר האויב המתקדם ביותר בטווח. כל שדרוג מגדיל את הנזק. יעיל נגד אויבים קלים.'},
  mage:{name:'מגדל קוסמים',subtitle:'קסם שחודר שריון',cost:18,upgrade:22,master:26,range:2,every:2,damage:[3,5,8],detail:'משגר קסם חזק בכל שתי פעימות קרב. מתעלם משריון. שדרוג מוסיף נזק ומרחיב את הטווח.'},
  catapult:{name:'מגדל קטפולטה',subtitle:'פגיעה בכמה אויבים יחד',cost:20,upgrade:24,master:28,range:3,every:3,damage:[5,8,13],detail:'משגר אבן בכל שלוש פעימות קרב ופוגע בכל האויבים ליד המטרה. שדרוג מגדיל את הנזק ואת אזור הפגיעה.'}
 };
 // Every attacker on every region is one of these. The region decides who
 // shows up and how tough they are; this table only says how they behave.
 const KINDS={
  raider:{name:'פולש',note:'הולך בקצב אחיד עד לכפר.'},
  runner:{name:'רץ ביצה',note:'מדלג שתי משבצות בכל פעימה — קשה לעצור אותו בקרב קרוב.'},
  brute:{name:'לוחם כבד',note:'הרבה חיים ושריון כבד. חצים כמעט לא מזיקים לו, קסם כן.'},
  shaman:{name:'קוסם מרפא',note:'מרפא בכל פעימה את האויבים שלידו. כדאי להפיל אותו ראשון.'},
  knight:{name:'אביר אופל',note:'המגן שלו בולע קליע שלם בכל פגיעה. חצים מהירים שוברים אותו, ושומרים נלחמים בו בלי מגן.'},
  warlock:{name:'מזמן',note:'מקים שלדים חדשים לצדו בזמן ההליכה. כל פעימה שהוא חי מוסיפה אויבים.'},
  skiff:{name:'סירת פשיטה',route:'water',note:'שטה רק על המים. כל פעימה שאיש לא פוגע בה היא מאיצה, וכל פגיעה מחזירה אותה לקצב איטי.'},
  warship:{name:'ספינה משוריינת',route:'water',note:'שריון כבד שמקהה חצים ואבנים, והיא מצפה בשריון גם את הסירות שלידה. קסם מתעלם משריון — הפילו אותה ראשונה.'}
 };
 // Every attacker walks its own route: `land` is the road, `water` is the lane
 // of a region that has one. Nothing ever changes route mid-raid, so a walker
 // never steps into the water and a boat never lands.
 function routeOf(e){return (e&&e.route)||((KINDS[e&&e.kind]||{}).route)||'land';}
 function pathOf(M,e){return (M.routes&&M.routes[routeOf(e)])||M.path;}
 // An ironclad plates every boat beside it — itself excluded, like the ridge
 // healer — so sinking it strips the whole escort at once. Plates never stack.
 function armorOf(b,e){const plate=(b.enemies||[]).reduce((n,o)=>o.plate&&o.hp>0&&o.id!==e.id&&routeOf(o)===routeOf(e)&&Math.abs(o.step-e.step)<=1?Math.max(n,o.plate):n,0);return (e.armor||0)+plate;}
 const ROSTERS={};
 function rosterOf(level){if(!ROSTERS[level.id]){const seen=[];for(let wave=1;wave<=level.waves;wave++)for(let i=0;i<level.count(wave);i++){const kind=level.enemy(wave,i).kind;if(!seen.includes(kind))seen.push(kind);}if(!seen.includes(level.boss.kind))seen.push(level.boss.kind);ROSTERS[level.id]=seen;}return ROSTERS[level.id];}
 function levelOf(b){const id=b&&b.level;return LEVELS.find(l=>l.id===id)||LEVELS[0];}
 function mapOf(b){return levelOf(b).map;}
 function levelIndex(id){const i=LEVELS.findIndex(l=>l.id===id);return i<0?0:i;}
 function nextLevel(id){return LEVELS[levelIndex(id)+1]||null;}
 function freshBattle(wave=1,level=LEVELS[0].id){return {level,wave,turn:0,supplies:0,earned:0,health:5,maxHealth:5,buildings:mapOf({level}).sites.map(()=>null),guards:[],enemies:[],shots:[],impacts:[],spawned:0,serial:0,kills:0,events:[],outcome:null};}
 function targetCount(b){return levelOf(b).count(b.wave);}
 function canStartRaid(b){return !b.outcome;}
 function rewardAnswer(b){b.earned++;b.supplies+=CAMPAIGN.reward;}
 function prepareRaid(b,advance){if(advance)b.wave++;b.turn=0;b.spawned=0;b.kills=0;b.enemies=[];b.shots=[];b.impacts=[];b.outcome=null;b.health=b.maxHealth;b.guards.forEach(g=>{g.hp=g.maxHp;g.respawn=0;g.enemyId=null;});}
 function range(v){return TYPES[v.type].range+(v.level>=2&&['guard','mage'].includes(v.type)?1:0);}
 // A plot has to be dry land and has to see a route — the road, or the water
 // lane for the coastal batteries.
 function placement(b,index,type){const M=mapOf(b),site=M.sites[index];return !!site&&!!TYPES[type]&&!(M.water&&M.water.has(site.tile))&&Object.keys(M.routes).some(key=>M.routes[key].some(id=>M.distance(id,site.tile)<=TYPES[type].range));}
 function available(b,index,type){const t=TYPES[type];return !!t&&placement(b,index,type)&&!b.buildings[index]&&b.supplies>=t.cost;}
 function newGuard(b,index){const v=b.buildings[index];b.guards.push({id:++b.serial,site:index,slot:b.guards.filter(g=>g.site===index).length,enemyId:null,step:v.rally,hp:5,maxHp:5,respawn:0});}
 function build(b,index,type){if(!available(b,index,type))return false;b.supplies-=TYPES[type].cost;b.buildings.splice(index,1,{type,level:1,rally:mapOf(b).sites[index].rally});if(type==='guard')for(let i=0;i<3;i++)newGuard(b,index);return true;}
 function upgradeCost(v){return v.level===1?TYPES[v.type].upgrade:TYPES[v.type].master;}
 function upgrade(b,index){const v=b.buildings[index];if(!v||v.level>=3||b.supplies<upgradeCost(v))return false;b.supplies-=upgradeCost(v);v.level++;if(v.type==='guard')newGuard(b,index);return true;}
 function rally(b,index,step){const M=mapOf(b),v=b.buildings[index];if(!v||v.type!=='guard'||!M.path[step]||M.distance(M.sites[index].tile,M.path[step])>range(v))return false;v.rally=step;b.guards.filter(g=>g.site===index).forEach(g=>g.step=step);return true;}
 function settleBattle(b,finishMovement){
  const M=mapOf(b);
  b.enemies=b.enemies.filter(e=>{if(e.hp<=0){if(!e.raised)b.kills++;return false;}if(finishMovement&&e.step>=pathOf(M,e).length-1){b.health=e.boss?0:Math.max(0,b.health-1);b.events.push('אויב הגיע לכפר.');return false;}return true;});
  b.guards.forEach(g=>{if(g.hp<=0||!b.enemies.some(e=>e.id===g.enemyId))g.enemyId=null;});b.enemies.forEach(e=>{if(e.guardId&&!b.guards.some(g=>g.id===e.guardId&&g.hp>0)){e.guardId=null;e.duelTicks=0;}});
  if(!b.health)b.outcome='defeat';else if(b.spawned===targetCount(b)&&!b.enemies.length)b.outcome=b.wave>=levelOf(b).waves?'victory':'cleared';
 }
 function applyImpacts(b,elapsed){let changed=false;
  for(const hit of b.impacts||[]){if(hit.done||elapsed<hit.at)continue;hit.done=true;changed=true;
   const enemy=b.enemies.find(e=>e.id===hit.enemyId&&e.hp>0);
   if(hit.kind==='melee'){const guard=b.guards.find(g=>g.id===hit.guardId&&g.hp>0);if(enemy&&guard&&(enemy.boss||enemy.guardId===guard.id)){enemy.hp=Math.max(0,enemy.hp-hit.damage);if(hit.damage>0)enemy.hurt=true;guard.hp=Math.max(0,guard.hp-1);b.events.push('המכה פגעה.');}}
   else if(hit.kind==='shot'){const shot=b.shots.find(s=>s.id===hit.shotId);if(shot){shot.landed=true;const victims=shot.type==='catapult'?b.enemies.filter(e=>e.hp>0&&routeOf(e)===routeOf(shot)&&Math.abs(e.step-shot.step)<=shot.radius):(enemy?[enemy]:[]);victims.forEach(e=>{if(e.shield>0){e.shield--;return;}const wound=shot.type==='mage'?hit.damage:Math.max(1,hit.damage-armorOf(b,e));e.hp=Math.max(0,e.hp-wound);if(wound>0)e.hurt=true;});if(victims.length)b.events.push(shot.type==='catapult'?'האבן פגעה והתפוצצה ליד האויבים.':'הקליע פגע באויב.');}}
  }
  if(changed||elapsed>=CAMPAIGN.tickMs)settleBattle(b,elapsed>=CAMPAIGN.tickMs);return changed;
 }
 // Pending hits in flight order: projectiles spend shield charges first, so a
 // shielded target is not written off while its shield still soaks them.
 function reservedDamage(b,e){let shield=e.shield||0;return (b.impacts||[]).filter(h=>!h.done&&((h.enemyId===e.id)||h.victims&&h.victims.includes(e.id))).reduce((n,h)=>{if(h.kind!=='melee'&&shield>0){shield--;return n;}return n+(h.kind==='melee'||h.type==='mage'?h.damage:Math.max(1,h.damage-armorOf(b,e)));},0);}
 // The final raid of a region closes with its commander; every other arrival
 // comes from the region's own roster.
 function arrival(b){const L=levelOf(b);if(b.wave>=L.waves&&b.spawned===targetCount(b)-1){const c=L.boss;return {kind:c.kind,hp:c.hp,armor:c.armor,speed:c.speed,heal:c.heal,shield:c.shield,summon:c.summon,surge:c.surge,plate:c.plate,boss:true};}const spec=L.enemy(b.wave,b.spawned);return {...spec,hp:Math.round(spec.hp*(L.tough||1))};}
 function arrivalNote(b,spec){const L=levelOf(b);if(spec.boss)return L.boss.name+' הגיע!';if(spec.plate)return 'ספינה משוריינת נכנסה למים.';if(spec.surge)return 'סירת פשיטה החליקה למים.';if(spec.heal)return 'קוסם מרפא נכנס לשביל.';if(spec.summon)return 'מזמן נכנס לשביל — הוא יקים שלדים.';if(spec.shield)return 'אביר אופל עם מגן נכנס לשביל.';if((spec.speed||1)>1)return 'רץ מהיר חומק פנימה.';return spec.armor?'אויב משוריין נכנס לשביל.':'אויב נכנס לשביל היער.';}
 function resolveTurn(input,deferHits=false){
  const b=JSON.parse(JSON.stringify(input));if(b.outcome)return b;const M=mapOf(b),L=levelOf(b);b.turn++;b.events=[];b.shots=[];b.impacts=[];
  b.guards.forEach(g=>{if(g.hp<=0){g.respawn=(g.respawn||6)-1;if(!g.respawn)g.hp=g.maxHp;}});
  // A raiding boat gathers way every beat nobody touches it, up to its own
  // limit, and any wound that lands drops it back to a crawl. Steady fire pins
  // it; slow artillery lets it run between the stones.
  b.enemies.forEach(e=>{if(!e.surge)return;if(e.hurt){e.speed=1;e.hurt=false;}else e.speed=Math.min(e.surge,(e.speed||1)+1);});
  if(b.spawned<targetCount(b)&&b.turn%2===1&&!(b.wave>=L.waves&&b.spawned===targetCount(b)-1&&b.enemies.length)){const spec=arrival(b);b.enemies.push({id:++b.serial,step:-1,hp:spec.hp,maxHp:spec.hp,armor:spec.armor||0,speed:spec.speed||1,heal:spec.heal||0,shield:spec.shield||0,summon:spec.summon||null,summoned:0,surge:spec.surge||0,plate:spec.plate||0,hurt:false,route:routeOf(spec),kind:spec.kind||'raider',boss:!!spec.boss});b.spawned++;b.events.push(arrivalNote(b,spec));}
  // Reserve ongoing pairs before assigning newcomers, so one soldier holds
  // exactly one enemy. A full squad never blocks the rest of the road.
  const occupied=new Set();
  b.enemies.forEach(e=>{e.previousGuardId=e.guardId||null;});
  b.guards.forEach(g=>g.enemyId=null);
  b.enemies.forEach(e=>{const g=b.guards.find(g=>g.id===e.guardId&&g.hp>0&&g.step===e.step);if(g&&!e.boss&&!occupied.has(g.id)){occupied.add(g.id);g.enemyId=e.id;}else{e.guardId=null;e.duelTicks=0;}});
  b.enemies.forEach(e=>{
   const pace=e.speed||1;
   e.previous=e.step;
   // Soldiers hold the road. A boat on the lane is simply out of their reach.
   if(routeOf(e)==='water'){e.step+=pace;return;}
   let defender=b.guards.find(g=>g.id===e.guardId);
   // A fast enemy still runs into any soldier standing inside its stride, so
   // extra speed slips past towers rather than past the guard line.
   if(!defender)defender=b.guards.find(g=>g.hp>0&&!occupied.has(g.id)&&g.step>=e.step&&g.step<=e.step+pace);
   if(!defender){e.step+=pace;return;}
   occupied.add(defender.id);
   if(e.boss){e.step+=pace;b.impacts.push({kind:'melee',enemyId:e.id,guardId:defender.id,damage:b.buildings[defender.site].level,at:440,done:false});return;}
   if(e.guardId===defender.id)e.duelTicks=(e.duelTicks||0)+1;else{e.guardId=defender.id;e.duelTicks=0;}
   defender.enemyId=e.id;e.step=defender.step;
   // Contact first, then one exchange every 2.2 seconds. No instant HP loss.
   if(e.duelTicks%2===1)b.impacts.push({kind:'melee',enemyId:e.id,guardId:defender.id,damage:b.buildings[defender.site].level,at:440,done:false});
  });
  b.buildings.forEach((v,i)=>{if(!v||v.type==='guard')return;if(b.turn%TYPES[v.type].every)return;
   // Whoever is closest to the village is shot first. Counting the steps still
   // to run rather than the steps already taken keeps that fair across two
   // routes of different lengths; on a one-route region it is the same order.
   const left=e=>pathOf(M,e).length-1-e.step;
   const targets=b.enemies.filter(e=>{const P=pathOf(M,e);return e.hp-reservedDamage(b,e)>0&&e.step>=0&&e.step<P.length&&M.distance(M.sites[i].tile,P[e.step])<=range(v);}).sort((a,c)=>left(a)-left(c));if(!targets.length)return;
   const target=targets[0],power=TYPES[v.type].damage[v.level-1];
   // Splash stays on the target's own route: a stone dropped in the lane never
   // scatters onto the road beside it.
   const victims=v.type==='catapult'?b.enemies.filter(e=>e.hp>0&&routeOf(e)===routeOf(target)&&Math.abs(e.step-target.step)<=v.level):[target],duration=v.type==='catapult'?850:v.type==='mage'?550:420,id=b.turn+'-'+i;
   b.shots.push({id,type:v.type,site:i,step:target.step,route:routeOf(target),enemyId:target.id,aim:JSON.parse(JSON.stringify(target)),duration,radius:v.level,landed:false});
   b.impacts.push({kind:'shot',type:v.type,shotId:id,enemyId:target.id,victims:victims.map(e=>e.id),damage:power,at:duration,done:false});b.events.push(TYPES[v.type].name+' משגר קליע.');
  });
  // Summoners raise a fresh skeleton beside themselves on their own beat, up to
  // a fixed number per caster, so a quick kill caps the swarm.
  b.enemies.filter(e=>e.summon&&e.hp>0&&e.step>=0&&e.step<pathOf(M,e).length-1&&(e.summoned||0)<e.summon.max&&b.turn%e.summon.every===0).forEach(caster=>{
   caster.summoned=(caster.summoned||0)+1;const hp=3+Math.floor(b.wave/3);
   b.enemies.push({id:++b.serial,step:caster.step,previous:caster.step,hp,maxHp:hp,armor:0,speed:1,heal:0,shield:0,summon:null,surge:0,plate:0,hurt:false,route:routeOf(caster),kind:'raider',raised:true,boss:false});
   b.events.push('המזמן הקים שלד חדש.');
  });
  // Healers mend their neighbours, never themselves, so the escort dies with
  // the caster instead of outlasting every tower.
  const healers=b.enemies.filter(e=>e.heal&&e.hp>0);
  if(healers.length){let mended=0;b.enemies.forEach(e=>{if(e.hp<=0||e.hp>=e.maxHp)return;const aid=healers.reduce((n,h)=>n+(h.id!==e.id&&routeOf(h)===routeOf(e)&&Math.abs(h.step-e.step)<=1?h.heal:0),0);if(aid){e.hp=Math.min(e.maxHp,e.hp+aid);mended++;}});if(mended)b.events.push('הקוסם מרפא את האויבים שלידו.');}
  if(!deferHits)applyImpacts(b,CAMPAIGN.tickMs);return b;
 }
 function themeKit(p){const c=p.colors;return {'--hk-paper':'color-mix(in srgb, '+c.background+' 96%, '+c.tertiary+')','--hk-ink':'color-mix(in srgb, '+c.text+' 82%, '+c.primary+')','--hk-primary':c.primary,'--hk-secondary':c.secondary,'--hk-accent':c.accent};}
 function createHexkeepComponent(Base){return Vue.component('hexkeep',Vue.extend({
  extends:Base,
  data(){return {newWords:[],newWordIndex:0,menuOpen:false,menuPosition:{},battle:freshBattle(),phase:'opening',resumePhase:'planning',question:null,options:[],selectedSite:0,selectedType:'guard',feedback:'',wrongIndex:-1,stopped:false,run:0,turnTimer:null,answerTimer:null,motion:[],reduced:false,hidden:false,types:TYPES,kinds:KINDS,levels:LEVELS,cleared:[],saves:{},art:global.HEXKEEP_ART,atlas:ATLAS,atlasPick:null,atlasFresh:null,debugAvailable:debugRequested(),debugMode:false,debugPoints:DEBUG_POINTS};},
  computed:{kit(){return themeKit(this.theme);},map(){return mapOf(this.battle);},level(){return levelOf(this.battle);},learning(){return this.newWords.length>0||['ready','retry','resolved'].includes(this.phase);},canPlan(){return !this.newWords.length&&!this.stopped&&['planning','combat','opening'].includes(this.phase);},selected(){return this.battle.buildings[this.selectedSite];},rangeTiles(){if(!this.menuOpen)return [];const M=this.map,v=this.selected||{type:this.selectedType,level:1};return M.tiles.filter(t=>M.distance(t.id,M.sites[this.selectedSite].tile)<=range(v));},raidSize(){return targetCount(this.battle);},needed(){return 0;},rallySteps(){const M=this.map;return M.path.map((tile,step)=>({tile,step})).filter(p=>this.selected&&M.distance(M.sites[this.selectedSite].tile,p.tile)<=this.selected.level);},sceneSummary(){return 'כפר עם שביל מפותל. '+this.battle.enemies.length+' אויבים בדרך. לכפר נותרו '+this.battle.health+' לבבות.';},
   pickedRegion(){return LEVELS.find(l=>l.id===this.atlasPick)||null;},
   atlasRoads(){return ATLAS.roads.map((d,i)=>({d,open:this.regionOpen(i+1),fresh:LEVELS[i+1].id===this.atlasFresh}));},
   canDebugAct(){return this.debugMode&&!this.stopped&&!this.battle.outcome&&!['levels','completed'].includes(this.phase);},
   // A run is under way as soon as the player has advanced past the opening
   // board of wave 1; only then is there anything to start over.
   runInProgress(){return this.battle.wave>1||this.battle.turn>0||this.battle.buildings.some(Boolean);},
   canRestart(){return !this.stopped&&['planning','paused'].includes(this.phase)&&this.runInProgress;}},
  template:`<main class="hk-game" :style="kit" :class="{'hk-reduced':reduced,'hk-hidden':hidden,'hk-question-open':learning}" @keydown="onKey" dir="rtl">
   <header class="hk-header"><div class="hk-brand"><span class="hk-seal" aria-hidden="true">H</span><div><span class="hk-eyebrow">לומדים, בונים ומגינים על הכפר</span><h1>Hexkeep<span>הכפר החי</span></h1></div></div><template v-if="debugAvailable"><button v-if="debugMode" class="hk-debug hk-debug-map" :disabled="!canDebugAct" @click="debugAtlas">🗺 מפה</button><button v-if="debugMode" class="hk-debug hk-debug-win" :disabled="!canDebugAct" @click="debugWin">🏆 ניצחון באזור</button><button class="hk-debug" :aria-pressed="String(debugMode)" @click="toggleDebug">{{debugMode?'דיבאג פועל ✓':'דיבאג כבוי'}}</button></template><button class="hk-exit" @click="exitGame">יציאה מהכפר ↗</button></header>
   <p v-if="debugMode" class="hk-debug-note" role="status">מצב דיבאג · {{debugPoints}} נקודות בכל כפר · כל הכפרים פתוחים במפה · שמירה נפרדת מהמשחק הרגיל</p>
   <div v-if="debugMode" class="hk-debug-jump" role="group" aria-label="קפיצה מהירה לכפר"><button v-for="(region,i) in levels" :key="'jump'+region.id" class="hk-debug" :class="{'hk-debug-here':region.id===battle.level}" :disabled="!canDebugAct&&phase!=='levels'" @click="debugJump(region.id)">{{i+1}}· {{region.name}}</button></div>
   <div class="hk-layout"><section class="hk-world" aria-label="מפת הכפר">
    <div class="hk-map-heading"><div><span class="hk-eyebrow">{{level.region}}</span><h2>{{level.name}}</h2></div><span class="hk-raid">מתקפה {{battle.wave}} מתוך {{level.waves}}</span></div>
    <div class="hk-hud"><span><small>הכפר</small><b>{{'♥'.repeat(battle.health)}}{{'♡'.repeat(battle.maxHealth-battle.health)}}</b></span><span><small>נקודות לקנייה</small><b>{{battle.supplies}}</b></span><span><small>מגדלים</small><b>{{battle.buildings.filter(Boolean).length}}</b></span><span><small>הובסו</small><b dir="ltr">{{battle.kills}} / {{raidSize}}</b></span></div>
    <div class="hk-map-viewport"><div class="hk-board" role="group" :aria-label="sceneSummary" @click.self="closeBuildMenu">
     <img class="hk-terrain" :src="'assets/hexkeep/'+level.board" :alt="'מפת '+level.name+': שביל משושים מפותל שמוביל אל הכפר'">
     <span v-for="tile in rangeTiles" :key="'range'+tile.id" class="hk-range-cell" :style="anchorStyle(tile.id)" aria-hidden="true"></span>
     <span v-for="shot in battle.shots" :key="'shot'+shot.id" class="hk-projectile" :class="'hk-shot-'+shot.type" :data-shot-id="shot.id" :style="shotStyle(shot)" aria-hidden="true"></span>
     <span v-for="shot in battle.shots" :key="'impact'+shot.id" class="hk-impact" :class="{'hk-impact-stone':shot.type==='catapult'}" :data-impact-id="shot.id" :style="impactStyle(shot)" aria-hidden="true"></span><template v-for="(building,i) in battle.buildings"><img v-if="building" :key="'building'+i" class="hk-object" :class="{'hk-firing':battle.shots.some(s=>s.site===i&&s.type==='catapult')}" :src="'assets/hexkeep/'+towerArt(building)+'.png'" :style="spriteStyle(towerArt(building),map.sites[i].tile)" alt=""></template>
     <button v-for="(site,i) in map.sites" :key="'site'+i" class="hk-site" :data-site-index="i" :class="{'hk-selected':menuOpen&&selectedSite===i,'hk-occupied':battle.buildings[i]}" :style="siteStyle(i)" :aria-label="site.name+': '+(battle.buildings[i]?'שדרוג '+types[battle.buildings[i].type].name:'בניית מגדל')" :aria-expanded="menuOpen&&selectedSite===i" aria-haspopup="dialog" :disabled="!canPlan" @click.stop="selectSite(i)"><span v-if="!battle.buildings[i]" aria-hidden="true">+</span></button>
     <div v-for="guard in battle.guards.filter(g=>g.hp>0)" :key="'guard'+guard.id" class="hk-soldier" :data-guard-id="guard.id" :style="guardStyle(guard)" role="group" aria-label="חייל"><span v-if="guard.enemyId" class="hk-fighter hk-guard-fighter" :style="guardFightStyle(guard)" aria-hidden="true"></span><img v-else class="hk-guard-idle" src="assets/hexkeep/knight.png" :style="guardIdleStyle()" alt=""><span class="hk-health hk-health-guard" role="progressbar" aria-label="חיי החייל" :aria-valuenow="guard.hp" :aria-valuemax="guard.maxHp" aria-valuemin="0" :title="guard.hp+' / '+guard.maxHp"><i :style="{transform:'scaleX('+guard.hp/guard.maxHp+')'}"></i></span></div>
     <div v-for="enemy in battle.enemies" :key="'enemy'+enemy.id" class="hk-enemy" :data-enemy-id="enemy.id" :style="enemyStyle(enemy)" role="group" :aria-label="enemy.boss?level.boss.name:kinds[enemy.kind||'raider'].name"><span class="hk-walker" :class="['hk-walk-'+(enemy.kind||'raider'),enemy.guardId?'hk-enemy-fighter hk-fight-'+(enemy.kind||'raider'):'',{'hk-armored':enemy.armor,'hk-shielded':enemy.shield>0,'hk-boss':enemy.boss}]" :style="walkStyle(enemy)" aria-hidden="true"></span><span v-if="enemy.shield>0" class="hk-shield" :title="'מגן: עוד '+enemy.shield+' פגיעות'" :aria-label="'מגן: עוד '+enemy.shield+' פגיעות'">{{enemy.shield}}</span><span class="hk-health hk-health-enemy" role="progressbar" aria-label="חיי האויב" :aria-valuenow="Math.max(0,enemy.hp)" :aria-valuemax="enemy.maxHp" aria-valuemin="0" :title="enemy.hp+' / '+enemy.maxHp"><i :style="{transform:'scaleX('+Math.max(0,enemy.hp)/enemy.maxHp+')'}"></i></span></div>
     <span class="hk-landmark hk-entry" :style="anchorStyle(map.path[0])">כניסת הפולשים</span><span v-if="map.lane" class="hk-landmark hk-entry hk-entry-sea" :style="anchorStyle(map.lane[0])">כניסת הסירות</span><span class="hk-landmark hk-village" :style="anchorStyle(map.village)">{{level.name}}</span>
    </div>
    </div><div class="hk-fieldnote"><span class="hk-status-dot"></span><span>{{phase==='combat'?'המתקפה פועלת — השומרים נלחמים לבד.':learning?'הקרב מושהה. אפשר לחשוב בנחת.':battle.outcome?'המתקפה הסתיימה. הקרב נעצר.':'הקרב מושהה עד שתפעילו מתקפה.'}}</span><span class="hk-tiles">מגינים יחד</span></div>
    <p class="hk-pan-hint">גררו את המפה ולחצו על מקום פנוי או על מגדל.</p>
    <section v-if="menuOpen&&canPlan" ref="buildMenu" tabindex="-1" class="hk-build-menu" :style="menuPosition" role="dialog" :aria-label="selected?'שדרוג מגדל':'קניית מגדל'" @keydown.esc.stop="closeBuildMenu">
     <header><h3>{{selected?types[selected.type].name:'איזה מגדל לבנות?'}}</h3><button class="hk-menu-close" aria-label="סגירת תפריט המגדל" @click="closeBuildMenu">×</button></header>
     <p class="hk-menu-wallet">{{battle.supplies}} נקודות לקנייה<span v-if="selected"> · דרגה {{selected.level}} מתוך 3</span></p>
     <div v-if="!selected" class="hk-blueprints"><button v-for="(type,key) in types" :key="key" :disabled="!canBuyType(key)" @focus="selectedType=key" @mouseenter="selectedType=key" @click="buyType(key)"><img :src="'assets/hexkeep/'+key+'.png'" alt=""><span><b>{{type.name}}</b><small>{{type.subtitle}}</small><i class="hk-power">{{powerLabel(key,1)}}</i><em>{{type.cost}} נקודות</em></span></button></div>
     <template v-else><img class="hk-menu-tower" :src="'assets/hexkeep/'+towerArt(selected)+'.png'" alt=""><p class="hk-detail">{{types[selected.type].detail}}</p><p class="hk-power hk-power-line">{{powerLabel(selected.type,selected.level)}}<span v-if="selected.level<3"> ← אחרי שדרוג: {{powerLabel(selected.type,selected.level+1)}}</span></p><button class="hk-primary hk-upgrade" :disabled="selected.level===3||!canUpgrade()" @click="upgradeSelected">{{selected.level===3?'משודרג עד הסוף':'שדרוג · '+upgradePrice()+' נקודות'}}</button><p v-if="selected.type==='guard'" class="hk-detail">{{guardStatus()}}</p></template>
    </section>
   </section>
   <aside v-if="phase!=='levels'" class="hk-journal" :class="{'hk-dialog':learning||['opening','victory','defeat','cleared'].includes(phase)}" :role="learning?'dialog':null" :aria-label="learning?'לומדים ומרוויחים נקודות':'פקדי המשחק'"><div class="hk-journal-title"><span class="hk-eyebrow">יומן הכפר</span><span>{{level.name}} · אזור {{levelNumber()}} מתוך {{levels.length}}</span></div>
    <section v-if="newWords.length" class="hk-learning hk-new-words"><span class="hk-chapter">מילים חדשות · {{newWordIndex+1}} מתוך {{newWords.length}}</span><h2 ref="newWordHeading" tabindex="-1" dir="auto" v-html="newWordContent().question"></h2><div class="hk-word-translation" dir="auto" v-html="newWordContent().result"></div><p class="hk-reward">מכירים את המילה, ואז מתרגלים ומרוויחים נקודות.</p><button class="hk-primary hk-news-next" @click="nextNewWord">{{newWordIndex+1===newWords.length?'מתחילים לתרגל ←':'המילה הבאה ←'}}</button></section>
    <section v-else-if="phase==='opening'" class="hk-opening"><span class="hk-chapter">ברוכים הבאים לכפר החי</span><h2>לומדים מילים.<br>בונים הגנה.</h2><p>{{levels.length}} אזורים מחכים לכם, ובכל אזור 10 מתקפות ומפה משלו. במתקפה האחרונה של כל אזור מגיע מפקד משוריין שלא ניתן לעצור בקרב קרוב — צריך מגדלי ירי חזקים. כשמנצחים באזור נפתח האזור הבא, עם שביל חדש ועם אויבים חדשים. אפשר להמשיך גם בפעם הבאה.</p><ol><li>לחצו על ״לומדים ומרוויחים״. כל תשובה נכונה מעניקה נקודה לקנייה.</li><li>קנו מגדלים ושדרוגים בנקודות שהרווחתם.</li><li>הפעילו מתקפה כשתהיו מוכנים. האויבים מתחזקים — שדרגו את המגדלים בין המתקפות.</li><li>ניצחתם באזור? מפת המסע נפתחת, ויוצאים בדרך אל הכפר הבא.</li><li>הקרב רץ לבד. בזמן השאלות ובין המתקפות הוא נעצר.</li></ol><button class="hk-primary" @click="startGame">נכנסים לכפר ←</button><small>הכפר, הנקודות והלמידה נשמרים אוטומטית.</small></section>
    <section v-else-if="['victory','defeat','cleared'].includes(phase)" class="hk-ending"><span class="hk-chapter">{{phase==='victory'?(nextRegion()?'האזור שוחרר!':'הכפר בטוח!'):phase==='cleared'?'המתקפה הסתיימה':'מנסים הגנה חדשה'}}</span><h2>{{phase==='victory'?'ניצחנו יחד!':phase==='cleared'?'כל הכבוד, מגינים!':'הכפר צריך עזרה'}}</h2><p>{{phase==='victory'?((nextRegion()?('הבסתם את '+level.boss.name+'! האזור הבא נפתח: '+nextRegion().name+' — מפה חדשה ואויבים חדשים.'):'הבסתם את '+level.boss.name+' והגנתם על האזור האחרון! סיימתם את כל המסע.')+' הכפר הזה נשאר פתוח — אפשר לשחק אותו שוב מהתחלה מתי שתרצו.'):phase==='cleared'?'הקרב נעצר. זה הזמן ללמוד, לקנות ולשדרג לקראת המתקפה הבאה.':'המבנים, הנקודות והתשובות שלכם נשמרו. הכפר והשומרים יתאוששו, ותוכלו לנסות שוב את אותה מתקפה.'}}</p><template v-if="phase==='victory'"><button ref="nextAction" class="hk-primary hk-journey" @click="continueJourney">{{nextRegion()?'ממשיכים אל '+nextRegion().name+' ←':'חזרה לפרק ←'}}</button><button class="hk-return hk-replay" @click="playAgain">משחקים שוב את {{level.name}} ↻</button></template><button v-else ref="nextAction" class="hk-primary" @click="nextWatch">{{phase==='cleared'?'מתכוננים למתקפה הבאה ←':'מכינים את הכפר מחדש ←'}}</button></section>
    <section v-else-if="learning" class="hk-learning"><span class="hk-chapter">לומדים בנחת — הקרב מושהה</span><h2 ref="questionHeading" tabindex="-1" dir="auto" v-html="question&&question.question"></h2><p class="hk-reward">כל תשובה נכונה: נקודה אחת לקניית מגדלים ושדרוגים</p><div class="hk-answers"><button v-for="(option,i) in options" :key="i" :disabled="phase!=='ready'" :class="{'hk-wrong':wrongIndex===i}" @click="answer(i)"><kbd>{{i+1}}</kbd><span dir="auto" v-html="option"></span></button></div><button v-if="phase==='retry'" ref="nextAction" class="hk-primary hk-continue" @click="retry">מנסים שוב את אותה שאלה ↻</button><p v-if="phase==='resolved'" class="hk-auto-next" role="status">נכון! +1 נקודה · עוברים לשאלה הבאה…</p><button class="hk-return" @click="returnToVillage">{{resumePhase==='combat'?'חזרה לקרב והמשך המתקפה ←':'חזרה לכפר ובנייה ←'}}</button></section>
    <section v-else class="hk-planning"><span class="hk-chapter">{{phase==='combat'?'המתקפה בעיצומה':'מתכוננים יחד'}}</span><h2>{{phase==='combat'?'השומרים מגינים על הכפר':'מה בונים עכשיו?'}}</h2><p>{{phase==='combat'?'אפשר לבנות ולשדרג בזמן הקרב. רוצים עוד נקודות? עברו ללמידה והקרב ייעצר.':'למדו כדי להרוויח נקודות, בחרו חלקה וקנו מבנה. אתם בוחרים מתי להתחיל את המתקפה.'}}</p><p v-if="phase!=='combat'" class="hk-reward">{{level.blurb}}</p><button class="hk-primary hk-study" @click="openLearning">לומדים ומרוויחים +1 נקודה</button><button v-if="phase==='paused'" class="hk-primary hk-resume" @click="resumeRaid">המשך המתקפה השמורה ←</button><button v-if="phase==='planning'" class="hk-primary hk-launch" :disabled="needed>0" @click="startRaid">התחלת מתקפה {{battle.wave}} ←</button><p v-if="phase==='planning'" class="hk-reward">כדאי להציב שומרים ולשלב מגדלי ירי לפני שמתחילים.</p><button v-if="canRestart" class="hk-return hk-restart" @click="restartRegion">↻ מתחילים מחדש ממתקפה 1</button><button v-if="phase!=='combat'" class="hk-return" @click="openRegions">🗺 מפת המסע · {{cleared.length}}/{{levels.length}} ★</button></section>
    <p class="hk-feedback" role="status" aria-live="polite">{{feedback}}</p>
    <div class="hk-journal-bottom"><div class="hk-score"><span>ניקוד הלמידה</span><b>{{score}}</b></div><progress-bar v-if="progress" title="התקדמות הלמידה" :progress="progress" :theme="theme"></progress-bar><div class="hk-turn-log"><span class="hk-eyebrow">מה קורה בכפר</span><p v-for="(event,i) in battle.events.slice(-3)" :key="i">{{event}}</p><p v-if="!battle.events.length">הגשר שקט. הכפר מחכה לעזרתכם.</p></div></div>
   </aside></div><footer class="hk-footer">HEXKEEP <span>לומדים יחד. בונים יחד.</span><span>איורים: Kay Lousberg · CC0</span></footer>
   <section v-if="phase==='levels'" class="hk-atlas" role="dialog" aria-modal="true" aria-labelledby="hk-atlas-title">
    <header class="hk-atlas-bar"><h2 id="hk-atlas-title" class="hk-atlas-title">מפת המסע</h2><span class="hk-atlas-count" :aria-label="'שוחררו '+cleared.length+' כפרים מתוך '+levels.length">{{cleared.length}}/{{levels.length}} <b aria-hidden="true">★</b></span><span v-if="debugMode" class="hk-atlas-debug">דיבאג · כל הכפרים פתוחים</span><button class="hk-atlas-exit" @click="exitGame">יציאה ↗</button></header>
    <div class="hk-atlas-scroll"><div class="hk-atlas-board">
     <img v-for="(prop,i) in atlas.scenery" :key="'prop'+i" class="hk-atlas-prop" :src="'assets/hexkeep/atlas/'+prop.icon+'.png'" :style="atlasProp(prop)" alt="">
     <svg class="hk-atlas-roads" :viewBox="'0 0 '+atlas.width+' 1000'" aria-hidden="true"><defs><mask id="hk-atlas-reveal" maskUnits="userSpaceOnUse" x="0" y="0" :width="atlas.width" height="1000"><path v-for="road in atlasRoads.filter(r=>r.fresh)" :key="'mask'+road.d" :d="road.d" pathLength="1" class="hk-atlas-draw"/></mask></defs>
      <path :d="atlas.start" class="hk-road hk-road-open"/><path v-for="(road,i) in atlasRoads" :key="'road'+i" :d="road.d" class="hk-road" :class="road.open?'hk-road-open':'hk-road-locked'" :mask="road.fresh&&!reduced?'url(#hk-atlas-reveal)':null"/></svg>
     <button v-for="(region,i) in levels" :key="'node'+region.id" class="hk-atlas-node" :data-region="region.id" :class="{'hk-node-here':region.id===battle.level,'hk-node-done':cleared.includes(region.id),'hk-node-locked':!regionOpen(i),'hk-node-picked':atlasPick===region.id,'hk-node-fresh':atlasFresh===region.id&&!reduced}" :style="atlasSpot(region.id)" :disabled="!regionOpen(i)" :aria-pressed="String(atlasPick===region.id)" :aria-label="(i+1)+'. '+(regionOpen(i)?region.name:'כפר נעול')+' · '+regionStatus(i)" @click="pickRegion(region.id)">
      <span class="hk-node-seal"><img :src="'assets/hexkeep/atlas/'+atlas.nodes[region.id].icon+'.png'" alt=""><span class="hk-node-num">{{i+1}}</span><span v-if="cleared.includes(region.id)" class="hk-node-star" aria-hidden="true">★</span><img v-if="region.id===battle.level" class="hk-node-flag" src="assets/hexkeep/atlas/flag.png" alt=""></span>
      <span class="hk-node-name">{{regionOpen(i)?region.name:'🔒 נעול'}}</span></button>
    </div></div>
    <aside v-if="pickedRegion" class="hk-atlas-card"><img :src="'assets/hexkeep/'+pickedRegion.board" alt=""><div><span class="hk-atlas-where">{{pickedRegion.region}} · כפר {{levelIndex(pickedRegion.id)+1}} מתוך {{levels.length}}</span><h3>{{pickedRegion.name}}</h3><p>{{pickedRegion.blurb}}</p><p class="hk-atlas-roster"><b>אויבים:</b> {{regionRoster(pickedRegion)}}</p><p class="hk-atlas-state" role="status">{{regionStatus(levelIndex(pickedRegion.id))}}</p>
     <button ref="atlasGo" class="hk-primary hk-atlas-go" @click="travel">{{regionSaved(pickedRegion.id)?'ממשיכים ב'+pickedRegion.name+' ←':cleared.includes(pickedRegion.id)?'משחקים שוב את '+pickedRegion.name+' ←':'יוצאים אל '+pickedRegion.name+' ←'}}</button></div></aside>
   </section>
  </main>`,
  methods:{
   presentNewItems(){if(this.newWords.length)return;this.pauseMotion();this.invalidate();this.newWords=getLocalStorage(this.currentAppId+'_new_items',[]).slice();this.newWordIndex=0;this.menuOpen=false;this.$nextTick(()=>this.speakNewWord());},
   newWordContent(){const item=getDataList(this.currentApp.listName)[this.newWords[this.newWordIndex]];if(!item)return {question:'',result:''};const q={...item[this.currentApp.questionIndex]};if(this.currentApp.questionType)q.type=this.currentApp.questionType;return {question:render(q),result:render(item[this.currentApp.resultIndex]),source:q};},
   speakNewWord(){const content=this.newWordContent();if(content.source)generateQuestion(content.source)();this.focus('newWordHeading');},
   nextNewWord(){if(this.newWordIndex+1<this.newWords.length){this.newWordIndex++;this.speakNewWord();return;}setLocalStorage(this.currentAppId+'_new_items',[]);this.newWords=[];this.newWordIndex=0;this.question=null;this.options=[];this.phase='ready';this.create();},
   campaignKey(){return this.currentAppId+(this.debugMode?'_HexkeepDebug_v5':'_HexkeepCampaign_v5');},
   levelNumber(){return levelIndex(this.battle.level)+1;},
   levelIndex(id){return levelIndex(id);},
   regionRoster(level){return rosterOf(level).map(kind=>KINDS[kind].name).join(' · ');},
   nextRegion(){return nextLevel(this.battle.level);},
   regionOpen(i){return this.debugMode||i===0||this.cleared.includes(LEVELS[i-1].id);},
   // A village the player has saved battle state in resumes; anything else —
   // never visited, or already won — starts a new run from wave 1.
   regionSaved(id){const slot=id===this.battle.level?(this.battle.outcome==='victory'?null:this.battle):(this.saves[id]||{}).battle;return !!slot&&(slot.wave>1||slot.turn>0||(slot.buildings||[]).some(Boolean));},
   regionStatus(i){const region=LEVELS[i];if(!this.regionOpen(i))return 'נפתח אחרי '+LEVELS[i-1].name;
    const state=this.cleared.includes(region.id)?(this.regionSaved(region.id)?'שוחרר ✓ · משחק חדש בעיצומו':'שוחרר ✓ · אפשר לשחק שוב'):this.regionSaved(region.id)?'פתוח — אפשר להמשיך':'פתוח — אפשר להיכנס';
    return region.id===this.battle.level?'כאן אתם עכשיו · '+state:state;},
   // Every move between regions goes through the journey map (phase 'levels').
   openRegions(){if(this.stopped||!['planning','paused'].includes(this.phase))return;this.menuOpen=false;this.pauseMotion();this.invalidate();this.resumePhase=this.phase;this.showAtlas(this.battle.level,null);this.saveCampaign();},
   showAtlas(pick,fresh){this.phase='levels';this.atlasPick=pick;this.atlasFresh=fresh;this.$nextTick(()=>{const node=this.$el&&this.$el.querySelector('.hk-atlas-node[data-region="'+pick+'"]');if(node&&node.scrollIntoView)node.scrollIntoView({block:'nearest',inline:'center'});});this.focus('atlasGo');},
   closeRegions(){if(this.phase!=='levels'||this.stopped)return;this.atlasFresh=null;
    // Stepping back into the village you just won starts a new run; there is no
    // finished board left to return to.
    if(this.battle.outcome==='victory'){this.restartRegion();return;}
    this.phase=this.resumePhase==='paused'?'paused':'planning';this.feedback='';this.saveCampaign();},
   pickRegion(id){if(this.phase!=='levels'||this.stopped||!this.regionOpen(levelIndex(id)))return;this.atlasPick=id;this.focus('atlasGo');},
   travel(){if(this.atlasPick)this.chooseRegion(this.atlasPick);},
   atlasSpot(id){const n=ATLAS.nodes[id];return {left:n.x/ATLAS.width*100+'%',top:n.y/10+'%'};},
   atlasProp(p){return {left:p.x/ATLAS.width*100+'%',top:p.y/10+'%',width:p.w/ATLAS.width*100+'%'};},
   chooseRegion(id){if(this.stopped||this.phase!=='levels'||!this.regionOpen(levelIndex(id)))return;this.invalidate();
    if(id===this.battle.level){if(this.battle.outcome==='victory')this.restartRegion();else this.closeRegions();return;}
    this.stashBattle();this.menuOpen=false;this.selectedSite=0;this.question=null;this.options=[];this.atlasFresh=null;
    // A region with no saved battle — never entered, or already won — opens on
    // wave 1 with its starting board; one still in progress resumes as it was.
    const resume=this.loadSlot(id);this.phase=this.battle.outcome||resume;this.resumePhase='planning';this.feedback='נכנסתם אל '+levelOf(this.battle).name+'.';this.saveCampaign();},
   // A fresh run of the current region: wave 1, its starting towers and
   // resources, and no change to any village's journey progress.
   restartRegion(){if(this.stopped||!['planning','paused','levels','victory'].includes(this.phase))return;this.invalidate();
    const id=this.battle.level;delete this.saves[id];this.menuOpen=false;this.selectedSite=0;this.question=null;this.options=[];this.wrongIndex=-1;this.atlasFresh=null;
    this.battle=freshBattle(1,id);this.debugFill();this.motionState().elapsed=0;
    this.phase='planning';this.resumePhase='planning';this.feedback=levelOf(this.battle).name+' מתחיל מחדש ממתקפה 1.';this.saveCampaign();},
   debugFill(){if(this.debugMode)this.battle.supplies=Math.max(this.battle.supplies,DEBUG_POINTS);},
   toggleDebug(){if(this.stopped||!this.debugAvailable)return;this.saveCampaign();this.invalidate();this.newWords=[];this.newWordIndex=0;this.menuOpen=false;this.question=null;this.options=[];this.wrongIndex=-1;this.feedback='';this.selectedSite=0;this.atlasFresh=null;
    this.debugMode=!this.debugMode;this.restoreCampaign();},
   // Debug shortcuts: open the journey map from anywhere, or win the region now.
   // Debug shortcut: drop straight into any village, the two water ones
   // included, from wherever the player currently is.
   debugJump(id){if(!this.debugMode||this.stopped||!LEVELS.some(l=>l.id===id))return;
    if(this.phase!=='levels'){if(!this.canDebugAct)return;this.debugAtlas();}
    if(this.phase!=='levels')return;
    this.pickRegion(id);this.travel();},
   debugAtlas(){if(!this.canDebugAct)return;const fighting=['combat','paused'].includes(this.phase)||(this.learning&&this.resumePhase==='combat');this.invalidate();this.newWords=[];this.question=null;this.options=[];this.wrongIndex=-1;this.phase=fighting?'paused':'planning';this.openRegions();},
   debugWin(){if(!this.canDebugAct)return;this.invalidate();this.newWords=[];this.question=null;this.options=[];this.wrongIndex=-1;this.menuOpen=false;
    Object.assign(this.battle,{wave:this.level.waves,enemies:[],shots:[],impacts:[],outcome:'victory'});this.phase='victory';this.winRegion();this.saveCampaign();this.focus('nextAction');},
   walkMeta(e){const walk=global.HEXKEEP_WALK||{},meta=(walk.variants&&walk.variants[e&&e.kind])||walk;return {frames:meta.frames||24,directions:meta.directions||6,duration:meta.duration||1066.667};},
   snapshot(){return {battle:JSON.parse(JSON.stringify(this.battle)),active:this.phase==='combat'||(this.learning&&this.resumePhase==='combat')||this.phase==='paused'||(this.phase==='levels'&&this.resumePhase==='paused'),movement:{elapsed:this.motionState().elapsed,walkTime:this.motionState().walkTime}};},
   // `atlas` reopens the journey map after a reload (e.g. a region was won but
   // the next one not yet entered); otherwise the player lands in their region.
   // Journey progress (`cleared`) and battle state (`levels`) are two different
   // records. A won region keeps no battle state, so entering it again starts a
   // new run instead of reopening the finished board.
   stashBattle(){if(this.battle.outcome==='victory')delete this.saves[this.battle.level];else this.saves[this.battle.level]=this.snapshot();},
   winRegion(){if(!this.cleared.includes(this.battle.level))this.cleared.push(this.battle.level);delete this.saves[this.battle.level];},
   // Closing the app on the victory screen reopens on the journey map, with the
   // road to the newly opened village already drawn.
   atlasMark(){if(this.phase==='levels')return {fresh:this.atlasFresh,pick:this.atlasPick};
    if(this.phase==='victory'){const next=nextLevel(this.battle.level);return {fresh:next?next.id:null,pick:next?next.id:this.battle.level};}
    return null;},
   saveCampaign(){if(!this.currentAppId)return;this.syncMotion();this.stashBattle();setLocalStorage(this.campaignKey(),{version:5,current:this.battle.level,cleared:this.cleared.slice(),opening:this.phase==='opening',atlas:this.atlasMark(),levels:this.saves});},
   // v4 parked a won region on its final raid, so re-entering it only showed the
   // finished board. v5 treats that as journey progress with no battle state
   // left, which is what makes a completed region replayable from wave 1.
   upgradeToV5(saved){const levels={},cleared=(saved.cleared||[]).slice();
    for(const id of Object.keys(saved.levels||{})){const slot=saved.levels[id];
     if(cleared.includes(id)||slot&&slot.battle&&slot.battle.outcome==='victory')continue;
     levels[id]=slot;}
    const next=nextLevel(saved.current);
    const atlas=!levels[saved.current]&&cleared.includes(saved.current)?{fresh:null,pick:next?next.id:saved.current}:saved.atlas||null;
    return {version:5,current:saved.current,cleared,opening:saved.opening,atlas,levels};},
   legacyCampaign(){const recent=getLocalStorage(this.currentAppId+'_HexkeepCampaign_v4',null);
    if(recent&&recent.version===4&&recent.levels)return this.upgradeToV5(recent);
    let saved=getLocalStorage(this.currentAppId+'_HexkeepCampaign_v3',null);if(!saved){const old=getLocalStorage(this.currentAppId+'_HexkeepCampaign_v2',null);if(old&&old.version===2){saved=JSON.parse(JSON.stringify(old));const refunds={windmill:[14,16],blacksmith:[18,20],well:[12,14],lumber:[10,12],barricade:[8,10]};saved.battle.buildings=saved.battle.buildings.map(v=>{if(!v||v.type==='guard')return v;const price=refunds[v.type];if(price)saved.battle.supplies+=price[0]+(v.level===2?price[1]:0);return null;});saved.battle.shots=[];saved.version=3;}}
    if(!saved||saved.version!==3||!saved.battle)return null;saved.battle.level=LEVELS[0].id;
    // A single-region save becomes the first slot of the region campaign.
    return this.upgradeToV5({version:4,current:LEVELS[0].id,cleared:[],opening:saved.opening,levels:{[LEVELS[0].id]:{battle:saved.battle,active:saved.active,movement:saved.movement}}});},
   loadSlot(id){const slot=this.saves[id],map=levelOf({level:id}).map;
    if(!slot||!slot.battle||!Array.isArray(slot.battle.buildings)||slot.battle.buildings.length!==map.sites.length){this.battle=freshBattle(1,id);this.debugFill();this.motionState().elapsed=0;return 'planning';}
    this.battle=slot.battle;this.battle.level=id;this.battle.buildings.forEach((v,i)=>{if(v&&v.type==='guard'){const guards=this.battle.guards.filter(g=>g.site===i);guards.forEach((g,slot)=>{g.slot=slot;});while(this.battle.guards.filter(g=>g.site===i).length<v.level+2)newGuard(this.battle,i);}});
    Object.assign(this.motionState(),{elapsed:slot.movement?slot.movement.elapsed:CAMPAIGN.tickMs,walkTime:slot.movement?slot.movement.walkTime:0,last:null});
    this.battle.shots=this.battle.shots||[];this.battle.impacts=this.battle.impacts||[];this.battle.maxHealth=5;this.battle.health=Math.min(5,this.battle.health);this.debugFill();return slot.active?'paused':'planning';},
   restoreCampaign(){const saved=getLocalStorage(this.campaignKey(),null)||(this.debugMode?null:this.legacyCampaign());this.atlasPick=null;this.atlasFresh=null;
    if(saved&&saved.version===5&&saved.levels){this.saves=saved.levels;this.cleared=(saved.cleared||[]).filter(id=>LEVELS.some(l=>l.id===id));
     const id=LEVELS.some(l=>l.id===saved.current)?saved.current:LEVELS[0].id;const resume=this.loadSlot(id);
     this.phase=this.battle.outcome||(saved.opening?'opening':resume);
     if(saved.atlas&&!this.battle.outcome&&!saved.opening){this.resumePhase=resume;const fresh=LEVELS.some(l=>l.id===saved.atlas.fresh)?saved.atlas.fresh:null;const pick=LEVELS.some(l=>l.id===saved.atlas.pick)?saved.atlas.pick:null;this.showAtlas(pick||fresh||id,fresh);}}
    else{this.saves={};this.cleared=[];this.battle=freshBattle();this.debugFill();this.motionState().elapsed=0;this.phase=this.debugMode?'planning':'opening';}},
   create(){if(this.stopped||this.phase==='opening'||!['ready','resolved'].includes(this.phase))return;if(!this.reloadProgress()){if(!this.newWords.length)this.phase='completed';return;}const a=this.currentApp;this.question=generateFromList(a.listName,a.questionIndex,a.resultIndex,this.currentAppId,getSetItems(a),a.questionType);this.questionIndex=this.question.questionIndex;this.options=this.shuffle(this.question.options.slice());if(!this.reloadProgress()){if(!this.newWords.length)this.phase='completed';return;}this.phase='ready';this.wrongIndex=-1;this.feedback='';if(this.question.action)this.question.action();this.focus('questionHeading');},
   startGame(){if(this.phase!=='opening'||this.stopped)return;this.phase='planning';this.saveCampaign();},
   openLearning(){this.menuOpen=false;if(this.stopped||!['planning','combat','paused'].includes(this.phase))return;this.pauseMotion();this.resumePhase=this.phase==='planning'?'planning':'combat';this.invalidate();this.phase=this.question?(this.wrongIndex>=0?'retry':'ready'):'ready';this.saveCampaign();if(!this.question)this.create();else this.focus('questionHeading');},
   returnToVillage(){if(this.stopped||!this.learning)return;this.invalidate();if(this.phase==='resolved'){this.question=null;this.options=[];}this.phase=this.resumePhase;this.resumeMotion();this.feedback='';this.saveCampaign();if(this.phase==='combat')this.scheduleTick();},
   startRaid(){this.menuOpen=false;if(this.stopped||this.phase!=='planning'||!canStartRaid(this.battle))return;this.phase='combat';this.feedback='המתקפה התחילה! השומרים נלחמים בעצמם.';this.saveCampaign();this.scheduleTick();},
   resumeRaid(){if(this.phase!=='paused'||this.stopped)return;this.phase='combat';this.saveCampaign();this.scheduleTick();},
   pauseMotion(){this.stopFrames();this.motion=this.$el?[...this.$el.querySelector('.hk-board').getAnimations({subtree:true})]:[];this.motion.forEach(a=>a.pause());},
   resumeMotion(){this.motion.forEach(a=>{try{a.play();}catch(e){/* Detached sprites have no animation to resume. */}});this.motion=[];if(this.phase==='combat')this.startFrames();},
   motionState(){if(!this._motionState)this._motionState={elapsed:0,walkTime:0,last:null,raf:null};return this._motionState;},
   motionNow(){return global.performance?global.performance.now():Date.now();},
   syncMotion(){const m=this.motionState(),now=this.motionNow();if(m.last!==null){const dt=Math.max(0,now-m.last);m.elapsed=Math.min(CAMPAIGN.tickMs,m.elapsed+dt);m.walkTime+=dt;m.last=now;}},
   stopFrames(){this.syncMotion();const m=this.motionState();if(m.raf!==null&&global.cancelAnimationFrame)global.cancelAnimationFrame(m.raf);m.raf=null;m.last=null;this.paintEnemies();},
   startFrames(){const m=this.motionState();if(this.stopped||this.hidden||this.phase!=='combat')return;if(m.last===null)m.last=this.motionNow();if(!global.requestAnimationFrame||m.raf!==null)return;const frame=()=>{m.raf=null;if(this.stopped||this.hidden||this.phase!=='combat')return;this.syncMotion();this.processImpacts();this.paintEnemies();if(this.phase!=='combat')return;m.raf=global.requestAnimationFrame(frame);};m.raf=global.requestAnimationFrame(frame);},
   processImpacts(elapsed=this.motionState().elapsed){if(this.phase!=='combat')return;const changed=applyImpacts(this.battle,elapsed);if(changed)this.saveCampaign();if(this.battle.outcome){this.phase=this.battle.outcome;if(this.phase==='victory')this.winRegion();this.invalidate();this.menuOpen=false;this.feedback='המתקפה הסתיימה.';this.saveCampaign();this.focus('nextAction');}},
   paintProjectiles(){if(!this.$el)return;for(const shot of this.battle.shots){const el=this.$el.querySelector('[data-shot-id="'+shot.id+'"]'),impact=this.$el.querySelector('[data-impact-id="'+shot.id+'"]');if(el)Object.assign(el.style,this.shotStyle(shot));if(impact)Object.assign(impact.style,this.impactStyle(shot));}},
   paintEnemies(){this.paintProjectiles();if(!this.$el)return;const enemies=new Map(this.battle.enemies.map(e=>[String(e.id),e]));this.$el.querySelectorAll('[data-enemy-id]').forEach(el=>{const e=enemies.get(el.dataset.enemyId);if(!e)return;const p=this.enemyPoint(e);el.style.transform='translate('+p.x+'cqw,'+p.y+'cqh)';el.style.zIndex=Math.round(p.y);const walker=el.querySelector('.hk-walker');if(walker)walker.style.backgroundPosition=this.walkStyle(e).backgroundPosition;});this.$el.querySelectorAll('[data-guard-id]').forEach(el=>{const g=this.battle.guards.find(g=>String(g.id)===el.dataset.guardId),fighter=el.querySelector('.hk-guard-fighter');if(g&&fighter)fighter.style.backgroundPosition=this.guardFightStyle(g).backgroundPosition;});},
   scheduleTick(){if(this.stopped||this.hidden||this.phase!=='combat'||this.turnTimer!==null)return;this.startFrames();const token=this.run;this.turnTimer=setTimeout(()=>{if(this.stopped||token!==this.run||this.hidden||this.phase!=='combat')return;this.turnTimer=null;this.syncMotion();this.processImpacts(CAMPAIGN.tickMs);if(this.phase!=='combat')return;this.paintEnemies();this.battle=resolveTurn(this.battle,true);const m=this.motionState();m.elapsed=0;m.last=this.motionNow();if(this.battle.outcome){this.phase=this.battle.outcome;if(this.phase==='victory')this.winRegion();this.stopFrames();this.feedback='המתקפה הסתיימה והקרב נעצר.';this.focus('nextAction');}this.saveCampaign();if(this.phase==='combat')this.scheduleTick();},Math.max(1,CAMPAIGN.tickMs-this.motionState().elapsed));},
   focus(ref){const token=this.run;this.$nextTick(()=>{if(!this.stopped&&token===this.run&&this.$refs[ref])this.$refs[ref].focus({preventScroll:true});});},
   anchorStyle(tile,dx=0){const p=this.art.anchors[tile];return {left:(p.x+dx)+'%',top:p.y+'%'};},
   fitMap(){this.$nextTick(()=>{const viewport=this.$el&&this.$el.querySelector('.hk-map-viewport');if(viewport)viewport.scrollLeft=(viewport.scrollWidth-viewport.clientWidth)*.58;});},
   towerArt(v){return v.type+(v.level>1?'-'+v.level:'');},
   spriteStyle(key,tile,dx=0){const p=this.art.anchors[tile],s=this.art.sprites[key];return {left:(p.x+s.dx+dx)+'%',top:(p.y+s.dy)+'%',width:s.w+'%',height:s.h+'%',zIndex:Math.round(p.y)};},
   guardPoint(g){const p=this.art.anchors[this.map.path[g.step]],slot=g.slot||0;return {x:p.x+(slot%3-1)*2.3,y:p.y+1+Math.floor(slot/3)*1.8};},
   guardStyle(g){const p=this.guardPoint(g);return {transform:'translate('+p.x+'cqw,'+p.y+'cqh)',zIndex:Math.round(p.y)};},
   guardIdleStyle(){const s=this.art.sprites.knight;return {left:s.dx+'cqw',top:s.dy+'cqh',width:s.w+'cqw',height:s.h+'cqh',transformOrigin:(-s.dx/s.w*100)+'% '+(-s.dy/s.h*100)+'%'};},
   duelFrame(e){return this.reduced?0:Math.floor((((e.duelTicks||0)*CAMPAIGN.tickMs+this.motionState().elapsed)%(CAMPAIGN.tickMs*2))/(CAMPAIGN.tickMs*2)*24);},
   guardFightStyle(g){const e=this.battle.enemies.find(e=>e.id===g.enemyId);return {backgroundPosition:(e?this.duelFrame(e)/23*100:0)+'% 60%'};},
   // Every moving thing carries its own route, so one point helper serves the
   // road and the water lane alike; step -1 is extrapolated off the near edge.
   routeTiles(e){const M=this.map,key=e&&e.route==='water'?'water':'land';return (M.routes&&M.routes[key])||M.path;},
   roadPoint(e,step){const P=this.routeTiles(e);if(step<0){const a=this.art.anchors[P[0]],b=this.art.anchors[P[1]];return {x:2*a.x-b.x,y:2*a.y-b.y};}return this.art.anchors[P[Math.min(step,P.length-1)]];},
   enemyPoint(e,elapsed=this.motionState().elapsed){const guard=this.battle.guards.find(g=>g.id===e.guardId),oldGuard=this.battle.guards.find(g=>g.id===e.previousGuardId),offset=g=>{const p=this.guardPoint(g);return {x:p.x-1.3,y:p.y-1.8};},a=oldGuard?offset(oldGuard):this.roadPoint(e,e.previous===undefined?e.step:e.previous),b=guard?offset(guard):this.roadPoint(e,e.step),t=this.reduced?1:Math.min(1,elapsed/CAMPAIGN.tickMs);return {x:a.x+(b.x-a.x)*t+(guard||oldGuard?0:.35),y:a.y+(b.y-a.y)*t};},
   enemyStyle(e){const p=this.enemyPoint(e);return {transform:'translate('+p.x+'cqw,'+p.y+'cqh)',zIndex:Math.round(p.y)};},
   walkStyle(e){if(e.guardId)return {backgroundPosition:(this.duelFrame(e)/23*100)+'% 0%'};const M=this.map,meta=this.walkMeta(e),P=this.routeTiles(e),step=Math.max(1,Math.min(e.step,P.length-1)),from=M.world(P[step-1]),to=M.world(P[step]),angle=Math.atan2(to.x-from.x,to.z-from.z),row=((Math.round((angle-Math.PI/6)/(Math.PI/3))%6)+6)%6,moving=e.previous!==e.step,frame=this.reduced||!moving?0:Math.floor((this.motionState().walkTime+e.id*137)%meta.duration/meta.duration*meta.frames);return {backgroundPosition:(frame/(meta.frames-1)*100)+'% '+(row/(meta.directions-1)*100)+'%'};},
   shotTarget(shot){return shot.aim?this.enemyPoint(shot.aim,shot.duration):this.roadPoint(shot,shot.step);},
   shotStyle(shot){const from=this.art.anchors[this.map.sites[shot.site].tile],to=this.shotTarget(shot),t=Math.min(1,this.motionState().elapsed/(shot.duration||500)),arc=shot.type==='catapult'?Math.sin(Math.PI*t)*9:0;return {transform:'translate('+(from.x+(to.x-from.x)*t)+'cqw,'+(from.y-6+(to.y-from.y+6)*t-arc)+'cqh)',opacity:t<1?'1':'0'};},
   impactStyle(shot){const to=this.shotTarget(shot),age=this.motionState().elapsed-(shot.duration||500),t=Math.max(0,Math.min(1,age/240));return {transform:'translate('+to.x+'cqw,'+to.y+'cqh) translate(-50%,-50%) scale('+(1+t)+')',opacity:age>=0&&age<240?String(1-t):'0'};},
   siteStyle(i){const M=this.map,v=this.battle.buildings[i];if(!v)return this.anchorStyle(M.sites[i].tile);const p=this.spriteStyle(this.towerArt(v),M.sites[i].tile);return {left:(parseFloat(p.left)+parseFloat(p.width)/2)+'%',top:(parseFloat(p.top)+parseFloat(p.height)/2)+'%',width:p.width,height:p.height};},
   selectSite(i){if(!this.canPlan)return;this.selectedSite=i;this.menuOpen=true;const el=this.$el&&this.$el.querySelector('[data-site-index="'+i+'"]'),rect=el&&el.getBoundingClientRect();this.menuPosition=rect?{left:'clamp(12px,'+(rect.right+12)+'px,calc(100vw - 332px))',top:'clamp(12px,'+rect.top+'px,calc(100vh - 430px))'}:{};this.$nextTick(()=>{const menu=this.$refs.buildMenu;if(menu&&rect)this.menuPosition.top=Math.max(12,Math.min(rect.top,global.innerHeight-menu.getBoundingClientRect().height-12))+'px';});this.focus('buildMenu');},
   closeBuildMenu(){this.menuOpen=false;const el=this.$el&&this.$el.querySelector('[data-site-index="'+this.selectedSite+'"]');if(el)el.focus({preventScroll:true});},
   // Damage over six beats (the common multiple of every cadence), so a pricier
   // tower visibly shows a bigger whole number. Guards show their squad instead.
   powerLabel(type,level){const t=TYPES[type];return type==='guard'?'🛡 '+(level+2)+' חיילים':'⚔ עוצמה '+t.damage[level-1]*6/t.every;},
   canBuyType(type){return available(this.battle,this.selectedSite,type);},
   buyType(type){this.selectedType=type;this.buildSelected();},
   canBuild(){return available(this.battle,this.selectedSite,this.selectedType);},
   validPlacement(){return placement(this.battle,this.selectedSite,this.selectedType);},
   placementHint(){return 'המגדל צריך להיות בטווח של השביל. בחרו חלקה אחרת.';},
   upgradePrice(){return this.selected?upgradeCost(this.selected):0;},
   canUpgrade(){const v=this.selected;return !!v&&v.level<3&&this.battle.supplies>=upgradeCost(v);},
   buildSelected(){if(!this.canPlan)return;if(build(this.battle,this.selectedSite,this.selectedType)){this.feedback=TYPES[this.selectedType].name+' נבנה!';this.closeBuildMenu();this.saveCampaign();}},
   upgradeSelected(){if(this.canPlan&&upgrade(this.battle,this.selectedSite)){this.feedback='המגדל שודרג!';this.closeBuildMenu();this.saveCampaign();}},
   setRally(step){if(this.canPlan&&rally(this.battle,this.selectedSite,step)){this.feedback='השומרים יגנו על משבצת '+(step+1)+'.';this.saveCampaign();}},
   guardStatus(){return this.battle.guards.filter(g=>g.site===this.selectedSite).map(g=>g.hp>0?'שומר: '+g.hp+'/'+g.maxHp+' חיים':'שומר מתאושש').join(' · ');},
   answer(i){if(this.newWords.length||this.stopped||this.phase!=='ready'||!this.question||!Number.isInteger(i)||i<0||i>=this.options.length)return;this.phase='resolved';
    if(this.options[i]!==this.question.result){this.score=Math.max(0,this.score-1);this.saveScore();updateWeightForKey(this.currentAppId,this.questionIndex,1);if(!this.reloadProgress()){if(!this.newWords.length)this.phase='completed';return;}this.phase='retry';this.wrongIndex=i;this.feedback='ננסה שוב. הקרב מושהה והנקודות לקנייה נשמרות.';this.focus('nextAction');return;}
    updateWeightForKey(this.currentAppId,this.questionIndex,-1);this.score++;rewardAnswer(this.battle);this.saveCampaign();const keep=this.reloadProgress();this.saveScore();if(!keep){if(!this.newWords.length)this.phase='completed';return;}this.feedback='נכון! הרווחתם נקודה לקניית מגדלים ושדרוגים.';const token=this.run;this.answerTimer=setTimeout(()=>{if(this.stopped||token!==this.run||this.phase!=='resolved')return;this.answerTimer=null;this.continueGame();},700);
   },
   retry(){if(this.phase!=='retry'||this.stopped)return;this.phase='ready';this.wrongIndex=-1;this.feedback='';this.focus('questionHeading');},
   continueGame(){if(this.phase==='resolved'&&!this.stopped){this.invalidate();this.question=null;this.create();}},
   // Winning is recorded the moment the last raid ends, so the village is marked
   // on the journey map and the region's battle state is dropped even if the
   // player closes the game on the victory screen.
   nextWatch(){if(this.stopped||!['defeat','cleared'].includes(this.phase))return;
    prepareRaid(this.battle,this.phase==='cleared');this.motionState().elapsed=0;this.phase='planning';this.question=null;this.options=[];this.feedback='';this.saveCampaign();},
   // Both victory actions record the win first, so the village is marked even if
   // the player never lets the ending card settle.
   playAgain(){if(this.stopped||this.phase!=='victory')return;this.winRegion();this.restartRegion();},
   continueJourney(){if(this.stopped||this.phase!=='victory')return;this.winRegion();this.invalidate();
    this.menuOpen=false;this.question=null;this.options=[];this.wrongIndex=-1;this.resumePhase='planning';
    const next=nextLevel(this.battle.level);
    this.feedback=next?('האזור '+next.name+' נפתח!'):'סיימתם את כל האזורים!';
    if(next)this.showAtlas(next.id,next.id);
    else if(this.debugMode)this.showAtlas(this.battle.level,null);
    else{this.saveCampaign();this.exitGame();return;}
    this.saveCampaign();},
   onKey(e){if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(/^[1-4]$/.test(e.key)&&this.phase==='ready'){e.preventDefault();this.answer(Number(e.key)-1);}},
   visibility(){this.hidden=document.hidden;if(this.hidden){this.pauseMotion();this.invalidate();this.saveCampaign();}else if(this.phase==='combat'){this.resumeMotion();this.scheduleTick();}else if(this.phase==='resolved')this.continueGame();},
   invalidate(){this.stopFrames();this.run++;clearTimeout(this.turnTimer);clearTimeout(this.answerTimer);this.turnTimer=null;this.answerTimer=null;},
   exitGame(){this.saveCampaign();this.invalidate();this.phase='completed';const match=/^adv-([a-z0-9]+)-/.exec(this.currentAppId);this.$router.push(match?'/adventure/world/'+match[1]:'/app/'+this.currentAppId);}
  },
  mounted(){this.debugMode=this.debugAvailable;this.restoreCampaign();this.fitMap();global.addEventListener('resize',this.fitMap);this.reduced=!!(global.matchMedia&&global.matchMedia('(prefers-reduced-motion: reduce)').matches);this.visibility();document.addEventListener('visibilitychange',this.visibility);},
  watch:{'$route.params.currentAppId'(id){if(!id||id===this.currentAppId||this.stopped)return;this.saveCampaign();this.invalidate();this.newWords=[];this.newWordIndex=0;this.menuOpen=false;this.currentAppId=id;this.currentApp=getItemById(apps,id);this.theme=getTheme();this.battle=freshBattle();this.saves={};this.cleared=[];this.motionState().elapsed=0;this.phase='opening';this.question=null;this.options=[];this.selectedSite=0;this.feedback='';this.wrongIndex=-1;this.restoreCampaign();this.updateScore();this.reloadProgress();this.saveApp(id);}},
  beforeDestroy(){if(global.removeEventListener)global.removeEventListener('resize',this.fitMap);if(this.phase!=='completed')this.saveCampaign();this.stopped=true;this.invalidate();document.removeEventListener('visibilitychange',this.visibility);}
 }));}
 global.HEXKEEP={campaign:CAMPAIGN,levels:LEVELS,kinds:KINDS,levelOf,mapOf,nextLevel,canStartRaid,rewardAnswer,prepareRaid,range,upgradeCost,types:TYPES,freshBattle,placement,available,build,upgrade,resolveTurn,applyImpacts,themeKit,targetCount,rally,routeOf,pathOf,armorOf};global.createHexkeepComponent=createHexkeepComponent;
})(typeof window!=='undefined'?window:globalThis);
