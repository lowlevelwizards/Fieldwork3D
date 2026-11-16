import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nearestEligibleActor} from '../src/ui/tactical-nearest-actor.ts';
test('E1.K nearest eligible target preserves stable tie and does not mutate roster',()=>{
 const roster=[
  {id:'ignored',p:{x:0,y:0},ok:false},
  {id:'first',p:{x:7,y:2},ok:true},
  {id:'second',p:{x:7,y:-2},ok:true},
  {id:'far',p:{x:90,y:90},ok:true}
 ];
 const before=JSON.stringify(roster);
 assert.equal(nearestEligibleActor(roster,{x:0,y:0},a=>a.ok)?.id,'first');
 assert.equal(nearestEligibleActor(roster,{x:7,y:-1},a=>a.ok)?.id,'second');
 assert.equal(nearestEligibleActor(roster,{x:0,y:0},()=>false),null);
 assert.equal(nearestEligibleActor([],{x:0,y:0},()=>true),null);
 assert.equal(JSON.stringify(roster),before);
});
test('E1.K UI medical and casualty candidates reuse squad once with unchanged eligibility gates',()=>{
 const source=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const range=source.slice(source.indexOf('function casualtyCandidate('),source.indexOf('function updateHud(){'));
 assert.equal((range.match(/const squad=team\(state\);/g)||[]).length,2);
 assert.match(range,/o\.health<=0&&!o\.surrendered/);
 assert.match(range,/mostUrgentWound\(o\.medical\)/);
 assert.match(range,/treatmentSupplyForWound\(wound,a\.medicalSupplies\)/);
 assert.doesNotMatch(range,/\.sort\(/);
});
