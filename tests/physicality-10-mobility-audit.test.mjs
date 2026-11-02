import test from 'node:test';import assert from 'node:assert/strict';
import {auditTacticalMobility}
 from '../src/worldgen/tactical-mobility-audit.ts';
import {measureSiteCompleteness}
 from '../src/worldgen/site-completeness.ts';
const door={id:'D',a:{x:100,y:100},b:{x:148,y:100},
 open:false,openedAt:-1,kind:'hinged',hinge:'a',swing:-1};
const site=(cover=[])=>({doors:[door],walls:[],cover,
 rooms:[],units:[],spawn:[],enemies:[],
 bounds:{minX:0,minY:0,maxX:300,maxY:300}});
test('unobstructed playable threshold has zero mobility issues',()=>{
 const audit=auditTacticalMobility(site());
 assert.equal(audit.checkedDoors,1);
 assert.equal(audit.issues.length,0);
});
test('furniture choking both door approaches is detected without pathfinding',()=>{
 const blocked=site([{x:124,y:130,w:100,h:45,fixture:'cabinet'},
  {x:124,y:70,w:100,h:45,fixture:'cabinet'}]);
 const audit=auditTacticalMobility(blocked);
 assert.ok(audit.blockedApproaches>=2);
 assert.ok(measureSiteCompleteness(blocked).mobilityIssues>=2);
});
test('mobility sampling is deterministic and bounded on excessive fixture data',()=>{
 const sample=site();
 sample.doors=Array.from({length:70},(_,i)=>({...door,id:'D'+i}));
 assert.deepEqual(auditTacticalMobility(sample),auditTacticalMobility(sample));
 assert.equal(auditTacticalMobility(sample).checkedDoors,32);
});
