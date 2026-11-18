import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {G36_E0_FACTORY} from '../src/weapons/geometry/g36-family-contract.ts';
import {G36_MAG30_OUTLINE,G36_MAG30_CURVE} from '../src/weapons/geometry/g36-magazine-profiles.ts';
import {arMagazineOutline} from '../src/weapons/geometry/ar-magazine-profiles.ts';
import {buildG36OriginalBlockout,G36_B_PART_IDS,applyG36FactoryMaterials}
 from '../src/weapons/geometry/g36-silhouettes.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
import {weaponVisualLayout} from '../src/weapons/geometry/weapon-visual-layout.ts';
import {FAMILY_PRESETS,FAMILY_PARTS,validFamilyBuild,readWeaponFamilyBuild} from '../src/equipment-weapon-families.ts';
import {ARSENAL_PLATFORMS,arsenalReferencesForPlatform,arsenalCatalogIssues} from '../src/arsenal/catalog.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {buildWeaponAccessories} from '../src/breach-weapon-accessories.ts';
import {carriedMagazineProfile,carriedMagazineGeometry} from '../src/operator-carried-magazines.ts';
import {reloadMechanismFor} from '../src/breach-reload-performance.ts';
import {v3MagazineRockAngle,v3MagazineBodyGrip} from '../src/breach-pose-v3-reload-choreography.ts';
import {applyG36PixelDetails,g36PixelAtlas,g36PixelAtlasLayout} from '../src/weapons/geometry/g36-pixel-details.ts';
import {weaponFinish,weaponMaterialCacheSize} from '../src/weapons/geometry/weapon-material-registry.ts';
import {initialWeaponConfiguration,selectWeaponFamilyPreset,
 resolveWeaponAssembly,setWeaponAttachment,readWeaponConfiguration}
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
 assert.ok(g.children.every(x=>x instanceof THREE.Mesh));
 assert.ok(g.children.filter(x=>!x.userData.g36SelectorMarkings).every(x=>x.material===m),
  'only graphic HK selector is a justified separate pooled material');
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
test('G36 B: mesh/triangle economy plus curated family catalog registration',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const meshes=g.children.filter(x=>x instanceof THREE.Mesh);
 const triangles=meshes.reduce((sum,x)=>{
  const geo=x.geometry;return sum+(geo.index?.count??geo.getAttribute('position').count)/3;
 },0);
 assert.equal(meshes.length,23, 'R2 adds one indispensable dual-sided HK marking mesh');
 assert.ok(triangles<=650, 'H3 should reduce production triangle count: '+triangles);
 assert.equal(FAMILY_PRESETS.filter(p=>p.family==='g36').length,4,
  'original, K, C and KA4 only');
 assert.equal(Object.keys(FAMILY_PARTS).filter(id=>id.startsWith('g36-')).length,15);
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
 assert.equal(lower.geometry.parameters.shapes.holes.length,0,
  'no closed trigger guard or extruded opening ring');
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 C1: shape hierarchy changes without adding cosmetic mesh layers',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const h=one(g,'g36HandleOpening'),s=one(g,'g36MasterStock'),
  guard=one(g,'g36LongHandguard'),mag=one(g,'g36Magazine'),
  grip=one(g,'g36Grip'),upper=one(g,'g36ReceiverUpper');
 assert.ok(h&&s&&guard&&mag&&grip&&upper);
 assert.ok(bb(h).max.y>4,'raised original G36 bridge');
 assert.ok(bb(guard).max.z-bb(guard).min.z>=2.99&&
  bb(guard).max.z-bb(guard).min.z<=3.01,'H3 broad faceted six-sided fore-end width');
 assert.ok(bb(guard).max.y-bb(guard).min.y>3.20&&
  bb(guard).max.y-bb(guard).min.y<3.30,'a deliberate flat roof and floor');
 assert.ok(bb(mag).min.y> -8.40&&bb(mag).min.y< -8.20,
  'factory mag now shares the common STANAG 30 profile length');
 assert.ok(bb(grip).min.y> -5.8,'grip should be short and stout');
 const meshCount=g.children.filter(x=>x instanceof THREE.Mesh).length;
 assert.equal(meshCount,23,'one HK marking batch, no handguard cavity or lug');
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 C3: H3 single solid hexagon has precisely two visibly angled ends',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const shell=one(g,'g36LongHandguard');
 assert.ok(shell.userData.g36FacetedMoldedShell);
 assert.equal(shell.userData.g36HandguardArtVersion,'h3-six-sided-solid');
 assert.equal(shell.userData.g36HandguardSectionSides,6);
 assert.equal(shell.userData.g36HandguardStations,2);
 const attr=shell.geometry.getAttribute('position');
 assert.equal(attr.count,60,'H3 has 20 triangles, no throat/lug');
 const b=bb(shell);
 assert.ok(b.max.z-b.min.z>=2.99&&b.max.z-b.min.z<=3.01);
 assert.ok(b.max.y>=1.34&&b.min.y< -1.85);
 const atY=(y)=>Array.from({length:attr.count},(_,i)=>i)
  .filter(i=>Math.abs(attr.getY(i)-y)<.01)
  .map(i=>attr.getX(i));
 assert.ok(atY(1.35).some(x=>Math.abs(x-4.35)<.01),'rear end roof leans forward');
 assert.ok(atY(-1.88).some(x=>Math.abs(x-3.75)<.01),'rear end floor at old datum');
 assert.ok(atY(1.28).some(x=>Math.abs(x-12.94)<.01),'front roof slopes back');
 assert.ok(atY(-1.80).some(x=>Math.abs(x-13.45)<.01),'front floor at old datum');
 assert.ok(!one(g,'g36H21MouthRecess')&&!one(g,'g36H21MountingLug'));
 assert.equal(g.children.filter(x=>x.userData.g36LongHandguard).length,1);
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 C4: receiver jawline / true trigger opening, short but curved magazine',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const lower=one(g,'g36ReceiverLower'),mag=one(g,'g36Magazine');
 assert.equal(lower.geometry.parameters.shapes.holes.length,0,
  'trigger-gap must open downward rather than closing into a ring');
 assert.equal(hit(lower,-2.30,-2.82),false);
 assert.ok(hit(lower,2.05,-2.90),'angled G36 magwell cheek remains part of lower');
 assert.ok(hit(lower,-5.30,-2.03),'grip-side receiver support remains connected');
 assert.deepEqual(G36_MAG30_OUTLINE,arMagazineOutline(G36_MAG30_CURVE),
  'G36 reuses centerline mathematics but owns distinct polymer proportions');
 assert.ok(bb(mag).min.y>-8.40&&bb(mag).min.y< -8.20);
 clearWeaponSilhouette(g);m.dispose();
});
test('G36 C4: optics are connected and horizontally hierarchical with no tower',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const lower=one(g,'g36LowerOptic'),upper=one(g,'g36UpperReflex'),frame=one(g,'g36HandleOpening');
 assert.ok(bb(lower).intersectsBox(bb(upper)));
 assert.ok(bb(lower).intersectsBox(bb(frame)));
 assert.ok(bb(upper).max.y<=A.opticTopY+.01);
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

test('G36 D1-1: O2 rear-facing lower optic is a single low-facet dark circle, seated in the ocular',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m);
 const face=one(g,'g36OpticFace'),lower=one(g,'g36LowerOptic');
 assert.ok(face&&lower);
 const ocular=one(g,'g36LowerOpticBarrel');
 assert.ok(ocular&&bb(ocular).intersectsBox(bb(lower)),
  'O2 projecting lower ocular is physically seated in the main optical pod');
 assert.ok(bb(face).intersectsBox(bb(ocular)),
  'dark optical face must remain seated inside its six-sided ocular');
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
 for(const key of ['g36LongHandguard','g36ReceiverUpper','g36ReceiverLower','g36Magazine','g36FactoryMuzzle']){
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
 assert.notEqual(sample(2,55,63),sample(3,55,63),
  'P8 port must appear on the correct receiver side only');
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

test('G36 E0: exactly six original factory art identities and unique polymer feed',()=>{
 const f=G36_E0_FACTORY;
 assert.equal(f.factoryId,'g36-service');
 assert.equal(f.family,'g36');assert.equal(f.weaponClass,'rifle');
 assert.equal(Object.keys(f.parts).length,6);
 assert.equal(f.parts.magazine,'g36-mag30');
 assert.equal(f.feedVisualId,'g36-polymer-556');
 assert.equal(f.integratedOptics,'original-dual');
 assert.equal(f.mountingPolicy,'no-rail-or-duplicate-sights');
 assert.equal(f.displayScale,A.displayLongitudinalScale);
 assert.equal(f.muzzleX,A.muzzleX);
 assert.equal(f.stockX,A.stockRearX);
});
test('G36 E0: shared future hand/grip/magazine/muzzle datums sit on real mesh',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m),f=G36_E0_FACTORY;
 const grip=one(g,'g36Grip'),fore=one(g,'g36LongHandguard'),
  mag=one(g,'g36Magazine');
 assert.equal(hit(grip,f.primaryX,f.primaryY),true,
  'primary hand contact must project into the actual molded grip');
 assert.equal(hit(fore,f.supportNearX,f.supportY),true,
  'support-hand start must sit on polymer handguard');
 assert.equal(hit(fore,f.supportFarX,f.supportY),true,
  'support-hand end must sit on polymer handguard');
 assert.equal(hit(mag,f.magazineMouthX,f.magazineMouthY),true,
  'magazine insertion datum must intersect polymer magazine body');
 assert.ok(Math.abs(bb(g).max.x-f.muzzleX)<.02);
 assert.ok(Math.abs(bb(g).min.x-f.stockX)<.02);
 assert.ok(f.supportNearX<f.supportFarX&&f.supportFarX<A.handguardFrontX);
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 E1: original factory remains valid with three new presets, unique visual feed and Arsenal platform',()=>{
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'g36-service');
 assert.equal(cfg.build?.family,'g36');
 assert.ok(validFamilyBuild(cfg.build,'rifle'));
 assert.equal(cfg.build.parts.magazine,'g36-mag30');
 assert.equal(cfg.slots.optic,'optic-g36-integrated');
 assert.equal(arsenalReferencesForPlatform('g36').length,4);
 assert.ok(ARSENAL_PLATFORMS.some(p=>p.id==='g36'));
 assert.deepEqual(arsenalCatalogIssues(),[]);
 const raw=readWeaponFamilyBuild(cfg.build,'rifle');
 assert.deepEqual(raw,cfg.build);
 const invalid=readWeaponFamilyBuild({
  family:'g36',parts:{...cfg.build.parts,magazine:'ar-mag30'}
 },'rifle');
 assert.equal(invalid.parts.magazine,'g36-mag30','do not substitute STANAG magazines');
});
test('G36 E1: same master geometry builds in the real Arsenal/operator/replay route',()=>{
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'g36-service');
 const m=mat(),master=buildG36OriginalBlockout(m);
 const live=buildWeaponSilhouette('rifle',m,m,cfg);
 const assembly=resolveWeaponAssembly(cfg),contacts=riflePoseContacts('rifle',cfg);
 assert.ok(live.userData.g36OriginalFactory);
 assert.ok(live.userData.g36IntegratedDualOptic);
 assert.ok(Math.abs(bb(master).min.x-bb(live).min.x)<.02);
 assert.ok(Math.abs(bb(master).max.x-bb(live).max.x)<.02);
 assert.equal(assembly.lengthScale,A.displayLongitudinalScale);
 assert.equal(assembly.muzzleX,A.muzzleX);
 assert.equal(assembly.stockX,A.stockRearX);
 assert.ok(contacts);
 assert.equal(contacts.family,'g36');
 assert.equal(contacts.support.near.x,G36_E0_FACTORY.supportNearX);
 assert.equal(contacts.support.far.x,G36_E0_FACTORY.supportFarX);
 assert.equal(contacts.support.near.y,G36_E0_FACTORY.supportY);
 assert.equal(assembly.primaryX,G36_E0_FACTORY.primaryX);
 assert.equal(assembly.primaryY,G36_E0_FACTORY.primaryY);
 assert.equal(assembly.sightHeight,G36_E0_FACTORY.lowerSightY);
 const accessories=buildWeaponAccessories(cfg,m,m);
 assert.equal(accessories.children.length,0,'integral factory sight cannot produce a second scope');
 clearWeaponSilhouette(live);clearWeaponSilhouette(master);
 accessories.traverse(x=>{if(x instanceof THREE.Mesh)x.geometry.dispose();});
 m.dispose();
});
test('G36 E1: old saves stable, no unsupported rail, optic, handguard or foreign magazine',()=>{
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'g36-service');
 for(const [slot,part] of [
  ['optic','optic-reflex'],['optic','optic-magnified'],
  ['opticMount','optic-hk-claw'],['foregrip','foregrip-vertical'],
  ['light','light-compact']
 ]){
  assert.equal(setWeaponAttachment(cfg,slot,part),cfg,slot+' must not attach without mounting art');
 }
 const polluted={...cfg,slots:{...cfg.slots,optic:'optic-magnified',opticMount:'optic-hk-claw'}};
 const fixed=readWeaponConfiguration(polluted,'rifle');
 assert.equal(fixed.slots.optic,'optic-g36-integrated');
 assert.equal(fixed.slots.opticMount,'optic-mount-none');
 const old=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'ar-m16a2');
 assert.equal(old.build.family,'ar');
 assert.equal(old.slots.optic,'optic-irons','existing legacy AR factory optic unchanged');
 assert.equal(setWeaponAttachment(old,'optic','optic-g36-integrated'),old,
  'G36 integrated sight cannot appear on an AR factory receiver');
 const plain=initialWeaponConfiguration('rifle');
 assert.equal(setWeaponAttachment(plain,'optic','optic-g36-integrated'),plain,
  'integral G36 sight is not a generic rifle attachment');
});

