import test from 'node:test';import assert from 'node:assert/strict';
import {retainedActionHands} from '../src/breach-weapon-retention-actions.ts';
import {resolveOperatorActionState} from '../src/breach-pose-action-state.ts';
const base={seconds:3,lastThrowAt:-100,lastDoorAt:-100,reload:0,reloadDuration:1,weapon:'carbine',down:false,surrender:false,injury:0,aiming:false,firing:false};
const sample=p=>retainedActionHands(p,resolveOperatorActionState(p,0,false));
test('SR14 settled retention lets actual action own only needed limbs',()=>{
 assert.deepEqual(sample(base),[false,false]);
 assert.deepEqual(sample({...base,treatmentActive:true}),[true,true]);
 const door={...base,lastDoorAt:2.8,doorPoint:{x:10,y:0},doorMethod:'open'};
 assert.deepEqual(sample(door),[true,false]);
 assert.deepEqual(sample({...door,lockpickActive:true}),[true,true]);
 assert.deepEqual(sample({...base,lastThrowAt:2.8}),[true,false]);
 assert.deepEqual(sample({...base,equipmentInteraction:{item:'zip-tie',elapsed:.3,progress:.5}}),[true,true]);
 assert.deepEqual(sample({...base,down:true}),[true,true]);
});
