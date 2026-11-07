/** UOP clearance optimization: reproduce legacy SAT mathematically.
 * This intentionally retains the old allocating reference in TEST ONLY.
 * Exact equipment geometry and material budgets may not change.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {evaluateSleeveArmorContact,LOW_READY_CONTACT_LIMITS}
 from '../src/breach-pose-clearance-envelope.ts';

const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0),
 Z=new THREE.Vector3(0,0,1),axes=[X,Y,Z];
function oldSleevePenetration(a,b,width,depth,volume,trimProximal=0){
 const from=a.clone().lerp(b,Math.max(0,Math.min(.3,trimProximal)));
 const delta=b.clone().sub(from),length=delta.length();
 if(length<1e-6)return 0;
 const reach=Math.hypot(width,depth)*.5;
 if(Math.max(from.x,b.x)+reach<volume.min.x||
    Math.min(from.x,b.x)-reach>volume.max.x||
    Math.max(from.y,b.y)+reach<volume.min.y||
    Math.min(from.y,b.y)-reach>volume.max.y||
    Math.max(from.z,b.z)+reach<volume.min.z||
    Math.min(from.z,b.z)-reach>volume.max.z)return 0;
 const up=delta.clone().divideScalar(length);
 let sideways=Z.clone().addScaledVector(up,-Z.dot(up));
 if(sideways.lengthSq()<.000001)
  sideways=X.clone().addScaledVector(up,-X.dot(up));
 sideways.normalize();
 const front=new THREE.Vector3().crossVectors(sideways,up).normalize();
 const sides=[sideways,up,front];
 const extents=[width*.5,length*.5,depth*.5];
 const center=from.clone().add(b).multiplyScalar(.5);
 const volCenter=new THREE.Vector3(
  (volume.min.x+volume.max.x)*.5,
  (volume.min.y+volume.max.y)*.5,
  (volume.min.z+volume.max.z)*.5);
 const volHalf=[(volume.max.x-volume.min.x)*.5,
  (volume.max.y-volume.min.y)*.5,
  (volume.max.z-volume.min.z)*.5];
 const offset=center.sub(volCenter);
 let minimum=Infinity;
 const consider=(axis)=>{
  const lengthSq=axis.lengthSq();
  if(lengthSq<1e-9)return true;
  const unit=axis.clone().multiplyScalar(1/Math.sqrt(lengthSq));
  const ra=sides.reduce((v,x,i)=>v+Math.abs(x.dot(unit))*extents[i],0);
  const rb=axes.reduce((v,x,i)=>v+Math.abs(x.dot(unit))*volHalf[i],0);
  const overlap=ra+rb-Math.abs(offset.dot(unit));
  if(overlap<=0)return false;
  minimum=Math.min(minimum,overlap);
  return true;
 };
 for(const axis of [...axes,...sides])if(!consider(axis))return 0;
 for(const axis of axes)for(const side of sides){
  const crossed=new THREE.Vector3().crossVectors(axis,side);
  if(!consider(crossed))return 0;
 }
 return Number.isFinite(minimum)?minimum:0;
}
function rand(seed){
 let s=seed>>>0;
 return ()=>{s=(1664525*s+1013904223)>>>0;return s/4294967296;};
}
const near=(a,b,msg)=>assert.ok(Math.abs(a-b)<1e-6,
 msg+' expected '+b+', got '+a);
function check(a,e,w,box,label){
 const env={armor:'plate-heavy',rig:'no-rig',top:'bdu-jacket',
  front:8,boxes:[box]};
 const actual=evaluateSleeveArmorContact(a,e,w,env);
 const trim=box.region==='torso-upper'?.30:
   LOW_READY_CONTACT_LIMITS.proximalUpperSeam;
 const upper=oldSleevePenetration(a,e,3.9,4,box,trim);
 const lower=oldSleevePenetration(e,w,3.4,3.5,box);
 const contact=actual.contacts[0];
 if(Math.max(upper,lower)<=0){
   assert.equal(actual.contacts.length,0,label+'/no contact');
 }else{
   assert.ok(contact,label+'/expected contact');
   near(contact.upperDepth,upper,label+'/upper depth');
   near(contact.lowerDepth,lower,label+'/lower depth');
   near(contact.depth,Math.max(upper,lower),label+'/overall depth');
 }
}
test('UOP SAT: randomized sleeve OBB parity against legacy 15-axis math',()=>{
 const next=rand(0x0a51c0de);
 for(let i=0;i<500;i++){
  const xyz=()=>new THREE.Vector3(
    next()*28-14,next()*28-14,next()*28-14);
  const a=xyz(),e=xyz(),w=xyz(),center=xyz();
  const span=1.5+next()*8;
  const material=i%3===0?'rigid':i%3===1?'structured':'soft';
  const region=i%7===0?'torso-upper':'rig-pouch';
  const box={label:'chest-rig',material,region,
   min:{x:center.x-span*.3,y:center.y-span*.7,z:center.z-span*.6},
   max:{x:center.x+span*.3,y:center.y+span*.7,z:center.z+span*.6}};
  check(a,e,w,box,'seed '+i);
 }
});
test('UOP SAT: straight, nearly singular and zero-length limbs remain finite',()=>{
 const cases=[
   [new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,10),new THREE.Vector3(0,0,20)],
   [new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,-10),new THREE.Vector3(0,0,-20)],
   [new THREE.Vector3(0,0,0),new THREE.Vector3(1e-8,1e-8,10),new THREE.Vector3(0,0,20)],
   [new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0),new THREE.Vector3(0,0,0)],
   [new THREE.Vector3(0,0,0),new THREE.Vector3(10,0,0),new THREE.Vector3(20,0,0)],
   [new THREE.Vector3(0,0,0),new THREE.Vector3(0,10,0),new THREE.Vector3(0,20,0)]
 ];
 const box={label:'torso',material:'rigid',region:'torso-upper',
   min:{x:-3,y:-3,z:-3},max:{x:3,y:3,z:3}};
 cases.forEach(([a,e,w],i)=>check(a,e,w,box,'degenerate '+i));
});
