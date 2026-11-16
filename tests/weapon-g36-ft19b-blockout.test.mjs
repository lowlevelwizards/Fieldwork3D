import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_MAG30_OUTLINE} from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {buildG36OriginalBlockout,G36_B_PART_IDS,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {weaponVisualLayout} from '../src/weapons/geometry/weapon-visual-layout.ts';
import {FAMILY_PRESETS,FAMILY_PARTS} from '../src/equipment-weapon-families.ts';
import {applyG36PixelDetails,g36PixelAtlas,g36PixelAtlasLayout} from '../src/weapons/geometry/g36-pixel-details.ts';
import {weaponFinish,weaponMaterialCacheSize} from '../src/weapons/geometry/weapon-material-registry.ts';
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
 assert.ok(meshCount<=14,'only one necessary optical-face mesh is permitted: '+meshCount);
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 C3: one faceted tapered fore-end is volumetric in top/front views',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const shell=one(g,'g36LongHandguard');
 assert.ok(shell.userData.g36FacetedMoldedShell,'handguard must be a single 3D faceted volume');
 const geo=shell.geometry,attr=geo.getAttribute('position');
 assert.ok(attr.count>=32,'multiple authored YZ octagonal cross-sections');
 const zAt=x=>{
  const v=[];
  for(let i=0;i<attr.count;i++)if(Math.abs(attr.getX(i)-x)<.02)v.push(Math.abs(attr.getZ(i)));
  return Math.max(...v);
 };
 assert.ok(zAt(10.81)>zAt(13.45)+.15,'fore-end nose must taper modestly in true 3D depth');
 assert.ok(zAt(4.22)>zAt(3.75)+.12,'rear connection should flare to main molded shell');
 assert.ok(bb(shell).max.y>1.4&&bb(shell).min.y< -2.0);
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 C4: fore-end nose stays blunt, thick and factory-polymer-like',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const guard=one(g,'g36LongHandguard');
 const p=guard.geometry.getAttribute('position');
 const ring=x=>{
  const ys=[],zs=[];
  for(let i=0;i<p.count;i++)if(Math.abs(p.getX(i)-x)<.015){
   ys.push(p.getY(i));zs.push(Math.abs(p.getZ(i)));
  }
  return {height:Math.max(...ys)-Math.min(...ys),halfDepth:Math.max(...zs)};
 };
 const middle=ring(10.81),nose=ring(13.45);
 assert.ok(nose.height/middle.height>.78&&nose.height/middle.height<.89,
  'nose height should remain 78–89% of broad polymer midsection');
 assert.ok(nose.halfDepth/middle.halfDepth>.80,
  'nose width must stay broad, not end in an aerodynamic point');
 assert.equal(g.children.filter(x=>x.userData.g36LongHandguard).length,1);
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 C4: receiver jawline / true trigger opening, short but curved magazine',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const lower=one(g,'g36ReceiverLower'),mag=one(g,'g36Magazine');
 assert.ok(lower.geometry.parameters.shapes.holes.length===1);
 assert.equal(hit(lower,-2.30,-2.82),false);
 assert.ok(hit(lower,2.70,-2.90),'molded magwell cheek must be part of lower');
 assert.ok(hit(lower,-5.30,-2.03),'grip-side receiver support remains connected');
 const contour=G36_MAG30_OUTLINE;
 const topCenter=(contour[0][0]+contour[1][0])/2;
 const bottomCenter=(contour[5][0]+contour[6][0])/2;
 assert.ok(bottomCenter-topCenter>.74,'magazine needs recognizable forward sweep');
 assert.ok(bb(mag).min.y>-7.4,'magazine remains intentionally compact');
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 C4: optics are connected and horizontally hierarchical with no tower',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const lower=one(g,'g36LowerOptic'),upper=one(g,'g36UpperReflex'),frame=one(g,'g36HandleOpening');
 assert.ok(bb(lower).intersectsBox(bb(upper)));
 assert.ok(bb(lower).intersectsBox(bb(frame)));
 assert.ok(bb(upper).max.y<=4.71);
 assert.ok((bb(lower).max.x-bb(lower).min.x)>(bb(upper).max.x-bb(upper).min.x)*1.6,
  'magnified optic should read as horizontal long form, reflex short and squat');
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 D0: shared factory materials preserve silhouette and magazine identity',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const count=g.children.length,dimensions=bb(g).clone();
 const cacheBefore=weaponMaterialCacheSize();
 const parts={
  polymer:weaponFinish('hk-polymer'),steel:weaponFinish('hk-steel'),
  magazine:weaponFinish('g36-smoked-mag'),buttpad:weaponFinish('fal-vent-shadow'),
  optic:weaponFinish('hk-polymer'),muzzle:weaponFinish('hk-muzzle-metal')
 };
 const afterCreation=weaponMaterialCacheSize();
 applyG36FactoryMaterials(g,parts);
 assert.equal(one(g,'g36Magazine').material,parts.magazine);
 assert.equal(one(g,'g36Barrel').material,parts.steel);
 assert.equal(one(g,'g36FactoryMuzzle').material,parts.muzzle);
 assert.equal(one(g,'g36Buttpad').material,parts.buttpad);
 assert.equal(one(g,'g36LongHandguard').material,parts.polymer);
 assert.equal(g.children.length,count);
 assert.ok(bb(g).equals(dimensions),'finish must not affect geometry bounds');
 applyG36FactoryMaterials(g,parts);
 assert.equal(weaponMaterialCacheSize(),afterCreation,'repeat finish is allocation-free');
 assert.ok(afterCreation>=cacheBefore);
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 D1-1: authored magnified front sight is a single low-facet circle, no floating overlay',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const face=one(g,'g36OpticFace'),lower=one(g,'g36LowerOptic');
 assert.ok(face&&lower);
 assert.ok(bb(face).intersectsBox(bb(lower)),'optic face must physically meet housing');
 assert.ok(face.geometry.getAttribute('position').count<=60,'no high-poly round lens');
 assert.equal(g.children.filter(x=>x.userData.g36OpticFace).length,1);
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 D1-2: single real pixel atlas, side-correct ejection, no extra draw meshes',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m),beforeCount=g.children.length;
 const beforeTriangles=g.children.reduce((n,obj)=>n+
  ((obj.geometry.index?.count??obj.geometry.getAttribute('position').count)/3),0);
 const finishes={
  polymer:weaponFinish('hk-polymer'),steel:weaponFinish('hk-steel'),
  magazine:weaponFinish('g36-smoked-mag'),buttpad:weaponFinish('fal-vent-shadow'),
  optic:weaponFinish('hk-polymer'),muzzle:weaponFinish('hk-muzzle-metal')
 };
 applyG36FactoryMaterials(g,finishes);
 applyG36PixelDetails(g);
 const afterTriangles=g.children.reduce((n,obj)=>n+
  ((obj.geometry.index?.count??obj.geometry.getAttribute('position').count)/3),0);
 assert.equal(g.children.length,beforeCount,'pixel features must be surface-only');
 assert.equal(afterTriangles,beforeTriangles,'atlas UVs must not add triangles');
 for(const key of ['g36LongHandguard','g36ReceiverUpper','g36ReceiverLower','g36Magazine']){
  const obj=one(g,key);
  assert.ok(obj.userData.g36AtlasProjected,key);
  assert.equal(obj.geometry.getAttribute('uv').count,
   obj.geometry.getAttribute('position').count,key);
  assert.equal(obj.material.map,g36PixelAtlas(),key);
 }
 assert.equal(g36PixelAtlasLayout().sideTiles.length,8);
 const img=g36PixelAtlas().image;
 assert.equal(img.width,384);assert.equal(img.height,192);
 const bytes=img.data;
 const sample=(tile,x,y)=>{
  const col=tile%4,row=Math.floor(tile/4),i=((row*96+y)*384+col*96+x)*4;
  return bytes[i];
 };
 assert.notEqual(sample(2,57,63),sample(3,57,63),
  'ejection-side and opposite receiver atlas tiles must differ');
 const originalMagazine=one(g,'g36Magazine').material;
 applyG36PixelDetails(g);
 assert.equal(one(g,'g36Magazine').material,originalMagazine,'repeat atlas is cached');
 assert.equal(g.children.length,beforeCount);
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 D1-3: original full-size display length matches M16A2 in the REAL builders',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 g.scale.x=A.displayLongitudinalScale;
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'ar-m16a2');
 const peer=buildWeaponSilhouette('rifle',m,m,cfg);
 peer.scale.x=weaponVisualLayout(cfg).longitudinalScale;
 const actual=bb(g).getSize(new THREE.Vector3()).x;
 const comparison=bb(peer).getSize(new THREE.Vector3()).x;
 const ratio=actual/comparison;
 assert.ok(ratio>=.97&&ratio<=1.03,
  'full-length G36 should visually match M16A2, measured ratio '+ratio);
 assert.equal(A.displayLongitudinalScale,1,
  'the final G36 presentation scalar must be shared with future rig/assembly');
 clearWeaponSilhouette(g);clearWeaponSilhouette(peer);m.dispose();
});
