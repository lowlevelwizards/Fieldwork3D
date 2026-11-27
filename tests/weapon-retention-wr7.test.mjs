import test from 'node:test';import assert from 'node:assert/strict';
import {oneHandRetentionWeight} from '../src/breach-weapon-retention-actions.ts';
import {resolveOperatorActionState} from '../src/breach-pose-action-state.ts';
const p={seconds:1,lastDoorAt:.6,lastThrowAt:-100,doorPoint:{x:1,y:2},doorMethod:'open',weapon:'carbine',reload:0,reloadDuration:0,down:false,surrender:false,injury:0,aiming:false,firing:false};
const weight=x=>oneHandRetentionWeight(x,resolveOperatorActionState(x,0,false));
test('WR7 one-hand action follows established door and throw windows',()=>{
 assert.ok(weight(p)>.9);assert.equal(weight({...p,seconds:3}),0);
 assert.ok(weight({...p,lastDoorAt:-100,lastThrowAt:.7})>.9);
 assert.equal(weight({...p,firing:true}),0);assert.equal(weight({...p,lockpickActive:true}),0);
 assert.equal(weight({...p,treatmentActive:true}),0);
 assert.equal(weight({...p,secondarySwitch:{fraction:1}}),0);
});
