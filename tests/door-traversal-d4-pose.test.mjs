import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveOperatorActionState}
 from '../src/breach-pose-action-state.ts';
const base={
 seconds:15,lastThrowAt:-100,lastDoorAt:4,doorMethod:'open',
 weapon:'carbine',reload:0,reloadDuration:1.8,reloadMode:'emergency',
 treatmentActive:false,down:false,surrender:false,
 injury:0,hitRegion:'torso',aiming:false,firing:false,hitAge:100,
 doorPoint:{x:15,y:9}
};
const resolve=(changes={})=>resolveOperatorActionState({...base,...changes},0,false);
test('D4 actual grip keeps support hand on door beyond original gesture',()=>{
 const held=resolve({doorHandHold:true,doorHandHoldSince:7});
 assert.equal(held.doorActive,true);
 assert.equal(held.handOwners.left,'door');
 assert.equal(held.handOwners.right,'weapon');
 assert.equal(resolve({doorHandHold:false}).doorActive,false);
 assert.equal(resolve({doorHandHold:true,doorPoint:undefined}).doorActive,false);
});
test('D4 higher priority actions interrupt sustained hand contact visually',()=>{
 assert.equal(resolve({doorHandHold:true,reload:.8}).handOwners.action,'reload');
 assert.equal(resolve({doorHandHold:true,treatmentActive:true}).handOwners.action,'treatment');
 assert.equal(resolve({doorHandHold:true,lastThrowAt:15}).handOwners.action,'throw');
 assert.equal(resolve({doorHandHold:true,down:true}).handOwners.action,'down');
});
