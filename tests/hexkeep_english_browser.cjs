const {chromium}=require('playwright'),assert=require('assert');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>{delete Navigator.prototype.serviceWorker;});
  const page=await context.newPage();
  await page.emulateMedia({reducedMotion:'reduce'});
  for(const [id,list,question,result] of [
   ['grp-ch51-6','5_1','english_name','hebrew'],
   ['grp-ch51s-6','5_1','english_name','hebrew'],
   ['grp-g611-12','6.1_1','english_name','hebrew'],
   ['grp-g611h-12','6.1_1','hebrew','english']]) {
   await page.goto('http://127.0.0.1:8767/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>typeof BaseGameComponent!=='undefined');
   const config=await page.evaluate(id=>{
    const a=getItemById(apps,id);
    setLocalStorage(getActivityMode()+'_'+id+'_Weights',getDataList(a.listName).map((_,i)=>i<getSetItems(a)?5:-1));
    setLocalStorage(id+'_CurrentLevelProgress',{progress:0,total:100});
    setLocalStorage(id+'_new_items',[]);
    location.hash='/play/hexkeep/'+id;
    return [a.listName,a.questionIndex,a.resultIndex];
   },id);
   assert.deepStrictEqual(config,[list,question,result]);
   await page.locator('.hk-opening button').click();
   await page.locator('.hk-study').click();
   await page.waitForSelector('.hk-answers button');
   const before=await page.locator('.hk-game').evaluate(el=>{
    const g=el.__vue__,row=getDataList(g.currentApp.listName)[g.questionIndex];
    return {answer:g.question.result,expected:row[g.currentApp.resultIndex].value,index:g.options.indexOf(g.question.result),score:g.score,overflow:el.scrollWidth>innerWidth};
   });
   assert.strictEqual(before.answer,before.expected);
   assert.strictEqual(before.overflow,false);
   await page.locator('.hk-answers button').nth(before.index).click();
   const saved=await page.evaluate(id=>{
    const g=document.querySelector('.hk-game').__vue__,sibling=id.replace(/-\d+$/,'-0');
    return {turn:g.battle.turn,score:getScore(sibling),sameWeights:JSON.stringify(getLocalStorage(getActivityMode()+'_'+id+'_Weights'))===JSON.stringify(getLocalStorage(getActivityMode()+'_'+sibling+'_Weights'))};
   },id);
   assert.strictEqual(saved.turn,0);
   assert.strictEqual(saved.score,before.score+1);
   assert.strictEqual(saved.sameWeights,true);
   console.log('PASS vocabulary, mobile layout, answer and shared progress:',id);
  }
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
