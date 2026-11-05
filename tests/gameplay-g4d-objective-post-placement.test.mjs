import test from 'node:test';
import assert from 'node:assert/strict';
import {assignEncounterRoles,assignObjectiveSecurity}
 from '../src/worldgen/encounter-roles.ts';
const group=[{id:'g',purpose:'occupants',members:['target','moved','near']}];
const actors=()=>[
 {id:'target',groupId:'g',role:'occupant',position:{x:100,y:100},
  heading:0,activity:'idle',readiness:'relaxed'},
 {id:'moved',groupId:'g',role:'occupant',position:{x:117,y:105},
  heading:0,activity:'idle',readiness:'relaxed'},
 {id:'near',groupId:'g',role:'occupant',position:{x:158,y:105},
  heading:0,activity:'idle',readiness:'relaxed'}
];
const site={objective:{x:98,y:99},rooms:[]};
test('G4d: security is reassigned at real positions after relocation',()=>{
 const provisional=assignEncounterRoles(site,actors(),group,'incident','capture',17,false);
 assert.equal(provisional[0].role,'target');
 assert.equal(provisional[1].role,'occupant');
 const final=[provisional[0],{...provisional[1],position:{x:500,y:450}},provisional[2]];
 const assigned=assignObjectiveSecurity(site,final,'capture');
 assert.equal(assigned[0].role,'target');
 assert.equal(assigned[1].role,'occupant');
 assert.equal(assigned[2].role,'sentry');
 assert.deepEqual(assigned.map(a=>a.position),final.map(a=>a.position));
 assert.deepEqual(assigned,assignObjectiveSecurity(site,final,'capture'));
 assert.equal(assigned.filter(a=>a.role==='target').length,1);
});
test('G4d: no nearby eligible guard means no invented protection',()=>{
 const candidates=actors().map((a,i)=>({
  ...a,role:i===0?'target':'occupant',
  position:i===0?a.position:{x:500+i*90,y:490}
 }));
 const out=assignObjectiveSecurity(site,candidates,'capture');
 assert.ok(out.every((a,i)=>a.role===candidates[i].role));
 assert.equal(out.length,candidates.length);
});
test('G4d: default direct role calls retain G4c contract',()=>{
 const direct=assignEncounterRoles(site,actors(),group,'incident','capture',17);
 assert.equal(direct[0].role,'target');
 assert.equal(direct[1].role,'sentry');
});
