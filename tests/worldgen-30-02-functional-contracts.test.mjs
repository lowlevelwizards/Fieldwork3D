import test from 'node:test';
import assert from 'node:assert/strict';
import {functionalSpacePlan,functionalSpaces,maxSolidOccupancy}
 from '../src/worldgen/functional-space.ts';
import {assessSpaceQuality} from '../src/worldgen/space-quality.ts';

const room=(purpose,id='R1')=>({id,purpose,kind:'room',x:0,y:0,w:100,h:100,tone:0});
test('room programs declare functional users and essential activity',()=>{
 const retail=functionalSpacePlan(room('sales'));
 assert.ok(retail.users.includes('customer'));
 assert.ok(retail.activities.includes('browse'));
 assert.ok(retail.essentialActivities.includes('circulate'));
 assert.equal(retail.routePriority,3);
 const home=functionalSpacePlan(room('bedroom'));
 assert.ok(home.users.includes('resident'));
 assert.ok(home.maxSolidFraction>retail.maxSolidFraction);
 assert.equal(functionalSpaces({rooms:[room('sales'),room('bedroom','R2')]}).length,2);
});
test('hallways have stricter density than storage and normal rooms',()=>{
 assert.ok(maxSolidOccupancy(room('hallway'))<maxSolidOccupancy(room('storage')));
 const obstacles=[{x:50,y:50,w:50,h:50,fixture:'rack'}];
 const storage=assessSpaceQuality({rooms:[room('storage')],cover:obstacles,doors:[]});
 const hallway=assessSpaceQuality({rooms:[room('hallway')],cover:obstacles,doors:[]});
 assert.equal(storage.crowdedRoomIds.length,0);
 assert.equal(hallway.crowdedRoomIds.length,0); // halls excluded from functional room statistics
});
test('all known public, service and residential roles have finite density targets',()=>{
 for(const purpose of ['dining','kitchen','guest','restroom','sales','bay',
 'loading','exam','office','aisle','waiting','storage','utility']){
  const plan=functionalSpacePlan(room(purpose));
  assert.ok(plan.maxSolidFraction>0&&plan.maxSolidFraction<1,purpose);
  assert.ok(plan.essentialActivities.length>0,purpose);
 }
});
