const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={console};vm.createContext(ctx);vm.runInContext(fs.readFileSync('games/momentum-factory.js','utf8'),ctx);
const F=ctx.MOMENTUM_FACTORY,s=F.fresh();let steps=0,firstSale=false;
// Follow only the suggested action. No money, stock, or production fixtures.
while(s.outcome!=='victory'&&steps++<30000){
 if(s.outcome==='milestone')F.nextOrder(s);
 const g=F.guidance(s);
 if(s.points<g.cost){F.reward(s);continue;}
 switch(g.action){
  case 'build':assert(F.buy(s,g.site,g.type));break;
  case 'assign':assert(F.assign(s,g.site));break;
  case 'hire':assert(F.hire(s));break;
  case 'outlet':assert(F.openOutlet(s,'raw'));break;
  case 'resume':s.market.paused.raw=false;break;
  case 'upgrade':assert(F.upgrade(s,g.site));break;
  case 'wait':s.started=true;break;
  default:throw Error('Unknown guide action');
 }
 F.step(s,100);
 if(s.market.visits&&!firstSale){firstSale=true;assert.equal(s.earned,6);}
}
assert(firstSale,'first customer reached');assert.equal(s.outcome,'victory','guide must reach all three orders');
assert.equal(s.earned,241,'all suggested purchases funded by answers');
const restored=JSON.parse(JSON.stringify(s));assert.deepEqual(F.guidance(restored),F.guidance(s),'guide reconstructed from normal save');
console.log('PASS guided first sale at 6 answers and complete campaign at 241, without stock/money fixtures; save-derived guidance');
