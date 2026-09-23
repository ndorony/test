const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:390,height:844}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{delete Navigator.prototype.serviceWorker;});await p.clock.install();await p.goto('http://127.0.0.1:8873/');await p.waitForFunction(()=>window.MOMENTUM_FACTORY);
 await p.evaluate(()=>{const id='grp-ch51-7',a=getItemById(apps,id);setLocalStorage(getActivityMode()+'_'+id+'_Weights',getDataList(a.listName).map(()=>50));setLocalStorage(id+'_CurrentLevelProgress',{progress:0,total:9999});setLocalStorage(id+'_new_items',[]);location.hash='/play/momentum_factory/'+id;});
 await p.locator('.mf-start').click();await p.screenshot({path:'artifacts/momentum-factory/guided-start.png'});
 for(let n=0;n<60;n++){
  const state=await p.locator('.mf-game').evaluate(e=>({visits:e.__vue__.market.visits,remaining:e.__vue__.guideRemaining,action:e.__vue__.guide.action,phase:e.__vue__.phase}));
  if(state.visits)break;
  if(state.remaining){await p.locator('.mf-guide-action').click();for(let i=0;i<state.remaining;i++){await p.locator('.mf-game').evaluate(e=>{const g=e.__vue__;g.answer(g.options.indexOf(g.question.result));});await p.clock.runFor(720);}await p.locator('.mf-return').click();}
  else if(state.action==='wait'&&state.phase==='running')await p.clock.runFor(2000);
  else await p.locator('.mf-guide-action').click();
 }
 assert(await p.locator('.mf-game').evaluate(e=>e.__vue__.market.visits>0&&e.__vue__.factory.earned===6));
 for(const size of [{width:390,height:844},{width:320,height:568},{width:844,height:390},{width:1365,height:900}]){
  await p.setViewportSize(size);await p.screenshot({path:`artifacts/momentum-factory/guide-${size.width}.png`});
  assert(await p.locator('.mf-guide-action').evaluate(e=>{const r=e.getBoundingClientRect();return r.x>=0&&r.right<=innerWidth&&r.y>=0&&r.bottom<=innerHeight&&document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)===e;}),'guide visible and tappable');
 }
 await p.reload();await p.locator('.mf-guide').waitFor();assert(await p.locator('.mf-game').evaluate(e=>e.__vue__.market.visits>0&&e.__vue__.guide.type==='press'));
 assert.deepEqual(errors,[]);console.log('PASS first sale using only guide and 6 actual answers, tappable guide at four sizes, saved next mission');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
