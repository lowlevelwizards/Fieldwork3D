import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint} from '../src/worldgen/architectural-program.ts';
import {fitSpatialProgram,blueprintRelationshipCost,
 missingCriticalRoomContacts,roleFragmentCount}
 from '../src/worldgen/spatial-program-fit.ts';

test('critical contacts require a real door-capable shared edge',()=>{
 const narrow={kind:'retail',family:'compact counter',
  widths:[60,145],depths:[120,122],front:{col:0,row:1},
  cells:[['sales','stockroom'],['checkout',null]]};
 assert.deepEqual(missingCriticalRoomContacts(narrow),[{a:'checkout',b:'sales'}]);
 const workable={...narrow,widths:[90,145]};
 assert.deepEqual(missingCriticalRoomContacts(workable),[]);
 assert.equal(blueprintRelationshipCost(narrow)-
   blueprintRelationshipCost(workable),48,
   'a short partition cannot satisfy the customer checkout connection');
 const noCheckout={...narrow,cells:[['sales','stockroom'],['sales',null]]};
 assert.deepEqual(missingCriticalRoomContacts(noCheckout),[]);
});

test('connected working rooms are counted as real clusters',()=>{
 const base={kind:'retail',family:'layout',widths:[130,130,130],
  depths:[125,125],front:{col:0,row:1},
  cells:[['sales','sales','storage'],['storage','sales','sales']]};
 assert.equal(roleFragmentCount(base,'sales'),1);
 assert.equal(roleFragmentCount({...base,
  cells:[['sales','storage','sales'],['storage','storage','sales']]},'sales'),2);
});

test('fitter cannot splinter authored open zones or erase room functions',()=>{
 for(const kind of ['house','townhouse','retail','office','garage',
  'warehouse','restaurant','utility','clinic']){
  for(const seed of [0,4,9,15,28]){
   const original=architecturalBlueprint(kind,seed);
   const after=fitSpatialProgram(original,4);
   assert.deepEqual(after.cells.flat().slice().sort(),
     original.cells.flat().slice().sort(),kind+' '+seed);
   assert.deepEqual(after.front,original.front);
   assert.ok(blueprintRelationshipCost(after)<=blueprintRelationshipCost(original),
     kind+' '+seed);
   for(const role of ['sales','dining','living','kitchen','stockroom',
    'cubicles','waiting','reception','equipment'])
    assert.ok(roleFragmentCount(after,role)<=roleFragmentCount(original,role),
      kind+' '+seed+' split '+role);
   assert.deepEqual(after,fitSpatialProgram(original,4));
  }
 }
});
