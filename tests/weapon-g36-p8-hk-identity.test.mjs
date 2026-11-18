/** P8 exterior HK identity: genuine live G36 builder and shared selector. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_E0_FACTORY as F} from '../src/weapons/geometry/g36-family-contract.ts';
import {g36PixelAtlas,g36PixelAtlasLayout,applyG36PixelDetails}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {weaponFinish} from '../src/weapons/geometry/weapon-material-registry.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const one=(g,k)=>g.children.find(x=>x.userData[k]);
const all=(g,k)=>g.children.filter(x=>x.userData[k]);
const bounds=x=>new THREE.Box3().setFromObject(x);
// Three.js buffer positions are Float32; compare bounds in model units.
const near=(actual,expected,part)=>assert.ok(Number.isFinite(actual)&&
 Math.abs(actual-expected)<1e-4,
 `${part}: expected ${expected}, actual ${actual}`);
const intersects=(mesh,x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,10),
 new THREE.Vector3(0,0,-1)).intersectObject(mesh,false).length>0;
test('P8 stock, grip, magwell and long fore-end carry strong deliberate contours',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(m);
 const stock=one(g,'g36MasterStock'),pad=one(g,'g36Buttpad'),
  grip=one(g,'g36Grip'),lower=one(g,'g36ReceiverLower');
 assert.equal(stock.geometry.parameters.shapes.holes.length,2);
 assert.equal(intersects(stock,-12.5,-1.4),false);
 assert.equal(intersects(stock,-8.15,-.92),false);
 assert.ok(bounds(pad).max.z-bounds(pad).min.z<1.55,
  'slim actual polymer buttpad rather than a slab');
 assert.ok(intersects(grip,F.primaryX,F.primaryY));
 assert.ok(intersects(lower,2.05,-2.9));
 assert.ok(!intersects(lower,2.75,-2.9),
  'angle of front magwell cheek must be visible in silhouette');
 near(bounds(g).min.x,A.stockRearX,'stock rear');
 near(bounds(g).max.x,A.muzzleX,'muzzle datum');
 clearWeaponSilhouette(g);m.dispose();
});
test('P8 integrated optic remains one casing plus compact reflex crown',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const lower=one(g,'g36LowerOptic'),upper=one(g,'g36UpperReflex');
 const face=one(g,'g36OpticFace'),handle=one(g,'g36HandleOpening');
 assert.equal(lower.geometry.type,'BufferGeometry');
 assert.equal(lower.userData.g36OpticArtVersion,'o3-compact-integrated-125-125-55');
 assert.equal(lower.userData.g36IntegratedOpticShell,true);
 assert.ok(bounds(lower).intersectsBox(bounds(upper)));
 assert.ok(bounds(face).intersectsBox(bounds(one(g,'g36LowerOpticBarrel'))));
 assert.equal(handle.geometry.parameters.shapes.holes.length,1);
 near(bounds(g).max.y,A.opticTopY,'optic crown');
 assert.equal(F.lowerSightY,3.99);
 assert.equal(F.upperSightY,4.88);
 clearWeaponSilhouette(g);m.dispose();
});
test('P8 actual shared HK pivot/paddle, charging tab and six factory part slots',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 assert.equal(all(g,'g36SelectorHub').length,2);
 assert.equal(all(g,'g36SelectorLever').length,2);
 for(const hub of all(g,'g36SelectorHub')){
  assert.equal(hub.geometry.type,'CylinderGeometry');
  assert.equal(hub.geometry.parameters.radialSegments,8);
  assert.ok(hub.name.startsWith('family-receiver-'));
 }
 assert.equal(all(g,'g36ChargingHandle').length,1);
 const tab=one(g,'g36ChargingHandle');
 assert.ok(bounds(tab).intersectsBox(bounds(one(g,'g36ReceiverUpper'))));
 assert.equal(new Set(g.children.map(x=>x.name.split('-')[1])).size,6);
 const finishes={polymer:weaponFinish('hk-polymer'),steel:weaponFinish('hk-steel'),
 magazine:weaponFinish('g36-smoked-mag'),
 buttpad:weaponFinish('fal-vent-shadow'),
 optic:weaponFinish('hk-polymer'),muzzle:weaponFinish('hk-muzzle-metal')};
 applyG36FactoryMaterials(g,finishes);
 assert.equal(one(g,'g36SelectorLever').material,finishes.buttpad);
 assert.equal(tab.material,finishes.steel);
 clearWeaponSilhouette(g);m.dispose();
});
test('P8 real shared atlas paints right-only ejection and broad polymer facets',()=>{
 const a=g36PixelAtlasLayout(),d=g36PixelAtlas().image.data;
 const sample=(col,row,x,y)=>d[((row*96+y)*384+col*96+x)*4];
 assert.equal(a.rightReceiverEjectionOnly,true);
 assert.equal(a.ventsPerSide,4);
 assert.equal(a.magRibsPerSide,0);
 assert.ok(sample(2,0,55,63)<110,'bold ejection landmark on right');
 assert.equal(sample(3,0,55,63),255,'left side has no mirrored port');
 assert.equal(sample(2,1,55,51),255,'magazine has no hard projected interior bar');
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const count=g.children.length;
 applyG36PixelDetails(g);
 assert.equal(g.children.length,count,'no extra port/vent/mag mesh draw calls');
 clearWeaponSilhouette(g);m.dispose();
});
