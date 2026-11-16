/** FNC P15: cross-part silhouette relationships and unchanged bore contracts. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {buildFNCStage1Silhouette,FNC_P1}
 from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
const get=(g,key)=>g.children.find(x=>x.userData[key]);
const many=(g,key)=>g.children.filter(x=>x.userData[key]);
const box=x=>new THREE.Box3().setFromObject(x);
const sz=(x,axis)=>box(x).max[axis]-box(x).min[axis];
const near=(a,b,t=.025)=>Math.abs(a-b)<t;
const touch=(a,b)=>box(a).intersectsBox(box(b));
test('P15 receiver roof and gas spine nearly level, flat shortened receiver nose',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const upper=get(g,'fncP15FlatReceiverNose'),
  lower=get(g,'fncP15FlatLowerNose'),
  gas=get(g,'fncP15UpperGasSpine'),
  poly=get(g,'fncP15RaisedPolymer');
 assert.ok(upper&&lower&&gas&&poly);
 assert.ok(near(box(upper).max.x,2.75)&&near(box(lower).max.x,3.05));
 assert.ok(near(box(upper).max.y,1.93));
 assert.ok(Math.abs(box(upper).max.y-box(gas).max.y)<.12);
 assert.ok(near(sz(upper,'x'),9.13));
 assert.ok(L.gas.startX<L.receiver.frontX&&L.polymer.startX>L.receiver.frontX);
 assert.ok(touch(upper,gas)&&!touch(lower,poly)&&touch(gas,poly));
 assert.ok(sz(gas,'y')>2.40&&sz(gas,'y')<2.50);
 const v=upper.geometry.getAttribute('position');
 let roof=0,bottom=0;
 for(let i=0;i<v.count;i++)if(near(v.getX(i),L.receiver.frontX)){
  if(near(v.getY(i),L.receiver.roofY))roof++;
  if(near(v.getY(i),-1.10))bottom++;
 }
 assert.ok(roof>0&&bottom>0,'end ring retains full roof and bottom height');
 clearWeaponSilhouette(g);m.dispose();
});
test('P15 polymer 30% taller; short collar and long gas spine truly interlock',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=get(g,'fncP15RaisedPolymer'),
  gas=get(g,'fncP15UpperGasSpine'),
  stop=get(g,'fncP15RaisedCollar');
 assert.ok(poly&&gas&&stop);
 assert.ok(near(box(poly).min.x,3.25)&&near(box(poly).max.x,11.68));
 assert.ok(sz(poly,'y')>2.90&&sz(poly,'y')<3.15);
 assert.ok(box(poly).max.y>.50&&box(poly).max.y<.62);
 assert.ok(box(poly).min.y< -2.34&&box(poly).min.y> -2.55);
 assert.ok(sz(poly,'z')>sz(gas,'z')+.8);
 assert.ok(touch(stop,poly)&&touch(stop,gas));
 assert.ok(sz(stop,'y')>3.30&&sz(stop,'y')<3.60);
 assert.ok(sz(gas,'x')>sz(poly,'x')+2.0);
 clearWeaponSilhouette(g);m.dispose();
});
test('P15 grip moved forward while preserving primary hand anchor',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const grip=get(g,'fncGrip'),lower=get(g,'fncP15FlatLowerNose');
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const resolved=resolveWeaponAssembly(cfg);
 assert.ok(grip&&lower);
 assert.ok(near(grip.userData.fncP15GripForwardX,.90));
 assert.ok(near(box(grip).min.x,-5.69)&&near(box(grip).max.x,-2.58));
 assert.ok(resolved.primaryX>box(grip).min.x&&resolved.primaryX<box(grip).max.x);
 assert.ok(resolved.primaryY>box(grip).min.y&&resolved.primaryY<box(grip).max.y);
 assert.ok(touch(grip,lower));
 clearWeaponSilhouette(g);m.dispose();
});
test('P15 lower barrel remains Y0 and sight is integrated with separate two ears',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const bar=get(g,'fncServiceBarrel'),gas=get(g,'fncP15UpperGasSpine'),
  seat=get(g,'fncP15AlignedGasSightBase'),ears=many(g,'fncP15IntegratedFrontEar');
 assert.ok(bar&&gas&&seat);
 assert.ok(near((box(bar).min.y+box(bar).max.y)/2,0));
 assert.ok(box(bar).max.y<box(gas).max.y-.9);
 assert.ok(touch(bar,seat)&&touch(gas,seat));
 assert.equal(gas,seat,'front sight support is integrated with the gas shell');
 assert.ok(near(box(seat).max.y,L.sight.baseRearTopY));
 assert.equal(ears.length,2);
 assert.ok(ears.every(e=>touch(e,seat)&&near(box(e).max.y,2.77)));
 const a=ears.slice().sort((x,y)=>box(x).min.z-box(y).min.z);
 assert.ok(box(a[0]).max.z<box(a[1]).min.z,'open central gap');
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const resolved=resolveWeaponAssembly(cfg);
 assert.equal(resolved.muzzleY,0);assert.ok(near(resolved.muzzleX,19.50));
 const bare=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!get(bare,'fncMuzzle'));
 assert.ok(near(box(bare).max.x,19.50));
 clearWeaponSilhouette(g);clearWeaponSilhouette(bare);m.dispose();
});
test('P15 factory model keeps stock, part count and muzzle endpoints',()=>{
 const m=new THREE.MeshBasicMaterial();
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const g=buildWeaponSilhouette('rifle',m,m,cfg);
 assert.ok(g.children.length<=36);
 assert.ok(get(g,'fncP10DarkThickButtpad'));
 assert.equal(Boolean(get(g,'fncP8OpenTriggerGuard')),false);
 assert.ok(near(box(g).min.x,FNC_P1.stockRearX));
 assert.ok(near(box(g).max.x,FNC_P1.muzzleX));
 assert.equal(many(g,'fncP15IntegratedFrontEar').length,2);
 clearWeaponSilhouette(g);m.dispose();
});
