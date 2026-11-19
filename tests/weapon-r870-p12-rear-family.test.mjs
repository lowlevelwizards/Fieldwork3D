import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {FAMILY_PARTS,validFamilyBuild,proposeFamilyPartChange,readWeaponFamilyBuild}
 from '../src/equipment-weapon-families.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy} from '../src/arsenal/recipes.ts';
import {stocklessMP5K} from '../src/breach-weapon-pose.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {R870_REAR_PARTS,R870_REAR_JOIN,r870RearPair}
 from '../src/weapons/geometry/r870-rear-p12.ts';
import {R870_P07} from '../src/weapons/geometry/r870-art-contract.ts';

const factory=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),'r870-police-wood');
const build=(key)=>{
 const base=factory(),rear=R870_REAR_PARTS[key];
 return {...base,build:{...base.build,parts:{...base.build.parts,stock:rear.stock,grip:rear.grip}}};
};
const model=config=>{
 const material=new THREE.MeshBasicMaterial(),gun=buildWeaponSilhouette('shotgun',material,material,config);
 return {gun,dispose:()=>{clearWeaponSilhouette(gun);material.dispose()}};
};
const extent=o=>new THREE.Box3().setFromObject(o);
test('P12 full wood retains original factory IDs and intact legacy saved recipes',()=>{
 const config=factory(),original=arsenalRecipeFromLegacy(config);
 assert.ok(original);
 assert.equal(original.parts.stock,'r870-police-wood-stock');
 assert.equal(original.parts.grip,'r870-police-wood-wrist');
 assert.deepEqual(arsenalRecipeToLegacy(original)?.build,config.build);
 assert.equal(r870RearPair(original.parts.stock,original.parts.grip),'wood');
});
test('P12 grip-first polygon truly dips DOWN before returning UP to the shoulder',()=>{
 const a=R870_REAR_PARTS.wood.gripOutline;
 assert.equal(a.length,11);
 assert.deepEqual(a[0],R870_REAR_JOIN.extensionTop);
 assert.deepEqual(a.at(-1),R870_REAR_JOIN.extensionBottom);
 assert.ok(a[1][1]<a[0][1]-.3,'neck dips behind receiver');
 assert.ok(a[2][1]<=a[1][1],'neck has lower plateau');
 assert.ok(a[4][1]>a[2][1]+1,'receiver upper line sits substantially above neck');
 assert.ok(a[9][1]<a[10][1],'lower grip heel is rounded and returns to rear');
 for(const key of ['wood','shortwood']){
  const rear=R870_REAR_PARTS[key],stock=rear.stockOutline;
  assert.deepEqual(stock[3],a[0]);
  assert.deepEqual(stock[4],a.at(-1));
  assert.equal(FAMILY_PARTS[rear.stock].stockX,rear.stockX);
 }
});
test('P12 Arsenal stock/grip edits propose compatible real pair replacements',()=>{
 const base=factory().build;
 for(const key of ['shortwood','pistol','birdshead','wood']){
  const rear=R870_REAR_PARTS[key];
  const stockChange=proposeFamilyPartChange(base,'shotgun','stock',rear.stock);
  assert.equal(stockChange.valid,true,key+' stock');
  assert.equal(stockChange.build.parts.grip,rear.grip);
  const gripChange=proposeFamilyPartChange(base,'shotgun','grip',rear.grip);
  assert.equal(gripChange.valid,true,key+' grip');
  assert.equal(gripChange.build.parts.stock,R870_REAR_PARTS[key==='shortwood'?'wood':key].stock);
  assert.equal(validFamilyBuild(stockChange.build,'shotgun'),true);
  const config=build(key),recipe=arsenalRecipeFromLegacy(config);
  assert.ok(recipe,key+' is a loadable build');
  assert.deepEqual(arsenalRecipeToLegacy(recipe)?.build,config.build);
 }
 const invalid={...base,parts:{...base.parts,stock:'r870-pistol-only',grip:'r870-police-wood-wrist'}};
 assert.equal(validFamilyBuild(invalid,'shotgun'),false,'reject mismatched stock/grip');
 assert.equal(readWeaponFamilyBuild(invalid,'shotgun')?.parts.grip,'r870-pistol-grip',
  'tolerant old-save read repairs the pair without mutating the source');
});
test('P12 production model has actual independent grip silhouettes and NO phantom stock bodies',()=>{
 for(const key of ['wood','shortwood','pistol','birdshead']){
  const config=build(key),rear=R870_REAR_PARTS[key];
  const {gun,dispose}=model(config);
  try{
   assert.equal(gun.userData.r870P12,true);
   assert.equal(gun.userData.r870RearVariant,key);
   assert.equal(gun.userData.r870ShoulderStock,rear.hasShoulder);
   const stock=gun.children.filter(x=>x.name.startsWith('family-stock-'));
   const grip=gun.children.filter(x=>x.name.startsWith('family-grip-'));
   assert.equal(grip.length,1);
   assert.equal(stock.length,rear.hasShoulder?2:0);
   const rearBound=extent(rear.hasShoulder?stock[1]:grip[0]);
   assert.ok(Math.abs(rearBound.min.x-rear.stockX)<.04,
    key+' physically matches compactness datum');
   const pose=riflePoseContacts('shotgun',config);
   assert.ok(pose&&pose.family==='r870');
   assert.equal(pose.primary.x,rear.primaryX);
   assert.equal(stocklessMP5K(config),!rear.hasShoulder);
   assert.ok(gun.children.every(x=>x.name.startsWith('family-')));
  }finally{dispose();}
 }
});
test('P12 barrel root is inside receiver but shooting tip never shifts',()=>{
 const c=factory(),{gun,dispose}=model(c);
 try{
  const barrel=gun.children.find(x=>x.userData.r870Barrel);
  const receiver=gun.children.find(x=>x.userData.r870BoldReceiver);
  const a=resolveWeaponAssembly(c);
  assert.ok(barrel&&receiver);
  assert.ok(extent(barrel).min.x<extent(receiver).max.x-2);
  assert.ok(Math.abs(extent(barrel).min.x-.60)<.04);
  assert.ok(Math.abs(extent(barrel).max.x-R870_P07.muzzleX)<.04);
  assert.equal(a.muzzleX,R870_P07.muzzleX);
  assert.equal(a.stockX,R870_P07.stockX);
 }finally{dispose();}
});

