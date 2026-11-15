/** P4 is a visual game-art contract, not physical weapon mechanism logic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAL_UPPER_STATIONS,falUpperSideHalfZ}
 from '../src/weapons/geometry/fal-receiver-form.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {FAL_VISUAL_ANATOMY} from '../src/weapons/geometry/weapon-receiver-anatomy.ts';

const config=(preset='fal-5000')=>
 selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),preset);
const bbox=x=>new THREE.Box3().setFromObject(x);
const get=(root,name)=>{const mesh=root.getObjectByName(name);assert.ok(mesh,name);return mesh;};
test('P4 crowned FN receiver has real 3D shoulder taper without adding density',()=>{
 const m=new THREE.MeshBasicMaterial(),root=buildWeaponSilhouette('rifle',m,m,config());
 const upper=get(root,'family-receiver-fal-50-receiver-0');
 assert.equal(upper.userData.falCrownedUpper,true);
 assert.equal(FAL_UPPER_STATIONS.length,4);
 assert.equal(upper.geometry.type,'BufferGeometry');
 assert.ok(upper.geometry.getAttribute('position').count<=300);
 const central=FAL_UPPER_STATIONS[2];
 assert.ok(central.sideHalfZ-central.roofHalfZ>=1.10,
  'Crowned roof must be noticeably narrower than receiver shoulders');
 assert.equal(central.top,1.83);
 assert.ok(Math.abs(bbox(upper).max.z-central.sideHalfZ)<.01);
 const verts=upper.geometry.getAttribute('position'),topWidths=[];
 for(let i=0;i<verts.count;i++)if(verts.getY(i)>1.82)topWidths.push(Math.abs(verts.getZ(i)));
 assert.ok(topWidths.length>0&&Math.max(...topWidths)<=.70);
 assert.ok(falUpperSideHalfZ(1.43,1)<falUpperSideHalfZ(.80,1)-.20);
 assert.equal(root.children.length,25,'receiver art budget must remain deliberate');
 clearWeaponSilhouette(root);m.dispose();
});
test('P4 upper/lower are truly distinct masses with open guard below',()=>{
 const m=new THREE.MeshBasicMaterial(),root=buildWeaponSilhouette('rifle',m,m,config());
 const upper=get(root,'family-receiver-fal-50-receiver-0');
 const lower=get(root,'family-receiver-fal-50-receiver-1');
 const well=get(root,'family-receiver-fal-50-receiver-2');
 const guard=root.children.find(x=>x.userData.falTriggerGuard);
 assert.ok(guard&&guard.geometry.type==='ExtrudeGeometry');
 assert.ok(guard.geometry.parameters?.shapes?.holes?.length===1,
  'guard must have actual negative-space opening');
 assert.ok(bbox(lower).min.y<bbox(upper).min.y-1.3);
 assert.ok(bbox(lower).max.z>=1.69,'stepped lower visibly wider at its seam');
 assert.ok(bbox(well).min.y<=-3.19);
 assert.ok(bbox(guard).min.y<=-3.55);
 clearWeaponSilhouette(root);m.dispose();
});
test('P4 bilateral pivot, left runner and high right ejection scallop stay side-correct',()=>{
 const m=new THREE.MeshBasicMaterial(),root=buildWeaponSilhouette('rifle',m,m,config());
 const pivot=root.children.filter(x=>x.userData.falPivotSide);
 assert.equal(pivot.length,2);assert.deepEqual(pivot.map(x=>x.userData.falPivotSide).sort(),[-1,1]);
 assert.ok(pivot.every(x=>x.geometry.parameters?.radialSegments===6));
 assert.ok(bbox(pivot[0]).max.z<0&&bbox(pivot[1]).min.z>0);
 const slide=root.children.find(x=>x.userData.falChargingTrack);
 const lever=root.children.find(x=>x.userData.falChargingHandle);
 assert.ok(slide&&lever&&bbox(slide).max.z<0&&bbox(lever).max.z<0);
 const port=root.children.find(x=>x.userData.falEjectionPort);
 assert.ok(port&&port.userData.falRectangularPort);
 assert.ok(bbox(port).min.z>0&&bbox(port).min.y>=.68,
  'right opening sits high in the crowned upper, not mid-slab');
 assert.ok(bbox(port).max.z-bbox(port).min.z>.25,'ejection face follows tapered shoulder');
 assert.equal(FAL_VISUAL_ANATOMY.portY,1.11);
 const assembly=resolveWeaponAssembly(config());
 assert.equal(assembly.muzzleX,22);assert.equal(assembly.stockX,-15);
 clearWeaponSilhouette(root);m.dispose();
});
test('P4 does not alter nearest-neighbor G3 geometry',()=>{
 const m=new THREE.MeshBasicMaterial();
 const fal=buildWeaponSilhouette('rifle',m,m,config());
 const g3=buildWeaponSilhouette('rifle',m,m,config('hk-g3a3'));
 assert.ok(g3.children.every(x=>!x.userData.falCrownedUpper));
 assert.ok(bbox(g3).max.x>bbox(fal).max.x);
 clearWeaponSilhouette(fal);clearWeaponSilhouette(g3);m.dispose();
});
