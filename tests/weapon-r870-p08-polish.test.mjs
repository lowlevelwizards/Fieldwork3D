import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {arsenalRecipeFromLegacy} from '../src/arsenal/recipes.ts';
import {arsenalHandlingStats} from '../src/arsenal/handling-stats.ts';
import {R870_P07} from '../src/weapons/geometry/r870-art-contract.ts';

const config=()=>selectWeaponFamilyPreset(
 initialWeaponConfiguration('shotgun'),'r870-police-wood');
const create=()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildWeaponSilhouette('shotgun',m,m,config());
 return {g,m,dispose:()=>{clearWeaponSilhouette(g);m.dispose();}};
};
test('R870 P08 retains six authored selectable bodies, fixed tube, unchanged ballistic coordinates',()=>{
 const model=create();try{
 const {g}=model;assert.equal(g.userData.r870P08,true);
 const assembly=resolveWeaponAssembly(config());
 assert.equal(assembly.muzzleX,R870_P07.muzzleX);
 assert.equal(assembly.stockX,R870_P07.stockX);
 assert.ok(g.children.every(x=>x.name.startsWith('family-')));
 const slots=['stock','receiver','grip','magazine','handguard','barrel'];
 assert.deepEqual(slots.filter(slot=>g.children.some(m=>
  m.name.startsWith('family-'+slot+'-'))),slots);
 assert.equal(g.children.filter(x=>x.userData.r870PumpPart).length,9);
 assert.equal(g.children.filter(x=>x.userData.r870FixedTube).length,1);
 const bound=new THREE.Box3().setFromObject(g);
 assert.ok(Math.abs(bound.min.x-R870_P07.stockX)<.03);
 assert.ok(Math.abs(bound.max.x-R870_P07.muzzleX)<.03);
 }finally{model.dispose();}
});
test('R870 P08 insets right-only bolt, preserves fixed-feed presentation and six-facet barrels',()=>{
 const model=create();try{
 const {g}=model;
 const ports=g.children.filter(x=>x.userData.r870RightEjectionPort);
 const bolts=g.children.filter(x=>x.userData.r870InsetBolt);
 assert.equal(ports.length,1);assert.equal(bolts.length,1);
 assert.ok(bolts[0].position.z>ports[0].position.z);
 assert.ok(ports[0].position.z>0);
 const mag=g.children.find(x=>x.userData.r870FixedTube);
 const barrel=g.children.find(x=>x.userData.r870Barrel);
 assert.equal(mag.geometry.parameters.radialSegments,6);
 assert.equal(barrel.geometry.parameters.radialSegments,6);
 assert.ok(Math.abs(mag.rotation.x-Math.PI/6)<.0001);
 assert.ok(Math.abs(barrel.rotation.x-Math.PI/6)<.0001);
 assert.ok(mag.position.y<barrel.position.y-1.3,
  'fixed tube must be visibly lower than the barrel');
 assert.equal(g.children.filter(x=>x.userData.r870ActionBar).length,2);
 assert.ok(g.children.filter(x=>x.userData.r870ActionBar).every(x=>
  x.name.startsWith('family-receiver-')));
 }finally{model.dispose();}
});
test('R870 P08 workbench mobile presentation keeps stats accessible while focusing weapon',()=>{
 const ui=readFileSync(new URL('../src/arsenal/workbench-screen.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/arsenal/arsenal.css',import.meta.url),'utf8');
 assert.match(ui,/statsToggle\.setAttribute\('aria-expanded'/);
 assert.match(ui,/statsToggle\.addEventListener\('click'/);
 assert.match(css,/\.arsenal-wb-stats\.is-collapsed \.arsenal-wb-stats-grid/);
 assert.match(css,/height:clamp\(215px,32dvh,315px\)/);
 const recipe=arsenalRecipeFromLegacy(config());assert.ok(recipe);
 const capacity=arsenalHandlingStats(recipe)?.find(x=>x.id==='capacity');
 assert.match(capacity?.detail||'',/shells · tube/);
});
