import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {selectWeaponFamilyPreset,initialWeaponConfiguration,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {FAL_VISUAL_ANATOMY,HK_VISUAL_ANATOMY}
 from '../src/weapons/geometry/weapon-receiver-anatomy.ts';
import {FAL_MAG20_OUTLINE,FAL_MAG20_DEPTH,FAL_MAG20_LENGTH}
 from '../src/weapons/geometry/fal-magazine-profiles.ts';
import {HK_MAG20_OUTLINE} from '../src/weapons/geometry/hk-magazine-profiles.ts';
import {FAL_HANDGUARD_STATIONS}
 from '../src/weapons/geometry/fal-handguard-profiles.ts';
import {carriedMagazineGeometry,carriedMagazineProfile}
 from '../src/operator-carried-magazines.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {weaponPresentationSockets}
 from '../src/breach-weapon-presentation.ts';
import {arsenalRecipeFromLegacy,readArsenalRecipe}
 from '../src/arsenal/recipes.ts';
const approx=(a,b,t=.003)=>assert.ok(Math.abs(a-b)<t,
 'expected '+a+' close to '+b);
const bounds=o=>new THREE.Box3().setFromObject(o);
const choose=(id,weapon='rifle')=>selectWeaponFamilyPreset(
 initialWeaponConfiguration(weapon),id);
const named=(root,name)=>{
 const mesh=root.getObjectByName(name);
 assert.ok(mesh,'missing '+name);return mesh;
};
test('FAL P2/P4: distinct family, compact exterior and unmodified global anchors',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const config=choose('fal-5000'),root=buildWeaponSilhouette('rifle',mat,mat,config);
 assert.equal(root.children.length,25);
 const groups=['stock','receiver','grip','magazine','handguard','barrel'];
 for(const slot of groups)assert.ok(partVisualBounds(root,slot),'slot '+slot);
 assert.equal(root.children.filter(x=>x.name.startsWith('family-handguard-')).length,3);
 assert.equal(root.children.filter(x=>x.name.startsWith('family-magazine-')).length,3);
 const all=bounds(root),assembly=resolveWeaponAssembly(config);
 approx(all.min.x,-15);approx(all.max.x,22);
 assert.equal(assembly.muzzleX,22);
 assert.equal(assembly.stockX,-15);
 assert.equal(weaponPresentationSockets('rifle',config).magazine.y,-2.98);
 const recipe=arsenalRecipeFromLegacy(config);
 assert.equal(readArsenalRecipe(JSON.parse(JSON.stringify(recipe))).platformId,'fal');
 assert.equal(root.children.filter(x=>x.userData.falFrontEar).length,2);
 clearWeaponSilhouette(root);mat.dispose();
});
test('FAL P2: balanced stock, slightly slimmer grip, bold seated pad and handle',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const root=buildWeaponSilhouette('rifle',mat,mat,choose('fal-5000'));
 const shell=bounds(named(root,'family-stock-fal-fixed-polymer-0'));
 const pad=bounds(named(root,'family-stock-fal-fixed-polymer-1'));
 const grip=bounds(named(root,'family-grip-fal-grip-0'));
 const carry=bounds(root.children.find(x=>x.userData.falCarryGrip));
 const support=bounds(root.children.find(x=>x.userData.falCarrySupport));
 approx(shell.max.z-shell.min.z,2.34);
 approx(grip.max.z-grip.min.z,2.16);
 approx(pad.max.x-pad.min.x,.88);
 approx(pad.max.y-pad.min.y,3.02);
 approx(pad.min.x,-15);
 assert.ok(pad.max.x>shell.min.x+.06);
 assert.ok(pad.min.y<shell.min.y&&pad.max.y>.10);
 approx(carry.max.y-carry.min.y,1.05);
 approx(carry.max.z-carry.min.z,1.15);
 assert.ok(carry.intersectsBox(support),'carry handle must be connected');
 assert.ok(carry.min.x<0&&carry.max.x<3.2);
 clearWeaponSilhouette(root);mat.dispose();
});
test('FAL P7: magazine silhouette stays FAL-specific while becoming narrower than G3',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const root=buildWeaponSilhouette('rifle',mat,mat,choose('fal-5000'));
 const mag=bounds(named(root,'family-magazine-fal-mag20-0'));
 approx(mag.max.z-mag.min.z,FAL_MAG20_DEPTH);
 assert.ok(FAL_MAG20_DEPTH<HK_VISUAL_ANATOMY.magazineDepthZ);
 assert.equal(FAL_VISUAL_ANATOMY.magazineDepthZ,FAL_MAG20_DEPTH);
 assert.equal(FAL_VISUAL_ANATOMY.gripDepthZ,2.16);
 assert.equal(FAL_MAG20_LENGTH,5.07);
 assert.notDeepEqual(FAL_MAG20_OUTLINE,HK_MAG20_OUTLINE,
  'FAL has its own magazine identity/profile');
 const carried=carriedMagazineGeometry('fal-mag20');
 assert.ok(carried?.getAttribute('position').count>0);
 assert.equal(carriedMagazineProfile('fal-mag20')?.length,FAL_MAG20_LENGTH);
 carried.dispose();
 clearWeaponSilhouette(root);mat.dispose();
});
test('FAL P2: one continuous handguard, upper shoulder chamfer and batched vents',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const root=buildWeaponSilhouette('rifle',mat,mat,choose('fal-5000'));
 const hand=named(root,'family-handguard-fal-vented-0');
 const b=bounds(hand);
 approx(b.min.x,3.65);approx(b.max.x,14.10);
 approx(b.max.y,1.90);approx(b.min.y,-2.12);
 approx(b.max.z-b.min.z,3.68);
 assert.equal(FAL_HANDGUARD_STATIONS.length,2);
 assert.equal(hand.userData.falFacetedHandguard,true);
 const verts=hand.geometry.getAttribute('position');
 assert.ok(verts.count<=200,'single low-vertex handguard, not dense tessellation');
 // Upper shoulder is inside the full side width, never an AR triangle.
 let topMax=0;
 for(let i=0;i<verts.count;i++)
  if(verts.getY(i)>1.37)topMax=Math.max(topMax,Math.abs(verts.getZ(i)));
 assert.ok(topMax<1.51,'top flats must be tucked in from 1.73 half-width');
 const marks=root.children.filter(x=>x.userData.falVentCount===3);
 assert.equal(marks.length,2);
 assert.deepEqual(marks.map(x=>x.userData.falVentSide).sort(),[-1,1]);
 for(const vent of marks){
  assert.equal(vent.geometry.getAttribute('position').count,12,
   'three rectangular slots batched into one mesh per side');
  const v=bounds(vent);
  assert.equal(vent.userData.falFaceAligned,true);
  assert.ok(v.max.z-v.min.z>.01,
   'slots conform to tapered forearm rather than floating at fixed z');
  assert.ok(v.min.y>.02&&v.max.y<.90,
   'marks remain inside broad side flat and below upper chamfer');
 }
 clearWeaponSilhouette(root);mat.dispose();
});
test('FAL P2: restrained receiver port remains right-only and HK model unchanged',()=>{
 const mat=new THREE.MeshBasicMaterial();
 const fal=buildWeaponSilhouette('rifle',mat,mat,choose('fal-5000'));
 const port=named(fal,'family-receiver-fal-50-receiver-8');
 const p=bounds(port);
 assert.equal(port.userData.falEjectionPort,true);
 approx(p.max.x-p.min.x,2.50);
 assert.ok(p.min.z>1.15&&p.max.z<1.80,'right port hugs the barrel-height face');
 const receiver=named(fal,'family-receiver-fal-50-receiver-0');
 assert.ok(bounds(receiver).max.z>=1.82&&bounds(receiver).max.z<=1.87);
 const charger=named(fal,'family-receiver-fal-50-receiver-7');
 assert.ok(bounds(charger).max.z<0,'charging lever stays on left');
 const g3=buildWeaponSilhouette('rifle',mat,mat,choose('hk-g3a3'));
 assert.ok(g3.children.some(x=>x.name.startsWith('family-magazine-hk-g3-mag20')));
 assert.equal(HK_VISUAL_ANATOMY.magazineDepthZ,2.08);
 clearWeaponSilhouette(fal);clearWeaponSilhouette(g3);mat.dispose();
});
