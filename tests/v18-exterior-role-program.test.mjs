import test from 'node:test';
import assert from 'node:assert/strict';
import {propDefinition} from '../src/worldgen/asset-catalog.ts';
import {exteriorRoleRequests,exteriorRoleBudget} from '../src/worldgen/exterior-role-program.ts';
const types=['house','townhouse','apartment','retail','office','garage','warehouse','restaurant','motel','utility','clinic'];
const kinds=['yard','patio','driveway','service','garden','parking'];
const zone=(kind,id='arrival-forecourt')=>({id,kind,x:100,y:100,w:260,h:100});
const retired=new Set(['vehicle','sedan','pickup','van','suv','shrub-round','shrub-tall','bush','hedge']);
test('V18 role recipes use existing non-retired assets and stable distinct role IDs',()=>{
 for(const type of types)for(const kind of kinds)for(const id of ['arrival-forecourt','rear-property','side-passage','court-0']){
  const z=zone(kind,id),requests=exteriorRoleRequests(type,z);
  assert.deepEqual(requests,exteriorRoleRequests(type,z));
  assert.equal(new Set(requests.map(r=>r.role)).size,requests.length);
  for(const r of requests){assert.ok(r.alternatives.length);for(const f of r.alternatives){assert.ok(propDefinition(f),f);assert.ok(!retired.has(f),f);}}
 }
});
test('V18 programs distinguish actual property functions and scale budgets',()=>{
 assert.equal(exteriorRoleRequests('house',zone('yard'))[0].alternatives[0],'mailbox');
 assert.equal(exteriorRoleRequests('restaurant',zone('patio','rear-property'))[0].alternatives[0],'picnic-table');
 assert.ok(exteriorRoleRequests('warehouse',zone('service','rear-property')).some(r=>r.role==='freight'));
 assert.ok(exteriorRoleRequests('garage',zone('service','rear-property')).some(r=>r.alternatives.includes('tire-stack')));
 assert.ok(exteriorRoleBudget(zone('yard'))>exteriorRoleBudget({...zone('yard'),w:100,h:60}));
 assert.equal(exteriorRoleBudget({...zone('yard','court-0'),w:70,h:70}),0);
});

import {expandFrontageCandidates} from '../src/worldgen/outdoor-fixture-policy.ts';
test('V18 frontage row offers bounded additional slots without moving special anchors',()=>{
 const z=zone('parking'),points=[{x:0,y:80},{x:200,y:80}];
 const expanded=expandFrontageCandidates(z,'street-lamp',points);
 assert.equal(expanded.length,8);
 assert.deepEqual(expanded.slice(0,2),points);
 assert.ok(expanded.every(p=>p.y===80&&p.x>=0&&p.x<=200));
 assert.equal(expandFrontageCandidates(z,'vending-machine',points),points);
 assert.equal(expandFrontageCandidates(z,'parking-sign',points),points);
 assert.equal(expandFrontageCandidates(z,'street-lamp',null),null);
 assert.notDeepEqual(exteriorRoleRequests('retail',z,0),exteriorRoleRequests('retail',z,1));
 assert.deepEqual(exteriorRoleRequests('retail',z,1),exteriorRoleRequests('retail',z,1));
});

import {exteriorDoorReserves,intersectsExteriorDoorReserve} from '../src/worldgen/exterior-door-reserve.ts';
import {addExteriorProperty} from '../src/worldgen/exterior-sites.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('V18 protects the full doorway approach footprint, not merely the prop center',()=>{
 for(const rotated of [false,true]){
  const door={a:rotated?{x:100,y:80}:{x:80,y:100},b:rotated?{x:100,y:120}:{x:120,y:100}};
  const reserves=exteriorDoorReserves([door]);
  const box=rotated?{x:175,y:100,w:40,h:20}:{x:100,y:175,w:20,h:40};
  assert.ok(Math.hypot(box.x-100,box.y-100)>68);
  assert.ok(intersectsExteriorDoorReserve(reserves,box));
  const far={...box,x:rotated?200:box.x,y:rotated?box.y:200};
  assert.equal(intersectsExteriorDoorReserve(reserves,far),false);
 }
});
test('V18 all new exterior furnishing respects reserved door footprints on four facades',()=>{
 for(const side of ['north','south','east','west']){
  const horizontal=side==='north'||side==='south';
  const entrance={x:side==='west'?225:side==='east'?475:350,y:side==='north'?230:side==='south'?430:330};
  const door={id:'FRONT',a:{x:entrance.x-(horizontal?24:0),y:entrance.y-(horizontal?0:24)},b:{x:entrance.x+(horizontal?24:0),y:entrance.y+(horizontal?0:24)}};
  const lot={seed:117,archetype:'restaurant',entrySide:side,rooms:[{id:'R',kind:'room',x:225,y:230,w:250,h:200}],bounds:{minX:0,minY:0,maxX:700,maxY:700},doors:[door],entrance,cover:[],spawn:[],enemies:[],objective:{x:-99,y:-99},extract:{x:-99,y:-99}};
  const result=addExteriorProperty(lot,117);
  assert.ok(result.cover.length>0);
  const reserves=exteriorDoorReserves(lot.doors);
  assert.ok(result.cover.every(o=>!intersectsExteriorDoorReserve(reserves,o)));
 }
});
test('V18 regression witness: small restaurant seed 117 must retain baseline doorway flow',()=>{
 const result=auditGeneratedSite(117,'small');
 assert.equal(result.mobilityQuality.blockedApproaches+result.mobilityQuality.blockedFlow,0,JSON.stringify({family:result.planFamily,issues:result.mobilityQuality.issues,errors:result.errors}));
});
