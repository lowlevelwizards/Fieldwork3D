import test from 'node:test';
import assert from 'node:assert/strict';
import {initialDoors,activateSite} from '../src/breach-core.ts';
import {bodyClear,sweptBodyClear} from '../src/breach-navigation.ts';
import {localDetour} from '../src/breach-cooperation.ts';
test('141B: swept body detects a closed physical door, not invisible trim',()=>{
  activateSite(null);
  const doors=initialDoors();
  const from={x:300,y:510},to={x:300,y:554};
  assert.equal(sweptBodyClear(from,to,doors),false);
  const open=doors.map(x=>({...x,open:true,openFraction:1}));
  assert.equal(sweptBodyClear(from,to,open),true);
  assert.equal(bodyClear({x:300,y:532},open),true);
});
test('141B: local detour must never pass through a solid wall',()=>{
  activateSite(null);
  const doors=initialDoors();
  const p=localDetour({x:373,y:210},{x:400,y:210},doors,[]);
  if(p) assert.equal(sweptBodyClear({x:373,y:210},p,doors),true);
});