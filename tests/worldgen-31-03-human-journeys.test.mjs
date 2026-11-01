import test from 'node:test';
import assert from 'node:assert/strict';
import {humanJourneyRules,inspectHumanJourneys}
 from '../src/worldgen/human-journeys.ts';
test('each archetype defines a representative everyday journey',()=>{
 for(const kind of ['house','townhouse','apartment','retail','office','garage',
 'warehouse','restaurant','motel','utility','clinic']){
  const journeys=humanJourneyRules(kind);
  assert.ok(journeys.length>=1,kind);
  assert.ok(journeys.every(x=>x.stops.length>=2),kind);
 }
});
test('human journeys are bounded and report missing operational rooms',()=>{
 const site={archetype:'retail',spawn:[{x:-10,y:20}],
  rooms:[{id:'R',purpose:'sales',kind:'room',x:0,y:0,w:100,h:100}]};
 const report=inspectHumanJourneys(site,()=>true,()=>true,2);
 assert.equal(report.checkedLegs,2);
 assert.deepEqual(report.issues.map(i=>i.reason),['missing-function']);
 assert.equal(report.issues[0].to,'checkout');
});
test('a crowded center is not automatically an unreachable destination',()=>{
 const site={archetype:'motel',spawn:[{x:-10,y:50}],
 rooms:[{id:'R',purpose:'reception',kind:'room',x:0,y:0,w:100,h:100},
        {id:'G',purpose:'guest',kind:'room',x:100,y:0,w:100,h:100}]};
 const report=inspectHumanJourneys(site,p=>p.x!==50,()=>true);
 assert.equal(report.issues.length,0);
});
