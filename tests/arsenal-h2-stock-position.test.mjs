import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 readWeaponConfiguration,resolveWeaponAssembly,sameWeaponConfiguration}
 from '../src/equipment-weapon-assemblies.ts';
import {alternateStockPosition,normalizedStockPosition}
 from '../src/weapon-stock-position.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy,readArsenalRecipe,
 copyArsenalRecipe,sameArsenalRecipe} from '../src/arsenal/recipes.ts';
import {createArsenalDraft,editArsenalStockPosition,undoArsenalDraft}
 from '../src/arsenal/editor-state.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {weaponHandlingModifiers} from '../src/equipment-weapon-handling.ts';
import {arsenalHandlingStats,arsenalStatDeltas}
 from '../src/arsenal/handling-stats.ts';

const sample=(weapon,id)=>selectWeaponFamilyPreset(
 initialWeaponConfiguration(weapon),id);
const position=(config,stockPosition)=>readWeaponConfiguration(
 {...config,stockPosition},config.weapon);
const stat=(config,id)=>arsenalHandlingStats(arsenalRecipeFromLegacy(config))
 .find(row=>row.id===id);
test('H2.3 only genuine folding or telescoping parts accept a nondeployed state',()=>{
 assert.equal(alternateStockPosition('ak-sidefold'),'folded');
 assert.equal(alternateStockPosition('ak-underfolder'),'folded');
 assert.equal(alternateStockPosition('g36-stock'),'folded');
 assert.equal(alternateStockPosition('fal-para-folder'),'folded');
 assert.equal(alternateStockPosition('hk-mp5-retract-stock'),'collapsed');
 assert.equal(alternateStockPosition('ar-stock-m4'),'collapsed');
 for(const id of ['ar-fixed','ak-wood','fal-fixed-polymer','hk-mp5-fixed-stock'])
  assert.equal(alternateStockPosition(id),null,id);
 assert.equal(normalizedStockPosition('ar-fixed','folded'),'deployed');
 assert.equal(normalizedStockPosition('ak-underfolder','collapsed'),'deployed');
});
test('H2.3 legacy reader defaults deployed; corrupted state cannot fake folding',()=>{
 const ar=sample('rifle','ar-m16a2');
 assert.equal(ar.stockPosition,undefined);
 assert.equal(readWeaponConfiguration(JSON.parse(JSON.stringify(ar)),ar.weapon).stockPosition,undefined);
 const invalid=position(ar,'folded');
 assert.equal(invalid.stockPosition,undefined);
 const fake=readWeaponConfiguration({...ar,stockPosition:'folded'},'rifle');
 assert.equal(sameWeaponConfiguration(ar,fake),true);
});
test('H2.3 folded/collapsed states survive V1, V2, undo and saved recipes',()=>{
 for(const [weapon,id,state] of [
  ['rifle','g36-service','folded'],
  ['rifle','fal-5061','folded'],
  ['carbine','ar-m4a1','collapsed'],
  ['smg','hk-mp5a3','collapsed']
 ]){
  const config=sample(weapon,id);
  const alt=position(config,state);
  assert.equal(alt.stockPosition,state,id);
  assert.equal(sameWeaponConfiguration(config,alt),false,id);
  const recipe=arsenalRecipeFromLegacy(alt);
  assert.equal(recipe.stockPosition,state,id);
  const restored=readArsenalRecipe(JSON.parse(JSON.stringify(recipe)));
  assert.ok(restored,id);
  assert.equal(arsenalRecipeToLegacy(restored).stockPosition,state);
  const draft=createArsenalDraft(arsenalRecipeFromLegacy(config));
  const edited=editArsenalStockPosition(draft,state);
  assert.notEqual(edited,draft);
  assert.equal(edited.working.stockPosition,state);
  assert.equal(undoArsenalDraft(edited).working.stockPosition,undefined);
  assert.ok(!sameArsenalRecipe(recipe,copyArsenalRecipe(draft.working)));
 }
});
test('H2.3 true stock pose changes shoulder, inertia and handling, not muzzle',()=>{
 for(const [weapon,id,state] of [
  ['rifle','g36-service','folded'],
  ['rifle','fal-5061','folded'],
  ['carbine','ar-m4a1','collapsed'],
  ['smg','hk-mp5a3','collapsed']
 ]){
  const normal=sample(weapon,id),alt=position(normal,state);
  const a=resolveWeaponAssembly(normal),b=resolveWeaponAssembly(alt);
  assert.ok(b.stockX>a.stockX,id+' shorter rear');
  assert.equal(b.muzzleX,a.muzzleX,id+' must never crop actual muzzle');
  assert.equal(b.muzzleY,a.muzzleY,id);
  assert.ok(b.rotationalInertia<a.rotationalInertia,id+' physical stock moved');
  const m=weaponHandlingModifiers(normal),n=weaponHandlingModifiers(alt);
  assert.ok(n.turn>=m.turn,id+' compact gun swings better');
  assert.ok(n.recoilKick>m.recoilKick,id+' unshouldered/collapsed recoil cost');
  assert.ok(n.recovery<m.recovery,id+' reduced recoil control');
  assert.ok(stat(alt,'compact').score>stat(normal,'compact').score);
  const differences=arsenalStatDeltas(
   arsenalHandlingStats(arsenalRecipeFromLegacy(alt)),
   arsenalHandlingStats(arsenalRecipeFromLegacy(normal)));
  assert.ok(differences.get('compact')>0);
 }
});
test('H2.3 stock geometry is visibly re-posed only for explicit states',()=>{
 for(const [weapon,id,state] of [
  ['rifle','g36-service','folded'],
  ['rifle','fal-5061','folded'],
  ['carbine','ar-m4a1','collapsed']
 ]){
  const config=sample(weapon,id),altered=position(config,state);
  const material=new THREE.MeshStandardMaterial();
  const normal=buildWeaponSilhouette(weapon,material,material,config);
  const changed=buildWeaponSilhouette(weapon,material,material,altered);
  assert.equal(changed.userData.stockMechanism,state,id);
  assert.ok(changed.getObjectByName('mechanical-stock-'+state),id);
  assert.equal(normal.userData.stockMechanism,undefined,id);
  const oldBox=new THREE.Box3().setFromObject(normal);
  const newBox=new THREE.Box3().setFromObject(changed);
  assert.ok(newBox.min.x>oldBox.min.x+1.5,id+' shorter actual rear mesh');
  clearWeaponSilhouette(normal);clearWeaponSilhouette(changed);material.dispose();
 }
});
