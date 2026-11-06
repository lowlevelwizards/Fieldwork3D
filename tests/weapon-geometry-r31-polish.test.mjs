import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {workbenchFitDistance}
 from '../src/weapons/geometry/weapon-workbench-camera-fit.ts';
import {partVisualBounds}
 from '../src/weapons/geometry/weapon-visual-anchors.ts';

const steel=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const dark=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function assembly(id){
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset,id);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(preset.weapon,steel,dark,config);
 return {config,group};
}
const box=(group,slot)=>{
 const b=partVisualBounds(group,slot);
 assert.ok(b,slot+' present');
 return b;
};
const rayHits=(group,x,y)=>{
 group.updateMatrixWorld(true);
 const caster=new THREE.Raycaster(new THREE.Vector3(x,y,30),
  new THREE.Vector3(0,0,-1));
 return caster.intersectObjects(group.children,true).length>0;
};
test('R3.1: 91 parts and 17 presets retain combat muzzle and geometry budget',()=>{
 assert.equal(Object.keys(FAMILY_PARTS).length,91);
 assert.equal(FAMILY_PRESETS.length,17);
 for(const p of FAMILY_PRESETS){
  const {config,group}=assembly(p.id);
  const bounds=new THREE.Box3().setFromObject(group);
  assert.ok(Math.abs(bounds.max.x-resolveWeaponAssembly(config).muzzleX)<.001,
   p.id+' gameplay tip');
  assert.ok(group.children.length<=28,p.id+' mesh count');
  clearWeaponSilhouette(group);
 }
});
test('R3.1: major solid envelopes intersect in X, Y and Z without floating',()=>{
 for(const p of FAMILY_PRESETS){
  const {group}=assembly(p.id);
  for(const [a,b] of [
   ['stock','receiver'],['receiver','handguard'],
   ['handguard','barrel'],['receiver','grip'],['receiver','magazine']
  ]){
   const x=box(group,a),y=box(group,b);
   assert.ok(x.intersectsBox(y),p.id+' '+a+' to '+b+' joint');
  }
  clearWeaponSilhouette(group);
 }
});
test('R3.1: shortened Mk18 and AKS-74U still have open silhouette identifiers',()=>{
 const mk=assembly('ar-mk18'),m4=assembly('ar-m4a1');
 assert.ok(box(mk.group,'stock').max.x>box(m4.group,'stock').max.x-2,
  'compact stock must remain attached toward receiver');
 const s=assembly('ak-aks74u'),ak=assembly('ak-ak105');
 assert.ok(box(s.group,'receiver').max.x<box(ak.group,'receiver').max.x);
 assert.equal(rayHits(s.group,-9.65,-1.05),false,
  'AKS-74U skeletal opening remains empty');
 assert.ok(rayHits(ak.group,-9.65,-1.05),
  'AK-105 solid stock remains solid');
 for(const v of [mk,m4,s,ak])clearWeaponSilhouette(v.group);
});
test('R3.1: AR front sight is a squat open A rather than solid tall spike',()=>{
 const m=assembly('ar-m4a1');
 // M4A1 A-frame now uses the canonical 14.0 sight landmark.
 assert.equal(rayHits(m.group,14.0,1.4),false,'A-frame internal gap');
 assert.ok(rayHits(m.group,13.68,1.4),'left narrowed A-frame leg');
 assert.ok(rayHits(m.group,14.32,1.4),'right narrowed A-frame leg');
 assert.ok(box(m.group,'barrel').max.y<3.25,'sight height reduced');
 clearWeaponSilhouette(m.group);
});
test('R3.1: auto-fit favors 78% width without clipping in portrait layouts',()=>{
 for(const id of ['ar-car15','ar-m4a1','ar-mk18','ak-aks74u','ak-ak105']){
  const {config,group}=assembly(id);
  group.scale.x=resolveWeaponAssembly(config).lengthScale;
  const bounds=new THREE.Box3().setFromObject(group);
  const distance=workbenchFitDistance(bounds,300,240);
  assert.ok(distance>=27&&distance<=110,id+' camera bounds');
  const visibleWidth=2*distance*Math.tan(37*Math.PI/360)*300/240;
  const occupancy=bounds.getSize(new THREE.Vector3()).x/visibleWidth;
  assert.ok(occupancy<=.8,id+' should not clip horizontally: '+occupancy);
  assert.ok(occupancy>.55,id+' needs useful zoom: '+occupancy);
  clearWeaponSilhouette(group);
 }
});
test('R3.1: socket motion fades during drag and restores after idle; selection survives',()=>{
 const workbench=source('src/equipment-weapon-workbench.ts');
 const quick=source('src/breach-main.ts');
 assert.match(workbench,/moved>6/);
 assert.match(workbench,/this\.hideDotsDuringInspection\(\)/);
 assert.match(workbench,/this\.setSocketDotsVisible\(false,true\)/);
 assert.match(workbench,/this\.setSocketDotsVisible\(true\)/);
 assert.match(workbench,/this\.reducedMotion\?0:180/);
 assert.match(workbench,/this\.gestureActive\|\|this\.socketTapConsumed/);
 assert.match(workbench,/this\.leader\.style\.opacity=visible\?'1':'0'/);
 assert.match(workbench,/getViewState\(\):WeaponWorkbenchViewState\|null/);
 assert.match(workbench,/restoreViewState\(view:WeaponWorkbenchViewState\)/);
 assert.match(quick,/rememberQuickWorkbenchView\(\)/);
 assert.match(quick,/quickWorkbench\.restoreViewState\(view\)/);
 assert.match(quick,/resetQuickWorkbenchViews\.add\(member\.id\)/);
});
