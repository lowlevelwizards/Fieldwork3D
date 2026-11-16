import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_MAG30_OUTLINE} from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {buildG36OriginalBlockout,G36_B_PART_IDS}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
const mat=()=>new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
const bb=obj=>new THREE.Box3().setFromObject(obj);
const one=(g,key)=>g.children.find(x=>x.userData[key]);
const hit=(mesh,x,y)=>{
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,10),new THREE.Vector3(0,0,-1));
 return ray.intersectObject(mesh,false).length>0;
};
test('G36 B: master consists of six named exterior slots and bounded art landmarks',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m),b=bb(g);
 assert.ok(Math.abs(b.min.x-A.stockRearX)<.02);
 assert.ok(Math.abs(b.max.x-A.muzzleX)<.02);
 assert.ok(Math.abs(b.max.x-b.min.x-34.55)<.02);
 assert.ok(Math.abs(b.max.y-A.opticTopY)<.02);
 for(const [slot,id] of Object.entries(G36_B_PART_IDS))
  assert.ok(g.children.some(x=>x.name.startsWith('family-'+slot+'-'+id+'-')),slot);
 assert.ok(g.children.every(x=>x instanceof THREE.Mesh&&x.material===m));
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 B: physical frame has two real stock voids and handle has a real void',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const s=one(g,'g36MasterStock'),h=one(g,'g36HandleOpening');
 assert.ok(s&&h);
 assert.equal(s.geometry.parameters.shapes.holes.length,2);
 assert.equal(h.geometry.parameters.shapes.holes.length,1);
 assert.equal(hit(s,-12.5,-1.4),false,'rear stock opening must be empty');
 assert.equal(hit(s,-8.15,-.92),false,'front stock opening must be empty');
 assert.equal(hit(s,-14.45,-1.4),true,'outer stock must have actual material');
 assert.equal(hit(h,3,2.58),false,'handle gap not filled with dark painted slab');
 assert.equal(hit(h,3,3.65),true,'upper handle frame actually exists');
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 B: receiver, stock, handguard, magwell and muzzle physically connect',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const overlap=(a,b)=>assert.ok(bb(one(g,a)).intersectsBox(bb(one(g,b))),a+' -> '+b);
 overlap('g36StockHinge','g36ReceiverUpper');
 overlap('g36ReceiverUpper','g36ReceiverLower');
 overlap('g36ReceiverUpper','g36LongHandguard');
 overlap('g36ReceiverLower','g36Magazine');
 overlap('g36LongHandguard','g36Barrel');
 overlap('g36Barrel','g36FactoryMuzzle');
 const mag=one(g,'g36Magazine');
 assert.ok(bb(mag).max.y>A.magazineTopY-.1&&bb(mag).min.y<=A.magazineBottomY+.01);
 assert.ok(G36_MAG30_OUTLINE.length>=7);
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 B: mesh/triangle economy plus no premature production catalog registration',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const meshes=g.children.filter(x=>x instanceof THREE.Mesh);
 const triangles=meshes.reduce((sum,x)=>{
  const geo=x.geometry;return sum+(geo.index?.count??geo.getAttribute('position').count)/3;
 },0);
 assert.ok(meshes.length<=24, 'review excess blockout meshes: '+meshes.length);
 assert.ok(triangles<=500, 'review excess emitted triangles: '+triangles);
 assert.ok(!FAMILY_PRESETS.some(p=>p.family==='g36'||p.id.startsWith('g36')));
 assert.ok(!Object.keys(FAMILY_PARTS).some(id=>id.startsWith('g36-')));
 const peers=[['rifle','fnc-service'],['rifle','fal-5000'],
  ['rifle','hk-g3a3'],['rifle','ar-m16a2'],['carbine','ar-m4a1'],
  ['rifle','ak-akm']];
 for(const [weapon,preset] of peers){
  const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration(weapon),preset);
  const old=buildWeaponSilhouette(weapon,m,m,cfg);
  assert.ok(bb(old).max.x-bb(old).min.x>20,'missing real peer '+preset);
  clearWeaponSilhouette(old);
 }
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 C1: union side view preserves newly emphasized bridge, stock and trigger voids',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const open=(x,y)=>!g.children.some(mesh=>hit(mesh,x,y));
 assert.ok(open(3,2.58),'whole-weapon carry handle opening must not be occluded');
 assert.ok(open(-12.5,-1.4),'large stock hole must survive assembled silhouette');
 assert.ok(open(-8.15,-.92),'small stock hole must survive assembled silhouette');
 assert.ok(open(-2.30,-2.82),'trigger gap must be physically empty, not a black decal');
 const lower=one(g,'g36ReceiverLower');
 assert.equal(lower.geometry.parameters.shapes.holes.length,1);
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 C1: shape hierarchy changes without adding cosmetic mesh layers',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const h=one(g,'g36HandleOpening'),s=one(g,'g36MasterStock'),
  guard=one(g,'g36LongHandguard'),mag=one(g,'g36Magazine'),
  grip=one(g,'g36Grip'),upper=one(g,'g36ReceiverUpper');
 assert.ok(h&&s&&guard&&mag&&grip&&upper);
 assert.ok(bb(h).max.y>4,'raised original G36 bridge');
 assert.ok(bb(guard).max.z-bb(guard).min.z>3,'substantial polymer shell depth');
 assert.ok(bb(guard).max.y-bb(guard).min.y>3.4,'front-end wedge has deliberate profile');
 assert.ok(bb(mag).min.y> -7.4,'magazine should not retain old dangling depth');
 assert.ok(bb(grip).min.y> -5.8,'grip should be short and stout');
 const meshCount=g.children.filter(x=>x instanceof THREE.Mesh).length;
 assert.ok(meshCount<=13,'major-form changes should simplify visible meshes, not add clutter: '+meshCount);
 clearWeaponSilhouette(g);m.dispose();
});
