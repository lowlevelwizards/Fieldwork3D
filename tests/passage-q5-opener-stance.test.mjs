import test from 'node:test';
import assert from 'node:assert/strict';
import {doorRangeSite} from '../src/breach-door-test-cases.ts';
import {openerThreatensLeaf,selectOpeningStance,MAX_HANDLE_STANCE_TRAVEL}
 from '../src/breach-door-opening-stance.ts';
const p=(x,y)=>({x,y});
const d=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
test('Q5 outward opening handler can rehearse a real clear jamb-side step',()=>{
 for(const id of ['inward-left','outward-left',
   'inward-right','outward-right']){
  const door=doorRangeSite(id).doors[0];
  for(const side of [-1,1]){
   const here=[p(297,260+side*31),p(312,260+side*25),
    p(326,260+side*31)].find(at=>openerThreatensLeaf(door,at));
   if(!here)continue;
   assert.equal(selectOpeningStance(door,here,()=>false,[]),null);
   const goal=selectOpeningStance(door,here,()=>true,[]);
   assert.ok(goal,JSON.stringify({id,side,here}));
   assert.equal(openerThreatensLeaf(door,goal),false);
   assert.ok(d(goal,here)<=MAX_HANDLE_STANCE_TRAVEL);
   const other=selectOpeningStance(door,here,()=>true,[goal]);
   assert.ok(!other||d(other,goal)>=17);
  }
 }
});
test('Q5 no eager sidestep on already safe/locked/active leaf',()=>{
 const door=doorRangeSite('inward-left').doors[0];
 assert.equal(selectOpeningStance(door,p(260,230),()=>true,[]),null);
 assert.equal(openerThreatensLeaf({...door,open:true},p(297,291)),false);
});

test('Q5 out-of-reach handle correction exceeds motor arrival tolerance',async()=>{
 const {doorApproach,doorReachable}=await import('../src/breach-door.ts');
 const {newSession}=await import('../src/breach-game.ts');
 const {activateSite}=await import('../src/breach-core.ts');
 const {sessionWorldGeometry}=await import('../src/breach-world-context.ts');
 for(const sample of [
  {id:'inward-left',face:'south',at:p(297.735,291.324),
   peers:[p(331.796,323.622),p(270.746,282.812),p(345.528,281.926)]},
  {id:'outward-left',face:'north',at:p(297.735,228.676),
   peers:[p(331.796,196.378),p(270.648,237.281),p(344.528,239.602)]}
 ]){
  const s=newSession(0,undefined,'full-view','small','hold',
   doorRangeSite(sample.id,'diagonal-left',sample.face),
   {enableCivilians:false});
  try{
   const door=s.doors[0];
   assert.equal(doorReachable(sample.at,door),false);
   const correction=doorApproach(sample.at,door,
    sessionWorldGeometry(s),sample.peers,4.25);
   assert.ok(correction,'must find reachable micro-position');
   assert.equal(doorReachable(correction,door),true);
   assert.ok(d(sample.at,correction)>4.2);
  }finally{activateSite(null);}
 }
});
