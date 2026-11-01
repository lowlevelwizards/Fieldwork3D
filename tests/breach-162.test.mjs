import test from 'node:test';import assert from 'node:assert/strict';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const pose=(handlingOverride)=>({
 x:100,z:100,heading:0,seconds:1,velocity:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,
 reloadDuration:1.8,lastThrowAt:-100,lastDoorAt:-100,
 down:false,surrender:false,aiming:false,firing:false,
 turning:0,deterministic:true,handlingOverride
});
test('162: distinct stances engage body, not merely the rigid gun',()=>{
 const r=createOperatorRig('rook','blue'),out={};
 for(const key of ['low','ready','high','short','point','ads']){
   r.root.position.set(100,0,100);
   poseOperator(r,pose(key),0);
   out[key]={hip:r.hip.position.clone(),chest:r.chest.rotation.clone(),
     head:r.head.position.clone(),weapon:r.weapon.position.clone()};
   assert.ok(r.legGap.every(x=>x<1.5));
 }
 assert.ok(out.ads.head.y<out.low.head.y-1);
 assert.ok(out.short.hip.z>out.low.hip.z+.2);
 assert.ok(Math.abs(out.ads.chest.z-out.low.chest.z)>.04);
 assert.ok(out.ads.hip.y<out.low.hip.y);
 r.dispose();
});
test('162: gameplay without an explicit lab override retains muzzle chest height',()=>{
 const r=createOperatorRig('rook','blue');r.root.position.set(100,0,100);
 poseOperator(r,pose(undefined),0);
 // The approved physical gait may transfer weight through the upper body.
 const y=r.chest.position.y;
 assert.ok(Number.isFinite(y)&&y>18&&y<42);
 poseOperator(r,pose(undefined),0);
 assert.ok(Math.abs(r.chest.position.y-y)<1e-6);
 r.dispose();
});