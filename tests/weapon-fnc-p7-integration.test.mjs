/** FN FNC P7: physical silhouette continuity and unchanged FAL art. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {addFALCrownedReceiver,FAL_UPPER_STATIONS,falUpperShoulderY}
 from '../src/weapons/geometry/fal-receiver-form.ts';
import {clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';

const get=(g,key)=>g.children.find(x=>x.userData[key]);
const bounds=x=>new THREE.Box3().setFromObject(x);
const meets=(a,b,margin=0)=>bounds(a).clone().expandByScalar(margin)
 .intersectsBox(bounds(b));

test('P7: factory barrel intersects handguard, gas housing and gas/sight seat',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const bar=get(g,'fncServiceBarrel'),guard=get(g,'fncP5LowerHex');
 const gas=get(g,'fncP7ConnectedGasHousing');
 const seat=get(g,'fncP7ContinuousGasSightSeat'),muzzle=get(g,'fncMuzzle');
 assert.ok(bar&&guard&&gas&&seat&&muzzle);
 for(const [name,mesh] of [['guard',guard],['gas box',gas],['sight/gas seat',seat]])
  assert.ok(meets(bar,mesh), 'barrel MUST physically intersect '+name);
 assert.ok(meets(gas,seat),'gas box and sight seat must overlap in all 3 axes');
 assert.ok(meets(guard,gas),'short polymer must connect into long upper gas cover');
 assert.ok(bounds(guard).max.x<bounds(seat).max.x-3.0,
  'polymer is intentionally shorter than the separate vented gas cover');
 assert.ok(meets(bar,muzzle),'barrel and factory muzzle must be solidly seated');
 assert.ok(bar.userData.fncP7BarrelStartX<bounds(gas).max.x-1);
 assert.ok(Math.abs(bounds(g).max.x-FNC_P1.muzzleX)<.02);
 const suppressed=buildFNCStage1Silhouette(m,{},false);
 const plainBar=get(suppressed,'fncServiceBarrel');
 assert.ok(plainBar&&meets(plainBar,get(suppressed,'fncP7ConnectedGasHousing')));
 assert.ok(meets(plainBar,get(suppressed,'fncP7ContinuousGasSightSeat')));
 assert.equal(Boolean(get(suppressed,'fncMuzzle')),false);
 assert.ok(Math.abs(bounds(suppressed).max.x-FNC_P1.muzzleX)<.02);
 clearWeaponSilhouette(suppressed);clearWeaponSilhouette(g);m.dispose();
});
test('P7: shared FN crown produces EXACT original FAL shell vertices',()=>{
 const mat=new THREE.MeshBasicMaterial(),root=new THREE.Group();
 const mesh=addFALCrownedReceiver(root,'fal-50-receiver',0,mat);
 const actual=mesh.geometry.getAttribute('position').array;
 const expected=[];
 const ring=(s,i)=>{
  const shoulder=falUpperShoulderY(s),pts=[
   [s.bottom,-s.sideHalfZ],[s.bottom,s.sideHalfZ],
   [shoulder,s.sideHalfZ],[s.top,s.roofHalfZ],
   [s.top,-s.roofHalfZ],[shoulder,-s.sideHalfZ]
  ];
  return [s.x,...pts[i]];
 };
 const tri=(a,b,c)=>expected.push(...a,...b,...c);
 for(let n=0;n<FAL_UPPER_STATIONS.length-1;n++)
  for(let i=0;i<6;i++){
   const j=(i+1)%6,s=FAL_UPPER_STATIONS[n],t=FAL_UPPER_STATIONS[n+1];
   tri(ring(s,i),ring(t,i),ring(t,j));
   tri(ring(s,i),ring(t,j),ring(s,j));
  }
 const rear=FAL_UPPER_STATIONS[0],front=FAL_UPPER_STATIONS.at(-1);
 const center=s=>[s.x,(s.top+s.bottom)/2,0];
 for(let i=0;i<6;i++){
  const j=(i+1)%6;
  tri(center(rear),ring(rear,i),ring(rear,j));
  tri(center(front),ring(front,j),ring(front,i));
 }
 const reference=Float32Array.from(expected);
 assert.equal(actual.length,reference.length);
 assert.deepEqual(Array.from(actual),Array.from(reference),
  'approved FAL mesh is byte-for-byte identical after helper extraction');
 assert.ok(mesh.userData.falCrownedUpper);
 clearWeaponSilhouette(root);mat.dispose();
});
