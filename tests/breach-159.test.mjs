import test from 'node:test';import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
test('159 neutral knees stand taller without breaking foot contact',()=>{
 const r=createOperatorRig('rook','blue');
 const pose={x:100,z:100,heading:0,travelYaw:0,velocity:0,seconds:0,
 stride:0,posture:'stand',injury:0,weapon:'carbine',
 reload:0,reloadDuration:1,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,turning:0,deterministic:true};
 r.root.position.set(100,0,100);poseOperator(r,pose,0);
 assert.ok(r.hip.position.y>=19.7&&r.hip.position.y<=21);
 assert.ok(r.legGap.every(g=>g<1.5));
 const y=r.hip.position.y;
 poseOperator(r,{...pose,posture:'crouch',seconds:.05},0);
 assert.ok(r.hip.position.y<y-7);
 r.dispose();
});