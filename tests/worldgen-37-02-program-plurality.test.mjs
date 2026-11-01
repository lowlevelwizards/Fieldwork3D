import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,blueprintIssues}
 from '../src/worldgen/architectural-program.ts';
import {specializeBlueprint} from '../src/worldgen/subtype-blueprints.ts';
const count=(p,role)=>p.cells.flat().filter(x=>x===role).length;
test('the same restaurant layout has alternate real checkout locations',()=>{
 const original=architecturalBlueprint('restaurant',0);
 const plans=Array.from({length:36},(_,seed)=>
  specializeBlueprint(original,'cafe',seed));
 assert.ok(new Set(plans.map(p=>JSON.stringify(p.cells))).size>=2);
 for(let seed=0;seed<plans.length;seed++){
  const plan=plans[seed];
  assert.deepEqual(blueprintIssues(plan),[],String(seed));
  assert.equal(count(plan,'service'),count(original,'service')-1);
  assert.equal(count(plan,'checkout'),count(original,'checkout')+1);
  assert.deepEqual(plan,specializeBlueprint(original,'cafe',seed));
 }
});
test('sit-down restaurants and motel programs keep core functional rooms',()=>{
 const restaurant=architecturalBlueprint('restaurant',3);
 const variants=Array.from({length:12},(_,seed)=>
  specializeBlueprint(restaurant,'sit-down-restaurant',seed));
 assert.ok(variants.every(p=>blueprintIssues(p).length===0));
 assert.ok(variants.every(p=>count(p,'dining')>=count(restaurant,'dining')));
 const motel=architecturalBlueprint('motel',3);
 for(const subtype of ['roadside-motel','motor-lodge']){
  const p=specializeBlueprint(motel,subtype,9);
  assert.deepEqual(blueprintIssues(p),[]);
  assert.equal(count(p,'guest'),count(motel,'guest'));
 }
});
