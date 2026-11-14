import test from 'node:test';
import assert from 'node:assert/strict';
import {initDoor,initialOpeningYieldCandidate,openingYieldEligible}
 from '../src/breach-door.ts';
import {doorLeafSegment,pointToSegment,OPERATOR_RADIUS}
 from '../src/breach-core.ts';
import {openingYieldBudget,commitOpeningYield,MAX_OPENING_YIELD_TRAVEL}
 from '../src/breach-passage-yield.ts';
const door=()=>{
 const d=initDoor({id:'ASSISTED',a:{x:500,y:400},
  b:{x:540,y:400},open:true,openedAt:0},0);
 d.openFraction=.4;d.pushTarget=1.55;d.angularVelocity=0;
 return d;
};
test('D3.7 stalled 40%-open hand-assisted hinge permits existing tiny shoulder yield',()=>{
 const d=door();
 assert.equal(openingYieldEligible(d),true);
 const future=doorLeafSegment({...d,openFraction:.465});
 const cx=(future.a.x+future.b.x)/2,cy=(future.a.y+future.b.y)/2;
 const dx=future.b.x-future.a.x,dy=future.b.y-future.a.y;
 const len=Math.hypot(dx,dy);
 const candidates=[-1,1].flatMap(sign=>[OPERATOR_RADIUS+1,
  OPERATOR_RADIUS+2,OPERATOR_RADIUS+3].map(offset=>({
   x:cx+sign*(-dy)/len*offset,y:cy+sign*dx/len*offset
  })));
 const from=candidates.find(p=>initialOpeningYieldCandidate(d,p));
 assert.ok(from,'stalled assisted panel must retain a possible real yield');
 const proposed=initialOpeningYieldCandidate(d,from,1.25);
 assert.ok(proposed);
 assert.ok(Math.hypot(proposed.x-from.x,proposed.y-from.y)<=1.251);
 assert.ok(pointToSegment(proposed,future)>pointToSegment(from,future));
});
test('D3.7 never yield for moving or past-passage assisted leaf',()=>{
 const d=door();
 for(const changes of [
  {angularVelocity:.22},{angularVelocity:-.22},
  {openFraction:.8},{openFraction:.99},
  {open:false},{wedged:true},{kind:'sliding'}
 ]){
  const item={...d,...changes};
  assert.equal(openingYieldEligible(item),false);
  assert.equal(initialOpeningYieldCandidate(item,{x:515,y:415}),null);
 }
 assert.equal(openingYieldEligible({...d,pushTarget:1,angularVelocity:.22}),true,
  'ordinary initial opening yield policy stays intact');
});
test('D3.7 no yield can exceed existing per-door/per-actor travel budget',()=>{
 const d=door(),session={};
 assert.equal(openingYieldBudget(session,d,'unit'),MAX_OPENING_YIELD_TRAVEL);
 for(let n=0;n<MAX_OPENING_YIELD_TRAVEL;n++)
  commitOpeningYield(session,d,'unit',{x:0,y:0},{x:1,y:0});
 assert.equal(openingYieldBudget(session,d,'unit'),0);
 assert.equal(openingYieldBudget(session,d,'other'),MAX_OPENING_YIELD_TRAVEL);
});
test('D3.7 existing door phase still validates full physical sweep before yield',async()=>{
 const {readFileSync}=await import('node:fs');
 const code=readFileSync(new URL('../src/breach-simulation-medical-door-phase.ts',
  import.meta.url),'utf8');
 assert.match(code,/openingYieldEligible\(door\)/);
 assert.match(code,/sweptBodyClear\(actor\.p,candidate,s\.doors,OPERATOR_RADIUS/);
 assert.match(code,/commitOpeningYield\(s,door,actor\.id/);
 assert.match(code,/advanceDoor\(door,h,doorOccupants/);
});
