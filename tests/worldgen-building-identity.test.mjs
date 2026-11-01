import test from 'node:test';
import assert from 'node:assert/strict';
import {buildingIdentity} from '../src/worldgen/building-identity.ts';
import {generateSite} from '../src/breach-site.ts';

test('each building family derives stable and capacity-aware property identity',()=>{
 const kinds=['house','townhouse','apartment','retail','office','garage',
  'warehouse','restaurant','motel','utility','clinic'];
 for(const kind of kinds){
  const small=buildingIdentity(kind,57,'small',4);
  const large=buildingIdentity(kind,57,'large',16);
  assert.deepEqual(small,buildingIdentity(kind,57,'small',4));
  assert.ok(small.subtype.length>0);
  assert.ok(large.capacity>small.capacity);
 }
});
test('generated property identity is consistent with environmental dressing',()=>{
 for(const seed of [1,2,3,4,5,6,7,8,9,10,11]){
  const site=generateSite(seed);
  assert.ok(site.identity?.subtype);
  assert.equal(site.condition,site.identity.condition);
  assert.deepEqual(site.identity,generateSite(seed).identity);
 }
});
