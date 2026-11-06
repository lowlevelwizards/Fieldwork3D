import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS,matchingFamilyPreset} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly,readWeaponConfiguration,setWeaponAttachment} from '../src/equipment-weapon-assemblies.ts';
import {AR_BARREL_ART} from '../src/weapons/geometry/ar-barrel-profiles.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
const m=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const ar=FAMILY_PRESETS.filter(p=>p.family==='ar');
const model=id=>{
 const preset=FAMILY_PRESETS.find(p=>p.id===id);assert.ok(preset,id);
 const config=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(preset.weapon,m,m,config);
 group.updateMatrixWorld(true);return {preset,config,group};
};
const box=(group,slot)=>{
 const b=partVisualBounds(group,slot);assert.ok(b,slot);return b;
};
const close=(a,b,e=.001)=>Math.abs(a-b)<e;
const shots=(g,x,y)=>new THREE.Raycaster(new THREE.Vector3(x,y,25),
 new THREE.Vector3(0,0,-1)).intersectObjects(g.children,true).length;
test('R4.2 all eight AR builds keep original saves and canonical barrel labels',()=>{
 assert.equal(ar.length,8);
 assert.equal(FAMILY_PRESETS.length,17);
 assert.equal(Object.keys(FAMILY_PARTS).length,66);
 assert.equal(Object.keys(AR_BARREL_ART).length,7);
 for(const p of ar){
  const {config,group}=model(p.id);
  assert.equal(matchingFamilyPreset(config.build)?.id,p.id);
  assert.deepEqual(readWeaponConfiguration(JSON.parse(JSON.stringify(config)),p.weapon),config);
  const barrel=FAMILY_PARTS[p.parts.barrel],art=AR_BARREL_ART[barrel.id];
  assert.ok(art&&barrel.name.includes(String(art.nominalInches)),p.id+' labeled barrel');
  assert.equal(barrel.nominalInches,art.nominalInches);
  assert.ok(close(resolveWeaponAssembly(config).muzzleX,art.muzzleX));
  assert.ok(close(new THREE.Box3().setFromObject(group).max.x,art.muzzleX),
   p.id+' rendered muzzle and firing muzzle agree');
  assert.ok(group.children.length<=28,p.id+' low geometry budget');
  assert.ok(box(group,'barrel').intersectsBox(box(group,'handguard')),
   p.id+' no floating barrel');
  clearWeaponSilhouette(group);
 }
});
test('R4.2 carry handles have flush front caps and open negative space',()=>{
 for(const id of ['ar-m16a1','ar-m16a2','ar-car15','ar-colt733']){
  const {group}=model(id);
  const cap=group.children.find(c=>c.name.startsWith('family-receiver-')&&c.name.endsWith('-6'));
  assert.ok(cap,id+' upper bridge mesh');
  const capBounds=new THREE.Box3().setFromObject(cap);
  assert.ok(capBounds.max.x<=1.65,id+' unsupported front cap overhang');
  assert.ok(shots(group,-2,3.72)>0,id+' carry bridge visible');
  assert.equal(shots(group,-2,2.78),0,id+' genuine open negative space');
  clearWeaponSilhouette(group);
 }
 const a1=model('ar-m16a1'),a2=model('ar-m16a2');
 assert.ok(a2.group.children.some(c=>c.name==='family-receiver-ar-a2-7'),
  'A2 has substantial rear sight housing');
 assert.ok(!a1.group.children.some(c=>c.name==='family-receiver-ar-a1-7'));
 clearWeaponSilhouette(a1.group);clearWeaponSilhouette(a2.group);
});
test('R4.2 A1/A2 fixed stocks are deep-at-butt tapered-at-root wedges',()=>{
 const a=model('ar-m16a1'),b=model('ar-m16a2');
 const ba=box(a.group,'stock'),bb=box(b.group,'stock');
 assert.ok(bb.min.x<ba.min.x-.5,'A2 stock is longer');
 for(const {group} of [a,b]){
  const stock=group.children.find(c=>c.name.startsWith('family-stock-')&&c.name.endsWith('-0'));
  assert.equal(stock.geometry.type,'ExtrudeGeometry');
  const vertices=stock.geometry.getAttribute('position');
  const rear=[],root=[];
  const xs=[];
  for(let i=0;i<vertices.count;i++)xs.push(vertices.getX(i));
  const minX=Math.min(...xs),maxX=Math.max(...xs);
  for(let i=0;i<vertices.count;i++){
   const x=vertices.getX(i),y=vertices.getY(i);
   if(x<minX+.3)rear.push(y);
   if(x>maxX-.3)root.push(y);
  }
  assert.ok(Math.min(...rear)<-3.0,'deep rear butt');
  assert.ok(Math.min(...root)>-.8,'slender front root');
  assert.ok(ba.max.z-ba.min.z<3.45,'Z depth not expanded');
 }
 clearWeaponSilhouette(a.group);clearWeaponSilhouette(b.group);
});
test('R4.2 nominal barrel sizes produce distinct scaled overall lengths',()=>{
 const desired=['ar-m16a1','ar-mk12mod0','ar-m4a1','ar-colt733','ar-mk18'];
 const positions=desired.map(id=>{
  const v=model(id),a=resolveWeaponAssembly(v.config);
  const value=a.muzzleX*a.lengthScale;
  clearWeaponSilhouette(v.group);return value;
 });
 for(let i=1;i<positions.length;i++)
  assert.ok(positions[i-1]>positions[i]+.5,
   desired[i-1]+' visually longer than '+desired[i]);
 const car=model('ar-car15'),m4=model('ar-m4a1');
 assert.ok(close(resolveWeaponAssembly(car.config).muzzleX,
  resolveWeaponAssembly(m4.config).muzzleX));
 clearWeaponSilhouette(car.group);clearWeaponSilhouette(m4.group);
});
test('R4.2 Mk12 is a hexagonal tube with joined rail bridge',()=>{
 const {group}=model('ar-mk12mod0');
 const tube=group.children.find(c=>c.name==='family-handguard-ar-pri-tube-0');
 assert.ok(tube&&tube.geometry.type==='CylinderGeometry');
 assert.equal(tube.geometry.parameters.radialSegments,6);
 const guard=box(group,'handguard');
 assert.ok(guard.min.x<3.0&&guard.max.x>15.6,
  'joined top rail extends over receiver and long forward tube');
 assert.ok(group.children.some(c=>c.name==='family-art-pri-vents'));
 clearWeaponSilhouette(group);
});
test('R4.2 attachment and muzzle flash share barrel tip and preserve AK default',()=>{
 const rifle=model('ar-m16a1');
 const suppressed=setWeaponAttachment(rifle.config,'muzzle','muzzle-suppressor');
 const a=resolveWeaponAssembly(suppressed),art=AR_BARREL_ART['ar-20'];
 assert.ok(close(a.mounted.muzzle.mountX,art.muzzleX));
 assert.ok(close(a.muzzleX,art.muzzleX+5.5));
 const accessories=buildWeaponAccessories(suppressed,m,m);
 assert.ok(close(new THREE.Box3().setFromObject(accessories).max.x,a.muzzleX));
 clearWeaponSilhouette(accessories);clearWeaponSilhouette(rifle.group);
 const ak=model('ak-akm');
 assert.ok(close(resolveWeaponAssembly(ak.config).muzzleX,19.5));
 clearWeaponSilhouette(ak.group);
});
