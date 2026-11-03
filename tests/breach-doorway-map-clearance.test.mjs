import test from 'node:test';
import assert from 'node:assert/strict';
import {auditTacticalMobility} from '../src/worldgen/tactical-mobility-audit.ts';
import {repairDoorwayClutter} from '../src/worldgen/doorway-clutter-repair.ts';
import {generateSite} from '../src/breach-site.ts';

const door={id:'DOOR',a:{x:64,y:100},b:{x:112,y:100},
 open:false,openedAt:-1,kind:'hinged'};
const walls=[
 {a:{x:8,y:100},b:{x:64,y:100}},
 {a:{x:112,y:100},b:{x:195,y:100}}
];
const room={id:'LIVING',kind:'room',purpose:'living',x:0,y:100,
 w:200,h:165,tone:0};
const blocked=(fixture,x=88)=>({
 seed:24,name:'clearance regression',layout:'corridor',
 doors:[{...door}],walls:structuredClone(walls),
 rooms:[room],cover:[{x,y:144,w:24,h:24,fixture,low:true}],
 entrance:{x:88,y:100},spawn:[],enemies:[],
 objective:{x:88,y:240},extract:{x:88,y:240},
 bounds:{minX:0,minY:0,maxX:200,maxY:280},roomCount:1
});
test('audits connected doorway approach rather than isolated clear points',()=>{
 const site=blocked('chair');
 const audit=auditTacticalMobility(site);
 assert.equal(audit.blockedApproaches,0,
  'single clear points alone should not be reported as the whole problem');
 assert.ok(audit.blockedFlow>=1,
  'an occupied continuous approach should be explicitly reported');
});
test('loose incidental chair moves away from a door without changing the architecture',()=>{
 const site=blocked('chair');
 const baseline=structuredClone(site);
 const original=auditTacticalMobility(site);
 const repaired=repairDoorwayClutter(site);
 assert.ok(repaired.moved>=1);
 assert.equal(repaired.site.cover.length,1);
 assert.notEqual(repaired.site.cover[0].x,88);
 assert.deepEqual(repaired.site.walls,site.walls);
 assert.deepEqual(repaired.site.doors,site.doors);
 assert.deepEqual(site,baseline,'do not mutate the source map');
 assert.ok(auditTacticalMobility(repaired.site).blockedFlow<
    original.blockedFlow,
   'clearance pass must actually improve doorway traversal');
});
test('large fixed furniture is never erased to make a doorway look passable',()=>{
 const site=blocked('fridge');
 const before=auditTacticalMobility(site);
 const repaired=repairDoorwayClutter(site);
 assert.equal(repaired.moved,0);
 assert.deepEqual(repaired.site.cover,site.cover);
 assert.ok(auditTacticalMobility(repaired.site).blockedFlow>=before.blockedFlow);
});
test('tiny step-over clutter never counts as a blocked operator corridor',()=>{
 const site=blocked('pallet');
 assert.equal(auditTacticalMobility(site).blockedFlow,0);
 assert.equal(repairDoorwayClutter(site).moved,0);
});
test('generator remains deterministic after constrained furnishing adjustments',()=>{
 const first=generateSite(35,'small'),second=generateSite(35,'small');
 assert.deepEqual(first,second);
 assert.ok(first.doors.length>0);
 assert.ok(first.cover.every(o=>Number.isFinite(o.x)&&Number.isFinite(o.y)));
});
