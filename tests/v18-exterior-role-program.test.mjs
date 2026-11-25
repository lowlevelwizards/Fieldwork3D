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
