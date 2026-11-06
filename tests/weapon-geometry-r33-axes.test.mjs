import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FAMILY_PARTS,FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly} from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {partVisualBounds} from '../src/weapons/geometry/weapon-visual-anchors.ts';
import {AR_VISUAL_ANATOMY,AK_VISUAL_ANATOMY}
 from '../src/weapons/geometry/weapon-receiver-anatomy.ts';

const plain=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
function model(id){
 const p=FAMILY_PRESETS.find(p=>p.id===id);
 assert.ok(p,'missing '+id);
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(p.weapon),id);
 const group=buildWeaponSilhouette(p.weapon,plain,plain,cfg);
 group.updateMatrixWorld(true);
 return {group,cfg};
}
const bounds=(m,slot)=>{
 const b=partVisualBounds(m.group,slot);
 assert.ok(b,'missing '+slot);
 return b;
};
const width=b=>b.max.x-b.min.x,depth=b=>b.max.z-b.min.z;
const close=(a,b,eps=.0001)=>Math.abs(a-b)<eps;

test('R3.3 axis contract explicitly separates silhouette X and side-wall depth Z',()=>{
 assert.equal(Object.keys(FAMILY_PARTS).length,91);
 assert.equal(FAMILY_PRESETS.length,17);
 for(const anatomy of [AR_VISUAL_ANATOMY,AK_VISUAL_ANATOMY]){
  assert.ok(anatomy.magazineWidthX>=2.9,'restored side-profile width');
  assert.ok(anatomy.magazineDepthZ<=2.3,'narrowed lateral depth');
  assert.ok(anatomy.magazineWidthX>anatomy.magazineDepthZ*1.25,
   'silhouette cannot be accidentally squeezed along X again');
 }
 for(const p of FAMILY_PRESETS){
  const m=model(p.id),mag=bounds(m,'magazine');
  const a=m.cfg.build?.family==='ar'?AR_VISUAL_ANATOMY:AK_VISUAL_ANATOMY;
  assert.ok(width(mag)>2.9,p.id+' magazine should have real side silhouette');
  assert.ok(depth(mag)<=2.35,p.id+' magazine Z depth should stay slim');
  assert.ok(close(depth(mag),a.magazineDepthZ,0.15),p.id+' matches axis contract');
  assert.ok(bounds(m,'receiver').intersectsBox(mag),p.id+' mag is seated');
  const grip=bounds(m,'grip');
  assert.ok(grip.max.x<mag.min.x-.2,p.id+' visible spacing between rear grip and mag');
  assert.ok(bounds(m,'receiver').intersectsBox(grip),p.id+' grip seated');
  const outer=new THREE.Box3().setFromObject(m.group);
  assert.ok(close(outer.max.x,resolveWeaponAssembly(m.cfg).muzzleX),
   p.id+' fire tip remains authoritative');
  assert.ok(m.group.children.length<=28,p.id+' preserve mesh budget');
  clearWeaponSilhouette(m.group);
 }
});

test('R3.3 stock rear extension changes X length without lateral bulk growth',()=>{
 const cases=[
  ['ar-car15',-14.3,3.3],['ar-mk18',-13.7,3.45],
  ['ar-m16a1',-15.0,3.45],['ak-ak105',-14.2,3.5],
  ['ak-akm',-15.1,3.45],['ak-aks74u',-13.9,2.7]
 ];
 for(const [id,maxRear,maxDepth] of cases){
  const m=model(id),stock=bounds(m,'stock');
  assert.ok(stock.min.x<maxRear,id+' must extend rearward in X');
  assert.ok(depth(stock)<=maxDepth,id+' must not inflate in Z');
  clearWeaponSilhouette(m.group);
 }
});

test('R4.4 CAR-15 carry frame slants back and keeps a real opening',()=>{
 const m=model('ar-car15');
 const front=m.group.children.find(x=>x.name==='family-receiver-ar-retro-4');
 assert.ok(front,'expected one-piece handle frame');
 const pos=front.geometry.getAttribute('position');
 const tops=[],bottoms=[];
 for(let i=0;i<pos.count;i++){
  const x=pos.getX(i),y=pos.getY(i);
  if(y>3.9)tops.push(x);
  if(y<1.8)bottoms.push(x);
 }
 assert.ok(tops.length&&bottoms.length,'upper and lower contours');
 assert.ok(Math.max(...tops)<Math.max(...bottoms)-.4,
  'front handle line slants back toward top');
 clearWeaponSilhouette(m.group);
});

test('R3.3 ejection ports are taller and anchored directly above magazines',()=>{
 for(const [id,kind,anchor] of [
  ['ar-m4a1','ar-port',AR_VISUAL_ANATOMY],
  ['ar-car15','ar-port',AR_VISUAL_ANATOMY],
  ['ar-mk18','ar-port',AR_VISUAL_ANATOMY],
  ['ak-aks74u','ak-port',AK_VISUAL_ANATOMY],
  ['ak-ak105','ak-port',AK_VISUAL_ANATOMY]
 ]){
  const m=model(id),port=m.group.children.find(x=>x.name==='family-art-'+kind);
  assert.ok(port,id+' exterior port mark');
  assert.ok(close(port.position.x,anchor.magwellCenterX),
   id+' port directly over magwell');
  assert.ok(close(port.position.y,anchor.portY),id+' port height anchored');
  assert.ok(close(port.geometry.parameters.height,anchor.portHeightY));
  assert.ok(anchor.portHeightY>=1.1,'tall enough to read on iPhone');
  assert.ok(port.position.y>bounds(m,'magazine').max.y+.5,
   'port visibly above magazine lip');
  assert.ok(port.material.map.magFilter===THREE.NearestFilter);
  clearWeaponSilhouette(m.group);
 }
});

test('R3.3 magazine families retain their distinctive bend despite slimmer depth',()=>{
 const ids=['ar-m16a1','ar-m4a1','ar-mk18','ak-akm','ak-ak74','ak-aks74u'];
 const models=Object.fromEntries(ids.map(id=>[id,model(id)]));
 const ar=width(bounds(models['ar-m4a1'],'magazine'));
 const akHeavy=bounds(models['ak-akm'],'magazine');
 const akLight=bounds(models['ak-ak74'],'magazine');
 assert.ok(ar>=3.3,'STANAG keeps mild forward lower kick');
 assert.ok(akHeavy.max.x>akLight.max.x+1,
  '7.62 AK has bigger lower swing than 5.45');
 for(const m of Object.values(models))clearWeaponSilhouette(m.group);
});
