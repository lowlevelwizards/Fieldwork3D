import test from 'node:test';
import assert from 'node:assert/strict';
import {roomCapacityTarget,fitFunctionalBaySizes} from '../src/worldgen/functional-bay-sizing.ts';
import {ROOM_CONTRACTS} from '../src/worldgen/room-contracts.ts';
import {sizedBlueprint} from '../src/worldgen/size-blueprints.ts';
import {architecturalBlueprint} from '../src/worldgen/architectural-program.ts';
test('compact wet rooms and utility closets preserve real fixture groups',()=>{
 for(const role of ['half-bath','closet','utility-closet']){
  assert.ok(ROOM_CONTRACTS[role].required.length);
  const dim=roomCapacityTarget(role);
  assert.ok(dim.w>=72&&dim.d>=72);
 }
 assert.ok(roomCapacityTarget('half-bath').w<roomCapacityTarget('bathroom').w);
});
test('service-only bays can shrink without shrinking working bays or hallways',()=>{
 const plan={kind:'office',family:'service-wing',widths:[160,142,64],
  depths:[130,125],front:{col:0,row:1},
  cells:[['office','closet','hallway'],['reception','closet','hallway']]};
 const sized=fitFunctionalBaySizes(plan);
 assert.ok(sized.widths[1]<142);
 assert.equal(sized.widths[0],160);
 assert.equal(sized.widths[2],64);
});
test('small offices include an actual supply closet rather than generic storage',()=>{
 const b=sizedBlueprint('office',12,'small',architecturalBlueprint('office',12));
 assert.ok(b.cells.flat().includes('closet'));
});
