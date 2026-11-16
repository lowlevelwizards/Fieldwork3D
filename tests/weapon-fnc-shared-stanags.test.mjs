/** FNC and AR now reference the same authored STANAG magazine profiles. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PARTS,FAMILY_PRESETS,compatibleFamilyPart,validFamilyBuild}
 from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,setConfiguredFamilyPart,
 readWeaponConfiguration} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {arMagazineCurve,arMagazineOutline}
 from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {FNC_FRONT_P13 as L} from '../src/weapons/geometry/fnc-front-layout.ts';
import {FNC_P1} from '../src/weapons/geometry/fnc-stage1-blockout.ts';
import {carriedMagazineProfile,carriedMagazineGeometry}
 from '../src/operator-carried-magazines.ts';
import {liveMagazineCapacity} from '../src/arsenal/live-magazine-capacity.ts';
import {arsenalRecipeIssues,arsenalRecipeFromLegacy}
 from '../src/arsenal/recipes.ts';
const box=x=>new THREE.Box3().setFromObject(x);
const near=(a,b,t=.02)=>Math.abs(a-b)<t;
const select=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fnc-service');
const magMesh=g=>g.children.find(x=>x.userData.fncSharedARStanag);
test('factory FNC uses canonical ar-mag30, identical AR dimensions, no custom FNC curve',()=>{
 const config=select(),m=new THREE.MeshBasicMaterial();
 assert.equal(config.build?.parts.magazine,'ar-mag30');
 assert.equal(FAMILY_PARTS[config.build.parts.receiver].feed,'stanag');
 const g=buildWeaponSilhouette('rifle',m,m,config),mag=magMesh(g);
 assert.ok(mag);assert.equal(mag.userData.fncMagazinePart,'ar-mag30');
 const c=arMagazineCurve('30',L.receiver.magazineCenterX,
  L.receiver.magazineTopY);
 const outline=arMagazineOutline(c);
 const xs=outline.map(v=>v[0]),ys=outline.map(v=>v[1]);
 const b=box(mag);
 assert.ok(near(b.min.x,Math.min(...xs))&&near(b.max.x,Math.max(...xs)));
 assert.ok(near(b.min.y,Math.min(...ys))&&near(b.max.y,Math.max(...ys)));
 assert.ok(near(b.max.z-b.min.z,c.depth));
 assert.ok(near(b.min.y,FNC_P1.magazineBottomY));
 assert.ok(b.min.x<0&&b.max.x>2.75);
 assert.equal(g.children.filter(x=>x.userData.fncStampedMagazineRib).length,2);
 clearWeaponSilhouette(g);m.dispose();
});
test('FNC accepts only shared AR magazines, retaining legacy FNC saved ID',()=>{
 const factory=select(),receiver=factory.build.parts.receiver;
 for(const id of ['ar-mag20','ar-mag30','ar-magpoly','fnc-mag30'])
  assert.equal(compatibleFamilyPart(receiver,'magazine',id,'rifle'),true,id);
 for(const id of ['hk556-mag30','ak-mag545','fal-mag20'])
  assert.equal(compatibleFamilyPart(receiver,'magazine',id,'rifle'),false,id);
 assert.equal(compatibleFamilyPart('ar-a2','magazine','fnc-mag30','rifle'),false);
 assert.equal(compatibleFamilyPart(receiver,'stock','ar-fixed','rifle'),false);
 assert.equal(FAMILY_PARTS['fnc-mag30'].feed,'stanag');
 for(const id of ['ar-mag20','ar-mag30','ar-magpoly','fnc-mag30']){
  const config=setConfiguredFamilyPart(factory,'magazine',id);
  assert.equal(config.build?.parts.magazine,id);
  assert.ok(validFamilyBuild(config.build,'rifle'));
  assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(config)),'rifle'),config);
  const recipe=arsenalRecipeFromLegacy(config);
  assert.ok(recipe&&arsenalRecipeIssues(recipe).length===0,id+' Arsenal serialization');
 }
 assert.equal(FAMILY_PRESETS.find(p=>p.id==='fnc-service')?.parts.magazine,'ar-mag30');
});
test('20 steel, 30 steel, polymer share AR geometry, in-world styling and capacities',()=>{
 const m=new THREE.MeshBasicMaterial(),factory=select();
 for(const [id,style,capacity,bodyCount] of [
  ['ar-mag20','20',20,3],['ar-mag30','30',30,3],
  ['ar-magpoly','poly',30,2],['fnc-mag30','30',30,3]
 ]){
  const config=setConfiguredFamilyPart(factory,'magazine',id);
  const gun=buildWeaponSilhouette('rifle',m,m,config),mag=magMesh(gun);
  assert.ok(mag,id);
  assert.equal(mag.userData.fncMagazinePart,id);
  const curve=arMagazineCurve(style,L.receiver.magazineCenterX,
   L.receiver.magazineTopY);
  const bb=box(mag),outline=arMagazineOutline(curve);
  assert.ok(near(bb.min.x,Math.min(...outline.map(v=>v[0]))));
  assert.ok(near(bb.max.y,Math.max(...outline.map(v=>v[1]))));
  assert.ok(near(bb.min.y,Math.min(...outline.map(v=>v[1]))));
  assert.ok(near(bb.max.z-bb.min.z,curve.depth));
  assert.equal(gun.children.filter(x=>x.name.startsWith('family-magazine-')).length,bodyCount);
  assert.equal(gun.children.filter(x=>x.userData.fncStampedMagazineRib).length,
   style==='poly'?0:2);
  assert.equal(Boolean(mag.userData.arPolymerTaper),style==='poly');
  assert.equal(gun.children.filter(x=>x.userData.fncARPolyToe).length,
   style==='poly'?1:0);
  assert.equal(liveMagazineCapacity('rifle',config),capacity);
  assert.ok(gun.children.length<=34);
  clearWeaponSilhouette(gun);
 }
 m.dispose();
});
test('carried legacy FNC mag and AR 30 use identical shared outline',()=>{
 const ar=carriedMagazineGeometry('ar-mag30'),
  old=carriedMagazineGeometry('fnc-mag30');
 assert.ok(ar&&old);
 assert.equal(carriedMagazineProfile('fnc-mag30')?.length,5.3);
 assert.equal(carriedMagazineProfile('ar-mag30')?.length,5.3);
 const a=ar.getAttribute('position'),b=old.getAttribute('position');
 assert.equal(a.count,b.count);
 for(let i=0;i<a.count;i++){
  assert.ok(near(a.getX(i),b.getX(i),.0001));
  assert.ok(near(a.getY(i),b.getY(i),.0001));
  assert.ok(near(a.getZ(i),b.getZ(i),.0001));
 }
 ar.dispose();old.dispose();
});
