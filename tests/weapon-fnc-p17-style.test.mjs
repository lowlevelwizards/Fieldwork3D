/** FNC P17: one magwell, deliberate silhouette exaggeration, protected anatomy. */
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
const one=(g,key)=>g.children.find(x=>x.userData[key]);
const many=(g,key)=>g.children.filter(x=>x.userData[key]);
const box=x=>new THREE.Box3().setFromObject(x);
const size=(x,a)=>box(x).max[a]-box(x).min[a];
const near=(a,b,t=.027)=>Math.abs(a-b)<t;
const touch=(a,b)=>box(a).intersectsBox(box(b));
test('P17 magwell is ONE lower receiver silhouette with near-vertical front',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const lower=one(g,'fncP17SinglePieceMagwell');
 const upper=one(g,'fncP15FlatReceiverNose');
 const mag=one(g,'fnc30RoundCurved');
 assert.ok(lower&&upper&&mag);
 assert.equal(lower,one(g,'fncP16IntegratedMagazineSocket'));
 assert.equal(lower,one(g,'fncAngularLower'));
 assert.equal(many(g,'fncP8DistinctMagwell').length,1);
 assert.equal(many(g,'fncP15FlatLowerNose').length,1);
 assert.ok(near(size(lower,'z'),3.42));
 assert.ok(near(box(lower).max.x,2.75));
 assert.ok(near(box(lower).min.y,-3.46));
 assert.ok(touch(lower,upper)&&touch(lower,mag));
 // The P29 magwell mouth steps back to X2.45; the forward nose still
 // extends X2.75 as one integrated lower receiver.
 const verts=lower.geometry.getAttribute('position');
 let top=0,below=0;
 for(let i=0;i<verts.count;i++)if(near(verts.getX(i),2.75)){
  if(near(verts.getY(i),-1.09))top++;
  if(near(verts.getY(i),-2.57))below++;
 }
 assert.ok(top>0&&below>0,'stepped front stays square, not chamfered');
 // A separate old P16 side slab must not be present.
 assert.ok(!g.children.some(x=>x!==lower&&x.name.includes('magwell')));
 clearWeaponSilhouette(g);m.dispose();
});
test('P22 solid rear sight preserves the original outer envelope',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const rear=one(g,'fncP22SolidRearSight'),front=many(g,'fncP16ChamferedSightGuard');
 assert.ok(rear);assert.equal(front.length,2);
 assert.ok(near(box(rear).max.y,2.63));
 assert.ok(near(box(rear).min.x,-5.78));
 assert.ok(near(size(rear,'x'),1.80));
 assert.equal(rear.geometry.type,'ExtrudeGeometry');
 assert.equal(rear.geometry.parameters.shapes.holes.length,0,'no literal aperture');
 assert.equal(rear.geometry.getAttribute('position').count,36);
 assert.ok(near(box(front[0]).max.y,2.77));
 clearWeaponSilhouette(g);m.dispose();
});
test('P17 handguard underside heavier without losing gas/polymer hierarchy',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const poly=one(g,'fncP17LowerMass'),gas=one(g,'fncP16ExtendedGasRoot'),
 stop=one(g,'fncP17BroadHandstop');
 assert.ok(poly&&gas&&stop);
 assert.ok(size(poly,'y')>2.54&&size(poly,'y')<2.63);
 assert.ok(box(poly).max.y<.62,'polymer roof must remain below gas vents');
 assert.ok(size(poly,'z')>2.40);
 assert.ok(box(gas).max.y>box(poly).max.y+.8);
 assert.ok(touch(poly,gas)&&touch(poly,stop)&&touch(stop,gas));
 assert.ok(near(size(stop,'x'),.88));
 assert.ok(box(stop).max.x>box(poly).max.x);
 assert.ok(box(stop).max.x<box(poly).max.x+.2);
 assert.ok(near(L.gas.topY,1.85)&&near(L.gas.bottomY,-.60));
 clearWeaponSilhouette(g);m.dispose();
});
test('P17 thicker barrel and short bold muzzle, factory-only graphic ports',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildFNCStage1Silhouette(m);
 const bar=one(g,'fncP17ChunkyBarrel'),dev=one(g,'fncP17BoldShortFlashHider');
 const ports=one(g,'fncP17ProjectedMuzzleSlots');
 assert.ok(bar&&dev&&ports);
 assert.ok(near(size(bar,'y'),1.24));
 assert.ok(near(size(dev,'y'),2.06));
 assert.ok(near(box(dev).max.x,FNC_P1.muzzleX));
 assert.ok(size(dev,'x')>1.94&&size(dev,'x')<2.02);
 assert.ok(touch(bar,dev));
 const expectedFacetZ=L.muzzle.radius*Math.cos(Math.PI/6)+.025;
 assert.ok(near(box(ports).max.z,expectedFacetZ));
 assert.ok(near(box(ports).min.z,-expectedFacetZ));
 assert.equal(ports.geometry.getAttribute('position').count,24);
 const bare=buildFNCStage1Silhouette(m,{},false);
 assert.ok(!one(bare,'fncP17BoldShortFlashHider'));
 assert.ok(!one(bare,'fncP17ProjectedMuzzleSlots'));
 assert.ok(near(box(bare).max.x,19.5));
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
 const a=resolveWeaponAssembly(cfg);
 assert.ok(near(a.muzzleX,19.50)&&near(a.muzzleY,0));
 clearWeaponSilhouette(g);clearWeaponSilhouette(bare);m.dispose();
});
test('P17 approved stock, primary hand, 2 sights and overall art budget stable',()=>{
 const m=new THREE.MeshBasicMaterial(),
 cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service'),
 g=buildWeaponSilhouette('rifle',m,m,cfg);
 const pad=one(g,'fncP17BoldButtpad'),grip=one(g,'fncGrip');
 assert.ok(pad&&grip);
 assert.ok(near(box(pad).min.x,FNC_P1.stockRearX));
 assert.ok(size(pad,'y')>4.65&&size(pad,'y')<4.72);
 assert.ok(one(g,'fncP10ContinuousBareUpperRail'));
 assert.ok(one(g,'fncP9ParallelThenAngled'));
 assert.ok(near(box(g).min.x,FNC_P1.stockRearX));
 assert.ok(near(box(g).max.x,FNC_P1.muzzleX));
 assert.equal(many(g,'fncP16ChamferedSightGuard').length,2);
 assert.ok(!one(g,'fncP8OpenTriggerGuard'));
 assert.ok(g.children.length<=34);
 const a=resolveWeaponAssembly(cfg);
 assert.ok(a.primaryX>box(grip).min.x&&a.primaryX<box(grip).max.x);
 clearWeaponSilhouette(g);m.dispose();
});
