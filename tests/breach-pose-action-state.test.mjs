import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveOperatorActionState} from '../src/breach-pose-action-state.ts';

const base={
 seconds:5,lastThrowAt:-100,lastDoorAt:-100,doorMethod:'open',
 weapon:'carbine',reload:0,reloadDuration:1.8,reloadMode:'emergency',
 treatmentActive:false,down:false,surrender:false,
 injury:0,hitRegion:'torso',aiming:false,firing:false,hitAge:100
};
const sample=(changes={},downProgress=0,push=false)=>
 resolveOperatorActionState({...base,...changes},downProgress,push);
test('UOP action director resolves one set of reload, throw and door clocks',()=>{
 let action=sample({seconds:5,lastThrowAt:5});
 assert.equal(action.throwActive,true);
 assert.equal(action.interactionWindow,true);
 assert.equal(action.handOwners.left,'throw');
 assert.equal(action.handOwners.right,'weapon');
 action=sample({seconds:5.70,lastThrowAt:5});
 assert.equal(action.throwActive,false);
 assert.equal(action.interactionWindow,false);
 action=sample({seconds:5,lastDoorAt:5,doorPoint:{x:12,y:9}});
 assert.equal(action.doorActive,true);
 assert.equal(action.handOwners.left,'door');
 action=sample({seconds:6.12,lastDoorAt:5,doorPoint:{x:12,y:9}});
 assert.equal(action.doorActive,false);
 action=sample({seconds:5,lastDoorAt:5,doorPoint:{x:12,y:9},doorMethod:'kick'});
 assert.equal(action.doorActive,false);
 assert.equal(action.handOwners.action,'hold');
 action=sample({reload:.9});
 assert.equal(action.reloadActive,true);
 assert.ok(Math.abs(action.reloadProgress-.5)<1e-10);
 assert.equal(action.handOwners.action,'reload');
});
test('UOP action owner priority is stable under overlapping action timestamps',()=>{
 const overlap={seconds:5,lastThrowAt:5,lastDoorAt:5,
  doorPoint:{x:12,y:9},reload:1.1,treatmentActive:true};
 assert.equal(sample(overlap).handOwners.action,'treatment');
 assert.equal(sample({...overlap,treatmentActive:false}).handOwners.action,'reload');
 assert.equal(sample({...overlap,reload:0,treatmentActive:false}).handOwners.action,'throw');
 assert.equal(sample({...overlap,down:true},.65).handOwners.action,'down');
 assert.equal(sample({...overlap,surrender:true},.65).handOwners.action,'surrender');
 assert.equal(sample({injury:2,hitAge:.3}).handOwners.action,'injury');
 assert.equal(sample({},0,true).handOwners.action,'push');
});
