/** The P5 silhouette is ACCEPTED on geometry AND real-workbench visual review.
 * Bound the intended caricature so a future polish pass cannot silently
 * regress us to a rectangular slab. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {FAL_UPPER_STATIONS,falUpperSideHalfZ,falUpperShoulderY}
 from '../src/weapons/geometry/fal-receiver-form.ts';
import {FAL_HANDGUARD_STATIONS,FAL_HANDGUARD_ROOF_RATIO,
 falHandguardSideHalfZAt,falHandguardShoulderY}
 from '../src/weapons/geometry/fal-handguard-profiles.ts';
import {FAL_MAG20_OUTLINE}
 from '../src/weapons/geometry/fal-magazine-profiles.ts';

const create=()=>{
 const mat=new THREE.MeshBasicMaterial();
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'fal-5000');
 const root=buildWeaponSilhouette('rifle',mat,mat,config);
 return {mat,config,root};
};
const box=object=>new THREE.Box3().setFromObject(object);

test('P5 receiver: an unmistakably narrow crown over 2/3-height sloping shoulders',()=>{
 const {root,mat}=create();
 const mid=FAL_UPPER_STATIONS[2];
 const shell=root.getObjectByName('family-receiver-fal-50-receiver-0');
 assert.ok(shell&&shell.userData.falTriangularP5);
 assert.ok(mid.roofHalfZ/mid.sideHalfZ<=.41,
  'roof must be approximately 40% of the shoulder half-width, not a small bevel');
 assert.ok((mid.top-falUpperShoulderY(mid))/(mid.top-mid.bottom)>=.65,
  'broad roof shoulders must slope for most of the full height');
 assert.ok(mid.sideHalfZ>=1.80);
 assert.ok(box(shell).max.z>=1.84);
 assert.ok(shell.geometry.getAttribute('position').count<=300,
  'major form change must come from moving vertices, not additional triangles');
 assert.ok(falUpperSideHalfZ(1.5,1)<falUpperSideHalfZ(-.1,1)-.75);
 clearWeaponSilhouette(root);mat.dispose();
});
test('P5 handguard matches rounded triangular receiver with six projected FN vents',()=>{
 const {root,mat}=create();
 const mid=FAL_HANDGUARD_STATIONS[1];
 assert.ok(FAL_HANDGUARD_ROOF_RATIO<=.42);
 assert.ok((mid.top-falHandguardShoulderY(mid))/(mid.top-mid.bottom)>=.60);
 assert.ok(falHandguardSideHalfZAt(9.22,.75)<
  falHandguardSideHalfZAt(9.22,-.5)-.5);
 const shell=root.getObjectByName('family-handguard-fal-vented-0');
 assert.ok(shell&&shell.userData.falFacetedHandguard);
 assert.ok(shell.geometry.getAttribute('position').count<=200);
 const vents=root.children.filter(x=>x.userData.falVentCount===3);
 assert.equal(vents.length,2);
 for(const v of vents){
  const pts=v.geometry.getAttribute('position');
  assert.equal(pts.count,12);
  for(let i=0;i<pts.count;i++){
   assert.ok(Math.abs(Math.abs(pts.getZ(i))-
    (falHandguardSideHalfZAt(pts.getX(i),pts.getY(i))+.035))<1e-5,
    'no vent may float off the steep new handguard shoulders');
  }
 }
 clearWeaponSilhouette(root);mat.dispose();
});
test('P5 receiver marks refit their own surfaces and stay left/right correct',()=>{
 const {root,mat}=create();
 const port=root.children.find(x=>x.userData.falEjectionPort);
 assert.ok(port&&box(port).min.z>.6);
 const pv=port.geometry.getAttribute('position');
 for(let i=0;i<pv.count;i++)
  assert.ok(Math.abs(pv.getZ(i)-
   (falUpperSideHalfZ(pv.getY(i),pv.getX(i))+.055))<1e-5);
 const left=root.children.filter(x=>x.userData.falSurfaceFitted);
 assert.equal(left.length,2,'exactly one left handle and one charging runner');
 for(const plate of left){
  const pts=plate.geometry.getAttribute('position'),n=pts.count/2;
  assert.ok(box(plate).max.z<0);
  for(let i=0;i<n;i++){
   assert.ok(Math.abs(-pts.getZ(i)-
    (falUpperSideHalfZ(pts.getY(i),pts.getX(i))+
     (plate.userData.falChargingHandle?.28:.12)))<1e-5);
   assert.ok(-pts.getZ(i)>-pts.getZ(i+n),
    'external face remains outside solid receiver shell');
  }
 }
 const support=root.children.find(x=>x.userData.falCarrySupport);
 const grip=root.children.find(x=>x.userData.falCarryGrip);
 assert.ok(support&&grip&&box(support).intersectsBox(box(grip)));
 assert.equal(root.children.length,25);
 const assembly=resolveWeaponAssembly(selectWeaponFamilyPreset(
  initialWeaponConfiguration('rifle'),'fal-5000'));
 assert.equal(assembly.stockX,-15);assert.equal(assembly.muzzleX,22);
 assert.equal(Math.min(...FAL_MAG20_OUTLINE.map(p=>p[1])),-8.05);
 clearWeaponSilhouette(root);mat.dispose();
});
