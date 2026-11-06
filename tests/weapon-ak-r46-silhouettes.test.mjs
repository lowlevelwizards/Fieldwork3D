import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 setConfiguredFamilyPart,resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {akBarrelArt} from '../src/weapons/geometry/ak-barrel-profiles.ts';
import {workbenchFitCenter,workbenchFitDistance}
 from '../src/weapons/geometry/weapon-workbench-camera-fit.ts';

const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const ids=['ak-akm','ak-akms','ak-ak74','ak-aks74','ak-ak74m',
 'ak-rpk74','ak-ak103','ak-aks74u','ak-ak105'];
function build(id){
 const preset=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(preset,id+' must exist');
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(cfg.weapon,material,material,cfg);
 group.updateMatrixWorld(true);
 return {preset,cfg,group};
}
const slot=(g,s)=>g.children.filter(m=>m.name.startsWith('family-'+s+'-'));
const box=m=>new THREE.Box3().setFromObject(m);
const release=(...all)=>all.forEach(x=>clearWeaponSilhouette(x.group));

test('R4.6 clean receiver and one recognizable open trigger guard on all nine',()=>{
 assert.equal(FAMILY_PRESETS.filter(p=>p.family==='ak').length,9);
 assert.equal(Object.keys(FAMILY_PARTS).length,93);
 for(const id of ids){
  const m=build(id),r=slot(m.group,'receiver');
  assert.ok(r.length>=6,id+' receiver keeps essential faces');
  // Former giant side panel is not a displaced 2.8x1.15 cuboid.
  assert.ok(!r.some(mesh=>mesh.geometry.type==='BoxGeometry'&&
   Math.abs(mesh.geometry.parameters.width-2.8)<.01));
  assert.ok(r.some(mesh=>{
   const a=mesh.geometry.getAttribute('position');
   return box(mesh).min.y<-2.7&&box(mesh).max.y>-2.2&&
    box(mesh).max.x<-.5;
  }),id+' open trigger guard');
  assert.ok(m.group.children.length<=28,id+' phone geometry budget');
  release(m);
 }
});

test('R4.6 classic ribs are paired, modern smooth, and AK-74U stays distinct',()=>{
 for(const id of ids){
  const m=build(id),ribs=m.group.children.filter(x=>
   x.name==='family-art-ak-cover-ribs');
  const expected=['ak-akm','ak-akms','ak-ak74','ak-aks74','ak-rpk74'].includes(id);
  assert.equal(ribs.length,expected?2:0,id+' receiver variant rib policy');
  if(expected){
   assert.ok(ribs.some(x=>x.position.z>0)&&ribs.some(x=>x.position.z<0));
  }
  release(m);
 }
});

test('R4.6 sloped classic block vs later upright AK gas assembly',()=>{
 const classic=build('ak-akm'),late=build('ak-ak74');
 const a=box(slot(classic.group,'barrel')[2]);
 const b=box(slot(late.group,'barrel')[2]);
 assert.ok(a.max.x-a.min.x>b.max.x-b.min.x+.3,
  'AKM gas block retains its longer characteristic rake');
 for(const x of [classic,late]){
  const barrel=slot(x.group,'barrel');
  assert.ok(box(barrel[1]).intersectsBox(box(barrel[2])));
  assert.ok(box(barrel[2]).min.y<0&&box(barrel[2]).max.y>1.8);
 }
 release(classic,late);
});

test('R4.6 AK-103 factory 100-series front exists without replacing custom slant',()=>{
 const m=build('ak-ak103');
 assert.equal(m.cfg.build.parts.barrel,'ak-long','custom default preserved');
 const cfg=setConfiguredFamilyPart(m.cfg,'barrel','ak-103-factory');
 assert.equal(cfg.build.parts.barrel,'ak-103-factory');
 const factory=buildWeaponSilhouette(cfg.weapon,material,material,cfg);
 const slant=slot(m.group,'barrel'),standard=slot(factory,'barrel');
 assert.ok(box(standard[4]).max.y-box(standard[4]).min.y>
  box(slant[4]).max.y-box(slant[4]).min.y+.15,
  'factory standard brake and custom slant visibly distinguishable');
 assert.equal(akBarrelArt(cfg.build.parts.barrel).muzzleX,
  resolveWeaponAssembly(cfg).muzzleX);
 clearWeaponSilhouette(factory);release(m);
});

test('R4.6 AKMS round hinges protrude and two bars stay separated in depth',()=>{
 const m=build('ak-akms'),stock=slot(m.group,'stock');
 const rods=stock.filter(x=>x.geometry.type==='ExtrudeGeometry');
 const hinges=stock.filter(x=>x.geometry.type==='CylinderGeometry');
 assert.equal(rods.length,2);assert.equal(hinges.length,2);
 assert.ok(Math.abs(rods[0].position.z-rods[1].position.z)>2);
 for(const hinge of hinges)
  assert.ok(Math.abs(hinge.position.z)>2.0,
   'rivets must sit outside receiver front/back surfaces');
 release(m);
});

test('R4.6 folded RPK bipod forms real side-profile dark gap',()=>{
 const m=build('ak-rpk74'),barrel=slot(m.group,'barrel');
 const main=box(barrel[0]),leg=box(barrel[5]);
 assert.ok(leg.max.y<main.min.y-.25,'bipod separate from main barrel');
 assert.ok(leg.max.x-leg.min.x>7,'folded leg length remains recognizably long');
 release(m);
});

test('R4.6 only stamped 7.62 steel mags receive two ribs',()=>{
 for(const id of ['ak-akm','ak-akms','ak-ak103']){
  const m=build(id);
  const count=slot(m.group,'magazine').length;
  assert.equal(count,id==='ak-ak103'?1:3,id+' mag material detailing');
  release(m);
 }
});

test('R4.6 real mesh bounds center, without legacy stock-anchor crop',()=>{
 const b=new THREE.Box3(
  new THREE.Vector3(-22,-8,-2),new THREE.Vector3(17,4,2));
 const [x,y]=workbenchFitCenter(b);
 assert.equal(x,-2.5);assert.equal(y,-2);
 assert.deepEqual(workbenchFitCenter(new THREE.Box3()),[0,0]);
 assert.ok(workbenchFitDistance(b,410,280)>27);
 assert.ok(workbenchFitDistance(b,240,200)>workbenchFitDistance(b,410,280));
});
