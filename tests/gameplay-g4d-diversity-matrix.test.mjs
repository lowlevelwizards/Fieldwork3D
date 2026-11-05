import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectG4DSite,summarizeG4D}
 from '../src/worldgen/g4-diversity-matrix.ts';
const site=()=>({
 seed:11,scale:'small',archetype:'house',layout:'corridor',
 planFamily:'L',rooms:[
  {id:'office',kind:'room',x:0,y:0,w:250,h:220}
 ],walls:[],doors:[],cover:[],spawn:[{x:-800,y:-800}],
 entrance:{x:-750,y:-750},extract:{x:-820,y:-820},
 objective:{x:100,y:100},enemies:[],
 encounter:{premise:'guarded',profile:'prepared',actors:[
  {id:'guard',position:{x:140,y:100},heading:0,role:'sentry',
   groupId:'a',roomId:'office'}
 ]}
});
const audit=()=>({
 errors:[],encounterAudit:{groups:1,occupiedZones:1,
  closestPair:0,nearInsertionCount:0},
 tacticalOpportunities:{objectiveEntryDistance:100,verifiedAlternateDoors:0,
  verifiedWindows:0},
 mobilityQuality:{blockedFlow:0}
});
test('G4d: healthy seed produces understandable structural warning, not failure',()=>{
 const row=inspectG4DSite(site(),audit(),'intel');
 assert.equal(row.hardFailures.length,0);
 assert.equal(row.objectiveGuards,1);
 assert.ok(row.warnings.some(w=>w.includes('primary verified insertion')));
 assert.equal(summarizeG4D([row]).invalid,0);
});
test('G4d: capture missing target, duplicate id, and insertion violation are hard',()=>{
 const s=site();s.encounter.actors.push({...s.encounter.actors[0],
  position:{x:-800,y:-800}});
 const row=inspectG4DSite(s,audit(),'capture');
 assert.ok(row.hardFailures.some(e=>e.includes('capture target count')));
 assert.ok(row.hardFailures.some(e=>e.includes('duplicate hostile id')));
 assert.ok(row.hardFailures.some(e=>e.includes('unsafe insertion')));
});
test('G4d: repeated topology is measured only within comparable groups',()=>{
 const x=inspectG4DSite(site(),audit(),'intel');
 const y={...x,seed:22};
 const z={...x,mission:'capture',seed:33};
 const m=summarizeG4D([x,y,z]);
 assert.equal(m.sampled,3);
 assert.equal(m.repeatedComparableTopologyShare,50);
 assert.equal(m.profileDistribution.intel.prepared,2);
});
