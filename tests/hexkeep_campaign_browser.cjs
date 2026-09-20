// Isolated browser profiles: production vocabulary/answer engine, controllable clock.
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;console.log('PASS',label);};
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true});
 await context.addInitScript(()=>{delete Navigator.prototype.serviceWorker;});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const state=fn=>page.locator('.hk-game').evaluate((el,s)=>(new Function('g','return ('+s+')(g)'))(el.__vue__),fn.toString());
 async function enter(id='grp-ch51-6',fresh=true){
  await page.goto('http://127.0.0.1:8767/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof BaseGameComponent!=='undefined');
  await page.evaluate(({id,fresh})=>{const a=getItemById(apps,id);if(fresh){setLocalStorage(id+'_HexkeepCampaign_v5',null);setLocalStorage(id+'_HexkeepCampaign_v4',null);setLocalStorage(id+'_HexkeepCampaign_v3',null);setLocalStorage(getActivityMode()+'_'+id+'_Weights',getDataList(a.listName).map(()=>15));setLocalStorage(id+'_CurrentLevelProgress',{progress:0,total:9999});setLocalStorage(id+'_new_items',[]);}location.hash='/play/hexkeep/'+id;},{id,fresh});
  await page.waitForSelector('.hk-game');
 }
 async function answer(correct=true){const i=await state(g=>g.options.indexOf(g.question.result));await page.locator('.hk-answers button').nth(correct?i:(i+1)%4).click();}
 await page.clock.install();await enter();
 check(await page.locator('.hk-game').getAttribute('dir')==='rtl','Hebrew layout');
 check(!await page.locator('.hk-campaign').count(),'no 200-answer target or progress bar');
 await page.locator('.hk-opening button').click();check(!await page.locator('.hk-learning').count(),'entering village does not force a quiz');
 check(!await page.locator('.hk-launch').isDisabled(),'player launches raids without question-count gating');
 await page.locator('.hk-study').click();const before=await state(g=>JSON.stringify([g.question.question,g.options,g.battle]));
 await answer(false);check(await state(g=>g.phase==='retry'&&g.battle.earned===0&&g.battle.turn===0),'wrong answer earns nothing and leaves world still');
 await page.locator('.hk-continue').click();check(await state(g=>JSON.stringify([g.question.question,g.options,g.battle]))===before,'exact question and choices on retry');
 const score=await state(g=>g.score);await answer();await state(g=>{g.answer(g.options.indexOf(g.question.result));return true;});
 check(await state(g=>g.battle.supplies===1&&g.battle.earned===1&&g.battle.turn===0&&g.score===getScore(g.currentAppId)),'correct pays once, persists score and never advances combat');
 check(await state(g=>g.score)===score+1,'duplicate answer rejected');await page.clock.runFor(700);check(await state(g=>g.phase==='ready'&&g.battle.earned===1),'correct answer automatically opens next question after short delay');
 await page.locator('.hk-return').click();await page.locator('.hk-study').click();
 check(await state(g=>g.phase==='ready'),'return to learning opens a fresh unpaid question');
 const plan=[[0,'mage'],[0,'upgrade'],[2,'mage'],[2,'upgrade'],[2,'upgrade'],[5,'mage'],[5,'upgrade'],[3,'mage'],[3,'upgrade'],[1,'mage'],[1,'upgrade'],[4,'archer']];let purchase=0;
 for(let wave=1;wave<=10;wave++){
  await page.evaluate(target=>{const g=document.querySelector('.hk-game').__vue__;while(g.battle.earned<target){if(g.phase==='resolved')g.continueGame();g.answer(g.options.indexOf(g.question.result));if(g.phase==='completed')throw Error('unexpected curriculum exit');}},wave*24);
  await page.locator('.hk-return').click();
  while(purchase<plan.length){const [index,type]=plan[purchase];const ok=await page.locator('.hk-game').evaluate((el,{index,type})=>{const g=el.__vue__;g.selectSite(index);let bought;if(type==='upgrade'){bought=g.canUpgrade();if(bought)g.upgradeSelected();}else{g.selectedType=type;bought=g.canBuild();if(bought)g.buildSelected();}g.closeBuildMenu();return bought;},{index,type});if(!ok)break;purchase++;}
  await page.locator('.hk-launch').click();
  if(wave===1){
   await page.clock.runFor(2200);check(await state(g=>g.battle.turn)===2,'raid advances automatically without questions');
   const balance=await state(g=>g.battle.supplies);await page.locator('.hk-study').click();const turn=await state(g=>g.battle.turn);
   await page.clock.runFor(4400);check(await state(g=>g.battle.turn)===turn,'combat stops for the entire question screen');
   await page.locator('.hk-return').click();await page.clock.runFor(1100);check(await state(g=>g.battle.turn)===turn+1,'return resumes at next normal tick');
   check(await state(g=>g.battle.supplies)===balance,'automatic ticks give no free points');
   await page.screenshot({path:'artifacts/hexkeep/autonomous-raid.png',fullPage:true});
  }
  await page.clock.runFor(55000);check(await state(g=>g.phase)===(wave===10?'victory':'cleared'),'wave '+wave+' ends automatically');
  const frozen=await state(g=>g.battle.turn);await page.clock.runFor(3300);check(await state(g=>g.battle.turn)===frozen,'wave '+wave+' stays stopped at ending');
  if(wave<10){await page.locator('.hk-ending button').click();await page.locator('.hk-study').click();}
 }
 check(await state(g=>g.battle.earned===240&&g.battle.supplies===0&&g.battle.buildings.every(Boolean)),'240 real answers fund a complete winning campaign');
 await page.screenshot({path:'artifacts/hexkeep/campaign-victory.png',fullPage:true});
 // Theme / viewport matrix uses the real Hebrew instructions and English chapter.
 const themes=await page.evaluate(()=>Object.keys(themeOptions));
 for(const theme of themes){await page.evaluate(theme=>{setTheme(theme);document.querySelector('.hk-game').__vue__.theme=getTheme();},theme);for(const size of [{width:1440,height:1000},{width:390,height:844},{width:844,height:390},{width:768,height:1024}]){
  await page.setViewportSize(size);const fit=await page.locator('.hk-game').evaluate(el=>({overflow:el.scrollWidth>innerWidth,small:[...el.querySelectorAll('button')].filter(b=>b.offsetParent&&!b.disabled).some(b=>{const r=b.getBoundingClientRect();return r.width<43||r.height<43;})}));check(!fit.overflow&&!fit.small,theme+' '+size.width+' readable Hebrew and touch targets');
 }}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'artifacts/hexkeep/campaign-mobile.png',fullPage:true});
 // Mid-raid persistence: no auto-start after refresh; explicit resume is required.
 await enter();await page.locator('.hk-opening button').click();await state(g=>{g.battle.earned=20;g.battle.supplies=20;g.selectedType='guard';g.buildSelected();g.startRaid();return true;});await page.clock.runFor(2200);
 const savedBattle=await state(g=>JSON.stringify(g.battle));await page.reload({waitUntil:'domcontentloaded'});await page.waitForSelector('.hk-resume');
 check(await state(g=>JSON.stringify(g.battle))===savedBattle,'reload restores buildings, wallet, answers and enemies');
 const pausedTurn=await state(g=>g.battle.turn);await page.clock.runFor(3300);check(await state(g=>g.battle.turn)===pausedTurn,'restored raid stays paused');await page.locator('.hk-resume').click();await page.clock.runFor(1100);check(await state(g=>g.battle.turn)===pausedTurn+1,'explicit saved-raid resume');
 await page.emulateMedia({reducedMotion:'reduce'});await state(g=>{g.reduced=true;return true;});const t=await state(g=>g.battle.turn);await page.clock.runFor(1100);check(await state(g=>g.battle.turn)===t+1,'reduced motion retains automatic game clock');
 await page.locator('.hk-exit').click();await page.clock.runFor(4400);check(!await page.locator('.hk-game').count(),'navigation cancels autonomous timer');
 // Preserve engine completion routing and the final reward, for legacy and Adventure.
 for(const id of ['grp-ch51-6','6_0','adv-hexkeep-1','adv-hexkeep-2']){
  await enter(id);await page.locator('.hk-opening button').click();await page.locator('.hk-study').click();await page.evaluate(()=>{const g=document.querySelector('.hk-game').__vue__,w=getDataList(g.currentApp.listName).map(()=>0);w[g.questionIndex]=1;setLocalStorage(getActivityMode()+'_'+g.currentAppId+'_Weights',w);setLocalStorage(g.currentAppId+'_CurrentLevelProgress',{progress:0,total:1});});
  await answer();await page.waitForFunction(()=>!document.querySelector('.hk-game'));
  check(await page.evaluate(({id})=>location.hash.includes(id.startsWith('adv-')?'/adventure/world/hexkeep':'/app/'+id),{id}),'engine completion route '+id);
  check(await page.evaluate(id=>getLocalStorage(id+'_HexkeepCampaign_v5').levels.valley.battle.earned,id)===1,'final answer currency saved before navigation '+id);
 }
 check(!errors.length,'no page errors: '+errors.join('; '));console.log(checks+' campaign browser checks passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
