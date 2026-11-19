import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,resolveWeaponAssembly}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {R870_P07} from '../src/weapons/geometry/r870-art-contract.ts';
import {R870_REAR_PARTS} from '../src/weapons/geometry/r870-rear-p12.ts';
import {WEAPON_FINISH_SPECS} from '../src/weapons/geometry/weapon-material-registry.ts';

const original=()=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),'r870-police-wood');
function make(key='wood'){
 const config=original(),rear=R870_REAR_PARTS[key];
 config.build={...config.build,parts:{...config.build.parts,grip:rear.grip,stock:rear.stock}};
 const material=new THREE.MeshBasicMaterial();
 const gun=buildWeaponSilhouette('shotgun',material,material,config);
 return {config,gun,dispose:()=>{clearWeaponSilhouette(gun);material.dispose();}};
}
const part=(g,key)=>g.children.find(x=>x.userData[key]);
const box=x=>new THREE.Box3().setFromObject(x);
const close=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<.02,`${label}: ${actual} vs ${expected}`);

test('P13 maintains saved side silhouettes but narrows ALL rear furniture in top view',()=>{
 for(const key of ['wood','shortwood','pistol','birdshead']){
  const {gun,dispose}=make(key);
  try{
   assert.equal(gun.userData.r870P13,true);
   const grip=part(gun,'r870RearGrip'),z=box(grip).getSize(new THREE.Vector3()).z;
   close(z,key==='birdshead'?2.38:key==='pistol'?2.60:2.90,key+' grip depth');
   if(key==='wood'||key==='shortwood'){
    const extension=part(gun,'r870StockExtension');
    close(box(extension).getSize(new THREE.Vector3()).z,2.90,key+' stock depth');
    close(box(part(gun,'r870ButtPad')).getSize(new THREE.Vector3()).z,3.12,key+' pad depth');
    close(part(gun,'r870ButtPad').geometry.parameters.width,.68,key+' pad thickness');
    close(box(gun).min.x,R870_REAR_PARTS[key].stockX,key+' rear datum');
   }else assert.equal(part(gun,'r870ButtPad'),undefined,'stockless must not show pad');
  }finally{dispose()}
 }
});
test('P13 lower visible barrel/raised fore-end alignment without moving actual shot datum',()=>{
 const {gun,config,dispose}=make();
 try{
  const b=part(gun,'r870Barrel'),tube=part(gun,'r870FixedTube'),
   cap=part(gun,'r870TubeCap'),sight=part(gun,'r870FrontSight'),
   pump=gun.children.find(x=>x.userData.r870PumpSides===6);
  close(b.position.y,.80,'lowered barrel');
  close(tube.position.y,-1.04,'unchanged fixed magazine tube');
  assert.ok(b.position.y-tube.position.y > b.geometry.parameters.radiusTop+tube.geometry.parameters.radiusTop,
   'barrel/magazine tubes must remain nonintersecting');
  close(cap.position.y,tube.position.y,'fixed tube cap axis');
  close(sight.position.y,2.00,'sight follows barrel');
  close(sight.geometry.parameters.height,.59,'oversized readable sight');
  const pos=pump.geometry.getAttribute('position').array;
  const xs=[3.08,10.97],sideWidths=xs.map(x=>{
   let width=0;
   for(let i=0;i<pos.length;i+=3)if(Math.abs(pos[i]-x)<.001)
    width=Math.max(width,Math.abs(pos[i+2]));
   return width;
  });
  sideWidths.forEach(w=>close(w,1.85,'slimmer six-sided sleeve'));
  const minY=Math.min(...Array.from({length:pos.length/3},(_,i)=>pos[i*3+1]));
  close(minY,-2.84,'raised pump underside');
  const pose=riflePoseContacts('shotgun',config);
  assert.ok(pose&&pose.family==='r870');
  close(pose.support.near.y,-3.11,'support hand follows raised pump');
  assert.ok(pose.support.near.y<minY-.2,'palm not buried in sleeve');
  const assembly=resolveWeaponAssembly(config);
  close(assembly.muzzleY,R870_P07.muzzleY,'unchanged shot-time datum');
  close(assembly.muzzleX,R870_P07.muzzleX,'unchanged shot-time endpoint');
 }finally{dispose()}
});
test('P13 ejection port is taller with no extra triangles and grooves use wood finish',()=>{
 const {gun,dispose}=make();
 try{
  const port=part(gun,'r870RightEjectionPort'),grooves=part(gun,'r870GrooveBatch');
  assert.ok(port&&grooves);
  const pts=port.geometry.parameters.shapes.getPoints(1),ys=pts.map(x=>x.y);
  close(Math.max(...ys),1.18,'raised port ceiling');
  close(Math.min(...ys),.10,'lower port floor');
  assert.ok(Math.max(...ys)-Math.min(...ys)>1.05,'taller port');
  assert.equal((port.geometry.index?.count??port.geometry.getAttribute('position').count)/3,4,
   'flat six-point port remains four triangles');
  assert.equal(grooves.geometry.index.count/3,16,'all grooves stay batched');
  assert.equal(grooves.material.color.getHex(),WEAPON_FINISH_SPECS['r870-walnut-groove'].color);
  assert.equal(WEAPON_FINISH_SPECS['r870-walnut-groove'].role,'wood');
  const total=gun.children.reduce((sum,m)=>sum+
   (m.geometry.index?.count??m.geometry.getAttribute('position').count)/3,0);
  assert.ok(total<=260,'low polygon count maintained: '+total);
  assert.equal(gun.children.length,11,'no new detail/draw calls');
 }finally{dispose()}
});
