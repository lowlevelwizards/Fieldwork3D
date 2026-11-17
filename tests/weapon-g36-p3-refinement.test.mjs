import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_B_ART} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_MAG30_OUTLINE,G36_MAG30_CURVE}
 from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {arMagazineOutline} from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {weaponFinish} from '../src/weapons/geometry/weapon-material-registry.ts';
import {arsenalReferenceIdentity} from '../src/arsenal/compatibility.ts';
import {arsenalFactoryChoices} from '../src/arsenal/factory-recipes.ts';
import {proposeArsenalPartChange} from '../src/arsenal/compatibility.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';

const one=(group,key)=>group.children.find(o=>o.userData[key]);
const bounds=o=>new THREE.Box3().setFromObject(o);
const count=o=>(o.geometry.index?.count??o.geometry.getAttribute('position').count)/3;

test('P3 stock heel descends at rear while preserving two genuinely open stock voids',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(m),stock=one(g,'g36MasterStock');
 const pad=one(g,'g36Buttpad'),hinge=one(g,'g36StockHinge');
 assert.equal(stock.geometry.parameters.shapes.holes.length,2);
 assert.ok(bounds(stock).min.y< -5.20,
  'heel should drop below original rear stock line');
 assert.ok(bounds(pad).min.y< -5.15&&bounds(pad).max.x< -14.30);
 assert.ok(bounds(stock).max.z-bounds(stock).min.z<1.85,
  'stock stays deliberately slim from three-quarter view');
 assert.ok(bounds(stock).intersectsBox(bounds(pad)));
 assert.ok(bounds(stock).intersectsBox(bounds(hinge)));
 const through=(x,y)=>new THREE.Raycaster(
  new THREE.Vector3(x,y,10),new THREE.Vector3(0,0,-1))
  .intersectObject(stock,false).length;
 assert.equal(through(-12.5,-1.4),0);
 assert.equal(through(-8.15,-.92),0);
 assert.ok(through(-14.45,-4.8)>0,'new dropped rear heel is solid');
 clearWeaponSilhouette(g);m.dispose();
});
test('P3 dark dual-optic faces are seated on the FRONT and REAR of real housings',()=>{
 const mat=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(mat);
 const lower=one(g,'g36LowerOptic'),magnified=one(g,'g36OpticFace');
 const upper=one(g,'g36UpperReflex'),front=one(g,'g36UpperReflexWindow');
 assert.ok(lower&&magnified&&upper&&front);
 assert.ok(bounds(one(g,'g36LowerOpticBarrel')).intersectsBox(bounds(lower)));
 assert.ok(bounds(magnified).intersectsBox(bounds(one(g,'g36LowerOpticBarrel'))));
 assert.ok(bounds(one(g,'g36UpperReflexBarrel')).intersectsBox(bounds(upper)));
 assert.ok(bounds(front).intersectsBox(bounds(one(g,'g36UpperReflexBarrel'))));
 assert.ok(bounds(front).min.x<bounds(upper).min.x,
  'O2 upper rear optical face is visible outside the hood');
 assert.ok(!one(g,'g36LowerEyepiece'),
  'remove the imperceptible P3 rear eyepiece mesh');
 assert.ok(bounds(front).max.y-bounds(front).min.y>=.48,
  'six-facet O2 upper aperture remains legible without nested rings');
 const finishes={
  polymer:weaponFinish('hk-polymer'),steel:weaponFinish('hk-steel'),
  magazine:weaponFinish('g36-smoked-mag'),
  buttpad:weaponFinish('fal-vent-shadow'),
  optic:weaponFinish('hk-polymer'),muzzle:weaponFinish('hk-muzzle-metal')
 };
 applyG36FactoryMaterials(g,finishes);
 assert.equal(magnified.material,finishes.buttpad);
 assert.equal(front.material,finishes.buttpad);
 clearWeaponSilhouette(g);mat.dispose();
});
test('P3 stout 2-prism barrel exceeds muzzle cross-section; contacts are unchanged',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const barrel=one(g,'g36Barrel'),muzzle=one(g,'g36FactoryMuzzle');
 assert.ok(barrel&&muzzle);
 assert.equal(count(barrel)+count(muzzle),24);
 const b=bounds(barrel),end=bounds(muzzle);
 assert.ok(b.max.y-b.min.y>=1.1);
 assert.ok(b.max.z-b.min.z>=1.1);
 assert.ok(b.max.y-b.min.y>end.max.y-end.min.y);
 assert.ok(b.intersectsBox(end));
 assert.ok(Math.abs(bounds(g).max.x-G36_B_ART.muzzleX)<.01);
 clearWeaponSilhouette(g);m.dispose();
});
test('P3 shared STANAG silhouette is distinct G36 polymer with quiet markings',()=>{
 assert.deepEqual(G36_MAG30_OUTLINE,arMagazineOutline(G36_MAG30_CURVE),
  'shared mathematical method with own G36 width and sweep');
 const base=weaponFinish('hk-polymer'),mag=weaponFinish('g36-smoked-mag');
 assert.ok(mag.color.getHex()>base.color.getHex());
 assert.equal(mag.metalness<.1,true);
});
test('P3 untouched factory integral optic is NOT labeled Modified',()=>{
 const original=arsenalFactoryChoices('g36').find(x=>x.id==='g36-service');
 assert.ok(original);
 const identity=arsenalReferenceIdentity(original.recipe);
 assert.equal(identity.name,'HK G36 · Original Dual Optic');
 assert.equal(identity.modified,false);
 const change=proposeArsenalPartChange(original.recipe,'barrel','g36-barrel-480');
 assert.ok(change.valid,'unchanged factory barrel remains valid');
});