test('P12 low-poly budget: flat right-only port, one batched groove mesh, no invisible geometry',()=>{
 const {gun,dispose}=model(factory());
 try{
  const port=gun.children.find(x=>x.userData.r870RightEjectionPort);
  const grooves=gun.children.find(x=>x.userData.r870GrooveBatch);
  const pump=gun.children.find(x=>x.userData.r870PumpSides===6);
  assert.ok(port&&grooves&&pump);
  const triangles=x=>(x.geometry.index?.count??
   x.geometry.getAttribute('position').count)/3;
  assert.equal(triangles(port),4,'flat six-corner port triangulates without depth walls');
  assert.equal(triangles(grooves),16,'eight grooves share sixteen flat triangles');
  assert.equal(grooves.geometry.index.count,48);
  assert.equal(gun.children.filter(x=>x.userData.r870PumpPart).length,2);
  assert.equal(gun.children.length,11,'full wood uses only eleven draw-friendly meshes');
  assert.equal(gun.userData.r870P12Optimized,true);
  assert.equal(port.castShadow,false);
  assert.equal(grooves.castShadow,false);
  const total=gun.children.reduce((sum,mesh)=>sum+triangles(mesh),0);
  assert.ok(total<=260,'keep complete, styled R870 under 260 triangles: '+total);
 }finally{dispose();}
});
