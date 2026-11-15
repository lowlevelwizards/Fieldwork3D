/** P11-P13: new modular appearances never remodel the approved P10 FAL.
 * All models are visual art in the legacy rifle gameplay tier. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS,validFamilyBuild,readWeaponFamilyBuild,
 compatibleFamilyPart,proposeFamilyPartChange}
 from '../src/equipment-weapon-families.ts';
import {arsenalReferencesForPlatform,arsenalCatalogIssues}
 from '../src/arsenal/catalog.ts';
import {arsenalRecipeFromLegacy,readArsenalRecipe,arsenalRecipeToLegacy}
 from '../src/arsenal/recipes.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly,setConfiguredFamilyPart,setWeaponAttachment}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {buildFALCoreSilhouette} from '../src/weapons/geometry/fal-core-silhouette.ts';
import {FAL_BARREL_ART} from '../src/weapons/geometry/fal-barrel-profiles.ts';
import {FAL_WOOD,FAL_DARK_POLYMER,FAL_MAG_METAL,FAL_BLACK_METAL}
 from '../src/weapons/geometry/weapon-visual-palette.ts';
import {visualMaterialRole} from '../src/rendering/material-identity.ts';
import {weaponPresentationSockets}
 from '../src/breach-weapon-presentation.ts';
import {countGeometry} from '../scripts/audit-weapon-geometry.mjs';

const ids=['fal-5000','fal-5000-classic','fal-5061','fal-5063'];
const config=id=>selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),id);
const create=id=>{
 const material=new THREE.MeshBasicMaterial(),c=config(id);
 return {material,c,root:buildWeaponSilhouette('rifle',material,material,c)};
};
const bounds=o=>new THREE.Box3().setFromObject(o);
const close=(x,y)=>assert.ok(Math.abs(x-y)<.02,`expected ${x} ~= ${y}`);

test('P11-P13: four factory entries, compatible choices and V2 recipe round trips',()=>{
 assert.deepEqual(arsenalReferencesForPlatform('fal').map(x=>x.id),ids);
 assert.deepEqual(FAMILY_PRESETS.filter(x=>x.family==='fal').map(x=>x.id),ids);
 assert.deepEqual(arsenalCatalogIssues(),[]);
 for(const id of ids){
  const c=config(id);assert.equal(c.build?.family,'fal',id);
  assert.equal(validFamilyBuild(c.build,'rifle'),true,id);
  assert.deepEqual(readWeaponFamilyBuild(JSON.parse(JSON.stringify(c.build)),'rifle'),c.build);
  const recipe=arsenalRecipeFromLegacy(c);
  assert.ok(recipe,id);
  const saved=readArsenalRecipe(JSON.parse(JSON.stringify(recipe)));
  assert.deepEqual(saved,recipe,id);
  assert.deepEqual(arsenalRecipeToLegacy(saved)?.build,c.build,id);
 }
 assert.equal(FAMILY_PARTS['fal-172-para'].nominalInches,17.2);
 assert.equal(FAMILY_PARTS['fal-para-folder'].stockX,-15);
 assert.equal(compatibleFamilyPart('fal-50-receiver','handguard','fal-vented','rifle','mid'),true);
 assert.equal(compatibleFamilyPart('fal-50-receiver','handguard','fal-vented-wood','rifle','mid'),true);
 assert.equal(compatibleFamilyPart('ar-flat','handguard','ar-round','carbine','short'),false);
 assert.equal(compatibleFamilyPart('fal-50-receiver','magazine','hk-g3-mag20','rifle'),false);
 const change=proposeFamilyPartChange(config('fal-5000').build,'rifle','barrel','fal-172-para');
 assert.equal(change.valid,true);
 assert.equal(change.build.parts.handguard,'fal-vented',
  'FAL Para keeps full handguard despite shorter barrel');
});
test('P11: wood recolors ONLY stock/handguard; P10 topology and contact stay identical',()=>{
 const a=create('fal-5000'),w=create('fal-5000-classic');
 assert.equal(a.root.children.length,26);
 assert.equal(w.root.children.length,a.root.children.length);
 const bs=bounds(a.root),ws=bounds(w.root);
 assert.ok(bs.equals(ws),'wood stock and handguard must reuse exact mesh geometry');
 for(const slot of ['stock','handguard']){
  const meshes=w.root.children.filter(x=>x.name.startsWith('family-'+slot+'-'));
  assert.ok(meshes.length>=1);
  const woodSolids=slot==='handguard'?meshes.filter(x=>x.userData.falFacetedHandguard):meshes;
  assert.ok(woodSolids.length>=1);
  assert.ok(woodSolids.every(x=>x.material===FAL_WOOD),
   'solid wood furniture changes finish without changing shape');
  assert.ok(woodSolids.every(x=>visualMaterialRole(x.material)==='wood'));
  if(slot==='handguard')assert.equal(meshes.filter(x=>x.userData.falVentCount===3).length,2,
   'dark graphic vents remain dark strokes rather than wood-tinted decals');
 }
 const blackGrip=w.root.children.find(x=>x.name.startsWith('family-grip-'));
 assert.equal(blackGrip.material,FAL_DARK_POLYMER);
 assert.equal(w.root.children.find(x=>x.userData.falCarryGrip).material,FAL_DARK_POLYMER);
 assert.equal(w.root.children.find(x=>x.name.startsWith('family-magazine-')).material,FAL_MAG_METAL);
 assert.equal(w.root.children.find(x=>x.name.startsWith('family-receiver-')).material,FAL_BLACK_METAL);
 assert.equal(resolveWeaponAssembly(a.c).stockX,resolveWeaponAssembly(w.c).stockX);
 assert.equal(resolveWeaponAssembly(w.c).muzzleX,22);
 const custom=setConfiguredFamilyPart(w.c,'grip','fal-grip-wood');
 assert.equal(custom.build?.parts.grip,'fal-grip-wood');
 const cg=buildWeaponSilhouette('rifle',w.material,w.material,custom);
 assert.ok(cg.children.filter(x=>x.name.startsWith('family-grip-')).every(x=>x.material===FAL_WOOD));
 for(const g of [a.root,w.root,cg])clearWeaponSilhouette(g);
 a.material.dispose();w.material.dispose();
});
test('P12: Para extended folder has a clear opening, five chunky solids, no factory carry',()=>{
 const {root,c,material}=create('fal-5061');
 const parts=root.children.filter(x=>x.name.startsWith('family-stock-'));
 assert.equal(parts.length,5);
 assert.equal(parts.filter(x=>x.userData.falParaRail).length,3);
 assert.equal(parts.filter(x=>x.userData.falParaHinge).length,1);
 assert.equal(parts.filter(x=>x.userData.falParaButt).length,1);
 const shell=bounds(root),pad=bounds(parts.find(x=>x.userData.falParaButt));
 close(shell.min.x,-15);close(pad.min.x,-15);
 assert.ok(parts.every(x=>x.material===FAL_BLACK_METAL),'Para rail and hinge remain blackened steel');
 assert.equal(root.children.some(x=>x.userData.falCarryGrip||x.userData.falCarrySupport),false);
 assert.equal(root.children.filter(x=>x.userData.falRearSight).length,1);
 assert.equal(root.children.find(x=>x.userData.falParaFoldedChargingHandle)?.userData.falProtrudingHandle,false);
 assert.ok(root.children.length<=28);
 assert.ok(countGeometry(root).triangles<450);
 const a=resolveWeaponAssembly(c);
 assert.equal(a.stockX,-15);assert.equal(a.muzzleX,22);
 clearWeaponSilhouette(root);material.dispose();
});
test('P13: 50.63 shorter barrel matches visual, muzzle, sockets and attachment datum',()=>{
 const long=create('fal-5061'),para=create('fal-5063');
 const ls=bounds(long.root),ps=bounds(para.root);
 close(ps.min.x,ls.min.x);
 close(ls.max.x,22);close(ps.max.x,19.4);
 assert.equal(FAL_BARREL_ART['fal-172-para'].handguardEndX,
  FAL_BARREL_ART['fal-21-service'].handguardEndX);
 const longGuard=bounds(long.root.children.find(x=>x.userData.falFacetedHandguard));
 const shortGuard=bounds(para.root.children.find(x=>x.userData.falFacetedHandguard));
 assert.ok(longGuard.equals(shortGuard),'Para short muzzle must retain iconic long FAL handguard');
 const art=FAL_BARREL_ART['fal-172-para'];
 const assembly=resolveWeaponAssembly(para.c);
 assert.equal(assembly.muzzleX,art.muzzleX);
 assert.equal(assembly.lengthScale,art.lengthScale);
 assert.equal(weaponPresentationSockets('rifle',para.c).muzzle.x,art.muzzleX);
 assert.ok(assembly.lengthScale<resolveWeaponAssembly(long.c).lengthScale);
 assert.equal(para.root.children.filter(x=>x.userData.falFrontEar).length,2);
 const bare=setWeaponAttachment(para.c,'muzzle','muzzle-hider');
 const bareMesh=buildWeaponSilhouette('rifle',para.material,para.material,bare);
 assert.ok(!bareMesh.children.some(x=>x.userData.falMuzzleCombo));
 close(bounds(bareMesh).max.x,art.muzzleX);
 close(resolveWeaponAssembly(bare).muzzleX,art.muzzleX+.8);
 assert.ok(countGeometry(para.root).triangles<450);
 assert.ok(para.root.children.length<=28);
 for(const g of [long.root,para.root,bareMesh])clearWeaponSilhouette(g);
 long.material.dispose();para.material.dispose();
});
