import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {AK_VISUAL_ANATOMY}
 from '../src/weapons/geometry/weapon-receiver-anatomy.ts';
import {akBarrelArt} from '../src/weapons/geometry/ak-barrel-profiles.ts';

const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const ids=['ak-akm','ak-akms','ak-ak74','ak-aks74','ak-ak74m',
 'ak-rpk74','ak-ak103','ak-aks74u','ak-ak105'];
const box=m=>new THREE.Box3().setFromObject(m);
const slot=(g,s)=>g.children.filter(x=>x.name.startsWith('family-'+s+'-'));
function build(id){
 const preset=FAMILY_PRESETS.find(x=>x.id===id);
 assert.ok(preset,id);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(preset.weapon),id);
 const group=buildWeaponSilhouette(cfg.weapon,mat,mat,cfg);
 group.updateMatrixWorld(true);
 return {preset,cfg,group};
}
const dispose=(...all)=>all.forEach(x=>clearWeaponSilhouette(x.group));

test('R4.7 all nine keep attached geometry and the authoritative muzzle while staying within budget',()=>{
 for(const id of ids){
  const a=build(id);
  assert.ok(a.group.children.length<=28,id+' phone mesh budget');
  assert.ok(a.group.children.length>=12);
  const full=box(a.group),art=akBarrelArt(a.preset.parts.barrel);
  assert.ok(Math.abs(full.max.x-art.muzzleX)<.001,id+' visible muzzle');
  assert.ok(Math.abs(resolveWeaponAssembly(a.cfg).muzzleX-art.muzzleX)<.001,
   id+' firing origin');
  const receiver=new THREE.Box3();
  slot(a.group,'receiver').forEach(m=>receiver.union(box(m)));
  const furniture=slot(a.group,'handguard');
  assert.equal(furniture.length,a.preset.parts.handguard==='ak-rail-long'?4:3);
  assert.ok(receiver.intersectsBox(box(furniture[0])),id+' seated lower cheek');
  assert.ok(box(furniture[0]).intersectsBox(box(furniture[1])),
   id+' heel touches lower handguard');
  assert.ok(box(furniture[1]).min.y<-1.85,id+' discreet rear heel');
  assert.ok(box(furniture[2]).min.y>box(furniture[0]).max.y+.1,
   id+' continuous negative-space seam between upper/lower handguards');
  dispose(a);
 }
});
test('R4.7 dust cover is slimmer and integrated sight shares its top shell',()=>{
 for(const id of ids.filter(x=>x!=='ak-aks74u')){
  const a=build(id),r=slot(a.group,'receiver');
  const body=box(r[0]),cover=box(r[1]),rear=box(r[4]);
  assert.ok(cover.max.z-cover.min.z<body.max.z-body.min.z-.5,
   id+' cover more narrow than lower receiver');
  assert.ok(cover.intersectsBox(rear),id+' rear iron sight is firmly embedded');
  assert.ok(rear.max.y<2.75,id+' low sight, not holographic fin');
  assert.ok(cover.max.x>body.max.x+.8,id+' cover nose overlaps fore-end');
  dispose(a);
 }
});
test('R4.7 AKS-74U has two independent, forward, depth-separated sight wings',()=>{
 const a=build('ak-aks74u'),r=slot(a.group,'receiver');
 const wings=r.slice(5,7);
 assert.equal(wings.length,2,'not a single sight hump');
 const [back,front]=wings.map(box);
 assert.ok(back.min.x>-3.0&&front.min.x>-2.1,'sight wings moved forward');
 assert.ok(front.min.x-back.max.x>0,'negative-space slit between wings');
 assert.ok(wings[0].position.z<-.8&&wings[1].position.z>.8,
  'wings exist on opposite sides of the cover');
 assert.ok(back.max.y>3&&front.max.y>3,'uprights readable');
 dispose(a);
});
test('R4.7 silver cover bands cross full top and smooth family remains clear',()=>{
 for(const id of ids){
  const a=build(id),r=a.group.children.filter(m=>
   m.name==='family-art-ak-cover-ribs');
  const stamped=['ak-akm','ak-akms','ak-ak74','ak-aks74','ak-rpk74']
   .includes(id);
  assert.equal(r.length,stamped?1:0,id+' stamped-cover policy');
  if(stamped){
   assert.ok(r[0].isInstancedMesh&&r[0].count===3);
   assert.ok(r[0].geometry.parameters.depth>3,
    'physical ribs cross cover in Z, not side sticker');
   const matColor=r[0].material.color;
   assert.ok(matColor.r>.45&&matColor.g>.45,
    'muted silver stamp details');
  }
  dispose(a);
 }
});
test('R4.7 lower receiver omits trigger guard but keeps understated rivets',()=>{
 for(const id of ids){
  const a=build(id),receiver=slot(a.group,'receiver'),
   stamp=a.group.children.filter(m=>m.name==='family-art-ak-receiver-stamp');
  assert.ok(receiver.every(m=>box(m).min.y>=-2.61),
   id+' no disconnected trigger-guard shape');
  assert.equal(stamp.length,2,id+' one quiet stamped cue per side');
  assert.ok(stamp[0].position.z>0&&stamp[1].position.z<0);
  const selector=a.group.children.find(x=>x.name==='family-art-ak-selector');
  assert.ok(selector&&selector.position.x<-1.1&&
   selector.geometry.parameters.height>=1.15,id+' bolder, rearward selector');
  dispose(a);
 }
});
test('R4.7 fixed wood stocks use one AKM two-quad family and all stocks slimmed',()=>{
 for(const id of ['ak-akm','ak-ak74']){
  const a=build(id),pieces=slot(a.group,'stock');
  assert.equal(pieces.length,2,id+' shares two-piece shape');
  assert.ok(box(pieces[0]).intersectsBox(box(pieces[1])));
  for(const p of pieces)
   assert.ok(box(p).max.z-box(p).min.z<3.15,'slim side-to-side stock');
  dispose(a);
 }
 for(const id of ids){
  const a=build(id),grip=slot(a.group,'grip');
  assert.equal(grip.length,1);
  assert.ok(box(grip[0]).max.z-box(grip[0]).min.z<2.25,
   id+' narrower pistol grip depth');
  dispose(a);
 }
 assert.ok(AK_VISUAL_ANATOMY.gripDepthZ<2.25);
});
