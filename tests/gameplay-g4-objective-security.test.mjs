import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEncounterRoles} from '../src/worldgen/encounter-roles.ts';
const actors=()=>[
 {id:'target-candidate',groupId:'first',role:'occupant',
  position:{x:130,y:110},heading:0,activity:'idle',readiness:'relaxed'},
 {id:'nearby',groupId:'first',role:'occupant',
  position:{x:165,y:110},heading:0,activity:'idle',readiness:'relaxed'},
 {id:'far',groupId:'other',role:'occupant',
  position:{x:440,y:370},heading:0,activity:'idle',readiness:'relaxed'}
];
const groups=[{id:'first',purpose:'occupants',members:['target-candidate','nearby']},
 {id:'other',purpose:'occupants',members:['far']}];
const site={rooms:[],objective:{x:122,y:113}};
const run=mission=>assignEncounterRoles(site,actors(),groups,'incident',mission,19);
test('G4c: capture target stays unique and local escort already exists',()=>{
 const result=run('capture');
 assert.equal(result[0].role,'target');
 assert.equal(result.filter(a=>a.role==='target').length,1);
 assert.equal(result[1].role,'sentry');
 assert.equal(result[1].weaponProfile,'security');
 assert.deepEqual(result.map(a=>a.position),actors().map(a=>a.position));
 assert.deepEqual(result,run('capture'));
});
test('G4c: rescue/intel protect a nearby objective, hold stages a reserve',()=>{
 assert.equal(run('rescue')[0].role,'sentry');
 assert.equal(run('intel')[0].role,'sentry');
 assert.equal(run('hold')[0].role,'reserve');
 for(const mission of ['intel','rescue','hold']){
  assert.deepEqual(run(mission).map(a=>a.position),actors().map(a=>a.position));
  assert.deepEqual(run(mission),run(mission));
 }
});
test('G4c: distant mission objectives do not fabricate security positions',()=>{
 const remote={...site,objective:{x:-1000,y:-1000}};
 const result=assignEncounterRoles(remote,actors(),groups,'incident','hold',19);
 assert.ok(result.every(a=>a.role!=='reserve'));
 assert.deepEqual(result.map(a=>a.position),actors().map(a=>a.position));
});
test('G4c: clearing remains free of forced objective defenders',()=>{
 const clear=run('clear');
 assert.ok(clear.every(a=>a.role!=='target'));
 assert.ok(clear.every(a=>a.role!=='reserve'));
});