test('G36 E1 reload imagery: own polymer magazine and non-roller presentation',()=>{
 const f=carriedMagazineProfile('g36-mag30');
 assert.ok(f);
 assert.equal(f.family,'g36');
 assert.ok(f.length>=5.2&&f.length<=5.4);
 const geo=carriedMagazineGeometry('g36-mag30');
 assert.ok(geo);
 assert.ok(geo.getAttribute('position').count>0);
 const bounds=new THREE.Box3().setFromBufferAttribute(geo.getAttribute('position'));
 assert.ok(Number.isFinite(bounds.min.x)&&bounds.max.x>bounds.min.x);
 geo.dispose();
 const cfg=selectWeaponFamilyPreset(initialWeaponConfiguration('rifle'),'g36-service');
 assert.equal(reloadMechanismFor('rifle',cfg),'g36-top-charge',
  'G36 uses its own top handle, never the unrelated HK roller-delay gesture');
 assert.equal(v3MagazineRockAngle(.72,'emergency','g36'),0,
  'G36 polymer detachable magazine must not inherit AK rock-in');
 assert.ok(v3MagazineBodyGrip('g36','upper-body'));
});


// P2: confirm default FrontSide materials really see the INSIDE of the
// carry-handle hole at three-quarter angles (DoubleSide masks winding bugs).
test('G36 P2: carry-handle inward faces are visible without double-sided material',()=>{
 const m=new THREE.MeshBasicMaterial({side:THREE.FrontSide});
 const g=buildG36OriginalBlockout(m),handle=one(g,'g36HandleOpening');
 const interiorRay=new THREE.Raycaster(
  new THREE.Vector3(3,2.55,0),new THREE.Vector3(0,1,0));
 assert.ok(interiorRay.intersectObject(handle,false).length>0,
  'underside of bridge must be visible FROM INSIDE the carry channel');
 const frontRay=new THREE.Raycaster(
  new THREE.Vector3(5.6,2.20,0),new THREE.Vector3(1,0,0));
 assert.ok(frontRay.intersectObject(handle,false).length>0,
  'inside of forward handle support must not be backface-culled');
 clearWeaponSilhouette(g);m.dispose();
});

test('G36 P2/R3: open trigger gap with box barrel and sculpted one-piece flash hider',()=>{
 const m=mat(),g=buildG36OriginalBlockout(m),lower=one(g,'g36ReceiverLower');
 assert.ok(lower.userData.g36OpenTriggerGap);
 assert.equal(lower.geometry.parameters.shapes.holes.length,0);
 assert.equal(hit(lower,-2.3,-2.82),false);
 for(const key of ['g36Barrel','g36FactoryMuzzle']){
  const part=one(g,key);
  assert.equal(part.geometry.type,key==='g36Barrel'?'BoxGeometry':'ExtrudeGeometry');
  assert.equal((part.geometry.index?.count??part.geometry.getAttribute('position').count)/3,
   key==='g36Barrel'?12:28,'one box barrel and one purposeful flash-hider profile');
 }
 clearWeaponSilhouette(g);m.dispose();
});
