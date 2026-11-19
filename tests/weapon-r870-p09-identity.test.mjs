import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {arsenalRecipeFromLegacy,arsenalRecipeToLegacy}
 from '../src/arsenal/recipes.ts';
import {R870_P07} from '../src/weapons/geometry/r870-art-contract.ts';

const config=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),
 'r870-police-wood');
const construct=()=>{
 const metal=new THREE.MeshBasicMaterial();
 const wood=new THREE.MeshBasicMaterial();
 const g=buildWeaponSilhouette('shotgun',metal,wood,config());
 return {g,dispose:()=>{clearWeaponSilhouette(g);metal.dispose();wood.dispose();}};
};
const find=(g,key)=>g.children.filter(x=>x.userData[key]);
const bounds=o=>new THREE.Box3().setFromObject(o);

test('R870 P09 identity keeps save, muzzle, shoulder and six selectable body contracts',()=>{
 const c=config(),recipe=arsenalRecipeFromLegacy(c),a=resolveWeaponAssembly(c);
 assert.ok(recipe);assert.deepEqual(arsenalRecipeToLegacy(recipe)?.build,c.build);
 assert.equal(a.muzzleX,R870_P07.muzzleX);
 assert.equal(a.muzzleY,R870_P07.muzzleY);
 assert.equal(a.stockX,R870_P07.stockX);
 const {g,dispose}=construct();
 try{
  assert.equal(g.userData.r870P09,true);
  const names=['stock','receiver','grip','magazine','handguard','barrel'];
  for(const slot of names)assert.ok(g.children.some(m=>
   m.name.startsWith('family-'+slot+'-')),slot+' is selectable');
  assert.ok(g.children.every(m=>m.name.startsWith('family-')));
  const box=bounds(g);
  assert.ok(Math.abs(box.min.x-R870_P07.stockX)<.035);
  assert.ok(Math.abs(box.max.x-R870_P07.muzzleX)<.035);
  assert.equal(find(g,'r870PumpPart').length,9);
  assert.equal(find(g,'r870FixedTube').length,1);
  assert.equal(find(g,'r870TubeCap').length,1);
 }finally{dispose();}
});
test('R870 P09 receiver has rounded silhouette and a real right-only side-skin opening',()=>{
 const {g,dispose}=construct();
 try{
  const frames=find(g,'r870RightPortFrame');
  assert.equal(frames.length,1);
  const frame=frames[0];
  assert.ok(frame.position.z>1.5,'right surface');
  assert.ok(frame.geometry instanceof THREE.ExtrudeGeometry);
  assert.equal(frame.geometry.parameters.shapes.holes.length,1,
   'right steel skin has a genuine cutout, not a port-shaped decal');
  assert.equal(find(g,'r870SolidLeftReceiver').length,1);
  assert.ok(find(g,'r870SolidLeftReceiver')[0].position.z<0);
  const dark=find(g,'r870RightEjectionPort'),bolt=find(g,'r870InsetBolt');
  assert.equal(dark.length,1);assert.equal(bolt.length,1);
  assert.ok(dark[0].position.z<bolt[0].position.z);
  assert.ok(bolt[0].position.z<frame.position.z);
  const receiver=g.children.find(m=>m.name.startsWith('family-receiver-')&&
   !m.userData.r870RightPortFrame&&!m.userData.r870SolidLeftReceiver&&
   !m.userData.r870RightEjectionPort&&!m.userData.r870InsetBolt&&
   !m.userData.r870ActionBar);
  assert.ok(receiver);
  const pts=receiver.geometry.parameters?.shapes?.getPoints?.(1)||[];
  assert.ok(pts.length>=11,'the receiver remains a deliberately sculpted profile');
 }finally{dispose();}
});
test('R870 P09 stock/wrist reads as a broad butt and rounded integrated grip',()=>{
 const {g,dispose}=construct();
 try{
  const stock=g.children.find(x=>x.name.startsWith('family-stock-')&&
   x.geometry instanceof THREE.ExtrudeGeometry);
  const grip=g.children.find(x=>x.name.startsWith('family-grip-')&&
   x.geometry instanceof THREE.ExtrudeGeometry);
  assert.ok(stock);assert.ok(grip);
  const sb=bounds(stock),gb=bounds(grip);
  assert.ok(sb.min.y<-3.65,'full broad wood butt');
  assert.ok(gb.min.y>-3.4,'no detached deep hook below the stock');
  assert.ok(gb.min.y< -3.1,'still recognizable as a traditional shotgun grip');
  assert.ok(Math.abs(sb.max.x-gb.min.x)<4,'wood pieces meet in the wrist');
 }finally{dispose();}
});
test('R870 P09 pump has a swollen eight-sided center, four readable pairs of grooves',()=>{
 const {g,dispose}=construct();
 try{
  const pump=find(g,'r870CorncobStations');
  assert.equal(pump.length,1);assert.equal(pump[0].userData.r870CorncobStations,6);
  const body=pump[0],array=body.geometry.getAttribute('position').array;
  const extents=x=>{
   let out=0;
   for(let i=0;i<array.length;i+=3)
    if(Math.abs(array[i]-x)<.001)out=Math.max(out,Math.abs(array[i+2]));
   return out;
  };
  assert.ok(extents(6.10)>extents(2.65)+.45,'pump center genuinely bulges');
  assert.ok(extents(6.10)>extents(11.50)+.45,'pump front tapers');
  assert.ok(bounds(body).min.x>=R870_P07.pumpStartX-.001);
  assert.ok(bounds(body).max.x<=R870_P07.pumpEndX+.001);
  const sides=find(g,'r870PumpPart');
  assert.equal(sides.length,9,'pump body and four grooves on both sides');
  assert.ok(sides.slice(1).every(s=>Math.abs(s.position.z)>1.65));
 }finally{dispose();}
});
test('R870 P09 chunky barrel and fixed tube stay six-sided, separated and period-correct',()=>{
 const {g,dispose}=construct();
 try{
  const barrel=find(g,'r870Barrel')[0],mag=find(g,'r870FixedTube')[0],
   cap=find(g,'r870TubeCap')[0];
  assert.ok(barrel&&mag&&cap);
  assert.equal(barrel.geometry.parameters.radialSegments,6);
  assert.equal(mag.geometry.parameters.radialSegments,6);
  assert.equal(cap.geometry.parameters.radialSegments,6);
  assert.equal(barrel.geometry.parameters.radiusTop,.80);
  assert.equal(mag.geometry.parameters.radiusTop,.68);
  assert.equal(cap.geometry.parameters.radiusTop,.76);
  assert.ok(barrel.position.y-mag.position.y>1.7);
  assert.ok(bounds(barrel).max.x-bounds(cap).max.x>4.5,
   '18-inch police plain barrel extends beyond standard capped tube');
  assert.ok(cap.name.startsWith('family-magazine-'));
  // Audits are informational for art review; this budget guards mesh explosions.
  const triangles=g.children.reduce((total,o)=>total+
   ((o.geometry?.index?.count??o.geometry?.getAttribute('position')?.count??0)/3),0);
  assert.ok(triangles<750,'measured production triangles: '+triangles);
 }finally{dispose();}
});
