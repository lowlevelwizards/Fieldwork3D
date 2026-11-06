import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {interpolateWeaponCarry,lowReadyBlendPhase}
 from '../src/breach-low-ready-transition.ts';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const make=(angle,offset)=>{
 const rotation=new THREE.Euler(0,angle,-.12,'XYZ');
 const origin=V(offset,-2,1);
 const transform=p=>p.clone().applyEuler(rotation).add(origin);
 return {origin,rotation,stock:transform(V(-12,0,0)),
  primary:transform(V(-1,-3,2)),support:transform(V(4,-1,-3)),
  twoHanded:true,primaryReachable:true,handling:'low',
  stockError:.2,contactError:0};
};
test('rigid stock and both palms blend continuously on weapon',()=>{
 const from=make(.35,10),to=make(.95,12);
 assert.strictEqual(interpolateWeaponCarry(from,to,0),from);
 assert.strictEqual(interpolateWeaponCarry(from,to,1),to);
 const mid=interpolateWeaponCarry(from,to,.5);
 const q=new THREE.Quaternion().setFromEuler(mid.rotation).invert();
 const local=p=>p.clone().sub(mid.origin).applyQuaternion(q);
 const base=local(mid.primary);
 assert.ok(base.distanceTo(V(-1,-3,2))<1e-5);
 assert.ok(local(mid.support).distanceTo(V(4,-1,-3))<1e-5);
 assert.ok(local(mid.stock).distanceTo(V(-12,0,0))<1e-5);
});
test('transition is deterministic and uses no accumulated frame state',()=>{
 const a=make(.35,9),b=make(.5,13);
 const c=interpolateWeaponCarry(a,b,.63);
 const d=interpolateWeaponCarry(a,b,.63);
 assert.deepEqual(c.origin.toArray(),d.origin.toArray());
 assert.deepEqual(c.support.toArray(),d.support.toArray());
 assert.equal(lowReadyBlendPhase(-1),0);
 assert.equal(lowReadyBlendPhase(2),1);
});
