import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy}
 from '../src/arsenal/recipes.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {R870_P07} from '../src/weapons/geometry/r870-art-contract.ts';

const config=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),'r870-police-wood');
const make=()=>{
 const metal=new THREE.MeshBasicMaterial(),wood=new THREE.MeshBasicMaterial();
 const gun=buildWeaponSilhouette('shotgun',metal,wood,config());
 return {gun,dispose:()=>{clearWeaponSilhouette(gun);metal.dispose();wood.dispose();}};
};
const tagged=(gun,key)=>gun.children.filter(mesh=>mesh.userData[key]);
const bounds=mesh=>new THREE.Box3().setFromObject(mesh);

test('R870 identity saves and six authored part slots survive the P10 simplification',()=>{
 const c=config(),recipe=arsenalRecipeFromLegacy(c),a=resolveWeaponAssembly(c);
 assert.ok(recipe);assert.deepEqual(arsenalRecipeToLegacy(recipe)?.build,c.build);
 assert.equal(a.muzzleX,R870_P07.muzzleX);
 assert.equal(a.muzzleY,R870_P07.muzzleY);
 assert.equal(a.stockX,R870_P07.stockX);
 const {gun,dispose}=make();try{
  assert.equal(gun.userData.r870P10,true);
  for(const slot of ['stock','receiver','grip','magazine','handguard','barrel'])
   assert.ok(gun.children.some(mesh=>mesh.name.startsWith('family-'+slot+'-')),slot);
  assert.ok(gun.children.every(mesh=>mesh.name.startsWith('family-')));
  const b=bounds(gun);
  assert.ok(Math.abs(b.min.x-R870_P07.stockX)<.035);
  assert.ok(Math.abs(b.max.x-R870_P07.muzzleX)<.035);
  assert.equal(tagged(gun,'r870FixedTube').length,1);
  assert.equal(tagged(gun,'r870TubeCap').length,1);
  assert.equal(tagged(gun,'r870PumpPart').length,9);
 }finally{dispose();}
});

test('R870 P10 uses one bold crowned steel receiver with a flat UPWARD right-side port',()=>{
 const {gun,dispose}=make();try{
  const body=tagged(gun,'r870BoldReceiver');
  const port=tagged(gun,'r870RightEjectionPort');
  assert.equal(body.length,1);assert.equal(port.length,1);
  assert.equal(port[0].userData.r870FlatPort,true);
  assert.ok(port[0].position.z>0);
  assert.ok(port[0].position.z>bounds(body[0]).max.z);
  assert.equal(tagged(gun,'r870RightPortFrame').length,0);
  assert.equal(tagged(gun,'r870InsetBolt').length,0);
  assert.equal(tagged(gun,'r870SolidLeftReceiver').length,0);
  assert.equal(tagged(gun,'r870ActionBar').length,0);
  assert.ok(port[0].geometry.parameters.shapes.getPoints(1).length<=6);
  const pts=body[0].geometry.parameters.shapes.getPoints(1);
  assert.equal(pts.length,9,'nine readable exterior landmarks, no extra microplanes');
  assert.ok(Math.max(...pts.map(x=>x.y))>1.65,'receiver crown is pronounced');
 }finally{dispose();}
});

test('R870 P10 woody stock has few facets, substantial butt pad and sharply legible grip drop',()=>{
 const {gun,dispose}=make();try{
  const stock=gun.children.find(x=>x.name.startsWith('family-stock-')&&
   x.geometry instanceof THREE.ExtrudeGeometry);
  const grip=gun.children.find(x=>x.name.startsWith('family-grip-')&&
   x.geometry instanceof THREE.ExtrudeGeometry);
  const pad=tagged(gun,'r870ButtPad')[0];
  assert.ok(stock&&grip&&pad);
  assert.equal(stock.geometry.parameters.shapes.getPoints(1).length,8);
  assert.equal(grip.geometry.parameters.shapes.getPoints(1).length,10);
  assert.ok(Math.abs(pad.geometry.parameters.width-.54)<1e-6,
   'visible rear pad slab enlarged from P09 .34');
  assert.ok(bounds(grip).min.y< -3.5,'new grip runs down then rear/down');
  assert.ok(bounds(stock).min.y< -3.6);
  assert.ok(Math.abs(bounds(stock).min.z-bounds(grip).min.z)<.02,
   'stock and integral wrist use the same thickness');
 }finally{dispose();}
});

test('R870 P10 pump becomes a regular six-plane sleeve, not an inflated eight-face pillow',()=>{
 const {gun,dispose}=make();try{
  const pumps=tagged(gun,'r870PumpPart'),body=pumps.find(x=>x.userData.r870PumpSides);
  assert.equal(pumps.length,9);assert.ok(body);
  assert.equal(body.userData.r870PumpSides,6);
  assert.equal(body.userData.r870CorncobStations,4);
  const xyz=body.geometry.getAttribute('position').array;
  const sideWidth=x=>{
   let half=0;for(let i=0;i<xyz.length;i+=3)
    if(Math.abs(xyz[i]-x)<.0001)half=Math.max(half,Math.abs(xyz[i+2]));
   return half;
  };
  assert.ok(Math.abs(sideWidth(3.08)-sideWidth(10.97))<.001,
   'rigid full-width section is constant from rear to front');
  assert.ok(sideWidth(3.08)>sideWidth(2.65)+.10);
  assert.ok(sideWidth(10.97)>sideWidth(11.50)+.10);
  assert.ok(pumps.filter(x=>x!==body).every(x=>Math.abs(x.position.z)>2));
  const contacts=riflePoseContacts('shotgun',config());
  assert.ok(contacts&&contacts.family==='r870');
  assert.equal(contacts.support.near.y,R870_P07.supportPalmY);
  assert.ok(contacts.support.near.y<bounds(body).min.y,'palm clears the bottom face');
 }finally{dispose();}
});

test('R870 P10 barrel, fixed tube, cap and oversized bead retain 6-sided construction',()=>{
 const {gun,dispose}=make();try{
  const barrel=tagged(gun,'r870Barrel')[0],tube=tagged(gun,'r870FixedTube')[0],
   cap=tagged(gun,'r870TubeCap')[0],sight=tagged(gun,'r870FrontSight')[0];
  assert.ok(barrel&&tube&&cap&&sight);
  for(const item of [barrel,tube,cap])
   assert.equal(item.geometry.parameters.radialSegments,6);
  assert.equal(barrel.geometry.parameters.radiusTop,.96);
  assert.equal(tube.geometry.parameters.radiusTop,.80);
  assert.equal(cap.geometry.parameters.radiusTop,.86);
  assert.ok(barrel.position.y-tube.position.y>1.9);
  assert.ok(bounds(barrel).max.x-bounds(cap).max.x>4.5);
  assert.equal(sight.geometry.parameters.height,.55);
  assert.ok(bounds(sight).max.y>2.35);
  const triangles=gun.children.reduce((total,o)=>total+
   ((o.geometry?.index?.count??o.geometry?.getAttribute('position')?.count??0)/3),0);
  assert.ok(triangles<450,'P10 geometric reduction budget: '+triangles);
 }finally{dispose();}
});
